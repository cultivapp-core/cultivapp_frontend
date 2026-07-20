import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  FiBell,
  FiBriefcase,
  FiCheck,
  FiCopy,
  FiMapPin,
  FiRefreshCw,
  FiSearch,
  FiSend,
  FiUsers,
  FiX,
} from "react-icons/fi";
import { toast } from "react-hot-toast";
import api from "../../api/apiClient";
import { useAuth } from "../../context/AuthContext";
import {
  Button,
  IconButton,
} from "../../components/ui";

const CULTIVA_COMPANY_ID =
  "0e342e01-d213-4353-b210-39a12ac335cf";

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

const INITIAL_FORM = {
  title: "",
  message: "",
  scope: "global",
  companyId: "",
  chainId: "",
  localId: "",
  selectedTargets: [],
};

const getResponseData = (
  response,
  fallback = [],
) => {
  if (response == null) return fallback;
  return response?.data ?? response;
};

const NotificationManager = () => {
  const { user } = useAuth();

  const canSeeCompanies =
    user?.role === "ROOT" ||
    (user?.role === "ADMIN_CLIENTE" &&
      user?.company_id ===
        CULTIVA_COMPANY_ID);

  const [companies, setCompanies] =
    useState([]);
  const [chains, setChains] =
    useState([]);
  const [locales, setLocales] =
    useState([]);
  const [users, setUsers] =
    useState([]);

  const [loading, setLoading] =
    useState(false);
  const [
    loadingRecipients,
    setLoadingRecipients,
  ] = useState(false);
  const [error, setError] =
    useState("");
  const [searchTerm, setSearchTerm] =
    useState("");

  const [form, setForm] = useState({
    ...INITIAL_FORM,
    companyId: canSeeCompanies
      ? ""
      : user?.company_id || "",
  });

  useEffect(() => {
    setForm((current) => ({
      ...current,
      companyId: canSeeCompanies
        ? current.companyId
        : user?.company_id || "",
    }));
  }, [
    canSeeCompanies,
    user?.company_id,
  ]);

  const fetchCompanies =
    useCallback(async () => {
      if (!canSeeCompanies) return;

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
            ? data.filter(
                (company) =>
                  company?.is_active !==
                  false,
              )
            : [],
        );
      } catch (requestError) {
        console.error(
          "Error cargando empresas:",
          requestError,
        );

        toast.error(
          "No se pudieron cargar las empresas",
        );
      }
    }, [canSeeCompanies]);

  useEffect(() => {
    fetchCompanies();
  }, [fetchCompanies]);

  const fetchCompanyResources =
    useCallback(async () => {
      if (!form.companyId) {
        setChains([]);
        setUsers([]);
        setLocales([]);
        return;
      }

      try {
        setLoadingRecipients(true);
        setError("");

        const [
          chainsResponse,
          usersResponse,
        ] = await Promise.all([
          api.get(
            `/chains?company_id=${form.companyId}`,
          ),
          api.get(
            `/users?company_id=${form.companyId}`,
          ),
        ]);

        const chainsData =
          getResponseData(
            chainsResponse,
            [],
          );

        const usersData =
          getResponseData(
            usersResponse,
            [],
          );

        setChains(
          Array.isArray(chainsData)
            ? chainsData
            : [],
        );

        setUsers(
          Array.isArray(usersData)
            ? usersData
            : [],
        );
      } catch (requestError) {
        console.error(
          "Error cargando destinatarios:",
          requestError,
        );

        setError(
          requestError?.response?.data
            ?.message ||
            "No se pudieron cargar los destinatarios.",
        );
      } finally {
        setLoadingRecipients(false);
      }
    }, [form.companyId]);

  useEffect(() => {
    fetchCompanyResources();
  }, [fetchCompanyResources]);

  useEffect(() => {
    const fetchLocales = async () => {
      if (
        !form.chainId ||
        !form.companyId
      ) {
        setLocales([]);
        return;
      }

      try {
        const response = await api.get(
          `/locales?chain_id=${form.chainId}&company_id=${form.companyId}`,
        );

        const data =
          getResponseData(
            response,
            [],
          );

        setLocales(
          Array.isArray(data)
            ? data
            : [],
        );
      } catch (requestError) {
        console.error(
          "Error cargando locales:",
          requestError,
        );

        setLocales([]);
      }
    };

    fetchLocales();
  }, [
    form.chainId,
    form.companyId,
  ]);

  useEffect(() => {
    if (
      form.scope !== "local" ||
      !form.localId
    ) {
      return;
    }

    const fetchLocalUsers = async () => {
      try {
        setLoadingRecipients(true);

        const response = await api.get(
          `/users?local_id=${form.localId}`,
        );

        const data =
          getResponseData(
            response,
            [],
          );

        setUsers(
          Array.isArray(data)
            ? data
            : [],
        );
      } catch (requestError) {
        console.error(
          "Error cargando usuarios del local:",
          requestError,
        );
      } finally {
        setLoadingRecipients(false);
      }
    };

    fetchLocalUsers();
  }, [form.scope, form.localId]);

  const updateForm = (
    field,
    value,
  ) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const changeCompany = (
    companyId,
  ) => {
    setForm((current) => ({
      ...current,
      companyId,
      chainId: "",
      localId: "",
      selectedTargets: [],
    }));

    setSearchTerm("");
    setChains([]);
    setLocales([]);
    setUsers([]);
  };

  const changeScope = (scope) => {
    setForm((current) => ({
      ...current,
      scope,
      chainId:
        scope === "local"
          ? current.chainId
          : "",
      localId:
        scope === "local"
          ? current.localId
          : "",
      selectedTargets: [],
    }));

    setSearchTerm("");
  };

  const filteredUsers = useMemo(() => {
    const term = searchTerm
      .trim()
      .toLowerCase();

    if (!term) return users;

    return users.filter((targetUser) => {
      const searchableText = [
        targetUser.first_name,
        targetUser.last_name,
        targetUser.email,
        targetUser.rut,
        targetUser.id,
        ROLE_LABELS[
          targetUser.role
        ],
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return searchableText.includes(
        term,
      );
    });
  }, [users, searchTerm]);

  const selectedCount =
    form.selectedTargets.length;

  const toggleUserSelection = (
    userId,
  ) => {
    setForm((current) => ({
      ...current,
      selectedTargets:
        current.selectedTargets.includes(
          userId,
        )
          ? current.selectedTargets.filter(
              (id) => id !== userId,
            )
          : [
              ...current.selectedTargets,
              userId,
            ],
    }));
  };

  const selectAllVisible = () => {
    const visibleIds =
      filteredUsers.map(
        (targetUser) =>
          targetUser.id,
      );

    setForm((current) => ({
      ...current,
      selectedTargets: [
        ...new Set([
          ...current.selectedTargets,
          ...visibleIds,
        ]),
      ],
    }));
  };

  const clearSelection = () => {
    setForm((current) => ({
      ...current,
      selectedTargets: [],
    }));
  };

  const copyUserId = async (
    targetUser,
  ) => {
    const userId = String(
      targetUser?.id || "",
    ).trim();

    if (!userId) {
      toast.error(
        "El usuario no tiene ID disponible.",
      );
      return;
    }

    try {
      await navigator.clipboard.writeText(
        userId,
      );

      toast.success(
        "ID copiado",
      );
    } catch {
      toast.error(
        "No se pudo copiar el ID.",
      );
    }
  };

  const validateForm = () => {
    if (
      canSeeCompanies &&
      !form.companyId
    ) {
      return "Selecciona una empresa.";
    }

    if (!form.title.trim()) {
      return "Ingresa un título.";
    }

    if (!form.message.trim()) {
      return "Ingresa un mensaje.";
    }

    if (
      form.scope === "individual" &&
      form.selectedTargets.length === 0
    ) {
      return "Selecciona al menos un destinatario.";
    }

    if (
      form.scope === "local" &&
      !form.localId
    ) {
      return "Selecciona un local.";
    }

    return "";
  };

  const handleSubmit = async (
    event,
  ) => {
    event.preventDefault();

    const validationMessage =
      validateForm();

    if (validationMessage) {
      toast.error(
        validationMessage,
      );
      return;
    }

    setLoading(true);

    try {
      await api.post(
        "/notifications/send-bulk",
        {
          ...form,
          title: form.title.trim(),
          message:
            form.message.trim(),
          targetIds:
            form.selectedTargets,
          localId:
            form.localId || null,
        },
      );

      toast.success(
        "Notificación enviada correctamente",
      );

      setForm((current) => ({
        ...INITIAL_FORM,
        companyId:
          canSeeCompanies
            ? current.companyId
            : user?.company_id || "",
      }));

      setSearchTerm("");
      setLocales([]);
    } catch (requestError) {
      console.error(
        "Error enviando notificación:",
        requestError,
      );

      toast.error(
        requestError?.response?.data
          ?.message ||
          "No se pudo enviar la notificación.",
      );
    } finally {
      setLoading(false);
    }
  };

  const scopeDescription = {
    global:
      "La notificación se enviará a todos los usuarios de la empresa.",
    individual:
      "Selecciona uno o más usuarios específicos.",
    local:
      "La notificación se enviará a los usuarios asociados al local seleccionado.",
  };

  return (
    <div className="w-full min-h-full bg-gray-50/40 font-[Outfit] pb-20">
      <header className="bg-white border-b border-gray-100">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 md:px-8 py-5 md:py-8 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-[#87be00]/10 rounded-xl text-[#87be00]">
              <FiBell size={20} />
            </div>

            <div>
              <h1 className="text-3xl md:text-5xl font-black text-gray-900 tracking-tight leading-none">
                Notificaciones
              </h1>

              <p className="text-[10px] font-black text-[#87be00] uppercase tracking-[0.2em] mt-2">
                Centro de comunicaciones
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 md:px-8 pt-6">
        <form
          onSubmit={handleSubmit}
          className="space-y-6"
        >
          <section className="bg-white p-5 sm:p-7 md:p-8 rounded-[2rem] border border-gray-100 shadow-sm space-y-6">
            {canSeeCompanies && (
              <Field label="Empresa">
                <div className="relative">
                  <FiBriefcase
                    size={16}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                  />

                  <select
                    value={
                      form.companyId
                    }
                    onChange={(event) =>
                      changeCompany(
                        event.target.value,
                      )
                    }
                    disabled={loading}
                    className="w-full h-12 pl-11 pr-4 bg-gray-50 border border-gray-100 rounded-2xl text-xs font-black text-gray-600 outline-none focus:bg-white focus:border-[#87be00]/50 transition-all cursor-pointer"
                  >
                    <option value="">
                      Seleccionar empresa
                    </option>

                    {companies.map(
                      (company) => (
                        <option
                          key={company.id}
                          value={
                            company.id
                          }
                        >
                          {company.name ||
                            company.nombre ||
                            "Empresa"}
                        </option>
                      ),
                    )}
                  </select>
                </div>
              </Field>
            )}

            <Field
              label="Alcance"
              hint={
                scopeDescription[
                  form.scope
                ]
              }
            >
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {[
                  {
                    id: "global",
                    label: "Global",
                  },
                  {
                    id: "individual",
                    label: "Individual",
                  },
                  {
                    id: "local",
                    label: "Por local",
                  },
                ].map((scope) => (
                  <button
                    key={scope.id}
                    type="button"
                    onClick={() =>
                      changeScope(
                        scope.id,
                      )
                    }
                    className={`min-h-12 rounded-2xl text-[10px] font-black uppercase tracking-wider transition-all border ${
                      form.scope ===
                      scope.id
                        ? "bg-[#87be00] text-white border-[#87be00] shadow-sm"
                        : "bg-gray-50 text-gray-500 border-gray-100 hover:border-[#87be00]/40"
                    }`}
                  >
                    {scope.label}
                  </button>
                ))}
              </div>
            </Field>

            {form.scope ===
              "local" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 sm:p-5 bg-gray-50 rounded-[2rem] border border-gray-100">
                <Field label="Cadena">
                  <select
                    value={
                      form.chainId
                    }
                    onChange={(event) =>
                      setForm(
                        (current) => ({
                          ...current,
                          chainId:
                            event.target
                              .value,
                          localId: "",
                          selectedTargets:
                            [],
                        }),
                      )
                    }
                    className={inputClass}
                  >
                    <option value="">
                      Seleccionar cadena
                    </option>

                    {chains.map(
                      (chain) => (
                        <option
                          key={chain.id}
                          value={chain.id}
                        >
                          {chain.name ||
                            chain.cadena ||
                            "Cadena"}
                        </option>
                      ),
                    )}
                  </select>
                </Field>

                <Field label="Local">
                  <select
                    value={
                      form.localId
                    }
                    onChange={(event) =>
                      updateForm(
                        "localId",
                        event.target.value,
                      )
                    }
                    disabled={
                      !form.chainId
                    }
                    className={inputClass}
                  >
                    <option value="">
                      Seleccionar local
                    </option>

                    {locales.map(
                      (local) => (
                        <option
                          key={local.id}
                          value={local.id}
                        >
                          {local.nombre_local ||
                            local.cadena ||
                            `Local ${
                              local.codigo_local ||
                              ""
                            }`}
                        </option>
                      ),
                    )}
                  </select>
                </Field>
              </div>
            )}

            {form.scope ===
              "individual" && (
              <section className="space-y-4">
                <div className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
                  <div>
                    <h2 className="text-[10px] font-black text-gray-700 uppercase tracking-wider">
                      Destinatarios
                    </h2>

                    <p className="text-[10px] text-gray-400 mt-1">
                      {selectedCount} usuario
                      {selectedCount === 1
                        ? ""
                        : "s"}{" "}
                      seleccionado
                      {selectedCount === 1
                        ? ""
                        : "s"}
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={
                        selectAllVisible
                      }
                      disabled={
                        filteredUsers.length ===
                        0
                      }
                    >
                      Seleccionar visibles
                    </Button>

                    {selectedCount >
                      0 && (
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        leftIcon={
                          <FiX
                            size={13}
                          />
                        }
                        onClick={
                          clearSelection
                        }
                      >
                        Limpiar
                      </Button>
                    )}
                  </div>
                </div>

                <div className="relative">
                  <FiSearch
                    size={16}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
                  />

                  <input
                    type="search"
                    value={searchTerm}
                    onChange={(event) =>
                      setSearchTerm(
                        event.target.value,
                      )
                    }
                    placeholder="Buscar nombre, correo, RUT o ID..."
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

                {loadingRecipients ? (
                  <div className="py-12 flex flex-col items-center gap-3 text-gray-400">
                    <FiRefreshCw
                      size={23}
                      className="animate-spin text-[#87be00]"
                    />

                    <p className="text-[10px] font-black uppercase tracking-wider">
                      Cargando destinatarios...
                    </p>
                  </div>
                ) : error ? (
                  <EmptyState
                    title="No se pudieron cargar los destinatarios"
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
                        onClick={
                          fetchCompanyResources
                        }
                      >
                        Reintentar
                      </Button>
                    }
                  />
                ) : filteredUsers.length ===
                  0 ? (
                  <EmptyState
                    title="Sin información disponible"
                    description="No hay usuarios que coincidan con la búsqueda o empresa seleccionada."
                  />
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[420px] overflow-y-auto custom-scrollbar pr-1">
                    {filteredUsers.map(
                      (targetUser) => {
                        const selected =
                          form.selectedTargets.includes(
                            targetUser.id,
                          );

                        return (
                          <button
                            key={
                              targetUser.id
                            }
                            type="button"
                            onClick={() =>
                              toggleUserSelection(
                                targetUser.id,
                              )
                            }
                            className={`relative p-4 rounded-2xl text-left border-2 transition-all ${
                              selected
                                ? "border-[#87be00] bg-[#87be00]/5"
                                : "border-gray-100 bg-white hover:border-gray-200"
                            }`}
                          >
                            <div className="flex items-start gap-3">
                              <div
                                className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                                  selected
                                    ? "bg-[#87be00] text-white"
                                    : "bg-gray-50 text-gray-400"
                                }`}
                              >
                                {selected ? (
                                  <FiCheck
                                    size={17}
                                  />
                                ) : (
                                  <FiUsers
                                    size={17}
                                  />
                                )}
                              </div>

                              <div className="min-w-0 flex-1">
                                <p className="text-xs font-black text-gray-900 truncate">
                                  {[
                                    targetUser.first_name,
                                    targetUser.last_name,
                                  ]
                                    .filter(
                                      Boolean,
                                    )
                                    .join(
                                      " ",
                                    ) ||
                                    targetUser.email ||
                                    "Usuario"}
                                </p>

                                <p className="text-[9px] text-gray-400 truncate mt-1">
                                  {targetUser.email ||
                                    "Sin correo"}
                                </p>

                                <div className="flex flex-wrap gap-1.5 mt-2">
                                  <RoleBadge
                                    role={
                                      targetUser.role
                                    }
                                  />
                                </div>

                                <div className="flex items-center gap-1.5 mt-2 min-w-0">
                                  <span
                                    className="truncate text-[8px] font-mono text-gray-400 select-all"
                                    title={
                                      targetUser.id
                                    }
                                  >
                                    ID:{" "}
                                    {targetUser.id ||
                                      "No disponible"}
                                  </span>

                                  <IconButton
                                    label="Copiar ID"
                                    size="xs"
                                    onClick={(
                                      event,
                                    ) => {
                                      event.stopPropagation();
                                      copyUserId(
                                        targetUser,
                                      );
                                    }}
                                  >
                                    <FiCopy
                                      size={11}
                                    />
                                  </IconButton>
                                </div>
                              </div>
                            </div>
                          </button>
                        );
                      },
                    )}
                  </div>
                )}
              </section>
            )}

            <section className="space-y-4 pt-5 border-t border-gray-100">
              <Field label="Título">
                <input
                  type="text"
                  value={form.title}
                  onChange={(event) =>
                    updateForm(
                      "title",
                      event.target.value,
                    )
                  }
                  maxLength={120}
                  placeholder="Título de la notificación"
                  className={inputClass}
                />
              </Field>

              <Field label="Mensaje">
                <textarea
                  value={form.message}
                  onChange={(event) =>
                    updateForm(
                      "message",
                      event.target.value,
                    )
                  }
                  maxLength={500}
                  rows={5}
                  placeholder="Escribe el mensaje para los usuarios..."
                  className={`${inputClass} h-auto py-4 resize-none`}
                />

                <p className="text-right text-[9px] text-gray-400 mt-1">
                  {form.message.length}/500
                </p>
              </Field>

              <div className="rounded-2xl bg-gray-50 border border-gray-100 p-4">
                <p className="text-[9px] font-black text-gray-400 uppercase tracking-wider">
                  Vista previa
                </p>

                <p className="text-sm font-black text-gray-800 mt-2">
                  {form.title.trim() ||
                    "Título de la notificación"}
                </p>

                <p className="text-xs text-gray-500 mt-1 whitespace-pre-wrap">
                  {form.message.trim() ||
                    "El mensaje aparecerá aquí."}
                </p>
              </div>

              <Button
                type="submit"
                variant="dark"
                size="lg"
                fullWidth
                loading={loading}
                loadingText="Enviando..."
                leftIcon={
                  <FiSend size={16} />
                }
              >
                Enviar notificación
              </Button>
            </section>
          </section>
        </form>
      </main>
    </div>
  );
};

const Field = ({
  label,
  hint,
  children,
}) => (
  <label className="block">
    <span className="text-[9px] font-black text-gray-500 uppercase tracking-wider ml-1 mb-2 block">
      {label}
    </span>

    {children}

    {hint && (
      <span className="text-[10px] text-gray-400 mt-2 ml-1 block">
        {hint}
      </span>
    )}
  </label>
);

const RoleBadge = ({ role }) => {
  const style =
    ROLE_STYLES[role] ||
    "bg-gray-50 text-gray-600 border-gray-200";

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[8px] font-black uppercase tracking-wider ${style}`}
    >
      {ROLE_LABELS[role] ||
        role ||
        "Sin rol"}
    </span>
  );
};

const EmptyState = ({
  title,
  description,
  action,
}) => (
  <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50/50 p-8 text-center">
    <FiUsers
      size={24}
      className="mx-auto text-gray-300"
    />

    <h3 className="text-sm font-black text-gray-700 mt-3">
      {title}
    </h3>

    {description && (
      <p className="text-xs text-gray-400 mt-2">
        {description}
      </p>
    )}

    {action && (
      <div className="mt-4">
        {action}
      </div>
    )}
  </div>
);

const inputClass = `
  w-full h-12 px-4
  bg-gray-50 border border-gray-100
  rounded-2xl
  text-sm font-semibold text-gray-700
  outline-none transition-all
  placeholder:text-gray-300
  focus:bg-white
  focus:border-[#87be00]/50
  focus:ring-4 focus:ring-[#87be00]/10
`;

export default NotificationManager;