import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useNavigate } from "react-router-dom";
import {
  FiArrowLeft,
  FiCamera,
  FiCheckCircle,
  FiLoader,
  FiMapPin,
  FiRefreshCw,
  FiWifi,
  FiWifiOff,
  FiX,
} from "react-icons/fi";
import toast from "react-hot-toast";

import api from "../../api/apiClient";
import QuestionRenderer from "../../components/modals/QuestionRenderer";

const API_ORIGIN = (
  import.meta.env.VITE_API_URL ||
  "http://localhost:5000"
).replace(/\/api\/?$/, "");

const STEPS_INFO = {
  1: {
    title: "Inicio de visita",
    subtitle: "Selección del punto de venta",
  },
  2: {
    title: "Auditoría de sala",
    subtitle: "Cuestionario y evidencia",
  },
  3: {
    title: "Cierre de auditoría",
    subtitle: "Evidencia final y observaciones",
  },
  4: {
    title: "Visita sincronizada",
    subtitle: "Proceso completado correctamente",
  },
};

const normalizeCollection = (response) => {
  const payload = response?.data ?? response;

  if (Array.isArray(payload)) {
    return payload;
  }

  if (Array.isArray(payload?.data)) {
    return payload.data;
  }

  if (Array.isArray(payload?.rows)) {
    return payload.rows;
  }

  return [];
};

const parseQuestionConfig = (config) => {
  if (!config) {
    return {};
  }

  if (typeof config === "object") {
    return config;
  }

  try {
    return JSON.parse(config);
  } catch (error) {
    console.warn(
      "Configuración de pregunta inválida:",
      config,
      error,
    );

    return {};
  }
};

const hasRequiredAnswer = (answer) => {
  if (
    answer === undefined ||
    answer === null
  ) {
    return false;
  }

  if (typeof answer === "string") {
    return answer.trim() !== "";
  }

  if (Array.isArray(answer)) {
    return answer.length > 0;
  }

  return true;
};

const SupervisorVisitFlow = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const captureTypeRef = useRef(null);
  const objectUrlsRef = useRef(new Set());

  const [isOnline, setIsOnline] = useState(
    navigator.onLine,
  );
  const [step, setStep] = useState(1);
  const [loading, setLoading] =
    useState(false);
  const [capturing, setCapturing] =
    useState(false);
  const [
    activeCaptureType,
    setActiveCaptureType,
  ] = useState(null);
  const [
    loadingMasters,
    setLoadingMasters,
  ] = useState(true);
  const [
    loadingQuestions,
    setLoadingQuestions,
  ] = useState(false);

  const [chains, setChains] = useState([]);
  const [allLocals, setAllLocals] =
    useState([]);
  const [
    filteredLocals,
    setFilteredLocals,
  ] = useState([]);
  const [
    selectedChain,
    setSelectedChain,
  ] = useState("");
  const [
    selectedLocal,
    setSelectedLocal,
  ] = useState("");

  const [
    visitStartTime,
    setVisitStartTime,
  ] = useState(null);
  const [questions, setQuestions] =
    useState([]);
  const [answers, setAnswers] =
    useState({});
  const [
    generalObservations,
    setGeneralObservations,
  ] = useState("");

  const [fotoEntrada, setFotoEntrada] =
    useState(null);
  const [
    fotoObservacion,
    setFotoObservacion,
  ] = useState(null);
  const [fotoTermino, setFotoTermino] =
    useState(null);

  const registerObjectUrl = (file) => {
    const objectUrl =
      URL.createObjectURL(file);

    objectUrlsRef.current.add(
      objectUrl,
    );

    return objectUrl;
  };

  const revokeObjectUrl = (url) => {
    if (
      typeof url === "string" &&
      url.startsWith("blob:")
    ) {
      URL.revokeObjectURL(url);
      objectUrlsRef.current.delete(url);
    }
  };

  const replacePhoto = (
    setter,
    currentUrl,
    nextUrl,
  ) => {
    revokeObjectUrl(currentUrl);
    setter(nextUrl);
  };

  const formatImageUrl = (url) => {
    if (!url) {
      return null;
    }

    if (
      url.startsWith("blob:") ||
      url.startsWith("http")
    ) {
      return url;
    }

    const cleanUrl = url
      .replace(/^\/+/, "")
      .replace(/^uploads\//, "");

    return `${API_ORIGIN}/uploads/${cleanUrl}`;
  };

  useEffect(() => {
    const handleStatus = () =>
      setIsOnline(navigator.onLine);

    window.addEventListener(
      "online",
      handleStatus,
    );
    window.addEventListener(
      "offline",
      handleStatus,
    );

    return () => {
      window.removeEventListener(
        "online",
        handleStatus,
      );
      window.removeEventListener(
        "offline",
        handleStatus,
      );
    };
  }, []);

  useEffect(() => {
    return () => {
      objectUrlsRef.current.forEach(
        (url) =>
          URL.revokeObjectURL(url),
      );

      objectUrlsRef.current.clear();
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    const fetchSupervisorMasters =
      async () => {
        try {
          setLoadingMasters(true);

          const storedUser =
            localStorage.getItem("user");

          const currentUser =
            storedUser
              ? JSON.parse(storedUser)
              : null;

          if (!currentUser?.id) {
            throw new Error(
              "Sesión no válida",
            );
          }

          const response =
            await api.get(
              "/users/my-locales",
            );

          if (cancelled) {
            return;
          }

          const locals =
            normalizeCollection(response);

          setAllLocals(locals);

          const uniqueChains = [
            ...new Set(
              locals
                .map(
                  (local) =>
                    local?.cadena,
                )
                .filter(Boolean),
            ),
          ].sort((a, b) =>
            a.localeCompare(b, "es"),
          );

          setChains(uniqueChains);

          if (locals.length === 1) {
            setSelectedChain(
              locals[0]?.cadena || "",
            );
            setSelectedLocal(
              locals[0]?.id || "",
            );
          }
        } catch (error) {
          if (cancelled) {
            return;
          }

          console.error(
            "Error al cargar locales del supervisor:",
            error?.response?.data ||
              error?.message ||
              error,
          );

          toast.error(
            error?.response?.data?.message ||
              error?.message ||
              "Error cargando tus locales",
          );
        } finally {
          if (!cancelled) {
            setLoadingMasters(false);
          }
        }
      };

    fetchSupervisorMasters();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!selectedChain) {
      setFilteredLocals([]);
      setSelectedLocal("");
      return;
    }

    const filtered = allLocals.filter(
      (local) =>
        local.cadena === selectedChain,
    );

    setFilteredLocals(filtered);

    if (filtered.length === 1) {
      setSelectedLocal(
        filtered[0].id,
      );
      return;
    }

    const selectedStillExists =
      filtered.some(
        (local) =>
          local.id === selectedLocal,
      );

    if (!selectedStillExists) {
      setSelectedLocal("");
    }
  }, [
    selectedChain,
    allLocals,
    selectedLocal,
  ]);

  useEffect(() => {
    if (
      selectedLocal &&
      !visitStartTime
    ) {
      setVisitStartTime(
        new Date().toISOString(),
      );
    }
  }, [
    selectedLocal,
    visitStartTime,
  ]);

  useEffect(() => {
    let cancelled = false;

    const loadSupervisorQuestions =
      async () => {
        if (step !== 2) {
          return;
        }

        try {
          setLoadingQuestions(true);

          const response =
            await api.get(
              "/questions?flow=supervisor",
            );

          if (cancelled) {
            return;
          }

          const questionData =
            normalizeCollection(response);

          setQuestions(questionData);

          localStorage.setItem(
            "cultivapp_supervisor_questions_cache",
            JSON.stringify(
              questionData,
            ),
          );
        } catch (error) {
          if (cancelled) {
            return;
          }

          console.error(
            "Error al cargar preguntas:",
            error?.response?.data ||
              error?.message ||
              error,
          );

          const cached =
            localStorage.getItem(
              "cultivapp_supervisor_questions_cache",
            );

          if (cached) {
            try {
              const cachedQuestions =
                JSON.parse(cached);

              setQuestions(
                Array.isArray(
                  cachedQuestions,
                )
                  ? cachedQuestions
                  : [],
              );

              toast(
                "Se cargaron preguntas guardadas localmente",
                {
                  icon: "📦",
                },
              );
            } catch {
              setQuestions([]);
            }
          } else {
            setQuestions([]);

            toast.error(
              error?.response?.data
                ?.message ||
                "No fue posible cargar las preguntas",
            );
          }
        } finally {
          if (!cancelled) {
            setLoadingQuestions(
              false,
            );
          }
        }
      };

    loadSupervisorQuestions();

    return () => {
      cancelled = true;
    };
  }, [step]);

  const handleCapture = async (
    event,
  ) => {
    const file =
      event.target.files?.[0];

    if (!file) {
      return;
    }

    const currentPhotoType =
      captureTypeRef.current;

    if (!currentPhotoType) {
      toast.error(
        "No fue posible identificar el tipo de evidencia",
      );
      event.target.value = "";
      return;
    }

    setCapturing(true);
    setActiveCaptureType(
      currentPhotoType,
    );

    const toastId =
      toast.loading(
        "Subiendo captura...",
      );

    try {
      const formData =
        new FormData();

      formData.append(
        "photo_type",
        currentPhotoType,
      );
      formData.append(
        "local_id",
        selectedLocal,
      );
      formData.append(
        "foto",
        file,
      );

      const response =
        await api.post(
          "/supervisor/photo",
          formData,
        );

      const payload =
        response?.data ?? response;

      const fallbackUrl =
        registerObjectUrl(file);

      const photoPath =
        payload?.offline
          ? fallbackUrl
          : payload?.image_url ||
            payload?.url ||
            fallbackUrl;

      if (
        photoPath !== fallbackUrl
      ) {
        revokeObjectUrl(
          fallbackUrl,
        );
      }

      if (
        currentPhotoType ===
        "inicio_Jornada"
      ) {
        replacePhoto(
          setFotoEntrada,
          fotoEntrada,
          photoPath,
        );
      }

      if (
        currentPhotoType ===
        "foto_observacion"
      ) {
        replacePhoto(
          setFotoObservacion,
          fotoObservacion,
          photoPath,
        );
      }

      if (
        currentPhotoType ===
        "termino_jornada"
      ) {
        replacePhoto(
          setFotoTermino,
          fotoTermino,
          photoPath,
        );
      }

      toast.success(
        "Evidencia guardada",
        {
          id: toastId,
        },
      );
    } catch (error) {
      console.error(
        "Error al subir evidencia:",
        error?.response?.data ||
          error?.message ||
          error,
      );

      toast.error(
        error?.response?.data?.message ||
          "Error al subir la evidencia",
        {
          id: toastId,
        },
      );
    } finally {
      setCapturing(false);
      setActiveCaptureType(null);
      captureTypeRef.current = null;
      event.target.value = "";
    }
  };

  const validateRequiredQuestions =
    () => {
      return questions.filter(
        (question) =>
          question.is_required &&
          !hasRequiredAnswer(
            answers[question.id],
          ),
      );
    };

  const enviarAuditoriaFinal =
    async () => {
      const missingRequired =
        validateRequiredQuestions();

      if (
        missingRequired.length > 0
      ) {
        toast.error(
          "Faltan preguntas obligatorias",
        );
        setStep(2);
        return;
      }

      if (!fotoObservacion) {
        toast.error(
          "Falta foto de observación",
        );
        setStep(2);
        return;
      }

      if (!fotoTermino) {
        toast.error(
          "Falta foto de término",
        );
        return;
      }

      if (!selectedLocal) {
        toast.error(
          "Selecciona un local",
        );
        setStep(1);
        return;
      }

      setLoading(true);

      const toastId =
        toast.loading(
          "Sincronizando...",
        );

      const localData =
        allLocals.find(
          (local) =>
            local.id ===
            selectedLocal,
        );

      const supervisorReportPayload =
        {
          local_id:
            selectedLocal,
          chain_id:
            localData?.chain_id ||
            null,
          cadena:
            selectedChain,
          start_time:
            visitStartTime,
          end_time:
            new Date().toISOString(),
          responses:
            answers,
          observations:
            generalObservations.trim(),
          photo_entry:
            fotoEntrada,
          photo_observation:
            fotoObservacion,
          photo_exit:
            fotoTermino,
        };

      try {
        await api.post(
          "/supervisor/audit",
          supervisorReportPayload,
        );

        toast.success(
          "¡Auditoría registrada!",
          {
            id: toastId,
          },
        );

        setStep(4);
      } catch (error) {
        console.error(
          "Error al registrar auditoría:",
          error?.response?.data ||
            error?.message ||
            error,
        );

        toast.error(
          error?.response?.data?.message ||
            "Error al registrar la auditoría",
          {
            id: toastId,
          },
        );
      } finally {
        setLoading(false);
      }
    };

  const salirDeModulo = () =>
    navigate("/supervisor");

  const handleBack = () => {
    if (loading || capturing) {
      return;
    }

    if (step === 1) {
      salirDeModulo();
      return;
    }

    if (step === 4) {
      salirDeModulo();
      return;
    }

    setStep((current) =>
      Math.max(1, current - 1),
    );
  };

  const openCapture = (
    photoKey,
  ) => {
    if (
      capturing ||
      !selectedLocal
    ) {
      return;
    }

    captureTypeRef.current =
      photoKey;
    setActiveCaptureType(
      photoKey,
    );
    fileInputRef.current?.click();
  };

  const renderPhotoContainer = ({
    photoUrl,
    setPhotoUrl,
    placeholderText,
    photoKey,
  }) => {
    const isThisCapturing =
      capturing &&
      activeCaptureType ===
        photoKey;

    if (photoUrl) {
      return (
        <div className="relative mx-auto aspect-square w-full max-w-sm overflow-hidden rounded-[2rem] border border-slate-200 bg-slate-50 shadow-sm">
          <img
            src={formatImageUrl(
              photoUrl,
            )}
            className="h-full w-full object-contain"
            alt={placeholderText}
          />

          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              revokeObjectUrl(
                photoUrl,
              );
              setPhotoUrl(null);
            }}
            className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-xl bg-red-500 text-white shadow-lg transition hover:bg-red-600"
            aria-label={`Eliminar ${placeholderText}`}
          >
            <FiX size={18} />
          </button>
        </div>
      );
    }

    return (
      <button
        type="button"
        onClick={() =>
          openCapture(photoKey)
        }
        disabled={
          capturing ||
          !selectedLocal
        }
        className="mx-auto flex aspect-square w-full max-w-sm flex-col items-center justify-center rounded-[2rem] border-2 border-dashed border-slate-200 bg-slate-50 transition hover:border-[#87be00]/60 hover:bg-[#87be00]/5 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isThisCapturing ? (
          <>
            <FiLoader
              className="animate-spin text-[#87be00]"
              size={40}
            />

            <span className="mt-3 text-[10px] font-black uppercase tracking-widest text-slate-400">
              Subiendo evidencia
            </span>
          </>
        ) : (
          <>
            <FiCamera
              size={38}
              className={
                isOnline
                  ? "text-[#87be00]"
                  : "text-orange-500"
              }
            />

            <span className="mt-3 text-[10px] font-black uppercase tracking-widest text-slate-400">
              Capturar{" "}
              {placeholderText}
            </span>

            <span className="mt-1 text-[9px] font-bold text-slate-300">
              Toca para abrir la cámara
            </span>
          </>
        )}
      </button>
    );
  };

  const localSeleccionado =
    useMemo(
      () =>
        allLocals.find(
          (local) =>
            local.id ===
            selectedLocal,
        ) || null,
      [
        allLocals,
        selectedLocal,
      ],
    );

  const normalizedQuestions =
    useMemo(
      () =>
        questions.map(
          (question) => ({
            ...question,
            config:
              parseQuestionConfig(
                question.config,
              ),
          }),
        ),
      [questions],
    );

  const canContinueStepTwo =
    useMemo(() => {
      const missingRequired =
        normalizedQuestions.filter(
          (question) =>
            question.is_required &&
            !hasRequiredAnswer(
              answers[
                question.id
              ],
            ),
        );

      return (
        missingRequired.length === 0 &&
        Boolean(
          fotoObservacion,
        )
      );
    }, [
      normalizedQuestions,
      answers,
      fotoObservacion,
    ]);

  return (
    <div
      className={`min-h-screen px-4 pb-24 pt-20 font-[Outfit] sm:px-6 sm:pt-8 ${
        isOnline
          ? "bg-slate-50/70"
          : "bg-orange-50/60"
      }`}
    >
      <div className="mx-auto w-full max-w-3xl space-y-6">
        {/* Encabezado unificado */}
        <header className="flex flex-col gap-5 border-b border-slate-200/80 pb-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-4">
            <button
              type="button"
              onClick={handleBack}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:border-[#87be00]/40 hover:text-[#87be00]"
              aria-label={
                step === 1
                  ? "Salir del módulo"
                  : "Volver al paso anterior"
              }
            >
              <FiArrowLeft size={18} />
            </button>

            <div className="min-w-0">
              <h1 className="text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
                {
                  STEPS_INFO[step]
                    ?.title
                }
              </h1>

              <p
                className={`mt-1.5 text-[10px] font-black uppercase tracking-[0.24em] ${
                  isOnline
                    ? "text-[#87be00]"
                    : "text-orange-500"
                }`}
              >
                {
                  STEPS_INFO[step]
                    ?.subtitle
                }
              </p>
            </div>
          </div>

          <div
            className={`flex w-full items-center justify-center gap-2 rounded-2xl border px-4 py-3 text-[9px] font-black uppercase tracking-widest sm:w-auto ${
              isOnline
                ? "border-green-100 bg-green-50 text-green-700"
                : "border-orange-200 bg-orange-50 text-orange-600"
            }`}
          >
            {isOnline ? (
              <FiWifi size={14} />
            ) : (
              <FiWifiOff size={14} />
            )}

            {isOnline
              ? "Conectado"
              : "Modo sin conexión"}
          </div>
        </header>

        {/* Progreso */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="grid grid-cols-4 gap-2">
            {[1, 2, 3, 4].map(
              (item) => (
                <div
                  key={item}
                  className={`h-2 rounded-full transition-all duration-500 ${
                    step >= item
                      ? "bg-[#87be00]"
                      : "bg-slate-100"
                  }`}
                />
              ),
            )}
          </div>

          <div className="mt-3 flex items-center justify-between text-[8px] font-black uppercase tracking-widest text-slate-400">
            <span>
              Paso {step} de 4
            </span>

            <span>
              {Math.round(
                (step / 4) *
                  100,
              )}
              %
            </span>
          </div>
        </div>

        <main className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
          {/* Paso 1 */}
          {step === 1 && (
            <section className="space-y-6">
              <div>
                <p className="text-[9px] font-black uppercase tracking-[0.22em] text-slate-400">
                  Punto de venta
                </p>

                <h2 className="mt-1 text-lg font-black tracking-tight text-slate-900">
                  Selecciona el local de la visita
                </h2>
              </div>

              {loadingMasters ? (
                <div className="flex min-h-48 flex-col items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-slate-50">
                  <FiLoader
                    className="animate-spin text-[#87be00]"
                    size={26}
                  />

                  <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                    Cargando locales
                  </p>
                </div>
              ) : allLocals.length ===
                0 ? (
                <div className="flex min-h-48 flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-slate-200 bg-slate-50 text-center">
                  <FiMapPin
                    size={26}
                    className="text-slate-300"
                  />

                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                    No tienes locales asignados
                  </p>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 gap-4">
                    <div>
                      <label
                        htmlFor="visit-chain"
                        className="mb-2 block text-[9px] font-black uppercase tracking-[0.2em] text-slate-500"
                      >
                        Cadena
                      </label>

                      <select
                        id="visit-chain"
                        value={
                          selectedChain
                        }
                        onChange={(
                          event,
                        ) =>
                          setSelectedChain(
                            event.target
                              .value,
                          )
                        }
                        className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm font-bold text-slate-700 outline-none transition focus:border-[#87be00]/50 focus:bg-white focus:ring-4 focus:ring-[#87be00]/10"
                      >
                        <option value="">
                          Selecciona una cadena
                        </option>

                        {chains.map(
                          (chain) => (
                            <option
                              key={chain}
                              value={chain}
                            >
                              {chain}
                            </option>
                          ),
                        )}
                      </select>
                    </div>

                    <div>
                      <label
                        htmlFor="visit-local"
                        className="mb-2 block text-[9px] font-black uppercase tracking-[0.2em] text-slate-500"
                      >
                        Local
                      </label>

                      <select
                        id="visit-local"
                        disabled={
                          !selectedChain
                        }
                        value={
                          selectedLocal
                        }
                        onChange={(
                          event,
                        ) =>
                          setSelectedLocal(
                            event.target
                              .value,
                          )
                        }
                        className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm font-bold text-slate-700 outline-none transition focus:border-[#87be00]/50 focus:bg-white focus:ring-4 focus:ring-[#87be00]/10 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <option value="">
                          Selecciona un local
                        </option>

                        {filteredLocals.map(
                          (local) => (
                            <option
                              key={
                                local.id
                              }
                              value={
                                local.id
                              }
                            >
                              {local.codigo_local ||
                                "S/C"}{" "}
                              —{" "}
                              {local.direccion ||
                                "Sin dirección"}
                            </option>
                          ),
                        )}
                      </select>
                    </div>
                  </div>

                  {localSeleccionado && (
                    <div className="flex items-start gap-3 rounded-2xl border border-[#87be00]/25 bg-[#87be00]/5 p-4">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#87be00]/10 text-[#87be00]">
                        <FiMapPin
                          size={18}
                        />
                      </div>

                      <div>
                        <p className="text-[9px] font-black uppercase tracking-wider text-[#87be00]">
                          Local seleccionado
                        </p>

                        <p className="mt-1 text-sm font-black text-slate-800">
                          {localSeleccionado.codigo_local ||
                            "S/C"}{" "}
                          —{" "}
                          {localSeleccionado.direccion ||
                            "Sin dirección"}
                        </p>

                        {localSeleccionado.comuna && (
                          <p className="mt-1 text-xs font-medium text-slate-500">
                            {
                              localSeleccionado.comuna
                            }
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {selectedLocal && (
                    <div className="space-y-4 border-t border-slate-100 pt-6">
                      <div>
                        <p className="text-[9px] font-black uppercase tracking-[0.22em] text-slate-400">
                          Evidencia inicial
                        </p>

                        <h3 className="mt-1 text-base font-black text-slate-900">
                          Fotografía de fachada
                        </h3>
                      </div>

                      {renderPhotoContainer(
                        {
                          photoUrl:
                            fotoEntrada,
                          setPhotoUrl:
                            setFotoEntrada,
                          placeholderText:
                            "fachada",
                          photoKey:
                            "inicio_Jornada",
                        },
                      )}

                      {fotoEntrada && (
                        <button
                          type="button"
                          onClick={() =>
                            setStep(2)
                          }
                          className="w-full rounded-2xl bg-[#87be00] py-4 text-[10px] font-black uppercase tracking-[0.2em] text-white shadow-lg transition hover:bg-slate-900"
                        >
                          Comenzar auditoría
                        </button>
                      )}
                    </div>
                  )}
                </>
              )}
            </section>
          )}

          {/* Paso 2 */}
          {step === 2 && (
            <section className="space-y-6">
              <div>
                <p className="text-[9px] font-black uppercase tracking-[0.22em] text-slate-400">
                  Cuestionario
                </p>

                <h2 className="mt-1 text-lg font-black tracking-tight text-slate-900">
                  Registra la auditoría de sala
                </h2>
              </div>

              {loadingQuestions ? (
                <div className="flex min-h-48 flex-col items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-slate-50">
                  <FiLoader
                    className="animate-spin text-[#87be00]"
                    size={26}
                  />

                  <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                    Cargando preguntas
                  </p>
                </div>
              ) : normalizedQuestions.length ===
                0 ? (
                <div className="flex min-h-40 flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-slate-200 bg-slate-50 text-center">
                  <FiRefreshCw
                    size={24}
                    className="text-slate-300"
                  />

                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                    No hay preguntas configuradas
                  </p>
                </div>
              ) : (
                <div className="max-h-[55vh] space-y-4 overflow-y-auto pr-1 custom-scrollbar">
                  {normalizedQuestions.map(
                    (question) => (
                      <div
                        key={
                          question.id
                        }
                        className="rounded-2xl border border-slate-200 bg-slate-50/70 p-5"
                      >
                        <p className="mb-3 text-sm font-black text-slate-700">
                          {
                            question.question
                          }

                          {question.is_required && (
                            <span className="ml-1 text-red-500">
                              *
                            </span>
                          )}
                        </p>

                        <QuestionRenderer
                          question={
                            question
                          }
                          answer={
                            answers[
                              question.id
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
                      </div>
                    ),
                  )}
                </div>
              )}

              <div className="space-y-4 border-t border-slate-100 pt-6">
                <div>
                  <p className="text-[9px] font-black uppercase tracking-[0.22em] text-slate-400">
                    Evidencia de sala
                  </p>

                  <h3 className="mt-1 text-base font-black text-slate-900">
                    Fotografía de observación
                  </h3>
                </div>

                {renderPhotoContainer(
                  {
                    photoUrl:
                      fotoObservacion,
                    setPhotoUrl:
                      setFotoObservacion,
                    placeholderText:
                      "observación",
                    photoKey:
                      "foto_observacion",
                  },
                )}
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={handleBack}
                  className="rounded-2xl border border-slate-200 bg-white py-4 text-[10px] font-black uppercase tracking-[0.2em] text-slate-600 transition hover:border-slate-300 hover:bg-slate-50"
                >
                  Volver
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const missingRequired =
                      validateRequiredQuestions();

                    if (
                      missingRequired.length >
                      0
                    ) {
                      toast.error(
                        "Completa las preguntas obligatorias",
                      );
                      return;
                    }

                    if (
                      !fotoObservacion
                    ) {
                      toast.error(
                        "Debes capturar la evidencia de sala",
                      );
                      return;
                    }

                    setStep(3);
                  }}
                  disabled={
                    !canContinueStepTwo
                  }
                  className="rounded-2xl bg-slate-900 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-white transition hover:bg-[#87be00] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Siguiente
                </button>
              </div>
            </section>
          )}

          {/* Paso 3 */}
          {step === 3 && (
            <section className="space-y-6">
              <div>
                <p className="text-[9px] font-black uppercase tracking-[0.22em] text-slate-400">
                  Cierre de visita
                </p>

                <h2 className="mt-1 text-lg font-black tracking-tight text-slate-900">
                  Agrega notas y evidencia final
                </h2>
              </div>

              <div>
                <label
                  htmlFor="supervisor-observations"
                  className="mb-2 block text-[9px] font-black uppercase tracking-[0.2em] text-slate-500"
                >
                  Observaciones generales
                </label>

                <textarea
                  id="supervisor-observations"
                  value={
                    generalObservations
                  }
                  onChange={(
                    event,
                  ) =>
                    setGeneralObservations(
                      event.target.value,
                    )
                  }
                  maxLength={1000}
                  placeholder="Escribe observaciones relevantes de la visita"
                  className="h-32 w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm font-medium leading-relaxed text-slate-700 outline-none transition focus:border-[#87be00]/50 focus:bg-white focus:ring-4 focus:ring-[#87be00]/10"
                />

                <p className="mt-2 text-right text-[9px] font-bold text-slate-400">
                  {
                    generalObservations.length
                  }
                  /1000
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <p className="text-[9px] font-black uppercase tracking-[0.22em] text-slate-400">
                    Evidencia final
                  </p>

                  <h3 className="mt-1 text-base font-black text-slate-900">
                    Fotografía de término
                  </h3>
                </div>

                {renderPhotoContainer(
                  {
                    photoUrl:
                      fotoTermino,
                    setPhotoUrl:
                      setFotoTermino,
                    placeholderText:
                      "término",
                    photoKey:
                      "termino_jornada",
                  },
                )}
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={handleBack}
                  disabled={
                    loading
                  }
                  className="rounded-2xl border border-slate-200 bg-white py-4 text-[10px] font-black uppercase tracking-[0.2em] text-slate-600 transition hover:border-slate-300 hover:bg-slate-50 disabled:opacity-50"
                >
                  Volver
                </button>

                <button
                  type="button"
                  onClick={
                    enviarAuditoriaFinal
                  }
                  disabled={
                    loading ||
                    !fotoTermino
                  }
                  className="flex items-center justify-center gap-3 rounded-2xl bg-slate-900 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-white transition hover:bg-[#87be00] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {loading ? (
                    <>
                      <FiLoader className="animate-spin" />
                      Sincronizando
                    </>
                  ) : (
                    "Sincronizar auditoría"
                  )}
                </button>
              </div>
            </section>
          )}

          {/* Paso 4 */}
          {step === 4 && (
            <section className="py-8 text-center">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-[1.75rem] bg-[#87be00]/10 text-[#87be00]">
                <FiCheckCircle
                  size={42}
                />
              </div>

              <h2 className="mt-6 text-2xl font-black tracking-tight text-slate-900">
                Auditoría sincronizada
              </h2>

              <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-slate-500">
                La información de la visita y sus evidencias fueron registradas correctamente.
              </p>

              <button
                type="button"
                onClick={
                  salirDeModulo
                }
                className="mt-8 w-full rounded-2xl bg-[#87be00] py-4 text-[10px] font-black uppercase tracking-[0.2em] text-white shadow-lg transition hover:bg-slate-900 sm:max-w-sm"
              >
                Volver al panel
              </button>
            </section>
          )}
        </main>
      </div>

      <input
        type="file"
        accept="image/*"
        capture="environment"
        ref={fileInputRef}
        onChange={handleCapture}
        className="hidden"
      />
    </div>
  );
};

export default SupervisorVisitFlow;
