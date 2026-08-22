import { useCallback, useEffect, useRef, useState } from "react";
import RegionalOfflineManager, {
  getRegionalOperationalContext,
  REGIONAL_OFFLINE_EVENTS,
} from "../services/regionalOfflineManager";

const emptyStats = {
  pendingCount: 0,
  failedCount: 0,
  totalCount: 0,
  lastError: null,
};

export const useRegionalOfflineSync = (user) => {
  const context = getRegionalOperationalContext(user);
  const enabled = context?.role === "MERCADERISTA_REGIONAL";
  const syncingRef = useRef(false);
  const [isOnline, setIsOnline] = useState(
    typeof navigator === "undefined" ? true : navigator.onLine,
  );
  const [isSyncing, setIsSyncing] = useState(false);
  const [stats, setStats] = useState(emptyStats);

  const refreshStats = useCallback(async () => {
    if (!enabled) {
      setStats(emptyStats);
      return emptyStats;
    }
    const next = await RegionalOfflineManager.stats(user);
    setStats(next);
    return next;
  }, [enabled, user]);

  const sync = useCallback(async () => {
    if (!enabled || syncingRef.current || !navigator.onLine) return null;
    syncingRef.current = true;
    setIsSyncing(true);
    try {
      const result = await RegionalOfflineManager.sync(user);
      await refreshStats();
      return result;
    } finally {
      syncingRef.current = false;
      setIsSyncing(false);
    }
  }, [enabled, refreshStats, user]);

  useEffect(() => {
    refreshStats();
  }, [refreshStats, context?.contextKey]);

  useEffect(() => {
    if (!enabled) return undefined;

    const handleOnline = () => {
      setIsOnline(true);
      sync();
    };
    const handleOffline = () => setIsOnline(false);
    const handleQueue = () => refreshStats();
    const handleSyncRequested = () => sync();

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    window.addEventListener(REGIONAL_OFFLINE_EVENTS.QUEUE_UPDATED, handleQueue);
    window.addEventListener(REGIONAL_OFFLINE_EVENTS.ITEM_SUCCESS, handleQueue);
    window.addEventListener(REGIONAL_OFFLINE_EVENTS.ITEM_ERROR, handleQueue);
    window.addEventListener(REGIONAL_OFFLINE_EVENTS.SYNC_COMPLETE, handleQueue);
    window.addEventListener(
      REGIONAL_OFFLINE_EVENTS.SYNC_REQUESTED,
      handleSyncRequested,
    );

    if (navigator.onLine) sync();

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener(REGIONAL_OFFLINE_EVENTS.QUEUE_UPDATED, handleQueue);
      window.removeEventListener(REGIONAL_OFFLINE_EVENTS.ITEM_SUCCESS, handleQueue);
      window.removeEventListener(REGIONAL_OFFLINE_EVENTS.ITEM_ERROR, handleQueue);
      window.removeEventListener(REGIONAL_OFFLINE_EVENTS.SYNC_COMPLETE, handleQueue);
      window.removeEventListener(
        REGIONAL_OFFLINE_EVENTS.SYNC_REQUESTED,
        handleSyncRequested,
      );
    };
  }, [enabled, refreshStats, sync, context?.contextKey]);

  return {
    enabled,
    isOnline,
    isSyncing,
    ...stats,
    sync,
    retryAll: async () => {
      await RegionalOfflineManager.retryAll(user);
      return refreshStats();
    },
  };
};

export default useRegionalOfflineSync;
