import React, { useState, useEffect } from "react";
import { NavLink, Link, useLocation } from "react-router-dom";
import { 
  FiPieChart, FiBarChart2, FiNavigation, FiCamera, 
  FiLogOut, FiMenu, FiX, FiChevronLeft, FiChevronRight, 
  FiActivity, FiUserCheck, FiPackage, FiMap, FiBell
} from "react-icons/fi";
import { useAuth } from "../../context/AuthContext";
import { useNotificationContext } from "../../context/NotificationContext";

const ViewerSidebar = () => {
  const { user, logout } = useAuth();
  const { unreadCount } = useNotificationContext();
  const location = useLocation();

  // Estados independientes para Móvil (isOpen) y Escritorio (isCollapsed)
  const [isOpen, setIsOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  
  // Control de Tooltips globales flotantes
  const [hoveredLabel, setHoveredLabel] = useState(null);
  const [tooltipTop, setTooltipTop] = useState(0);

  // Cerrar el menú automáticamente en móvil al cambiar de ruta
  useEffect(() => {
    setIsOpen(false);
  }, [location]);

  // Iniciales del usuario para el avatar compacto
  const initials = `${user?.first_name?.[0] || 'V'}${user?.last_name?.[0] || 'C'}`.toUpperCase();

  // --- SUB-COMPONENTE PARA LOS LINKS (Simetría matemática perfecta) ---
  const NavItem = ({ to, icon: Icon, label, badge, end = false }) => (
    <NavLink
      to={to}
      end={end}
      onMouseEnter={(e) => {
        if (isCollapsed) {
          const rect = e.currentTarget.getBoundingClientRect();
          setHoveredLabel(label);
          setTooltipTop(rect.top + rect.height / 2);
        }
      }}
      onMouseLeave={() => setHoveredLabel(null)}
      className={({ isActive }) => `
        relative flex items-center gap-3 py-3 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all duration-300 group
        ${isActive ? 'bg-[#87be00]/10 text-[#87be00] shadow-sm shadow-[#87be00]/5' : 'text-gray-400 hover:bg-gray-50 hover:text-gray-900'}
        ${isCollapsed ? 'justify-center px-0 md:mx-2' : 'justify-center md:justify-start px-0 md:px-4 mx-2 md:mx-0'} 
      `}
    >
      <div className="relative flex items-center justify-center">
        <Icon size={isCollapsed ? 20 : 18} className="min-w-[20px] transition-all duration-300" />
        {badge > 0 && (
          <span className={`absolute -top-1.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-red-500 text-[8px] font-black text-white ring-2 ring-white -right-2 top-0 ${isCollapsed ? '' : 'md:-right-1.5 md:top-1.5'}`}>
            {badge > 9 ? '9+' : badge}
          </span>
        )}
      </div>

      <span className={`whitespace-nowrap transition-all duration-300 overflow-hidden ${isCollapsed ? 'hidden' : 'hidden md:block w-auto opacity-100'}`}>
        {label}
      </span>
    </NavLink>
  );

  // --- SUB-COMPONENTE PARA LOS TÍTULOS ---
  const SectionTitle = ({ title }) => (
    <div className="mt-6 mb-2">
      <p className={`text-[9px] font-black text-gray-300 uppercase tracking-[0.3em] ml-4 transition-all duration-300 ${isCollapsed ? 'hidden' : 'hidden md:block'}`}>
        {title}
      </p>
      <div className={`h-[1px] bg-gray-100 mx-4 transition-all duration-300 ${isCollapsed ? 'block' : 'block md:hidden'}`} />
    </div>
  );

  return (
    <>
      {/* 1. BOTÓN HAMBURGUESA MÓVIL */}
      {!isOpen && (
        <div className="md:hidden fixed top-4 left-4 z-[9990]">
          <button
            onClick={() => setIsOpen(true)}
            className="p-3 bg-white rounded-xl shadow-lg text-gray-800 border border-gray-100 hover:bg-gray-50 active:scale-95 transition-all"
          >
            <FiMenu size={24} />
          </button>
        </div>
      )}

      {/* 2. OVERLAY MÓVIL */}
      {isOpen && (
        <div 
          onClick={() => setIsOpen(false)} 
          className="md:hidden fixed inset-0 bg-black/60 z-[9995] backdrop-blur-sm transition-opacity"
        />
      )}

      {/* 3. SIDEBAR ASIDE */}
      <aside className={`
        fixed md:sticky top-0 left-0 z-[9999] bg-white h-screen flex flex-col justify-between font-[Outfit] border-r border-gray-100
        transition-all duration-300 ease-in-out shadow-2xl md:shadow-none
        ${isOpen ? "translate-x-0 w-20 md:w-72" : "-translate-x-full md:translate-x-0"}
        ${isCollapsed ? "md:w-20" : "md:w-72"} 
      `}>

        {/* BOTÓN DE CIERRE MÓVIL PERFECTAMENTE CENTRADO */}
        <button
          onClick={() => setIsOpen(false)}
          className="md:hidden absolute top-3 left-1/2 -translate-x-1/2 p-2 text-gray-400 hover:bg-red-50 hover:text-red-500 rounded-xl transition-colors z-50"
        >
          <FiX size={20} />
        </button>

        {/* BOTÓN FLECHA DE COLAPSO DESKTOP */}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="hidden md:flex absolute -right-3 top-12 bg-white border border-gray-100 shadow-md rounded-full p-1.5 text-gray-400 hover:text-[#87be00] hover:scale-110 transition-all z-50"
        >
          {isCollapsed ? <FiChevronRight size={14} /> : <FiChevronLeft size={14} />}
        </button>

        {/* CONTENEDOR CON SCROLL INTEGRADO SIN DESPLAZAMIENTOS ASIMÉTRICOS */}
        <div className={`overflow-y-auto overflow-x-hidden custom-scrollbar flex-1 pb-4 ${isCollapsed ? 'pr-0' : 'pr-0 md:pr-2'}`}>
          
          {/* HEADER / LOGO CENTRADO */}
          <Link to="/viewer/dashboard" className={`block mt-16 md:mt-8 mb-10 transition-all duration-300 hover:opacity-80 flex justify-center ${isCollapsed ? 'md:justify-center md:px-0' : 'md:justify-center md:justify-start md:px-6'}`}>
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-[#87be00] animate-pulse flex-shrink-0 shadow-[0_0_8px_rgba(135,190,0,0.6)]" />
              <div className={`overflow-hidden transition-all duration-300 ${isCollapsed ? 'hidden' : 'hidden md:block'}`}>
                <h2 className="text-xl font-black text-[#87be00] tracking-tighter uppercase leading-none italic">
                  Cultiv<span className="text-gray-900">App</span>
                </h2>
                <p className="text-[8px] font-black text-gray-400 uppercase tracking-[0.3em] mt-1">Viewer Control</p>
              </div>
            </div>
          </Link>

          {/* LISTA DE NAVEGACIÓN */}
          <nav className={`flex flex-col gap-1.5 ${isCollapsed ? 'px-2' : 'px-0 md:px-4'}`}>
            <SectionTitle title="Métricas" />
            <NavItem to="/viewer/dashboard" icon={FiPieChart} label="Panorama" />
            <NavItem to="/viewer/reportes" icon={FiBarChart2} label="Métricas" />
            <NavItem to="/viewer/mercaderistas" icon={FiUserCheck} label="Mercaderistas" />
            <NavItem to="/viewer/trend" icon={FiBarChart2} label="Tendencia Ventas" />
            <NavItem to="/viewer/productos" icon={FiPackage} label="Productos" />
            <NavItem to="/viewer/geo-chain" icon={FiMap} label="Geografía y Cadena" />

            <SectionTitle title="Logística" />
            <NavItem to="/viewer/planificacion" icon={FiNavigation} label="Monitoreo Rutas" />

            <SectionTitle title="Control" />
            <NavItem to="/viewer/galeria" icon={FiCamera} label="Validar Fotos" />
            <NavItem to="/viewer/consolidado" icon={FiActivity} label="Consolidado Operativo" />
            
            <SectionTitle title="Cuenta" />
            <button 
              onClick={logout} 
              onMouseEnter={(e) => {
                if (isCollapsed) {
                  const rect = e.currentTarget.getBoundingClientRect();
                  setHoveredLabel("Cerrar Sesión");
                  setTooltipTop(rect.top + rect.height / 2);
                }
              }}
              onMouseLeave={() => setHoveredLabel(null)}
              className={`
                relative flex items-center gap-3 py-3 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all duration-300 group
                text-gray-400 hover:bg-red-50 hover:text-red-500
                ${isCollapsed ? 'justify-center px-0 md:mx-2' : 'justify-center md:justify-start px-0 md:px-4 mx-2 md:mx-0'}
              `}
            >
              <FiLogOut size={isCollapsed ? 20 : 18} className="min-w-[20px] transition-all duration-300" />
              <span className={`whitespace-nowrap transition-all duration-300 overflow-hidden ${isCollapsed ? 'hidden' : 'hidden md:block'}`}>
                Cerrar Sesión
              </span>
            </button>
          </nav>
        </div>

        {/* FOOTER USER */}
        <div className="py-6 border-t border-gray-100 flex items-center justify-center shrink-0">
          <div className={`overflow-hidden transition-all duration-300 ${isCollapsed ? 'hidden' : 'hidden md:block w-full px-6'}`}>
            <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1">Viewer Control</p>
            <p className="text-[10px] font-black text-[#87be00] uppercase truncate italic">
              {user?.company_name || "Empresa Cliente"}
            </p>
          </div>
          <div className={`w-8 h-8 rounded-full bg-[#87be00]/10 flex items-center justify-center text-[#87be00] font-black text-xs transition-all duration-300 ${isCollapsed ? 'flex' : 'flex md:hidden'}`}>
             {initials}
          </div>
        </div>
      </aside>

      {/* TOOLTIP FLOTANTE GLOBAL DESKTOP */}
      {isCollapsed && hoveredLabel && (
        <div 
          className="hidden md:block fixed left-24 px-3 py-2 bg-gray-900 text-white text-[10px] font-black uppercase tracking-wider rounded-lg shadow-2xl z-[99999] whitespace-nowrap pointer-events-none transform -translate-y-1/2 transition-all duration-150"
          style={{ top: `${tooltipTop}px` }}
        >
          {hoveredLabel}
        </div>
      )}
    </>
  );
};

export default ViewerSidebar;