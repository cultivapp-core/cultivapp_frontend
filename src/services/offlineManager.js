import {
  addToSyncQueue,
  countPendingSyncByRoute,
  removeFromSyncQueue,
} from "../utils/db";

export const OFFLINE_SYNC_EVENTS = {
  QUEUE_UPDATED:
    "cultivapp:offline-queue-updated",
  ITEM_SUCCESS:
    "cultivapp:sync-item-success",
  ITEM_ERROR:
    "cultivapp:sync-item-error",
  SYNC_COMPLETE:
    "cultivapp:sync-complete",
};

const getOperationType = (
  endpoint,
) => {
  const normalized =
    String(
      endpoint || "",
    ).toLowerCase();

  if (
    normalized.includes(
      "/check-in",
    )
  ) {
    return "CHECK_IN";
  }

  if (
    normalized.includes(
      "/finish",
    )
  ) {
    return "FINISH";
  }

  if (
    normalized.includes(
      "/photo",
    )
  ) {
    return "PHOTO";
  }

  if (
    normalized.includes(
      "/scans",
    )
  ) {
    return "SCAN";
  }

  if (
    normalized.includes(
      "/task",
    )
  ) {
    return "TASK";
  }

  return "OTHER";
};

const getRouteId = (
  endpoint,
) => {
  const match =
    String(
      endpoint || "",
    ).match(
      /\/routes\/([^/?]+)/,
    );

  return match?.[1] ||
    null;
};

const dispatchQueueEvent = (
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
      OFFLINE_SYNC_EVENTS
        .QUEUE_UPDATED,
      {
        detail,
      },
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
      String(
        endpoint || "",
      ).trim();

    const normalizedMethod =
      String(
        method || "POST",
      ).toUpperCase();

    if (!normalizedEndpoint) {
      throw new Error(
        "No se recibió el endpoint de la operación.",
      );
    }

    const type =
      getOperationType(
        normalizedEndpoint,
      );

    if (
      type === "CHECK_IN"
    ) {
      throw new Error(
        "El check-in GPS no puede guardarse offline.",
      );
    }

    const routeId =
      getRouteId(
        normalizedEndpoint,
      );

    const createdAt =
      new Date().toISOString();

    const item = {
      type,
      routeId:
        routeId
          ? String(routeId)
          : null,
      endpoint:
        normalizedEndpoint,
      method:
        normalizedMethod,
      payload:
        body,
      metadata,
      status:
        "pending",
      retryCount: 0,
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

    dispatchQueueEvent({
      action: "ADDED",
      item:
        savedItem,
    });

    return savedItem;
  },

  remove: async (id) => {
    await removeFromSyncQueue(
      id,
    );

    dispatchQueueEvent({
      action: "REMOVED",
      id,
    });
  },

  hasPendingForRoute:
    async (routeId) =>
      (
        await countPendingSyncByRoute(
          routeId,
        )
      ) > 0,

  eventName:
    OFFLINE_SYNC_EVENTS
      .QUEUE_UPDATED,
};

export default OfflineManager;
