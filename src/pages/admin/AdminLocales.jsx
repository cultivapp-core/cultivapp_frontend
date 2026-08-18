import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  Button,
  IconButton,
  StatusButton,
} from "../../components/ui";
import {
  FiEdit,
  FiGlobe,
  FiMapPin,
  FiPlus,
  FiSearch,
  FiShoppingCart,
  FiTrash2,
  FiUpload,
  FiHelpCircle,
  FiDownload,
  FiFileText,
  FiCheckCircle,
  FiAlertCircle,
  FiX,
  FiRefreshCw,
  FiBriefcase,
  FiEye,
  FiEyeOff,
} from "react-icons/fi";
import api from "../../api/apiClient";
import { useAuth } from "../../context/AuthContext";
import toast from "react-hot-toast";
import CreateLocalModal from "../root/CreateLocalModal";
import UploadLocalesModal from "../root/UploadLocalesModal";
import EditLocalModal from "../root/EditLocalModal";
import LocalesMap from "../../components/LocalesMap";
import { motion as Motion } from "framer-motion";
import * as XLSX from "xlsx";

const CULTIVA_COMPANY_ID =
  "0e342e01-d213-4353-b210-39a12ac335cf";

const AdminLocales = () => {
  const { user: currentUser } = useAuth();

  const [locales, setLocales] = useState([]);
  const [chains, setChains] = useState([]);
  const [regions, setRegions] = useState([]);
  const [comunas, setComunas] = useState([]);
  const [companies, setCompanies] = useState([]);

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCompanyId, setSelectedCompanyId] =
    useState("");
  const [selectedChain, setSelectedChain] = useState("");
  const [selectedRegion, setSelectedRegion] = useState("");
  const [selectedComuna, setSelectedComuna] = useState("");
  const [showInactive, setShowInactive] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const normalizedRole = String(
    currentUser?.role || "",
  )
    .trim()
    .toUpperCase();

  const isCultivaAdmin =
    normalizedRole === "ADMIN_CLIENTE" &&
    String(currentUser?.company_id) ===
      CULTIVA_COMPANY_ID;

  const isRegionalAdmin =
    normalizedRole ===
    "ADMIN_REGIONAL";

  const canManageLocales = !isRegionalAdmin;

  const [openCreate, setOpenCreate] = useState(false);
  const [openUpload, setOpenUpload] = useState(false);
  const [openUploadHelp, setOpenUploadHelp] = useState(false);
  const [openEdit, setOpenEdit] = useState(false);
  const [selectedLocal, setSelectedLocal] = useState(null);
  const [selectedMapLocal, setSelectedMapLocal] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deletingLocal, setDeletingLocal] = useState(false);

  const fetchLocalesAndCompanies = useCallback(async () => {
    try {
      setIsLoading(true);

      const authenticatedCompanyId = String(
        currentUser?.company_id || "",
      ).trim();

      if (
        isRegionalAdmin &&
        !authenticatedCompanyId
      ) {
        throw new Error(
          "Tu cuenta regional no tiene una empresa asignada",
        );
      }

      const localesEndpoint = isRegionalAdmin
        ? `/locales?company_id=${encodeURIComponent(
            authenticatedCompanyId,
          )}`
        : "/locales";

      const [localesData, companiesData] = await Promise.all([
        api.get(localesEndpoint),
        isRegionalAdmin
          ? Promise.resolve([])
          : api.get("/companies"),
      ]);

      const normalizedLocales =
        Array.isArray(localesData)
          ? localesData
          : localesData?.data || [];

      const normalizedCompanies =
        Array.isArray(companiesData)
          ? companiesData
          : companiesData?.data || [];

      setLocales(normalizedLocales);

      setCompanies(
        normalizedCompanies
          .filter(
            (company) =>
              company?.is_active !== false,
          )
          .sort((first, second) =>
            String(
              first?.name ||
                first?.nombre ||
                "",
            ).localeCompare(
              String(
                second?.name ||
                  second?.nombre ||
                  "",
              ),
              "es",
            ),
          ),
      );

      if (normalizedLocales) {
        setChains(
          [...new Set(normalizedLocales.map((local) => local.cadena))]
            .filter(Boolean)
            .sort(),
        );

        setRegions(
          [
            ...new Set(
              normalizedLocales.map(
                (local) => local.region_name || local.region,
              ),
            ),
          ]
            .filter(Boolean)
            .sort(),
        );
      }
    } catch (error) {
      setLocales([]);
      toast.error(
        error?.response?.data?.message ||
          error?.message ||
          "Error al cargar los locales",
      );
    } finally {
      setIsLoading(false);
    }
  }, [
    currentUser?.company_id,
    isRegionalAdmin,
  ]);

  useEffect(() => {
    fetchLocalesAndCompanies();
  }, [fetchLocalesAndCompanies]);

  const companyScopedLocales = useMemo(() => {
    if (isRegionalAdmin) {
      return locales.filter(
        (local) =>
          String(local.company_id) ===
          String(currentUser?.company_id),
      );
    }

    if (
      !isCultivaAdmin ||
      !selectedCompanyId
    ) {
      return locales;
    }

    return locales.filter(
      (local) =>
        String(local.company_id) ===
        String(selectedCompanyId),
    );
  }, [
    locales,
    currentUser?.company_id,
    isCultivaAdmin,
    isRegionalAdmin,
    selectedCompanyId,
  ]);

  useEffect(() => {
    const availableChains = [
      ...new Set(
        companyScopedLocales.map(
          (local) => local.cadena,
        ),
      ),
    ]
      .filter(Boolean)
      .sort((first, second) =>
        String(first).localeCompare(
          String(second),
          "es",
        ),
      );

    const availableRegions = [
      ...new Set(
        companyScopedLocales.map(
          (local) =>
            local.region_name ||
            local.region,
        ),
      ),
    ]
      .filter(Boolean)
      .sort((first, second) =>
        String(first).localeCompare(
          String(second),
          "es",
        ),
      );

    setChains(availableChains);
    setRegions(availableRegions);

    setSelectedChain((current) =>
      !current ||
      availableChains.includes(current)
        ? current
        : "",
    );

    setSelectedRegion((current) =>
      !current ||
      availableRegions.includes(current)
        ? current
        : "",
    );
  }, [companyScopedLocales]);

  useEffect(() => {
    const filteredComunas = [
      ...new Set(
        companyScopedLocales
          .filter(
            (local) =>
              !selectedRegion ||
              (local.region_name ||
                local.region) ===
                selectedRegion,
          )
          .map(
            (local) =>
              local.comuna_name ||
              local.comuna,
          ),
      ),
    ]
      .filter(Boolean)
      .sort((first, second) =>
        String(first).localeCompare(
          String(second),
          "es",
        ),
      );

    setComunas(filteredComunas);

    setSelectedComuna((current) =>
      !current ||
      filteredComunas.includes(current)
        ? current
        : "",
    );
  }, [
    selectedRegion,
    companyScopedLocales,
  ]);

  const filteredLocales = useMemo(() => {
    return companyScopedLocales.filter((local) => {
      const term = searchTerm.toLowerCase().trim();

      const matchesChain =
        selectedChain === "" || local.cadena === selectedChain;

      const matchesRegion =
        selectedRegion === "" ||
        (local.region_name || local.region) === selectedRegion;

      const matchesComuna =
        selectedComuna === "" ||
        (local.comuna_name || local.comuna) === selectedComuna;

      const matchesActive =
        showInactive ||
        local.is_active !== false;

      const matchesSearch =
        local.cadena?.toLowerCase().includes(term) ||
        local.codigo_local
          ?.toString()
          .toLowerCase()
          .includes(term) ||
        (local.comuna_name || local.comuna)
          ?.toLowerCase()
          .includes(term) ||
        local.direccion?.toLowerCase().includes(term);

      return (
        matchesActive &&
        matchesSearch &&
        matchesChain &&
        matchesRegion &&
        matchesComuna
      );
    });
  }, [
    companyScopedLocales,
    searchTerm,
    selectedChain,
    selectedRegion,
    selectedComuna,
    showInactive,
  ]);

  useEffect(() => {
    if (
      selectedMapLocal &&
      !filteredLocales.some(
        (local) => String(local.id) === String(selectedMapLocal.id),
      )
    ) {
      setSelectedMapLocal(null);
    }
  }, [filteredLocales, selectedMapLocal]);

  const hasFilters =
    Boolean(searchTerm) ||
    Boolean(selectedCompanyId) ||
    Boolean(selectedChain) ||
    Boolean(selectedRegion) ||
    Boolean(selectedComuna) ||
    Boolean(showInactive);

  const clearFilters = () => {
    setSearchTerm("");
    setSelectedCompanyId("");
    setSelectedChain("");
    setSelectedRegion("");
    setSelectedComuna("");
    setShowInactive(false);
    setSelectedMapLocal(null);
  };

  const handleEdit = (local) => {
    setSelectedLocal(local);
    setOpenEdit(true);
  };

  const toggleLocal = async (id) => {
    try {
      await api.patch(`/locales/${id}/toggle`);

      setLocales((prev) =>
        prev.map((local) =>
          local.id === id
            ? { ...local, is_active: !local.is_active }
            : local,
        ),
      );

      toast.success("Estado actualizado");
    } catch {
      toast.error("Error al cambiar estado");
    }
  };

  const deleteLocal = (local) => {
    if (!local || deletingLocal) return;
    setDeleteTarget(local);
  };

  const closeDeleteModal = () => {
    if (deletingLocal) return;
    setDeleteTarget(null);
  };

  const confirmDeleteLocal = async () => {
    if (!deleteTarget?.id || deletingLocal) {
      return;
    }

    try {
      setDeletingLocal(true);

      await api.delete(
        `/locales/${deleteTarget.id}`,
      );

      setLocales((prev) =>
        prev.filter(
          (item) =>
            item.id !== deleteTarget.id,
        ),
      );

      toast.success(
        "Local eliminado correctamente",
      );

      setDeleteTarget(null);
    } catch (error) {
      toast.error(
        error?.response?.data?.message ||
          error?.message ||
          "No se pudo eliminar el local",
      );
    } finally {
      setDeletingLocal(false);
    }
  };

  return (
    <div className="min-h-full bg-gray-50/40 pb-20 font-[Outfit]">
      {/* ENCABEZADO */}
      <header className="border-b border-gray-100 bg-white">
        <div className="mx-auto flex max-w-[1500px] flex-col gap-5 px-4 py-5 sm:px-6 md:px-8 md:py-8 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex items-center gap-3.5">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#87be00]/10 text-[#87be00]">
              <FiShoppingCart size={21} />
            </div>

            <div>
              <h1 className="text-3xl font-black leading-none tracking-tight text-gray-900 md:text-5xl">
                Gestión de locales
              </h1>

              <p className="mt-2 text-[10px] font-black uppercase tracking-[0.2em] text-[#87be00]">
                {isRegionalAdmin
                  ? `Locales de ${
                      currentUser?.company_name ||
                      "tu empresa"
                    }`
                  : "Administración de puntos y geocercas"}
              </p>
            </div>
          </div>

          {canManageLocales ? (
            <div className="flex w-full items-center gap-2 md:gap-3 lg:w-auto">
              <div className="group relative shrink-0">
                <IconButton
                  label="Ver formato de carga masiva de locales"
                  size="lg"
                  onClick={() => setOpenUploadHelp(true)}
                  className="shrink-0"
                >
                  <FiHelpCircle size={19} />
                </IconButton>

                <div className="pointer-events-none absolute left-0 top-[calc(100%+10px)] z-[300] hidden w-64 rounded-2xl border border-gray-100 bg-gray-900 px-4 py-3 text-left shadow-2xl group-hover:block">
                  <p className="text-[9px] font-black uppercase tracking-[0.16em] text-[#87be00]">
                    Formato de carga
                  </p>

                  <p className="mt-1 text-[10px] font-medium leading-relaxed text-gray-300">
                    Revisa las columnas requeridas y descarga la plantilla oficial para cargar locales.
                  </p>

                  <div className="absolute -top-1.5 left-4 h-3 w-3 rotate-45 bg-gray-900" />
                </div>
              </div>

              <Button
                type="button"
                variant="outline"
                size="lg"
                leftIcon={<FiUpload size={16} />}
                onClick={() => setOpenUpload(true)}
                className="min-w-0 flex-1 whitespace-nowrap lg:flex-none"
              >
                Importar locales
              </Button>

              <Button
                type="button"
                size="lg"
                leftIcon={<FiPlus size={18} />}
                onClick={() => setOpenCreate(true)}
                className="min-w-0 flex-1 whitespace-nowrap lg:flex-none"
              >
                Crear local
              </Button>
            </div>
          ) : (
            <div className="inline-flex w-max items-center gap-2 rounded-2xl border border-[#87be00]/20 bg-[#87be00]/10 px-4 py-3 text-[9px] font-black uppercase tracking-[0.14em] text-[#679300]">
              <FiEye size={15} />
              Vista de los locales de tu empresa
            </div>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-[1500px] space-y-6 px-4 pt-6 sm:px-6 md:px-8">
        {/* FILTROS */}
        <section className="rounded-[2rem] border border-gray-100 bg-white p-3 shadow-sm sm:p-4">
          <div
            className={`grid grid-cols-1 gap-3 sm:grid-cols-2 ${
              isCultivaAdmin
                ? "xl:grid-cols-[minmax(190px,1fr)_minmax(230px,1.2fr)_repeat(3,minmax(180px,1fr))_210px]"
                : "xl:grid-cols-[minmax(230px,1.2fr)_repeat(3,minmax(180px,1fr))_210px]"
            }`}
          >
            {isCultivaAdmin && (
              <FilterSelect
                icon={<FiBriefcase size={15} />}
                value={selectedCompanyId}
                onChange={(event) => {
                  setSelectedCompanyId(
                    event.target.value,
                  );
                  setSelectedChain("");
                  setSelectedRegion("");
                  setSelectedComuna("");
                }}
                className="min-w-0"
              >
                <option value="">
                  Todas las empresas
                </option>

                {companies.map((company) => (
                  <option
                    key={company.id}
                    value={company.id}
                  >
                    {company.name ||
                      company.nombre ||
                      "Empresa"}
                  </option>
                ))}
              </FilterSelect>
            )}

            <div className="relative min-w-0">
              <FiSearch
                className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
                size={15}
              />

              <input
                type="search"
                placeholder="Código, cadena, dirección..."
                value={searchTerm}
                onChange={(event) =>
                  setSearchTerm(
                    event.target.value,
                  )
                }
                className={`${filterControlClass} pl-11 pr-10`}
              />

              {searchTerm && (
                <button
                  type="button"
                  aria-label="Limpiar búsqueda"
                  onClick={() =>
                    setSearchTerm("")
                  }
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 transition-colors hover:text-red-500"
                >
                  <FiX size={14} />
                </button>
              )}
            </div>

            <FilterSelect
              icon={<FiShoppingCart size={15} />}
              value={selectedChain}
              onChange={(event) =>
                setSelectedChain(
                  event.target.value,
                )
              }
              className="min-w-0"
            >
              <option value="">
                Todas las cadenas
              </option>

              {chains.map((chain) => (
                <option
                  key={chain}
                  value={chain}
                >
                  {chain}
                </option>
              ))}
            </FilterSelect>

            <FilterSelect
              icon={<FiGlobe size={15} />}
              value={selectedRegion}
              onChange={(event) =>
                setSelectedRegion(
                  event.target.value,
                )
              }
              className="min-w-0"
            >
              <option value="">
                Todas las regiones
              </option>

              {regions.map((region) => (
                <option
                  key={region}
                  value={region}
                >
                  {region}
                </option>
              ))}
            </FilterSelect>

            <FilterSelect
              icon={<FiMapPin size={15} />}
              value={selectedComuna}
              onChange={(event) =>
                setSelectedComuna(
                  event.target.value,
                )
              }
              disabled={!selectedRegion}
              className="min-w-0"
            >
              <option value="">
                Todas las comunas
              </option>

              {comunas.map((comuna) => (
                <option
                  key={comuna}
                  value={comuna}
                >
                  {comuna}
                </option>
              ))}
            </FilterSelect>

            <button
              type="button"
              role="switch"
              aria-checked={showInactive}
              onClick={() =>
                setShowInactive(
                  (current) => !current,
                )
              }
              className="flex h-12 min-w-0 items-center justify-between gap-3 rounded-2xl border border-gray-100 bg-gray-50 px-4 text-left transition-all hover:border-[#87be00]/30 hover:bg-[#87be00]/5"
            >
              <span className="flex min-w-0 items-center gap-2">
                <FiEyeOff
                  size={15}
                  className={
                    showInactive
                      ? "shrink-0 text-[#87be00]"
                      : "shrink-0 text-gray-400"
                  }
                />

                <span className="truncate text-[9px] font-black uppercase tracking-[0.1em] text-gray-500">
                  Mostrar inactivos
                </span>
              </span>

              <span
                className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
                  showInactive
                    ? "bg-[#87be00]"
                    : "bg-gray-200"
                }`}
              >
                <span
                  className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${
                    showInactive
                      ? "translate-x-6"
                      : "translate-x-1"
                  }`}
                />
              </span>
            </button>
          </div>

          {hasFilters && (
            <div className="mt-3 flex justify-end">
              <button
                type="button"
                onClick={clearFilters}
                className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-[9px] font-black uppercase tracking-[0.12em] text-gray-400 transition-colors hover:bg-red-50 hover:text-red-500"
              >
                <FiX size={13} />
                Limpiar filtros
              </button>
            </div>
          )}
        </section>

        {/* MAPA */}
        <section className="overflow-hidden rounded-[2rem] border border-gray-100 bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-gray-100 bg-gray-50/50 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <div>
              <p className="text-[9px] font-black uppercase tracking-[0.18em] text-gray-400">
                Ubicación de puntos de venta
              </p>

              <p className="mt-1 text-[11px] font-semibold text-gray-500">
                Visualización geográfica de los locales filtrados.
              </p>
            </div>

            <span className="inline-flex w-max items-center rounded-full border border-[#87be00]/20 bg-[#87be00]/10 px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.12em] text-[#679300]">
              {filteredLocales.length} local
              {filteredLocales.length === 1 ? "" : "es"}
            </span>
          </div>

          <div className="h-[300px] w-full bg-gray-50 sm:h-[380px] lg:h-[420px]">
            {filteredLocales.length > 0 ? (
              <LocalesMap
                locales={filteredLocales}
                selectedLocal={selectedMapLocal}
              />
            ) : (
              <EmptyState
                title={
                  isLoading
                    ? "Cargando locales"
                    : "Sin información disponible"
                }
                description={
                  isLoading
                    ? "Estamos consultando los locales de tu empresa."
                    : "No existen locales que coincidan con los filtros seleccionados."
                }
              />
            )}
          </div>
        </section>

        {/* TABLA DESKTOP */}
        <section className="hidden overflow-hidden rounded-[2rem] border border-gray-100 bg-white shadow-sm md:block">
          <div className="flex items-center justify-between gap-4 border-b border-gray-100 bg-gray-50/50 px-6 py-4">
            <div>
              <p className="text-[9px] font-black uppercase tracking-[0.18em] text-gray-400">
                Listado de locales
              </p>

              <p className="mt-1 text-[11px] font-semibold text-gray-500">
                {canManageLocales
                  ? "Estado, ubicación y acciones disponibles."
                  : "Estado y ubicación de los locales asociados a tu empresa."}
              </p>
            </div>

            <button
              type="button"
              onClick={fetchLocalesAndCompanies}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-gray-100 bg-white text-gray-400 transition-all hover:border-[#87be00]/30 hover:bg-[#87be00]/5 hover:text-[#87be00]"
              aria-label="Actualizar locales"
            >
              <FiRefreshCw size={16} />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-gray-100 bg-white">
                  <th className={thClass}>Local</th>
                  <th className={thClass}>Ubicación</th>
                  <th className={thClass}>Dirección</th>
                  <th className={`${thClass} text-center`}>Estado</th>
                  {canManageLocales && (
                    <th className={`${thClass} text-right`}>Acciones</th>
                  )}
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-50">
                {filteredLocales.length > 0 ? (
                  filteredLocales.map((local) => (
                    <tr
                      key={local.id}
                      onClick={() => setSelectedMapLocal(local)}
                      aria-selected={
                        String(selectedMapLocal?.id || "") ===
                        String(local.id)
                      }
                      className={`cursor-pointer transition-all ${
                        String(selectedMapLocal?.id || "") === String(local.id)
                          ? "bg-[#87be00]/5 ring-1 ring-inset ring-[#87be00]/20"
                          : "hover:bg-gray-50/60"
                      }`}
                    >
                      <td className="p-5 align-top">
                        <div className="flex items-start gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#87be00]/10 text-[#87be00]">
                            <FiShoppingCart size={16} />
                          </div>

                          <div className="min-w-0">
                            <p className="text-xs font-black text-gray-900">
                              {local.cadena || "Local sin cadena"}
                            </p>

                            <span className="mt-2 inline-flex rounded-lg border border-gray-100 bg-gray-50 px-2.5 py-1 font-mono text-[8px] font-black tracking-wider text-gray-500">
                              {local.codigo_local || "Sin código"}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="p-5 align-top">
                        <div className="flex items-start gap-2">
                          <FiMapPin
                            className="mt-0.5 shrink-0 text-[#87be00]"
                            size={14}
                          />

                          <div>
                            <p className="text-xs font-bold text-gray-700">
                              {local.comuna_name ||
                                local.comuna ||
                                "Sin comuna"}
                            </p>

                            <p className="mt-1 text-[9px] font-medium text-gray-400">
                              {local.region_name ||
                                local.region ||
                                "Sin región"}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="p-5 align-top">
                        <p className="max-w-sm text-xs font-medium leading-relaxed text-gray-500">
                          {local.direccion || "Sin dirección"}
                        </p>
                      </td>

                      <td
                        className="p-5 text-center align-top"
                        onClick={(event) => event.stopPropagation()}
                      >
                        {canManageLocales ? (
                          <StatusButton
                            active={local.is_active}
                            onClick={() => toggleLocal(local.id)}
                          />
                        ) : (
                          <ReadOnlyStatus active={local.is_active} />
                        )}
                      </td>

                      {canManageLocales && (
                        <td
                          className="p-5 align-top"
                          onClick={(event) => event.stopPropagation()}
                        >
                          <div className="flex justify-end gap-2">
                            <IconButton
                              label={`Editar local ${local.cadena}`}
                              size="sm"
                              onClick={() => handleEdit(local)}
                            >
                              <FiEdit size={14} />
                            </IconButton>

                            <IconButton
                              label={`Eliminar local ${local.cadena}`}
                              size="sm"
                              variant="danger"
                              onClick={() => deleteLocal(local)}
                            >
                              <FiTrash2 size={14} />
                            </IconButton>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={canManageLocales ? 5 : 4} className="p-6">
                      <EmptyState
                        title={
                          isLoading
                            ? "Cargando locales"
                            : "Sin información disponible"
                        }
                        description={
                          isLoading
                            ? "Estamos consultando los locales de tu empresa."
                            : "No existen locales que coincidan con los filtros seleccionados."
                        }
                        compact
                      />
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* VISTA MÓVIL */}
        <section className="space-y-3 md:hidden">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-[9px] font-black uppercase tracking-[0.18em] text-gray-400">
                Resultados
              </p>

              <p className="mt-1 text-2xl font-black text-gray-900">
                {filteredLocales.length}
              </p>
            </div>

            <button
              type="button"
              onClick={fetchLocalesAndCompanies}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-gray-100 bg-white text-gray-400 shadow-sm transition-all hover:text-[#87be00]"
              aria-label="Actualizar locales"
            >
              <FiRefreshCw size={16} />
            </button>
          </div>

          {filteredLocales.length > 0 ? (
            filteredLocales.map((local, index) => (
              <Motion.article
                key={local.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.03 }}
                onClick={() => setSelectedMapLocal(local)}
                aria-selected={
                  String(selectedMapLocal?.id || "") === String(local.id)
                }
                className={`cursor-pointer rounded-[1.6rem] border bg-white p-4 shadow-sm transition-all ${
                  String(selectedMapLocal?.id || "") === String(local.id)
                    ? "border-[#87be00]/40 ring-2 ring-[#87be00]/10"
                    : "border-gray-100"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#87be00]/10 text-[#87be00]">
                      <FiShoppingCart size={16} />
                    </div>

                    <div className="min-w-0">
                      <h3 className="truncate text-sm font-black text-gray-900">
                        {local.cadena || "Local sin cadena"}
                      </h3>

                      <p className="mt-1 font-mono text-[8px] font-bold uppercase tracking-wider text-[#679300]">
                        {local.codigo_local || "Sin código"}
                      </p>
                    </div>
                  </div>

                  {canManageLocales ? (
                    <div onClick={(event) => event.stopPropagation()}>
                      <StatusButton
                        active={local.is_active}
                        onClick={() => toggleLocal(local.id)}
                      />
                    </div>
                  ) : (
                    <ReadOnlyStatus active={local.is_active} />
                  )}
                </div>

                <div className="mt-4 space-y-2 rounded-2xl border border-gray-100 bg-gray-50/70 p-3.5">
                  <p className="flex items-start gap-2 text-[10px] font-semibold text-gray-600">
                    <FiMapPin
                      className="mt-0.5 shrink-0 text-[#87be00]"
                      size={13}
                    />

                    <span>
                      {local.comuna_name ||
                        local.comuna ||
                        "Sin comuna"}
                      {local.region_name || local.region
                        ? ` · ${local.region_name || local.region}`
                        : ""}
                    </span>
                  </p>

                  <p className="text-[10px] font-medium leading-relaxed text-gray-500">
                    {local.direccion || "Sin dirección"}
                  </p>
                </div>

                {canManageLocales && (
                  <div
                    className="mt-4 grid grid-cols-2 gap-2 border-t border-gray-50 pt-4"
                    onClick={(event) => event.stopPropagation()}
                  >
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      leftIcon={<FiEdit size={13} />}
                      onClick={() => handleEdit(local)}
                    >
                      Editar
                    </Button>

                    <Button
                      type="button"
                      variant="danger"
                      size="sm"
                      leftIcon={<FiTrash2 size={13} />}
                      onClick={() => deleteLocal(local)}
                    >
                      Eliminar
                    </Button>
                  </div>
                )}
              </Motion.article>
            ))
          ) : (
            <EmptyState
              title={
                isLoading
                  ? "Cargando locales"
                  : "Sin información disponible"
              }
              description={
                isLoading
                  ? "Estamos consultando los locales de tu empresa."
                  : "No existen locales que coincidan con los filtros seleccionados."
              }
            />
          )}
        </section>
      </main>

      {canManageLocales && openUploadHelp && (
        <BulkLocalesHelpModal
          onClose={() => setOpenUploadHelp(false)}
        />
      )}

      {canManageLocales && (
        <>
          <CreateLocalModal
            isOpen={openCreate}
            onClose={() => setOpenCreate(false)}
            onCreated={fetchLocalesAndCompanies}
            companies={companies}
          />

          <UploadLocalesModal
            isOpen={openUpload}
            onClose={() => setOpenUpload(false)}
            onUploaded={fetchLocalesAndCompanies}
            companies={companies}
          />
        </>
      )}

      {canManageLocales && selectedLocal && (
        <EditLocalModal
          isOpen={openEdit}
          onClose={() => {
            setOpenEdit(false);
            setSelectedLocal(null);
          }}
          onUpdated={fetchLocalesAndCompanies}
          local={selectedLocal}
          companies={companies}
        />
      )}

      {canManageLocales && deleteTarget && (
        <DeleteLocalModal
          local={deleteTarget}
          loading={deletingLocal}
          onClose={closeDeleteModal}
          onConfirm={confirmDeleteLocal}
        />
      )}
    </div>
  );
};

const DeleteLocalModal = ({
  local,
  loading,
  onClose,
  onConfirm,
}) => {
  const localName =
    local?.nombre_local ||
    local?.cadena ||
    "Local";

  const localCode =
    local?.codigo_local ||
    "Sin código";

  const localAddress =
    local?.direccion ||
    "Sin dirección registrada";

  return (
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center bg-[#111111]/70 p-3 font-[Outfit] backdrop-blur-sm sm:p-5"
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-local-title"
      onMouseDown={(event) => {
        if (
          event.target === event.currentTarget &&
          !loading
        ) {
          onClose();
        }
      }}
    >
      <div className="relative w-full max-w-lg overflow-hidden rounded-[2rem] border border-white/60 bg-white shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        <div className="absolute inset-x-0 top-0 h-1 bg-red-500" />

        <header className="flex items-start justify-between gap-4 border-b border-gray-100 px-5 py-5 sm:px-7 sm:py-6">
          <div className="flex min-w-0 items-start gap-3.5">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-red-50 text-red-500">
              <FiTrash2 size={21} />
            </div>

            <div className="min-w-0">
              <p className="text-[9px] font-black uppercase tracking-[0.22em] text-red-500">
                Confirmar eliminación
              </p>

              <h2
                id="delete-local-title"
                className="mt-1 text-xl font-black leading-tight tracking-tight text-gray-900 sm:text-2xl"
              >
                Eliminar local
              </h2>

              <p className="mt-2 text-[11px] font-medium leading-relaxed text-gray-400">
                Revisa la información antes de continuar.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            aria-label="Cerrar modal de eliminación"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-gray-100 bg-gray-50 text-gray-400 transition-all hover:border-red-100 hover:bg-red-50 hover:text-red-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <FiX size={18} />
          </button>
        </header>

        <div className="space-y-4 bg-gray-50/40 px-5 py-5 sm:px-7 sm:py-6">
          <section className="rounded-[1.5rem] border border-red-100 bg-red-50/70 p-4 sm:p-5">
            <div className="flex items-start gap-3">
              <FiAlertCircle
                className="mt-0.5 shrink-0 text-red-500"
                size={18}
              />

              <div>
                <h3 className="text-[10px] font-black uppercase tracking-[0.14em] text-red-600">
                  Esta acción requiere confirmación
                </h3>

                <p className="mt-2 text-[11px] font-semibold leading-relaxed text-red-700/80">
                  Se eliminará el local seleccionado de la gestión de locales.
                  Confirma que corresponde al registro correcto antes de continuar.
                </p>
              </div>
            </div>
          </section>

          <section className="overflow-hidden rounded-[1.5rem] border border-gray-100 bg-white shadow-sm">
            <div className="flex items-start gap-3 border-b border-gray-100 p-4 sm:p-5">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#87be00]/10 text-[#87be00]">
                <FiShoppingCart size={17} />
              </div>

              <div className="min-w-0">
                <p className="text-sm font-black text-gray-900">
                  {localName}
                </p>

                <span className="mt-2 inline-flex rounded-lg border border-gray-100 bg-gray-50 px-2.5 py-1 font-mono text-[8px] font-black tracking-wider text-gray-500">
                  {localCode}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2 sm:p-5">
              <div className="rounded-2xl border border-gray-100 bg-gray-50 px-3.5 py-3">
                <p className="text-[8px] font-black uppercase tracking-[0.14em] text-gray-400">
                  Cadena
                </p>
                <p className="mt-1 text-[10px] font-bold text-gray-700">
                  {local?.cadena || "Sin cadena"}
                </p>
              </div>

              <div className="rounded-2xl border border-gray-100 bg-gray-50 px-3.5 py-3">
                <p className="text-[8px] font-black uppercase tracking-[0.14em] text-gray-400">
                  Código
                </p>
                <p className="mt-1 break-all font-mono text-[10px] font-bold text-gray-700">
                  {localCode}
                </p>
              </div>

              <div className="rounded-2xl border border-gray-100 bg-gray-50 px-3.5 py-3 sm:col-span-2">
                <p className="text-[8px] font-black uppercase tracking-[0.14em] text-gray-400">
                  Dirección
                </p>
                <p className="mt-1 text-[10px] font-semibold leading-relaxed text-gray-600">
                  {localAddress}
                </p>
              </div>
            </div>
          </section>
        </div>

        <footer className="grid grid-cols-1 gap-3 border-t border-gray-100 bg-white px-5 py-4 sm:grid-cols-2 sm:px-7">
          <Button
            type="button"
            variant="secondary"
            size="lg"
            fullWidth
            disabled={loading}
            onClick={onClose}
          >
            Cancelar
          </Button>

          <Button
            type="button"
            variant="danger"
            size="lg"
            fullWidth
            loading={loading}
            loadingText="Eliminando..."
            leftIcon={
              !loading ? (
                <FiTrash2 size={15} />
              ) : null
            }
            onClick={onConfirm}
          >
            Eliminar local
          </Button>
        </footer>
      </div>
    </div>
  );
};

const ReadOnlyStatus = ({ active }) => (
  <span
    className={`inline-flex min-w-[84px] items-center justify-center rounded-full border px-3 py-1.5 text-[8px] font-black uppercase tracking-[0.12em] ${
      active
        ? "border-emerald-100 bg-emerald-50 text-emerald-600"
        : "border-gray-200 bg-gray-100 text-gray-400"
    }`}
  >
    {active ? "Activo" : "Inactivo"}
  </span>
);

const FilterSelect = ({
  icon,
  children,
  className = "",
  ...props
}) => (
  <div className={`relative ${className}`}>
    <div className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
      {icon}
    </div>

    <select
      {...props}
      className={`${filterControlClass} appearance-none pl-11 pr-10`}
    >
      {children}
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
);

const EmptyState = ({
  title,
  description,
  compact = false,
}) => (
  <div
    className={`flex h-full flex-col items-center justify-center px-6 text-center ${
      compact ? "py-10" : "py-14"
    }`}
  >
    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gray-100 text-gray-300">
      <FiMapPin size={21} />
    </div>

    <h3 className="mt-4 text-base font-black text-gray-800">
      {title}
    </h3>

    {description && (
      <p className="mt-2 max-w-xl text-xs font-medium leading-relaxed text-gray-400">
        {description}
      </p>
    )}
  </div>
);

const BulkLocalesHelpModal = ({ onClose }) => {
  const handleDownloadTemplate = () => {
    const headers = [
      "codigo",
      "cadena",
      "direccion",
      "comuna",
      "gerente",
      "telefono",
    ];

    const localesSheet =
      XLSX.utils.aoa_to_sheet([headers]);

    localesSheet["!cols"] = [
      { wch: 18 },
      { wch: 24 },
      { wch: 42 },
      { wch: 24 },
      { wch: 28 },
      { wch: 20 },
    ];

    localesSheet["!autofilter"] = {
      ref: "A1:F1",
    };

    const instructionsSheet =
      XLSX.utils.aoa_to_sheet([
        [
          "Campo",
          "Obligatorio",
          "Descripción",
          "Ejemplo",
        ],
        [
          "codigo",
          "Sí",
          "Código interno único del local dentro de la empresa.",
          "101",
        ],
        [
          "cadena",
          "Sí",
          "Nombre de la cadena o punto de venta.",
          "TOTTUS",
        ],
        [
          "direccion",
          "Sí",
          "Dirección completa del local.",
          "Av. Principal 1234",
        ],
        [
          "comuna",
          "Sí",
          "Nombre de la comuna reconocida por CultivApp.",
          "Santiago",
        ],
        [
          "gerente",
          "No",
          "Nombre del gerente o responsable.",
          "Ana Pérez",
        ],
        [
          "telefono",
          "No",
          "Teléfono del local o responsable.",
          "+56 9 1234 5678",
        ],
      ]);

    instructionsSheet["!cols"] = [
      { wch: 18 },
      { wch: 14 },
      { wch: 58 },
      { wch: 28 },
    ];

    const workbook =
      XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(
      workbook,
      localesSheet,
      "Locales",
    );

    XLSX.utils.book_append_sheet(
      workbook,
      instructionsSheet,
      "Instrucciones",
    );

    XLSX.writeFile(
      workbook,
      "Carga_Masiva_Locales.xlsx",
      {
        bookType: "xlsx",
        compression: true,
      },
    );
  };

  const columns = [
    {
      name: "codigo",
      description:
        "Código interno único del local dentro de la empresa.",
      example: "101",
      required: true,
    },
    {
      name: "cadena",
      description:
        "Nombre de la cadena, supermercado o punto de venta.",
      example: "TOTTUS",
      required: true,
    },
    {
      name: "direccion",
      description:
        "Dirección completa utilizada para identificar el local.",
      example:
        "Av. Libertador Bernardo O'Higgins 528",
      required: true,
    },
    {
      name: "comuna",
      description:
        "Nombre de la comuna tal como se encuentra registrada en CultivApp.",
      example: "San Bernardo",
      required: true,
    },
    {
      name: "gerente",
      description:
        "Nombre del gerente, jefe o responsable del local.",
      example: "Ana Pérez",
      required: false,
    },
    {
      name: "telefono",
      description:
        "Teléfono del local o de su responsable.",
      example: "+56 9 1234 5678",
      required: false,
    },
  ];

  return (
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center bg-[#111111]/70 p-3 font-[Outfit] backdrop-blur-sm sm:p-5"
      role="dialog"
      aria-modal="true"
      aria-labelledby="bulk-locales-help-title"
    >
      <div className="relative flex max-h-[94vh] w-full max-w-3xl flex-col overflow-hidden rounded-[2rem] border border-white/60 bg-white shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        <header className="relative shrink-0 border-b border-gray-100 bg-white px-5 py-5 sm:px-7 sm:py-6">
          <div className="absolute inset-x-0 top-0 h-1 bg-[#87be00]" />

          <div className="flex items-start justify-between gap-4">
            <div className="flex min-w-0 items-center gap-3.5">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#87be00]/10 text-[#87be00]">
                <FiFileText size={20} />
              </div>

              <div className="min-w-0">
                <p className="text-[9px] font-black uppercase tracking-[0.22em] text-[#87be00]">
                  Carga masiva
                </p>

                <h2
                  id="bulk-locales-help-title"
                  className="mt-1 text-xl font-black leading-none tracking-tight text-gray-900 sm:text-2xl"
                >
                  Formato de locales
                </h2>

                <p className="mt-2 text-[11px] font-medium leading-relaxed text-gray-400">
                  Descarga la plantilla oficial y conserva exactamente sus encabezados.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label="Cerrar ayuda de carga masiva"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-gray-100 bg-gray-50 text-gray-400 transition-all hover:border-red-100 hover:bg-red-50 hover:text-red-500"
            >
              <FiX size={18} />
            </button>
          </div>
        </header>

        <div className="custom-scrollbar min-h-0 flex-1 space-y-5 overflow-y-auto overscroll-contain bg-gray-50/40 px-5 py-5 sm:px-7 sm:py-6">
          <section className="rounded-[1.6rem] border border-[#87be00]/20 bg-[#87be00]/5 p-4 sm:p-5">
            <div className="flex items-start gap-3">
              <FiAlertCircle
                className="mt-0.5 shrink-0 text-[#679300]"
                size={17}
              />

              <div>
                <h3 className="text-[10px] font-black uppercase tracking-[0.16em] text-[#679300]">
                  Empresa de destino
                </h3>

                <p className="mt-2 text-[11px] font-semibold leading-relaxed text-gray-600">
                  Los locales se asociarán a la empresa definida por el módulo de carga masiva. La plantilla no requiere una columna company_id.
                </p>
              </div>
            </div>
          </section>

          <section className="overflow-hidden rounded-[1.6rem] border border-gray-100 bg-white shadow-sm">
            <div className="border-b border-gray-100 px-4 py-4 sm:px-5">
              <h3 className="text-[10px] font-black uppercase tracking-[0.16em] text-gray-800">
                Leyenda de columnas
              </h3>

              <p className="mt-1 text-[10px] font-medium text-gray-400">
                Mantén los encabezados en minúsculas y sin espacios adicionales.
              </p>
            </div>

            <div className="divide-y divide-gray-100">
              {columns.map((column) => (
                <div
                  key={column.name}
                  className="grid grid-cols-1 gap-2 px-4 py-4 sm:grid-cols-[155px_1fr] sm:px-5"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex rounded-lg border border-[#87be00]/20 bg-[#87be00]/10 px-2.5 py-1 font-mono text-[9px] font-black text-[#679300]">
                      {column.name}
                    </span>

                    <span
                      className={`rounded-full border px-2 py-1 text-[7px] font-black uppercase tracking-wider ${
                        column.required
                          ? "border-red-100 bg-red-50 text-red-500"
                          : "border-gray-100 bg-gray-50 text-gray-400"
                      }`}
                    >
                      {column.required
                        ? "Obligatorio"
                        : "Opcional"}
                    </span>
                  </div>

                  <div>
                    <p className="text-[10px] font-semibold leading-relaxed text-gray-600">
                      {column.description}
                    </p>

                    <p className="mt-1 text-[9px] font-medium text-gray-400">
                      Ejemplo:{" "}
                      <strong className="text-gray-600">
                        {column.example}
                      </strong>
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-[1.6rem] border border-gray-100 bg-white p-4 shadow-sm sm:p-5">
            <h3 className="text-[10px] font-black uppercase tracking-[0.16em] text-gray-800">
              Antes de importar
            </h3>

            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {[
                "Completa los datos en la hoja Locales.",
                "No cambies los nombres de los encabezados.",
                "Usa un código único para cada local.",
                "No dejes filas vacías entre registros.",
                "No combines celdas ni agregues títulos superiores.",
                "Guarda el archivo en formato .xlsx.",
              ].map((rule) => (
                <div
                  key={rule}
                  className="flex items-start gap-2 rounded-2xl border border-gray-100 bg-gray-50 px-3.5 py-3"
                >
                  <FiCheckCircle
                    className="mt-0.5 shrink-0 text-[#87be00]"
                    size={14}
                  />

                  <span className="text-[10px] font-semibold leading-relaxed text-gray-600">
                    {rule}
                  </span>
                </div>
              ))}
            </div>
          </section>
        </div>

        <footer className="grid shrink-0 grid-cols-1 gap-3 border-t border-gray-100 bg-white px-5 py-4 sm:grid-cols-[auto_1fr] sm:px-7">
          <button
            type="button"
            onClick={onClose}
            className="order-2 rounded-2xl border border-gray-100 bg-gray-50 px-6 py-3.5 text-[9px] font-black uppercase tracking-[0.16em] text-gray-500 transition-all hover:bg-gray-100 sm:order-1"
          >
            Cerrar
          </button>

          <button
            type="button"
            onClick={handleDownloadTemplate}
            className="order-1 flex items-center justify-center gap-2 rounded-2xl bg-gray-900 px-6 py-3.5 text-[9px] font-black uppercase tracking-[0.18em] text-white shadow-lg shadow-gray-200 transition-all hover:bg-[#87be00] sm:order-2"
          >
            <FiDownload size={15} />
            Descargar plantilla oficial
          </button>
        </footer>
      </div>
    </div>
  );
};

const filterControlClass = `
  h-12 w-full rounded-2xl
  border border-gray-100
  bg-gray-50
  px-4
  text-[10px] font-black
  text-gray-700
  outline-none
  transition-all
  placeholder:text-gray-400
  focus:border-[#87be00]/40
  focus:bg-white
  focus:ring-4
  focus:ring-[#87be00]/10
  disabled:cursor-not-allowed
  disabled:opacity-50
`;

const thClass =
  "px-5 py-4 text-[9px] font-black uppercase tracking-[0.18em] text-gray-400";

export default AdminLocales;