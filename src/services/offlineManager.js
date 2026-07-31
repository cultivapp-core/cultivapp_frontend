import {
  addToSyncQueue,
  countPendingSyncByRoute,
  removeFromSyncQueue,
} from "../utils/db";

export const OFFLINE_SYNC_EVENTS = {
  QUEUE_UPDATED:
    "cultivapp:offline-queue-updated",
  SYNC_REQUESTED:
    "cultivapp:offline-sync-requested",
  SYNC_STARTED:
    "cultivapp:sync-started",
  ITEM_SUCCESS:
    "cultivapp:sync-item-success",
  ITEM_ERROR:
    "cultivapp:sync-item-error",
  SYNC_COMPLETE:
    "cultivapp:sync-complete",
  AUTH_REQUIRED:
    "cultivapp:offline-auth-required",
};

const AUTH_REQUIRED_STORAGE_KEY =
  "cultivapp_offline_auth_required";

export const OFFLINE_CLIENT_VERSION =
  "2026.07.31-mobile-v5";

const getStoredUser = () => {
  if (
    typeof window ===
    "undefined"
  ) {
    return null;
  }

  try {
    const storedUser =
      localStorage.getItem(
        "user",
      );

    return storedUser
      ? JSON.parse(storedUser)
      : null;
  } catch {
    return null;
  }
};

const getOperationType = (
  endpoint,
) => {
  const normalized =
    String(endpoint || "")
      .toLowerCase();

  if (normalized.includes("/check-in")) {
    return "CHECK_IN";
  }

  if (normalized.includes("/finish")) {
    return "FINISH";
  }

  if (normalized.includes("/scans")) {
    return "SCAN";
  }

  if (normalized.includes("/task")) {
    return "TASK";
  }

  if (normalized.includes("/photo")) {
    return "PHOTO";
  }

  return "OTHER";
};

const getRouteId = (
  endpoint,
) => {
  const match =
    String(endpoint || "")
      .match(/\/routes\/([^/?]+)/);

  return match?.[1] || null;
};

const serializeBlobAsBuffer =
  async (
    value,
  ) => ({
    __type:
      "FileBuffer",
    buffer:
      await value.arrayBuffer(),
    name:
      value?.name ||
      `archivo-${Date.now()}`,
    mimeType:
      value?.type ||
      "application/octet-stream",
    lastModified:
      value?.lastModified ||
      Date.now(),
    size:
      value?.size ||
      0,
  });

const prepareOfflinePayload =
  async (payload) => {
    if (
      payload === undefined ||
      payload === null
    ) {
      return null;
    }

    if (
      payload?.__type ===
      "FormData"
    ) {
      return payload;
    }

    if (
      typeof FormData !==
        "undefined" &&
      payload instanceof
        FormData
    ) {
      const entries = [];

      for (
        const [
          key,
          value,
        ] of payload.entries()
      ) {
        entries.push({
          key,
          value:
            typeof Blob !==
              "undefined" &&
            value instanceof
              Blob
              ? await serializeBlobAsBuffer(
                  value,
                )
              : value,
        });
      }

      return {
        __type:
          "FormData",
        storageVersion:
          "ARRAY_BUFFER_V1",
        entries,
      };
    }

    return payload;
  };

const dispatchEvent = (
  eventName,
  detail,
) => {
  if (
    typeof window ===
    "undefined"
  ) {
    return;
  }

  window.dispatchEvent(
    new CustomEvent(
      eventName,
      { detail },
    ),
  );
};

const OfflineManager = {
  save: async (
    endpoint,
    method = "POST",
    body = null,
    {
      metadata = {},
    } = {},
  ) => {
    const normalizedEndpoint =
      String(endpoint || "")
        .trim();

    const normalizedMethod =
      String(method || "POST")
        .toUpperCase();

    if (!normalizedEndpoint) {
      throw new Error(
        "No se recibió el endpoint de la operación.",
      );
    }

    const type =
      getOperationType(
        normalizedEndpoint,
      );

    if (type === "CHECK_IN") {
      throw new Error(
        "El check-in GPS no puede guardarse offline.",
      );
    }

    const routeId =
      getRouteId(
        normalizedEndpoint,
      );

    if (!routeId) {
      throw new Error(
        "No fue posible identificar la visita de la operación offline.",
      );
    }

    const createdAt =
      new Date().toISOString();

    const storedUser =
      getStoredUser();

    /*
     * En Safari/iPhone se persiste el contenido binario como
     * ArrayBuffer. Es más estable que guardar directamente File/Blob
     * dentro de una estructura FormData en IndexedDB.
     */
    const preparedPayload =
      await prepareOfflinePayload(
        body,
      );

    const item = {
      type,
      routeId:
        String(routeId),
      endpoint:
        normalizedEndpoint,
      method:
        normalizedMethod,
      payload:
        preparedPayload,
      metadata: {
        ...metadata,
        ownerUserId:
          metadata.ownerUserId ||
          storedUser?.id ||
          null,
        ownerCompanyId:
          metadata.ownerCompanyId ||
          storedUser?.company_id ||
          null,
        queuedAt:
          createdAt,
        clientVersion:
          OFFLINE_CLIENT_VERSION,
      },
      status:
        "pending",
      retryCount:
        0,
      lastError:
        null,
      nextRetryAt:
        null,
      createdAt,
      updatedAt:
        createdAt,
    };

    const id =
      await addToSyncQueue(
        item,
      );

    const savedItem = {
      ...item,
      id,
    };

    dispatchEvent(
      OFFLINE_SYNC_EVENTS
        .QUEUE_UPDATED,
      {
        action:
          "UPSERTED",
        item:
          savedItem,
      },
    );

    let authRequired = false;

    try {
      authRequired =
        sessionStorage.getItem(
          AUTH_REQUIRED_STORAGE_KEY,
        ) === "true";
    } catch {
      authRequired = false;
    }

    if (
      typeof navigator !==
        "undefined" &&
      navigator.onLine &&
      !authRequired
    ) {
      dispatchEvent(
        OFFLINE_SYNC_EVENTS
          .SYNC_REQUESTED,
        {
          reason:
            "QUEUE_ITEM_ADDED",
        },
      );
    }

    return savedItem;
  },

  remove: async (id) => {
    await removeFromSyncQueue(id);

    dispatchEvent(
      OFFLINE_SYNC_EVENTS
        .QUEUE_UPDATED,
      {
        action:
          "REMOVED",
        id,
      },
    );
  },

  hasPendingForRoute:
    async (routeId) =>
      (
        await countPendingSyncByRoute(
          routeId,
        )
      ) > 0,

  requestSync: (
    reason = "MANUAL",
  ) => {
    dispatchEvent(
      OFFLINE_SYNC_EVENTS
        .SYNC_REQUESTED,
      { reason },
    );
  },

  eventName:
    OFFLINE_SYNC_EVENTS
      .QUEUE_UPDATED,
};

export default OfflineManager;
