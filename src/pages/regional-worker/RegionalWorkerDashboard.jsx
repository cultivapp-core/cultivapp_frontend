import { useCallback, useEffect, useMemo, useState } from "react";
import {
  FiAlertTriangle,
  FiArrowRight,
  FiBox,
  FiCalendar,
  FiCamera,
  FiCheck,
  FiCheckCircle,
  FiChevronLeft,
  FiChevronRight,
  FiClipboard,
  FiClock,
  FiLoader,
  FiMapPin,
  FiMinusCircle,
  FiNavigation,
  FiPackage,
  FiPlay,
  FiRefreshCw,
  FiSearch,
  FiTruck,
  FiX,
} from "react-icons/fi";
import toast from "react-hot-toast";
import api from "../../api/apiClient";
import Scanner from "../../components/Scanner";
import regionalInventoryService from "../../services/regionalInventoryService";
import RegionalOfflineManager, {
  REGIONAL_OFFLINE_EVENTS,
} from "../../services/regionalOfflineManager";

const FLOW_STEPS = [1, 2, 3, 4, 5, 6];
const GPS_OUT_OF_RANGE_MESSAGE =
  "No se puede iniciar la visita fuera del rango permitido del GPS.";

const FLOW_INFO = {
  1: {
    title: "Inicio de jornada",
    subtitle: "Registra la fotografía inicial del local.",
    icon: FiClock,
  },
  2: {
    title: "Góndola inicial",
    subtitle: "Selecciona un producto y fotografía su estado inicial.",
    icon: FiCamera,
  },
  3: {
    title: "Reposición",
    subtitle: "Escanea el producto e indica la cantidad a reponer.",
    icon: FiTruck,
  },
  4: {
    title: "Góndola final",
    subtitle: "Fotografía cómo quedó la góndola después de la gestión.",
    icon: FiCamera,
  },
  5: {
    title: "Continuar gestión",
    subtitle: "Gestiona otro producto, registra una merma o finaliza.",
    icon: FiPackage,
  },
  6: {
    title: "Cuadratura y cierre",
    subtitle: "Confirma el conteo físico y cierra la jornada.",
    icon: FiClipboard,
  },
};

const unwrap = (response) => response?.data ?? response ?? null;

const getArray = (response, keys = []) => {
  const payload = unwrap(response);
  if (Array.isArray(payload)) return payload;
  for (const key of keys) {
    if (Array.isArray(payload?.[key])) return payload[key];
  }
  return [];
};

const getErrorMessage = (error, fallback) =>
  error?.data?.message ??
  error?.response?.data?.message ??
  error?.message ??
  fallback;

const getApiErrorPayload = (error) =>
  error?.response?.data ?? error?.data ?? error ?? {};

const isGpsOutOfRangeError = (error) => {
  const payload = getApiErrorPayload(error);
  const code = String(
    payload?.code ?? payload?.error_code ?? error?.code ?? ""
  )
    .trim()
    .toUpperCase();
  const message = String(payload?.message ?? error?.message ?? "")
    .trim()
    .toLowerCase();

  return (
    ["OUTSIDE_GEOFENCE", "OUT_OF_GPS_RANGE", "GPS_OUT_OF_RANGE"].includes(
      code
    ) ||
    payload?.isValid === false ||
    payload?.is_valid_gps === false ||
    payload?.data?.is_valid_gps === false ||
    message.includes("fuera del rango") ||
    message.includes("fuera de rango") ||
    message.includes("máximo de") ||
    message.includes("maximo de") ||
    message.includes("metros del local")
  );
};

const idOf = (item) => item?.id ?? item?.local_id ?? "";
const productIdOf = (item) => item?.product_id ?? item?.id ?? "";

const localLabel = (item) => {
  const code = item?.codigo_local ?? item?.local_code ?? item?.code;
  const name = item?.local_name ?? item?.nombre_local ?? item?.name ?? item?.nombre;
  return code && name && code !== name
    ? `${code} · ${name}`
    : code || name || "Local asignado";
};

const unitOf = (item) =>
  String(item?.unit_type ?? "UN").toUpperCase() === "KG" ? "KG" : "UN";

const quantity = (value, unit = "UN") =>
  new Intl.NumberFormat("es-CL", {
    minimumFractionDigits: unit === "KG" ? 3 : 0,
    maximumFractionDigits: unit === "KG" ? 3 : 0,
  }).format(Number(value) || 0);

const randomId = () =>
  globalThis.crypto?.randomUUID?.() ??
  `${Date.now()}-${Math.random().toString(16).slice(2)}`;

const journeyFrom = (response) => {
  const payload = unwrap(response);
  return payload?.journey ?? payload?.active_journey ?? payload;
};

const movementIdFrom = (response) => {
  const payload = unwrap(response);
  return payload?.movement_id ?? payload?.movement?.id ?? payload?.id ?? null;
};

const Modal = ({ children, onClose, title }) => (
  <div className="fixed inset-0 z-[10000] flex items-end justify-center bg-black/55 backdrop-blur-sm sm:items-center sm:p-4">
    <button
      type="button"
      aria-label="Cerrar"
      onClick={onClose}
      className="absolute inset-0"
    />
    <div className="relative z-10 max-h-[92vh] w-full overflow-y-auto rounded-t-[2rem] bg-white p-5 shadow-2xl sm:max-w-lg sm:rounded-[2rem] sm:p-6">
      <div className="mb-5 flex items-center justify-between gap-4">
        <h2 className="text-lg font-black text-gray-900">{title}</h2>
        <button
          type="button"
          onClick={onClose}
          className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-50 text-gray-400 hover:bg-red-50 hover:text-red-500"
        >
          <FiX />
        </button>
      </div>
      {children}
    </div>
  </div>
);

const FilePicker = ({ file, label, onChange }) => (
  <label className="block cursor-pointer">
    <span className="mb-2 block text-[8px] font-black uppercase tracking-widest text-gray-400">
      {label}
    </span>

    <input
      type="file"
      accept="image/*"
      capture="environment"
      aria-label={label}
      onChange={(event) => {
        const selectedFile = event.target.files?.[0] ?? null;
        if (selectedFile) onChange(selectedFile);
        event.target.value = "";
      }}
      className="sr-only"
    />

    <span
      className={`group flex min-h-28 w-full items-center gap-4 rounded-2xl border-2 border-dashed p-4 transition-all active:scale-[0.99] ${
        file
          ? "border-[#87be00]/40 bg-[#87be00]/5"
          : "border-gray-200 bg-gray-50 hover:border-[#87be00]/40 hover:bg-[#87be00]/5"
      }`}
    >
      <span
        className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl transition-colors ${
          file
            ? "bg-[#87be00] text-white"
            : "bg-white text-[#87be00] shadow-sm group-hover:bg-[#87be00] group-hover:text-white"
        }`}
      >
        {file ? <FiCheckCircle size={24} /> : <FiCamera size={24} />}
      </span>

      <span className="min-w-0 flex-1">
        <span className="block text-[10px] font-black uppercase tracking-wider text-gray-900">
          {file ? "Fotografía lista" : "Tomar fotografía"}
        </span>
        <span className="mt-1.5 block text-[9px] font-semibold leading-relaxed text-gray-400">
          {file
            ? "Toca aquí para volver a tomar la fotografía."
            : "Toca el icono para abrir la cámara del dispositivo."}
        </span>
        {file && (
          <span className="mt-2 block truncate text-[9px] font-bold text-[#6e9e00]">
            {file.name}
          </span>
        )}
      </span>

      <FiCamera
        size={17}
        className={`shrink-0 ${file ? "text-[#87be00]" : "text-gray-300"}`}
      />
    </span>
  </label>
);

const MetricCard = ({ label, value, tone = "text-gray-900" }) => (
  <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
    <p className="text-[8px] font-black uppercase tracking-wider text-gray-400">
      {label}
    </p>
    <p className={`mt-2 text-xl font-black ${tone}`}>{value}</p>
  </div>
);

const ROUTE_STATUS = {
  PENDING: {
    label: "Pendiente",
    badge: "border-amber-100 bg-amber-50 text-amber-600",
    dot: "bg-amber-400",
  },
  PENDIENTE: {
    label: "Pendiente",
    badge: "border-amber-100 bg-amber-50 text-amber-600",
    dot: "bg-amber-400",
  },
  IN_PROGRESS: {
    label: "En curso",
    badge: "border-blue-100 bg-blue-50 text-blue-600",
    dot: "bg-blue-500",
  },
  EN_PROCESO: {
    label: "En curso",
    badge: "border-blue-100 bg-blue-50 text-blue-600",
    dot: "bg-blue-500",
  },
  COMPLETED: {
    label: "Completada",
    badge: "border-[#87be00]/20 bg-[#87be00]/10 text-[#87be00]",
    dot: "bg-[#87be00]",
  },
  FINALIZADO: {
    label: "Completada",
    badge: "border-[#87be00]/20 bg-[#87be00]/10 text-[#87be00]",
    dot: "bg-[#87be00]",
  },
};

const dateKey = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const routeDateKey = (value) => {
  const match = String(value ?? "").match(/^\d{4}-\d{2}-\d{2}/);
  if (match) return match[0];
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? "" : dateKey(parsed);
};

const RegionalPlanningHome = ({
  locales,
  onStartJourney,
  startingRouteId,
}) => {
  const [routes, setRoutes] = useState([]);
  const [planningLoading, setPlanningLoading] = useState(true);

  const today = useMemo(() => new Date(), []);
  const todayKey = dateKey(today);

  const assignedLocalIds = useMemo(
    () => new Set(locales.map((local) => String(idOf(local)))),
    [locales]
  );

  const loadPlanning = useCallback(async () => {
    try {
      setPlanningLoading(true);
      const response =
        await regionalInventoryService.getMercaderistaPlanningToday();
      const rows = getArray(response, ["rows", "routes", "items"]);
      setRoutes(
        rows.filter((route) =>
          assignedLocalIds.has(String(route?.local_id ?? ""))
        )
      );
    } catch (requestError) {
      toast.error(
        getErrorMessage(
          requestError,
          "No fue posible cargar tu planificación regional."
        )
      );
    } finally {
      setPlanningLoading(false);
    }
  }, [assignedLocalIds]);

  useEffect(() => {
    loadPlanning();
  }, [loadPlanning]);

  const visibleRoutes = useMemo(
    () =>
      routes
        .filter((route) => {
          if (route?.visit_date) {
            return routeDateKey(route.visit_date) === todayKey;
          }
          return true;
        })
        .sort((first, second) =>
          String(first?.start_time ?? "").localeCompare(
            String(second?.start_time ?? "")
          )
        ),
    [routes, todayKey]
  );

  const summary = useMemo(
    () =>
      visibleRoutes.reduce(
        (result, route) => {
          const status = String(route?.status ?? "PENDING").toUpperCase();
          if (["COMPLETED", "FINALIZADO"].includes(status)) {
            result.completed += 1;
          } else if (["IN_PROGRESS", "EN_PROCESO"].includes(status)) {
            result.inProgress += 1;
          } else {
            result.pending += 1;
          }
          return result;
        },
        { pending: 0, inProgress: 0, completed: 0 }
      ),
    [visibleRoutes]
  );

  if (planningLoading && routes.length === 0) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3">
        <FiLoader className="animate-spin text-[#87be00]" size={28} />
        <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">
          Cargando planificación...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5" data-regional-home="today-only">
      <section className="rounded-[2rem] bg-slate-900 p-5 text-white shadow-xl shadow-slate-900/10">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[9px] font-black uppercase tracking-[0.24em] text-[#a8d52c]">
              Mi agenda regional
            </p>
            <h1 className="mt-2 text-2xl font-black capitalize">
              {today.toLocaleDateString("es-CL", {
                weekday: "long",
                day: "numeric",
                month: "long",
              })}
            </h1>
            <p className="mt-2 text-sm text-slate-400">
              {visibleRoutes.length === 1
                ? "1 visita programada para hoy"
                : `${visibleRoutes.length} visitas programadas para hoy`}
            </p>
          </div>
          <button
            type="button"
            onClick={loadPlanning}
            className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10 text-white"
            aria-label="Actualizar planificación"
          >
            <FiRefreshCw className={planningLoading ? "animate-spin" : ""} />
          </button>
        </div>

        <div className="mt-5 grid grid-cols-3 gap-2">
          {[
            [summary.pending, "Pendientes", "text-amber-400"],
            [summary.inProgress, "En curso", "text-blue-400"],
            [summary.completed, "Completadas", "text-[#a8d52c]"],
          ].map(([value, label, tone]) => (
            <div key={label} className="rounded-2xl bg-white/5 p-3">
              <p className={`text-xl font-black ${tone}`}>{value}</p>
              <p className="mt-1 text-[8px] font-black uppercase text-slate-400">
                {label}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-[2rem] border border-slate-200 bg-white p-4 shadow-sm">
        <p className="text-center text-[8px] font-black uppercase tracking-[0.14em] text-slate-400">
          Por seguridad operativa, solo puedes visualizar y gestionar las visitas de hoy.
        </p>
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between px-1">
          <div>
            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-[#87be00]">
              Planificación
            </p>
            <h2 className="mt-1 text-lg font-black text-slate-900">
              Visitas del día
            </h2>
          </div>
          <span className="rounded-xl bg-white px-3 py-2 text-[9px] font-black text-slate-500 shadow-sm">
            {visibleRoutes.length}
          </span>
        </div>

        {visibleRoutes.length === 0 ? (
          <div className="flex min-h-[250px] flex-col items-center justify-center rounded-[2rem] border border-dashed border-slate-200 bg-white p-8 text-center">
            <FiCalendar className="text-slate-300" size={30} />
            <p className="mt-4 text-[10px] font-black uppercase tracking-widest text-slate-400">
              Sin visitas programadas
            </p>
            <p className="mt-2 text-sm text-slate-500">
              No tienes una planificación regional para hoy.
            </p>
          </div>
        ) : (
          visibleRoutes.map((route) => {
            const status = String(route?.status ?? "PENDING").toUpperCase();
            const statusInfo = ROUTE_STATUS[status] ?? ROUTE_STATUS.PENDING;
            const completed = ["COMPLETED", "FINALIZADO"].includes(status);
            const inProgress = ["IN_PROGRESS", "EN_PROCESO"].includes(status);
            const canOpen = !completed;
            const mapsQuery =
              route.local_lat && route.local_lng
                ? `${route.local_lat},${route.local_lng}`
                : route.direccion ?? "";

            return (
              <article
                key={route.id}
                className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm"
              >
                <div className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[8px] font-black uppercase ${statusInfo.badge}`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${statusInfo.dot}`}
                          />
                          {statusInfo.label}
                        </span>
                        <span className="inline-flex items-center gap-1 text-[9px] font-black text-[#87be00]">
                          <FiClock /> {route.start_time?.slice(0, 5) ?? "--:--"}
                          {route.end_time && ` — ${route.end_time.slice(0, 5)}`}
                        </span>
                      </div>
                      <h3 className="mt-3 truncate text-lg font-black text-slate-900">
                        {route.cadena ?? route.nombre_local ?? "Local planificado"}
                      </h3>
                      <p className="mt-2 flex items-start gap-2 text-[10px] font-bold text-slate-500">
                        <FiMapPin className="mt-0.5 shrink-0" />
                        <span>
                          {route.direccion ?? "Dirección no disponible"}
                          {route.comuna_name ? `, ${route.comuna_name}` : ""}
                        </span>
                      </p>
                    </div>
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-50 text-slate-400">
                      <FiNavigation />
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-4">
                    <span className="rounded-lg border border-blue-100 bg-blue-50 px-2.5 py-1 text-[8px] font-black uppercase text-blue-600">
                      Visita {route.visit_number ?? "S/N"}
                    </span>
                    {(route.codigo_local || route.local_code) && (
                      <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-[8px] font-black uppercase text-slate-500">
                        Código {route.codigo_local || route.local_code}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex gap-2 border-t border-slate-100 bg-slate-50/70 p-3">
                  {completed ? (
                    <div className="flex min-h-[50px] flex-1 items-center justify-center gap-2 rounded-2xl bg-[#87be00]/10 text-[9px] font-black uppercase text-[#87be00]">
                      <FiCheckCircle /> Jornada finalizada
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => onStartJourney(route)}
                      disabled={!canOpen || startingRouteId === route.id}
                      className={`flex min-h-[50px] flex-1 items-center justify-center gap-2 rounded-2xl px-4 text-[9px] font-black uppercase ${
                        canOpen
                          ? "bg-slate-900 text-white hover:bg-[#87be00]"
                          : "cursor-not-allowed bg-slate-100 text-slate-400"
                      }`}
                    >
                      {startingRouteId === route.id ? (
                        <FiLoader className="animate-spin" />
                      ) : (
                        <FiPlay />
                      )}
                      {startingRouteId === route.id
                        ? "Iniciando..."
                        : inProgress
                          ? "Continuar visita"
                          : "Iniciar visita"}
                    </button>
                  )}

                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                      mapsQuery
                    )}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex h-[50px] w-[50px] items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700"
                  >
                    <FiMapPin />
                  </a>
                </div>
              </article>
            );
          })
        )}
      </section>
    </div>
  );
};

const RegionalWorkerDashboard = () => {
  const [locales, setLocales] = useState([]);
  const [selectedLocalId, setSelectedLocalId] = useState("");
  const [journey, setJourney] = useState(null);
  const [stock, setStock] = useState([]);
  const [evidence, setEvidence] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [stockLoading, setStockLoading] = useState(false);
  const [startingRouteId, setStartingRouteId] = useState("");
  const [error, setError] = useState("");
  const [isOnline, setIsOnline] = useState(
    typeof navigator === "undefined" ? true : navigator.onLine
  );
  const [offlineStats, setOfflineStats] = useState({
    pendingCount: 0,
    failedCount: 0,
    totalCount: 0,
  });
  const [flowStep, setFlowStep] = useState(1);
  const [gpsRangeModal, setGpsRangeModal] = useState({
    isOpen: false,
    message: GPS_OUT_OF_RANGE_MESSAGE,
    distance: null,
    maximumDistance: null,
  });

  const [startPhoto, setStartPhoto] = useState(null);
  const [uploadingStart, setUploadingStart] = useState(false);

  const [selectedProduct, setSelectedProduct] = useState(null);
  const [initialShelfPhoto, setInitialShelfPhoto] = useState(null);
  const [uploadingInitialShelf, setUploadingInitialShelf] = useState(false);
  const [initialShelfReady, setInitialShelfReady] = useState(false);

  const [scannerOpen, setScannerOpen] = useState(false);
  const [movementQuantity, setMovementQuantity] = useState("");
  const [registeringMovement, setRegisteringMovement] = useState(false);
  const [movementOperationId, setMovementOperationId] = useState(randomId);
  const [currentMovement, setCurrentMovement] = useState(null);

  const [finalShelfPhoto, setFinalShelfPhoto] = useState(null);
  const [uploadingFinalShelf, setUploadingFinalShelf] = useState(false);
  const [registeredProducts, setRegisteredProducts] = useState([]);

  const [wasteOpen, setWasteOpen] = useState(false);
  const [wasteProductId, setWasteProductId] = useState("");
  const [wasteQuantity, setWasteQuantity] = useState("");
  const [wasteReason, setWasteReason] = useState("");
  const [wastePhoto, setWastePhoto] = useState(null);
  const [wasteOperationId, setWasteOperationId] = useState(randomId);
  const [submittingWaste, setSubmittingWaste] = useState(false);

  const [physicalCounts, setPhysicalCounts] = useState({});
  const [closingObservation, setClosingObservation] = useState("");
  const [endPhoto, setEndPhoto] = useState(null);
  const [closing, setClosing] = useState(false);
  const [completedSummary, setCompletedSummary] = useState(null);

  const journeyId = journey?.id ?? journey?.journey_id;
  const activeLocalId = journey?.local_id ?? selectedLocalId;

  const loadStock = useCallback(async (localId) => {
    if (!localId) {
      setStock([]);
      return;
    }

    try {
      setStockLoading(true);
      const response = await regionalInventoryService.getMercaderistaStock(localId);
      const nextStock = getArray(response, [
        "items",
        "rows",
        "stock",
        "inventory",
        "balances",
        "products",
      ]);
      setStock(nextStock);
      return nextStock;
    } finally {
      setStockLoading(false);
    }
  }, []);

  const loadEvidence = useCallback(async (activeJourneyId) => {
    if (!activeJourneyId) return;
    const response = await regionalInventoryService.getJourneyEvidence(activeJourneyId);
    const nextEvidence = getArray(response, [
      "items",
      "rows",
      "evidence",
      "evidences",
    ]);
    setEvidence(nextEvidence);
    if (nextEvidence.some((item) => item?.evidence_type === "JOURNEY_START")) {
      setFlowStep((current) => Math.max(current, 2));
    }
    return nextEvidence;
  }, []);

  const loadInitialData = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const [localesResponse, journeyResponse] = await Promise.all([
        regionalInventoryService.getMercaderistaLocales(),
        regionalInventoryService.getActiveJourney(),
      ]);

      const nextLocales = getArray(localesResponse, [
        "items",
        "rows",
        "locales",
        "locals",
      ]);
      const activeJourney = journeyFrom(journeyResponse);
      setLocales(nextLocales);

      if (activeJourney?.id || activeJourney?.journey_id) {
        const nextLocalId = String(activeJourney.local_id ?? "");
        setJourney(activeJourney);
        setSelectedLocalId(nextLocalId);
        const [nextStock] = await Promise.all([
          loadStock(nextLocalId),
          loadEvidence(activeJourney.id ?? activeJourney.journey_id),
        ]);

        const activeJourneyId =
          activeJourney.id ?? activeJourney.journey_id;
        const draft =
          await regionalInventoryService.getDraft(activeJourneyId);

        if (draft) {
          setFlowStep(Number(draft.flowStep) || 1);
          setRegisteredProducts(
            Array.isArray(draft.registeredProducts)
              ? draft.registeredProducts
              : []
          );
          setPhysicalCounts(draft.physicalCounts || {});
          setClosingObservation(draft.closingObservation || "");
          setMovementOperationId(
            draft.movementOperationId || randomId()
          );
          setWasteOperationId(
            draft.wasteOperationId || randomId()
          );
          setCurrentMovement(draft.currentMovement || null);

          if (draft.selectedProductId) {
            setSelectedProduct(
              (nextStock || []).find(
                (item) =>
                  String(productIdOf(item)) ===
                  String(draft.selectedProductId)
              ) || null
            );
          }
        }
      } else {
        setJourney(null);
        setEvidence([]);
        setStock([]);
        setFlowStep(1);
        setSelectedLocalId("");
      }
    } catch (requestError) {
      setError(
        getErrorMessage(
          requestError,
          "No fue posible cargar tu inventario regional."
        )
      );
    } finally {
      setLoading(false);
    }
  }, [loadEvidence, loadStock]);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  useEffect(() => {
    let active = true;

    const refreshOfflineStats = async () => {
      const stats = await RegionalOfflineManager.stats();
      if (active) {
        setOfflineStats({
          pendingCount: stats.pendingCount || 0,
          failedCount: stats.failedCount || 0,
          totalCount: stats.totalCount || 0,
        });
      }
    };

    const handleQueueChange = () => {
      refreshOfflineStats();
    };

    refreshOfflineStats();

    window.addEventListener(
      REGIONAL_OFFLINE_EVENTS.QUEUE_UPDATED,
      handleQueueChange
    );
    window.addEventListener(
      REGIONAL_OFFLINE_EVENTS.ITEM_SUCCESS,
      handleQueueChange
    );
    window.addEventListener(
      REGIONAL_OFFLINE_EVENTS.ITEM_ERROR,
      handleQueueChange
    );
    window.addEventListener(
      REGIONAL_OFFLINE_EVENTS.SYNC_COMPLETE,
      handleQueueChange
    );

    return () => {
      active = false;
      window.removeEventListener(
        REGIONAL_OFFLINE_EVENTS.QUEUE_UPDATED,
        handleQueueChange
      );
      window.removeEventListener(
        REGIONAL_OFFLINE_EVENTS.ITEM_SUCCESS,
        handleQueueChange
      );
      window.removeEventListener(
        REGIONAL_OFFLINE_EVENTS.ITEM_ERROR,
        handleQueueChange
      );
      window.removeEventListener(
        REGIONAL_OFFLINE_EVENTS.SYNC_COMPLETE,
        handleQueueChange
      );
    };
  }, []);

  useEffect(() => {
    if (!journeyId) return undefined;

    const timer = window.setTimeout(() => {
      regionalInventoryService
        .saveDraft(journeyId, {
          flowStep,
          selectedLocalId,
          selectedProductId: selectedProduct
            ? productIdOf(selectedProduct)
            : null,
          currentMovement,
          registeredProducts,
          physicalCounts,
          closingObservation,
          movementOperationId,
          wasteOperationId,
        })
        .catch((draftError) => {
          console.warn("No fue posible guardar borrador regional:", draftError);
        });
    }, 250);

    return () => window.clearTimeout(timer);
  }, [
    journeyId,
    flowStep,
    selectedLocalId,
    selectedProduct,
    currentMovement,
    registeredProducts,
    physicalCounts,
    closingObservation,
    movementOperationId,
    wasteOperationId,
  ]);

  const visibleStock = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return stock;
    return stock.filter((item) =>
      [
        item?.sku,
        item?.barcode,
        item?.ean,
        item?.product_name,
        item?.brand_name,
      ].some((value) => String(value ?? "").toLowerCase().includes(term))
    );
  }, [search, stock]);

  const totals = useMemo(
    () =>
      stock.reduce(
        (result, item) => {
          result[unitOf(item)] += Number(item?.available_quantity) || 0;
          return result;
        },
        { UN: 0, KG: 0 }
      ),
    [stock]
  );

  const currentLocal = locales.find(
    (item) => String(idOf(item)) === String(activeLocalId)
  );
  const currentFlowInfo = FLOW_INFO[flowStep] ?? FLOW_INFO[1];
  const CurrentFlowIcon = currentFlowInfo.icon;
  const selectedUnit = unitOf(selectedProduct);

  const uploadEvidence = async ({
    file,
    evidenceType,
    movementId,
    movementClientOperationId,
    productId,
  }) =>
    regionalInventoryService.uploadEvidence({
      file,
      journeyId,
      evidenceType,
      clientEvidenceId: randomId(),
      movementId,
      movementClientOperationId,
      productId,
      capturedAt: new Date().toISOString(),
      isOfflineCapture: !isOnline,
    });

  const handleStartJourney = async (task) => {
    const localId = String(task?.local_id ?? "");
    const routeId = String(task?.id ?? "");

    if (!isOnline) {
      toast.error(
        "Necesitas conexión para iniciar una nueva visita y validar el GPS. Si la jornada ya estaba iniciada, sí puedes continuar trabajando offline."
      );
      return;
    }

    if (!localId || !routeId) {
      toast.error("La planificación no tiene un local válido.");
      return;
    }

    if (typeof navigator === "undefined" || !navigator.geolocation) {
      toast.error("GPS no disponible en este dispositivo.");
      return;
    }

    setStartingRouteId(routeId);
    const toastId = toast.loading("Validando ubicación del local...");

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          await api.post(
            `/routes/${routeId}/check-in`,
            {
              lat_in: position.coords.latitude,
              lng_in: position.coords.longitude,
            },
            {
              offlineFallback: false,
              preserveSessionOnAuthError: true,
            }
          );

          setSelectedLocalId(localId);
          setStock([]);

          const response = await regionalInventoryService.startJourney(
            localId,
            routeId
          );
          const nextJourney = journeyFrom(response);

          if (!nextJourney?.id && !nextJourney?.journey_id) {
            throw new Error("El servidor no devolvió la jornada iniciada.");
          }

          setCompletedSummary(null);
          setJourney(nextJourney);
          setFlowStep(1);

          await Promise.all([
            loadStock(localId),
            loadEvidence(nextJourney.id ?? nextJourney.journey_id),
          ]);

          toast.success("Visita iniciada y stock del local cargado", {
            id: toastId,
          });
        } catch (requestError) {
          const payload = getApiErrorPayload(requestError);

          if (isGpsOutOfRangeError(requestError)) {
            const distance = Number(
              payload?.distance ??
                payload?.distance_meters ??
                payload?.data?.distance ??
                payload?.data?.distance_meters
            );
            const maximumDistance = Number(
              payload?.maximumDistance ??
                payload?.maximum_distance ??
                payload?.data?.maximumDistance
            );

            setGpsRangeModal({
              isOpen: true,
              message: GPS_OUT_OF_RANGE_MESSAGE,
              distance: Number.isFinite(distance) ? distance : null,
              maximumDistance: Number.isFinite(maximumDistance)
                ? maximumDistance
                : 300,
            });
            toast.error(GPS_OUT_OF_RANGE_MESSAGE, {
              id: toastId,
              duration: 5000,
            });
          } else {
            toast.error(
              getErrorMessage(
                requestError,
                "No fue posible iniciar la visita regional."
              ),
              { id: toastId }
            );
          }
        } finally {
          setStartingRouteId("");
        }
      },
      (geolocationError) => {
        const message =
          geolocationError?.code === 1
            ? "Debes permitir el acceso a tu ubicación."
            : geolocationError?.code === 2
              ? "No fue posible determinar tu ubicación. Activa el GPS e inténtalo nuevamente."
              : geolocationError?.code === 3
                ? "La ubicación tardó demasiado en responder. Verifica la señal GPS."
                : "No fue posible obtener tu ubicación.";

        toast.error(message, { id: toastId });
        setStartingRouteId("");
      },
      {
        enableHighAccuracy: true,
        timeout: 20000,
        maximumAge: 0,
      }
    );
  };

  const handleStartPhoto = async () => {
    if (!startPhoto) {
      toast.error("Selecciona la fotografía de inicio.");
      return;
    }

    try {
      setUploadingStart(true);
      await uploadEvidence({ file: startPhoto, evidenceType: "JOURNEY_START" });
      setStartPhoto(null);
      await loadEvidence(journeyId);
      setFlowStep(2);
      toast.success("Fotografía de inicio registrada");
    } catch (requestError) {
      toast.error(
        getErrorMessage(requestError, "No fue posible subir la fotografía.")
      );
    } finally {
      setUploadingStart(false);
    }
  };

  const chooseProduct = (product) => {
    setSelectedProduct(product);
    setInitialShelfPhoto(null);
    setInitialShelfReady(false);
    setMovementQuantity("");
    setCurrentMovement(null);
    setFinalShelfPhoto(null);
  };

  const handleInitialShelfPhoto = async () => {
    if (!selectedProduct) {
      toast.error("Selecciona un producto.");
      return;
    }
    if (!initialShelfPhoto) {
      toast.error("Selecciona la fotografía inicial de góndola.");
      return;
    }

    try {
      setUploadingInitialShelf(true);
      await uploadEvidence({
        file: initialShelfPhoto,
        evidenceType: "BEFORE_REPLENISHMENT",
        productId: productIdOf(selectedProduct),
      });
      setInitialShelfReady(true);
      await loadEvidence(journeyId);
      setFlowStep(3);
      toast.success("Góndola inicial registrada");
    } catch (requestError) {
      toast.error(
        getErrorMessage(
          requestError,
          "No fue posible registrar la góndola inicial."
        )
      );
    } finally {
      setUploadingInitialShelf(false);
    }
  };

  const handleScan = (code) => {
    const normalized = String(code).trim().toLowerCase();
    const product = stock.find((item) =>
      [item?.barcode, item?.ean, item?.sku].some(
        (value) => String(value ?? "").trim().toLowerCase() === normalized
      )
    );

    if (!product) {
      toast.error(`El código ${code} no pertenece al stock de este local.`);
      return;
    }
    if (String(productIdOf(product)) !== String(productIdOf(selectedProduct))) {
      toast.error("El código escaneado no corresponde al producto seleccionado.");
      return;
    }

    setScannerOpen(false);
    if (unitOf(product) === "UN") {
      setMovementQuantity((current) => String((Number(current) || 0) + 1));
      toast.success("Producto escaneado: se agregó 1 unidad");
    } else {
      toast.success("Producto validado. Ingresa el peso en KG.");
    }
  };

  const handleMovement = async (event) => {
    event.preventDefault();
    const parsedQuantity = Number(movementQuantity);
    const available = Number(selectedProduct?.available_quantity) || 0;

    if (!initialShelfReady) {
      toast.error("Primero registra la fotografía inicial de góndola.");
      return;
    }
    if (!Number.isFinite(parsedQuantity) || parsedQuantity <= 0) {
      toast.error("Ingresa una cantidad mayor que cero.");
      return;
    }
    if (selectedUnit === "UN" && !Number.isInteger(parsedQuantity)) {
      toast.error("Los productos UN solo aceptan números enteros.");
      return;
    }
    if (parsedQuantity > available) {
      toast.error(
        `La cantidad supera el stock disponible (${quantity(available, selectedUnit)} ${selectedUnit}).`
      );
      return;
    }

    try {
      setRegisteringMovement(true);
      const response = await regionalInventoryService.createMovement({
        local_id: activeLocalId,
        product_id: productIdOf(selectedProduct),
        journey_id: journeyId,
        movement_type: "REPLENISHMENT",
        quantity: parsedQuantity,
        client_operation_id: movementOperationId,
        reason: null,
        metadata: { source: "FRONTEND", scanned: true },
      });

      setCurrentMovement({
        id: movementIdFrom(response),
        clientOperationId: movementOperationId,
        product: selectedProduct,
        quantity: parsedQuantity,
        offlinePending: Boolean(response?.queued),
      });
      await loadStock(activeLocalId);
      setFlowStep(4);
      toast.success("Reposición registrada. Falta la foto final de góndola.");
    } catch (requestError) {
      toast.error(
        getErrorMessage(requestError, "No fue posible registrar la reposición.")
      );
    } finally {
      setRegisteringMovement(false);
    }
  };

  const handleFinalShelfPhoto = async () => {
    if (!currentMovement) {
      toast.error("Primero registra la reposición.");
      return;
    }
    if (!finalShelfPhoto) {
      toast.error("Selecciona la fotografía final de góndola.");
      return;
    }

    try {
      setUploadingFinalShelf(true);
      await uploadEvidence({
        file: finalShelfPhoto,
        evidenceType: "AFTER_REPLENISHMENT",
        movementId: currentMovement.id,
        movementClientOperationId: currentMovement.clientOperationId,
        productId: productIdOf(currentMovement.product),
      });
      await loadEvidence(journeyId);
      setRegisteredProducts((current) => [
        ...current,
        {
          product: currentMovement.product,
          quantity: currentMovement.quantity,
        },
      ]);
      setFlowStep(5);
      toast.success("Fotografía final de góndola registrada");
    } catch (requestError) {
      toast.error(
        getErrorMessage(
          requestError,
          "No fue posible registrar la góndola final."
        )
      );
    } finally {
      setUploadingFinalShelf(false);
    }
  };

  const startAnotherProduct = () => {
    setSelectedProduct(null);
    setInitialShelfPhoto(null);
    setInitialShelfReady(false);
    setMovementQuantity("");
    setMovementOperationId(randomId());
    setCurrentMovement(null);
    setFinalShelfPhoto(null);
    setSearch("");
    setFlowStep(2);
  };

  const openWaste = () => {
    setWasteProductId("");
    setWasteQuantity("");
    setWasteReason("");
    setWastePhoto(null);
    setWasteOperationId(randomId());
    setWasteOpen(true);
  };

  const handleWaste = async (event) => {
    event.preventDefault();
    const product = stock.find(
      (item) => String(productIdOf(item)) === String(wasteProductId)
    );
    const parsedQuantity = Number(wasteQuantity);

    if (!product) {
      toast.error("Selecciona un producto.");
      return;
    }
    if (!Number.isFinite(parsedQuantity) || parsedQuantity <= 0) {
      toast.error("Ingresa una cantidad mayor que cero.");
      return;
    }
    if (unitOf(product) === "UN" && !Number.isInteger(parsedQuantity)) {
      toast.error("Los productos UN solo aceptan números enteros.");
      return;
    }
    if (parsedQuantity > (Number(product.available_quantity) || 0)) {
      toast.error("La merma supera el stock disponible.");
      return;
    }
    if (!wasteReason.trim()) {
      toast.error("Indica el motivo de la merma.");
      return;
    }
    if (!wastePhoto) {
      toast.error("La merma requiere una fotografía.");
      return;
    }

    try {
      setSubmittingWaste(true);
      const movementResponse = await regionalInventoryService.createMovement({
        local_id: activeLocalId,
        product_id: productIdOf(product),
        journey_id: journeyId,
        movement_type: "WASTE",
        quantity: parsedQuantity,
        client_operation_id: wasteOperationId,
        reason: wasteReason.trim(),
        metadata: { source: "FRONTEND" },
      });
      await uploadEvidence({
        file: wastePhoto,
        evidenceType: "WASTE",
        movementId: movementIdFrom(movementResponse),
        movementClientOperationId: wasteOperationId,
        productId: productIdOf(product),
      });
      await Promise.all([loadStock(activeLocalId), loadEvidence(journeyId)]);
      setWasteOpen(false);
      toast.success("Merma registrada correctamente");
    } catch (requestError) {
      toast.error(
        getErrorMessage(requestError, "No fue posible registrar la merma.")
      );
    } finally {
      setSubmittingWaste(false);
    }
  };

  const openClosing = () => {
    setPhysicalCounts(
      Object.fromEntries(
        stock.map((item) => [
          item?.balance_id,
          String(item?.available_quantity ?? 0),
        ])
      )
    );
    setClosingObservation("");
    setEndPhoto(null);
    setFlowStep(6);
  };

  const handleCloseJourney = async (event) => {
    event.preventDefault();
    if (!endPhoto) {
      toast.error("Selecciona la fotografía final de la jornada.");
      return;
    }

    try {
      setClosing(true);
      for (const item of stock) {
        const physical = Number(physicalCounts[item?.balance_id]);
        if (!Number.isFinite(physical) || physical < 0) {
          throw new Error(
            `Revisa el conteo físico de ${item?.sku ?? "un producto"}.`
          );
        }
        const system = Number(item?.available_quantity) || 0;
        await regionalInventoryService.createReconciliation({
          journey_id: journeyId,
          balance_id: item?.balance_id,
          physical_quantity: physical,
          difference_reason:
            physical === system
              ? null
              : closingObservation.trim() ||
                "Diferencia detectada en conteo físico",
        });
      }

      await uploadEvidence({ file: endPhoto, evidenceType: "JOURNEY_END" });
      const closeResponse =
        await regionalInventoryService.closeJourney(
          journeyId,
          closingObservation.trim() ||
            "Jornada finalizada desde la aplicación"
        );

      await regionalInventoryService.removeDraft(journeyId);

      setCompletedSummary({
        local: currentLocal ? localLabel(currentLocal) : "Local asignado",
        products: registeredProducts.length,
        evidences: evidence.length + 1,
        pendingSync: Boolean(closeResponse?.queued),
      });
      setJourney(null);
      setStock([]);
      setEvidence([]);
      setFlowStep(1);
      setRegisteredProducts([]);
      setSelectedProduct(null);
      setSelectedLocalId("");
      if (closeResponse?.queued) {
        toast.success(
          "Jornada guardada offline. Se sincronizará automáticamente al recuperar conexión."
        );
      } else {
        toast.success("Jornada cerrada correctamente");
      }
    } catch (requestError) {
      toast.error(
        getErrorMessage(requestError, "No fue posible cerrar la jornada.")
      );
    } finally {
      setClosing(false);
    }
  };

  const resetCompletion = async () => {
    setCompletedSummary(null);
    await loadInitialData();
  };

  const renderStockCards = (selectable = false) => (
    <div className="space-y-3">
      {stockLoading ? (
        <div className="flex min-h-36 items-center justify-center rounded-2xl bg-gray-50">
          <FiRefreshCw className="animate-spin text-[#87be00]" />
        </div>
      ) : visibleStock.length === 0 ? (
        <div className="flex min-h-36 flex-col items-center justify-center gap-3 rounded-2xl border border-gray-100 bg-gray-50 p-5 text-center">
          <FiBox className="text-gray-300" size={24} />
          <p className="text-sm font-black text-gray-700">Sin stock disponible</p>
        </div>
      ) : (
        visibleStock.map((item) => {
          const unit = unitOf(item);
          const active =
            String(productIdOf(item)) === String(productIdOf(selectedProduct));
          return (
            <button
              key={item?.balance_id ?? productIdOf(item)}
              type="button"
              disabled={!selectable}
              onClick={() => selectable && chooseProduct(item)}
              className={`flex w-full items-center gap-3 rounded-2xl border p-4 text-left transition ${
                active
                  ? "border-[#87be00] bg-[#87be00]/5 shadow-sm"
                  : "border-gray-100 bg-white"
              } ${selectable ? "hover:border-[#87be00]/40" : "cursor-default"}`}
            >
              <div
                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
                  active
                    ? "bg-[#87be00] text-white"
                    : "bg-gray-50 text-[#75a700]"
                }`}
              >
                {active ? <FiCheck /> : <FiPackage />}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[8px] font-black uppercase tracking-wider text-[#75a700]">
                  {item?.sku ?? "Sin SKU"}
                </p>
                <p className="mt-1 truncate text-xs font-black text-gray-900">
                  {item?.product_name ?? "Producto"}
                </p>
                <p className="mt-1 truncate text-[8px] font-semibold text-gray-400">
                  {item?.brand_name ?? item?.barcode ?? ""}
                </p>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-lg font-black text-gray-900">
                  {quantity(item?.available_quantity, unit)}
                </p>
                <p className="text-[7px] font-black uppercase text-gray-400">
                  Disponible {unit}
                </p>
              </div>
            </button>
          );
        })
      )}
    </div>
  );

  return (
    <div className="min-h-full bg-slate-50 px-4 pb-[calc(6rem+env(safe-area-inset-bottom))] pt-4 font-[Outfit] text-slate-900 sm:px-5 md:pb-10">
      {(!isOnline || offlineStats.totalCount > 0) && (
        <div
          className={`mx-auto mb-4 max-w-[620px] rounded-2xl border px-4 py-3 text-center text-[9px] font-black uppercase tracking-wider ${
            offlineStats.failedCount > 0
              ? "border-red-200 bg-red-50 text-red-700"
              : "border-amber-200 bg-amber-50 text-amber-700"
          }`}
        >
          {!isOnline
            ? `Modo offline activo · puedes continuar una jornada ya iniciada · ${offlineStats.totalCount} operación(es) pendiente(s)`
            : offlineStats.failedCount > 0
              ? `${offlineStats.failedCount} operación(es) requieren reintento`
              : `Sincronizando ${offlineStats.pendingCount} operación(es) regional(es) pendiente(s)`}
        </div>
      )}

      {gpsRangeModal.isOpen && (
        <div
          className="fixed inset-0 z-[12000] flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="regional-gps-range-modal-title"
        >
          <div className="w-full max-w-md overflow-hidden rounded-[2rem] border border-white/70 bg-white shadow-2xl">
            <div className="h-1.5 bg-red-500" />
            <div className="p-6 text-center sm:p-7">
              <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-[1.5rem] bg-red-50 text-red-500">
                <FiMapPin size={28} />
              </span>
              <p className="mt-5 text-[9px] font-black uppercase tracking-[0.22em] text-red-500">
                Validación GPS
              </p>
              <h2
                id="regional-gps-range-modal-title"
                className="mt-2 text-xl font-black tracking-tight text-slate-900"
              >
                Fuera del rango permitido
              </h2>
              <p className="mx-auto mt-3 max-w-sm text-sm font-semibold leading-relaxed text-slate-500">
                {gpsRangeModal.message}
              </p>

              {gpsRangeModal.distance !== null && (
                <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border border-red-100 bg-red-50 p-4">
                    <p className="text-[8px] font-black uppercase tracking-wider text-red-500">
                      Distancia actual
                    </p>
                    <p className="mt-1 text-xl font-black text-red-700">
                      {gpsRangeModal.distance} m
                    </p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-[8px] font-black uppercase tracking-wider text-slate-400">
                      Distancia permitida
                    </p>
                    <p className="mt-1 text-xl font-black text-slate-800">
                      {gpsRangeModal.maximumDistance ?? 300} m
                    </p>
                  </div>
                </div>
              )}

              <div className="mt-5 flex items-start gap-3 rounded-2xl border border-amber-100 bg-amber-50 p-4 text-left">
                <FiAlertTriangle
                  className="mt-0.5 shrink-0 text-amber-500"
                  size={17}
                />
                <p className="text-xs font-semibold leading-relaxed text-amber-800">
                  Acércate al local planificado y vuelve a intentar iniciar esta visita.
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setGpsRangeModal((current) => ({
                    ...current,
                    isOpen: false,
                  }))
                }
                className="mt-6 flex min-h-[52px] w-full items-center justify-center rounded-2xl bg-slate-900 px-5 text-[9px] font-black uppercase tracking-[0.18em] text-white shadow-lg shadow-slate-900/15 transition hover:bg-[#87be00] active:scale-[0.98]"
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}

      {journey && (
        <header className="sticky top-0 z-30 mx-auto mb-4 max-w-[620px] rounded-[2rem] border border-slate-200 bg-white/95 p-4 shadow-sm backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={loadInitialData}
              disabled={loading}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-slate-500"
            >
              <FiRefreshCw className={loading ? "animate-spin" : ""} />
            </button>
            <div className="min-w-0 flex-1 text-center">
              <p className="text-[8px] font-black uppercase tracking-[0.2em] text-[#87be00]">
                Flujo de visita regional
              </p>
              <p className="mt-1 truncate text-[10px] font-black text-slate-700">
                {currentLocal ? localLabel(currentLocal) : "Local asignado"}
              </p>
            </div>
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#87be00]/10 text-[#87be00]">
              <FiPackage size={18} />
            </div>
          </div>
          <div className="mt-4 flex gap-1.5">
            {FLOW_STEPS.map((step) => (
              <span
                key={step}
                className={`h-1.5 flex-1 rounded-full transition-all duration-500 ${
                  step <= flowStep ? "bg-[#87be00]" : "bg-slate-200"
                }`}
              />
            ))}
          </div>
          <div className="mt-2 flex items-center justify-between text-[7px] font-black uppercase tracking-wider text-slate-400">
            <span>
              Paso {flowStep} de {FLOW_STEPS.length}
            </span>
            <span>{Math.round((flowStep / FLOW_STEPS.length) * 100)}%</span>
          </div>
        </header>
      )}

      <main className="mx-auto max-w-[620px] space-y-4">
        {error && (
          <div className="flex items-start gap-3 rounded-2xl border border-red-100 bg-red-50 p-4 text-sm font-semibold text-red-600">
            <FiAlertTriangle className="mt-0.5 shrink-0" />
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3">
            <FiRefreshCw className="animate-spin text-[#87be00]" size={30} />
            <p className="text-[9px] font-black uppercase tracking-widest text-gray-400">
              Cargando jornada...
            </p>
          </div>
        ) : completedSummary ? (
          <section className="rounded-[2rem] border border-gray-100 bg-white p-7 text-center shadow-sm sm:p-9">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-[#87be00]/10 text-[#75a700]">
              <FiCheckCircle size={38} />
            </div>
            <p className="mt-6 text-[9px] font-black uppercase tracking-[0.24em] text-[#75a700]">
              Jornada completada
            </p>
            <h1 className="mt-2 text-2xl font-black">¡Gestión finalizada!</h1>
            <p className="mt-2 text-sm font-medium text-gray-500">
              {completedSummary.local}
            </p>
            {completedSummary.pendingSync && (
              <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-[9px] font-black uppercase tracking-wider text-amber-700">
                Cierre guardado offline · pendiente de sincronización
              </div>
            )}
            <div className="mt-6 grid grid-cols-2 gap-3">
              <MetricCard
                label="Productos gestionados"
                value={completedSummary.products}
              />
              <MetricCard
                label="Evidencias"
                value={completedSummary.evidences}
                tone="text-[#75a700]"
              />
            </div>
            <button
              type="button"
              onClick={resetCompletion}
              className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gray-900 px-5 py-4 text-[9px] font-black uppercase tracking-widest text-white"
            >
              <FiCheckCircle /> Volver al inicio
            </button>
          </section>
        ) : !journey ? (
          <RegionalPlanningHome
            locales={locales}
            onStartJourney={handleStartJourney}
            startingRouteId={startingRouteId}
          />
        ) : (
          <>
            <section className="rounded-[2rem] bg-slate-900 p-5 text-white shadow-xl shadow-slate-900/10">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-[#87be00]" />
                    <p className="text-[8px] font-black uppercase tracking-[0.24em] text-lime-300">
                      Jornada en curso
                    </p>
                  </div>
                  <h2 className="mt-3 text-lg font-black">
                    {currentLocal ? localLabel(currentLocal) : "Local asignado"}
                  </h2>
                  <p className="mt-1 text-[9px] font-bold uppercase tracking-wider text-slate-400">
                    Visita N.º {journey?.visit_number ?? 1}
                  </p>
                </div>
                <FiMapPin className="text-lime-300" size={22} />
              </div>
            </section>

            <section className="grid grid-cols-4 gap-2">
              <MetricCard label="UN" value={quantity(totals.UN, "UN")} />
              <MetricCard
                label="KG"
                value={quantity(totals.KG, "KG")}
                tone="text-blue-600"
              />
              <MetricCard label="Productos" value={stock.length} />
              <MetricCard
                label="Evidencias"
                value={evidence.length}
                tone="text-[#75a700]"
              />
            </section>

            <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-100 p-5">
                <div className="flex items-start gap-3">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#87be00]/10 text-[#87be00]">
                    <CurrentFlowIcon size={21} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[8px] font-black uppercase tracking-[0.2em] text-[#87be00]">
                      Etapa actual
                    </p>
                    <h1 className="mt-1 text-xl font-black tracking-tight text-slate-900">
                      {currentFlowInfo.title}
                    </h1>
                    <p className="mt-2 text-sm leading-relaxed text-slate-500">
                      {currentFlowInfo.subtitle}
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-5 sm:p-6">
                {flowStep === 1 && (
                  <div className="space-y-5">
                    <div className="rounded-2xl border border-amber-100 bg-amber-50 p-4 text-xs font-semibold leading-relaxed text-amber-700">
                      Toma una fotografía general del estado del local antes de
                      gestionar productos.
                    </div>
                    <FilePicker
                      file={startPhoto}
                      label="Fotografía de inicio"
                      onChange={setStartPhoto}
                    />
                    <button
                      type="button"
                      onClick={handleStartPhoto}
                      disabled={!startPhoto || uploadingStart}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#87be00] px-5 py-4 text-[9px] font-black uppercase tracking-widest text-white disabled:opacity-40"
                    >
                      {uploadingStart ? (
                        <FiRefreshCw className="animate-spin" />
                      ) : (
                        <FiCamera />
                      )}
                      {uploadingStart ? "Subiendo..." : "Registrar y continuar"}
                    </button>
                  </div>
                )}

                {flowStep === 2 && (
                  <div className="space-y-5">
                    <div className="relative">
                      <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" />
                      <input
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                        placeholder="Buscar SKU, EAN o producto..."
                        className="min-h-12 w-full rounded-xl border border-gray-100 bg-gray-50 pl-11 pr-4 text-[10px] font-bold outline-none focus:border-[#87be00]"
                      />
                    </div>
                    <div className="max-h-[360px] overflow-y-auto pr-1">
                      {renderStockCards(true)}
                    </div>
                    {selectedProduct && (
                      <div className="space-y-4 rounded-2xl border border-[#87be00]/30 bg-[#87be00]/5 p-4">
                        <p className="text-[9px] font-black uppercase tracking-wider text-[#6e9e00]">
                          {selectedProduct?.sku} · {selectedProduct?.product_name}
                        </p>
                        <FilePicker
                          file={initialShelfPhoto}
                          label="Fotografía inicial de góndola"
                          onChange={setInitialShelfPhoto}
                        />
                        <button
                          type="button"
                          onClick={handleInitialShelfPhoto}
                          disabled={
                            !initialShelfPhoto || uploadingInitialShelf
                          }
                          className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#87be00] px-5 py-4 text-[9px] font-black uppercase tracking-widest text-white disabled:opacity-40"
                        >
                          {uploadingInitialShelf ? (
                            <FiRefreshCw className="animate-spin" />
                          ) : (
                            <FiCamera />
                          )}
                          {uploadingInitialShelf
                            ? "Subiendo..."
                            : "Registrar góndola inicial"}
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {flowStep === 3 && selectedProduct && (
                  <form onSubmit={handleMovement} className="space-y-5">
                    <div className="rounded-2xl bg-gray-50 p-4">
                      <p className="text-[9px] font-black uppercase tracking-wider text-[#75a700]">
                        {selectedProduct?.sku}
                      </p>
                      <p className="mt-1 text-sm font-black text-gray-900">
                        {selectedProduct?.product_name}
                      </p>
                      <p className="mt-2 text-[9px] font-bold text-gray-400">
                        Disponible: {quantity(
                          selectedProduct?.available_quantity,
                          selectedUnit
                        )}{" "}
                        {selectedUnit}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setScannerOpen(true)}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-[#87be00] bg-[#87be00]/5 px-5 py-4 text-[9px] font-black uppercase tracking-widest text-[#6e9e00]"
                    >
                      <FiCamera /> Escanear EAN o SKU
                    </button>
                    <label className="block">
                      <span className="mb-2 block text-[8px] font-black uppercase tracking-widest text-gray-400">
                        Cantidad a reponer ({selectedUnit})
                      </span>
                      <input
                        type="number"
                        min="0"
                        max={selectedProduct?.available_quantity}
                        step={selectedUnit === "KG" ? "0.001" : "1"}
                        value={movementQuantity}
                        onChange={(event) =>
                          setMovementQuantity(event.target.value)
                        }
                        className="min-h-14 w-full rounded-2xl border border-gray-100 bg-gray-50 px-4 text-lg font-black outline-none focus:border-[#87be00]"
                      />
                    </label>
                    <button
                      type="submit"
                      disabled={registeringMovement}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#75a700] px-5 py-4 text-[9px] font-black uppercase tracking-widest text-white disabled:opacity-50"
                    >
                      {registeringMovement ? (
                        <FiRefreshCw className="animate-spin" />
                      ) : (
                        <FiTruck />
                      )}
                      {registeringMovement
                        ? "Registrando..."
                        : "Confirmar reposición"}
                    </button>
                  </form>
                )}

                {flowStep === 4 && currentMovement && (
                  <div className="space-y-5">
                    <div className="rounded-2xl border border-green-100 bg-green-50 p-4 text-xs font-semibold leading-relaxed text-green-700">
                      Reposición registrada: {quantity(
                        currentMovement.quantity,
                        unitOf(currentMovement.product)
                      )}{" "}
                      {unitOf(currentMovement.product)} de {currentMovement.product?.product_name}.
                    </div>
                    <FilePicker
                      file={finalShelfPhoto}
                      label="Fotografía final de góndola"
                      onChange={setFinalShelfPhoto}
                    />
                    <button
                      type="button"
                      onClick={handleFinalShelfPhoto}
                      disabled={!finalShelfPhoto || uploadingFinalShelf}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#87be00] px-5 py-4 text-[9px] font-black uppercase tracking-widest text-white disabled:opacity-40"
                    >
                      {uploadingFinalShelf ? (
                        <FiRefreshCw className="animate-spin" />
                      ) : (
                        <FiCamera />
                      )}
                      {uploadingFinalShelf
                        ? "Subiendo..."
                        : "Registrar góndola final"}
                    </button>
                  </div>
                )}

                {flowStep === 5 && (
                  <div className="space-y-4">
                    <div className="rounded-2xl border border-green-100 bg-green-50 p-4 text-center">
                      <FiCheckCircle
                        className="mx-auto text-green-600"
                        size={28}
                      />
                      <p className="mt-2 text-sm font-black text-green-800">
                        Producto gestionado correctamente
                      </p>
                      <p className="mt-1 text-[9px] font-semibold text-green-600">
                        Stock y evidencias actualizados
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={startAnotherProduct}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#87be00] px-5 py-4 text-[9px] font-black uppercase tracking-widest text-white"
                    >
                      <FiPackage /> Gestionar otro producto
                    </button>
                    <button
                      type="button"
                      onClick={openWaste}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-red-50 px-5 py-4 text-[9px] font-black uppercase tracking-widest text-red-500"
                    >
                      <FiMinusCircle /> Registrar merma
                    </button>
                    <button
                      type="button"
                      onClick={openClosing}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gray-900 px-5 py-4 text-[9px] font-black uppercase tracking-widest text-white"
                    >
                      <FiArrowRight /> Finalizar gestión de sala
                    </button>
                  </div>
                )}

                {flowStep === 6 && (
                  <form onSubmit={handleCloseJourney} className="space-y-5">
                    <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4 text-xs font-medium leading-relaxed text-blue-700">
                      Confirma el conteo físico final. Si no existe diferencia,
                      conserva la cantidad sugerida por el sistema.
                    </div>
                    <div className="max-h-72 space-y-3 overflow-y-auto pr-1">
                      {stock.map((item) => {
                        const unit = unitOf(item);
                        return (
                          <label
                            key={item?.balance_id ?? productIdOf(item)}
                            className="flex items-center gap-3 rounded-2xl border border-gray-100 p-3"
                          >
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-[9px] font-black text-gray-800">
                                {item?.sku} · {item?.product_name}
                              </p>
                              <p className="mt-1 text-[8px] text-gray-400">
                                Sistema: {quantity(item?.available_quantity, unit)}{" "}
                                {unit}
                              </p>
                            </div>
                            <input
                              type="number"
                              min="0"
                              step={unit === "KG" ? "0.001" : "1"}
                              value={physicalCounts[item?.balance_id] ?? ""}
                              onChange={(event) =>
                                setPhysicalCounts((current) => ({
                                  ...current,
                                  [item?.balance_id]: event.target.value,
                                }))
                              }
                              className="h-11 w-28 rounded-xl bg-gray-50 px-3 text-right text-xs font-black outline-none focus:ring-2 focus:ring-[#87be00]/20"
                            />
                          </label>
                        );
                      })}
                    </div>
                    <label className="block">
                      <span className="mb-2 block text-[8px] font-black uppercase tracking-widest text-gray-400">
                        Observación o motivo de diferencia
                      </span>
                      <textarea
                        value={closingObservation}
                        onChange={(event) =>
                          setClosingObservation(event.target.value)
                        }
                        rows="3"
                        placeholder="Observación opcional si todo cuadra"
                        className="w-full rounded-xl border border-gray-100 bg-gray-50 p-4 text-xs font-semibold outline-none focus:border-[#87be00]"
                      />
                    </label>
                    <FilePicker
                      file={endPhoto}
                      label="Fotografía final de la jornada"
                      onChange={setEndPhoto}
                    />
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setFlowStep(5)}
                        disabled={closing}
                        className="rounded-2xl bg-gray-100 px-4 py-4 text-[8px] font-black uppercase tracking-wider text-gray-600"
                      >
                        Volver
                      </button>
                      <button
                        type="submit"
                        disabled={closing}
                        className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gray-900 px-4 py-4 text-[8px] font-black uppercase tracking-wider text-white disabled:opacity-40"
                      >
                        {closing ? (
                          <FiRefreshCw className="animate-spin" />
                        ) : (
                          <FiCheckCircle />
                        )}
                        {closing ? "Cerrando..." : "Cerrar jornada"}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </section>
          </>
        )}
      </main>

      {scannerOpen && (
        <Modal title="Escanear producto" onClose={() => setScannerOpen(false)}>
          <Scanner onScanSuccess={handleScan} />
        </Modal>
      )}

      {wasteOpen && (
        <Modal
          title="Registrar merma"
          onClose={() => !submittingWaste && setWasteOpen(false)}
        >
          <form onSubmit={handleWaste} className="space-y-4">
            <label className="block">
              <span className="mb-2 block text-[8px] font-black uppercase tracking-widest text-gray-400">
                Producto
              </span>
              <select
                value={wasteProductId}
                onChange={(event) => setWasteProductId(event.target.value)}
                className="min-h-12 w-full rounded-xl border border-gray-100 bg-gray-50 px-4 text-xs font-bold outline-none focus:border-[#87be00]"
              >
                <option value="">Seleccionar producto</option>
                {stock.map((item) => (
                  <option
                    key={item?.balance_id ?? productIdOf(item)}
                    value={productIdOf(item)}
                  >
                    {item?.sku} · {item?.product_name} · {quantity(
                      item?.available_quantity,
                      unitOf(item)
                    )}{" "}
                    {unitOf(item)}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-2 block text-[8px] font-black uppercase tracking-widest text-gray-400">
                Cantidad
              </span>
              <input
                type="number"
                min="0"
                step={
                  unitOf(
                    stock.find(
                      (item) =>
                        String(productIdOf(item)) === String(wasteProductId)
                    )
                ) === "KG"
                  ? "0.001"
                  : "1"
                }
                value={wasteQuantity}
                onChange={(event) => setWasteQuantity(event.target.value)}
                className="min-h-12 w-full rounded-xl border border-gray-100 bg-gray-50 px-4 text-sm font-black outline-none focus:border-[#87be00]"
              />
            </label>
            <label className="block">
              <span className="mb-2 block text-[8px] font-black uppercase tracking-widest text-gray-400">
                Motivo de merma
              </span>
              <textarea
                value={wasteReason}
                onChange={(event) => setWasteReason(event.target.value)}
                rows="3"
                placeholder="Ej. Envase dañado"
                className="w-full rounded-xl border border-gray-100 bg-gray-50 p-4 text-xs font-semibold outline-none focus:border-[#87be00]"
              />
            </label>
            <FilePicker
              file={wastePhoto}
              label="Fotografía de la merma"
              onChange={setWastePhoto}
            />
            <button
              type="submit"
              disabled={submittingWaste}
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-red-500 px-5 py-4 text-[9px] font-black uppercase tracking-widest text-white disabled:opacity-50"
            >
              {submittingWaste ? (
                <FiRefreshCw className="animate-spin" />
              ) : (
                <FiMinusCircle />
              )}
              {submittingWaste ? "Registrando..." : "Confirmar merma"}
            </button>
          </form>
        </Modal>
      )}
    </div>
  );
};

export default RegionalWorkerDashboard;
