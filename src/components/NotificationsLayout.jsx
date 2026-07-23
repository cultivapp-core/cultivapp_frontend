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
  ChevronDown,
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

import {
  useNotificationContext,
} from "../context/NotificationContext";

const TYPE_LABELS = {
  URGENTE: "Urgente",
  OPERATIVA: "Operativa",
  ROUTE_ASSIGNED:
    "Ruta asignada",
  ROUTE_UPDATED:
    "Ruta actualizada",
  VISIT_COMPLETED:
    "Visita completada",
  GENERAL: "General",
};

const ROLE_LABELS = {
  MERCADERISTA:
    "Mercaderista",
  USUARIO: "Mercaderista",
  VIEW: "Viewer",
  SUPERVISOR:
    "Supervisor",
  ADMIN_CLIENTE:
    "Administrador",
  ROOT: "Root",
};

const isNotificationRead = (
  notification,
) =>
  notification?.is_read ===
    true ||
  notification?.is_read ===
    1 ||
  String(
    notification?.is_read,
  ).toLowerCase() ===
    "true";

const getTypeConfig = (
  type,
  unread,
) => {
  const normalizedType =
    String(
      type || "GENERAL",
    ).toUpperCase();

  const configs = {
    URGENTE: {
      label: "Urgente",
      icon: AlertTriangle,
      cardClasses: unread
        ? "border-red-200 bg-red-50/70 shadow-sm"
        : "border-slate-200 bg-white",
      iconClasses: unread
        ? "bg-red-500 text-white"
        : "bg-slate-100 text-slate-400",
      titleClasses: unread
        ? "text-red-700"
        : "text-slate-600",
      badgeClasses:
        "border-red-200 bg-red-100 text-red-700",
      dotClasses:
        "bg-red-500",
    },
    OPERATIVA: {
      label: "Operativa",
      icon: Info,
      cardClasses: unread
        ? "border-[#87be00]/25 bg-white shadow-sm"
        : "border-slate-200 bg-white",
      iconClasses: unread
        ? "bg-[#87be00] text-white"
        : "bg-slate-100 text-slate-400",
      titleClasses: unread
        ? "text-slate-900"
        : "text-slate-600",
      badgeClasses:
        "border-[#87be00]/20 bg-[#87be00]/10 text-[#5c9200]",
      dotClasses:
        "bg-[#87be00]",
    },
    ROUTE_ASSIGNED: {
      label:
        "Ruta asignada",
      icon: Navigation,
      cardClasses: unread
        ? "border-blue-200 bg-blue-50/50 shadow-sm"
        : "border-slate-200 bg-white",
      iconClasses: unread
        ? "bg-blue-600 text-white"
        : "bg-slate-100 text-slate-400",
      titleClasses: unread
        ? "text-blue-800"
        : "text-slate-600",
      badgeClasses:
        "border-blue-200 bg-blue-50 text-blue-700",
      dotClasses:
        "bg-blue-500",
    },
    ROUTE_UPDATED: {
      label:
        "Ruta actualizada",
      icon: RefreshCcw,
      cardClasses: unread
        ? "border-amber-200 bg-amber-50/60 shadow-sm"
        : "border-slate-200 bg-white",
      iconClasses: unread
        ? "bg-amber-500 text-white"
        : "bg-slate-100 text-slate-400",
      titleClasses: unread
        ? "text-amber-800"
        : "text-slate-600",
      badgeClasses:
        "border-amber-200 bg-amber-50 text-amber-700",
      dotClasses:
        "bg-amber-500",
    },
    VISIT_COMPLETED: {
      label:
        "Visita completada",
      icon: CheckCircle2,
      cardClasses: unread
        ? "border-emerald-200 bg-emerald-50/60 shadow-sm"
        : "border-slate-200 bg-white",
      iconClasses: unread
        ? "bg-emerald-500 text-white"
        : "bg-slate-100 text-slate-400",
      titleClasses: unread
        ? "text-emerald-800"
        : "text-slate-600",
      badgeClasses:
        "border-emerald-200 bg-emerald-50 text-emerald-700",
      dotClasses:
        "bg-emerald-500",
    },
    GENERAL: {
      label: "General",
      icon: Bell,
      cardClasses: unread
        ? "border-[#87be00]/20 bg-white shadow-sm"
        : "border-slate-200 bg-white",
      iconClasses: unread
        ? "bg-[#87be00] text-white"
        : "bg-slate-100 text-slate-400",
      titleClasses: unread
        ? "text-slate-900"
        : "text-slate-600",
      badgeClasses:
        "border-slate-200 bg-slate-50 text-slate-600",
      dotClasses:
        "bg-[#87be00]",
    },
  };

  return (
    configs[
      normalizedType
    ] || {
      ...configs.GENERAL,
      label:
        TYPE_LABELS[
          normalizedType
        ] ||
        normalizedType,
    }
  );
};

const getScopeConfig = (
  scope,
) => {
  const normalizedScope =
    String(scope || "")
      .trim()
      .toLowerCase();

  if (
    normalizedScope ===
    "global"
  ) {
    return {
      label: "Global",
      icon: Globe2,
      classes:
        "border-blue-100 bg-blue-50 text-blue-600",
    };
  }

  if (
    normalizedScope ===
    "local"
  ) {
    return {
      label: "Local",
      icon: MapPin,
      classes:
        "border-amber-100 bg-amber-50 text-amber-600",
    };
  }

  if (
    normalizedScope ===
    "individual"
  ) {
    return {
      label: "Individual",
      icon: User,
      classes:
        "border-violet-100 bg-violet-50 text-violet-600",
    };
  }

  return {
    label:
      "Notificación",
    icon: Bell,
    classes:
      "border-slate-200 bg-slate-50 text-slate-500",
  };
};

const formatNotificationDate = (
  value,
) => {
  if (!value) {
    return "Sin fecha";
  }

  const date =
    new Date(value);

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

const getTimestamp = (
  notification,
) => {
  const date =
    new Date(
      notification?.created_at ||
        0,
    );

  return isValid(date)
    ? date.getTime()
    : 0;
};

const NotificationsLayout = ({
  userRole,
}) => {
  const {
    notifications = [],
    onMarkRead,
    onMarkAllRead,
    loading = false,
    refresh,
  } = useNotificationContext();

  const [
    statusFilter,
    setStatusFilter,
  ] = useState("ALL");

  const [
    scopeFilter,
    setScopeFilter,
  ] = useState("ALL");

  const [
    searchTerm,
    setSearchTerm,
  ] = useState("");

  const [
    refreshing,
    setRefreshing,
  ] = useState(false);

  const [
    markingAll,
    setMarkingAll,
  ] = useState(false);

  const [
    markingId,
    setMarkingId,
  ] = useState(null);

  const unreadCount =
    useMemo(
      () =>
        notifications.filter(
          (notification) =>
            !isNotificationRead(
              notification,
            ),
        ).length,
      [notifications],
    );

  const readCount =
    notifications.length -
    unreadCount;

  const filteredNotifications =
    useMemo(() => {
      const term =
        searchTerm
          .trim()
          .toLowerCase();

      return [
        ...notifications,
      ]
        .sort(
          (
            first,
            second,
          ) =>
            getTimestamp(
              second,
            ) -
            getTimestamp(
              first,
            ),
        )
        .filter(
          (
            notification,
          ) => {
            const isRead =
              isNotificationRead(
                notification,
              );

            const matchesStatus =
              statusFilter ===
                "ALL" ||
              (statusFilter ===
              "UNREAD"
                ? !isRead
                : isRead);

            const normalizedScope =
              String(
                notification.scope ||
                  "",
              ).toLowerCase();

            const matchesScope =
              scopeFilter ===
                "ALL" ||
              normalizedScope ===
                scopeFilter;

            const searchableText =
              [
                notification.title,
                notification.message,
                notification.type,
                TYPE_LABELS[
                  notification.type
                ],
                notification.scope,
              ]
                .filter(
                  Boolean,
                )
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

  const handleRefresh =
    async () => {
      if (
        typeof refresh !==
        "function"
      ) {
        return;
      }

      try {
        setRefreshing(true);
        await refresh();
      } finally {
        setRefreshing(false);
      }
    };

  const handleMarkRead =
    async (
      notificationId,
    ) => {
      if (
        typeof onMarkRead !==
        "function"
      ) {
        return;
      }

      try {
        setMarkingId(
          notificationId,
        );

        await onMarkRead(
          notificationId,
        );
      } finally {
        setMarkingId(
          null,
        );
      }
    };

  const handleMarkAllRead =
    async () => {
      if (
        typeof onMarkAllRead !==
        "function"
      ) {
        return;
      }

      try {
        setMarkingAll(true);
        await onMarkAllRead();
      } finally {
        setMarkingAll(false);
      }
    };

  const clearFilters = () => {
    setStatusFilter("ALL");
    setScopeFilter("ALL");
    setSearchTerm("");
  };

  const hasFilters =
    statusFilter !==
      "ALL" ||
    scopeFilter !==
      "ALL" ||
    Boolean(searchTerm);

  const roleLabel =
    ROLE_LABELS[
      userRole
    ] ||
    userRole ||
    "Mercaderista";

  if (
    loading &&
    notifications.length ===
      0
  ) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center bg-slate-50 px-4 font-[Outfit]">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#87be00]/10 text-[#87be00]">
            <RefreshCcw
              className="animate-spin"
              size={22}
            />
          </div>

          <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">
            Sincronizando notificaciones
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-slate-50 px-4 pb-[calc(6rem+env(safe-area-inset-bottom))] pt-5 font-[Outfit] sm:px-5 md:px-6 md:pb-10">
      <div className="mx-auto flex w-full max-w-[820px] flex-col gap-5">
        {/* CABECERA */}
        <header className="overflow-hidden rounded-[2rem] bg-slate-900 p-5 text-white shadow-xl shadow-slate-900/10">
          <div className="flex items-start justify-between gap-4">
            <div className="flex min-w-0 items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-[#a8d52c]">
                <Bell
                  size={20}
                />
              </div>

              <div className="min-w-0">
                <p className="text-[9px] font-black uppercase tracking-[0.22em] text-[#a8d52c]">
                  Centro de comunicación
                </p>

                <h1 className="mt-1 text-2xl font-black tracking-tight">
                  Notificaciones
                </h1>

                <p className="mt-2 text-sm text-slate-400">
                  Información para tu perfil{" "}
                  {roleLabel}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={
                handleRefresh
              }
              disabled={
                refreshing ||
                loading
              }
              aria-label="Actualizar notificaciones"
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-white transition hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <RefreshCcw
                size={17}
                className={
                  refreshing
                    ? "animate-spin"
                    : ""
                }
              />
            </button>
          </div>

          <div className="mt-5 grid grid-cols-3 gap-2">
            <div className="rounded-2xl bg-white/5 p-3">
              <p className="text-xl font-black text-white">
                {
                  notifications.length
                }
              </p>

              <p className="mt-1 text-[7px] font-black uppercase tracking-wider text-slate-400">
                Total
              </p>
            </div>

            <div className="rounded-2xl bg-white/5 p-3">
              <p className="text-xl font-black text-[#a8d52c]">
                {unreadCount}
              </p>

              <p className="mt-1 text-[7px] font-black uppercase tracking-wider text-slate-400">
                Nuevas
              </p>
            </div>

            <div className="rounded-2xl bg-white/5 p-3">
              <p className="text-xl font-black text-blue-400">
                {readCount}
              </p>

              <p className="mt-1 text-[7px] font-black uppercase tracking-wider text-slate-400">
                Leídas
              </p>
            </div>
          </div>
        </header>

        {/* FILTROS */}
        <section className="rounded-[2rem] border border-slate-200 bg-white p-4 shadow-sm">
          <div className="custom-scrollbar flex gap-2 overflow-x-auto pb-3">
            {[
              {
                value:
                  "ALL",
                label:
                  "Todas",
                count:
                  notifications.length,
              },
              {
                value:
                  "UNREAD",
                label:
                  "No leídas",
                count:
                  unreadCount,
              },
              {
                value:
                  "READ",
                label:
                  "Leídas",
                count:
                  readCount,
              },
            ].map((item) => (
              <button
                key={
                  item.value
                }
                type="button"
                onClick={() =>
                  setStatusFilter(
                    item.value,
                  )
                }
                className={`
                  inline-flex min-h-[40px]
                  shrink-0 items-center
                  gap-2 rounded-xl
                  border px-3.5
                  text-[8px] font-black
                  uppercase tracking-wider
                  transition

                  ${
                    statusFilter ===
                    item.value
                      ? "border-slate-900 bg-slate-900 text-white"
                      : "border-slate-200 bg-white text-slate-500 hover:border-[#87be00]/40 hover:text-[#87be00]"
                  }
                `}
              >
                {item.label}

                <span
                  className={`
                    rounded-lg px-2 py-0.5 text-[7px]

                    ${
                      statusFilter ===
                      item.value
                        ? "bg-white/10 text-white"
                        : "bg-slate-100 text-slate-500"
                    }
                  `}
                >
                  {item.count}
                </span>
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-[190px_minmax(0,1fr)]">
            <div className="relative">
              <select
                value={
                  scopeFilter
                }
                onChange={(
                  event,
                ) =>
                  setScopeFilter(
                    event.target
                      .value,
                  )
                }
                className="h-12 w-full appearance-none rounded-2xl border border-slate-200 bg-slate-50 px-4 pr-10 text-[9px] font-black uppercase text-slate-600 outline-none transition focus:border-[#87be00]/50 focus:bg-white focus:ring-4 focus:ring-[#87be00]/10"
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

              <ChevronDown
                size={15}
                className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-400"
              />
            </div>

            <div className="relative">
              <Search
                size={16}
                className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <input
                type="search"
                value={
                  searchTerm
                }
                onChange={(
                  event,
                ) =>
                  setSearchTerm(
                    event.target
                      .value,
                  )
                }
                placeholder="Buscar título, mensaje o tipo"
                className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 pl-11 pr-11 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-[#87be00]/50 focus:bg-white focus:ring-4 focus:ring-[#87be00]/10"
              />

              {searchTerm && (
                <button
                  type="button"
                  aria-label="Limpiar búsqueda"
                  onClick={() =>
                    setSearchTerm("")
                  }
                  className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-900"
                >
                  <X
                    size={15}
                  />
                </button>
              )}
            </div>
          </div>

          {hasFilters && (
            <button
              type="button"
              onClick={
                clearFilters
              }
              className="mt-3 inline-flex min-h-[38px] items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 text-[8px] font-black uppercase tracking-wider text-slate-500 transition hover:bg-slate-50 hover:text-slate-900"
            >
              <X size={13} />
              Limpiar filtros
            </button>
          )}
        </section>

        {/* LISTADO */}
        <section className="space-y-4">
          <div className="flex items-center justify-between gap-3 px-1">
            <div>
              <p className="text-[9px] font-black uppercase tracking-[0.2em] text-[#87be00]">
                Bandeja
              </p>

              <h2 className="mt-1 text-lg font-black tracking-tight text-slate-900">
                Mensajes recibidos
              </h2>
            </div>

            <div className="flex items-center gap-2">
              <span className="rounded-xl bg-white px-3 py-2 text-[9px] font-black uppercase tracking-wider text-slate-500 shadow-sm">
                {
                  filteredNotifications.length
                }
              </span>

              {unreadCount >
                0 && (
                <button
                  type="button"
                  onClick={
                    handleMarkAllRead
                  }
                  disabled={
                    markingAll
                  }
                  aria-label="Marcar todas como leídas"
                  className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#87be00]/10 text-[#87be00] transition hover:bg-[#87be00] hover:text-white disabled:cursor-wait disabled:opacity-60"
                >
                  {markingAll ? (
                    <RefreshCcw
                      size={15}
                      className="animate-spin"
                    />
                  ) : (
                    <CheckCheck
                      size={17}
                    />
                  )}
                </button>
              )}
            </div>
          </div>

          {filteredNotifications.length ===
          0 ? (
            <EmptyState
              filtered={
                notifications.length >
                0
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
                (
                  notification,
                ) => (
                  <NotificationCard
                    key={
                      notification.id
                    }
                    notification={
                      notification
                    }
                    onMarkRead={
                      handleMarkRead
                    }
                    marking={
                      markingId ===
                      notification.id
                    }
                  />
                ),
              )}
            </div>
          )}
        </section>

        {loading &&
          notifications.length >
            0 && (
            <div className="flex items-center justify-center gap-2 py-2 text-[8px] font-black uppercase tracking-wider text-slate-400">
              <RefreshCcw
                size={12}
                className="animate-spin text-[#87be00]"
              />
              Actualizando bandeja
            </div>
          )}
      </div>
    </div>
  );
};

const NotificationCard = ({
  notification,
  onMarkRead,
  marking,
}) => {
  const unread =
    !isNotificationRead(
      notification,
    );

  const scope =
    getScopeConfig(
      notification.scope,
    );

  const ScopeIcon =
    scope.icon;

  const typeConfig =
    getTypeConfig(
      notification.type,
      unread,
    );

  const TypeIcon =
    typeConfig.icon;

  return (
    <article
      className={`
        relative overflow-hidden
        rounded-[2rem] border
        p-4 transition-all
        sm:p-5
        ${typeConfig.cardClasses}
      `}
    >
      {unread && (
        <span
          className={`absolute bottom-4 left-0 top-4 w-1 rounded-r-full ${typeConfig.dotClasses}`}
        />
      )}

      <div className="flex items-start gap-3">
        <div
          className={`
            flex h-11 w-11
            shrink-0 items-center
            justify-center
            rounded-2xl
            ${typeConfig.iconClasses}
          `}
          title={
            typeConfig.label
          }
        >
          <TypeIcon
            size={18}
          />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3
                className={`break-words text-sm font-black leading-tight ${typeConfig.titleClasses}`}
              >
                {notification.title ||
                  "Notificación sin título"}
              </h3>

              <div className="mt-2 flex flex-wrap gap-1.5">
                <span
                  className={`inline-flex items-center gap-1.5 rounded-lg border px-2 py-1 text-[7px] font-black uppercase tracking-wider ${typeConfig.badgeClasses}`}
                >
                  <TypeIcon
                    size={9}
                  />

                  {
                    typeConfig.label
                  }
                </span>

                <span
                  className={`inline-flex items-center gap-1.5 rounded-lg border px-2 py-1 text-[7px] font-black uppercase tracking-wider ${scope.classes}`}
                >
                  <ScopeIcon
                    size={9}
                  />

                  {scope.label}
                </span>
              </div>
            </div>

            <span
              className={`
                inline-flex shrink-0
                items-center gap-1.5
                rounded-lg border px-2
                py-1 text-[7px]
                font-black uppercase
                tracking-wider

                ${
                  unread
                    ? "border-[#87be00]/20 bg-[#87be00]/10 text-[#87be00]"
                    : "border-slate-200 bg-slate-100 text-slate-400"
                }
              `}
            >
              <span
                className={`
                  h-1.5 w-1.5
                  rounded-full

                  ${
                    unread
                      ? typeConfig.dotClasses
                      : "bg-slate-300"
                  }
                `}
              />

              {unread
                ? "Nueva"
                : "Leída"}
            </span>
          </div>

          <p
            className={`
              mt-3 whitespace-pre-wrap
              break-words text-xs
              leading-relaxed

              ${
                unread
                  ? "text-slate-700"
                  : "text-slate-500"
              }
            `}
          >
            {notification.message ||
              "Sin contenido disponible"}
          </p>

          <div className="mt-4 flex flex-col gap-3 border-t border-slate-100 pt-3 sm:flex-row sm:items-center sm:justify-between">
            <span className="text-[8px] font-black uppercase tracking-wider text-slate-400">
              {formatNotificationDate(
                notification.created_at,
              )}
            </span>

            {unread && (
              <button
                type="button"
                onClick={() =>
                  onMarkRead(
                    notification.id,
                  )
                }
                disabled={
                  marking
                }
                className="inline-flex min-h-[38px] items-center justify-center gap-2 rounded-xl border border-[#87be00]/25 bg-[#87be00]/10 px-3.5 text-[8px] font-black uppercase tracking-wider text-[#6e9e00] transition hover:bg-[#87be00] hover:text-white disabled:cursor-wait disabled:opacity-60"
              >
                {marking ? (
                  <RefreshCcw
                    size={12}
                    className="animate-spin"
                  />
                ) : (
                  <CheckCheck
                    size={13}
                  />
                )}

                Marcar como leída
              </button>
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
  <div className="flex min-h-[280px] flex-col items-center justify-center rounded-[2rem] border border-dashed border-slate-200 bg-white p-8 text-center">
    <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-slate-300">
      <BellOff size={28} />
    </div>

    <h2 className="mt-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
      Sin información disponible
    </h2>

    <p className="mt-2 max-w-xs text-sm leading-relaxed text-slate-500">
      {filtered
        ? "No existen notificaciones que coincidan con los filtros seleccionados."
        : "No tienes notificaciones disponibles en tu bandeja."}
    </p>

    {onClear && (
      <button
        type="button"
        onClick={onClear}
        className="mt-5 inline-flex min-h-[42px] items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 text-[8px] font-black uppercase tracking-wider text-white transition hover:bg-[#87be00]"
      >
        <X size={13} />
        Limpiar filtros
      </button>
    )}
  </div>
);

export default NotificationsLayout;