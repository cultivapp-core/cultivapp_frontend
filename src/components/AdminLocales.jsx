import React, { useEffect, useState, useMemo, useCallback } from "react";
import { 
  FiPlus, FiUpload, FiTrash2, FiEdit, FiMapPin, 
  FiSearch, FiShoppingCart, FiGlobe 
} from "react-icons/fi"; 
import api from "../api/apiClient";
import toast from "react-hot-toast";
import CreateLocalModal from "../components/CreateLocalModal";
import UploadLocalesModal from "../components/UploadLocalesModal";
import EditLocalModal from "../components/EditLocalModal";
import LocalesMap from "../components/LocalesMap";
import { motion } from "framer-motion";

const AdminLocales = () => {
  const [locales, setLocales] = useState([]);
  const [chains, setChains] = useState([]); 
  const [regions, setRegions] = useState([]); 
  const [comunas, setComunas] = useState([]); 
  
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedChain, setSelectedChain] = useState("");
  const [selectedRegion, setSelectedRegion] = useState(""); 
  const [selectedComuna, setSelectedComuna] = useState(""); 
  
  const [openCreate, setOpenCreate] = useState(false);
  const [openUpload, setOpenUpload] = useState(false);
  const [openEdit, setOpenEdit] = useState(false);
  const [selectedLocal, setSelectedLocal] = useState(null);

  const fetchLocales = useCallback(async () => {
    try {
      const data = await api.get(`/locales`);
      setLocales(data || []);
      
      if (data) {
        setChains([...new Set(data.map(l => l.cadena))].filter(Boolean).sort());
        setRegions([...new Set(data.map(l => l.region_name || l.region))].filter(Boolean).sort());
      }
    } catch (error) {
      toast.error("Error al cargar locales");
    }
  }, []);

  useEffect(() => {
    fetchLocales();
  }, [fetchLocales]);

  useEffect(() => {
    const filteredComunas = [...new Set(locales
      .filter(l => !selectedRegion || (l.region_name || l.region) === selectedRegion)
      .map(l => l.comuna_name || l.comuna))].filter(Boolean).sort();
    setComunas(filteredComunas);
    setSelectedComuna(""); 
  }, [selectedRegion, locales]);

  const filteredLocales = useMemo(() => {
    return locales.filter(l => {
      const term = searchTerm.toLowerCase().trim();
      const matchesChain = selectedChain === "" || l.cadena === selectedChain;
      const matchesRegion = selectedRegion === "" || (l.region_name || l.region) === selectedRegion;
      const matchesComuna = selectedComuna === "" || (l.comuna_name || l.comuna) === selectedComuna;

      const matchesSearch = 
        l.cadena?.toLowerCase().includes(term) ||
        l.codigo_local?.toString().includes(term) || 
        l.comuna?.toLowerCase().includes(term) ||
        l.direccion?.toLowerCase().includes(term);

      return matchesSearch && matchesChain && matchesRegion && matchesComuna;
    });
  }, [locales, searchTerm, selectedChain, selectedRegion, selectedComuna]);

  const handleEdit = (local) => {
    setSelectedLocal(local);
    setOpenEdit(true);
  };

  const toggleLocal = async (id) => {
    try {
      await api.patch(`/locales/${id}/toggle`);
      setLocales(prev => prev.map(l => l.id === id ? { ...l, is_active: !l.is_active } : l));
      toast.success("Estado actualizado");
    } catch (error) { toast.error("Error al cambiar estado"); }
  };

  const deleteLocal = async (id) => {
    if (!window.confirm("¿Estás seguro de eliminar este local?")) return;
    try {
      await api.delete(`/locales/${id}`);
      setLocales(prev => prev.filter(l => l.id !== id));
      toast.success("Local eliminado");
    } catch (error) { toast.error("No se pudo eliminar"); }
  };

  return (
    <div className="space-y-6 pb-10 px-2 sm:px-4 md:px-0 font-[Outfit]">
      {/* HEADER */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 px-1">
        <div>
          <h2 className="text-3xl md:text-4xl font-black text-gray-900 tracking-tighter uppercase leading-none italic">Gestión de Locales</h2>
          <p className="text-[10px] md:text-xs font-black text-[#87be00] uppercase tracking-[0.3em] mt-3">Administración de puntos y geocercas</p>
        </div>
        <div className="flex flex-wrap gap-2 md:gap-3 w-full lg:w-auto">
          <button onClick={() => setOpenUpload(true)} className="flex-1 lg:flex-none flex items-center justify-center gap-2 bg-white border border-gray-200 px-6 py-4 rounded-2xl text-[10px] font-black uppercase transition shadow-sm">
            <FiUpload size={16}/> Carga Masiva
          </button>
          <button onClick={() => setOpenCreate(true)} className="flex-1 lg:flex-none flex items-center justify-center gap-2 bg-[#87be00] text-white px-8 py-4 rounded-2xl text-[10px] font-black uppercase transition shadow-xl hover:bg-[#76a500]">
            <FiPlus size={18} /> Crear Local
          </button>
        </div>
      </div>

      {/* FILTROS Y MAPA */}
      <div className="bg-white p-5 md:p-8 rounded-[2.5rem] border border-gray-100 shadow-sm space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="relative"><FiGlobe className="absolute left-4 top-4 text-[#87be00]"/><select value={selectedRegion} onChange={(e) => setSelectedRegion(e.target.value)} className="w-full bg-gray-50 border-none rounded-xl pl-11 py-3.5 text-xs font-black uppercase outline-none appearance-none"><option value="">Todas las Regiones</option>{regions.map(r => <option key={r} value={r}>{r}</option>)}</select></div>
          <div className="relative"><FiMapPin className="absolute left-4 top-4 text-[#87be00]"/><select value={selectedComuna} onChange={(e) => setSelectedComuna(e.target.value)} className="w-full bg-gray-50 border-none rounded-xl pl-11 py-3.5 text-xs font-black uppercase outline-none appearance-none"><option value="">Todas las Comunas</option>{comunas.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
          <div className="relative"><FiShoppingCart className="absolute left-4 top-4 text-[#87be00]"/><select value={selectedChain} onChange={(e) => setSelectedChain(e.target.value)} className="w-full bg-gray-50 border-none rounded-xl pl-11 py-3.5 text-xs font-black uppercase outline-none appearance-none"><option value="">Todas las Cadenas</option>{chains.map(c => <option key={c} value={c}>{c.toUpperCase()}</option>)}</select></div>
          <div className="relative"><FiSearch className="absolute left-4 top-4 text-gray-400"/><input type="text" placeholder="Buscar..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full bg-gray-50 border-none rounded-xl pl-11 py-3.5 text-xs font-bold outline-none" /></div>
        </div>
        
        <div className="h-[400px] w-full rounded-[2.5rem] overflow-hidden border border-gray-100 shadow-inner">
           <LocalesMap locales={filteredLocales} />
        </div>
      </div>

      {/* TABLA DESKTOP */}
      <div className="hidden md:block bg-white rounded-[3rem] shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50/50 border-b border-gray-100"><th className="p-8 text-left font-black text-gray-400 uppercase text-[9px] tracking-[0.2em]">Local</th><th className="p-8 text-left font-black text-gray-400 uppercase text-[9px] tracking-[0.2em]">Ubicación</th><th className="p-8 text-left font-black text-gray-400 uppercase text-[9px] tracking-[0.2em]">Dirección</th><th className="p-8 text-center font-black text-gray-400 uppercase text-[9px] tracking-[0.2em]">Estado</th><th className="p-8 text-right font-black text-gray-400 uppercase text-[9px] tracking-[0.2em]">Acciones</th></tr>
          </thead>
          <tbody>
            {filteredLocales.map(l => (
              <tr key={l.id} className="border-b border-gray-50 hover:bg-gray-50">
                <td className="p-8 font-black">{l.cadena} (#{l.codigo_local})</td>
                <td className="p-8 font-bold">{l.comuna}</td>
                <td className="p-8 text-xs">{l.direccion}</td>
                <td className="p-8 text-center"><button onClick={() => toggleLocal(l.id)} className={`px-3 py-1 rounded-full text-[9px] font-black ${l.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{l.is_active ? 'ACTIVO' : 'INACTIVO'}</button></td>
                <td className="p-8 text-right flex justify-end gap-2"><button onClick={() => handleEdit(l)} className="p-2 bg-gray-100 rounded-lg"><FiEdit/></button><button onClick={() => deleteLocal(l.id)} className="p-2 bg-red-100 text-red-600 rounded-lg"><FiTrash2/></button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* VISTA MÓVIL/TABLET */}
      <div className="md:hidden space-y-4">
        {filteredLocales.map((l) => (
          <motion.div key={l.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100 flex flex-col gap-4">
            <div className="flex justify-between items-start">
              <div><h4 className="font-black text-gray-900 uppercase italic">{l.cadena}</h4><p className="text-[10px] font-bold text-gray-400">ID: {l.codigo_local}</p></div>
              <button onClick={() => toggleLocal(l.id)} className={`px-3 py-1 rounded-full text-[9px] font-black ${l.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{l.is_active ? 'ACTIVO' : 'INACTIVO'}</button>
            </div>
            <div className="space-y-1 text-xs text-gray-600"><p className="flex items-center gap-2"><FiMapPin className="text-[#87be00]"/> {l.comuna}</p><p className="font-bold truncate">{l.direccion}</p></div>
            <div className="flex justify-end gap-2 pt-2 border-t border-gray-50"><button onClick={() => handleEdit(l)} className="p-3 bg-gray-50 text-gray-600 rounded-xl"><FiEdit size={16}/></button><button onClick={() => deleteLocal(l.id)} className="p-3 bg-red-50 text-red-500 rounded-xl"><FiTrash2 size={16}/></button></div>
          </motion.div>
        ))}
      </div>

      <CreateLocalModal isOpen={openCreate} onClose={() => setOpenCreate(false)} onCreated={fetchLocales} />
      <UploadLocalesModal isOpen={openUpload} onClose={() => setOpenUpload(false)} onUploaded={fetchLocales} />
      {selectedLocal && <EditLocalModal isOpen={openEdit} onClose={() => { setOpenEdit(false); setSelectedLocal(null); }} onUpdated={fetchLocales} local={selectedLocal} />}
    </div>
  );
};

export default AdminLocales;