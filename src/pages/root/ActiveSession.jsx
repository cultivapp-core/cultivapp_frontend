import { useEffect, useState, useMemo } from "react";
import api from "../../api/apiClient";
import { FiActivity, FiUser, FiMonitor, FiWifi, FiWifiOff } from "react-icons/fi";
import { motion } from "framer-motion";

const ActiveSessions = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("ALL"); // ALL, ONLINE, OFFLINE

  const fetchSessions = async () => {
    try {
      setLoading(true);
      const data = await api.get("/users/sessions/active");
      setUsers(data || []);
    } catch (error) {
      console.error("Error cargando sesiones:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSessions();
    const interval = setInterval(fetchSessions, 30000);
    return () => clearInterval(interval);
  }, []);

  // 🚩 Lógica de procesamiento para estadísticas y filtrado
  const onlineUsersCount = users.filter(u => u.current_session_id !== null).length;
  const offlineUsersCount = users.length - onlineUsersCount;

  const filteredUsers = useMemo(() => {
    if (filter === "ONLINE") return users.filter(u => u.current_session_id !== null);
    if (filter === "OFFLINE") return users.filter(u => u.current_session_id === null);
    return users;
  }, [users, filter]);

  return (
    <div className="space-y-8 animate-in fade-in duration-700 font-[Outfit] pb-10">
      
      {/* HEADER ROOT */}
      <div className="px-4 flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-[#87be00]/10 rounded-lg text-[#87be00]">
              <FiMonitor size={20} />
            </div>
            <h2 className="text-4xl font-black text-gray-800 tracking-tighter uppercase italic leading-none">
              Radar de Sesiones
            </h2>
          </div>
          <p className="text-[10px] font-bold text-[#87be00] uppercase tracking-[0.3em] ml-12">
            Monitoreo de red global en tiempo real
          </p>
        </div>

        {/* 🚩 INDICADORES ESTILO DASHBOARD CORPORATIVO */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-4 py-2 bg-gray-50 border border-gray-100 rounded-2xl shadow-sm">
            <FiWifiOff className="text-gray-400" size={14} />
            <span className="text-[10px] font-black uppercase text-gray-400 tracking-widest">
              Offline: {offlineUsersCount}
            </span>
          </div>

          <div className="flex items-center gap-2 px-4 py-2 bg-green-50 border border-green-100 rounded-2xl shadow-sm">
            <div className="w-2 h-2 rounded-full bg-[#87be00] animate-ping" />
            <span className="text-[10px] font-black uppercase text-green-700 tracking-widest">
              En línea: {onlineUsersCount}
            </span>
          </div>
        </div>
      </div>

      {/* 🚩 PESTAÑAS DE FILTRADO (TABS) */}
      <div className="px-4 flex gap-2">
        <button 
          onClick={() => setFilter("ALL")}
          className={`px-6 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${filter === "ALL" ? "bg-gray-900 text-white shadow-md" : "bg-white text-gray-400 hover:bg-gray-100"}`}
        >
          Toda la red
        </button>
        <button 
          onClick={() => setFilter("ONLINE")}
          className={`px-6 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${filter === "ONLINE" ? "bg-[#87be00] text-white shadow-md shadow-[#87be00]/30" : "bg-white text-gray-400 hover:bg-gray-100"}`}
        >
          Conectados
        </button>
        <button 
          onClick={() => setFilter("OFFLINE")}
          className={`px-6 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${filter === "OFFLINE" ? "bg-gray-200 text-gray-600 shadow-inner" : "bg-white text-gray-400 hover:bg-gray-100"}`}
        >
          Desconectados
        </button>
      </div>

      {/* CONTENEDOR DE LA TABLA */}
      <div className="bg-white rounded-[3.5rem] shadow-2xl shadow-gray-200/50 border border-gray-100 overflow-hidden mx-2 lg:mx-0">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-100">
                <th className="p-8 text-[10px] font-black uppercase text-gray-400 tracking-[0.2em]">Usuario de Red</th>
                <th className="p-8 text-[10px] font-black uppercase text-gray-400 tracking-[0.2em]">Jerarquía / Rol</th>
                <th className="p-8 text-[10px] font-black uppercase text-gray-400 tracking-[0.2em]">Empresa Cliente</th>
                <th className="p-8 text-[10px] font-black uppercase text-gray-400 tracking-[0.2em] text-center">Estado Conexión</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-50">
              {loading && users.length === 0 ? (
                <tr>
                  <td colSpan="4" className="p-20 text-center">
                    <div className="inline-block animate-spin rounded-full h-10 w-10 border-[6px] border-[#87be00] border-t-transparent"></div>
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan="4" className="p-20 text-center text-gray-400 font-bold uppercase tracking-widest text-xs italic">
                    No hay registros bajo este filtro en este momento.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u, i) => {
                  const isOnline = u.current_session_id !== null;
                  
                  return (
                    <motion.tr 
                      initial={{ opacity: 0, x: -10 }} 
                      animate={{ opacity: 1, x: 0 }} 
                      transition={{ delay: i * 0.05 }}
                      key={u.id} 
                      className="hover:bg-gray-50/50 transition-all group"
                    >
                      <td className="p-8">
                        <div className="flex items-center gap-4">
                          <div className={`p-3 rounded-xl transition-colors ${isOnline ? 'bg-green-50 text-[#87be00] group-hover:bg-[#87be00] group-hover:text-white' : 'bg-gray-50 text-gray-300 group-hover:bg-gray-200'}`}>
                            <FiUser size={18} />
                          </div>
                          <div>
                            <p className={`text-sm font-black uppercase tracking-tighter italic ${isOnline ? 'text-gray-900' : 'text-gray-500'}`}>
                              {u.first_name} {u.last_name}
                            </p>
                            <p className="text-[10px] font-bold text-gray-400">{u.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-8">
                        <span className="bg-gray-50 px-3 py-1.5 rounded-lg text-[9px] font-black text-gray-700 uppercase tracking-widest border border-gray-100">
                          {u.role.replace("_", " ")}
                        </span>
                      </td>
                      <td className="p-8">
                        <p className={`text-xs font-black uppercase tracking-tight ${isOnline ? 'text-gray-600' : 'text-gray-400'}`}>
                          {u.company_name || "Cultiva SP"}
                        </p>
                      </td>
                      <td className="p-8">
                        <div className="flex justify-center items-center gap-2">
                          {isOnline ? (
                            <>
                              <FiWifi className="text-[#87be00] animate-pulse" size={14} />
                              <span className="text-[10px] font-black uppercase text-[#87be00] tracking-[0.2em]">En Línea</span>
                            </>
                          ) : (
                            <>
                              <FiWifiOff className="text-gray-300" size={14} />
                              <span className="text-[10px] font-black uppercase text-gray-400 tracking-[0.2em]">Desconectado</span>
                            </>
                          )}
                        </div>
                      </td>
                    </motion.tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ActiveSessions;