import { useState } from "react"
import { Outlet, useNavigate } from "react-router-dom"
import { FiLogOut } from "react-icons/fi" 
import { AiOutlineQrcode } from "react-icons/ai"
import { QRCodeSVG } from "qrcode.react"
import UserSidebar from "./UserSidebar"
import Notifications from "../../components/Notifications"
import { useAuth } from "../../context/AuthContext"
import { useNotificationContext } from "../../context/NotificationContext"

const UserDashboard = () => {
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  
  const { notifications, unreadCount, onMarkRead } = useNotificationContext()
  const [showQR, setShowQR] = useState(false)

  const handleLogout = () => {
    logout()
    navigate("/")
  }

  const shareUrl = user ? `${window.location.origin}/verify/${user.id}` : ""

  const getInitials = () => {
    if (!user) return "--";
    const fName = String(user.first_name || "").trim();
    const lName = String(user.last_name || "").trim();
    return fName && lName ? `${fName.charAt(0)}${lName.charAt(0)}`.toUpperCase() : (fName || "US").substring(0, 2).toUpperCase();
  };

  return (
    <div className="min-h-screen flex flex-row bg-[#F8FAFC] font-[Outfit] relative">
      
      {/* Sidebar - Controla su propia visibilidad (responsive interno) */}
      <UserSidebar />

      {/* CONTENEDOR PRINCIPAL */}
      <div className="flex-1 p-3 sm:p-4 md:p-6 lg:p-10 flex flex-col h-screen overflow-hidden w-full relative z-0">
        
        {/* HEADER RESPONSIVO Y COMPACTO */}
        {/* 🚩 Se añadió mt-4 para que no choque arriba y se redujeron gaps para mayor compacidad */}
        <div className="flex justify-between items-center mb-4 md:mb-8 mt-16 md:mt-0 shrink-0 bg-white p-2.5 md:p-4 rounded-[1.5rem] md:rounded-[2rem] shadow-sm border border-gray-50">
          
          {/* Lado Izquierdo: Avatar + Nombre */}
          <div className="flex items-center gap-2 md:gap-4 pl-1 md:pl-4">
            <div className="h-9 w-9 md:h-12 md:w-12 rounded-[1rem] md:rounded-[1.2rem] bg-[#87be00]/10 flex items-center justify-center text-[#87be00] font-black text-[10px] md:text-xs border border-[#87be00]/20 shadow-sm overflow-hidden transition-all shrink-0">
              {getInitials()}
            </div>

            <div className="hidden sm:block">
              <p className="text-[10px] md:text-[11px] font-black text-gray-900 uppercase italic leading-none truncate max-w-[120px] md:max-w-none">
                Hola, {user?.first_name || 'Colaborador'}
              </p>
              <p className="text-[8px] md:text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-1">
                Panel de Colaborador
              </p>
            </div>
          </div>

          {/* Lado Derecho: Acciones */}
          <div className="flex items-center gap-1.5 md:gap-6 pr-1 md:pr-0">
            <Notifications /> 

            <div className="h-6 md:h-8 w-[1px] bg-gray-100 hidden sm:block"></div>

            <button
              onClick={() => setShowQR(!showQR)}
              className={`flex items-center gap-1.5 px-3 py-2 md:px-5 md:py-2.5 rounded-xl shadow-sm text-[9px] md:text-[10px] font-black uppercase tracking-widest border transition-all duration-300 ${
                showQR 
                  ? "bg-[#87be00] text-white border-[#87be00]" 
                  : "bg-white text-gray-600 border-gray-100 hover:border-[#87be00] hover:text-[#87be00]"
              }`}
            >
              <AiOutlineQrcode className="w-4 h-4 md:w-[18px] md:h-[18px]" />
              <span className="hidden xs:inline">{showQR ? "Cerrar" : "QR"}</span>
            </button>

            <button
              onClick={handleLogout}
              className="p-2 md:p-2.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
            >
              <FiLogOut className="w-4 h-4 md:w-5 md:h-5" />
            </button>
          </div>
        </div>

        {/* QR SECTION */}
        {showQR && user && (
          <div className="mb-4 md:mb-8 flex justify-center animate-in fade-in slide-in-from-top-4 duration-500 px-2">
            <div className="bg-white p-6 md:p-8 rounded-[2rem] md:rounded-[3rem] shadow-xl border border-gray-50 flex flex-col items-center max-w-xs w-full relative overflow-hidden">
               <div className="absolute top-0 left-0 w-full h-2 bg-[#87be00]"></div>
              
              <h3 className="text-gray-900 font-black uppercase italic mb-1 text-xs md:text-sm">Tu Identificación</h3>
              <p className="text-[8px] md:text-[9px] font-bold text-gray-400 uppercase tracking-[0.2em] mb-4 md:mb-6 text-center">Acceso CultivaApp</p>
              
              <div className="bg-white p-4 md:p-5 border-[4px] border-[#87be00]/20 rounded-[2rem] md:rounded-[2.5rem] mb-4 md:mb-6 shadow-sm">
                <QRCodeSVG value={shareUrl} size={130} className="md:w-[150px] md:h-[150px]" level={"H"} />
              </div>
            </div>
          </div>
        )}

        {/* VISTAS DINÁMICAS */}
        <div className="flex-1 overflow-y-auto custom-scrollbar rounded-[1.5rem] md:rounded-[2.5rem] bg-white shadow-sm border border-gray-50 p-4 sm:p-6 md:p-8">
          <Outlet context={{ notifications, unreadCount, onMarkRead }} />
        </div>
      </div>
    </div>
  )
}

export default UserDashboard