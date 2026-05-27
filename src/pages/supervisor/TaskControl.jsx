import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  FiClock, FiSearch, FiRefreshCw, FiCalendar, FiChevronDown,
  FiPackage, FiBarChart2, FiUser, FiMapPin, FiHash,
  FiFilter, FiX, FiAlertCircle, FiArrowRight, FiMessageSquare, FiBox, FiClipboard
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
   ESTILOS REUTILIZABLES
========================================================= */
const cardStyle = "bg-white rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.04)] border border-gray-50 overflow-hidden";
const inputStyle = "pl-11 pr-4 py-4 bg-gray-50 rounded-[1.5rem] border-none text-[11px] font-bold uppercase outline-none focus:ring-2 focus:ring-[#87be00]/20 transition-all shadow-inner";

const TaskControl = () => {
  const [groupedVisits, setGroupedVisits] = useState([]);
  const [rawTasks, setRawTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedRow, setExpandedRow] = useState(null);

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
      
      setRawTasks(list);

      const groups = {};
      list.forEach(task => {
        const visitId = task.visit_id || `${task.user_id}-${task.local_code}-${selectedDate}`;
        if (!groups[visitId]) {
          groups[visitId] = {
            id: visitId,
            visit_number: task.visit_number || "S/N",
            user_id: task.user_id,
            first_name: task.first_name,
            last_name: task.last_name,
            worker_rut: task.worker_rut,
            local_name: task.local_name,
            local_code: task.local_code,
            products: [],
            total_duration: 0,
            total_codes: 0,
            start_time: task.start_time,
            end_time: task.end_time
          };
        }
        groups[visitId].products.push(task);
        groups[visitId].total_duration += (task.duration_minutes || 0);
        groups[visitId].total_codes += (task.codes_count || 0);
        if (task.start_time && (!groups[visitId].start_time || new Date(task.start_time) < new Date(groups[visitId].start_time))) {
            groups[visitId].start_time = task.start_time;
        }
        if (task.end_time && (!groups[visitId].end_time || new Date(task.end_time) > new Date(groups[visitId].end_time))) {
            groups[visitId].end_time = task.end_time;
        }
      });

      setGroupedVisits(Object.values(groups));

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
      setExpandedRow(null); 
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  useEffect(() => {
    const t = setTimeout(fetchTasks, 400);
    return () => clearTimeout(t);
  }, [selectedDate, searchTerm, filterBrand, filterWorker]);

  const clearFilters = () => {
    setSearchTerm(""); setFilterBrand(""); setFilterWorker(""); setSelectedDate(getLocalISODate());
  };

  const totalVisits = groupedVisits.length;
  const avgTime = rawTasks.length ? Math.round(rawTasks.reduce((a, t) => a + (t.duration_minutes || 0), 0) / rawTasks.filter(t => t.duration_minutes).length || 0) : 0;
  const totalCodes = rawTasks.reduce((a, t) => a + (t.codes_count || 0), 0);

  return (
    <div className="space-y-8 font-[Outfit] pb-10">
      
      {/* HEADER */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 px-4 md:px-0">
        <div className="space-y-2">
          <h2 className="text-3xl md:text-4xl font-black text-gray-900 uppercase italic tracking-tighter leading-none">
            Control de <span className="text-[#87be00]">Visitas</span>
          </h2>
          <div className="flex items-center gap-2">
             <span className="bg-[#87be00] w-2 h-2 rounded-full animate-pulse" />
             <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Auditoría por Ruta • {selectedDate}</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-3 w-full lg:w-auto items-center">
          <div className="relative">
            <FiCalendar className="absolute left-4 top-1/2 -translate-y-1/2 text-[#87be00] z-10" size={14} />
            <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} className={inputStyle} />
          </div>
          <div className="relative flex-1 min-w-[200px]">
            <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 z-10" size={14} />
            <input type="text" placeholder="Buscar folio, local o rut..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className={`${inputStyle} w-full`} />
          </div>
          <button onClick={() => setShowFilters(p => !p)} className={`p-4 rounded-[1.2rem] shadow-lg transition-all ${showFilters ? 'bg-[#87be00] text-white' : 'bg-white text-gray-400 hover:text-[#87be00]'}`}><FiFilter size={18} /></button>
          <button onClick={fetchTasks} className="p-4 bg-white rounded-[1.2rem] text-gray-400 hover:text-[#87be00] shadow-lg transition-all"><FiRefreshCw size={18} className={loading ? "animate-spin" : ""} /></button>
        </div>
      </div>

      {/* FILTROS */}
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
              {(filterBrand || filterWorker || searchTerm) && (
                <button onClick={clearFilters} className="px-6 py-4 bg-red-50 text-red-500 rounded-[1.5rem] text-[10px] font-black uppercase flex items-center gap-2 hover:bg-red-100 transition-all"><FiX size={14} /> Limpiar</button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 px-4 md:px-0">
        {[
          { label: "Total Visitas", value: totalVisits, color: "text-[#87be00]", bg: "bg-[#87be00]/10", icon: FiMapPin },
          { label: "Promedio Gestión/Prod", value: formatMinutes(avgTime), color: "text-blue-500", bg: "bg-blue-50", icon: FiClock },
          { label: "EAN Escaneados", value: totalCodes, color: "text-purple-500", bg: "bg-purple-50", icon: FiHash },
          { label: "Total Prod. Revisados", value: rawTasks.length, color: "text-amber-500", bg: "bg-amber-50", icon: FiPackage },
        ].map((kpi, i) => (
          <motion.div key={i} whileHover={{ y: -5 }} className="bg-white rounded-[2rem] p-6 shadow-sm border border-gray-50 flex flex-col items-center text-center">
            <div className={`w-12 h-12 ${kpi.bg} ${kpi.color} rounded-2xl flex items-center justify-center mb-4`}><kpi.icon size={20} /></div>
            <p className="text-2xl font-black text-gray-900 leading-none">{loading ? "—" : kpi.value}</p>
            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mt-2">{kpi.label}</p>
          </motion.div>
        ))}
      </div>

      {/* ── TABLA DESKTOP ACTUALIZADA ── */}
      <div className="hidden md:block px-4 md:px-0">
        <div className={cardStyle}>
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-900 text-white text-center">
                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] italic text-left">Mercaderista</th>
                <th className="px-4 py-6 text-[10px] font-black uppercase tracking-[0.2em] italic w-[160px]">N° Visita</th>
                <th className="px-4 py-6 text-[10px] font-black uppercase tracking-[0.2em] italic">Punto de Venta</th>
                <th className="px-4 py-6 text-[10px] font-black uppercase tracking-[0.2em] italic">Tiempo Total</th>
                <th className="px-4 py-6 text-[10px] font-black uppercase tracking-[0.2em] italic">Productos Revisados</th>
                <th className="px-4 py-6 text-[10px] font-black uppercase tracking-[0.2em] italic">Detalle Visita</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {groupedVisits.map((visit, idx) => (
                <React.Fragment key={visit.id || idx}>
                  <motion.tr 
                    onClick={() => setExpandedRow(expandedRow === idx ? null : idx)}
                    className={`cursor-pointer transition-all text-center ${expandedRow === idx ? 'bg-gray-50' : 'hover:bg-gray-50/50'}`}
                  >
                    <td className="px-8 py-5 text-left">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-[#87be00] text-white rounded-2xl flex items-center justify-center text-xs font-black shadow-lg shadow-[#87be00]/20 shrink-0">
                          {visit.first_name?.[0]}{visit.last_name?.[0]}
                        </div>
                        <div>
                          <p className="text-[11px] font-black text-gray-900 uppercase leading-none mt-1">{visit.first_name} {visit.last_name}</p>
                          <p className="text-[9px] font-bold text-gray-400 mt-1 uppercase tracking-tighter">RUT: {visit.worker_rut}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-5">
                      <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-3 py-1 rounded-lg border border-blue-100 italic tracking-tighter">
                        {visit.visit_number}
                      </span>
                    </td>
                    <td className="px-4 py-5">
                      <p className="text-[10px] font-black text-gray-800 uppercase italic leading-none truncate max-w-[200px] mx-auto">{visit.local_name}</p>
                      <p className="text-[9px] font-black text-[#87be00] mt-1">{visit.local_code}</p>
                    </td>
                    <td className="px-4 py-5">
                      <div className="flex flex-col items-center">
                        <DurationBadge minutes={visit.total_duration} />
                        <div className="flex items-center gap-2 mt-2">
                            <span className="text-[9px] font-bold text-gray-400">{formatTime(visit.start_time)}</span>
                            <FiArrowRight size={8} className="text-gray-300" />
                            <span className="text-[9px] font-bold text-gray-400">{formatTime(visit.end_time)}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-5">
                      <span className="inline-flex items-center gap-2 bg-amber-50 text-amber-600 text-[11px] font-black px-4 py-2 rounded-xl">
                        <FiPackage size={14} /> {visit.products.length} Prod.
                      </span>
                    </td>
                    <td className="px-4 py-5">
                       <motion.div animate={{ rotate: expandedRow === idx ? 180 : 0 }} className="inline-block">
                         <button className={`p-3 rounded-2xl shadow-sm transition-all ${expandedRow === idx ? 'bg-black text-white' : 'bg-white border border-gray-200 text-gray-400 hover:text-black hover:border-black'}`}>
                           <FiChevronDown size={18} />
                         </button>
                       </motion.div>
                    </td>
                  </motion.tr>

                  <AnimatePresence>
                    {expandedRow === idx && (
                      <motion.tr initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}>
                        <td colSpan={6} className="bg-gray-900/5 px-10 py-6 overflow-hidden">
                           <div className="flex items-center gap-3 mb-6">
                             <div className="h-px bg-gray-300 flex-1" />
                             <span className="text-[9px] font-black uppercase tracking-[0.3em] text-gray-400">Productos gestionados en esta visita</span>
                             <div className="h-px bg-gray-300 flex-1" />
                           </div>
                           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                              {visit.products.map((productTask, pIdx) => (
                                 <div key={pIdx} className="bg-white p-5 rounded-[2rem] shadow-sm border border-gray-100 hover:shadow-md transition-all">
                                    <div className="flex justify-between items-start mb-3">
                                        <div>
                                            <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">{productTask.brand_name || "--"}</p>
                                            <p className="text-[11px] font-black text-gray-900 uppercase italic leading-tight mt-1 truncate max-w-[150px]">{productTask.product_name || "--"}</p>
                                        </div>
                                        <div className="bg-[#87be00]/10 text-[#87be00] text-[9px] font-black px-2 py-1 rounded-lg flex items-center gap-1"><FiClock size={10} /> {formatMinutes(productTask.duration_minutes)}</div>
                                    </div>
                                    
                                    <div className="mt-4 pt-3 border-t border-dashed border-gray-100">
                                        <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-2">Códigos EAN ({productTask.product_codes?.length || 0})</p>
                                        <div className="flex flex-wrap gap-1.5 max-h-[100px] overflow-y-auto pr-1">
                                            {productTask.product_codes && productTask.product_codes.length > 0 ? (
                                                productTask.product_codes.map((code, cIdx) => (
                                                    <span key={cIdx} className="text-[9px] font-mono bg-purple-50 text-purple-700 px-2 py-0.5 rounded-md border border-purple-100 italic">
                                                        {code}
                                                    </span>
                                                ))
                                            ) : (
                                                <span className="text-[9px] text-gray-300 italic">Sin códigos</span>
                                            )}
                                        </div>
                                    </div>

                                    {productTask.comment && (
                                        <div className="bg-gray-50 p-3 rounded-xl mt-3">
                                            <FiMessageSquare className="text-blue-400 mb-1" size={12}/>
                                            <p className="text-[9px] font-bold text-gray-600 italic">"{productTask.comment}"</p>
                                        </div>
                                    )}
                                 </div>
                              ))}
                           </div>
                        </td>
                      </motion.tr>
                    )}
                  </AnimatePresence>
                </React.Fragment>
              ))}
            </tbody>
          </table>
          {!loading && groupedVisits.length === 0 && (
            <div className="py-16 text-center"><FiAlertCircle className="mx-auto text-gray-200 mb-3" size={32} /><p className="text-[11px] font-black text-gray-300 uppercase tracking-widest">Sin visitas para este filtro</p></div>
          )}
        </div>
      </div>

      {/* VISTA MÓVIL */}
      <div className="md:hidden space-y-4 px-4">
        {groupedVisits.map((visit, idx) => (
          <VisitMobileCard key={visit.id || idx} visit={visit} />
        ))}
      </div>
    </div>
  );
};

/* COMPONENTES AUXILIARES */
const DurationBadge = ({ minutes }) => {
  const color = minutes <= 15 ? "bg-[#87be00]/10 text-[#87be00]" : "bg-amber-50 text-amber-600";
  return (
    <span className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-tighter ${color} flex items-center gap-2 justify-center`}>
      <FiClock size={12} /> {formatMinutes(minutes)}
    </span>
  );
};

const VisitMobileCard = ({ visit }) => {
  const [open, setOpen] = useState(false);
  return (
    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white rounded-[2rem] shadow-lg border border-gray-100 overflow-hidden">
      <div onClick={() => setOpen(!open)} className="p-5 cursor-pointer bg-white">
        <div className="flex justify-between items-start mb-4">
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 bg-gray-900 text-white rounded-2xl flex items-center justify-center text-xs font-black italic shadow-lg">{visit.first_name?.[0]}{visit.last_name?.[0]}</div>
             <div>
                <p className="text-[11px] font-black text-gray-900 uppercase leading-none">{visit.first_name} {visit.last_name}</p>
                <p className="text-[9px] font-bold text-gray-400 mt-1 uppercase tracking-tighter">{visit.local_name}</p>
             </div>
          </div>
          <DurationBadge minutes={visit.total_duration} />
        </div>
        <div className="flex items-center justify-between bg-gray-50 rounded-2xl p-4 border border-gray-100">
             <div className="flex items-center gap-3">
                 <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center"><FiClipboard size={14}/></div>
                 <div className="flex flex-col">
                     <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest">N° Visita</span>
                     <span className="text-[10px] font-black text-blue-600 italic">{visit.visit_number}</span>
                 </div>
             </div>
             <div className="flex items-center gap-3">
                <p className="text-[12px] font-black text-gray-900">{visit.products.length} <span className="text-[8px] text-gray-400 uppercase">Prod.</span></p>
                <FiChevronDown size={18} className={`text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
             </div>
        </div>
      </div>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} className="bg-gray-50 border-t border-gray-100 p-4 space-y-3">
             {visit.products.map((prod, i) => (
                 <div key={i} className="bg-white p-4 rounded-[1.5rem] shadow-sm border border-gray-100">
                     <div className="flex justify-between items-start mb-2">
                         <div>
                             <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">{prod.brand_name || "--"}</p>
                             <p className="text-[10px] font-black text-gray-800 uppercase italic truncate max-w-[200px] leading-tight">{prod.product_name || "--"}</p>
                         </div>
                         <span className="text-[9px] font-black text-[#87be00] bg-[#87be00]/10 px-2 py-1 rounded-lg">{formatMinutes(prod.duration_minutes)}</span>
                     </div>
                     
                     <div className="mt-3 pt-3 border-t border-dashed border-gray-100">
                        <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-2">EANs Escaneados</p>
                        <div className="flex flex-wrap gap-1.5">
                            {prod.product_codes && prod.product_codes.length > 0 ? (
                                prod.product_codes.map((code, cIdx) => (
                                    <span key={cIdx} className="text-[9px] font-outfit bg-purple-50 text-purple-600 px-2 py-0.5 rounded border border-purple-100">
                                        {code}
                                    </span>
                                ))
                            ) : (
                                <span className="text-[9px] text-gray-300 italic">Sin códigos</span>
                            )}
                        </div>
                    </div>
                 </div>
             ))}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default TaskControl;