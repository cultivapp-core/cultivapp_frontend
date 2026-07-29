import {
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
    startSync,
  } = useOfflineSync();

  if (
    isOnline &&
    !syncing &&
    pendingCount === 0
  ) {
    return null;
  }

  return (
    <div className="fixed bottom-[calc(1rem+env(safe-area-inset-bottom))] right-4 z-[20000] w-[calc(100%-2rem)] max-w-sm rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-white shadow-2xl">
      <div className="flex items-center gap-3">
        <span
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
            syncing
              ? "bg-[#87be00]/20 text-[#a8d52c]"
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
              : isOnline
                ? "Datos pendientes"
                : "Modo sin conexión"}
          </p>

          <p className="mt-0.5 text-[9px] leading-relaxed text-slate-300">
            {syncing
              ? `Procesando ${pendingCount} operación${pendingCount === 1 ? "" : "es"}.`
              : `${pendingCount} operación${pendingCount === 1 ? "" : "es"} pendiente${pendingCount === 1 ? "" : "s"}.`}
          </p>
        </div>

        {isOnline &&
          !syncing &&
          pendingCount > 0 && (
            <button
              type="button"
              onClick={() =>
                startSync()
              }
              className="shrink-0 rounded-xl bg-[#87be00] px-3 py-2 text-[8px] font-black uppercase tracking-wider text-white transition hover:bg-[#76a600]"
            >
              Sincronizar
            </button>
          )}
      </div>
    </div>
  );
};

export default OfflineSyncMonitor;
