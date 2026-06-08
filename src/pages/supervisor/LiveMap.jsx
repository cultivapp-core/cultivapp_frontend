import React, { useEffect, useRef, useState, useMemo, useCallback } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import api from "../../api/apiClient";
import { FiNavigation, FiAlertCircle, FiMapPin, FiChevronRight, FiList, FiRefreshCw, FiUsers, FiActivity, FiSearch, FiX } from "react-icons/fi";

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;
mapboxgl.accessToken = MAPBOX_TOKEN;

const POLL_INTERVAL = 15000;

// 🎨 Colores de Estados de Planificación
const statusToColor = (status) => {
  switch (status) {
    case 'IN_PROGRESS': return '#87be00';
    case 'PENDING':     return '#ef4444';
    case 'COMPLETED':   return '#2563eb';
    default:            return '#94a3b8';
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

// 🎨 Generador de colores para usuarios en vivo
const stringToColor = (str) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  let color = "#";
  for (let i = 0; i < 3; i++) {
    const value = (hash >> (i * 8)) & 0xff;
    color += ("00" + value.toString(16)).substr(-2);
  }
  return color;
};

// 📏 Genera un GeoJSON de un círculo de radio definido
const createGeoJSONCircle = (center, radiusInKm, points = 64) => {
  const [lng, lat] = center;
  const coords = { latitude: lat, longitude: lng };
  const distanceX = radiusInKm / (111.32 * Math.cos((lat * Math.PI) / 180));
  const distanceY = radiusInKm / 110.574;

  const ret = [];
  for (let i = 0; i < points; i++) {
    const theta = (i / points) * (2 * Math.PI);
    const x = distanceX * Math.cos(theta);
    const y = distanceY * Math.sin(theta);
    ret.push([coords.longitude + x, coords.latitude + y]);
  }
  ret.push(ret[0]);

  return {
    type: "Feature",
    geometry: { type: "Polygon", coordinates: [ret] },
  };
};

const LiveMap = () => {
  const mapContainer = useRef(null);
  const map = useRef(null);
  
  // Referencias para limpiar marcadores y capas independientemente
  const routeMarkers = useRef([]);
  const liveMarkers = useRef([]);
  const circleLayersRef = useRef([]);
  const pollRef = useRef(null);

  // Estados de Datos
  const [routes, setRoutes] = useState([]); // Planificación
  const [activeRoutes, setActiveRoutes] = useState([]); // GPS Vivo
  
  // Estados de UI
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [panelOpen, setPanelOpen] = useState(true);
  const [selectedRoute, setSelectedRoute] = useState(null);

  // 🔍 ESTADO DEL BUSCADOR
  const [searchTerm, setSearchTerm] = useState("");

  // Estados acordeón
  const [expandedLocales, setExpandedLocales] = useState({});
  const [expandedLocaleUsers, setExpandedLocaleUsers] = useState({});
  const [expandedUsers, setExpandedUsers] = useState({});

  const toggleExpandLocale     = (key) => setExpandedLocales(prev => ({ ...prev, [key]: !prev[key] }));
  const toggleExpandLocaleUser = (key) => setExpandedLocaleUsers(prev => ({ ...prev, [key]: !prev[key] }));
  const toggleExpandUser       = (key) => setExpandedUsers(prev => ({ ...prev, [key]: !prev[key] }));

  // Obtener ambas datas simultáneamente
  const fetchData = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      else setRefreshing(true);

      const [planningRes, liveRes] = await Promise.all([
        api.get("/planning"),
        api.get("/routes/monitoring/live")
      ]);

      setRoutes(Array.isArray(planningRes) ? planningRes : []);
      
      const active = (Array.isArray(liveRes) ? liveRes : []).filter((r) => !isNaN(parseFloat(r.lat_in)) && !isNaN(parseFloat(r.lng_in)));
      setActiveRoutes(active);

      setLastUpdated(new Date());
    } catch (error) {
      console.error("Error cargando el dashboard vivo:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData(false);
    pollRef.current = setInterval(() => fetchData(true), POLL_INTERVAL);
    return () => clearInterval(pollRef.current);
  }, [fetchData]);

  // 🔍 LÓGICA DE FILTRADO (Buscador)
  const filteredRoutes = useMemo(() => {
    if (!searchTerm.trim()) return routes;
    
    const term = searchTerm.toLowerCase();
    return routes.filter(r => 
      (r.codigo_local && r.codigo_local.toLowerCase().includes(term)) ||
      (r.cadena && r.cadena.toLowerCase().includes(term)) ||
      (r.usuario_nombre && r.usuario_nombre.toLowerCase().includes(term)) ||
      (r.usuario_email && r.usuario_email.toLowerCase().includes(term))
    );
  }, [routes, searchTerm]);

  // Memorización de datos para el panel lateral (Basado en rutas filtradas)
  const stats = useMemo(() => ({
    total: filteredRoutes.length,
    pending: filteredRoutes.filter(r => r.status === 'PENDING').length,
    inProgress: filteredRoutes.filter(r => r.status === 'IN_PROGRESS').length,
    completed: filteredRoutes.filter(r => r.status === 'COMPLETED').length,
  }), [filteredRoutes]);

  // Lógica Robusta: Filtra por presencia de datos (usando las rutas filtradas por búsqueda)
  const routesLocales  = useMemo(() => filteredRoutes.filter(r => r.codigo_local || r.cadena), [filteredRoutes]);
  const routesUsuarios = useMemo(() => filteredRoutes.filter(r => !r.codigo_local && r.usuario_nombre), [filteredRoutes]);

  const routesByLocale = useMemo(() => {
    return routesLocales.reduce((acc, route) => {
      const localKey = route.codigo_local || route.cadena || 'SIN_CODIGO';
      if (!acc[localKey]) acc[localKey] = {
        cadena: route.cadena,
        comuna: route.comuna,
        codigo: route.codigo_local,
        routes: {}
      };
      const userKey = route.usuario_nombre || 'Sin usuario';
      if (!acc[localKey].routes[userKey]) acc[localKey].routes[userKey] = [];
      acc[localKey].routes[userKey].push(route);
      return acc;
    }, {});
  }, [routesLocales]);

  const routesByUser = useMemo(() => {
    return routesUsuarios.reduce((acc, route) => {
      const key = route.usuario_nombre || 'Sin usuario';
      if (!acc[key]) acc[key] = [];
      acc[key].push(route);
      return acc;
    }, {});
  }, [routesUsuarios]);

  // Inicializar Mapa
  useEffect(() => {
    if (map.current) return;
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/light-v11",
      center: [-70.6483, -33.4569],
      zoom: 13
    });
    map.current.addControl(new mapboxgl.NavigationControl({ showCompass: false }), "top-right");
  }, []);

  // Redimensionar al abrir/cerrar panel
  useEffect(() => {
    if (map.current) {
      const resizeTimer = setTimeout(() => map.current.resize(), 500);
      return () => clearTimeout(resizeTimer);
    }
  }, [panelOpen]);

  // Pintar Marcadores (Planificación Filtrada + Vivo)
  useEffect(() => {
    if (!map.current) return;

    const paintMap = () => {
      routeMarkers.current.forEach((m) => m.remove());
      routeMarkers.current = [];
      liveMarkers.current.forEach((m) => m.remove());
      liveMarkers.current = [];
      circleLayersRef.current.forEach((id) => {
        if (map.current.getLayer(`circle-fill-${id}`)) map.current.removeLayer(`circle-fill-${id}`);
        if (map.current.getLayer(`circle-outline-${id}`)) map.current.removeLayer(`circle-outline-${id}`);
        if (map.current.getSource(`circle-source-${id}`)) map.current.removeSource(`circle-source-${id}`);
      });
      circleLayersRef.current = [];

      const bounds = new mapboxgl.LngLatBounds();
      let hasCoords = false;

      // ── PINTAR RUTAS FILTRADAS ──
      filteredRoutes.forEach((route) => {
        if (!route.lat || !route.lng) return;
        hasCoords = true;
        
        const el = document.createElement("div");
        el.style.cssText = `width:22px;height:22px;background-color:${statusToColor(route.status)};border-radius:50%;border:3px solid white;box-shadow:0 4px 6px rgba(0,0,0,0.2);cursor:pointer;transition:transform 0.2s cubic-bezier(0.34,1.56,0.64,1);`;
        el.onmouseenter = () => el.style.transform = 'scale(1.4)';
        el.onmouseleave = () => el.style.transform = 'scale(1)';

        const marker = new mapboxgl.Marker(el)
          .setLngLat([parseFloat(route.lng), parseFloat(route.lat)])
          .setPopup(new mapboxgl.Popup({ offset: 15, closeButton: false }).setHTML(`
            <div style="font-family:'Outfit';padding:8px 4px;text-transform:uppercase;">
              <p style="font-weight:900;margin:0;font-size:11px;color:#111827;letter-spacing:-0.02em;">${route.cadena || 'Sin nombre'}</p>
              <p style="font-size:9px;font-weight:700;color:#9ca3af;margin:3px 0 0 0;">${route.codigo_local || 'S/N'} | ${route.comuna || ''}</p>
              ${route.usuario_nombre ? `<p style="font-size:9px;font-weight:700;color:#3b82f6;margin:3px 0 0 0;">${route.usuario_nombre}</p>` : ''}
            </div>
          `))
          .addTo(map.current);

        routeMarkers.current.push(marker);
        bounds.extend([parseFloat(route.lng), parseFloat(route.lat)]);
      });

      // ── PINTAR USUARIOS EN VIVO ──
      activeRoutes.forEach((route, index) => {
        const lng = parseFloat(route.lng_in);
        const lat = parseFloat(route.lat_in);
        hasCoords = true;
        const userColor = stringToColor(route.user_id || "default");
        
        // Círculo GeoJSON
        const circleGeoJSON = createGeoJSONCircle([lng, lat], 0.3);

        map.current.addSource(`circle-source-${index}`, { type: "geojson", data: circleGeoJSON });
        map.current.addLayer({
          id: `circle-fill-${index}`,
          type: "fill",
          source: `circle-source-${index}`,
          paint: { "fill-color": "#87be00", "fill-opacity": 0.15 },
        });
        map.current.addLayer({
          id: `circle-outline-${index}`,
          type: "line",
          source: `circle-source-${index}`,
          paint: { "line-color": "#87be00", "line-width": 2, "line-dasharray": [2, 2] },
        });

        circleLayersRef.current.push(index);

        // Marcador Avatar
        const el = document.createElement("div");
        el.className = "custom-marker";
        el.style.cssText = `
          width: 32px; height: 32px;
          background-color: ${userColor};
          border-radius: 10px; border: 3px solid white;
          box-shadow: 0 10px 20px rgba(0,0,0,0.2);
          display: flex; align-items: center; justify-content: center;
          cursor: pointer; transition: transform 0.2s; z-index: 10;
        `;
        el.innerHTML = `<span style="color:white; font-family:'Outfit'; font-size:11px; font-weight:900;">${route.first_name?.[0]}${route.last_name?.[0]}</span>`;

        const marker = new mapboxgl.Marker(el)
          .setLngLat([lng, lat])
          .setPopup(new mapboxgl.Popup({ offset: 20 }).setHTML(`
              <div style="font-family: 'Outfit'; padding: 6px;">
                  <p style="font-weight: 900; font-size: 11px; margin: 0; color: #111;">${route.first_name} ${route.last_name}</p>
                  <p style="font-size: 9px; color: #87be00; font-weight: 700; margin: 2px 0 0 0; text-transform: uppercase;">
                    ${route.local_nombre || 'En Movimiento'}
                  </p>
              </div>
          `))
          .addTo(map.current);
        
        liveMarkers.current.push(marker);
        bounds.extend([lng, lat]);
      });

      if (hasCoords && filteredRoutes.length > 0) {
        map.current.fitBounds(bounds, { padding: 80, duration: 1000 });
      }
    };

    if (map.current.isStyleLoaded()) paintMap();
    else map.current.once('style.load', paintMap);
  }, [filteredRoutes, activeRoutes]); // El mapa reacciona a los filtros

  const flyToRoute = (route) => {
    if (!map.current || !route.lat || !route.lng) return;
    setSelectedRoute(route);
    if (window.innerWidth < 1024) setPanelOpen(false);
    map.current.flyTo({ center: [parseFloat(route.lng), parseFloat(route.lat)], zoom: 14, duration: 1200 });
  };

  const formatLastUpdated = (date) => {
    if (!date) return '';
    return date.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  return (
    <div className="w-full h-full flex flex-col font-[Outfit] bg-gray-50/50">

      {/* HEADER VISUAL IDENTICO AL ROUTE PLANNING MAP + USUARIOS ACTIVOS */}
      <div className="bg-white border-b border-gray-100 px-6 py-6 md:px-8 md:py-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 z-10 shrink-0">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#87be00]/10 rounded-lg text-[#87be00]"><FiNavigation size={20} /></div>
            <h2 className="text-xl md:text-2xl font-black text-gray-900 uppercase italic tracking-tighter leading-none">Monitoreo GPS</h2>
          </div>
          <p className="text-[9px] md:text-[10px] font-bold text-[#87be00] uppercase tracking-[0.2em] ml-12 mt-1">Planificación y seguimiento en tiempo real</p>
        </div>
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full md:w-auto">
          <div className="flex gap-4 bg-gray-50 px-5 py-3 rounded-[1rem] border border-gray-100 w-full sm:w-auto justify-center">
            <span className="text-[9px] font-black flex items-center gap-2 uppercase tracking-widest text-gray-500"><span className="w-2.5 h-2.5 rounded-full bg-[#ef4444] shadow-sm"></span>Pendiente</span>
            <span className="text-[9px] font-black flex items-center gap-2 uppercase tracking-widest text-gray-500"><span className="w-2.5 h-2.5 rounded-full bg-[#87be00] shadow-sm"></span>Proceso</span>
            <span className="text-[9px] font-black flex items-center gap-2 uppercase tracking-widest text-gray-500"><span className="w-2.5 h-2.5 rounded-full bg-[#2563eb] shadow-sm"></span>Lista</span>
          </div>

          <div className="flex px-5 py-3 bg-green-50 rounded-[1rem] border border-green-100 items-center gap-2 w-full sm:w-auto justify-center shrink-0">
            <FiActivity className="text-[#87be00] shrink-0" />
            <span className="text-[10px] font-black uppercase text-[#87be00]">
              {activeRoutes.length} <span className="hidden xs:inline">Usuarios</span> Activos
            </span>
          </div>

          {lastUpdated && (
            <div className="flex items-center justify-center gap-2 bg-gray-900 px-5 py-3 rounded-[1rem] shadow-xl w-full sm:w-auto">
              <span className={`w-2 h-2 rounded-full ${refreshing ? 'bg-yellow-400 animate-pulse' : 'bg-[#87be00]'}`}></span>
              <span className="text-[9px] font-black uppercase text-white tracking-widest whitespace-nowrap">
                {refreshing ? 'Actualizando...' : `Act: ${formatLastUpdated(lastUpdated)}`}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* CONTENIDO */}
      <div className="flex-1 flex p-4 md:p-8 gap-6 overflow-hidden relative">

        {/* MAPA */}
        <div className="flex-1 bg-white rounded-[2rem] shadow-sm border border-gray-100 relative overflow-hidden">
          {!loading && filteredRoutes.length === 0 && activeRoutes.length === 0 && (
            <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-4 text-gray-400 bg-gray-50/80 backdrop-blur-sm">
              <div className="w-16 h-16 rounded-full bg-white shadow-sm flex items-center justify-center text-gray-300"><FiAlertCircle size={32} /></div>
              <p className="font-black uppercase text-[10px] tracking-widest">
                {searchTerm ? 'No hay resultados para tu búsqueda' : 'No hay datos encontrados'}
              </p>
            </div>
          )}
          <div ref={mapContainer} className="w-full h-full" />
          <button
            onClick={() => setPanelOpen(!panelOpen)}
            className="absolute top-6 left-6 z-10 bg-gray-900 text-white shadow-xl shadow-gray-900/20 rounded-2xl p-3.5 hover:bg-black hover:scale-105 active:scale-95 transition-all flex items-center gap-2"
          >
            <FiList size={18} />
            <span className="text-[9px] font-black uppercase tracking-widest hidden sm:block">Locales</span>
          </button>
          {loading && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/50 backdrop-blur-sm">
              <div className="w-16 h-16 border-4 border-gray-100 border-t-[#87be00] rounded-full animate-spin"></div>
            </div>
          )}
        </div>

        {/* PANEL LATERAL (DISEÑO ROUTE PLANNING MAP) */}
        <div className={`
          absolute lg:relative right-4 md:right-8 top-4 md:top-8 bottom-4 md:bottom-8 lg:right-0 lg:top-0 lg:bottom-0
          transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] z-30 flex flex-col gap-4
          ${panelOpen ? 'w-[calc(100%-2rem)] sm:w-80 translate-x-0 opacity-100' : 'w-0 translate-x-full lg:translate-x-10 opacity-0 pointer-events-none lg:w-0'}
        `}>

          {/* STATS */}
          <div className="bg-white rounded-[2rem] border border-gray-100 shadow-xl shadow-gray-200/50 p-6 flex flex-col shrink-0">
            <div className="flex items-center justify-between mb-5">
              <p className="text-[9px] font-black uppercase tracking-widest text-gray-400">Resumen Rutas</p>
              <div className="flex items-center gap-2">
                {refreshing && <FiRefreshCw size={12} className="text-[#87be00] animate-spin" />}
                <span className="text-3xl font-black italic text-gray-900 leading-none">{stats.total}</span>
              </div>
            </div>
            <div className="space-y-4">
              {[
                { label: 'Pendiente',  count: stats.pending,    color: 'bg-[#ef4444]' },
                { label: 'En Proceso', count: stats.inProgress, color: 'bg-[#87be00]' },
                { label: 'Completada', count: stats.completed,  color: 'bg-[#2563eb]' },
              ].map(({ label, count, color }) => (
                <div key={label}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className={`w-2.5 h-2.5 rounded-full ${color}`}></span>
                      <span className="text-[9px] font-black uppercase tracking-widest text-gray-500">{label}</span>
                    </div>
                    <span className="text-[11px] font-black text-gray-800">{count}</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                    <div className={`${color} h-full rounded-full transition-all duration-1000 ease-out`} style={{ width: stats.total ? `${(count / stats.total) * 100}%` : '0%' }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* LISTA DE ACORDEONES + BUSCADOR */}
          <div className="bg-white rounded-[2rem] border border-gray-100 shadow-xl shadow-gray-200/50 flex flex-col overflow-hidden flex-1 min-h-0">
            <div className="px-6 py-5 border-b border-gray-50 flex flex-col gap-4 bg-white shrink-0">
              <div className="flex items-center justify-between">
                <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 flex items-center gap-2">
                  <FiList size={14} className="text-[#87be00]" /> Despliegue
                </p>
              </div>
              
              {/* 🔍 INPUT DE BÚSQUEDA */}
              <div className="relative w-full">
                <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                <input
                  type="text"
                  placeholder="Buscar local, usuario o correo..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-100 text-gray-700 text-[11px] font-bold rounded-xl pl-10 pr-10 py-3 focus:outline-none focus:ring-2 focus:ring-[#87be00]/30 focus:border-[#87be00] transition-all placeholder:font-medium placeholder:text-gray-400"
                />
                {searchTerm && (
                  <button onClick={() => setSearchTerm("")} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-red-500 transition-colors p-1">
                    <FiX size={14} />
                  </button>
                )}
              </div>
            </div>

            <div className="overflow-y-auto flex-1 custom-scrollbar">
              {filteredRoutes.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full py-10 gap-3 text-gray-300">
                  <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center"><FiMapPin size={20} /></div>
                  <p className="text-[9px] font-black uppercase tracking-widest text-center px-4">
                    {searchTerm ? "Sin resultados para tu búsqueda" : "Sin asignaciones"}
                  </p>
                </div>
              ) : (
                <div className="p-2">

                  {/* ── LOCALES ASIGNADOS ── */}
                  {routesLocales.length > 0 && (
                    <div className="mb-1">
                      <div className="flex items-center gap-2 px-4 py-2.5">
                        <FiMapPin size={10} className="text-[#87be00] shrink-0" />
                        <p className="text-[8px] font-black uppercase tracking-[0.2em] text-[#87be00]">Locales Asignados</p>
                        <span className="ml-auto text-[9px] font-black text-gray-300">{Object.keys(routesByLocale).length}</span>
                      </div>

                      {Object.entries(routesByLocale).map(([localKey, localData]) => {
                        // 🟢 Auto expandir el acordeón si hay una búsqueda activa, o usar el toggle manual si está vacío
                        const isExpanded  = searchTerm.trim() !== "" ? true : expandedLocales[localKey];
                        const allRoutes   = Object.values(localData.routes).flat();
                        const pendiente   = allRoutes.filter(r => r.status === 'PENDING').length;
                        const enProceso   = allRoutes.filter(r => r.status === 'IN_PROGRESS').length;
                        const completada  = allRoutes.filter(r => r.status === 'COMPLETED').length;

                        return (
                          <div key={localKey} className="mx-2 mb-1">
                            {/* Cabecera local */}
                            <button
                              onClick={() => toggleExpandLocale(localKey)}
                              className="w-full flex items-center gap-3 p-3.5 rounded-2xl hover:bg-[#87be00]/5 transition-all group"
                            >
                              <div className="w-8 h-8 rounded-xl bg-[#87be00]/10 text-[#87be00] flex items-center justify-center shrink-0">
                                <FiMapPin size={14} />
                              </div>
                              <div className="flex-1 min-w-0 text-left">
                                <p className="text-[10px] font-black uppercase italic text-gray-900 truncate leading-none mb-1 group-hover:text-[#87be00] transition-colors">
                                  {localData.cadena || 'Sin nombre'}
                                </p>
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="text-[7px] font-bold text-gray-300 uppercase">{localData.codigo || 'S/N'} · {localData.comuna}</span>
                                  {pendiente  > 0 && <span className="flex items-center gap-1 text-[7px] font-black text-red-400"><span className="w-1.5 h-1.5 rounded-full bg-[#ef4444]"></span>{pendiente}</span>}
                                  {enProceso  > 0 && <span className="flex items-center gap-1 text-[7px] font-black text-[#87be00]"><span className="w-1.5 h-1.5 rounded-full bg-[#87be00]"></span>{enProceso}</span>}
                                  {completada > 0 && <span className="flex items-center gap-1 text-[7px] font-black text-blue-500"><span className="w-1.5 h-1.5 rounded-full bg-[#2563eb]"></span>{completada}</span>}
                                </div>
                              </div>
                              <FiChevronRight size={14} className={`text-gray-300 group-hover:text-[#87be00] transition-all duration-300 shrink-0 ${isExpanded ? 'rotate-90' : ''}`} />
                            </button>

                            {/* Acordeón local → usuarios */}
                            <div className={`overflow-hidden transition-all duration-300 ${isExpanded ? 'max-h-[600px] opacity-100' : 'max-h-0 opacity-0'}`}>
                              <div className="ml-4 border-l-2 border-[#87be00]/20 pl-3 py-1 space-y-1">
                                {Object.entries(localData.routes).map(([userName, userRoutes]) => {
                                  const userKey      = `${localKey}-${userName}`;
                                  // 🟢 Auto expandir también los subniveles al buscar
                                  const isUserExpanded = searchTerm.trim() !== "" ? true : expandedLocaleUsers[userKey];
                                  const uPendiente   = userRoutes.filter(r => r.status === 'PENDING').length;
                                  const uEnProceso   = userRoutes.filter(r => r.status === 'IN_PROGRESS').length;
                                  const uCompletada  = userRoutes.filter(r => r.status === 'COMPLETED').length;

                                  return (
                                    <div key={userKey}>
                                      {/* Cabecera usuario dentro del local */}
                                      <button
                                        onClick={() => toggleExpandLocaleUser(userKey)}
                                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-50 transition-all group"
                                      >
                                        <div className="w-7 h-7 rounded-lg bg-gray-900 text-[#87be00] flex items-center justify-center font-black text-[10px] shrink-0">
                                          {userName?.charAt(0)}
                                        </div>
                                        <div className="flex-1 min-w-0 text-left">
                                          <p className="text-[9px] font-black uppercase italic text-gray-800 truncate leading-none mb-0.5 group-hover:text-[#87be00] transition-colors">
                                            {userName}
                                          </p>
                                          <div className="flex items-center gap-2">
                                            {uPendiente  > 0 && <span className="flex items-center gap-1 text-[7px] font-black text-red-400"><span className="w-1.5 h-1.5 rounded-full bg-[#ef4444]"></span>{uPendiente}</span>}
                                            {uEnProceso  > 0 && <span className="flex items-center gap-1 text-[7px] font-black text-[#87be00]"><span className="w-1.5 h-1.5 rounded-full bg-[#87be00]"></span>{uEnProceso}</span>}
                                            {uCompletada > 0 && <span className="flex items-center gap-1 text-[7px] font-black text-blue-500"><span className="w-1.5 h-1.5 rounded-full bg-[#2563eb]"></span>{uCompletada}</span>}
                                            <span className="text-[7px] font-black text-gray-300 ml-auto">{userRoutes.length} rutas</span>
                                          </div>
                                        </div>
                                        <FiChevronRight size={12} className={`text-gray-300 group-hover:text-[#87be00] transition-all duration-300 shrink-0 ${isUserExpanded ? 'rotate-90' : ''}`} />
                                      </button>

                                      {/* Rutas del usuario dentro del local */}
                                      <div className={`overflow-hidden transition-all duration-300 ${isUserExpanded ? 'max-h-[400px] opacity-100' : 'max-h-0 opacity-0'}`}>
                                        <div className="ml-4 border-l-2 border-gray-100 pl-3 py-1 space-y-1">
                                          {userRoutes.map((route, idx) => (
                                            <button
                                              key={idx}
                                              onClick={() => flyToRoute(route)}
                                              className={`w-full text-left px-3 py-2.5 rounded-xl transition-all group flex items-start gap-3 ${selectedRoute === route ? 'bg-[#87be00]/5 ring-1 ring-[#87be00]/20' : 'hover:bg-gray-50'}`}
                                            >
                                              <span className="w-2 h-2 rounded-full block mt-1 shrink-0 shadow-sm transition-transform group-hover:scale-125" style={{ backgroundColor: statusToColor(route.status) }} />
                                              <div className="flex-1 min-w-0">
                                                <p className="text-[9px] font-black uppercase italic truncate text-gray-700 group-hover:text-[#87be00] transition-colors leading-none mb-0.5">
                                                  {route.cadena || 'Sin nombre'}
                                                </p>
                                                <span className={`mt-1 inline-flex items-center text-[7px] font-black uppercase px-2 py-0.5 rounded-lg border ${statusBg(route.status)}`}>
                                                  {statusLabel(route.status)}
                                                </span>
                                              </div>
                                              <FiChevronRight size={11} className="text-gray-300 group-hover:text-[#87be00] group-hover:translate-x-1 mt-1 shrink-0 transition-all" />
                                            </button>
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
                      })}
                    </div>
                  )}

                  {/* SEPARADOR */}
                  {routesLocales.length > 0 && routesUsuarios.length > 0 && (
                    <div className="mx-4 my-2 border-t border-gray-100" />
                  )}

                  {/* ── USUARIOS ASIGNADOS ── */}
                  {routesUsuarios.length > 0 && (
                    <div className="mt-1">
                      <div className="flex items-center gap-2 px-4 py-2.5">
                        <FiUsers size={10} className="text-blue-400 shrink-0" />
                        <p className="text-[8px] font-black uppercase tracking-[0.2em] text-blue-400">Usuarios Asignados</p>
                        <span className="ml-auto text-[9px] font-black text-gray-300">{Object.keys(routesByUser).length}</span>
                      </div>

                      {Object.entries(routesByUser).map(([nombre, userRoutes]) => {
                        // 🟢 Auto expandir usuarios al buscar
                        const isExpanded = searchTerm.trim() !== "" ? true : expandedUsers[nombre];
                        const pendiente  = userRoutes.filter(r => r.status === 'PENDING').length;
                        const enProceso  = userRoutes.filter(r => r.status === 'IN_PROGRESS').length;
                        const completada = userRoutes.filter(r => r.status === 'COMPLETED').length;

                        return (
                          <div key={nombre} className="mx-2 mb-1">

                            {/* Cabecera usuario */}
                            <button
                              onClick={() => toggleExpandUser(nombre)}
                              className="w-full flex items-center gap-3 p-3.5 rounded-2xl hover:bg-blue-50 transition-all group"
                            >
                              <div className="w-8 h-8 rounded-xl bg-gray-900 text-[#87be00] flex items-center justify-center font-black text-xs shrink-0">
                                {nombre?.charAt(0)}
                              </div>
                              <div className="flex-1 min-w-0 text-left">
                                <p className="text-[10px] font-black uppercase italic text-gray-900 truncate leading-none mb-1 group-hover:text-blue-500 transition-colors">
                                  {nombre}
                                </p>
                                <div className="flex items-center gap-2">
                                  {pendiente  > 0 && <span className="flex items-center gap-1 text-[7px] font-black text-red-400"><span className="w-1.5 h-1.5 rounded-full bg-[#ef4444]"></span>{pendiente}</span>}
                                  {enProceso  > 0 && <span className="flex items-center gap-1 text-[7px] font-black text-[#87be00]"><span className="w-1.5 h-1.5 rounded-full bg-[#87be00]"></span>{enProceso}</span>}
                                  {completada > 0 && <span className="flex items-center gap-1 text-[7px] font-black text-blue-500"><span className="w-1.5 h-1.5 rounded-full bg-[#2563eb]"></span>{completada}</span>}
                                  <span className="text-[7px] font-black text-gray-300 ml-auto">{userRoutes.length} rutas</span>
                                </div>
                              </div>
                              <FiChevronRight size={14} className={`text-gray-300 group-hover:text-blue-400 transition-all duration-300 shrink-0 ${isExpanded ? 'rotate-90' : ''}`} />
                            </button>

                            {/* Rutas del usuario */}
                            <div className={`overflow-hidden transition-all duration-300 ${isExpanded ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'}`}>
                              <div className="ml-4 border-l-2 border-blue-100 pl-3 py-1 space-y-1">
                                {userRoutes.map((route, idx) => (
                                  <button
                                    key={idx}
                                    onClick={() => flyToRoute(route)}
                                    className={`w-full text-left px-3 py-3 rounded-xl transition-all group flex items-start gap-3 ${selectedRoute === route ? 'bg-blue-50 ring-1 ring-blue-200' : 'hover:bg-gray-50'}`}
                                  >
                                    <span className="w-2.5 h-2.5 rounded-full block mt-1 shrink-0 shadow-sm transition-transform group-hover:scale-125" style={{ backgroundColor: statusToColor(route.status) }} />
                                    <div className="flex-1 min-w-0">
                                      <p className="text-[10px] font-black uppercase italic truncate text-gray-800 group-hover:text-blue-500 transition-colors leading-none mb-0.5">
                                        {route.cadena || 'Sin nombre'}
                                      </p>
                                      <p className="text-[8px] font-bold text-gray-300 uppercase truncate">
                                        {route.codigo_local || 'S/N'} · {route.comuna}
                                      </p>
                                      <span className={`mt-1 inline-flex items-center text-[7px] font-black uppercase px-2 py-0.5 rounded-lg border ${statusBg(route.status)}`}>
                                        {statusLabel(route.status)}
                                      </span>
                                    </div>
                                    <FiChevronRight size={12} className="text-gray-300 group-hover:text-blue-400 group-hover:translate-x-1 mt-1 shrink-0 transition-all" />
                                  </button>
                                ))}
                              </div>
                            </div>

                          </div>
                        );
                      })}
                    </div>
                  )}

                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default LiveMap;