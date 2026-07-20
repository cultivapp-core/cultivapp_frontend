import { useState } from "react"
import { Outlet } from "react-router-dom"
import { FiMenu, FiX } from "react-icons/fi"
import SupervisorSidebar from "./SuperviorSidebar"
import Notifications from "../../components/Notifications"
import { useAuth } from "../../context/AuthContext"

const SupervisorDashboard = () => {
  const { user } = useAuth()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  const getInitials = () => {
    if (!user) return "--";
    const fName = String(user.first_name || "").trim();
    const lName = String(user.last_name || "").trim();
    
    if (fName && lName) {
      return `${fName.charAt(0)}${lName.charAt(0)}`.toUpperCase();
    }
    if (fName) {
      return fName.substring(0, 2).toUpperCase();
    }
    return "--"; 
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-[#F8FAFC] font-[Outfit] relative">
      
      {/* 🚩 SIDEBAR RESPONSIVO CON FADE & SLIDE ANIMATION */}
      {/* Usamos pointer-events-none en lugar de 'hidden' para permitir que la animación se complete */}
      <div 
        className={`fixed inset-0 z-50 md:relative md:z-auto transition-all duration-300 ${
          isMobileMenuOpen ? "pointer-events-auto" : "pointer-events-none md:pointer-events-auto"
        }`}
      >
        {/* Fondo oscuro (Overlay) con efecto Fade-out */}
        <div 
          className={`absolute inset-0 bg-black/60 transition-opacity duration-300 ease-in-out md:hidden ${
            isMobileMenuOpen ? "opacity-100" : "opacity-0"
          }`}
          onClick={() => setIsMobileMenuOpen(false)}
        ></div>
        
        {/* Panel del Sidebar con efecto Slide-out y Fade-out */}
        <div 
          className={`relative h-full w-64 md:w-auto transition-all duration-300 ease-in-out transform ${
            isMobileMenuOpen 
              ? "translate-x-0 opacity-100 shadow-2xl" 
              : "-translate-x-full opacity-0 md:translate-x-0 md:opacity-100 md:shadow-none"
          }`}
        >
          {/* Aquí le pasamos la función para que se auto-cierre al hacer clic en cualquier NavLink */}
          <SupervisorSidebar onClose={() => setIsMobileMenuOpen(false)} />
        </div>
      </div>

      {/* CONTENEDOR PRINCIPAL */}
      <div className="flex-1 p-3 sm:p-4 md:p-6 lg:p-10 flex flex-col h-screen overflow-hidden w-full relative z-0">
        
        {/* HEADER SUPERVISOR */}
        <div className="flex justify-between items-center mb-4 md:mb-8 shrink-0 bg-white p-3 md:p-4 rounded-[1.5rem] md:rounded-[2rem] shadow-sm border border-gray-50">
          <div className="flex items-center gap-3 md:gap-4 pl-2 md:pl-4">
            
            {/* BOTÓN MENÚ MÓVIL */}
            <button 
              onClick={() => setIsMobileMenuOpen(true)} // Solo lo abre, el cierre lo maneja el sidebar o el overlay
              className="md:hidden text-gray-400 hover:text-[#87be00] p-1 transition-colors"
            >
              <FiMenu size={24} />
            </button>

            {/* 🎨 Avatar Estilo Squircle */}
            <div className="h-10 w-10 md:h-12 md:w-12 rounded-[1rem] md:rounded-[1.2rem] bg-[#87be00]/10 flex items-center justify-center text-[#87be00] font-black text-[10px] md:text-xs border border-[#87be00]/20 shadow-sm overflow-hidden shrink-0">
              {getInitials()}
            </div>

            <div className="hidden sm:block">
              <p className="text-[10px] md:text-[11px] font-black text-gray-900 uppercase italic leading-none truncate max-w-[120px] md:max-w-none">
                {user?.first_name ? `Hola, ${user.first_name}` : 'Supervisor'}
              </p>
              <p className="text-[8px] md:text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-1">Control Terreno</p>
            </div>
          </div>

          <div className="flex items-center gap-3 md:gap-6 pr-2 md:pr-0">
            <Notifications />
            <div className="h-6 md:h-8 w-[1px] bg-gray-100 hidden sm:block"></div>
            
            <div className="text-right hidden md:block">
              <p className="text-[10px] font-black text-gray-900 uppercase italic">
                {user?.company_name || 'CultivaApp'}
              </p>
              <p className="text-[8px] font-bold text-[#87be00] uppercase tracking-widest text-right">Socio Estratégico</p>
            </div>
          </div>
        </div>

        {/* CONTENIDO DINÁMICO */}
        <div className="flex-1 overflow-y-auto custom-scrollbar rounded-[1.5rem] md:rounded-[2.5rem] bg-white shadow-sm border border-gray-50 p-4 sm:p-6 md:p-8">
          <Outlet />
        </div>
      </div>
    </div>
  )
}

export default SupervisorDashboard