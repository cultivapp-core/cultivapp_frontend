import { createElement, useEffect, useMemo, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  FiBell,
  FiCalendar,
  FiChevronLeft,
  FiChevronRight,
  FiHome,
  FiLogOut,
  FiMapPin,
  FiMenu,
  FiX,
} from "react-icons/fi";
import { useAuth } from "../../context/AuthContext";
import { useNotificationContext } from "../../context/NotificationContext";

const STORAGE_KEY = "cultivapp-regional-worker-sidebar-collapsed";

const NAVIGATION = [
  { to: "/mercaderista-regional/home", icon: FiHome, label: "Inicio", section: "General", end: true },
  { to: "/mercaderista-regional/agenda", icon: FiCalendar, label: "Mi agenda", section: "Planificación" },
  { to: "/mercaderista-regional/locales", icon: FiMapPin, label: "Mis locales", section: "Planificación" },
  { to: "/mercaderista-regional/notifications", icon: FiBell, label: "Mi bandeja", section: "Comunicación", notifications: true },
];

const SectionTitle = ({ children, collapsed }) => (
  <div className="mb-2 mt-6">
    <p className={`px-4 text-[9px] font-black uppercase tracking-[0.25em] text-slate-300 transition-all duration-300 ${collapsed ? "md:h-0 md:overflow-hidden md:opacity-0" : "opacity-100"}`}>{children}</p>
    <div className={`mx-3 bg-slate-100 transition-all duration-300 ${collapsed ? "md:mt-2 md:h-px" : "h-0"}`} />
  </div>
);

const RegionalNavItem = ({ item, collapsed, unreadCount, onNavigate, onTooltip, onTooltipLeave }) => (
  <NavLink
    to={item.to}
    end={item.end}
    aria-label={item.label}
    onClick={onNavigate}
    onMouseEnter={(event) => onTooltip(event, item.label)}
    onMouseLeave={onTooltipLeave}
    className={({ isActive }) => `group relative flex min-h-[48px] items-center gap-3 overflow-hidden rounded-2xl px-4 py-3 text-[11px] font-black uppercase tracking-wider transition-all duration-300 ${isActive ? "bg-[#87be00]/10 text-[#87be00] shadow-sm shadow-[#87be00]/10" : "text-slate-400 hover:bg-slate-50 hover:text-slate-900"} ${collapsed ? "md:justify-center md:px-0" : "justify-start"}`}
  >
    {({ isActive }) => (
      <>
        <span aria-hidden="true" className={`absolute bottom-2 left-0 top-2 w-1 rounded-r-full bg-[#87be00] transition-opacity ${isActive ? "opacity-100" : "opacity-0"}`} />
        <div className="relative flex shrink-0 items-center justify-center">
          {createElement(item.icon, { size: collapsed ? 20 : 18, className: "min-w-5" })}
          {item.notifications && unreadCount > 0 && <span className="absolute -right-2 -top-2 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-red-500 px-1 text-[8px] font-black text-white ring-2 ring-white">{unreadCount > 9 ? "9+" : unreadCount}</span>}
        </div>
        <span className={`overflow-hidden whitespace-nowrap transition-all duration-300 ${collapsed ? "md:w-0 md:opacity-0" : "w-auto opacity-100"}`}>{item.label}</span>
      </>
    )}
  </NavLink>
);

const RegionalWorkerSidebar = () => {
  const { user, logout } = useAuth();
  const { unreadCount = 0 } = useNotificationContext();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(() =>
    typeof window !== "undefined" && window.localStorage.getItem(STORAGE_KEY) === "true"
  );
  const [tooltip, setTooltip] = useState({ label: "", top: 0 });

  const initials = useMemo(() => {
    const first = user?.first_name?.trim().charAt(0).toUpperCase() || "";
    const last = user?.last_name?.trim().charAt(0).toUpperCase() || "";
    return `${first}${last}` || "MR";
  }, [user?.first_name, user?.last_name]);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, String(isCollapsed));
  }, [isCollapsed]);

  useEffect(() => {
    if (!isOpen) {
      document.body.style.overflow = "";
      return undefined;
    }
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, [isOpen]);

  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key === "Escape") setIsOpen(false);
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, []);

  const showTooltip = (event, label) => {
    if (!isCollapsed) return;
    const rect = event.currentTarget.getBoundingClientRect();
    setTooltip({ label, top: rect.top + rect.height / 2 });
  };

  const handleLogout = async () => {
    setIsOpen(false);
    await logout();
    navigate("/", { replace: true });
  };

  return (
    <>
      {!isOpen && (
        <button type="button" onClick={() => setIsOpen(true)} aria-label="Abrir menú" aria-expanded={isOpen} className="fixed left-4 top-[max(1rem,env(safe-area-inset-top))] z-[9990] flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-800 shadow-lg transition hover:bg-slate-50 active:scale-95 md:hidden">
          <FiMenu size={21} />
        </button>
      )}

      {isOpen && <button type="button" aria-label="Cerrar menú" onClick={() => setIsOpen(false)} className="fixed inset-0 z-[9995] bg-slate-950/60 backdrop-blur-sm md:hidden" />}

      <aside aria-label="Navegación Mercaderista Regional" className={`fixed left-0 top-0 z-[9999] flex h-dvh w-[86vw] max-w-[320px] flex-col border-r border-slate-200 bg-white shadow-2xl transition-all duration-300 ease-in-out md:sticky md:h-dvh md:max-w-none md:translate-x-0 md:shadow-none ${isOpen ? "translate-x-0" : "-translate-x-full"} ${isCollapsed ? "md:w-20" : "md:w-72"}`}>
        <button type="button" onClick={() => setIsOpen(false)} aria-label="Cerrar menú" className="absolute right-4 top-4 z-50 flex h-10 w-10 items-center justify-center rounded-xl text-slate-400 transition hover:bg-red-50 hover:text-red-500 md:hidden"><FiX size={20} /></button>

        <button type="button" onClick={() => setIsCollapsed((current) => !current)} aria-label={isCollapsed ? "Expandir menú" : "Contraer menú"} aria-expanded={!isCollapsed} className="absolute -right-3 top-12 z-50 hidden h-7 w-7 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-400 shadow-md transition hover:scale-110 hover:text-[#87be00] md:flex">
          {isCollapsed ? <FiChevronRight size={14} /> : <FiChevronLeft size={14} />}
        </button>

        <div className={`flex min-h-[104px] shrink-0 items-center border-b border-slate-100 transition-all duration-300 ${isCollapsed ? "md:justify-center md:px-0" : "justify-start px-6"}`}>
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#87be00]/10"><span className="h-3 w-3 rounded-full bg-[#87be00] shadow-[0_0_10px_rgba(135,190,0,0.65)]" /></div>
            <div className={`overflow-hidden transition-all duration-300 ${isCollapsed ? "md:w-0 md:opacity-0" : "w-auto opacity-100"}`}>
              <h2 className="whitespace-nowrap text-xl font-black leading-none tracking-tight text-[#87be00]">Cultiv<span className="text-slate-900">App</span></h2>
              <p className="mt-1 whitespace-nowrap text-[8px] font-black uppercase tracking-[0.28em] text-slate-400">Inventario Regional</p>
            </div>
          </div>
        </div>

        <div className="custom-scrollbar flex-1 overflow-y-auto overflow-x-hidden py-4">
          <nav className={`flex flex-col gap-1.5 ${isCollapsed ? "px-2" : "px-4"}`}>
            {NAVIGATION.map((item, index) => {
              const showSection = index === 0 || item.section !== NAVIGATION[index - 1].section;
              return (
                <div key={item.to}>
                  {showSection && <SectionTitle collapsed={isCollapsed}>{item.section}</SectionTitle>}
                  <RegionalNavItem item={item} collapsed={isCollapsed} unreadCount={unreadCount} onNavigate={() => setIsOpen(false)} onTooltip={showTooltip} onTooltipLeave={() => setTooltip({ label: "", top: 0 })} />
                </div>
              );
            })}

            <SectionTitle collapsed={isCollapsed}>Cuenta</SectionTitle>
            <button type="button" onClick={handleLogout} onMouseEnter={(event) => showTooltip(event, "Cerrar sesión")} onMouseLeave={() => setTooltip({ label: "", top: 0 })} className={`flex min-h-[48px] items-center gap-3 rounded-2xl px-4 py-3 text-[11px] font-black uppercase tracking-wider text-slate-400 transition-all duration-300 hover:bg-red-50 hover:text-red-500 ${isCollapsed ? "md:justify-center md:px-0" : "justify-start"}`}>
              <FiLogOut size={isCollapsed ? 20 : 18} className="min-w-5 shrink-0" />
              <span className={`overflow-hidden whitespace-nowrap transition-all duration-300 ${isCollapsed ? "md:w-0 md:opacity-0" : "w-auto opacity-100"}`}>Cerrar sesión</span>
            </button>
          </nav>
        </div>

        <div className="flex min-h-[84px] shrink-0 items-center border-t border-slate-100 px-5 pb-[env(safe-area-inset-bottom)]">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#87be00]/10 text-[11px] font-black text-[#87be00]">{initials}</div>
          <div className={`ml-3 min-w-0 overflow-hidden transition-all duration-300 ${isCollapsed ? "md:ml-0 md:w-0 md:opacity-0" : "opacity-100"}`}>
            <p className="truncate text-[10px] font-black uppercase text-slate-800">{user?.first_name || "Mercaderista"} {user?.last_name || ""}</p>
            <p className="mt-0.5 text-[8px] font-black uppercase tracking-[0.2em] text-slate-400">Mercaderista regional</p>
          </div>
        </div>
      </aside>

      {isCollapsed && tooltip.label && <div role="tooltip" className="pointer-events-none fixed left-24 z-[99999] hidden -translate-y-1/2 whitespace-nowrap rounded-xl bg-slate-900 px-3 py-2 text-[10px] font-black uppercase tracking-wider text-white shadow-2xl md:block" style={{ top: `${tooltip.top}px` }}>{tooltip.label}</div>}
    </>
  );
};

export default RegionalWorkerSidebar;
