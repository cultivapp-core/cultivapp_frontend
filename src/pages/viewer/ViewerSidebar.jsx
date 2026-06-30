import React, { useState, useEffect } from "react";
import { NavLink, Link, useLocation } from "react-router-dom";
import { 
  FiPieChart, FiBarChart2, FiNavigation, FiCamera, 
  FiLogOut, FiMenu, FiX, FiChevronLeft, FiChevronRight, 
  FiActivity, FiUserCheck, FiPackage, FiMap, FiBell
} from "react-icons/fi";
import { useAuth } from "../../context/AuthContext";
import { useNotificationContext } from "../../context/NotificationContext";

const ViewerSidebar = ({ isCollapsed, setIsCollapsed }) => {
  const { user, logout } = useAuth();
  const { unreadCount } = useNotificationContext();
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    setIsOpen(false);
  }, [location]);

  const initials = `${user?.first_name?.[0] || 'V'}${user?.last_name?.[0] || 'C'}`.toUpperCase();

  const linkBase = "flex items-center gap-3 px-4 py-3 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all duration-300";
  const linkInactive = "text-gray-400 hover:bg-gray-50 hover:text-gray-900";
  const linkActive = "bg-[#87be00]/10 text-[#87be00] shadow-sm shadow-[#87be00]/5";

  // 🚩 Texto del link: visible siempre en mobile (drawer w-72),
  // oculto en md (sidebar angosto fijo), y en lg depende de isCollapsed
  const labelClass = (extra = "") =>
    `whitespace-nowrap overflow-hidden md:hidden ${!isCollapsed ? "lg:inline" : "lg:hidden"} ${extra}`;

  const NavItem = ({ to, icon: Icon, label, end = false }) => (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) => `${linkBase} ${isActive ? linkActive : linkInactive}`}
    >
      <Icon size={18} className="shrink-0" />
      <span className={labelClass()}>{label}</span>
    </NavLink>
  );

  return (
    <>
      {/* 🚩 TOP NAVBAR MÓVIL (RÉPLICA DEL SUPERVISOR) */}
      <div className="md:hidden fixed top-3 left-3 right-3 h-16 bg-white rounded-3xl border border-gray-100 shadow-[0_10px_30px_rgba(0,0,0,0.03)] flex items-center justify-between px-4 z-[9990]">
        <div className="flex items-center gap-3">
          <button onClick={() => setIsOpen(true)} className="p-2 text-gray-500 hover:text-gray-900 transition-colors">
            <FiMenu size={22} />
          </button>
          <div className="w-9 h-9 bg-[#87be00]/10 text-[#87be00] rounded-full flex items-center justify-center text-xs font-black tracking-tighter border border-[#87be00]/20">
            {initials}
          </div>
        </div>

        
      </div>

      {/* 2. OVERLAY MÓVIL */}
      {isOpen && <div onClick={() => setIsOpen(false)} className="md:hidden fixed inset-0 bg-black/50 z-[9995] backdrop-blur-sm" />}

      {/* 3. SIDEBAR */}
      <aside className={`
        fixed md:sticky top-0 bottom-0 left-0 h-screen z-[9998] bg-white border-r border-gray-100 flex flex-col justify-between font-[Outfit] shadow-2xl md:shadow-none transition-all duration-300
        ${isOpen ? "translate-x-0 w-72 pt-4" : "-translate-x-full md:translate-x-0"}
        md:w-20 ${isCollapsed ? "lg:w-20" : "lg:w-72"}
      `}>

        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="hidden lg:flex absolute -right-3 top-12 bg-white border border-gray-100 shadow-md rounded-full p-1.5 text-gray-400 hover:text-[#87be00] hover:scale-110 transition-all z-50"
        >
          {isCollapsed ? <FiChevronRight size={14} /> : <FiChevronLeft size={14} />}
        </button>

        <div className="overflow-y-auto pr-1 md:pr-2 custom-scrollbar flex-1 pb-4 pt-6 md:pt-8">
          <div className={`mb-8 md:mb-10 flex items-start ${isCollapsed ? "md:justify-center" : "md:justify-center lg:justify-between"} px-4 md:px-0 lg:px-6`}>
            <div className={`transition-all duration-300 md:hidden ${!isCollapsed ? "lg:block" : "lg:hidden"}`}>
              <h2 className="text-2xl font-black text-[#87be00] tracking-tighter italic leading-none">
                Cultiv<span className="text-gray-900">App</span>
              </h2>
              <p className="text-[9px] text-gray-300 uppercase tracking-[0.3em] font-black mt-1">Viewer Control</p>
            </div>
            <button onClick={() => setIsOpen(false)} className="md:hidden p-2 text-gray-400 hover:text-gray-900 bg-gray-50 rounded-xl transition-colors">
              <FiX size={18} />
            </button>
          </div>

          <nav className="flex flex-col gap-1.5 px-2 md:px-3 lg:px-4">
            <p className={`text-[9px] font-black text-gray-300 uppercase tracking-[0.3em] mb-2 ml-4 ${labelClass()}`}>Métricas</p>
            <NavItem to="/viewer/dashboard" icon={FiPieChart} label="Panorama" />
            <NavItem to="/viewer/reportes" icon={FiBarChart2} label="Métricas" />
            <NavItem to="/viewer/mercaderistas" icon={FiUserCheck} label="Mercaderistas" />
            <NavItem to="/viewer/trend" icon={FiBarChart2} label="Tendencia Ventas" />
            <NavItem to="/viewer/productos" icon={FiPackage} label="Productos" />
            <NavItem to="/viewer/geo-chain" icon={FiMap} label="Geografía y Cadena" />

            <p className={`text-[9px] font-black text-gray-300 uppercase tracking-[0.3em] mt-6 mb-2 ml-4 ${labelClass()}`}>Logística</p>
            <NavItem to="/viewer/planificacion" icon={FiNavigation} label="Monitoreo Rutas" />

            <p className={`text-[9px] font-black text-gray-300 uppercase tracking-[0.3em] mt-6 mb-2 ml-4 ${labelClass()}`}>Control</p>
            <NavItem to="/viewer/galeria" icon={FiCamera} label="Validar Fotos" />
            <NavItem to="/viewer/consolidado" icon={FiActivity} label="Consolidado Operativo" />
          </nav>
        </div>

        <div className="pt-4 md:pt-6 border-t border-gray-100 mt-4 shrink-0 bg-white pb-4">
          <div className={`px-4 md:px-0 lg:px-6 mb-4 md:hidden ${!isCollapsed ? "lg:block" : "lg:hidden"}`}>
            <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1">Viewer Control</p>
            <p className="text-[10px] font-black text-[#87be00] uppercase truncate italic">{user?.company_name}</p>
          </div>
          <button
            onClick={logout}
            className="w-full flex items-center justify-center lg:justify-start gap-3 py-3 px-4 md:px-0 lg:px-6 mx-auto md:w-12 lg:w-auto rounded-2xl text-[10px] font-black uppercase tracking-widest text-red-400 hover:bg-red-50 transition-all duration-300"
          >
            <FiLogOut size={16} className="shrink-0" />
            <span className={labelClass()}>Cerrar Sesión</span>
          </button>
        </div>
      </aside>
    </>
  );
};

export default ViewerSidebar;