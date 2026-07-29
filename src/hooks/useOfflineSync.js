import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import toast from "react-hot-toast";

import api from "../api/apiClient";
import {
  countPendingSync,
  getPendingSync,
  markSyncItemRetry,
  removeFromSyncQueue,
} from "../utils/db";
import {
  OFFLINE_SYNC_EVENTS,
} from "../services/offlineManager";

const AUTO_RETRY_INTERVAL_MS =
  15_000;

const ONLINE_SYNC_DELAY_MS =
  1_000;

const getStoredUser = () => {
  try {
    const stored =
      localStorage.getItem(
        "user",
      );

    return stored
      ? JSON.parse(stored)
      : null;
  } catch {
    return null;
  }
};

const hasValidSession = () => {
  const token =
    localStorage.getItem(
      "token",
    );

  if (
    !token ||
    token === "null" ||
    token ===
      "undefined"
  ) {
    return false;
  }

  const role =
    String(
      getStoredUser()?.role ||
      "",
    ).toUpperCase();

  return [
    "USUARIO",
    "MERCADERISTA",
  ].includes(role);
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
    const file =
      value.blob instanceof
        File
        ? value.blob
        : new File(
            [
              value.blob,
            ],
            value.name ||
              `archivo-${Date.now()}`,
            {
              type:
                value.mimeType ||
                value.blob
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

    const entries =
      Array.isArray(
        payload.entries,
      )
        ? payload.entries
        : [];

    entries.forEach(
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

const executeRequest = async (
  item,
  body,
) => {
  const method =
    String(
      item.method ||
      "POST",
    ).toLowerCase();

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
      item.endpoint,
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
      item.endpoint,
      {
        params:
          body || undefined,
      },
    );
  }

  return api[
    method
  ](
    item.endpoint,
    body,
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

const isNetworkFailure = (
  error,
) =>
  !error?.response ||
  error?.code ===
    "ERR_NETWORK" ||
  error?.message ===
    "Network Error" ||
  error?.name ===
    "AbortError";

const isPermanentError = (
  error,
) => {
  if (
    error?.permanent ===
      true
  ) {
    return true;
  }

  return [
    400,
    404,
    413,
    422,
  ].includes(
    getStatusCode(error),
  );
};

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
      pendingCount,
      setPendingCount,
    ] = useState(0);

    const isSyncingRef =
      useRef(false);

    const syncAgainRef =
      useRef(false);

    const scheduledTimerRef =
      useRef(null);

    const updatePendingCount =
      useCallback(async () => {
        try {
          const count =
            await countPendingSync();

          setPendingCount(
            count,
          );

          return count;
        } catch (error) {
          console.error(
            "Error contando operaciones offline:",
            error,
          );

          return 0;
        }
      }, []);

    const startSync =
      useCallback(async ({
        silent = false,
      } = {}) => {
        if (
          typeof navigator !==
            "undefined" &&
          !navigator.onLine
        ) {
          return {
            synchronizedCount:
              0,
            discardedCount:
              0,
            pendingCount:
              await updatePendingCount(),
          };
        }

        if (
          isSyncingRef.current
        ) {
          syncAgainRef.current =
            true;

          return null;
        }

        if (
          !hasValidSession()
        ) {
          await updatePendingCount();

          return null;
        }

        const pending =
          await getPendingSync();

        if (
          pending.length === 0
        ) {
          await updatePendingCount();

          if (!silent) {
            toast.dismiss(
              "offline-sync",
            );
          }

          return {
            synchronizedCount:
              0,
            discardedCount:
              0,
            pendingCount:
              0,
          };
        }

        isSyncingRef.current =
          true;

        syncAgainRef.current =
          false;

        setSyncing(true);

        let synchronizedCount =
          0;

        let discardedCount =
          0;

        let deferredCount =
          0;

        const blockedRoutes =
          new Set();

        if (!silent) {
          toast.loading(
            "Sincronizando datos pendientes...",
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
            const item of
            pending
          ) {
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

            /*
             * Si una operación de una visita falla temporalmente,
             * las posteriores de esa misma visita deben esperar.
             * Las visitas distintas sí pueden continuar.
             */
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
                item.type ===
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
                    "El check-in GPS debe realizarse en línea.",
                  );

                error.permanent =
                  true;

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

              /*
               * Conflicto suele significar que la operación ya había
               * sido procesada antes de un cierre o recarga.
               */
              if (
                statusCode ===
                  409
              ) {
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
                      error?.response
                        ?.data ||
                      null,
                    recovered:
                      true,
                  },
                );

                continue;
              }

              if (
                statusCode ===
                  401 ||
                statusCode ===
                  403
              ) {
                await markSyncItemRetry(
                  item.id,
                  message,
                );

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

                toast.error(
                  "La sesión expiró o no tiene permisos. Inicia sesión nuevamente para sincronizar.",
                  {
                    id:
                      "offline-sync",
                  },
                );

                break;
              }

              if (
                isPermanentError(
                  error,
                )
              ) {
                await removeFromSyncQueue(
                  item.id,
                );

                discardedCount +=
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

                /*
                 * No bloquear la visita por un dato irrecuperable:
                 * se descarta y continúa con la siguiente operación.
                 */
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
                  network:
                    isNetworkFailure(
                      error,
                    ),
                },
              );
            }
          }

          const remaining =
            await updatePendingCount();

          if (!silent) {
            if (
              synchronizedCount >
                0 &&
              remaining === 0
            ) {
              toast.success(
                `${synchronizedCount} operación${
                  synchronizedCount ===
                  1
                    ? ""
                    : "es"
                } sincronizada${
                  synchronizedCount ===
                  1
                    ? ""
                    : "s"
                }.`,
                {
                  id:
                    "offline-sync",
                },
              );
            } else if (
              synchronizedCount >
              0
            ) {
              toast.success(
                `${synchronizedCount} sincronizada${
                  synchronizedCount ===
                  1
                    ? ""
                    : "s"
                }. Quedan ${remaining} pendiente${
                  remaining ===
                  1
                    ? ""
                    : "s"
                }.`,
                {
                  id:
                    "offline-sync",
                },
              );
            } else if (
              discardedCount >
              0
            ) {
              toast.error(
                `${discardedCount} operación${
                  discardedCount ===
                  1
                    ? ""
                    : "es"
                } no pudo${
                  discardedCount ===
                  1
                    ? ""
                    : "ieron"
                } recuperarse.`,
                {
                  id:
                    "offline-sync",
                },
              );
            } else {
              toast.dismiss(
                "offline-sync",
              );
            }
          }

          const summary = {
            synchronizedCount,
            discardedCount,
            deferredCount,
            pendingCount:
              remaining,
          };

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
              300,
            );
          }
        }
      }, [
        updatePendingCount,
      ]);

    const scheduleSync =
      useCallback(
        (
          delay =
            ONLINE_SYNC_DELAY_MS,
          {
            silent =
              false,
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
              () => {
                startSync({
                  silent,
                });
              },
              delay,
            );
        },
        [
          startSync,
        ],
      );

    useEffect(() => {
      const handleOnline =
        () => {
          setIsOnline(
            true,
          );

          toast.success(
            "Conexión restablecida. Sincronizando datos...",
            {
              id:
                "offline-online",
            },
          );

          scheduleSync(
            ONLINE_SYNC_DELAY_MS,
          );
        };

      const handleOffline =
        () => {
          setIsOnline(
            false,
          );

          toast.error(
            "Sin conexión. El avance se guardará en el dispositivo.",
            {
              id:
                "offline-online",
            },
          );
        };

      const handleVisibility =
        () => {
          if (
            document
              .visibilityState ===
              "visible" &&
            navigator.onLine
          ) {
            scheduleSync(
              300,
              {
                silent:
                  true,
              },
            );
          }
        };

      const handleFocus =
        () => {
          if (
            navigator.onLine
          ) {
            scheduleSync(
              300,
              {
                silent:
                  true,
              },
            );
          }
        };

      const handleSyncRequested =
        () => {
          if (
            navigator.onLine
          ) {
            scheduleSync(
              200,
              {
                silent:
                  true,
              },
            );
          }
        };

      const handleQueueUpdated =
        () => {
          updatePendingCount();

          if (
            navigator.onLine
          ) {
            scheduleSync(
              250,
              {
                silent:
                  true,
              },
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
        handleFocus,
      );

      window.addEventListener(
        "pageshow",
        handleFocus,
      );

      window.addEventListener(
        OFFLINE_SYNC_EVENTS
          .SYNC_REQUESTED,
        handleSyncRequested,
      );

      window.addEventListener(
        OFFLINE_SYNC_EVENTS
          .QUEUE_UPDATED,
        handleQueueUpdated,
      );

      document.addEventListener(
        "visibilitychange",
        handleVisibility,
      );

      const backupInterval =
        window.setInterval(
          () => {
            if (
              navigator.onLine &&
              !isSyncingRef.current
            ) {
              startSync({
                silent:
                  true,
              });
            }
          },
          AUTO_RETRY_INTERVAL_MS,
        );

      updatePendingCount();

      if (
        navigator.onLine
      ) {
        scheduleSync(
          ONLINE_SYNC_DELAY_MS,
          {
            silent:
              true,
          },
        );
      }

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
          handleFocus,
        );

        window.removeEventListener(
          "pageshow",
          handleFocus,
        );

        window.removeEventListener(
          OFFLINE_SYNC_EVENTS
            .SYNC_REQUESTED,
          handleSyncRequested,
        );

        window.removeEventListener(
          OFFLINE_SYNC_EVENTS
            .QUEUE_UPDATED,
          handleQueueUpdated,
        );

        document.removeEventListener(
          "visibilitychange",
          handleVisibility,
        );

        window.clearInterval(
          backupInterval,
        );

        window.clearTimeout(
          scheduledTimerRef.current,
        );
      };
    }, [
      scheduleSync,
      startSync,
      updatePendingCount,
    ]);

    return {
      isOnline,
      syncing,
      pendingCount,
      startSync,
    };
  };
