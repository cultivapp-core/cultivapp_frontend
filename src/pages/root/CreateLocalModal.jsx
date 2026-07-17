import { useState, useEffect } from "react";
import { FiX, FiMapPin, FiHash, FiCheckCircle, FiLoader } from "react-icons/fi";
import api from "../../api/apiClient";
import toast from "react-hot-toast";

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;

const CreateLocalModal = ({
  isOpen,
  onClose,
  onCreated,
  companies = [],
  autoCompany = null
}) => {
  const [regions, setRegions] = useState([]);
  const [comunas, setComunas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [geoLoading, setGeoLoading] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    company_id: autoCompany || "",
    codigo_local: "", // 🚩 Nuevo campo
    cadena: "",
    region_id: "",
    comuna_id: "",
    direccion: "",
    gerente: "",
    telefono: "",
    lat: "",
    lng: ""
  });

  // Limpiar formulario al abrir
  useEffect(() => {
    if (isOpen) {
      setForm(prev => ({
        ...prev,
        company_id: autoCompany || "",
        codigo_local: "",
        cadena: "",
        direccion: "",
        lat: "",
        lng: ""
      }));
      setError("");
    }
  }, [isOpen, autoCompany]);

  /* =========================
     CARGAR REGIONES
  ========================= */
  useEffect(() => {
    const loadRegions = async () => {
      try {
        const data = await api.get("/regions");
        setRegions(data);
      } catch (err) {
        console.error("Error cargando regiones");
      }
    };
    loadRegions();
  }, []);

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
        console.error("Error cargando comunas");
      }
    };
    loadComunas();
  }, [form.region_id]);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  /* =========================
     GEOCODING MAPBOX
  ========================= */
  const geocodeAddress = async () => {
    if (!form.direccion || !form.comuna_id || !form.region_id) {
      setError("Completa dirección, región y comuna para ubicar en el mapa");
      return;
    }

    try {
      setGeoLoading(true);
      setError("");
      const comuna = comunas.find(c => c.id === form.comuna_id)?.name;
      const region = regions.find(r => r.id === form.region_id)?.name;
      const address = `${form.direccion}, ${comuna}, ${region}, Chile`;

      const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(address)}.json?access_token=${MAPBOX_TOKEN}&limit=1&country=CL`;

      const res = await fetch(url);
      const data = await res.json();

      if (!data.features || data.features.length === 0) {
        setError("No encontramos esa dirección exacta. Verifica o ingresa coordenadas manuales.");
        return;
      }

      const [lng, lat] = data.features[0].center;
      setForm(prev => ({ ...prev, lat, lng }));
      toast.success("Ubicación encontrada");
    } catch (err) {
      setError("Error en el servicio de mapas");
    } finally {
      setGeoLoading(false);
    }
  };

  /* =========================
     SUBMIT
  ========================= */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const payload = {
        ...form,
        lat: form.lat ? Number(form.lat) : null,
        lng: form.lng ? Number(form.lng) : null
      };

      await api.post("/locales", payload);
      toast.success("Local creado con éxito");
      onCreated();
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 font-[Outfit]">
      <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl p-8 space-y-6 animate-in zoom-in duration-300 max-h-[90vh] overflow-y-auto scrollbar-hide">
        
        <div className="flex justify-between items-center border-b pb-4">
          <div>
            <h3 className="text-xl font-black text-gray-800 uppercase tracking-tight">Crear Nuevo Local</h3>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Registro de punto de venta</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <FiX size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-50 text-red-500 text-[10px] font-black uppercase p-3 rounded-xl border border-red-100">
              {error}
            </div>
          )}

          {/* CÓDIGO DEL LOCAL */}
          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase text-gray-400 ml-2 flex items-center gap-1">
              <FiHash size={10}/> Código Interno
            </label>
            <input
              type="text"
              name="codigo_local"
              placeholder="Ej: SUC-102"
              value={form.codigo_local}
              onChange={handleChange}
              required
              className="w-full border-gray-100 bg-gray-50 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-[#87be00] outline-none transition-all font-bold"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
             <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-gray-400 ml-2">Cadena</label>
                <input
                  type="text"
                  name="cadena"
                  placeholder="Ej: ALVI"
                  value={form.cadena}
                  onChange={handleChange}
                  required
                  className="w-full border-gray-100 bg-gray-50 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[#87be00]"
                />
             </div>

             <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-gray-400 ml-2">Empresa</label>
                <select
                  name="company_id"
                  value={form.company_id}
                  onChange={handleChange}
                  disabled={!!autoCompany}
                  required
                  className="w-full border-gray-100 bg-gray-50 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[#87be00] disabled:opacity-50"
                >
                  <option value="">Seleccionar</option>
                  {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
             </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <select
              name="region_id"
              value={form.region_id}
              onChange={handleChange}
              required
              className="w-full border-gray-100 bg-gray-50 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-[#87be00] outline-none"
            >
              <option value="">Región</option>
              {regions.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>

            <select
              name="comuna_id"
              value={form.comuna_id}
              onChange={handleChange}
              required
              className="w-full border-gray-100 bg-gray-50 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-[#87be00] outline-none"
            >
              <option value="">Comuna</option>
              {comunas.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          <div className="relative">
            <input
              type="text"
              name="direccion"
              placeholder="Dirección exacta"
              value={form.direccion}
              onChange={handleChange}
              required
              className="w-full border-gray-100 bg-gray-50 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[#87be00]"
            />
            <button
              type="button"
              onClick={geocodeAddress}
              disabled={geoLoading}
              className="mt-2 w-full flex items-center justify-center gap-2 text-[9px] font-black uppercase tracking-widest bg-gray-100 py-3 rounded-xl hover:bg-gray-200 transition-colors text-gray-600"
            >
              {geoLoading ? <FiLoader className="animate-spin" size={14}/> : <FiMapPin size={14}/>}
              {geoLoading ? "Geocodificando..." : "Sugerir coordenadas por GPS"}
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <input
              type="number"
              step="any"
              name="lat"
              placeholder="Latitud"
              value={form.lat}
              onChange={handleChange}
              className="w-full border-gray-100 bg-gray-50 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[#87be00]"
            />
            <input
              type="number"
              step="any"
              name="lng"
              placeholder="Longitud"
              value={form.lng}
              onChange={handleChange}
              className="w-full border-gray-100 bg-gray-50 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[#87be00]"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <input
              type="text"
              name="gerente"
              placeholder="Gerente / Jefe"
              value={form.gerente}
              onChange={handleChange}
              className="w-full border-gray-100 bg-gray-50 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[#87be00]"
            />
            <input
              type="text"
              name="telefono"
              placeholder="Teléfono"
              value={form.telefono}
              onChange={handleChange}
              className="w-full border-gray-100 bg-gray-50 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[#87be00]"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-black text-white py-4 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] hover:bg-[#87be00] transition-all shadow-lg shadow-gray-200"
          >
            {loading ? "Creando Punto de Venta..." : "Guardar Local"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default CreateLocalModal;