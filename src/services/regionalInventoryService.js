import api, { getApiBaseUrl } from "../api/apiClient";

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

  if (!token || token === "null" || token === "undefined") {
    return null;
  }

  return token
    .replace(/^"|"$/g, "")
    .replace(/^Bearer\s+/i, "")
    .trim();
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

export const regionalInventoryService = {
  getAdminFilters(params = {}) {
    return api.get(`${ADMIN_BASE}/filters`, {
      params: cleanParams(params),
    });
  },

  getAdminDashboard(params = {}) {
    return api.get(`${ADMIN_BASE}/dashboard`, {
      params: cleanParams(params),
    });
  },

  getProducts(params = {}) {
    return api.get(`${ADMIN_BASE}/products`, {
      params: cleanParams(params),
    });
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
    return api.get(`${ADMIN_BASE}/loads`, {
      params: cleanParams(params),
    });
  },

  getLoadHistory(params = {}) {
    return api.get(`${ADMIN_BASE}/load-history`, {
      params: cleanParams(params),
    });
  },

  getMovements(params = {}) {
    return api.get(`${ADMIN_BASE}/movements`, {
      params: cleanParams(params),
    });
  },

  getAdminJourneys(params = {}) {
    return api.get(`${ADMIN_BASE}/journeys`, {
      params: cleanParams(params),
    });
  },

  getAdminEvidence(params = {}) {
    return api.get(`${ADMIN_BASE}/evidence`, {
      params: cleanParams(params),
    });
  },

  async downloadTemplate(type) {
    const templateConfig = {
      products: {
        endpoint: "products",
        fileName: "formato_catalogo_regional.xlsx",
      },
      stock: {
        endpoint: "stock",
        fileName: "formato_stock_regional.xlsx",
      },
    }[type];

    if (!templateConfig) {
      throw new Error("Tipo de plantilla regional inválido.");
    }

    const token = getStoredToken();
    const response = await fetch(
      `${getApiBaseUrl()}${ADMIN_BASE}/templates/${templateConfig.endpoint}`,
      {
        headers: token
          ? { Authorization: `Bearer ${token}` }
          : {},
      }
    );

    if (!response.ok) {
      throw new Error(await getDownloadError(response));
    }

    saveBlob(await response.blob(), templateConfig.fileName);
  },

  getMercaderistaLocales() {
    return api.get(`${MERCADERISTA_BASE}/locales`);
  },

  getMercaderistaStock(localId) {
    return api.get(`${MERCADERISTA_BASE}/stock`, {
      params: { local_id: localId },
    });
  },

  getActiveJourney() {
    return api.get(`${MERCADERISTA_BASE}/journeys/active`);
  },

  startJourney(localId, routeId) {
    return api.post(`${MERCADERISTA_BASE}/journeys/start`, {
      local_id: localId,
      route_id: routeId,
    });
  },

  uploadEvidence({
    file,
    journeyId,
    evidenceType,
    clientEvidenceId,
    movementId,
    productId,
    capturedAt,
    isOfflineCapture = false,
  }) {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("journey_id", journeyId);
    formData.append("client_evidence_id", clientEvidenceId);
    formData.append("evidence_type", evidenceType);
    formData.append("is_offline_capture", String(isOfflineCapture));

    if (movementId) formData.append("movement_id", movementId);
    if (productId) formData.append("product_id", productId);
    if (capturedAt) formData.append("captured_at", capturedAt);

    return api.post(`${MERCADERISTA_BASE}/evidence`, formData);
  },

  createMovement(payload) {
    return api.post(`${MERCADERISTA_BASE}/movements`, payload);
  },

  createReconciliation(payload) {
    return api.post(`${MERCADERISTA_BASE}/reconciliations`, payload);
  },

  getJourneyEvidence(journeyId) {
    return api.get(`${MERCADERISTA_BASE}/journeys/${journeyId}/evidence`);
  },

  closeJourney(journeyId, closingObservation) {
    return api.post(`${MERCADERISTA_BASE}/journeys/${journeyId}/close`, {
      closing_observation: closingObservation,
    });
  },
};

export default regionalInventoryService;
