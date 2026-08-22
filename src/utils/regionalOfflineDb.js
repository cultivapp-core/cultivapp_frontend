import Dexie from "dexie";

export const regionalOfflineDb = new Dexie("CultivappRegionalOfflineDB");

regionalOfflineDb.version(1).stores({
  queue:
    "++id,status,contextKey,journeyId,operationType,createdAt,nextRetryAt,[status+contextKey],[contextKey+journeyId]",
  cache: "key,contextKey,type,updatedAt",
  drafts: "key,contextKey,journeyId,updatedAt",
  operationKeys: "key,contextKey,updatedAt",
});

export const putRegionalCache = async ({
  contextKey,
  type,
  scope = "default",
  data,
}) => {
  if (!contextKey || !type) return data;

  const key = `${contextKey}:${type}:${scope}`;
  await regionalOfflineDb.cache.put({
    key,
    contextKey,
    type,
    scope,
    data,
    updatedAt: new Date().toISOString(),
  });

  return data;
};

export const getRegionalCache = async ({
  contextKey,
  type,
  scope = "default",
}) => {
  if (!contextKey || !type) return null;
  return (
    (await regionalOfflineDb.cache.get(
      `${contextKey}:${type}:${scope}`,
    ))?.data ?? null
  );
};

export const addRegionalQueueItem = async (item) => {
  const now = new Date().toISOString();
  return regionalOfflineDb.queue.add({
    ...item,
    status: "pending",
    retryCount: Number(item.retryCount) || 0,
    lastError: null,
    nextRetryAt: null,
    createdAt: item.createdAt || now,
    updatedAt: now,
  });
};

export const getRegionalQueueForContext = async (
  contextKey,
  { includeDeferred = false } = {},
) => {
  if (!contextKey) return [];

  const rows = await regionalOfflineDb.queue
    .where("[status+contextKey]")
    .equals(["pending", contextKey])
    .toArray();

  const now = Date.now();
  return rows
    .filter((item) => {
      if (includeDeferred || !item.nextRetryAt) return true;
      const retryAt = new Date(item.nextRetryAt).getTime();
      return !Number.isFinite(retryAt) || retryAt <= now;
    })
    .sort((a, b) => Number(a.id) - Number(b.id));
};

export const getRegionalQueueStats = async (contextKey) => {
  if (!contextKey) {
    return { pendingCount: 0, failedCount: 0, totalCount: 0, lastError: null };
  }

  const [pending, failed] = await Promise.all([
    regionalOfflineDb.queue
      .where("[status+contextKey]")
      .equals(["pending", contextKey])
      .toArray(),
    regionalOfflineDb.queue
      .where("status")
      .equals("failed")
      .filter((item) => item.contextKey === contextKey)
      .toArray(),
  ]);

  const lastErrorItem = [...failed, ...pending]
    .filter((item) => item.lastError)
    .sort((a, b) => Number(b.id) - Number(a.id))[0];

  return {
    pendingCount: pending.length,
    failedCount: failed.length,
    totalCount: pending.length + failed.length,
    lastError: lastErrorItem?.lastError || null,
  };
};

export const removeRegionalQueueItem = (id) =>
  regionalOfflineDb.queue.delete(id);

export const markRegionalQueueRetry = async (id, message) => {
  const item = await regionalOfflineDb.queue.get(id);
  if (!item) return;

  const retryCount = Number(item.retryCount || 0) + 1;
  const delayMs = Math.min(
    5000 * 2 ** Math.max(retryCount - 1, 0),
    300000,
  );

  await regionalOfflineDb.queue.update(id, {
    status: "pending",
    retryCount,
    lastError: String(message || "Error temporal de sincronización"),
    nextRetryAt: new Date(Date.now() + delayMs).toISOString(),
    updatedAt: new Date().toISOString(),
  });
};

export const markRegionalQueueFailed = (id, message) =>
  regionalOfflineDb.queue.update(id, {
    status: "failed",
    lastError: String(message || "La operación no pudo sincronizarse"),
    nextRetryAt: null,
    updatedAt: new Date().toISOString(),
  });

export const retryRegionalQueue = async (contextKey) => {
  const rows = await regionalOfflineDb.queue
    .where("contextKey")
    .equals(contextKey)
    .toArray();

  await Promise.all(
    rows.map((row) =>
      regionalOfflineDb.queue.update(row.id, {
        status: "pending",
        nextRetryAt: null,
        lastError: null,
        updatedAt: new Date().toISOString(),
      }),
    ),
  );

  return rows.length;
};

export const saveRegionalDraft = async ({
  contextKey,
  journeyId,
  data,
}) => {
  if (!contextKey || !journeyId) return;
  const key = `${contextKey}:${journeyId}`;
  await regionalOfflineDb.drafts.put({
    key,
    contextKey,
    journeyId: String(journeyId),
    data,
    updatedAt: new Date().toISOString(),
  });
};

export const getRegionalDraft = async ({ contextKey, journeyId }) => {
  if (!contextKey || !journeyId) return null;
  return (
    (await regionalOfflineDb.drafts.get(`${contextKey}:${journeyId}`))?.data ??
    null
  );
};

export const removeRegionalDraft = async ({ contextKey, journeyId }) => {
  if (!contextKey || !journeyId) return;
  await regionalOfflineDb.drafts.delete(`${contextKey}:${journeyId}`);
};

export const getOrCreateRegionalOperationId = async ({
  contextKey,
  key,
}) => {
  if (!contextKey || !key) {
    return globalThis.crypto?.randomUUID?.() ??
      `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  const storageKey = `${contextKey}:${key}`;
  const existing = await regionalOfflineDb.operationKeys.get(storageKey);
  if (existing?.operationId) return existing.operationId;

  const operationId =
    globalThis.crypto?.randomUUID?.() ??
    `${Date.now()}-${Math.random().toString(16).slice(2)}`;

  await regionalOfflineDb.operationKeys.put({
    key: storageKey,
    contextKey,
    operationId,
    updatedAt: new Date().toISOString(),
  });

  return operationId;
};
