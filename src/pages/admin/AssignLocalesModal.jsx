import React, { useState, useEffect, useMemo } from 'react';
import { FiX, FiCheck, FiSearch, FiMapPin, FiLoader, FiMinusCircle } from 'react-icons/fi';
import api from '../../api/apiClient';
import toast from 'react-hot-toast';

const AssignLocalesModal = ({ supervisor, onClose, onRefresh }) => {
  const [allLocales, setAllLocales] = useState([]);
  const [assignedIds, setAssignedIds] = useState([]);
  
  // Estados para Filtros
  const [regiones, setRegiones] = useState([]);
  const [selectedRegion, setSelectedRegion] = useState("");
  const [selectedCadena, setSelectedCadena] = useState(""); // 🟢 Nuevo estado para Cadena
  const [searchTerm, setSearchTerm] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchData();
  }, [supervisor.id]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // 1. Traer todos los locales
      const localesRes = await api.get(`/locales`);
      const localesData = Array.isArray(localesRes) ? localesRes : (localesRes?.data || []);
      
      // 2. Traer los locales ya asignados
      let currentIds = [];
      try {
        const currentRes = await api.get(`/users/${supervisor.id}/locales`);
        currentIds = Array.isArray(currentRes) ? currentRes.map(l => l.id) : [];
      } catch (e) {
        if (e.status !== 404) console.error("Error al obtener asignados:", e);
      }

      // 3. Traer Regiones (con Fallback por seguridad)
      let regionsData = [];
      try {
        const rRes = await api.get(`/regions`);
        regionsData = Array.isArray(rRes) ? rRes : (rRes?.data || []);
      } catch (e) {
        console.warn("No se pudo cargar /regions, se intentará usar datos de locales");
      }

      // FALLBACK: Si no hay API de regiones, extraemos regiones únicas de los mismos locales
      if (regionsData.length === 0) {
        const uniqueRegions = new Map();
        localesData.forEach(l => {
          if (l.region_id && l.region_nombre) {
            uniqueRegions.set(l.region_id, { id: l.region_id, name: l.region_nombre });
          }
        });
        regionsData = Array.from(uniqueRegions.values());
      }
      
      setAllLocales(localesData);
      setRegiones(regionsData);
      setAssignedIds(currentIds);

    } catch (error) {
      console.error(error);
      toast.error("Error al cargar locales de la empresa");
    } finally {
      setLoading(false);
    }
  };

  const toggleLocale = (id) => {
    setAssignedIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await api.post(`/users/${supervisor.id}/assign-locales`, { localeIds: assignedIds });
      toast.success("Cobertura actualizada con éxito");
      onRefresh();
      onClose();
    } catch (error) {
      toast.error("Error al guardar la asignación");
    } finally {
      setSaving(false);
    }
  };

  // 🟢 Extraer dinámicamente las cadenas únicas de los locales cargados
  const cadenasDisponibles = useMemo(() => {
    const uniqueCadenas = new Set();
    allLocales.forEach(l => {
      if (l.cadena && l.cadena.trim() !== "") {
        uniqueCadenas.add(l.cadena.trim());
      }
    });
    return Array.from(uniqueCadenas).sort();
  }, [allLocales]);

  // Lógica de Filtrado Actualizada
  const filteredLocales = useMemo(() => {
    const search = searchTerm.toLowerCase();
    
    return allLocales
      .filter(l => {
        const cadenaStr = (l.cadena || "").toLowerCase();
        const direccion = (l.direccion || "").toLowerCase();
        const codigo = (l.codigo_local || "").toLowerCase();
        
        // Match Búsqueda de texto
        const matchSearch = cadenaStr.includes(search) || direccion.includes(search) || codigo.includes(search);
        
        // Match Filtros Select
        const matchRegion = selectedRegion ? String(l.region_id) === String(selectedRegion) : true;
        const matchCadena = selectedCadena ? l.cadena === selectedCadena : true; // 🟢 Filtro por Cadena

        return matchSearch && matchRegion && matchCadena;
      })
      .sort((a, b) => {
        const aSelected = assignedIds.includes(a.id);
        const bSelected = assignedIds.includes(b.id);
        return bSelected - aSelected;
      });
  }, [allLocales, assignedIds, searchTerm, selectedRegion, selectedCadena]);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 font-[Outfit]">
      <div className="bg-white w-full max-w-3xl rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in duration-300 flex flex-col max-h-[90vh]">
        
        {/* HEADER */}
        <div className="p-6 md:p-8 border-b border-gray-50 flex justify-between items-center bg-gray-900 text-white shrink-0">
          <div>
            <p className="text-[10px] font-black text-[#87be00] uppercase tracking-widest italic">Gestión de Cobertura</p>
            <h2 className="text-xl md:text-2xl font-black italic uppercase leading-none mt-1">
              {supervisor.first_name} {supervisor.last_name}
            </h2>
          </div>
          <button onClick={onClose} className="p-3 bg-white/10 rounded-2xl hover:bg-red-500 transition-colors group">
            <FiX size={20} className="group-hover:scale-110 transition-transform" />
          </button>
        </div>

        {/* CONTROLES (Buscador y Filtros) */}
        <div className="p-6 bg-gray-50 border-b border-gray-100 flex flex-col gap-4 shrink-0">
          
          <div className="flex flex-col md:flex-row gap-4 items-center">
            {/* Buscador */}
            <div className="relative flex-1 w-full">
              <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
              <input 
                type="text"
                placeholder="Buscar por dirección o código..."
                className="w-full pl-12 pr-4 py-3.5 rounded-2xl border-none focus:ring-2 focus:ring-[#87be00] text-xs font-bold shadow-sm"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            {/* Contador */}
            <div className="text-right shrink-0 w-full md:w-auto flex justify-between md:flex-col items-center md:items-end px-2 md:px-0">
               <p className="text-[10px] font-black text-gray-400 uppercase leading-none">Asignados</p>
               <p className="text-2xl font-black text-[#87be00] italic leading-none">{assignedIds.length}</p>
            </div>
          </div>

          {/* Filtros de Región y Cadena */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <select
              value={selectedRegion}
              onChange={(e) => setSelectedRegion(e.target.value)}
              className="w-full bg-white border border-gray-200 text-gray-600 text-xs font-bold rounded-xl px-4 py-3 outline-none focus:border-[#87be00] transition-colors appearance-none shadow-sm cursor-pointer"
            >
              <option value="">Todas las Regiones</option>
              {regiones.map(r => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </select>

            <select
              value={selectedCadena}
              onChange={(e) => setSelectedCadena(e.target.value)}
              className="w-full bg-white border border-gray-200 text-gray-600 text-xs font-bold rounded-xl px-4 py-3 outline-none focus:border-[#87be00] transition-colors appearance-none shadow-sm cursor-pointer"
            >
              <option value="">Todas las Cadenas</option>
              {cadenasDisponibles.map(cadena => (
                <option key={cadena} value={cadena}>{cadena}</option>
              ))}
            </select>
          </div>
        </div>

        {/* LISTADO */}
        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar bg-white">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {loading ? (
              <div className="col-span-full py-20 flex flex-col items-center opacity-40">
                <FiLoader className="animate-spin mb-2" size={30} />
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">Cargando datos...</p>
              </div>
            ) : filteredLocales.length === 0 ? (
              <div className="col-span-full py-16 text-center opacity-40">
                <FiMapPin size={32} className="mx-auto mb-2 text-gray-300" />
                <p className="italic text-sm font-bold uppercase tracking-tighter text-gray-500">No se encontraron locales</p>
              </div>
            ) : (
              filteredLocales.map(locale => {
                const isAssigned = assignedIds.includes(locale.id);
                return (
                  <button
                    key={locale.id}
                    onClick={() => toggleLocale(locale.id)}
                    className={`flex items-center gap-4 p-4 rounded-2xl border transition-all text-left group ${
                      isAssigned 
                      ? 'border-[#87be00] bg-[#87be00]/5 shadow-sm ring-1 ring-[#87be00]/20' 
                      : 'border-gray-100 hover:border-gray-300 bg-white hover:bg-gray-50'
                    }`}
                  >
                    {/* Icono de estado */}
                    <div className={`h-6 w-6 rounded-lg flex items-center justify-center shrink-0 border-2 transition-all ${
                      isAssigned ? 'bg-[#87be00] border-[#87be00] scale-110 shadow-md shadow-[#87be00]/20' : 'border-gray-200'
                    }`}>
                      {isAssigned ? <FiCheck className="text-white" size={14} /> : <div className="w-1 h-1 bg-gray-200 rounded-full" />}
                    </div>

                    <div className="overflow-hidden flex-1 min-w-0">
                      <p className={`text-[10px] font-black uppercase leading-none mb-1 tracking-wider truncate ${isAssigned ? 'text-[#87be00]' : 'text-gray-400'}`}>
                        {locale.cadena}
                      </p>
                      <p className="text-xs font-black text-gray-800 truncate italic leading-tight">
                        {locale.direccion}
                      </p>
                      <p className="text-[8px] font-bold text-gray-400 mt-1 uppercase truncate">ID: {locale.codigo_local || 'S/N'}</p>
                    </div>

                    {/* Indicador de acción rápida */}
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                      {isAssigned ? (
                        <FiMinusCircle className="text-red-400" size={18} />
                      ) : (
                        <FiCheck className="text-[#87be00]" size={18} />
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* FOOTER */}
        <div className="p-6 bg-gray-50 border-t border-gray-100 flex gap-4 shrink-0">
          <button 
            onClick={onClose}
            className="flex-1 py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest text-gray-400 hover:bg-white hover:text-gray-600 transition-all border border-transparent hover:border-gray-200 shadow-sm"
          >
            Cancelar
          </button>
          <button 
            onClick={handleSave}
            disabled={saving}
            className="flex-1 bg-black text-white py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-[#87be00] transition-all shadow-lg shadow-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? <FiLoader className="animate-spin" /> : <FiCheck size={16} />}
            Guardar Cobertura
          </button>
        </div>
      </div>
    </div>
  );
};

export default AssignLocalesModal;