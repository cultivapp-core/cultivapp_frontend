import { useState, useEffect } from "react";
import {
  FiX,
  FiMapPin,
  FiHash,
  FiLoader,
  FiBriefcase,
  FiMap,
  FiNavigation,
  FiUser,
  FiPhone,
  FiAlertCircle,
  FiCheckCircle
} from "react-icons/fi";
import api from "../../api/apiClient";
import toast from "react-hot-toast";

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;

const CULTIVA_COMPANY_ID =
  "0e342e01-d213-4353-b210-39a12ac335cf";

const CreateLocalModal = ({
  isOpen,
  onClose,
  onCreated,
  companies = [],
  autoCompany = null
}) => {
  const storedUser =
    localStorage.getItem("user");

  let userAdmin = null;

  try {
    userAdmin = storedUser
      ? JSON.parse(storedUser)
      : null;
  } catch {
    userAdmin = null;
  }

  const isRoot =
    userAdmin?.role === "ROOT";

  const isCultivaAdmin =
    userAdmin?.role === "ADMIN_CLIENTE" &&
    userAdmin?.company_id ===
      CULTIVA_COMPANY_ID;

  /*
   * Solo ROOT y ADMIN_CLIENTE de Cultiva pueden elegir
   * una empresa distinta al crear un local.
   */
  const canSelectCompany =
    isRoot || isCultivaAdmin;

  /*
   * Para cualquier otro administrador, la empresa se
   * obtiene directamente desde su sesión.
   */
  const loggedCompanyId =
    userAdmin?.company_id ||
    autoCompany ||
    "";

  const [regions, setRegions] = useState([]);
  const [comunas, setComunas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [geoLoading, setGeoLoading] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    company_id: canSelectCompany
      ? (autoCompany || "")
      : loggedCompanyId,
    codigo_local: "",
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
        company_id: canSelectCompany
          ? (autoCompany || "")
          : loggedCompanyId,
        codigo_local: "",
        cadena: "",
        direccion: "",
        lat: "",
        lng: ""
      }));
      setError("");
    }
  }, [
    isOpen,
    autoCompany,
    canSelectCompany,
    loggedCompanyId,
  ]);

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
        const data = await api.get(
          `/comunas?region_id=${form.region_id}`
        );
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
      setError(
        "Completa dirección, región y comuna para ubicar en el mapa"
      );
      return;
    }

    try {
      setGeoLoading(true);
      setError("");

      const comuna = comunas.find(
        c => c.id === form.comuna_id
      )?.name;

      const region = regions.find(
        r => r.id === form.region_id
      )?.name;

      const address =
        `${form.direccion}, ${comuna}, ${region}, Chile`;

      const url =
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(
          address
        )}.json?access_token=${MAPBOX_TOKEN}&limit=1&country=CL`;

      const res = await fetch(url);
      const data = await res.json();

      if (!data.features || data.features.length === 0) {
        setError(
          "No encontramos esa dirección exacta. Verifica o ingresa coordenadas manuales."
        );
        return;
      }

      const [lng, lat] = data.features[0].center;

      setForm(prev => ({
        ...prev,
        lat,
        lng
      }));

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
      const companyId =
        canSelectCompany
          ? form.company_id
          : loggedCompanyId;

      if (!companyId) {
        throw new Error(
          canSelectCompany
            ? "Debe seleccionar una empresa"
            : "No se pudo identificar la empresa del administrador"
        );
      }

      const payload = {
        ...form,
        company_id: companyId,
        lat: form.lat ? Number(form.lat) : null,
        lng: form.lng ? Number(form.lng) : null
      };

      await api.post("/locales", payload);
      toast.success("Local creado con éxito");
      onCreated();
      onClose();
    } catch (err) {
      setError(
        err.response?.data?.message ||
        err.message
      );
    } finally {
      setLoading(false);
    }
  };

  const inputClassName = `
    w-full rounded-2xl border border-gray-100 bg-gray-50
    px-4 py-3.5 text-[12px] font-bold text-gray-800
    outline-none shadow-inner transition-all
    placeholder:text-gray-300
    focus:border-[#87be00]/40 focus:bg-white
    focus:ring-4 focus:ring-[#87be00]/10
    disabled:cursor-not-allowed disabled:opacity-50
  `;

  const labelClassName = `
    ml-1 flex items-center gap-1.5
    text-[9px] font-black uppercase tracking-[0.18em]
    text-gray-400
  `;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-[#111111]/70 p-3 font-[Outfit] backdrop-blur-sm sm:p-5">
      <div className="relative flex max-h-[94vh] w-full max-w-3xl flex-col overflow-hidden rounded-[2rem] border border-white/60 bg-white shadow-2xl animate-in fade-in zoom-in-95 duration-200">

        {/* ENCABEZADO */}
        <div className="relative border-b border-gray-100 bg-white px-5 py-5 sm:px-7 sm:py-6">
          <div className="absolute inset-x-0 top-0 h-1 bg-[#87be00]" />

          <div className="flex items-start justify-between gap-4">
            <div className="flex min-w-0 items-center gap-3.5">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#87be00]/10 text-[#87be00]">
                <FiMapPin size={20} />
              </div>

              <div className="min-w-0">
                <p className="text-[9px] font-black uppercase tracking-[0.22em] text-[#87be00]">
                  Gestión de locales
                </p>

                <h3 className="mt-1 text-xl font-black leading-none tracking-tight text-gray-900 sm:text-2xl">
                  Crear nuevo local
                </h3>

                <p className="mt-2 text-[11px] font-medium text-gray-400">
                  Registra un nuevo punto de venta y su ubicación.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label="Cerrar formulario"
              disabled={loading}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-gray-100 bg-gray-50 text-gray-400 transition-all hover:border-red-100 hover:bg-red-50 hover:text-red-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <FiX size={18} />
            </button>
          </div>
        </div>

        {/* CONTENIDO */}
        <form
          onSubmit={handleSubmit}
          className="flex min-h-0 flex-1 flex-col"
        >
          <div className="custom-scrollbar min-h-0 flex-1 space-y-5 overflow-y-auto bg-gray-50/40 px-5 py-5 sm:px-7 sm:py-6">

            {error && (
              <div className="flex items-start gap-3 rounded-2xl border border-red-100 bg-red-50 p-4 text-red-600">
                <div className="mt-0.5 shrink-0">
                  <FiAlertCircle size={16} />
                </div>

                <div>
                  <p className="text-[9px] font-black uppercase tracking-[0.18em]">
                    No fue posible continuar
                  </p>
                  <p className="mt-1 text-[11px] font-semibold leading-relaxed">
                    {error}
                  </p>
                </div>
              </div>
            )}

            {/* IDENTIFICACIÓN */}
            <section className="rounded-[1.6rem] border border-gray-100 bg-white p-4 shadow-sm sm:p-5">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gray-100 text-gray-500">
                  <FiBriefcase size={16} />
                </div>

                <div>
                  <h4 className="text-[11px] font-black uppercase tracking-[0.16em] text-gray-800">
                    Identificación
                  </h4>
                  <p className="mt-0.5 text-[10px] font-medium text-gray-400">
                    Información principal del punto de venta.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className={labelClassName}>
                    <FiHash size={11} />
                    Código interno
                  </label>

                  <input
                    type="text"
                    name="codigo_local"
                    placeholder="Ej: SUC-102"
                    value={form.codigo_local}
                    onChange={handleChange}
                    required
                    className={inputClassName}
                  />
                </div>

                <div className="space-y-2">
                  <label className={labelClassName}>
                    <FiBriefcase size={11} />
                    Cadena
                  </label>

                  <input
                    type="text"
                    name="cadena"
                    placeholder="Ej: ALVI"
                    value={form.cadena}
                    onChange={handleChange}
                    required
                    className={inputClassName}
                  />
                </div>

                {canSelectCompany && (
                  <div className="space-y-2 md:col-span-2">
                    <label className={labelClassName}>
                      <FiBriefcase size={11} />
                      Empresa
                    </label>

                    <div className="relative">
                      <select
                        name="company_id"
                        value={form.company_id}
                        onChange={handleChange}
                        disabled={!!autoCompany}
                        required
                        className={`${inputClassName} appearance-none pr-11`}
                      >
                        <option value="">Seleccionar empresa</option>
                        {companies.map(c => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>

                      <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-gray-400">
                        <svg
                          className="h-3.5 w-3.5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="3"
                            d="M19 9l-7 7-7-7"
                          />
                        </svg>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </section>

            {/* UBICACIÓN */}
            <section className="rounded-[1.6rem] border border-gray-100 bg-white p-4 shadow-sm sm:p-5">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#87be00]/10 text-[#87be00]">
                  <FiMap size={16} />
                </div>

                <div>
                  <h4 className="text-[11px] font-black uppercase tracking-[0.16em] text-gray-800">
                    Ubicación
                  </h4>
                  <p className="mt-0.5 text-[10px] font-medium text-gray-400">
                    Dirección y coordenadas geográficas.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className={labelClassName}>
                    Región
                  </label>

                  <div className="relative">
                    <select
                      name="region_id"
                      value={form.region_id}
                      onChange={handleChange}
                      required
                      className={`${inputClassName} appearance-none pr-11`}
                    >
                      <option value="">Seleccionar región</option>
                      {regions.map(r => (
                        <option key={r.id} value={r.id}>
                          {r.name}
                        </option>
                      ))}
                    </select>

                    <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-gray-400">
                      <svg
                        className="h-3.5 w-3.5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="3"
                          d="M19 9l-7 7-7-7"
                        />
                      </svg>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className={labelClassName}>
                    Comuna
                  </label>

                  <div className="relative">
                    <select
                      name="comuna_id"
                      value={form.comuna_id}
                      onChange={handleChange}
                      required
                      disabled={!form.region_id}
                      className={`${inputClassName} appearance-none pr-11`}
                    >
                      <option value="">Seleccionar comuna</option>
                      {comunas.map(c => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>

                    <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-gray-400">
                      <svg
                        className="h-3.5 w-3.5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="3"
                          d="M19 9l-7 7-7-7"
                        />
                      </svg>
                    </div>
                  </div>
                </div>

                <div className="space-y-2 md:col-span-2">
                  <label className={labelClassName}>
                    <FiMapPin size={11} />
                    Dirección exacta
                  </label>

                  <input
                    type="text"
                    name="direccion"
                    placeholder="Ej: Avenida Principal 1234"
                    value={form.direccion}
                    onChange={handleChange}
                    required
                    className={inputClassName}
                  />
                </div>

                <div className="md:col-span-2">
                  <button
                    type="button"
                    onClick={geocodeAddress}
                    disabled={geoLoading}
                    className="flex w-full items-center justify-center gap-2 rounded-2xl border border-[#87be00]/20 bg-[#87be00]/10 px-4 py-3.5 text-[9px] font-black uppercase tracking-[0.16em] text-[#679300] transition-all hover:border-[#87be00]/30 hover:bg-[#87be00]/15 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {geoLoading ? (
                      <FiLoader className="animate-spin" size={15} />
                    ) : (
                      <FiNavigation size={15} />
                    )}

                    {geoLoading
                      ? "Buscando ubicación..."
                      : "Sugerir coordenadas con Mapbox"}
                  </button>
                </div>

                <div className="space-y-2">
                  <label className={labelClassName}>
                    Latitud
                  </label>

                  <input
                    type="number"
                    step="any"
                    name="lat"
                    placeholder="-33.4489"
                    value={form.lat}
                    onChange={handleChange}
                    className={inputClassName}
                  />
                </div>

                <div className="space-y-2">
                  <label className={labelClassName}>
                    Longitud
                  </label>

                  <input
                    type="number"
                    step="any"
                    name="lng"
                    placeholder="-70.6693"
                    value={form.lng}
                    onChange={handleChange}
                    className={inputClassName}
                  />
                </div>

                {form.lat && form.lng && (
                  <div className="md:col-span-2">
                    <div className="flex items-center gap-3 rounded-2xl border border-green-100 bg-green-50 p-3.5 text-green-700">
                      <FiCheckCircle className="shrink-0" size={16} />
                      <p className="text-[10px] font-bold">
                        Coordenadas registradas: {form.lat}, {form.lng}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </section>

            {/* CONTACTO */}
            <section className="rounded-[1.6rem] border border-gray-100 bg-white p-4 shadow-sm sm:p-5">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gray-100 text-gray-500">
                  <FiUser size={16} />
                </div>

                <div>
                  <h4 className="text-[11px] font-black uppercase tracking-[0.16em] text-gray-800">
                    Contacto
                  </h4>
                  <p className="mt-0.5 text-[10px] font-medium text-gray-400">
                    Información opcional del responsable del local.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className={labelClassName}>
                    <FiUser size={11} />
                    Gerente o jefe
                  </label>

                  <input
                    type="text"
                    name="gerente"
                    placeholder="Nombre del responsable"
                    value={form.gerente}
                    onChange={handleChange}
                    className={inputClassName}
                  />
                </div>

                <div className="space-y-2">
                  <label className={labelClassName}>
                    <FiPhone size={11} />
                    Teléfono
                  </label>

                  <input
                    type="text"
                    name="telefono"
                    placeholder="+56 9 1234 5678"
                    value={form.telefono}
                    onChange={handleChange}
                    className={inputClassName}
                  />
                </div>
              </div>
            </section>
          </div>

          {/* ACCIONES */}
          <div className="grid grid-cols-1 gap-3 border-t border-gray-100 bg-white px-5 py-4 sm:grid-cols-[auto_1fr] sm:px-7">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="order-2 rounded-2xl border border-gray-100 bg-gray-50 px-6 py-3.5 text-[9px] font-black uppercase tracking-[0.16em] text-gray-500 transition-all hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50 sm:order-1"
            >
              Cancelar
            </button>

            <button
              type="submit"
              disabled={loading}
              className="order-1 flex items-center justify-center gap-2 rounded-2xl bg-gray-900 px-6 py-3.5 text-[9px] font-black uppercase tracking-[0.18em] text-white shadow-lg shadow-gray-200 transition-all hover:bg-[#87be00] disabled:cursor-not-allowed disabled:opacity-60 sm:order-2"
            >
              {loading ? (
                <>
                  <FiLoader className="animate-spin" size={15} />
                  Creando punto de venta...
                </>
              ) : (
                <>
                  <FiCheckCircle size={15} />
                  Guardar local
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateLocalModal;