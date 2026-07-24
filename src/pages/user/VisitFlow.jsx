import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  useNavigate,
  useParams,
} from "react-router-dom";
import {
  FiAlertCircle,
  FiArrowLeft,
  FiBox,
  FiCamera,
  FiCheck,
  FiCheckCircle,
  FiChevronRight,
  FiClock,
  FiImage,
  FiLoader,
  FiMapPin,
  FiPackage,
  FiPlay,
  FiRefreshCw,
  FiSend,
  FiTag,
  FiTrash2,
  FiWifi,
  FiWifiOff,
  FiX,
} from "react-icons/fi";
import toast from "react-hot-toast";

import api from "../../api/apiClient";
import Scanner from "../../components/Scanner";
import QuestionRenderer from "../../components/modals/QuestionRenderer";
import OfflineManager, {
  OFFLINE_SYNC_EVENTS,
} from "../../services/offlineManager";
import {
  getVisitDraft,
  removeVisitDraft,
  saveVisitDraft,
} from "../../utils/db";

const FLOW_STEPS = [
  1,
  2,
  3,
  4,
  5,
  6,
  7,
];

const STEP_INFO = {
  1: {
    key: "foto_fachada",
    title: "Llegada al local",
    subtitle:
      "Registra la evidencia de entrada",
    icon: FiMapPin,
  },
  2: {
    key: "foto_gondola_inicio",
    title: "Góndola inicial",
    subtitle:
      "Selecciona el producto y registra su estado previo",
    icon: FiImage,
  },
  3: {
    key: "escaneo",
    title: "Escaneo de productos",
    subtitle:
      "Registra los códigos EAN encontrados en sala",
    icon: FiPackage,
  },
  4: {
    key: "preguntas",
    title: "Encuesta de gestión",
    subtitle:
      "Completa la validación del producto",
    icon: FiCheckCircle,
  },
  5: {
    key: "foto_gondola_termino",
    title: "Góndola final",
    subtitle:
      "Registra el resultado de la gestión",
    icon: FiCamera,
  },
  6: {
    key: "decision",
    title: "Gestión del producto",
    subtitle:
      "Confirma el producto y decide cómo continuar",
    icon: FiBox,
  },
  7: {
    key: "foto_salida",
    title: "Registro de salida",
    subtitle:
      "Captura la evidencia final de la visita",
    icon: FiSend,
  },
  8: {
    key: "cierre",
    title: "Visita finalizada",
    subtitle:
      "El proceso fue completado correctamente",
    icon: FiCheckCircle,
  },
};

const PHOTO_STATUS = {
  IDLE: "idle",
  UPLOADING: "uploading",
  SUCCESS: "success",
  QUEUED: "queued",
  PENDING: "pending",
  ERROR: "error",
};

const GPS_STATUS = {
  IDLE: "idle",
  LOCATING: "locating",
  CHECKING: "checking",
  SUCCESS: "success",
  ERROR: "error",
};

const MAX_CHECK_IN_DISTANCE_METERS = 300;

const primaryButtonClass =
  "flex min-h-[52px] w-full items-center justify-center gap-2 rounded-2xl bg-[#87be00] px-5 text-[9px] font-black uppercase tracking-wider text-white shadow-lg shadow-[#87be00]/20 transition hover:bg-[#76a600] active:scale-[0.98] disabled:cursor-not-allowed disabled:border disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400 disabled:shadow-none disabled:active:scale-100";

const secondaryButtonClass =
  "flex min-h-[52px] w-full items-center justify-center gap-2 rounded-2xl border border-[#87be00]/30 bg-white px-5 text-[9px] font-black uppercase tracking-wider text-[#6e9e00] transition hover:bg-[#87be00]/10 active:scale-[0.98] disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400 disabled:active:scale-100";

const extractRows = (
  response,
) => {
  if (Array.isArray(response)) {
    return response;
  }

  if (
    Array.isArray(
      response?.data,
    )
  ) {
    return response.data;
  }

  if (
    Array.isArray(
      response?.rows,
    )
  ) {
    return response.rows;
  }

  return [];
};

const extractUploadedUrl = (
  response,
) =>
  response?.image_url ??
  response?.url ??
  response?.path ??
  response?.data?.image_url ??
  response?.data?.url ??
  response?.data?.path ??
  null;

const isRequiredQuestion = (
  question,
) =>
  question?.is_required === true ||
  question?.is_required === 1 ||
  String(
    question?.is_required,
  ).toLowerCase() === "true";

const hasValidAnswer = (
  value,
) => {
  if (
    value === undefined ||
    value === null
  ) {
    return false;
  }

  if (
    typeof value === "string"
  ) {
    return (
      value.trim() !== ""
    );
  }

  if (
    Array.isArray(value)
  ) {
    return value.length > 0;
  }

  return true;
};

const loadImageElement = (
  file,
) =>
  new Promise(
    (resolve, reject) => {
      const sourceUrl =
        URL.createObjectURL(file);

      const image = new Image();

      image.onload = () => {
        URL.revokeObjectURL(
          sourceUrl,
        );
        resolve(image);
      };

      image.onerror = () => {
        URL.revokeObjectURL(
          sourceUrl,
        );
        reject(
          new Error(
            "No fue posible leer la imagen.",
          ),
        );
      };

      image.src = sourceUrl;
    },
  );

const compressImage = async (
  file,
  maxWidth = 960,
  quality = 0.68,
) => {
  if (
    !file?.type?.startsWith(
      "image/",
    )
  ) {
    throw new Error(
      "El archivo seleccionado no es una imagen.",
    );
  }

  let drawable;
  let width;
  let height;
  let closeDrawable =
    () => {};

  if (
    typeof createImageBitmap ===
    "function"
  ) {
    const bitmap =
      await createImageBitmap(
        file,
      );

    drawable = bitmap;
    width = bitmap.width;
    height = bitmap.height;
    closeDrawable = () =>
      bitmap.close?.();
  } else {
    const image =
      await loadImageElement(
        file,
      );

    drawable = image;
    width =
      image.naturalWidth ||
      image.width;
    height =
      image.naturalHeight ||
      image.height;
  }

  if (width > maxWidth) {
    height = Math.round(
      (height * maxWidth) /
        width,
    );
    width = maxWidth;
  }

  const canvas =
    document.createElement(
      "canvas",
    );

  canvas.width = width;
  canvas.height = height;

  const context =
    canvas.getContext("2d");

  if (!context) {
    closeDrawable();

    throw new Error(
      "No fue posible preparar la imagen.",
    );
  }

  context.drawImage(
    drawable,
    0,
    0,
    width,
    height,
  );

  closeDrawable();

  const blob =
    await new Promise(
      (resolve, reject) => {
        canvas.toBlob(
          (result) => {
            if (result) {
              resolve(result);
            } else {
              reject(
                new Error(
                  "No fue posible comprimir la imagen.",
                ),
              );
            }
          },
          "image/webp",
          quality,
        );
      },
    );

  const cleanName =
    file.name.replace(
      /\.[^/.]+$/,
      "",
    ) || "evidencia";

  return new File(
    [blob],
    `${cleanName}.webp`,
    {
      type:
        blob.type ||
        "image/webp",
      lastModified:
        Date.now(),
    },
  );
};

const getCurrentGpsPosition = () =>
  new Promise(
    (resolve, reject) => {
      if (
        !navigator.geolocation
      ) {
        reject(
          new Error(
            "El dispositivo no permite obtener la ubicación GPS.",
          ),
        );
        return;
      }

      navigator.geolocation.getCurrentPosition(
        resolve,
        reject,
        {
          enableHighAccuracy: true,
          timeout: 20000,
          maximumAge: 0,
        },
      );
    },
  );

const getApiPayload = (
  response,
) => {
  if (
    response &&
    typeof response === "object" &&
    (
      Object.prototype.hasOwnProperty.call(
        response,
        "success",
      ) ||
      Object.prototype.hasOwnProperty.call(
        response,
        "isValid",
      ) ||
      Object.prototype.hasOwnProperty.call(
        response,
        "code",
      )
    )
  ) {
    return response;
  }

  if (
    response?.data &&
    typeof response.data === "object"
  ) {
    return response.data;
  }

  return response || {};
};

const getGpsErrorMessage = (
  error,
) => {
  const backendData =
    error?.response?.data ??
    error?.data ??
    null;

  if (
    backendData?.message
  ) {
    return backendData.message;
  }

  if (
    error?.code === 1
  ) {
    return "Debes autorizar el acceso a la ubicación para iniciar la visita.";
  }

  if (
    error?.code === 2
  ) {
    return "No fue posible determinar tu ubicación. Activa el GPS e inténtalo nuevamente.";
  }

  if (
    error?.code === 3
  ) {
    return "La ubicación tardó demasiado en responder. Verifica la señal GPS e inténtalo nuevamente.";
  }

  return (
    error?.message ||
    "No fue posible validar tu ubicación."
  );
};

const isNetworkError = (
  error,
) =>
  !error?.response ||
  error?.code === "ERR_NETWORK" ||
  error?.message === "Network Error";

const VisitFlow = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const fileInputRef =
    useRef(null);

  const captureStepRef =
    useRef(1);

  const isProcessingScan =
    useRef(false);

  const previewUrlsRef =
    useRef(new Set());

  const previousOnlineStateRef =
    useRef(
      navigator.onLine,
    );

  const draftSaveTimerRef =
    useRef(null);

  const BASE_URL =
    import.meta.env
      .VITE_API_URL ||
    "http://localhost:5000";

  const [isOnline, setIsOnline] =
    useState(
      navigator.onLine,
    );

  const [
    showOfflineModal,
    setShowOfflineModal,
  ] = useState(
    !navigator.onLine,
  );

  const [
    offlineDetectedAt,
    setOfflineDetectedAt,
  ] = useState(
    !navigator.onLine
      ? new Date()
      : null,
  );

  const [
    draftLoaded,
    setDraftLoaded,
  ] = useState(false);

  const [
    visitPendingSync,
    setVisitPendingSync,
  ] = useState(false);

  const [
    photoQueueIds,
    setPhotoQueueIds,
  ] = useState({});

  const [
    scanQueueItems,
    setScanQueueItems,
  ] = useState([]);

  const visitSessionKey =
    `cultivapp_visit_started_${id}`;

  const [
    visitStarted,
    setVisitStarted,
  ] = useState(
    () =>
      sessionStorage.getItem(
        visitSessionKey,
      ) === "true",
  );

  const [
    gpsStatus,
    setGpsStatus,
  ] = useState(
    GPS_STATUS.IDLE,
  );

  const [
    gpsMessage,
    setGpsMessage,
  ] = useState("");

  const [
    gpsDistance,
    setGpsDistance,
  ] = useState(null);

  const [step, setStep] =
    useState(1);

  const [loading, setLoading] =
    useState(false);

  const [capturing, setCapturing] =
    useState(false);

  const [
    masterLoading,
    setMasterLoading,
  ] = useState(true);

  const [
    questionsLoading,
    setQuestionsLoading,
  ] = useState(false);

  const [
    masterError,
    setMasterError,
  ] = useState(null);

  const [
    questionsError,
    setQuestionsError,
  ] = useState(null);

  const [brands, setBrands] =
    useState([]);

  const [
    allProducts,
    setProducts,
  ] = useState([]);

  const [
    filteredProducts,
    setFilteredProducts,
  ] = useState([]);

  const [
    selectedBrand,
    setSelectedBrand,
  ] = useState("");

  const [
    selectedProduct,
    setSelectedProduct,
  ] = useState("");

  const [
    productStartTime,
    setProductStartTime,
  ] = useState(null);

  const [
    scannedCodes,
    setScannedCodes,
  ] = useState([]);

  const [
    questions,
    setQuestions,
  ] = useState([]);

  const [answers, setAnswers] =
    useState({});

  const [comment, setComment] =
    useState("");

  const [
    fachadaPhoto,
    setFachadaPhoto,
  ] = useState(null);

  const [
    gondolaInicialPhoto,
    setGondolaInicialPhoto,
  ] = useState(null);

  const [
    gondolaTerminoPhoto,
    setGondolaTerminoPhoto,
  ] = useState(null);

  const [
    exitPhoto,
    setExitPhoto,
  ] = useState(null);

  const [
    photoFiles,
    setPhotoFiles,
  ] = useState({});

  const [
    photoSync,
    setPhotoSync,
  ] = useState({});

  const [
    photoServerUrls,
    setPhotoServerUrls,
  ] = useState({});

  const [
    imageErrors,
    setImageErrors,
  ] = useState({});

  const currentStepInfo =
    STEP_INFO[step] ||
    STEP_INFO[8];

  const CurrentStepIcon =
    currentStepInfo.icon;

  const currentProgress =
    step === 8
      ? FLOW_STEPS.length
      : Math.max(
          1,
          FLOW_STEPS.indexOf(
            step,
          ) + 1,
        );

  const selectedProductInfo =
    useMemo(
      () =>
        allProducts.find(
          (product) =>
            String(
              product.id,
            ) ===
            String(
              selectedProduct,
            ),
        ),
      [
        allProducts,
        selectedProduct,
      ],
    );

  const groupedScannedCodes =
    useMemo(
      () =>
        scannedCodes.reduce(
          (result, code) => {
            result[code] =
              (result[code] ||
                0) + 1;

            return result;
          },
          {},
        ),
      [scannedCodes],
    );

  const requiredQuestions =
    useMemo(
      () =>
        questions.filter(
          isRequiredQuestion,
        ),
      [questions],
    );

  const answeredRequiredCount =
    useMemo(
      () =>
        requiredQuestions.filter(
          (question) =>
            hasValidAnswer(
              answers[
                question.id
              ],
            ),
        ).length,
      [
        requiredQuestions,
        answers,
      ],
    );

  const answeredQuestionsCount =
    useMemo(
      () =>
        questions.filter(
          (question) =>
            hasValidAnswer(
              answers[
                question.id
              ],
            ),
        ).length,
      [questions, answers],
    );

  const areRequiredQuestionsComplete =
    requiredQuestions.length ===
    answeredRequiredCount;

  const isSurveyComplete =
    questions.length > 0 &&
    answeredQuestionsCount ===
      questions.length;

  const canContinueFromScan =
    scannedCodes.length > 0;

  const canContinueFromSurvey =
    isSurveyComplete;

  const isPhotoReady = (
    stepKey,
  ) =>
    [
      PHOTO_STATUS.SUCCESS,
      PHOTO_STATUS.QUEUED,
    ].includes(
      photoSync[stepKey],
    );

  const productPhotosReady =
    isPhotoReady(2) &&
    isPhotoReady(5);

  const exitPhotoReady =
    isPhotoReady(7);

  const formatImageUrl =
    useCallback(
      (url) => {
        if (!url) {
          return null;
        }

        if (
          url.startsWith(
            "http",
          ) ||
          url.startsWith(
            "blob:",
          ) ||
          url.startsWith(
            "data:",
          )
        ) {
          return url;
        }

        return `${BASE_URL.replace(
          /\/$/,
          "",
        )}/${url.replace(
          /^\//,
          "",
        )}`;
      },
      [BASE_URL],
    );

  useEffect(() => {
    const handleOnline = () => {
      const wasOffline =
        previousOnlineStateRef.current ===
        false;

      previousOnlineStateRef.current =
        true;

      setIsOnline(true);
      setShowOfflineModal(false);
      setOfflineDetectedAt(null);

      if (wasOffline) {
        toast.success(
          "Conexión restablecida. Ya puedes sincronizar y continuar.",
          {
            duration: 3500,
          },
        );
      }
    };

    const handleOffline = () => {
      previousOnlineStateRef.current =
        false;

      setIsOnline(false);
      setOfflineDetectedAt(
        new Date(),
      );
      setShowOfflineModal(true);
    };

    window.addEventListener(
      "online",
      handleOnline,
    );

    window.addEventListener(
      "offline",
      handleOffline,
    );

    return () => {
      window.removeEventListener(
        "online",
        handleOnline,
      );

      window.removeEventListener(
        "offline",
        handleOffline,
      );
    };
  }, []);

  useEffect(() => {
    let active = true;

    const restoreDraft =
      async () => {
        try {
          const draft =
            await getVisitDraft(
              id,
            );

          if (
            !active ||
            !draft
          ) {
            return;
          }

          if (
            draft.visitStarted ===
            true
          ) {
            sessionStorage.setItem(
              visitSessionKey,
              "true",
            );

            setVisitStarted(
              true,
            );
          }

          setStep(
            Number(
              draft.step,
            ) || 1,
          );

          setSelectedBrand(
            draft.selectedBrand ||
              "",
          );

          setSelectedProduct(
            draft.selectedProduct ||
              "",
          );

          setProductStartTime(
            draft.productStartTime ||
              null,
          );

          setScannedCodes(
            Array.isArray(
              draft.scannedCodes,
            )
              ? draft.scannedCodes
              : [],
          );

          setAnswers(
            draft.answers &&
              typeof draft.answers ===
                "object"
              ? draft.answers
              : {},
          );

          setComment(
            draft.comment ||
              "",
          );

          setPhotoSync(
            draft.photoSync &&
              typeof draft.photoSync ===
                "object"
              ? draft.photoSync
              : {},
          );

          setPhotoServerUrls(
            draft.photoServerUrls &&
              typeof draft.photoServerUrls ===
                "object"
              ? draft.photoServerUrls
              : {},
          );

          setPhotoQueueIds(
            draft.photoQueueIds &&
              typeof draft.photoQueueIds ===
                "object"
              ? draft.photoQueueIds
              : {},
          );

          setScanQueueItems(
            Array.isArray(
              draft.scanQueueItems,
            )
              ? draft.scanQueueItems
              : [],
          );

          setVisitPendingSync(
            draft.visitPendingSync ===
              true,
          );

          const restoredFiles =
            draft.photoFiles &&
            typeof draft.photoFiles ===
              "object"
              ? draft.photoFiles
              : {};

          setPhotoFiles(
            restoredFiles,
          );

          Object.entries(
            restoredFiles,
          ).forEach(
            ([
              stepKey,
              file,
            ]) => {
              if (
                !file ||
                !(file instanceof Blob)
              ) {
                return;
              }

              const previewUrl =
                URL.createObjectURL(
                  file,
                );

              previewUrlsRef.current.add(
                previewUrl,
              );

              const numericStep =
                Number(stepKey);

              if (
                numericStep === 1
              ) {
                setFachadaPhoto(
                  previewUrl,
                );
              } else if (
                numericStep === 2
              ) {
                setGondolaInicialPhoto(
                  previewUrl,
                );
              } else if (
                numericStep === 5
              ) {
                setGondolaTerminoPhoto(
                  previewUrl,
                );
              } else if (
                numericStep === 7
              ) {
                setExitPhoto(
                  previewUrl,
                );
              }
            },
          );

          toast(
            "Se recuperó el avance guardado de la visita.",
            {
              icon: "📲",
              duration: 2500,
            },
          );
        } catch (error) {
          console.error(
            "Error restaurando borrador offline:",
            error,
          );
        } finally {
          if (active) {
            setDraftLoaded(
              true,
            );
          }
        }
      };

    restoreDraft();

    return () => {
      active = false;
    };
  }, [
    id,
    visitSessionKey,
  ]);

  useEffect(() => {
    if (
      !draftLoaded ||
      !id
    ) {
      return undefined;
    }

    if (
      step === 8 &&
      !visitPendingSync
    ) {
      removeVisitDraft(
        id,
      ).catch(
        (error) =>
          console.error(
            "Error eliminando borrador:",
            error,
          ),
      );

      return undefined;
    }

    if (
      !visitStarted &&
      !visitPendingSync
    ) {
      return undefined;
    }

    window.clearTimeout(
      draftSaveTimerRef.current,
    );

    draftSaveTimerRef.current =
      window.setTimeout(
        () => {
          saveVisitDraft({
            routeId: id,
            visitStarted,
            visitPendingSync,
            step,
            selectedBrand,
            selectedProduct,
            productStartTime,
            scannedCodes,
            answers,
            comment,
            photoFiles,
            photoSync,
            photoServerUrls,
            photoQueueIds,
            scanQueueItems,
            status:
              visitPendingSync
                ? "pending_sync"
                : "in_progress",
            updatedAt:
              new Date().toISOString(),
          }).catch(
            (error) =>
              console.error(
                "Error guardando borrador offline:",
                error,
              ),
          );
        },
        350,
      );

    return () => {
      window.clearTimeout(
        draftSaveTimerRef.current,
      );
    };
  }, [
    id,
    draftLoaded,
    visitStarted,
    visitPendingSync,
    step,
    selectedBrand,
    selectedProduct,
    productStartTime,
    scannedCodes,
    answers,
    comment,
    photoFiles,
    photoSync,
    photoServerUrls,
    photoQueueIds,
    scanQueueItems,
  ]);

  useEffect(() => {
    const handleSyncSuccess =
      (event) => {
        const item =
          event?.detail?.item;

        if (
          !item ||
          String(
            item.routeId,
          ) !== String(id)
        ) {
          return;
        }

        if (
          item.type === "PHOTO"
        ) {
          const stepKey =
            Number(
              item.metadata
                ?.stepKey,
            );

          if (
            Number.isFinite(
              stepKey,
            )
          ) {
            setPhotoSync(
              (current) => ({
                ...current,
                [stepKey]:
                  PHOTO_STATUS.SUCCESS,
              }),
            );

            const uploadedUrl =
              extractUploadedUrl(
                event?.detail
                  ?.response,
              );

            if (uploadedUrl) {
              setPhotoServerUrls(
                (current) => ({
                  ...current,
                  [stepKey]:
                    uploadedUrl,
                }),
              );
            }

            setPhotoQueueIds(
              (current) => {
                const next = {
                  ...current,
                };

                delete next[
                  stepKey
                ];

                return next;
              },
            );
          }
        }

        if (
          item.type === "SCAN"
        ) {
          setScanQueueItems(
            (current) =>
              current.filter(
                (queuedItem) =>
                  queuedItem.queueId !==
                  item.id,
              ),
          );
        }

        if (
          item.type === "FINISH"
        ) {
          setVisitPendingSync(
            false,
          );

          sessionStorage.removeItem(
            visitSessionKey,
          );

          removeVisitDraft(
            id,
          ).catch(
            (error) =>
              console.error(
                "Error eliminando visita sincronizada:",
                error,
              ),
          );
        }
      };

    window.addEventListener(
      OFFLINE_SYNC_EVENTS.ITEM_SUCCESS,
      handleSyncSuccess,
    );

    return () => {
      window.removeEventListener(
        OFFLINE_SYNC_EVENTS.ITEM_SUCCESS,
        handleSyncSuccess,
      );
    };
  }, [
    id,
    visitSessionKey,
  ]);

  useEffect(
    () => () => {
      previewUrlsRef.current.forEach(
        (url) =>
          URL.revokeObjectURL(
            url,
          ),
      );

      previewUrlsRef.current.clear();
    },
    [],
  );

  const fetchMasterData =
    useCallback(async () => {
      try {
        setMasterLoading(true);
        setMasterError(null);

        const [
          brandsResponse,
          productsResponse,
        ] =
          await Promise.all([
            api.get(
              "/routes/brands",
            ),
            api.get(
              "/routes/products",
            ),
          ]);

        const brandRows =
          extractRows(
            brandsResponse,
          );

        const productRows =
          extractRows(
            productsResponse,
          );

        setBrands(
          brandRows,
        );

        setProducts(
          productRows,
        );

        localStorage.setItem(
          "cultivapp_brands_cache",
          JSON.stringify(
            brandRows,
          ),
        );

        localStorage.setItem(
          "cultivapp_products_cache",
          JSON.stringify(
            productRows,
          ),
        );
      } catch (error) {
        console.error(
          "Error al cargar maestros:",
          error,
        );

        try {
          const cachedBrands =
            JSON.parse(
              localStorage.getItem(
                "cultivapp_brands_cache",
              ) || "[]",
            );

          const cachedProducts =
            JSON.parse(
              localStorage.getItem(
                "cultivapp_products_cache",
              ) || "[]",
            );

          if (
            Array.isArray(
              cachedBrands,
            ) &&
            Array.isArray(
              cachedProducts,
            ) &&
            (
              cachedBrands.length >
                0 ||
              cachedProducts.length >
                0
            )
          ) {
            setBrands(
              cachedBrands,
            );

            setProducts(
              cachedProducts,
            );

            setMasterError(
              null,
            );

            toast(
              "Se utilizó el catálogo guardado en el dispositivo.",
              {
                icon: "📦",
              },
            );
          } else {
            setMasterError(
              error?.response?.data
                ?.message ??
                error?.data
                  ?.message ??
                "No fue posible cargar marcas y productos.",
            );
          }
        } catch {
          setMasterError(
            "No fue posible cargar marcas y productos.",
          );
        }
      } finally {
        setMasterLoading(false);
      }
    }, []);

  useEffect(() => {
    fetchMasterData();
  }, [fetchMasterData]);

  useEffect(() => {
    if (!selectedBrand) {
      setFilteredProducts(
        [],
      );
      setSelectedProduct(
        "",
      );
      return;
    }

    const filtered =
      allProducts.filter(
        (product) =>
          String(
            product.brand_id,
          ) ===
          String(
            selectedBrand,
          ),
      );

    setFilteredProducts(
      filtered,
    );

    setSelectedProduct(
      "",
    );
  }, [
    selectedBrand,
    allProducts,
  ]);

  useEffect(() => {
    if (
      step === 2 &&
      !productStartTime
    ) {
      setProductStartTime(
        new Date().toISOString(),
      );
    }
  }, [
    step,
    productStartTime,
  ]);

  const loadQuestions =
    useCallback(async () => {
      try {
        setQuestionsLoading(
          true,
        );

        setQuestionsError(
          null,
        );

        const response =
          await api.get(
            "/questions?flow=reponedor",
          );

        const rows =
          extractRows(response);

        setQuestions(rows);

        localStorage.setItem(
          "cultivapp_questions_cache",
          JSON.stringify(rows),
        );
      } catch (error) {
        console.error(
          "Error al cargar preguntas:",
          error,
        );

        try {
          const cached =
            localStorage.getItem(
              "cultivapp_questions_cache",
            );

          const parsed =
            cached
              ? JSON.parse(
                  cached,
                )
              : [];

          if (
            Array.isArray(
              parsed,
            ) &&
            parsed.length > 0
          ) {
            setQuestions(parsed);
            toast(
              "Se utilizó la encuesta guardada en el dispositivo.",
              {
                icon: "📋",
              },
            );
          } else {
            setQuestions([]);
            setQuestionsError(
              "La encuesta no está disponible en este momento.",
            );
          }
        } catch {
          setQuestions([]);
          setQuestionsError(
            "La encuesta no está disponible en este momento.",
          );
        }
      } finally {
        setQuestionsLoading(
          false,
        );
      }
    }, []);

  useEffect(() => {
    if (
      step === 4 &&
      questions.length === 0
    ) {
      loadQuestions();
    }
  }, [
    step,
    questions.length,
    loadQuestions,
  ]);

  useEffect(() => {
    if (
      isOnline &&
      questions.length === 0
    ) {
      loadQuestions();
    }
  }, [
    isOnline,
    questions.length,
    loadQuestions,
  ]);

  const getEvidenceLabel = (
    stepKey,
  ) => {
    if (stepKey === 1) {
      return "Inicio_Jornada";
    }

    if (stepKey === 7) {
      return "Salida_Jornada";
    }

    if (stepKey === 2) {
      return `gondola_inicio_producto_${
        selectedProduct ||
        "sin_prod"
      }`;
    }

    if (stepKey === 5) {
      return `gondola_fin_producto_${
        selectedProduct ||
        "sin_prod"
      }`;
    }

    return (
      STEP_INFO[stepKey]
        ?.key ||
      "evidencia"
    );
  };

  const uploadPhoto =
    useCallback(
      async (
        stepKey,
        file,
        {
          showToast = true,
        } = {},
      ) => {
        if (!file) {
          return false;
        }

        const photoType =
          getEvidenceLabel(
            stepKey,
          );

        const buildFormData =
          () => {
            const formData =
              new FormData();

            formData.append(
              "photo_type",
              photoType,
            );

            formData.append(
              "foto",
              file,
            );

            return formData;
          };

        const queuePhoto =
          async () => {
            try {
              const queued =
                await OfflineManager.save(
                  `/routes/${id}/photo`,
                  "POST",
                  buildFormData(),
                  {
                    metadata: {
                      stepKey,
                      photoType,
                    },
                  },
                );

              setPhotoQueueIds(
                (current) => ({
                  ...current,
                  [stepKey]:
                    queued.id,
                }),
              );

              setPhotoSync(
                (current) => ({
                  ...current,
                  [stepKey]:
                    PHOTO_STATUS.QUEUED,
                }),
              );

              if (showToast) {
                toast.success(
                  "Fotografía guardada en el dispositivo.",
                );
              }

              return true;
            } catch (error) {
              console.error(
                "Error guardando fotografía offline:",
                error,
              );

              setPhotoSync(
                (current) => ({
                  ...current,
                  [stepKey]:
                    PHOTO_STATUS.ERROR,
                }),
              );

              if (showToast) {
                toast.error(
                  error?.message ||
                    "No fue posible guardar la fotografía en el dispositivo.",
                );
              }

              return false;
            }
          };

        const hasPendingRouteOperations =
          await OfflineManager.hasPendingForRoute(
            id,
          );

        if (
          !navigator.onLine ||
          hasPendingRouteOperations
        ) {
          return queuePhoto();
        }

        setPhotoSync(
          (current) => ({
            ...current,
            [stepKey]:
              PHOTO_STATUS.UPLOADING,
          }),
        );

        const toastId =
          showToast
            ? toast.loading(
                "Sincronizando foto...",
              )
            : null;

        try {
          const response =
            await api.post(
              `/routes/${id}/photo`,
              buildFormData(),
            );

          const uploadedUrl =
            extractUploadedUrl(
              response,
            );

          if (uploadedUrl) {
            setPhotoServerUrls(
              (current) => ({
                ...current,
                [stepKey]:
                  uploadedUrl,
              }),
            );
          }

          const queuedId =
            photoQueueIds[
              stepKey
            ];

          if (queuedId) {
            await OfflineManager.remove(
              queuedId,
            );

            setPhotoQueueIds(
              (current) => {
                const next = {
                  ...current,
                };

                delete next[
                  stepKey
                ];

                return next;
              },
            );
          }

          setPhotoSync(
            (current) => ({
              ...current,
              [stepKey]:
                PHOTO_STATUS.SUCCESS,
            }),
          );

          if (
            toastId !== null
          ) {
            toast.success(
              "Foto sincronizada",
              {
                id: toastId,
                duration: 1800,
              },
            );
          }

          return true;
        } catch (error) {
          console.error(
            "Error sincronizando foto:",
            error,
          );

          if (
            isNetworkError(
              error,
            )
          ) {
            if (
              toastId !== null
            ) {
              toast.dismiss(
                toastId,
              );
            }

            return queuePhoto();
          }

          setPhotoSync(
            (current) => ({
              ...current,
              [stepKey]:
                PHOTO_STATUS.ERROR,
            }),
          );

          if (
            toastId !== null
          ) {
            toast.error(
              error?.response?.data
                ?.message ??
                error?.data
                  ?.message ??
                "No fue posible sincronizar la foto.",
              {
                id: toastId,
              },
            );
          }

          return false;
        }
      },
      [
        id,
        selectedProduct,
        photoQueueIds,
      ],
    );

  const setPhotoByStep = (
    stepKey,
    previewUrl,
  ) => {
    if (stepKey === 1) {
      setFachadaPhoto(
        previewUrl,
      );
    } else if (
      stepKey === 2
    ) {
      setGondolaInicialPhoto(
        previewUrl,
      );
    } else if (
      stepKey === 5
    ) {
      setGondolaTerminoPhoto(
        previewUrl,
      );
    } else if (
      stepKey === 7
    ) {
      setExitPhoto(
        previewUrl,
      );
    }
  };

  const handleCapture =
    async (event) => {
      const file =
        event.target.files?.[0];

      if (!file) {
        return;
      }

      const stepKey =
        captureStepRef.current;

      try {
        setCapturing(true);

        setImageErrors(
          (current) => ({
            ...current,
            [stepKey]: false,
          }),
        );

        let processedFile;

        try {
          processedFile =
            await compressImage(
              file,
            );
        } catch (
          compressionError
        ) {
          console.warn(
            "Se utilizará la imagen original:",
            compressionError,
          );

          processedFile =
            file;
        }

        const previewUrl =
          URL.createObjectURL(
            processedFile,
          );

        previewUrlsRef.current.add(
          previewUrl,
        );

        setPhotoByStep(
          stepKey,
          previewUrl,
        );

        setPhotoFiles(
          (current) => ({
            ...current,
            [stepKey]:
              processedFile,
          }),
        );

        setCapturing(false);

        const photoReady =
          await uploadPhoto(
            stepKey,
            processedFile,
          );

        if (
          stepKey === 1 &&
          photoReady
        ) {
          setStep(2);
        }
      } catch (error) {
        console.error(
          "Error procesando imagen:",
          error,
        );

        toast.error(
          error?.message ||
            "No fue posible procesar la imagen.",
        );

        setCapturing(false);
      } finally {
        event.target.value =
          "";
      }
    };

  const removePhoto = (
    photoUrl,
    stepKey,
    {
      cancelQueued = true,
    } = {},
  ) => {
    if (
      photoUrl?.startsWith(
        "blob:",
      )
    ) {
      URL.revokeObjectURL(
        photoUrl,
      );

      previewUrlsRef.current.delete(
        photoUrl,
      );
    }

    const queuedId =
      photoQueueIds[
        stepKey
      ];

    if (
      cancelQueued &&
      queuedId
    ) {
      OfflineManager.remove(
        queuedId,
      ).catch(
        (error) =>
          console.error(
            "Error eliminando fotografía de la cola:",
            error,
          ),
      );
    }

    setPhotoQueueIds(
      (current) => {
        const next = {
          ...current,
        };

        delete next[
          stepKey
        ];

        return next;
      },
    );

    setPhotoByStep(
      stepKey,
      null,
    );

    setPhotoFiles(
      (current) => {
        const next = {
          ...current,
        };

        delete next[stepKey];

        return next;
      },
    );

    setPhotoServerUrls(
      (current) => {
        const next = {
          ...current,
        };

        delete next[stepKey];

        return next;
      },
    );

    setPhotoSync(
      (current) => ({
        ...current,
        [stepKey]:
          PHOTO_STATUS.IDLE,
      }),
    );

    setImageErrors(
      (current) => ({
        ...current,
        [stepKey]: false,
      }),
    );
  };

  const openCamera = (
    stepKey,
  ) => {
    if (capturing) {
      return;
    }

    captureStepRef.current =
      stepKey;

    fileInputRef.current?.click();
  };

  const retryPhotoUpload =
    async (stepKey) => {
      const file =
        photoFiles[stepKey];

      if (!file) {
        toast.error(
          "Debes volver a capturar la fotografía.",
        );
        return;
      }

      await uploadPhoto(
        stepKey,
        file,
      );
    };

  const handleScanSuccess =
    async (decodedText) => {
      const cleanCode =
        String(
          decodedText || "",
        ).trim();

      if (
        !cleanCode ||
        isProcessingScan.current
      ) {
        return;
      }

      isProcessingScan.current =
        true;

      const saveQueuedScan =
        async () => {
          const queued =
            await OfflineManager.save(
              `/routes/${id}/scans`,
              "POST",
              {
                barcode:
                  cleanCode,
              },
              {
                metadata: {
                  barcode:
                    cleanCode,
                },
              },
            );

          setScanQueueItems(
            (current) => [
              ...current,
              {
                code:
                  cleanCode,
                queueId:
                  queued.id,
              },
            ],
          );

          setScannedCodes(
            (current) => [
              cleanCode,
              ...current,
            ],
          );

          toast.success(
            "EAN guardado para sincronización.",
            {
              duration: 1100,
              position:
                "bottom-center",
            },
          );
        };

      try {
        const hasPendingRouteOperations =
          await OfflineManager.hasPendingForRoute(
            id,
          );

        if (
          !navigator.onLine ||
          hasPendingRouteOperations
        ) {
          await saveQueuedScan();
          return;
        }

        try {
          await api.post(
            `/routes/${id}/scans`,
            {
              barcode:
                cleanCode,
            },
          );

          setScannedCodes(
            (current) => [
              cleanCode,
              ...current,
            ],
          );

          toast.success(
            "EAN registrado",
            {
              duration: 900,
              position:
                "bottom-center",
            },
          );
        } catch (error) {
          if (
            isNetworkError(
              error,
            )
          ) {
            await saveQueuedScan();
            return;
          }

          throw error;
        }
      } catch (error) {
        toast.error(
          error?.response?.data
            ?.message ??
            error?.data?.message ??
            error?.message ??
            "No fue posible registrar el código.",
          {
            position:
              "bottom-center",
          },
        );
      } finally {
        window.setTimeout(
          () => {
            isProcessingScan.current =
              false;
          },
          650,
        );
      }
    };

  const removeOneCode = (
    code,
  ) => {
    setScannedCodes(
      (current) => {
        const index =
          current.findIndex(
            (item) =>
              item === code,
          );

        if (index < 0) {
          return current;
        }

        const next = [
          ...current,
        ];

        next.splice(
          index,
          1,
        );

        return next;
      },
    );

    setScanQueueItems(
      (current) => {
        const index =
          [...current]
            .reverse()
            .findIndex(
              (item) =>
                item.code ===
                code,
            );

        if (index < 0) {
          return current;
        }

        const realIndex =
          current.length -
          1 -
          index;

        const queuedItem =
          current[
            realIndex
          ];

        OfflineManager.remove(
          queuedItem.queueId,
        ).catch(
          (error) =>
            console.error(
              "Error eliminando escaneo de la cola:",
              error,
            ),
        );

        return current.filter(
          (
            _,
            itemIndex,
          ) =>
            itemIndex !==
            realIndex,
        );
      },
    );
  };

  const handleContinueFromScan =
    () => {
      if (
        !canContinueFromScan
      ) {
        toast.error(
          "Debes escanear al menos un código antes de continuar.",
        );
        return;
      }

      setStep(4);
    };

  const handleContinueFromSurvey =
    () => {
      if (
        questions.length === 0
      ) {
        toast.error(
          "La encuesta aún no está disponible.",
        );
        return;
      }

      if (
        !areRequiredQuestionsComplete
      ) {
        toast.error(
          `Debes responder todas las preguntas obligatorias (${answeredRequiredCount}/${requiredQuestions.length}).`,
        );
        return;
      }

      if (
        !isSurveyComplete
      ) {
        toast.error(
          `Debes completar toda la encuesta (${answeredQuestionsCount}/${questions.length}).`,
        );
        return;
      }

      setStep(5);
    };

  const resetProductFlow =
    ({
      preserveQueuedOperations =
        false,
    } = {}) => {
      setScannedCodes([]);
      setAnswers({});
      setComment("");

      removePhoto(
        gondolaInicialPhoto,
        2,
        {
          cancelQueued:
            !preserveQueuedOperations,
        },
      );

      removePhoto(
        gondolaTerminoPhoto,
        5,
        {
          cancelQueued:
            !preserveQueuedOperations,
        },
      );

      if (
        !preserveQueuedOperations
      ) {
        scanQueueItems.forEach(
          (item) => {
            OfflineManager.remove(
              item.queueId,
            ).catch(
              (error) =>
                console.error(
                  "Error eliminando escaneo pendiente:",
                  error,
                ),
            );
          },
        );
      }

      setScanQueueItems([]);

      setProductStartTime(
        null,
      );

      setSelectedBrand(
        "",
      );

      setSelectedProduct(
        "",
      );

      isProcessingScan.current =
        false;
    };

  const registrarGestionProducto =
    async (nextAction) => {
      if (
        scannedCodes.length === 0
      ) {
        toast.error(
          "Debes escanear al menos un código.",
        );
        setStep(3);
        return;
      }

      if (
        !selectedProduct
      ) {
        toast.error(
          "Debes seleccionar un producto.",
        );
        setStep(2);
        return;
      }

      const missingRequired =
        requiredQuestions.some(
          (question) =>
            !hasValidAnswer(
              answers[
                question.id
              ],
            ),
        );

      if (missingRequired) {
        toast.error(
          "Responde todas las preguntas obligatorias.",
        );
        setStep(4);
        return;
      }

      if (
        !isSurveyComplete
      ) {
        toast.error(
          "Completa toda la encuesta antes de continuar.",
        );
        setStep(4);
        return;
      }

      if (
        !gondolaInicialPhoto
      ) {
        toast.error(
          "Debes registrar la foto inicial de la góndola.",
        );
        setStep(2);
        return;
      }

      if (
        !gondolaTerminoPhoto
      ) {
        toast.error(
          "Debes registrar la foto final de la góndola.",
        );
        setStep(5);
        return;
      }

      if (
        !productPhotosReady
      ) {
        toast.error(
          "Las fotografías deben estar sincronizadas o guardadas en el dispositivo.",
        );
        return;
      }

      setLoading(true);

      const toastId =
        toast.loading(
          navigator.onLine
            ? "Registrando gestión..."
            : "Guardando gestión localmente...",
        );

      const taskData = {
        product_id:
          selectedProduct,
        product_codes:
          scannedCodes,
        start_time:
          productStartTime,
        end_time:
          new Date().toISOString(),
        responses: answers,
        comment,
        photo_before:
          photoServerUrls[2] ||
          null,
        photo_after:
          photoServerUrls[5] ||
          null,
      };

      const completeLocalFlow =
        (
          pendingSync,
        ) => {
          resetProductFlow({
            preserveQueuedOperations:
              pendingSync,
          });

          if (
            nextAction ===
            "NUEVO"
          ) {
            setStep(2);
          } else {
            setStep(7);
          }
        };

      const queueTask =
        async () => {
          await OfflineManager.save(
            `/routes/${id}/task`,
            "POST",
            taskData,
            {
              metadata: {
                productId:
                  selectedProduct,
              },
            },
          );

          toast.success(
            "Gestión guardada para sincronización.",
            {
              id: toastId,
            },
          );

          completeLocalFlow(
            true,
          );
        };

      try {
        const hasPendingRouteOperations =
          await OfflineManager.hasPendingForRoute(
            id,
          );

        if (
          !navigator.onLine ||
          hasPendingRouteOperations
        ) {
          await queueTask();
          return;
        }

        try {
          await api.post(
            `/routes/${id}/task`,
            taskData,
          );

          toast.success(
            "Producto registrado",
            {
              id: toastId,
            },
          );

          completeLocalFlow(
            false,
          );
        } catch (error) {
          if (
            isNetworkError(
              error,
            )
          ) {
            await queueTask();
            return;
          }

          throw error;
        }
      } catch (error) {
        toast.error(
          error?.response?.data
            ?.message ??
            error?.data?.message ??
            error?.message ??
            "No fue posible registrar la gestión.",
          {
            id: toastId,
          },
        );
      } finally {
        setLoading(false);
      }
    };

  const handleStartVisit =
    async () => {
      if (
        gpsStatus ===
          GPS_STATUS.LOCATING ||
        gpsStatus ===
          GPS_STATUS.CHECKING
      ) {
        return;
      }

      if (!navigator.onLine) {
        const message =
          "Necesitas conexión para validar tu ubicación e iniciar la visita.";

        setGpsStatus(
          GPS_STATUS.ERROR,
        );
        setGpsMessage(message);
        toast.error(message);
        return;
      }

      setGpsStatus(
        GPS_STATUS.LOCATING,
      );
      setGpsMessage("");
      setGpsDistance(null);

      try {
        const position =
          await getCurrentGpsPosition();

        const latitude =
          Number(
            position.coords
              .latitude,
          );

        const longitude =
          Number(
            position.coords
              .longitude,
          );

        if (
          !Number.isFinite(
            latitude,
          ) ||
          !Number.isFinite(
            longitude,
          )
        ) {
          throw new Error(
            "El dispositivo entregó coordenadas GPS inválidas.",
          );
        }

        setGpsStatus(
          GPS_STATUS.CHECKING,
        );

        const response =
          await api.post(
            `/routes/${id}/check-in`,
            {
              lat_in:
                latitude,
              lng_in:
                longitude,
            },
          );

        const payload =
          getApiPayload(
            response,
          );

        const visitData =
          payload?.data ??
          null;

        const rawDistance =
          payload?.distance ??
          visitData
            ?.distance_meters ??
          null;

        const distance =
          Number(
            rawDistance,
          );

        const isValid =
          payload?.isValid ===
            true ||
          (
            payload?.success ===
              true &&
            visitData
              ?.is_valid_gps ===
              true
          );

        if (!isValid) {
          const message =
            payload?.message ||
            `Debes estar a un máximo de ${MAX_CHECK_IN_DISTANCE_METERS} metros del local para iniciar la visita.`;

          setGpsDistance(
            Number.isFinite(
              distance,
            )
              ? distance
              : null,
          );

          setGpsStatus(
            GPS_STATUS.ERROR,
          );

          setGpsMessage(
            message,
          );

          toast.error(message);
          return;
        }

        sessionStorage.setItem(
          visitSessionKey,
          "true",
        );

        setGpsDistance(
          Number.isFinite(
            distance,
          )
            ? distance
            : null,
        );

        setGpsStatus(
          GPS_STATUS.SUCCESS,
        );

        setGpsMessage(
          "Ubicación validada. Puedes comenzar la visita.",
        );

        setVisitStarted(true);

        toast.success(
          "Ubicación validada. Visita iniciada.",
        );
      } catch (error) {
        const backendData =
          error?.response
            ?.data ??
          error?.data ??
          null;

        const rawDistance =
          backendData
            ?.distance ??
          backendData?.data
            ?.distance_meters ??
          null;

        const distance =
          Number(
            rawDistance,
          );

        const message =
          getGpsErrorMessage(
            error,
          );

        setGpsDistance(
          Number.isFinite(
            distance,
          )
            ? distance
            : null,
        );

        setGpsStatus(
          GPS_STATUS.ERROR,
        );

        setGpsMessage(
          message,
        );

        setVisitStarted(false);

        toast.error(message);
      }
    };

  const finalizarVisitaTotal =
    async () => {
      if (!exitPhoto) {
        toast.error(
          "Debes registrar la fotografía de salida.",
        );
        return;
      }

      if (
        !exitPhotoReady
      ) {
        toast.error(
          "La fotografía de salida debe estar sincronizada o guardada en el dispositivo.",
        );
        return;
      }

      setLoading(true);

      const toastId =
        toast.loading(
          navigator.onLine
            ? "Finalizando visita..."
            : "Guardando cierre localmente...",
        );

      const finishData = {
        status:
          "completed",
        comment,
        exit_photo:
          photoServerUrls[7] ||
          null,
      };

      const queueFinish =
        async () => {
          await OfflineManager.save(
            `/routes/${id}/finish`,
            "POST",
            finishData,
            {
              metadata: {
                finalStep: true,
              },
            },
          );

          setVisitPendingSync(
            true,
          );

          setStep(8);

          toast.success(
            "Visita guardada. Se sincronizará al recuperar conexión.",
            {
              id: toastId,
            },
          );
        };

      try {
        const hasPendingRouteOperations =
          await OfflineManager.hasPendingForRoute(
            id,
          );

        if (
          !navigator.onLine ||
          hasPendingRouteOperations
        ) {
          await queueFinish();
          return;
        }

        try {
          await api.post(
            `/routes/${id}/finish`,
            finishData,
          );

          toast.success(
            "Visita finalizada",
            {
              id: toastId,
            },
          );

          sessionStorage.removeItem(
            visitSessionKey,
          );

          await removeVisitDraft(
            id,
          );

          setVisitPendingSync(
            false,
          );

          setStep(8);
        } catch (error) {
          if (
            isNetworkError(
              error,
            )
          ) {
            await queueFinish();
            return;
          }

          throw error;
        }
      } catch (error) {
        toast.error(
          error?.response?.data
            ?.message ??
            error?.data?.message ??
            error?.message ??
            "No fue posible cerrar la visita.",
          {
            id: toastId,
          },
        );
      } finally {
        setLoading(false);
      }
    };

  const handleExitFlow = () => {
    const shouldExit =
      window.confirm(
        "¿Deseas salir del flujo de visita? Los datos que aún no hayan sido enviados podrían perderse.",
      );

    if (shouldExit) {
      navigate(
        "/usuario/home",
      );
    }
  };

  const renderSyncState = (
    stepKey,
  ) => {
    const status =
      photoSync[stepKey] ||
      PHOTO_STATUS.IDLE;

    if (
      status ===
      PHOTO_STATUS.UPLOADING
    ) {
      return (
        <span className="inline-flex items-center gap-1.5 rounded-lg bg-blue-50 px-2.5 py-1 text-[7px] font-black uppercase tracking-wider text-blue-600">
          <FiLoader
            size={10}
            className="animate-spin"
          />
          Sincronizando
        </span>
      );
    }

    if (
      status ===
      PHOTO_STATUS.SUCCESS
    ) {
      return (
        <span className="inline-flex items-center gap-1.5 rounded-lg bg-[#87be00]/10 px-2.5 py-1 text-[7px] font-black uppercase tracking-wider text-[#87be00]">
          <FiCheck
            size={10}
          />
          Sincronizada
        </span>
      );
    }

    if (
      status ===
      PHOTO_STATUS.QUEUED
    ) {
      return (
        <span className="inline-flex items-center gap-1.5 rounded-lg bg-amber-50 px-2.5 py-1 text-[7px] font-black uppercase tracking-wider text-amber-700">
          <FiCheck
            size={10}
          />
          Guardada localmente
        </span>
      );
    }

    if (
      status ===
      PHOTO_STATUS.PENDING
    ) {
      return (
        <span className="inline-flex items-center gap-1.5 rounded-lg bg-amber-50 px-2.5 py-1 text-[7px] font-black uppercase tracking-wider text-amber-600">
          <FiWifiOff
            size={10}
          />
          Pendiente
        </span>
      );
    }

    if (
      status ===
      PHOTO_STATUS.ERROR
    ) {
      return (
        <span className="inline-flex items-center gap-1.5 rounded-lg bg-red-50 px-2.5 py-1 text-[7px] font-black uppercase tracking-wider text-red-600">
          <FiAlertCircle
            size={10}
          />
          Error
        </span>
      );
    }

    return null;
  };

  const renderPhotoContainer = (
    photoUrl,
    stepKey,
  ) => {
    const hasImageError =
      Boolean(
        imageErrors[stepKey],
      );

    const syncStatus =
      photoSync[stepKey] ||
      PHOTO_STATUS.IDLE;

    if (
      photoUrl &&
      !hasImageError
    ) {
      return (
        <div className="space-y-3">
          <div className="group relative aspect-[4/5] w-full overflow-hidden rounded-[2rem] border border-slate-200 bg-slate-100 shadow-sm">
            <img
              src={formatImageUrl(
                photoUrl,
              )}
              alt="Evidencia de visita"
              className="h-full w-full object-cover"
              onError={() =>
                setImageErrors(
                  (current) => ({
                    ...current,
                    [stepKey]: true,
                  }),
                )
              }
            />

            <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-3 bg-gradient-to-t from-slate-950/80 via-slate-950/35 to-transparent p-4 pt-12">
              {renderSyncState(
                stepKey,
              )}

              <button
                type="button"
                onClick={() =>
                  removePhoto(
                    photoUrl,
                    stepKey,
                  )
                }
                aria-label="Eliminar fotografía"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-500 text-white shadow-lg transition hover:bg-red-600 active:scale-95"
              >
                <FiTrash2
                  size={15}
                />
              </button>
            </div>
          </div>

          {[
            PHOTO_STATUS.ERROR,
            PHOTO_STATUS.PENDING,
          ].includes(
            syncStatus,
          ) && (
            <button
              type="button"
              onClick={() =>
                retryPhotoUpload(
                  stepKey,
                )
              }
              disabled={
                !isOnline ||
                syncStatus ===
                  PHOTO_STATUS.UPLOADING
              }
              className={secondaryButtonClass}
            >
              <FiRefreshCw
                size={15}
              />
              Reintentar sincronización
            </button>
          )}
        </div>
      );
    }

    if (hasImageError) {
      return (
        <div className="flex aspect-[4/5] w-full flex-col items-center justify-center rounded-[2rem] border-2 border-dashed border-red-200 bg-red-50 p-6 text-center">
          <FiAlertCircle
            size={36}
            className="text-red-400"
          />

          <p className="mt-4 text-[9px] font-black uppercase tracking-wider text-red-600">
            Error al mostrar la imagen
          </p>

          <button
            type="button"
            onClick={() =>
              setImageErrors(
                (current) => ({
                  ...current,
                  [stepKey]: false,
                }),
              )
            }
            className="mt-4 rounded-xl bg-red-600 px-4 py-3 text-[8px] font-black uppercase tracking-wider text-white"
          >
            Reintentar
          </button>
        </div>
      );
    }

    return (
      <button
        type="button"
        onClick={() =>
          openCamera(stepKey)
        }
        disabled={capturing}
        className="group flex aspect-[4/5] w-full flex-col items-center justify-center rounded-[2rem] border-2 border-dashed border-slate-200 bg-slate-50 p-6 text-center transition hover:border-[#87be00]/40 hover:bg-[#87be00]/5 active:scale-[0.99] disabled:cursor-wait"
      >
        {capturing &&
        captureStepRef.current ===
          stepKey ? (
          <>
            <FiLoader
              className="animate-spin text-[#87be00]"
              size={40}
            />

            <span className="mt-4 text-[9px] font-black uppercase tracking-wider text-slate-400">
              Procesando imagen
            </span>
          </>
        ) : (
          <>
            <span className="flex h-20 w-20 items-center justify-center rounded-[1.75rem] bg-white text-[#87be00] shadow-sm transition group-hover:scale-105">
              <FiCamera
                size={34}
              />
            </span>

            <span className="mt-5 text-[10px] font-black uppercase tracking-[0.18em] text-slate-600">
              Capturar fotografía
            </span>

            <span className="mt-2 max-w-[240px] text-xs text-slate-400">
              Usa la cámara trasera y procura que la evidencia se vea completa.
            </span>
          </>
        )}
      </button>
    );
  };

  const pendingPhotoCount =
    Object.values(
      photoSync,
    ).filter(
      (status) =>
        status ===
          PHOTO_STATUS.QUEUED ||
        status ===
          PHOTO_STATUS.PENDING ||
        status ===
          PHOTO_STATUS.ERROR,
    ).length;

  const formattedOfflineTime =
    offlineDetectedAt
      ? offlineDetectedAt.toLocaleTimeString(
          "es-CL",
          {
            hour: "2-digit",
            minute: "2-digit",
          },
        )
      : null;

  const handleConnectionRetry =
    () => {
      const connectionAvailable =
        navigator.onLine;

      setIsOnline(
        connectionAvailable,
      );

      if (connectionAvailable) {
        previousOnlineStateRef.current =
          true;

        setShowOfflineModal(
          false,
        );

        setOfflineDetectedAt(
          null,
        );

        toast.success(
          "Conexión disponible.",
        );

        return;
      }

      toast.error(
        "La conexión todavía no está disponible.",
      );
    };

  const renderOfflineModal =
    () => {
      if (
        !showOfflineModal ||
        isOnline
      ) {
        return null;
      }

      return (
        <div
          className="fixed inset-0 z-[20000] flex items-end justify-center bg-slate-950/70 px-3 pb-[max(12px,env(safe-area-inset-bottom))] pt-20 backdrop-blur-sm sm:items-center sm:p-5"
          role="dialog"
          aria-modal="true"
          aria-labelledby="offline-modal-title"
        >
          <div className="flex max-h-[calc(100dvh-5rem)] w-full max-w-md flex-col overflow-hidden rounded-t-[2rem] border border-white/10 bg-white shadow-2xl sm:max-h-[calc(100dvh-2.5rem)] sm:rounded-[2rem]">
            <div className="shrink-0 bg-white pb-2 pt-3 sm:hidden">
              <div className="mx-auto h-1.5 w-12 rounded-full bg-slate-300" />
            </div>

            <div className="relative shrink-0 overflow-hidden bg-slate-950 px-5 pb-5 pt-5 text-white sm:pt-6">
              <div className="absolute -right-12 -top-14 h-36 w-36 rounded-full bg-amber-400/15 blur-2xl" />

              <button
                type="button"
                onClick={() =>
                  setShowOfflineModal(
                    false,
                  )
                }
                aria-label="Cerrar aviso sin conexión"
                className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-2xl bg-white/10 text-white transition hover:bg-white/20"
              >
                <FiX
                  size={17}
                />
              </button>

              <div className="relative flex items-start gap-4 pr-12">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[1.1rem] bg-amber-400 text-slate-950 shadow-lg shadow-amber-400/20 sm:h-14 sm:w-14">
                  <FiWifiOff
                    size={23}
                  />
                </div>

                <div className="min-w-0">
                  <p className="text-[8px] font-black uppercase tracking-[0.22em] text-amber-300">
                    Estado de conexión
                  </p>

                  <h2
                    id="offline-modal-title"
                    className="mt-1 text-lg font-black tracking-tight sm:text-xl"
                  >
                    Estás trabajando sin conexión
                  </h2>

                  <p className="mt-2 text-xs leading-relaxed text-slate-300">
                    El avance se guardará en este dispositivo y se enviará cuando vuelva internet.
                  </p>
                </div>
              </div>

              <div className="relative mt-4 flex flex-wrap gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-xl bg-white/10 px-3 py-2 text-[8px] font-black uppercase tracking-wider text-white">
                  <FiClock
                    size={12}
                  />
                  {formattedOfflineTime
                    ? `Desde ${formattedOfflineTime}`
                    : "Sin conexión"}
                </span>

                {pendingPhotoCount >
                  0 && (
                  <span className="inline-flex items-center gap-1.5 rounded-xl bg-amber-400/15 px-3 py-2 text-[8px] font-black uppercase tracking-wider text-amber-200">
                    <FiCamera
                      size={12}
                    />
                    {pendingPhotoCount} pendiente
                    {pendingPhotoCount ===
                    1
                      ? ""
                      : "s"}
                  </span>
                )}
              </div>
            </div>

            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain p-4 sm:p-5">
              {!visitStarted ? (
                <div className="rounded-2xl border border-red-100 bg-red-50 p-4">
                  <div className="flex items-start gap-3">
                    <FiMapPin
                      className="mt-0.5 shrink-0 text-red-500"
                      size={17}
                    />

                    <div>
                      <p className="text-[8px] font-black uppercase tracking-wider text-red-600">
                        Inicio bloqueado
                      </p>

                      <p className="mt-1 text-xs leading-relaxed text-red-700">
                        El check-in necesita conexión para validar el GPS y la distancia máxima de 300 metros.
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl border border-[#87be00]/20 bg-[#87be00]/10 p-4">
                  <div className="flex items-start gap-3">
                    <FiCheckCircle
                      className="mt-0.5 shrink-0 text-[#6e9e00]"
                      size={17}
                    />

                    <div>
                      <p className="text-[8px] font-black uppercase tracking-wider text-[#6e9e00]">
                        Flujo offline habilitado
                      </p>

                      <p className="mt-1 text-xs leading-relaxed text-slate-700">
                        Puedes tomar fotos, escanear códigos, responder la encuesta, registrar productos y completar la visita.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                {[
                  {
                    icon: FiCamera,
                    title:
                      "Fotografías",
                    text:
                      "Se guardan en IndexedDB hasta ser sincronizadas.",
                  },
                  {
                    icon: FiPackage,
                    title:
                      "Escaneos y productos",
                    text:
                      "Quedan en cola respetando el orden del flujo.",
                  },
                  {
                    icon: FiSend,
                    title:
                      "Cierre de visita",
                    text:
                      "Puede completarse localmente y quedará pendiente de envío.",
                  },
                ].map(
                  ({
                    icon: ItemIcon,
                    title,
                    text,
                  }) => (
                    <div
                      key={title}
                      className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3"
                    >
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#87be00]/10 text-[#87be00]">
                        <ItemIcon
                          size={15}
                        />
                      </span>

                      <div className="min-w-0">
                        <p className="text-[9px] font-black text-slate-700">
                          {title}
                        </p>

                        <p className="mt-0.5 text-[8px] leading-relaxed text-slate-500">
                          {text}
                        </p>
                      </div>
                    </div>
                  ),
                )}
              </div>

              <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4">
                <p className="text-[8px] font-black uppercase tracking-wider text-blue-600">
                  Recomendación
                </p>

                <p className="mt-1 text-xs leading-relaxed text-blue-700">
                  Mantén la sesión iniciada. El avance se recuperará incluso si la pantalla se recarga.
                </p>
              </div>
            </div>

            <div className="grid shrink-0 grid-cols-1 gap-2 border-t border-slate-100 bg-white p-4 sm:grid-cols-2 sm:p-5">
              <button
                type="button"
                onClick={() =>
                  setShowOfflineModal(
                    false,
                  )
                }
                className={secondaryButtonClass}
              >
                <FiCheck
                  size={15}
                />
                Continuar offline
              </button>

              <button
                type="button"
                onClick={
                  handleConnectionRetry
                }
                className={primaryButtonClass}
              >
                <FiRefreshCw
                  size={15}
                />
                Verificar conexión
              </button>
            </div>
          </div>
        </div>
      );
    };

  const isGpsBusy =
    gpsStatus ===
      GPS_STATUS.LOCATING ||
    gpsStatus ===
      GPS_STATUS.CHECKING;

  if (!visitStarted) {
    return (
      <div
        className={`
          min-h-full px-4 pb-[calc(6rem+env(safe-area-inset-bottom))]
          pt-4 font-[Outfit] transition-colors
          sm:px-5 md:pb-10

          ${
            isOnline
              ? "bg-slate-50"
              : "bg-amber-50/70"
          }
        `}
      >
        {!isOnline && (
          <button
            type="button"
            onClick={() =>
              setShowOfflineModal(
                true,
              )
            }
            className="fixed inset-x-3 top-3 z-[10000] mx-auto flex min-h-11 max-w-[560px] items-center justify-center gap-2 rounded-2xl bg-amber-500 px-4 py-2 text-center text-[8px] font-black uppercase tracking-wider text-white shadow-xl shadow-amber-500/20"
          >
            <FiWifiOff
              size={13}
            />
            Sin conexión · Ver información
          </button>
        )}

        {renderOfflineModal()}

        <div className="mx-auto flex w-full max-w-[560px] flex-col gap-4">
          <header className="rounded-[2rem] border border-slate-200 bg-white/95 p-4 shadow-sm backdrop-blur-xl">
            <div className="flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() =>
                  navigate(
                    "/usuario/home",
                  )
                }
                aria-label="Volver al inicio"
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-slate-600 transition hover:bg-slate-200"
              >
                <FiArrowLeft
                  size={18}
                />
              </button>

              <div className="min-w-0 flex-1 text-center">
                <p className="text-[8px] font-black uppercase tracking-[0.2em] text-[#87be00]">
                  Inicio de visita
                </p>

                <p className="mt-1 truncate text-[10px] font-black text-slate-700">
                  Local{" "}
                  {id
                    ?.slice(0, 8)
                    .toUpperCase()}
                </p>
              </div>

              <div
                className={`
                  flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl

                  ${
                    isOnline
                      ? "bg-[#87be00]/10 text-[#87be00]"
                      : "bg-amber-100 text-amber-600"
                  }
                `}
              >
                {isOnline ? (
                  <FiWifi
                    size={18}
                  />
                ) : (
                  <FiWifiOff
                    size={18}
                  />
                )}
              </div>
            </div>
          </header>

          <main className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 p-5">
              <div className="flex items-start gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#87be00]/10 text-[#87be00]">
                  <FiMapPin
                    size={22}
                  />
                </div>

                <div className="min-w-0">
                  <p className="text-[8px] font-black uppercase tracking-[0.2em] text-[#87be00]">
                    Validación obligatoria
                  </p>

                  <h1 className="mt-1 text-xl font-black tracking-tight text-slate-900">
                    Confirma tu ubicación
                  </h1>

                  <p className="mt-2 text-sm leading-relaxed text-slate-500">
                    Para iniciar el flujo debes encontrarte dentro del radio permitido del local.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-4 p-5">
              <div className="rounded-[1.75rem] bg-slate-900 p-5 text-white">
                <div className="flex items-center gap-4">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-[#a8d52c]">
                    <FiMapPin
                      size={25}
                    />
                  </div>

                  <div>
                    <p className="text-[8px] font-black uppercase tracking-wider text-[#a8d52c]">
                      Distancia máxima
                    </p>

                    <p className="mt-1 text-3xl font-black">
                      {MAX_CHECK_IN_DISTANCE_METERS} m
                    </p>
                  </div>
                </div>

                <p className="mt-4 text-xs leading-relaxed text-slate-300">
                  El servidor comparará la ubicación del dispositivo con las coordenadas registradas para el local.
                </p>
              </div>

              {gpsDistance !== null && (
                <div
                  className={`
                    rounded-2xl border p-4

                    ${
                      gpsStatus ===
                      GPS_STATUS.ERROR
                        ? "border-red-100 bg-red-50"
                        : "border-[#87be00]/20 bg-[#87be00]/10"
                    }
                  `}
                >
                  <p
                    className={`
                      text-[8px] font-black uppercase tracking-wider

                      ${
                        gpsStatus ===
                        GPS_STATUS.ERROR
                          ? "text-red-600"
                          : "text-[#6e9e00]"
                      }
                    `}
                  >
                    Distancia detectada
                  </p>

                  <p
                    className={`
                      mt-1 text-2xl font-black

                      ${
                        gpsStatus ===
                        GPS_STATUS.ERROR
                          ? "text-red-700"
                          : "text-slate-900"
                      }
                    `}
                  >
                    {gpsDistance} metros
                  </p>
                </div>
              )}

              {gpsMessage && (
                <div
                  className={`
                    flex items-start gap-3 rounded-2xl border p-4

                    ${
                      gpsStatus ===
                      GPS_STATUS.ERROR
                        ? "border-red-100 bg-red-50"
                        : "border-blue-100 bg-blue-50"
                    }
                  `}
                >
                  <FiAlertCircle
                    className={`
                      mt-0.5 shrink-0

                      ${
                        gpsStatus ===
                        GPS_STATUS.ERROR
                          ? "text-red-500"
                          : "text-blue-500"
                      }
                    `}
                    size={17}
                  />

                  <p
                    className={`
                      text-xs leading-relaxed

                      ${
                        gpsStatus ===
                        GPS_STATUS.ERROR
                          ? "text-red-700"
                          : "text-blue-700"
                      }
                    `}
                  >
                    {gpsMessage}
                  </p>
                </div>
              )}

              <button
                type="button"
                onClick={
                  handleStartVisit
                }
                disabled={
                  isGpsBusy ||
                  !isOnline
                }
                className={primaryButtonClass}
              >
                {isGpsBusy ? (
                  <>
                    <FiLoader
                      size={16}
                      className="animate-spin"
                    />

                    {gpsStatus ===
                    GPS_STATUS.LOCATING
                      ? "Obteniendo ubicación"
                      : "Validando distancia"}
                  </>
                ) : gpsStatus ===
                  GPS_STATUS.ERROR ? (
                  <>
                    <FiRefreshCw
                      size={16}
                    />
                    Reintentar validación
                  </>
                ) : (
                  <>
                    <FiPlay
                      size={16}
                    />
                    Validar GPS e iniciar
                  </>
                )}
              </button>

              <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4">
                <p className="text-[8px] font-black uppercase tracking-wider text-blue-600">
                  Permiso de ubicación
                </p>

                <p className="mt-1 text-xs leading-relaxed text-blue-700">
                  Mantén el GPS activado y autoriza el acceso a la ubicación precisa cuando el navegador lo solicite.
                </p>
              </div>
            </div>

            <footer className="flex items-center justify-center gap-2 border-t border-slate-100 bg-slate-50 px-5 py-4 text-[7px] font-black uppercase tracking-[0.2em] text-slate-400">
              <FiMapPin
                size={11}
              />
              No podrás acceder al flujo sin validación GPS
            </footer>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`
        min-h-full px-4 pb-[calc(6rem+env(safe-area-inset-bottom))]
        pt-4 font-[Outfit] transition-colors
        sm:px-5 md:pb-10

        ${
          isOnline
            ? "bg-slate-50"
            : "bg-amber-50/70"
        }
      `}
    >
      {!isOnline && (
        <button
          type="button"
          onClick={() =>
            setShowOfflineModal(
              true,
            )
          }
          className="fixed inset-x-3 top-3 z-[10000] mx-auto flex min-h-11 max-w-[560px] items-center justify-center gap-2 rounded-2xl bg-amber-500 px-4 py-2 text-center text-[8px] font-black uppercase tracking-wider text-white shadow-xl shadow-amber-500/20"
        >
          <FiWifiOff
            size={13}
          />
          Modo offline · Ver restricciones
        </button>
      )}

      {renderOfflineModal()}

      <div className="mx-auto flex w-full max-w-[560px] flex-col gap-4">
        {/* CABECERA DEL FLUJO */}
        <header className="sticky top-0 z-30 rounded-[2rem] border border-slate-200 bg-white/95 p-4 shadow-sm backdrop-blur-xl">
          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={
                handleExitFlow
              }
              aria-label="Salir de la visita"
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-slate-600 transition hover:bg-red-50 hover:text-red-500"
            >
              <FiArrowLeft
                size={18}
              />
            </button>

            <div className="min-w-0 flex-1 text-center">
              <p className="text-[8px] font-black uppercase tracking-[0.2em] text-[#87be00]">
                Flujo de visita
              </p>

              <p className="mt-1 truncate text-[10px] font-black text-slate-700">
                Local{" "}
                {id
                  ?.slice(0, 8)
                  .toUpperCase()}
              </p>
            </div>

            <div
              className={`
                flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl

                ${
                  isOnline
                    ? "bg-[#87be00]/10 text-[#87be00]"
                    : "bg-amber-100 text-amber-600"
                }
              `}
            >
              {isOnline ? (
                <FiWifi
                  size={18}
                />
              ) : (
                <FiWifiOff
                  size={18}
                />
              )}
            </div>
          </div>

          <div className="mt-4 flex gap-1.5">
            {FLOW_STEPS.map(
              (
                flowStep,
                index,
              ) => {
                const isComplete =
                  index <
                  currentProgress;

                return (
                  <span
                    key={flowStep}
                    className={`
                      h-1.5 flex-1 rounded-full transition-all duration-500

                      ${
                        isComplete
                          ? "bg-[#87be00]"
                          : "bg-slate-200"
                      }
                    `}
                  />
                );
              },
            )}
          </div>

          <div className="mt-2 flex items-center justify-between">
            <span className="text-[7px] font-black uppercase tracking-wider text-slate-400">
              Paso{" "}
              {Math.min(
                currentProgress,
                FLOW_STEPS.length,
              )}{" "}
              de{" "}
              {FLOW_STEPS.length}
            </span>

            <span className="text-[7px] font-black uppercase tracking-wider text-slate-400">
              {Math.round(
                (currentProgress /
                  FLOW_STEPS.length) *
                  100,
              )}
              %
            </span>
          </div>
        </header>

        {/* TARJETA PRINCIPAL */}
        <main className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 p-5">
            <div className="flex items-start gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#87be00]/10 text-[#87be00]">
                <CurrentStepIcon
                  size={21}
                />
              </div>

              <div className="min-w-0">
                <p className="text-[8px] font-black uppercase tracking-[0.2em] text-[#87be00]">
                  Etapa actual
                </p>

                <h1 className="mt-1 text-xl font-black tracking-tight text-slate-900">
                  {
                    currentStepInfo.title
                  }
                </h1>

                <p className="mt-2 text-sm leading-relaxed text-slate-500">
                  {
                    currentStepInfo.subtitle
                  }
                </p>
              </div>
            </div>
          </div>

          <div className="p-5">
            {/* PASO 1: FACHADA */}
            {step === 1 && (
              <div className="space-y-4">
                {renderPhotoContainer(
                  fachadaPhoto,
                  1,
                )}

                <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4">
                  <p className="text-[8px] font-black uppercase tracking-wider text-blue-600">
                    Evidencia requerida
                  </p>

                  <p className="mt-1 text-xs leading-relaxed text-blue-700">
                    Fotografía exterior donde se identifique claramente el punto de venta.
                  </p>
                </div>
              </div>
            )}

            {/* PASO 2: PRODUCTO Y FOTO INICIAL */}
            {step === 2 && (
              <div className="space-y-4">
                {masterLoading ? (
                  <div className="flex min-h-[220px] flex-col items-center justify-center gap-3">
                    <FiLoader
                      size={30}
                      className="animate-spin text-[#87be00]"
                    />

                    <p className="text-[8px] font-black uppercase tracking-wider text-slate-400">
                      Cargando catálogo
                    </p>
                  </div>
                ) : masterError ? (
                  <div className="rounded-2xl border border-red-200 bg-red-50 p-4">
                    <p className="text-[9px] font-black uppercase tracking-wider text-red-700">
                      No se pudo cargar el catálogo
                    </p>

                    <p className="mt-2 text-sm text-red-600">
                      {masterError}
                    </p>

                    <button
                      type="button"
                      onClick={
                        fetchMasterData
                      }
                      className="mt-4 rounded-xl bg-red-600 px-4 py-3 text-[8px] font-black uppercase tracking-wider text-white"
                    >
                      Reintentar
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="space-y-3">
                      <label className="block">
                        <span className="mb-1.5 block pl-1 text-[8px] font-black uppercase tracking-wider text-slate-400">
                          Marca
                        </span>

                        <div className="relative">
                          <FiTag
                            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                            size={15}
                          />

                          <select
                            value={
                              selectedBrand
                            }
                            onChange={(
                              event,
                            ) =>
                              setSelectedBrand(
                                event
                                  .target
                                  .value,
                              )
                            }
                            disabled={
                              Boolean(
                                gondolaInicialPhoto,
                              )
                            }
                            className="h-12 w-full appearance-none rounded-2xl border border-slate-200 bg-slate-50 pl-11 pr-10 text-[10px] font-black uppercase text-slate-700 outline-none transition focus:border-[#87be00]/50 focus:bg-white focus:ring-4 focus:ring-[#87be00]/10 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            <option value="">
                              Selecciona una marca
                            </option>

                            {brands.map(
                              (brand) => (
                                <option
                                  key={
                                    brand.id
                                  }
                                  value={
                                    brand.id
                                  }
                                >
                                  {brand.name}
                                </option>
                              ),
                            )}
                          </select>

                          <FiChevronRight
                            className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 rotate-90 text-slate-400"
                            size={14}
                          />
                        </div>
                      </label>

                      <label className="block">
                        <span className="mb-1.5 block pl-1 text-[8px] font-black uppercase tracking-wider text-slate-400">
                          Producto
                        </span>

                        <div className="relative">
                          <FiBox
                            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                            size={15}
                          />

                          <select
                            value={
                              selectedProduct
                            }
                            onChange={(
                              event,
                            ) =>
                              setSelectedProduct(
                                event
                                  .target
                                  .value,
                              )
                            }
                            disabled={
                              !selectedBrand ||
                              Boolean(
                                gondolaInicialPhoto,
                              )
                            }
                            className="h-12 w-full appearance-none rounded-2xl border border-slate-200 bg-slate-50 pl-11 pr-10 text-[10px] font-black uppercase text-slate-700 outline-none transition focus:border-[#87be00]/50 focus:bg-white focus:ring-4 focus:ring-[#87be00]/10 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            <option value="">
                              Selecciona un producto
                            </option>

                            {filteredProducts.map(
                              (
                                product,
                              ) => (
                                <option
                                  key={
                                    product.id
                                  }
                                  value={
                                    product.id
                                  }
                                >
                                  {
                                    product.name
                                  }
                                </option>
                              ),
                            )}
                          </select>

                          <FiChevronRight
                            className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 rotate-90 text-slate-400"
                            size={14}
                          />
                        </div>
                      </label>
                    </div>

                    {selectedProduct && (
                      <div className="space-y-4">
                        <div className="rounded-2xl bg-slate-900 p-4 text-white">
                          <p className="text-[7px] font-black uppercase tracking-wider text-[#a8d52c]">
                            Producto seleccionado
                          </p>

                          <p className="mt-1 truncate text-sm font-black">
                            {selectedProductInfo?.name ||
                              "Producto"}
                          </p>
                        </div>

                        {renderPhotoContainer(
                          gondolaInicialPhoto,
                          2,
                        )}

                        {gondolaInicialPhoto &&
                          isPhotoReady(
                            2,
                          ) && (
                          <button
                            type="button"
                            onClick={() =>
                              setStep(3)
                            }
                            className={primaryButtonClass}
                          >
                            <FiPackage
                              size={15}
                            />
                            Escanear productos
                          </button>
                        )}
                      </div>
                    )}
                  </>
                  )}
              </div>
            )}

            {/* PASO 3: ESCANEO */}
            {step === 3 && (
              <div className="space-y-4">
                <div className="overflow-hidden rounded-[2rem] border border-slate-200 bg-slate-950 shadow-lg">
                  <Scanner
                    onScanSuccess={
                      handleScanSuccess
                    }
                  />
                </div>

                <div className="rounded-2xl bg-slate-900 p-4 text-white">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-[7px] font-black uppercase tracking-wider text-[#a8d52c]">
                        Producto
                      </p>

                      <p className="mt-1 truncate text-xs font-black">
                        {selectedProductInfo?.name ||
                          "Producto seleccionado"}
                      </p>
                    </div>

                    <span className="rounded-xl bg-white/10 px-3 py-2 text-[8px] font-black uppercase tracking-wider">
                      {
                        scannedCodes.length
                      }{" "}
                      EAN
                    </span>
                  </div>
                </div>

                {Object.keys(
                  groupedScannedCodes,
                ).length > 0 ? (
                  <div className="custom-scrollbar max-h-56 space-y-2 overflow-y-auto pr-1">
                    {Object.entries(
                      groupedScannedCodes,
                    ).map(
                      ([
                        code,
                        quantity,
                      ]) => (
                        <div
                          key={code}
                          className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3"
                        >
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#87be00]/10 text-[#87be00]">
                            <FiCheckCircle
                              size={15}
                            />
                          </div>

                          <div className="min-w-0 flex-1">
                            <p className="truncate text-[10px] font-black text-slate-700">
                              {code}
                            </p>

                            <p className="mt-0.5 text-[7px] font-black uppercase tracking-wider text-slate-400">
                              Código registrado
                            </p>
                          </div>

                          {quantity >
                            1 && (
                            <span className="rounded-lg bg-[#87be00] px-2 py-1 text-[8px] font-black text-white">
                              x
                              {
                                quantity
                              }
                            </span>
                          )}

                          <button
                            type="button"
                            onClick={() =>
                              removeOneCode(
                                code,
                              )
                            }
                            aria-label={`Eliminar una unidad del código ${code}`}
                            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-red-400 transition hover:bg-red-50 hover:text-red-600"
                          >
                            <FiTrash2
                              size={14}
                            />
                          </button>
                        </div>
                      ),
                    )}
                  </div>
                ) : (
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center">
                    <FiPackage
                      className="mx-auto text-slate-300"
                      size={28}
                    />

                    <p className="mt-3 text-[8px] font-black uppercase tracking-wider text-slate-400">
                      Aún no hay códigos registrados
                    </p>
                  </div>
                )}

                <div
                  className={`
                    rounded-2xl border p-4

                    ${
                      canContinueFromScan
                        ? "border-[#87be00]/20 bg-[#87be00]/10"
                        : "border-amber-100 bg-amber-50"
                    }
                  `}
                >
                  <p
                    className={`
                      text-[8px] font-black uppercase tracking-wider

                      ${
                        canContinueFromScan
                          ? "text-[#87be00]"
                          : "text-amber-600"
                      }
                    `}
                  >
                    {canContinueFromScan
                      ? `${scannedCodes.length} código${
                          scannedCodes.length ===
                          1
                            ? ""
                            : "s"
                        } registrado${
                          scannedCodes.length ===
                          1
                            ? ""
                            : "s"
                        }`
                      : "Escanea al menos un código para continuar"}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={
                    handleContinueFromScan
                  }
                  disabled={
                    !canContinueFromScan
                  }
                  className={primaryButtonClass}
                >
                  <FiCheckCircle
                    size={15}
                  />
                  Continuar a encuesta
                </button>
              </div>
            )}

            {/* PASO 4: ENCUESTA */}
            {step === 4 && (
              <div className="space-y-4">
                {questionsLoading ? (
                  <div className="flex min-h-[220px] flex-col items-center justify-center gap-3">
                    <FiLoader
                      size={30}
                      className="animate-spin text-[#87be00]"
                    />

                    <p className="text-[8px] font-black uppercase tracking-wider text-slate-400">
                      Cargando encuesta
                    </p>
                  </div>
                ) : questionsError ? (
                  <div className="rounded-2xl border border-red-200 bg-red-50 p-4">
                    <p className="text-[9px] font-black uppercase tracking-wider text-red-700">
                      Encuesta no disponible
                    </p>

                    <p className="mt-2 text-sm text-red-600">
                      {questionsError}
                    </p>

                    <button
                      type="button"
                      onClick={
                        loadQuestions
                      }
                      className="mt-4 rounded-xl bg-red-600 px-4 py-3 text-[8px] font-black uppercase tracking-wider text-white"
                    >
                      Reintentar
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="space-y-3">
                      {questions.map(
                        (
                          question,
                          index,
                        ) => (
                          <article
                            key={
                              question.id
                            }
                            className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4"
                          >
                            <div className="mb-3 flex items-start gap-3">
                              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white text-[9px] font-black text-slate-500 shadow-sm">
                                {index +
                                  1}
                              </span>

                              <div className="min-w-0 flex-1">
                                <p className="text-xs font-black leading-relaxed text-slate-800">
                                  {
                                    question.question
                                  }
                                </p>

                                {isRequiredQuestion(
                                  question,
                                ) && (
                                  <span className="mt-1 inline-block text-[7px] font-black uppercase tracking-wider text-red-500">
                                    Obligatoria
                                  </span>
                                )}
                              </div>
                            </div>

                            <QuestionRenderer
                              question={
                                question
                              }
                              answer={
                                answers[
                                  question
                                    .id
                                ]
                              }
                              onChange={(
                                value,
                              ) =>
                                setAnswers(
                                  (
                                    current,
                                  ) => ({
                                    ...current,
                                    [question.id]:
                                      value,
                                  }),
                                )
                              }
                            />
                          </article>
                        ),
                      )}
                    </div>

                    <div
                      className={`
                        rounded-2xl border p-4

                        ${
                          canContinueFromSurvey
                            ? "border-[#87be00]/20 bg-[#87be00]/10"
                            : "border-amber-100 bg-amber-50"
                        }
                      `}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p
                            className={`
                              text-[8px] font-black uppercase tracking-wider

                              ${
                                canContinueFromSurvey
                                  ? "text-[#87be00]"
                                  : "text-amber-600"
                              }
                            `}
                          >
                            Progreso de encuesta
                          </p>

                          <p className="mt-1 text-[8px] text-slate-500">
                            Obligatorias:{" "}
                            {
                              answeredRequiredCount
                            }
                            /
                            {
                              requiredQuestions.length
                            }
                          </p>
                        </div>

                        <span
                          className={`
                            text-lg font-black

                            ${
                              canContinueFromSurvey
                                ? "text-[#87be00]"
                                : "text-amber-600"
                            }
                          `}
                        >
                          {
                            answeredQuestionsCount
                          }
                          /
                          {
                            questions.length
                          }
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={
                        handleContinueFromSurvey
                      }
                      disabled={
                        !canContinueFromSurvey
                      }
                      className={primaryButtonClass}
                    >
                      <FiCamera
                        size={15}
                      />
                      Continuar a góndola final
                    </button>
                  </>
                )}
              </div>
            )}

            {/* PASO 5: FOTO FINAL */}
            {step === 5 && (
              <div className="space-y-4">
                {renderPhotoContainer(
                  gondolaTerminoPhoto,
                  5,
                )}

                <label className="block">
                  <span className="mb-1.5 block pl-1 text-[8px] font-black uppercase tracking-wider text-slate-400">
                    Observaciones del producto
                  </span>

                  <textarea
                    value={comment}
                    onChange={(
                      event,
                    ) =>
                      setComment(
                        event.target
                          .value,
                      )
                    }
                    placeholder="Describe cualquier situación relevante..."
                    className="h-28 w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-[#87be00]/50 focus:bg-white focus:ring-4 focus:ring-[#87be00]/10"
                  />
                </label>

                {(!gondolaTerminoPhoto ||
                  !isPhotoReady(
                    5,
                  )) && (
                  <div className="rounded-2xl border border-amber-100 bg-amber-50 p-4">
                    <p className="text-[8px] font-black uppercase tracking-wider text-amber-600">
                      La fotografía final es obligatoria
                    </p>
                  </div>
                )}

                <button
                  type="button"
                  onClick={() =>
                    setStep(6)
                  }
                  disabled={
                    !gondolaTerminoPhoto ||
                    !isPhotoReady(
                      5,
                    )
                  }
                  className={primaryButtonClass}
                >
                  <FiCheck
                    size={15}
                  />
                  Confirmar producto
                </button>
              </div>
            )}

            {/* PASO 6: DECISIÓN */}
            {step === 6 && (
              <div className="space-y-5">
                <div className="rounded-[1.5rem] bg-slate-900 p-5 text-white">
                  <p className="text-[8px] font-black uppercase tracking-wider text-[#a8d52c]">
                    Resumen del producto
                  </p>

                  <h2 className="mt-2 text-lg font-black">
                    {selectedProductInfo?.name ||
                      "Producto seleccionado"}
                  </h2>

                  <div className="mt-4 grid grid-cols-2 gap-2">
                    <div className="rounded-xl bg-white/5 p-3">
                      <p className="text-lg font-black text-white">
                        {
                          scannedCodes.length
                        }
                      </p>

                      <p className="mt-1 text-[7px] font-black uppercase tracking-wider text-slate-400">
                        Códigos
                      </p>
                    </div>

                    <div className="rounded-xl bg-white/5 p-3">
                      <p className="text-lg font-black text-white">
                        {
                          answeredQuestionsCount
                        }
                      </p>

                      <p className="mt-1 text-[7px] font-black uppercase tracking-wider text-slate-400">
                        Respuestas
                      </p>
                    </div>
                  </div>
                </div>

                {!productPhotosReady && (
                  <div className="rounded-2xl border border-amber-100 bg-amber-50 p-4">
                    <p className="text-[8px] font-black uppercase tracking-wider text-amber-600">
                      Las fotografías deben estar sincronizadas antes de registrar el producto
                    </p>

                    <div className="mt-3 flex flex-wrap gap-2">
                      {renderSyncState(
                        2,
                      )}

                      {renderSyncState(
                        5,
                      )}
                    </div>
                  </div>
                )}

                <div className="space-y-3">
                  <button
                    type="button"
                    onClick={() =>
                      registrarGestionProducto(
                        "NUEVO",
                      )
                    }
                    disabled={
                      loading ||
                      !productPhotosReady
                    }
                    className={primaryButtonClass}
                  >
                    {loading ? (
                      <>
                        <FiLoader
                          size={15}
                          className="animate-spin"
                        />
                        Registrando
                      </>
                    ) : (
                      <>
                        <FiPackage
                          size={15}
                        />
                        Registrar otro producto
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      registrarGestionProducto(
                        "SALIR",
                      )
                    }
                    disabled={
                      loading ||
                      !productPhotosReady
                    }
                    className={secondaryButtonClass}
                  >
                    <FiSend
                      size={15}
                    />
                    Finalizar gestión de sala
                  </button>
                </div>
              </div>
            )}

            {/* PASO 7: SALIDA */}
            {step === 7 && (
              <div className="space-y-4">
                {renderPhotoContainer(
                  exitPhoto,
                  7,
                )}

                <label className="block">
                  <span className="mb-1.5 block pl-1 text-[8px] font-black uppercase tracking-wider text-slate-400">
                    Observaciones finales
                  </span>

                  <textarea
                    value={comment}
                    onChange={(
                      event,
                    ) =>
                      setComment(
                        event.target
                          .value,
                      )
                    }
                    placeholder="Agrega una observación general de la visita..."
                    className="h-28 w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-[#87be00]/50 focus:bg-white focus:ring-4 focus:ring-[#87be00]/10"
                  />
                </label>

                {exitPhoto &&
                  !exitPhotoReady && (
                    <div className="rounded-2xl border border-amber-100 bg-amber-50 p-4">
                      <p className="text-[8px] font-black uppercase tracking-wider text-amber-600">
                        Sincroniza la fotografía antes de finalizar
                      </p>
                    </div>
                  )}

                <button
                  type="button"
                  onClick={
                    finalizarVisitaTotal
                  }
                  disabled={
                    loading ||
                    !exitPhotoReady
                  }
                  className={primaryButtonClass}
                >
                  {loading ? (
                    <>
                      <FiLoader
                        size={15}
                        className="animate-spin"
                      />
                      Finalizando visita
                    </>
                  ) : (
                    <>
                      <FiCheckCircle
                        size={15}
                      />
                      Confirmar y finalizar
                    </>
                  )}
                </button>
              </div>
            )}

            {/* PASO 8: CIERRE */}
            {step === 8 && (
              <div className="py-8 text-center">
                <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-[2rem] bg-[#87be00]/10 text-[#87be00]">
                  <FiCheckCircle
                    size={46}
                  />
                </div>

                <h2 className="mt-6 text-2xl font-black tracking-tight text-slate-900">
                  {visitPendingSync
                    ? "Visita guardada"
                    : "¡Visita completada!"}
                </h2>

                <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-slate-500">
                  {visitPendingSync
                    ? "La visita quedó guardada en el dispositivo y se sincronizará automáticamente cuando vuelva la conexión."
                    : "La información de la visita fue registrada correctamente."}
                </p>

                {visitPendingSync && (
                  <div className="mx-auto mt-5 max-w-sm rounded-2xl border border-amber-100 bg-amber-50 p-4">
                    <p className="text-[8px] font-black uppercase tracking-wider text-amber-700">
                      Pendiente de sincronización
                    </p>

                    <p className="mt-1 text-xs leading-relaxed text-amber-800">
                      Puedes volver al inicio. No cierres tu sesión hasta que la aplicación confirme el envío.
                    </p>
                  </div>
                )}

                <button
                  type="button"
                  onClick={() =>
                    navigate(
                      "/usuario/home",
                    )
                  }
                  className={`${primaryButtonClass} mt-7`}
                >
                  Volver al inicio
                </button>
              </div>
            )}
          </div>

          <footer className="flex items-center justify-center gap-2 border-t border-slate-100 bg-slate-50 px-5 py-4 text-[7px] font-black uppercase tracking-[0.2em] text-slate-400">
            <FiMapPin
              size={11}
            />
            Identificador de visita:{" "}
            {id
              ?.slice(0, 8)
              .toUpperCase()}
          </footer>
        </main>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleCapture}
        className="hidden"
      />
    </div>
  );
};

export default VisitFlow;