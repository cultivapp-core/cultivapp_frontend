import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { toast } from "react-hot-toast";

import { supabase } from "../lib/supabase";
import * as service from "../services/notificationService";
import { useAuth } from "./AuthContext";

const NotificationContext = createContext(null);

const getNotificationToastConfig = (notification) => {
  const type = String(
    notification?.type || "GENERAL",
  ).toUpperCase();

  switch (type) {
    case "URGENTE":
      return {
        icon: "⚠️",
        fallbackTitle: "Alerta urgente",
        borderColor: "#ef4444",
        background: "#450a0a",
        color: "#ffffff",
        duration: 8000,
      };

    case "ROUTE_ASSIGNED":
      return {
        icon: "🧭",
        fallbackTitle: "Nueva ruta asignada",
        borderColor: "#2563eb",
        background: "#172554",
        color: "#ffffff",
        duration: 6000,
      };

    case "ROUTE_UPDATED":
      return {
        icon: "🔄",
        fallbackTitle: "Ruta actualizada",
        borderColor: "#f59e0b",
        background: "#451a03",
        color: "#ffffff",
        duration: 6000,
      };

    case "VISIT_COMPLETED":
      return {
        icon: "✅",
        fallbackTitle: "Visita completada",
        borderColor: "#10b981",
        background: "#022c22",
        color: "#ffffff",
        duration: 5000,
      };

    case "OPERATIVA":
      return {
        icon: "ℹ️",
        fallbackTitle: "Aviso operativo",
        borderColor: "#87be00",
        background: "#1f2937",
        color: "#ffffff",
        duration: 5000,
      };

    default:
      return {
        icon: "🔔",
        fallbackTitle: "Nueva notificación",
        borderColor: "#87be00",
        background: "#333333",
        color: "#ffffff",
        duration: 5000,
      };
  }
};

export const NotificationProvider = ({
  children,
}) => {
  const { user } = useAuth();

  const [notifications, setNotifications] =
    useState([]);
  const [unreadCount, setUnreadCount] =
    useState(0);
  const [loading, setLoading] =
    useState(false);

  const processedIds = useRef(new Set());
  const broadcastRef = useRef(null);

  const fetchNotifs = useCallback(
    async () => {
      const token =
        localStorage.getItem("token");

      if (!user?.id || !token) {
        return;
      }

      try {
        setLoading(true);

        const response =
          await service.getMyNotifications();

        const rawData = Array.isArray(
          response,
        )
          ? response
          : response?.data ||
            response ||
            [];

        const normalizedData =
          Array.isArray(rawData)
            ? rawData
            : [];

        setNotifications(
          normalizedData,
        );

        setUnreadCount(
          normalizedData.filter(
            (notification) =>
              !notification.is_read,
          ).length,
        );

        processedIds.current =
          new Set(
            normalizedData.map(
              (notification) =>
                notification.id,
            ),
          );

        console.log(
          "📊 [Historial] Sincronizado para el usuario:",
          user.id,
        );
      } catch (error) {
        console.error(
          "❌ [API Error]:",
          error,
        );
      } finally {
        setLoading(false);
      }
    },
    [user?.id],
  );

  useEffect(() => {
    fetchNotifs();
  }, [fetchNotifs]);

  useEffect(() => {
    if (
      !user?.id ||
      typeof BroadcastChannel ===
        "undefined"
    ) {
      return undefined;
    }

    const broadcastChannel =
      new BroadcastChannel(
        `notif-lock-${user.id}`,
      );

    broadcastRef.current =
      broadcastChannel;

    broadcastChannel.onmessage = (
      event,
    ) => {
      if (
        event.data?.type ===
          "CLAIM" &&
        event.data?.id
      ) {
        processedIds.current.add(
          event.data.id,
        );

        console.log(
          "📡 [BroadcastChannel] Notificación reclamada por otra pestaña:",
          event.data.id,
        );
      }
    };

    return () => {
      broadcastChannel.close();
      broadcastRef.current = null;
    };
  }, [user?.id]);

  useEffect(() => {
    let channel;
    let cancelled = false;

    const startRealtime =
      async () => {
        const {
          data: { session },
        } =
          await supabase.auth.getSession();

        const token =
          session?.access_token ||
          localStorage.getItem(
            "token",
          );

        if (
          cancelled ||
          !user?.id ||
          !token
        ) {
          return;
        }

        try {
          if (
            session?.access_token &&
            session?.refresh_token
          ) {
            await supabase.auth.setSession(
              {
                access_token:
                  session.access_token,
                refresh_token:
                  session.refresh_token,
              },
            );
          }

          channel = supabase
            .channel(
              `db-changes-notifications-${user.id}`,
            )
            .on(
              "postgres_changes",
              {
                event: "INSERT",
                schema: "public",
                table: "notifications",
              },
              (payload) => {
                console.log(
                  "📥 [REALTIME] ¡Algo llegó a la DB!",
                  payload,
                );

                const notification =
                  payload.new;

                if (
                  !notification?.id
                ) {
                  return;
                }

                if (
                  processedIds.current.has(
                    notification.id,
                  )
                ) {
                  console.log(
                    "⏭️ Notificación ya procesada:",
                    notification.id,
                  );
                  return;
                }

                const cleanNotifUser =
                  String(
                    notification.target_user_id ||
                      notification.user_id ||
                      "",
                  )
                    .toLowerCase()
                    .trim();

                const cleanUserId =
                  String(
                    user.id || "",
                  )
                    .toLowerCase()
                    .trim();

                const cleanNotifTenant =
                  String(
                    notification.tenant_id ||
                      notification.company_id ||
                      "",
                  )
                    .toLowerCase()
                    .trim();

                const cleanUserTenant =
                  String(
                    user.company_id ||
                      "",
                  )
                    .toLowerCase()
                    .trim();

                console.log(
                  `🧐 Comparando Usuario: [${cleanNotifUser}] con [${cleanUserId}]`,
                );

                console.log(
                  `🧐 Comparando Empresa: [${cleanNotifTenant}] con [${cleanUserTenant}]`,
                );

                const isForCurrentUser =
                  cleanNotifUser ===
                  cleanUserId;

                if (
                  !isForCurrentUser
                ) {
                  console.log(
                    "⏭️ Notificación ignorada: no corresponde al usuario actual",
                  );
                  return;
                }

                console.log(
                  "✅ ¡Es para mí! Disparando toast.",
                );

                processedIds.current.add(
                  notification.id,
                );

                broadcastRef.current?.postMessage(
                  {
                    type: "CLAIM",
                    id: notification.id,
                  },
                );

                const toastConfig =
                  getNotificationToastConfig(
                    notification,
                  );

                const toastTitle =
                  notification.title?.trim() ||
                  toastConfig.fallbackTitle;

                const toastMessage =
                  notification.message?.trim();

                toast(
                  toastMessage
                    ? `${toastTitle}: ${toastMessage}`
                    : toastTitle,
                  {
                    icon:
                      toastConfig.icon,
                    duration:
                      toastConfig.duration,
                    position:
                      "top-right",
                    style: {
                      borderRadius:
                        "1.2rem",
                      background:
                        toastConfig.background,
                      color:
                        toastConfig.color,
                      fontFamily:
                        "Outfit, sans-serif",
                      fontWeight: "bold",
                      fontSize: "14px",
                      borderLeft: `5px solid ${toastConfig.borderColor}`,
                      maxWidth: "420px",
                    },
                    ariaProps: {
                      role:
                        notification.type ===
                        "URGENTE"
                          ? "alert"
                          : "status",
                      "aria-live":
                        notification.type ===
                        "URGENTE"
                          ? "assertive"
                          : "polite",
                    },
                  },
                );

                setNotifications(
                  (current) => [
                    notification,
                    ...current,
                  ],
                );

                setUnreadCount(
                  (current) =>
                    current + 1,
                );
              },
            )
            .subscribe((status) => {
              console.log(
                "📡 [Socket Status]:",
                status,
              );
            });
        } catch (error) {
          console.error(
            "❌ [Realtime Fatal]:",
            error,
          );
        }
      };

    startRealtime();

    return () => {
      cancelled = true;

      if (channel) {
        console.log(
          "🔌 Cerrando canal de notificaciones",
        );

        supabase.removeChannel(
          channel,
        );
      }
    };
  }, [
    user?.id,
    user?.company_id,
  ]);

  const markAsRead = async (
    id,
  ) => {
    try {
      await service.markAsRead(id);

      setNotifications(
        (current) =>
          current.map(
            (notification) =>
              notification.id === id
                ? {
                    ...notification,
                    is_read: true,
                  }
                : notification,
          ),
      );

      setUnreadCount(
        (current) =>
          Math.max(
            0,
            current - 1,
          ),
      );
    } catch (error) {
      console.error(
        "❌ [Error al marcar leído]:",
        error,
      );
    }
  };

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        loading,
        onMarkRead: markAsRead,
        refresh: fetchNotifs,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotificationContext =
  () =>
    useContext(
      NotificationContext,
    );
