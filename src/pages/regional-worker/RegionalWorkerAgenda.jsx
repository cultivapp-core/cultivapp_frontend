import { useCallback, useEffect, useMemo, useState } from "react";
import {
  FiCalendar,
  FiCheckCircle,
  FiChevronLeft,
  FiChevronRight,
  FiClock,
  FiLoader,
  FiMapPin,
  FiNavigation,
  FiPackage,
  FiPlay,
  FiSend,
} from "react-icons/fi";
import toast from "react-hot-toast";
import api from "../../api/apiClient";
import { useAuth } from "../../context/AuthContext";
import regionalInventoryService from "../../services/regionalInventoryService";
import { getWeeksOfMonthCalendar } from "../../utils/helper";

const STATUS_CONFIG = {
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

const toLocalDateKey = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const routeDateKey = (value) => {
  if (!value) return "";
  const isoDate = String(value).match(/^\d{4}-\d{2}-\d{2}/)?.[0];
  if (isoDate) return isoDate;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? "" : toLocalDateKey(parsed);
};

const getWeekNumber = (date) => {
  const targetTime = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate()
  ).getTime();
  const foundWeek = getWeeksOfMonthCalendar(date).find((week) => {
    const start = new Date(week.start).setHours(0, 0, 0, 0);
    const end = new Date(week.end).setHours(23, 59, 59, 999);
    return targetTime >= start && targetTime <= end;
  });
  return foundWeek?.id ?? 1;
};

const getWeekDays = (date) => {
  const baseDate = new Date(date);
  const day = baseDate.getDay();
  const diff = baseDate.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(baseDate.setDate(diff));
  return Array.from({ length: 7 }, (_, index) => {
    const current = new Date(monday);
    current.setDate(monday.getDate() + index);
    return current;
  });
};

const extractRows = (response) => {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.data)) return response.data;
  if (Array.isArray(response?.data?.data)) return response.data.data;
  if (Array.isArray(response?.rows)) return response.rows;
  return [];
};

const localIdOf = (item) => item?.local_id ?? item?.id ?? "";

const unitOf = (item) =>
  String(item?.unit_type ?? "UN").toUpperCase() === "KG" ? "KG" : "UN";

const quantity = (value, unit = "UN") =>
  new Intl.NumberFormat("es-CL", {
    minimumFractionDigits: unit === "KG" ? 3 : 0,
    maximumFractionDigits: unit === "KG" ? 3 : 0,
  }).format(Number(value) || 0);

const summarizeStock = (items = []) =>
  items.reduce(
    (summary, item) => {
      summary[unitOf(item)] += Number(item?.available_quantity) || 0;
      summary.products += 1;
      return summary;
    },
    { UN: 0, KG: 0, products: 0 }
  );

const RegionalWorkerAgenda = ({ locales, onStartJourney, startingRouteId }) => {
  const { user } = useAuth();
  const [allTasks, setAllTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [stockByLocal, setStockByLocal] = useState({});
  const [stockLoadingByLocal, setStockLoadingByLocal] = useState({});

  const selectedDateKey = toLocalDateKey(selectedDate);
  const todayKey = toLocalDateKey(new Date());
  const isSelectedDateToday = selectedDateKey === todayKey;
  const isSelectedDatePast = selectedDateKey < todayKey;
  const assignedLocalIds = useMemo(
    () => new Set(locales.map((local) => String(localIdOf(local)))),
    [locales]
  );

  const fetchPlanning = useCallback(async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const response = await api.get(`/routes/user/${user.id}`);
      setAllTasks(extractRows(response));
    } catch (error) {
      if (error?.response?.status !== 401 && error?.status !== 401) {
        toast.error("No fue posible cargar tu planificación regional.");
      }
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchPlanning();
  }, [fetchPlanning]);

  const displayTasks = useMemo(() => {
    return allTasks.filter((task) => {
      if (!assignedLocalIds.has(String(task?.local_id ?? ""))) return false;
      if (task.visit_date) return routeDateKey(task.visit_date) === selectedDateKey;
      if (!task.is_recurring) return false;

      if (task.created_at) {
        const createdDate = new Date(task.created_at);
        if (
          !Number.isNaN(createdDate.getTime()) &&
          (createdDate.getMonth() !== selectedDate.getMonth() ||
            createdDate.getFullYear() !== selectedDate.getFullYear())
        ) {
          return false;
        }
      }

      const jsDay = selectedDate.getDay();
      const isoDay = jsDay === 0 ? 7 : jsDay;
      return (
        Number(task.week_number) === getWeekNumber(selectedDate) &&
        Number(task.day_of_week) === isoDay
      );
    });
  }, [allTasks, assignedLocalIds, selectedDate, selectedDateKey]);

  useEffect(() => {
    const localIds = [
      ...new Set(displayTasks.map((task) => String(task.local_id)).filter(Boolean)),
    ];
    const missingLocalIds = localIds.filter(
      (localId) => stockByLocal[localId] === undefined
    );
    if (missingLocalIds.length === 0) return;

    let active = true;
    setStockLoadingByLocal((current) => ({
      ...current,
      ...Object.fromEntries(missingLocalIds.map((localId) => [localId, true])),
    }));

    Promise.all(
      missingLocalIds.map(async (localId) => {
        try {
          const response = await regionalInventoryService.getMercaderistaStock(
            localId
          );
          return [localId, extractRows(response)];
        } catch {
          return [localId, []];
        }
      })
    ).then((results) => {
      if (!active) return;
      setStockByLocal((current) => ({ ...current, ...Object.fromEntries(results) }));
      setStockLoadingByLocal((current) => ({
        ...current,
        ...Object.fromEntries(results.map(([localId]) => [localId, false])),
      }));
    });

    return () => {
      active = false;
    };
  }, [displayTasks, stockByLocal]);

  const weekDays = useMemo(() => getWeekDays(selectedDate), [selectedDate]);

  const daySummary = useMemo(
    () =>
      displayTasks.reduce(
        (summary, task) => {
          const status = String(task.status || "PENDING").toUpperCase();
          if (status === "COMPLETED" || status === "FINALIZADO") {
            summary.completed += 1;
          } else if (status === "IN_PROGRESS" || status === "EN_PROCESO") {
            summary.inProgress += 1;
          } else {
            summary.pending += 1;
          }
          return summary;
        },
        { pending: 0, inProgress: 0, completed: 0 }
      ),
    [displayTasks]
  );

  const changeWeek = (offset) => {
    const nextDate = new Date(selectedDate);
    nextDate.setDate(nextDate.getDate() + offset * 7);
    setSelectedDate(nextDate);
  };

  if (loading && allTasks.length === 0) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
        <div className="h-11 w-11 animate-spin rounded-full border-4 border-slate-100 border-t-[#87be00]" />
        <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">
          Cargando planificación
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <section className="overflow-hidden rounded-[2rem] bg-slate-900 p-5 text-white shadow-xl shadow-slate-900/10">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[9px] font-black uppercase tracking-[0.24em] text-[#a8d52c]">
              Mi agenda regional
            </p>
            <h1 className="mt-2 text-2xl font-black tracking-tight capitalize">
              {selectedDate.toLocaleDateString("es-CL", {
                weekday: "long",
                day: "numeric",
                month: "long",
              })}
            </h1>
            <p className="mt-2 text-sm text-slate-400">
              {displayTasks.length === 1
                ? "1 visita programada"
                : `${displayTasks.length} visitas programadas`}
            </p>
          </div>
          {!isSelectedDateToday && (
            <button
              type="button"
              onClick={() => setSelectedDate(new Date())}
              className="shrink-0 rounded-xl bg-white/10 px-3 py-2 text-[8px] font-black uppercase tracking-wider text-white"
            >
              Hoy
            </button>
          )}
        </div>
        <div className="mt-5 grid grid-cols-3 gap-2">
          {[
            [daySummary.pending, "Pendientes", "text-amber-400"],
            [daySummary.inProgress, "En curso", "text-blue-400"],
            [daySummary.completed, "Completadas", "text-[#a8d52c]"],
          ].map(([value, label, tone]) => (
            <div key={label} className="rounded-2xl bg-white/5 p-3">
              <p className={`text-xl font-black ${tone}`}>{value}</p>
              <p className="mt-1 text-[8px] font-black uppercase tracking-wider text-slate-400">
                {label}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-[2rem] border border-slate-200 bg-white p-3 shadow-sm">
        <div className="mb-3 flex items-center justify-between px-1">
          <button
            type="button"
            onClick={() => changeWeek(-1)}
            aria-label="Semana anterior"
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-50 text-slate-500"
          >
            <FiChevronLeft size={17} />
          </button>
          <div className="text-center">
            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-[#87be00]">
              Semana
            </p>
            <p className="mt-0.5 text-[10px] font-black text-slate-700">
              {weekDays[0]?.toLocaleDateString("es-CL", {
                day: "2-digit",
                month: "short",
              })}{" "}
              —{" "}
              {weekDays[6]?.toLocaleDateString("es-CL", {
                day: "2-digit",
                month: "short",
              })}
            </p>
          </div>
          <button
            type="button"
            onClick={() => changeWeek(1)}
            aria-label="Semana siguiente"
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-50 text-slate-500"
          >
            <FiChevronRight size={17} />
          </button>
        </div>
        <div className="grid grid-cols-7 gap-1">
          {weekDays.map((date) => {
            const dateKey = toLocalDateKey(date);
            const isSelected = dateKey === selectedDateKey;
            const isToday = dateKey === todayKey;
            return (
              <button
                key={dateKey}
                type="button"
                onClick={() => setSelectedDate(date)}
                className={`relative flex min-h-[58px] flex-col items-center justify-center rounded-2xl transition-all ${
                  isSelected
                    ? "bg-slate-900 text-white shadow-lg shadow-slate-900/15"
                    : "text-slate-400 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                <span className="text-[7px] font-black uppercase tracking-wider">
                  {date
                    .toLocaleDateString("es-CL", { weekday: "short" })
                    .replace(".", "")
                    .slice(0, 2)}
                </span>
                <span className="mt-1 text-sm font-black">{date.getDate()}</span>
                {isToday && (
                  <span
                    className={`absolute bottom-1.5 h-1.5 w-1.5 rounded-full ${
                      isSelected ? "bg-[#a8d52c]" : "bg-[#87be00]"
                    }`}
                  />
                )}
              </button>
            );
          })}
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between px-1">
          <div>
            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-[#87be00]">
              Planificación
            </p>
            <h2 className="mt-1 text-lg font-black tracking-tight text-slate-900">
              Visitas del día
            </h2>
          </div>
          <span className="rounded-xl bg-white px-3 py-2 text-[9px] font-black uppercase tracking-wider text-slate-500 shadow-sm">
            {displayTasks.length}
          </span>
        </div>

        {displayTasks.length === 0 ? (
          <div className="flex min-h-[260px] flex-col items-center justify-center rounded-[2rem] border border-dashed border-slate-200 bg-white p-8 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-slate-300">
              <FiCalendar size={28} />
            </div>
            <p className="mt-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
              Sin visitas programadas
            </p>
            <p className="mt-2 max-w-xs text-sm text-slate-500">
              No tienes locales regionales asignados para la fecha seleccionada.
            </p>
          </div>
        ) : (
          displayTasks.map((task) => {
            const status = String(task.status || "PENDING").toUpperCase();
            const statusConfig = STATUS_CONFIG[status] ?? STATUS_CONFIG.PENDING;
            const isPending = status === "PENDING" || status === "PENDIENTE";
            const isInProgress =
              status === "IN_PROGRESS" || status === "EN_PROCESO";
            const isCompleted =
              status === "COMPLETED" || status === "FINALIZADO";
            const canOpenVisit =
              isSelectedDateToday && (isPending || isInProgress);
            const isStarting = String(startingRouteId) === String(task.id);
            const localId = String(task.local_id ?? "");
            const stockItems = stockByLocal[localId] ?? [];
            const stockSummary = summarizeStock(stockItems);
            const stockLoading = stockLoadingByLocal[localId];
            const mapsQuery =
              task.local_lat && task.local_lng
                ? `${task.local_lat},${task.local_lng}`
                : task.direccion || "";

            return (
              <article
                key={task.id}
                className={`overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm transition ${
                  isCompleted ? "opacity-80" : "hover:shadow-md"
                }`}
              >
                <div className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[8px] font-black uppercase tracking-wider ${statusConfig.badge}`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${statusConfig.dot} ${
                              isInProgress ? "animate-pulse" : ""
                            }`}
                          />
                          {statusConfig.label}
                        </span>
                        <span className="inline-flex items-center gap-1.5 text-[9px] font-black text-[#87be00]">
                          <FiClock size={12} />
                          {task.start_time?.slice(0, 5) || "--:--"}
                          {task.end_time && ` — ${task.end_time.slice(0, 5)}`}
                        </span>
                      </div>
                      <h3 className="mt-3 truncate text-lg font-black tracking-tight text-slate-900">
                        {task.cadena || task.nombre_local || "Local asignado"}
                      </h3>
                      <p className="mt-2 flex items-start gap-2 text-[10px] font-bold leading-relaxed text-slate-500">
                        <FiMapPin
                          size={13}
                          className="mt-0.5 shrink-0 text-slate-400"
                        />
                        <span className="line-clamp-2">
                          {task.direccion || "Dirección no disponible"}
                          {task.comuna_name ? `, ${task.comuna_name}` : ""}
                        </span>
                      </p>
                    </div>
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-50 text-slate-400">
                      <FiNavigation size={18} />
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-4">
                    <span className="rounded-lg border border-blue-100 bg-blue-50 px-2.5 py-1 text-[8px] font-black uppercase tracking-wider text-blue-600">
                      Visita {task.visit_number || "S/N"}
                    </span>
                    {(task.codigo_local || task.local_code) && (
                      <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-[8px] font-black uppercase tracking-wider text-slate-500">
                        Código {task.codigo_local || task.local_code}
                      </span>
                    )}
                  </div>

                  <div className="mt-4 rounded-2xl border border-[#87be00]/15 bg-[#87be00]/5 p-3">
                    <div className="flex items-center gap-2">
                      <FiPackage className="text-[#75a700]" />
                      <p className="text-[8px] font-black uppercase tracking-[0.16em] text-[#6e9e00]">
                        Stock disponible del local
                      </p>
                    </div>
                    {stockLoading ? (
                      <div className="mt-3 flex items-center gap-2 text-[9px] font-bold text-slate-400">
                        <FiLoader className="animate-spin" /> Cargando stock...
                      </div>
                    ) : (
                      <div className="mt-3 grid grid-cols-3 gap-2">
                        <div className="rounded-xl bg-white p-2.5">
                          <p className="text-[7px] font-black uppercase text-slate-400">
                            Disponible UN
                          </p>
                          <p className="mt-1 text-sm font-black text-slate-900">
                            {quantity(stockSummary.UN, "UN")}
                          </p>
                        </div>
                        <div className="rounded-xl bg-white p-2.5">
                          <p className="text-[7px] font-black uppercase text-slate-400">
                            Disponible KG
                          </p>
                          <p className="mt-1 text-sm font-black text-blue-600">
                            {quantity(stockSummary.KG, "KG")}
                          </p>
                        </div>
                        <div className="rounded-xl bg-white p-2.5">
                          <p className="text-[7px] font-black uppercase text-slate-400">
                            Productos
                          </p>
                          <p className="mt-1 text-sm font-black text-slate-900">
                            {stockSummary.products}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex gap-2 border-t border-slate-100 bg-slate-50/70 p-3">
                  {isCompleted ? (
                    <div className="flex min-h-[50px] flex-1 items-center justify-center gap-2 rounded-2xl border border-[#87be00]/20 bg-[#87be00]/10 px-4 text-[9px] font-black uppercase tracking-wider text-[#87be00]">
                      <FiCheckCircle size={16} /> Jornada finalizada
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => onStartJourney(task)}
                      disabled={!canOpenVisit || isStarting}
                      className={`flex min-h-[50px] flex-1 items-center justify-center gap-2 rounded-2xl px-4 text-[9px] font-black uppercase tracking-wider transition ${
                        canOpenVisit
                          ? "bg-slate-900 text-white shadow-lg shadow-slate-900/10 hover:bg-[#87be00]"
                          : "cursor-not-allowed border border-slate-200 bg-slate-100 text-slate-400"
                      }`}
                    >
                      {isStarting ? (
                        <>
                          <FiLoader size={16} className="animate-spin" />
                          Iniciando
                        </>
                      ) : canOpenVisit ? (
                        <>
                          {isInProgress ? <FiSend size={16} /> : <FiPlay size={16} />}
                          {isInProgress ? "Continuar visita" : "Iniciar visita"}
                        </>
                      ) : (
                        <>
                          <FiClock size={16} />
                          {isSelectedDatePast
                            ? "Visita pasada"
                            : "Disponible el día programado"}
                        </>
                      )}
                    </button>
                  )}
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                      mapsQuery
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Abrir ubicación en Google Maps"
                    className="flex h-[50px] w-[50px] shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 transition hover:border-[#87be00]/40 hover:bg-[#87be00]/10 hover:text-[#87be00]"
                  >
                    <FiMapPin size={18} />
                  </a>
                </div>
              </article>
            );
          })
        )}
      </section>

      {loading && allTasks.length > 0 && (
        <div className="flex items-center justify-center gap-2 py-3 text-[9px] font-black uppercase tracking-wider text-slate-400">
          <FiLoader size={14} className="animate-spin text-[#87be00]" />
          Actualizando agenda
        </div>
      )}
    </div>
  );
};

export default RegionalWorkerAgenda;