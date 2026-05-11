import { useEffect, useState, useRef } from "react";
import { getPendingSync, removeFromSyncQueue } from "../utils/db";
import api from "../api/apiClient";
import toast from "react-hot-toast";

const rebuildBody = (payload) => {
  if (!payload) return null;

  if (payload?.__type === "FormData") {
    const formData = new FormData();
    Object.entries(payload.data).forEach(([key, value]) => {
      if (typeof value === "string" && value.startsWith("data:image")) {
        try {
          const arr = value.split(',');
          const mime = arr[0].match(/:(.*?);/)[1];
          const bstr = atob(arr[1]);
          let n = bstr.length;
          const u8arr = new Uint8Array(n);
          while (n--) u8arr[n] = bstr.charCodeAt(n);
          const file = new File([u8arr], `offline_photo_${Date.now()}.jpg`, { type: mime });
          formData.append(key, file);
        } catch (e) { console.error("Error imagen offline", e); }
      } else {
        formData.append(key, value);
      }
    });
    return formData;
  }
  if (typeof payload === "string") {
    try { return JSON.parse(payload); } catch (e) { return payload; }
  }
  return payload;
};

export const useOfflineSync = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [syncing, setSyncing] = useState(false);
  const isSyncingRef = useRef(false);

  const startSync = async () => {
    if (isSyncingRef.current || !navigator.onLine) return;

    // 🚩 FIX: Validamos que exista un token, no dependemos del objeto "user"
    const token = localStorage.getItem("token");
    if (!token || token === "null" || token === "undefined") return;

    const pending = await getPendingSync();
    if (!pending.length) return;
    
    isSyncingRef.current = true;
    setSyncing(true);
    toast.success("Sincronizando tareas en segundo plano...", { icon: '🔄' });

    for (const item of pending) {
      try {
        const body = rebuildBody(item.payload);
        if (item.method && item.endpoint) {
          const method = item.method.toLowerCase();
          await api[method](item.endpoint, body);
        } else {
          await processOldItem(item, body);
        }
        await removeFromSyncQueue(item.id);
      } catch (error) {
        const statusCode = error.status || error.response?.status;

        if (statusCode === 401 || statusCode === 403) {
           toast.error("Tu sesión expiró en el servidor. Inicia sesión para continuar.");
           isSyncingRef.current = false;
           setSyncing(false);
           return; 
        }

        if (statusCode === 400 || statusCode >= 500) {
           await removeFromSyncQueue(item.id); // Destrabamos la cola si el dato está corrupto
        } else {
           break; // Micro-corte de internet, esperamos al siguiente ciclo
        }
      }
    }

    isSyncingRef.current = false;
    setSyncing(false);
  };

  const processOldItem = async (item, body) => {
    const { type, routeId } = item;
    if (!type || !routeId) return;
    switch (type) {
      case "PHOTO": return await api.post(`/routes/${routeId}/photo`, body);
      case "SCAN": return await api.post(`/routes/${routeId}/scans`, body);
      case "TASK": return await api.post(`/routes/${routeId}/task`, body);
      case "FINISH": return await api.post(`/routes/${routeId}/finish`, body);
      case "CHECK_IN": return await api.post(`/routes/${routeId}/check-in`, body);
    }
  };

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      toast.success("Conexión restablecida. Verificando datos...");
      setTimeout(() => startSync(), 3000);
    };

    const handleOffline = () => {
      setIsOnline(false);
      toast.error("Sin conexión. Trabajando de forma local.");
    };

    const handleVisibility = () => {
      if (document.visibilityState === "visible" && navigator.onLine) startSync();
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    document.addEventListener("visibilitychange", handleVisibility);

    const backupInterval = setInterval(() => {
      if (navigator.onLine && !isSyncingRef.current) startSync();
    }, 20000); // Revisa cada 20 segundos por si falla el evento nativo

    if (navigator.onLine) setTimeout(() => startSync(), 3000);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      document.removeEventListener("visibilitychange", handleVisibility);
      clearInterval(backupInterval);
    };
  }, []);

  return { isOnline, syncing, startSync };
};