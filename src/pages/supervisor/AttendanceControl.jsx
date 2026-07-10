import React, { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { FiClock, FiSearch, FiRefreshCw, FiCalendar, FiMapPin, FiArrowRight, FiHash, FiClipboard, FiCheck, FiUser, FiSliders, FiChevronLeft, FiChevronRight } from "react-icons/fi";
import api from "../../api/apiClient";

const getLocalISODate = () => {
  const tzOffset = (new Date()).getTimezoneOffset() * 60000;
  return new Date(Date.now() - tzOffset).toISOString().split('T')[0];
};

const AttendanceControl = () => {
  const [attendance, setAttendance] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState(""); 
  
  // Estados de filtros avanzados
  const [startDate, setStartDate] = useState(getLocalISODate());
  const [endDate, setEndDate] = useState(getLocalISODate());
  const [localCode, setLocalCode] = useState("");
  const [workerName, setWorkerName] = useState("");
  const [status, setStatus] = useState("");

  // 🚩 ESTADOS DE PAGINACIÓN NUEVOS
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const isMounted = useRef(false);

  // Lógica de carga adaptada para recibir opcionalmente una página forzada
  const fetchAttendance = async (pageTarget = page) => {
    try {
      setLoading(true);
      
      const queryParams = {
        startDate,
        endDate,
        localCode: localCode.trim(),
        workerName: workerName.trim(),
        status: status,
        page: pageTarget // Enviamos la página solicitada al Backend
      };

      if (searchTerm.length > 2) {
        queryParams.search = searchTerm;
      }

      const response = await api.get("/routes/attendance-report", { params: queryParams });
      
      // Control de lectura tolerante al formato del backend
      const responseData = response?.data || response;
      const rows = responseData?.rows || [];
      const pagesCount = responseData?.totalPages || 1;

      setAttendance(rows);
      setTotalPages(pagesCount);
    } catch (error) {
      console.error("❌ Error cargando asistencia:", error);
    } finally {
      setLoading(false);
    }
  };

  // Carga inicial (Lanza hoy por defecto en pág 1)
  useEffect(() => {
    fetchAttendance(1);
  }, []);

  // Escucha cambios de página manuales
  useEffect(() => {
    if (isMounted.current) {
      fetchAttendance(page);
    }
  }, [page]);

  // Buscador rápido con retraso controlado (Debounce)
  useEffect(() => {
    if (!isMounted.current) {
      isMounted.current = true;
      return;
    }
    const delayDebounce = setTimeout(() => { 
      setPage(1);
      fetchAttendance(1); 
    }, 500); 

    return () => clearTimeout(delayDebounce);
  }, [searchTerm]); 

  // Manejador del botón "Aplicar Filtros" (Fuerza reinicio a página 1)
  const handleApplyFilters = () => {
    if (page === 1) {
      fetchAttendance(1);
    } else {
      setPage(1); 
    }
  };

  const getAvatarStyles = (delay) => {
    if (delay === null || delay === undefined) return 'bg-gray-900 text-white';
    if (delay <= 0) return 'bg-[#87be00] text-white'; 
    if (delay <= 10) return 'bg-amber-400 text-gray-900'; 
    return 'bg-red-500 text-white'; 
  };

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
    <div className="w-full h-full flex flex-col font-[Outfit] bg-gray-50/30">
      
      {/* HEADER PRINCIPAL (Alineado con el Dashboard Analítico) */}
      <div className="bg-white border-b border-gray-100 pl-[76px] pr-4 py-5 md:px-8 md:py-8 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 shrink-0">
        <div>
          <h2 className="text-2xl md:text-3xl font-black text-gray-900 uppercase italic tracking-tighter leading-none">
            Control de Jornada
          </h2>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-2">
            Panel de Supervisión • Del {formatDate(startDate)} al {formatDate(endDate)}
          </p>
        </div>

        {/* BUSCADOR GLOBAL */}
        <div className="flex gap-2 w-full lg:w-auto items-center justify-end">
          <div className="relative w-full lg:w-72">
            <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
            <input 
              type="text" 
              placeholder="BUSQUEDA RÁPIDA (MÁS DE 2 CARACTERES)..."
              className="w-full pl-10 pr-4 py-3 md:py-4 bg-gray-50 border border-gray-100 rounded-xl md:rounded-2xl text-[10px] md:text-xs font-black outline-none shadow-sm transition-all uppercase focus:border-blue-400"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button onClick={() => fetchAttendance(page)} className="p-3 md:p-4 bg-gray-900 text-white hover:bg-black rounded-xl md:rounded-2xl shadow-sm active:scale-95 transition-all shrink-0">
            <FiRefreshCw size={20} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {/* CONTENEDOR DE CUERPO CON PADDING CORRECTO */}
      <div className="p-4 md:p-8 flex-1 overflow-y-auto space-y-6 md:space-y-8 pb-10">
        
        {/* BARRA DE FILTROS AVANZADOS */}
        <div className="bg-white p-4 md:p-6 rounded-[1.5rem] md:rounded-[2rem] border border-gray-100/70 shadow-sm grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 items-end">
          <div className="space-y-1">
            <label className="text-[9px] font-black text-gray-400 uppercase tracking-wider block pl-1">Desde</label>
            <div className="relative">
              <FiCalendar className="absolute left-4 top-1/2 -translate-y-1/2 text-[#87be00]" size={14} />
              <input 
                type="date" 
                className="w-full pl-10 pr-3 py-3 bg-gray-50/50 border border-gray-100 rounded-xl text-[10px] md:text-xs font-black uppercase outline-none focus:border-[#87be00] transition-colors"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[9px] font-black text-gray-400 uppercase tracking-wider block pl-1">Hasta</label>
            <div className="relative">
              <FiCalendar className="absolute left-4 top-1/2 -translate-y-1/2 text-[#87be00]" size={14} />
              <input 
                type="date" 
                className="w-full pl-10 pr-3 py-3 bg-gray-50/50 border border-gray-100 rounded-xl text-[10px] md:text-xs font-black uppercase outline-none focus:border-[#87be00] transition-colors"
                value={endDate}
                min={startDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[9px] font-black text-gray-400 uppercase tracking-wider block pl-1">Cod. Local</label>
            <div className="relative">
              <FiHash className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
              <input 
                type="text" 
                placeholder="EJ: J04, SM-12..."
                className="w-full pl-10 pr-3 py-3 bg-gray-50/50 border border-gray-100 rounded-xl text-[10px] md:text-xs font-black uppercase outline-none focus:border-[#87be00] transition-colors"
                value={localCode}
                onChange={(e) => setLocalCode(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[9px] font-black text-gray-400 uppercase tracking-wider block pl-1">Mercaderista</label>
            <div className="relative">
              <FiUser className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
              <input 
                type="text" 
                placeholder="NOMBRE o APELLIDO..."
                className="w-full pl-10 pr-3 py-3 bg-gray-50/50 border border-gray-100 rounded-xl text-[10px] md:text-xs font-black uppercase outline-none focus:border-[#87be00] transition-colors"
                value={workerName}
                onChange={(e) => setWorkerName(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[9px] font-black text-gray-400 uppercase tracking-wider block pl-1">Estado</label>
            <div className="relative">
              <FiSliders className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
              <select 
                className="w-full pl-10 pr-3 py-3 bg-gray-50/50 border border-gray-100 rounded-xl text-[10px] md:text-xs font-black uppercase outline-none appearance-none cursor-pointer text-gray-800 focus:border-[#87be00] transition-colors"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                <option value="">TODOS LOS ESTADOS</option>
               <option value="PENDING">PENDIENTE</option>
               <option value="IN_PROGRESS">EN CURSO</option>
               <option value="COMPLETED">COMPLETADO</option>
               <option value="HORAS_EXTRAS">HORAS EXTRAS</option>
               <option value="SALIDA_ANTICIPADA">SALIDA ANTICIPADA</option>
              </select>
            </div>
          </div>

          <button 
            onClick={handleApplyFilters} 
            className="w-full px-6 py-3 bg-[#87be00] hover:bg-[#76a600] text-white rounded-xl text-[10px] md:text-xs font-black uppercase shadow-sm active:scale-95 transition-all flex items-center justify-center gap-2 h-[42px]"
          >
            <FiCheck size={16} /> Aplicar Filtros
          </button>
        </div>

        {/* VISTA MÓVIL */}
        <div className="md:hidden space-y-4">
          {attendance.length === 0 && !loading ? (
             <p className="text-center text-xs text-gray-400 font-bold py-10 uppercase">No hay registros para los filtros seleccionados.</p>
          ) : attendance.map((row, idx) => {
            const statusInfo = getStatusBadge(row.exit_diff, row.status);
            const displayDate = row.visit_date || startDate; 
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

                <div className="bg-gray-50 p-4 rounded-2xl mb-3 space-y-2">
                    <div className="flex justify-between items-center border-b border-gray-200 pb-2">
                      <span className="text-[8px] font-black text-gray-400 uppercase">N° Visita:</span>
                      <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded-lg border border-blue-100 italic">{row.visit_number || 'S/N'}</span>
                    </div>
                    <div className="flex justify-between items-center pt-1">
                      <p className="text-[10px] font-black text-gray-800 uppercase italic truncate pr-2">{row.local_name}</p>
                      <div className="text-right shrink-0">
                        <p className="text-[10px] font-black text-gray-600 flex items-center gap-1 leading-none">
                            {row.plan_in || '--:--'} <FiArrowRight size={8} /> {row.plan_out || '--:--'}
                        </p>
                      </div>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-2 mb-3">
                  <div className="bg-white border border-gray-100 p-3 rounded-xl text-center">
                    <p className="text-[8px] font-black text-gray-400 uppercase mb-1">Entrada Real</p>
                    <span className={`text-xs font-black ${row.entry_delay > 10 ? 'text-red-500' : 'text-gray-900'}`}>{row.check_in || '--:--'}</span>
                  </div>
                  <div className="bg-white border border-gray-100 p-3 rounded-xl text-center">
                    <p className="text-[8px] font-black text-gray-400 uppercase mb-1">Salida Real</p>
                    <span className={`text-xs font-black ${row.check_out ? 'text-green-600' : 'text-gray-400'}`}>{row.check_out || '--:--'}</span>
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

        {/* VISTA DESKTOP */}
        <div className="hidden md:block bg-white rounded-[2.5rem] shadow-sm border border-gray-50 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-900 text-white text-center">
                  <th className="px-6 py-5 text-[9px] font-black uppercase tracking-widest italic text-left">Mercaderista</th>
                  <th className="px-4 py-5 text-[9px] font-black uppercase tracking-widest italic">N° Visita</th>
                  <th className="px-4 py-5 text-[9px] font-black uppercase tracking-widest italic">Local / Cod</th>
                  <th className="px-4 py-5 text-[9px] font-black uppercase tracking-widest italic">Fecha</th>
                  <th className="px-4 py-5 text-[9px] font-black uppercase tracking-widest italic">Ingreso Plan.</th>
                  <th className="px-4 py-5 text-[9px] font-black uppercase tracking-widest italic">Salida Plan.</th>
                  <th className="px-4 py-5 text-[9px] font-black uppercase tracking-widest italic">Entrada Real</th>
                  <th className="px-4 py-5 text-[9px] font-black uppercase tracking-widest italic">Salida Real</th>
                  <th className="px-4 py-5 text-[9px] font-black uppercase tracking-widest italic">Tiempo Trabajo</th>
                  <th className="px-6 py-5 text-[9px] font-black uppercase tracking-widest italic">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {attendance.length === 0 && !loading && (
                  <tr>
                    <td colSpan="10" className="px-6 py-10 text-center text-xs text-gray-400 font-bold uppercase">
                      No se encontraron registros para los criterios de búsqueda seleccionados.
                    </td>
                  </tr>
                )}
                {attendance.map((row, idx) => {
                  const statusInfo = getStatusBadge(row.exit_diff, row.status);
                  const displayDate = row.visit_date || row.date || startDate; 
                  return (
                    <motion.tr initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.05 }} key={row.id || idx} className="hover:bg-gray-50/50 transition-colors text-center">
                      <td className="px-6 py-5 text-left">
                        <div className="flex items-center gap-3">
                          <div className={`h-10 w-10 rounded-xl ${getAvatarStyles(row.entry_delay)} flex items-center justify-center text-[10px] font-black shadow-md shrink-0`}>
                            {row.first_name?.[0]}{row.last_name?.[0]}
                          </div>
                          <div>
                            <p className="text-xs font-black text-gray-900 leading-none uppercase">{row.first_name} {row.last_name}</p>
                            <p className="text-[9px] font-bold text-gray-400 uppercase mt-1 tracking-tighter">RUT: {row.worker_id}</p>
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-5">
                        <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-3 py-1 rounded-lg border border-blue-100 italic tracking-tighter">
                          {row.visit_number || 'S/N'}
                        </span>
                      </td>

                      <td className="px-4 py-5">
                        <p className="text-[10px] font-black text-gray-800 uppercase italic truncate max-w-[120px] mx-auto">{row.local_name}</p>
                        <p className="text-[9px] font-bold text-[#87be00] uppercase tracking-tighter">{row.local_code}</p>
                      </td>

                      <td className="px-4 py-5">
                        <span className="text-[10px] font-black text-gray-900 uppercase">
                          {formatDate(displayDate)}
                        </span>
                      </td>

                      <td className="px-4 py-5 text-xs font-black text-gray-400">{row.plan_in || '--:--'}</td>
                      <td className="px-4 py-5 text-xs font-black text-gray-400">{row.plan_out || '--:--'}</td>

                      <td className="px-4 py-5">
                        <span className={`text-xs font-black ${row.entry_delay > 10 ? 'text-red-500' : 'text-gray-900'}`}>{row.check_in || '--:--'}</span>
                      </td>

                      <td className="px-4 py-5">
                        <span className={`text-xs font-black ${row.check_out ? 'text-green-600' : 'text-gray-300'}`}>{row.check_out || '--:--'}</span>
                      </td>

                      <td className="px-4 py-5">
                        {row.total_work_time ? (
                          <div className="flex flex-col items-center">
                            <span className="text-xs font-black text-gray-900">{row.total_work_time} min</span>
                            <span className="text-[8px] font-bold text-gray-400 uppercase tracking-tighter italic leading-none">Efectivos</span>
                          </div>
                        ) : <span className="text-xs font-black text-gray-300 italic">--</span>}
                      </td>

                      <td className="px-6 py-5">
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

        {/* 🚩 NUEVO PANEL DE CONTROL DE PAGINACIÓN */}
        {totalPages > 1 && (
          <div className="flex justify-center items-center gap-3 pt-6">
            <button
              disabled={page === 1 || loading}
              onClick={() => setPage(prev => Math.max(prev - 1, 1))}
              className="px-4 py-2.5 bg-white border border-gray-100 rounded-xl text-[10px] md:text-xs font-black uppercase text-gray-500 hover:text-gray-900 shadow-sm disabled:opacity-40 disabled:hover:text-gray-500 active:scale-95 transition-all flex items-center gap-1"
            >
              <FiChevronLeft size={14} /> Anterior
            </button>
            
            <div className="bg-white px-4 py-2 rounded-xl border border-gray-100/70 shadow-sm text-[10px] md:text-xs font-black text-gray-600 tracking-wider uppercase">
              Página <span className="text-[#87be00] font-black">{page}</span> de {totalPages}
            </div>

            <button
              disabled={page === totalPages || loading}
              onClick={() => setPage(prev => Math.min(prev + 1, totalPages))}
              className="px-4 py-2.5 bg-white border border-gray-100 rounded-xl text-[10px] md:text-xs font-black uppercase text-gray-500 hover:text-gray-900 shadow-sm disabled:opacity-40 disabled:hover:text-gray-500 active:scale-95 transition-all flex items-center gap-1"
            >
              Siguiente <FiChevronRight size={14} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default AttendanceControl;