import React, { useState, useEffect } from "react";
import { 
  FiX, FiHash, FiUser, FiPhone, FiMapPin, 
  FiLoader, FiBriefcase, FiShoppingCart, FiGlobe 
} from "react-icons/fi";
import api from "../../api/apiClient";
import toast from "react-hot-toast";

const EditLocalModal = ({
  isOpen,
  onClose,
  onUpdated,
  local,
  companies = []
}) => {
  const [regions, setRegions] = useState([]);
  const [comunas, setComunas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    company_id: "",
    codigo_local: "",
    cadena: "",
    region_id: "",
    comuna_id: "",
    direccion: "",
    gerente: "",
    telefono: ""
  });

  useEffect(() => {
    const loadRegions = async () => {
      try {
        const data = await api.get("/regions"); 
        setRegions(data);
      } catch (err) { console.error("Error cargando regiones:", err); }
    };
    if (isOpen) loadRegions();
  }, [isOpen]);

  useEffect(() => {
    if (!form.region_id) {
      setComunas([]);
      return;
    }
    const loadComunas = async () => {
      try {
        const data = await api.get(`/comunas?region_id=${form.region_id}`);
        setComunas(data);
      } catch (err) { console.error("Error cargando comunas:", err); }
    };
    loadComunas();
  }, [form.region_id]);

  useEffect(() => {
    if (local && isOpen) {
      setForm({
        company_id: local.company_id || "",
        codigo_local: local.codigo_local || "",
        cadena: local.cadena || "",
        region_id: local.region_id || "",
        comuna_id: local.comuna_id || "",
        direccion: local.direccion || "",
        gerente: local.gerente || "",
        telefono: local.telefono || ""
      });
    }
  }, [local, isOpen]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      await api.put(`/locales/${local.id}`, form);
      toast.success("Local actualizado correctamente");
      onUpdated();
      onClose();
    } catch (err) {
      const msg = err.response?.data?.message || "Error al actualizar";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-end sm:items-center justify-center z-[9999] p-0 sm:p-4 font-[Outfit]">
      {/* CONTENEDOR PRINCIPAL ESTILO CULTIVAPP */}
      <div className="bg-white w-full max-w-lg h-[95vh] sm:h-auto sm:max-h-[90vh] flex flex-col rounded-t-[2.5rem] sm:rounded-[3rem] shadow-2xl border border-gray-100 animate-in slide-in-from-bottom sm:zoom-in duration-300 overflow-hidden">
        
        {/* HEADER */}
        <div className="flex justify-between items-center border-b border-gray-100 px-6 py-5 sm:px-8 sm:py-6 bg-white shrink-0">
          <div>
            <h3 className="text-xl sm:text-2xl font-black text-gray-900 uppercase italic tracking-tight leading-none">
              Editar <span className="text-[#87be00]">Local</span>
            </h3>
            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mt-1.5 flex items-center gap-1">
              <FiHash /> REF: {local.id.split('-')[0]}...
            </p>
          </div>
          <button 
            onClick={onClose} 
            className="p-2.5 sm:p-3 bg-gray-50 text-gray-400 hover:bg-gray-100 hover:text-red-500 rounded-xl transition-all"
          >
            <FiX size={18} />
          </button>
        </div>

        {/* CONTENIDO SCROLLABLE */}
        <div className="overflow-y-auto px-6 py-5 sm:px-8 sm:py-6 custom-scrollbar flex-1 bg-white">
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="bg-red-50 text-red-600 text-[10px] font-black uppercase p-3.5 rounded-2xl border border-red-200 shadow-sm flex items-center gap-2 tracking-widest animate-pulse">
                <FiX size={14} className="shrink-0" /> {error}
              </div>
            )}

            {/* FILA: EMPRESA Y CÓDIGO DEL LOCAL */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2 pl-1">
                  <FiBriefcase className="text-[#87be00]" size={12} /> Empresa / Cliente
                </label>
                <select 
                  name="company_id" 
                  value={form.company_id} 
                  onChange={handleChange} 
                  required 
                  className="w-full px-4 py-3.5 bg-gray-50 border-2 border-transparent rounded-2xl text-[11px] font-bold uppercase tracking-wide outline-none focus:bg-white focus:border-[#87be00]/20 transition-all shadow-inner text-gray-800 cursor-pointer h-12"
                >
                  <option value="">Seleccionar Empresa</option>
                  {companies.map(c => (
                    <option key={c.id} value={c.id}>{c.name?.toUpperCase()}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2 pl-1">
                  <FiHash className="text-[#87be00]" size={12} /> Código del Local
                </label>
                <input 
                  type="text" 
                  name="codigo_local" 
                  value={form.codigo_local} 
                  onChange={handleChange} 
                  required
                  className="w-full px-4 py-3.5 bg-gray-50 border-2 border-transparent rounded-2xl text-[11px] font-black outline-none focus:bg-white focus:border-[#87be00]/20 transition-all shadow-inner h-12 uppercase tracking-wider" 
                />
              </div>
            </div>

            {/* FILA: CADENA Y REGIÓN */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2 pl-1">
                  <FiShoppingCart className="text-[#87be00]" size={12} /> Cadena
                </label>
                <input 
                  type="text" 
                  name="cadena" 
                  value={form.cadena} 
                  onChange={handleChange} 
                  required 
                  className="w-full px-4 py-3.5 bg-gray-50 border-2 border-transparent rounded-2xl text-[11px] font-black outline-none focus:bg-white focus:border-[#87be00]/20 transition-all shadow-inner h-12 uppercase tracking-wide" 
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2 pl-1">
                  <FiGlobe className="text-[#87be00]" size={12} /> Región
                </label>
                <select 
                  name="region_id" 
                  value={form.region_id} 
                  onChange={handleChange} 
                  required 
                  className="w-full px-4 py-3.5 bg-gray-50 border-2 border-transparent rounded-2xl text-[11px] font-bold uppercase tracking-wide outline-none focus:bg-white focus:border-[#87be00]/20 transition-all shadow-inner text-gray-800 cursor-pointer h-12"
                >
                  <option value="">Seleccionar</option>
                  {regions.map(r => <option key={r.id} value={r.id}>{r.name?.toUpperCase()}</option>)}
                </select>
              </div>
            </div>

            {/* FILA: COMUNA Y TELÉFONO */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2 pl-1">
                  <FiMapPin className="text-[#87be00]" size={12} /> Comuna
                </label>
                <select 
                  name="comuna_id" 
                  value={form.comuna_id} 
                  onChange={handleChange} 
                  required 
                  className="w-full px-4 py-3.5 bg-gray-50 border-2 border-transparent rounded-2xl text-[11px] font-bold uppercase tracking-wide outline-none focus:bg-white focus:border-[#87be00]/20 transition-all shadow-inner text-gray-800 cursor-pointer h-12"
                >
                  <option value="">Seleccionar</option>
                  {comunas.map(c => <option key={c.id} value={c.id}>{c.name?.toUpperCase()}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2 pl-1">
                  <FiPhone className="text-[#87be00]" size={12} /> Teléfono
                </label>
                <input 
                  type="text" 
                  name="telefono" 
                  value={form.telefono} 
                  onChange={handleChange} 
                  className="w-full px-4 py-3.5 bg-gray-50 border-2 border-transparent rounded-2xl text-[11px] font-bold outline-none focus:bg-white focus:border-[#87be00]/20 transition-all shadow-inner h-12 tracking-wider" 
                />
              </div>
            </div>

            {/* DIRECCIÓN */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2 pl-1">
                <FiMapPin className="text-[#87be00]" size={12} /> Dirección Completa
              </label>
              <input 
                type="text" 
                name="direccion" 
                value={form.direccion} 
                onChange={handleChange} 
                required 
                className="w-full px-4 py-3.5 bg-gray-50 border-2 border-transparent rounded-2xl text-[11px] font-bold outline-none focus:bg-white focus:border-[#87be00]/20 transition-all shadow-inner h-12 uppercase" 
              />
            </div>

            {/* GERENTE */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2 pl-1">
                <FiUser className="text-[#87be00]" size={12} /> Gerente / Administrador
              </label>
              <input 
                type="text" 
                name="gerente" 
                value={form.gerente} 
                onChange={handleChange} 
                className="w-full px-4 py-3.5 bg-gray-50 border-2 border-transparent rounded-2xl text-[11px] font-bold outline-none focus:bg-white focus:border-[#87be00]/20 transition-all shadow-inner h-12 uppercase" 
              />
            </div>

            {/* BOTÓN DE IMPLEMENTACIÓN */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gray-900 hover:bg-black text-white py-4 rounded-[1.5rem] font-black text-[11px] uppercase tracking-[0.2em] shadow-xl hover:scale-[1.01] transition-all flex items-center justify-center gap-3 mt-6 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <FiLoader className="animate-spin" size={16} /> Procesando Cambios...
                </>
              ) : (
                "Actualizar Local"
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default EditLocalModal;