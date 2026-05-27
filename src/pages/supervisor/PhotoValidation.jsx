import { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { 
  FiSearch, FiFilter, FiCalendar, FiImage, FiHash, FiExternalLink, 
  FiCamera, FiX, FiDownload 
} from "react-icons/fi";
import api from "../../api/apiClient"; 
import { useAuth } from "../../context/AuthContext";

const PhotoValidation = () => {
  const { user } = useAuth(); 
  const isRoot = user?.role === 'ROOT';

  const [searchTerm, setSearchTerm] = useState(""); 
  const [debouncedSearch, setDebouncedSearch] = useState(""); 
  const [filters, setFilters] = useState({
    empresa_id: isRoot ? "" : user?.company_id,
    cadena: "",
    codigo: "",
    fecha: new Date().toISOString().split('T')[0], 
  });

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchTerm.trim());
    }, 600);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  // --- 1. CARGA DE LOCALES ---
  const { data: allLocales = [] } = useQuery({
    queryKey: ["all-locales-list", filters.empresa_id],
    queryFn: async () => {
      const response = await api.get("/locales", { 
        params: { company_id: filters.empresa_id || undefined } 
      });
      return response.data || response || [];
    },
    enabled: !!filters.empresa_id 
  });

  const availableCadenas = useMemo(() => {
    if (!Array.isArray(allLocales)) return [];
    return [...new Set(allLocales.map(l => l.cadena).filter(Boolean))].sort();
  }, [allLocales]);

  const availableCodigos = useMemo(() => {
    if (!Array.isArray(allLocales)) return [];
    const filteredByChain = filters.cadena ? allLocales.filter(l => l.cadena === filters.cadena) : allLocales;
    return [...new Set(filteredByChain.map(l => l.codigo_local || l.codigo_pos).filter(Boolean))].sort();
  }, [allLocales, filters.cadena]);

  // --- 2. FETCH DE FOTOS ---
  const { data: photos = [], isLoading: isLoadingPhotos } = useQuery({
    queryKey: ["audit-photos", filters.fecha, filters.empresa_id, debouncedSearch], 
    queryFn: async () => {
      const params = {
        empresa_id: filters.empresa_id,
        ...(debouncedSearch ? { search: debouncedSearch } : { fecha: filters.fecha })
      };
      const response = await api.get("/reports/photos", { params });
      return response.data || response || [];
    },
    enabled: !!filters.empresa_id
  });

  const filteredPhotos = useMemo(() => {
    if (!Array.isArray(photos)) return [];
    return photos.filter(p => {
      const matchesCadena = filters.cadena === "" || p.cadena === filters.cadena;
      const matchesCodigo = filters.codigo === "" || String(p.local_codigo) === String(filters.codigo);
      return matchesCadena && matchesCodigo;
    });
  }, [photos, filters.cadena, filters.codigo]);

  /**
   * 🛠️ GESTIÓN DINÁMICA DE RUTAS (Soporte Híbrido: Supabase + Local Legacy)
   */
  const getImageUrl = (item) => {
    // 🚩 FIX: Soportamos tanto image_url (Supabase) como photo_url (Legacy)
    const path = item.image_url || item.photo_url || "";
    if (!path) return "https://via.placeholder.com/400x300?text=Sin+Imagen";
    
    // Si la ruta es externa (Supabase), la devolvemos tal cual
    if (path.startsWith('http')) return path;

    // --- LÓGICA LEGACY PARA FOTOS ANTIGUAS LOCALES ---
    const baseUrl = import.meta.env.VITE_API_URL.split('/api')[0];
    let cleanPath = path.trim().replace(/\\/g, "/").replace(/^uploads\//i, '');

    if (cleanPath.includes("usuario_desconocido") || cleanPath.includes("default_tenant")) {
      const slugify = (text) => text?.toString().toLowerCase().trim()
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        .replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "") || "desconocido";
      
      const safeCompany = slugify(item.empresa_nombre);
      const safeUser = slugify(item.user_name);
      const fileName = cleanPath.split('/').pop();

      const mapeo = { 
        'Fachada': 'foto_local', 
        'Góndola Inicio': 'foto_gondola', 
        'Góndola Final': 'foto_term_producto', 
        'Observaciones': 'foto_observaciones' 
      };
      const subFolder = mapeo[item.photo_type] || "otros";

      cleanPath = `${safeCompany}/${safeUser}/evidencias/${subFolder}/${fileName}`;
    }

    return `${baseUrl}/uploads/${cleanPath}`;
  };

  const handleDownload = async (imageUrl, fileName) => {
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName.replace(/\s+/g, '_').toLowerCase();
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      // Si falla por CORS de Supabase, abrimos en nueva ventana
      window.open(imageUrl, '_blank');
    }
  };

  return (
    <div className="space-y-6 md:space-y-8 font-[Outfit] pb-10">
      
      {/* HEADER */}
      <div className="flex flex-row justify-between items-start sm:items-center px-2 md:px-4 gap-4">
        <div className="flex-1">
          <h2 className="text-xl md:text-2xl font-black text-gray-900 uppercase italic tracking-tighter leading-none">
            Validación de Ejecución
          </h2>
          <div className="flex items-center gap-2 mt-1.5 md:mt-2">
            <p className="text-[9px] md:text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-tight">
              Sincronización de Evidencias en Tiempo Real
            </p>
          </div>
        </div>
        <div className="bg-black p-3 md:p-4 rounded-xl md:rounded-2xl shadow-xl shrink-0">
            <FiCamera className="text-[#87be00] text-xl md:text-2xl" />
        </div>
      </div>

      {/* FILTROS */}
      <section className="bg-white p-4 md:p-6 rounded-[1.5rem] md:rounded-[2.5rem] shadow-sm border border-gray-50 mx-2 md:mx-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          <div className="relative">
            <FiFilter className="absolute left-4 top-1/2 -translate-y-1/2 text-[#87be00]" />
            <select 
              className="w-full pl-10 md:pl-12 pr-4 py-3 md:py-4 bg-gray-50 rounded-xl md:rounded-[1.5rem] text-[9px] md:text-[10px] font-black uppercase outline-none focus:ring-2 focus:ring-[#87be00]/20 transition-all"
              value={filters.cadena}
              onChange={(e) => setFilters({...filters, cadena: e.target.value, codigo: ""})}
            >
              <option value="">TODAS LAS CADENAS</option>
              {availableCadenas.map(cad => <option key={cad} value={cad}>{cad.toUpperCase()}</option>)}
            </select>
          </div>

          <div className="relative">
            <FiHash className="absolute left-4 top-1/2 -translate-y-1/2 text-[#87be00]" />
            <select 
              className="w-full pl-10 md:pl-12 pr-4 py-3 md:py-4 bg-gray-50 rounded-xl md:rounded-[1.5rem] text-[9px] md:text-[10px] font-black uppercase outline-none focus:ring-2 focus:ring-[#87be00]/20 transition-all"
              value={filters.codigo}
              onChange={(e) => setFilters({...filters, codigo: e.target.value})}
            >
              <option value="">TODOS LOS CÓDIGOS</option>
              {availableCodigos.map(cod => <option key={cod} value={cod}>{cod}</option>)}
            </select>
          </div>

          <div className="relative">
            <FiCalendar className="absolute left-4 top-1/2 -translate-y-1/2 text-[#87be00]" />
            <input 
              type="date"
              className="w-full pl-10 md:pl-12 pr-4 py-3 md:py-4 bg-gray-50 rounded-xl md:rounded-[1.5rem] text-[9px] md:text-[10px] font-black outline-none focus:ring-2 focus:ring-[#87be00]/20 transition-all"
              value={filters.fecha}
              onChange={(e) => setFilters({...filters, fecha: e.target.value})}
            />
          </div>

          <div className="relative">
            <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
            <input 
              type="text"
              placeholder="BUSCAR..."
              className="w-full pl-10 md:pl-12 pr-4 py-3 md:py-4 bg-gray-50 rounded-xl md:rounded-[1.5rem] text-[9px] md:text-[10px] font-black uppercase outline-none focus:ring-2 focus:ring-[#87be00]/20 transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </section>

      {/* GRID */}
      {isLoadingPhotos ? (
        <div className="py-20 text-center text-[10px] font-black uppercase italic animate-pulse text-gray-400">
            Cargando imágenes...
        </div>
      ) : filteredPhotos.length === 0 ? (
        <div className="py-20 md:py-32 text-center bg-white rounded-[2rem] md:rounded-[3.5rem] border border-dashed border-gray-100 mx-2 md:mx-4">
           <FiImage className="mx-auto text-gray-200 mb-3 md:mb-4" size={40} />
           <p className="text-[10px] md:text-xs font-black text-gray-300 uppercase italic tracking-widest">Sin registros</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6 px-2 md:px-4">
          {filteredPhotos.map((item) => {
            const currentUrl = getImageUrl(item);
            
            return (
              <div key={item.id} className="bg-white rounded-[1.5rem] md:rounded-[2rem] overflow-hidden shadow-sm border border-gray-50 group hover:shadow-xl transition-all flex flex-col">
                <div className="relative h-48 md:h-60 overflow-hidden bg-gray-50 shrink-0">
                  <img 
                    src={currentUrl} 
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" 
                    alt="Evidencia" 
                    onError={(e) => { e.target.src = "https://via.placeholder.com/400x300?text=No+Encontrada"; }}
                  />
                  <div className="absolute top-3 left-3 md:top-4 md:left-4 bg-black/80 text-[#87be00] text-[8px] font-black px-2.5 py-1 md:px-3 md:py-1.5 rounded-full uppercase italic shadow-md">
                    {item.photo_type || item.evidence_type || 'Evidencia'}
                  </div>
                </div>
                
                <div className="p-4 md:p-5 flex-1 flex flex-col justify-between">
                  <div className="flex items-center gap-2.5 md:gap-3 mb-4">
                    <div className="w-8 h-8 md:w-10 md:h-10 shrink-0 bg-black rounded-xl md:rounded-2xl flex items-center justify-center text-[#87be00] font-black text-[10px] md:text-xs italic">
                      {(item.user_name || item.first_name || 'U').substring(0,2).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] md:text-[11px] font-black text-gray-900 uppercase italic truncate leading-tight">
                        {item.user_name || `${item.first_name} ${item.last_name}`}
                      </p>
                      <p className="text-[8px] md:text-[9px] font-bold text-gray-400 uppercase truncate mt-0.5">
                        {item.cadena} • {item.local_nombre || item.local_name}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 mt-auto">
                      <a href={currentUrl} target="_blank" rel="noreferrer" 
                        className="py-2.5 md:py-3 bg-gray-50 rounded-xl flex items-center justify-center text-gray-400 hover:bg-black hover:text-[#87be00] transition-all shadow-sm">
                        <FiExternalLink size={16} className="md:w-[18px] md:h-[18px]" />
                      </a>
                      <button onClick={() => handleDownload(currentUrl, `evidencia_${item.user_name || item.first_name}.jpg`)}
                        className="py-2.5 md:py-3 bg-gray-50 rounded-xl flex items-center justify-center text-gray-400 hover:bg-[#87be00] hover:text-white transition-all shadow-sm">
                        <FiDownload size={16} className="md:w-[18px] md:h-[18px]" />
                      </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default PhotoValidation;