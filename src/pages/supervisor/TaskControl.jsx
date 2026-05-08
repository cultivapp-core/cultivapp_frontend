import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  FiClock, FiSearch, FiRefreshCw, FiCalendar, FiChevronDown,
  FiPackage, FiBarChart2, FiUser, FiMapPin, FiHash,
  FiFilter, FiX, FiCheckCircle, FiAlertCircle, FiArrowRight, FiMessageSquare
} from "react-icons/fi";
import api from "../../api/apiClient";

/* =========================================================
   UTILITIES
========================================================= */
const getLocalISODate = () => {
  const tzOffset = (new Date()).getTimezoneOffset() * 60000;
  return new Date(Date.now() - tzOffset).toISOString().split('T')[0];
};

const formatMinutes = (min) => {
  if (min === null || min === undefined) return "--";
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
};

const formatTime = (iso) => {
  if (!iso) return "--:--";
  return new Date(iso).toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" });
};

/* =========================================================
   ESTILOS REUTILIZABLES ( ADN CULTIVAPP )
========================================================= */
const cardStyle = "bg-white rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.04)] border border-gray-50 overflow-hidden";
const inputStyle = "pl-11 pr-4 py-4 bg-gray-50 rounded-[1.5rem] border-none text-[11px] font-bold uppercase outline-none focus:ring-2 focus:ring-[#87be00]/20 transition-all shadow-inner";

const TaskControl = () => {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedRow, setExpandedRow] = useState(null);

  // Filtros
  const [selectedDate, setSelectedDate] = useState(getLocalISODate());
  const [searchTerm, setSearchTerm] = useState("");
  const [filterBrand, setFilterBrand] = useState("");
  const [filterWorker, setFilterWorker] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  const [workers, setWorkers] = useState([]);
  const [brands, setBrands] = useState([]);

  const fetchTasks = async () => {
    try {
      setLoading(true);
      const params = {
        date: selectedDate,
        ...(searchTerm.length > 1 && { search: searchTerm }),
        ...(filterBrand && { brand_id: filterBrand }),
        ...(filterWorker && { user_id: filterWorker }),
      };
      const data = await api.get("/routes/tasks-report", params);
      const list = Array.isArray(data) ? data : (data?.data || []);
      setTasks(list);

      const uniqueWorkers = [];
      const seenW = new Set();
      const uniqueBrands = [];
      const seenB = new Set();
      list.forEach(t => {
        if (!seenW.has(t.user_id)) { seenW.add(t.user_id); uniqueWorkers.push({ id: t.user_id, name: `${t.first_name} ${t.last_name}` }); }
        if (t.brand_id && !seenB.has(t.brand_id)) { seenB.add(t.brand_id); uniqueBrands.push({ id: t.brand_id, name: t.brand_name }); }
      });
      setWorkers(uniqueWorkers);
      setBrands(uniqueBrands);
    } catch (err) {
      console.error("Error cargando tareas:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const t = setTimeout(fetchTasks, 400);
    return () => clearTimeout(t);
  }, [selectedDate, searchTerm, filterBrand, filterWorker]);

  const clearFilters = () => {
    setSearchTerm("");
    setFilterBrand("");
    setFilterWorker("");
    setSelectedDate(getLocalISODate());
  };

  const activeFilters = [filterBrand, filterWorker, searchTerm].filter(Boolean).length;

  // KPIs
  const totalTasks = tasks.length;
  const avgTime = tasks.length
    ? Math.round(tasks.reduce((a, t) => a + (t.duration_minutes || 0), 0) / tasks.filter(t => t.duration_minutes).length || 0)
    : 0;
  const totalCodes = tasks.reduce((a, t) => a + (t.codes_count || 0), 0);
  const uniqueProducts = new Set(tasks.map(t => t.product_id).filter(Boolean)).size;

  return (
    <div className="space-y-8 font-[Outfit] pb-10">

      {/* ── HEADER ── */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 px-4 md:px-0">
        <div className="space-y-2">
          <h2 className="text-3xl md:text-4xl font-black text-gray-900 uppercase italic tracking-tighter leading-none">
            Control de <span className="text-[#87be00]">Tareas</span>
          </h2>
          <div className="flex items-center gap-2">
             <span className="bg-[#87be00] w-2 h-2 rounded-full animate-pulse" />
             <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
               Auditoría de Gestión • {selectedDate}
             </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-3 w-full lg:w-auto items-center">
          <div className="relative">
            <FiCalendar className="absolute left-4 top-1/2 -translate-y-1/2 text-[#87be00] z-10" size={14} />
            <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} className={inputStyle} />
          </div>

          <div className="relative flex-1 min-w-[200px]">
            <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 z-10" size={14} />
            <input type="text" placeholder="Buscar mercaderista o local..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className={`${inputStyle} w-full`} />
          </div>

          <button onClick={() => setShowFilters(p => !p)} className={`p-4 rounded-[1.2rem] shadow-lg transition-all ${showFilters ? 'bg-[#87be00] text-white' : 'bg-white text-gray-400 hover:text-[#87be00]'}`}>
            <FiFilter size={18} />
          </button>

          <button onClick={fetchTasks} className="p-4 bg-white rounded-[1.2rem] text-gray-400 hover:text-[#87be00] shadow-lg transition-all">
            <FiRefreshCw size={18} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {/* ── FILTROS AVANZADOS ── */}
      <AnimatePresence>
        {showFilters && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
            <div className="bg-white rounded-[2rem] p-6 flex flex-wrap gap-4 items-center shadow-xl mx-4 md:mx-0 border border-gray-50">
              <select value={filterWorker} onChange={e => setFilterWorker(e.target.value)} className="flex-1 min-w-[200px] px-6 py-4 bg-gray-50 rounded-[1.5rem] text-[10px] font-black uppercase outline-none border-none shadow-inner">
                <option value="">Colaborador...</option>
                {workers.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
              </select>

              <select value={filterBrand} onChange={e => setFilterBrand(e.target.value)} className="flex-1 min-w-[200px] px-6 py-4 bg-gray-50 rounded-[1.5rem] text-[10px] font-black uppercase outline-none border-none shadow-inner">
                <option value="">Marca...</option>
                {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>

              {activeFilters > 0 && (
                <button onClick={clearFilters} className="px-6 py-4 bg-red-50 text-red-500 rounded-[1.5rem] text-[10px] font-black uppercase flex items-center gap-2 hover:bg-red-100 transition-all">
                  <FiX size={14} /> Limpiar
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── KPIs ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 px-4 md:px-0">
        {[
          { label: "Total Tareas", value: totalTasks, color: "text-[#87be00]", bg: "bg-[#87be00]/10", icon: FiBarChart2 },
          { label: "Promedio Gestión", value: formatMinutes(avgTime), color: "text-blue-500", bg: "bg-blue-50", icon: FiClock },
          { label: "EAN Escaneados", value: totalCodes, color: "text-purple-500", bg: "bg-purple-50", icon: FiHash },
          { label: "Mix Productos", value: uniqueProducts, color: "text-amber-500", bg: "bg-amber-50", icon: FiPackage },
        ].map((kpi, i) => (
          <motion.div key={i} whileHover={{ y: -5 }} className="bg-white rounded-[2rem] p-6 shadow-sm border border-gray-50 flex flex-col items-center text-center">
            <div className={`w-12 h-12 ${kpi.bg} ${kpi.color} rounded-2xl flex items-center justify-center mb-4`}>
              <kpi.icon size={20} />
            </div>
            <p className="text-2xl font-black text-gray-900 leading-none">{loading ? "—" : kpi.value}</p>
            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mt-2">{kpi.label}</p>
          </motion.div>
        ))}
      </div>

      {/* ── TABLA DESKTOP ── */}
      <div className="hidden md:block px-4 md:px-0">
        <div className={cardStyle}>
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-900 text-white">
                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] italic">Mercaderista</th>
                <th className="px-4 py-6 text-[10px] font-black uppercase tracking-[0.2em] italic">Punto de Venta</th>
                <th className="px-4 py-6 text-[10px] font-black uppercase tracking-[0.2em] italic text-center">Producto</th>
                <th className="px-4 py-6 text-[10px] font-black uppercase tracking-[0.2em] italic text-center">Tiempos</th>
                <th className="px-4 py-6 text-[10px] font-black uppercase tracking-[0.2em] italic text-center">Gestión</th>
                <th className="px-4 py-6 text-[10px] font-black uppercase tracking-[0.2em] italic text-center">Códigos EAN</th>
                <th className="px-4 py-6 text-[10px] font-black uppercase tracking-[0.2em] italic text-center">Observación</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {tasks.map((task, idx) => (
                <React.Fragment key={task.id || idx}>
                  <motion.tr 
                    onClick={() => setExpandedRow(expandedRow === idx ? null : idx)}
                    className="hover:bg-gray-50/50 cursor-pointer transition-all"
                  >
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-[#87be00] text-white rounded-2xl flex items-center justify-center text-xs font-black shadow-lg shadow-[#87be00]/20">
                          {task.first_name?.[0]}{task.last_name?.[0]}
                        </div>
                        <div>
                          <p className="text-[11px] font-black text-gray-900 uppercase leading-none">{task.first_name} {task.last_name}</p>
                          <p className="text-[9px] font-bold text-gray-400 mt-1 uppercase tracking-tighter">{task.worker_rut}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-5">
                      <p className="text-[10px] font-black text-gray-800 uppercase italic leading-none truncate max-w-[150px]">{task.local_name}</p>
                      <p className="text-[9px] font-black text-[#87be00] mt-1">{task.local_code}</p>
                    </td>
                    <td className="px-4 py-5 text-center">
                      <p className="text-[9px] font-bold text-gray-400 uppercase tracking-tighter">{task.brand_name || "--"}</p>
                      <p className="text-[10px] font-black text-gray-800 uppercase italic truncate max-w-[150px]">{task.product_name || "--"}</p>
                    </td>
                    <td className="px-4 py-5 text-center">
                      <div className="flex flex-col items-center">
                        <span className="text-[11px] font-black text-gray-700">{formatTime(task.start_time)}</span>
                        <FiArrowRight size={10} className="text-gray-300 my-0.5" />
                        <span className="text-[11px] font-black text-gray-400">{formatTime(task.end_time)}</span>
                      </div>
                    </td>
                    <td className="px-4 py-5 text-center">
                       <DurationBadge minutes={task.duration_minutes} />
                    </td>
                    <td className="px-4 py-5 text-center">
                      <span className="inline-flex items-center gap-1 bg-purple-50 text-purple-600 text-[10px] font-black px-3 py-1 rounded-lg">
                        <FiHash size={10} /> {task.codes_count || 0}
                      </span>
                    </td>
                    <td className="px-4 py-5 text-center">
                       <motion.div animate={{ rotate: expandedRow === idx ? 180 : 0 }} className="inline-block">
                         <button className={`p-2 rounded-full ${task.comment ? 'bg-blue-50 text-blue-500' : 'text-gray-300'}`}>
                           <FiChevronDown size={16} />
                         </button>
                       </motion.div>
                    </td>
                  </motion.tr>

                  {/* ── EXPANDIDO (SOLO EAN Y COMENTARIO) ── */}
                  <AnimatePresence>
                    {expandedRow === idx && (
                      <motion.tr initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}>
                        <td colSpan={7} className="bg-gray-50/30 px-10 py-6">
                           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              {/* EAN */}
                              <div className="bg-white p-5 rounded-[2rem] shadow-sm border border-gray-100">
                                <h4 className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                                  <FiHash className="text-purple-500"/> EAN Registrados
                                </h4>
                                {task.product_codes && task.product_codes.length > 0 ? (
                                  <div className="flex flex-wrap gap-2">
                                    {task.product_codes.map((c, i) => (
                                      <span key={i} className="px-3 py-1.5 bg-purple-50 text-purple-600 rounded-xl text-[10px] font-black border border-purple-100">{c}</span>
                                    ))}
                                  </div>
                                ) : (
                                  <p className="text-[10px] font-bold text-gray-400 italic">No se registraron códigos.</p>
                                )}
                              </div>
                              
                              {/* Comentarios */}
                              <div className="bg-white p-5 rounded-[2rem] shadow-sm border border-gray-100">
                                <h4 className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                                  <FiMessageSquare className="text-blue-500"/> Observaciones
                                </h4>
                                <p className="text-[11px] font-bold text-gray-600 leading-relaxed italic">
                                  {task.comment ? `"${task.comment}"` : 'Sin observaciones registradas por el mercaderista.'}
                                </p>
                              </div>
                           </div>
                        </td>
                      </motion.tr>
                    )}
                  </AnimatePresence>
                </React.Fragment>
              ))}
            </tbody>
          </table>
          
          {!loading && tasks.length === 0 && (
            <div className="py-16 text-center">
              <FiAlertCircle className="mx-auto text-gray-200 mb-3" size={32} />
              <p className="text-[11px] font-black text-gray-300 uppercase tracking-widest">Sin tareas para este filtro</p>
            </div>
          )}
        </div>
      </div>

      {/* ── MOBILE (Tarjetas redondeadas) ── */}
      <div className="md:hidden space-y-4 px-4">
        {tasks.map((task, idx) => (
          <TaskCard key={task.id || idx} task={task} idx={idx} />
        ))}
        {!loading && tasks.length === 0 && (
          <div className="py-16 text-center bg-white rounded-[2rem] border border-gray-100 shadow-sm">
            <FiAlertCircle className="mx-auto text-gray-200 mb-3" size={32} />
            <p className="text-[11px] font-black text-gray-300 uppercase tracking-widest">Sin resultados</p>
          </div>
        )}
      </div>

    </div>
  );
};

/* ── COMPONENTES AUXILIARES ── */
const DurationBadge = ({ minutes }) => {
  const color = minutes <= 10 ? "bg-[#87be00]/10 text-[#87be00]" : "bg-amber-50 text-amber-600";
  return (
    <span className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-tighter ${color} flex items-center gap-2 justify-center`}>
      <FiClock size={12} /> {formatMinutes(minutes)}
    </span>
  );
};

const TaskCard = ({ task, idx }) => {
  const [open, setOpen] = useState(false);
  return (
    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white rounded-[2rem] shadow-lg p-5 border border-gray-100">
      <div onClick={() => setOpen(!open)} className="space-y-4 cursor-pointer">
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 bg-gray-900 text-white rounded-2xl flex items-center justify-center text-xs font-black italic">
               {task.first_name?.[0]}{task.last_name?.[0]}
             </div>
             <div>
                <p className="text-[11px] font-black text-gray-900 uppercase">{task.first_name} {task.last_name}</p>
                <p className="text-[9px] font-black text-[#87be00] uppercase">{task.local_code}</p>
             </div>
          </div>
          <DurationBadge minutes={task.duration_minutes} />
        </div>
        <div className="bg-gray-50 rounded-2xl p-4 flex justify-between items-center">
           <div>
             <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1">{task.brand_name}</p>
             <p className="text-[10px] font-black text-gray-800 uppercase italic truncate max-w-[180px]">{task.product_name}</p>
           </div>
           <div className="text-right">
             <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1">EAN</p>
             <span className="text-[11px] font-black text-purple-600">{task.codes_count || 0}</span>
           </div>
        </div>
      </div>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} className="mt-4 pt-4 border-t border-dashed border-gray-200 space-y-4">
             {task.product_codes?.length > 0 && (
               <div className="bg-purple-50 p-3 rounded-xl border border-purple-100">
                  <p className="text-[8px] font-black text-purple-400 uppercase mb-2">Códigos EAN</p>
                  <div className="flex flex-wrap gap-1.5">
                    {task.product_codes.map((c, i) => (
                      <span key={i} className="text-[9px] font-black bg-white px-2 py-1 rounded-lg text-purple-600 shadow-sm">{c}</span>
                    ))}
                  </div>
               </div>
             )}
             {task.comment && (
               <div className="bg-blue-50 p-3 rounded-xl border border-blue-100">
                  <p className="text-[8px] font-black text-blue-400 uppercase mb-1">Observación</p>
                  <p className="text-[10px] font-bold text-blue-800 italic">"{task.comment}"</p>
               </div>
             )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default TaskControl;