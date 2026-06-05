import React from "react";
import { Link, useLocation } from "react-router-dom";
import { FiPieChart, FiBarChart2, FiMap, FiCamera, FiAlertCircle, FiLogOut } from "react-icons/fi";
import { useAuth } from "../../context/AuthContext"; // 🚩 Asegúrate de que esta ruta sea la correcta

const ViewerSidebar = () => {
  const location = useLocation();
  const { logout } = useAuth(); // 🚩 Hook para el logout

  const menuItems = [
    { path: "/viewer/dashboard", name: "Panorama", icon: <FiPieChart size={18} /> },
    { path: "/viewer/reportes", name: "Métricas", icon: <FiBarChart2 size={18} /> },
    { path: "/viewer/mapa", name: "Monitoreo GPS", icon: <FiMap size={18} /> },
    { path: "/viewer/galeria", name: "Evidencias", icon: <FiCamera size={18} /> },
    { path: "/viewer/alertas", name: "Alertas", icon: <FiAlertCircle size={18} /> },
  ];

  return (
    <div className="flex flex-col justify-between h-full w-full font-[Outfit] mt-6 px-2">
      
      {/* SECCIÓN DEL MENÚ */}
      <div>
        <span className="text-[9px] font-black text-gray-300 uppercase tracking-[0.2em] px-4 block mb-4">
          Módulo Gerencial
        </span>
        
        <nav className="flex flex-col gap-2">
          {menuItems.map((item) => {
            const isActive = location.pathname.includes(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`
                  group flex items-center gap-4 px-4 py-4 rounded-2xl transition-all duration-300
                  ${isActive 
                    ? "bg-[#87be00] text-white shadow-lg shadow-[#87be00]/30" 
                    : "text-gray-400 hover:bg-gray-50 hover:text-gray-900"
                  }
                `}
              >
                <span className={`
                  transition-transform duration-300
                  ${isActive ? "scale-110 text-white" : "group-hover:scale-110 group-hover:text-[#87be00] text-gray-400"}
                `}>
                  {item.icon}
                </span>
                <span className={`
                  text-[10px] font-black uppercase tracking-widest transition-transform duration-300
                  ${!isActive && "group-hover:translate-x-1"}
                `}>
                  {item.name}
                </span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* 🚩 BOTÓN CERRAR SESIÓN */}
      <div className="pt-6 pb-6 border-t border-gray-100">
        <button 
          onClick={logout} 
          className="w-full flex items-center gap-3 px-4 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest text-red-400 hover:bg-red-50 transition-all duration-300"
        >
          <FiLogOut size={16} /> Cerrar Sesión
        </button>
      </div>

    </div>
  );
};

export default ViewerSidebar;