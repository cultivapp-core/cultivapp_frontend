import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FiBell, FiExternalLink, FiLogOut, FiMaximize, FiX } from "react-icons/fi";
import { QRCodeSVG } from "qrcode.react";
import { useAuth } from "../../context/AuthContext";
import { useNotificationContext } from "../../context/NotificationContext";

const RegionalWorkerTopBar = () => {
  const { logout, user } = useAuth();
  const { unreadCount = 0 } = useNotificationContext();
  const navigate = useNavigate();
  const [showCredential, setShowCredential] = useState(false);

  const initials = useMemo(() => {
    const first = user?.first_name?.trim().charAt(0).toUpperCase() || "";
    const last = user?.last_name?.trim().charAt(0).toUpperCase() || "";
    return `${first}${last}` || "MR";
  }, [user?.first_name, user?.last_name]);

  const credentialUrl = user?.id
    ? `${window.location.origin}/verify/${user.id}`
    : "";

  const handleLogout = async () => {
    await logout();
    navigate("/", { replace: true });
  };

  return (
    <>
      <header className="sticky top-0 z-40 shrink-0 border-b border-slate-200/90 bg-white/95 backdrop-blur-xl md:mx-6 md:mt-6 md:rounded-[2rem] md:border md:shadow-sm">
        <div className="relative flex min-h-[72px] items-center justify-end px-4 pt-[env(safe-area-inset-top)] sm:px-5 md:min-h-[76px] md:justify-between md:px-6 md:pt-0">
          <div className="absolute left-1/2 top-1/2 w-[170px] -translate-x-1/2 -translate-y-1/2 text-center md:static md:flex md:w-auto md:translate-x-0 md:translate-y-0 md:items-center md:gap-3 md:text-left">
            <div className="hidden h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-[#87be00]/20 bg-[#87be00]/10 text-sm font-black text-[#87be00] md:flex">
              {initials}
            </div>

            <div className="min-w-0">
              <h2 className="truncate text-[11px] font-black text-slate-900 sm:text-xs md:text-[12px]">
                Hola, {user?.first_name || "Mercaderista"}
              </h2>
              <p className="mt-1 truncate text-[8px] font-black uppercase tracking-[0.18em] text-[#87be00] md:text-slate-400">
                Inventario regional
              </p>
            </div>
          </div>

          <div className="ml-auto flex items-center gap-1.5 sm:gap-2 md:gap-3">
            <button type="button" onClick={() => navigate("/mercaderista-regional/notifications")} aria-label="Abrir notificaciones" className="relative flex h-10 w-10 items-center justify-center rounded-xl text-slate-400 transition hover:bg-[#87be00]/10 hover:text-[#87be00]">
              <FiBell size={18} />
              {unreadCount > 0 && <span className="absolute right-1 top-1 flex h-[17px] min-w-[17px] items-center justify-center rounded-full bg-red-500 px-1 text-[7px] font-black text-white ring-2 ring-white">{unreadCount > 9 ? "9+" : unreadCount}</span>}
            </button>

            <button type="button" onClick={() => setShowCredential(true)} aria-label="Abrir credencial QR" className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-50 text-slate-400 transition hover:bg-[#87be00]/10 hover:text-[#87be00]">
              <FiMaximize size={18} />
            </button>

            <div className="hidden h-6 w-px bg-slate-200 sm:block" />

            <button type="button" onClick={handleLogout} aria-label="Cerrar sesión" title="Cerrar sesión" className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-400 transition hover:bg-red-50 hover:text-red-500">
              <FiLogOut size={18} />
            </button>
          </div>
        </div>
      </header>

      {showCredential && (
        <div className="fixed inset-0 z-[11000] flex items-center justify-center bg-slate-950/65 p-4 backdrop-blur-sm">
          <button type="button" aria-label="Cerrar credencial" onClick={() => setShowCredential(false)} className="absolute inset-0" />
          <section className="relative z-10 w-full max-w-sm overflow-hidden rounded-[2.5rem] bg-white p-6 text-center shadow-2xl">
            <button type="button" onClick={() => setShowCredential(false)} aria-label="Cerrar" className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-xl bg-slate-50 text-slate-400 hover:bg-red-50 hover:text-red-500"><FiX /></button>
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#87be00]/10 text-sm font-black text-[#87be00]">{initials}</div>
            <p className="mt-5 text-[8px] font-black uppercase tracking-[0.24em] text-[#87be00]">Credencial CultivApp</p>
            <h2 className="mt-2 text-xl font-black text-slate-900">{user?.first_name} {user?.last_name}</h2>
            <p className="mt-1 text-[9px] font-black uppercase tracking-wider text-slate-400">Mercaderista regional</p>
            <div className="mx-auto mt-6 w-fit rounded-[2rem] border-4 border-[#87be00]/20 bg-white p-4 shadow-sm"><QRCodeSVG value={credentialUrl} size={170} level="H" /></div>
            <p className="mx-auto mt-4 max-w-xs text-xs leading-relaxed text-slate-500">Escanea el código para verificar la vigencia y los antecedentes de la credencial.</p>
            <a href={credentialUrl} target="_blank" rel="noreferrer" className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-900 px-5 py-4 text-[9px] font-black uppercase tracking-widest text-white transition hover:bg-[#75a700]"><FiExternalLink />Ver credencial completa</a>
          </section>
        </div>
      )}
    </>
  );
};

export default RegionalWorkerTopBar;
