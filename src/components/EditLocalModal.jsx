import { useState, useEffect } from "react";
import { FiX, FiHash, FiUser, FiPhone, FiMapPin, FiBriefcase, FiLoader } from "react-icons/fi";
import api from "../api/apiClient";
import toast from "react-hot-toast";

const EditLocalModal = ({
  isOpen,
  onClose,
  onUpdated,
  companies = [],
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

  /* =========================
     CARGAR REGIONES
  ========================= */
  useEffect(() => {
    const loadRegions = async () => {
      try {
        const data = await api.get("/regions"); 
        setRegions(data);
      } catch (err) {
        console.error("Error cargando regiones:", err);
      }
    };
    if (isOpen) loadRegions();
  }, [isOpen]);

  /* =========================
     CARGAR COMUNAS
  ========================= */
  useEffect(() => {
    if (!form.region_id) {
      setComunas([]);
      return;
    }
    const loadComunas = async () => {
      try {
        const data = await api.get(`/comunas?region_id=${form.region_id}`);
        setComunas(data);
      } catch (err) {
        console.error("Error cargando comunas:", err);
      }
    };
    loadComunas();
  }, [form.region_id]);

  /* =========================
     SINCRONIZAR DATOS DEL LOCAL
  ========================= */
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

  /* =========================
     SUBMIT (UPDATE)
  ========================= */
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
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 font-[Outfit]">
      <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl p-8 space-y-6 animate-in zoom-in duration-300 overflow-y-auto max-h-[90vh] scrollbar-hide">
        
        {/* HEADER */}
        <div className="flex justify-between items-center border-b pb-4">
          <div>
            <h3 className="text-xl font-black text-gray-800 uppercase tracking-tight">
              Editar Local
            </h3>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">ID: {local.id.split('-')[0]}...</p>
          </div>
          <button 
            onClick={onClose} 
            className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-400 hover:text-gray-800"
          >
            <FiX size={22} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-50 text-red-500 text-[10px] font-black uppercase p-3 rounded-xl border border-red-100 animate-pulse">
              {error}
            </div>
          )}

          {/* CÓDIGO DEL LOCAL */}
          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase text-gray-400 ml-2 flex items-center gap-1">
              <FiHash size={10} className="text-[#87be00]" /> Código del Local
            </label>
            <input
              type="text"
              name="codigo_local"
              placeholder="Ej: ALVI-045"
              value={form.codigo_local}
              onChange={handleChange}
              className="w-full border-gray-100 bg-gray-50 rounded-xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-[#87be00] outline-none transition-all"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* EMPRESA */}
            {/* <div className="space-y-1">
              <label className="text-[10px] font-black uppercase text-gray-400 ml-2 flex items-center gap-1">
                <FiBriefcase size={10} /> Empresa
              </label>
              <select
                name="company_id"
                value={form.company_id}
                onChange={handleChange}
                required
                className="w-full border-gray-100 bg-gray-50 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[#87be00]"
              >
                <option value="">Seleccionar</option>
                {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>*/}

            {/* CADENA */}
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase text-gray-400 ml-2">Cadena</label>
              <input
                type="text"
                name="cadena"
                placeholder="Ej: ALVI"
                value={form.cadena}
                onChange={handleChange}
                required
                className="w-full border-gray-100 bg-gray-50 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[#87be00] font-bold"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 border-t pt-4">
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase text-gray-400 ml-2">Región</label>
              <select
                name="region_id"
                value={form.region_id}
                onChange={handleChange}
                required
                className="w-full border-gray-100 bg-gray-50 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[#87be00]"
              >
                <option value="">Región</option>
                {regions.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase text-gray-400 ml-2">Comuna</label>
              <select
                name="comuna_id"
                value={form.comuna_id}
                onChange={handleChange}
                required
                className="w-full border-gray-100 bg-gray-50 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[#87be00]"
              >
                <option value="">Comuna</option>
                {comunas.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase text-gray-400 ml-2 flex items-center gap-1">
              <FiMapPin size={10} /> Dirección
            </label>
            <input
              type="text"
              name="direccion"
              value={form.direccion}
              onChange={handleChange}
              required
              className="w-full border-gray-100 bg-gray-50 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[#87be00]"
            />
          </div>

          <div className="grid grid-cols-2 gap-4 border-t pt-4">
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase text-gray-400 ml-2 flex items-center gap-1">
                <FiUser size={10} /> Gerente
              </label>
              <input
                type="text"
                name="gerente"
                placeholder="Nombre gerente"
                value={form.gerente}
                onChange={handleChange}
                className="w-full border-gray-100 bg-gray-50 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[#87be00]"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase text-gray-400 ml-2 flex items-center gap-1">
                <FiPhone size={10} /> Teléfono
              </label>
              <input
                type="text"
                name="telefono"
                placeholder="Ej: +569..."
                value={form.telefono}
                onChange={handleChange}
                className="w-full border-gray-100 bg-gray-50 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[#87be00]"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-black text-white py-4 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] hover:bg-[#87be00] transition-all shadow-lg shadow-gray-200 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <FiLoader className="animate-spin" />
                Sincronizando...
              </>
            ) : (
              "Actualizar Local"
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default EditLocalModal;