import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  FiBriefcase,
  FiCopy,
  FiMonitor,
  FiRefreshCw,
  FiSearch,
  FiSmartphone,
  FiTablet,
  FiUser,
  FiWifi,
  FiWifiOff,
  FiX,
} from "react-icons/fi";
import {
  AnimatePresence,
  motion,
} from "framer-motion";
import { io } from "socket.io-client";
import { toast } from "react-hot-toast";
import api from "../../api/apiClient";
import {
  Button,
  IconButton,
} from "../../components/ui";

const SOCKET_URL =
  import.meta.env.VITE_API_URL;
const REFRESH_INTERVAL = 10000;

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

const getSessions = (user) =>
  Array.isArray(user?.sessions)
    ? [...user.sessions]
    : [];

const getPrimarySession = (user) => {
  const sessions = getSessions(user);

  sessions.sort((a, b) => {
    const dateA = new Date(
      a?.last_seen_at ||
        a?.connected_at ||
        0,
    ).getTime();

    const dateB = new Date(
      b?.last_seen_at ||
        b?.connected_at ||
        0,
    ).getTime();

    return dateB - dateA;
  });

  return (
    sessions.find(
      (session) => session?.is_online,
    ) ||
    sessions[0] ||
    null
  );
};

const normalizeDeviceType = (user) => {
  const primarySession =
    getPrimarySession(user);

  const value = String(
    primarySession?.device_type ||
      user?.device_type ||
      user?.session_device_type ||
      user?.devices?.[0] ||
      "",
  )
    .trim()
    .toUpperCase();

  if (value === "MOBILE") {
    return "MOBILE";
  }

  if (value === "TABLET") {
    return "TABLET";
  }

  if (value === "DESKTOP") {
    return "DESKTOP";
  }

  const userAgent = String(
    primarySession?.user_agent ||
      user?.user_agent ||
      "",
  );

  if (
    /iPad|Tablet|PlayBook|Silk/i.test(
      userAgent,
    ) ||
    (/Android/i.test(userAgent) &&
      !/Mobile/i.test(userAgent))
  ) {
    return "TABLET";
  }

  if (
    /Android|iPhone|iPod|Windows Phone|Mobile/i.test(
      userAgent,
    )
  ) {
    return "MOBILE";
  }

  return null;
};

const getDeviceConfig = (user) => {
  const type = normalizeDeviceType(user);

  if (type === "MOBILE") {
    return {
      type,
      label: "Móvil",
      icon: FiSmartphone,
      classes:
        "bg-blue-50 text-blue-600 border-blue-100",
    };
  }

  if (type === "TABLET") {
    return {
      type,
      label: "Tablet",
      icon: FiTablet,
      classes:
        "bg-violet-50 text-violet-600 border-violet-100",
    };
  }

  if (type === "DESKTOP") {
    return {
      type,
      label: "Escritorio",
      icon: FiMonitor,
      classes:
        "bg-slate-100 text-slate-600 border-slate-200",
    };
  }

  return {
    type: null,
    label: "Sin identificar",
    icon: FiUser,
    classes:
      "bg-amber-50 text-amber-600 border-amber-100",
  };
};

const isUserOnline = (user) => {
  if (
    typeof user?.is_online === "boolean"
  ) {
    return user.is_online;
  }

  const primarySession =
    getPrimarySession(user);

  if (
    typeof primarySession?.is_online ===
    "boolean"
  ) {
    return primarySession.is_online;
  }

  const lastSeen =
    primarySession?.last_seen_at ||
    user?.last_seen_at;

  if (lastSeen) {
    const timestamp =
      new Date(lastSeen).getTime();

    if (!Number.isNaN(timestamp)) {
      return (
        Date.now() - timestamp <= 90000
      );
    }
  }

  return (
    user?.current_session_id != null
  );
};

const getUserName = (user) =>
  [user?.first_name, user?.last_name]
    .filter(Boolean)
    .join(" ")
    .trim() ||
  user?.name ||
  user?.email ||
  "Usuario sin nombre";

const formatDateTime = (value) => {
  if (!value) return "Sin registro";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Sin registro";
  }

  return date.toLocaleString("es-CL", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const getLastSeen = (user) => {
  const primarySession =
    getPrimarySession(user);

  return (
    primarySession?.last_seen_at ||
    user?.last_seen_at ||
    primarySession?.connected_at ||
    user?.connected_at ||
    null
  );
};

const ActiveSessions = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] =
    useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] =
    useState("ONLINE");
  const [
    deviceFilter,
    setDeviceFilter,
  ] = useState("ALL");
  const [roleFilter, setRoleFilter] =
    useState("");
  const [
    companyFilter,
    setCompanyFilter,
  ] = useState("");
  const [searchTerm, setSearchTerm] =
    useState("");
  const [
    lastUpdated,
    setLastUpdated,
  ] = useState(null);

  const fetchingRef = useRef(false);
  const mountedRef = useRef(true);

  const fetchSessions =
    useCallback(async () => {
      if (fetchingRef.current) return;

      fetchingRef.current = true;

      try {
        setError("");

        const response = await api.get(
          `/users/sessions/active?ts=${Date.now()}`,
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

        if (mountedRef.current) {
          setUsers(data);
          setLastUpdated(new Date());
        }
      } catch (requestError) {
        console.error(
          "Error cargando sesiones:",
          requestError,
        );

        if (mountedRef.current) {
          setError(
            requestError?.response?.data
              ?.message ||
              requestError?.message ||
              "No se pudieron cargar las sesiones.",
          );
        }
      } finally {
        fetchingRef.current = false;

        if (mountedRef.current) {
          setLoading(false);
        }
      }
    }, []);

  useEffect(() => {
    mountedRef.current = true;

    const socket = io(SOCKET_URL, {
      withCredentials: true,
      transports: [
        "websocket",
        "polling",
      ],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 10000,
      timeout: 20000,
    });

    const refreshWhenVisible = () => {
      if (
        document.visibilityState ===
        "visible"
      ) {
        fetchSessions();
      }
    };

    const handleRefresh = () => {
      fetchSessions();
    };

    fetchSessions();

    socket.on(
      "radar_update",
      handleRefresh,
    );

    document.addEventListener(
      "visibilitychange",
      refreshWhenVisible,
    );

    window.addEventListener(
      "focus",
      handleRefresh,
    );

    window.addEventListener(
      "pageshow",
      handleRefresh,
    );

    window.addEventListener(
      "online",
      handleRefresh,
    );

    const interval =
      window.setInterval(
        fetchSessions,
        REFRESH_INTERVAL,
      );

    return () => {
      mountedRef.current = false;

      window.clearInterval(interval);

      document.removeEventListener(
        "visibilitychange",
        refreshWhenVisible,
      );

      window.removeEventListener(
        "focus",
        handleRefresh,
      );

      window.removeEventListener(
        "pageshow",
        handleRefresh,
      );

      window.removeEventListener(
        "online",
        handleRefresh,
      );

      socket.off(
        "radar_update",
        handleRefresh,
      );

      socket.disconnect();
    };
  }, [fetchSessions]);

  const onlineUsersCount = useMemo(
    () =>
      users.filter(isUserOnline).length,
    [users],
  );

  const offlineUsersCount = useMemo(
    () =>
      users.filter(
        (user) => !isUserOnline(user),
      ).length,
    [users],
  );

  const companies = useMemo(
    () =>
      [
        ...new Set(
          users
            .map(
              (user) =>
                user.company_name ||
                user.company?.name,
            )
            .filter(Boolean),
        ),
      ].sort((a, b) =>
        a.localeCompare(b, "es"),
      ),
    [users],
  );

  const filteredUsers = useMemo(() => {
    let result = [...users];

    if (filter === "ONLINE") {
      result = result.filter(
        isUserOnline,
      );
    }

    if (filter === "OFFLINE") {
      result = result.filter(
        (user) => !isUserOnline(user),
      );
    }

    if (deviceFilter !== "ALL") {
      result = result.filter(
        (user) =>
          normalizeDeviceType(user) ===
          deviceFilter,
      );
    }

    if (roleFilter) {
      result = result.filter(
        (user) =>
          user.role === roleFilter,
      );
    }

    if (companyFilter) {
      result = result.filter(
        (user) =>
          (user.company_name ||
            user.company?.name) ===
          companyFilter,
      );
    }

    const term = searchTerm
      .trim()
      .toLowerCase();

    if (term) {
      result = result.filter((user) => {
        const searchableText = [
          getUserName(user),
          user.email,
          user.company_name,
          user.company?.name,
          user.role,
          ROLE_LABELS[user.role],
          user.id,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        return searchableText.includes(
          term,
        );
      });
    }

    return result.sort((a, b) => {
      const onlineDifference =
        Number(isUserOnline(b)) -
        Number(isUserOnline(a));

      if (onlineDifference !== 0) {
        return onlineDifference;
      }

      return getUserName(a).localeCompare(
        getUserName(b),
        "es",
      );
    });
  }, [
    users,
    filter,
    deviceFilter,
    roleFilter,
    companyFilter,
    searchTerm,
  ]);

  const hasActiveFilters =
    filter !== "ONLINE" ||
    deviceFilter !== "ALL" ||
    Boolean(roleFilter) ||
    Boolean(companyFilter) ||
    Boolean(searchTerm);

  const clearFilters = () => {
    setFilter("ONLINE");
    setDeviceFilter("ALL");
    setRoleFilter("");
    setCompanyFilter("");
    setSearchTerm("");
  };

  const copyUserId = async (user) => {
    const userId = String(
      user?.id || "",
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

  if (loading && users.length === 0) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4 font-[Outfit] px-4 text-center">
        <FiRefreshCw
          size={38}
          className="animate-spin text-[#87be00]"
        />

        <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.22em]">
          Cargando radar de sesiones...
        </p>
      </div>
    );
  }

  if (error && users.length === 0) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center p-4 font-[Outfit]">
        <div className="w-full max-w-lg bg-white border border-red-100 rounded-3xl p-7 text-center shadow-sm">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-red-50 text-red-500 flex items-center justify-center">
            <FiWifiOff size={22} />
          </div>

          <h1 className="mt-4 text-lg font-black text-gray-800">
            No se pudieron cargar las
            sesiones
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
            onClick={fetchSessions}
            className="mt-5"
          >
            Intentar nuevamente
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full min-h-full bg-slate-50/50 font-[Outfit] pb-20">
      <div className="max-w-[1500px] mx-auto px-4 sm:px-6 md:px-8 pt-4 md:pt-8 space-y-6">
        <header className="flex flex-col lg:flex-row lg:items-end justify-between gap-5">
          <div>
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-[#87be00]/10 rounded-xl text-[#87be00]">
                <FiMonitor size={20} />
              </div>

              <div>
                <h1 className="text-3xl md:text-5xl font-black text-gray-900 tracking-tight leading-none">
                  Sesiones activas
                </h1>

                <p className="text-[10px] font-black text-[#87be00] uppercase tracking-[0.2em] mt-2">
                  Monitoreo global en tiempo
                  real
                </p>
              </div>
            </div>

            {lastUpdated && (
              <p className="text-[10px] text-gray-400 mt-3">
                Última actualización:{" "}
                {lastUpdated.toLocaleTimeString(
                  "es-CL",
                  {
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit",
                  },
                )}
              </p>
            )}
          </div>

          <div className="grid grid-cols-[1fr_1fr_auto] gap-2 w-full lg:w-auto">
            <StatusCounter
              label="Desconectados"
              value={offlineUsersCount}
              icon={
                <FiWifiOff size={13} />
              }
              tone="neutral"
            />

            <StatusCounter
              label="Conectados"
              value={onlineUsersCount}
              icon={<FiWifi size={13} />}
              tone="success"
            />

            <IconButton
              label="Actualizar sesiones"
              size="lg"
              onClick={fetchSessions}
              disabled={fetchingRef.current}
            >
              <FiRefreshCw
                size={17}
                className={
                  fetchingRef.current
                    ? "animate-spin"
                    : ""
                }
              />
            </IconButton>
          </div>
        </header>

        {error && users.length > 0 && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-semibold text-amber-700">
            No se pudo actualizar el radar.
            Se muestran los últimos datos
            disponibles.
          </div>
        )}

        <section className="bg-white border border-gray-100 rounded-[2rem] shadow-sm p-4 sm:p-5">
          <div className="flex gap-2 overflow-x-auto pb-3 custom-scrollbar">
            {[
              {
                value: "ALL",
                label: "Red completa",
              },
              {
                value: "ONLINE",
                label: "Conectados",
              },
              {
                value: "OFFLINE",
                label: "Desconectados",
              },
            ].map((item) => (
              <button
                key={item.value}
                type="button"
                onClick={() =>
                  setFilter(item.value)
                }
                className={`px-4 py-2.5 rounded-full text-[10px] font-black uppercase tracking-wider transition-all whitespace-nowrap border ${
                  filter === item.value
                    ? "bg-gray-900 text-white border-gray-900"
                    : "bg-white text-gray-500 border-gray-200 hover:border-[#87be00] hover:text-[#87be00]"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 mt-1">
            <select
              value={deviceFilter}
              onChange={(event) =>
                setDeviceFilter(
                  event.target.value,
                )
              }
              className="w-full h-12 px-4 bg-gray-50 border border-gray-100 rounded-2xl text-xs font-black text-gray-600 outline-none focus:bg-white focus:border-[#87be00]/50 transition-all cursor-pointer"
            >
              <option value="ALL">
                Todos los dispositivos
              </option>
              <option value="MOBILE">
                Móviles
              </option>
              <option value="TABLET">
                Tablets
              </option>
              <option value="DESKTOP">
                Escritorio
              </option>
            </select>

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
              <option value="ROOT">
                Administrador general
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

            <div className="relative">
              <FiBriefcase
                size={15}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
              />

              <select
                value={companyFilter}
                onChange={(event) =>
                  setCompanyFilter(
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
                      key={company}
                      value={company}
                    >
                      {company}
                    </option>
                  ),
                )}
              </select>
            </div>

            <div className="relative">
              <FiSearch
                className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
                size={15}
              />

              <input
                type="search"
                placeholder="Buscar nombre, correo o ID..."
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
            onClear={
              hasActiveFilters
                ? clearFilters
                : undefined
            }
          />
        ) : (
          <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            <AnimatePresence mode="popLayout">
              {filteredUsers.map((user) => {
                const online =
                  isUserOnline(user);
                const device =
                  getDeviceConfig(user);
                const DeviceIcon =
                  device.icon;
                const lastSeen =
                  getLastSeen(user);

                return (
                  <motion.article
                    layout
                    initial={{
                      opacity: 0,
                      y: 8,
                    }}
                    animate={{
                      opacity: 1,
                      y: 0,
                    }}
                    exit={{
                      opacity: 0,
                      scale: 0.97,
                    }}
                    transition={{
                      duration: 0.16,
                    }}
                    key={user.id}
                    className="bg-white p-5 rounded-[2rem] border border-gray-100 shadow-sm hover:shadow-md transition-shadow min-w-0"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3 min-w-0">
                        <div
                          className={`relative w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 border ${
                            online
                              ? "bg-green-50 text-[#5c9200] border-green-100"
                              : "bg-gray-50 text-gray-400 border-gray-200"
                          }`}
                        >
                          {online ? (
                            <FiWifi size={17} />
                          ) : (
                            <FiUser size={17} />
                          )}

                          <span
                            className={`absolute -top-1 -right-1 w-3 h-3 rounded-full border-2 border-white ${
                              online
                                ? "bg-[#87be00]"
                                : "bg-gray-300"
                            }`}
                          />
                        </div>

                        <div className="min-w-0">
                          <p className="text-sm font-black text-gray-900 leading-tight truncate">
                            {getUserName(user)}
                          </p>

                          <p className="text-[10px] text-gray-400 truncate mt-1">
                            {user.email ||
                              "Sin correo"}
                          </p>

                          <div className="flex flex-wrap gap-1.5 mt-2">
                            <RoleBadge
                              role={user.role}
                            />

                            <span
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[8px] font-black uppercase tracking-wider ${device.classes}`}
                            >
                              <DeviceIcon
                                size={10}
                              />
                              {device.label}
                            </span>
                          </div>
                        </div>
                      </div>

                      <StatusBadge
                        online={online}
                      />
                    </div>

                    <UserId
                      id={user.id}
                      onCopy={() =>
                        copyUserId(user)
                      }
                      className="mt-4"
                    />

                    <div className="grid grid-cols-2 gap-2 mt-4">
                      <InfoBlock
                        label="Empresa"
                        value={
                          user.company_name ||
                          user.company?.name ||
                          "Sin empresa"
                        }
                      />

                      <InfoBlock
                        label="Última actividad"
                        value={formatDateTime(
                          lastSeen,
                        )}
                      />
                    </div>
                  </motion.article>
                );
              })}
            </AnimatePresence>
          </section>
        )}
      </div>
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
        className="min-w-0 flex-1 truncate rounded-xl border border-gray-100 bg-gray-50 px-3 py-2 font-mono text-[9px] text-gray-500 select-all"
        title={normalizedId}
      >
        ID: {normalizedId}
      </span>

      <IconButton
        label="Copiar ID del usuario"
        size="sm"
        onClick={onCopy}
        className="shrink-0"
      >
        <FiCopy size={13} />
      </IconButton>
    </div>
  );
};

const StatusCounter = ({
  label,
  value,
  icon,
  tone,
}) => {
  const styles =
    tone === "success"
      ? "bg-green-50 border-green-100 text-[#5c9200]"
      : "bg-white border-gray-200 text-gray-500";

  return (
    <div
      className={`min-h-11 px-3 rounded-xl border flex items-center justify-center gap-2 ${styles}`}
    >
      {icon}

      <span className="text-[9px] font-black uppercase tracking-wider whitespace-nowrap">
        {label}: {value}
      </span>
    </div>
  );
};

const StatusBadge = ({ online }) => (
  <span
    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[8px] font-black uppercase tracking-wider shrink-0 ${
      online
        ? "bg-green-50 text-green-700 border-green-200"
        : "bg-gray-50 text-gray-500 border-gray-200"
    }`}
  >
    <span
      className={`w-1.5 h-1.5 rounded-full ${
        online
          ? "bg-green-500 animate-pulse"
          : "bg-gray-300"
      }`}
    />

    {online
      ? "Conectado"
      : "Desconectado"}
  </span>
);

const InfoBlock = ({
  label,
  value,
}) => (
  <div className="bg-gray-50 border border-gray-100 rounded-xl p-3 min-w-0">
    <p className="text-[8px] font-black text-gray-400 uppercase tracking-wider">
      {label}
    </p>

    <p
      className="text-[10px] font-bold text-gray-700 mt-1 truncate"
      title={value}
    >
      {value}
    </p>
  </div>
);

const EmptyState = ({ onClear }) => (
  <div className="bg-white border border-dashed border-gray-200 rounded-[2rem] py-14 px-6 text-center">
    <FiMonitor
      size={27}
      className="mx-auto text-gray-300"
    />

    <h2 className="mt-4 text-lg font-black text-gray-800">
      No hay sesiones coincidentes
    </h2>

    <p className="mt-2 text-sm text-gray-400">
      No existen usuarios que coincidan con
      los filtros seleccionados.
    </p>

    {onClear && (
      <Button
        type="button"
        variant="secondary"
        onClick={onClear}
        className="mt-5"
      >
        Limpiar filtros
      </Button>
    )}
  </div>
);

export default ActiveSessions;