import React, { useEffect, useRef, useState, useMemo, useCallback } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import api from "../../api/apiClient";
import { FiNavigation, FiAlertCircle, FiMapPin, FiChevronRight, FiList, FiRefreshCw, FiUsers, FiActivity } from "react-icons/fi";

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
  
  const routeMarkers = useRef([]);
  const liveMarkers = useRef([]);
  const circleLayersRef = useRef([]);
  const pollRef = useRef(null);

  const [routes, setRoutes] = useState([]); 
  const [activeRoutes, setActiveRoutes] = useState([]); 
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [panelOpen, setPanelOpen] = useState(true);
  const [selectedRoute, setSelectedRoute] = useState(null);

  const [expandedLocales, setExpandedLocales] = useState({});
  const [expandedLocaleUsers, setExpandedLocaleUsers] = useState({});
  const [expandedUsers, setExpandedUsers] = useState({});

  const toggleExpandLocale     = (key) => setExpandedLocales(prev => ({ ...prev, [key]: !prev[key] }));
  const toggleExpandLocaleUser = (key) => setExpandedLocaleUsers(prev => ({ ...prev, [key]: !prev[key] }));
  const toggleExpandUser       = (key) => setExpandedUsers(prev => ({ ...prev, [key]: !prev[key] }));

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

  const stats = useMemo(() => ({
    total: routes.length,
    pending: routes.filter(r => r.status === 'PENDING').length,
    inProgress: routes.filter(r => r.status === 'IN_PROGRESS').length,
    completed: routes.filter(r => r.status === 'COMPLETED').length,
  }), [routes]);

  // Lógica Robusta: Filtra por presencia de datos en lugar de campo origen
  const routesLocales  = useMemo(() => routes.filter(r => r.codigo_local || r.cadena), [routes]);
  const routesUsuarios = useMemo(() => routes.filter(r => !r.codigo_local && r.usuario_nombre), [routes]);

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

  useEffect(() => {
    if (map.current) return;
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/light-v11",
      center: [-70.6483, -33.4569],
      zoom: 12,
      pitch: 45
    });
    map.current.addControl(new mapboxgl.NavigationControl({ showCompass: false }), "top-right");
  }, []);

  useEffect(() => {
    if (map.current) {
      const resizeTimer = setTimeout(() => map.current.resize(), 500);
      return () => clearTimeout(resizeTimer);
    }
  }, [panelOpen]);

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

      routes.forEach((route) => {
        if (!route.lat || !route.lng) return;
        hasCoords = true;
        
        const el = document.createElement("div");
        el.style.cssText = `width:16px;height:16px;background-color:${statusToColor(route.status)};border-radius:50%;border:2px solid white;box-shadow:0 2px 4px rgba(0,0,0,0.2);cursor:pointer;transition:transform 0.2s;`;
        
        const marker = new mapboxgl.Marker(el)
          .setLngLat([parseFloat(route.lng), parseFloat(route.lat)])
          .setPopup(new mapboxgl.Popup({ offset: 12, closeButton: false }).setHTML(`
            <div style="font-family:'Outfit';padding:6px 4px;text-transform:uppercase;">
              <p style="font-weight:900;margin:0;font-size:10px;color:#111827;">${route.cadena || 'Sin nombre'}</p>
              <p style="font-size:8px;font-weight:700;color:#9ca3af;margin:2px 0 0 0;">${route.codigo_local || 'S/N'} | ${route.comuna || ''}</p>
              ${route.usuario_nombre ? `<p style="font-size:8px;font-weight:700;color:#3b82f6;margin:2px 0 0 0;">${route.usuario_nombre}</p>` : ''}
            </div>
          `))
          .addTo(map.current);

        routeMarkers.current.push(marker);
        bounds.extend([parseFloat(route.lng), parseFloat(route.lat)]);
      });

      activeRoutes.forEach((route, index) => {
        const lng = parseFloat(route.lng_in);
        const lat = parseFloat(route.lat_in);
        hasCoords = true;
        const userColor = stringToColor(route.user_id || "default");
        
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
          .addTo(map.current);
        
        liveMarkers.current.push(marker);
        bounds.extend([lng, lat]);
      });

      if (hasCoords) {
        const mapPadding = window.innerWidth < 768 ? 40 : 80;
        map.current.fitBounds(bounds, { padding: mapPadding, maxZoom: 15, duration: 1500 });
      }
    };

    if (map.current.isStyleLoaded()) paintMap();
    else map.current.once('style.load', paintMap);
  }, [routes, activeRoutes]);

  const flyToRoute = (route) => {
    if (!map.current || !route.lat || !route.lng) return;
    setSelectedRoute(route);
    if (window.innerWidth < 1024) setPanelOpen(false);
    map.current.flyTo({ center: [parseFloat(route.lng), parseFloat(route.lat)], zoom: 15, duration: 1200 });
  };

  const formatLastUpdated = (date) => {
    if (!date) return '';
    return date.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  return (
    <div className="w-full h-full flex flex-col font-[Outfit] bg-gray-50/50 min-h-[500px] p-2 md:p-4">
      <div className="bg-white p-4 md:p-6 rounded-[1.5rem] md:rounded-[2rem] shadow-sm border border-gray-100 mb-4 md:mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shrink-0">
        <div className="flex items-center gap-3 md:gap-5 w-full sm:w-auto">
          <div className="bg-black p-3 md:p-4 rounded-xl shadow-xl shrink-0"><FiNavigation className="text-[#87be00]" size={20} /></div>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl md:text-2xl font-black text-gray-800 uppercase tracking-tighter leading-none truncate">Mapa en Vivo</h1>
            <p className="text-[9px] md:text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] mt-1 flex items-center gap-1.5"><span className="relative inline-flex rounded-full h-2 w-2 bg-[#87be00] animate-pulse shrink-0"></span><span className="truncate">Planificación y Seguimiento GPS</span></p>
          </div>
        </div>
        <div className="flex items-center gap-2 bg-gray-900 px-4 py-2.5 rounded-xl shadow-xl">
           <span className="text-[9px] font-black uppercase text-white tracking-widest">{refreshing ? 'Actualizando...' : `Act: ${formatLastUpdated(lastUpdated)}`}</span>
        </div>
      </div>

      <div className="flex-1 flex gap-4 md:gap-6 overflow-hidden relative">
        <div className="flex-1 bg-white rounded-[1.5rem] md:rounded-[2rem] shadow-sm border border-gray-100 relative overflow-hidden flex flex-col">
          <div ref={mapContainer} className="w-full h-full flex-1" />
          <button onClick={() => setPanelOpen(!panelOpen)} className="absolute top-4 left-4 z-10 bg-gray-900 text-white shadow-xl shadow-gray-900/20 rounded-xl p-3 hover:bg-black hover:scale-105 transition-all">
            <FiList size={16} />
          </button>
        </div>

        <div className={`absolute lg:relative right-0 top-0 bottom-0 transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] z-30 flex flex-col gap-4 ${panelOpen ? 'w-full sm:w-[340px] translate-x-0 opacity-100' : 'w-0 translate-x-full lg:translate-x-10 opacity-0 pointer-events-none lg:w-0'}`}>
          <div className="bg-white rounded-[1.5rem] md:rounded-[2rem] border border-gray-100 shadow-xl shadow-gray-200/50 p-5 flex flex-col shrink-0">
             <p className="text-[9px] font-black uppercase tracking-widest text-gray-400">Rutas Asignadas</p>
             <span className="text-2xl font-black italic text-gray-900 leading-none">{stats.total}</span>
          </div>

          <div className="bg-white rounded-[1.5rem] md:rounded-[2rem] border border-gray-100 shadow-xl shadow-gray-200/50 flex flex-col overflow-hidden flex-1 min-h-0">
             <div className="px-5 py-4 border-b border-gray-50 text-[9px] font-black uppercase tracking-widest text-gray-400">Despliegue</div>
             <div className="overflow-y-auto flex-1 custom-scrollbar p-2">
                {Object.entries(routesByLocale).map(([localKey, localData]) => (
                   <div key={localKey} className="mb-2">
                      <button onClick={() => toggleExpandLocale(localKey)} className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-[#87be00]/5 transition-all group">
                         <FiMapPin className="text-[#87be00]" />
                         <span className="text-[10px] font-black uppercase italic truncate flex-1">{localData.cadena || 'Local'}</span>
                         <FiChevronRight className={`transition-all ${expandedLocales[localKey] ? 'rotate-90' : ''}`} />
                      </button>
                      {expandedLocales[localKey] && (
                        <div className="ml-8 border-l border-gray-100 pl-4 space-y-1">
                           {Object.keys(localData.routes).map(u => <div key={u} className="text-[9px] font-bold text-gray-600">{u}</div>)}
                        </div>
                      )}
                   </div>
                ))}
                
                {Object.entries(routesByUser).map(([userName, rts]) => (
                    <div key={userName} className="mb-2">
                        <button onClick={() => toggleExpandUser(userName)} className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-blue-50 transition-all group">
                            <FiUsers className="text-blue-500" />
                            <span className="text-[10px] font-black uppercase italic flex-1">{userName}</span>
                            <span className="text-[9px] font-bold text-gray-400">{rts.length}</span>
                        </button>
                    </div>
                ))}
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LiveMap;