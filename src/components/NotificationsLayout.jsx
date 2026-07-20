import {
  useMemo,
  useState,
} from "react";
import {
  AlertTriangle,
  Bell,
  BellOff,
  CheckCheck,
  CheckCircle2,
  Globe2,
  Inbox,
  Info,
  MapPin,
  Navigation,
  RefreshCcw,
  Search,
  User,
  X,
} from "lucide-react";
import {
  format,
  isValid,
} from "date-fns";
import { es } from "date-fns/locale";
import { useNotificationContext } from "../context/NotificationContext";
import {
  Button,
  IconButton,
} from "../components/ui";

const TYPE_LABELS = {
  URGENTE: "Urgente",
  OPERATIVA: "Operativa",
  ROUTE_ASSIGNED: "Ruta asignada",
  ROUTE_UPDATED: "Ruta actualizada",
  VISIT_COMPLETED: "Visita completada",
  GENERAL: "General",
};

const getTypeConfig = (type, unread) => {
  const normalizedType = String(type || "GENERAL").toUpperCase();

  const configs = {
    URGENTE: {
      label: "Urgente",
      icon: AlertTriangle,
      cardClasses: unread
        ? "bg-red-50/70 border-red-200 shadow-sm shadow-red-100/60"
        : "bg-red-50/30 border-red-100",
      iconClasses: unread
        ? "bg-red-500 text-white border-red-500 shadow-lg shadow-red-500/20"
        : "bg-red-100 text-red-400 border-red-100",
      titleClasses: unread ? "text-red-700" : "text-red-400",
      badgeClasses: "bg-red-100 text-red-700 border-red-200",
      statusClasses: unread
        ? "bg-red-100 text-red-700 border-red-200"
        : "bg-gray-100 text-gray-500 border-gray-200",
      statusDotClasses: unread ? "bg-red-500" : "bg-gray-300",
    },
    OPERATIVA: {
      label: "Operativa",
      icon: Info,
      cardClasses: unread
        ? "bg-white border-[#87be00]/25 shadow-sm"
        : "bg-gray-50 border-gray-100",
      iconClasses: unread
        ? "bg-[#87be00] text-white border-[#87be00]"
        : "bg-gray-200 text-gray-400 border-gray-200",
      titleClasses: unread ? "text-gray-900" : "text-gray-500",
      badgeClasses:
        "bg-[#87be00]/10 text-[#5c9200] border-[#87be00]/20",
      statusClasses: unread
        ? "bg-green-50 text-green-700 border-green-200"
        : "bg-gray-100 text-gray-500 border-gray-200",
      statusDotClasses: unread ? "bg-green-500" : "bg-gray-300",
    },
    ROUTE_ASSIGNED: {
      label: "Ruta asignada",
      icon: Navigation,
      cardClasses: unread
        ? "bg-blue-50/50 border-blue-200 shadow-sm"
        : "bg-gray-50 border-gray-100",
      iconClasses: unread
        ? "bg-blue-600 text-white border-blue-600"
        : "bg-gray-200 text-gray-400 border-gray-200",
      titleClasses: unread ? "text-blue-800" : "text-gray-500",
      badgeClasses: "bg-blue-50 text-blue-700 border-blue-200",
      statusClasses: unread
        ? "bg-blue-50 text-blue-700 border-blue-200"
        : "bg-gray-100 text-gray-500 border-gray-200",
      statusDotClasses: unread ? "bg-blue-500" : "bg-gray-300",
    },
    ROUTE_UPDATED: {
      label: "Ruta actualizada",
      icon: RefreshCcw,
      cardClasses: unread
        ? "bg-amber-50/50 border-amber-200 shadow-sm"
        : "bg-gray-50 border-gray-100",
      iconClasses: unread
        ? "bg-amber-500 text-white border-amber-500"
        : "bg-gray-200 text-gray-400 border-gray-200",
      titleClasses: unread ? "text-amber-800" : "text-gray-500",
      badgeClasses: "bg-amber-50 text-amber-700 border-amber-200",
      statusClasses: unread
        ? "bg-amber-50 text-amber-700 border-amber-200"
        : "bg-gray-100 text-gray-500 border-gray-200",
      statusDotClasses: unread ? "bg-amber-500" : "bg-gray-300",
    },
    VISIT_COMPLETED: {
      label: "Visita completada",
      icon: CheckCircle2,
      cardClasses: unread
        ? "bg-emerald-50/50 border-emerald-200 shadow-sm"
        : "bg-gray-50 border-gray-100",
      iconClasses: unread
        ? "bg-emerald-500 text-white border-emerald-500"
        : "bg-gray-200 text-gray-400 border-gray-200",
      titleClasses: unread ? "text-emerald-800" : "text-gray-500",
      badgeClasses:
        "bg-emerald-50 text-emerald-700 border-emerald-200",
      statusClasses: unread
        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
        : "bg-gray-100 text-gray-500 border-gray-200",
      statusDotClasses: unread ? "bg-emerald-500" : "bg-gray-300",
    },
    GENERAL: {
      label: "General",
      icon: Bell,
      cardClasses: unread
        ? "bg-white border-[#87be00]/20 shadow-sm"
        : "bg-gray-50 border-gray-100",
      iconClasses: unread
        ? "bg-[#87be00] text-white border-[#87be00]"
        : "bg-gray-200 text-gray-400 border-gray-200",
      titleClasses: unread ? "text-gray-900" : "text-gray-500",
      badgeClasses: "bg-gray-50 text-gray-600 border-gray-200",
      statusClasses: unread
        ? "bg-green-50 text-green-700 border-green-200"
        : "bg-gray-100 text-gray-500 border-gray-200",
      statusDotClasses: unread ? "bg-green-500" : "bg-gray-300",
    },
  };

  return configs[normalizedType] || {
    ...configs.GENERAL,
    label: TYPE_LABELS[normalizedType] || normalizedType,
  };
};

const getScopeConfig = (scope) => {
  if (scope === "global") {
    return {
      label: "Global",
      icon: Globe2,
      classes:
        "bg-blue-50 text-blue-600 border-blue-100",
    };
  }

  if (scope === "local") {
    return {
      label: "Local",
      icon: MapPin,
      classes:
        "bg-amber-50 text-amber-600 border-amber-100",
    };
  }

  if (scope === "individual") {
    return {
      label: "Individual",
      icon: User,
      classes:
        "bg-purple-50 text-purple-600 border-purple-100",
    };
  }

  return {
    label: "Notificación",
    icon: Bell,
    classes:
      "bg-gray-50 text-gray-500 border-gray-100",
  };
};

const formatNotificationDate = (value) => {
  if (!value) return "Sin fecha";

  const date = new Date(value);

  if (!isValid(date)) {
    return "Sin fecha";
  }

  return format(
    date,
    "dd MMM yyyy · HH:mm",
    {
      locale: es,
    },
  );
};

const NotificationsLayout = ({
  userRole,
}) => {
  const {
    notifications = [],
    onMarkRead,
    onMarkAllRead,
    loading,
    refresh,
  } = useNotificationContext();

  const [statusFilter, setStatusFilter] =
    useState("ALL");
  const [scopeFilter, setScopeFilter] =
    useState("ALL");
  const [searchTerm, setSearchTerm] =
    useState("");
  const [refreshing, setRefreshing] =
    useState(false);

  const unreadCount = useMemo(
    () =>
      notifications.filter(
        (notification) =>
          !notification.is_read,
      ).length,
    [notifications],
  );

  const filteredNotifications =
    useMemo(() => {
      const term = searchTerm
        .trim()
        .toLowerCase();

      return notifications.filter(
        (notification) => {
          const matchesStatus =
            statusFilter === "ALL" ||
            (statusFilter === "UNREAD"
              ? !notification.is_read
              : notification.is_read);

          const matchesScope =
            scopeFilter === "ALL" ||
            notification.scope ===
              scopeFilter;

          const searchableText = [
            notification.title,
            notification.message,
            notification.type,
            TYPE_LABELS[
              notification.type
            ],
            notification.scope,
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();

          const matchesSearch =
            !term ||
            searchableText.includes(
              term,
            );

          return (
            matchesStatus &&
            matchesScope &&
            matchesSearch
          );
        },
      );
    }, [
      notifications,
      statusFilter,
      scopeFilter,
      searchTerm,
    ]);

  const handleRefresh = async () => {
    try {
      setRefreshing(true);
      await refresh();
    } finally {
      setRefreshing(false);
    }
  };

  const clearFilters = () => {
    setStatusFilter("ALL");
    setScopeFilter("ALL");
    setSearchTerm("");
  };

  const hasFilters =
    statusFilter !== "ALL" ||
    scopeFilter !== "ALL" ||
    Boolean(searchTerm);

  if (
    loading &&
    notifications.length === 0
  ) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center px-4 text-center font-[Outfit]">
        <RefreshCcw
          className="animate-spin text-[#87be00] mb-4"
          size={34}
        />

        <p className="text-[10px] font-black text-gray-300 uppercase tracking-[0.2em]">
          Sincronizando notificaciones...
        </p>
      </div>
    );
  }

  return (
    <div className="w-full min-h-full bg-gray-50/40 font-[Outfit] pb-20">
      <header className="bg-white border-b border-gray-100">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 md:px-8 py-5 md:py-8 flex flex-col sm:flex-row sm:items-end justify-between gap-5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-[#87be00]/10 rounded-xl text-[#87be00]">
              <Bell size={20} />
            </div>

            <div>
              <h1 className="text-3xl md:text-5xl font-black text-gray-900 tracking-tight leading-none">
                Notificaciones
              </h1>

              <p className="text-[10px] font-black text-[#87be00] uppercase tracking-[0.2em] mt-2">
                Centro de comunicación
              </p>
            </div>
          </div>

          <div className="grid grid-cols-[1fr_auto] sm:flex gap-2 w-full sm:w-auto">
            <div className="min-h-11 px-4 rounded-xl bg-green-50 border border-green-100 flex items-center justify-center gap-2">
              <Inbox
                size={14}
                className="text-[#5c9200]"
              />

              <span className="text-[9px] font-black uppercase tracking-wider text-[#5c9200]">
                No leídas: {unreadCount}
              </span>
            </div>

            <IconButton
              label="Actualizar notificaciones"
              size="lg"
              onClick={handleRefresh}
              disabled={
                refreshing || loading
              }
            >
              <RefreshCcw
                size={17}
                className={
                  refreshing
                    ? "animate-spin"
                    : ""
                }
              />
            </IconButton>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 md:px-8 pt-6 space-y-6">
        <section className="bg-white p-4 sm:p-5 rounded-[2rem] border border-gray-100 shadow-sm">
          <div className="flex gap-2 overflow-x-auto pb-3 custom-scrollbar">
            {[
              {
                value: "ALL",
                label: "Todas",
              },
              {
                value: "UNREAD",
                label: "No leídas",
              },
              {
                value: "READ",
                label: "Leídas",
              },
            ].map((item) => (
              <button
                key={item.value}
                type="button"
                onClick={() =>
                  setStatusFilter(
                    item.value,
                  )
                }
                className={`px-4 py-2.5 rounded-full text-[10px] font-black uppercase tracking-wider transition-all whitespace-nowrap border ${
                  statusFilter ===
                  item.value
                    ? "bg-gray-900 text-white border-gray-900"
                    : "bg-white text-gray-500 border-gray-200 hover:border-[#87be00] hover:text-[#87be00]"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-[220px_1fr] gap-3">
            <select
              value={scopeFilter}
              onChange={(event) =>
                setScopeFilter(
                  event.target.value,
                )
              }
              className="w-full h-12 px-4 bg-gray-50 border border-gray-100 rounded-2xl text-xs font-black text-gray-600 outline-none focus:bg-white focus:border-[#87be00]/50 transition-all cursor-pointer"
            >
              <option value="ALL">
                Todos los alcances
              </option>
              <option value="global">
                Global
              </option>
              <option value="local">
                Local
              </option>
              <option value="individual">
                Individual
              </option>
            </select>

            <div className="relative">
              <Search
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
                placeholder="Buscar por título, mensaje o tipo..."
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
                  <X size={15} />
                </button>
              )}
            </div>
          </div>

          {hasFilters && (
            <div className="mt-4">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                leftIcon={<X size={13} />}
                onClick={clearFilters}
              >
                Limpiar filtros
              </Button>
            </div>
          )}
        </section>

        <section className="bg-white rounded-[2rem] p-4 md:p-6 border border-gray-100 shadow-sm">
          {notifications.length > 0 && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 pb-4 border-b border-gray-100">
              <div>
                <h2 className="text-[10px] font-black uppercase text-gray-500 tracking-wider flex items-center gap-2">
                  <Inbox
                    size={14}
                    className="text-[#87be00]"
                  />

                  {
                    filteredNotifications.length
                  }{" "}
                  notificación
                  {filteredNotifications.length ===
                  1
                    ? ""
                    : "es"}
                </h2>

                <p className="text-[10px] text-gray-400 mt-1">
                  Rol actual:{" "}
                  {userRole || "Sin rol"}
                </p>
              </div>

              {unreadCount > 0 && (
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  leftIcon={
                    <CheckCheck
                      size={14}
                    />
                  }
                  onClick={onMarkAllRead}
                >
                  Marcar todas como leídas
                </Button>
              )}
            </div>
          )}

          {filteredNotifications.length ===
          0 ? (
            <EmptyState
              filtered={
                notifications.length > 0
              }
              onClear={
                hasFilters
                  ? clearFilters
                  : undefined
              }
            />
          ) : (
            <div className="space-y-3">
              {filteredNotifications.map(
                (notification) => (
                  <NotificationCard
                    key={notification.id}
                    notification={
                      notification
                    }
                    onMarkRead={
                      onMarkRead
                    }
                  />
                ),
              )}
            </div>
          )}
        </section>
      </main>
    </div>
  );
};

const NotificationCard = ({
  notification,
  onMarkRead,
}) => {
  const unread = !notification.is_read;
  const scope = getScopeConfig(
    String(notification.scope || "").toLowerCase(),
  );
  const ScopeIcon = scope.icon;

  const typeConfig = getTypeConfig(
    notification.type,
    unread,
  );
  const TypeIcon = typeConfig.icon;

  return (
    <article
      className={`relative rounded-[1.5rem] border p-4 transition-all sm:p-5 ${typeConfig.cardClasses}`}
    >
      <div className="flex items-start gap-3 sm:gap-4">
        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border ${typeConfig.iconClasses}`}
          title={typeConfig.label}
        >
          <TypeIcon size={18} />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-start">
            <div className="min-w-0">
              <h3
                className={`break-words text-sm font-black leading-tight sm:text-base ${typeConfig.titleClasses}`}
              >
                {notification.title ||
                  "Notificación sin título"}
              </h3>

              <div className="mt-2 flex flex-wrap gap-1.5">
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[8px] font-black uppercase tracking-wider ${typeConfig.badgeClasses}`}
                >
                  <TypeIcon size={10} />
                  {typeConfig.label}
                </span>

                <span
                  className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[8px] font-black uppercase tracking-wider ${scope.classes}`}
                >
                  <ScopeIcon size={10} />
                  {scope.label}
                </span>
              </div>
            </div>

            <span
              className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[8px] font-black uppercase tracking-wider ${typeConfig.statusClasses}`}
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${typeConfig.statusDotClasses}`}
              />
              {unread ? "Nueva" : "Leída"}
            </span>
          </div>

          <p
            className={`mt-3 whitespace-pre-wrap break-words text-xs leading-relaxed sm:text-sm ${
              unread
                ? "text-gray-700"
                : "text-gray-400"
            }`}
          >
            {notification.message ||
              "Sin contenido"}
          </p>

          <div className="mt-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
            <span className="text-[9px] font-black uppercase tracking-wider text-gray-400">
              {formatNotificationDate(
                notification.created_at,
              )}
            </span>

            {unread && (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                leftIcon={
                  <CheckCheck size={13} />
                }
                onClick={() =>
                  onMarkRead(notification.id)
                }
              >
                Marcar como leída
              </Button>
            )}
          </div>
        </div>
      </div>
    </article>
  );
};

const EmptyState = ({
  filtered,
  onClear,
}) => (
  <div className="bg-gray-50 rounded-[1.5rem] p-10 text-center border border-dashed border-gray-200">
    <BellOff
      className="mx-auto text-gray-300"
      size={32}
    />

    <h2 className="text-sm font-black text-gray-600 mt-4">
      Sin información disponible
    </h2>

    <p className="text-xs text-gray-400 mt-2">
      {filtered
        ? "No hay notificaciones que coincidan con los filtros seleccionados."
        : "No tienes notificaciones disponibles."}
    </p>

    {onClear && (
      <Button
        type="button"
        variant="secondary"
        size="sm"
        onClick={onClear}
        className="mt-5"
      >
        Limpiar filtros
      </Button>
    )}
  </div>
);

export default NotificationsLayout;