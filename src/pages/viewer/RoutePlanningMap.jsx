import React, { useEffect, useRef, useState, useMemo, useCallback } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import api from "../../api/apiClient";
import { FiNavigation, FiAlertCircle, FiMapPin, FiChevronRight, FiList, FiRefreshCw, FiUsers, FiUserCheck } from "react-icons/fi";

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;
mapboxgl.accessToken = MAPBOX_TOKEN;

const POLL_INTERVAL = 15000;

const statusToColor = (status) => {
  switch (status) {
    case 'IN_PROGRESS': return '#87be00'; // Verde
    case 'PENDING':     return '#ef4444'; // Rojo
    case 'COMPLETED':   return '#2563eb'; // Azul
    default:            return '#94a3b8'; // Gris
  }
};

const statusLabel = (status) => {
  switch (status) {
    case 'IN_PROGRESS': return 'En Proceso';
    case 'PENDING':     return 'Pendiente';
    case 'COMPLETED':   return 'Completada';
    default:            return 'Sin estado';
  }
};

const statusBg = (status) => {
  switch (status) {
    case 'IN_PROGRESS': return 'bg-[#87be00]/10 text-[#87be00] border-[#87be00]/20';
    case 'PENDING':     return 'bg-red-50 text-red-500 border-red-100';
    case 'COMPLETED':   return 'bg-blue-50 text-blue-600 border-blue-100';
    default:            return 'bg-gray-50 text-gray-500 border-gray-100';
  }
};

// 🚩 FIX: Extrae la fecha, o asume "Hoy" si la planificación usa días de la semana (IS NULL)
const extractDate = (row) => {
  const rawDate = row.visit_date || row.fecha || row.created_at;

  if (!rawDate) return '';

  try {
    const date = new Date(rawDate);
    if (isNaN(date.getTime())) return '';

    return date.toLocaleDateString('es-CL', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  } catch (error) {
    return '';
  }
};


const extractPlanningTime = (row) => {
  if (!row.start_time) return "";

  // "16:30:00" -> "16:30"
  return row.start_time.slice(0, 5);
};

const extractPlanningDate = (row) => ({
  date: extractDate(row),
  time: extractPlanningTime(row),
});



const getRouteDate = (route) => {
  const rawDate = route.visit_date || route.fecha || route.created_at;
  if (!rawDate) return null;

  const date = new Date(rawDate);
  if (isNaN(date.getTime())) return null;

  return date;
};



const RoutePlanningMap = () => {
  const mapContainer = useRef(null);
  const map = useRef(null);
  const markers = useRef([]);
  const pollRef = useRef(null);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const didInitialFit = useRef(false);
  

  const [routes, setRoutes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [panelOpen, setPanelOpen] = useState(true);
  const [selectedRoute, setSelectedRoute] = useState(null);
  const [selectedSupervisor, setSelectedSupervisor] = useState(null);

  const [expandedSupervisors, setExpandedSupervisors] = useState({});
  const [expandedLocales, setExpandedLocales] = useState({});
  const [expandedLocaleUsers, setExpandedLocaleUsers] = useState({});
  const [expandedUsers, setExpandedUsers] = useState({});

  const toggleExpandSupervisor = (key) => setExpandedSupervisors(prev => ({ ...prev, [key]: !prev[key] }));
  const toggleExpandLocale     = (key) => setExpandedLocales(prev => ({ ...prev, [key]: !prev[key] }));
  const toggleExpandLocaleUser = (key) => setExpandedLocaleUsers(prev => ({ ...prev, [key]: !prev[key] }));
  const toggleExpandUser       = (key) => setExpandedUsers(prev => ({ ...prev, [key]: !prev[key] }));

  

  const fetchRoutes = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      else setRefreshing(true);
      
      const response = await api.get("/planning");
      console.log(response.data);
      const rawData = response.data || response;
      const data = Array.isArray(rawData) ? rawData : [];
      console.log("📦 DATA COMPLETA:", data);
console.log("📦 PRIMER REGISTRO:", data[0]);

      setRoutes(data);
      setLastUpdated(new Date());

      if (!silent && data.length > 0) {
        const uniqueSups = [...new Set(data.map(r => r.supervisor_nombre || 'Sin Supervisor'))];
        const initialExpand = {};
        uniqueSups.forEach(sup => initialExpand[sup] = true);
        setExpandedSupervisors(initialExpand);
      }
    } catch (error) {
      console.error("Error cargando planificación:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchRoutes(false);
    pollRef.current = setInterval(() => fetchRoutes(true), POLL_INTERVAL);
    return () => clearInterval(pollRef.current);
  }, [fetchRoutes]);

  const filteredRoutes = useMemo(() => {

  if (!dateFrom && !dateTo) return routes;

  const from = dateFrom ? new Date(dateFrom) : null;
  const to = dateTo ? new Date(dateTo) : null;

  if (to) to.setHours(23, 59, 59, 999);

  return routes.filter((route) => {
    const d = getRouteDate(route);
    if (!d) return false;

    if (from && d < from) return false;
    if (to && d > to) return false;

    return true;
  });
}, [routes, dateFrom, dateTo]);

  const stats = useMemo(() => ({
  total: filteredRoutes.length,
  pending: filteredRoutes.filter(r => r.status === 'PENDING').length,
  inProgress: filteredRoutes.filter(r => r.status === 'IN_PROGRESS').length,
  completed: filteredRoutes.filter(r => r.status === 'COMPLETED').length,
}), [filteredRoutes]);

    const filteredTableRoutes = useMemo(() => {
  if (!selectedSupervisor) return [];
  return filteredRoutes.filter(r => (r.supervisor_nombre || 'Sin Supervisor') === selectedSupervisor);
}, [filteredRoutes, selectedSupervisor]);

  const groupedData = useMemo(() => {
    const mapObj = {};

    filteredRoutes.forEach(route => {
      const supName = route.supervisor_nombre || 'Sin Supervisor';
      
      if (!mapObj[supName]) {
        mapObj[supName] = {
          localesMap: {},
          usuariosMap: {}
        };
      }

      const nombreVisibleLocal = route.local_nombre || route.cadena || 'Local sin nombre';

      if (route.origen === 'LOCAL') {
        const localKey = route.codigo_local || route.local_nombre || 'SIN_CODIGO';
        
        if (!mapObj[supName].localesMap[localKey]) {
          mapObj[supName].localesMap[localKey] = {
            nombre_mostrar: nombreVisibleLocal,
            comuna: route.comuna,
            codigo: route.codigo_local,
            routesByUser: {}
          };
        }
        const userKey = route.usuario_nombre || 'Sin usuario';
        if (!mapObj[supName].localesMap[localKey].routesByUser[userKey]) {
          mapObj[supName].localesMap[localKey].routesByUser[userKey] = [];
        }
        mapObj[supName].localesMap[localKey].routesByUser[userKey].push(route);
      } else {
        const userKey = route.usuario_nombre || 'Sin usuario';
        if (!mapObj[supName].usuariosMap[userKey]) {
          mapObj[supName].usuariosMap[userKey] = [];
        }
        mapObj[supName].usuariosMap[userKey].push(route);
      }
    });

    return mapObj;
  }, [filteredRoutes]);

  useEffect(() => {
    if (map.current) return;
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/light-v11",
      center: [-70.6483, -33.4569],
      zoom: 14
    });
    map.current.addControl(new mapboxgl.NavigationControl(), "top-right");
  }, []);

  useEffect(() => {
    if (map.current) {
      const resizeTimer = setTimeout(() => map.current.resize(), 500);
      return () => clearTimeout(resizeTimer);
    }
  }, [panelOpen]);

  useEffect(() => {
    if (!map.current) return;
    const paintMarkers = () => {
      markers.current.forEach((m) => m.remove());
      markers.current = [];
      const bounds = new mapboxgl.LngLatBounds();
      let hasCoords = false;

      filteredRoutes.forEach((route) => {

        const lat = parseFloat(route.lat);
        const lng = parseFloat(route.lng);
        if (isNaN(lat) || isNaN(lng)) return;

        hasCoords = true;
        const el = document.createElement("div");
        el.style.cssText = `width:24px;height:24px;background-color:${statusToColor(route.status)};border-radius:50%;border:3px solid white;box-shadow:0 4px 6px rgba(0,0,0,0.3);cursor:pointer;transition:transform 0.2s cubic-bezier(0.34,1.56,0.64,1);`;
        el.style.transition = "transform 0.2s ease";

        const nombreVisible = route.local_nombre || route.cadena || 'Local sin nombre';

        const marker = new mapboxgl.Marker(el)
        .setLngLat([lng, lat])
        .addTo(map.current);

        markers.current.push(marker);
        bounds.extend([lng, lat]);

       const popup = new mapboxgl.Popup({
  closeButton: false,
  closeOnClick: false,
  offset: 25,
  className: "custom-popup"
}).setHTML(`
  <div style="font-family: Outfit; font-size: 11px; min-width: 180px;">
    
    <div style="font-weight: 900; text-transform: uppercase; font-size: 12px;">
      ${nombreVisible}
    </div>

    <div style="color:#6b7280; font-size:10px; margin-top:2px;">
      ${route.cadena || ''} · ${route.codigo_local || ''}
    </div>

    <div style="margin-top:6px; font-weight:700; font-size:11px;">
      👤 ${route.usuario_nombre}
    </div>

    <div style="margin-top:4px; font-size:10px; color:#6b7280;">
      📅 ${extractDate(route)}
    </div>

    <div style="margin-top:8px;">
      <span style="
        font-size:10px;
        font-weight:900;
        color:white;
        background:${statusToColor(route.status)};
        padding:3px 8px;
        border-radius:6px;
        display:inline-block;
      ">
        ${statusLabel(route.status)}
      </span>
    </div>

  </div>
`);

el.addEventListener("mouseenter", () => {
  popup.setLngLat([lng, lat]).addTo(map.current);
});

el.addEventListener("mouseleave", () => {
  popup.remove();
});

      });

      if (hasCoords && !didInitialFit.current) {
  map.current.fitBounds(bounds, { padding: 80, duration: 1000 });
  didInitialFit.current = true;
}
    };

    if (map.current.isStyleLoaded()) paintMarkers();
    else map.current.once('style.load', paintMarkers);
  }, [filteredRoutes]);

  // 🚩 FIX: Configuración robusta para volar al punto seleccionado
  const flyToRoute = (route) => {
    const lat = parseFloat(route.lat);
    const lng = parseFloat(route.lng);
    if (!map.current || isNaN(lat) || isNaN(lng)) return;
    
    setSelectedRoute(route);
    
    map.current.flyTo({ 
  center: [lng, lat],
  zoom: Math.min(map.current.getZoom(), 14),
  duration: 1200,
  essential: true
});

    // Ocultar panel en móviles para ver el mapa
    if (window.innerWidth < 1024) setPanelOpen(false);
  };

  const formatLastUpdated = (date) => {
    if (!date) return '';
    return date.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  return (
    <div className="w-full h-full flex flex-col font-[Outfit] bg-gray-50/50">
          {/* HEADER */}
      <div className="bg-white border-b border-gray-100 px-6 py-6 md:px-8 md:py-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 z-10 shrink-0">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#87be00]/10 rounded-lg text-[#87be00]"><FiNavigation size={20} /></div>
            <h2 className="text-xl md:text-2xl font-black text-gray-900 uppercase italic tracking-tighter leading-none">Monitoreo GPS</h2>
          </div>
          <p className="text-[10px] md:text-xs font-bold text-[#87be00] uppercase tracking-[0.2em] ml-12 mt-1">Planificación y seguimiento en tiempo real</p>
        </div>
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full md:w-auto">
          <div className="flex gap-4 bg-gray-50 px-5 py-3 rounded-[1rem] border border-gray-100 w-full sm:w-auto justify-center">
            <span className="text-[10px] font-black flex items-center gap-2 uppercase tracking-widest text-gray-500"><span className="w-2.5 h-2.5 rounded-full bg-[#ef4444] shadow-sm"></span>Pendiente</span>
            <span className="text-[10px] font-black flex items-center gap-2 uppercase tracking-widest text-gray-500"><span className="w-2.5 h-2.5 rounded-full bg-[#87be00] shadow-sm"></span>Proceso</span>
            <span className="text-[10px] font-black flex items-center gap-2 uppercase tracking-widest text-gray-500"><span className="w-2.5 h-2.5 rounded-full bg-[#2563eb] shadow-sm"></span>Lista</span>
          </div>
          {lastUpdated && (
            <div className="flex items-center justify-center gap-2 bg-gray-900 px-5 py-3 rounded-[1rem] shadow-xl w-full sm:w-auto">
              <span className={`w-2 h-2 rounded-full ${refreshing ? 'bg-yellow-400 animate-pulse' : 'bg-[#87be00]'}`}></span>
              <span className="text-[10px] font-black uppercase text-white tracking-widest whitespace-nowrap">
                {refreshing ? 'Actualizando...' : `Act: ${formatLastUpdated(lastUpdated)}`}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* CONTENIDO */}
      <div className="flex-1 flex flex-col p-4 md:p-8 gap-4 md:gap-6 overflow-hidden relative">

        <div className="bg-white rounded-[1.5rem] border border-gray-100 shadow-sm p-4 md:p-5 flex items-center gap-4 md:gap-8 overflow-x-auto shrink-0">
          <div className="flex items-center gap-3 shrink-0">
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 whitespace-nowrap">Resumen Rutas</p>
            <div className="flex items-center gap-2">
              {refreshing && <FiRefreshCw size={12} className="text-[#87be00] animate-spin" />}
              <span className="text-2xl md:text-3xl font-black italic text-gray-900 leading-none">{stats.total}</span>
            </div>
          </div>
          <div className="hidden sm:block w-px h-8 bg-gray-100 shrink-0" />
          <div className="flex items-center gap-5 md:gap-8 flex-1 min-w-0">
            {[
              { label: 'Pendiente',  count: stats.pending,    color: 'bg-[#ef4444]' },
              { label: 'En Proceso', count: stats.inProgress, color: 'bg-[#87be00]' },
              { label: 'Completada', count: stats.completed,  color: 'bg-[#2563eb]' },
            ].map(({ label, count, color }) => (
              <div key={label} className="min-w-[88px] shrink-0">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className={`w-2.5 h-2.5 rounded-full ${color}`}></span>
                  <span className="text-[10px] font-black uppercase tracking-widest text-gray-500 whitespace-nowrap">{label}</span>
                  <span className="text-xs font-black text-gray-800 ml-auto">{count}</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                  <div className={`${color} h-full rounded-full transition-all duration-1000 ease-out`} style={{ width: stats.total ? `${(count / stats.total) * 100}%` : '0%' }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* MAPA */}
        <div className="flex-[2] min-h-[280px] bg-white rounded-[2rem] shadow-sm border border-gray-100 relative overflow-hidden">
          {!loading && routes.length === 0 && (
            <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-4 text-gray-400 bg-gray-50/80 backdrop-blur-sm">
              <div className="w-16 h-16 rounded-full bg-white shadow-sm flex items-center justify-center text-gray-300"><FiAlertCircle size={32} /></div>
              <p className="font-black uppercase text-xs tracking-widest">No hay rutas encontradas</p>
            </div>
          )}
          <div ref={mapContainer} className="w-full h-full" />
          <button
            onClick={() => setPanelOpen(!panelOpen)}
            className="absolute top-6 left-6 z-10 bg-gray-900 text-white shadow-xl shadow-gray-900/20 rounded-2xl p-4 hover:bg-black hover:scale-105 active:scale-95 transition-all flex items-center gap-2"
          >
            <FiList size={20} />
            <span className="text-[10px] font-black uppercase tracking-widest hidden sm:block">Jerarquía</span>
          </button>
          {loading && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/50 backdrop-blur-sm">
              <div className="w-16 h-16 border-4 border-gray-100 border-t-[#87be00] rounded-full animate-spin"></div>
            </div>
          )}
        </div>

        {/* PANEL JERÁRQUICO */}
        <div className={`
          transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] overflow-hidden shrink-0
          ${panelOpen ? 'max-h-[45vh] sm:max-h-[40vh] lg:max-h-[360px] opacity-100' : 'max-h-0 opacity-0'}
        `}>
          <div className="bg-white rounded-[2rem] border border-gray-100 shadow-xl shadow-gray-200/50 flex flex-col overflow-hidden h-[45vh] sm:h-[40vh] lg:h-[360px]">
            <div className="px-6 py-5 border-b border-gray-50 flex items-center justify-between bg-white shrink-0">
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 flex items-center gap-2">
                <FiList size={16} className="text-[#87be00]" /> Despliegue Jerárquico
              </p>
            </div>

            <div className="overflow-y-auto flex-1 custom-scrollbar p-3">
              {Object.keys(groupedData).length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full py-10 gap-3 text-gray-300">
                  <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center"><FiMapPin size={20} /></div>
                  <p className="text-[10px] font-black uppercase tracking-widest">Sin asignaciones</p>
                </div>
              ) : (
                Object.entries(groupedData).map(([supName, supData]) => {
                  const isSupExpanded = expandedSupervisors[supName];
                  const hasLocales = Object.keys(supData.localesMap).length > 0;
                  const hasUsuarios = Object.keys(supData.usuariosMap).length > 0;

                  return (
                    <div key={supName} className="mb-4 border border-gray-100 rounded-3xl bg-gray-50/30 overflow-hidden shadow-sm">
                      <button
                        onClick={() => {
                          toggleExpandSupervisor(supName);
                          setSelectedSupervisor(prev => prev === supName ? null : supName);
                        }}
                        className={`w-full flex items-center p-4 transition-all border-b border-gray-100 group ${selectedSupervisor === supName ? 'bg-[#87be00]/10 ring-1 ring-[#87be00]/30' : 'bg-white hover:bg-gray-50'}`}
                      >
                        <div className="w-10 h-10 rounded-[12px] bg-gray-900 text-white flex items-center justify-center font-black text-sm shadow-md group-hover:scale-105 transition-transform shrink-0">
                          {supName.charAt(0)}
                        </div>
                        <div className="flex-1 text-left px-4 min-w-0">
                          <p className="text-[9px] font-black text-[#87be00] uppercase tracking-[0.2em] mb-0.5 flex items-center gap-1">
                            <FiUserCheck size={12} /> Supervisor
                          </p>
                          <p className="text-sm font-black text-gray-900 uppercase italic truncate leading-tight">
                            {supName}
                          </p>
                        </div>
                        <FiChevronRight size={18} className={`text-gray-300 group-hover:text-gray-600 transition-all duration-300 ${isSupExpanded ? 'rotate-90' : ''}`} />
                      </button>

                      <div className={`transition-all duration-500 ease-in-out ${isSupExpanded ? 'max-h-[3000px] opacity-100' : 'max-h-0 opacity-0 overflow-hidden'}`}>
                        <div className="p-2 space-y-3">
                          {hasLocales && (
                            <div className="bg-white rounded-2xl border border-gray-100 pb-1 shadow-sm">
                              <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-50">
                                <FiMapPin size={14} className="text-[#87be00] shrink-0" />
                                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-[#87be00]">Locales Asignados</p>
                                <span className="ml-auto bg-[#87be00]/10 text-[#87be00] px-2 py-0.5 rounded-md text-[10px] font-black">{Object.keys(supData.localesMap).length}</span>
                              </div>
                              <div className="p-1">
                                {Object.entries(supData.localesMap).map(([localKey, localData]) => {
                                  const uniqueLocalKey = `${supName}-${localKey}`;
                                  const isLocalExpanded = expandedLocales[uniqueLocalKey];
                                  const allRoutes = Object.values(localData.routesByUser).flat();
                                  const p = allRoutes.filter(r => r.status === 'PENDING').length;
                                  const ep = allRoutes.filter(r => r.status === 'IN_PROGRESS').length;
                                  const c = allRoutes.filter(r => r.status === 'COMPLETED').length;

                                  return (
                                    <div key={localKey} className="mx-1 mb-1">
                                      <button onClick={() => toggleExpandLocale(uniqueLocalKey)} className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-all group">
                                        <div className="w-8 h-8 rounded-[10px] bg-[#87be00]/10 text-[#87be00] flex items-center justify-center shrink-0">
                                          <FiMapPin size={16} />
                                        </div>
                                        <div className="flex-1 min-w-0 text-left">
                                          <p className="text-xs font-black uppercase italic text-gray-800 truncate leading-none mb-1 group-hover:text-[#87be00]">
                                            {localData.nombre_mostrar}
                                          </p>
                                          <div className="flex items-center gap-2 flex-wrap">
                                            <span className="text-[9px] font-bold text-gray-400 uppercase">{localData.codigo} · {localData.comuna}</span>
                                            {p>0 && <span className="flex items-center gap-1 text-[9px] font-black text-red-400 ml-1"><span className="w-2 h-2 rounded-full bg-[#ef4444]"></span>{p}</span>}
                                            {ep>0 && <span className="flex items-center gap-1 text-[9px] font-black text-[#87be00] ml-1"><span className="w-2 h-2 rounded-full bg-[#87be00]"></span>{ep}</span>}
                                            {c>0 && <span className="flex items-center gap-1 text-[9px] font-black text-blue-500 ml-1"><span className="w-2 h-2 rounded-full bg-[#2563eb]"></span>{c}</span>}
                                          </div>
                                        </div>
                                        <FiChevronRight size={16} className={`text-gray-300 group-hover:text-[#87be00] transition-transform ${isLocalExpanded ? 'rotate-90' : ''}`} />
                                      </button>
                                      <div className={`overflow-hidden transition-all duration-300 ${isLocalExpanded ? 'max-h-[800px] opacity-100' : 'max-h-0 opacity-0'}`}>
                                        <div className="ml-4 border-l-2 border-[#87be00]/20 pl-2 py-1 space-y-1">
                                          {Object.entries(localData.routesByUser).map(([userName, userRoutes]) => {
                                            const uniqueUserKey = `${supName}-${localKey}-${userName}`;
                                            const isUserExpanded = expandedLocaleUsers[uniqueUserKey];
                                            return (
                                              <div key={userName}>
                                                <button onClick={() => toggleExpandLocaleUser(uniqueUserKey)} className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg hover:bg-gray-50 group">
                                                  <FiUsers size={12} className="text-gray-400 group-hover:text-[#87be00]" />
                                                  <p className="text-[10px] font-black uppercase text-gray-600 truncate flex-1 text-left">{userName}</p>
                                                  <span className="text-[9px] font-black text-gray-400">{userRoutes.length} req</span>
                                                  <FiChevronRight size={12} className={`text-gray-300 ${isUserExpanded ? 'rotate-90' : ''}`} />
                                                </button>
                                                <div className={`overflow-hidden transition-all duration-300 ${isUserExpanded ? 'max-h-[400px] opacity-100' : 'max-h-0 opacity-0'}`}>
                                                  <div className="ml-3 pl-2 border-l border-gray-100 space-y-1 mt-1 mb-2">
                                                    {userRoutes.map((route, idx) => {
                                                      const nombreVisible = route.local_nombre || route.cadena || 'Sin nombre';
                                                      return (
                                                        <button key={idx} onClick={() => flyToRoute(route)} className={`w-full text-left p-2.5 rounded-lg flex items-center gap-2 ${selectedRoute === route ? 'bg-[#87be00]/10 ring-1 ring-[#87be00]/30' : 'hover:bg-gray-50'}`}>
                                                          <span className="w-2 h-2 rounded-full block shrink-0" style={{ backgroundColor: statusToColor(route.status) }} />
                                                          <span className="text-[10px] font-black uppercase text-gray-700 flex-1 truncate">{nombreVisible}</span>
                                                          <span className={`text-[8px] font-black uppercase px-2 py-1 rounded border ${statusBg(route.status)}`}>{statusLabel(route.status)}</span>
                                                        </button>
                                                      );
                                                    })}
                                                  </div>
                                                </div>
                                              </div>
                                            );
                                          })}
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                          {hasUsuarios && (
                            <div className="bg-white rounded-2xl border border-gray-100 pb-1 shadow-sm mt-3">
                              <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-50">
                                <FiUsers size={14} className="text-blue-500 shrink-0" />
                                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-blue-500">Usuarios Asignados</p>
                                <span className="ml-auto bg-blue-50 text-blue-500 px-2 py-0.5 rounded-md text-[10px] font-black">{Object.keys(supData.usuariosMap).length}</span>
                              </div>
                              <div className="p-1">
                                {Object.entries(supData.usuariosMap).map(([userName, userRoutes]) => {
                                  const uniqueUserKey = `${supName}-${userName}`;
                                  const isUserExpanded = expandedUsers[uniqueUserKey];
                                  const p = userRoutes.filter(r => r.status === 'PENDING').length;
                                  const ep = userRoutes.filter(r => r.status === 'IN_PROGRESS').length;
                                  const c = userRoutes.filter(r => r.status === 'COMPLETED').length;

                                  return (
                                    <div key={userName} className="mx-1 mb-1">
                                      <button onClick={() => toggleExpandUser(uniqueUserKey)} className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-blue-50/50 transition-all group">
                                        <div className="w-8 h-8 rounded-[10px] bg-blue-50 text-blue-500 flex items-center justify-center font-black text-sm shrink-0">
                                          {userName.charAt(0)}
                                        </div>
                                        <div className="flex-1 min-w-0 text-left">
                                          <p className="text-xs font-black uppercase italic text-gray-800 truncate leading-none mb-1 group-hover:text-blue-600">{userName}</p>
                                          <div className="flex items-center gap-2 flex-wrap">
                                            {p>0 && <span className="flex items-center gap-1 text-[9px] font-black text-red-400"><span className="w-2 h-2 rounded-full bg-[#ef4444]"></span>{p}</span>}
                                            {ep>0 && <span className="flex items-center gap-1 text-[9px] font-black text-[#87be00]"><span className="w-2 h-2 rounded-full bg-[#87be00]"></span>{ep}</span>}
                                            {c>0 && <span className="flex items-center gap-1 text-[9px] font-black text-blue-500"><span className="w-2 h-2 rounded-full bg-[#2563eb]"></span>{c}</span>}
                                            <span className="text-[9px] font-black text-gray-400 ml-auto">{userRoutes.length} rutas</span>
                                          </div>
                                        </div>
                                        <FiChevronRight size={16} className={`text-gray-300 group-hover:text-blue-500 transition-transform ${isUserExpanded ? 'rotate-90' : ''}`} />
                                      </button>
                                      <div className={`overflow-hidden transition-all duration-300 ${isUserExpanded ? 'max-h-[600px] opacity-100' : 'max-h-0 opacity-0'}`}>
                                        <div className="ml-4 border-l-2 border-blue-100 pl-2 py-1 space-y-1 mb-2">
                                          {userRoutes.map((route, idx) => {
                                            const nombreVisible = route.local_nombre || route.cadena || 'Sin nombre';
                                            return (
                                              <button key={idx} onClick={() => flyToRoute(route)} className={`w-full text-left p-3 rounded-lg flex items-center gap-3 ${selectedRoute === route ? 'bg-blue-50 ring-1 ring-blue-200' : 'hover:bg-gray-50'}`}>
                                                <span className="w-2.5 h-2.5 rounded-full block shrink-0" style={{ backgroundColor: statusToColor(route.status) }} />
                                                <div className="flex-1 min-w-0">
                                                  <p className="text-[10px] font-black uppercase text-gray-700 truncate leading-none mb-1.5">{nombreVisible}</p>
                                                  <p className="text-[9px] font-bold text-gray-400 uppercase truncate">{route.codigo_local || 'S/N'} · {route.comuna}</p>
                                                </div>
                                                <span className={`text-[8px] font-black uppercase px-2 py-1 rounded border ${statusBg(route.status)}`}>{statusLabel(route.status)}</span>
                                              </button>
                                            );
                                          })}
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* TABLA DETALLE */}
        {selectedSupervisor && (
          <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm p-6 mt-4 animate-in fade-in zoom-in duration-300">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-[#87be00] mb-4">
              Detalle de Rutas: {selectedSupervisor}
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="p-3 text-[10px] font-black uppercase text-gray-400">Supervisor</th>
                    <th className="p-3 text-[10px] font-black uppercase text-gray-400">Mercaderista</th>
                    <th className="p-3 text-[10px] font-black uppercase text-gray-400">Fecha</th>
                    <th className="p-3 text-[10px] font-black uppercase text-gray-400">Cadena</th>
                    <th className="p-3 text-[10px] font-black uppercase text-gray-400">Código</th>
                    <th className="p-3 text-[10px] font-black uppercase text-gray-400">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTableRoutes.map((r, i) => (
                    <tr 
                      key={i} 
                      onClick={() => flyToRoute(r)} // 🚩 Vuela al marcador al hacer clic
                      className={`border-b cursor-pointer transition-colors ${
                        selectedRoute === r 
                          ? 'bg-[#87be00]/20 border-[#87be00]/30' 
                          : 'border-gray-50 hover:bg-gray-50/50'
                      }`}
                    >
                      <td className="p-3 text-xs font-bold text-gray-700">{r.supervisor_nombre || 'N/A'}</td>
                      <td className="p-3 text-xs font-bold text-gray-700">{r.usuario_nombre}</td>
                     <td className="p-3 text-xs font-bold text-gray-700">
  <div className="flex flex-col">
    <span>{extractDate(r)}</span>
    <span className="text-[10px] text-gray-400 font-bold"> Hora de inicio: {extractPlanningTime(r)}
    </span>
  </div>
</td>
                      <td className="p-3 text-xs font-bold text-gray-700">{r.cadena}</td>
                      <td className="p-3 text-xs font-bold text-gray-700">{r.codigo_local}</td>
                      <td className="p-3">
                        <span className={`px-2 py-1 rounded text-[8px] font-black uppercase ${statusBg(r.status)}`}>
                          {statusLabel(r.status)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default RoutePlanningMap;