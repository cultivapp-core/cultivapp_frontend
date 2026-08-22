import api, { getApiBaseUrl } from "../api/apiClient";
import RegionalOfflineManager from "./regionalOfflineManager";

const ADMIN_BASE = "/regional-inventory/admin";
const MERCADERISTA_BASE = "/regional-inventory/mercaderista";

export const unwrapRegionalData = (response) =>
  response?.data ?? response ?? null;

const cleanParams = (params = {}) =>
  Object.fromEntries(
    Object.entries(params).filter(([, value]) =>
      value !== undefined && value !== null && value !== ""
    )
  );

const getStoredToken = () => {
  const token = localStorage.getItem("token");
  if (!token || token === "null" || token === "undefined") return null;
  return token.replace(/^"|"$/g, "").replace(/^Bearer\s+/i, "").trim();
};

const getDownloadError = async (response) => {
  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    const payload = await response.json().catch(() => ({}));
    return payload?.message || payload?.error || `Error HTTP ${response.status}`;
  }
  return (await response.text().catch(() => "")) || `Error HTTP ${response.status}`;
};

const saveBlob = (blob, fileName) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};

const isNetworkError = (error) =>
  error?.name === "TypeError" ||
  String(error?.message || "").includes("Failed to fetch") ||
  String(error?.message || "").includes("NetworkError") ||
  String(error?.message || "").includes("Load failed");

const readThroughCache = async ({ type, scope = "default", request }) => {
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    const cached = await RegionalOfflineManager.readCache(type, scope);
    if (cached !== null && cached !== undefined) return cached;
    throw new Error("Sin conexión y sin datos regionales guardados en este dispositivo.");
  }

  try {
    const response = await request();
    await RegionalOfflineManager.cache(type, scope, response);
    return response;
  } catch (error) {
    if (!isNetworkError(error)) throw error;
    const cached = await RegionalOfflineManager.readCache(type, scope);
    if (cached !== null && cached !== undefined) return cached;
    throw error;
  }
};

const queueRegionalMutation = async ({
  endpoint,
  body,
  journeyId,
  metadata = {},
}) =>
  RegionalOfflineManager.save(endpoint, "POST", body, {
    metadata: {
      ...metadata,
      journeyId,
    },
  });

const postWithRegionalOffline = async ({
  endpoint,
  body,
  journeyId,
  metadata = {},
}) => {
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    return queueRegionalMutation({ endpoint, body, journeyId, metadata });
  }

  try {
    return await api.post(endpoint, body, {
      offlineFallback: false,
      preserveSessionOnAuthError: true,
    });
  } catch (error) {
    if (!isNetworkError(error)) throw error;
    return queueRegionalMutation({ endpoint, body, journeyId, metadata });
  }
};

const getPayloadRows = (response) => {
  const payload = response?.data ?? response;
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.rows)) return payload.rows;
  return [];
};

const wrapLike = (original, rows) => {
  if (Array.isArray(original)) return rows;
  if (original && typeof original === "object") {
    if (Array.isArray(original.data)) return { ...original, data: rows };
    if (original.data && Array.isArray(original.data.data)) {
      return { ...original, data: { ...original.data, data: rows } };
    }
  }
  return { success: true, data: rows };
};

const applyOptimisticStockMovement = async (payload) => {
  const localId = payload?.local_id;
  const productId = payload?.product_id;
  if (!localId || !productId) return;

  const cached = await RegionalOfflineManager.readCache("STOCK", String(localId));
  if (!cached) return;

  const quantity = Number(payload.quantity) || 0;
  const type = String(payload.movement_type || "").toUpperCase();
  const rows = getPayloadRows(cached).map((item) => {
    if (String(item?.product_id ?? item?.id) !== String(productId)) return item;

    const available = Number(item.available_quantity) || 0;
    return {
      ...item,
      available_quantity: Math.max(0, available - quantity),
      total_replenished_quantity:
        type === "REPLENISHMENT"
          ? (Number(item.total_replenished_quantity) || 0) + quantity
          : item.total_replenished_quantity,
      total_waste_quantity:
        type === "WASTE"
          ? (Number(item.total_waste_quantity) || 0) + quantity
          : item.total_waste_quantity,
      offline_pending: true,
    };
  });

  await RegionalOfflineManager.cache(
    "STOCK",
    String(localId),
    wrapLike(cached, rows),
  );
};

const appendOptimisticEvidence = async ({
  journeyId,
  evidenceType,
  clientEvidenceId,
  productId,
  movementId,
}) => {
  const cached =
    (await RegionalOfflineManager.readCache("EVIDENCE", String(journeyId))) ||
    { success: true, data: [] };
  const rows = getPayloadRows(cached);

  if (rows.some((item) => item?.client_evidence_id === clientEvidenceId)) return;

  rows.push({
    id: `offline:${clientEvidenceId}`,
    journey_id: journeyId,
    evidence_type: evidenceType,
    client_evidence_id: clientEvidenceId,
    product_id: productId || null,
    movement_id: movementId || null,
    captured_at: new Date().toISOString(),
    is_offline_capture: true,
    offline_pending: true,
  });

  await RegionalOfflineManager.cache(
    "EVIDENCE",
    String(journeyId),
    wrapLike(cached, rows),
  );
};

export const regionalInventoryService = {
  getAdminFilters(params = {}) {
    return api.get(`${ADMIN_BASE}/filters`, { params: cleanParams(params) });
  },

  getAdminDashboard(params = {}) {
    return api.get(`${ADMIN_BASE}/dashboard`, { params: cleanParams(params) });
  },

  getProducts(params = {}) {
    return api.get(`${ADMIN_BASE}/products`, { params: cleanParams(params) });
  },

  importProducts({ companyId, localId, file }) {
    const formData = new FormData();
    formData.append("company_id", companyId);
    formData.append("local_id", localId);
    formData.append("file", file);
    return api.post(`${ADMIN_BASE}/products/import`, formData);
  },

  importStockLoad({ localId, inventoryDate, loadType, file }) {
    const formData = new FormData();
    formData.append("local_id", localId);
    formData.append("inventory_date", inventoryDate);
    formData.append("load_type", loadType);
    formData.append("file", file);
    return api.post(`${ADMIN_BASE}/stock-loads/import`, formData);
  },

  getLoads(params = {}) {
    return api.get(`${ADMIN_BASE}/loads`, { params: cleanParams(params) });
  },

  getLoadHistory(params = {}) {
    return api.get(`${ADMIN_BASE}/load-history`, { params: cleanParams(params) });
  },

  getMovements(params = {}) {
    return api.get(`${ADMIN_BASE}/movements`, { params: cleanParams(params) });
  },

  async downloadTemplate(type) {
    const templateConfig = {
      products: { endpoint: "products", fileName: "formato_catalogo_regional.xlsx" },
      stock: { endpoint: "stock", fileName: "formato_stock_regional.xlsx" },
    }[type];

    if (!templateConfig) throw new Error("Tipo de plantilla regional inválido.");

    const token = getStoredToken();
    const response = await fetch(
      `${getApiBaseUrl()}${ADMIN_BASE}/templates/${templateConfig.endpoint}`,
      { headers: token ? { Authorization: `Bearer ${token}` } : {} },
    );
    if (!response.ok) throw new Error(await getDownloadError(response));
    saveBlob(await response.blob(), templateConfig.fileName);
  },

  getMercaderistaLocales() {
    return readThroughCache({
      type: "LOCALES",
      request: () => api.get(`${MERCADERISTA_BASE}/locales`),
    });
  },

  getMercaderistaPlanningToday() {
    return readThroughCache({
      type: "PLANNING_TODAY",
      request: () => api.get(`${MERCADERISTA_BASE}/planning/today`),
    });
  },

  getMercaderistaStock(localId) {
    return readThroughCache({
      type: "STOCK",
      scope: String(localId),
      request: () =>
        api.get(`${MERCADERISTA_BASE}/stock`, { params: { local_id: localId } }),
    });
  },

  getActiveJourney() {
    return readThroughCache({
      type: "ACTIVE_JOURNEY",
      request: () => api.get(`${MERCADERISTA_BASE}/journeys/active`),
    });
  },

  async startJourney(localId, routeId) {
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      const error = new Error(
        "Necesitas conexión para iniciar una nueva visita porque el check-in GPS debe validarse en línea.",
      );
      error.code = "REGIONAL_START_REQUIRES_ONLINE";
      throw error;
    }

    const response = await api.post(
      `${MERCADERISTA_BASE}/journeys/start`,
      { local_id: localId, route_id: routeId },
      { offlineFallback: false, preserveSessionOnAuthError: true },
    );
    await RegionalOfflineManager.cache("ACTIVE_JOURNEY", "default", response);
    return response;
  },

  async uploadEvidence({
    file,
    journeyId,
    evidenceType,
    clientEvidenceId,
    movementId,
    movementClientOperationId,
    productId,
    capturedAt,
    isOfflineCapture = false,
  }) {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("journey_id", journeyId);
    formData.append("client_evidence_id", clientEvidenceId);
    formData.append("evidence_type", evidenceType);
    formData.append(
      "is_offline_capture",
      String(isOfflineCapture || (typeof navigator !== "undefined" && !navigator.onLine)),
    );

    if (movementId && !String(movementId).startsWith("offline:")) {
      formData.append("movement_id", movementId);
    }
    if (movementClientOperationId) {
      formData.append("movement_client_operation_id", movementClientOperationId);
    }
    if (productId) formData.append("product_id", productId);
    if (capturedAt) formData.append("captured_at", capturedAt);

    let response;
    try {
      response = await postWithRegionalOffline({
        endpoint: `${MERCADERISTA_BASE}/evidence`,
        body: formData,
        journeyId,
        metadata: { evidenceType, clientEvidenceId },
      });
    } catch (error) {
      throw error;
    }

    if (response?.queued) {
      formData.set("is_offline_capture", "true");
      await appendOptimisticEvidence({
        journeyId,
        evidenceType,
        clientEvidenceId,
        productId,
        movementId,
      });
    }

    return response;
  },

  async createMovement(payload) {
    const response = await postWithRegionalOffline({
      endpoint: `${MERCADERISTA_BASE}/movements`,
      body: payload,
      journeyId: payload.journey_id,
      metadata: { clientOperationId: payload.client_operation_id },
    });

    if (response?.queued) {
      await applyOptimisticStockMovement(payload);
      return {
        ...response,
        data: {
          movement_id: `offline:${payload.client_operation_id}`,
          client_operation_id: payload.client_operation_id,
          offline_pending: true,
        },
      };
    }

    return response;
  },

  async createReconciliation(payload) {
    const operationId =
      payload.client_operation_id ||
      (await RegionalOfflineManager.stableOperationId(
        `reconciliation:${payload.journey_id}:${payload.balance_id}`,
      ));

    return postWithRegionalOffline({
      endpoint: `${MERCADERISTA_BASE}/reconciliations`,
      body: { ...payload, client_operation_id: operationId },
      journeyId: payload.journey_id,
      metadata: { clientOperationId: operationId },
    });
  },

  getJourneyEvidence(journeyId) {
    return readThroughCache({
      type: "EVIDENCE",
      scope: String(journeyId),
      request: () => api.get(`${MERCADERISTA_BASE}/journeys/${journeyId}/evidence`),
    });
  },

  async closeJourney(journeyId, closingObservation) {
    const response = await postWithRegionalOffline({
      endpoint: `${MERCADERISTA_BASE}/journeys/${journeyId}/close`,
      body: { closing_observation: closingObservation },
      journeyId,
    });

    if (response?.queued) {
      await RegionalOfflineManager.cache("ACTIVE_JOURNEY", "default", {
        success: true,
        data: null,
      });
    }
    await RegionalOfflineManager.removeDraft(journeyId);
    return response;
  },

  saveDraft(journeyId, data) {
    return RegionalOfflineManager.saveDraft(journeyId, data);
  },

  getDraft(journeyId) {
    return RegionalOfflineManager.getDraft(journeyId);
  },

  removeDraft(journeyId) {
    return RegionalOfflineManager.removeDraft(journeyId);
  },
};

export default regionalInventoryService;
