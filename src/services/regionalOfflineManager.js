import {
  addRegionalQueueItem,
  getOrCreateRegionalOperationId,
  getRegionalCache,
  getRegionalDraft,
  getRegionalQueueForContext,
  getRegionalQueueStats,
  markRegionalQueueFailed,
  markRegionalQueueRetry,
  putRegionalCache,
  removeRegionalDraft,
  removeRegionalQueueItem,
  retryRegionalQueue,
  saveRegionalDraft,
} from "../utils/regionalOfflineDb";

export const REGIONAL_OFFLINE_EVENTS = {
  QUEUE_UPDATED: "cultivapp:regional-offline-queue-updated",
  SYNC_REQUESTED: "cultivapp:regional-offline-sync-requested",
  SYNC_STARTED: "cultivapp:regional-offline-sync-started",
  ITEM_SUCCESS: "cultivapp:regional-offline-item-success",
  ITEM_ERROR: "cultivapp:regional-offline-item-error",
  SYNC_COMPLETE: "cultivapp:regional-offline-sync-complete",
  AUTH_REQUIRED: "cultivapp:regional-offline-auth-required",
};

export const REGIONAL_OFFLINE_VERSION = "2026.08.20-regional-v1";

const API_BASE = (() => {
  const base =
    import.meta.env.VITE_API_URL ||
    import.meta.env.VITE_BACKEND_URL ||
    "http://localhost:5000";
  const clean = String(base).replace(/\/+$/, "");
  return clean + (/\/api$/i.test(clean) ? "" : "/api");
})();

const dispatch = (name, detail = {}) => {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(name, { detail }));
};

const normalizeRole = (value) => String(value || "").trim().toUpperCase();

const readStoredUser = () => {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem("user");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export const getRegionalOperationalContext = (sourceUser = null) => {
  const user = sourceUser || readStoredUser();
  if (!user) return null;

  const role = normalizeRole(
    user.effective_role || user.active_role || user.role,
  );
  const companyId =
    user.effective_company_id ||
    user.active_company_id ||
    user.company_id ||
    null;
  const operationalUserId =
    user.effective_user_id ||
    user.subject_user_id ||
    user.acting_user_id ||
    user.id ||
    null;
  const actorUserId = user.id || null;

  if (!companyId || !operationalUserId || !role) return null;

  return {
    actorUserId,
    operationalUserId,
    companyId,
    role,
    contextKey: `${companyId}:${operationalUserId}:${role}`,
  };
};

const isRegionalContext = (context) =>
  context?.role === "MERCADERISTA_REGIONAL";

const getToken = () => {
  let token = localStorage.getItem("token");
  if (!token || token === "null" || token === "undefined") return null;
  token = token.replace(/^"|"$/g, "").replace(/^Bearer\s+/i, "").trim();
  return token || null;
};

const serializeBlob = async (value) => ({
  __type: "RegionalFileBuffer",
  buffer: await value.arrayBuffer(),
  name: value?.name || `evidencia-${Date.now()}.jpg`,
  mimeType: value?.type || "application/octet-stream",
  lastModified: value?.lastModified || Date.now(),
});

const serializePayload = async (payload) => {
  if (payload === undefined || payload === null) return null;
  if (payload?.__type === "RegionalFormData") return payload;

  if (typeof FormData !== "undefined" && payload instanceof FormData) {
    const entries = [];
    for (const [key, value] of payload.entries()) {
      entries.push({
        key,
        value:
          typeof Blob !== "undefined" && value instanceof Blob
            ? await serializeBlob(value)
            : value,
      });
    }
    return { __type: "RegionalFormData", entries };
  }

  if (typeof payload === "string") {
    try {
      return JSON.parse(payload);
    } catch {
      return payload;
    }
  }

  return payload;
};

const restorePayload = (payload) => {
  if (!payload || payload.__type !== "RegionalFormData") {
    return {
      body:
        payload === null || payload === undefined
          ? undefined
          : typeof payload === "string"
            ? payload
            : JSON.stringify(payload),
      isFormData: false,
    };
  }

  const formData = new FormData();
  for (const entry of payload.entries || []) {
    const value = entry.value;
    if (value?.__type === "RegionalFileBuffer") {
      const blob = new Blob([value.buffer], {
        type: value.mimeType || "application/octet-stream",
      });
      formData.append(entry.key, blob, value.name || "evidencia.jpg");
    } else {
      formData.append(entry.key, value ?? "");
    }
  }
  return { body: formData, isFormData: true };
};

const classifyOperation = (endpoint) => {
  const value = String(endpoint || "").toLowerCase();
  if (value.endsWith("/evidence")) return "EVIDENCE";
  if (value.endsWith("/movements")) return "MOVEMENT";
  if (value.endsWith("/reconciliations")) return "RECONCILIATION";
  if (/\/journeys\/[^/]+\/close(?:\?|$)/.test(value)) return "CLOSE_JOURNEY";
  return "OTHER";
};

const inferJourneyId = (endpoint, payload, metadata = {}) => {
  if (metadata.journeyId) return String(metadata.journeyId);

  const fromUrl = String(endpoint || "").match(/\/journeys\/([^/?]+)\/close/);
  if (fromUrl?.[1]) return fromUrl[1];

  if (payload && payload.__type !== "RegionalFormData") {
    if (payload.journey_id) return String(payload.journey_id);
  }

  if (payload?.__type === "RegionalFormData") {
    const item = payload.entries?.find((entry) => entry.key === "journey_id");
    if (item?.value) return String(item.value);
  }

  return null;
};

const parseResponse = async (response) => {
  const type = response.headers.get("content-type") || "";
  if (type.includes("application/json")) {
    return response.json().catch(() => ({}));
  }
  return response.text().catch(() => "");
};

const messageFrom = (data, response) =>
  data?.message || data?.error || data?.detail || `Error HTTP ${response.status}`;

const isRecoverableConflict = (response, data) => {
  if (response.status !== 409) return false;
  const code = String(data?.code || "").toUpperCase();
  return [
    "DUPLICATE_CLIENT_OPERATION",
    "CLIENT_OPERATION_ALREADY_PROCESSED",
    "JOURNEY_ALREADY_COMPLETED",
    "JOURNEY_NOT_ACTIVE",
  ].includes(code);
};

const RegionalOfflineManager = {
  context: getRegionalOperationalContext,

  async cache(type, scope, data, user = null) {
    const context = getRegionalOperationalContext(user);
    if (!isRegionalContext(context)) return data;
    return putRegionalCache({
      contextKey: context.contextKey,
      type,
      scope,
      data,
    });
  },

  async readCache(type, scope, user = null) {
    const context = getRegionalOperationalContext(user);
    if (!isRegionalContext(context)) return null;
    return getRegionalCache({
      contextKey: context.contextKey,
      type,
      scope,
    });
  },

  async save(endpoint, method = "POST", body = null, { metadata = {}, user = null } = {}) {
    const context = getRegionalOperationalContext(user);
    if (!isRegionalContext(context)) {
      throw new Error("La cola regional solo está disponible para MERCADERISTA_REGIONAL.");
    }

    const cleanEndpoint = String(endpoint || "").trim();
    if (!cleanEndpoint) throw new Error("No se recibió endpoint regional.");

    if (cleanEndpoint.includes("/journeys/start")) {
      throw new Error(
        "El inicio de jornada requiere conexión porque primero debe validarse el GPS.",
      );
    }

    const payload = await serializePayload(body);
    const journeyId = inferJourneyId(cleanEndpoint, payload, metadata);
    if (!journeyId) {
      throw new Error("No fue posible identificar la jornada de la operación offline.");
    }

    const item = {
      endpoint: cleanEndpoint,
      method: String(method || "POST").toUpperCase(),
      payload,
      journeyId,
      operationType: classifyOperation(cleanEndpoint),
      contextKey: context.contextKey,
      metadata: {
        ...metadata,
        ownerActorUserId: context.actorUserId,
        ownerUserId: context.operationalUserId,
        ownerCompanyId: context.companyId,
        ownerRole: context.role,
        clientVersion: REGIONAL_OFFLINE_VERSION,
        queuedAt: new Date().toISOString(),
      },
    };

    const id = await addRegionalQueueItem(item);
    const saved = { ...item, id, status: "pending" };

    dispatch(REGIONAL_OFFLINE_EVENTS.QUEUE_UPDATED, {
      action: "UPSERTED",
      item: saved,
    });

    if (navigator.onLine) {
      dispatch(REGIONAL_OFFLINE_EVENTS.SYNC_REQUESTED, {
        reason: "QUEUE_ITEM_ADDED",
      });
    }

    return {
      success: true,
      queued: true,
      offline: true,
      queue_id: id,
      operation_type: item.operationType,
      journey_id: journeyId,
    };
  },

  async sync(user = null) {
    const context = getRegionalOperationalContext(user);
    if (!isRegionalContext(context) || !navigator.onLine) {
      return { synced: 0, pending: 0 };
    }

    const token = getToken();
    if (!token) {
      dispatch(REGIONAL_OFFLINE_EVENTS.AUTH_REQUIRED, {});
      return { synced: 0, pending: 0, authRequired: true };
    }

    const queue = await getRegionalQueueForContext(context.contextKey);
    if (!queue.length) {
      dispatch(REGIONAL_OFFLINE_EVENTS.SYNC_COMPLETE, { synced: 0 });
      return { synced: 0, pending: 0 };
    }

    dispatch(REGIONAL_OFFLINE_EVENTS.SYNC_STARTED, {
      total: queue.length,
      contextKey: context.contextKey,
    });

    let synced = 0;

    for (const item of queue) {
      // Nunca sincronizar datos de un acting user bajo otro contexto GERENCIA.
      if (
        String(item.metadata?.ownerUserId || "") !==
          String(context.operationalUserId) ||
        String(item.metadata?.ownerCompanyId || "") !== String(context.companyId)
      ) {
        continue;
      }

      try {
        const restored = restorePayload(item.payload);
        const headers = {
          Authorization: `Bearer ${token}`,
        };
        if (!restored.isFormData) headers["Content-Type"] = "application/json";

        const response = await fetch(`${API_BASE}${item.endpoint}`, {
          method: item.method,
          headers,
          body: restored.body,
        });
        const data = await parseResponse(response);

        if (!response.ok && !isRecoverableConflict(response, data)) {
          const message = messageFrom(data, response);

          if (response.status === 401) {
            dispatch(REGIONAL_OFFLINE_EVENTS.AUTH_REQUIRED, {
              itemId: item.id,
              message,
            });
            break;
          }

          if ([400, 403, 404, 422].includes(response.status)) {
            await markRegionalQueueFailed(item.id, message);
          } else {
            await markRegionalQueueRetry(item.id, message);
          }

          dispatch(REGIONAL_OFFLINE_EVENTS.ITEM_ERROR, {
            item,
            message,
            status: response.status,
          });
          break;
        }

        await removeRegionalQueueItem(item.id);
        synced += 1;
        dispatch(REGIONAL_OFFLINE_EVENTS.ITEM_SUCCESS, {
          item,
          data,
          recoveredConflict: !response.ok,
        });
      } catch (error) {
        await markRegionalQueueRetry(item.id, error?.message || "Sin conexión");
        dispatch(REGIONAL_OFFLINE_EVENTS.ITEM_ERROR, {
          item,
          message: error?.message || "Sin conexión",
        });
        break;
      }
    }

    const stats = await getRegionalQueueStats(context.contextKey);
    dispatch(REGIONAL_OFFLINE_EVENTS.SYNC_COMPLETE, {
      synced,
      ...stats,
      contextKey: context.contextKey,
    });
    return { synced, ...stats };
  },

  async stats(user = null) {
    const context = getRegionalOperationalContext(user);
    if (!isRegionalContext(context)) {
      return { pendingCount: 0, failedCount: 0, totalCount: 0, lastError: null };
    }
    return getRegionalQueueStats(context.contextKey);
  },

  async retryAll(user = null) {
    const context = getRegionalOperationalContext(user);
    if (!isRegionalContext(context)) return 0;
    const count = await retryRegionalQueue(context.contextKey);
    dispatch(REGIONAL_OFFLINE_EVENTS.QUEUE_UPDATED, { action: "RETRY_ALL" });
    dispatch(REGIONAL_OFFLINE_EVENTS.SYNC_REQUESTED, { reason: "RETRY_ALL" });
    return count;
  },

  async saveDraft(journeyId, data, user = null) {
    const context = getRegionalOperationalContext(user);
    if (!isRegionalContext(context) || !journeyId) return;
    return saveRegionalDraft({
      contextKey: context.contextKey,
      journeyId,
      data,
    });
  },

  async getDraft(journeyId, user = null) {
    const context = getRegionalOperationalContext(user);
    if (!isRegionalContext(context) || !journeyId) return null;
    return getRegionalDraft({
      contextKey: context.contextKey,
      journeyId,
    });
  },

  async removeDraft(journeyId, user = null) {
    const context = getRegionalOperationalContext(user);
    if (!isRegionalContext(context) || !journeyId) return;
    return removeRegionalDraft({
      contextKey: context.contextKey,
      journeyId,
    });
  },

  async stableOperationId(key, user = null) {
    const context = getRegionalOperationalContext(user);
    if (!isRegionalContext(context)) {
      return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}`;
    }
    return getOrCreateRegionalOperationId({
      contextKey: context.contextKey,
      key,
    });
  },

  requestSync(reason = "MANUAL") {
    dispatch(REGIONAL_OFFLINE_EVENTS.SYNC_REQUESTED, { reason });
  },
};

export default RegionalOfflineManager;
