import { NavLink } from "react-router-dom"
import { 
  FiBarChart2, 
  FiUsers, 
  FiHome, 
  FiHelpCircle, 
  FiCalendar, 
  FiNavigation,
  FiSend, 
  FiBell,
  FiClock,
  FiBriefcase,
  FiBox // 🚩 NUEVO ICONO PARA EL CATÁLOGO
} from "react-icons/fi"
import { useAuth } from "../context/AuthContext"
import { useNotificationContext } from "../context/NotificationContext" 

const AdminSidebar = () => {
  const { user } = useAuth()
  const { unreadCount } = useNotificationContext() 

  // 🚩 CONSTANTE MAESTRA: ID DE CULTIVA
  const ID_CULTIVA = '0e342e01-d213-4353-b210-39a12ac335cf';

  // 🚀 LÓGICA DE ACCESO ELEVADO
  const canManageCompanies = 
    user?.role === "ROOT" || 
    (user?.role === "ADMIN_CLIENTE" && user?.company_id === ID_CULTIVA);

  const linkBase =
    "flex items-center gap-3 px-4 py-3 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all duration-300"

  const linkInactive =
    "text-gray-400 hover:bg-gray-50 hover:text-gray-900"

  const linkActive =
    "bg-[#87be00]/10 text-[#87be00] shadow-sm shadow-[#87be00]/5"

  return (
    <div className="h-full flex flex-col justify-between font-[Outfit]">
      
      <div className="overflow-y-auto pr-2 custom-scrollbar">
        {/* NAVIGATION */}
        <nav className="flex flex-col gap-1.5">
          
          {/* MÉTRICAS */}
          <p className="text-[9px] font-black text-gray-300 uppercase tracking-[0.3em] mb-2 ml-4">Métricas</p>
          <NavLink
            to="/admin"
            end
            className={({ isActive }) =>
              `${linkBase} ${isActive ? linkActive : linkInactive}`
            }
          >
            <FiBarChart2 size={18} />
            Dashboard
          </NavLink>

          {/* LOGÍSTICA */}
          <p className="text-[9px] font-black text-gray-300 uppercase tracking-[0.3em] mt-6 mb-2 ml-4">Logística</p>
          <NavLink
            to="/admin/routes"
            className={({ isActive }) =>
              `${linkBase} ${isActive ? linkActive : linkInactive}`
            }
          >
            <FiCalendar size={18} />
            Planificación
          </NavLink>

          <NavLink
            to="/admin/turnos"
            className={({ isActive }) =>
              `${linkBase} ${isActive ? linkActive : linkInactive}`
            }
          >
            <FiClock size={18} />
            Configurar Turnos
          </NavLink>

          <NavLink
            to="/admin/gps-monitor"
            className={({ isActive }) =>
              `${linkBase} ${isActive ? linkActive : linkInactive}`
            }
          >
            <FiNavigation size={18} />
            Monitoreo GPS
          </NavLink>

          {/* COMUNICACIÓN */}
          <p className="text-[9px] font-black text-gray-300 uppercase tracking-[0.3em] mt-6 mb-2 ml-4">Comunicación</p>
          
          <NavLink
            to="/admin/notification-manager"
            className={({ isActive }) =>
              `${linkBase} ${isActive ? linkActive : linkInactive}`
            }
          >
            <FiSend size={18} />
            Emitir Alertas
          </NavLink>

          <NavLink
            to="/admin/notifications"
            className={({ isActive }) =>
              `${linkBase} ${isActive ? linkActive : linkInactive}`
            }
          >
            <div className="relative">
              <FiBell size={18} />
              {unreadCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[8px] font-black text-white ring-2 ring-white">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </div>
            Mi Bandeja
          </NavLink>

          {/* 🚩 RENDERIZADO CONDICIONAL: ADMINISTRACIÓN (Solo Cultiva) */}
          {canManageCompanies && (
            <>
              <p className="text-[9px] font-black text-gray-300 uppercase tracking-[0.3em] mt-6 mb-2 ml-4">Administración</p>
              <NavLink
                to="/admin/companies"
                className={({ isActive }) =>
                  `${linkBase} ${isActive ? linkActive : linkInactive}`
                }
              >
                <FiBriefcase size={18} />
                Empresas
              </NavLink>
            </>
          )}

          {/* ESTRUCTURA */}
          <p className="text-[9px] font-black text-gray-300 uppercase tracking-[0.3em] mt-6 mb-2 ml-4">Estructura</p>
          <NavLink
            to="/admin/users"
            className={({ isActive }) =>
              `${linkBase} ${isActive ? linkActive : linkInactive}`
            }
          >
            <FiUsers size={18} />
            Usuarios
          </NavLink>

          <NavLink
            to="/admin/locales"
            className={({ isActive }) =>
              `${linkBase} ${isActive ? linkActive : linkInactive}`
            }
          >
            <FiHome size={18} />
            Red de Locales
          </NavLink>

          {/* 🚩 NUEVO: ACCESO AL CATÁLOGO MAESTRO */}
          <NavLink
            to="/admin/catalogo"
            className={({ isActive }) =>
              `${linkBase} ${isActive ? linkActive : linkInactive}`
            }
          >
            <FiBox size={18} />
            Catálogo Maestro
          </NavLink>

          {/* SOPORTE */}
          <p className="text-[9px] font-black text-gray-300 uppercase tracking-[0.3em] mt-6 mb-2 ml-4">Soporte</p>
          <NavLink
            to="/admin/questions"
            className={({ isActive }) =>
              `${linkBase} ${isActive ? linkActive : linkInactive}`
            }
          >
            <FiHelpCircle size={18} />
            Preguntas
          </NavLink>
        </nav>
      </div>

      {/* INFO DEL USUARIO */}
      <div className="pt-6 border-t border-gray-100 mt-10">
        <div className="px-4">
          <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1">Empresa Cliente</p>
          <p className="text-[10px] font-black text-[#87be00] uppercase truncate italic">
            {user?.company_name || "Admin Panel"}
          </p>
        </div>
      </div>
    </div>
  )
}

export default AdminSidebar