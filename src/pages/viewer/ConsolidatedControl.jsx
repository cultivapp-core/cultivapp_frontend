import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  FiClock, FiSearch, FiRefreshCw, FiCalendar, FiChevronDown,
  FiPackage, FiUser, FiMapPin, FiHash,
  FiFilter, FiX, FiAlertCircle, FiArrowRight, FiMessageSquare, FiClipboard, FiCheckCircle, FiImage 
} from "react-icons/fi";
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell 
} from "recharts";
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

const formatDate = (dateString) => {
  if (!dateString) return '--/--/--';
  const [y, m, d] = dateString.split('T')[0].split('-');
  return `${d}-${m}-${y}`;
};

/* =========================================================
   ESTILOS REUTILIZABLES
========================================================= */
const cardStyle = "bg-white rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.04)] border border-gray-50 overflow-hidden";
const inputStyle = "pl-11 pr-4 py-4 bg-gray-50 rounded-[1.5rem] border-none text-[11px] font-bold uppercase outline-none focus:ring-2 focus:ring-[#87be00]/20 transition-all shadow-inner";

/* =========================================================
   HELPER: extrae array desde cualquier forma de respuesta
========================================================= */
const extractRows = (response) => {
  if (!response) return [];
  if (Array.isArray(response.rows)) return response.rows;
  if (Array.isArray(response.data)) return response.data;
  if (Array.isArray(response)) return response;
  return [];
};

const ConsolidatedControl = () => {
  const [activeTab, setActiveTab] = useState("attendance");

  // Estado Asistencia
  const [attendance, setAttendance] = useState([]);
  const [loadingAttendance, setLoadingAttendance] = useState(true);
  
  // Estado Tareas
  const [groupedVisits, setGroupedVisits] = useState([]);
  const [rawTasks, setRawTasks] = useState([]);
  const [loadingTasks, setLoadingTasks] = useState(true);
  const [expandedRow, setExpandedRow] = useState(null);

  // ✅ Filtros globales: startDate / endDate (rango) — ambos endpoints lo soportan
  const [startDate, setStartDate] = useState(getLocalISODate());
  const [endDate, setEndDate] = useState(getLocalISODate());
  const [searchTerm, setSearchTerm] = useState("");
  const [filterBrand, setFilterBrand] = useState("");
  const [filterWorker, setFilterWorker] = useState("");
  const [filterRegion, setFilterRegion] = useState("");
  const [filterLocal, setFilterLocal] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  const [workers, setWorkers] = useState([]);
  const [brands, setBrands] = useState([]);

  // --- DERIVACIÓN DE OPCIONES PARA FILTROS ---
  const regions = useMemo(() => [...new Set(attendance.map(a => a.region_name).filter(Boolean))].sort(), [attendance]);
  const locals = useMemo(() => {
    const fromAttendance = attendance.map(a => a.local_name);
    const fromTasks = rawTasks.map(t => t.local_name);
    return [...new Set([...fromAttendance, ...fromTasks].filter(Boolean))].sort();
  }, [attendance, rawTasks]);

  // ✅ FIX: colaboradores derivados de asistencia (puede venir como user_id o worker_id)
  const attendanceWorkers = useMemo(() => {
    const seen = new Set();
    const list = [];
    attendance.forEach(a => {
      const id = a.user_id ?? a.worker_id;
      if (id != null && !seen.has(id)) {
        seen.add(id);
        list.push({ id, name: `${a.first_name || ""} ${a.last_name || ""}`.trim() });
      }
    });
    return list;
  }, [attendance]);

  // ✅ Combina colaboradores de asistencia + tareas, sin duplicados
  const allWorkers = useMemo(() => {
    const combined = [...attendanceWorkers, ...workers];
    return Array.from(new Map(combined.map(w => [String(w.id), w])).values())
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [attendanceWorkers, workers]);

  // --- 1. FETCH ASISTENCIA (ahora por rango startDate/endDate) ---
  const fetchAttendance = async () => {
    try {
      setLoadingAttendance(true);
      const params = searchTerm.length > 2 
        ? { search: searchTerm } 
        : { startDate, endDate };

      const response = await api.get("/routes/attendance-report", params);
      console.log("🌐 RESPONSE CRUDO (primera fila):", response?.rows?.[0]);
      const data = extractRows(response);
      console.log("📦 DESPUÉS DE extractRows (primera fila):", data[0]);
      setAttendance(data);
    } catch (error) {
      console.error("❌ Error cargando asistencia:", error);
      setAttendance([]);
    } finally {
      setLoadingAttendance(false);
    }
  };

  // --- 2. FETCH TAREAS/VISITAS (ahora también soporta rango startDate/endDate) ---
  const fetchTasks = async () => {
    try {
      setLoadingTasks(true);
      const params = {
        startDate,
        endDate,
        ...(searchTerm.length > 1 && { search: searchTerm })
      };
      const response = await api.get("/routes/tasks-report", params);
      const list = extractRows(response);
      
      setRawTasks(list);

      const groups = {};
      list.forEach(task => {
        const visitId = task.visit_id || `${task.user_id}-${task.local_code}-${startDate}`;
        if (!groups[visitId]) {
          groups[visitId] = {
            id: visitId,
            visit_date: task.visit_date,
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
      
      // Combinar trabajadores de asistencia y tareas para el filtro general
      setWorkers(prev => {
         const combined = [...prev, ...uniqueWorkers];
         return Array.from(new Map(combined.map(item => [item.id, item])).values());
      });
      setBrands(uniqueBrands);
      setExpandedRow(null); 
    } catch (err) {
      console.error("❌ Error cargando tareas:", err);
      setRawTasks([]);
      setGroupedVisits([]);
    } finally {
      setLoadingTasks(false);
    }
  };

  // ✅ Ahora el effect depende del rango completo (startDate, endDate) + searchTerm
  useEffect(() => {
    const delayDebounce = setTimeout(() => { 
      fetchAttendance();
      fetchTasks();
    }, 400); 
    return () => clearTimeout(delayDebounce);
  }, [startDate, endDate, searchTerm]);

  // --- FILTRADO LOCAL (CLIENT-SIDE) ---
  const filteredAttendance = useMemo(() => {
    return attendance.filter(item => {
      const itemWorkerId = item.user_id ?? item.worker_id;
      const matchWorker = !filterWorker || String(itemWorkerId) === String(filterWorker);
      const matchRegion = !filterRegion || item.region_name === filterRegion;
      const matchLocal = !filterLocal || item.local_name === filterLocal;
      return matchWorker && matchRegion && matchLocal;
    })
    .sort((a, b) => {
        // Obtenemos la fecha válida de cada fila
        const dateA = new Date(a.visit_date || a.created_at || '1900-01-01');
        const dateB = new Date(b.visit_date || b.created_at || '1900-01-01');
        return dateB - dateA;
      });
  }, [attendance, filterWorker, filterRegion, filterLocal]);

  const filteredGroupedVisits = useMemo(() => {
    return groupedVisits.filter(visit => {
      const matchWorker = !filterWorker || String(visit.user_id) === String(filterWorker);
      const matchLocal = !filterLocal || visit.local_name === filterLocal;
      const matchBrand = !filterBrand || visit.products.some(p => String(p.brand_id) === String(filterBrand));
      return matchWorker && matchLocal && matchBrand;
    });
  }, [groupedVisits, filterWorker, filterLocal, filterBrand]);

  const clearFilters = () => {
    setSearchTerm("");
    setFilterBrand("");
    setFilterWorker("");
    setFilterRegion("");
    setFilterLocal("");
    setStartDate(getLocalISODate());
    setEndDate(getLocalISODate());
  };

  // --- ANALÍTICA GRÁFICA ---
  const STATUS_COLORS = {
    "FINALIZADO": "#3b82f6",         // azul
    "EN CURSO": "#000000",           // negro
    "PENDIENTE": "#ef4444",          // Rojo 
    "SALIDA ANTICIPADA": "#87be00",  // Verde
    "HORAS EXTRA": "#8b5cf6"         // Violeta
  };

  const attendanceChartData = useMemo(() => {
    const counts = {
      "FINALIZADO":        0,
      "EN CURSO":          0,
      "PENDIENTE":         0,
      "SALIDA ANTICIPADA": 0,
      "HORAS EXTRA":       0,
    };

    filteredAttendance.forEach(row => {
      const status = (row.status || "").toUpperCase().trim();

      if (status === "IN_PROGRESS") {
        counts["EN CURSO"]++;
      } else if (status === "PENDING") {
        counts["PENDIENTE"]++;
      } else if (status === "COMPLETED") {
        const rawDiff = row.exit_diff;
        if (rawDiff === null || rawDiff === undefined || rawDiff === "") {
          counts["FINALIZADO"]++;
        } else {
          const diff = parseFloat(String(rawDiff).replace(",", "."));
          if (isNaN(diff)) {
            counts["FINALIZADO"]++;
          } else if (diff < -5) {
            counts["SALIDA ANTICIPADA"]++;
          } else if (diff > 5) {
            counts["HORAS EXTRA"]++;
          } else {
            counts["FINALIZADO"]++;
          }
        }
      } else {
        counts["PENDIENTE"]++;
      }
    });

    return Object.keys(counts)
      .filter(name => counts[name] > 0)
      .map(name => ({ name, value: counts[name] }));
  }, [filteredAttendance]);

  const tasksChartData = useMemo(() => {
    const brandEans = filteredGroupedVisits.reduce((acc, visit) => {
      visit.products.forEach(t => {
         const brand = t.brand_name || "Sin Marca";
         acc[brand] = (acc[brand] || 0) + (t.codes_count || 0);
      });
      return acc;
    }, {});
    
    return Object.keys(brandEans)
        .map(name => ({ name, eans: brandEans[name] }))
        .filter(b => b.eans > 0)
        .slice(0, 8);
  }, [filteredGroupedVisits]);

  const getAvatarStyles = (delay) => {
    if (delay === null || delay === undefined) return 'bg-gray-900 text-white';
    const d = parseFloat(String(delay).replace(",", "."));
    if (isNaN(d) || d <= 0) return 'bg-[#87be00] text-white';
    if (d <= 10) return 'bg-amber-400 text-gray-900';
    return 'bg-red-500 text-white';
  };

  const getStatusBadge = (exitDiff, status) => {
    const s = (status || "").toUpperCase().trim();

    if (s === "IN_PROGRESS") {
      return { label: 'EN CURSO',  style: 'bg-blue-50 text-blue-600 border-blue-100' };
    }
    if (s !== "COMPLETED") {
      return { label: 'PENDIENTE', style: 'bg-amber-50 text-amber-600 border-amber-100' };
    }

    if (exitDiff === null || exitDiff === undefined || exitDiff === "") {
      return { label: 'FINALIZADO', style: 'bg-green-50 text-green-600 border-green-100' };
    }
    const diff = parseFloat(String(exitDiff).replace(",", "."));
    if (isNaN(diff))  return { label: 'FINALIZADO',        style: 'bg-green-50 text-green-600 border-green-100' };
    if (diff < -5)    return { label: 'SALIDA ANTICIPADA', style: 'bg-red-50 text-red-600 border-red-100' };
    if (diff > 5)     return { label: 'HORAS EXTRA',       style: 'bg-indigo-50 text-indigo-600 border-indigo-100' };
    return              { label: 'FINALIZADO',              style: 'bg-green-50 text-green-600 border-green-100' };
  };

  return (
    <div className="space-y-8 font-[Outfit] pb-10">
      
      {/* HEADER PRINCIPAL */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 px-4 md:px-0 pt-16 md:pt-0">
        <div className="space-y-2">
          <h2 className="text-3xl md:text-4xl font-black text-gray-900 uppercase italic tracking-tighter leading-none">
            Consolidado de <span className="text-[#87be00]">Operaciones</span>
          </h2>
          <div className="flex items-center gap-2">
             <span className="bg-[#87be00] w-2 h-2 rounded-full animate-pulse" />
             <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
               Asistencia y Auditoría de Ruta • {formatDate(startDate)} {startDate !== endDate ? `→ ${formatDate(endDate)}` : ''}
             </p>
          </div>
        </div>

        {/* CONTROLES DE FILTRADO Y BÚSQUEDA */}
        <div className="flex flex-wrap gap-3 w-full lg:w-auto items-center">

          {/* ✅ FILTRO DE RANGO DE FECHAS: DESDE */}
          <div className="relative">
            <FiCalendar className="absolute left-4 top-1/2 -translate-y-1/2 text-[#87be00] z-10" size={14} />
            <input
              type="date"
              value={startDate}
              max={endDate}
              onChange={e => {
                const newStart = e.target.value;
                setStartDate(newStart);
                if (newStart > endDate) setEndDate(newStart);
              }}
              className={inputStyle}
              title="Desde"
            />
          </div>

          {/* ✅ FILTRO DE RANGO DE FECHAS: HASTA */}
          <div className="relative">
            <FiCalendar className="absolute left-4 top-1/2 -translate-y-1/2 text-[#87be00] z-10" size={14} />
            <input
              type="date"
              value={endDate}
              min={startDate}
              onChange={e => setEndDate(e.target.value)}
              className={inputStyle}
              title="Hasta"
            />
          </div>

          <div className="relative flex-1 min-w-[200px]">
            <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 z-10" size={14} />
            <input type="text" placeholder="Buscar folio, local o mercaderista..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className={`${inputStyle} w-full`} />
          </div>
          <button onClick={() => setShowFilters(p => !p)} className={`p-4 rounded-[1.2rem] shadow-lg transition-all ${showFilters ? 'bg-[#87be00] text-white' : 'bg-white text-gray-400 hover:text-[#87be00]'}`}><FiFilter size={18} /></button>
          <button onClick={() => { fetchAttendance(); fetchTasks(); }} className="p-4 bg-white rounded-[1.2rem] text-gray-400 hover:text-[#87be00] shadow-lg transition-all"><FiRefreshCw size={18} className={loadingAttendance || loadingTasks ? "animate-spin" : ""} /></button>
        </div>
      </div>

      {/* FILTROS DESPLEGABLES MULTIPLES */}
      <AnimatePresence>
        {showFilters && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
            <div className="bg-white rounded-[2rem] p-6 flex flex-wrap gap-4 items-center shadow-xl mx-4 md:mx-0 border border-gray-50">
              
              <select value={filterWorker} onChange={e => setFilterWorker(e.target.value)} className="flex-1 min-w-[140px] px-4 py-3 bg-gray-50 rounded-[1.5rem] text-[10px] font-black uppercase outline-none shadow-inner text-gray-700">
                <option value="">Colaborador...</option>
                {allWorkers.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
              </select>

              <select value={filterRegion} onChange={e => setFilterRegion(e.target.value)} className="flex-1 min-w-[140px] px-4 py-3 bg-gray-50 rounded-[1.5rem] text-[10px] font-black uppercase outline-none shadow-inner text-gray-700">
                <option value="">Región...</option>
                {regions.map(r => <option key={r} value={r}>{r}</option>)}
              </select>

              <select value={filterLocal} onChange={e => setFilterLocal(e.target.value)} className="flex-1 min-w-[140px] px-4 py-3 bg-gray-50 rounded-[1.5rem] text-[10px] font-black uppercase outline-none shadow-inner text-gray-700">
                <option value="">Local...</option>
                {locals.map(l => <option key={l} value={l}>{l}</option>)}
              </select>

              <select value={filterBrand} onChange={e => setFilterBrand(e.target.value)} className="flex-1 min-w-[140px] px-4 py-3 bg-gray-50 rounded-[1.5rem] text-[10px] font-black uppercase outline-none shadow-inner text-gray-700">
                <option value="">Marca...</option>
                {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>

              {(filterBrand || filterWorker || filterRegion || filterLocal || searchTerm) && (
                <button onClick={clearFilters} className="px-6 py-3 bg-red-50 text-red-500 rounded-[1.5rem] text-[10px] font-black uppercase flex items-center justify-center gap-2 hover:bg-red-100 transition-all min-w-[120px]">
                  <FiX size={14} /> Limpiar
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── GRÁFICOS ANALÍTICOS (DASHBOARD) ── */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 px-4 md:px-0">
        
        {/* Gráfico 1: Distribución de Jornada */}
        <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-50 flex flex-col justify-between h-[360px]">
          <div>
            <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">Estado de Asistencia / Jornadas</h3>
            <p className="text-[8px] font-black text-[#87be00] uppercase tracking-[0.2em] italic mb-6">Desglose de cumplimiento de marcajes diarios</p>
          </div>

          {filteredAttendance.length > 0 && (
            <div className="flex justify-center gap-6 mb-4 flex-wrap">
              {attendanceChartData.map((item) => (
                <div key={item.name} className="flex flex-col items-center">
                  <span className="text-xl font-black" style={{ color: STATUS_COLORS[item.name] || "#999999" }}>{item.value}</span>
                  <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest">{item.name}</span>
                </div>
              ))}
            </div>
          )}

          <div className="w-full h-48 flex items-center justify-center">
            {loadingAttendance ? (
              <p className="text-[9px] font-black text-gray-300 uppercase tracking-widest animate-pulse">Cargando...</p>
            ) : attendanceChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={attendanceChartData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={75}
                    paddingAngle={4}
                    label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                    labelLine={false}
                    labelStyle={{ fontSize: '8px', fontWeight: 900, fontFamily: 'Outfit' }}
                  >
                    {attendanceChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={STATUS_COLORS[entry.name] || "#cccccc"} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ borderRadius: '25px', border: 'none', fontFamily: 'Outfit', fontSize: '11px' }}
                    formatter={(value, name) => [`${value} trabajador${value !== 1 ? 'es' : ''}`, name]}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center">
                <FiAlertCircle className="mx-auto text-gray-300 mb-2" size={24} />
                <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Sin registros de asistencia para este rango</p>
              </div>
            )}
          </div>
        </div>

        {/* Gráfico 2: Tareas / EANs escaneados por marca */}
        <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-50 flex flex-col justify-between h-[360px]">
          <div>
            <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">Volumen de EANs validados por Marca</h3>
            <p className="text-[8px] font-black text-[#87be00] uppercase tracking-[0.2em] italic mb-6">Eficiencia de auditoría en sala</p>
          </div>
          <div className="w-full h-56 flex items-center justify-center">
             {loadingTasks ? (
               <p className="text-[9px] font-black text-gray-300 uppercase tracking-widest animate-pulse">Cargando...</p>
             ) : tasksChartData.length > 0 ? (
               <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={tasksChartData}>
                     <XAxis dataKey="name" fontSize={8} fontWeight={900} tickLine={false} axisLine={false} tick={{ fill: '#6b7280' }} />
                     <YAxis hide />
                     <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ borderRadius: '25px', border: 'none', fontFamily: 'Outfit', fontSize: '11px' }} />
                     <Bar dataKey="eans" fill="#87be00" radius={[10, 10, 10, 10]} barSize={28} />
                  </BarChart>
               </ResponsiveContainer>
             ) : (
               <div className="text-center">
                 <FiImage className="mx-auto text-gray-300 mb-2" size={24} />
                 <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Sin tareas o EANs escaneados para esta fecha</p>
               </div>
             )}
          </div>
        </div>
      </div>

      {/* ── SELECTOR DE TABS PARA MÓDULOS OPERATIVOS ── */}
      <div className="px-4 md:px-0">
        <div className="flex bg-gray-100 p-2 rounded-[2rem] gap-2 max-w-md">
           <button onClick={() => setActiveTab("attendance")} className={`flex-1 py-4 text-[10px] font-black uppercase tracking-widest rounded-[1.5rem] transition-all ${activeTab === 'attendance' ? 'bg-white text-gray-900 shadow-md' : 'text-gray-500 hover:text-gray-800'}`}>Control Jornada</button>
           <button onClick={() => setActiveTab("tasks")} className={`flex-1 py-4 text-[10px] font-black uppercase tracking-widest rounded-[1.5rem] transition-all ${activeTab === 'tasks' ? 'bg-white text-gray-900 shadow-md' : 'text-gray-500 hover:text-gray-800'}`}>Control Visitas</button>
        </div>
      </div>

      {/* ================= MODULO 1: TABLA DE ASISTENCIA ================= */}
      {activeTab === "attendance" && (
         <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="px-4 md:px-0">
           <div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-50 overflow-hidden">
             <div className="overflow-x-auto">
               <table className="w-full text-left border-collapse min-w-[1000px]">
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
                   {loadingAttendance ? (
                     <tr><td colSpan={10} className="text-center py-10 text-[10px] font-black text-gray-400 uppercase tracking-widest animate-pulse">Cargando registros...</td></tr>
                   ) : filteredAttendance.length === 0 ? (
                     <tr>
                       <td colSpan={10} className="text-center py-16">
                         <FiAlertCircle className="mx-auto text-gray-200 mb-3" size={28} />
                         <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest">Sin asistencias registradas para esta búsqueda</p>
                       </td>
                     </tr>
                   ) : (
                     filteredAttendance.map((row, idx) => {
                       const statusInfo = getStatusBadge(row.exit_diff, row.status);
                       const displayDate = row.visit_date || row.created_at;
                       console.log("📅 Fila:", row.visit_number, "| effective_date:", row.effective_date, "| visit_date:", row.visit_date, "| displayDate final:", displayDate);
                       return (
                         <motion.tr
                           initial={{ opacity: 0, y: 5 }}
                           animate={{ opacity: 1, y: 0 }}
                           transition={{ delay: idx * 0.04 }}
                           key={row.id || idx}
                           className="hover:bg-gray-50/50 transition-colors text-center"
                         >
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
                             <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-3 py-1 rounded-lg border border-blue-100 italic tracking-tighter">{row.visit_number || 'S/N'}</span>
                           </td>
                           <td className="px-4 py-5">
                             <p className="text-[10px] font-black text-gray-800 uppercase italic truncate max-w-[120px] mx-auto">{row.local_name}</p>
                             <p className="text-[9px] font-bold text-[#87be00] uppercase tracking-tighter">{row.local_code}</p>
                           </td>
                           <td className="px-4 py-5"><span className="text-[10px] font-black text-gray-900 uppercase">{formatDate(displayDate)}</span></td>
                           <td className="px-4 py-5 text-xs font-black text-gray-400">{row.plan_in || '--:--'}</td>
                           <td className="px-4 py-5 text-xs font-black text-gray-400">{row.plan_out || '--:--'}</td>
                           <td className="px-4 py-5">
                             <span className={`text-xs font-black ${row.entry_delay > 10 ? 'text-red-500' : 'text-gray-900'}`}>
                               {row.check_in || '--:--'}
                             </span>
                           </td>
                           <td className="px-4 py-5">
                             <span className={`text-xs font-black ${row.check_out ? 'text-green-600' : 'text-gray-300'}`}>
                               {row.check_out || '--:--'}
                             </span>
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
                             <span className={`text-[9px] font-black px-3 py-1.5 rounded-md italic border ${statusInfo.style}`}>{statusInfo.label}</span>
                           </td>
                         </motion.tr>
                       );
                     })
                   )}
                 </tbody>
               </table>
             </div>

             {/* Pie de tabla con total */}
             {!loadingAttendance && filteredAttendance.length > 0 && (
               <div className="px-8 py-4 border-t border-gray-50 flex items-center justify-between">
                 <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">
                   Total: <span className="text-gray-900">{filteredAttendance.length}</span> registro{filteredAttendance.length !== 1 ? 's' : ''}
                 </p>
                 <div className="flex gap-3">
                   {attendanceChartData.map((item) => (
                     <span key={item.name} className="text-[8px] font-black uppercase tracking-widest flex items-center gap-1" style={{ color: STATUS_COLORS[item.name] || "#999999" }}>
                       <span className="w-2 h-2 rounded-full inline-block" style={{ background: STATUS_COLORS[item.name] || "#999999" }} />
                       {item.value} {item.name}
                     </span>
                   ))}
                 </div>
               </div>
             )}
           </div>
         </motion.div>
      )}

      {/* ================= MODULO 2: TABLA DE TAREAS/VISITAS ================= */}
      {activeTab === "tasks" && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="px-4 md:px-0">
          <div className={cardStyle}>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[1000px]">
                <thead>
                  <tr className="bg-gray-900 text-white text-center">
                    <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] italic text-left">Mercaderista</th>
                    <th className="px-4 py-6 text-[10px] font-black uppercase tracking-[0.2em] italic w-[160px]">N° Visita</th>
                    <th className="px-4 py-6 text-[10px] font-black uppercase tracking-[0.2em] italic">Fecha</th>
                    <th className="px-4 py-6 text-[10px] font-black uppercase tracking-[0.2em] italic">Punto de Venta</th>
                    <th className="px-4 py-6 text-[10px] font-black uppercase tracking-[0.2em] italic">Tiempo Total</th>
                    <th className="px-4 py-6 text-[10px] font-black uppercase tracking-[0.2em] italic">Productos Revisados</th>
                    <th className="px-4 py-6 text-[10px] font-black uppercase tracking-[0.2em] italic">Detalle</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {loadingTasks ? (
                    <tr><td colSpan={6} className="text-center py-10 text-[10px] font-black text-gray-400 uppercase tracking-widest animate-pulse">Cargando rutas...</td></tr>
                  ) : filteredGroupedVisits.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-16">
                        <FiAlertCircle className="mx-auto text-gray-200 mb-3" size={28} />
                        <p className="text-[11px] font-black text-gray-300 uppercase tracking-widest">Sin visitas para esta búsqueda</p>
                      </td>
                    </tr>
                  ) : filteredGroupedVisits.map((visit, idx) => (
                    
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
                          <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-3 py-1 rounded-lg border border-blue-100 italic tracking-tighter">{visit.visit_number}</span>
                        </td>
                        <td className="px-4 py-5">
                          <p className="text-[10px] font-black text-gray-800 uppercase italic leading-none truncate max-w-[200px] mx-auto">{visit.visit_date ? formatDate(visit.visit_date) : "Sin fecha"}</p>
                        </td>
                        <td className="px-4 py-5">
                          <p className="text-[10px] font-black text-gray-800 uppercase italic leading-none truncate max-w-[200px] mx-auto">{visit.local_name}</p>
                          <p className="text-[9px] font-black text-[#87be00] mt-1">{visit.local_code}</p>
                        </td>
                        <td className="px-4 py-5">
                          <div className="flex flex-col items-center">
                            <span className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-tighter flex items-center gap-2 justify-center ${visit.total_duration <= 15 ? "bg-[#87be00]/10 text-[#87be00]" : "bg-amber-50 text-amber-600"}`}>
                              <FiClock size={12} /> {formatMinutes(visit.total_duration)}
                            </span>
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
                          <motion.tr initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
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
                                                        <span key={cIdx} className="text-[9px] font-mono bg-purple-50 text-purple-700 px-2 py-0.5 rounded-md border border-purple-100 italic">{code}</span>
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
            </div>
          </div>
        </motion.div>
      )}

    </div>
  );
};

export default ConsolidatedControl;