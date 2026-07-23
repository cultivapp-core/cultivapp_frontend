import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  AnimatePresence,
  motion,
} from "framer-motion";
import {
  AlertTriangle,
  Bell,
  BellOff,
  BellRing,
  Check,
  CheckCheck,
  ChevronRight,
  Info,
  MapPin,
  Navigation,
  RefreshCcw,
  X,
} from "lucide-react";
import {
  useNavigate,
} from "react-router-dom";

import {
  useNotificationContext,
} from "../context/NotificationContext";

import soundFile from "../assets/sound/notificacion.mp3";

const TYPE_CONFIG = {
  URGENTE: {
    label: "Urgente",
    icon: AlertTriangle,
    iconClasses:
      "bg-red-500 text-white",
    badgeClasses:
      "border-red-200 bg-red-50 text-red-600",
    dotClasses:
      "bg-red-500",
  },
  OPERATIVA: {
    label: "Operativa",
    icon: Info,
    iconClasses:
      "bg-[#87be00] text-white",
    badgeClasses:
      "border-[#87be00]/20 bg-[#87be00]/10 text-[#5c9200]",
    dotClasses:
      "bg-[#87be00]",
  },
  ROUTE_ASSIGNED: {
    label: "Ruta asignada",
    icon: Navigation,
    iconClasses:
      "bg-blue-600 text-white",
    badgeClasses:
      "border-blue-200 bg-blue-50 text-blue-600",
    dotClasses:
      "bg-blue-500",
  },
  ROUTE_UPDATED: {
    label: "Ruta actualizada",
    icon: RefreshCcw,
    iconClasses:
      "bg-amber-500 text-white",
    badgeClasses:
      "border-amber-200 bg-amber-50 text-amber-600",
    dotClasses:
      "bg-amber-500",
  },
  GENERAL: {
    label: "General",
    icon: Bell,
    iconClasses:
      "bg-slate-900 text-white",
    badgeClasses:
      "border-slate-200 bg-slate-50 text-slate-600",
    dotClasses:
      "bg-[#87be00]",
  },
};

const isRead = (
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
) =>
  TYPE_CONFIG[
    String(
      type || "GENERAL",
    ).toUpperCase()
  ] || TYPE_CONFIG.GENERAL;

const getTimestamp = (
  notification,
) => {
  const date =
    new Date(
      notification?.created_at ||
        0,
    );

  return Number.isNaN(
    date.getTime(),
  )
    ? 0
    : date.getTime();
};

const formatDate = (
  value,
) => {
  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return "Sin fecha";
  }

  return date.toLocaleDateString(
    "es-CL",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
    },
  );
};

const formatTime = (
  value,
) => {
  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return "--:--";
  }

  return date.toLocaleTimeString(
    "es-CL",
    {
      hour: "2-digit",
      minute: "2-digit",
    },
  );
};

const Notifications = ({
  notificationsPath = "/usuario/notifications",
  maxVisible = 8,
}) => {
  const navigate = useNavigate();

  const {
    notifications = [],
    unreadCount = 0,
    onMarkRead,
    onMarkAllRead,
    loading = false,
    refresh,
  } = useNotificationContext();

  const [isOpen, setIsOpen] =
    useState(false);

  const [
    markingId,
    setMarkingId,
  ] = useState(null);

  const [
    markingAll,
    setMarkingAll,
  ] = useState(false);

  const [
    refreshing,
    setRefreshing,
  ] = useState(false);

  const previousUnreadCount =
    useRef(unreadCount);

  const audioPlayer =
    useRef(null);

  useEffect(() => {
    const audio =
      new Audio(soundFile);

    audio.preload = "auto";
    audio.volume = 0.55;

    audioPlayer.current =
      audio;

    return () => {
      audio.pause();
      audio.src = "";
      audioPlayer.current =
        null;
    };
  }, []);

  useEffect(() => {
    const playSound =
      async () => {
        if (
          unreadCount <=
          previousUnreadCount.current
        ) {
          previousUnreadCount.current =
            unreadCount;
          return;
        }

        try {
          if (
            audioPlayer.current
          ) {
            audioPlayer.current.currentTime =
              0;

            await audioPlayer.current.play();
          }
        } catch {
          console.warn(
            "El navegador requiere una interacción previa para reproducir sonidos.",
          );
        } finally {
          previousUnreadCount.current =
            unreadCount;
        }
      };

    playSound();
  }, [unreadCount]);

  useEffect(() => {
    if (!isOpen) {
      document.body.style.overflow =
        "";
      return undefined;
    }

    document.body.style.overflow =
      "hidden";

    return () => {
      document.body.style.overflow =
        "";
    };
  }, [isOpen]);

  useEffect(() => {
    const handleEscape = (
      event,
    ) => {
      if (
        event.key === "Escape"
      ) {
        setIsOpen(false);
      }
    };

    window.addEventListener(
      "keydown",
      handleEscape,
    );

    return () => {
      window.removeEventListener(
        "keydown",
        handleEscape,
      );
    };
  }, []);

  const sortedNotifications =
    useMemo(
      () =>
        [
          ...notifications,
        ].sort(
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
        ),
      [notifications],
    );

  const visibleNotifications =
    sortedNotifications.slice(
      0,
      maxVisible,
    );

  const handleToggle =
    () => {
      setIsOpen(
        (current) =>
          !current,
      );
    };

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

  const handleMarkAsRead =
    async (id) => {
      if (
        typeof onMarkRead !==
        "function"
      ) {
        return;
      }

      try {
        setMarkingId(id);
        await onMarkRead(id);
      } catch (error) {
        console.error(
          "No se pudo marcar la notificación como leída:",
          error,
        );
      } finally {
        setMarkingId(null);
      }
    };

  const handleMarkAll =
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
      } catch (error) {
        console.error(
          "No se pudieron marcar todas las notificaciones:",
          error,
        );
      } finally {
        setMarkingAll(false);
      }
    };

  const handleOpenAll =
    () => {
      setIsOpen(false);
      navigate(
        notificationsPath,
      );
    };

  return (
    <div className="relative font-[Outfit]">
      {/* CAMPANA */}
      <button
        type="button"
        onClick={handleToggle}
        aria-label="Abrir notificaciones"
        aria-expanded={isOpen}
        className={`
          relative flex h-10 w-10
          items-center justify-center
          rounded-xl transition-all
          duration-300

          ${
            isOpen
              ? `
                bg-[#87be00]
                text-white
                shadow-lg
                shadow-[#87be00]/25
              `
              : `
                bg-slate-50
                text-slate-400
                hover:bg-[#87be00]/10
                hover:text-[#87be00]
              `
          }
        `}
      >
        <Bell
          size={18}
          className={
            isOpen
              ? "animate-[wiggle_0.5s_ease-in-out]"
              : ""
          }
        />

        {unreadCount > 0 && (
          <motion.span
            initial={{
              scale: 0,
            }}
            animate={{
              scale: 1,
            }}
            className="
              absolute -right-1.5
              -top-1.5 flex h-[18px]
              min-w-[18px] items-center
              justify-center rounded-full
              bg-red-500 px-1
              text-[7px] font-black
              text-white ring-2
              ring-white
            "
          >
            {unreadCount > 9
              ? "9+"
              : unreadCount}
          </motion.span>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            {/* OVERLAY */}
            <motion.button
              type="button"
              aria-label="Cerrar notificaciones"
              initial={{
                opacity: 0,
              }}
              animate={{
                opacity: 1,
              }}
              exit={{
                opacity: 0,
              }}
              onClick={() =>
                setIsOpen(false)
              }
              className="
                fixed inset-0
                z-[9997]
                bg-slate-950/55
                backdrop-blur-sm
                md:bg-slate-950/20
                md:backdrop-blur-[2px]
              "
            />

            {/* PANEL */}
            <motion.section
              role="dialog"
              aria-modal="true"
              aria-label="Centro de notificaciones"
              initial={{
                opacity: 0,
                y: 80,
              }}
              animate={{
                opacity: 1,
                y: 0,
              }}
              exit={{
                opacity: 0,
                y: 80,
              }}
              transition={{
                type: "spring",
                damping: 28,
                stiffness: 320,
              }}
              className="
                fixed inset-x-0 bottom-0
                z-[9998] mx-auto
                flex max-h-[88dvh]
                w-full max-w-[480px]
                flex-col overflow-hidden
                rounded-t-[2rem]
                border border-slate-200
                bg-white
                shadow-[0_-20px_60px_rgba(15,23,42,0.28)]

                md:absolute
                md:bottom-auto
                md:left-auto
                md:right-0
                md:top-[calc(100%+0.75rem)]
                md:mx-0
                md:max-h-[620px]
                md:w-[390px]
                md:max-w-none
                md:rounded-[2rem]
                md:shadow-2xl
              "
            >
              {/* HANDLE MÓVIL */}
              <div className="flex h-7 shrink-0 items-center justify-center bg-white md:hidden">
                <span className="h-1.5 w-12 rounded-full bg-slate-200" />
              </div>

              {/* HEADER */}
              <header className="relative shrink-0 overflow-hidden bg-slate-900 px-5 pb-5 pt-4 text-white md:p-5">
                <div className="absolute -right-10 -top-12 h-32 w-32 rounded-full bg-[#87be00]/15 blur-2xl" />

                <div className="relative flex items-start justify-between gap-4">
                  <div className="flex min-w-0 items-start gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-[#a8d52c]">
                      <BellRing
                        size={20}
                      />
                    </div>

                    <div className="min-w-0">
                      <p className="text-[8px] font-black uppercase tracking-[0.22em] text-[#a8d52c]">
                        Centro de comunicación
                      </p>

                      <h2 className="mt-1 text-xl font-black tracking-tight">
                        Avisos
                      </h2>

                      <p className="mt-1 text-[9px] font-bold text-slate-400">
                        {unreadCount ===
                        1
                          ? "1 notificación nueva"
                          : `${unreadCount} notificaciones nuevas`}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
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
                      className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-white transition hover:bg-white/20 disabled:cursor-wait disabled:opacity-50"
                    >
                      <RefreshCcw
                        size={15}
                        className={
                          refreshing
                            ? "animate-spin"
                            : ""
                        }
                      />
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        setIsOpen(
                          false,
                        )
                      }
                      aria-label="Cerrar panel"
                      className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-white transition hover:bg-red-500"
                    >
                      <X
                        size={17}
                      />
                    </button>
                  </div>
                </div>

                {unreadCount > 0 &&
                  typeof onMarkAllRead ===
                    "function" && (
                    <button
                      type="button"
                      onClick={
                        handleMarkAll
                      }
                      disabled={
                        markingAll
                      }
                      className="relative mt-4 inline-flex min-h-[38px] items-center justify-center gap-2 rounded-xl bg-white/10 px-3.5 text-[8px] font-black uppercase tracking-wider text-white transition hover:bg-white/20 disabled:cursor-wait disabled:opacity-60"
                    >
                      {markingAll ? (
                        <RefreshCcw
                          size={12}
                          className="animate-spin"
                        />
                      ) : (
                        <CheckCheck
                          size={13}
                        />
                      )}

                      Marcar todas como leídas
                    </button>
                  )}
              </header>

              {/* LISTADO */}
              <div className="custom-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-contain bg-slate-50 p-3 md:p-4">
                {loading &&
                notifications.length ===
                  0 ? (
                  <div className="flex min-h-[260px] flex-col items-center justify-center gap-4 text-center">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#87be00]/10 text-[#87be00]">
                      <RefreshCcw
                        size={22}
                        className="animate-spin"
                      />
                    </div>

                    <p className="text-[8px] font-black uppercase tracking-wider text-slate-400">
                      Sincronizando avisos
                    </p>
                  </div>
                ) : visibleNotifications.length ===
                  0 ? (
                  <div className="flex min-h-[300px] flex-col items-center justify-center rounded-[1.5rem] border border-dashed border-slate-200 bg-white p-8 text-center">
                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-slate-300">
                      <BellOff
                        size={28}
                      />
                    </div>

                    <p className="mt-5 text-[9px] font-black uppercase tracking-[0.18em] text-slate-400">
                      Bandeja vacía
                    </p>

                    <p className="mt-2 max-w-xs text-sm leading-relaxed text-slate-500">
                      No tienes notificaciones disponibles en este momento.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {visibleNotifications.map(
                      (
                        notification,
                      ) => (
                        <NotificationPreview
                          key={
                            notification.id
                          }
                          notification={
                            notification
                          }
                          onMarkRead={
                            handleMarkAsRead
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
              </div>

              {/* FOOTER */}
              <footer className="shrink-0 border-t border-slate-200 bg-white p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] md:p-3">
                <button
                  type="button"
                  onClick={
                    handleOpenAll
                  }
                  className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 text-[8px] font-black uppercase tracking-wider text-white transition hover:bg-[#87be00]"
                >
                  Ver todas las notificaciones
                  <ChevronRight
                    size={14}
                  />
                </button>
              </footer>
            </motion.section>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

const NotificationPreview = ({
  notification,
  onMarkRead,
  marking,
}) => {
  const unread =
    !isRead(notification);

  const config =
    getTypeConfig(
      notification.type,
    );

  const TypeIcon =
    config.icon;

  return (
    <motion.article
      layout
      className={`
        relative overflow-hidden
        rounded-[1.5rem] border
        p-4 transition-all

        ${
          unread
            ? `
              border-slate-200
              bg-white
              shadow-sm
            `
            : `
              border-slate-200/80
              bg-white/65
            `
        }
      `}
    >
      {unread && (
        <span
          className={`absolute bottom-4 left-0 top-4 w-1 rounded-r-full ${config.dotClasses}`}
        />
      )}

      <div className="flex items-start gap-3">
        <div
          className={`
            flex h-10 w-10
            shrink-0 items-center
            justify-center
            rounded-2xl

            ${
              unread
                ? config.iconClasses
                : "bg-slate-100 text-slate-400"
            }
          `}
        >
          <TypeIcon
            size={17}
          />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <span
                className={`
                  inline-flex items-center
                  rounded-lg border px-2
                  py-1 text-[7px]
                  font-black uppercase
                  tracking-wider
                  ${config.badgeClasses}
                `}
              >
                {config.label}
              </span>

              <h3
                className={`
                  mt-2 break-words
                  text-[11px] font-black
                  leading-snug

                  ${
                    unread
                      ? "text-slate-900"
                      : "text-slate-500"
                  }
                `}
              >
                {notification.title ||
                  "Notificación sin título"}
              </h3>
            </div>

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
                aria-label="Marcar como leída"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#87be00] text-white shadow-lg shadow-[#87be00]/20 transition hover:bg-[#76a600] active:scale-95 disabled:cursor-wait disabled:opacity-60"
              >
                {marking ? (
                  <RefreshCcw
                    size={13}
                    className="animate-spin"
                  />
                ) : (
                  <Check
                    size={14}
                    strokeWidth={3}
                  />
                )}
              </button>
            )}
          </div>

          <p
            className={`
              mt-3 line-clamp-3
              text-[10px] leading-relaxed

              ${
                unread
                  ? "text-slate-600"
                  : "text-slate-400"
              }
            `}
          >
            {notification.message ||
              "Sin contenido disponible"}
          </p>

          <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
            <span className="text-[7px] font-black uppercase tracking-wider text-slate-400">
              {formatTime(
                notification.created_at,
              )}
            </span>

            <span className="h-1 w-1 rounded-full bg-slate-300" />

            <span className="text-[7px] font-black uppercase tracking-wider text-slate-400">
              {formatDate(
                notification.created_at,
              )}
            </span>

            {notification.scope ===
              "local" && (
              <>
                <span className="h-1 w-1 rounded-full bg-slate-300" />

                <span className="inline-flex items-center gap-1 text-[7px] font-black uppercase tracking-wider text-amber-600">
                  <MapPin
                    size={9}
                  />
                  Local
                </span>
              </>
            )}
          </div>
        </div>
      </div>
    </motion.article>
  );
};

export default Notifications;