import { useContext } from "react";
import { AuthContext } from "../../context/AuthContext";
import { useNotificationContext } from "../../context/NotificationContext";
import { useNavigate } from "react-router-dom";
import { FiLogOut, FiBell, FiMaximize } from "react-icons/fi"; // FiMaximize simulando el icono de QR

const UserTopbar = () => {
  const { logout, user } = useContext(AuthContext);
  const { unreadCount } = useNotificationContext();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/", { replace: true });
  };

  // Iniciales del usuario
  const initials = `${user?.first_name?.[0] || 'J'}${user?.last_name?.[0] || 'E'}`.toUpperCase();

  return (
    <div className="bg-white border border-gray-100 rounded-[2rem] mx-4 mt-4 md:mx-6 md:mt-6 px-4 md:px-6 py-3 flex justify-between items-center shadow-[0_10px_40px_rgba(0,0,0,0.02)] shrink-0 font-[Outfit]">
      
      {/* SECCIÓN IZQUIERDA: PERFIL */}
      <div className="flex items-center gap-4">
        <div className="w-11 h-11 rounded-full bg-[#87be00]/10 border border-[#87be00]/20 flex items-center justify-center text-[#87be00] font-black text-sm shrink-0">
          {initials}
        </div>
        <div className="flex flex-col justify-center">
          <h2 className="text-[12px] font-black text-gray-900 uppercase tracking-widest leading-tight italic">
            Hola, {user?.first_name || 'Juan'}
          </h2>
          <p className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em]">
            Panel de Colaborador
          </p>
        </div>
      </div>

      {/* SECCIÓN DERECHA: ACCIONES */}
      <div className="flex items-center gap-2 md:gap-4">
        
        {/* Campana de Notificaciones */}
        <button className="relative p-2 text-gray-400 hover:text-[#87be00] transition-colors">
          <FiBell size={18} />
          {unreadCount > 0 && (
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full animate-pulse border border-white"></span>
          )}
        </button>

        {/* Icono QR (Visible solo en pantallas más grandes para no saturar móviles) */}
        <button className="hidden sm:flex p-2 text-gray-400 hover:text-gray-900 transition-colors bg-gray-50 rounded-xl">
          <FiMaximize size={18} />
        </button>

        {/* Separador visual */}
        <div className="w-[1px] h-6 bg-gray-100 hidden sm:block mx-1"></div>

        {/* Botón Salir */}
        <button 
          onClick={handleLogout}
          className="p-2 text-gray-400 hover:text-red-500 transition-colors"
          title="Cerrar sesión"
        >
          <FiLogOut size={18} />
        </button>
      </div>

    </div>
  );
};

export default UserTopbar;