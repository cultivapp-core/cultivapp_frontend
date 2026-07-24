import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  getPendingSync,
  markSyncItemRetry,
  removeFromSyncQueue,
} from "../utils/db";
import api from "../api/apiClient";
import toast from "react-hot-toast";
import {
  OFFLINE_SYNC_EVENTS,
} from "../services/OfflineManager";

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
      parts[1] || "",
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
      type: mime,
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
            [value.blob],
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
    value instanceof Blob
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
  if (!payload) {
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
    throw new Error(
      `Método HTTP no soportado: ${method}`,
    );
  }

  if (
    method === "delete"
  ) {
    return api.delete(
      item.endpoint,
      {
        data: body,
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

const processLegacyItem =
  async (
    item,
    body,
  ) => {
    const {
      type,
      routeId,
    } = item;

    if (
      !type ||
      !routeId
    ) {
      throw new Error(
        "Operación offline incompleta.",
      );
    }

    switch (type) {
      case "PHOTO":
        return api.post(
          `/routes/${routeId}/photo`,
          body,
        );

      case "SCAN":
        return api.post(
          `/routes/${routeId}/scans`,
          body,
        );

      case "TASK":
        return api.post(
          `/routes/${routeId}/task`,
          body,
        );

      case "FINISH":
        return api.post(
          `/routes/${routeId}/finish`,
          body,
        );

      case "CHECK_IN": {
        const error =
          new Error(
            "Un check-in antiguo no puede sincronizarse porque requiere validar el GPS en tiempo real.",
          );

        error.permanent =
          true;

        throw error;
      }

      default: {
        const error =
          new Error(
            "Tipo de operación offline desconocido.",
          );

        error.permanent =
          true;

        throw error;
      }
    }
  };

export const useOfflineSync =
  () => {
    const [
      isOnline,
      setIsOnline,
    ] = useState(
      navigator.onLine,
    );

    const [
      syncing,
      setSyncing,
    ] = useState(false);

    const isSyncingRef =
      useRef(false);

    const startSync =
      useCallback(async () => {
        if (
          isSyncingRef.current ||
          !navigator.onLine
        ) {
          return;
        }

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
          return;
        }

        const pending =
          await getPendingSync();

        if (
          pending.length === 0
        ) {
          return;
        }

        isSyncingRef.current =
          true;

        setSyncing(true);

        let synchronizedCount =
          0;

        let discardedCount =
          0;

        toast.loading(
          "Sincronizando datos pendientes...",
          {
            id:
              "offline-sync",
          },
        );

        try {
          for (
            const item of
            pending
          ) {
            try {
              const isQueuedCheckIn =
                item.type ===
                  "CHECK_IN" ||
                String(
                  item.endpoint ||
                  "",
                ).includes(
                  "/check-in",
                );

              if (
                isQueuedCheckIn
              ) {
                const error =
                  new Error(
                    "El check-in GPS debe realizarse en línea y no puede sincronizarse desde una cola offline.",
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
                item.method &&
                item.endpoint
                  ? await executeRequest(
                      item,
                      body,
                    )
                  : await processLegacyItem(
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
                  response,
                },
              );
            } catch (error) {
              const statusCode =
                error?.status ||
                error?.response
                  ?.status ||
                null;

              const message =
                error?.response
                  ?.data?.message ||
                error?.message ||
                "Error de sincronización";

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

                toast.error(
                  "Tu sesión expiró o no tiene permisos. Inicia sesión para continuar la sincronización.",
                  {
                    id:
                      "offline-sync",
                  },
                );

                return;
              }

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

              const permanentError =
                error?.permanent ===
                  true ||
                [
                  400,
                  404,
                  413,
                  422,
                ].includes(
                  statusCode,
                );

              if (
                permanentError
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

                continue;
              }

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

              break;
            }
          }

          if (
            synchronizedCount >
            0
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

          dispatchSyncEvent(
            OFFLINE_SYNC_EVENTS
              .SYNC_COMPLETE,
            {
              synchronizedCount,
              discardedCount,
            },
          );
        } finally {
          isSyncingRef.current =
            false;

          setSyncing(false);
        }
      }, []);

    useEffect(() => {
      const handleOnline =
        () => {
          setIsOnline(
            true,
          );

          toast.success(
            "Conexión restablecida. Verificando datos...",
          );

          window.setTimeout(
            startSync,
            1200,
          );
        };

      const handleOffline =
        () => {
          setIsOnline(
            false,
          );

          toast.error(
            "Sin conexión. El avance se guardará localmente.",
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
            startSync();
          }
        };

      const handleQueueUpdated =
        () => {
          if (
            navigator.onLine
          ) {
            window.setTimeout(
              startSync,
              250,
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
              startSync();
            }
          },
          20000,
        );

      if (
        navigator.onLine
      ) {
        window.setTimeout(
          startSync,
          1200,
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
      };
    }, [
      startSync,
    ]);

    return {
      isOnline,
      syncing,
      startSync,
    };
  };
