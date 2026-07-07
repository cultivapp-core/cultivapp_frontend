import React, { useState, useEffect } from "react";
import { NavLink, Link, useLocation } from "react-router-dom";
import {
  FiBarChart2, FiUsers, FiHome, FiHelpCircle, FiCalendar, 
  FiNavigation, FiSend, FiBell, FiClock, FiBriefcase, 
  FiBox, FiClipboard, FiUserCheck, FiFileText, FiTrendingUp,
  FiPieChart, FiCamera, FiMenu, FiX, FiChevronLeft, FiChevronRight, FiLogOut 
} from "react-icons/fi";
import { useAuth } from "../../context/AuthContext";
import { useNotificationContext } from "../../context/NotificationContext";

const AdminSidebar = () => {
  const { user, logout } = useAuth();
  const { unreadCount } = useNotificationContext();
  const location = useLocation();
  
  // Estados para el colapso en escritorio, móvil y control de Tooltips
  const [isOpen, setIsOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [hoveredLabel, setHoveredLabel] = useState(null);
  const [tooltipTop, setTooltipTop] = useState(0);

  const ID_CULTIVA = '0e342e01-d213-4353-b210-39a12ac335cf';
  const canManageCompanies = user?.role === "ROOT" || (user?.role === "ADMIN_CLIENTE" && user?.company_id === ID_CULTIVA);

  // Cerrar el menú móvil automáticamente al cambiar de ruta
  useEffect(() => {
    setIsOpen(false);
  }, [location]);

  // --- SUB-COMPONENTE PARA LOS LINKS (Garantiza simetría matemática perfecta) ---
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

      {/* 3. SIDEBAR PRINCIPAL */}
      <div className={`
        fixed md:relative inset-y-0 left-0 z-[9999] bg-white h-screen flex flex-col justify-between font-[Outfit] shadow-2xl md:shadow-none border-r border-gray-100
        transition-all duration-300 ease-in-out
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

        {/* CONTENEDOR CON SCROLL INTEGRADO SIN DESPLAZAMIENTO ASIMÉTRICO */}
        <div className={`overflow-y-auto overflow-x-hidden custom-scrollbar flex-1 pb-4 ${isCollapsed ? 'pr-0' : 'pr-0 md:pr-2'}`}>
          
          {/* HEADER / LOGO CENTRADO */}
          <Link to="/admin" className={`block mt-16 md:mt-8 mb-10 transition-all duration-300 hover:opacity-80 flex justify-center ${isCollapsed ? 'md:justify-center md:px-0' : 'md:justify-center md:justify-start md:px-6'}`}>
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-[#87be00] animate-pulse flex-shrink-0 shadow-[0_0_8px_rgba(135,190,0,0.6)]" />
              <div className={`overflow-hidden transition-all duration-300 ${isCollapsed ? 'hidden' : 'hidden md:block'}`}>
                <h2 className="text-xl font-black text-gray-900 tracking-tighter uppercase leading-none">
                  Cultiva<span className="text-[#87be00]">App</span>
                </h2>
                <p className="text-[8px] font-black text-gray-400 uppercase tracking-[0.3em] mt-1">Admin Panel</p>
              </div>
            </div>
          </Link>

          {/* LISTA DE NAVEGACIÓN */}
          <nav className={`flex flex-col gap-1.5 ${isCollapsed ? 'px-2' : 'px-0 md:px-4'}`}>
            <SectionTitle title="Métricas" />
            <NavItem to="/admin" end={true} icon={FiBarChart2} label="Dashboard" />
            <NavItem to="/admin/informes" icon={FiFileText} label="Informes" />
            <NavItem to="/admin/upload-sales" icon={FiTrendingUp} label="Cargar Ventas" />

            <SectionTitle title="Logística" />
            <NavItem to="/admin/routes" icon={FiCalendar} label="Planificación" />
            <NavItem to="/admin/turnos" icon={FiClock} label="Configurar Turnos" />
            <NavItem to="/admin/gps-monitor" icon={FiNavigation} label="Monitoreo GPS" />

            <SectionTitle title="Comunicación" />
            <NavItem to="/admin/notification-manager" icon={FiSend} label="Emitir Alertas" />
            <NavItem to="/admin/notifications" icon={FiBell} label="Mi Bandeja" badge={unreadCount} />

            {canManageCompanies && (
              <>
                <SectionTitle title="Administración" />
                <NavItem to="/admin/companies" icon={FiBriefcase} label="Empresas" />
              </>
            )}

            <SectionTitle title="Estructura" />
            <NavItem to="/admin/users" icon={FiUsers} label="Usuarios" />
            <NavItem to="/admin/locales" icon={FiHome} label="Red de Locales" />
            <NavItem to="/admin/catalogo" icon={FiBox} label="Catálogo" />
            <NavItem to="/admin/task-control" icon={FiClipboard} label="Control Tareas" />
            <NavItem to="/admin/attendance-control" icon={FiUserCheck} label="Asistencia" />
            <NavItem to="/admin/photo-validation" icon={FiCamera} label="Validar Fotos" />

            <SectionTitle title="Soporte" />
            <NavItem to="/admin/questions" icon={FiHelpCircle} label="Preguntas" />
            
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
            <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1">Empresa Cliente</p>
            <p className="text-[10px] font-black text-[#87be00] uppercase truncate italic">
              {user?.company_name || "Admin Panel"}
            </p>
          </div>
          <div className={`w-8 h-8 rounded-full bg-[#87be00]/10 flex items-center justify-center text-[#87be00] font-black transition-all duration-300 ${isCollapsed ? 'flex' : 'flex md:hidden'}`}>
             {user?.company_name ? user.company_name.charAt(0).toUpperCase() : 'A'}
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
  )
}

export default AdminSidebar;