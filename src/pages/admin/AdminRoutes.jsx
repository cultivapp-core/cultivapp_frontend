import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useAuth } from "../../context/AuthContext";
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
  FiX,
  FiUsers,
  FiCalendar,
  FiGlobe, 
  FiMapPin,
  FiTrash2,
  FiXCircle,
  FiBriefcase
} from "react-icons/fi";
import * as XLSX from "xlsx";
import { motion, AnimatePresence } from "framer-motion";
import { getWeeksOfMonthCalendar } from "../../utils/helper";

/**
 * 📅 COMPONENTE: VISUALIZADOR MENSUAL CON TOOLTIP DINÁMICO
 */
const MonthlyStatus = ({ scheduledDays = [] }) => {
  const weeks = useMemo(() => getWeeksOfMonthCalendar(new Date()), []);
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
      {weeks.map((week, index) => (
        <div key={week.id} className="flex items-center gap-3">
          <span className="text-[10px] font-black text-gray-400 w-4 tracking-tighter">S{index + 1}</span>
          <div className="flex gap-1.5">
            {days.map((d) => {
              const scheduleInfo = scheduledDays.find(
                (item) => parseInt(item.day) === d.id && parseInt(item.week) === week.id
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

                  {isActive && (
                    <div className="absolute bottom-[110%] left-1/2 -translate-x-1/2 mb-1 invisible opacity-0 group-hover:visible group-hover:opacity-100 pointer-events-none transition-all duration-200 z-[99999]">
                      <div className="bg-gray-900 text-white text-[9px] px-3 py-2 rounded-xl shadow-xl border border-white/10 whitespace-nowrap flex flex-col items-center gap-1">
                        <span className="font-black text-white uppercase text-[8px] tracking-widest border-b border-gray-700 pb-1 mb-0.5">
                          {scheduleInfo.userName}
                        </span>
                        <span className="font-black text-[#87be00] uppercase text-[7px] tracking-widest">
                          {scheduleInfo.turno || 'Planificado'}
                        </span>
                        <span className="font-bold text-[8px] text-gray-300">
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


const ContractExpirationModal = ({
  isOpen,
  alerts,
  onClose
}) => {
  if (!isOpen) return null;

  const redAlerts = alerts.filter(
    (item) => item.level === "RED"
  );

  const yellowAlerts = alerts.filter(
    (item) => item.level === "YELLOW"
  );

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[300] flex items-center justify-center bg-black/55 backdrop-blur-sm p-4 font-[Outfit]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <motion.div
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="contract-alert-title"
          initial={{ opacity: 0, scale: 0.94, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 20 }}
          transition={{ duration: 0.22 }}
          className="w-full max-w-2xl max-h-[88vh] overflow-hidden rounded-[2rem] bg-white shadow-2xl border border-gray-100"
        >
          <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                redAlerts.length > 0
                  ? "bg-red-50 text-red-500"
                  : "bg-amber-50 text-amber-500"
              }`}>
                <FiAlertCircle size={24} />
              </div>

              <div>
                <p className="text-[9px] font-black uppercase tracking-[0.25em] text-gray-400">
                  Cultivapp
                </p>

                <h2
                  id="contract-alert-title"
                  className="text-xl font-black uppercase italic tracking-tight text-gray-900"
                >
                  Contratos próximos a vencer
                </h2>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-2.5 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-all"
              aria-label="Cerrar alerta"
            >
              <FiX size={20} />
            </button>
          </div>

          <div className="p-6 overflow-y-auto max-h-[62vh] space-y-5">
            {redAlerts.length > 0 && (
              <section className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-[11px] font-black uppercase tracking-widest text-red-500">
                      Atención urgente
                    </h3>

                    <p className="text-xs font-medium text-gray-500 mt-1">
                      Contratos que vencen dentro de 2 días.
                    </p>
                  </div>

                  <span className="min-w-8 h-8 px-2 rounded-xl bg-red-50 text-red-500 border border-red-100 flex items-center justify-center text-xs font-black">
                    {redAlerts.length}
                  </span>
                </div>

                <div className="space-y-2">
                  {redAlerts.map((item) => (
                    <div
                      key={`red-${item.id}`}
                      className="rounded-2xl border border-red-100 bg-red-50/70 px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-black uppercase italic tracking-tight text-gray-900 truncate">
                          {item.name}
                        </p>

                        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mt-1">
                          {item.roleLabel}
                        </p>
                      </div>

                      <div className="sm:text-right shrink-0">
                        <p className="text-[10px] font-black uppercase tracking-widest text-red-500">
                          {item.daysRemaining === 0
                            ? "Vence hoy"
                            : item.daysRemaining === 1
                              ? "Vence mañana"
                              : `Vence en ${item.daysRemaining} días`}
                        </p>

                        <p className="text-[10px] font-bold text-gray-500 mt-1">
                          {item.formattedEndDate}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {yellowAlerts.length > 0 && (
              <section className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-[11px] font-black uppercase tracking-widest text-amber-500">
                      Aviso preventivo
                    </h3>

                    <p className="text-xs font-medium text-gray-500 mt-1">
                      Contratos que vencen entre 3 y 5 días.
                    </p>
                  </div>

                  <span className="min-w-8 h-8 px-2 rounded-xl bg-amber-50 text-amber-500 border border-amber-100 flex items-center justify-center text-xs font-black">
                    {yellowAlerts.length}
                  </span>
                </div>

                <div className="space-y-2">
                  {yellowAlerts.map((item) => (
                    <div
                      key={`yellow-${item.id}`}
                      className="rounded-2xl border border-amber-100 bg-amber-50/70 px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-black uppercase italic tracking-tight text-gray-900 truncate">
                          {item.name}
                        </p>

                        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mt-1">
                          {item.roleLabel}
                        </p>
                      </div>

                      <div className="sm:text-right shrink-0">
                        <p className="text-[10px] font-black uppercase tracking-widest text-amber-600">
                          Vence en {item.daysRemaining} días
                        </p>

                        <p className="text-[10px] font-bold text-gray-500 mt-1">
                          {item.formattedEndDate}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>

          <div className="px-6 py-5 border-t border-gray-100 bg-gray-50/60">
            <button
              type="button"
              onClick={onClose}
              className="w-full bg-[#87be00] hover:bg-[#76a600] text-white py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-[#87be00]/20 transition-all"
            >
              Entendido
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

const AdminRoutes = () => {
  const { user } = useAuth();
  const [routes, setRoutes] = useState([]);
  const [users, setUsers] = useState([]);
  const [locales, setLocales] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedRoute, setSelectedRoute] = useState(null);
  const [loading, setLoading]           = useState(true);

  const [contractAlerts, setContractAlerts] = useState([]);
  const [isContractAlertOpen, setIsContractAlertOpen] = useState(false);

  const CULTIVA_COMPANY_ID = "0e342e01-d213-4353-b210-39a12ac335cf";

  const isCultivaAdmin =
    user?.role === "ADMIN_CLIENTE" &&
    user?.company_id === CULTIVA_COMPANY_ID;
  
  const [filterDate, setFilterDate] = useState("");
  const [filterCompany, setFilterCompany] = useState("");
  const [searchTerm, setSearchTerm]     = useState("");
  const [filterUser, setFilterUser]     = useState("");
  const [selectedRegion, setSelectedRegion] = useState("");
  const [selectedComuna, setSelectedComuna] = useState("");

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

  const getLocalDateKey = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const contractExpirationAlerts = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const roleLabels = {
      USUARIO: "Mercaderista",
      USER: "Mercaderista",
      SUPERVISOR: "Supervisor",
      VIEW: "Viewer",
      ADMIN_CLIENTE: "Administrador Cliente",
      ROOT: "Root"
    };

    return (users || [])
      .map((userItem) => {
        const rawEndDate =
          userItem.fecha_termino_contrato ||
          userItem.contract_end_date ||
          userItem.end_contract_date ||
          userItem.fecha_fin_contrato;

        if (!rawEndDate) return null;

        const endDate = new Date(
          String(rawEndDate).slice(0, 10) + "T12:00:00"
        );

        if (Number.isNaN(endDate.getTime())) return null;

        endDate.setHours(0, 0, 0, 0);

        const diffMs = endDate.getTime() - today.getTime();
        const daysRemaining = Math.ceil(
          diffMs / (1000 * 60 * 60 * 24)
        );

        if (daysRemaining < 0 || daysRemaining > 5) {
          return null;
        }

        const firstName =
          userItem.first_name ||
          userItem.nombre ||
          "";

        const lastName =
          userItem.last_name ||
          userItem.apellido ||
          "";

        const name =
          `${firstName} ${lastName}`.trim() ||
          userItem.email ||
          "Usuario sin nombre";

        return {
          id: userItem.id,
          name,
          role: userItem.role,
          roleLabel:
            roleLabels[userItem.role] ||
            userItem.role ||
            "Colaborador",
          daysRemaining,
          level:
            daysRemaining <= 2
              ? "RED"
              : "YELLOW",
          endDateKey: getLocalDateKey(endDate),
          formattedEndDate:
            endDate.toLocaleDateString("es-CL", {
              day: "2-digit",
              month: "long",
              year: "numeric"
            })
        };
      })
      .filter(Boolean)
      .sort((a, b) => {
        if (a.daysRemaining !== b.daysRemaining) {
          return a.daysRemaining - b.daysRemaining;
        }

        return a.name.localeCompare(b.name, "es");
      });
  }, [users]);

  useEffect(() => {
    setContractAlerts(contractExpirationAlerts);

    if (contractExpirationAlerts.length === 0) {
      setIsContractAlertOpen(false);
      return;
    }

    /*
     * Se muestra una vez por sesión y por día.
     * El usuario puede volver a verla recargando la aplicación
     * o iniciando una nueva sesión del navegador.
     */
    const todayKey = getLocalDateKey(new Date());
    const storageKey = `cultivapp_contract_alert_${todayKey}`;
    const wasShown = sessionStorage.getItem(storageKey);

    if (!wasShown) {
      setIsContractAlertOpen(true);
      sessionStorage.setItem(storageKey, "true");
    }
  }, [contractExpirationAlerts]);

  const handleDeleteRoute = async (group) => {
    const routeIds = group.route_ids || [group.id];
    if (routeIds.length === 0) return;

  const confirmDelete = async () => {
    if (!groupToDelete) return;
    const routeIds = groupToDelete.route_ids || [groupToDelete.id];
    if (routeIds.length === 0) return;

    const toastId = toast.loading("Eliminando planificación...");
    try {
      await Promise.all(routeIds.map(id => api.delete(`/routes/${id}`)));
      toast.success("Planificación eliminada correctamente", { id: toastId });
      fetchData();
    } catch (error) {
      console.error("❌ Error al eliminar rutas:", error);
      toast.error("Error al eliminar la planificación", { id: toastId });
    } finally {
      setGroupToDelete(null);
    }
  };

  const weekRanges = useMemo(() => {
    const weeks = getWeeksOfMonthCalendar(new Date());
    return weeks.map((w, index) => {
      const start = w.start;
      const end = w.end;
      return { 
          weekNum: w.id, 
          label: `S${index + 1}`, 
          dates: `${start.getDate()} ${start.toLocaleDateString('es-CL', { month: 'short' })} - ${end.getDate()} ${end.toLocaleDateString('es-CL', { month: 'short' })}` 
      };
    });
  }, []);

  const targetDateInfo = useMemo(() => {
    if (!filterDate) return null;
    const selected = new Date(filterDate + "T12:00:00");
    const weeks = getWeeksOfMonthCalendar(selected);
    const found = weeks.find(w => selected >= w.start && selected <= w.end);
    
    return found ? { weekNum: found.id, dayId: selected.getDay() } : null;
  }, [filterDate]);

  const activeWeekByDate = targetDateInfo ? targetDateInfo.weekNum : null;

  const uniqueMercaderistas = useMemo(() => {
    // Extracción tolerante en caso de que el backend no mande nombres en routes
    const names = routes.map(r => {
      const userData = users.find(u => String(u.id) === String(r.user_id)) || {};
      const fName = r.first_name || userData.first_name || userData.nombre || '';
      const lName = r.last_name || userData.last_name || userData.apellido || '';
      return `${fName} ${lName}`.trim();
    }).filter(Boolean);
    return [...new Set(names)].sort();
  }, [routes, users]);

  const regions = useMemo(() => {
    return [...new Set(locales.map(l => l.region_name || l.region).filter(Boolean))].sort();
  }, [locales]);

  const comunas = useMemo(() => {
    return [...new Set(locales
      .filter(l => !selectedRegion || (l.region_name || l.region) === selectedRegion)
      .map(l => l.comuna_name || l.comuna)
      .filter(Boolean))].sort();
  }, [locales, selectedRegion]);

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

  // AGRUPACIÓN Y FILTRADO
  const groupedRoutes = useMemo(() => {
    const groups = {};
    const search = searchTerm.toLowerCase();
    
    const monthWeeks = getWeeksOfMonthCalendar(new Date());

    routes.forEach((r) => {
      if (!r.local_id) return;

      if (isCultivaAdmin && filterCompany && String(r.company_id) !== String(filterCompany)) return;

      // 🚩 CRUCE DE DATOS MANUAL: Por si el backend nos manda la ruta sin nombres (sin JOIN)
      const localData = locales.find(l => String(l.id) === String(r.local_id)) || {};
      const userData = users.find(u => String(u.id) === String(r.user_id)) || {};

      const region = localData?.region_name || localData?.region || "";
      const comuna = localData?.comuna_name || localData?.comuna || "";

      if (selectedRegion && region !== selectedRegion) return;
      if (selectedComuna && comuna !== selectedComuna) return;
      
      const cadenaStr = r.cadena || localData.cadena || localData.nombre || 'LOCAL DESCONOCIDO';
      const direccionStr = r.direccion || localData.direccion || 'Sin dirección';
      const codigoStr = r.codigo_local || localData.codigo_local || localData.codigo || 'S/C';

      const fName = r.first_name || userData.first_name || userData.nombre || '';
      const lName = r.last_name || userData.last_name || userData.apellido || '';
      const fullName = `${fName} ${lName}`.trim() || 'Sin Asignar';

      const matchText = 
        cadenaStr.toLowerCase().includes(search) ||
        direccionStr.toLowerCase().includes(search) ||
        String(codigoStr).toLowerCase().includes(search) ||
        fullName.toLowerCase().includes(search);
        
      const matchUser = !filterUser || fullName === filterUser;

      if (!matchText || !matchUser) return;

      const key = r.schedule_group_id ? `group-${r.schedule_group_id}` : `local-${r.local_id}`;
      
      let finalWeek = 1;
      let finalDay = null;

      const exactDate = r.fecha || r.date || r.fecha_planificacion;
      if (exactDate) {
        const d = new Date(exactDate + "T12:00:00"); 
        finalDay = d.getDay();
        const wFound = monthWeeks.find(w => d >= w.start && d <= w.end);
        if (wFound) finalWeek = wFound.id;
      }

      let rawWeek = r.week_number ?? r.weekNumber ?? r.week ?? r.semana ?? r.numero_semana;
      if (rawWeek !== undefined && rawWeek !== null) {
        if (typeof rawWeek === 'string') rawWeek = rawWeek.replace(/\D/g, ''); 
        if (parseInt(rawWeek)) finalWeek = parseInt(rawWeek);
      }

      let rawDay = r.day_of_week ?? r.dayOfWeek ?? r.day ?? r.dia;
      if (rawDay !== undefined && rawDay !== null) {
        finalDay = parseInt(rawDay);
      }

      const hasDay = finalDay !== null && !isNaN(finalDay);

      const startTime = r.start_time ?? r.startTime ?? r.entrada;
      const endTime = r.end_time ?? r.endTime ?? r.salida;
      const turnName = r.nombre_turno ?? r.nombreTurno ?? r.turno_id ?? 'Turno';

      if (!groups[key]) {
        groups[key] = {
          ...r, 
          cadena: cadenaStr,          // Forzamos los datos cruzados para evitar filas fantasmas
          direccion: direccionStr,    
          codigo_local: codigoStr,    
          id: r.id, 
          route_ids: [r.id], 
          route_ids_by_user: { [r.user_id]: r.id },
          users: new Set([fullName]), 
          scheduled_items: hasDay ? [{ 
            day: finalDay, 
            week: finalWeek, 
            time: startTime,      
            endTime: endTime,    
            turno: `${startTime?.slice(0,5) || '00:00'} - ${endTime?.slice(0,5) || '00:00'}`,
            userName: fullName,
            user_id: r.user_id,
            turno_id: r.nombre_turno
          }] : [],
          all_statuses: [r.status],
        };
      } else {
        groups[key].users.add(fullName);
        groups[key].route_ids.push(r.id); 
        groups[key].route_ids_by_user[r.user_id] = r.id;
        
        if (hasDay) {
          const exists = groups[key].scheduled_items.some(
            item => parseInt(item.day) === finalDay && parseInt(item.week) === finalWeek && String(item.user_id) === String(r.user_id)
          );
          if (!exists) {
            groups[key].scheduled_items.push({ 
              day: finalDay, 
              week: finalWeek, 
              time: startTime,
              endTime: endTime,
              turno: r.origin === 'INDIVIDUAL' ? 'Individual' : turnName,
              userName: fullName,
              user_id: r.user_id,
              turno_id: r.nombre_turno
            });
          }
        }
        groups[key].all_statuses.push(r.status);
      }
    });

    return Object.values(groups).map(group => ({
      ...group,
      users: Array.from(group.users), 
      displayStatus: group.all_statuses.includes('IN_PROGRESS') ? 'IN_PROGRESS' : 
                     group.all_statuses.includes('INCOMPLETE') ? 'INCOMPLETE' :
                     group.all_statuses.every(s => s === 'COMPLETED' || s === 'OK') ? 'COMPLETED' : 
                     group.all_statuses.some(s => s === 'COMPLETED' || s === 'OK') ? 'PARTIAL' : 'PENDING'
    })).filter(group => {
      if (!targetDateInfo) return true; 
      return group.scheduled_items.some(item => 
        parseInt(item.week) === targetDateInfo.weekNum &&
        parseInt(item.day) === targetDateInfo.dayId
      );
    });

  }, [routes, searchTerm, filterUser, filterCompany, isCultivaAdmin, targetDateInfo, selectedRegion, selectedComuna, locales, users]);

  const getStatusBadge = (status) => {
    const config = {
      COMPLETED: { bg: 'bg-green-50', text: 'text-green-600', border: 'border-green-200', icon: <FiCheckCircle/>, label: 'Completado' },
      IN_PROGRESS: { bg: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-200', icon: <FiPlayCircle className="animate-pulse"/>, label: 'En Curso' },
      PARTIAL: { bg: 'bg-indigo-50', text: 'text-indigo-600', border: 'border-indigo-200', icon: <FiRefreshCw/>, label: 'Parcial' },
      INCOMPLETE: { bg: 'bg-red-50', text: 'text-red-500', border: 'border-red-200', icon: <FiXCircle/>, label: 'Incompleto' },
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
      <div className="flex flex-col bg-white p-6 md:p-8 rounded-[2rem] shadow-sm hover:shadow-md transition-shadow border border-gray-100 gap-6">
        
        <div className="flex flex-col lg:flex-row justify-between gap-6">
          <div className="flex-1 w-full overflow-hidden">
            <h1 className="text-xl md:text-2xl font-black text-gray-900 uppercase italic leading-none">Planificación Mensual</h1>
            <div className="flex overflow-x-auto gap-3 mt-5 pb-2 custom-scrollbar">
              {weekRanges.map((w, idx) => (
                <div key={idx} className={`flex flex-col gap-1 px-4 py-2.5 rounded-xl border shrink-0 min-w-[110px] transition-all ${activeWeekByDate === w.weekNum ? 'bg-[#87be00] border-[#87be00] text-white shadow-md' : 'bg-gray-50 border-gray-100/50'}`}>
                  <span className={`text-[10px] font-black ${activeWeekByDate === w.weekNum ? 'text-white' : 'text-gray-900'}`}>{w.label}</span>
                  <span className={`text-[9px] font-bold uppercase leading-none ${activeWeekByDate === w.weekNum ? 'text-white/80' : 'text-gray-400'}`}>{w.dates}</span>
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

        <div className={`grid grid-cols-1 md:grid-cols-2 ${isCultivaAdmin ? 'lg:grid-cols-6' : 'lg:grid-cols-5'} gap-4 pt-4 border-t border-gray-50`}>
          
          {isCultivaAdmin && (
            <div className="relative">
              <FiBriefcase className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <select 
                className={`w-full pl-12 pr-10 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-[10px] font-black uppercase outline-none focus:bg-white focus:border-[#87be00]/40 transition-all shadow-inner appearance-none cursor-pointer ${filterCompany ? 'text-[#87be00]' : 'text-gray-500'}`}
                value={filterCompany} 
                onChange={(e) => setFilterCompany(e.target.value)}
              >
                <option value="">TODAS LAS EMPRESAS</option>
                {companies.map(c => <option key={c.id} value={c.id}>{c.name || c.nombre || 'Empresa'}</option>)}
              </select>
              <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                <svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 9l-7 7-7-7"></path></svg>
              </div>
              {filterCompany && <button onClick={() => setFilterCompany("")} className="absolute right-8 top-1/2 -translate-y-1/2 text-gray-400 hover:text-red-500 pointer-events-auto"><FiX size={14}/></button>}
            </div>
          )}

          <div className="relative">
            <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input type="text" placeholder="BUSCAR LOCAL O CÓDIGO..." className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-[10px] font-black uppercase outline-none focus:bg-white focus:border-[#87be00]/40 transition-all shadow-inner" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            {searchTerm && <button onClick={() => setSearchTerm("")} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-red-500"><FiX size={14}/></button>}
          </div>

          <div className="relative">
            <FiGlobe className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <select 
              className={`w-full pl-12 pr-10 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-[10px] font-black uppercase outline-none focus:bg-white focus:border-[#87be00]/40 transition-all shadow-inner appearance-none cursor-pointer ${selectedRegion ? 'text-[#87be00]' : 'text-gray-500'}`}
              value={selectedRegion} 
              onChange={(e) => {
                setSelectedRegion(e.target.value);
                setSelectedComuna("");
              }}
            >
              <option value="">TODAS LAS REGIONES</option>
              {regions.map(r => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
              <svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 9l-7 7-7-7"></path></svg>
            </div>
            {selectedRegion && <button onClick={() => { setSelectedRegion(""); setSelectedComuna(""); }} className="absolute right-8 top-1/2 -translate-y-1/2 text-gray-400 hover:text-red-500 pointer-events-auto"><FiX size={14}/></button>}
          </div>

          <div className="relative">
            <FiMapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <select 
              className={`w-full pl-12 pr-10 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-[10px] font-black uppercase outline-none focus:bg-white focus:border-[#87be00]/40 transition-all shadow-inner appearance-none cursor-pointer ${selectedComuna ? 'text-[#87be00]' : 'text-gray-500'}`}
              value={selectedComuna} 
              onChange={(e) => setSelectedComuna(e.target.value)}
            >
              <option value="">TODAS LAS COMUNAS</option>
              {comunas.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
              <svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 9l-7 7-7-7"></path></svg>
            </div>
            {selectedComuna && <button onClick={() => setSelectedComuna("")} className="absolute right-8 top-1/2 -translate-y-1/2 text-gray-400 hover:text-red-500 pointer-events-auto"><FiX size={14}/></button>}
          </div>

          <div className="relative">
            <FiUsers className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <select 
              className={`w-full pl-12 pr-10 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-[10px] font-black uppercase outline-none focus:bg-white focus:border-[#87be00]/40 transition-all shadow-inner appearance-none cursor-pointer ${filterUser ? 'text-[#87be00]' : 'text-gray-500'}`}
              value={filterUser} 
              onChange={(e) => setFilterUser(e.target.value)}
            >
              <option value="">TODOS LOS REPONEDORES</option>
              {uniqueMercaderistas.map(u => (
                <option key={u} value={u}>{u}</option>
              ))}
            </select>
            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
              <svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 9l-7 7-7-7"></path></svg>
            </div>
            {filterUser && <button onClick={() => setFilterUser("")} className="absolute right-8 top-1/2 -translate-y-1/2 text-gray-400 hover:text-red-500 pointer-events-auto"><FiX size={14}/></button>}
          </div>

          <div className="relative">
            <FiCalendar className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input type="date" className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-[10px] font-black outline-none focus:bg-white focus:border-[#87be00]/40 transition-all shadow-inner cursor-pointer text-gray-500" value={filterDate} onChange={(e) => setFilterDate(e.target.value)} />
            {filterDate && <button onClick={() => setFilterDate("")} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-red-500"><FiX size={14}/></button>}
          </div>

        </div>

      </div>

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
              {groupedRoutes.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-7 py-16 text-center text-sm text-gray-400 font-bold">
                    No se encontraron rutas con los filtros seleccionados.
                  </td>
                </tr>
              ) : (
                groupedRoutes.map((r, index) => {
                  const turnsByWeek = {};
                  r.scheduled_items.forEach(item => {
                    if (!turnsByWeek[item.week]) {
                      turnsByWeek[item.week] = item.turno;
                    }
                  });

                  return (
                    <tr key={`desk-${index}`} className="hover:bg-gray-50/50 transition-colors group/row">
                      <td className="p-6">
                        <div className="min-w-0">
                          <p className="font-black text-gray-900 uppercase italic leading-none text-[13px]">{r.cadena}</p>
                          <p className="text-[12px] font-medium text-gray-400 mt-1.5 truncate max-w-xs">{r.direccion}</p>
                          <span className="inline-block mt-3 px-2.5 py-1 bg-gray-100 text-gray-600 text-[9px] font-black rounded-lg tracking-widest border border-gray-200/50">{r.codigo_local}</span>
                        </div>
                      </td>
                      
                      <td className="p-6">
                        <div className="flex flex-col gap-3">
                            <div className="font-black text-gray-800 uppercase flex items-center gap-2.5 leading-none">
                              <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 shrink-0">
                                <FiUser size={14}/>
                              </div>
                              <span className="truncate max-w-[200px]">
                                {r.users.join(' / ')}
                              </span>
                            </div>
                            
                            <div className="flex flex-wrap gap-1.5 pl-10">
                              {[1, 2, 3, 4, 5].map(wNum => {
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
                      
                      <td className="p-6">
                        <div className="bg-gray-50/50 p-4 rounded-3xl border border-gray-50 inline-block">
                          <MonthlyStatus scheduledDays={r.scheduled_items} />
                        </div>
                      </td>
                      
                      <td className="p-6 text-center">
                        <div className="flex justify-center">{getStatusBadge(r.displayStatus)}</div>
                      </td>

                      <td className="p-6 text-right">
                        <div className="flex justify-end items-center gap-2 min-w-[95px] inline-flex">
                          <button 
                            onClick={() => { setSelectedRoute(r); setIsModalOpen(true); }} 
                            className="p-3.5 bg-gray-50 text-gray-400 hover:bg-[#87be00] hover:text-white rounded-xl shadow-sm transition-all border border-gray-100 hover:border-transparent"
                            title="Editar"
                          >
                            <FiEdit3 size={16}/>
                          </button>
                          <button 
                            onClick={() => handleDeleteRoute(r)} 
                            className="p-3.5 bg-red-50 text-red-500 hover:bg-red-600 hover:text-white rounded-xl shadow-sm transition-all border border-red-100 hover:border-transparent"
                            title="Eliminar"
                          >
                            <FiTrash2 size={16}/>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 lg:hidden">
        {groupedRoutes.length === 0 ? (
          <div className="col-span-1 md:col-span-2 py-16 text-center text-sm text-gray-400 font-bold bg-white rounded-[2.5rem] border border-gray-100">
            No se encontraron rutas con los filtros seleccionados.
          </div>
        ) : (
          groupedRoutes.map((r, index) => {
            const turnsByWeek = {};
            r.scheduled_items.forEach(item => {
              if (!turnsByWeek[item.week]) turnsByWeek[item.week] = item.turno;
            });

            return (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} key={`mob-${index}`} className="bg-white p-6 rounded-[2.5rem] shadow-sm hover:shadow-md transition-shadow border border-gray-100 flex flex-col gap-5">
                
                <div className="flex justify-between items-start">
                  <div className="pr-4">
                    <p className="font-black text-gray-900 uppercase italic leading-tight text-sm">{r.cadena}</p>
                    <p className="text-[11px] font-medium text-gray-400 mt-1">{r.direccion}</p>
                    <span className="inline-block mt-3 px-3 py-1.5 bg-gray-100 text-gray-600 text-[9px] font-black rounded-lg tracking-widest">{r.codigo_local}</span>
                  </div>
                  <div className="flex flex-col items-end gap-3 shrink-0">
                    {getStatusBadge(r.displayStatus)}
                    
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => { setSelectedRoute(r); setIsModalOpen(true); }} 
                        className="p-2.5 bg-gray-50 text-gray-400 hover:bg-[#87be00] hover:text-white rounded-xl shadow-sm transition-all border border-gray-100"
                      >
                        <FiEdit3 size={16}/>
                      </button>
                      <button 
                        onClick={() => handleDeleteRoute(r)} 
                        className="p-2.5 bg-red-50 text-red-500 hover:bg-red-600 hover:text-white rounded-xl shadow-sm transition-all border border-red-100"
                      >
                        <FiTrash2 size={16}/>
                      </button>
                    </div>
                  </div>
                </div>
                
                <hr className="border-gray-50" />

                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 shrink-0">
                    <FiUser size={16}/>
                  </div>
                  <div>
                    <p className="font-black text-gray-800 uppercase text-[11px] leading-none mb-1.5">
                      {r.users.join(' / ')}
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {[1, 2, 3, 4, 5].map(wNum => {
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
          })
        )}
      </div>

      <ContractExpirationModal
        isOpen={isContractAlertOpen}
        alerts={contractAlerts}
        onClose={() => setIsContractAlertOpen(false)}
      />

      <ManageRoutesModal 
        isOpen={isModalOpen} 
        onClose={() => { setIsModalOpen(false); setSelectedRoute(null); }} 
        users={users} locales={locales} companies={companies} onCreated={fetchData} initialData={selectedRoute} 
      />

      {/* RENDER DEL MODAL DE ELIMINACIÓN */}
      {groupToDelete && (
        <DeleteRouteModal 
          group={groupToDelete} 
          onClose={() => setGroupToDelete(null)} 
          onConfirm={confirmDelete} 
        />
      )}
    </div>
  );
};

/* SUBCOMPONENTE: MODAL DE ELIMINACIÓN DE RUTA */
const DeleteRouteModal = ({ group, onClose, onConfirm }) => {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleConfirm = async () => {
    setIsDeleting(true);
    await onConfirm();
    setIsDeleting(false);
  };

  return (
    <div className="fixed inset-0 bg-[#111111]/70 backdrop-blur-sm flex items-center justify-center p-4 z-[9999] font-[Outfit]">
      <div className="bg-white w-full max-w-md rounded-2xl border border-gray-100 shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200 p-6 relative">
        
        <button onClick={onClose} className="absolute top-4 right-4 p-1.5 bg-gray-50 hover:bg-gray-100 text-gray-400 hover:text-gray-600 rounded-lg transition-all">
          <FiX size={16} />
        </button>

        <div className="flex flex-col items-center text-center mt-3">
          <div className="w-12 h-12 bg-red-50 text-red-600 rounded-xl flex items-center justify-center mb-4">
            <FiAlertCircle size={24} />
          </div>
          
          <h3 className="text-base font-extrabold text-[#111111] uppercase tracking-tight">
            ¿Confirmar Eliminación?
          </h3>
          
          <p className="text-xs text-gray-500 mt-2 leading-relaxed">
            Se eliminarán permanentemente <strong>{group.route_ids?.length || 1} asignaciones</strong> asociadas al punto de venta <strong className="text-gray-800 uppercase font-bold">{group.cadena}</strong>. Esta acción no se puede deshacer.
          </p>
          
          <div className="bg-gray-50 border border-gray-100 rounded-xl p-2.5 mt-3 w-full flex items-center justify-center gap-2">
            <span className="text-[9px] font-extrabold text-gray-400 uppercase tracking-wider">Código: {group.codigo_local}</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 mt-6">
          <button 
            onClick={onClose} 
            disabled={isDeleting}
            className="w-full py-3 bg-gray-50 hover:bg-gray-100 text-gray-500 font-bold uppercase text-[10px] tracking-wider rounded-xl transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          
          <button
            onClick={handleConfirm}
            disabled={isDeleting}
            className="w-full bg-red-600 hover:bg-red-700 text-white py-3 rounded-xl font-bold uppercase tracking-wider text-[10px] transition-all flex items-center justify-center gap-1.5 shadow-sm disabled:opacity-50"
          >
            {isDeleting ? (
              <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
            ) : (
              <> <FiTrash2 size={13} /> Eliminar </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminRoutes;