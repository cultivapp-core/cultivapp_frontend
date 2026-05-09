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
} from "react-icons/fi";
import * as XLSX from "xlsx";
import { motion } from "framer-motion";

/**
 * 📅 COMPONENTE: VISUALIZADOR MENSUAL CON TOOLTIP DINÁMICO
 */
const MonthlyStatus = ({ scheduledDays = [] }) => {
  const weeks = [1, 2, 3, 4];
  const days = [
    { id: 1, label: 'L' }, { id: 2, label: 'M' }, { id: 3, label: 'X' },
    { id: 4, label: 'J' }, { id: 5, label: 'V' }, { id: 6, label: 'S' }, { id: 0, label: 'D' },
  ];

  const formatTime = (time) => {
    if (!time || time === "null") return "N/A";
    return String(time).substring(0, 5);
  };

  return (
    <div className="flex flex-col gap-2 py-1">
      {weeks.map((week) => (
        <div key={week} className="flex items-center gap-3">
          <span className="text-[10px] font-black text-gray-400 w-4 tracking-tighter">S{week}</span>
          <div className="flex gap-1.5">
            {days.map((d) => {
              const scheduleInfo = scheduledDays.find(
                (item) => parseInt(item.day) === d.id && parseInt(item.week) === week
              );

              const isActive = !!scheduleInfo;

              return (
                <div key={d.id} className="relative group">
                  <div
                    className={`w-5 h-5 md:w-6 md:h-6 rounded-full flex items-center justify-center text-[7px] md:text-[8px] font-black transition-all duration-300 cursor-default
                      ${isActive 
                        ? "bg-[#87be00] text-white shadow-md group-hover:scale-110" 
                        : "bg-gray-100 text-gray-400"}`}
                  >
                    {d.label}
                  </div>

                  {/* 🚩 TOOLTIP FLOTANTE (Ahora sí mostrará las horas y no se cortará) */}
                  {isActive && (
                    <div className="absolute bottom-[110%] left-1/2 -translate-x-1/2 mb-1 invisible opacity-0 group-hover:visible group-hover:opacity-100 pointer-events-none transition-all duration-200 z-[99999]">
                      <div className="bg-gray-900 text-white text-[9px] px-3 py-2 rounded-xl shadow-xl border border-white/10 whitespace-nowrap flex flex-col items-center gap-1">
                        <span className="font-black text-[#87be00] uppercase text-[7px] tracking-widest">
                          {scheduleInfo.turno || 'Planificado'}
                        </span>
                        <span className="font-bold">
                          {formatTime(scheduleInfo.time)} — {formatTime(scheduleInfo.endTime)}
                        </span>
                        <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
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

const Planificacion = () => {
  const [routes, setRoutes] = useState([]);
  const [users, setUsers] = useState([]);
  const [locales, setLocales] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedRoute, setSelectedRoute] = useState(null);
  const [loading, setLoading] = useState(true);

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

      const dRoutes = resRoutes.data || resRoutes;
      const dUsers = resUsers.data || resUsers;
      const dLocales = resLocales.data || resLocales;
      const dCompanies = resCompanies.data || resCompanies;

      setRoutes(Array.isArray(dRoutes) ? dRoutes : []);
      setUsers(Array.isArray(dUsers) ? dUsers : []);
      setLocales(Array.isArray(dLocales) ? dLocales : []);
      setCompanies(Array.isArray(dCompanies) ? dCompanies : []);
    } catch (error) {
      console.error("❌ Error en fetchData:", error);
      toast.error("Error al sincronizar datos");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const weekRanges = useMemo(() => {
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth(); 
    let firstDay = new Date(year, month, 1);
    let dayOfWeek = firstDay.getDay() === 0 ? 7 : firstDay.getDay();
    let firstMonday = new Date(firstDay);
    if (dayOfWeek !== 1) firstMonday.setDate(1 + (8 - dayOfWeek));

    const ranges = [];
    const mesesAbr = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

    for(let i=0; i<4; i++) {
      let start = new Date(firstMonday);
      start.setDate(firstMonday.getDate() + (i * 7));
      let end = new Date(start);
      end.setDate(start.getDate() + 6);
      ranges.push({ label: `S${i+1}`, dates: `${start.getDate()} ${mesesAbr[start.getMonth()]} - ${end.getDate()} ${mesesAbr[end.getMonth()]}` });
    }
    return ranges;
  }, []);

  const handleImportExcel = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    const toastId = toast.loading("Analizando Excel...");

    reader.onload = async (evt) => {
      try {
        const data = new Uint8Array(evt.target.result);
        const workbook = XLSX.read(data, { type: "array" });
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const rawJson = XLSX.utils.sheet_to_json(worksheet, { defval: "" });

        const finalData = rawJson.map((row) => {
          const obj = {};
          Object.keys(row).forEach((key) => {
            const k = String(key).toLowerCase().trim();
            const val = String(row[key]).trim();
            if (k.includes("rut")) obj.Rut_Mercaderista = val;
            else if (k.includes("cod")) obj.Codigo = val;
            else if (k.includes("semana") || k.includes("turno")) obj[key.trim()] = val;
          });
          return obj;
        }).filter(f => f.Rut_Mercaderista && f.Codigo);

        if (finalData.length === 0) {
          toast.error("Excel sin datos válidos", { id: toastId });
          return;
        }

        const today = new Date();
        const payload = { month: today.getMonth() + 1, year: today.getFullYear(), routes: finalData };
        await api.post("/routes/bulk-create", payload);
        toast.success("¡Carga masiva exitosa!", { id: toastId });
        fetchData();
      } catch (err) {
        toast.error("Error al procesar el archivo", { id: toastId });
      }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = "";
  };

  const groupedRoutes = useMemo(() => {
    const groups = {};
    routes.forEach((r) => {
      if (!r.user_id || !r.local_id) return;
      const key = `${r.user_id}-${r.local_id}`;
      const weekNum = r.week_number || 1; 

      if (!groups[key]) {
        groups[key] = {
          ...r,
          // 🚩 OJO AQUÍ: Cambiamos a r.start_time y r.end_time para que el Tooltip las reciba correctamente
          scheduled_items: r.day_of_week !== null ? [{ 
            day: r.day_of_week, 
            week: weekNum, 
            time: r.start_time || r.entrada,      
            endTime: r.end_time || r.salida,    
            turno: r.nombre_turno  
          }] : [],
          all_statuses: [r.status],
        };
      } else {
        if (r.day_of_week !== null) {
          const exists = groups[key].scheduled_items.some(
            item => parseInt(item.day) === parseInt(r.day_of_week) && parseInt(item.week) === parseInt(weekNum)
          );
          if (!exists) {
            groups[key].scheduled_items.push({ 
              day: r.day_of_week, 
              week: weekNum, 
              time: r.start_time || r.entrada,
              endTime: r.end_time || r.salida,
              turno: r.nombre_turno 
            });
          }
        }
        groups[key].all_statuses.push(r.status);
      }
    });

    return Object.values(groups).map(group => ({
      ...group,
      displayStatus: group.all_statuses.includes('IN_PROGRESS') ? 'IN_PROGRESS' : 
                     group.all_statuses.every(s => s === 'COMPLETED' || s === 'OK') ? 'COMPLETED' : 
                     group.all_statuses.some(s => s === 'COMPLETED' || s === 'OK') ? 'PARTIAL' : 'PENDING'
    }));
  }, [routes]);

  const getStatusBadge = (status) => {
    const config = {
      COMPLETED: { bg: 'bg-green-50', text: 'text-green-600', border: 'border-green-200', icon: <FiCheckCircle/>, label: 'Completado' },
      IN_PROGRESS: { bg: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-200', icon: <FiPlayCircle className="animate-pulse"/>, label: 'En Curso' },
      PARTIAL: { bg: 'bg-indigo-50', text: 'text-indigo-600', border: 'border-indigo-200', icon: <FiRefreshCw/>, label: 'Parcial' },
      PENDING: { bg: 'bg-gray-50', text: 'text-gray-500', border: 'border-gray-200', icon: <FiAlertCircle/>, label: 'Pendiente' }
    };
    const s = config[status?.toUpperCase()] || config.PENDING;
    return <span className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full ${s.bg} ${s.text} text-[9px] font-black uppercase tracking-widest border ${s.border} shadow-sm w-max`}>{s.icon} {s.label}</span>;
  };

  if (loading) {
    return (
      <div className="h-screen flex flex-col items-center justify-center space-y-4 px-4 text-center">
        <FiRefreshCw className="animate-spin text-[#87be00]" size={42} />
        <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em]">Sincronizando Planificación...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 font-[Outfit] pb-20 px-2 sm:px-4">
      {/* HEADER PREMIUM */}
      <div className="flex flex-col lg:flex-row justify-between gap-6 bg-white p-6 md:p-8 rounded-[2rem] shadow-sm hover:shadow-md transition-shadow border border-gray-100">
        <div className="flex-1 w-full overflow-hidden">
          <h1 className="text-xl md:text-2xl font-black text-gray-900 uppercase italic leading-none">Planificación Mensual</h1>
          <div className="flex overflow-x-auto gap-3 mt-5 pb-2 custom-scrollbar">
            {weekRanges.map((w, idx) => (
              <div key={idx} className="flex flex-col gap-1 bg-gray-50 px-4 py-2.5 rounded-xl border border-gray-100/50 shrink-0 min-w-[110px]">
                <span className="text-[10px] font-black text-gray-900">{w.label}</span>
                <span className="text-[9px] font-bold text-gray-400 uppercase leading-none">{w.dates}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-row flex-wrap sm:flex-nowrap items-center gap-2 md:gap-3 w-full lg:w-auto">
          <button onClick={fetchData} className="p-3 sm:p-4 bg-gray-50 text-gray-500 rounded-xl sm:rounded-2xl hover:bg-gray-100 hover:text-[#87be00] border border-gray-100 shrink-0 transition-all">
            <FiRefreshCw size={18}/>
          </button>
          <input type="file" ref={fileInputRef} className="hidden" accept=".xlsx, .xls" onChange={handleImportExcel} />
          <button onClick={() => fileInputRef.current.click()} className="flex-1 sm:flex-none bg-[#87be00] text-white px-3 sm:px-6 py-3 sm:py-4 rounded-xl sm:rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg hover:bg-[#76a600] transition-all whitespace-nowrap">
            <FiUploadCloud size={16}/> 
            <span className="hidden sm:inline">Cargar Excel</span>
            <span className="sm:hidden">Excel</span>
          </button>
          <button onClick={() => { setSelectedRoute(null); setIsModalOpen(true); }} className="flex-1 sm:flex-none bg-gray-900 text-white px-3 sm:px-8 py-3 sm:py-4 rounded-xl sm:rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 shadow-xl hover:bg-black transition-all whitespace-nowrap">
            <FiPlus size={16}/> Nueva Ruta
          </button>
        </div>
      </div>

      {/* 💻 TABLA DESKTOP PREMIUM */}
      <div className="hidden lg:block bg-white rounded-[2.5rem] shadow-sm border border-gray-100 overflow-visible">
        <div className="overflow-visible">
          <table className="w-full text-left border-collapse">
            <thead className="bg-gray-50/50 border-b border-gray-100">
              <tr>
                <th className="p-6 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Punto de Venta / Local</th>
                <th className="p-6 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Mercaderista Asignado</th>
                <th className="p-6 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Calendario Mensual</th>
                <th className="p-6 text-center text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Estado</th>
                <th className="p-6 text-right text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 text-[11px]">
              {groupedRoutes.map((r) => {
                const turnsByWeek = {};
                r.scheduled_items.forEach(item => {
                  if (!turnsByWeek[item.week]) {
                    turnsByWeek[item.week] = item.turno;
                  }
                });

                return (
                  <tr key={`${r.user_id}-${r.local_id}-desktop`} className="hover:bg-gray-50/50 transition-colors group/row">
                    <td className="p-6">
                      <div className="min-w-0">
                        <p className="font-black text-gray-900 uppercase italic leading-none text-[13px]">{r.cadena}</p>
                        <p className="text-[12px] font-medium text-gray-400 mt-1.5 truncate max-w-xs">{r.direccion}</p>
                        <span className="inline-block mt-3 px-2.5 py-1 bg-gray-100 text-gray-600 text-[9px] font-black rounded-lg tracking-widest border border-gray-200/50">{r.codigo_local}</span>
                      </div>
                    </td>
                    
                    {/* 🚩 DISEÑO DE MERCADERISTA MEJORADO (Como en la foto) */}
                    <td className="p-6">
                      <div className="flex flex-col gap-3">
                          <div className="font-black text-gray-800 uppercase flex items-center gap-2.5 leading-none">
                            <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 shrink-0">
                              <FiUser size={14}/>
                            </div>
                            {r.first_name} {r.last_name}
                          </div>
                          
                          <div className="flex flex-wrap gap-1.5 pl-10">
                            {[1, 2, 3, 4].map(wNum => {
                              const tName = turnsByWeek[wNum];
                              if (!tName) return null;
                              return (
                                <div key={wNum} className="flex items-center gap-1.5 bg-gray-50 px-2 py-1 rounded-md border border-gray-100/50">
                                  <span className="text-[8px] font-black text-gray-400 uppercase tracking-tighter shrink-0">S{wNum}</span>
                                  <span className="text-[9px] font-bold text-gray-700 uppercase truncate max-w-[120px]">{tName}</span>
                                </div>
                              );
                            })}
                          </div>
                      </div>
                    </td>
                    
                    {/* 🚩 DISEÑO DE CALENDARIO EN CAJA GRIS */}
                    <td className="p-6">
                      <div className="bg-gray-50/50 p-4 rounded-3xl border border-gray-50 inline-block">
                        <MonthlyStatus scheduledDays={r.scheduled_items} />
                      </div>
                    </td>
                    
                    <td className="p-6 text-center">
                      <div className="flex justify-center">{getStatusBadge(r.displayStatus)}</div>
                    </td>
                    <td className="p-6 text-right">
                      <button onClick={() => { setSelectedRoute(r); setIsModalOpen(true); }} className="p-3.5 bg-gray-50 text-gray-400 hover:bg-[#87be00] hover:text-white rounded-xl shadow-sm transition-all border border-gray-100 hover:border-transparent">
                        <FiEdit3 size={16}/>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      
      {/* 📱 VISTA MÓVIL (TARJETAS PREMIUM) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 lg:hidden">
        {groupedRoutes.map((r) => {
          const turnsByWeek = {};
          r.scheduled_items.forEach(item => {
            if (!turnsByWeek[item.week]) turnsByWeek[item.week] = item.turno;
          });

          return (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} key={`${r.user_id}-${r.local_id}-mobile`} className="bg-white p-6 rounded-[2.5rem] shadow-sm hover:shadow-md transition-shadow border border-gray-100 flex flex-col gap-5">
              
              <div className="flex justify-between items-start">
                <div className="pr-4">
                  <p className="font-black text-gray-900 uppercase italic leading-tight text-sm">{r.cadena}</p>
                  <p className="text-[11px] font-medium text-gray-400 mt-1">{r.direccion}</p>
                  <span className="inline-block mt-3 px-3 py-1.5 bg-gray-100 text-gray-600 text-[9px] font-black rounded-lg tracking-widest">{r.codigo_local}</span>
                </div>
                <div className="flex flex-col items-end gap-3 shrink-0">
                  {getStatusBadge(r.displayStatus)}
                  <button onClick={() => { setSelectedRoute(r); setIsModalOpen(true); }} className="p-2.5 bg-gray-50 text-gray-400 hover:bg-[#87be00] hover:text-white rounded-xl shadow-sm transition-all">
                    <FiEdit3 size={16}/>
                  </button>
                </div>
              </div>
              
              <hr className="border-gray-50" />

              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 shrink-0">
                  <FiUser size={16}/>
                </div>
                <div>
                  <p className="font-black text-gray-800 uppercase text-[11px] leading-none mb-1.5">{r.first_name} {r.last_name}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {[1, 2, 3, 4].map(wNum => {
                      const tName = turnsByWeek[wNum];
                      if (!tName) return null;
                      return (
                        <div key={wNum} className="flex items-center gap-1.5 bg-gray-50 px-2 py-1 rounded-md border border-gray-100/50">
                          <span className="text-[8px] font-black text-gray-400 uppercase tracking-tighter">S{wNum}</span>
                          <span className="text-[9px] font-bold text-gray-700 uppercase">{tName}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="bg-gray-50/50 p-4 rounded-3xl border border-gray-50 mt-1">
                <div className="overflow-visible pb-1">
                  <MonthlyStatus scheduledDays={r.scheduled_items} />
                </div>
              </div>

            </motion.div>
          )
        })}
      </div>

      <ManageRoutesModal 
        isOpen={isModalOpen} 
        onClose={() => { setIsModalOpen(false); setSelectedRoute(null); }} 
        users={users} locales={locales} companies={companies} onCreated={fetchData} initialData={selectedRoute} 
      />
    </div>
  );
};

export default Planificacion;