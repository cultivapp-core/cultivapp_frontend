import React, { useEffect, useState, useMemo } from "react";
import api from "../../api/apiClient";
import { FiMonitor, FiWifiOff, FiUser, FiWifi, FiSearch } from "react-icons/fi";
import { motion, AnimatePresence } from "framer-motion";
import { io } from "socket.io-client";

const SOCKET_URL = import.meta.env.VITE_API_URL;

const ActiveSessions = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("ONLINE"); 
  const [searchTerm, setSearchTerm] = useState("");

  const fetchSessions = async () => {
    try {
      const res = await api.get(`/users/sessions/active?ts=${Date.now()}`);
      const data = Array.isArray(res) ? res : (Array.isArray(res?.data) ? res.data : []);
      setUsers(data);
    } catch (error) {
      console.error("Error cargando sesiones:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSessions();

    const socket = io(SOCKET_URL, { credentials: true });

    const userLocal = JSON.parse(localStorage.getItem("user"));
    if (userLocal?.id) {
      socket.emit("register_user", userLocal.id);
    }

    socket.on("radar_update", () => {
      fetchSessions();
    });

    const interval = setInterval(fetchSessions, 30000);

    return () => {
      socket.off("radar_update");
      socket.disconnect();
      clearInterval(interval);
    };
  }, []);

  const onlineUsersCount = useMemo(() => users.filter(u => u.current_session_id !== null).length, [users]);
  const offlineUsersCount = useMemo(() => users.filter(u => u.current_session_id === null).length, [users]);

  const filteredUsers = useMemo(() => {
    let result = [...users];

    if (filter === "ONLINE") result = result.filter(u => u.current_session_id !== null);
    if (filter === "OFFLINE") result = result.filter(u => u.current_session_id === null);

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      result = result.filter(u => 
        `${u.first_name} ${u.last_name}`.toLowerCase().includes(term) ||
        u.email?.toLowerCase().includes(term)
      );
    }

    return result;
  }, [users, filter, searchTerm]);

  if (loading && users.length === 0) return (
    <div className="flex flex-col items-center justify-center py-20 gap-4 font-[Outfit] flex-1">
      <div className="w-8 h-8 border-2 border-[#5c9200] border-t-transparent rounded-full animate-spin" />
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Sincronizando Radar...</p>
    </div>
  );

  return (
    <div className="flex-1 transition-all duration-300 space-y-6 font-[Outfit] pb-12 pt-24 md:pt-6 bg-slate-50/50 min-h-screen">
      
      {/* HEADER RESPONSIVO */}
      <div className="px-4 sm:px-6 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-[#111111] tracking-tight uppercase leading-none">
            Radar de Sesiones
          </h2>
          <p className="text-[9px] sm:text-[10px] font-bold text-[#5c9200] uppercase tracking-[0.25em] mt-2">
            Monitoreo de red global en tiempo real
          </p>
        </div>

        {/* INDICADORES DE ESTADO */}
        <div className="flex items-center gap-2 sm:gap-3 self-start sm:self-auto w-full sm:w-auto">
          <div className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-3 sm:px-4 py-2 bg-white border border-slate-200 rounded-xl shadow-sm">
            <FiWifiOff className="text-slate-400" size={12} />
            <span className="text-[9px] sm:text-[10px] font-bold uppercase text-slate-500 tracking-wider">OFF: {offlineUsersCount}</span>
          </div>
          <div className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-3 sm:px-4 py-2 bg-emerald-50 border border-emerald-100 rounded-xl shadow-sm">
            <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-[#5c9200] animate-pulse" />
            <span className="text-[9px] sm:text-[10px] font-extrabold uppercase text-[#5c9200] tracking-wider">ON: {onlineUsersCount}</span>
          </div>
        </div>
      </div>

      {/* CONTROLES ACCESIBLES: PESTAÑAS + BUSCADOR */}
      <div className="px-4 sm:px-6 flex flex-col lg:flex-row gap-4 items-stretch lg:items-center justify-between">
        
        {/* TABS CON SCROLL LATERAL EN SMARTPHONES */}
        <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar shrink-0 max-w-full">
          {["ALL", "ONLINE", "OFFLINE"].map((f) => (
            <button 
              key={f} 
              onClick={() => setFilter(f)} 
              className={`px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl text-[9px] sm:text-[10px] font-bold uppercase tracking-wider transition-all组合 whitespace-nowrap border ${
                filter === f 
                  ? "bg-[#111111] text-white border-[#111111] shadow-sm" 
                  : "bg-white text-slate-400 border-slate-200 hover:text-slate-600"
              }`}
            >
              {f === "ALL" ? "Red Completa" : f === "ONLINE" ? "Conectados" : "Desconectados"}
            </button>
          ))}
        </div>

        {/* INPUT DE BÚSQUEDA ADAPTABLE */}
        <div className="relative w-full lg:w-72">
          <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
          <input 
            type="text"
            placeholder="Buscar colaborador..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-white border border-slate-200 rounded-xl pl-11 pr-4 py-2 sm:py-2.5 text-[11px] sm:text-[12px] font-medium text-slate-700 placeholder-slate-400 outline-none focus:border-[#5c9200] focus:ring-1 focus:ring-[#5c9200] transition-all shadow-sm"
          />
        </div>
      </div>

      {/* CUADRÍCULA DE COLABORADORES FLUIDA (1 col en móvil, 2 en tablets/laptops) */}
      <div className="px-4 sm:px-6 grid grid-cols-1 md:grid-cols-2 gap-3.5 max-w-7xl w-full">
        <AnimatePresence mode="popLayout">
          {filteredUsers.map((u) => {
            const isOnline = u.current_session_id !== null;
            return (
              <motion.div 
                layout
                initial={{ opacity: 0, scale: 0.98 }} 
                animate={{ opacity: 1, scale: 1 }} 
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.15 }}
                key={u.id}
                className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between gap-3 hover:border-slate-200 transition-colors w-full min-w-0"
              >
                <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1">
                  {/* ICONO CON INDICADOR INTEGRADO */}
                  <div className={`w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 border relative ${
                    isOnline 
                      ? 'bg-emerald-50 text-[#5c9200] border-emerald-100' 
                      : 'bg-slate-50 text-slate-400 border-slate-200'
                  }`}>
                    {isOnline ? <FiWifi size={15} /> : <FiUser size={15} />}
                    {/* Punto de estado visible directo en móviles sobre el avatar */}
                    <div className={`absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full border-2 border-white sm:hidden ${isOnline ? 'bg-[#5c9200]' : 'bg-slate-300'}`} />
                  </div>
                  
                  <div className="min-w-0 flex-1">
                    <p className="text-[12px] sm:text-[13px] font-bold text-[#111111] uppercase tracking-tight truncate leading-tight">
                      {u.first_name} {u.last_name}
                    </p>
                    <p className="text-[9px] sm:text-[10px] font-medium text-slate-400 truncate mt-0.5">
                      {u.email}
                    </p>
                    {/* Información compacta extra de rol bajo el mail en móviles */}
                    <span className="inline-block sm:hidden text-[8px] font-black tracking-widest text-slate-400 uppercase mt-1 bg-slate-100 px-1.5 py-0.5 rounded">
                      {u.role || 'Colaborador'}
                    </span>
                  </div>
                </div>

                {/* INDICADOR LATERAL COMPACTO (SÓLO SM O SUPERIOR) */}
                <div className="hidden sm:flex items-center gap-3 shrink-0 px-1">
                  <div className="flex flex-col text-right">
                    <span className={`text-[8px] sm:text-[9px] font-extrabold uppercase tracking-wider ${isOnline ? 'text-[#5c9200]' : 'text-slate-400'}`}>
                      {isOnline ? 'Conectado' : 'Offline'}
                    </span>
                    {u.company_name && (
                      <span className="text-[8px] font-bold text-slate-400 max-w-[90px] truncate uppercase mt-0.5">
                        {u.company_name}
                      </span>
                    )}
                  </div>
                  <div className={`w-2 h-2 rounded-full shadow-sm ${isOnline ? 'bg-[#5c9200] animate-pulse' : 'bg-slate-200'}`} />
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* COMPONENTE EMPTY STATE EN CASO DE NO COINCIDENCIAS */}
      {filteredUsers.length === 0 && (
        <div className="mx-4 sm:mx-6 text-center py-12 bg-white rounded-2xl border border-dashed border-slate-200 p-6 max-w-7xl">
          <FiMonitor className="mx-auto text-slate-300 mb-3" size={22} />
          <p className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-400">No hay sesiones activas que coincidan</p>
        </div>
      )}

    </div>
  );
};

export default ActiveSessions;