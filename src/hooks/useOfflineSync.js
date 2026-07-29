import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import toast from "react-hot-toast";

import api from "../api/apiClient";
import {
  getPendingSync,
  getSyncQueueStats,
  markSyncItemFailed,
  markSyncItemRetry,
  normalizeLegacySyncQueue,
  removeFromSyncQueue,
  retryAllSyncItems,
} from "../utils/db";
import {
  OFFLINE_SYNC_EVENTS,
} from "../services/offlineManager";

const AUTO_RETRY_INTERVAL_MS =
  15_000;

const ONLINE_SYNC_DELAY_MS =
  800;

const AUTH_REQUIRED_STORAGE_KEY =
  "cultivapp_offline_auth_required";

const getStoredUser = () => {
  try {
    const rawUser =
      localStorage.getItem(
        "user",
      );

    return rawUser
      ? JSON.parse(
          rawUser,
        )
      : null;
  } catch {
    return null;
  }
};

const isSessionAuthError = (
  statusCode,
  message,
) => {
  const normalizedMessage =
    String(
      message || "",
    ).toLowerCase();

  return (
    statusCode === 401 ||
    (
      statusCode === 403 &&
      (
        normalizedMessage.includes(
          "sesión",
        ) ||
        normalizedMessage.includes(
          "sesion",
        ) ||
        normalizedMessage.includes(
          "token",
        ) ||
        normalizedMessage.includes(
          "dispositivo",
        ) ||
        normalizedMessage.includes(
          "unauthorized",
        )
      )
    )
  );
};

const hasToken = () => {
  const token =
    localStorage.getItem(
      "token",
    );

  return Boolean(
    token &&
    token !== "null" &&
    token !== "undefined",
  );
};

const base64ToFile = (
  value,
  fallbackName =
    `offline_photo_${Date.now()}.jpg`,
) => {
  const parts =
    String(value).split(",");

  const mimeMatch =
    parts[0]?.match(
      /:(.*?);/,
    );

  const mime =
    mimeMatch?.[1] ||
    "application/octet-stream";

  const binary =
    atob(
      parts[1] ||
      "",
    );

  const bytes =
    new Uint8Array(
      binary.length,
    );

  for (
    let index = 0;
    index < binary.length;
    index += 1
  ) {
    bytes[index] =
      binary.charCodeAt(
        index,
      );
  }

  return new File(
    [bytes],
    fallbackName,
    {
      type:
        mime,
    },
  );
};

const appendFormValue = (
  formData,
  key,
  value,
) => {
  if (
    value?.__type ===
    "File"
  ) {
    const sourceBlob =
      value.blob;

    const file =
      sourceBlob instanceof
        File
        ? sourceBlob
        : new File(
            [
              sourceBlob,
            ],
            value.name ||
              `archivo-${Date.now()}`,
            {
              type:
                value.mimeType ||
                sourceBlob
                  ?.type ||
                "application/octet-stream",
              lastModified:
                value.lastModified ||
                Date.now(),
            },
          );

    formData.append(
      key,
      file,
      value.name ||
        file.name,
    );

    return;
  }

  if (
    value instanceof
      Blob
  ) {
    formData.append(
      key,
      value,
    );

    return;
  }

  if (
    typeof value ===
      "string" &&
    value.startsWith(
      "data:",
    )
  ) {
    formData.append(
      key,
      base64ToFile(
        value,
      ),
    );

    return;
  }

  formData.append(
    key,
    value ??
      "",
  );
};

const rebuildBody = (
  payload,
) => {
  if (
    payload === undefined ||
    payload === null
  ) {
    return null;
  }

  if (
    payload?.__type ===
    "FormData"
  ) {
    const formData =
      new FormData();

    if (
      Array.isArray(
        payload.entries,
      )
    ) {
      payload.entries.forEach(
        ({
          key,
          value,
        }) => {
          appendFormValue(
            formData,
            key,
            value,
          );
        },
      );

      return formData;
    }

    /*
     * Compatibilidad con el formato antiguo:
     * { __type: "FormData", data: { ... } }
     */
    Object.entries(
      payload.data || {},
    ).forEach(
      ([
        key,
        value,
      ]) => {
        appendFormValue(
          formData,
          key,
          value,
        );
      },
    );

    return formData;
  }

  if (
    typeof payload ===
      "string"
  ) {
    try {
      return JSON.parse(
        payload,
      );
    } catch {
      return payload;
    }
  }

  return payload;
};

const endpointForLegacyItem = (
  item,
) => {
  const routeId =
    item?.routeId
      ? String(
          item.routeId,
        )
      : null;

  if (!routeId) {
    return null;
  }

  switch (
    String(
      item?.type ||
      "",
    ).toUpperCase()
  ) {
    case "PHOTO":
      return `/routes/${routeId}/photo`;

    case "SCAN":
      return `/routes/${routeId}/scans`;

    case "TASK":
      return `/routes/${routeId}/task`;

    case "FINISH":
      return `/routes/${routeId}/finish`;

    case "CHECK_IN":
      return `/routes/${routeId}/check-in`;

    default:
      return null;
  }
};

const executeRequest = async (
  item,
  body,
) => {
  const endpoint =
    item.endpoint ||
    endpointForLegacyItem(
      item,
    );

  const method =
    String(
      item.method ||
      "POST",
    ).toLowerCase();

  if (!endpoint) {
    const error =
      new Error(
        "La operación offline no tiene endpoint ni routeId válido.",
      );

    error.permanent =
      true;

    throw error;
  }

  if (
    typeof api[
      method
    ] !== "function"
  ) {
    const error =
      new Error(
        `Método HTTP no soportado: ${method}`,
      );

    error.permanent =
      true;

    throw error;
  }

  if (
    method === "delete"
  ) {
    return api.delete(
      endpoint,
      {
        data:
          body,
      },
    );
  }

  if (
    method === "get"
  ) {
    return api.get(
      endpoint,
      {
        params:
          body || undefined,
      },
    );
  }

  return api[
    method
  ](
    endpoint,
    body,
  );
};

const dispatchSyncEvent = (
  eventName,
  detail,
) => {
  if (
    typeof window ===
    "undefined"
  ) {
    return;
  }

  window.dispatchEvent(
    new CustomEvent(
      eventName,
      {
        detail,
      },
    ),
  );
};

const getStatusCode = (
  error,
) =>
  error?.status ||
  error?.response
    ?.status ||
  null;

const getErrorMessage = (
  error,
) =>
  error?.response
    ?.data?.message ||
  error?.data?.message ||
  error?.message ||
  "Error de sincronización";

const isPermanentError = (
  error,
) =>
  error?.permanent ===
    true ||
  [
    400,
    404,
    413,
    422,
  ].includes(
    getStatusCode(error),
  );

const routeKeyForItem = (
  item,
) =>
  item.routeId
    ? String(
        item.routeId,
      )
    : `global:${item.type || "OTHER"}`;

export const useOfflineSync =
  () => {
    const [
      isOnline,
      setIsOnline,
    ] = useState(
      typeof navigator ===
        "undefined"
        ? true
        : navigator.onLine,
    );

    const [
      syncing,
      setSyncing,
    ] = useState(false);

    const [
      queueStats,
      setQueueStats,
    ] = useState({
      pendingCount: 0,
      failedCount: 0,
      totalCount: 0,
      lastError: null,
    });

    const [
      currentItem,
      setCurrentItem,
    ] = useState(null);

    const [
      lastResult,
      setLastResult,
    ] = useState(null);

    const [
      authRequired,
      setAuthRequired,
    ] = useState(() => {
      try {
        return (
          sessionStorage.getItem(
            AUTH_REQUIRED_STORAGE_KEY,
          ) === "true"
        );
      } catch {
        return false;
      }
    });

    const [
      authMessage,
      setAuthMessage,
    ] = useState(
      "Tu sesión venció. Vuelve a ingresar en este dispositivo para sincronizar.",
    );

    const isSyncingRef =
      useRef(false);

    const authRequiredRef =
      useRef(
        authRequired,
      );

    const markAuthRequired =
      useCallback(
        (
          message =
            "Tu sesión venció. Vuelve a ingresar en este dispositivo para sincronizar.",
        ) => {
          authRequiredRef.current =
            true;

          setAuthRequired(
            true,
          );

          setAuthMessage(
            message,
          );

          try {
            sessionStorage.setItem(
              AUTH_REQUIRED_STORAGE_KEY,
              "true",
            );
          } catch {
            // El almacenamiento puede estar restringido.
          }
        },
        [],
      );

    const clearAuthRequired =
      useCallback(() => {
        authRequiredRef.current =
          false;

        setAuthRequired(
          false,
        );

        try {
          sessionStorage.removeItem(
            AUTH_REQUIRED_STORAGE_KEY,
          );
        } catch {
          // El almacenamiento puede estar restringido.
        }
      }, []);

    const scheduledTimerRef =
      useRef(null);

    const syncAgainRef =
      useRef(false);

    const refreshStats =
      useCallback(async () => {
        try {
          const stats =
            await getSyncQueueStats();

          setQueueStats(
            stats,
          );

          return stats;
        } catch (error) {
          console.error(
            "Error leyendo cola offline:",
            error,
          );

          return {
            pendingCount: 0,
            failedCount: 0,
            totalCount: 0,
            lastError:
              error?.message ||
              "No se pudo leer IndexedDB.",
          };
        }
      }, []);

    const startSync =
      useCallback(async ({
        silent = false,
        force = false,
      } = {}) => {
        if (
          typeof navigator !==
            "undefined" &&
          !navigator.onLine
        ) {
          const message =
            "El dispositivo todavía no tiene conexión.";

          setLastResult({
            ok: false,
            message,
          });

          if (!silent) {
            toast.error(
              message,
              {
                id:
                  "offline-sync",
              },
            );
          }

          await refreshStats();

          return null;
        }

        if (
          authRequiredRef.current
        ) {
          const message =
            authMessage ||
            "Tu sesión venció. Vuelve a ingresar para sincronizar.";

          setLastResult({
            ok: false,
            message,
          });

          if (!silent) {
            toast.error(
              message,
              {
                id:
                  "offline-sync",
              },
            );
          }

          await refreshStats();

          return null;
        }

        if (
          isSyncingRef.current
        ) {
          syncAgainRef.current =
            true;

          return null;
        }

        if (!hasToken()) {
          const message =
            "No existe una sesión válida. Vuelve a ingresar para sincronizar los datos guardados.";

          markAuthRequired(
            message,
          );

          setLastResult({
            ok: false,
            message,
          });

          if (!silent) {
            toast.error(
              message,
              {
                id:
                  "offline-sync",
              },
            );
          }

          await refreshStats();

          return null;
        }

        if (force) {
          await retryAllSyncItems();
        }

        await normalizeLegacySyncQueue();

        const pending =
          await getPendingSync({
            includeDeferred:
              force,
          });

        if (
          pending.length === 0
        ) {
          const stats =
            await refreshStats();

          const message =
            stats.totalCount > 0
              ? "Las operaciones están esperando su próximo reintento. Presiona Sincronizar para forzarlo."
              : "No existen datos pendientes.";

          setLastResult({
            ok:
              stats.totalCount === 0,
            message,
          });

          if (!silent) {
            if (
              stats.totalCount === 0
            ) {
              toast.success(
                message,
                {
                  id:
                    "offline-sync",
                },
              );
            } else {
              toast.error(
                message,
                {
                  id:
                    "offline-sync",
                },
              );
            }
          }

          return null;
        }

        isSyncingRef.current =
          true;

        syncAgainRef.current =
          false;

        setSyncing(true);

        let synchronizedCount = 0;
        let failedCount = 0;
        let deferredCount = 0;

        const blockedRoutes =
          new Set();

        if (!silent) {
          toast.loading(
            `Sincronizando ${pending.length} operación${
              pending.length === 1
                ? ""
                : "es"
            }...`,
            {
              id:
                "offline-sync",
            },
          );
        }

        dispatchSyncEvent(
          OFFLINE_SYNC_EVENTS
            .SYNC_STARTED,
          {
            pendingCount:
              pending.length,
          },
        );

        try {
          for (
            let index = 0;
            index < pending.length;
            index += 1
          ) {
            const item =
              pending[index];

            setCurrentItem({
              index:
                index + 1,
              total:
                pending.length,
              type:
                item.type ||
                "OTHER",
              routeId:
                item.routeId ||
                null,
            });

            if (
              typeof navigator !==
                "undefined" &&
              !navigator.onLine
            ) {
              break;
            }

            const routeKey =
              routeKeyForItem(
                item,
              );

            if (
              blockedRoutes.has(
                routeKey,
              )
            ) {
              deferredCount +=
                1;

              continue;
            }

            try {
              const isCheckIn =
                String(
                  item.type ||
                  "",
                ).toUpperCase() ===
                  "CHECK_IN" ||
                String(
                  item.endpoint ||
                  "",
                ).includes(
                  "/check-in",
                );

              if (isCheckIn) {
                const error =
                  new Error(
                    "El check-in GPS no puede sincronizarse desde la cola porque requiere validar la ubicación actual.",
                  );

                error.permanent =
                  true;

                throw error;
              }

              const storedUser =
                getStoredUser();

              const ownerUserId =
                item.metadata
                  ?.ownerUserId ||
                null;

              if (
                ownerUserId &&
                storedUser?.id &&
                String(
                  ownerUserId,
                ) !==
                  String(
                    storedUser.id,
                  )
              ) {
                const error =
                  new Error(
                    "Los datos pendientes pertenecen a otro usuario. Ingresa con el usuario que realizó la visita.",
                  );

                error.status =
                  401;

                throw error;
              }

              const body =
                rebuildBody(
                  item.payload,
                );

              const response =
                await executeRequest(
                  item,
                  body,
                );

              clearAuthRequired();

              await removeFromSyncQueue(
                item.id,
              );

              synchronizedCount +=
                1;

              dispatchSyncEvent(
                OFFLINE_SYNC_EVENTS
                  .ITEM_SUCCESS,
                {
                  item,
                  response:
                    response?.data ??
                    response,
                },
              );
            } catch (error) {
              const statusCode =
                getStatusCode(
                  error,
                );

              const message =
                getErrorMessage(
                  error,
                );

              console.error(
                "❌ Error sincronizando operación offline:",
                {
                  id:
                    item.id,
                  type:
                    item.type,
                  routeId:
                    item.routeId,
                  endpoint:
                    item.endpoint ||
                    endpointForLegacyItem(
                      item,
                    ),
                  statusCode,
                  message,
                },
              );

              if (
                statusCode ===
                  409
              ) {
                await removeFromSyncQueue(
                  item.id,
                );

                synchronizedCount +=
                  1;

                continue;
              }

              if (
                isSessionAuthError(
                  statusCode,
                  message,
                )
              ) {
                const authErrorMessage =
                  message ||
                  "Tu sesión venció. Vuelve a ingresar en este dispositivo.";

                await markSyncItemRetry(
                  item.id,
                  authErrorMessage,
                );

                blockedRoutes.add(
                  routeKey,
                );

                markAuthRequired(
                  authErrorMessage,
                );

                setLastResult({
                  ok: false,
                  message:
                    authErrorMessage,
                });

                dispatchSyncEvent(
                  OFFLINE_SYNC_EVENTS
                    .AUTH_REQUIRED,
                  {
                    item,
                    message:
                      authErrorMessage,
                  },
                );

                break;
              }

              if (
                statusCode ===
                  403
              ) {
                await markSyncItemFailed(
                  item.id,
                  message,
                );

                failedCount +=
                  1;

                dispatchSyncEvent(
                  OFFLINE_SYNC_EVENTS
                    .ITEM_ERROR,
                  {
                    item,
                    error:
                      message,
                    permanent:
                      true,
                  },
                );

                continue;
              }

              if (
                isPermanentError(
                  error,
                )
              ) {
                /*
                 * No se elimina el dato. Se marca fallido para que
                 * pueda revisarse y reintentarse manualmente.
                 */
                await markSyncItemFailed(
                  item.id,
                  message,
                );

                failedCount +=
                  1;

                dispatchSyncEvent(
                  OFFLINE_SYNC_EVENTS
                    .ITEM_ERROR,
                  {
                    item,
                    error:
                      message,
                    permanent:
                      true,
                  },
                );

                continue;
              }

              await markSyncItemRetry(
                item.id,
                message,
              );

              blockedRoutes.add(
                routeKey,
              );

              deferredCount +=
                1;

              dispatchSyncEvent(
                OFFLINE_SYNC_EVENTS
                  .ITEM_ERROR,
                {
                  item,
                  error:
                    message,
                  permanent:
                    false,
                },
              );
            }
          }

          const stats =
            await refreshStats();

          const summary = {
            synchronizedCount,
            failedCount,
            deferredCount,
            pendingCount:
              stats.pendingCount,
            totalCount:
              stats.totalCount,
          };

          setLastResult({
            ok:
              synchronizedCount > 0 &&
              stats.totalCount === 0,
            message:
              synchronizedCount > 0
                ? `${synchronizedCount} operación${
                    synchronizedCount === 1
                      ? ""
                      : "es"
                  } sincronizada${
                    synchronizedCount === 1
                      ? ""
                      : "s"
                  }.`
                : stats.lastError ||
                  "No se pudo sincronizar ninguna operación.",
          });

          if (!silent) {
            if (
              stats.totalCount === 0
            ) {
              toast.success(
                `Sincronización completa: ${synchronizedCount} operación${
                  synchronizedCount === 1
                    ? ""
                    : "es"
                }.`,
                {
                  id:
                    "offline-sync",
                },
              );
            } else if (
              synchronizedCount > 0
            ) {
              toast.success(
                `${synchronizedCount} sincronizada${
                  synchronizedCount === 1
                    ? ""
                    : "s"
                }. Quedan ${stats.totalCount}.`,
                {
                  id:
                    "offline-sync",
                },
              );
            } else {
              toast.error(
                stats.lastError ||
                "No se pudo sincronizar. Revisa la conexión y la sesión.",
                {
                  id:
                    "offline-sync",
                },
              );
            }
          }

          dispatchSyncEvent(
            OFFLINE_SYNC_EVENTS
              .SYNC_COMPLETE,
            summary,
          );

          return summary;
        } finally {
          isSyncingRef.current =
            false;

          setSyncing(false);

          setCurrentItem(
            null,
          );

          if (
            syncAgainRef.current &&
            typeof navigator !==
              "undefined" &&
            navigator.onLine
          ) {
            syncAgainRef.current =
              false;

            window.setTimeout(
              () =>
                startSync({
                  silent:
                    true,
                }),
              500,
            );
          }
        }
      }, [
        authMessage,
        clearAuthRequired,
        markAuthRequired,
        refreshStats,
      ]);

    const scheduleSync =
      useCallback(
        (
          delay =
            ONLINE_SYNC_DELAY_MS,
          {
            silent =
              true,
          } = {},
        ) => {
          if (
            typeof window ===
              "undefined"
          ) {
            return;
          }

          window.clearTimeout(
            scheduledTimerRef.current,
          );

          scheduledTimerRef.current =
            window.setTimeout(
              () =>
                startSync({
                  silent,
                }),
              delay,
            );
        },
        [
          startSync,
        ],
      );

    useEffect(() => {
      const initialize =
        async () => {
          await normalizeLegacySyncQueue();
          await refreshStats();

          if (
            navigator.onLine
          ) {
            scheduleSync(
              ONLINE_SYNC_DELAY_MS,
            );
          }
        };

      const handleOnline =
        () => {
          setIsOnline(
            true,
          );

          if (
            authRequiredRef.current
          ) {
            toast.error(
              "La conexión volvió, pero debes ingresar nuevamente para sincronizar.",
              {
                id:
                  "offline-online",
              },
            );

            return;
          }

          toast.success(
            "Conexión restablecida. Sincronizando datos...",
            {
              id:
                "offline-online",
            },
          );

          scheduleSync(
            ONLINE_SYNC_DELAY_MS,
            {
              silent:
                false,
            },
          );
        };

      const handleOffline =
        () => {
          setIsOnline(
            false,
          );

          toast.error(
            "Sin conexión. El avance seguirá guardado en el dispositivo.",
            {
              id:
                "offline-online",
            },
          );
        };

      const handleQueueChanged =
        () => {
          refreshStats();

          if (
            navigator.onLine &&
            !authRequiredRef.current
          ) {
            scheduleSync(
              250,
            );
          }
        };

      const handleSyncRequested =
        () => {
          if (
            navigator.onLine &&
            !authRequiredRef.current
          ) {
            startSync({
              silent:
                true,
              force:
                true,
            });
          }
        };

      const handleAuthRequired =
        (event) => {
          const message =
            event?.detail
              ?.message ||
            "Tu sesión venció. Vuelve a ingresar en este dispositivo para sincronizar.";

          markAuthRequired(
            message,
          );

          refreshStats();
        };

      const handleVisible =
        () => {
          if (
            document.visibilityState ===
              "visible" &&
            navigator.onLine &&
            !authRequiredRef.current
          ) {
            scheduleSync(
              300,
            );
          }
        };

      window.addEventListener(
        "online",
        handleOnline,
      );

      window.addEventListener(
        "offline",
        handleOffline,
      );

      window.addEventListener(
        "focus",
        handleVisible,
      );

      window.addEventListener(
        "pageshow",
        handleVisible,
      );

      window.addEventListener(
        OFFLINE_SYNC_EVENTS
          .QUEUE_UPDATED,
        handleQueueChanged,
      );

      window.addEventListener(
        OFFLINE_SYNC_EVENTS
          .SYNC_REQUESTED,
        handleSyncRequested,
      );

      window.addEventListener(
        OFFLINE_SYNC_EVENTS
          .AUTH_REQUIRED,
        handleAuthRequired,
      );

      document.addEventListener(
        "visibilitychange",
        handleVisible,
      );

      const interval =
        window.setInterval(
          () => {
            if (
              navigator.onLine &&
              !isSyncingRef.current &&
              !authRequiredRef.current
            ) {
              startSync({
                silent:
                  true,
              });
            }
          },
          AUTO_RETRY_INTERVAL_MS,
        );

      initialize();

      return () => {
        window.removeEventListener(
          "online",
          handleOnline,
        );

        window.removeEventListener(
          "offline",
          handleOffline,
        );

        window.removeEventListener(
          "focus",
          handleVisible,
        );

        window.removeEventListener(
          "pageshow",
          handleVisible,
        );

        window.removeEventListener(
          OFFLINE_SYNC_EVENTS
            .QUEUE_UPDATED,
          handleQueueChanged,
        );

        window.removeEventListener(
          OFFLINE_SYNC_EVENTS
            .SYNC_REQUESTED,
          handleSyncRequested,
        );

        window.removeEventListener(
          OFFLINE_SYNC_EVENTS
            .AUTH_REQUIRED,
          handleAuthRequired,
        );

        document.removeEventListener(
          "visibilitychange",
          handleVisible,
        );

        window.clearInterval(
          interval,
        );

        window.clearTimeout(
          scheduledTimerRef.current,
        );
      };
    }, [
      markAuthRequired,
      refreshStats,
      scheduleSync,
      startSync,
    ]);

    return {
      isOnline,
      syncing,
      pendingCount:
        queueStats.pendingCount,
      failedCount:
        queueStats.failedCount,
      totalCount:
        queueStats.totalCount,
      lastError:
        queueStats.lastError,
      currentItem,
      lastResult,
      authRequired,
      authMessage,
      startSync,
      refreshStats,
    };
  };