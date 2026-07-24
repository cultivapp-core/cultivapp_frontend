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

const serializeFile = (
  value,
) => ({
  __type: "File",
  blob: value,
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
          value instanceof Blob
            ? serializeFile(
                value,
              )
            : value,
      });
    }

    return {
      __type: "FormData",
      entries,
    };
  }

  return payload;
};

export const addToSyncQueue =
  async (item) => {
    try {
      const now =
        new Date().toISOString();

      const safePayload =
        serializeIfNeeded(
          item.payload,
        );

      const id =
        await db.syncQueue.add({
          ...item,
          payload:
            safePayload,
          status:
            item.status ||
            "pending",
          retryCount:
            Number(
              item.retryCount,
            ) || 0,
          lastError:
            item.lastError ||
            null,
          createdAt:
            item.createdAt ||
            now,
          updatedAt:
            now,
        });

      console.log(
        `📍 Guardado en cola ID: ${id}`,
      );

      return id;
    } catch (error) {
      console.error(
        "❌ Dexie error:",
        error,
      );

      throw error;
    }
  };

export const getPendingSync =
  async () => {
    const items =
      await db.syncQueue
        .where("status")
        .equals("pending")
        .toArray();

    return items.sort(
      (a, b) =>
        Number(a.id) -
        Number(b.id),
    );
  };

export const getPendingSyncByRoute =
  async (routeId) => {
    if (!routeId) {
      return [];
    }

    const items =
      await db.syncQueue
        .where("[status+routeId]")
        .equals([
          "pending",
          String(routeId),
        ])
        .toArray();

    return items.sort(
      (a, b) =>
        Number(a.id) -
        Number(b.id),
    );
  };

export const countPendingSyncByRoute =
  async (routeId) => {
    if (!routeId) {
      return 0;
    }

    return db.syncQueue
      .where("[status+routeId]")
      .equals([
        "pending",
        String(routeId),
      ])
      .count();
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

    await db.syncQueue.update(
      id,
      {
        retryCount:
          Number(
            current.retryCount,
          ) + 1,
        lastError:
          String(
            errorMessage ||
            "Error de sincronización",
          ),
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
