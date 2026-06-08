import React, { useState, useEffect } from "react";
import { FiX, FiHash, FiUser, FiPhone, FiMapPin, FiLoader, FiBriefcase } from "react-icons/fi";
import api from "../../api/apiClient";
import toast from "react-hot-toast";

const EditLocalModal = ({
  isOpen,
  onClose,
  onUpdated,
  local
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
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[9999] p-4 font-[Outfit]">
      {/* 🔴 Contenedor responsivo: max-w-lg y max-h-[90vh] con scroll interno */}
      <div className="bg-white w-full max-w-lg max-h-[90vh] flex flex-col rounded-[2rem] md:rounded-[2.5rem] shadow-2xl animate-in zoom-in duration-300">
        
        {/* HEADER */}
        <div className="flex justify-between items-center border-b border-gray-100 p-6 md:p-8 shrink-0">
          <div>
            <h3 className="text-lg md:text-xl font-black text-gray-800 uppercase tracking-tight">Editar Local</h3>
            <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-1">ID: {local.id.split('-')[0]}...</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-400">
            <FiX size={20} />
          </button>
        </div>

        {/* CONTENIDO SCROLLABLE */}
        <div className="overflow-y-auto p-6 md:p-8 custom-scrollbar flex-1">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-red-50 text-red-500 text-[9px] font-black uppercase p-3 rounded-xl border border-red-100 flex items-center gap-2">
                <FiX size={14} /> {error}
              </div>
            )}

            {/* CÓDIGO */}
            <div className="space-y-1">
              <label className="text-[9px] font-black uppercase text-gray-400 ml-2">Código del Local</label>
              <input type="text" name="codigo_local" value={form.codigo_local} onChange={handleChange} className="w-full bg-gray-50 border-none rounded-xl px-4 py-3 text-xs font-bold outline-none focus:ring-2 focus:ring-[#87be00] transition-all" />
            </div>

            {/* CADENA (Grid responsivo: 1 col móvil, 2 col tablets) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
               <div className="space-y-1">
                <label className="text-[9px] font-black uppercase text-gray-400 ml-2">Cadena</label>
                <input type="text" name="cadena" value={form.cadena} onChange={handleChange} required className="w-full bg-gray-50 border-none rounded-xl px-4 py-3 text-xs outline-none focus:ring-2 focus:ring-[#87be00] font-bold" />
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-black uppercase text-gray-400 ml-2">Región</label>
                <select name="region_id" value={form.region_id} onChange={handleChange} required className="w-full bg-gray-50 border-none rounded-xl px-4 py-3 text-xs outline-none focus:ring-2 focus:ring-[#87be00]">
                  <option value="">Seleccionar</option>
                  {regions.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[9px] font-black uppercase text-gray-400 ml-2">Comuna</label>
                <select name="comuna_id" value={form.comuna_id} onChange={handleChange} required className="w-full bg-gray-50 border-none rounded-xl px-4 py-3 text-xs outline-none focus:ring-2 focus:ring-[#87be00]">
                  <option value="">Seleccionar</option>
                  {comunas.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-black uppercase text-gray-400 ml-2">Teléfono</label>
                <input type="text" name="telefono" value={form.telefono} onChange={handleChange} className="w-full bg-gray-50 border-none rounded-xl px-4 py-3 text-xs outline-none focus:ring-2 focus:ring-[#87be00]" />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[9px] font-black uppercase text-gray-400 ml-2">Dirección</label>
              <input type="text" name="direccion" value={form.direccion} onChange={handleChange} required className="w-full bg-gray-50 border-none rounded-xl px-4 py-3 text-xs outline-none focus:ring-2 focus:ring-[#87be00]" />
            </div>

            <div className="space-y-1">
              <label className="text-[9px] font-black uppercase text-gray-400 ml-2">Gerente</label>
              <input type="text" name="gerente" value={form.gerente} onChange={handleChange} className="w-full bg-gray-50 border-none rounded-xl px-4 py-3 text-xs outline-none focus:ring-2 focus:ring-[#87be00]" />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-black text-white py-4 rounded-xl font-black text-[10px] uppercase tracking-[0.2em] hover:bg-[#87be00] transition-all shadow-lg mt-4 disabled:opacity-50"
            >
              {loading ? <span className="flex items-center justify-center gap-2"><FiLoader className="animate-spin"/> Procesando...</span> : "Actualizar Local"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default EditLocalModal;