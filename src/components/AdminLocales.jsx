import React, { useEffect, useRef, useState, useMemo, useCallback } from "react";
import { 
  FiPlus, FiUpload, FiTrash2, FiEdit, FiMapPin, 
  FiHash, FiEye, FiEyeOff, FiSearch, FiPhone, FiUser, FiBriefcase,
  FiShoppingCart // 🚩 Nuevo icono para Cadenas
} from "react-icons/fi"; 
import api from "../api/apiClient";
import toast from "react-hot-toast";

// Componentes
import CreateLocalModal from "../components/CreateLocalModal";
import UploadLocalesModal from "../components/UploadLocalesModal";
import EditLocalModal from "../components/EditLocalModal";
import LocalesMap from "../components/LocalesMap";
import { motion, AnimatePresence } from "framer-motion";

const AdminLocales = () => {
  const [locales, setLocales] = useState([]);
  const [companies, setCompanies] = useState([]); 
  const [chains, setChains] = useState([]); // 🚩 Estado para la lista de cadenas únicas
  const [showInactive, setShowInactive] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedChain, setSelectedChain] = useState(""); // 🚩 Estado para el filtro de cadena
  
  const [openCreate, setOpenCreate] = useState(false);
  const [openUpload, setOpenUpload] = useState(false);
  const [openEdit, setOpenEdit] = useState(false);
  const [selectedLocal, setSelectedLocal] = useState(null);
  const [mapSelectedId, setMapSelectedId] = useState(null);

  const user = JSON.parse(localStorage.getItem("user"));
  const [selectedCompanyId, setSelectedCompanyId] = useState(user.company_id);

  const fetchCompanies = async () => {
    try {
      const data = await api.get("/companies");
      setCompanies(data || []);
    } catch (error) {
      console.error("Error cargando empresas");
    }
  };

  const fetchLocales = useCallback(async () => {
    try {
      const data = await api.get(`/locales?company_id=${selectedCompanyId}`);
      setLocales(data || []);
      
      // 🚩 Extraer cadenas únicas de los locales cargados para el selector
      if (data) {
        const uniqueChains = [...new Set(data.map(l => l.cadena))].filter(Boolean).sort();
        setChains(uniqueChains);
      }
    } catch (error) {
      toast.error("Error al cargar locales");
    }
  }, [selectedCompanyId]);

  useEffect(() => {
    if (user.role === "ROOT") fetchCompanies();
    fetchLocales();
  }, [fetchLocales, user.role]);

  // 3. Lógica de filtrado (🚩 Ahora incluye Cadena)
  const filteredLocales = useMemo(() => {
    return locales.filter(l => {
      const matchesActive = showInactive || l.is_active;
      const term = searchTerm.toLowerCase().trim();
      
      // 🚩 Filtro por Cadena Seleccionada
      const matchesChain = selectedChain === "" || l.cadena === selectedChain;

      const matchesSearch = 
        l.cadena?.toLowerCase().includes(term) ||
        l.codigo_local?.toString().includes(term) || 
        l.comuna?.toLowerCase().includes(term) ||
        l.direccion?.toLowerCase().includes(term);

      return matchesActive && matchesSearch && matchesChain;
    });
  }, [locales, showInactive, searchTerm, selectedChain]);

  const handleEdit = (local) => {
    setSelectedLocal(local);
    setOpenEdit(true);
  };

  const toggleLocal = async (id) => {
    try {
      await api.patch(`/locales/${id}/toggle`);
      setLocales(prev => prev.map(l => 
        l.id === id ? { ...l, is_active: !l.is_active } : l
      ));
      toast.success("Estado actualizado");
    } catch (error) {
      toast.error("Error al cambiar estado");
    }
  };

  const deleteLocal = async (id) => {
    if (!window.confirm("¿Estás seguro de eliminar este local?")) return;
    try {
      await api.delete(`/locales/${id}`);
      setLocales(prev => prev.filter(l => l.id !== id));
      toast.success("Local eliminado");
    } catch (error) {
      toast.error("No se pudo eliminar");
    }
  };

  const activeSelectedLocal = useMemo(() => {
    return filteredLocales.find(l => l.id === mapSelectedId);
  }, [mapSelectedId, filteredLocales]);

  return (
    <div className="space-y-6 animate-in fade-in duration-500 font-[Outfit] pb-10 px-2 sm:px-4 md:px-0">
      
      {/* HEADER */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 px-1">
        <div>
          <h2 className="text-3xl md:text-4xl font-black text-gray-900 tracking-tighter uppercase leading-none italic">
            Gestión de Locales
          </h2>
          <p className="text-[10px] md:text-xs font-black text-[#87be00] uppercase tracking-[0.3em] mt-3">
            Administración de puntos y geocercas
          </p>
        </div>

        <div className="flex flex-wrap gap-2 md:gap-3 w-full lg:w-auto">
          <button onClick={() => setOpenUpload(true)} className="flex-1 lg:flex-none flex items-center justify-center gap-2 bg-white border border-gray-200 hover:bg-gray-50 px-6 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition shadow-sm">
            <FiUpload size={16} className="text-gray-400" />
            Carga Masiva
          </button>
          <button onClick={() => setOpenCreate(true)} className="flex-1 lg:flex-none flex items-center justify-center gap-2 bg-[#87be00] text-white px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-[#76a500] transition shadow-xl shadow-[#87be00]/20 active:scale-95">
            <FiPlus size={18} />
            Crear Local
          </button>
        </div>
      </div>

      {/* FILTROS Y SELECTORES */}
      <div className="bg-white p-5 md:p-8 rounded-[2.5rem] border border-gray-100 shadow-sm space-y-6">
        <div className="flex flex-col xl:flex-row gap-4">
          
          {/* SELECTOR DE EMPRESA (Solo ROOT) */}
          {user.role === "ROOT" && (
            <div className="relative min-w-[200px]">
              <FiBriefcase className="absolute left-4 top-1/2 -translate-y-1/2 text-[#87be00] z-10" />
              <select
                value={selectedCompanyId}
                onChange={(e) => setSelectedCompanyId(e.target.value)}
                className="w-full bg-gray-50 border-none rounded-xl pl-11 pr-4 py-3.5 text-xs font-black uppercase tracking-wider outline-none focus:ring-2 focus:ring-[#87be00]/20 transition shadow-inner appearance-none cursor-pointer"
              >
                {companies.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          )}

          {/* 🚩 NUEVO: SELECTOR DE CADENAS */}
          <div className="relative min-w-[200px]">
            <FiShoppingCart className="absolute left-4 top-1/2 -translate-y-1/2 text-[#87be00] z-10" />
            <select
              value={selectedChain}
              onChange={(e) => setSelectedChain(e.target.value)}
              className="w-full bg-gray-50 border-none rounded-xl pl-11 pr-4 py-3.5 text-xs font-black uppercase tracking-wider outline-none focus:ring-2 focus:ring-[#87be00]/20 transition shadow-inner appearance-none cursor-pointer"
            >
              <option value="">TODAS LAS CADENAS</option>
              {chains.map(chain => (
                <option key={chain} value={chain}>{chain.toUpperCase()}</option>
              ))}
            </select>
          </div>

          {/* BUSCADOR */}
          <div className="relative flex-1">
            <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
            <input 
              type="text"
              placeholder="Buscar por código (#) o nombre..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-gray-50 border-none rounded-xl pl-11 pr-4 py-3.5 text-xs font-bold outline-none focus:ring-2 focus:ring-[#87be00]/20 transition shadow-inner"
            />
          </div>

          <button 
            onClick={() => setShowInactive(!showInactive)}
            className={`flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl text-[10px] font-black tracking-widest transition-all ${
              showInactive ? "bg-orange-50 text-orange-600 border border-orange-100" : "bg-gray-50 text-gray-400 border border-gray-100"
            }`}
          >
            {showInactive ? <FiEye size={14}/> : <FiEyeOff size={14}/>}
            {showInactive ? "MOSTRANDO INACTIVOS" : "OCULTAR INACTIVOS"}
          </button>
        </div>

        {/* MAPA */}
        <div className="h-[350px] md:h-[450px] w-full rounded-[2.5rem] overflow-hidden border border-gray-100 shadow-inner bg-gray-50 relative">
           <LocalesMap locales={filteredLocales} selectedLocal={activeSelectedLocal} />
        </div>
      </div>

      {/* TABLA DESKTOP */}
      <div className="hidden md:block bg-white rounded-[3rem] shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-100">
                <th className="p-8 text-left font-black text-gray-400 uppercase text-[9px] tracking-[0.2em]">Local / Cadena</th>
                <th className="p-8 text-left font-black text-gray-400 uppercase text-[9px] tracking-[0.2em]">Ubicación</th>
                <th className="p-8 text-left font-black text-gray-400 uppercase text-[9px] tracking-[0.2em]">Dirección</th>
                <th className="p-8 text-left font-black text-gray-400 uppercase text-[9px] tracking-[0.2em]">Contacto</th>
                <th className="p-8 text-center font-black text-gray-400 uppercase text-[9px] tracking-[0.2em]">Estado</th>
                <th className="p-8 text-right font-black text-gray-400 uppercase text-[9px] tracking-[0.2em]">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredLocales.length === 0 ? (
                <tr><td colSpan="6" className="p-24 text-center font-black italic text-gray-300 uppercase text-xs tracking-widest">No se encontraron locales con estos filtros</td></tr>
              ) : (
                filteredLocales.map(local => (
                  <tr 
                    key={local.id} 
                    className={`group hover:bg-gray-50/80 transition-all cursor-pointer ${mapSelectedId === local.id ? 'bg-[#87be00]/5' : ''} ${!local.is_active ? 'opacity-50 grayscale' : ''}`}
                    onClick={() => setMapSelectedId(local.id)}
                  >
                    <td className="p-8">
                      <div className="flex items-center gap-4">
                        <div className="bg-gray-900 text-[#87be00] w-12 h-12 rounded-2xl flex flex-col items-center justify-center shadow-lg shadow-gray-200">
                          <span className="text-[7px] font-black leading-none opacity-50 mb-0.5">ID</span>
                          <span className="text-[11px] font-black leading-none">{local.codigo_local || '—'}</span>
                        </div>
                        <div>
                          <p className="font-black text-gray-900 uppercase tracking-tighter italic text-base leading-none">{local.cadena}</p>
                          <p className="text-[10px] font-bold text-gray-400 mt-1 uppercase">Punto de Venta</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-8">
                      <div className="flex flex-col">
                        <span className="text-xs font-black text-gray-800 uppercase italic leading-none">{local.comuna_name || local.comuna}</span>
                        <span className="text-[9px] font-black text-[#87be00] uppercase tracking-widest mt-1.5">{local.region_name || local.region}</span>
                      </div>
                    </td>
                    <td className="p-8 text-[11px] text-gray-500 font-bold max-w-[200px]">
                      <div className="flex items-center gap-2"><FiMapPin size={12} className="text-[#87be00] shrink-0" /> {local.direccion}</div>
                    </td>
                    <td className="p-8">
                      <div className="flex flex-col">
                        <span className="text-[11px] font-black text-gray-800 uppercase leading-none mb-1.5 italic">{local.gerente || 'S/G'}</span>
                        <span className="text-[10px] text-gray-400 font-bold flex items-center gap-1.5"><FiPhone size={10}/> {local.telefono || '---'}</span>
                      </div>
                    </td>
                    <td className="p-8 text-center" onClick={(e) => e.stopPropagation()}>
                      <button onClick={() => toggleLocal(local.id)} className={`relative inline-flex h-6 w-12 items-center rounded-full transition-all shadow-inner ${local.is_active ? "bg-[#87be00]" : "bg-gray-200"}`}>
                        <span className={`h-4 w-4 transform rounded-full bg-white shadow-md transition-transform ${local.is_active ? "translate-x-7" : "translate-x-1"}`} />
                      </button>
                    </td>
                    <td className="p-8 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0">
                        <button onClick={() => handleEdit(local)} className="p-3 bg-gray-50 text-gray-400 hover:text-gray-900 rounded-xl transition shadow-sm border border-gray-100"><FiEdit size={16} /></button>
                        <button onClick={() => deleteLocal(local.id)} className="p-3 bg-gray-50 text-gray-400 hover:text-red-500 rounded-xl transition shadow-sm border border-gray-100"><FiTrash2 size={16} /></button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* VISTA MÓVIL */}
      <div className="md:hidden space-y-4 px-1">
        {filteredLocales.map((local, idx) => (
          <motion.div 
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.03 }}
            key={local.id}
            onClick={() => setMapSelectedId(local.id)}
            className={`bg-white p-5 rounded-[2rem] border-2 transition-all relative overflow-hidden ${mapSelectedId === local.id ? 'border-[#87be00] shadow-md' : 'border-transparent shadow-sm'}`}
          >
            <div className="flex items-center gap-4 mb-4">
              <div className="bg-gray-900 text-[#87be00] w-12 h-12 rounded-2xl flex flex-col items-center justify-center shrink-0">
                <span className="text-[6px] font-black leading-none opacity-50 mb-0.5 uppercase">ID</span>
                <span className="text-[12px] font-black leading-none">{local.codigo_local || '—'}</span>
              </div>
              <div className="min-w-0">
                 <h3 className="text-sm font-black text-gray-900 uppercase italic truncate">{local.cadena}</h3>
                 <p className="text-[9px] font-black text-[#87be00] uppercase tracking-widest">{local.comuna}</p>
              </div>
            </div>
            
            <div className="bg-gray-50 p-4 rounded-2xl space-y-2 mb-4">
               <div className="flex items-center gap-2 text-[10px] font-bold text-gray-500 italic">
                  <FiMapPin className="text-[#87be00] shrink-0"/> {local.direccion}
               </div>
            </div>

            <div className="flex justify-between items-center" onClick={(e) => e.stopPropagation()}>
               <div className="flex gap-2">
                 <button onClick={() => handleEdit(local)} className="p-3 bg-gray-50 text-gray-400 rounded-xl border border-gray-100"><FiEdit size={16}/></button>
                 <button onClick={() => deleteLocal(local.id)} className="p-3 bg-red-50 text-red-400 rounded-xl border border-red-50"><FiTrash2 size={16}/></button>
               </div>
               <button onClick={() => toggleLocal(local.id)} className={`relative inline-flex h-6 w-11 items-center rounded-full transition-all ${local.is_active ? "bg-[#87be00]" : "bg-gray-200"}`}>
                  <span className={`h-4 w-4 transform rounded-full bg-white transition-transform ${local.is_active ? "translate-x-6" : "translate-x-1"}`} />
               </button>
            </div>
          </motion.div>
        ))}
      </div>

      <CreateLocalModal isOpen={openCreate} onClose={() => setOpenCreate(false)} onCreated={fetchLocales} autoCompanyId={selectedCompanyId} />
      <UploadLocalesModal isOpen={openUpload} onClose={() => setOpenUpload(false)} onUploaded={fetchLocales} companyId={selectedCompanyId} />
      {selectedLocal && (
        <EditLocalModal isOpen={openEdit} onClose={() => { setOpenEdit(false); setSelectedLocal(null); }} onUpdated={fetchLocales} local={selectedLocal} />
      )}
    </div>
  );
};

export default AdminLocales;