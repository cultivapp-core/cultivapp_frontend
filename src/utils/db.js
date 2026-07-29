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

/*
 * La versión 4 conserva la información existente y agrega campos
 * utilizados para reintentos automáticos y diagnóstico.
 */
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
          item.lastError ||
          null,
        nextRetryAt:
          item.nextRetryAt ||
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

export const getPendingSyncByRoute =
  async (routeId) => {
    if (!routeId) {
      return [];
    }

    const items =
      await db.syncQueue
        .where(
          "[status+routeId]",
        )
        .equals([
          "pending",
          String(routeId),
        ])
        .toArray();

    return items.sort(
      (first, second) =>
        Number(first.id) -
        Number(second.id),
    );
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
  async () =>
    db.syncQueue
      .where("status")
      .equals("pending")
      .count();

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

    /*
     * Backoff:
     * 5 s, 10 s, 20 s, 40 s...
     * Máximo 5 minutos.
     */
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
            "Error de sincronización",
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
