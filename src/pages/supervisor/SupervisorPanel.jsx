import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { FiUsers, FiMapPin, FiCheckCircle, FiAlertCircle, FiClock, FiShield, FiExternalLink, FiSearch, FiHash, FiCalendar, FiXCircle } from "react-icons/fi";
import { useState, useEffect } from "react";
import { io } from "socket.io-client";
import api from "../../api/apiClient";
import { useAuth } from "../../context/AuthContext";
import { useNavigate } from "react-router-dom"; 


/* ============================================================
   GRÁFICO DE TORTA / DONUT (SVG en tiempo real, proporcional y tooltips)
============================================================ */
const DonutChart = ({ stats }) => {
  const p = stats?.no_atendido || 0;
  const e = stats?.atendiendo || 0;
  const f = stats?.atendido || 0;
  const s = stats?.sin_asignacion || 0;
  const total = p + e + f + s;

  const pPct = total > 0 ? Math.round((p / total) * 100) : 0;
  const ePct = total > 0 ? Math.round((e / total) * 100) : 0;
  const fPct = total > 0 ? Math.round((f / total) * 100) : 0;
  const sPct = total > 0 ? Math.round((s / total) * 100) : 0;

  if (total === 0) {
    return (
      <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-gray-50 flex items-center justify-center h-48 md:h-56 text-[10px] font-black text-gray-400 uppercase tracking-widest italic">
        Sin visitas planificadas
      </div>
    );
  }

  const circumference = 98.0176; // 2 * PI * 15.6 (Radio del círculo)
  
  const pDash = (p / total) * circumference;
  const eDash = (e / total) * circumference;
  const fDash = (f / total) * circumference;
  const sDash = (s / total) * circumference;

  const pOff = 0;
  const eOff = -pDash;
  const fOff = eOff - eDash;
  const sOff = fOff - fDash;

  return (
    <div className="bg-white p-6 md:p-8 rounded-[2.5rem] shadow-sm border border-gray-50 flex items-center justify-center h-48 md:h-56 relative w-full">
      <svg className="w-40 h-40 transform -rotate-90" viewBox="0 0 40 40">
        <circle cx="20" cy="20" r="15.6" fill="transparent" stroke="#ef4444" strokeWidth="5" strokeDasharray={`${pDash} ${circumference - pDash}`} strokeDashoffset={pOff} className="transition-all duration-500 cursor-pointer hover:opacity-80">
          <title>Sala Pendiente: {p} salas ({pPct}%)</title>
        </circle>
        <circle cx="20" cy="20" r="15.6" fill="transparent" stroke="#facc15" strokeWidth="5" strokeDasharray={`${eDash} ${circumference - eDash}`} strokeDashoffset={eOff} className="transition-all duration-500 cursor-pointer hover:opacity-80">
          <title>Sala en Proceso: {e} salas ({ePct}%)</title>
        </circle>
        <circle cx="20" cy="20" r="15.6" fill="transparent" stroke="#87be00" strokeWidth="5" strokeDasharray={`${fDash} ${circumference - fDash}`} strokeDashoffset={fOff} className="transition-all duration-500 cursor-pointer hover:opacity-80">
          <title>Sala Completada: {f} salas ({fPct}%)</title>
        </circle>
        <circle cx="20" cy="20" r="15.6" fill="transparent" stroke="#111827" strokeWidth="5" strokeDasharray={`${sDash} ${circumference - sDash}`} strokeDashoffset={sOff} className="transition-all duration-500 cursor-pointer hover:opacity-80">
          <title>Sala Sin Atender: {s} salas ({sPct}%)</title>
        </circle>
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        <span className="text-3xl font-black text-gray-900 tracking-tighter leading-none">{total}</span>
        <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest mt-1">Total Salas</span>
      </div>
    </div>
  );
};

/* ============================================================
   PANEL PRINCIPAL DE SUPERVISIÓN
============================================================ */
const SupervisorPanel = () => {
  const { user } = useAuth();
  const navigate = useNavigate(); 
  const [searchTerm, setSearchTerm] = useState("");
  const [activeFilter, setActiveFilter] = useState(null);
  const [selectedDay, setSelectedDay] = useState(null);
  
  // 🚩 ESTADOS PARA EL MODAL DE JUSTIFICACIÓN DE PLANIFICACIÓN
  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
  const [selectedLocalForPlan, setSelectedLocalForPlan] = useState(null);
  const [reason, setReason] = useState("");

  const REASONS = [
    "Mercaderista Enfermo",
    "Local sin mercaderista",
    "Cumplir con planificacion"
  ];

  const queryClient = useQueryClient();

  // 🚩 TIEMPO REAL: Conexión WebSocket con el Backend
  useEffect(() => {
    const socketUrl = import.meta.env.VITE_API_URL || window.location.origin;
    const socket = io(socketUrl, {
      withCredentials: true,
    });

    socket.on("cobertura-modificada", (data) => {
      if (data && data.company_id === user?.company_id) {
        console.log("🔄 Actualización en tiempo real detectada. Refrescando dashboard...");
        queryClient.invalidateQueries(['dashboard-stats']);
      }
    });

    return () => socket.disconnect();
  }, [user?.company_id, queryClient]);

  const { data: stats, isLoading, error, isFetching } = useQuery({
    
    queryKey: ['dashboard-stats', user?.company_id, user?.id],
    queryFn: async () => {
      const response = await api.get("/reports/dashboard-stats", {
        params: { 
          company_id: user?.company_id,
          supervisor_id: user?.id 
        }
      });
      return response.data || response;
    },
    enabled: !!user?.id,
    refetchInterval: 10000,
  });

 const filterData = () => {
    let baseData = stats?.locales_detalle || [];

    console.log("ANTES", baseData);
    
    // 1. Filtro por Día (si está seleccionado)
 if (selectedDay) {
  baseData = baseData.filter(l => {
    const dias = parseDias(l.dias_planificados);

    console.log({
      local: l.cadena,
      diasOriginal: l.dias_planificados,
      diasParseados: dias,
      selectedDay,
      incluye: dias.includes(selectedDay)
    });

    return dias.includes(selectedDay);
  });
}
    
    // 2. Filtros por estado / tipo (mantiene tu lógica actual)
    if (activeFilter === 'locales') {
      const uniqueMap = new Map();
      baseData.forEach(l => {
        const key = l.id || l.local_id || l.codigo_local;
        if (!uniqueMap.has(key)) uniqueMap.set(key, l);
      });
      baseData = Array.from(uniqueMap.values());
    } else if (activeFilter === 'pendientes') {
      baseData = baseData.filter(l => l.estado === 'pendiente');
    } else if (activeFilter === 'en_curso') {
      baseData = baseData.filter(l => l.estado === 'en_curso');
    } else if (activeFilter === 'finalizadas') {
      baseData = baseData.filter(l => l.estado === 'finalizado');
    } else if (activeFilter === 'sin_ruta') {
      baseData = baseData.filter(l => l.estado === 'sin_planificacion');
    }

    // 3. Búsqueda por texto (mantener al final para que filtre sobre lo ya filtrado)
    if (searchTerm.trim() !== "") {
      baseData = baseData.filter(local => 
        local.direccion?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        local.cadena?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        local.codigo_local?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        local.mercaderista?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    return baseData;
  };

  const getUniqueUsers = () => {
    const usersMap = {};
    const baseData = stats?.locales_detalle || [];
    baseData.forEach(l => {
      if (l.mercaderista && l.mercaderista.trim() !== '') {
        if (!usersMap[l.mercaderista]) {
          usersMap[l.mercaderista] = { name: l.mercaderista, locales: [] };
        }
        if (!usersMap[l.mercaderista].locales.includes(l.cadena)) {
          usersMap[l.mercaderista].locales.push(l.cadena);
        }
      }
    });
    return Object.keys(usersMap).map((name, idx) => ({
      id: `user-${idx}`,
      name,
      locales: usersMap[name].locales
    })).filter(u => u.name.toLowerCase().includes(searchTerm.toLowerCase()));
  };

const parseDias = (dias) => {
  if (!dias) return [];

  if (Array.isArray(dias)) return dias;

  if (typeof dias === "string") {
    return dias
      .split(",")
      .map(d => d.trim())
      .filter(Boolean);
  }

  return [];
};

  const filteredLocales = filterData();
  const uniqueUsers = getUniqueUsers();

  const cards = [
    { id: 'sin_ruta', label: "Locales fuera Ruta", value: stats?.sin_asignacion || 0, color: "bg-gray-900", text: "text-gray-900", icon: <FiXCircle size={24} /> },
    { id: 'locales', label: "Locales Asignados", value: stats?.total_locales || 0, color: "bg-blue-600", text: "text-blue-600", icon: <FiMapPin size={24} /> },
    { id: 'usuarios', label: "Usuarios Asignados", value: stats?.total_usuarios || 0, color: "bg-indigo-600", text: "text-indigo-600", icon: <FiUsers size={24} /> },
    { id: 'pendientes', label: "Rutas Pendientes", value: stats?.no_atendido || 0, color: "bg-red-500", text: "text-red-500", icon: <FiAlertCircle size={24} /> },
    { id: 'en_curso', label: "Visitas en Curso", value: stats?.atendiendo || 0, color: "bg-yellow-400", text: "text-yellow-500", icon: <FiClock size={24} /> },
    { id: 'finalizadas', label: "Visitas Finalizadas", value: stats?.atendido || 0, color: "bg-[#87be00]", text: "text-[#87be00]", icon: <FiCheckCircle size={24} /> },
  ];

  const topCardsList = cards.slice(0, 3);
  const bottomCardsList = cards.slice(3, 6);

  const p = stats?.no_atendido || 0;
  const e = stats?.atendiendo || 0;
  const f = stats?.atendido || 0;
  const s = stats?.sin_asignacion || 0;

  const pPct = (p + e + f + s) > 0 ? Math.round((p / (p + e + f + s)) * 100) : 0;
  const ePct = (p + e + f + s) > 0 ? Math.round((e / (p + e + f + s)) * 100) : 0;
  const fPct = (p + e + f + s) > 0 ? Math.round((f / (p + e + f + s)) * 100) : 0;
  const sPct = (p + e + f + s) > 0 ? Math.round((s / (p + e + f + s)) * 100) : 0;

  /**
   * WeekPlan
   * 
   * plan         → array de letras planificadas, ej: ['L','M','X','J','V']
   * dayOfWeek    → entero de user_routes.day_of_week  (0=Dom … 6=Sab)
   *                    Para visitas INDIVIDUALES se deriva de visit_date.
   * visitDate    → string ISO de user_routes.visit_date, ej: "2025-06-10"
   * origin       → user_routes.origin: 'INDIVIDUAL' | 'RECURRING' | etc.
   *
   * Regla de pintado ACTUALIZADA:
   *   - SOLAMENTE se pinta de verde el día exacto correspondiente a la planificación.
   */

  // Normaliza los días de la semana (convierte string "L,M,X" a array ["L", "M", "X"])
  const WeekPlan = ({ plan = [], dayOfWeek = null, visitDate = null, origin = null }) => {
  const days = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
  const jsToLetter = ['D', 'L', 'M', 'X', 'J', 'V', 'S'];

  const planArray = parseDias(plan); // ✅ Normalizamos aquí

  let visitDayLetter = null;
  if (origin === 'INDIVIDUAL' && visitDate) {
  const [year, month, day] = visitDate.split('-').map(Number);
  const d = new Date(year, month - 1, day); // 👈 LOCAL DATE FIX
  visitDayLetter = jsToLetter[d.getDay()];
}

  return (
    <div className="flex gap-1">
      {days.map(day => {
        const isPlanned = planArray.includes(day); // ✅ Ahora funciona correctamente
        const isVisitDay = day === visitDayLetter;

        // Lógica: Verde brillante si es el día de la visita, Verde suave si es un día planificado
        let colorClass = 'bg-gray-100 text-gray-400';
        if (isVisitDay) {
          colorClass = 'bg-[#87be00] text-white shadow-md ring-2 ring-[#87be00] ring-offset-1 scale-110';
        } else if (isPlanned) {
          colorClass = 'bg-[#87be00] text-white';
        }

        return (
          <div key={day} className={`w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-black transition-all ${colorClass}`}>
            {day}
          </div>
        );
      })}
    </div>
  );
};

  const calculateDuration = (start, end) => {
    if (!start || !end) return null;
    const [sh, sm] = start.split(':').map(Number);
    const [eh, em] = end.split(':').map(Number);
    let diffMins = (eh * 60 + em) - (sh * 60 + sm);
    if (diffMins < 0) diffMins += 24 * 60;
    const hrs = Math.floor(diffMins / 60);
    const mins = diffMins % 60;
    return `${hrs}h ${mins.toString().padStart(2, '0')}m`;
  };

  if (isLoading) return (
    <div className="py-20 text-center font-[Outfit] font-black uppercase italic animate-pulse text-gray-400 tracking-widest text-sm px-4">
      Cargando Cartera de Supervisor...
    </div>
  );

  return (
    <div className="space-y-6 md:space-y-8 font-[Outfit] pb-24 md:pb-20">
      
      {/* HEADER RESPONSIVO */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 px-2">
        <div>
          <h2 className="text-2xl md:text-3xl font-black text-gray-900 uppercase italic tracking-tighter leading-none">
            Panel de Supervisión
          </h2>
          <div className="flex items-center gap-2 mt-2">
              <div className="w-2 h-2 bg-[#87be00] rounded-full animate-ping shrink-0"></div>
              <p className="text-[9px] md:text-[10px] font-bold text-gray-400 uppercase tracking-widest italic truncate">
                Análisis de cobertura en tiempo real
              </p>
          </div>
        </div>
        
        <div className="hidden sm:flex items-center gap-3 bg-white px-4 md:px-5 py-2 md:py-3 rounded-2xl md:rounded-[1.5rem] border border-gray-100 shadow-sm w-full md:w-auto">
            <div className="w-7 h-7 md:w-8 md:h-8 bg-gray-900 rounded-xl flex items-center justify-center text-[#87be00] shrink-0">
                <FiShield size={14} className="md:w-4 md:h-4" />
            </div>
            <div className="truncate">
                <p className="text-[8px] font-black text-gray-400 uppercase tracking-tighter">Supervisor Activo</p>
                <p className="text-[10px] font-black text-gray-900 uppercase italic leading-none truncate">
                  {user?.first_name} {user?.last_name}
                </p>
            </div>
        </div>
      </div>

      {/* SECCIÓN DIVIDIDA EN 2 COLUMNAS PRINCIPALES */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-8 px-2">
        
        {/* COLUMNA IZQUIERDA: Gráfico de Torta arriba, Resumen abajo */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          <DonutChart stats={stats} />

          <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-gray-50 space-y-3">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest italic mb-4">Resumen de Salas / Visitas</p>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3.5 h-3.5 rounded-lg bg-red-500 shrink-0"></div>
                <span className="text-[10px] font-black text-gray-800 uppercase">Sala Pendiente</span>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-[10px] font-bold text-gray-400 uppercase">{pPct}%</span>
                <span className="text-xs font-black text-gray-900 w-4 text-right">{p}</span>
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3.5 h-3.5 rounded-lg bg-yellow-400 shrink-0"></div>
                <span className="text-[10px] font-black text-gray-800 uppercase">Sala en Proceso</span>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-[10px] font-bold text-gray-400 uppercase">{ePct}%</span>
                <span className="text-xs font-black text-gray-900 w-4 text-right">{e}</span>
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3.5 h-3.5 rounded-lg bg-[#87be00] shrink-0"></div>
                <span className="text-[10px] font-black text-gray-800 uppercase">Sala Completada</span>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-[10px] font-bold text-gray-400 uppercase">{fPct}%</span>
                <span className="text-xs font-black text-gray-900 w-4 text-right">{f}</span>
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3.5 h-3.5 rounded-lg bg-gray-900 shrink-0"></div>
                <span className="text-[10px] font-black text-gray-800 uppercase">Sala Sin Atender</span>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-[10px] font-bold text-gray-400 uppercase">{sPct}%</span>
                <span className="text-xs font-black text-gray-900 w-4 text-right">{s}</span>
              </div>
            </div>
          </div>
        </div>

        {/* COLUMNA DERECHA: Tarjetas de Estado apiladas en 2 filas */}
        <div className="lg:col-span-7 flex flex-col gap-6 justify-center">
          
          {/* Fila 1 */}
          <div className="grid grid-cols-3 gap-3 md:gap-6">
            {topCardsList.map((card, idx) => (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
                key={card.id}
                onClick={() =>
                  
                  setActiveFilter(activeFilter === card.id ? null : card.id)}
                className={`bg-white p-4 md:p-6 rounded-2xl md:rounded-[2.5rem] shadow-sm border cursor-pointer relative overflow-hidden group transition-all duration-300 ${activeFilter === card.id ? 'border-gray-300 shadow-md ring-4 ring-gray-50 scale-[1.02]' : 'border-gray-50 hover:shadow-lg'}`}
              >
                <div className={`absolute top-0 left-0 h-full w-1.5 md:w-2 ${card.color}`}></div>
                <div className="flex justify-between items-start mb-2 md:mb-4">
                  <div className={`p-2 md:p-3 rounded-xl md:rounded-2xl ${card.color} text-white shadow-lg transition-transform ${activeFilter === card.id ? 'scale-110' : 'group-hover:scale-110'}`}>
                    <div className="scale-75 md:scale-100 origin-top-left">{card.icon}</div>
                  </div>
                </div>
                <h3 className="text-3xl md:text-5xl font-black text-gray-900 mb-1 tracking-tighter">{card.value}</h3>
                <p className="text-[9px] md:text-[11px] font-black text-gray-800 uppercase italic leading-tight">{card.label}</p>
                
                {activeFilter === card.id && (
                  <div className="absolute top-4 right-4 w-3 h-3 bg-gray-900 rounded-full animate-pulse"></div>
                )}
              </motion.div>
            ))}
          </div>

          {/* Fila 2 */}
          <div className="grid grid-cols-3 gap-3 md:gap-6">
            {bottomCardsList.map((card, idx) => (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: (idx + 3) * 0.1 }}
                key={card.id}
                onClick={() => setActiveFilter(activeFilter === card.id ? null : card.id)}
                className={`bg-white p-4 md:p-6 rounded-2xl md:rounded-[2.5rem] shadow-sm border cursor-pointer relative overflow-hidden group transition-all duration-300 ${activeFilter === card.id ? 'border-gray-300 shadow-md ring-4 ring-gray-50 scale-[1.02]' : 'border-gray-50 hover:shadow-lg'}`}
              >
                <div className={`absolute top-0 left-0 h-full w-1.5 md:w-2 ${card.color}`}></div>
                <div className="flex justify-between items-start mb-2 md:mb-4">
                  <div className={`p-2 md:p-3 rounded-xl md:rounded-2xl ${card.color} text-white shadow-lg transition-transform ${activeFilter === card.id ? 'scale-110' : 'group-hover:scale-110'}`}>
                    <div className="scale-75 md:scale-100 origin-top-left">{card.icon}</div>
                  </div>
                </div>
                <h3 className="text-3xl md:text-5xl font-black text-gray-900 mb-1 tracking-tighter">{card.value}</h3>
                <p className="text-[9px] md:text-[11px] font-black text-gray-800 uppercase italic leading-tight">{card.label}</p>
                
                {activeFilter === card.id && (
                  <div className="absolute top-4 right-4 w-3 h-3 bg-gray-900 rounded-full animate-pulse"></div>
                )}
              </motion.div>
            ))}
          </div>

        </div>
      </div>

      {/* LISTADO DINÁMICO */}
      <div className="space-y-4 md:space-y-6 pt-4">
        
        {/* Cabecera, Filtro de Días y Buscador */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 px-2 md:px-4">
            <div>
                <h3 className="text-xl md:text-2xl font-black text-gray-900 uppercase italic tracking-tighter leading-none">
                  {activeFilter === 'sin_ruta' ? 'Locales Sin Planificación' : 
                   activeFilter === 'locales' ? 'Listado de Locales Asignados' : 
                   activeFilter === 'usuarios' ? 'Listado de Usuarios Asignados' : 
                   activeFilter ? `Detalle: ${cards.find(c => c.id === activeFilter)?.label}` : 
                   'Mi Cartera Global'}
                </h3>
                <p className="text-[9px] md:text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">
                  {activeFilter ? 'Mostrando resultados filtrados' : 'Todos los locales bajo tu gestión'}
                </p>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full lg:w-auto">
                {/* Filtro Rápido por Día de la semana */}
                <div className="flex items-center gap-1 bg-white border border-gray-100 p-1 rounded-xl shadow-sm overflow-x-auto shrink-0">
                    <button 
                      onClick={() => setSelectedDay(null)} 
                      className={`px-3 py-2 rounded-lg text-[9px] font-black uppercase transition-colors shrink-0 ${!selectedDay ? 'bg-gray-900 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-50'}`}
                    >
                      Todos
                    </button>
                    {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map(day => (
                      <button 
                        key={day} 
                        onClick={() => setSelectedDay(day)} 
                        className={`w-8 h-8 rounded-lg text-[10px] font-black uppercase transition-colors flex items-center justify-center shrink-0 ${selectedDay === day ? 'bg-[#87be00] text-white shadow-sm' : 'text-gray-600 hover:bg-gray-50'}`}
                      >
                        {day}
                      </button>
                    ))}
                </div>

                {/* Buscador */}
                <div className="relative w-full sm:w-64 lg:w-80">
                    <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input 
                        type="text" 
                        placeholder={activeFilter === 'usuarios' ? "BUSCAR USUARIO..." : "BUSCAR USUARIO O LOCAL..."}
                        className="w-full bg-white border border-gray-100 rounded-xl md:rounded-[1.5rem] py-3 md:py-4 pl-10 md:pl-12 pr-4 text-[10px] font-black uppercase shadow-sm focus:ring-2 focus:ring-[#87be00]/20 outline-none transition-all"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>
        </div>

        {/* VISTA MÓVIL: Tarjetas Adaptativas */}
        <div className="md:hidden space-y-4 px-2">
          <AnimatePresence>
            {activeFilter === 'usuarios' ? (
              /* MÓVIL: Tarjetas de Usuarios Asignados */
              uniqueUsers.length > 0 ? (
                uniqueUsers.map((u, idx) => (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }} 
                    animate={{ opacity: 1, y: 0 }} 
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ delay: idx * 0.05 }}
                    key={`${u.id}-${idx}`}
                    className="bg-white p-4 rounded-3xl shadow-sm border border-gray-100 flex flex-col gap-3 relative overflow-hidden"
                  >
                    <div className="absolute top-0 left-0 h-full w-1.5 bg-indigo-600"></div>
                    <div className="flex items-center gap-3 pl-2">
                      <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 font-black text-xs uppercase overflow-hidden">
                        <img src={`https://ui-avatars.com/api/?name=${u.name}&background=e0e7ff&color=4338ca&bold=true`} alt="avatar" className="w-full h-full object-cover" />
                      </div>
                      <div>
                        <p className="text-[13px] font-black text-gray-900 uppercase italic leading-tight tracking-tighter truncate max-w-[200px]">{u.name}</p>
                        <p className="text-[9px] font-bold text-indigo-600 uppercase mt-0.5 tracking-widest">{u.locales.length} Locales asignados</p>
                      </div>
                    </div>
                    <div className="bg-gray-50/50 rounded-2xl p-3 max-h-24 overflow-y-auto">
                      <p className="text-[8px] font-black text-gray-400 uppercase tracking-wider mb-1">Sucursales a cargo:</p>
                      <div className="flex flex-wrap gap-1">
                        {u.locales.map((loc, i) => (
                          <span key={i} className="bg-white px-2 py-0.5 border border-gray-100 rounded-md text-[9px] font-bold text-gray-600 uppercase truncate max-w-full">
                            {loc}
                          </span>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                ))
              ) : (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-white rounded-3xl p-8 text-center border border-gray-100">
                    <FiUsers size={24} className="mx-auto mb-3 text-gray-300" />
                    <p className="text-[10px] font-black text-gray-400 uppercase italic tracking-widest">No hay usuarios para mostrar</p>
                </motion.div>
              )
            ) : activeFilter === 'locales' ? (
              /* MÓVIL: Tarjetas de Locales Asignados Limpias */
              filteredLocales.length > 0 ? (
                filteredLocales.map((item, idx) => (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }} 
                    animate={{ opacity: 1, y: 0 }} 
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ delay: idx * 0.05 }}
                    key={`${item.id}-${idx}`}
                    className="bg-white p-4 rounded-3xl shadow-sm border border-gray-100 flex flex-col gap-2 relative overflow-hidden"
                  >
                    <div className="absolute top-0 left-0 h-full w-1.5 bg-blue-600"></div>
                    <span className="bg-gray-100 px-2 py-1 rounded-md text-[9px] font-black text-gray-600 uppercase w-max tracking-wider">
                      {item.codigo_local || 'S/N'}
                    </span>
                    <p className="text-sm font-black text-gray-900 uppercase italic tracking-tighter leading-none mt-1">{item.cadena}</p>
                    <div className="flex items-start gap-2 text-gray-500 mt-2 bg-gray-50/50 p-2 rounded-xl">
                      <FiMapPin size={12} className="shrink-0 mt-0.5" />
                      <span className="text-[10px] font-bold uppercase italic leading-tight">{item.direccion}</span>
                    </div>
                  </motion.div>
                ))
              ) : (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-white rounded-3xl p-8 text-center border border-gray-100">
                    <FiMapPin size={24} className="mx-auto mb-3 text-gray-300" />
                    <p className="text-[10px] font-black text-gray-400 uppercase italic tracking-widest">No hay locales asignados</p>
                </motion.div>
              )
            ) : (
              /* MÓVIL: Demás estados */
              filteredLocales.length > 0 ? (
                filteredLocales.map((item, idx) => (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }} 
                    animate={{ opacity: 1, y: 0 }} 
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ delay: idx * 0.05 }}
                    key={`${item.id}-${idx}`}
                    className="bg-white p-4 rounded-3xl shadow-sm border border-gray-100 flex flex-col gap-4 relative overflow-hidden"
                  >
                    {item.estado !== 'sin_planificacion' && (
                      <div className="absolute top-4 right-4">
                        {item.estado === 'pendiente' && <span className="bg-red-50 text-red-600 px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest">Pendiente</span>}
                        {item.estado === 'en_curso' && <span className="bg-yellow-50 text-yellow-600 px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest">En Proceso</span>}
                        {item.estado === 'finalizado' && <span className="bg-green-50 text-green-600 px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest">Finalizada</span>}
                      </div>
                    )}

                    <div className="flex items-start gap-3">
                      {item.estado === 'sin_planificacion' ? (
                        <div>
                          <span className="bg-gray-100 px-2 py-1 rounded-md text-[9px] font-black text-gray-600 uppercase mb-1 inline-block">
                            {item.codigo_local || 'S/N'}
                          </span>
                          <p className="text-sm font-black text-gray-900 uppercase italic tracking-tighter leading-none">{item.cadena}</p>
                        </div>
                      ) : (
                        <>
                          <div className="w-10 h-10 rounded-2xl bg-gray-100 overflow-hidden shrink-0">
                            <img src={`https://ui-avatars.com/api/?name=${item.mercaderista || 'User'}&background=random&bold=true`} alt="avatar" />
                          </div>
                          <div className="pr-16">
                            <p className="text-sm font-black text-gray-900 uppercase italic tracking-tighter leading-none">{item.mercaderista || 'Mercaderista'}</p>
                            <p className="text-[10px] font-bold text-gray-600 uppercase italic mt-1 truncate">{item.cadena || 'Local X'}</p>
                          </div>
                        </>
                      )}
                    </div>

                    <div className="bg-gray-50/50 rounded-2xl p-3 space-y-3">
                      {item.estado === 'sin_planificacion' ? (
                        <div className="flex items-start gap-2 text-gray-500">
                          <FiMapPin size={12} className="shrink-0 mt-0.5" />
                          <span className="text-[10px] font-bold uppercase italic leading-tight">{item.direccion}</span>
                        </div>
                      ) : (
                        <>
                          {item.estado === 'finalizado' ? (
                            <div className="flex justify-between items-center border-b border-gray-100 pb-2">
                              <div>
                                <p className="text-[9px] font-bold text-gray-400 uppercase">Inicio / Término</p>
                                <p className="text-[11px] font-black text-gray-900 uppercase">{item.hora_inicio || '--:--'} - {item.hora_termino || '--:--'}</p>
                              </div>
                              <div className="text-right">
                                <p className="text-[9px] font-bold text-[#87be00] uppercase tracking-widest">Duración</p>
                                <p className="text-[11px] font-black text-gray-900">{calculateDuration(item.hora_inicio, item.hora_termino) || '--'}</p>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 text-gray-500 pb-2 border-b border-gray-100">
                              <FiClock size={12} />
                              <span className="text-[10px] font-bold uppercase">{item.hora_inicio ? `${item.hora_inicio} (Registrado)` : 'Sin ingreso aún'}</span>
                            </div>
                          )}
                          
                          <div className="flex justify-between items-center pt-1">
                            <WeekPlan 
                              plan={item.dias_planificados || ['L', 'M', 'X', 'J', 'V']} 
                              dayOfWeek={item.day_of_week}
                              visitDate={item.visit_date}
                              origin={item.origin}
                            />
                            <span className="text-[9px] font-bold text-gray-400 uppercase">{item.horario_plan || '07:30 - 14:30 hrs'}</span>
                          </div>
                        </>
                      )}
                    </div>
                    {/* ✅ MODIFICACIÓN: Redirección añadida en vista móvil */}
                    {/* 🚩 NUEVO: Si el local está sin planificación, el botón abre el modal */}
                    {item.estado === 'sin_planificacion' ? (
                      <button
                        onClick={() => {
                          setSelectedLocalForPlan(item);
                          setIsPlanModalOpen(true);
                        }}
                        className="w-full bg-gray-900 text-white py-3 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-[#87be00] transition-colors"
                      >
                        Crear Plan
                      </button>
                    ) : (
                      <button 
                        onClick={() => navigate('/supervisor/ejecucion')}
                        className="w-full bg-white border border-gray-200 text-gray-600 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-gray-50 active:bg-gray-100 transition-colors"
                      >
                        Ver Ficha <FiExternalLink size={12} />
                      </button>
                    )}
                  </motion.div>
                ))
              ) : (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-white rounded-3xl p-8 text-center border border-gray-100">
                    <FiMapPin size={24} className="mx-auto mb-3 text-gray-300" />
                    <p className="text-[10px] font-black text-gray-400 uppercase italic tracking-widest">No hay resultados para mostrar</p>
                </motion.div>
              )
            )}
          </AnimatePresence>
        </div>

        {/* VISTA DESKTOP: Tabla Dinámica */}
        <div className="hidden md:block bg-white rounded-[3rem] shadow-sm border border-gray-50 overflow-hidden mx-2">
          <div className="overflow-x-auto">
            {activeFilter === 'usuarios' ? (
              /* TABLA DE USUARIOS ASIGNADOS */
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50/50">
                    <th className="px-8 py-7 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 w-1/3">Mercaderista / Usuario</th>
                    <th className="px-8 py-7 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 w-1/3">Locales Asignados</th>
                    <th className="px-8 py-7 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 w-1/3 text-right">Detalle de Sucursales</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  <AnimatePresence>
                    {uniqueUsers.length > 0 ? (
                      uniqueUsers.map((u, idx) => (
                        <motion.tr 
                          initial={{ opacity: 0, x: -10 }} 
                          animate={{ opacity: 1, x: 0 }} 
                          exit={{ opacity: 0, scale: 0.95 }}
                          transition={{ delay: idx * 0.03 }}
                          key={`${u.id}-${idx}`} 
                          className="hover:bg-gray-50/50 transition-colors group cursor-default"
                        >
                          <td className="px-8 py-6">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 overflow-hidden">
                                <img src={`https://ui-avatars.com/api/?name=${u.name}&background=e0e7ff&color=4338ca&bold=true`} alt="avatar" />
                              </div>
                              <p className="text-sm font-black text-gray-900 uppercase italic tracking-tighter leading-none">{u.name}</p>
                            </div>
                          </td>
                          <td className="px-8 py-6">
                            <span className="bg-indigo-50 text-indigo-600 px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border border-indigo-100">
                              {u.locales.length} Locales Activos
                            </span>
                          </td>
                          <td className="px-8 py-6 text-right">
                            <div className="flex flex-wrap justify-end gap-1 max-w-md ml-auto">
                              {u.locales.map((loc, i) => (
                                <span key={i} className="bg-gray-50 px-3 py-1 rounded-lg text-[9px] font-black text-gray-600 uppercase border border-gray-100 truncate max-w-[180px]">
                                  {loc}
                                </span>
                              ))}
                            </div>
                          </td>
                        </motion.tr>
                      ))
                    ) : (
                      <motion.tr initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                        <td colSpan="3" className="py-24 text-center">
                            <div className="bg-gray-50 w-20 h-20 rounded-[2rem] flex items-center justify-center mx-auto mb-6 text-gray-200">
                                <FiUsers size={32} />
                            </div>
                            <p className="text-xs font-black text-gray-400 uppercase italic tracking-[0.3em]">No hay usuarios asignados</p>
                        </td>
                      </motion.tr>
                    )}
                  </AnimatePresence>
                </tbody>
              </table>
            ) : activeFilter === 'locales' ? (
              /* TABLA DE LOCALES ASIGNADOS SIMPLIFICADA */
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50/50">
                    <th className="px-8 py-7 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 w-1/4">Código de Local</th>
                    <th className="px-8 py-7 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 w-1/4">Cadena / Tienda</th>
                    <th className="px-8 py-7 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 w-1/2" colSpan="2">Dirección del Local</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  <AnimatePresence>
                    {filteredLocales.length > 0 ? (
                      filteredLocales.map((item, idx) => (
                        <motion.tr 
                            initial={{ opacity: 0, x: -10 }} 
                            animate={{ opacity: 1, x: 0 }} 
                            exit={{ opacity: 0, scale: 0.95 }}
                            transition={{ delay: idx * 0.03 }}
                            key={`${item.id}-${idx}`} 
                            className="hover:bg-gray-50/50 transition-colors group cursor-default"
                        >
                          <td className="px-8 py-6">
                            <span className="bg-gray-100 px-3 py-1 rounded-lg text-[10px] font-black text-gray-600 uppercase w-max tracking-wider inline-block">
                                {item.codigo_local || 'S/N'}
                            </span>
                          </td>
                          <td className="px-8 py-6">
                            <p className="text-sm font-black text-gray-900 uppercase italic tracking-tighter leading-none">{item.cadena}</p>
                          </td>
                          <td className="px-8 py-6" colSpan="2">
                            <div className="flex items-center gap-2 text-gray-500">
                                <FiMapPin size={12} className="shrink-0" />
                                <span className="text-[11px] font-bold uppercase italic leading-tight">{item.direccion}</span>
                            </div>
                          </td>
                        </motion.tr>
                      ))
                    ) : (
                      <motion.tr initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                        <td colSpan="4" className="py-24 text-center">
                            <div className="bg-gray-50 w-20 h-20 rounded-[2rem] flex items-center justify-center mx-auto mb-6 text-gray-200">
                                <FiMapPin size={32} />
                            </div>
                            <p className="text-xs font-black text-gray-400 uppercase italic tracking-[0.3em]">No hay locales asignados</p>
                        </td>
                      </motion.tr>
                    )}
                  </AnimatePresence>
                </tbody>
              </table>
            ) : activeFilter === 'sin_ruta' ? (
              /* 🚩 NUEVA TABLA: LOCALES SIN PLANIFICACIÓN
                 Columnas: Cadena - Local - Dirección - Estado / Sala - Acción (Crear Plan) */
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50/50">
                    <th className="px-8 py-7 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 w-1/5">Cadena</th>
                    <th className="px-8 py-7 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 w-1/6">Local</th>
                    <th className="px-8 py-7 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 w-1/3">Dirección</th>
                    <th className="px-8 py-7 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 w-1/6">Estado / Sala</th>
                    <th className="px-8 py-7 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 text-right">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  <AnimatePresence>
                    {filteredLocales.length > 0 ? (
                      filteredLocales.map((item, idx) => (
                        <motion.tr
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          transition={{ delay: idx * 0.03 }}
                          key={`${item.id}-${idx}`}
                          className="hover:bg-gray-50/50 transition-colors group cursor-default"
                        >
                          <td className="px-8 py-6">
                            <p className="text-sm font-black text-gray-900 uppercase italic tracking-tighter leading-none">
                              {item.cadena}
                            </p>
                          </td>
                          <td className="px-8 py-6">
                            <span className="bg-gray-100 px-3 py-1 rounded-lg text-[10px] font-black text-gray-600 uppercase w-max tracking-wider inline-block">
                              {item.codigo_local || 'S/N'}
                            </span>
                          </td>
                          <td className="px-8 py-6">
                            <div className="flex items-center gap-2 text-gray-500">
                              <FiMapPin size={12} className="shrink-0" />
                              <span className="text-[11px] font-bold uppercase italic leading-tight">
                                {item.direccion}
                              </span>
                            </div>
                          </td>
                          <td className="px-8 py-6">
                            <span className="bg-red-50 text-red-600 border border-red-100 px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest flex items-center gap-2 w-max">
                              <FiAlertCircle /> Sin Asignar
                            </span>
                          </td>
                          <td className="px-8 py-6 text-right">
                            <button
                              onClick={() => {
                                setSelectedLocalForPlan(item);
                                setIsPlanModalOpen(true);
                              }}
                              className="inline-block bg-gray-900 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-[#87be00] transition-colors shadow-sm"
                            >
                              Crear Plan
                            </button>
                          </td>
                        </motion.tr>
                      ))
                    ) : (
                      <motion.tr initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                        <td colSpan="5" className="py-24 text-center">
                          <div className="bg-gray-50 w-20 h-20 rounded-[2rem] flex items-center justify-center mx-auto mb-6 text-gray-200">
                            <FiMapPin size={32} />
                          </div>
                          <p className="text-xs font-black text-gray-400 uppercase italic tracking-[0.3em]">No hay locales sin planificación</p>
                        </td>
                      </motion.tr>
                    )}
                  </AnimatePresence>
                </tbody>
              </table>
            ) : (
              /* TABLA ESTÁNDAR PARA RUTAS */
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50/50">
                    <th className="px-8 py-7 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 w-1/4">Mercaderista</th>
                    <th className="px-8 py-7 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 w-1/5">Estado / Local</th>
                    <th className="px-8 py-7 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Horarios Registrados</th>
                    <th className="px-8 py-7 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Planificación</th>
                    {activeFilter !== 'sin_ruta' && (
                      <th className="px-8 py-7 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 text-right">Acción</th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  <AnimatePresence>
                    {filteredLocales.length > 0 ? (
                      filteredLocales.map((item, idx) => (
                        <motion.tr 
                            initial={{ opacity: 0, x: -10 }} 
                            animate={{ opacity: 1, x: 0 }} 
                            exit={{ opacity: 0, scale: 0.95 }}
                            transition={{ delay: idx * 0.03 }}
                            key={`${item.id}-${idx}`} 
                            className="hover:bg-gray-50/50 transition-colors group cursor-default"
                        >
                          <td className="px-8 py-6">
                            {item.estado === 'sin_planificacion' ? (
                              <div>
                                <span className="bg-gray-100 px-3 py-1 rounded-lg text-[10px] font-black text-gray-600 uppercase mb-2 inline-block">
                                    {item.codigo_local || 'S/N'}
                                </span>
                                <p className="text-sm font-black text-gray-900 uppercase italic tracking-tighter leading-none">{item.cadena}</p>
                              </div>
                            ) : (
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-2xl bg-gray-100 overflow-hidden shrink-0">
                                  <img src={`https://ui-avatars.com/api/?name=${item.mercaderista || 'User'}&background=random&bold=true`} alt="avatar" />
                                </div>
                                <div>
                                  <p className="text-sm font-black text-gray-900 uppercase italic tracking-tighter leading-none">{item.mercaderista || 'Mercaderista'}</p>
                                  <p className="text-[9px] font-bold text-[#87be00] mt-1 uppercase tracking-widest">Punto de Venta Activo</p>
                                </div>
                              </div>
                            )}
                          </td>

                          <td className="px-8 py-6">
                            {item.estado === 'sin_planificacion' ? (
                              <span className="bg-red-50 text-red-600 border border-red-100 px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest flex items-center gap-2 w-max">
                                <FiAlertCircle /> Sin Asignar
                              </span>
                            ) : (
                              <div>
                                {item.estado === 'pendiente' && <span className="bg-red-50 text-red-600 px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest">Pendiente</span>}
                                {item.estado === 'en_curso' && <span className="bg-yellow-50 text-yellow-600 px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest">En Proceso</span>}
                                {item.estado === 'finalizado' && <span className="bg-green-50 text-green-600 px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest">Finalizada</span>}
                                <p className="text-[11px] font-bold text-gray-600 uppercase italic mt-2">{item.cadena || 'Local X'}</p>
                              </div>
                            )}
                          </td>

                          <td className="px-8 py-6">
                            {item.estado === 'sin_planificacion' ? (
                              <div className="flex items-center gap-2 text-gray-500">
                                  <FiMapPin size={12} className="shrink-0" />
                                  <span className="text-[11px] font-bold uppercase italic leading-tight">{item.direccion}</span>
                              </div>
                            ) : (
                              <div className="space-y-1">
                                {item.estado === 'finalizado' ? (
                                  <>
                                    <p className="text-[10px] font-bold text-gray-500 uppercase"><span className="text-gray-900">Inicio:</span> {item.hora_inicio || '--:--'}</p>
                                    <p className="text-[10px] font-bold text-gray-500 uppercase"><span className="text-gray-900">Término:</span> {item.hora_termino || '--:--'}</p>
                                    <p className="text-[9px] font-black text-[#87be00] uppercase tracking-widest mt-1">Duración: {calculateDuration(item.hora_inicio, item.hora_termino) || '--'}</p>
                                  </>
                                ) : (
                                  <div className="flex items-center gap-2 text-gray-400">
                                    <FiClock size={12} />
                                    <span className="text-[10px] font-bold uppercase">{item.hora_inicio ? `${item.hora_inicio} (Registrado)` : 'Sin ingreso'}</span>
                                  </div>
                                )}
                              </div>
                            )}
                          </td>

                          <td className="px-8 py-6">
                             <div className="space-y-2">
                               <div className="flex items-center gap-2">
                                 <FiCalendar size={12} className="text-gray-400" />
                                 <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Planificación Semanal</span>
                               </div>
                               <WeekPlan 
                                 plan={item.dias_planificados || ['L', 'M', 'X', 'J', 'V']} 
                                 dayOfWeek={item.day_of_week}
                                 visitDate={item.visit_date}
                                 origin={item.origin}
                               />
                               <p className="text-[9px] font-bold text-gray-400 uppercase mt-1">Horario: {item.horario_plan || '07:30 - 14:30 hrs'}</p>
                             </div>
                          </td>

                          {activeFilter !== 'sin_ruta' && (
                            <td className="px-8 py-6 text-right">
                              {item.estado === 'sin_planificacion' ? (
                                <button
                                  onClick={() => {
                                    setSelectedLocalForPlan(item);
                                    setIsPlanModalOpen(true);
                                  }}
                                  className="bg-gray-900 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-[#87be00] transition-colors shadow-sm"
                                >
                                  Crear Plan
                                </button>
                              ) : (
                                /* ✅ MODIFICACIÓN: Redirección añadida en vista de escritorio */
                                <button 
                                  onClick={() => navigate('/supervisor/ejecucion')}
                                  className="w-10 h-10 bg-gray-50 text-gray-400 rounded-2xl flex items-center justify-center ml-auto group-hover:bg-gray-900 group-hover:text-[#87be00] transition-all duration-300 shadow-sm group-hover:shadow-lg group-hover:-translate-y-1"
                                >
                                  <FiExternalLink size={16} />
                                </button>
                              )}
                            </td>
                          )}
                        </motion.tr>
                      ))
                    ) : (
                      <motion.tr initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                        <td colSpan={activeFilter !== 'sin_ruta' ? 5 : 4} className="py-24 text-center">
                            <div className="bg-gray-50 w-20 h-20 rounded-[2rem] flex items-center justify-center mx-auto mb-6 text-gray-200">
                                <FiMapPin size={32} />
                            </div>
                            <p className="text-xs font-black text-gray-400 uppercase italic tracking-[0.3em]">No hay datos para este filtro</p>
                        </td>
                      </motion.tr>
                    )}
                  </AnimatePresence>
                </tbody>
              </table>
            )}
          </div>
        </div>

      </div>

      {/* Modal de Justificación */}
      {isPlanModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-[2rem] p-6 w-full max-w-sm shadow-2xl animate-in zoom-in duration-300">
            <h3 className="text-sm font-black uppercase tracking-widest mb-4">Motivo de Planificación</h3>
            
            <div className="space-y-2 mb-6">
              {REASONS.map((r) => (
                <button
                  key={r}
                  onClick={() => setReason(r)}
                  className={`w-full text-left p-4 rounded-xl text-[11px] font-bold uppercase transition-all ${
                    reason === r ? 'bg-[#87be00] text-white' : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>

            <div className="flex gap-2">
              <button 
                onClick={() => setIsPlanModalOpen(false)}
                className="flex-1 py-3 bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors rounded-xl text-[10px] font-black uppercase"
              >
                Cancelar
              </button>
              <button 
                disabled={!reason}
                onClick={() => {
                  // 🚩 CORRECCIÓN DE LA RUTA AQUÍ:
                  navigate('/supervisor/routes', { 
                    state: { 
                      reason, 
                      localId: selectedLocalForPlan?.id, 
                      cadena: selectedLocalForPlan?.cadena 
                    } 
                  });
                  setIsPlanModalOpen(false);
                }}
                className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase transition-colors ${!reason ? 'bg-gray-300 cursor-not-allowed' : 'bg-black text-white hover:bg-[#87be00]'}`}
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default SupervisorPanel;