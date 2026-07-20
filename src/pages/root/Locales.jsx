import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  FiBriefcase,
  FiCopy,
  FiEdit,
  FiEye,
  FiEyeOff,
  FiMapPin,
  FiPlus,
  FiRefreshCw,
  FiSearch,
  FiShoppingCart,
  FiTrash2,
  FiUpload,
  FiX,
} from "react-icons/fi";
import toast from "react-hot-toast";
import CreateLocalModal from "../root/CreateLocalModal";
import UploadLocalesModal from "../root/UploadLocalesModal";
import EditLocalModal from "./EditLocalModal";
import LocalesMap from "../../components/LocalesMap";
import api from "../../api/apiClient";
import { useAuth } from "../../context/AuthContext";
import {
  Button,
  IconButton,
  Switch,
} from "../../components/ui";

const CULTIVA_COMPANY_ID =
  "0e342e01-d213-4353-b210-39a12ac335cf";

const getResponseData = (
  response,
  fallback = [],
) => {
  if (response == null) return fallback;
  return response?.data ?? response;
};

const getLocalName = (local) =>
  local?.nombre_local ||
  local?.cadena ||
  "Local sin nombre";

const Locales = () => {
  const { user } = useAuth();

  const hasElevatedAccess =
    user?.role === "ROOT" ||
    (user?.role === "ADMIN_CLIENTE" &&
      user?.company_id ===
        CULTIVA_COMPANY_ID);

  const [locales, setLocales] =
    useState([]);
  const [companies, setCompanies] =
    useState([]);
  const [
    selectedCompany,
    setSelectedCompany,
  ] = useState(
    hasElevatedAccess
      ? ""
      : user?.company_id || "",
  );
  const [
    showInactive,
    setShowInactive,
  ] = useState(false);

  const [searchTerm, setSearchTerm] =
    useState("");
  const [
    selectedRegion,
    setSelectedRegion,
  ] = useState("");
  const [
    selectedComuna,
    setSelectedComuna,
  ] = useState("");
  const [
    selectedChain,
    setSelectedChain,
  ] = useState("");

  const [loading, setLoading] =
    useState(true);
  const [error, setError] =
    useState("");

  const [openCreate, setOpenCreate] =
    useState(false);
  const [openUpload, setOpenUpload] =
    useState(false);
  const [openEdit, setOpenEdit] =
    useState(false);
  const [
    selectedLocal,
    setSelectedLocal,
  ] = useState(null);

  useEffect(() => {
    if (
      !hasElevatedAccess &&
      user?.company_id
    ) {
      setSelectedCompany(
        user.company_id,
      );
    }
  }, [
    hasElevatedAccess,
    user?.company_id,
  ]);

  const fetchCompanies =
    useCallback(async () => {
      if (!hasElevatedAccess) {
        setCompanies([]);
        return;
      }

      try {
        const response =
          await api.get("/companies");

        const data =
          getResponseData(
            response,
            [],
          );

        setCompanies(
          Array.isArray(data)
            ? data
            : [],
        );
      } catch (requestError) {
        console.error(
          "Error cargando empresas:",
          requestError,
        );

        toast.error(
          "Error al cargar empresas",
        );
      }
    }, [hasElevatedAccess]);

  const fetchLocales =
    useCallback(async () => {
      try {
        setLoading(true);
        setError("");

        let url = "/locales";

        const companyId =
          hasElevatedAccess
            ? selectedCompany
            : user?.company_id;

        if (companyId) {
          url += `?company_id=${encodeURIComponent(
            companyId,
          )}`;
        }

        const response =
          await api.get(url);

        const data =
          getResponseData(
            response,
            [],
          );

        if (!Array.isArray(data)) {
          throw new Error(
            "La API devolvió un formato inesperado.",
          );
        }

        setLocales(data);
      } catch (requestError) {
        console.error(
          "Error cargando locales:",
          requestError,
        );

        setError(
          requestError?.response?.data
            ?.message ||
            requestError?.message ||
            "No se pudieron cargar los locales.",
        );
      } finally {
        setLoading(false);
      }
    }, [
      hasElevatedAccess,
      selectedCompany,
      user?.company_id,
    ]);

  useEffect(() => {
    fetchCompanies();
  }, [fetchCompanies]);

  useEffect(() => {
    fetchLocales();
  }, [fetchLocales]);

  useEffect(() => {
    setSelectedComuna("");
  }, [selectedRegion]);

  const toggleLocal = async (
    local,
  ) => {
    try {
      await api.patch(
        `/locales/${local.id}/toggle`,
      );

      setLocales((current) =>
        current.map((item) =>
          item.id === local.id
            ? {
                ...item,
                is_active:
                  !item.is_active,
              }
            : item,
        ),
      );

      toast.success(
        "Estado actualizado",
      );
    } catch (requestError) {
      console.error(
        "Error cambiando estado:",
        requestError,
      );

      toast.error(
        requestError?.response?.data
          ?.message ||
          "Error al cambiar estado",
      );
    }
  };

  const deleteLocal = async (
    local,
  ) => {
    const confirmed =
      window.confirm(
        `¿Eliminar el local "${getLocalName(
          local,
        )}"?\n\nID: ${local.id}`,
      );

    if (!confirmed) return;

    try {
      await api.delete(
        `/locales/${local.id}`,
      );

      setLocales((current) =>
        current.filter(
          (item) =>
            item.id !== local.id,
        ),
      );

      toast.success(
        "Local eliminado",
      );
    } catch (requestError) {
      console.error(
        "Error eliminando local:",
        requestError,
      );

      toast.error(
        requestError?.response?.data
          ?.message ||
          "No se pudo eliminar",
      );
    }
  };

  const copyLocalId = async (
    local,
  ) => {
    const localId = String(
      local?.id || "",
    ).trim();

    if (!localId) {
      toast.error(
        "El local no tiene ID disponible.",
      );
      return;
    }

    try {
      await navigator.clipboard.writeText(
        localId,
      );

      toast.success(
        "ID del local copiado",
      );
    } catch {
      toast.error(
        "No se pudo copiar el ID.",
      );
    }
  };

  const regionsList = useMemo(
    () =>
      [
        ...new Set(
          locales
            .map(
              (local) =>
                local.region ||
                local.region_name,
            )
            .filter(Boolean),
        ),
      ].sort((a, b) =>
        a.localeCompare(b, "es"),
      ),
    [locales],
  );

  const chainsList = useMemo(
    () =>
      [
        ...new Set(
          locales
            .map(
              (local) =>
                local.cadena,
            )
            .filter(Boolean),
        ),
      ].sort((a, b) =>
        a.localeCompare(b, "es"),
      ),
    [locales],
  );

  const comunasList = useMemo(() => {
    const source = selectedRegion
      ? locales.filter(
          (local) =>
            (local.region ||
              local.region_name) ===
            selectedRegion,
        )
      : locales;

    return [
      ...new Set(
        source
          .map(
            (local) =>
              local.comuna ||
              local.comuna_name,
          )
          .filter(Boolean),
      ),
    ].sort((a, b) =>
      a.localeCompare(b, "es"),
    );
  }, [locales, selectedRegion]);

  const visibleLocales = useMemo(() => {
    const term = searchTerm
      .trim()
      .toLowerCase();

    return locales.filter((local) => {
      const isActive =
        local.is_active !== false;

      const matchesStatus =
        showInactive || isActive;

      const searchableText = [
        local.codigo_local,
        local.cadena,
        local.direccion,
        local.region,
        local.region_name,
        local.comuna,
        local.comuna_name,
        local.id,
        local.company_name,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const matchesSearch =
        !term ||
        searchableText.includes(term);

      const region =
        local.region ||
        local.region_name;

      const comuna =
        local.comuna ||
        local.comuna_name;

      const matchesRegion =
        !selectedRegion ||
        region === selectedRegion;

      const matchesComuna =
        !selectedComuna ||
        comuna === selectedComuna;

      const matchesChain =
        !selectedChain ||
        local.cadena ===
          selectedChain;

      return (
        matchesStatus &&
        matchesSearch &&
        matchesRegion &&
        matchesComuna &&
        matchesChain
      );
    });
  }, [
    locales,
    showInactive,
    searchTerm,
    selectedRegion,
    selectedComuna,
    selectedChain,
  ]);

  const hasFilters =
    Boolean(searchTerm) ||
    Boolean(selectedRegion) ||
    Boolean(selectedComuna) ||
    Boolean(selectedChain) ||
    showInactive;

  const clearFilters = () => {
    setSearchTerm("");
    setSelectedRegion("");
    setSelectedComuna("");
    setSelectedChain("");
    setShowInactive(false);
  };

  const openEditModal = (local) => {
    setSelectedLocal(local);
    setOpenEdit(true);
  };

  const selectedCompanyForModals =
    hasElevatedAccess
      ? selectedCompany
      : user?.company_id || "";

  return (
    <div className="w-full min-h-full bg-gray-50/40 font-[Outfit] pb-20">
      <header className="bg-white border-b border-gray-100">
        <div className="max-w-[1500px] mx-auto px-4 sm:px-6 md:px-8 py-5 md:py-8 flex flex-col md:flex-row md:items-end justify-between gap-5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-[#87be00]/10 rounded-xl text-[#87be00]">
              <FiShoppingCart
                size={20}
              />
            </div>

            <div>
              <h1 className="text-3xl md:text-5xl font-black text-gray-900 tracking-tight leading-none">
                Gestión de locales
              </h1>

              <p className="text-[10px] font-black text-[#87be00] uppercase tracking-[0.2em] mt-2">
                Puntos de venta de la red
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 w-full md:w-auto">
            <Button
              type="button"
              variant="secondary"
              size="lg"
              leftIcon={
                <FiUpload size={16} />
              }
              onClick={() =>
                setOpenUpload(true)
              }
              disabled={
                hasElevatedAccess &&
                !selectedCompanyForModals
              }
            >
              Carga masiva
            </Button>

            <Button
              type="button"
              variant="dark"
              size="lg"
              leftIcon={
                <FiPlus size={16} />
              }
              onClick={() =>
                setOpenCreate(true)
              }
              disabled={
                hasElevatedAccess &&
                !selectedCompanyForModals
              }
            >
              Crear local
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-[1500px] mx-auto px-4 sm:px-6 md:px-8 pt-6 space-y-6">
        <section className="bg-white p-4 sm:p-5 rounded-[2rem] border border-gray-100 shadow-sm">
          <div
            className={`grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-6 gap-3 ${
              hasElevatedAccess
                ? ""
                : "xl:grid-cols-5"
            }`}
          >
            {hasElevatedAccess && (
              <div className="relative">
                <FiBriefcase
                  size={15}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                />

                <select
                  value={
                    selectedCompany
                  }
                  onChange={(event) => {
                    setSelectedCompany(
                      event.target.value,
                    );
                    clearFilters();
                  }}
                  className={`${inputClass} pl-11`}
                >
                  <option value="">
                    Todas las empresas
                  </option>

                  {companies.map(
                    (company) => (
                      <option
                        key={company.id}
                        value={company.id}
                      >
                        {company.name ||
                          company.nombre ||
                          "Empresa"}
                      </option>
                    ),
                  )}
                </select>
              </div>
            )}

            <div className="relative sm:col-span-2 xl:col-span-1">
              <FiSearch
                size={15}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
              />

              <input
                type="search"
                placeholder="Código, cadena, dirección o ID..."
                value={searchTerm}
                onChange={(event) =>
                  setSearchTerm(
                    event.target.value,
                  )
                }
                className={`${inputClass} pl-11 pr-11`}
              />

              {searchTerm && (
                <button
                  type="button"
                  aria-label="Limpiar búsqueda"
                  onClick={() =>
                    setSearchTerm("")
                  }
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-red-500"
                >
                  <FiX size={15} />
                </button>
              )}
            </div>

            <select
              value={selectedChain}
              onChange={(event) =>
                setSelectedChain(
                  event.target.value,
                )
              }
              className={inputClass}
            >
              <option value="">
                Todas las cadenas
              </option>

              {chainsList.map(
                (chain) => (
                  <option
                    key={chain}
                    value={chain}
                  >
                    {chain}
                  </option>
                ),
              )}
            </select>

            <select
              value={selectedRegion}
              onChange={(event) =>
                setSelectedRegion(
                  event.target.value,
                )
              }
              className={inputClass}
            >
              <option value="">
                Todas las regiones
              </option>

              {regionsList.map(
                (region) => (
                  <option
                    key={region}
                    value={region}
                  >
                    {region}
                  </option>
                ),
              )}
            </select>

            <select
              value={selectedComuna}
              onChange={(event) =>
                setSelectedComuna(
                  event.target.value,
                )
              }
              className={inputClass}
            >
              <option value="">
                Todas las comunas
              </option>

              {comunasList.map(
                (comuna) => (
                  <option
                    key={comuna}
                    value={comuna}
                  >
                    {comuna}
                  </option>
                ),
              )}
            </select>

            <div className="h-12 px-4 rounded-2xl border border-gray-100 bg-gray-50 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 min-w-0">
                {showInactive ? (
                  <FiEye
                    size={15}
                    className="text-orange-500 shrink-0"
                  />
                ) : (
                  <FiEyeOff
                    size={15}
                    className="text-gray-400 shrink-0"
                  />
                )}

                <span className="text-[9px] font-black uppercase tracking-wider text-gray-500 truncate">
                  Mostrar inactivos
                </span>
              </div>

              <Switch
                checked={showInactive}
                onChange={
                  setShowInactive
                }
              />
            </div>
          </div>

          {hasFilters && (
            <div className="mt-4">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                leftIcon={
                  <FiX size={13} />
                }
                onClick={clearFilters}
              >
                Limpiar filtros
              </Button>
            </div>
          )}
        </section>

        {loading ? (
          <div className="py-20 flex flex-col items-center gap-4 text-gray-400">
            <FiRefreshCw
              size={30}
              className="animate-spin text-[#87be00]"
            />

            <p className="text-[10px] font-black uppercase tracking-wider">
              Cargando locales...
            </p>
          </div>
        ) : error ? (
          <InformationMessage
            title="No se pudieron cargar los locales"
            description={error}
            action={
              <Button
                type="button"
                variant="secondary"
                leftIcon={
                  <FiRefreshCw
                    size={14}
                  />
                }
                onClick={fetchLocales}
              >
                Intentar nuevamente
              </Button>
            }
          />
        ) : (
          <>
            <section className="h-[280px] md:h-[360px] w-full rounded-[2rem] overflow-hidden border border-gray-100 bg-white shadow-sm">
              {visibleLocales.length ===
              0 ? (
                <div className="w-full h-full flex items-center justify-center">
                  <p className="text-xs font-bold text-gray-400">
                    Sin información disponible
                  </p>
                </div>
              ) : (
                <LocalesMap
                  locales={
                    visibleLocales
                  }
                />
              )}
            </section>

            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-wider text-gray-400">
                  Resultados
                </p>

                <p className="text-2xl font-black text-gray-900 mt-1">
                  {
                    visibleLocales.length
                  }
                </p>
              </div>
            </div>

            {visibleLocales.length ===
            0 ? (
              <InformationMessage
                title="Sin información disponible"
                description="No existen locales que coincidan con los filtros seleccionados."
              />
            ) : (
              <>
                <section className="hidden md:block bg-white rounded-[2rem] shadow-sm border border-gray-100 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="bg-gray-50/70 border-b border-gray-100">
                          <th className={thClass}>
                            Local
                          </th>
                          <th className={thClass}>
                            Ubicación
                          </th>
                          <th className={thClass}>
                            Empresa
                          </th>
                          <th className={thClass}>
                            Estado
                          </th>
                          <th className={`${thClass} text-right`}>
                            Acciones
                          </th>
                        </tr>
                      </thead>

                      <tbody>
                        {visibleLocales.map(
                          (local) => (
                            <tr
                              key={local.id}
                              className="border-b border-gray-50 last:border-b-0 hover:bg-gray-50/60 transition-colors"
                            >
                              <td className="p-4 align-top">
                                <p className="text-xs font-black text-gray-900">
                                  {getLocalName(
                                    local,
                                  )}
                                </p>

                                <p className="text-[9px] font-bold text-[#87be00] uppercase tracking-wider mt-1">
                                  Código:{" "}
                                  {local.codigo_local ||
                                    "Sin código"}
                                </p>

                                <UserId
                                  id={
                                    local.id
                                  }
                                  onCopy={() =>
                                    copyLocalId(
                                      local,
                                    )
                                  }
                                  className="mt-2 max-w-[290px]"
                                />
                              </td>

                              <td className="p-4 align-top">
                                <p className="text-xs font-semibold text-gray-600 max-w-xs">
                                  {local.direccion ||
                                    "Sin dirección"}
                                </p>

                                <p className="text-[9px] text-gray-400 mt-1">
                                  {[
                                    local.comuna ||
                                      local.comuna_name,
                                    local.region ||
                                      local.region_name,
                                  ]
                                    .filter(
                                      Boolean,
                                    )
                                    .join(
                                      " · ",
                                    ) ||
                                    "Sin ubicación"}
                                </p>
                              </td>

                              <td className="p-4 align-top">
                                <p className="text-xs font-semibold text-gray-600">
                                  {local.company_name ||
                                    companies.find(
                                      (
                                        company,
                                      ) =>
                                        company.id ===
                                        local.company_id,
                                    )?.name ||
                                    "Sin información"}
                                </p>
                              </td>

                              <td className="p-4 align-top">
                                <StatusBadge
                                  active={
                                    local.is_active !==
                                    false
                                  }
                                />
                              </td>

                              <td className="p-4 align-top">
                                <div className="flex items-center justify-end gap-2">
                                  <IconButton
                                    label={
                                      local.is_active !==
                                      false
                                        ? "Desactivar local"
                                        : "Activar local"
                                    }
                                    size="sm"
                                    onClick={() =>
                                      toggleLocal(
                                        local,
                                      )
                                    }
                                  >
                                    {local.is_active !==
                                    false ? (
                                      <FiEyeOff
                                        size={14}
                                      />
                                    ) : (
                                      <FiEye
                                        size={14}
                                      />
                                    )}
                                  </IconButton>

                                  <IconButton
                                    label="Editar local"
                                    size="sm"
                                    onClick={() =>
                                      openEditModal(
                                        local,
                                      )
                                    }
                                  >
                                    <FiEdit
                                      size={14}
                                    />
                                  </IconButton>

                                  <IconButton
                                    label="Eliminar local"
                                    size="sm"
                                    variant="danger"
                                    onClick={() =>
                                      deleteLocal(
                                        local,
                                      )
                                    }
                                  >
                                    <FiTrash2
                                      size={14}
                                    />
                                  </IconButton>
                                </div>
                              </td>
                            </tr>
                          ),
                        )}
                      </tbody>
                    </table>
                  </div>
                </section>

                <section className="md:hidden space-y-3">
                  {visibleLocales.map(
                    (local) => (
                      <article
                        key={local.id}
                        className="bg-white p-4 rounded-[1.5rem] border border-gray-100 shadow-sm"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-3 min-w-0">
                            <div className="w-10 h-10 rounded-xl bg-[#87be00]/10 text-[#87be00] flex items-center justify-center shrink-0">
                              <FiMapPin
                                size={17}
                              />
                            </div>

                            <div className="min-w-0">
                              <p className="text-xs font-black text-gray-900 truncate">
                                {getLocalName(
                                  local,
                                )}
                              </p>

                              <p className="text-[9px] font-bold text-[#87be00] uppercase tracking-wider mt-1">
                                {local.codigo_local ||
                                  "Sin código"}
                              </p>
                            </div>
                          </div>

                          <StatusBadge
                            active={
                              local.is_active !==
                              false
                            }
                          />
                        </div>

                        <div className="mt-3 space-y-1">
                          <p className="text-[10px] text-gray-500">
                            {local.direccion ||
                              "Sin dirección"}
                          </p>

                          <p className="text-[9px] text-gray-400">
                            {[
                              local.comuna ||
                                local.comuna_name,
                              local.region ||
                                local.region_name,
                            ]
                              .filter(Boolean)
                              .join(" · ") ||
                              "Sin ubicación"}
                          </p>

                          <p className="text-[9px] text-gray-400">
                            {local.company_name ||
                              companies.find(
                                (
                                  company,
                                ) =>
                                  company.id ===
                                  local.company_id,
                              )?.name ||
                              "Sin información de empresa"}
                          </p>
                        </div>

                        <UserId
                          id={local.id}
                          onCopy={() =>
                            copyLocalId(
                              local,
                            )
                          }
                          className="mt-3"
                        />

                        <div className="grid grid-cols-3 gap-2 mt-4">
                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            leftIcon={
                              local.is_active !==
                              false ? (
                                <FiEyeOff
                                  size={13}
                                />
                              ) : (
                                <FiEye
                                  size={13}
                                />
                              )
                            }
                            onClick={() =>
                              toggleLocal(
                                local,
                              )
                            }
                          >
                            {local.is_active !==
                            false
                              ? "Ocultar"
                              : "Activar"}
                          </Button>

                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            leftIcon={
                              <FiEdit
                                size={13}
                              />
                            }
                            onClick={() =>
                              openEditModal(
                                local,
                              )
                            }
                          >
                            Editar
                          </Button>

                          <Button
                            type="button"
                            variant="danger"
                            size="sm"
                            leftIcon={
                              <FiTrash2
                                size={13}
                              />
                            }
                            onClick={() =>
                              deleteLocal(
                                local,
                              )
                            }
                          >
                            Eliminar
                          </Button>
                        </div>
                      </article>
                    ),
                  )}
                </section>
              </>
            )}
          </>
        )}
      </main>

      <CreateLocalModal
        isOpen={openCreate}
        onClose={() =>
          setOpenCreate(false)
        }
        onCreated={fetchLocales}
        companies={companies}
        companyId={
          selectedCompanyForModals
        }
      />

      <UploadLocalesModal
        isOpen={openUpload}
        onClose={() =>
          setOpenUpload(false)
        }
        onUploaded={fetchLocales}
        companies={companies}
        companyId={
          selectedCompanyForModals
        }
      />

      <EditLocalModal
        isOpen={openEdit}
        onClose={() => {
          setOpenEdit(false);
          setSelectedLocal(null);
        }}
        onUpdated={fetchLocales}
        companies={companies}
        local={selectedLocal}
      />
    </div>
  );
};

const UserId = ({
  id,
  onCopy,
  className = "",
}) => (
  <div
    className={`flex items-center gap-1.5 min-w-0 ${className}`}
  >
    <span
      className="flex-1 min-w-0 truncate bg-gray-50 border border-gray-100 rounded-xl px-3 py-2 font-mono text-[8px] text-gray-500 select-all"
      title={id}
    >
      ID: {id || "No disponible"}
    </span>

    <IconButton
      label="Copiar ID del local"
      size="xs"
      onClick={onCopy}
      disabled={!id}
      className="shrink-0"
    >
      <FiCopy size={11} />
    </IconButton>
  </div>
);

const StatusBadge = ({
  active,
}) => (
  <span
    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[8px] font-black uppercase tracking-wider whitespace-nowrap ${
      active
        ? "bg-green-50 text-green-700 border-green-200"
        : "bg-gray-50 text-gray-500 border-gray-200"
    }`}
  >
    <span
      className={`w-1.5 h-1.5 rounded-full ${
        active
          ? "bg-green-500"
          : "bg-gray-300"
      }`}
    />

    {active ? "Activo" : "Inactivo"}
  </span>
);

const InformationMessage = ({
  title,
  description,
  action,
}) => (
  <section className="bg-white border border-dashed border-gray-200 rounded-[2rem] px-6 py-12 text-center shadow-sm">
    <FiMapPin
      size={26}
      className="mx-auto text-gray-300"
    />

    <h2 className="text-lg font-black text-gray-800 mt-4">
      {title}
    </h2>

    {description && (
      <p className="text-sm text-gray-400 mt-2 max-w-xl mx-auto">
        {description}
      </p>
    )}

    {action && (
      <div className="mt-5">
        {action}
      </div>
    )}
  </section>
);

const inputClass = `
  w-full h-12 px-4
  bg-gray-50 border border-gray-100
  rounded-2xl
  text-xs font-bold text-gray-700
  outline-none transition-all
  focus:bg-white
  focus:border-[#87be00]/50
  focus:ring-4 focus:ring-[#87be00]/10
`;

const thClass =
  "p-4 text-[9px] font-black uppercase tracking-wider text-gray-500";

export default Locales;