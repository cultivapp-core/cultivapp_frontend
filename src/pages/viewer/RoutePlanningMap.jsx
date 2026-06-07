import React, { useEffect, useRef, useState, useMemo, useCallback } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import api from "../../api/apiClient";
import { FiNavigation, FiAlertCircle, FiMapPin, FiChevronRight, FiList, FiRefreshCw } from "react-icons/fi";

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;
mapboxgl.accessToken = MAPBOX_TOKEN;

const POLL_INTERVAL = 10000; // 10 segundos

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

const RoutePlanningMap = () => {
  const mapContainer = useRef(null);
  const map = useRef(null);
  const markers = useRef([]);
  const pollRef = useRef(null);

  const [routes, setRoutes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [panelOpen, setPanelOpen] = useState(true);
  const [selectedRoute, setSelectedRoute] = useState(null);

  // Fetch silencioso
  const fetchRoutes = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      else setRefreshing(true);

      const response = await api.get("/planning");
      setRoutes(Array.isArray(response) ? response : []);
      setLastUpdated(new Date());
    } catch (error) {
      console.error("Error cargando planificación:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Carga inicial + polling
  useEffect(() => {
    fetchRoutes(false);
    pollRef.current = setInterval(() => {
      fetchRoutes(true);
    }, POLL_INTERVAL);
    return () => clearInterval(pollRef.current);
  }, [fetchRoutes]);

  const stats = useMemo(() => ({
    total: routes.length,
    pending: routes.filter(r => r.status === 'PENDING').length,
    inProgress: routes.filter(r => r.status === 'IN_PROGRESS').length,
    completed: routes.filter(r => r.status === 'COMPLETED').length,
  }), [routes]);

  // Inicializar mapa
  useEffect(() => {
    if (map.current) return;
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/light-v11",
      center: [-70.6483, -33.4569],
      zoom: 13
    });
    map.current.addControl(new mapboxgl.NavigationControl(), "top-right");
  }, []);

  // 🚩 SOLUCIÓN PARA EL ESPACIO GRIS (RESIZE DEL MAPA)
  useEffect(() => {
    if (map.current) {
      // Esperamos 500ms a que termine la animación de cierre/apertura del panel
      const resizeTimer = setTimeout(() => {
        map.current.resize();
      }, 500);
      return () => clearTimeout(resizeTimer);
    }
  }, [panelOpen]);

  // Pintar marcadores cuando cambian las rutas
  useEffect(() => {
    if (!map.current) return;

    const paintMarkers = () => {
      markers.current.forEach((m) => m.remove());
      markers.current = [];

      const bounds = new mapboxgl.LngLatBounds();
      let hasCoords = false;

      routes.forEach((route) => {
        if (!route.lat || !route.lng) return;
        hasCoords = true;

        const el = document.createElement("div");
        el.style.cssText = `width: 22px; height: 22px; background-color: ${statusToColor(route.status)}; border-radius: 50%; border: 3px solid white; box-shadow: 0 4px 6px rgba(0,0,0,0.2); cursor: pointer; transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);`;
        el.onmouseenter = () => el.style.transform = 'scale(1.4)';
        el.onmouseleave = () => el.style.transform = 'scale(1)';

        const marker = new mapboxgl.Marker(el)
          .setLngLat([parseFloat(route.lng), parseFloat(route.lat)])
          .setPopup(new mapboxgl.Popup({ offset: 15, closeButton: false }).setHTML(`
            <div style="font-family: 'Outfit'; padding: 8px 4px; text-transform: uppercase;">
              <p style="font-weight: 900; margin: 0; font-size: 11px; color: #111827; letter-spacing: -0.02em;">${route.local_nombre || 'Sin nombre'}</p>
              <p style="font-size: 9px; font-weight: 700; color: #9ca3af; margin: 4px 0 0 0; letter-spacing: 0.05em;">${route.cadena || ''} | ${route.comuna || ''}</p>
            </div>
          `))
          .addTo(map.current);

        markers.current.push(marker);
        bounds.extend([parseFloat(route.lng), parseFloat(route.lat)]);
      });

      if (hasCoords) {
        map.current.fitBounds(bounds, { padding: 80, duration: 1000 });
      }
    };

    if (map.current.isStyleLoaded()) {
      paintMarkers();
    } else {
      map.current.once('style.load', paintMarkers);
    }
  }, [routes]);

  const flyToRoute = (route) => {
    if (!map.current || !route.lat || !route.lng) return;
    setSelectedRoute(route);
    
    if (window.innerWidth < 1024) setPanelOpen(false);
    
    map.current.flyTo({
      center: [parseFloat(route.lng), parseFloat(route.lat)],
      zoom: 14, // 🚩 Ajustado a 14 para no acercarse en exceso
      duration: 1200
    });
  };

  const formatLastUpdated = (date) => {
    if (!date) return '';
    return date.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  return (
    <div className="w-full h-full flex flex-col font-[Outfit] bg-gray-50/50">

      {/* HEADER INTEGRADO */}
      <div className="bg-white border-b border-gray-100 px-6 py-6 md:px-8 md:py-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 z-10 shrink-0">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#87be00]/10 rounded-lg text-[#87be00]">
              <FiNavigation size={20} />
            </div>
            <h2 className="text-xl md:text-2xl font-black text-gray-900 uppercase italic tracking-tighter leading-none">
              Monitoreo GPS
            </h2>
          </div>
          <p className="text-[9px] md:text-[10px] font-bold text-[#87be00] uppercase tracking-[0.2em] ml-12 mt-1">
            Planificación y seguimiento en tiempo real
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full md:w-auto">
          {/* Leyenda de estados */}
          <div className="flex gap-4 bg-gray-50 px-5 py-3 rounded-[1rem] border border-gray-100 w-full sm:w-auto justify-center">
            <span className="text-[9px] font-black flex items-center gap-2 uppercase tracking-widest text-gray-500"><span className="w-2.5 h-2.5 rounded-full bg-[#ef4444] shadow-sm"></span> Pendiente</span>
            <span className="text-[9px] font-black flex items-center gap-2 uppercase tracking-widest text-gray-500"><span className="w-2.5 h-2.5 rounded-full bg-[#87be00] shadow-sm"></span> Proceso</span>
            <span className="text-[9px] font-black flex items-center gap-2 uppercase tracking-widest text-gray-500"><span className="w-2.5 h-2.5 rounded-full bg-[#2563eb] shadow-sm"></span> Lista</span>
          </div>
          
          {/* Indicador de última actualización */}
          {lastUpdated && (
            <div className="flex items-center justify-center gap-2 bg-gray-900 px-5 py-3 rounded-[1rem] shadow-xl w-full sm:w-auto">
              <span className={`w-2 h-2 rounded-full ${refreshing ? 'bg-[#87be00] animate-pulse' : 'bg-[#87be00]'}`}></span>
              <span className="text-[9px] font-black uppercase text-white tracking-widest whitespace-nowrap">
                {refreshing ? 'Actualizando...' : `Act: ${formatLastUpdated(lastUpdated)}`}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* CONTENIDO PRINCIPAL (MAPA + PANEL) */}
      <div className="flex-1 flex p-4 md:p-8 gap-6 overflow-hidden relative">

        {/* CONTENEDOR DEL MAPA */}
        <div className="flex-1 bg-white rounded-[2rem] shadow-sm border border-gray-100 relative overflow-hidden">
          {!loading && routes.length === 0 && (
            <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-4 text-gray-400 bg-gray-50/80 backdrop-blur-sm">
              <div className="w-16 h-16 rounded-full bg-white shadow-sm flex items-center justify-center text-gray-300">
                <FiAlertCircle size={32} />
              </div>
              <p className="font-black uppercase text-[10px] tracking-widest">No hay rutas encontradas</p>
            </div>
          )}
          
          <div ref={mapContainer} className="w-full h-full" />

          {/* Botón Flotante para abrir/cerrar panel en móvil/tablet */}
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

        {/* PANEL LATERAL (Deslizable/Colapsable) */}
        <div className={`
          absolute lg:relative right-4 md:right-8 top-4 md:top-8 bottom-4 md:bottom-8 lg:right-0 lg:top-0 lg:bottom-0
          transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] z-30 flex flex-col gap-4
          ${panelOpen ? 'w-[calc(100%-2rem)] sm:w-80 translate-x-0 opacity-100' : 'w-0 translate-x-full lg:translate-x-10 opacity-0 pointer-events-none lg:w-0'}
        `}>
          
          {/* Card: Stats Resumen */}
          <div className="bg-white rounded-[2rem] border border-gray-100 shadow-xl shadow-gray-200/50 p-6 flex flex-col shrink-0">
            <div className="flex items-center justify-between mb-5">
              <p className="text-[9px] font-black uppercase tracking-widest text-gray-400">Resumen Rutas</p>
              <div className="flex items-center gap-2">
                {refreshing && <FiRefreshCw size={12} className="text-[#87be00] animate-spin" />}
                <span className="text-3xl font-black italic text-gray-900 leading-none">{stats.total}</span>
              </div>
            </div>
            
            <div className="space-y-4">
              {/* Pendientes */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#ef4444]"></span>
                    <span className="text-[9px] font-black uppercase tracking-widest text-gray-500">Pendiente</span>
                  </div>
                  <span className="text-[11px] font-black text-gray-800">{stats.pending}</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                  <div className="bg-[#ef4444] h-full rounded-full transition-all duration-1000 ease-out" style={{ width: stats.total ? `${(stats.pending / stats.total) * 100}%` : '0%' }} />
                </div>
              </div>
              
              {/* En Proceso */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#87be00]"></span>
                    <span className="text-[9px] font-black uppercase tracking-widest text-gray-500">En Proceso</span>
                  </div>
                  <span className="text-[11px] font-black text-gray-800">{stats.inProgress}</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                  <div className="bg-[#87be00] h-full rounded-full transition-all duration-1000 ease-out" style={{ width: stats.total ? `${(stats.inProgress / stats.total) * 100}%` : '0%' }} />
                </div>
              </div>

              {/* Completadas */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#2563eb]"></span>
                    <span className="text-[9px] font-black uppercase tracking-widest text-gray-500">Completada</span>
                  </div>
                  <span className="text-[11px] font-black text-gray-800">{stats.completed}</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                  <div className="bg-[#2563eb] h-full rounded-full transition-all duration-1000 ease-out" style={{ width: stats.total ? `${(stats.completed / stats.total) * 100}%` : '0%' }} />
                </div>
              </div>
            </div>
          </div>

          {/* Card: Lista de Locales */}
          <div className="bg-white rounded-[2rem] border border-gray-100 shadow-xl shadow-gray-200/50 flex flex-col overflow-hidden flex-1 min-h-0">
            <div className="px-6 py-5 border-b border-gray-50 flex items-center justify-between bg-white shrink-0 z-10">
              <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 flex items-center gap-2">
                <FiList size={14} className="text-[#87be00]" /> Despliegue
              </p>
            </div>
            
            <div className="overflow-y-auto flex-1 custom-scrollbar">
              {routes.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full py-10 gap-3 text-gray-300">
                  <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center">
                    <FiMapPin size={20} />
                  </div>
                  <p className="text-[9px] font-black uppercase tracking-widest">Sin asignaciones</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-50/50 p-2">
                  {routes.map((route, idx) => (
                    <button
                      key={idx}
                      onClick={() => flyToRoute(route)}
                      className={`w-full text-left p-4 rounded-2xl transition-all group flex items-start gap-4 ${selectedRoute === route ? 'bg-[#87be00]/5 ring-1 ring-[#87be00]/20' : 'hover:bg-gray-50'}`}
                    >
                      <div className="mt-1 shrink-0">
                        <span className="w-3 h-3 rounded-full block shadow-sm transition-transform duration-300 group-hover:scale-125" style={{ backgroundColor: statusToColor(route.status) }}></span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-black text-gray-900 uppercase italic truncate leading-tight mb-1 group-hover:text-[#87be00] transition-colors">
                          {route.cadena|| 'Sin nombre'}
                        </p>
                        <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest truncate">{route.cadena} · {route.comuna}</p>
                        <span className={`mt-2 inline-flex items-center text-[8px] font-black uppercase px-2.5 py-1 rounded-lg border transition-all ${statusBg(route.status)}`}>
                          {statusLabel(route.status)}
                        </span>
                      </div>
                      <FiChevronRight size={14} className="text-gray-300 group-hover:text-[#87be00] group-hover:translate-x-1 mt-2 shrink-0 transition-all" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default RoutePlanningMap;