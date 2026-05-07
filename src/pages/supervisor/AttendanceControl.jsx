import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { FiClock, FiSearch, FiRefreshCw, FiCalendar, FiMapPin } from "react-icons/fi";
import api from "../../api/apiClient";

// Función segura para obtener la fecha local YYYY-MM-DD
const getLocalISODate = () => {
  const tzOffset = (new Date()).getTimezoneOffset() * 60000;
  return new Date(Date.now() - tzOffset).toISOString().split('T')[0];
};

const AttendanceControl = () => {
  const [attendance, setAttendance] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState(""); 
  const [selectedDate, setSelectedDate] = useState(getLocalISODate());

  const fetchAttendance = async () => {
    try {
      setLoading(true);
      const params = searchTerm.length > 2 
        ? { search: searchTerm } 
        : { date: selectedDate };

      const response = await api.get("/routes/attendance-report", params);
      const data = Array.isArray(response) ? response : (response?.data || []);
      setAttendance(data);
    } catch (error) {
      console.error("❌ Error cargando asistencia:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const delayDebounce = setTimeout(() => { fetchAttendance(); }, 500); 
    return () => clearTimeout(delayDebounce);
  }, [selectedDate, searchTerm]);

  // 🎨 REGLA: COLOR DEL AVATAR (RETRASO EN INICIO)
  const getAvatarStyles = (delay) => {
    if (delay === null || delay === undefined) return 'bg-gray-900 text-white';
    if (delay <= 0) return 'bg-[#87be00] text-white'; // Puntual
    if (delay <= 10) return 'bg-amber-400 text-gray-900'; // Tolerancia 10 min
    return 'bg-red-500 text-white'; // Retraso > 10 min
  };

  // 🎨 REGLA: LÓGICA DE ESTADO (SALIDA ANTICIPADA / EXTRA)
  const getStatusBadge = (diff, status) => {
    if (status !== 'COMPLETED') {
        return { 
          label: status === 'IN_PROGRESS' ? 'EN CURSO' : 'PENDIENTE', 
          style: status === 'IN_PROGRESS' ? 'bg-blue-50 text-blue-600 border-blue-100' : 'bg-amber-50 text-amber-600 border-amber-100'
        };
    }
    if (diff < -5) return { label: 'SALIDA ANTICIPADA', style: 'bg-red-50 text-red-600 border-red-100' };
    if (diff > 5) return { label: 'HORAS EXTRA', style: 'bg-indigo-50 text-indigo-600 border-indigo-100' };
    return { label: 'FINALIZADO', style: 'bg-green-50 text-green-600 border-green-100' };
  };

  const formatDate = (dateString) => {
    if (!dateString) return '--/--/--';
    const [y, m, d] = dateString.split('T')[0].split('-');
    return `${d}-${m}-${y}`;
  };

  return (
    <div className="space-y-6 md:space-y-8 font-[Outfit] pb-10">
      
      {/* HEADER */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 px-2 md:px-0">
        <div>
          <h2 className="text-2xl md:text-3xl font-black text-gray-900 uppercase italic tracking-tighter leading-none">
            Control de Jornada
          </h2>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-2">
            Panel de Supervisión • {searchTerm.length > 2 ? "Resultados de Búsqueda" : `Día: ${selectedDate}`}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row flex-wrap gap-2 md:gap-3 w-full lg:w-auto">
          <div className="relative w-full sm:flex-1 md:w-auto">
            <FiCalendar className="absolute left-4 top-1/2 -translate-y-1/2 text-[#87be00]" size={14} />
            <input 
              type="date" 
              className="w-full pl-10 pr-4 py-3 md:py-4 bg-white border border-gray-100 rounded-xl md:rounded-2xl text-[10px] md:text-xs font-black uppercase outline-none shadow-sm transition-all"
              value={selectedDate}
              onChange={(e) => { setSearchTerm(""); setSelectedDate(e.target.value); }}
            />
          </div>

          <div className="relative w-full sm:flex-1 md:w-64 lg:w-72">
            <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
            <input 
              type="text" 
              placeholder="COLABORADOR, LOCAL, CÓDIGO..."
              className="w-full pl-10 pr-4 py-3 md:py-4 bg-white border border-gray-100 rounded-xl md:rounded-2xl text-[10px] md:text-xs font-black outline-none shadow-sm transition-all uppercase"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <button onClick={fetchAttendance} className="w-full sm:w-auto p-3 md:p-4 bg-white border border-gray-100 rounded-xl md:rounded-2xl text-gray-400 hover:text-[#87be00] shadow-sm active:scale-95 transition-all">
            <FiRefreshCw size={20} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {/* 🚩 VISTA MÓVIL: TARJETAS */}
      <div className="md:hidden space-y-4 px-2">
        {attendance.map((row, idx) => {
          const statusInfo = getStatusBadge(row.exit_diff, row.status);
          const displayDate = row.visit_date || selectedDate;
          return (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.05 }} key={row.id || idx} className="bg-white p-5 rounded-[2rem] shadow-sm border border-gray-100 relative overflow-hidden">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  <div className={`h-12 w-12 rounded-2xl ${getAvatarStyles(row.entry_delay)} flex items-center justify-center text-[12px] font-black shadow-sm shrink-0`}>
                    {row.first_name?.[0]}{row.last_name?.[0]}
                  </div>
                  <div>
                    <p className="text-xs font-black text-gray-900 uppercase italic leading-none">{row.first_name} {row.last_name}</p>
                    <p className="text-[9px] font-bold text-[#87be00] uppercase mt-1 tracking-widest">{row.local_code} • {formatDate(displayDate)}</p>
                  </div>
                </div>
                <span className={`text-[8px] font-black px-2 py-1 rounded-md border ${statusInfo.style}`}>{statusInfo.label}</span>
              </div>

              <div className="bg-gray-50 p-3 rounded-2xl mb-3 text-center">
                  <p className="text-[10px] font-black text-gray-800 uppercase italic">{row.local_name}</p>
              </div>

              <div className="grid grid-cols-2 gap-2 mb-3">
                <div className="bg-white border border-gray-100 p-3 rounded-xl text-center">
                  <p className="text-[8px] font-black text-gray-400 uppercase mb-1">Entrada Real</p>
                  <span className={`text-xs font-black ${row.entry_delay > 10 ? 'text-red-500' : 'text-gray-900'}`}>{row.check_in || '--:--'}</span>
                </div>
                <div className="bg-white border border-gray-100 p-3 rounded-xl text-center">
                  <p className="text-[8px] font-black text-gray-400 uppercase mb-1">Salida Real</p>
                  <span className={`text-xs font-black ${row.exit_diff < -5 ? 'text-red-500' : 'text-gray-900'}`}>{row.check_out || '--:--'}</span>
                </div>
              </div>

              {row.total_work_time && (
                <div className="bg-[#87be00]/5 border border-[#87be00]/10 p-3 rounded-xl flex justify-between items-center">
                  <span className="text-[9px] font-black text-[#87be00] uppercase">Jornada Efectiva:</span>
                  <span className="text-[10px] font-black text-gray-900">{row.total_work_time} min</span>
                </div>
              )}
            </motion.div>
          );
        })}
      </div>

      {/* 🚩 VISTA DESKTOP: TABLA */}
      <div className="hidden md:block bg-white rounded-[2.5rem] shadow-sm border border-gray-50 overflow-hidden mx-2 lg:mx-0">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-900 text-white">
                <th className="px-6 py-5 text-[9px] font-black uppercase tracking-widest italic">Mercaderista</th>
                <th className="px-4 py-5 text-[9px] font-black uppercase tracking-widest italic text-center">Local / Cod</th>
                <th className="px-4 py-5 text-[9px] font-black uppercase tracking-widest italic text-center">Fecha</th>
                <th className="px-4 py-5 text-[9px] font-black uppercase tracking-widest italic text-center">Inicio</th>
                <th className="px-4 py-5 text-[9px] font-black uppercase tracking-widest italic text-center">Término</th>
                <th className="px-4 py-5 text-[9px] font-black uppercase tracking-widest italic text-center">Entrada Real</th>
                <th className="px-4 py-5 text-[9px] font-black uppercase tracking-widest italic text-center">Salida Real</th>
                <th className="px-4 py-5 text-[9px] font-black uppercase tracking-widest italic text-center">Tiempo Trabajo</th>
                <th className="px-6 py-5 text-[9px] font-black uppercase tracking-widest italic text-center">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {attendance.map((row, idx) => {
                const statusInfo = getStatusBadge(row.exit_diff, row.status);
                const displayDate = row.visit_date || selectedDate;
                return (
                  <motion.tr initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.05 }} key={row.id || idx} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-3">
                        <div className={`h-10 w-10 rounded-full ${getAvatarStyles(row.entry_delay)} flex items-center justify-center text-[10px] font-black shadow-md`}>
                          {row.first_name?.[0]}{row.last_name?.[0]}
                        </div>
                        <div>
                          <p className="text-xs font-black text-gray-900 leading-none uppercase">{row.first_name} {row.last_name}</p>
                          <p className="text-[9px] font-bold text-gray-400 uppercase mt-1">ID: {row.worker_id}</p>
                        </div>
                      </div>
                    </td>

                    {/* 🚩 LOCAL + CÓDIGO */}
                    <td className="px-4 py-5 text-center">
                      <p className="text-[10px] font-black text-gray-800 uppercase italic truncate max-w-[120px]">{row.local_name}</p>
                      <p className="text-[9px] font-bold text-[#87be00] uppercase tracking-tighter">{row.local_code}</p>
                    </td>

                    {/* 🚩 FECHA */}
                    <td className="px-4 py-5 text-center">
                      <span className="text-[10px] font-black text-gray-900 uppercase">
                        {formatDate(displayDate)}
                      </span>
                    </td>

                    <td className="px-4 py-5 text-center text-xs font-black text-gray-400">{row.plan_in || '--:--'}</td>
                    <td className="px-4 py-5 text-center text-xs font-black text-gray-400">{row.plan_out || '--:--'}</td>

                    <td className="px-4 py-5 text-center">
                      <span className={`text-xs font-black ${row.entry_delay > 10 ? 'text-red-500' : 'text-gray-900'}`}>{row.check_in || '--:--'}</span>
                    </td>

                    <td className="px-4 py-5 text-center">
                      <span className={`text-xs font-black ${row.exit_diff < -5 ? 'text-red-500' : row.exit_diff > 5 ? 'text-blue-500' : 'text-gray-900'}`}>{row.check_out || '--:--'}</span>
                    </td>

                    {/* 🚩 TIEMPO DE TRABAJO */}
                    <td className="px-4 py-5 text-center">
                      {row.total_work_time ? (
                        <div className="flex flex-col">
                          <span className="text-xs font-black text-gray-900">{row.total_work_time} min</span>
                          <span className="text-[8px] font-bold text-gray-400 uppercase tracking-tighter italic leading-none">Efectivos</span>
                        </div>
                      ) : <span className="text-xs font-black text-gray-300 italic">--</span>}
                    </td>

                    <td className="px-6 py-5 text-center">
                      <span className={`text-[9px] font-black px-3 py-1.5 rounded-md italic border ${statusInfo.style}`}>
                        {statusInfo.label}
                      </span>
                    </td>
                  </motion.tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AttendanceControl;