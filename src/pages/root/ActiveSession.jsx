import React, { useEffect, useRef, useState, useMemo } from "react";
import api from "../../api/apiClient";
import { FiMonitor, FiWifiOff, FiUser, FiWifi } from "react-icons/fi";
import { motion, AnimatePresence } from "framer-motion";

const ActiveSessions = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("ALL");

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

  const onlineUsersCount = users.filter(u => u.current_session_id !== null).length;
  const offlineUsersCount = users.length - onlineUsersCount;

  const filteredUsers = useMemo(() => {
    if (filter === "ONLINE") return users.filter(u => u.current_session_id !== null);
    if (filter === "OFFLINE") return users.filter(u => u.current_session_id === null);
    return users;
  }, [users, filter]);

  return (
    <div className="space-y-6 font-[Outfit] pb-10">
      
      {/* 🔴 HEADER CON ESPACIADO ESPECIAL PARA EL BOTÓN HAMBURGUESA */}
      <div className="pl-[76px] pr-4 pt-5 flex flex-col gap-4">
        <div>
          <h2 className="text-2xl font-black text-gray-800 tracking-tighter uppercase italic leading-none">
            Radar de Sesiones
          </h2>
          <p className="text-[9px] font-bold text-[#87be00] uppercase tracking-[0.2em] mt-1">
            Monitoreo de red global en tiempo real
          </p>
        </div>

        {/* INDICADORES */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 border border-gray-100 rounded-xl">
            <FiWifiOff className="text-gray-400" size={10} />
            <span className="text-[9px] font-black uppercase text-gray-400 tracking-widest">OFF: {offlineUsersCount}</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 border border-green-100 rounded-xl">
            <div className="w-1.5 h-1.5 rounded-full bg-[#87be00] animate-pulse" />
            <span className="text-[9px] font-black uppercase text-green-700 tracking-widest">ON: {onlineUsersCount}</span>
          </div>
        </div>
      </div>

      {/* PESTAÑAS (TABS) */}
      <div className="px-4 flex gap-2 overflow-x-auto pb-2 custom-scrollbar">
        {["ALL", "ONLINE", "OFFLINE"].map((f) => (
          <button 
            key={f} 
            onClick={() => setFilter(f)} 
            className={`px-5 py-2.5 rounded-full text-[9px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${
              filter === f ? "bg-gray-900 text-white shadow-md" : "bg-white text-gray-400 border border-gray-100"
            }`}
          >
            {f === "ALL" ? "Red Completa" : f === "ONLINE" ? "Conectados" : "Desconectados"}
          </button>
        ))}
      </div>

      {/* LISTADO DE USUARIOS */}
      <div className="px-4 space-y-3">
        <AnimatePresence>
          {filteredUsers.map((u) => {
            const isOnline = u.current_session_id !== null;
            return (
              <motion.div 
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                key={u.id}
                className="bg-white p-4 rounded-[2rem] border border-gray-100 shadow-sm flex items-center gap-4"
              >
                <div className={`p-3 rounded-2xl ${isOnline ? 'bg-green-50 text-[#87be00]' : 'bg-gray-50 text-gray-300'}`}>
                  <FiUser size={18} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-black uppercase truncate text-gray-900">{u.first_name} {u.last_name}</p>
                  <p className="text-[8px] font-bold text-gray-400 truncate">{u.email}</p>
                </div>
                <div className="flex flex-col items-center">
                  {isOnline ? <FiWifi size={14} className="text-[#87be00] mb-1" /> : <FiWifiOff size={14} className="text-gray-300 mb-1" />}
                  <span className={`text-[7px] font-black uppercase ${isOnline ? 'text-[#87be00]' : 'text-gray-300'}`}>
                    {isOnline ? 'Online' : 'Off'}
                  </span>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default ActiveSessions;