import Dexie from "dexie";

export const db = new Dexie(
  "CultivappDB",
);

db.version(2).stores({
  visits:
    "id, cadena, direccion, status",
  questions:
    "id, question, is_required",
  syncQueue:
    "++id, type, routeId, endpoint, method, status, createdAt",
});

db.version(3).stores({
  visits:
    "id, cadena, direccion, status",
  questions:
    "id, question, is_required",
  syncQueue:
    "++id, status, routeId, type, createdAt, [status+routeId]",
  visitDrafts:
    "routeId, updatedAt, step, status",
});

db.version(4).stores({
  visits:
    "id, cadena, direccion, status",
  questions:
    "id, question, is_required",
  syncQueue:
    "++id, status, routeId, type, createdAt, nextRetryAt, [status+routeId]",
  visitDrafts:
    "routeId, updatedAt, step, status",
});

/*
 * Versión 5:
 * - conserva la cola existente;
 * - permite distinguir pendientes y fallidos;
 * - mantiene compatibilidad con registros antiguos.
 */
db.version(5).stores({
  visits:
    "id, cadena, direccion, status",
  questions:
    "id, question, is_required",
  syncQueue:
    "++id, status, routeId, type, createdAt, nextRetryAt, [status+routeId]",
  visitDrafts:
    "routeId, updatedAt, step, status",
});

const serializeFile = (
  value,
) => ({
  __type:
    "File",
  blob:
    value,
  name:
    value?.name ||
    `archivo-${Date.now()}`,
  mimeType:
    value?.type ||
    "application/octet-stream",
  lastModified:
    value?.lastModified ||
    Date.now(),
});

const serializeIfNeeded = (
  payload,
) => {
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
            ? serializeFile(
                value,
              )
            : value,
      });
    }

    return {
      __type:
        "FormData",
      entries,
    };
  }

  return payload;
};

const endpointForLegacyItem = (
  item,
) => {
  const routeId =
    item?.routeId
      ? String(
          item.routeId,
        )
      : null;

  if (!routeId) {
    return null;
  }

  switch (
    String(
      item?.type ||
      "",
    ).toUpperCase()
  ) {
    case "PHOTO":
      return `/routes/${routeId}/photo`;

    case "SCAN":
      return `/routes/${routeId}/scans`;

    case "TASK":
      return `/routes/${routeId}/task`;

    case "FINISH":
      return `/routes/${routeId}/finish`;

    case "CHECK_IN":
      return `/routes/${routeId}/check-in`;

    default:
      return null;
  }
};

export const normalizeLegacySyncQueue =
  async () => {
    const items =
      await db.syncQueue
        .toArray();

    if (
      items.length === 0
    ) {
      return 0;
    }

    let normalizedCount = 0;

    await db.transaction(
      "rw",
      db.syncQueue,
      async () => {
        for (const item of items) {
          const endpoint =
            item.endpoint ||
            endpointForLegacyItem(
              item,
            );

          const method =
            String(
              item.method ||
              "POST",
            ).toUpperCase();

          const status =
            [
              "pending",
              "failed",
            ].includes(
              item.status,
            )
              ? item.status
              : "pending";

          const changes = {
            endpoint,
            method,
            status,
            retryCount:
              Number(
                item.retryCount,
              ) || 0,
            lastError:
              item.lastError ||
              null,
            nextRetryAt:
              item.nextRetryAt ||
              null,
            updatedAt:
              item.updatedAt ||
              new Date().toISOString(),
          };

          await db.syncQueue.update(
            item.id,
            changes,
          );

          normalizedCount += 1;
        }
      },
    );

    return normalizedCount;
  };

export const addToSyncQueue =
  async (item) => {
    const now =
      new Date().toISOString();

    const id =
      await db.syncQueue.add({
        ...item,
        routeId:
          item.routeId
            ? String(
                item.routeId,
              )
            : null,
        endpoint:
          item.endpoint ||
          endpointForLegacyItem(
            item,
          ),
        method:
          String(
            item.method ||
            "POST",
          ).toUpperCase(),
        payload:
          serializeIfNeeded(
            item.payload,
          ),
        status:
          "pending",
        retryCount:
          Number(
            item.retryCount,
          ) || 0,
        lastError:
          null,
        nextRetryAt:
          null,
        createdAt:
          item.createdAt ||
          now,
        updatedAt:
          now,
      });

    console.log(
      `📍 Operación offline guardada. ID: ${id}`,
    );

    return id;
  };

export const getPendingSync =
  async ({
    includeDeferred =
      false,
  } = {}) => {
    const items =
      await db.syncQueue
        .where("status")
        .equals("pending")
        .toArray();

    const now =
      Date.now();

    return items
      .filter(
        (item) => {
          if (
            includeDeferred ||
            !item.nextRetryAt
          ) {
            return true;
          }

          const retryDate =
            new Date(
              item.nextRetryAt,
            ).getTime();

          return (
            !Number.isFinite(
              retryDate,
            ) ||
            retryDate <= now
          );
        },
      )
      .sort(
        (first, second) =>
          Number(first.id) -
          Number(second.id),
      );
  };

export const getSyncQueueStats =
  async () => {
    const [
      pendingItems,
      failedItems,
    ] = await Promise.all([
      db.syncQueue
        .where("status")
        .equals("pending")
        .toArray(),
      db.syncQueue
        .where("status")
        .equals("failed")
        .toArray(),
    ]);

    const allItems = [
      ...pendingItems,
      ...failedItems,
    ].sort(
      (first, second) =>
        Number(second.id) -
        Number(first.id),
    );

    const errorItem =
      allItems.find(
        (item) =>
          item.lastError,
      );

    return {
      pendingCount:
        pendingItems.length,
      failedCount:
        failedItems.length,
      totalCount:
        pendingItems.length +
        failedItems.length,
      lastError:
        errorItem?.lastError ||
        null,
      lastErrorItem:
        errorItem ||
        null,
    };
  };

export const getPendingSyncByRoute =
  async (routeId) => {
    if (!routeId) {
      return [];
    }

    return db.syncQueue
      .where(
        "[status+routeId]",
      )
      .equals([
        "pending",
        String(routeId),
      ])
      .sortBy("id");
  };

export const countPendingSyncByRoute =
  async (routeId) => {
    if (!routeId) {
      return 0;
    }

    return db.syncQueue
      .where(
        "[status+routeId]",
      )
      .equals([
        "pending",
        String(routeId),
      ])
      .count();
  };

export const countPendingSync =
  async () => {
    const stats =
      await getSyncQueueStats();

    return stats.totalCount;
  };

export const markSyncItemRetry =
  async (
    id,
    errorMessage,
  ) => {
    const current =
      await db.syncQueue.get(
        id,
      );

    if (!current) {
      return;
    }

    const retryCount =
      Number(
        current.retryCount,
      ) + 1;

    const delayMs =
      Math.min(
        5_000 *
          2 **
            Math.max(
              retryCount - 1,
              0,
            ),
        300_000,
      );

    await db.syncQueue.update(
      id,
      {
        status:
          "pending",
        retryCount,
        lastError:
          String(
            errorMessage ||
            "Error temporal de sincronización",
          ),
        nextRetryAt:
          new Date(
            Date.now() +
              delayMs,
          ).toISOString(),
        updatedAt:
          new Date().toISOString(),
      },
    );
  };

export const markSyncItemFailed =
  async (
    id,
    errorMessage,
  ) => {
    await db.syncQueue.update(
      id,
      {
        status:
          "failed",
        lastError:
          String(
            errorMessage ||
            "La operación no pudo sincronizarse.",
          ),
        nextRetryAt:
          null,
        updatedAt:
          new Date().toISOString(),
      },
    );
  };

export const retryAllSyncItems =
  async () => {
    const ids =
      await db.syncQueue
        .toCollection()
        .primaryKeys();

    if (
      ids.length === 0
    ) {
      return 0;
    }

    await db.syncQueue
      .where("id")
      .anyOf(ids)
      .modify({
        status:
          "pending",
        nextRetryAt:
          null,
        updatedAt:
          new Date().toISOString(),
      });

    return ids.length;
  };

export const clearSyncItemRetry =
  async (id) => {
    if (
      id === undefined ||
      id === null
    ) {
      return;
    }

    await db.syncQueue.update(
      id,
      {
        retryCount:
          0,
        lastError:
          null,
        nextRetryAt:
          null,
        updatedAt:
          new Date().toISOString(),
      },
    );
  };

export const removeFromSyncQueue =
  async (id) => {
    if (
      id === undefined ||
      id === null
    ) {
      return;
    }

    await db.syncQueue.delete(
      id,
    );
  };

export const getSyncQueueSnapshot =
  async () =>
    db.syncQueue
      .orderBy("id")
      .toArray();

export const saveVisitDraft =
  async (draft) => {
    if (!draft?.routeId) {
      throw new Error(
        "El borrador necesita routeId.",
      );
    }

    return db.visitDrafts.put({
      ...draft,
      routeId:
        String(
          draft.routeId,
        ),
      updatedAt:
        draft.updatedAt ||
        new Date().toISOString(),
    });
  };

export const getVisitDraft =
  async (routeId) => {
    if (!routeId) {
      return null;
    }

    return (
      await db.visitDrafts.get(
        String(routeId),
      )
    ) || null;
  };

export const removeVisitDraft =
  async (routeId) => {
    if (!routeId) {
      return;
    }

    await db.visitDrafts.delete(
      String(routeId),
    );
  };
