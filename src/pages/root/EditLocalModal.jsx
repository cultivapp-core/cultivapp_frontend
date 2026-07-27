import React, { useState, useEffect } from "react";
import {
  FiX,
  FiHash,
  FiUser,
  FiPhone,
  FiMapPin,
  FiLoader,
  FiBriefcase,
  FiShoppingCart,
  FiGlobe,
  FiAlertCircle,
  FiCheckCircle,
} from "react-icons/fi";
import api from "../../api/apiClient";
import toast from "react-hot-toast";

const CULTIVA_COMPANY_ID =
  "0e342e01-d213-4353-b210-39a12ac335cf";

const EditLocalModal = ({
  isOpen,
  onClose,
  onUpdated,
  local,
  companies = [],
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

  const currentRole =
    String(
      userAdmin?.role || "",
    ).toUpperCase();

  const isRoot =
    currentRole === "ROOT";

  const isCultivaAdmin =
    [
      "ADMIN",
      "ADMIN_CLIENTE",
    ].includes(currentRole) &&
    userAdmin?.company_id ===
      CULTIVA_COMPANY_ID;

  /*
   * Solo ROOT y el administrador de Cultiva pueden
   * cambiar la empresa asociada al local.
   */
  const canSelectCompany =
    isRoot || isCultivaAdmin;

  /*
   * Para cualquier otro administrador se conserva
   * obligatoriamente la empresa de su sesión.
   */
  const loggedCompanyId =
    userAdmin?.company_id || "";

  const [regions, setRegions] =
    useState([]);
  const [comunas, setComunas] =
    useState([]);
  const [loading, setLoading] =
    useState(false);
  const [error, setError] =
    useState("");

  const [form, setForm] =
    useState({
      company_id: "",
      codigo_local: "",
      cadena: "",
      region_id: "",
      comuna_id: "",
      direccion: "",
      gerente: "",
      telefono: "",
    });

  useEffect(() => {
    const loadRegions = async () => {
      try {
        const data =
          await api.get("/regions");

        setRegions(data);
      } catch (err) {
        console.error(
          "Error cargando regiones:",
          err,
        );
      }
    };

    if (isOpen) {
      loadRegions();
    }
  }, [isOpen]);

  useEffect(() => {
    if (!form.region_id) {
      setComunas([]);
      return;
    }

    const loadComunas = async () => {
      try {
        const data =
          await api.get(
            `/comunas?region_id=${form.region_id}`,
          );

        setComunas(data);
      } catch (err) {
        console.error(
          "Error cargando comunas:",
          err,
        );
      }
    };

    loadComunas();
  }, [form.region_id]);

  useEffect(() => {
    if (local && isOpen) {
      setForm({
        company_id: canSelectCompany
          ? (local.company_id || "")
          : (
              loggedCompanyId ||
              local.company_id ||
              ""
            ),
        codigo_local:
          local.codigo_local || "",
        cadena:
          local.cadena || "",
        region_id:
          local.region_id || "",
        comuna_id:
          local.comuna_id || "",
        direccion:
          local.direccion || "",
        gerente:
          local.gerente || "",
        telefono:
          local.telefono || "",
      });

      setError("");
    }
  }, [
    local,
    isOpen,
    canSelectCompany,
    loggedCompanyId,
  ]);

  const handleChange = (event) => {
    const {
      name,
      value,
    } = event.target;

    setForm((current) => ({
      ...current,
      [name]: value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      const companyId =
        canSelectCompany
          ? form.company_id
          : (
              loggedCompanyId ||
              local?.company_id ||
              ""
            );

      if (!companyId) {
        throw new Error(
          canSelectCompany
            ? "Debe seleccionar una empresa."
            : "No se pudo identificar la empresa del administrador.",
        );
      }

      const payload = {
        ...form,
        company_id:
          companyId,
      };

      await api.put(
        `/locales/${local.id}`,
        payload,
      );

      toast.success(
        "Local actualizado correctamente",
      );

      onUpdated();
      onClose();
    } catch (err) {
      const message =
        err.response?.data?.message ||
        err.message ||
        "Error al actualizar";

      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) {
    return null;
  }

  const inputClassName = `
    h-12 w-full
    rounded-2xl
    border border-gray-100
    bg-gray-50
    px-4
    text-[12px]
    font-bold
    text-gray-800
    outline-none
    shadow-inner
    transition-all
    placeholder:text-gray-300
    focus:border-[#87be00]/40
    focus:bg-white
    focus:ring-4
    focus:ring-[#87be00]/10
    disabled:cursor-not-allowed
    disabled:opacity-50
  `;

  const labelClassName = `
    ml-1
    flex
    items-center
    gap-1.5
    text-[9px]
    font-black
    uppercase
    tracking-[0.16em]
    text-gray-400
  `;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-[#111111]/70 p-3 font-[Outfit] backdrop-blur-sm sm:p-5"
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-local-title"
    >
      <div className="relative flex max-h-[94vh] w-full max-w-3xl flex-col overflow-hidden rounded-[2rem] border border-white/60 bg-white shadow-2xl animate-in fade-in zoom-in-95 duration-200">

        {/* ENCABEZADO */}
        <header className="relative shrink-0 border-b border-gray-100 bg-white px-5 py-5 sm:px-7 sm:py-6">
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

                <h2
                  id="edit-local-title"
                  className="mt-1 text-xl font-black leading-none tracking-tight text-gray-900 sm:text-2xl"
                >
                  Editar local
                </h2>

                <p className="mt-2 truncate text-[11px] font-medium text-gray-400">
                  Referencia:{" "}
                  {String(
                    local?.id || "",
                  ).split("-")[0] || "Sin referencia"}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label="Cerrar edición de local"
              disabled={loading}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-gray-100 bg-gray-50 text-gray-400 transition-all hover:border-red-100 hover:bg-red-50 hover:text-red-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <FiX size={18} />
            </button>
          </div>
        </header>

        <form
          onSubmit={handleSubmit}
          className="flex min-h-0 flex-1 flex-col overflow-hidden"
        >
          {/* CONTENIDO DESPLAZABLE */}
          <div className="custom-scrollbar min-h-0 flex-1 space-y-5 overflow-y-auto overscroll-contain bg-gray-50/40 px-5 py-5 sm:px-7 sm:py-6">
            {error && (
              <div className="flex items-start gap-3 rounded-2xl border border-red-100 bg-red-50 p-4 text-red-600">
                <FiAlertCircle
                  className="mt-0.5 shrink-0"
                  size={16}
                />

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
                  <h3 className="text-[11px] font-black uppercase tracking-[0.16em] text-gray-800">
                    Identificación
                  </h3>

                  <p className="mt-0.5 text-[10px] font-medium text-gray-400">
                    Información principal del punto de venta.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className={labelClassName}>
                    <FiHash size={11} />
                    Código del local
                  </label>

                  <input
                    type="text"
                    name="codigo_local"
                    value={form.codigo_local}
                    onChange={handleChange}
                    required
                    className={`${inputClassName} uppercase tracking-wider`}
                  />
                </div>

                <div className="space-y-2">
                  <label className={labelClassName}>
                    <FiShoppingCart size={11} />
                    Cadena
                  </label>

                  <input
                    type="text"
                    name="cadena"
                    value={form.cadena}
                    onChange={handleChange}
                    required
                    className={`${inputClassName} uppercase tracking-wide`}
                  />
                </div>

                {canSelectCompany && (
                  <div className="space-y-2 md:col-span-2">
                    <label className={labelClassName}>
                      <FiBriefcase size={11} />
                      Empresa / Cliente
                    </label>

                    <div className="relative">
                      <select
                        name="company_id"
                        value={form.company_id}
                        onChange={handleChange}
                        required
                        className={`${inputClassName} appearance-none pr-11`}
                      >
                        <option value="">
                          Seleccionar empresa
                        </option>

                        {companies.map(
                          (company) => (
                            <option
                              key={company.id}
                              value={company.id}
                            >
                              {company.name}
                            </option>
                          ),
                        )}
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
                  <FiGlobe size={16} />
                </div>

                <div>
                  <h3 className="text-[11px] font-black uppercase tracking-[0.16em] text-gray-800">
                    Ubicación
                  </h3>

                  <p className="mt-0.5 text-[10px] font-medium text-gray-400">
                    Región, comuna y dirección del local.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className={labelClassName}>
                    <FiGlobe size={11} />
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
                      <option value="">
                        Seleccionar región
                      </option>

                      {regions.map(
                        (region) => (
                          <option
                            key={region.id}
                            value={region.id}
                          >
                            {region.name}
                          </option>
                        ),
                      )}
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
                    <FiMapPin size={11} />
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
                      <option value="">
                        Seleccionar comuna
                      </option>

                      {comunas.map(
                        (comuna) => (
                          <option
                            key={comuna.id}
                            value={comuna.id}
                          >
                            {comuna.name}
                          </option>
                        ),
                      )}
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
                    Dirección completa
                  </label>

                  <input
                    type="text"
                    name="direccion"
                    value={form.direccion}
                    onChange={handleChange}
                    required
                    className={inputClassName}
                  />
                </div>
              </div>
            </section>

            {/* CONTACTO */}
            <section className="rounded-[1.6rem] border border-gray-100 bg-white p-4 shadow-sm sm:p-5">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gray-100 text-gray-500">
                  <FiUser size={16} />
                </div>

                <div>
                  <h3 className="text-[11px] font-black uppercase tracking-[0.16em] text-gray-800">
                    Contacto
                  </h3>

                  <p className="mt-0.5 text-[10px] font-medium text-gray-400">
                    Información del responsable del local.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className={labelClassName}>
                    <FiUser size={11} />
                    Gerente o administrador
                  </label>

                  <input
                    type="text"
                    name="gerente"
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
                    value={form.telefono}
                    onChange={handleChange}
                    className={inputClassName}
                  />
                </div>
              </div>
            </section>
          </div>

          {/* ACCIONES */}
          <footer className="grid shrink-0 grid-cols-1 gap-3 border-t border-gray-100 bg-white px-5 py-4 sm:grid-cols-[auto_1fr] sm:px-7">
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
                  <FiLoader
                    className="animate-spin"
                    size={15}
                  />
                  Procesando cambios...
                </>
              ) : (
                <>
                  <FiCheckCircle size={15} />
                  Actualizar local
                </>
              )}
            </button>
          </footer>
        </form>
      </div>
    </div>
  );
};

export default EditLocalModal;