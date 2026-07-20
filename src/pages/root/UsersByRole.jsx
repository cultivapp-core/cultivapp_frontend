import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  FiAlertTriangle,
  FiBriefcase,
  FiCopy,
  FiEdit2,
  FiHome,
  FiKey,
  FiMapPin,
  FiPlus,
  FiRefreshCw,
  FiSearch,
  FiTrash2,
  FiUserCheck,
  FiUsers,
  FiUserX,
  FiX,
} from "react-icons/fi";
import { toast } from "react-hot-toast";
import api from "../../api/apiClient";
import { useAuth } from "../../context/AuthContext";
import CreateUserModal from "../root/CreateUserModal";
import EditUserContactModal from "../root/EditUserContactModal";
import ResetPasswordModal from "../../components/ResetPasswordModal";
import UserQuickView from "../../components/UserQuickView";
import AssignLocalesModal from "../admin/AssignLocalesModal";
import AssignUsersModal from "../admin/AssignUsersModal";
import {
  Button,
  IconButton,
} from "../../components/ui";

const ROLE_LABELS = {
  ROOT: "Administrador general",
  ADMIN_CLIENTE: "Administrador",
  SUPERVISOR: "Supervisor",
  USUARIO: "Mercaderista",
  VIEW: "Visualizador",
};

const ROLE_STYLES = {
  ROOT:
    "bg-purple-50 text-purple-700 border-purple-200",
  ADMIN_CLIENTE:
    "bg-blue-50 text-blue-700 border-blue-200",
  SUPERVISOR:
    "bg-amber-50 text-amber-700 border-amber-200",
  USUARIO:
    "bg-green-50 text-green-700 border-green-200",
  VIEW:
    "bg-cyan-50 text-cyan-700 border-cyan-200",
};

const getResponseData = (
  response,
  fallback = [],
) => {
  if (response == null) return fallback;
  return response?.data ?? response;
};

const UsersByRole = ({
  role = null,
  title = "Usuarios",
  buttonLabel = "Crear usuario",
}) => {
  const { user: loggedUser } = useAuth();

  const [openModal, setOpenModal] =
    useState(false);
  const [users, setUsers] = useState([]);
  const [companies, setCompanies] =
    useState([]);
  const [loading, setLoading] =
    useState(true);
  const [error, setError] = useState("");

  const [
    selectedUser,
    setSelectedUser,
  ] = useState(null);
  const [openEdit, setOpenEdit] =
    useState(false);
  const [openReset, setOpenReset] =
    useState(false);
  const [
    userToDelete,
    setUserToDelete,
  ] = useState(null);

  const [
    assignSupervisor,
    setAssignSupervisor,
  ] = useState(null);
  const [assignUser, setAssignUser] =
    useState(null);

  const [
    selectedCompany,
    setSelectedCompany,
  ] = useState("");
  const [searchTerm, setSearchTerm] =
    useState("");
  const [statusFilter, setStatusFilter] =
    useState("ALL");
  const [roleFilter, setRoleFilter] =
    useState(role || "");
  const [
    activePopover,
    setActivePopover,
  ] = useState(null);
  const [updatingUserId, setUpdatingUserId] =
    useState(null);

  const isRoot =
    loggedUser?.role === "ROOT";

  useEffect(() => {
    setRoleFilter(role || "");
  }, [role]);

  const fetchCompanies =
    useCallback(async () => {
      if (!isRoot) return;

      try {
        const response =
          await api.get("/companies");

        const data = getResponseData(
          response,
          [],
        );

        setCompanies(
          Array.isArray(data) ? data : [],
        );
      } catch (requestError) {
        console.error(
          "Error cargando empresas:",
          requestError,
        );
      }
    }, [isRoot]);

  const fetchUsers =
    useCallback(async () => {
      try {
        setLoading(true);
        setError("");

        const params =
          new URLSearchParams();

        if (role) {
          params.set("role", role);
        } else if (roleFilter) {
          params.set("role", roleFilter);
        }

        if (selectedCompany) {
          params.set(
            "company_id",
            selectedCompany,
          );
        }

        const query = params.toString();

        const response = await api.get(
          `/users${query ? `?${query}` : ""}`,
        );

        const data = getResponseData(
          response,
          [],
        );

        if (!Array.isArray(data)) {
          throw new Error(
            "La API devolvió un formato inesperado.",
          );
        }

        setUsers(data);
      } catch (requestError) {
        console.error(
          "Error cargando usuarios:",
          requestError,
        );

        setError(
          requestError?.response?.data
            ?.message ||
            requestError?.message ||
            "No se pudieron cargar los usuarios.",
        );
      } finally {
        setLoading(false);
      }
    }, [
      role,
      roleFilter,
      selectedCompany,
    ]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  useEffect(() => {
    fetchCompanies();
  }, [fetchCompanies]);

  const filteredUsers = useMemo(() => {
    const term = searchTerm
      .trim()
      .toLowerCase();

    return users.filter((user) => {
      if (
        statusFilter === "ACTIVE" &&
        !user.is_active
      ) {
        return false;
      }

      if (
        statusFilter === "INACTIVE" &&
        user.is_active
      ) {
        return false;
      }

      if (!term) return true;

      const searchableText = [
        user.first_name,
        user.last_name,
        user.email,
        user.rut,
        user.company_name,
        ROLE_LABELS[user.role],
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return searchableText.includes(term);
    });
  }, [
    users,
    searchTerm,
    statusFilter,
  ]);

  const stats = useMemo(
    () => ({
      total: filteredUsers.length,
      active: filteredUsers.filter(
        (user) => user.is_active,
      ).length,
      inactive: filteredUsers.filter(
        (user) => !user.is_active,
      ).length,
    }),
    [filteredUsers],
  );

  const canDeleteUser = (
    targetUser,
  ) => {
    if (!loggedUser) return false;
    if (targetUser.role === "ROOT") {
      return false;
    }
    if (
      loggedUser.id === targetUser.id
    ) {
      return false;
    }
    if (loggedUser.role === "ROOT") {
      return true;
    }
    if (
      loggedUser.role ===
      "ADMIN_CLIENTE"
    ) {
      return (
        targetUser.company_id ===
          loggedUser.company_id &&
        targetUser.role !==
          "ADMIN_CLIENTE"
      );
    }
    return false;
  };

  const toggleUser = async (
    targetUser,
  ) => {
    try {
      setUpdatingUserId(targetUser.id);

      await api.patch(
        `/users/${targetUser.id}/toggle`,
      );

      toast.success(
        targetUser.is_active
          ? "Usuario desactivado"
          : "Usuario activado",
      );

      await fetchUsers();
    } catch (requestError) {
      console.error(
        "Error actualizando estado:",
        requestError,
      );

      toast.error(
        requestError?.response?.data
          ?.message ||
          "No se pudo actualizar el estado",
      );
    } finally {
      setUpdatingUserId(null);
    }
  };

  const deleteUser = async (
    userId,
  ) => {
    try {
      await api.delete(
        `/users/${userId}`,
      );

      toast.success(
        "Usuario eliminado correctamente",
      );

      setUserToDelete(null);
      await fetchUsers();
    } catch (requestError) {
      console.error(
        "Error eliminando usuario:",
        requestError,
      );

      toast.error(
        requestError?.response?.data
          ?.message ||
          "No se pudo eliminar el usuario",
      );

      throw requestError;
    }
  };

  const openEditModal = (user) => {
    setSelectedUser(user);
    setOpenEdit(true);
  };

  const openResetModal = (user) => {
    setSelectedUser(user);
    setOpenReset(true);
  };

  const clearFilters = () => {
    setSearchTerm("");
    setStatusFilter("ALL");
    setSelectedCompany("");

    if (!role) {
      setRoleFilter("");
    }
  };

  const hasActiveFilters =
    Boolean(searchTerm) ||
    statusFilter !== "ALL" ||
    Boolean(selectedCompany) ||
    (!role && Boolean(roleFilter));

  const copyUserId = async (targetUser) => {
    const userId = String(
      targetUser?.id || "",
    ).trim();

    if (!userId) {
      toast.error(
        "El usuario no tiene un ID disponible.",
      );
      return;
    }

    try {
      await navigator.clipboard.writeText(
        userId,
      );

      toast.success(
        "ID del usuario copiado",
      );
    } catch (clipboardError) {
      console.error(
        "Error copiando ID:",
        clipboardError,
      );

      const textarea =
        document.createElement(
          "textarea",
        );

      textarea.value = userId;
      textarea.setAttribute(
        "readonly",
        "",
      );
      textarea.style.position =
        "fixed";
      textarea.style.opacity = "0";

      document.body.appendChild(
        textarea,
      );
      textarea.select();

      const copied =
        document.execCommand("copy");

      document.body.removeChild(
        textarea,
      );

      if (copied) {
        toast.success(
          "ID del usuario copiado",
        );
      } else {
        toast.error(
          "No se pudo copiar el ID.",
        );
      }
    }
  };

  const formatDate = (dateValue) => {
    if (!dateValue) return "Sin fecha";

    const date = new Date(dateValue);

    if (Number.isNaN(date.getTime())) {
      return "Sin fecha";
    }

    return date
      .toLocaleDateString("es-CL", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
      .replace(".", "");
  };

  const getUserName = (user) =>
    [user.first_name, user.last_name]
      .filter(Boolean)
      .join(" ")
      .trim() ||
    user.name ||
    user.email ||
    "Usuario sin nombre";

  const roleLabel = (userRole) =>
    ROLE_LABELS[userRole] ||
    userRole ||
    "Sin rol";

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4 font-[Outfit] px-4 text-center">
        <FiRefreshCw
          size={38}
          className="animate-spin text-[#87be00]"
        />

        <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.22em]">
          Cargando usuarios...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center p-4 font-[Outfit]">
        <div className="w-full max-w-lg bg-white rounded-3xl border border-red-100 shadow-sm p-7 text-center">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-red-50 text-red-500 flex items-center justify-center">
            <FiUsers size={22} />
          </div>

          <h1 className="mt-4 text-lg font-black text-gray-800">
            No se pudieron cargar los
            usuarios
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
            onClick={fetchUsers}
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
      className="w-full min-h-full bg-slate-50/50 font-[Outfit] pb-20"
      onClick={() =>
        setActivePopover(null)
      }
    >
      <div className="max-w-[1500px] mx-auto px-4 sm:px-6 md:px-8 pt-4 md:pt-8 space-y-6">
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-5">
          <div>
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-[#87be00]/10 rounded-xl text-[#87be00]">
                <FiUsers size={20} />
              </div>

              <div>
                <h1 className="text-3xl md:text-5xl font-black text-gray-900 tracking-tight leading-none">
                  {title}
                </h1>

                <p className="text-[10px] font-black text-[#87be00] uppercase tracking-[0.2em] mt-2">
                  Gestión de equipo,
                  vigencias y permisos
                </p>
              </div>
            </div>
          </div>

          <Button
            type="button"
            size="lg"
            leftIcon={
              <FiPlus size={16} />
            }
            onClick={() =>
              setOpenModal(true)
            }
            className="w-full md:w-auto"
          >
            {buttonLabel}
          </Button>
        </header>

        <section className="grid grid-cols-3 gap-2 sm:gap-4">
          <StatCard
            label="Total"
            value={stats.total}
            icon={<FiUsers size={20} />}
            tone="neutral"
          />
          <StatCard
            label="Activos"
            value={stats.active}
            icon={
              <FiUserCheck size={20} />
            }
            tone="success"
          />
          <StatCard
            label="Inactivos"
            value={stats.inactive}
            icon={<FiUserX size={20} />}
            tone="danger"
          />
        </section>

        <section className="bg-white rounded-[2rem] border border-gray-100 shadow-sm p-4 sm:p-5">
          <div
            className={`grid grid-cols-1 gap-3 ${
              isRoot
                ? "md:grid-cols-4"
                : role
                  ? "md:grid-cols-2"
                  : "md:grid-cols-3"
            }`}
          >
            {isRoot && (
              <div className="relative">
                <FiBriefcase
                  size={16}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                />

                <select
                  value={selectedCompany}
                  onChange={(event) =>
                    setSelectedCompany(
                      event.target.value,
                    )
                  }
                  className="w-full h-12 pl-11 pr-4 bg-gray-50 border border-gray-100 rounded-2xl text-xs font-black text-gray-600 outline-none focus:bg-white focus:border-[#87be00]/50 transition-all cursor-pointer"
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

            {!role && (
              <select
                value={roleFilter}
                onChange={(event) =>
                  setRoleFilter(
                    event.target.value,
                  )
                }
                className="w-full h-12 px-4 bg-gray-50 border border-gray-100 rounded-2xl text-xs font-black text-gray-600 outline-none focus:bg-white focus:border-[#87be00]/50 transition-all cursor-pointer"
              >
                <option value="">
                  Todos los roles
                </option>
                <option value="ADMIN_CLIENTE">
                  Administradores
                </option>
                <option value="SUPERVISOR">
                  Supervisores
                </option>
                <option value="USUARIO">
                  Mercaderistas
                </option>
                <option value="VIEW">
                  Visualizadores
                </option>
              </select>
            )}

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
                Usuarios activos
              </option>
              <option value="INACTIVE">
                Usuarios inactivos
              </option>
            </select>

            <div className="relative">
              <FiSearch
                className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
                size={16}
              />

              <input
                type="search"
                placeholder="Buscar nombre, RUT o correo..."
                value={searchTerm}
                onChange={(event) =>
                  setSearchTerm(
                    event.target.value,
                  )
                }
                className="w-full h-12 pl-11 pr-11 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-medium text-gray-700 placeholder:text-gray-300 outline-none focus:bg-white focus:border-[#87be00]/50 transition-all"
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
          </div>

          {hasActiveFilters && (
            <div className="mt-4">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                leftIcon={<FiX size={14} />}
                onClick={clearFilters}
              >
                Limpiar filtros
              </Button>
            </div>
          )}
        </section>

        {filteredUsers.length === 0 ? (
          <EmptyState
            hasFilters={hasActiveFilters}
            onClear={clearFilters}
            onCreate={() =>
              setOpenModal(true)
            }
          />
        ) : (
          <>
            <section className="hidden lg:block bg-white rounded-[2rem] border border-gray-100 overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1180px] text-left">
                  <thead className="bg-gray-50/80 border-b border-gray-100">
                    <tr>
                      <th className="px-6 py-4 text-[10px] font-black uppercase tracking-wider text-gray-400">
                        Colaborador
                      </th>
                      <th className="px-6 py-4 text-[10px] font-black uppercase tracking-wider text-gray-400">
                        Vigencia
                      </th>
                      {!role && (
                        <th className="px-6 py-4 text-[10px] font-black uppercase tracking-wider text-gray-400">
                          Empresa
                        </th>
                      )}
                      <th className="px-6 py-4 text-[10px] font-black uppercase tracking-wider text-gray-400 text-center">
                        Estado
                      </th>
                      <th className="px-6 py-4 text-[10px] font-black uppercase tracking-wider text-gray-400 text-right">
                        Acciones
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-gray-50">
                    {filteredUsers.map(
                      (targetUser) => (
                        <tr
                          key={targetUser.id}
                          className="hover:bg-gray-50/60 transition-colors"
                          onClick={(event) =>
                            event.stopPropagation()
                          }
                        >
                          <td className="px-6 py-5">
                            <div className="flex items-center gap-3.5 min-w-0">
                              <UserQuickView
                                user={targetUser}
                                isActive={
                                  activePopover ===
                                  targetUser.id
                                }
                                onToggle={() =>
                                  setActivePopover(
                                    activePopover ===
                                      targetUser.id
                                      ? null
                                      : targetUser.id,
                                  )
                                }
                              />

                              <div className="min-w-0">
                                <p className="text-sm font-black text-gray-900 truncate max-w-[280px]">
                                  {getUserName(
                                    targetUser,
                                  )}
                                </p>

                                <div className="flex flex-wrap items-center gap-2 mt-1.5 min-w-0">
                                  <RoleBadge
                                    role={
                                      targetUser.role
                                    }
                                  />

                                  {targetUser.email && (
                                    <span className="text-[9px] text-gray-400 truncate max-w-[180px]">
                                      {targetUser.email}
                                    </span>
                                  )}
                                </div>

                                <UserId
                                  id={targetUser.id}
                                  onCopy={() =>
                                    copyUserId(
                                      targetUser,
                                    )
                                  }
                                  className="mt-2 max-w-[340px]"
                                />
                              </div>
                            </div>
                          </td>

                          <td className="px-6 py-5">
                            <div className="flex items-center gap-2 text-[10px] font-semibold text-gray-600 whitespace-nowrap">
                              <span className="bg-gray-50 border border-gray-100 px-2 py-1 rounded-lg">
                                {formatDate(
                                  targetUser.fecha_inicio_contrato,
                                )}
                              </span>

                              <span className="text-gray-300">
                                —
                              </span>

                              <span className="bg-gray-50 border border-gray-100 px-2 py-1 rounded-lg">
                                {formatDate(
                                  targetUser.fecha_termino_contrato,
                                )}
                              </span>
                            </div>
                          </td>

                          {!role && (
                            <td className="px-6 py-5">
                              <span className="text-[11px] font-black text-gray-600">
                                {targetUser.company_name ||
                                  "Sin empresa"}
                              </span>
                            </td>
                          )}

                          <td className="px-6 py-5 text-center">
                            <StatusToggle
                              active={
                                targetUser.is_active
                              }
                              loading={
                                updatingUserId ===
                                targetUser.id
                              }
                              onClick={() =>
                                toggleUser(
                                  targetUser,
                                )
                              }
                            />
                          </td>

                          <td className="px-6 py-5">
                            <UserActions
                              user={targetUser}
                              canDelete={canDeleteUser(
                                targetUser,
                              )}
                              onAssignLocales={() =>
                                setAssignSupervisor(
                                  targetUser,
                                )
                              }
                              onAssignUsers={() =>
                                setAssignUser(
                                  targetUser,
                                )
                              }
                              onEdit={() =>
                                openEditModal(
                                  targetUser,
                                )
                              }
                              onReset={() =>
                                openResetModal(
                                  targetUser,
                                )
                              }
                              onDelete={() =>
                                setUserToDelete(
                                  targetUser,
                                )
                              }
                            />
                          </td>
                        </tr>
                      ),
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:hidden">
              {filteredUsers.map(
                (targetUser) => (
                  <article
                    key={targetUser.id}
                    className="bg-white p-5 rounded-[2rem] border border-gray-100 shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-center gap-3 min-w-0">
                        <UserQuickView
                          user={targetUser}
                          isActive={
                            activePopover ===
                            targetUser.id
                          }
                          onToggle={() =>
                            setActivePopover(
                              activePopover ===
                                targetUser.id
                                ? null
                                : targetUser.id,
                            )
                          }
                        />

                        <div className="min-w-0">
                          <p className="text-sm font-black text-gray-900 leading-tight truncate">
                            {getUserName(
                              targetUser,
                            )}
                          </p>

                          <div className="mt-1.5">
                            <RoleBadge
                              role={
                                targetUser.role
                              }
                            />
                          </div>

                          {targetUser.company_name && (
                            <p className="text-[10px] text-gray-400 mt-2 truncate">
                              {
                                targetUser.company_name
                              }
                            </p>
                          )}

                          <UserId
                            id={targetUser.id}
                            onCopy={() =>
                              copyUserId(
                                targetUser,
                              )
                            }
                            className="mt-2 max-w-full"
                          />
                        </div>
                      </div>

                      <StatusToggle
                        active={
                          targetUser.is_active
                        }
                        loading={
                          updatingUserId ===
                          targetUser.id
                        }
                        onClick={() =>
                          toggleUser(
                            targetUser,
                          )
                        }
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2 mt-5">
                      <InfoBlock
                        label="Inicio"
                        value={formatDate(
                          targetUser.fecha_inicio_contrato,
                        )}
                      />
                      <InfoBlock
                        label="Término"
                        value={formatDate(
                          targetUser.fecha_termino_contrato,
                        )}
                      />
                    </div>

                    <div className="mt-4 pt-4 border-t border-gray-100">
                      <UserActions
                        user={targetUser}
                        canDelete={canDeleteUser(
                          targetUser,
                        )}
                        mobile
                        onAssignLocales={() =>
                          setAssignSupervisor(
                            targetUser,
                          )
                        }
                        onAssignUsers={() =>
                          setAssignUser(
                            targetUser,
                          )
                        }
                        onEdit={() =>
                          openEditModal(
                            targetUser,
                          )
                        }
                        onReset={() =>
                          openResetModal(
                            targetUser,
                          )
                        }
                        onDelete={() =>
                          setUserToDelete(
                            targetUser,
                          )
                        }
                      />
                    </div>
                  </article>
                ),
              )}
            </section>
          </>
        )}
      </div>

      <CreateUserModal
        isOpen={openModal}
        onClose={() =>
          setOpenModal(false)
        }
        onCreated={fetchUsers}
        defaultRole={role || ""}
      />

      {openEdit && selectedUser && (
        <EditUserContactModal
          user={selectedUser}
          onClose={() => {
            setOpenEdit(false);
            setSelectedUser(null);
          }}
          onUpdated={fetchUsers}
        />
      )}

      {openReset && selectedUser && (
        <ResetPasswordModal
          user={selectedUser}
          onClose={() => {
            setOpenReset(false);
            setSelectedUser(null);
          }}
        />
      )}

      {assignSupervisor && (
        <AssignLocalesModal
          supervisor={assignSupervisor}
          onClose={() =>
            setAssignSupervisor(null)
          }
          onRefresh={fetchUsers}
        />
      )}

      {assignUser && (
        <AssignUsersModal
          targetUser={assignUser}
          onClose={() =>
            setAssignUser(null)
          }
          onRefresh={fetchUsers}
        />
      )}

      {userToDelete && (
        <DeleteUserModal
          user={userToDelete}
          roleLabel={roleLabel}
          onClose={() =>
            setUserToDelete(null)
          }
          onConfirm={() =>
            deleteUser(userToDelete.id)
          }
        />
      )}
    </div>
  );
};

const UserActions = ({
  user,
  canDelete,
  mobile = false,
  onAssignLocales,
  onAssignUsers,
  onEdit,
  onReset,
  onDelete,
}) => (
  <div
    className={`flex items-center gap-2 ${
      mobile
        ? "flex-wrap"
        : "justify-end"
    }`}
  >
    {user.role === "USUARIO" && (
      <IconButton
        label="Asignar locales"
        size="sm"
        onClick={onAssignLocales}
      >
        <FiHome size={14} />
      </IconButton>
    )}

    {(user.role === "SUPERVISOR" ||
      user.role === "VIEW") && (
      <IconButton
        label="Asignar locales"
        size="sm"
        variant="primary"
        onClick={onAssignLocales}
      >
        <FiMapPin size={14} />
      </IconButton>
    )}

    {(user.role === "SUPERVISOR" ||
      user.role === "VIEW") && (
      <IconButton
        label="Asignar usuarios"
        size="sm"
        onClick={onAssignUsers}
        className="text-blue-600"
      >
        <FiUsers size={14} />
      </IconButton>
    )}

    <IconButton
      label="Editar contacto"
      size="sm"
      onClick={onEdit}
    >
      <FiEdit2 size={14} />
    </IconButton>

    <IconButton
      label="Restablecer contraseña"
      size="sm"
      onClick={onReset}
    >
      <FiKey size={14} />
    </IconButton>

    {canDelete && (
      <IconButton
        label="Eliminar usuario"
        size="sm"
        variant="danger"
        onClick={onDelete}
      >
        <FiTrash2 size={14} />
      </IconButton>
    )}
  </div>
);

const StatusToggle = ({
  active,
  loading,
  onClick,
}) => (
  <button
    type="button"
    role="switch"
    aria-checked={active}
    aria-label={
      active
        ? "Desactivar usuario"
        : "Activar usuario"
    }
    disabled={loading}
    onClick={onClick}
    className={`relative inline-flex h-7 w-12 items-center rounded-full p-1 transition-colors disabled:opacity-60 ${
      active
        ? "bg-[#87be00]"
        : "bg-gray-200"
    }`}
  >
    <span
      className={`h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${
        active
          ? "translate-x-5"
          : "translate-x-0"
      }`}
    />
  </button>
);

const UserId = ({
  id,
  onCopy,
  className = "",
}) => {
  const normalizedId = String(
    id || "",
  ).trim();

  if (!normalizedId) {
    return (
      <span className="text-[9px] text-red-400 font-medium">
        ID no disponible
      </span>
    );
  }

  return (
    <div
      className={`flex items-center gap-1.5 min-w-0 ${className}`}
    >
      <span
        className="min-w-0 truncate rounded-lg border border-gray-100 bg-gray-50 px-2 py-1 font-mono text-[9px] text-gray-500 select-all"
        title={normalizedId}
      >
        ID: {normalizedId}
      </span>

      <IconButton
        label="Copiar ID del usuario"
        size="xs"
        onClick={onCopy}
        className="shrink-0"
      >
        <FiCopy size={12} />
      </IconButton>
    </div>
  );
};

const RoleBadge = ({ role }) => {
  const style =
    ROLE_STYLES[role] ||
    "bg-gray-50 text-gray-600 border-gray-200";

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[8px] font-black uppercase tracking-wider whitespace-nowrap ${style}`}
    >
      {ROLE_LABELS[role] ||
        role ||
        "Sin rol"}
    </span>
  );
};

const InfoBlock = ({
  label,
  value,
}) => (
  <div className="bg-gray-50 border border-gray-100 rounded-xl p-3">
    <p className="text-[8px] font-black text-gray-400 uppercase tracking-wider">
      {label}
    </p>

    <p className="text-[10px] font-bold text-gray-700 mt-1">
      {value}
    </p>
  </div>
);

const StatCard = ({
  label,
  value,
  icon,
  tone = "neutral",
}) => {
  const tones = {
    neutral: {
      container:
        "bg-white border-gray-100",
      icon: "bg-gray-50 text-gray-600",
      value: "text-gray-800",
    },
    success: {
      container:
        "bg-green-50 border-green-100",
      icon:
        "bg-white text-[#5c9200]",
      value: "text-[#5c9200]",
    },
    danger: {
      container:
        "bg-red-50 border-red-100",
      icon: "bg-white text-red-500",
      value: "text-red-600",
    },
  };

  const style =
    tones[tone] || tones.neutral;

  return (
    <div
      className={`rounded-2xl border p-3 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center gap-3 ${style.container}`}
    >
      <div
        className={`w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center shrink-0 ${style.icon}`}
      >
        {icon}
      </div>

      <div>
        <p className="text-[8px] sm:text-[10px] font-black text-gray-400 uppercase tracking-wider">
          {label}
        </p>

        <p
          className={`text-2xl font-black leading-none mt-1 ${style.value}`}
        >
          {value}
        </p>
      </div>
    </div>
  );
};

const EmptyState = ({
  hasFilters,
  onClear,
  onCreate,
}) => (
  <div className="bg-white border border-gray-100 rounded-[2rem] px-6 py-14 text-center shadow-sm">
    <div className="w-14 h-14 mx-auto rounded-2xl bg-gray-50 text-gray-300 flex items-center justify-center">
      <FiUsers size={25} />
    </div>

    <h2 className="mt-4 text-lg font-black text-gray-800">
      {hasFilters
        ? "No se encontraron usuarios"
        : "Todavía no hay usuarios"}
    </h2>

    <p className="mt-2 text-sm text-gray-400">
      {hasFilters
        ? "Prueba con otros filtros o limpia la búsqueda."
        : "Crea el primer usuario para comenzar a administrar el equipo."}
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

      {!hasFilters && (
        <Button
          type="button"
          leftIcon={<FiPlus size={15} />}
          onClick={onCreate}
        >
          Crear usuario
        </Button>
      )}
    </div>
  </div>
);

const DeleteUserModal = ({
  user,
  roleLabel,
  onClose,
  onConfirm,
}) => {
  const [isDeleting, setIsDeleting] =
    useState(false);

  const handleConfirm = async () => {
    try {
      setIsDeleting(true);
      await onConfirm();
    } finally {
      setIsDeleting(false);
    }
  };

  const userName =
    [user.first_name, user.last_name]
      .filter(Boolean)
      .join(" ")
      .trim() ||
    user.email ||
    "este usuario";

  return (
    <div
      className="fixed inset-0 z-[9999] bg-black/65 backdrop-blur-sm p-4 flex items-center justify-center font-[Outfit]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-user-title"
    >
      <div className="relative bg-white w-full max-w-md rounded-3xl border border-gray-100 shadow-2xl p-6 sm:p-7">
        <IconButton
          label="Cerrar confirmación"
          size="sm"
          onClick={onClose}
          disabled={isDeleting}
          className="absolute top-4 right-4"
        >
          <FiX size={16} />
        </IconButton>

        <div className="w-12 h-12 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center">
          <FiAlertTriangle size={22} />
        </div>

        <h2
          id="delete-user-title"
          className="mt-4 text-xl font-black text-gray-900"
        >
          ¿Eliminar usuario?
        </h2>

        <p className="text-sm text-gray-500 mt-2 leading-relaxed">
          Se eliminará permanentemente a{" "}
          <strong className="text-gray-800">
            {userName}
          </strong>
          . Esta acción no se puede
          deshacer.
        </p>

        <div className="bg-gray-50 border border-gray-100 rounded-xl p-3 mt-4 flex flex-wrap items-center gap-2">
          <RoleBadge role={user.role} />

          <span
            className="text-[9px] font-mono text-gray-500 break-all"
            title={user.id}
          >
            ID: {user.id || "No disponible"}
          </span>

          <span className="sr-only">
            {roleLabel(user.role)}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-6">
          <Button
            type="button"
            variant="secondary"
            fullWidth
            disabled={isDeleting}
            onClick={onClose}
          >
            Cancelar
          </Button>

          <Button
            type="button"
            variant="danger"
            fullWidth
            loading={isDeleting}
            loadingText="Eliminando..."
            leftIcon={
              <FiTrash2 size={14} />
            }
            onClick={handleConfirm}
          >
            Eliminar
          </Button>
        </div>
      </div>
    </div>
  );
};

export default UsersByRole;