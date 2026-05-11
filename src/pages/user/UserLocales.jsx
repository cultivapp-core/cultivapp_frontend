import React, { useState, useEffect } from "react";
import { 
  FiMapPin, FiPhone, FiSearch, FiNavigation, 
  FiInfo, FiCalendar, FiCheckCircle, FiClock, FiAlertCircle 
} from "react-icons/fi";
import api from "../../api/apiClient";
import toast from "react-hot-toast";

// Función para obtener la fecha de hoy en formato YYYY-MM-DD (Evita desfase de zona horaria)
const getTodayStr = () => {
  const tzOffset = (new Date()).getTimezoneOffset() * 60000;
  return new Date(Date.now() - tzOffset).toISOString().split('T')[0];
};

const UserLocales = () => {
  const [locales, setLocales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("agendados"); // 'todos' o 'agendados'

  const fetchMyLocales = async () => {
    try {
      setLoading(true);
      // Ahora que el backend está listo, esto traerá los locales con su estado de agenda
      const data = await api.get("/locales/my-assigned", { params: { date: getTodayStr() } });
      setLocales(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error locales:", error);
      toast.error("No se pudieron cargar tus locales");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMyLocales();
  }, []);

  // Lógica de filtrado inteligente
  const filteredLocales = locales.filter(l => {
    const matchesSearch = 
      l.cadena?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      l.direccion?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      l.codigo_local?.toLowerCase().includes(searchTerm.toLowerCase());

    if (filterType === "agendados") {
      return matchesSearch && (l.is_scheduled || l.has_route);
    }
    
    return matchesSearch;
  });

  if (loading) return (
    <div className="p-20 text-center flex flex-col items-center justify-center space-y-4">
      <div className="w-12 h-12 border-4 border-[#87be00] border-t-transparent rounded-full animate-spin" />
      <p className="font-black text-gray-300 italic uppercase tracking-widest text-[10px]">Sincronizando puntos de venta...</p>
    </div>
  );

  return (
    <div className="p-4 space-y-6 font-[Outfit] animate-in fade-in duration-500 pb-20">
      
      {/* ── HEADER & CONTROLES ── */}
      <div className="bg-white p-6 md:p-8 rounded-[2.5rem] shadow-sm border border-gray-100 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black text-gray-900 uppercase tracking-tighter italic">Mis Locales</h1>
            <p className="text-[#87be00] text-[10px] font-black uppercase tracking-widest mt-1">Gestión de puntos de venta asignados</p>
          </div>

          <div className="flex bg-gray-100 p-1 rounded-2xl w-fit shadow-inner">
            <button 
              onClick={() => setFilterType("agendados")}
              className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all ${filterType === 'agendados' ? 'bg-white text-gray-900 shadow-md' : 'text-gray-400 hover:text-gray-600'}`}
            >
              Ruta de Hoy
            </button>
            <button 
              onClick={() => setFilterType("todos")}
              className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all ${filterType === 'todos' ? 'bg-white text-gray-900 shadow-md' : 'text-gray-400 hover:text-gray-600'}`}
            >
              Base Completa
            </button>
          </div>
        </div>

        <div className="relative w-full">
          <FiSearch className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input 
            type="text" 
            placeholder="BUSCAR POR CADENA, DIRECCIÓN O CÓDIGO DE LOCAL..."
            className="w-full bg-gray-50 border-none rounded-[1.5rem] pl-14 pr-4 py-5 text-xs font-bold outline-none focus:ring-2 focus:ring-[#87be00]/20 transition-all uppercase italic shadow-inner"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* ── LISTADO DE LOCALES ── */}
      <div className="space-y-4">
        {filteredLocales.length === 0 ? (
          <div className="bg-white p-20 rounded-[3rem] border-2 border-dashed border-gray-100 text-center">
            <FiAlertCircle className="mx-auto text-gray-200 mb-4" size={48} />
            <p className="text-gray-400 font-black uppercase text-[11px] tracking-[0.2em]">
              {filterType === 'agendados' ? 'No tienes visitas programadas para hoy' : 'No se encontraron locales en tu base'}
            </p>
          </div>
        ) : (
          filteredLocales.map((local) => (
            <div key={local.id} className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-gray-100 flex flex-col md:flex-row items-center justify-between gap-6 hover:border-[#87be00]/40 transition-all group relative overflow-hidden">
              
              {/* Barra lateral de estado */}
              {local.is_scheduled && (
                <div className="absolute top-0 left-0 h-full w-2 bg-[#87be00]" />
              )}

              {/* IDENTIFICACIÓN */}
              <div className="flex items-center gap-5 w-full md:w-1/3">
                <div className={`w-16 h-16 rounded-[1.5rem] flex items-center justify-center font-black text-xl shadow-inner transition-all duration-500 ${local.is_scheduled ? 'bg-[#87be00] text-white' : 'bg-gray-100 text-gray-300'}`}>
                  {local.cadena?.charAt(0) || 'L'}
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-sm font-black text-gray-900 uppercase italic leading-none">{local.cadena}</h3>
                    {local.status === 'COMPLETED' ? (
                      <FiCheckCircle className="text-[#87be00]" size={16} />
                    ) : local.is_scheduled && (
                      <FiClock className="text-amber-500 animate-pulse" size={16} />
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 bg-gray-50 text-[9px] font-black text-gray-400 rounded-md uppercase tracking-widest border border-gray-100">
                      #{local.codigo_local || local.numero_local || 'S/N'}
                    </span>
                    {local.is_scheduled && (
                       <span className="text-[9px] bg-[#87be00]/10 text-[#87be00] font-black px-2 py-0.5 rounded-md uppercase tracking-tighter italic">En Ruta</span>
                    )}
                  </div>
                </div>
              </div>

              {/* UBICACIÓN */}
              <div className="flex flex-col w-full md:w-1/3">
                <span className="text-[9px] font-black text-gray-300 uppercase tracking-[0.2em] mb-2">Dirección GPS</span>
                <div className="flex items-start gap-2">
                  <FiMapPin className="text-[#87be00] mt-0.5 flex-shrink-0" size={14} />
                  <span className="text-xs font-bold text-gray-600 leading-tight italic">
                    {local.direccion}, <span className="text-gray-400 uppercase">{local.comuna_name || local.comuna || 'Sin Comuna'}</span>
                  </span>
                </div>
              </div>

              {/* ACCIONES */}
              <div className="flex items-center gap-3 w-full md:w-auto">
                {local.lat && local.lng && (
                   <a 
                    // 🚩 CORREGIDO: URL estándar para abrir Google Maps Navigation
                    href={`https://www.google.com/maps/dir/?api=1&destination=${local.lat},${local.lng}`}
                    target="_blank"
                    rel="noreferrer"
                    className="p-4 bg-gray-50 text-gray-400 rounded-2xl hover:bg-[#87be00] hover:text-white transition-all shadow-sm hover:shadow-lg active:scale-90"
                    title="Navegar al local"
                  >
                    <FiNavigation size={20} />
                  </a>
                )}
                
                <button 
                  className={`flex-1 md:flex-none flex items-center justify-center gap-3 px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg active:scale-95 ${local.is_scheduled ? 'bg-gray-900 text-white hover:bg-black' : 'bg-white border border-gray-200 text-gray-400'}`}
                >
                  <FiInfo size={14} />
                  Ver Ficha
                </button>
              </div>

            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default UserLocales;