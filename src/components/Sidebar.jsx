import { NavLink } from "react-router-dom"
import {
  FiBarChart2,
  FiUsers,
  FiBriefcase,
  FiHome,
  FiHelpCircle,
  FiSend, 
  FiBell,  
  FiClock,
  FiNavigation,
  FiMap,
  FiPackage,    // 🚩 Para CatalogManager
  FiCheckSquare, // 🚩 Para TaskControl
  FiUserCheck,   // 🚩 Para AttendanceControl
  FiCamera       // 🚩 Para photoValidation
} from "react-icons/fi"
import { useNotificationContext } from "../context/NotificationContext"

const Sidebar = () => {
  const { unreadCount } = useNotificationContext();

  const linkBase = "flex items-center gap-3 px-4 py-3 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all duration-300"
  const linkInactive = "text-gray-400 hover:bg-gray-50 hover:text-gray-900"
  const linkActive = "bg-[#87be00]/10 text-[#87be00] shadow-sm shadow-[#87be00]/5"
  const actionButton = "flex items-center gap-3 px-4 py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all duration-300 bg-[#87be00] text-white shadow-lg shadow-[#87be00]/30 hover:bg-[#76a500] hover:-translate-y-0.5 mt-2"

  return (
    <div className="h-full flex flex-col font-[Outfit]">
      <div className="mb-12 px-2">
        <h2 className="text-xl font-black text-gray-900 tracking-tighter uppercase leading-none">
          Cultiva<span className="text-[#87be00]">App</span>
        </h2>
        <div className="flex items-center gap-2 mt-2">
          <div className="w-1.5 h-1.5 rounded-full bg-[#87be00] animate-pulse" />
          <p className="text-[8px] font-black text-gray-400 uppercase tracking-[0.3em]">Root Control Center</p>
        </div>
      </div>

      <nav className="flex flex-col gap-1.5 overflow-y-auto pr-2 custom-scrollbar">
        <p className="text-[9px] font-black text-gray-300 uppercase tracking-[0.3em] mb-2 ml-4">Métricas</p>
        <NavLink to="/root/analytics" className={({ isActive }) => `${linkBase} ${isActive ? linkActive : linkInactive}`}>
          <FiBarChart2 size={18} /> Dashboard
        </NavLink>

        <p className="text-[9px] font-black text-gray-300 uppercase tracking-[0.3em] mt-6 mb-2 ml-4">Comunicación</p>
        <NavLink to="/root/notifications-manager" className={({ isActive }) => isActive ? actionButton : `${actionButton} opacity-90`}>
          <FiSend size={18} strokeWidth={3} /> Emitir Alertas
        </NavLink>
        <NavLink to="/root/notifications" className={({ isActive }) => `${linkBase} ${isActive ? linkActive : linkInactive} mt-1`}>
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

        <p className="text-[9px] font-black text-gray-300 uppercase tracking-[0.3em] mt-6 mb-2 ml-4">Logística y Rutas</p>
        <NavLink to="/root/routes" className={({ isActive }) => `${linkBase} ${isActive ? linkActive : linkInactive}`}>
          <FiMap size={18} /> Gestión de Rutas
        </NavLink>
        <NavLink to="/root/turnos" className={({ isActive }) => `${linkBase} ${isActive ? linkActive : linkInactive}`}>
          <FiClock size={18} /> Configurar Turnos
        </NavLink>
        <NavLink to="/root/gps-monitor" className={({ isActive }) => `${linkBase} ${isActive ? linkActive : linkInactive}`}>
          <FiNavigation size={18} /> Monitoreo GPS
        </NavLink>

        {/* 🚩 NUEVA SECCIÓN: OPERACIONES / CONTROL */}
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

        {/* 🚩 NUEVA SECCIÓN: MAESTROS / CATÁLOGO */}
        <p className="text-[9px] font-black text-gray-300 uppercase tracking-[0.3em] mt-6 mb-2 ml-4">Maestros</p>
        <NavLink to="/root/catalogo" className={({ isActive }) => `${linkBase} ${isActive ? linkActive : linkInactive}`}>
          <FiPackage size={18} /> Catálogo SKU
        </NavLink>

        <p className="text-[9px] font-black text-gray-300 uppercase tracking-[0.3em] mt-6 mb-2 ml-4">Estructura</p>
        <NavLink to="/root/companies" className={({ isActive }) => `${linkBase} ${isActive ? linkActive : linkInactive}`}>
          <FiBriefcase size={18} /> Empresas
        </NavLink>
        <NavLink to="/root/users" className={({ isActive }) => `${linkBase} ${isActive ? linkActive : linkInactive}`}>
          <FiUsers size={18} /> Usuarios
        </NavLink>
        <NavLink to="/root/locales" className={({ isActive }) => `${linkBase} ${isActive ? linkActive : linkInactive}`}>
          <FiHome size={18} /> Locales
        </NavLink>

        <p className="text-[9px] font-black text-gray-300 uppercase tracking-[0.3em] mt-6 mb-2 ml-4">Soporte</p>
        <NavLink to="/root/questions" className={({ isActive }) => `${linkBase} ${isActive ? linkActive : linkInactive}`}>
          <FiHelpCircle size={18} /> Preguntas
        </NavLink>
      </nav>
    </div>
  )
}

export default Sidebar