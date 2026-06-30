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
      
      const response = await api.get("/planning/data");
      const rawData = response.data || response;
      const data = Array.isArray(rawData) ? rawData : [];

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

        el.addEventListener("mouseenter", () => popup.setLngLat([lng, lat]).addTo(map.current));
        el.addEventListener("mouseleave", () => popup.remove());
      });

      if (hasCoords && !didInitialFit.current) {
        map.current.fitBounds(bounds, { padding: 80, duration: 1000 });
        didInitialFit.current = true;
      }
    };

    if (map.current.isStyleLoaded()) paintMarkers();
    else map.current.once('style.load', paintMarkers);
  }, [filteredRoutes]);

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

      {/* CONTENIDO PRINCIPAL */}
      <div className="flex-1 flex flex-col p-4 md:p-6 lg:p-8 gap-4 md:gap-6 overflow-hidden relative">

        {/* RESUMEN RUTAS */}
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

        {/* ZONA DIVIDIDA: MAPA Y PANEL LADO A LADO EN DESKTOP */}
        <div className="flex-1 flex flex-col lg:flex-row gap-4 md:gap-6 min-h-0 relative">
          
          {/* MAPA */}
          <div className="flex-1 lg:flex-[2] xl:flex-[3] min-h-[350px] lg:min-h-0 bg-white rounded-[2rem] shadow-sm border border-gray-100 relative overflow-hidden flex flex-col">
            {!loading && routes.length === 0 && (
              <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-4 text-gray-400 bg-gray-50/80 backdrop-blur-sm">
                <div className="w-16 h-16 rounded-full bg-white shadow-sm flex items-center justify-center text-gray-300"><FiAlertCircle size={32} /></div>
                <p className="font-black uppercase text-xs tracking-widest">No hay rutas encontradas</p>
              </div>
            )}
            <div ref={mapContainer} className="flex-1 w-full h-full" />
            
            <button
              onClick={() => setPanelOpen(!panelOpen)}
              className="absolute top-6 left-6 z-10 bg-gray-900 text-white shadow-xl shadow-gray-900/20 rounded-2xl p-4 hover:bg-black hover:scale-105 active:scale-95 transition-all flex items-center gap-2"
            >
              <FiList size={20} />
              <span className="text-[10px] font-black uppercase tracking-widest hidden sm:block">{panelOpen ? 'Ocultar' : 'Jerarquía'}</span>
            </button>
            
            {loading && (
              <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/50 backdrop-blur-sm">
                <div className="w-16 h-16 border-4 border-gray-100 border-t-[#87be00] rounded-full animate-spin"></div>
              </div>
            )}
          </div>

          {/* PANEL JERÁRQUICO - REDISEÑO MINIMALISTA */}
          <div className={`
            transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] overflow-hidden shrink-0 flex flex-col
            ${panelOpen ? 'max-h-[50vh] lg:max-h-none lg:h-full lg:w-[350px] xl:w-[400px] opacity-100' : 'max-h-0 lg:max-h-none lg:w-0 opacity-0'}
          `}>
            <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm flex flex-col h-full overflow-hidden">
              <div className="px-5 py-5 border-b border-gray-50 flex items-center justify-between bg-white shrink-0">
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 flex items-center gap-2">
                  <FiList size={16} className="text-[#87be00]" /> Despliegue Jerárquico
                </p>
              </div>

              <div className="overflow-y-auto flex-1 custom-scrollbar p-4 space-y-4">
                {Object.keys(groupedData).length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 gap-3 text-gray-300">
                    <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center"><FiMapPin size={20} /></div>
                    <p className="text-[10px] font-black uppercase tracking-widest">Sin asignaciones</p>
                  </div>
                ) : (
                  Object.entries(groupedData).map(([supName, supData]) => {
                    const isSupExpanded = expandedSupervisors[supName];
                    const hasLocales = Object.keys(supData.localesMap).length > 0;
                    
                    return (
                      <div key={supName} className="border border-gray-100 rounded-2xl overflow-hidden bg-white shadow-sm">
                        
                        <button
                          onClick={() => {
                            toggleExpandSupervisor(supName);
                            setSelectedSupervisor(prev => prev === supName ? null : supName);
                          }}
                          className={`w-full flex items-center p-4 transition-all ${selectedSupervisor === supName ? 'bg-[#87be00]/10 border-b border-[#87be00]/20' : 'bg-white hover:bg-gray-50 border-b border-transparent'}`}
                        >
                          <div className="w-10 h-10 rounded-xl bg-gray-900 text-white flex items-center justify-center font-black text-sm shadow-md shrink-0">
                            {supName.charAt(0)}
                          </div>
                          <div className="flex-1 text-left px-3 min-w-0">
                            <p className="text-[9px] font-black text-[#87be00] uppercase tracking-[0.2em] mb-0.5 flex items-center gap-1">
                              <FiUserCheck size={12} /> Supervisor
                            </p>
                            <p className="text-sm font-black text-gray-900 uppercase italic truncate leading-tight">
                              {supName}
                            </p>
                          </div>
                          <FiChevronRight size={18} className={`text-gray-300 transition-transform ${isSupExpanded ? 'rotate-90 text-[#87be00]' : ''}`} />
                        </button>

                        <div className={`transition-all duration-400 ease-in-out ${isSupExpanded ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0 overflow-hidden'}`}>
                          <div className="p-2 space-y-1 bg-gray-50/50">
                            {hasLocales && Object.entries(supData.localesMap).map(([localKey, localData]) => {
                              const uniqueLocalKey = `${supName}-${localKey}`;
                              const isLocalExpanded = expandedLocales[uniqueLocalKey];
                              const allRoutes = Object.values(localData.routesByUser).flat();
                              const ep = allRoutes.filter(r => r.status === 'IN_PROGRESS').length;
                              
                              return (
                                <div key={localKey} className="pl-2">
                                  <button onClick={() => toggleExpandLocale(uniqueLocalKey)} className="w-full flex items-center gap-2 p-2 rounded-lg hover:bg-gray-100 transition-colors group">
                                    <FiMapPin size={14} className="text-[#87be00] shrink-0" />
                                    <div className="flex-1 min-w-0 text-left">
                                      <p className="text-[10px] font-black uppercase text-gray-700 truncate group-hover:text-[#87be00] transition-colors">{localData.nombre_mostrar}</p>
                                    </div>
                                    {ep > 0 && <span className="w-2 h-2 rounded-full bg-[#87be00] animate-pulse"></span>}
                                    <FiChevronRight size={14} className={`text-gray-300 transition-transform ${isLocalExpanded ? 'rotate-90' : ''}`} />
                                  </button>

                                  <div className={`overflow-hidden transition-all duration-300 ${isLocalExpanded ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'}`}>
                                    <div className="ml-3 pl-3 border-l-2 border-gray-200 py-1 my-1 space-y-1">
                                      {Object.entries(localData.routesByUser).map(([userName, userRoutes]) => (
                                        userRoutes.map((route, idx) => (
                                          <button 
                                            key={`${userName}-${idx}`} 
                                            onClick={() => flyToRoute(route)} 
                                            className={`w-full text-left p-2 rounded-md flex items-center gap-2 transition-all ${selectedRoute === route ? 'bg-white shadow-sm ring-1 ring-[#87be00]/30' : 'hover:bg-white/60'}`}
                                          >
                                            <span className="w-1.5 h-1.5 rounded-full block shrink-0" style={{ backgroundColor: statusToColor(route.status) }} />
                                            <div className="flex-1 min-w-0">
                                              <p className="text-[9px] font-black uppercase text-gray-600 truncate">{userName}</p>
                                            </div>
                                            <span className={`text-[7px] font-black uppercase px-1.5 py-0.5 rounded ${statusBg(route.status)}`}>{statusLabel(route.status)}</span>
                                          </button>
                                        ))
                                      ))}
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>

        {/* TABLA DETALLE */}
        {selectedSupervisor && (
          <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm p-6 shrink-0 animate-in fade-in zoom-in duration-300">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-[#87be00] mb-4">
              Detalle de Rutas: {selectedSupervisor}
            </h3>
            <div className="overflow-x-auto max-h-[300px] custom-scrollbar">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-gray-100 bg-white sticky top-0">
                    <th className="p-3 text-[10px] font-black uppercase text-gray-400">Supervisor</th>
                    <th className="p-3 text-[10px] font-black uppercase text-gray-400">Mercaderista</th>
                    <th className="p-3 text-[10px] font-black uppercase text-gray-400">Fecha</th>
                    <th className="p-3 text-[10px] font-black uppercase text-gray-400">Cadena</th>
                    <th className="p-3 text-[10px] font-black uppercase text-gray-400">Código</th>
                    <th className="p-3 text-[10px] font-black uppercase text-gray-400">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTableRoutes.map((r, i) => {

  return (
    <tr 
      key={i} 
      onClick={() => flyToRoute(r)}
      className={`border-b cursor-pointer transition-colors ${
        selectedRoute === r ? 'bg-[#87be00]/10 border-[#87be00]/20' : 'border-gray-50 hover:bg-gray-50/50'
      }`}
    >
      <td className="p-3 text-[11px] font-bold text-gray-700">{r.supervisor_nombre || 'N/A'}</td>
      <td className="p-3 text-[11px] font-bold text-gray-700">{r.usuario_nombre}</td>
      <td className="p-3 text-[11px] font-bold text-gray-700">
        <div className="flex flex-col">
          <span>{extractDate(r)}</span>
          <span className="text-[9px] text-gray-400 mt-0.5">
            Inicio: {extractPlanningTime(r)}
          </span><span className="text-[9px] text-gray-400 mt-0.5">
            Termino: {r.end_time ? r.end_time.slice(0, 5) : 'N/A'}
          </span>
        </div>
      </td>
      <td className="p-3 text-[11px] font-bold text-gray-700">{r.cadena}</td>
      <td className="p-3 text-[11px] font-bold text-gray-700">{r.codigo_local}</td>
      <td className="p-3">
        <span className={`px-2 py-1 rounded text-[8px] font-black uppercase ${statusBg(r.status)}`}>
          {statusLabel(r.status)}
        </span>
      </td>
    </tr>
  );
})}
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