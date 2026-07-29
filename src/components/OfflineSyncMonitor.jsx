import {
  FiAlertTriangle,
  FiCloudOff,
  FiRefreshCw,
  FiUploadCloud,
} from "react-icons/fi";

import {
  useOfflineSync,
} from "../hooks/useOfflineSync";

const OfflineSyncMonitor = () => {
  const {
    isOnline,
    syncing,
    pendingCount,
    failedCount,
    totalCount,
    lastError,
    currentItem,
    startSync,
  } = useOfflineSync();

  if (
    isOnline &&
    !syncing &&
    totalCount === 0
  ) {
    return null;
  }

  return (
    <div className="fixed bottom-[calc(1rem+env(safe-area-inset-bottom))] left-4 right-4 z-[20000] mx-auto max-w-xl rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-white shadow-2xl">
      <div className="flex items-center gap-3">
        <span
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
            syncing
              ? "bg-[#87be00]/20 text-[#a8d52c]"
              : failedCount > 0
                ? "bg-red-500/20 text-red-300"
                : isOnline
                  ? "bg-blue-500/20 text-blue-300"
                  : "bg-amber-400/20 text-amber-300"
          }`}
        >
          {syncing ? (
            <FiRefreshCw
              size={17}
              className="animate-spin"
            />
          ) : failedCount > 0 ? (
            <FiAlertTriangle
              size={17}
            />
          ) : isOnline ? (
            <FiUploadCloud
              size={17}
            />
          ) : (
            <FiCloudOff
              size={17}
            />
          )}
        </span>

        <div className="min-w-0 flex-1">
          <p className="text-[9px] font-black uppercase tracking-wider">
            {syncing
              ? "Sincronizando datos"
              : failedCount > 0
                ? "Sincronización con errores"
                : isOnline
                  ? "Datos pendientes"
                  : "Modo sin conexión"}
          </p>

          <p className="mt-0.5 text-[9px] leading-relaxed text-slate-300">
            {syncing &&
            currentItem
              ? `Procesando ${currentItem.index} de ${currentItem.total}: ${currentItem.type}.`
              : `${pendingCount} pendiente${
                  pendingCount === 1
                    ? ""
                    : "s"
                }${
                  failedCount > 0
                    ? ` · ${failedCount} con error`
                    : ""
                }.`}
          </p>

          {!syncing &&
            lastError && (
              <p className="mt-1 line-clamp-2 text-[8px] leading-relaxed text-red-300">
                {lastError}
              </p>
            )}
        </div>

        {isOnline &&
          !syncing &&
          totalCount > 0 && (
            <button
              type="button"
              onClick={() =>
                startSync({
                  force:
                    true,
                  silent:
                    false,
                })
              }
              className="shrink-0 rounded-xl bg-[#87be00] px-3 py-2 text-[8px] font-black uppercase tracking-wider text-white transition hover:bg-[#76a600] active:scale-95"
            >
              {failedCount > 0
                ? "Reintentar"
                : "Sincronizar"}
            </button>
          )}
      </div>
    </div>
  );
};

export default OfflineSyncMonitor;