import React, { useState, useEffect } from "react";
import { NavLink, Link, useLocation } from "react-router-dom";
import {
  FiBarChart2, FiUsers, FiHome, FiHelpCircle, FiCalendar, 
  FiNavigation, FiSend, FiBell, FiClock, FiBriefcase,
  FiBox, FiClipboard, FiUserCheck, FiFileText, FiTrendingUp,
  FiCamera, FiMenu, FiX, FiChevronLeft, FiChevronRight, FiLogOut
} from "react-icons/fi";
import { useAuth } from "../../context/AuthContext";
import { useNotificationContext } from "../../context/NotificationContext";

// 🚩 MEJORA: Ahora recibe isCollapsed y setIsCollapsed como props desde AdminLayout
const AdminSidebar = ({ isCollapsed, setIsCollapsed }) => {
  const { user, logout } = useAuth();
  const { unreadCount } = useNotificationContext();
  const location = useLocation();
  
  // Estados para el menú móvil y control de Tooltips (isCollapsed se eliminó de aquí)
  const [isOpen, setIsOpen] = useState(false);
  const [hoveredLabel, setHoveredLabel] = useState(null);
  const [tooltipTop, setTooltipTop] = useState(0);

  const ID_CULTIVA = '0e342e01-d213-4353-b210-39a12ac335cf';
  const canManageCompanies =
    user?.role === "ROOT" ||
    (user?.role === "ADMIN_CLIENTE" &&
      user?.company_id === ID_CULTIVA);

  const userName = [
    user?.first_name,
    user?.last_name,
  ]
    .filter(Boolean)
    .join(" ")
    .trim();

  const userInitial =
    userName?.charAt(0)?.toUpperCase() ||
    user?.company_name?.charAt(0)?.toUpperCase() ||
    "A";

  // Cerrar el menú móvil automáticamente al cambiar de ruta
  useEffect(() => {
    setIsOpen(false);
  }, [location]);

  // --- SUB-COMPONENTE PARA LOS LINKS ---
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
        relative flex items-center gap-3 py-3.5 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all duration-300 group
        ${isActive ? "bg-[#87be00]/10 text-[#87be00] shadow-sm shadow-[#87be00]/5" : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"}
        justify-start px-4
        ${isCollapsed ? "md:justify-center md:px-0 md:mx-2" : "md:justify-start md:px-4 md:mx-0"}
      `}
    >
      <div className="relative flex items-center justify-center">
        <Icon
          size={isCollapsed ? 20 : 18}
          className="min-w-[20px] transition-all duration-300"
        />
        {badge > 0 && (
          <span className={`absolute -top-1.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-red-500 text-[8px] font-black text-white ring-2 ring-white -right-2 top-0 ${isCollapsed ? '' : 'md:-right-1.5 md:top-1.5'}`}>
            {badge > 9 ? '9+' : badge}
          </span>
        )}
      </div>

      <span
        className={`whitespace-nowrap transition-all duration-300 overflow-hidden ${
          isCollapsed
            ? "block md:hidden"
            : "block w-auto opacity-100"
        }`}
      >
        {label}
      </span>
    </NavLink>
  );

  // --- SUB-COMPONENTE PARA LOS TÍTULOS ---
  const SectionTitle = ({ title }) => (
    <div className="mt-6 mb-2">
      <p
        className={`text-[9px] font-black text-gray-300 uppercase tracking-[0.3em] ml-4 transition-all duration-300 ${
          isCollapsed ? "block md:hidden" : "block"
        }`}
      >
        {title}
      </p>

      <div
        className={`h-px bg-gray-100 mx-4 transition-all duration-300 ${
          isCollapsed ? "hidden md:block" : "hidden"
        }`}
      />
    </div>
  );

  return (
    <>
      {/* 1. BOTÓN HAMBURGUESA MÓVIL */}
      {!isOpen && (
        <div className="md:hidden fixed top-4 left-4 z-[9990]">
          <button
            type="button"
            aria-label="Abrir menú de administración"
            onClick={() => setIsOpen(true)}
            className="p-3 bg-white rounded-xl shadow-lg text-gray-800 border border-gray-100 hover:bg-gray-50 active:scale-95 transition-all"
          >
            <FiMenu size={24} />
          </button>
        </div>
      )}

      {/* 2. OVERLAY MÓVIL */}
      {isOpen && (
        <button
          type="button"
          aria-label="Cerrar menú"
          onClick={() => setIsOpen(false)}
          className="md:hidden fixed inset-0 bg-black/60 z-[9995] backdrop-blur-sm transition-opacity"
        />
      )}

      {/* 3. SIDEBAR PRINCIPAL */}
      <div className={`
        fixed md:relative inset-y-0 left-0 z-[9999] bg-white h-screen flex flex-col justify-between font-[Outfit] shadow-2xl md:shadow-none border-r border-gray-100
        transition-all duration-300 ease-in-out
        ${isOpen ? "translate-x-0 w-[86vw] max-w-[320px]" : "-translate-x-full"}
        md:translate-x-0 md:max-w-none
        ${isCollapsed ? "md:w-20" : "md:w-72"}
      `}>
        
        {/* BOTÓN DE CIERRE MÓVIL PERFECTAMENTE CENTRADO */}
        <button
          type="button"
          aria-label="Cerrar menú de administración"
          onClick={() => setIsOpen(false)}
          className="md:hidden absolute top-4 right-4 p-2.5 text-gray-400 hover:bg-red-50 hover:text-red-500 rounded-xl transition-colors z-50"
        >
          <FiX size={20} />
        </button>

        {/* BOTÓN FLECHA DE COLAPSO DESKTOP */}
        <button
          type="button"
          aria-label={isCollapsed ? "Expandir menú" : "Contraer menú"}
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="hidden md:flex absolute -right-3 top-12 bg-white border border-gray-100 shadow-md rounded-full p-1.5 text-gray-400 hover:text-[#87be00] hover:scale-110 transition-all z-50"
        >
          {isCollapsed ? <FiChevronRight size={14} /> : <FiChevronLeft size={14} />}
        </button>

        {/* CONTENEDOR CON SCROLL INTEGRADO SIN DESPLAZAMIENTO ASIMÉTRICO */}
        <div className={`overflow-y-auto overflow-x-hidden custom-scrollbar flex-1 pb-4 ${isCollapsed ? 'pr-0' : 'pr-0 md:pr-2'}`}>
          
          {/* HEADER / LOGO CENTRADO */}
          <Link
            to="/admin"
            className={`mt-7 md:mt-8 mb-8 transition-all duration-300 hover:opacity-80 flex items-center px-6 ${
              isCollapsed
                ? "justify-start md:justify-center md:px-0"
                : "justify-start"
            }`}
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-2.5 h-2.5 rounded-full bg-[#87be00] animate-pulse flex-shrink-0 shadow-[0_0_8px_rgba(135,190,0,0.6)]" />

              <div
                className={`overflow-hidden transition-all duration-300 ${
                  isCollapsed ? "block md:hidden" : "block"
                }`}
              >
                <h2 className="text-xl font-black text-gray-900 tracking-tighter uppercase leading-none">
                  Cultiva<span className="text-[#87be00]">App</span>
                </h2>
                <p className="text-[8px] font-black text-gray-400 uppercase tracking-[0.3em] mt-1">
                  Panel de administración
                </p>
              </div>
            </div>
          </Link>

          {/* LISTA DE NAVEGACIÓN */}
          <nav
            className={`flex flex-col gap-1.5 ${
              isCollapsed ? "px-3 md:px-2" : "px-3 md:px-4"
            }`}
          >
            <SectionTitle title="Métricas" />
            <NavItem to="/admin" end={true} icon={FiBarChart2} label="Resumen" />
            <NavItem to="/admin/informes" icon={FiFileText} label="Informes" />
            <NavItem to="/admin/upload-sales" icon={FiTrendingUp} label="Cargar ventas" />

            <SectionTitle title="Logística" />
            <NavItem to="/admin/routes" icon={FiCalendar} label="Planificación" />
            <NavItem to="/admin/turnos" icon={FiClock} label="Configurar turnos" />
            <NavItem to="/admin/gps-monitor" icon={FiNavigation} label="Monitoreo GPS" />

            <SectionTitle title="Comunicación" />
            <NavItem to="/admin/notification-manager" icon={FiSend} label="Emitir alertas" />
            <NavItem to="/admin/notifications" icon={FiBell} label="Mi bandeja" badge={unreadCount} />

            {canManageCompanies && (
              <>
                <SectionTitle title="Administración" />
                <NavItem to="/admin/companies" icon={FiBriefcase} label="Empresas" />
              </>
            )}

            <SectionTitle title="Estructura" />
            <NavItem to="/admin/users" icon={FiUsers} label="Usuarios" />
            <NavItem to="/admin/locales" icon={FiHome} label="Red de locales" />
            <NavItem to="/admin/catalogo" icon={FiBox} label="Catálogo" />
            <NavItem to="/admin/task-control" icon={FiClipboard} label="Control de tareas" />
            <NavItem to="/admin/attendance-control" icon={FiUserCheck} label="Asistencia" />
            <NavItem to="/admin/photo-validation" icon={FiCamera} label="Validar fotos" />

            <SectionTitle title="Soporte" />
            <NavItem to="/admin/questions" icon={FiHelpCircle} label="Preguntas" />
            
            <SectionTitle title="Cuenta" />
            <button 
              type="button"
              onClick={logout} 
              onMouseEnter={(e) => {
                if (isCollapsed) {
                  const rect = e.currentTarget.getBoundingClientRect();
                  setHoveredLabel("Cerrar sesión");
                  setTooltipTop(rect.top + rect.height / 2);
                }
              }}
              onMouseLeave={() => setHoveredLabel(null)}
              className={`
                relative flex items-center gap-3 py-3 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all duration-300 group
                text-gray-400 hover:bg-red-50 hover:text-red-500 w-full text-left
                justify-start px-4
                ${isCollapsed ? "md:justify-center md:px-0 md:mx-2" : "md:justify-start md:px-4 md:mx-0"}
              `}
            >
              <FiLogOut size={isCollapsed ? 20 : 18} className="min-w-[20px] transition-all duration-300" />
              <span
                className={`whitespace-nowrap transition-all duration-300 overflow-hidden ${
                  isCollapsed ? "block md:hidden" : "block"
                }`}
              >
                Cerrar sesión
              </span>
            </button>
          </nav>
        </div>

        {/* USUARIO Y EMPRESA */}
        <div className="py-5 px-5 border-t border-gray-100 flex items-center gap-3 shrink-0">
          <div className="w-10 h-10 rounded-full bg-[#87be00]/10 flex items-center justify-center text-[#87be00] font-black shrink-0">
            {userInitial}
          </div>

          <div
            className={`min-w-0 overflow-hidden transition-all duration-300 ${
              isCollapsed ? "block md:hidden" : "block"
            }`}
          >
            <p className="text-xs font-black text-gray-800 truncate">
              {userName || "Usuario administrador"}
            </p>

            <p className="text-[9px] font-black text-[#87be00] uppercase tracking-wider truncate mt-0.5">
              {user?.company_name || "Administración"}
            </p>
          </div>
        </div>
      </div>

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

export default AdminSidebar;