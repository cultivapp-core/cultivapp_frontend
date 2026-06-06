import React, { useEffect, useRef, useState, useMemo } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import api from "../../api/apiClient";
import { FiNavigation, FiAlertCircle } from "react-icons/fi";

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;
mapboxgl.accessToken = MAPBOX_TOKEN;

const statusToColor = (status) => {
  switch (status) {
    case 'IN_PROGRESS': return '#87be00';
    case 'PENDING':     return '#ef4444';
    case 'COMPLETED':   return '#2563eb';
    default:            return '#94a3b8';
  }
};

const RoutePlanningMap = () => {
  const mapContainer = useRef(null);
  const map = useRef(null);
  const markers = useRef([]);
  
  const [routes, setRoutes] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [filterRegion, setFilterRegion] = useState('');
  const [filterComuna, setFilterComuna] = useState('');
  const [filterCadena, setFilterCadena] = useState('');

  useEffect(() => { setFilterComuna(''); }, [filterRegion]);

  useEffect(() => {
    const fetchRoutes = async () => {
      try {
        setLoading(true);
        const response = await api.get("/planning");
        setRoutes(Array.isArray(response.data) ? response.data : []);
      } catch (error) {
        console.error("Error cargando planificación:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchRoutes();
  }, []);

  const regions = useMemo(() => [...new Set(routes.map(r => r.region).filter(Boolean))].sort(), [routes]);
  const comunas = useMemo(() => {
      const base = filterRegion ? routes.filter(r => r.region === filterRegion) : routes;
      return [...new Set(base.map(r => r.comuna).filter(Boolean))].sort();
  }, [routes, filterRegion]);
  const cadenas = useMemo(() => [...new Set(routes.map(r => r.cadena).filter(Boolean))].sort(), [routes]);

  const filteredRoutes = useMemo(() => {
    return routes.filter(r => 
      (!filterRegion || r.region === filterRegion) &&
      (!filterComuna || r.comuna === filterComuna) &&
      (!filterCadena || r.cadena === filterCadena)
    );
  }, [routes, filterRegion, filterComuna, filterCadena]);

  useEffect(() => {
    if (map.current) return;
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/streets-v12",
      center: [-70.6483, -33.4569],
      zoom: 10
    });
    map.current.addControl(new mapboxgl.NavigationControl(), "top-right");
  }, []);

  useEffect(() => {
    if (!map.current || !map.current.isStyleLoaded()) return;

    markers.current.forEach((m) => m.remove());
    markers.current = [];

    const bounds = new mapboxgl.LngLatBounds();
    let hasCoords = false;

    filteredRoutes.forEach((route) => {
      if (!route.lat || !route.lng) return;
      hasCoords = true;
      
      const el = document.createElement("div");
      el.style.cssText = `width: 20px; height: 20px; background-color: ${statusToColor(route.status)}; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3); cursor: pointer;`;

      const marker = new mapboxgl.Marker(el)
        .setLngLat([parseFloat(route.lng), parseFloat(route.lat)])
        .setPopup(new mapboxgl.Popup({ offset: 15 }).setHTML(`
            <div style="font-family: 'Outfit'; padding: 5px;">
                <p style="font-weight: 900; margin: 0; font-size: 11px;">${route.local_nombre || 'Sin nombre'}</p>
                <p style="font-size: 9px; color: #666; margin: 0;">${route.cadena || ''} | ${route.comuna || ''}</p>
            </div>
        `))
        .addTo(map.current);
      
      markers.current.push(marker);
      bounds.extend([parseFloat(route.lng), parseFloat(route.lat)]);
    });

    if (hasCoords) {
      map.current.fitBounds(bounds, { padding: 80, duration: 1000 });
    }
  }, [filteredRoutes]);

  return (
    <div className="h-full flex flex-col font-[Outfit] gap-4">
      {/* ... (Tu Header y Filtros igual que antes) ... */}
      <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100 flex flex-wrap gap-3 items-end">
        <div className="flex items-center gap-3 mr-2 mb-1"><FiNavigation className="text-[#87be00]" /> <h2 className="font-black uppercase tracking-tighter text-sm">Planificación</h2></div>
        <div className="flex flex-col gap-1"><label className="text-[8px] text-gray-400 font-black uppercase">Región</label><select value={filterRegion} onChange={(e) => setFilterRegion(e.target.value)} className="bg-gray-50 p-2.5 rounded-xl text-[10px] font-bold uppercase outline-none min-w-[140px]"><option value="">Todas</option>{regions.map(r => <option key={r} value={r}>{r}</option>)}</select></div>
        <div className="flex flex-col gap-1"><label className="text-[8px] text-gray-400 font-black uppercase">Comuna</label><select value={filterComuna} onChange={(e) => setFilterComuna(e.target.value)} className="bg-gray-50 p-2.5 rounded-xl text-[10px] font-bold uppercase outline-none min-w-[140px]"><option value="">Todas</option>{comunas.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
        <div className="flex flex-col gap-1"><label className="text-[8px] text-gray-400 font-black uppercase">Cadena</label><select value={filterCadena} onChange={(e) => setFilterCadena(e.target.value)} className="bg-gray-50 p-2.5 rounded-xl text-[10px] font-bold uppercase outline-none min-w-[140px]"><option value="">Todas</option>{cadenas.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
        <div className="ml-auto flex gap-4 self-center pt-4"><span className="text-[9px] font-black flex items-center gap-1.5 uppercase"><span className="w-2 h-2 rounded-full bg-[#ef4444]"></span> Pendiente</span><span className="text-[9px] font-black flex items-center gap-1.5 uppercase"><span className="w-2 h-2 rounded-full bg-[#87be00]"></span> En Proceso</span><span className="text-[9px] font-black flex items-center gap-1.5 uppercase"><span className="w-2 h-2 rounded-full bg-[#2563eb]"></span> Completada</span></div>
      </div>

      <div className="flex-1 bg-white rounded-[2rem] p-2 shadow-inner border border-gray-100 relative min-h-[500px]">
        {!loading && routes.length === 0 && (
            <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-2 text-gray-400">
                <FiAlertCircle size={40} />
                <p className="font-black uppercase text-xs">No hay rutas encontradas para esta empresa</p>
            </div>
        )}
        <div ref={mapContainer} className="w-full h-full rounded-[1.5rem]" />
        {loading && (
           <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/50 backdrop-blur-sm">
             <div className="animate-spin text-[#87be00]"><FiNavigation size={30} /></div>
           </div>
        )}
      </div>
    </div>
  );
};

export default RoutePlanningMap;