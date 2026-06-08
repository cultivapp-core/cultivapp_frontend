import { useState, useEffect } from "react"
import { Outlet, useNavigate, useLocation } from "react-router-dom"
import { FiLogOut, FiLayout, FiMenu, FiX } from "react-icons/fi" // 🚩 Añadido FiX
import AdminSidebar from "../admin/AdminSidebar" 
import Notifications from "../../components/Notifications" 
import { useAuth } from "../../context/AuthContext"
import { useNotificationContext } from "../../context/NotificationContext"

const AdminDashboard = () => {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  
  const { notifications, unreadCount, onMarkRead, loading, refresh } = useNotificationContext()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  // 🚩 Cerramos el menú automáticamente al cambiar de ruta
  useEffect(() => {
    setIsMobileMenuOpen(false)
  }, [location])

  const handleLogoutAction = async () => {
    await logout()
    navigate("/")
  }

  return (
    <div className="min-h-screen flex bg-[#F8FAFC] font-[Outfit] text-gray-900 relative">
      
      {/* 📱 OVERLAY MÓVIL CON FADE ANIMATION */}
      <div 
        className={`fixed inset-0 bg-black/40 backdrop-blur-sm z-40 transition-opacity duration-300 md:hidden ${
          isMobileMenuOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        onClick={() => setIsMobileMenuOpen(false)}
      />

      {/* SIDEBAR CON SLIDE ANIMATION */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-72 bg-white border-r border-gray-100 
        transform transition-all duration-300 ease-in-out flex flex-col
        md:relative md:translate-x-0 md:opacity-100
        ${isMobileMenuOpen ? "translate-x-0 opacity-100" : "-translate-x-full md:opacity-100"}
      `}>
        <div className="flex flex-col h-full px-6 md:px-8 py-8 md:py-10 shadow-sm overflow-hidden">
          
          {/* HEADER SIDEBAR (LOGO / CIERRE) */}
          <div className="mb-8 md:mb-10 px-4 flex justify-between items-center">
             <div>
                <h2 className="text-2xl font-black text-[#87be00] tracking-tighter italic leading-none">
                  Cultiva<span className="text-gray-900">App</span>
                </h2>
                <span className="text-[9px] font-black text-gray-300 uppercase tracking-[0.2em] block mt-1">Admin Panel</span>
             </div>
             {/* Botón X solo móvil */}
             <button onClick={() => setIsMobileMenuOpen(false)} className="md:hidden text-gray-400 p-1">
                <FiX size={20} />
             </button>
          </div>
          
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            <AdminSidebar />
          </div>

          <div className="mt-auto pt-6 border-t border-gray-50 shrink-0">
            <button 
              onClick={handleLogoutAction} 
              className="flex items-center gap-3 text-gray-400 hover:text-red-500 hover:bg-red-50 px-4 py-3 md:px-6 md:py-4 rounded-2xl transition-all text-[10px] font-black uppercase tracking-widest w-full group"
            >
              <FiLogOut size={18} className="group-hover:scale-110 transition-transform"/> 
              Cerrar sesión
            </button>
          </div>
        </div>
      </aside>

      {/* CONTENT AREA */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden w-full">
        
        {/* TOPBAR RESPONSIVO */}
        <header className="bg-white border-b border-gray-50 px-4 md:px-10 py-4 md:py-6 flex items-center justify-between shrink-0 z-30 shadow-sm">
          
          <div className="flex items-center gap-3 md:gap-4 min-w-0">
            {/* BOTÓN HAMBURGUESA */}
            <button 
              onClick={() => setIsMobileMenuOpen(true)}
              className="p-2 md:hidden text-gray-400 hover:text-[#87be00] transition-colors"
            >
              <FiMenu size={24} />
            </button>

            <div className="hidden lg:flex p-3 bg-gray-50 rounded-2xl text-gray-800">
               <FiLayout size={20} />
            </div>

            <div className="flex flex-col truncate">
              <h1 className="text-base md:text-xl font-black text-gray-900 uppercase tracking-tighter leading-none truncate">
                Gestión Empresa
              </h1>
              <span className="text-[8px] md:text-[10px] font-bold text-[#87be00] uppercase tracking-widest mt-1 italic truncate">
                {user?.company_name || 'Alaluf Real Estate'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 md:gap-8 shrink-0">
            <Notifications 
              notifications={notifications} 
              unreadCount={unreadCount} 
              onMarkAsRead={onMarkRead} 
            />

            {/* AVATAR ADMIN (Ocultamos textos en móvil, dejamos el círculo) */}
            <div className="flex items-center gap-4 md:pl-8 md:border-l md:border-gray-100">
              <div className="text-right hidden sm:block">
                <p className="text-[11px] font-black text-gray-900 uppercase tracking-tighter italic leading-none mb-1 truncate max-w-[120px]">
                  {user?.name || 'Admin'}
                </p>
                <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">
                  {user?.role || 'Root'}
                </p>
              </div>
              <div className="h-10 w-10 md:h-12 md:w-12 rounded-[1rem] md:rounded-[1.2rem] bg-gray-900 text-[#87be00] flex items-center justify-center font-black text-[10px] md:text-xs border border-gray-800 shadow-sm overflow-hidden shrink-0">
                {user?.name?.substring(0, 2).toUpperCase() || 'AD'}
              </div>
            </div>
          </div>
        </header>

        {/* CONTENIDO SCROLLABLE */}
        <div className="flex-1 overflow-y-auto bg-[#F8FAFC] custom-scrollbar p-4 md:p-10">
          <div className="max-w-7xl mx-auto">
            <Outlet context={{ 
                notifications, 
                onMarkRead, 
                loading,
                refresh
            }} />
          </div>
        </div>
      </main>
    </div>
  )
}

export default AdminDashboard;