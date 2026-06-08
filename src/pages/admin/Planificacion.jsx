import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import api from "../../api/apiClient";
import ManageRoutesModal from "../../components/ManageRoutesModal";
import toast from "react-hot-toast";
import {
  FiPlus,
  FiRefreshCw,
  FiEdit3,
  FiUploadCloud,
  FiCheckCircle,
  FiAlertCircle,
  FiPlayCircle,
  FiUser,
  FiSearch,
  FiCalendar,
  FiX
} from "react-icons/fi";
import * as XLSX from "xlsx";
import { motion, AnimatePresence } from "framer-motion";

// ─────────────────────────────────────────────────────────────
// 📅 VISUALIZADOR MENSUAL CON TOOLTIP FLOTANTE Y COLORES DINÁMICOS
// ─────────────────────────────────────────────────────────────
const MonthlyStatus = ({ scheduledDays = [] }) => {
  const weeks = [1, 2, 3, 4];
  const days = [
    { id: 1, label: "L" },
    { id: 2, label: "M" },
    { id: 3, label: "X" },
    { id: 4, label: "J" },
    { id: 5, label: "V" },
    { id: 6, label: "S" },
    { id: 0, label: "D" },
  ];

  const formatTime = (time) => {
    if (!time || time === "null" || time === null || time === undefined) return "N/A";
    return String(time).substring(0, 5);
  };

  const getCircleStyles = (status) => {
    const s = (status || "PENDING").toUpperCase();
    if (s === "COMPLETED" || s === "OK") {
      return { backgroundColor: "#87be00", color: "#ffffff" }; 
    } else if (s === "PENDING" || s === "IN_PROGRESS") {
      return { backgroundColor: "#2563eb", color: "#ffffff" }; 
    } else {
      return { backgroundColor: "#ef4444", color: "#ffffff" }; 
    }
  };

  return (
    <div className="flex flex-col gap-2 py-1">
      {weeks.map((week) => (
        <div key={week} className="flex items-center gap-2">
          <span className="text-[9px] font-black text-gray-300 w-4 tracking-tighter shrink-0">
            S{week}
          </span>
          <div className="flex gap-1">
            {days.map((d) => {
              const scheduleInfo = scheduledDays.find(
                (item) =>
                  parseInt(item.day) === d.id && parseInt(item.week) === week
              );
              const isActive = !!scheduleInfo;

              return (
                <div key={d.id} className="relative group">
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-[8px] font-black transition-all duration-200 cursor-default select-none shadow-sm ${isActive ? 'group-hover:scale-110' : ''}`}
                    style={
                      isActive 
                        ? getCircleStyles(scheduleInfo.status) 
                        : { backgroundColor: "#f3f4f6", color: "#d1d5db" } 
                    }
                  >
                    {d.label}
                  </div>

                  {/* TOOLTIP FLOTANTE */}
                  {isActive && (
                    <div className="absolute bottom-[calc(100%+8px)] left-1/2 -translate-x-1/2 invisible opacity-0 group-hover:visible group-hover:opacity-100 pointer-events-none transition-all duration-150 z-[99999]">
                      <div className="bg-gray-900 text-white px-3 py-2 rounded-xl shadow-2xl border border-white/10 whitespace-nowrap flex flex-col items-center gap-0.5 min-w-[110px]">
                        <span 
                          className="font-black uppercase text-[8px] tracking-widest leading-none"
                          style={{ color: getCircleStyles(scheduleInfo.status).backgroundColor }}
                        >
                          {scheduleInfo.turno && scheduleInfo.turno !== "null"
                            ? scheduleInfo.turno
                            : "Planificado"}
                        </span>
                        <span className="font-bold text-[11px] leading-tight mt-0.5">
                          {formatTime(scheduleInfo.time)} — {formatTime(scheduleInfo.endTime)}
                        </span>
                        <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900" />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// BADGE DE ESTADO
// ─────────────────────────────────────────────────────────────
const getStatusBadge = (status) => {
  const config = {
    COMPLETED: { bg: "bg-green-50", text: "text-green-600", border: "border-green-200", icon: <FiCheckCircle size={11} />, label: "Completado" },
    IN_PROGRESS: { bg: "bg-blue-50", text: "text-blue-600", border: "border-blue-200", icon: <FiPlayCircle size={11} className="animate-pulse" />, label: "En Curso" },
    PARTIAL: { bg: "bg-indigo-50", text: "text-indigo-600", border: "border-indigo-200", icon: <FiRefreshCw size={11} />, label: "Parcial" },
    PENDING: { bg: "bg-amber-50", text: "text-amber-500", border: "border-amber-200", icon: <FiAlertCircle size={11} />, label: "Pendiente" },
  };
  const s = config[status?.toUpperCase()] || config.PENDING;
  return (
    <span className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full ${s.bg} ${s.text} text-[9px] font-black uppercase tracking-widest border ${s.border} shadow-sm w-max`}>
      {s.icon} {s.label}
    </span>
  );
};

// ─────────────────────────────────────────────────────────────
// COMPONENTE PRINCIPAL
// ─────────────────────────────────────────────────────────────
const Planificacion = () => {
  const [routes, setRoutes]             = useState([]);
  const [users, setUsers]               = useState([]);
  const [locales, setLocales]           = useState([]);
  const [companies, setCompanies]       = useState([]);
  const [isModalOpen, setIsModalOpen]   = useState(false);
  const [selectedRoute, setSelectedRoute] = useState(null);
  const [loading, setLoading]           = useState(true);

  const [searchTerm, setSearchTerm]     = useState("");
  const [filterDate, setFilterDate]     = useState("");

  const fileInputRef = useRef(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [resRoutes, resUsers, resLocales, resCompanies] = await Promise.all([
        api.get("/routes"),
        api.get("/users"),
        api.get("/locales"),
        api.get("/companies"),
      ]);

      const dRoutes    = resRoutes.data    || resRoutes;
      const dUsers     = resUsers.data     || resUsers;
      const dLocales   = resLocales.data   || resLocales;
      const dCompanies = resCompanies.data || resCompanies;

      setRoutes(Array.isArray(dRoutes)       ? dRoutes    : []);
      setUsers(Array.isArray(dUsers)         ? dUsers     : []);
      setLocales(Array.isArray(dLocales)     ? dLocales   : []);
      setCompanies(Array.isArray(dCompanies) ? dCompanies : []);
    } catch (error) {
      console.error("❌ Error en fetchData:", error);
      toast.error("Error al sincronizar datos");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Rangos de semanas del mes actual
  const weekRanges = useMemo(() => {
    const today      = new Date();
    const year       = today.getFullYear();
    const month      = today.getMonth();
    let firstDay     = new Date(year, month, 1);
    let dow          = firstDay.getDay() === 0 ? 7 : firstDay.getDay();
    let firstMonday  = new Date(firstDay);
    if (dow !== 1) firstMonday.setDate(1 + (8 - dow));

    const mesesAbr = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];
    const ranges = [];
    for (let i = 0; i < 4; i++) {
      let start = new Date(firstMonday);
      start.setDate(firstMonday.getDate() + i * 7);
      let end = new Date(start);
      end.setDate(start.getDate() + 6);
      ranges.push({
        weekNum: i + 1,
        label: `S${i + 1}`,
        dates: `${start.getDate()} ${mesesAbr[start.getMonth()]} - ${end.getDate()} ${mesesAbr[end.getMonth()]}`,
        rawStart: start,
        rawEnd: end
      });
    }
    return ranges;
  }, []);

  const activeWeekByDate = useMemo(() => {
    if (!filterDate) return null;
    const selected = new Date(filterDate + "T12:00:00");
    const week = weekRanges.find(r => selected >= r.rawStart && selected <= r.rawEnd);
    return week ? week.weekNum : null;
  }, [filterDate, weekRanges]);

  // Import Excel
  const handleImportExcel = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader  = new FileReader();
    const toastId = toast.loading("Analizando Excel...");

    reader.onload = async (evt) => {
      try {
        const data      = new Uint8Array(evt.target.result);
        const workbook  = XLSX.read(data, { type: "array" });
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const rawJson   = XLSX.utils.sheet_to_json(worksheet, { defval: "" });

        const finalData = rawJson.map((row) => {
          const obj = {};
          Object.keys(row).forEach((key) => {
            const k   = String(key).toLowerCase().trim();
            const val = String(row[key]).trim();
            if (k.includes("rut"))                                obj.Rut_Mercaderista = val;
            else if (k.includes("cod"))                           obj.Codigo = val;
            else if (k.includes("semana") || k.includes("turno")) obj[key.trim()] = val;
          });
          return obj;
        }).filter((f) => f.Rut_Mercaderista && f.Codigo);

        if (finalData.length === 0) {
          toast.error("Excel sin datos válidos", { id: toastId });
          return;
        }

        const today    = new Date();
        const payload  = { month: today.getMonth() + 1, year: today.getFullYear(), routes: finalData };
        const response = await api.post("/routes/bulk-create", payload);
        const resData  = response.data || response;

        if (resData.success) {
          toast.success(`¡Éxito! ${resData.count} rutas creadas.`, { id: toastId });
          fetchData();
        } else {
          toast.error(resData.message || "Error en la carga masiva", { id: toastId });
        }
      } catch {
        toast.error("Error al procesar el archivo", { id: toastId });
      }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = "";
  };

  // ── Agrupar rutas (ESTRICTO POR LOCAL PARA MANTENER MERCADERISTAS JUNTOS) ──────────────
  const filteredAndGroupedRoutes = useMemo(() => {
    const groups = {};
    const search = searchTerm.toLowerCase();

    routes.forEach((r) => {
      if (!r.user_id || !r.local_id) return;

      const matchText = 
        r.cadena?.toLowerCase().includes(search) ||
        r.direccion?.toLowerCase().includes(search) ||
        r.codigo_local?.toString().includes(search) ||
        `${r.first_name} ${r.last_name}`.toLowerCase().includes(search);

      if (!matchText) return;

      // 🚩 FIX CRÍTICO: Obligamos a que la llave sea únicamente el local_id.
      // Así se compactan todas las filas del mismo local en un solo componente visual.
      const key = `local-${r.local_id}`;
      const weekNum = r.week_number || 1;

      const schedItem = r.day_of_week !== null ? {
        day:     r.day_of_week,
        week:    weekNum,
        time:    r.start_time   || r.entrada || null,
        endTime: r.end_time     || r.salida  || null,
        turno:   r.nombre_turno || null,
        turno_id: r.nombre_turno || "INDIVIDUAL", 
        status:  r.status || "PENDING", 
        user_id: String(r.user_id),
        rol: r.categoria_rol || (r.nombre_turno?.includes("PT") ? "MERCADERISTA PT" : "MERCADERISTA FULL") 
      } : null;

      if (!groups[key]) {
        groups[key] = {
          ...r,
          route_ids_by_user: { [String(r.user_id)]: r.id }, 
          users: new Set([`${r.first_name} ${r.last_name}`]),
          scheduled_items: schedItem ? [schedItem] : [],
          all_statuses:    [r.status],
          turnosPorSemana: schedItem ? { [weekNum]: new Set([r.nombre_turno].filter(Boolean)) } : {},
        };
      } else {
        groups[key].route_ids_by_user[String(r.user_id)] = r.id; 
        groups[key].users.add(`${r.first_name} ${r.last_name}`);
        groups[key].all_statuses.push(r.status);

        if (schedItem) {
          const exists = groups[key].scheduled_items.some(
            (item) =>
              parseInt(item.day)  === parseInt(r.day_of_week) &&
              parseInt(item.week) === parseInt(weekNum) &&
              String(item.user_id) === String(r.user_id)
          );
          if (!exists) groups[key].scheduled_items.push(schedItem);

          if (!groups[key].turnosPorSemana[weekNum]) {
            groups[key].turnosPorSemana[weekNum] = new Set();
          }
          if (r.nombre_turno) {
            groups[key].turnosPorSemana[weekNum].add(r.nombre_turno);
          }
        }
      }
    });

    return Object.values(groups).map((group) => {
      const turnosPorSemanaArray = {};
      Object.keys(group.turnosPorSemana).forEach(w => {
        turnosPorSemanaArray[w] = Array.from(group.turnosPorSemana[w]).join(' / ');
      });

      return {
        ...group,
        users: Array.from(group.users),
        turnosPorSemana: turnosPorSemanaArray,
        displayStatus:
          group.all_statuses.includes("IN_PROGRESS") ? "IN_PROGRESS" :
          group.all_statuses.every((s) => s === "COMPLETED" || s === "OK") ? "COMPLETED" :
          group.all_statuses.some((s)  => s === "COMPLETED" || s === "OK") ? "PARTIAL"   :
          "PENDING",
      };
    }).filter(g => !activeWeekByDate || g.scheduled_items.some(i => i.week === activeWeekByDate));
  }, [routes, searchTerm, activeWeekByDate]);

  // ── LOADING ─────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="h-screen flex flex-col items-center justify-center space-y-4">
        <FiRefreshCw className="animate-spin text-[#87be00]" size={38} />
        <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em]">
          Sincronizando Planificación...
        </p>
      </div>
    );
  }

  // ── RENDER ──────────────────────────────────────────────────
  return (
    <div className="space-y-5 font-[Outfit] pb-20 px-2 sm:px-4">

      {/* ══ HEADER ══════════════════════════════════════════════ */}
      <div className="bg-white p-6 md:p-8 rounded-[2rem] shadow-sm border border-gray-100 space-y-6">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-5 ">
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-black text-gray-900 uppercase italic tracking-tight leading-none text-right lg:text-left">
              Planificación Mensual
            </h1>
            <div className="flex gap-2 mt-4 overflow-x-auto pb-1 custom-scrollbar">
              {weekRanges.map((w, idx) => (
                <div key={idx} className={`flex flex-col gap-0.5 px-4 py-2.5 rounded-xl border shrink-0 min-w-[110px] transition-all ${activeWeekByDate === w.weekNum ? 'bg-[#87be00] border-[#87be00] text-white' : 'bg-gray-50 border-gray-100'}`}>
                  <span className={`text-[11px] font-black ${activeWeekByDate === w.weekNum ? 'text-white' : 'text-[#87be00]'}`}>{w.label}</span>
                  <span className={`text-[9px] font-bold uppercase leading-none ${activeWeekByDate === w.weekNum ? 'text-white/80' : 'text-gray-400'}`}>{w.dates}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button onClick={fetchData} className="p-3 bg-gray-50 text-gray-400 rounded-xl hover:bg-gray-100 hover:text-[#87be00] border border-gray-100 transition-all">
              <FiRefreshCw size={17} />
            </button>
            <input type="file" ref={fileInputRef} className="hidden" accept=".xlsx,.xls" onChange={handleImportExcel} />
            <button onClick={() => fileInputRef.current.click()} className="flex items-center gap-2 bg-[#87be00] hover:bg-[#76a600] text-white px-5 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-md transition-all">
              <FiUploadCloud size={15} /> Cargar Excel
            </button>
            <button onClick={() => { setSelectedRoute(null); setIsModalOpen(true); }} className="flex items-center gap-2 bg-gray-900 hover:bg-black text-white px-5 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-md transition-all">
              <FiPlus size={15} /> Nueva Ruta
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-gray-50">
          <div className="md:col-span-2 relative">
            <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input type="text" placeholder="BUSCAR POR LOCAL, REPONEDOR O CÓDIGO..." className="w-full pl-12 pr-4 py-3 bg-gray-50 border-2 border-transparent rounded-2xl text-[10px] font-black uppercase outline-none focus:bg-white focus:border-[#87be00]/20 transition-all shadow-inner" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            {searchTerm && <button onClick={() => setSearchTerm("")} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-red-500"><FiX size={14}/></button>}
          </div>
          <div className="relative">
            <FiCalendar className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input type="date" className="w-full pl-12 pr-4 py-3 bg-gray-50 border-2 border-transparent rounded-2xl text-[10px] font-black outline-none focus:bg-white focus:border-[#87be00]/20 transition-all shadow-inner cursor-pointer" value={filterDate} onChange={(e) => setFilterDate(e.target.value)} />
            {filterDate && <button onClick={() => setFilterDate("")} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-red-500"><FiX size={14}/></button>}
          </div>
        </div>
      </div>

      {/* ══ TABLA DESKTOP ═══════════════════════════════════════ */}
      <div className="hidden lg:block bg-white rounded-[2rem] shadow-sm border border-gray-100 overflow-visible">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="px-7 py-4 text-[9px] font-black text-gray-400 uppercase tracking-[0.2em]">Punto de Venta / Local</th>
              <th className="px-7 py-4 text-[9px] font-black text-gray-400 uppercase tracking-[0.2em]">Mercaderista Asignado</th>
              <th className="px-7 py-4 text-[9px] font-black text-gray-400 uppercase tracking-[0.2em]">Calendario Mensual</th>
              <th className="px-7 py-4 text-[9px] font-black text-gray-400 uppercase tracking-[0.2em] text-center">Estado</th>
              <th className="px-7 py-4 text-[9px] font-black text-gray-400 uppercase tracking-[0.2em] text-right">Acción</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filteredAndGroupedRoutes.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-7 py-16 text-center text-sm text-gray-300 font-bold">
                  No hay rutas planificadas aún.
                </td>
              </tr>
            ) : (
              filteredAndGroupedRoutes.map((r, index) => (
                <tr
                  key={`desk-${index}`}
                  className="hover:bg-gray-50/40 transition-colors"
                >
                  <td className="px-7 py-6 align-top">
                    <p className="font-black text-gray-900 uppercase italic text-[13px] leading-none">{r.cadena}</p>
                    <p className="text-[11px] font-medium text-gray-400 mt-1.5 max-w-[200px] truncate">{r.direccion}</p>
                    <span className="inline-block mt-2.5 px-2.5 py-1 bg-gray-100 text-gray-500 text-[9px] font-black rounded-lg tracking-widest">
                      {r.codigo_local}
                    </span>
                  </td>

                  <td className="px-7 py-6 align-top">
                    <div className="flex flex-col gap-2.5">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 shrink-0">
                          <FiUser size={14} />
                        </div>
                        <span className="font-black text-gray-800 text-[11px] leading-none uppercase">
                          {r.users.join(' / ')}
                        </span>
                      </div>

                      <div className="flex flex-col gap-1 pl-10">
                        {[1, 2, 3, 4].map((wNum) => {
                          const tName = r.turnosPorSemana?.[wNum];
                          return (
                            <div key={wNum} className="flex items-center gap-1.5">
                              <span className="text-[8px] font-black text-gray-300 uppercase tracking-tighter w-5 shrink-0">
                                S{wNum}
                              </span>
                              {tName ? (
                                <span className="text-[9px] font-bold text-gray-600 uppercase bg-gray-100 px-2 py-0.5 rounded-md leading-none">
                                  {tName}
                                </span>
                              ) : (
                                <span className="text-[9px] text-gray-200 font-bold leading-none">—</span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </td>

                  <td className="px-7 py-6 align-top">
                    <div className="bg-gray-50 px-4 py-3 rounded-2xl inline-block overflow-visible">
                      <MonthlyStatus scheduledDays={r.scheduled_items} />
                    </div>
                  </td>

                  <td className="px-7 py-6 align-top text-center">
                    <div className="flex justify-center pt-1">
                      {getStatusBadge(r.displayStatus)}
                    </div>
                  </td>

                  <td className="px-7 py-6 align-top text-right">
                    <button
                      onClick={() => { setSelectedRoute(r); setIsModalOpen(true); }}
                      className="p-3 bg-gray-50 text-gray-400 hover:bg-[#87be00] hover:text-white rounded-xl border border-gray-100 hover:border-transparent transition-all"
                    >
                      <FiEdit3 size={15} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* ══ TARJETAS MÓVIL ══════════════════════════════════════ */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:hidden">
        <AnimatePresence>
          {filteredAndGroupedRoutes.map((r, index) => (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              key={`mob-${index}`}
              className="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100 flex flex-col gap-4"
            >
              <div className="flex justify-between items-start">
                <div className="pr-3 min-w-0">
                  <p className="font-black text-gray-900 uppercase italic text-sm leading-tight">{r.cadena}</p>
                  <p className="text-[11px] font-medium text-gray-400 mt-1 truncate">{r.direccion}</p>
                  <span className="inline-block mt-2 px-2.5 py-1 bg-gray-100 text-gray-500 text-[9px] font-black rounded-lg tracking-widest">
                    {r.codigo_local}
                  </span>
                </div>
                <div className="flex flex-col items-end gap-2 shrink-0">
                  {getStatusBadge(r.displayStatus)}
                  <button
                    onClick={() => { setSelectedRoute(r); setIsModalOpen(true); }}
                    className="p-2.5 bg-gray-50 text-gray-400 hover:bg-[#87be00] hover:text-white rounded-xl transition-all"
                  >
                    <FiEdit3 size={15} />
                  </button>
                </div>
              </div>

              <hr className="border-gray-100" />

              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 shrink-0 mt-0.5">
                  <FiUser size={15} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-black text-gray-800 text-[11px] leading-none mb-2 uppercase">
                    {r.users.join(' / ')}
                  </p>
                  <div className="flex flex-col gap-1">
                    {[1, 2, 3, 4].map((wNum) => {
                      const tName = r.turnosPorSemana?.[wNum];
                      return (
                        <div key={wNum} className="flex items-center gap-1.5">
                          <span className="text-[8px] font-black text-gray-300 uppercase tracking-tighter w-5 shrink-0">
                            S{wNum}
                          </span>
                          {tName ? (
                            <span className="text-[9px] font-bold text-gray-600 uppercase bg-gray-100 px-2 py-0.5 rounded-md leading-none">
                              {tName}
                            </span>
                          ) : (
                            <span className="text-[9px] text-gray-200 font-bold">—</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 px-4 py-3 rounded-2xl overflow-visible">
                <MonthlyStatus scheduledDays={r.scheduled_items} />
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <ManageRoutesModal
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); setSelectedRoute(null); }}
        users={users}
        locales={locales}
        companies={companies}
        onCreated={fetchData}
        initialData={selectedRoute}
      />
    </div>
  );
};

export default Planificacion;