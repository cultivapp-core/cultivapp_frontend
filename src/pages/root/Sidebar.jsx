import { useState, useEffect } from "react";
import { NavLink, Link, useLocation } from "react-router-dom";
import {
  FiBarChart2, FiUsers, FiBriefcase, FiHome, FiHelpCircle, FiSend, 
  FiBell, FiClock, FiNavigation, FiMap, FiPackage, FiCheckSquare, 
  FiUserCheck, FiCamera, FiMonitor, FiTrendingUp, FiPieChart, FiFileText,
  FiMenu, FiX, FiChevronLeft, FiChevronRight, FiLogOut 
} from "react-icons/fi";
import { useAuth } from "../../context/AuthContext";
import { useNotificationContext } from "../../context/NotificationContext";

const Sidebar = () => {
  const { user, logout } = useAuth(); 
  const { unreadCount } = useNotificationContext();
  
  // Estados
  const [isOpen, setIsOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const location = useLocation();

  // Estados para controlar el Tooltip Flotante Global (Evita recortes por el scroll)
  const [hoveredLabel, setHoveredLabel] = useState(null);
  const [tooltipTop, setTooltipTop] = useState(0);

  // Cerrar el menú móvil automáticamente al cambiar de ruta
  useEffect(() => {
    setIsOpen(false);
  }, [location]);

  // --- SUB-COMPONENTE PARA LOS LINKS ---
  const NavItem = ({ to, icon: Icon, label, badge }) => (
    <NavLink 
      to={to} 
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
        {/* Tamaño adaptivo del icono: siempre responsivo en móvil */}
        <Icon className={`min-w-[20px] transition-all duration-300 ${isCollapsed ? 'w-5 h-5' : 'w-5 h-5 md:w-[18px] md:h-[18px]'}`} />
        {badge > 0 && (
          <span className={`absolute -top-1.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-red-500 text-[8px] font-black text-white ring-2 ring-white -right-2 top-0 ${isCollapsed ? '' : 'md:-right-1.5 md:top-1.5'}`}>
            {badge > 9 ? '9+' : badge}
          </span>
        )}
      </div>

      {/* Texto oculto en móvil por defecto, visible solo si expandido en escritorio */}
      <span className={`whitespace-nowrap transition-all duration-300 overflow-hidden ${isCollapsed ? 'hidden' : 'hidden md:block w-auto opacity-100'}`}>
        {label}
      </span>
    </NavLink>
  );

  // --- SUB-COMPONENTE PARA LOS TÍTULOS ---
  const SectionTitle = ({ title }) => (
    <div className="mt-6 mb-2">
      {/* Texto de sección oculto en móvil */}
      <p className={`text-[9px] font-black text-gray-300 uppercase tracking-[0.3em] ml-4 transition-all duration-300 ${isCollapsed ? 'hidden' : 'hidden md:block'}`}>
        {title}
      </p>
      {/* Línea divisoria siempre visible en móvil */}
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
        
        {/* Botón de cerrar centrado en la parte superior para la versión de iconos móvil */}
        <button
          onClick={() => setIsOpen(false)}
          className="md:hidden absolute top-3 left-1/2 -translate-x-1/2 p-2.5 text-gray-400 hover:bg-red-50 hover:text-red-500 rounded-xl transition-colors z-50"
        >
          <FiX size={20} />
        </button>

        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="hidden md:flex absolute -right-3 top-12 bg-white border border-gray-100 shadow-md rounded-full p-1.5 text-gray-400 hover:text-[#87be00] hover:scale-110 transition-all z-50"
        >
          {isCollapsed ? <FiChevronRight size={14} /> : <FiChevronLeft size={14} />}
        </button>

        {/* Contenedor de navegación con scroll activo */}
        <div className="overflow-y-auto overflow-x-hidden custom-scrollbar pr-2 flex-1 pb-4">
          
          {/* HEADER / LOGO - Centrado en móvil automáticamente */}
          <Link to="/root" className={`block mt-16 md:mt-8 mb-10 transition-all duration-300 hover:opacity-80 flex justify-center md:px-6 ${isCollapsed ? 'md:justify-center' : 'md:justify-start'}`}>
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-[#87be00] animate-pulse flex-shrink-0 shadow-[0_0_8px_rgba(135,190,0,0.6)]" />
              <div className={`overflow-hidden transition-all duration-300 ${isCollapsed ? 'hidden' : 'hidden md:block'}`}>
                <h2 className="text-xl font-black text-gray-900 tracking-tighter uppercase leading-none">
                  Cultiva<span className="text-[#87be00]">App</span>
                </h2>
                <p className="text-[8px] font-black text-gray-400 uppercase tracking-[0.3em] mt-1">Root Control</p>
              </div>
            </div>
          </Link>

          <nav className={`flex flex-col gap-1.5 ${isCollapsed ? 'px-2' : 'px-2 md:px-4'}`}>
            <SectionTitle title="Métricas" />
            <NavItem to="/root/analytics" icon={FiBarChart2} label="Dashboard" />
            <NavItem to="/root/sales-report" icon={FiPieChart} label="Dashboard Ventas" />
            <NavItem to="/root/active-sessions" icon={FiMonitor} label="Radar Sesiones" />

            <SectionTitle title="Reportes" />
            <NavItem to="/root/upload-sales" icon={FiTrendingUp} label="Cargar Ventas" />
            <NavItem to="/root/reports" icon={FiFileText} label="Informe" />

            <SectionTitle title="Comunicación" />
            <NavItem to="/root/notifications-manager" icon={FiSend} label="Emitir Notificaciones" />
            <NavItem to="/root/notifications" icon={FiBell} label="Mi Bandeja" badge={unreadCount} />

            <SectionTitle title="Estructura" />
            <NavItem to="/root/users" icon={FiUsers} label="Usuarios" />
            <NavItem to="/root/locales" icon={FiHome} label="Locales" />
            <NavItem to="/root/companies" icon={FiBriefcase} label="Empresas" />
            <NavItem to="/root/catalogo" icon={FiPackage} label="Productos" />

            <SectionTitle title="Logística y Rutas" />
            <NavItem to="/root/routes" icon={FiMap} label="Planificación Rutas" />
            <NavItem to="/root/turnos" icon={FiClock} label="Configurar Turnos" />
            <NavItem to="/root/gps-monitor" icon={FiNavigation} label="Monitoreo GPS" />

            <SectionTitle title="Auditoría y Control" />
            <NavItem to="/root/attendance-control" icon={FiUserCheck} label="Control Asistencia" />
            <NavItem to="/root/task-control" icon={FiCheckSquare} label="Control de Tareas" />
            <NavItem to="/root/photo-validation" icon={FiCamera} label="Validar Fotos" />
            <NavItem to="/root/questions" icon={FiHelpCircle} label="Preguntas" />
            
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
              <FiLogOut className={`min-w-[20px] transition-all duration-300 ${isCollapsed ? 'w-5 h-5' : 'w-5 h-5 md:w-[18px] md:h-[18px]'}`} />
              <span className={`whitespace-nowrap transition-all duration-300 overflow-hidden ${isCollapsed ? 'hidden' : 'hidden md:block'}`}>
                Cerrar Sesión
              </span>
            </button>
          </nav>
        </div>

        {/* FOOTER - Inicial de la empresa centrada en móvil siempre */}
        <div className="py-6 border-t border-gray-100 flex items-center justify-center">
          <div className={`overflow-hidden transition-all duration-300 ${isCollapsed ? 'hidden' : 'hidden md:block w-full px-6'}`}>
            <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1">Empresa Cliente</p>
            <p className="text-[10px] font-black text-[#87be00] uppercase truncate italic">
              {user?.company_name || "Root Control"}
            </p>
          </div>
          <div className={`w-8 h-8 rounded-full bg-[#87be00]/10 flex items-center justify-center text-[#87be00] font-black transition-all duration-300 block ${isCollapsed ? 'md:flex' : 'md:hidden'}`}>
             {user?.company_name ? user.company_name.charAt(0).toUpperCase() : 'R'}
          </div>
        </div>
      </div>

      {/* TOOLTIP FIJO GLOBAL (Oculto en móvil ya que no aplica hover en pantallas táctiles) */}
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

export default Sidebar;