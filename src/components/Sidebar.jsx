import { useState, useEffect } from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  FiBarChart2, FiUsers, FiBriefcase, FiHome, FiHelpCircle, FiSend, 
  FiBell, FiClock, FiNavigation, FiMap, FiPackage, FiCheckSquare, 
  FiUserCheck, FiCamera, FiMonitor, FiTrendingUp, FiPieChart, FiFileText,
  FiMenu, FiX
} from "react-icons/fi";
import { useNotificationContext } from "../context/NotificationContext";

const Sidebar = () => {
  const { unreadCount } = useNotificationContext();
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();

  // Cerrar el menú automáticamente al cambiar de ruta
  useEffect(() => {
    setIsOpen(false);
  }, [location]);

  const linkBase = "flex items-center gap-3 px-4 py-3 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all duration-300";
  const linkInactive = "text-gray-400 hover:bg-gray-50 hover:text-gray-900";
  const linkActive = "bg-[#87be00]/10 text-[#87be00] shadow-sm shadow-[#87be00]/5";

  return (
    <>
      {/* BOTÓN HAMBURGUESA (Visible solo en móviles/tablets) */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="md:hidden fixed top-4 left-4 z-50 p-2 bg-white rounded-xl shadow-lg text-gray-800 border border-gray-100"
      >
        {isOpen ? <FiX size={20} /> : <FiMenu size={20} />}
      </button>

      {/* OVERLAY (Fondo difuminado al abrir en móvil) */}
      {isOpen && (
        <div 
          onClick={() => setIsOpen(false)} 
          className="md:hidden fixed inset-0 bg-black/40 z-40 backdrop-blur-sm transition-opacity"
        />
      )}

      {/* SIDEBAR */}
      <div className={`
        fixed md:relative inset-y-0 left-0 z-40 w-72 bg-white h-full flex flex-col font-[Outfit] p-6 shadow-2xl md:shadow-none border-r border-gray-100
        transform transition-transform duration-300 ease-in-out
        ${isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
      `}>
        
        {/* LOGO */}
        <div className="mb-10 mt-12 md:mt-0 px-2">
          <h2 className="text-xl font-black text-gray-900 tracking-tighter uppercase leading-none">
            Cultiva<span className="text-[#87be00]">App</span>
          </h2>
          <div className="flex items-center gap-2 mt-2">
            <div className="w-1.5 h-1.5 rounded-full bg-[#87be00] animate-pulse" />
            <p className="text-[8px] font-black text-gray-400 uppercase tracking-[0.3em]">Root Control Center</p>
          </div>
        </div>

        {/* NAVEGACIÓN */}
        <nav className="flex flex-col gap-1.5 overflow-y-auto pr-2 custom-scrollbar flex-1 pb-10">
          
          <p className="text-[9px] font-black text-gray-300 uppercase tracking-[0.3em] mb-2 ml-4">Métricas</p>
          <NavLink to="/root/analytics" className={({ isActive }) => `${linkBase} ${isActive ? linkActive : linkInactive}`}>
            <FiBarChart2 size={18} /> Dashboard
          </NavLink>
          <NavLink to="/root/sales-report" className={({ isActive }) => `${linkBase} ${isActive ? linkActive : linkInactive}`}>
            <FiPieChart size={18} /> Dashboard Ventas
          </NavLink>
          <NavLink to="/root/active-sessions" className={({ isActive }) => `${linkBase} ${isActive ? linkActive : linkInactive}`}>
            <FiMonitor size={18} /> Radar Sesiones
          </NavLink>

          <p className="text-[9px] font-black text-gray-300 uppercase tracking-[0.3em] mt-6 mb-2 ml-4">Reportes</p>
          <NavLink to="/root/upload-sales" className={({ isActive }) => `${linkBase} ${isActive ? linkActive : linkInactive}`}>
            <FiTrendingUp size={18} /> Cargar Ventas
          </NavLink>
          <NavLink to="/root/reports" className={({ isActive }) => `${linkBase} ${isActive ? linkActive : linkInactive}`}>
            <FiFileText size={18} /> Informe
          </NavLink>

          <p className="text-[9px] font-black text-gray-300 uppercase tracking-[0.3em] mt-6 mb-2 ml-4">Comunicación</p>
          <NavLink to="/root/notifications-manager" className={({ isActive }) => `${linkBase} ${isActive ? linkActive : linkInactive}`}>
            <FiSend size={18} strokeWidth={3} /> Emitir Notificaciones
          </NavLink>
          <NavLink to="/root/notifications" className={({ isActive }) => `${linkBase} ${isActive ? linkActive : linkInactive}`}>
            <div className="relative">
              <FiBell size={18} />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-red-500 text-[8px] font-black text-white ring-2 ring-white">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </div>
            Mi Bandeja
          </NavLink>

          <p className="text-[9px] font-black text-gray-300 uppercase tracking-[0.3em] mt-6 mb-2 ml-4">Estructura</p>
          <NavLink to="/root/users" className={({ isActive }) => `${linkBase} ${isActive ? linkActive : linkInactive}`}>
            <FiUsers size={18} /> Usuarios
          </NavLink>
          <NavLink to="/root/locales" className={({ isActive }) => `${linkBase} ${isActive ? linkActive : linkInactive}`}>
            <FiHome size={18} /> Locales
          </NavLink>
          <NavLink to="/root/companies" className={({ isActive }) => `${linkBase} ${isActive ? linkActive : linkInactive}`}>
            <FiBriefcase size={18} /> Empresas
          </NavLink>
          <NavLink to="/root/catalogo" className={({ isActive }) => `${linkBase} ${isActive ? linkActive : linkInactive}`}>
            <FiPackage size={18} /> Productos
          </NavLink>

          <p className="text-[9px] font-black text-gray-300 uppercase tracking-[0.3em] mt-6 mb-2 ml-4">Logística y Rutas</p>
          <NavLink to="/root/routes" className={({ isActive }) => `${linkBase} ${isActive ? linkActive : linkInactive}`}>
            <FiMap size={18} /> Planificacion Rutas
          </NavLink>
          <NavLink to="/root/turnos" className={({ isActive }) => `${linkBase} ${isActive ? linkActive : linkInactive}`}>
            <FiClock size={18} /> Configurar Turnos
          </NavLink>
          <NavLink to="/root/gps-monitor" className={({ isActive }) => `${linkBase} ${isActive ? linkActive : linkInactive}`}>
            <FiNavigation size={18} /> Monitoreo GPS
          </NavLink>

          <p className="text-[9px] font-black text-gray-300 uppercase tracking-[0.3em] mt-6 mb-2 ml-4">Auditoría y Control</p>
          <NavLink to="/root/attendance-control" className={({ isActive }) => `${linkBase} ${isActive ? linkActive : linkInactive}`}>
            <FiUserCheck size={18} /> Control Asistencia
          </NavLink>
          <NavLink to="/root/task-control" className={({ isActive }) => `${linkBase} ${isActive ? linkActive : linkInactive}`}>
            <FiCheckSquare size={18} /> Control de Tareas
          </NavLink>
          <NavLink to="/root/photo-validation" className={({ isActive }) => `${linkBase} ${isActive ? linkActive : linkInactive}`}>
            <FiCamera size={18} /> Validar Fotos
          </NavLink>
          <NavLink to="/root/questions" className={({ isActive }) => `${linkBase} ${isActive ? linkActive : linkInactive}`}>
            <FiHelpCircle size={18} /> Preguntas
          </NavLink>
        </nav>
      </div>
    </>
  )
}

export default Sidebar;