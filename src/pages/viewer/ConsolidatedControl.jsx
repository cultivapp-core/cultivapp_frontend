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
const cardStyle = "overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm";
const inputStyle = "h-12 w-full rounded-xl border border-slate-200 bg-slate-50 pl-11 pr-4 text-[11px] font-bold text-slate-700 outline-none transition focus:border-[#87be00]/60 focus:bg-white focus:ring-4 focus:ring-[#87be00]/10";

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
            visit_date: task.visit_date || task.start_time,
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
    "FINALIZADO": "#2563eb",
    "EN CURSO": "#87be00",
    "PENDIENTE": "#ef4444",
    "SALIDA ANTICIPADA": "#f59e0b",
    "HORAS EXTRA": "#8b5cf6"
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
    if (delay === null || delay === undefined) return 'bg-slate-900 text-white';
    const d = parseFloat(String(delay).replace(",", "."));
    if (isNaN(d) || d <= 0) return 'bg-[#87be00] text-white';
    if (d <= 10) return 'bg-amber-400 text-slate-900';
    return 'bg-red-500 text-white';
  };

  const getStatusBadge = (exitDiff, status) => {
    const s = (status || "").toUpperCase().trim();

    if (s === "IN_PROGRESS") {
      return { label: 'EN CURSO', style: 'border-[#87be00]/20 bg-[#87be00]/10 text-[#87be00]' };
    }
    if (s !== "COMPLETED") {
      return { label: 'PENDIENTE', style: 'border-red-100 bg-red-50 text-red-500' };
    }

    if (exitDiff === null || exitDiff === undefined || exitDiff === "") {
      return { label: 'FINALIZADO', style: 'border-blue-100 bg-blue-50 text-blue-600' };
    }
    const diff = parseFloat(String(exitDiff).replace(",", "."));
    if (isNaN(diff)) return { label: 'FINALIZADO', style: 'border-blue-100 bg-blue-50 text-blue-600' };
    if (diff < -5) return { label: 'SALIDA ANTICIPADA', style: 'border-amber-100 bg-amber-50 text-amber-600' };
    if (diff > 5) return { label: 'HORAS EXTRA', style: 'border-violet-100 bg-violet-50 text-violet-600' };
    return { label: 'FINALIZADO', style: 'border-blue-100 bg-blue-50 text-blue-600' };
  };

  return (
    <div className="min-h-full bg-slate-50/70 px-4 pb-10 pt-20 font-[Outfit] sm:px-6 sm:pt-8 lg:px-8">
      <div className="mx-auto flex max-w-[1600px] flex-col gap-6">
        {/* ENCABEZADO */}
        <header className="flex flex-col gap-5 border-b border-slate-200/80 pb-6 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex min-w-0 items-center gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#87be00]/10 text-[#87be00]">
              <FiClipboard size={22} />
            </div>

            <div className="min-w-0">
              <h1 className="text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
                Consolidado de operaciones
              </h1>

              <p className="mt-1.5 text-[10px] font-black uppercase tracking-[0.24em] text-[#87be00]">
                Asistencia y auditoría de ruta
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
              <span className="h-2.5 w-2.5 rounded-full bg-[#87be00]" />

              <span className="text-[9px] font-black uppercase tracking-wider text-slate-500">
                {formatDate(startDate)}
                {startDate !== endDate
                  ? ` — ${formatDate(endDate)}`
                  : ""}
              </span>
            </div>

            <button
              type="button"
              onClick={() => {
                fetchAttendance();
                fetchTasks();
              }}
              disabled={loadingAttendance || loadingTasks}
              className="flex h-12 items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 text-[9px] font-black uppercase tracking-wider text-white shadow-lg transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <FiRefreshCw
                size={14}
                className={
                  loadingAttendance || loadingTasks
                    ? "animate-spin"
                    : ""
                }
              />
              Actualizar
            </button>
          </div>
        </header>

        {/* CONTROLES PRINCIPALES */}
        <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[180px_180px_minmax(240px,1fr)_auto]">
            <label className="flex flex-col gap-1.5">
              <span className="pl-1 text-[9px] font-black uppercase tracking-wider text-slate-400">
                Desde
              </span>

              <div className="relative">
                <FiCalendar
                  className="absolute left-4 top-1/2 z-10 -translate-y-1/2 text-[#87be00]"
                  size={14}
                />

                <input
                  type="date"
                  value={startDate}
                  max={endDate}
                  onChange={(event) => {
                    const newStart = event.target.value;
                    setStartDate(newStart);

                    if (newStart > endDate) {
                      setEndDate(newStart);
                    }
                  }}
                  className={inputStyle}
                />
              </div>
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="pl-1 text-[9px] font-black uppercase tracking-wider text-slate-400">
                Hasta
              </span>

              <div className="relative">
                <FiCalendar
                  className="absolute left-4 top-1/2 z-10 -translate-y-1/2 text-[#87be00]"
                  size={14}
                />

                <input
                  type="date"
                  value={endDate}
                  min={startDate}
                  onChange={(event) => setEndDate(event.target.value)}
                  className={inputStyle}
                />
              </div>
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="pl-1 text-[9px] font-black uppercase tracking-wider text-slate-400">
                Búsqueda
              </span>

              <div className="relative">
                <FiSearch
                  className="absolute left-4 top-1/2 z-10 -translate-y-1/2 text-slate-400"
                  size={14}
                />

                <input
                  type="text"
                  placeholder="Buscar folio, local o mercaderista..."
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  className={inputStyle}
                />
              </div>
            </label>

            <button
              type="button"
              onClick={() => setShowFilters((current) => !current)}
              className={`mt-auto flex h-12 items-center justify-center gap-2 rounded-xl border px-4 text-[9px] font-black uppercase tracking-wider transition ${
                showFilters
                  ? "border-[#87be00] bg-[#87be00] text-white shadow-lg shadow-[#87be00]/20"
                  : "border-slate-200 bg-white text-slate-500 hover:border-[#87be00]/40 hover:text-[#87be00]"
              }`}
            >
              <FiFilter size={15} />
              Más filtros
            </button>
          </div>
        </section>

        {/* FILTROS AVANZADOS */}
        <AnimatePresence>
          {showFilters && (
            <motion.section
              initial={{ opacity: 0, y: -12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm"
            >
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
                <select
                  value={filterWorker}
                  onChange={(event) => setFilterWorker(event.target.value)}
                  className="h-12 rounded-xl border border-slate-200 bg-slate-50 px-4 text-[10px] font-black uppercase text-slate-700 outline-none transition focus:border-[#87be00]/60 focus:bg-white focus:ring-4 focus:ring-[#87be00]/10"
                >
                  <option value="">Todos los colaboradores</option>
                  {allWorkers.map((worker) => (
                    <option key={worker.id} value={worker.id}>
                      {worker.name}
                    </option>
                  ))}
                </select>

                <select
                  value={filterRegion}
                  onChange={(event) => setFilterRegion(event.target.value)}
                  className="h-12 rounded-xl border border-slate-200 bg-slate-50 px-4 text-[10px] font-black uppercase text-slate-700 outline-none transition focus:border-[#87be00]/60 focus:bg-white focus:ring-4 focus:ring-[#87be00]/10"
                >
                  <option value="">Todas las regiones</option>
                  {regions.map((region) => (
                    <option key={region} value={region}>
                      {region}
                    </option>
                  ))}
                </select>

                <select
                  value={filterLocal}
                  onChange={(event) => setFilterLocal(event.target.value)}
                  className="h-12 rounded-xl border border-slate-200 bg-slate-50 px-4 text-[10px] font-black uppercase text-slate-700 outline-none transition focus:border-[#87be00]/60 focus:bg-white focus:ring-4 focus:ring-[#87be00]/10"
                >
                  <option value="">Todos los locales</option>
                  {locals.map((local) => (
                    <option key={local} value={local}>
                      {local}
                    </option>
                  ))}
                </select>

                <select
                  value={filterBrand}
                  onChange={(event) => setFilterBrand(event.target.value)}
                  className="h-12 rounded-xl border border-slate-200 bg-slate-50 px-4 text-[10px] font-black uppercase text-slate-700 outline-none transition focus:border-[#87be00]/60 focus:bg-white focus:ring-4 focus:ring-[#87be00]/10"
                >
                  <option value="">Todas las marcas</option>
                  {brands.map((brand) => (
                    <option key={brand.id} value={brand.id}>
                      {brand.name}
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  onClick={clearFilters}
                  className="flex h-12 items-center justify-center gap-2 rounded-xl border border-red-100 bg-red-50 px-4 text-[9px] font-black uppercase tracking-wider text-red-500 transition hover:bg-red-100"
                >
                  <FiX size={14} />
                  Limpiar filtros
                </button>
              </div>
            </motion.section>
          )}
        </AnimatePresence>

        {/* GRÁFICOS */}
        <section className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <article className="flex min-h-[360px] flex-col rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex flex-col gap-4 border-b border-slate-100 pb-5 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-[#87be00]">
                  Cumplimiento diario
                </p>

                <h2 className="mt-1 text-base font-black tracking-tight text-slate-900">
                  Estado de asistencia y jornadas
                </h2>
              </div>

              <span className="rounded-xl bg-slate-100 px-3 py-2 text-[9px] font-black uppercase tracking-wider text-slate-500">
                {filteredAttendance.length} registros
              </span>
            </div>

            {attendanceChartData.length > 0 && (
              <div className="mt-5 flex flex-wrap items-center justify-center gap-5">
                {attendanceChartData.map((item) => (
                  <div key={item.name} className="text-center">
                    <strong
                      className="block text-xl font-black"
                      style={{
                        color:
                          STATUS_COLORS[item.name] || "#94a3b8",
                      }}
                    >
                      {item.value}
                    </strong>

                    <span className="mt-1 block text-[8px] font-black uppercase tracking-wider text-slate-400">
                      {item.name}
                    </span>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-4 flex min-h-[220px] flex-1 items-center justify-center">
              {loadingAttendance ? (
                <div className="h-12 w-12 animate-spin rounded-full border-4 border-slate-100 border-t-[#87be00]" />
              ) : attendanceChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie
                      data={attendanceChartData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={52}
                      outerRadius={82}
                      paddingAngle={4}
                      label={({ name, percent }) =>
                        `${name} (${(percent * 100).toFixed(0)}%)`
                      }
                      labelLine={false}
                    >
                      {attendanceChartData.map((entry, index) => (
                        <Cell
                          key={`attendance-${index}`}
                          fill={
                            STATUS_COLORS[entry.name] || "#cbd5e1"
                          }
                        />
                      ))}
                    </Pie>

                    <Tooltip
                      contentStyle={{
                        borderRadius: "16px",
                        border: "1px solid #e2e8f0",
                        fontFamily: "Outfit",
                        fontSize: "11px",
                      }}
                      formatter={(value, name) => [
                        `${value} trabajador${value !== 1 ? "es" : ""}`,
                        name,
                      ]}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex flex-col items-center gap-3 text-center">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-300">
                    <FiAlertCircle size={26} />
                  </div>

                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                    Sin registros de asistencia
                  </p>
                </div>
              )}
            </div>
          </article>

          <article className="flex min-h-[360px] flex-col rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex items-start justify-between border-b border-slate-100 pb-5">
              <div>
                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-[#87be00]">
                  Auditoría en sala
                </p>

                <h2 className="mt-1 text-base font-black tracking-tight text-slate-900">
                  EAN validados por marca
                </h2>
              </div>

              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#87be00]/10 text-[#87be00]">
                <FiPackage size={18} />
              </div>
            </div>

            <div className="mt-5 flex min-h-[245px] flex-1 items-center justify-center">
              {loadingTasks ? (
                <div className="h-12 w-12 animate-spin rounded-full border-4 border-slate-100 border-t-[#87be00]" />
              ) : tasksChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={245}>
                  <BarChart data={tasksChartData}>
                    <XAxis
                      dataKey="name"
                      fontSize={9}
                      fontWeight={800}
                      tickLine={false}
                      axisLine={false}
                      tick={{ fill: "#64748b" }}
                    />
                    <YAxis hide />
                    <Tooltip
                      cursor={{ fill: "transparent" }}
                      contentStyle={{
                        borderRadius: "16px",
                        border: "1px solid #e2e8f0",
                        fontFamily: "Outfit",
                        fontSize: "11px",
                      }}
                    />
                    <Bar
                      dataKey="eans"
                      fill="#87be00"
                      radius={[8, 8, 0, 0]}
                      barSize={30}
                    />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex flex-col items-center gap-3 text-center">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-300">
                    <FiImage size={26} />
                  </div>

                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                    Sin tareas o EAN escaneados
                  </p>
                </div>
              )}
            </div>
          </article>
        </section>

        {/* SELECTOR DE MÓDULO */}
        <section className="flex w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-1.5 shadow-sm">
          <button
            type="button"
            onClick={() => setActiveTab("attendance")}
            className={`flex-1 rounded-xl px-4 py-3 text-[9px] font-black uppercase tracking-wider transition ${
              activeTab === "attendance"
                ? "bg-slate-900 text-white shadow-lg"
                : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
            }`}
          >
            Control de jornada
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("tasks")}
            className={`flex-1 rounded-xl px-4 py-3 text-[9px] font-black uppercase tracking-wider transition ${
              activeTab === "tasks"
                ? "bg-slate-900 text-white shadow-lg"
                : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
            }`}
          >
            Control de visitas
          </button>
        </section>

        {/* TABLA DE ASISTENCIA */}
        {activeTab === "attendance" && (
          <motion.section
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className={cardStyle}
          >
            <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-[#87be00]">
                  Control operativo
                </p>

                <h2 className="mt-1 text-base font-black tracking-tight text-slate-900">
                  Registros de jornada
                </h2>
              </div>

              <span className="rounded-xl bg-slate-100 px-3 py-2 text-[9px] font-black uppercase tracking-wider text-slate-500">
                {filteredAttendance.length} registros
              </span>
            </div>

            <div className="custom-scrollbar overflow-x-auto">
              <table className="w-full min-w-[1180px] border-collapse text-left">
                <thead className="bg-slate-900 text-white">
                  <tr>
                    {[
                      "Mercaderista",
                      "N.º visita",
                      "Local / código",
                      "Fecha",
                      "Ingreso plan.",
                      "Salida plan.",
                      "Entrada real",
                      "Salida real",
                      "Tiempo trabajo",
                      "Estado",
                    ].map((header, index) => (
                      <th
                        key={header}
                        className={`px-5 py-4 text-[9px] font-black uppercase tracking-wider ${
                          index === 0 ? "text-left" : "text-center"
                        }`}
                      >
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {loadingAttendance ? (
                    <tr>
                      <td colSpan={10} className="py-14 text-center">
                        <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-slate-100 border-t-[#87be00]" />
                      </td>
                    </tr>
                  ) : filteredAttendance.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="py-16 text-center">
                        <FiAlertCircle
                          className="mx-auto mb-3 text-slate-300"
                          size={28}
                        />

                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                          Sin asistencias para los filtros seleccionados
                        </p>
                      </td>
                    </tr>
                  ) : (
                    filteredAttendance.map((row, index) => {
                      const statusInfo = getStatusBadge(
                        row.exit_diff,
                        row.status,
                      );

                      const displayDate =
                        row.visit_date || row.created_at;

                      return (
                        <motion.tr
                          initial={{ opacity: 0, y: 5 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{
                            delay: Math.min(index * 0.025, 0.3),
                          }}
                          key={row.id || index}
                          className="transition hover:bg-slate-50/80"
                        >
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-3">
                              <div
                                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-[10px] font-black shadow-sm ${getAvatarStyles(
                                  row.entry_delay,
                                )}`}
                              >
                                {row.first_name?.[0]}
                                {row.last_name?.[0]}
                              </div>

                              <div className="min-w-0">
                                <p className="truncate text-[11px] font-black text-slate-900">
                                  {row.first_name} {row.last_name}
                                </p>

                                <p className="mt-1 text-[9px] font-bold text-slate-400">
                                  RUT: {row.worker_id || "S/N"}
                                </p>
                              </div>
                            </div>
                          </td>

                          <td className="px-5 py-4 text-center">
                            <span className="rounded-lg border border-blue-100 bg-blue-50 px-2.5 py-1 text-[9px] font-black text-blue-600">
                              {row.visit_number || "S/N"}
                            </span>
                          </td>

                          <td className="px-5 py-4 text-center">
                            <p className="mx-auto max-w-[150px] truncate text-[10px] font-black text-slate-800">
                              {row.local_name || "Sin local"}
                            </p>

                            <p className="mt-1 text-[9px] font-black text-[#87be00]">
                              {row.local_code || "S/N"}
                            </p>
                          </td>

                          <td className="px-5 py-4 text-center text-[10px] font-black text-slate-700">
                            {formatDate(displayDate)}
                          </td>

                          <td className="px-5 py-4 text-center text-[11px] font-black text-slate-500">
                            {row.plan_in || "--:--"}
                          </td>

                          <td className="px-5 py-4 text-center text-[11px] font-black text-slate-500">
                            {row.plan_out || "--:--"}
                          </td>

                          <td className="px-5 py-4 text-center">
                            <span
                              className={`text-[11px] font-black ${
                                Number(row.entry_delay) > 10
                                  ? "text-red-500"
                                  : "text-slate-900"
                              }`}
                            >
                              {row.check_in || "--:--"}
                            </span>
                          </td>

                          <td className="px-5 py-4 text-center">
                            <span
                              className={`text-[11px] font-black ${
                                row.check_out
                                  ? "text-blue-600"
                                  : "text-slate-300"
                              }`}
                            >
                              {row.check_out || "--:--"}
                            </span>
                          </td>

                          <td className="px-5 py-4 text-center">
                            {row.total_work_time ? (
                              <div>
                                <p className="text-[11px] font-black text-slate-900">
                                  {row.total_work_time} min
                                </p>

                                <p className="mt-1 text-[8px] font-bold uppercase tracking-wider text-slate-400">
                                  Efectivos
                                </p>
                              </div>
                            ) : (
                              <span className="text-slate-300">--</span>
                            )}
                          </td>

                          <td className="px-5 py-4 text-center">
                            <span
                              className={`inline-flex rounded-lg border px-2.5 py-1 text-[8px] font-black uppercase tracking-wider ${statusInfo.style}`}
                            >
                              {statusInfo.label}
                            </span>
                          </td>
                        </motion.tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {!loadingAttendance && filteredAttendance.length > 0 && (
              <div className="flex flex-col gap-3 border-t border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-[9px] font-black uppercase tracking-wider text-slate-400">
                  Total:{" "}
                  <span className="text-slate-900">
                    {filteredAttendance.length}
                  </span>{" "}
                  registro
                  {filteredAttendance.length !== 1 ? "s" : ""}
                </p>

                <div className="flex flex-wrap gap-3">
                  {attendanceChartData.map((item) => (
                    <span
                      key={item.name}
                      className="flex items-center gap-1.5 text-[8px] font-black uppercase tracking-wider"
                      style={{
                        color:
                          STATUS_COLORS[item.name] || "#64748b",
                      }}
                    >
                      <span
                        className="h-2 w-2 rounded-full"
                        style={{
                          backgroundColor:
                            STATUS_COLORS[item.name] ||
                            "#64748b",
                        }}
                      />

                      {item.value} {item.name}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </motion.section>
        )}

        {/* TABLA DE VISITAS */}
        {activeTab === "tasks" && (
          <motion.section
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className={cardStyle}
          >
            <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-[#87be00]">
                  Control operativo
                </p>

                <h2 className="mt-1 text-base font-black tracking-tight text-slate-900">
                  Visitas y productos gestionados
                </h2>
              </div>

              <span className="rounded-xl bg-slate-100 px-3 py-2 text-[9px] font-black uppercase tracking-wider text-slate-500">
                {filteredGroupedVisits.length} visitas
              </span>
            </div>

            <div className="custom-scrollbar overflow-x-auto">
              <table className="w-full min-w-[1120px] border-collapse text-left">
                <thead className="bg-slate-900 text-white">
                  <tr>
                    {[
                      "Mercaderista",
                      "N.º visita",
                      "Fecha",
                      "Punto de venta",
                      "Tiempo total",
                      "Productos revisados",
                      "Detalle",
                    ].map((header, index) => (
                      <th
                        key={header}
                        className={`px-5 py-4 text-[9px] font-black uppercase tracking-wider ${
                          index === 0 ? "text-left" : "text-center"
                        }`}
                      >
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {loadingTasks ? (
                    <tr>
                      <td colSpan={7} className="py-14 text-center">
                        <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-slate-100 border-t-[#87be00]" />
                      </td>
                    </tr>
                  ) : filteredGroupedVisits.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-16 text-center">
                        <FiAlertCircle
                          className="mx-auto mb-3 text-slate-300"
                          size={28}
                        />

                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                          Sin visitas para los filtros seleccionados
                        </p>
                      </td>
                    </tr>
                  ) : (
                    filteredGroupedVisits.map((visit, index) => (
                      <React.Fragment key={visit.id || index}>
                        <motion.tr
                          onClick={() =>
                            setExpandedRow(
                              expandedRow === index ? null : index,
                            )
                          }
                          className={`cursor-pointer transition ${
                            expandedRow === index
                              ? "bg-[#87be00]/5"
                              : "hover:bg-slate-50/80"
                          }`}
                        >
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-3">
                              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#87be00] text-[10px] font-black text-white shadow-sm">
                                {visit.first_name?.[0]}
                                {visit.last_name?.[0]}
                              </div>

                              <div className="min-w-0">
                                <p className="truncate text-[11px] font-black text-slate-900">
                                  {visit.first_name} {visit.last_name}
                                </p>

                                <p className="mt-1 text-[9px] font-bold text-slate-400">
                                  RUT: {visit.worker_rut || "S/N"}
                                </p>
                              </div>
                            </div>
                          </td>

                          <td className="px-5 py-4 text-center">
                            <span className="rounded-lg border border-blue-100 bg-blue-50 px-2.5 py-1 text-[9px] font-black text-blue-600">
                              {visit.visit_number || "S/N"}
                            </span>
                          </td>

                          <td className="px-5 py-4 text-center text-[10px] font-black text-slate-700">
                            {visit.visit_date
                              ? formatDate(visit.visit_date)
                              : "Sin fecha"}
                          </td>

                          <td className="px-5 py-4 text-center">
                            <p className="mx-auto max-w-[180px] truncate text-[10px] font-black text-slate-800">
                              {visit.local_name || "Sin local"}
                            </p>

                            <p className="mt-1 text-[9px] font-black text-[#87be00]">
                              {visit.local_code || "S/N"}
                            </p>
                          </td>

                          <td className="px-5 py-4 text-center">
                            <div className="inline-flex flex-col items-center">
                              <span
                                className={`flex items-center gap-2 rounded-xl px-3 py-2 text-[9px] font-black ${
                                  visit.total_duration <= 15
                                    ? "bg-[#87be00]/10 text-[#87be00]"
                                    : "bg-amber-50 text-amber-600"
                                }`}
                              >
                                <FiClock size={12} />
                                {formatMinutes(visit.total_duration)}
                              </span>

                              <div className="mt-2 flex items-center gap-2 text-[8px] font-bold text-slate-400">
                                <span>{formatTime(visit.start_time)}</span>
                                <FiArrowRight size={9} />
                                <span>{formatTime(visit.end_time)}</span>
                              </div>
                            </div>
                          </td>

                          <td className="px-5 py-4 text-center">
                            <span className="inline-flex items-center gap-2 rounded-xl bg-amber-50 px-3 py-2 text-[9px] font-black text-amber-600">
                              <FiPackage size={13} />
                              {visit.products.length} productos
                            </span>
                          </td>

                          <td className="px-5 py-4 text-center">
                            <motion.div
                              animate={{
                                rotate: expandedRow === index ? 180 : 0,
                              }}
                              className="inline-block"
                            >
                              <button
                                type="button"
                                className={`flex h-10 w-10 items-center justify-center rounded-xl border transition ${
                                  expandedRow === index
                                    ? "border-slate-900 bg-slate-900 text-white"
                                    : "border-slate-200 bg-white text-slate-400 hover:border-slate-400 hover:text-slate-900"
                                }`}
                              >
                                <FiChevronDown size={17} />
                              </button>
                            </motion.div>
                          </td>
                        </motion.tr>

                        <AnimatePresence>
                          {expandedRow === index && (
                            <motion.tr
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              exit={{ opacity: 0 }}
                            >
                              <td colSpan={7} className="bg-slate-50/80 px-6 py-6">
                                <div className="mb-5 flex items-center gap-3">
                                  <div className="h-px flex-1 bg-slate-200" />

                                  <span className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">
                                    Productos gestionados en esta visita
                                  </span>

                                  <div className="h-px flex-1 bg-slate-200" />
                                </div>

                                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                                  {visit.products.map((productTask, productIndex) => (
                                    <article
                                      key={productIndex}
                                      className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md"
                                    >
                                      <div className="flex items-start justify-between gap-3">
                                        <div className="min-w-0">
                                          <p className="text-[8px] font-black uppercase tracking-wider text-slate-400">
                                            {productTask.brand_name || "Sin marca"}
                                          </p>

                                          <p className="mt-1 truncate text-[11px] font-black text-slate-900">
                                            {productTask.product_name || "Sin producto"}
                                          </p>
                                        </div>

                                        <span className="flex shrink-0 items-center gap-1 rounded-lg bg-[#87be00]/10 px-2 py-1 text-[8px] font-black text-[#87be00]">
                                          <FiClock size={10} />
                                          {formatMinutes(
                                            productTask.duration_minutes,
                                          )}
                                        </span>
                                      </div>

                                      <div className="mt-4 border-t border-dashed border-slate-200 pt-3">
                                        <p className="mb-2 text-[8px] font-black uppercase tracking-wider text-slate-400">
                                          Códigos EAN (
                                          {productTask.product_codes?.length || 0}
                                          )
                                        </p>

                                        <div className="custom-scrollbar flex max-h-[100px] flex-wrap gap-1.5 overflow-y-auto pr-1">
                                          {productTask.product_codes?.length > 0 ? (
                                            productTask.product_codes.map(
                                              (codeValue, codeIndex) => (
                                                <span
                                                  key={codeIndex}
                                                  className="rounded-md border border-violet-100 bg-violet-50 px-2 py-1 font-mono text-[8px] text-violet-700"
                                                >
                                                  {codeValue}
                                                </span>
                                              ),
                                            )
                                          ) : (
                                            <span className="text-[9px] text-slate-300">
                                              Sin códigos
                                            </span>
                                          )}
                                        </div>
                                      </div>

                                      {productTask.comment && (
                                        <div className="mt-3 rounded-xl bg-slate-50 p-3">
                                          <FiMessageSquare
                                            className="mb-1 text-blue-500"
                                            size={12}
                                          />

                                          <p className="text-[9px] font-bold text-slate-600">
                                            “{productTask.comment}”
                                          </p>
                                        </div>
                                      )}
                                    </article>
                                  ))}
                                </div>
                              </td>
                            </motion.tr>
                          )}
                        </AnimatePresence>
                      </React.Fragment>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </motion.section>
        )}
      </div>
    </div>
  );
};

export default ConsolidatedControl;