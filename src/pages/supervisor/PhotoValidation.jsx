import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import JSZip from "jszip";
import { 
  FiSearch, FiCalendar, FiImage, FiHash, FiExternalLink, 
  FiCamera, FiDownload, FiUser, FiCheck, FiDownloadCloud, FiPackage, FiLoader 
} from "react-icons/fi";
import api from "../../api/apiClient"; 
import { useAuth } from "../../context/AuthContext";

// offsetDays permite generar fechas relativas a hoy (ej: -30 = hace 30 días)
const getLocalISODate = (offsetDays = 0) => {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  const tzOffset = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - tzOffset).toISOString().split('T')[0];
};

// Limpia un string para usarlo como nombre de archivo/carpeta seguro
const safeFileName = (text, fallback = "sin_dato") => {
  if (!text) return fallback;
  return text.toString().trim()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // quita tildes
    .replace(/[^a-zA-Z0-9_\-]+/g, "_") // reemplaza espacios y símbolos raros
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");
};

const PhotoValidation = () => {
  const { user } = useAuth(); 
  const isRoot = user?.role === 'ROOT';

  // Default: últimos 30 días en lugar de "solo hoy".
  // Evita que el panel cargue vacío cuando no hay evidencias subidas en el día actual.
  const [inputs, setInputs] = useState({
    startDate: getLocalISODate(-30),
    endDate: getLocalISODate(),
    localCode: "",
    workerName: "",
    searchTerm: ""
  });

  const [appliedFilters, setAppliedFilters] = useState({
    startDate: getLocalISODate(-30),
    endDate: getLocalISODate(),
    localCode: "",
    workerName: "",
    search: ""
  });

  // Controla qué visita está actualmente generando su ZIP, para mostrar loading
  // individual sin bloquear el resto de los botones de la lista.
  const [zippingVisitId, setZippingVisitId] = useState(null);
  const [zippingAll, setZippingAll] = useState(false);

  const { data: photos = [], isLoading: isLoadingPhotos } = useQuery({
    queryKey: ["audit-photos", appliedFilters, user?.company_id], 
    queryFn: async () => {
      const params = {
        company_id: user?.company_id || undefined,
        startDate: appliedFilters.startDate,
        endDate: appliedFilters.endDate,
        localCode: appliedFilters.localCode.trim(),
        workerName: appliedFilters.workerName.trim(),
        search: appliedFilters.search.trim()
      };

      const response = await api.get("/routes/evidence-report", { params });
      // 🚩 IMPORTANTE: apiClient (fetch) retorna el JSON ya parseado directamente,
      // NO un objeto { data: [...] } como axios. response YA ES el array.
      return Array.isArray(response) ? response : (response?.data || []);
    },
    enabled: !!user?.company_id || isRoot
  });

  // Agrupa las fotos planas que devuelve el backend en un mapa por visit_id,
  // conservando los metadatos de local/usuario/visit_number de cada grupo.
  const visitGroups = useMemo(() => {
    const map = new Map();
    for (const item of photos) {
      const key = item.visit_id || "sin_visita";
      if (!map.has(key)) {
        map.set(key, {
          visit_id: item.visit_id,
          visit_number: item.visit_number,
          local_codigo: item.local_codigo,
          local_nombre: item.local_nombre,
          user_name: item.user_name,
          photos: []
        });
      }
      map.get(key).photos.push(item);
    }

    const groups = Array.from(map.values()).sort((a, b) => 
      (b.photos[0]?.created_at || "").localeCompare(a.photos[0]?.created_at || "")
    );

    // 🚩 NUMERACIÓN DE PRODUCTOS POR VISITA:
    // Dentro de cada visita, las fotos de góndola (inicio/fin) comparten el mismo
    // product_id. Se asigna "Producto N° 1", "N° 2"... según el ORDEN DE APARICIÓN
    // del producto dentro de esa visita (no por foto individual), para que las
    // 2 fotos de un mismo producto (inicio y fin) queden bajo el mismo número.
    // Fotos sin product_id (Inicio_Jornada, Salida_Jornada, etc.) no se numeran.
    for (const group of groups) {
      const productOrder = new Map(); // product_id -> número asignado
      let nextNumber = 1;

      for (const photo of group.photos) {
        if (!photo.product_id) {
          photo.product_label = null;
          continue;
        }
        if (!productOrder.has(photo.product_id)) {
          productOrder.set(photo.product_id, nextNumber);
          nextNumber++;
        }
        const num = productOrder.get(photo.product_id);
        const name = photo.product_name || "Producto sin nombre";
        photo.product_label = `Producto N° ${num} - ${name}`;
      }
    }

    return groups;
  }, [photos]);

  const handleApply = () => {
    // 🚩 IMPORTANTE: inputs.searchTerm (nombre del input en UI) debe mapearse
    // a appliedFilters.search (nombre que espera el backend / query param).
    setAppliedFilters({
      startDate: inputs.startDate,
      endDate: inputs.endDate,
      localCode: inputs.localCode,
      workerName: inputs.workerName,
      search: inputs.searchTerm
    });
  };

  const getImageUrl = (item) => {
    const path = item.image_url || item.photo_url || "";
    if (!path) return "https://via.placeholder.com/400x300?text=Sin+Imagen";
    if (path.startsWith('http')) return path;

    const baseUrl = import.meta.env.VITE_API_URL.split('/api')[0];
    let cleanPath = path.trim().replace(/\\/g, "/").replace(/^uploads\//i, '');

    if (cleanPath.includes("usuario_desconocido") || cleanPath.includes("default_tenant")) {
      const slugify = (text) => text?.toString().toLowerCase().trim()
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        .replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "") || "desconocido";
      
      const safeCompany = slugify(item.empresa_nombre);
      const safeUser = slugify(item.user_name);
      const fileName = cleanPath.split('/').pop();
      const mapeo = { 'Fachada': 'foto_local', 'Góndola Inicio': 'foto_gondola', 'Góndola Final': 'foto_term_producto', 'Observaciones': 'foto_observaciones' };
      const subFolder = mapeo[item.photo_type] || "otros";

      cleanPath = `${safeCompany}/${safeUser}/evidencias/${subFolder}/${fileName}`;
    }
    return `${baseUrl}/uploads/${cleanPath}`;
  };

  // Construye el nombre de archivo final para una foto dentro del ZIP.
  // Si la foto tiene producto asociado: "01_Producto_N_1_Coca-Cola_Original_500ml_Inicio.webp"
  // Si no (Inicio_Jornada, Salida_Jornada, etc.): "01_Inicio_Jornada.webp"
  const buildPhotoFileName = (item, index, ext) => {
    const isInicio = item.photo_type?.startsWith('gondola_inicio');
    const isFin = item.photo_type?.startsWith('gondola_fin');
    const stageSuffix = isInicio ? "_Inicio" : isFin ? "_Fin" : "";

    const base = item.product_label
      ? safeFileName(item.product_label, "producto")
      : safeFileName(item.photo_type, "evidencia");

    return `${String(index + 1).padStart(2, "0")}_${base}${stageSuffix}.${ext}`;
  };

  // Descarga Individual
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
      window.open(imageUrl, '_blank');
    }
  };

  // Determina la extensión real de una imagen a partir de su URL (jpg, png, webp, etc.)
  // En vez de forzar siempre ".jpg", lo cual corrompía archivos webp/png al renombrarlos.
  const getExtensionFromUrl = (url, fallback = "jpg") => {
    try {
      const clean = url.split("?")[0];
      const match = clean.match(/\.([a-zA-Z0-9]+)$/);
      return match ? match[1].toLowerCase() : fallback;
    } catch {
      return fallback;
    }
  };

  // Descarga un ZIP con todas las fotos de UNA visita puntual.
  // Nombre de archivo: {codigo_local}_{visit_number}.zip
  const handleDownloadVisitZip = async (group) => {
    if (!group.photos || group.photos.length === 0) return;

    setZippingVisitId(group.visit_id);
    try {
      const zip = new JSZip();
      const folderName = safeFileName(
        `${group.local_codigo || "local"}_${group.visit_number || group.visit_id?.slice(0, 8) || "visita"}`
      );
      const folder = zip.folder(folderName);

      for (let i = 0; i < group.photos.length; i++) {
        const item = group.photos[i];
        const url = getImageUrl(item);
        try {
          const response = await fetch(url);
          if (!response.ok) throw new Error(`HTTP ${response.status}`);
          const blob = await response.blob();
          const ext = getExtensionFromUrl(url);
          const fileName = buildPhotoFileName(item, i, ext);
          folder.file(fileName, blob);
        } catch (err) {
          console.error(`No se pudo agregar la foto ${item.id} al ZIP:`, err.message);
          // Continuamos con el resto de las fotos aunque una falle individualmente.
        }
      }

      const zipBlob = await zip.generateAsync({ type: "blob" });
      const url = window.URL.createObjectURL(zipBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${folderName}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error generando ZIP de visita:", error);
      alert("Ocurrió un error generando el ZIP de esta visita. Revisa la consola.");
    } finally {
      setZippingVisitId(null);
    }
  };

  // Descarga UN SOLO ZIP con todas las visitas actualmente filtradas,
  // cada una en su propia subcarpeta dentro del mismo archivo.
  const handleDownloadAllZip = async () => {
    if (!visitGroups || visitGroups.length === 0) {
      alert("No hay visitas para descargar con los filtros actuales.");
      return;
    }

    setZippingAll(true);
    try {
      const zip = new JSZip();

      for (const group of visitGroups) {
        const folderName = safeFileName(
          `${group.local_codigo || "local"}_${group.visit_number || group.visit_id?.slice(0, 8) || "visita"}`
        );
        const folder = zip.folder(folderName);

        for (let i = 0; i < group.photos.length; i++) {
          const item = group.photos[i];
          const url = getImageUrl(item);
          try {
            const response = await fetch(url);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const blob = await response.blob();
            const ext = getExtensionFromUrl(url);
            const fileName = buildPhotoFileName(item, i, ext);
            folder.file(fileName, blob);
          } catch (err) {
            console.error(`No se pudo agregar la foto ${item.id} al ZIP:`, err.message);
          }
        }
      }

      const zipBlob = await zip.generateAsync({ type: "blob" });
      const url = window.URL.createObjectURL(zipBlob);
      const link = document.createElement('a');
      const rangeLabel = `${appliedFilters.startDate}_a_${appliedFilters.endDate}`;
      link.href = url;
      link.download = `evidencias_${rangeLabel}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error generando ZIP general:", error);
      alert("Ocurrió un error generando el ZIP general. Revisa la consola.");
    } finally {
      setZippingAll(false);
    }
  };

  return (
    <div className="space-y-6 md:space-y-8 font-[Outfit] pb-10">
      <div className="flex flex-row justify-between items-start sm:items-center px-2 md:px-4 gap-4">
        <div>
          <h2 className="text-xl md:text-2xl font-black text-gray-900 uppercase italic tracking-tighter leading-none">
            Validación de Ejecución
          </h2>
          <p className="text-[9px] md:text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-2">
            Panel de Supervisión • Evidencias y Auditoría
          </p>
        </div>
        <div className="bg-black p-3 md:p-4 rounded-xl md:rounded-2xl shadow-xl shrink-0">
            <FiCamera className="text-[#87be00] text-xl md:text-2xl" />
        </div>
      </div>

      <section className="bg-white p-4 md:p-6 rounded-[1.5rem] md:rounded-[2.5rem] shadow-sm border border-gray-50 mx-2 md:mx-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-3 md:gap-4 items-end">
          
          <div className="relative">
            <label className="text-[9px] font-black text-gray-400 uppercase mb-1 block pl-1">Desde</label>
            <FiCalendar className="absolute left-4 top-[38px] text-[#87be00]" />
            <input type="date" className="w-full pl-10 pr-4 py-3 bg-gray-50 rounded-xl text-[10px] font-black outline-none focus:ring-2 focus:ring-[#87be00]/20" value={inputs.startDate} onChange={(e) => setInputs({...inputs, startDate: e.target.value})} />
          </div>

          <div className="relative">
            <label className="text-[9px] font-black text-gray-400 uppercase mb-1 block pl-1">Hasta</label>
            <FiCalendar className="absolute left-4 top-[38px] text-[#87be00]" />
            <input type="date" className="w-full pl-10 pr-4 py-3 bg-gray-50 rounded-xl text-[10px] font-black outline-none focus:ring-2 focus:ring-[#87be00]/20" value={inputs.endDate} onChange={(e) => setInputs({...inputs, endDate: e.target.value})} />
          </div>

          <div className="relative">
            <label className="text-[9px] font-black text-gray-400 uppercase mb-1 block pl-1">Cód. Local</label>
            <FiHash className="absolute left-4 top-[38px] text-[#87be00]" />
            <input type="text" placeholder="EJ: J04" className="w-full pl-10 pr-4 py-3 bg-gray-50 rounded-xl text-[10px] font-black uppercase outline-none focus:ring-2 focus:ring-[#87be00]/20" value={inputs.localCode} onChange={(e) => setInputs({...inputs, localCode: e.target.value})} />
          </div>

          <div className="relative">
            <label className="text-[9px] font-black text-gray-400 uppercase mb-1 block pl-1">Mercaderista</label>
            <FiUser className="absolute left-4 top-[38px] text-[#87be00]" />
            <input type="text" placeholder="NOMBRE" className="w-full pl-10 pr-4 py-3 bg-gray-50 rounded-xl text-[10px] font-black uppercase outline-none focus:ring-2 focus:ring-[#87be00]/20" value={inputs.workerName} onChange={(e) => setInputs({...inputs, workerName: e.target.value})} />
          </div>

          <div className="relative">
            <label className="text-[9px] font-black text-gray-400 uppercase mb-1 block pl-1">Búsqueda</label>
            <FiSearch className="absolute left-4 top-[38px] text-gray-400" />
            <input type="text" placeholder="RUT/EMAIL" className="w-full pl-10 pr-4 py-3 bg-gray-50 rounded-xl text-[10px] font-black uppercase outline-none focus:ring-2 focus:ring-[#87be00]/20" value={inputs.searchTerm} onChange={(e) => setInputs({...inputs, searchTerm: e.target.value})} />
          </div>

          <button onClick={handleApply} className="w-full py-3 bg-[#87be00] hover:bg-[#76a600] text-white rounded-xl text-[10px] font-black uppercase shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2">
            <FiCheck size={14} /> Aplicar
          </button>

          {/* BOTÓN DESCARGAR TODO COMO UN SOLO ZIP CON SUBCARPETAS POR VISITA */}
          <button 
            onClick={handleDownloadAllZip}
            disabled={isLoadingPhotos || zippingAll || visitGroups.length === 0}
            className="w-full py-3 bg-black hover:bg-gray-800 disabled:bg-gray-200 disabled:text-gray-400 text-white rounded-xl text-[10px] font-black uppercase shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2"
          >
            {zippingAll ? (
              <><FiLoader size={14} className="animate-spin" /> Empaquetando...</>
            ) : (
              <><FiDownloadCloud size={14} /> Todo (.zip)</>
            )}
          </button>
        </div>
      </section>

      {/* LISTADO DE VISITAS CON DESCARGA ZIP INDIVIDUAL */}
      {isLoadingPhotos ? (
        <div className="py-20 text-center text-[10px] font-black uppercase italic animate-pulse text-gray-400">Cargando imágenes...</div>
      ) : visitGroups.length === 0 ? (
        <div className="py-20 text-center bg-white rounded-[2rem] border border-dashed border-gray-100 mx-4">
           <FiImage className="mx-auto text-gray-200 mb-4" size={40} />
           <p className="text-xs font-black text-gray-300 uppercase italic tracking-widest">Sin registros encontrados</p>
        </div>
      ) : (
        <div className="space-y-6 px-4">
          {visitGroups.map((group) => (
            <div key={group.visit_id || Math.random()} className="bg-white rounded-[2rem] overflow-hidden shadow-sm border border-gray-50">
              {/* CABECERA DE LA VISITA */}
              <div className="flex flex-wrap items-center justify-between gap-3 p-5 border-b border-gray-50 bg-gray-50/50">
                <div>
                  <p className="text-xs font-black text-gray-900 uppercase italic">
                    {group.local_codigo || 'Local s/c'} {group.visit_number ? `· ${group.visit_number}` : ''}
                  </p>
                  <p className="text-[9px] font-bold text-gray-400 uppercase mt-1">
                    {group.user_name || 'Sin Nombre'} · {group.local_nombre || ''} · {group.photos.length} foto(s)
                  </p>
                </div>
                <button
                  onClick={() => handleDownloadVisitZip(group)}
                  disabled={zippingVisitId === group.visit_id}
                  className="py-2.5 px-4 bg-[#87be00] hover:bg-[#76a600] disabled:bg-gray-200 disabled:text-gray-400 text-white rounded-xl text-[10px] font-black uppercase shadow-md active:scale-95 transition-all flex items-center justify-center gap-2 shrink-0"
                >
                  {zippingVisitId === group.visit_id ? (
                    <><FiLoader size={14} className="animate-spin" /> Empaquetando...</>
                  ) : (
                    <><FiPackage size={14} /> Descargar visita (.zip)</>
                  )}
                </button>
              </div>

              {/* GRID DE FOTOS DE ESTA VISITA */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 p-5">
                {group.photos.map((item) => {
                  const currentUrl = getImageUrl(item);
                  // Si la foto tiene producto asociado, mostramos "Producto N° X - Nombre".
                  // Si además es una foto de inicio/fin de góndola, lo indicamos aparte.
                  const isInicio = item.photo_type?.startsWith('gondola_inicio');
                  const isFin = item.photo_type?.startsWith('gondola_fin');
                  const stageLabel = isInicio ? 'Inicio' : isFin ? 'Fin' : null;
                  const badgeText = item.product_label || item.photo_type || 'Evidencia';
                  return (
                    <div key={item.id} className="rounded-[1.5rem] overflow-hidden border border-gray-50 group hover:shadow-xl transition-all flex flex-col">
                      <div className="relative h-56 overflow-hidden bg-gray-50">
                        <img src={currentUrl} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" alt="Evidencia" onError={(e) => { e.target.src = "https://via.placeholder.com/400x300?text=No+Encontrada"; }} />
                        <div className="absolute top-4 left-4 right-4 flex items-center gap-1.5">
                          <div className="bg-black/80 text-[#87be00] text-[8px] font-black px-3 py-1.5 rounded-full uppercase italic shadow-md truncate max-w-full">
                            {badgeText}
                          </div>
                          {stageLabel && (
                            <div className="bg-white/90 text-gray-700 text-[8px] font-black px-2.5 py-1.5 rounded-full uppercase italic shadow-md shrink-0">
                              {stageLabel}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="p-4">
                         <div className="flex gap-2">
                            <a href={currentUrl} target="_blank" rel="noreferrer" className="flex-1 py-2.5 bg-gray-50 rounded-xl flex items-center justify-center text-gray-400 hover:bg-black hover:text-[#87be00] transition-all"><FiExternalLink size={16}/></a>
                            <button onClick={() => handleDownload(currentUrl, `foto_${item.id}.jpg`)} className="flex-1 py-2.5 bg-gray-50 rounded-xl flex items-center justify-center text-gray-400 hover:bg-[#87be00] hover:text-white transition-all"><FiDownload size={16}/></button>
                         </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default PhotoValidation;