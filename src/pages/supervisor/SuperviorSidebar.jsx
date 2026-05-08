import { NavLink } from "react-router-dom"
import { 
  FiGrid, 
  FiMap, 
  FiSend, 
  FiClock, 
  FiCamera, 
  FiLogOut, 
  FiBell,
  FiX,
  FiPackage // 🚩 Importamos ícono para el módulo de tareas
} from "react-icons/fi"
import { useAuth } from "../../context/AuthContext"
import { useNotificationContext } from "../../context/NotificationContext"

const SupervisorSidebar = ({ onClose }) => {
  const { user, logout } = useAuth()
  const { unreadCount } = useNotificationContext()

  const linkBase =
    "flex items-center gap-3 px-4 py-3 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all duration-300"
  const linkInactive = "text-gray-400 hover:bg-gray-50 hover:text-gray-900"
  const linkActive = "bg-[#87be00]/10 text-[#87be00] shadow-sm shadow-[#87be00]/5"

  return (
    <aside className="flex flex-col w-64 md:w-72 bg-white border-r border-gray-100 justify-between h-screen p-4 md:p-6 sticky top-0 font-[Outfit] shadow-2xl md:shadow-none">
      
      <div className="overflow-y-auto pr-1 md:pr-2 custom-scrollbar flex-1">
        {/* LOGO Y BOTÓN DE CIERRE (MÓVIL) */}
        <div className="mb-8 md:mb-10 px-2 md:px-4 flex justify-between items-start">
          <div>
            <h2 className="text-2xl font-black text-[#87be00] tracking-tighter italic">
              Cultiv<span className="text-gray-900">App</span>
            </h2>
            <p className="text-[9px] text-gray-300 uppercase tracking-[0.3em] font-black">
              Panel Supervisor
            </p>
          </div>
          
          <button 
            onClick={onClose} 
            className="md:hidden p-2 text-gray-400 hover:text-gray-900 bg-gray-50 rounded-xl transition-colors"
          >
            <FiX size={18} />
          </button>
        </div>

        <nav className="flex flex-col gap-1.5">
          {/* MONITOREO */}
          <p className="text-[9px] font-black text-gray-300 uppercase tracking-[0.3em] mb-2 ml-4">Operación Viva</p>
          <NavLink to="/supervisor" end onClick={onClose} className={({ isActive }) => `${linkBase} ${isActive ? linkActive : linkInactive}`}>
            <FiGrid size={18} /> Panel Cobertura
          </NavLink>
          
          <NavLink to="/supervisor/mapa" onClick={onClose} className={({ isActive }) => `${linkBase} ${isActive ? linkActive : linkInactive}`}>
            <FiMap size={18} /> Mapa en Vivo
          </NavLink>

          {/* COMUNICACIÓN */}
          <p className="text-[9px] font-black text-gray-300 uppercase tracking-[0.3em] mt-6 mb-2 ml-4">Comunicación</p>
          <NavLink to="/supervisor/alertas" onClick={onClose} className={({ isActive }) => `${linkBase} ${isActive ? linkActive : linkInactive}`}>
            <FiSend size={18} /> Enviar Instrucciones
          </NavLink>

          <NavLink to="/supervisor/notificaciones" onClick={onClose} className={({ isActive }) => `${linkBase} ${isActive ? linkActive : linkInactive}`}>
            <div className="relative">
              <FiBell size={18} />
              {unreadCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[8px] font-black text-white ring-2 ring-white animate-pulse">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </div>
            Bandeja Avisos
          </NavLink>

          {/* CONTROL */}
          <p className="text-[9px] font-black text-gray-300 uppercase tracking-[0.3em] mt-6 mb-2 ml-4">Auditoría</p>
          <NavLink to="/supervisor/asistencia" onClick={onClose} className={({ isActive }) => `${linkBase} ${isActive ? linkActive : linkInactive}`}>
            <FiClock size={18} /> Control Jornada
          </NavLink>

          <NavLink to="/supervisor/ejecucion" onClick={onClose} className={({ isActive }) => `${linkBase} ${isActive ? linkActive : linkInactive}`}>
            <FiCamera size={18} /> Validación Sala
          </NavLink>

          {/* 🚩 NUEVO: CONTROL DE TAREAS */}
          <NavLink to="/supervisor/tareas" onClick={onClose} className={({ isActive }) => `${linkBase} ${isActive ? linkActive : linkInactive}`}>
            <FiPackage size={18} /> Control Tareas
          </NavLink>
        </nav>
      </div>

      {/* FOOTER USER */}
      <div className="pt-4 md:pt-6 border-t border-gray-100 mt-4 shrink-0">
        <div className="px-4 mb-4">
          <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1">Supervisor</p>
          <p className="text-[10px] font-black text-[#87be00] uppercase truncate italic">
            {user?.first_name || 'Nombre'} {user?.last_name }
          </p>
        </div>
        <button onClick={logout} className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest text-red-400 hover:bg-red-50 transition-all duration-300">
          <FiLogOut size={16} /> Cerrar Sesión
        </button>
      </div>
    </aside>
  )
}

export default SupervisorSidebar