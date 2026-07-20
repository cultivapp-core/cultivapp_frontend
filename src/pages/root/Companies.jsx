import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  FiBriefcase,
  FiEdit3,
  FiPlus,
  FiRefreshCw,
  FiSearch,
  FiTrash2,
  FiX,
} from "react-icons/fi";
import { motion } from "framer-motion";
import { toast } from "react-hot-toast";
import api from "../../api/apiClient";
import { useAuth } from "../../context/AuthContext";
import CreateCompanyModal from "../root/CreateCompanyModal";
import EmpresaQuickView from "../../components/EmpresaQuickView";
import {
  Button,
  IconButton,
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

const Companies = () => {
  const { user } = useAuth();

  const [companies, setCompanies] =
    useState([]);
  const [openModal, setOpenModal] =
    useState(false);
  const [loading, setLoading] =
    useState(true);
  const [error, setError] = useState("");
  const [
    editingCompany,
    setEditingCompany,
  ] = useState(null);
  const [
    activePopover,
    setActivePopover,
  ] = useState(null);
  const [
    companyToDelete,
    setCompanyToDelete,
  ] = useState(null);
  const [deleting, setDeleting] =
    useState(false);

  const [searchTerm, setSearchTerm] =
    useState("");
  const [statusFilter, setStatusFilter] =
    useState("ALL");

  const isRoot = user?.role === "ROOT";

  const isCultivaAdmin =
    user?.role === "ADMIN_CLIENTE" &&
    user?.company_id ===
      CULTIVA_COMPANY_ID;

  const hasFullAccess =
    isRoot || isCultivaAdmin;

  const fetchCompanies =
    useCallback(async () => {
      try {
        setLoading(true);
        setError("");

        const response =
          await api.get("/companies");

        const companyData =
          getResponseData(response, []);

        if (!Array.isArray(companyData)) {
          throw new Error(
            "La API devolvió un formato inesperado.",
          );
        }

        setCompanies(companyData);
      } catch (requestError) {
        console.error(
          "Error cargando empresas:",
          requestError,
        );

        const message =
          requestError?.response?.data
            ?.message ||
          requestError?.message ||
          "No se pudieron cargar las empresas.";

        setError(message);
        toast.error(
          "Error al cargar empresas",
        );
      } finally {
        setLoading(false);
      }
    }, []);

  useEffect(() => {
    fetchCompanies();
  }, [fetchCompanies]);

  const filteredCompanies =
    useMemo(() => {
      const search = searchTerm
        .trim()
        .toLowerCase();

      return companies
        .filter((company) => {
          if (
            statusFilter === "ACTIVE" &&
            !company.is_active
          ) {
            return false;
          }

          if (
            statusFilter === "INACTIVE" &&
            company.is_active
          ) {
            return false;
          }

          if (!search) return true;

          const searchableText = [
            company.name,
            company.nombre,
            company.rut,
            company.email,
            company.contact_email,
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();

          return searchableText.includes(
            search,
          );
        })
        .sort((a, b) =>
          String(a.name || a.nombre || "")
            .localeCompare(
              String(
                b.name || b.nombre || "",
              ),
              "es",
            ),
        );
    }, [
      companies,
      searchTerm,
      statusFilter,
    ]);

  const summary = useMemo(() => {
    const active = companies.filter(
      (company) =>
        Boolean(company.is_active),
    ).length;

    return {
      total: companies.length,
      active,
      inactive:
        companies.length - active,
    };
  }, [companies]);

  const openCreateModal = () => {
    setEditingCompany(null);
    setOpenModal(true);
  };

  const openEditModal = (company) => {
    setEditingCompany(company);
    setOpenModal(true);
  };

  const closeModal = () => {
    setEditingCompany(null);
    setOpenModal(false);
  };

  const confirmDelete = async () => {
    if (!companyToDelete || !isRoot) {
      return;
    }

    const toastId = toast.loading(
      "Eliminando empresa...",
    );

    try {
      setDeleting(true);

      await api.delete(
        `/companies/${companyToDelete.id}`,
      );

      toast.success(
        "Empresa eliminada correctamente",
        { id: toastId },
      );

      setCompanyToDelete(null);
      await fetchCompanies();
    } catch (requestError) {
      console.error(
        "Error eliminando empresa:",
        requestError,
      );

      toast.error(
        requestError?.response?.data
          ?.message ||
          "No se pudo eliminar la empresa",
        { id: toastId },
      );
    } finally {
      setDeleting(false);
    }
  };

  const clearFilters = () => {
    setSearchTerm("");
    setStatusFilter("ALL");
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4 font-[Outfit] px-4 text-center">
        <FiRefreshCw
          size={38}
          className="animate-spin text-[#87be00]"
        />

        <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.22em]">
          Cargando empresas...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center p-4 font-[Outfit]">
        <div className="w-full max-w-lg bg-white border border-red-100 rounded-3xl p-7 text-center shadow-sm">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-red-50 text-red-500 flex items-center justify-center">
            <FiBriefcase size={22} />
          </div>

          <h1 className="mt-4 text-lg font-black text-gray-800">
            No se pudieron cargar las
            empresas
          </h1>

          <p className="mt-2 text-sm text-gray-500">
            {error}
          </p>

          <Button
            type="button"
            variant="secondary"
            size="lg"
            leftIcon={
              <FiRefreshCw size={16} />
            }
            onClick={fetchCompanies}
            className="mt-5"
          >
            Intentar nuevamente
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="w-full max-w-7xl mx-auto px-4 sm:px-6 md:px-8 pb-20 font-[Outfit]"
      onClick={() =>
        setActivePopover(null)
      }
    >
      <header className="pt-4 md:pt-8 mb-6 md:mb-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-5">
          <div>
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-[#87be00]/10 rounded-xl text-[#87be00]">
                <FiBriefcase size={20} />
              </div>

              <div>
                <h1 className="text-3xl md:text-5xl font-black text-gray-900 tracking-tight leading-none">
                  Empresas
                </h1>

                <p className="text-[10px] font-black text-[#87be00] uppercase tracking-[0.22em] mt-2">
                  Administración global
                </p>
              </div>
            </div>
          </div>

          {hasFullAccess && (
            <Button
              type="button"
              size="lg"
              leftIcon={
                <FiPlus size={16} />
              }
              onClick={openCreateModal}
              className="w-full sm:w-auto"
            >
              Crear empresa
            </Button>
          )}
        </div>
      </header>

      <section className="grid grid-cols-3 gap-2 sm:gap-4 mb-5">
        <SummaryPill
          label="Total"
          value={summary.total}
        />
        <SummaryPill
          label="Activas"
          value={summary.active}
          tone="success"
        />
        <SummaryPill
          label="Inactivas"
          value={summary.inactive}
          tone={
            summary.inactive > 0
              ? "danger"
              : "neutral"
          }
        />
      </section>

      <section className="bg-white border border-gray-100 rounded-[2rem] p-4 sm:p-5 mb-5 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-[1fr_220px_auto] gap-3">
          <div className="relative">
            <FiSearch
              className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
              size={16}
            />

            <input
              type="search"
              value={searchTerm}
              onChange={(event) =>
                setSearchTerm(
                  event.target.value,
                )
              }
              placeholder="Buscar empresa, RUT o correo..."
              className="w-full h-12 pl-11 pr-11 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-medium text-gray-700 outline-none focus:bg-white focus:border-[#87be00]/50 transition-all"
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
            value={statusFilter}
            onChange={(event) =>
              setStatusFilter(
                event.target.value,
              )
            }
            className="w-full h-12 px-4 bg-gray-50 border border-gray-100 rounded-2xl text-xs font-black text-gray-600 outline-none focus:bg-white focus:border-[#87be00]/50 transition-all cursor-pointer"
          >
            <option value="ALL">
              Todos los estados
            </option>
            <option value="ACTIVE">
              Empresas activas
            </option>
            <option value="INACTIVE">
              Empresas inactivas
            </option>
          </select>

          {(searchTerm ||
            statusFilter !== "ALL") && (
            <Button
              type="button"
              variant="secondary"
              size="lg"
              leftIcon={
                <FiX size={14} />
              }
              onClick={clearFilters}
              className="w-full md:w-auto"
            >
              Limpiar
            </Button>
          )}
        </div>
      </section>

      {filteredCompanies.length === 0 ? (
        <EmptyState
          hasFilters={
            Boolean(searchTerm) ||
            statusFilter !== "ALL"
          }
          onClear={clearFilters}
          onCreate={
            hasFullAccess
              ? openCreateModal
              : undefined
          }
        />
      ) : (
        <>
          <section className="md:hidden space-y-4">
            {filteredCompanies.map(
              (company, index) => (
                <motion.article
                  initial={{
                    opacity: 0,
                    y: 10,
                  }}
                  animate={{
                    opacity: 1,
                    y: 0,
                  }}
                  transition={{
                    delay:
                      Math.min(
                        index * 0.03,
                        0.2,
                      ),
                  }}
                  key={company.id}
                  className="bg-white p-5 rounded-[2rem] border border-gray-100 shadow-sm"
                  onClick={(event) =>
                    event.stopPropagation()
                  }
                >
                  <div className="flex justify-between items-start gap-4">
                    <div className="flex items-start gap-3 min-w-0">
                      <EmpresaQuickView
                        company={company}
                        isActive={
                          activePopover ===
                          company.id
                        }
                        onToggle={() =>
                          setActivePopover(
                            activePopover ===
                              company.id
                              ? null
                              : company.id,
                          )
                        }
                      />

                      <div className="min-w-0">
                        <p className="font-black text-gray-900 text-base leading-tight truncate">
                          {company.name ||
                            company.nombre ||
                            "Empresa sin nombre"}
                        </p>

                        <CompanyStatus
                          isActive={
                            company.is_active
                          }
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {hasFullAccess && (
                        <IconButton
                          label="Editar empresa"
                          size="sm"
                          variant="primary"
                          onClick={() =>
                            openEditModal(
                              company,
                            )
                          }
                        >
                          <FiEdit3
                            size={15}
                          />
                        </IconButton>
                      )}

                      {isRoot && (
                        <IconButton
                          label="Eliminar empresa"
                          size="sm"
                          variant="danger"
                          onClick={() =>
                            setCompanyToDelete(
                              company,
                            )
                          }
                        >
                          <FiTrash2
                            size={15}
                          />
                        </IconButton>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 mt-5 bg-gray-50 p-3 rounded-2xl text-center">
                    <PlanValue
                      label="Supervisores"
                      value={
                        company.max_supervisors
                      }
                    />
                    <PlanValue
                      label="Usuarios"
                      value={
                        company.max_users
                      }
                    />
                    <PlanValue
                      label="Visualizadores"
                      value={
                        company.max_view
                      }
                    />
                  </div>
                </motion.article>
              ),
            )}
          </section>

          <section className="hidden md:block bg-white rounded-[2rem] shadow-sm border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-gray-50/80">
                  <tr>
                    <th className="p-6 text-[10px] font-black uppercase tracking-wider text-gray-400">
                      Empresa
                    </th>
                    <th className="p-6 text-[10px] font-black uppercase tracking-wider text-gray-400">
                      Estado
                    </th>
                    <th className="p-6 text-[10px] font-black uppercase tracking-wider text-gray-400">
                      Plan contratado
                    </th>
                    <th className="p-6 text-[10px] font-black uppercase tracking-wider text-gray-400 text-right">
                      Acciones
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-50">
                  {filteredCompanies.map(
                    (company) => (
                      <tr
                        key={company.id}
                        className="hover:bg-gray-50/60 transition-colors"
                        onClick={(event) =>
                          event.stopPropagation()
                        }
                      >
                        <td className="p-6">
                          <div className="flex items-center gap-4 min-w-0">
                            <EmpresaQuickView
                              company={company}
                              isActive={
                                activePopover ===
                                company.id
                              }
                              onToggle={() =>
                                setActivePopover(
                                  activePopover ===
                                    company.id
                                    ? null
                                    : company.id,
                                )
                              }
                            />

                            <div className="min-w-0">
                              <p className="font-black text-gray-900 text-sm truncate max-w-[280px]">
                                {company.name ||
                                  company.nombre ||
                                  "Empresa sin nombre"}
                              </p>

                              {company.rut && (
                                <p className="text-[10px] text-gray-400 mt-1">
                                  RUT:{" "}
                                  {company.rut}
                                </p>
                              )}
                            </div>
                          </div>
                        </td>

                        <td className="p-6">
                          <CompanyStatus
                            isActive={
                              company.is_active
                            }
                          />
                        </td>

                        <td className="p-6">
                          <div className="flex items-center gap-3 text-[10px] font-black text-gray-600">
                            <PlanBadge
                              label="SUP"
                              value={
                                company.max_supervisors
                              }
                            />
                            <PlanBadge
                              label="USR"
                              value={
                                company.max_users
                              }
                            />
                            <PlanBadge
                              label="VIEW"
                              value={
                                company.max_view
                              }
                            />
                          </div>
                        </td>

                        <td className="p-6">
                          <div className="flex justify-end items-center gap-2">
                            {hasFullAccess && (
                              <IconButton
                                label="Editar empresa"
                                size="sm"
                                variant="primary"
                                onClick={() =>
                                  openEditModal(
                                    company,
                                  )
                                }
                              >
                                <FiEdit3
                                  size={15}
                                />
                              </IconButton>
                            )}

                            {isRoot && (
                              <IconButton
                                label="Eliminar empresa"
                                size="sm"
                                variant="danger"
                                onClick={() =>
                                  setCompanyToDelete(
                                    company,
                                  )
                                }
                              >
                                <FiTrash2
                                  size={15}
                                />
                              </IconButton>
                            )}
                          </div>
                        </td>
                      </tr>
                    ),
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}

      <CreateCompanyModal
        isOpen={openModal}
        onClose={closeModal}
        onCreated={fetchCompanies}
        editingCompany={editingCompany}
      />

      {companyToDelete && (
        <DeleteCompanyModal
          company={companyToDelete}
          deleting={deleting}
          onClose={() =>
            setCompanyToDelete(null)
          }
          onConfirm={confirmDelete}
        />
      )}
    </div>
  );
};

const SummaryPill = ({
  label,
  value,
  tone = "neutral",
}) => {
  const tones = {
    success:
      "bg-green-50 border-green-200 text-green-700",
    danger:
      "bg-red-50 border-red-200 text-red-600",
    neutral:
      "bg-white border-gray-200 text-gray-700",
  };

  return (
    <div
      className={`rounded-2xl border px-3 py-3 sm:px-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 ${tones[tone]}`}
    >
      <span className="text-[8px] sm:text-[9px] font-black uppercase tracking-wider opacity-70">
        {label}
      </span>

      <strong className="text-xl sm:text-2xl font-black leading-none">
        {value}
      </strong>
    </div>
  );
};

const CompanyStatus = ({
  isActive,
}) => (
  <span
    className={`inline-flex items-center gap-1.5 mt-2 px-2.5 py-1 rounded-full border text-[9px] font-black uppercase tracking-wider ${
      isActive
        ? "bg-green-50 text-green-700 border-green-200"
        : "bg-red-50 text-red-600 border-red-200"
    }`}
  >
    <span
      className={`w-1.5 h-1.5 rounded-full ${
        isActive
          ? "bg-green-500"
          : "bg-red-500"
      }`}
    />

    {isActive ? "Activa" : "Inactiva"}
  </span>
);

const PlanValue = ({
  label,
  value,
}) => (
  <div className="flex flex-col min-w-0">
    <span className="text-[7px] font-black text-gray-400 uppercase truncate">
      {label}
    </span>

    <span className="text-sm font-black text-gray-800 mt-1">
      {value ?? 0}
    </span>
  </div>
);

const PlanBadge = ({
  label,
  value,
}) => (
  <span className="inline-flex items-center gap-1.5 bg-gray-50 border border-gray-100 rounded-xl px-2.5 py-1.5 whitespace-nowrap">
    <span className="text-[8px] text-gray-400">
      {label}
    </span>
    <strong className="text-[10px] text-gray-700">
      {value ?? 0}
    </strong>
  </span>
);

const EmptyState = ({
  hasFilters,
  onClear,
  onCreate,
}) => (
  <div className="bg-white border border-gray-100 rounded-[2rem] px-6 py-14 text-center shadow-sm">
    <div className="w-14 h-14 mx-auto rounded-2xl bg-gray-50 text-gray-300 flex items-center justify-center">
      <FiBriefcase size={25} />
    </div>

    <h2 className="mt-4 text-lg font-black text-gray-800">
      {hasFilters
        ? "No se encontraron empresas"
        : "Todavía no hay empresas"}
    </h2>

    <p className="mt-2 text-sm text-gray-400">
      {hasFilters
        ? "Prueba con otra búsqueda o limpia los filtros."
        : "Crea la primera empresa para comenzar a administrar la plataforma."}
    </p>

    <div className="mt-5 flex flex-col sm:flex-row justify-center gap-3">
      {hasFilters && (
        <Button
          type="button"
          variant="secondary"
          onClick={onClear}
        >
          Limpiar filtros
        </Button>
      )}

      {!hasFilters && onCreate && (
        <Button
          type="button"
          leftIcon={<FiPlus size={15} />}
          onClick={onCreate}
        >
          Crear empresa
        </Button>
      )}
    </div>
  </div>
);

const DeleteCompanyModal = ({
  company,
  deleting,
  onClose,
  onConfirm,
}) => (
  <div
    className="fixed inset-0 z-[9999] bg-black/65 backdrop-blur-sm p-4 flex items-center justify-center"
    role="dialog"
    aria-modal="true"
    aria-labelledby="delete-company-title"
  >
    <div className="relative w-full max-w-md bg-white rounded-3xl border border-gray-100 shadow-2xl p-6 sm:p-7">
      <IconButton
        label="Cerrar confirmación"
        size="sm"
        onClick={onClose}
        disabled={deleting}
        className="absolute top-4 right-4"
      >
        <FiX size={16} />
      </IconButton>

      <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-500 flex items-center justify-center">
        <FiTrash2 size={21} />
      </div>

      <h2
        id="delete-company-title"
        className="mt-4 text-xl font-black text-gray-900"
      >
        ¿Eliminar empresa?
      </h2>

      <p className="mt-2 text-sm text-gray-500 leading-relaxed">
        Se eliminará permanentemente{" "}
        <strong className="text-gray-800">
          {company.name ||
            company.nombre ||
            "esta empresa"}
        </strong>
        . Esta acción podría afectar a sus
        usuarios, locales y planificaciones.
      </p>

      <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Button
          type="button"
          variant="secondary"
          fullWidth
          disabled={deleting}
          onClick={onClose}
        >
          Cancelar
        </Button>

        <Button
          type="button"
          variant="danger"
          fullWidth
          loading={deleting}
          loadingText="Eliminando..."
          leftIcon={<FiTrash2 size={14} />}
          onClick={onConfirm}
        >
          Eliminar
        </Button>
      </div>
    </div>
  </div>
);

export default Companies;