import React, { useState, useMemo, useEffect, useRef } from "react";
import {
  FiClock, FiX, FiUser, FiBriefcase,
  FiTrash2, FiLoader, FiCheckCircle, FiLayers, FiCalendar, FiMapPin, FiEdit3, FiInfo, FiSearch, FiCopy
} from "react-icons/fi";
import api from "../api/apiClient";
import toast from "react-hot-toast";

const DAYS_OF_WEEK = [
  { id: 1, label: "Lunes", short: "L" }, { id: 2, label: "Martes", short: "M" }, 
  { id: 3, label: "Miércoles", short: "X" }, { id: 4, label: "Jueves", short: "J" }, 
  { id: 5, label: "Viernes", short: "V" }, { id: 6, label: "Sábado", short: "S" }, 
  { id: 0, label: "Domingo", short: "D" },
];

const WEEKS = [1, 2, 3, 4];

const ROLES_TURNOS = [
  { id: "MERCADERISTA FULL", label: "Mercaderista Full Time" },
  { id: "MERCADERISTA PT",   label: "Mercaderista Part Time" },
];

const getCurrentWeekNumber = () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();
  let firstDay = new Date(year, month, 1);
  let dayOfWeek = firstDay.getDay() === 0 ? 7 : firstDay.getDay();
  let firstMonday = new Date(firstDay);
  if (dayOfWeek !== 1) firstMonday.setDate(1 + (8 - dayOfWeek));

  const diffWeeks = Math.floor((today.getTime() - firstMonday.getTime()) / (1000 * 60 * 60 * 24 * 7));
  const calculatedWeek = diffWeeks < 0 ? 1 : Math.min(diffWeeks + 1, 4);
  return calculatedWeek;
};

// ─── COMPONENTE SELECTOR DE HORA EN FORMATO 24H ───────────────────────────────
const TimePicker24h = ({ value, onChange, disabled }) => {
  const [hh, mm] = (value || "00:00").split(":");

  const handleChange = (type, val) => {
    const newHH = type === "h" ? val.padStart(2, "0") : hh;
    const newMM = type === "m" ? val.padStart(2, "0") : mm;
    onChange({ target: { value: `${newHH}:${newMM}` } });
  };

  return (
    <div
      className={`flex items-center justify-center gap-1 w-full bg-white border border-blue-100 rounded-xl px-3 py-2.5 transition-all ${
        disabled ? "opacity-50 cursor-not-allowed" : "hover:border-blue-300"
      }`}
    >
      <select
        disabled={disabled}
        className="bg-transparent text-xs font-bold outline-none cursor-pointer text-gray-800"
        value={hh}
        onChange={(e) => handleChange("h", e.target.value)}
      >
        {Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0")).map((h) => (
          <option key={h} value={h}>{h}</option>
        ))}
      </select>
      <span className="text-xs font-black text-gray-400 select-none">:</span>
      <select
        disabled={disabled}
        className="bg-transparent text-xs font-bold outline-none cursor-pointer text-gray-800"
        value={mm}
        onChange={(e) => handleChange("m", e.target.value)}
      >
        {["00", "05", "10", "15", "20", "25", "30", "35", "40", "45", "50", "55"].map((m) => (
          <option key={m} value={m}>{m}</option>
        ))}
      </select>
    </div>
  );
};
// ──────────────────────────────────────────────────────────────────────────────

const ManageRoutesModal = ({
  isOpen, onClose,
  users = [], locales = [], companies = [],
  onCreated, initialData = null,
}) => {
  const isEditing = !!initialData;
  const [loading, setLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [turnosRaw, setTurnosRaw] = useState([]);

  const userString = localStorage.getItem("user");
  const currentUser = userString ? JSON.parse(userString) : null;
  const isRoot = currentUser?.role?.toUpperCase() === "ROOT";

  // 1. DÓNDE
  const [localId, setLocalId] = useState("");
  const [companyId, setCompanyId] = useState(currentUser?.company_id || "");
  const [cadenaFilter, setCadenaFilter] = useState("");
  const [codigoFilter, setCodigoFilter] = useState("");

  // 2. EL PINCEL Y LA SEMANA OBJETIVO
  const [targetWeek, setTargetWeek] = useState(getCurrentWeekNumber());
  const [brush, setBrush] = useState({
    user_id: "",
    rol: "",
    turno_id: "",
    start_time: "08:00",
    end_time: "16:00",
  });

  // 3. EL LIENZO Y HERRAMIENTAS DE LIMPIEZA
  const [matrix, setMatrix] = useState({});
  const [showClearMenu, setShowClearMenu] = useState(false);
  const [eraserMode, setEraserMode] = useState(false);

  // ESTADOS DEL BUSCADOR DE REPONEDOR
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);
  const [userSearchTerm, setUserSearchTerm] = useState("");
  const userDropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (userDropdownRef.current && !userDropdownRef.current.contains(event.target)) {
        setIsUserDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (isOpen) {
      setTargetWeek(getCurrentWeekNumber()); 
      setEraserMode(false);
      setIsUserDropdownOpen(false);
      setUserSearchTerm("");
      
      if (initialData) {
        setLocalId(initialData.local_id || "");
        setCompanyId(initialData.company_id || currentUser?.company_id || "");
        setCadenaFilter("");
        setCodigoFilter("");

        const newMatrix = {};
        let firstBrush = null;

        if (initialData.scheduled_items && initialData.scheduled_items.length > 0) {
          initialData.scheduled_items.forEach(item => {
            const w = parseInt(item.week, 10) || 1;
            const d = parseInt(item.day, 10);
            const key = `${w}-${d}`;
            
            const itemUserId = item.user_id;
            if (!itemUserId) return; 
            
            const cellData = {
              user_id: String(itemUserId), 
              turno_id: item.turno_id || item.turno || (item.turno && item.turno !== "null" ? item.turno : "INDIVIDUAL"),
              start_time: item.time ? item.time.slice(0, 5) : "08:00",
              end_time: item.endTime ? item.endTime.slice(0, 5) : "16:00",
              rol: item.rol || (initialData.nombre_turno?.includes("PT") ? "MERCADERISTA PT" : "MERCADERISTA FULL")
            };

            if (!newMatrix[key]) newMatrix[key] = [];
            if (!newMatrix[key].some(a => String(a.user_id) === String(cellData.user_id))) {
              newMatrix[key].push(cellData);
            }
            if (!firstBrush) firstBrush = cellData;
          });
        }
        setMatrix(newMatrix);
        if (firstBrush) setBrush(prev => prev.user_id ? prev : firstBrush);
      } else {
        setLocalId("");
        setCompanyId(currentUser?.company_id || "");
        setCadenaFilter("");
        setCodigoFilter("");
        setMatrix({});
        setBrush({ user_id: "", rol: "", turno_id: "", start_time: "08:00", end_time: "16:00" });
      }
    }
  }, [isOpen, initialData, currentUser?.company_id]);

  const fetchTurnos = async (cId) => {
    try {
      const targetId = cId || (isRoot ? companyId : currentUser?.company_id);
      if (!targetId) return setTurnosRaw([]);
      const res = await api.get(`/turnos-config?company_id=${targetId}`);
      setTurnosRaw(Array.isArray(res) ? res : []);
    } catch { setTurnosRaw([]); }
  };

  useEffect(() => {
    if (isOpen) fetchTurnos(companyId);
  }, [isOpen, companyId]);

  const turnosAgrupados = useMemo(() => {
    if (!brush.rol || brush.rol === "INDIVIDUAL") return [];
    const filtrados = turnosRaw.filter(t => t.categoria_rol?.toString().toUpperCase() === brush.rol.toUpperCase());
    
    const agrupados = filtrados.reduce((acc, curr) => {
      if (!acc[curr.nombre_turno]) {
        acc[curr.nombre_turno] = { nombre: curr.nombre_turno, entrada: curr.entrada, salida: curr.salida, dias: [] };
      }
      if (curr.day_of_week !== null && curr.day_of_week !== undefined) {
        acc[curr.nombre_turno].dias.push(parseInt(curr.day_of_week, 10));
      }
      return acc;
    }, {});
    
    return Object.values(agrupados);
  }, [turnosRaw, brush.rol]);

  const filteredUsers = useMemo(() => {
    let pool = users.filter((u) => u.role?.toUpperCase() === "USUARIO");
    if (isRoot && companyId) pool = pool.filter((u) => u.company_id === companyId);
    return pool;
  }, [users, companyId, isRoot]);

  const selectedUserText = useMemo(() => {
    if (!brush.user_id) return "1º Elige Reponedor...";
    const u = filteredUsers.find(u => String(u.id) === String(brush.user_id));
    return u ? `${u.first_name} ${u.last_name}` : "1º Elige Reponedor...";
  }, [brush.user_id, filteredUsers]);

  const uniqueCadenas = useMemo(() => {
    const availableLocales = locales.filter(l => !isRoot || !companyId || l.company_id === companyId);
    return [...new Set(availableLocales.map(l => l.cadena))].filter(Boolean).sort();
  }, [locales, isRoot, companyId]);

  const filteredLocales = useMemo(() => locales.filter(l => {
    const matchCompany = !isRoot || !companyId || l.company_id === companyId;
    const matchCadena = !cadenaFilter || l.cadena === cadenaFilter;
    const matchCodigo = !codigoFilter || (l.codigo_local && String(l.codigo_local).toLowerCase().includes(codigoFilter.toLowerCase()));
    return matchCompany && matchCadena && matchCodigo;
  }), [locales, isRoot, companyId, cadenaFilter, codigoFilter]);

  useEffect(() => {
    if (filteredLocales.length === 1 && localId !== filteredLocales[0].id) {
      setLocalId(filteredLocales[0].id);
    }
  }, [filteredLocales, localId]);

  const handleTurnoChange = (e) => {
    const tName = e.target.value;
    const tData = turnosAgrupados.find(t => t.nombre === tName);

    const newBrush = {
      ...brush,
      turno_id: tName,
      start_time: tData?.entrada ? tData.entrada.slice(0,5) : brush.start_time,
      end_time: tData?.salida ? tData.salida.slice(0,5) : brush.end_time,
    };

    setBrush(newBrush);

    if (newBrush.user_id && tName && tName !== "INDIVIDUAL" && tData) {
      const diasObjetivo = tData.dias.length > 0 ? tData.dias : [1, 2, 3, 4, 5]; 
      
      setMatrix(prev => {
        const newState = { ...prev };
        diasObjetivo.forEach(d => {
          const key = `${targetWeek}-${d}`;
          const currentCellArray = newState[key] || [];
          
          if (!currentCellArray.some(a => String(a.user_id) === String(newBrush.user_id))) {
            newState[key] = [...currentCellArray, { ...newBrush }];
          } else {
            newState[key] = currentCellArray.map(a => String(a.user_id) === String(newBrush.user_id) ? { ...newBrush } : a);
          }
        });
        return newState;
      });
      toast.success(`Turno cargado en S${targetWeek}`, { icon: "⚡" });
    }
  };

  const handleCellClick = (w, d) => {
    const key = `${w}-${d}`;

    if (eraserMode) {
      setMatrix(prev => {
        const newState = { ...prev };
        delete newState[key];
        return newState;
      });
      return;
    }

    if (!brush.user_id || !brush.turno_id) {
      toast.error("Configura tu pincel (Reponedor y Turno) antes de pintar", { icon: "🖌️" });
      return;
    }

    setMatrix(prev => {
      const currentCellArray = prev[key] || [];
      const userIndex = currentCellArray.findIndex(a => String(a.user_id) === String(brush.user_id));
      let newCellArray;
      if (userIndex >= 0) {
        newCellArray = currentCellArray.filter((_, idx) => idx !== userIndex);
      } else {
        newCellArray = [...currentCellArray, { ...brush }];
      }
      if (newCellArray.length === 0) {
        const newState = { ...prev };
        delete newState[key];
        return newState;
      }
      return { ...prev, [key]: newCellArray };
    });
  };

  const fillTargetWeek = (fillAllMonth = false) => {
    if (!brush.user_id || !brush.turno_id) return toast.error("Configura tu pincel primero.");
    const tData = turnosAgrupados.find(t => t.nombre === brush.turno_id);
    const diasObjetivo = tData && tData.dias.length > 0 ? tData.dias : [1, 2, 3, 4, 5];
    const semanasObjetivo = fillAllMonth ? [1, 2, 3, 4] : [targetWeek];

    setMatrix(prev => {
      const newState = { ...prev };
      semanasObjetivo.forEach(w => {
        diasObjetivo.forEach(d => { 
          const key = `${w}-${d}`;
          const currentCellArray = newState[key] || [];
          if (!currentCellArray.some(a => String(a.user_id) === String(brush.user_id))) {
            newState[key] = [...currentCellArray, { ...brush }];
          } else {
            newState[key] = currentCellArray.map(a => String(a.user_id) === String(brush.user_id) ? { ...brush } : a);
          }
        });
      });
      return newState;
    });
    toast.success(fillAllMonth ? "Copiado a todo el mes" : `S${targetWeek} rellenada`);
  };

  const clearWeek = () => {
    if (window.confirm(`¿Seguro que deseas borrar TODA la planificación de la Semana ${targetWeek}?`)) {
      setMatrix(prev => {
        const newState = { ...prev };
        Object.keys(newState).forEach(key => {
          if (key.startsWith(`${targetWeek}-`)) delete newState[key];
        });
        return newState;
      });
      setShowClearMenu(false);
      toast.success(`Semana ${targetWeek} limpiada`);
    }
  };

  const clearMonth = () => {
    if (window.confirm("¿Seguro que deseas borrar TODO el calendario del mes para todos los usuarios?")) {
      setMatrix({});
      setShowClearMenu(false);
      toast.success("Calendario mensual limpiado");
    }
  };

  const handleManualSubmit = async (e) => {
    e.preventDefault();
    if (!localId) return toast.error("Selecciona un Local.");
    if (Object.keys(matrix).length === 0) return toast.error("Debes pintar al menos un día en el calendario.");

    setLoading(true);
    try {
      const assignmentsByUser = {};
      Object.entries(matrix).forEach(([key, userArray]) => {
        const [w, d] = key.split('-');
        userArray.forEach(data => {
          const uId = String(data.user_id);
          if (!assignmentsByUser[uId]) assignmentsByUser[uId] = [];
          assignmentsByUser[uId].push({ week: parseInt(w), day: parseInt(d), ...data });
        });
      });

      const promises = [];
      const usersToSave = Object.keys(assignmentsByUser);

      for (const userId of usersToSave) {
        const userAssignments = assignmentsByUser[userId];
        const dataToSubmit = {
          local_id: localId,
          company_id: companyId,
          is_recurring: true,
          origin: "TURNO",
          assignments_data: userAssignments, 
          user_id: userId,
          categoria_rol: userAssignments[0].rol,
          start_time: userAssignments[0].start_time,
          end_time: userAssignments[0].end_time,
          selectedDays: [...new Set(userAssignments.map(a => a.day))],
        };

        const existingRouteId = initialData?.route_ids_by_user?.[userId];
        
        if (existingRouteId && isEditing) {
          promises.push(api.put(`/routes/${existingRouteId}`, dataToSubmit));
        } else {
          promises.push(api.post("/routes", dataToSubmit));
        }
      }

      if (isEditing && initialData?.route_ids_by_user) {
        const existingUsers = Object.keys(initialData.route_ids_by_user);
        const usersToDelete = existingUsers.filter(u => !usersToSave.includes(u));
        
        usersToDelete.forEach(uId => {
          const idToDelete = initialData.route_ids_by_user[uId];
          promises.push(api.delete(`/routes/${idToDelete}`));
        });
      }

      await Promise.all(promises);
      
      onCreated();
      onClose();
      toast.success(isEditing ? "Planificación Actualizada" : "Planificación Creada");
    } catch (error) {
      toast.error(error.response?.data?.message || "Error al guardar");
    } finally { setLoading(false); }
  };

  const handleDelete = async () => {
    if (!window.confirm("¿Eliminar completamente esta planificación agrupada para TODOS los mercaderistas?")) return;
    setIsDeleting(true);
    try {
      const idsToDelete = initialData?.route_ids_by_user 
        ? Object.values(initialData.route_ids_by_user) 
        : [initialData.id];

      await Promise.all(idsToDelete.map(id => api.delete(`/routes/${id}`)));
      
      onCreated(); onClose(); toast.success("Rutas eliminadas");
    } catch { toast.error("Error al eliminar"); } 
    finally { setIsDeleting(false); }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-end sm:items-center justify-center z-[150] sm:p-4 font-[Outfit]">
      <div className="bg-white w-full h-full sm:h-auto sm:max-w-5xl rounded-none sm:rounded-[3rem] shadow-2xl border border-gray-100 overflow-hidden flex flex-col max-h-[100vh] sm:max-h-[95vh]">
        
        {/* HEADER */}
        <div className="flex items-center justify-between px-5 py-4 sm:px-8 sm:py-6 bg-white border-b border-gray-50 shrink-0">
          <div>
            <h2 className="text-xl sm:text-2xl font-black uppercase tracking-tighter text-gray-900 italic">
              Planificador <span className="text-[#87be00]">Visual</span>
            </h2>
            <p className="text-[9px] sm:text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">
              Soporta múltiples reponedores
            </p>
          </div>
          <button onClick={onClose} className="p-2 sm:p-3 rounded-2xl bg-gray-50 text-gray-400 hover:bg-gray-100 transition-all">
            <FiX size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 sm:p-8">
          {/* Se ha ajustado el grid a col-span-5 y col-span-7 para ensanchar el lateral izquierdo */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8">
            
            {/* HERRAMIENTAS - Ahora col-span-5 para ser más ancho */}
            <div className="lg:col-span-5 space-y-4 sm:space-y-6">
              
              {/* PASO 1: DÓNDE (ESTILO ACTUALIZADO) */}
              <div className="bg-blue-50/50 p-4 sm:p-5 rounded-[1.5rem] sm:rounded-[2rem] border border-blue-100 shadow-sm space-y-4">
                 <div className="flex items-center gap-2 text-[9px] font-black text-blue-600 uppercase tracking-widest">
                    <FiMapPin size={12} /> 1. Dónde (Local)
                 </div>
                 
                 {isRoot && (
                   <select
                     className="w-full bg-white rounded-xl px-4 py-3 text-xs font-bold border border-blue-100 outline-none focus:ring-4 focus:ring-blue-50 transition-all h-12 text-gray-900"
                     value={companyId} onChange={(e) => { setCompanyId(e.target.value); setLocalId(""); }}
                   >
                     <option value="" className="text-gray-900">Empresa...</option>
                     {companies.map((c) => <option key={c.id} value={c.id} className="text-gray-900">{c.name}</option>)}
                   </select>
                 )}
                 
                 <div className="grid grid-cols-2 gap-2">
                   <select
                     className="w-full bg-white rounded-xl px-3 py-2 text-xs font-bold border border-blue-100 outline-none focus:ring-4 focus:ring-blue-50 transition-all h-10 text-gray-900"
                     value={cadenaFilter} onChange={(e) => setCadenaFilter(e.target.value)}
                   >
                     <option value="" className="text-gray-900">Cadenas (Todas)</option>
                     {uniqueCadenas.map(c => <option key={c} value={c} className="text-gray-900">{c}</option>)}
                   </select>
                   <div className="relative">
                     <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={12} />
                     <input
                       type="text"
                       placeholder="Cód. Local"
                       className="w-full bg-white rounded-xl pl-8 pr-3 py-2 text-xs font-bold border border-blue-100 outline-none focus:ring-4 focus:ring-blue-50 transition-all text-gray-900 placeholder-gray-400 h-10"
                       value={codigoFilter} onChange={(e) => setCodigoFilter(e.target.value)}
                     />
                   </div>
                 </div>

                 <select 
                   required className={`w-full rounded-xl px-4 py-3 text-xs font-bold border outline-none transition-all h-12 ${localId ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white border-blue-100 text-gray-900'}`}
                   value={localId} onChange={(e) => setLocalId(e.target.value)}
                 >
                    <option value="" className="text-gray-900">
                      {filteredLocales.length === 1 ? "✅ Local Encontrado" : `Elegir Local (${filteredLocales.length} ref.)`}
                    </option>
                    {filteredLocales.map(l => (
                      <option key={l.id} value={l.id} className="text-gray-900">
                        {l.cadena} - {l.direccion} ({l.codigo_local})
                      </option>
                    ))}
                 </select>
              </div>

              {/* PASO 2: QUIÉN Y CUÁNDO (PINCEL) */}
              <div className="bg-blue-50/50 p-4 sm:p-5 rounded-[1.5rem] sm:rounded-[2rem] border border-blue-100 shadow-sm space-y-4">
                 <div className="flex items-center gap-2 text-[9px] font-black text-blue-600 uppercase tracking-widest">
                    <FiEdit3 size={12} /> 2. Quién y Cuándo (Pincel)
                 </div>

                 <div className="space-y-2">
                    <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                        <FiCalendar /> Semana objetivo de carga:
                    </label>
                    <div className="bg-gray-200/50 p-1 rounded-2xl flex gap-1 shadow-inner">
                        {WEEKS.map((w) => (
                            <button
                                key={w}
                                type="button"
                                onClick={() => setTargetWeek(w)}
                                className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase transition-all duration-300 ${
                                    targetWeek === w 
                                    ? "bg-white text-gray-900 shadow-md scale-[1.02]" 
                                    : "text-gray-400 hover:text-gray-600"
                                }`}
                            >
                                S{w}
                            </button>
                        ))}
                    </div>
                 </div>
                 
                 <div className="relative" ref={userDropdownRef}>
                   <div
                     className={`w-full bg-white border border-blue-100 rounded-xl px-4 py-3 text-xs font-bold outline-none focus:ring-4 focus:ring-blue-50 transition-all h-12 cursor-pointer flex items-center justify-between ${brush.user_id ? 'text-gray-900' : 'text-gray-500'}`}
                     onClick={() => setIsUserDropdownOpen(!isUserDropdownOpen)}
                   >
                     <span className="truncate">{selectedUserText}</span>
                     <svg className={`w-3 h-3 text-blue-400 transition-transform shrink-0 ${isUserDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 9l-7 7-7-7"></path></svg>
                   </div>

                   {isUserDropdownOpen && (
                     <div className="absolute top-[calc(100%+4px)] left-0 w-full bg-white border border-blue-100 rounded-xl shadow-2xl z-50 overflow-hidden flex flex-col max-h-[250px]">
                       <div className="p-2 border-b border-gray-50 bg-blue-50/30">
                         <input
                           type="text"
                           autoFocus
                           placeholder="🔍 Buscar nombre o correo..."
                           className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-[10px] font-bold outline-none focus:border-blue-300 transition-colors"
                           value={userSearchTerm}
                           onChange={(e) => setUserSearchTerm(e.target.value)}
                           onClick={(e) => e.stopPropagation()}
                         />
                       </div>
                       <div className="overflow-y-auto custom-scrollbar p-1.5 space-y-0.5 bg-white">
                         <div
                           className="px-3 py-2 text-[10px] font-black uppercase text-gray-500 hover:bg-blue-50 hover:text-blue-600 rounded-lg cursor-pointer transition-colors"
                           onClick={() => { setBrush({...brush, user_id: ""}); setIsUserDropdownOpen(false); setUserSearchTerm(""); }}
                         >
                           1º Elige Reponedor...
                         </div>
                         {filteredUsers
                           .filter(u => {
                             const fullName = `${u.first_name || ''} ${u.last_name || ''}`.toLowerCase();
                             const email = (u.email || '').toLowerCase();
                             const term = userSearchTerm.toLowerCase();
                             return fullName.includes(term) || email.includes(term);
                           })
                           .map(u => (
                           <div
                             key={u.id}
                             className="px-3 py-2 flex flex-col hover:bg-blue-50 rounded-lg cursor-pointer transition-colors group"
                             onClick={() => { setBrush({...brush, user_id: u.id}); setIsUserDropdownOpen(false); setUserSearchTerm(""); }}
                           >
                             <span className="text-[10px] font-black uppercase text-gray-800 group-hover:text-blue-600">{u.first_name} {u.last_name}</span>
                             {u.email && <span className="text-[9px] font-bold text-gray-400 lowercase truncate mt-0.5">{u.email}</span>}
                           </div>
                         ))}
                       </div>
                     </div>
                   )}
                 </div>

                 <select 
                    className="w-full bg-white border border-blue-100 rounded-xl px-4 py-3 text-xs font-bold outline-none focus:ring-4 focus:ring-blue-50 transition-all h-12"
                    value={brush.rol} onChange={(e) => setBrush({...brush, rol: e.target.value, turno_id: ""})}
                  >
                    <option value="">2º Elige Rol...</option>
                    <option value="INDIVIDUAL">Visita Individual</option>
                    {ROLES_TURNOS.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
                 </select>

                 <select 
                    className="w-full bg-white border border-blue-100 rounded-xl px-4 py-3 text-xs font-bold outline-none focus:ring-4 focus:ring-blue-50 transition-all disabled:opacity-50 h-12"
                    value={brush.turno_id} onChange={handleTurnoChange} disabled={!brush.rol}
                  >
                    <option value="">3º Elige Turno (Auto-carga)</option>
                    {brush.rol === "INDIVIDUAL" ? <option value="INDIVIDUAL">Horario Manual</option> : turnosAgrupados.map(t => <option key={t.nombre} value={t.nombre}>{t.nombre}</option>)}
                 </select>

                 {/* ── SELECTORES DE HORA EN FORMATO 24H ── */}
                 {brush.turno_id && (
                   <div className="space-y-1.5">
                     <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                       <FiClock size={10} /> Horario (formato 24h)
                     </label>
                     <div className="flex gap-2">
                       <TimePicker24h
                         value={brush.start_time}
                         onChange={(e) => setBrush({ ...brush, start_time: e.target.value })}
                         disabled={brush.rol !== "INDIVIDUAL"}
                       />
                       <TimePicker24h
                         value={brush.end_time}
                         onChange={(e) => setBrush({ ...brush, end_time: e.target.value })}
                         disabled={brush.rol !== "INDIVIDUAL"}
                       />
                     </div>
                   </div>
                 )}
              </div>
            </div>

            {/* CALENDARIO - Ahora col-span-7 */}
            <div className="lg:col-span-7 flex flex-col mt-2 lg:mt-0">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 px-1 gap-3">
                <div className="flex items-center gap-2 text-[10px] font-black text-gray-500 uppercase tracking-widest">
                  <FiCalendar size={14} className="shrink-0" /> 3. Calendario
                </div>
                <div className="flex flex-wrap gap-2 relative">
                  <button type="button" disabled={eraserMode} onClick={() => fillTargetWeek(false)} className={`flex-1 sm:flex-none text-[9px] font-black uppercase tracking-widest bg-blue-50 hover:bg-blue-100 text-blue-600 px-3 py-2.5 rounded-lg transition-all flex items-center justify-center gap-1.5 ${eraserMode ? 'opacity-50 cursor-not-allowed' : ''}`}><FiCopy/> Llenar S{targetWeek}</button>
                  <button type="button" disabled={eraserMode} onClick={() => fillTargetWeek(true)} className={`flex-1 sm:flex-none text-[9px] font-black uppercase tracking-widest bg-gray-100 hover:bg-gray-200 text-gray-600 px-3 py-2.5 rounded-lg transition-all ${eraserMode ? 'opacity-50 cursor-not-allowed' : ''}`}>Llenar Mes</button>

                  {/* MENÚ DE LIMPIEZA */}
                  {eraserMode ? (
                    <button type="button" onClick={() => setEraserMode(false)} className="flex-1 sm:flex-none text-[9px] font-black uppercase tracking-widest px-3 py-2.5 rounded-lg transition-all flex items-center justify-center gap-1.5 bg-red-500 text-white shadow-md hover:bg-red-600">
                      <FiX size={12} /> Quitar Borrador
                    </button>
                  ) : (
                    <div className="relative">
                      <button type="button" onClick={() => setShowClearMenu(!showClearMenu)} className="flex-1 sm:flex-none text-[9px] font-black uppercase tracking-widest px-3 py-2.5 rounded-lg transition-all flex items-center justify-center gap-1.5 bg-red-50 hover:bg-red-100 text-red-500">
                        <FiTrash2 size={12} /> Limpiar ▾
                      </button>
                      
                      {showClearMenu && (
                        <>
                          <div className="fixed inset-0 z-[150]" onClick={() => setShowClearMenu(false)}></div>
                          <div className="absolute top-full right-0 mt-2 w-56 bg-white border border-gray-100 rounded-2xl shadow-2xl z-[160] overflow-hidden flex flex-col">
                            <button
                              type="button"
                              onClick={() => { setEraserMode(true); setShowClearMenu(false); toast('Modo Borrador activado. Haz clic en un día para limpiarlo.', { icon: '🧽' }); }}
                              className="px-4 py-3.5 text-[10px] font-black uppercase text-left hover:bg-gray-50 text-gray-700 transition-all border-b border-gray-50 flex items-center gap-2"
                            >
                              <FiMapPin size={12}/> 1. Limpiar Día (Borrador)
                            </button>
                            <button type="button" onClick={clearWeek} className="px-4 py-3.5 text-[10px] font-black uppercase text-left hover:bg-red-50 text-gray-700 hover:text-red-600 transition-all border-b border-gray-50 flex items-center gap-2">
                              <FiLayers size={12}/> 2. Limpiar S{targetWeek}
                            </button>
                            <button type="button" onClick={clearMonth} className="px-4 py-3.5 text-[10px] font-black uppercase text-left hover:bg-red-50 text-red-600 transition-all flex items-center gap-2">
                              <FiCalendar size={12}/> 3. Limpiar Todo el Mes
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  )}

                </div>
              </div>

              <div className="bg-gray-50 rounded-[1.5rem] sm:rounded-[2.5rem] p-3 sm:p-6 border border-gray-100 flex-1 overflow-x-auto relative">
                <div className="min-w-[500px] sm:min-w-0 grid grid-cols-8 gap-1.5 sm:gap-2 h-full">
                  
                  <div className="col-span-1"></div>
                  {DAYS_OF_WEEK.map(d => (
                    <div key={`header-${d.id}`} className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center justify-center pb-2">
                      {d.short}
                    </div>
                  ))}

                  {WEEKS.map(w => (
                    <React.Fragment key={`week-${w}`}>
                      <div className="col-span-1 flex items-center justify-end pr-2 sm:pr-3 text-[10px] sm:text-[11px] font-black text-blue-600 uppercase">
                        S{w}
                      </div>
                      
                      {DAYS_OF_WEEK.map(d => {
                        const cellArray = matrix[`${w}-${d.id}`] || [];
                        const isActive = cellArray.length > 0;
                        const isTargetWeek = w === targetWeek;
                        
                        let baseClass = "relative min-h-[4rem] h-20 rounded-xl sm:rounded-2xl flex flex-col items-center justify-start p-1 cursor-pointer transition-all border-2 overflow-y-auto custom-scrollbar";
                        
                        if (eraserMode) {
                          if (isActive) baseClass += " bg-[#87be00] border-[#87be00] text-white shadow-lg hover:!bg-red-500 hover:!border-red-600 hover:!text-white";
                          else baseClass += " bg-white border-dashed border-gray-200 hover:!border-red-200 hover:!bg-red-50";
                        } else {
                          if (isActive) baseClass += " bg-[#87be00] border-[#87be00] text-white shadow-lg sm:scale-[1.02]";
                          else if (isTargetWeek) baseClass += " bg-white border-blue-200 hover:border-blue-400 shadow-sm";
                          else baseClass += " bg-white border-dashed border-gray-200 hover:border-blue-300 hover:bg-blue-50";
                        }

                        return (
                          <div 
                            key={`cell-${w}-${d.id}`}
                            onClick={() => handleCellClick(w, d.id)}
                            className={baseClass}
                          >
                            {isActive ? (
                              cellArray.map((assign, idx) => {
                                const user = filteredUsers.find(u => String(u.id) === String(assign.user_id));
                                const uName = user ? user.first_name : "User";
                                const tLabel = assign.turno_id === "INDIVIDUAL" ? assign.start_time : assign.turno_id;
                                
                                return (
                                  <div key={idx} className="w-full bg-black/20 rounded mb-1 py-0.5 px-1 flex flex-col items-center shrink-0">
                                    <span className="text-[7px] sm:text-[9px] font-black uppercase leading-tight truncate w-full text-center">
                                      {uName}
                                    </span>
                                    <span className="text-[5px] sm:text-[7px] font-bold mt-0.5 truncate max-w-full">
                                      {tLabel}
                                    </span>
                                  </div>
                                );
                              })
                            ) : (
                              <span className="text-gray-300 opacity-0 hover:opacity-100 text-lg sm:text-xl font-black transition-opacity m-auto">+</span>
                            )}
                          </div>
                        );
                      })}
                    </React.Fragment>
                  ))}
                </div>
              </div>
              
              <div className="mt-4 flex items-start gap-2 text-[9px] sm:text-[10px] text-gray-400 font-medium px-2">
                <FiInfo className="text-blue-500 shrink-0 mt-0.5" /> 
                <p>
                  <strong>Tip:</strong> Selecciona la semana en el Paso 2 (S1-S4). Los cambios que pintes se aplicarán a la semana activa.
                </p>
              </div>

            </div>
          </div>
        </div>

        {/* FOOTER */}
        <div className="p-4 sm:p-6 bg-white border-t border-gray-50 shrink-0 flex flex-col-reverse sm:flex-row gap-3 sm:gap-4 pb-8 sm:pb-6">
          {isEditing && (
            <button
              type="button" onClick={handleDelete} disabled={loading || isDeleting}
              className="w-full sm:w-auto px-6 py-4 rounded-[1.5rem] font-black uppercase text-[10px] tracking-widest text-red-500 bg-red-50 hover:bg-red-100 transition-all flex items-center justify-center gap-2 shrink-0"
            >
              {isDeleting ? <FiLoader className="animate-spin" /> : <FiTrash2 size={16} />} Eliminar
            </button>
          )}
          <button
            type="button" onClick={handleManualSubmit} disabled={loading || isDeleting}
            className="w-full bg-gray-900 hover:bg-black text-white py-4 rounded-[1.5rem] font-black uppercase text-[10px] sm:text-[11px] tracking-[0.2em] shadow-xl transition-all flex items-center justify-center gap-3"
          >
            {loading && !isDeleting ? <FiLoader className="animate-spin" /> : <FiCheckCircle size={18} />}
            Confirmar e Implementar
          </button>
        </div>

      </div>
    </div>
  );
};

export default ManageRoutesModal;