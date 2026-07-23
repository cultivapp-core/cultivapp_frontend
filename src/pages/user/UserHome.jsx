import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  useNavigate,
} from "react-router-dom";
import {
  FiAlertCircle,
  FiCalendar,
  FiCheckCircle,
  FiChevronLeft,
  FiChevronRight,
  FiClock,
  FiLoader,
  FiMapPin,
  FiNavigation,
  FiPlay,
  FiSend,
} from "react-icons/fi";
import toast from "react-hot-toast";

import api from "../../api/apiClient";
import { useAuth } from "../../context/AuthContext";
import { getWeeksOfMonthCalendar } from "../../utils/helper";

const STATUS_CONFIG = {
  PENDING: {
    label: "Pendiente",
    badge:
      "border-amber-100 bg-amber-50 text-amber-600",
    dot: "bg-amber-400",
  },
  PENDIENTE: {
    label: "Pendiente",
    badge:
      "border-amber-100 bg-amber-50 text-amber-600",
    dot: "bg-amber-400",
  },
  IN_PROGRESS: {
    label: "En curso",
    badge:
      "border-blue-100 bg-blue-50 text-blue-600",
    dot: "bg-blue-500",
  },
  EN_PROCESO: {
    label: "En curso",
    badge:
      "border-blue-100 bg-blue-50 text-blue-600",
    dot: "bg-blue-500",
  },
  COMPLETED: {
    label: "Completada",
    badge:
      "border-[#87be00]/20 bg-[#87be00]/10 text-[#87be00]",
    dot: "bg-[#87be00]",
  },
  FINALIZADO: {
    label: "Completada",
    badge:
      "border-[#87be00]/20 bg-[#87be00]/10 text-[#87be00]",
    dot: "bg-[#87be00]",
  },
};

const UserHome = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [allTasks, setAllTasks] =
    useState([]);
  const [
    displayTasks,
    setDisplayTasks,
  ] = useState([]);
  const [loading, setLoading] =
    useState(true);
  const [
    actionLoading,
    setActionLoading,
  ] = useState(null);
  const [
    selectedDate,
    setSelectedDate,
  ] = useState(new Date());

  const toLocalDateKey = (
    date,
  ) => {
    const year =
      date.getFullYear();
    const month = String(
      date.getMonth() + 1,
    ).padStart(2, "0");
    const day = String(
      date.getDate(),
    ).padStart(2, "0");

    return `${year}-${month}-${day}`;
  };

  const safeSelectedDate =
    selectedDate instanceof Date &&
    !Number.isNaN(
      selectedDate.getTime(),
    )
      ? selectedDate
      : new Date();

  const todayKey =
    toLocalDateKey(new Date());

  const selectedDateKey =
    toLocalDateKey(
      safeSelectedDate,
    );

  const isSelectedDateToday =
    selectedDateKey === todayKey;

  const isSelectedDatePast =
    selectedDateKey < todayKey;

  const isSelectedDateFuture =
    selectedDateKey > todayKey;

  const getWeekNumber = (
    date,
  ) => {
    const weeks =
      getWeeksOfMonthCalendar(
        date,
      );

    const targetTime =
      new Date(
        date.getFullYear(),
        date.getMonth(),
        date.getDate(),
      ).getTime();

    const foundWeek =
      weeks.find((week) => {
        const start =
          new Date(
            week.start,
          ).setHours(
            0,
            0,
            0,
            0,
          );

        const end =
          new Date(
            week.end,
          ).setHours(
            23,
            59,
            59,
            999,
          );

        return (
          targetTime >= start &&
          targetTime <= end
        );
      });

    return foundWeek
      ? foundWeek.id
      : 1;
  };

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

  const fetchData =
    useCallback(async () => {
      const token =
        localStorage.getItem(
          "token",
        );

      if (!token || !user?.id) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);

        const response =
          await api.get(
            `/routes/user/${user.id}`,
          );

        setAllTasks(
          extractRows(response),
        );
      } catch (error) {
        if (
          error?.response?.status !==
            401 &&
          error?.status !== 401
        ) {
          toast.error(
            "Error al cargar agenda",
          );
        }
      } finally {
        setLoading(false);
      }
    }, [user?.id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    const filtered =
      allTasks.filter((task) => {
        if (task.visit_date) {
          const taskDate =
            new Date(
              task.visit_date,
            );

          return (
            !Number.isNaN(
              taskDate.getTime(),
            ) &&
            toLocalDateKey(
              taskDate,
            ) ===
              selectedDateKey
          );
        }

        if (
          task.is_recurring
        ) {
          if (
            task.created_at
          ) {
            const createdDate =
              new Date(
                task.created_at,
              );

            const isSameMonth =
              safeSelectedDate.getMonth() ===
                createdDate.getMonth() &&
              safeSelectedDate.getFullYear() ===
                createdDate.getFullYear();

            if (!isSameMonth) {
              return false;
            }
          }

          const currentWeek =
            getWeekNumber(
              safeSelectedDate,
            );

          const jsDay =
            safeSelectedDate.getDay();

          const isoDay =
            jsDay === 0
              ? 7
              : jsDay;

          return (
            Number(
              task.week_number,
            ) === currentWeek &&
            Number(
              task.day_of_week,
            ) === isoDay
          );
        }

        return false;
      });

    setDisplayTasks(filtered);
  }, [
    allTasks,
    selectedDateKey,
  ]);

  const getWeekDays = (
    date,
  ) => {
    const days = [];
    const baseDate =
      new Date(date);
    const day =
      baseDate.getDay();

    const diff =
      baseDate.getDate() -
      day +
      (day === 0 ? -6 : 1);

    const monday =
      new Date(
        baseDate.setDate(diff),
      );

    for (
      let index = 0;
      index < 7;
      index += 1
    ) {
      const current =
        new Date(monday);

      current.setDate(
        monday.getDate() +
          index,
      );

      days.push(current);
    }

    return days;
  };

  const weekDays = useMemo(
    () =>
      getWeekDays(
        safeSelectedDate,
      ),
    [selectedDateKey],
  );

  const daySummary = useMemo(() => {
    return displayTasks.reduce(
      (summary, task) => {
        const status =
          String(
            task.status || "",
          ).toUpperCase();

        if (
          status ===
            "COMPLETED" ||
          status ===
            "FINALIZADO"
        ) {
          summary.completed += 1;
        } else if (
          status ===
            "IN_PROGRESS" ||
          status ===
            "EN_PROCESO"
        ) {
          summary.inProgress += 1;
        } else {
          summary.pending += 1;
        }

        return summary;
      },
      {
        pending: 0,
        inProgress: 0,
        completed: 0,
      },
    );
  }, [displayTasks]);

  const changeWeek = (
    offset,
  ) => {
    const nextDate =
      new Date(
        safeSelectedDate,
      );

    nextDate.setDate(
      nextDate.getDate() +
        offset * 7,
    );

    setSelectedDate(
      nextDate,
    );
  };

  const goToToday = () => {
    setSelectedDate(
      new Date(),
    );
  };

  const handleStartVisit =
    async (taskId) => {
      if (
        !isSelectedDateToday
      ) {
        toast.error(
          isSelectedDatePast
            ? "No puedes iniciar una visita pasada"
            : "La visita solo se puede iniciar el día programado",
        );
        return;
      }

      if (
        !navigator.geolocation
      ) {
        toast.error(
          "GPS no disponible",
        );
        return;
      }

      setActionLoading(
        taskId,
      );

      const toastId =
        toast.loading(
          "Validando ubicación...",
        );

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          try {
            await api.post(
              `/routes/${taskId}/check-in`,
              {
                lat_in:
                  position.coords
                    .latitude,
                lng_in:
                  position.coords
                    .longitude,
              },
            );

            toast.success(
              "Visita iniciada",
              {
                id: toastId,
              },
            );

            navigate(
              `/usuario/reporte/${taskId}`,
            );
          } catch (error) {
            toast.error(
              error?.response?.data
                ?.message ||
                error?.data
                  ?.message ||
                "Error al iniciar la visita",
              {
                id: toastId,
              },
            );
          } finally {
            setActionLoading(
              null,
            );
          }
        },
        (error) => {
          const message =
            error?.code === 1
              ? "Debes permitir el acceso a tu ubicación"
              : "No fue posible obtener tu ubicación";

          toast.error(
            message,
            {
              id: toastId,
            },
          );

          setActionLoading(
            null,
          );
        },
        {
          enableHighAccuracy:
            true,
          timeout: 15000,
          maximumAge: 0,
        },
      );
    };

  if (
    !user ||
    (loading &&
      allTasks.length === 0)
  ) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <div className="h-11 w-11 animate-spin rounded-full border-4 border-slate-100 border-t-[#87be00]" />

          <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">
            Cargando agenda
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-slate-50 px-4 pb-[calc(6rem+env(safe-area-inset-bottom))] pt-5 font-[Outfit] sm:px-5 md:px-6 md:pb-10">
      <div className="mx-auto flex w-full max-w-[760px] flex-col gap-5">
        {/* RESUMEN DEL DÍA */}
        <section className="overflow-hidden rounded-[2rem] bg-slate-900 p-5 text-white shadow-xl shadow-slate-900/10">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-[9px] font-black uppercase tracking-[0.24em] text-[#a8d52c]">
                Mi agenda
              </p>

              <h1 className="mt-2 text-2xl font-black tracking-tight">
                {safeSelectedDate.toLocaleDateString(
                  "es-CL",
                  {
                    weekday:
                      "long",
                    day: "numeric",
                    month: "long",
                  },
                )}
              </h1>

              <p className="mt-2 text-sm text-slate-400">
                {displayTasks.length ===
                1
                  ? "1 visita programada"
                  : `${displayTasks.length} visitas programadas`}
              </p>
            </div>

            {!isSelectedDateToday && (
              <button
                type="button"
                onClick={goToToday}
                className="shrink-0 rounded-xl bg-white/10 px-3 py-2 text-[8px] font-black uppercase tracking-wider text-white transition hover:bg-white/20"
              >
                Hoy
              </button>
            )}
          </div>

          <div className="mt-5 grid grid-cols-3 gap-2">
            <div className="rounded-2xl bg-white/5 p-3">
              <p className="text-xl font-black text-amber-400">
                {daySummary.pending}
              </p>

              <p className="mt-1 text-[8px] font-black uppercase tracking-wider text-slate-400">
                Pendientes
              </p>
            </div>

            <div className="rounded-2xl bg-white/5 p-3">
              <p className="text-xl font-black text-blue-400">
                {daySummary.inProgress}
              </p>

              <p className="mt-1 text-[8px] font-black uppercase tracking-wider text-slate-400">
                En curso
              </p>
            </div>

            <div className="rounded-2xl bg-white/5 p-3">
              <p className="text-xl font-black text-[#a8d52c]">
                {daySummary.completed}
              </p>

              <p className="mt-1 text-[8px] font-black uppercase tracking-wider text-slate-400">
                Completadas
              </p>
            </div>
          </div>
        </section>

        {/* SELECTOR SEMANAL */}
        <section className="rounded-[2rem] border border-slate-200 bg-white p-3 shadow-sm">
          <div className="mb-3 flex items-center justify-between px-1">
            <button
              type="button"
              onClick={() =>
                changeWeek(-1)
              }
              aria-label="Semana anterior"
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-50 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
            >
              <FiChevronLeft
                size={17}
              />
            </button>

            <div className="text-center">
              <p className="text-[9px] font-black uppercase tracking-[0.2em] text-[#87be00]">
                Semana
              </p>

              <p className="mt-0.5 text-[10px] font-black text-slate-700">
                {weekDays[0]?.toLocaleDateString(
                  "es-CL",
                  {
                    day: "2-digit",
                    month:
                      "short",
                  },
                )}{" "}
                —{" "}
                {weekDays[6]?.toLocaleDateString(
                  "es-CL",
                  {
                    day: "2-digit",
                    month:
                      "short",
                  },
                )}
              </p>
            </div>

            <button
              type="button"
              onClick={() =>
                changeWeek(1)
              }
              aria-label="Semana siguiente"
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-50 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
            >
              <FiChevronRight
                size={17}
              />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1">
            {weekDays.map(
              (date) => {
                const dateKey =
                  toLocalDateKey(
                    date,
                  );

                const isSelected =
                  dateKey ===
                  selectedDateKey;

                const isToday =
                  dateKey ===
                  todayKey;

                return (
                  <button
                    key={dateKey}
                    type="button"
                    onClick={() =>
                      setSelectedDate(
                        date,
                      )
                    }
                    className={`
                      relative flex min-h-[58px]
                      flex-col items-center
                      justify-center rounded-2xl
                      transition-all

                      ${
                        isSelected
                          ? `
                            bg-slate-900
                            text-white
                            shadow-lg
                            shadow-slate-900/15
                          `
                          : `
                            text-slate-400
                            hover:bg-slate-50
                            hover:text-slate-900
                          `
                      }
                    `}
                  >
                    <span className="text-[7px] font-black uppercase tracking-wider">
                      {date
                        .toLocaleDateString(
                          "es-CL",
                          {
                            weekday:
                              "short",
                          },
                        )
                        .replace(
                          ".",
                          "",
                        )
                        .slice(0, 2)}
                    </span>

                    <span className="mt-1 text-sm font-black">
                      {date.getDate()}
                    </span>

                    {isToday && (
                      <span
                        className={`
                          absolute bottom-1.5
                          h-1.5 w-1.5
                          rounded-full

                          ${
                            isSelected
                              ? "bg-[#a8d52c]"
                              : "bg-[#87be00]"
                          }
                        `}
                      />
                    )}
                  </button>
                );
              },
            )}
          </div>
        </section>

        {/* VISITAS */}
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

          {displayTasks.length ===
          0 ? (
            <div className="flex min-h-[260px] flex-col items-center justify-center rounded-[2rem] border border-dashed border-slate-200 bg-white p-8 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-slate-300">
                <FiCalendar
                  size={28}
                />
              </div>

              <p className="mt-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                Sin visitas programadas
              </p>

              <p className="mt-2 max-w-xs text-sm text-slate-500">
                No tienes locales asignados para la fecha seleccionada.
              </p>
            </div>
          ) : (
            displayTasks.map(
              (task) => {
                const status =
                  String(
                    task.status ||
                      "PENDING",
                  ).toUpperCase();

                const statusConfig =
                  STATUS_CONFIG[
                    status
                  ] ||
                  STATUS_CONFIG.PENDING;

                const isPending =
                  status ===
                    "PENDING" ||
                  status ===
                    "PENDIENTE";

                const isInProgress =
                  status ===
                    "IN_PROGRESS" ||
                  status ===
                    "EN_PROCESO";

                const isCompleted =
                  status ===
                    "COMPLETED" ||
                  status ===
                    "FINALIZADO";

                const canStartVisit =
                  isPending &&
                  isSelectedDateToday;

                const isStarting =
                  actionLoading ===
                  task.id;

                const unavailableLabel =
                  isSelectedDatePast
                    ? "Visita pasada"
                    : isSelectedDateFuture
                      ? "Disponible el día programado"
                      : "No disponible";

                const mapsQuery =
                  task.lat &&
                  task.lng
                    ? `${task.lat},${task.lng}`
                    : task.direccion ||
                      "";

                return (
                  <article
                    key={task.id}
                    className={`
                      overflow-hidden rounded-[2rem]
                      border border-slate-200
                      bg-white shadow-sm
                      transition

                      ${
                        isCompleted
                          ? "opacity-80"
                          : "hover:shadow-md"
                      }
                    `}
                  >
                    <div className="p-5">
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span
                              className={`
                                inline-flex items-center
                                gap-1.5 rounded-lg
                                border px-2.5 py-1
                                text-[8px] font-black
                                uppercase tracking-wider
                                ${statusConfig.badge}
                              `}
                            >
                              <span
                                className={`
                                  h-1.5 w-1.5
                                  rounded-full
                                  ${statusConfig.dot}
                                  ${
                                    isInProgress
                                      ? "animate-pulse"
                                      : ""
                                  }
                                `}
                              />

                              {statusConfig.label}
                            </span>

                            <span className="inline-flex items-center gap-1.5 text-[9px] font-black text-[#87be00]">
                              <FiClock
                                size={12}
                              />

                              {task.start_time?.slice(
                                0,
                                5,
                              ) ||
                                "--:--"}

                              {task.end_time &&
                                ` — ${task.end_time.slice(
                                  0,
                                  5,
                                )}`}
                            </span>
                          </div>

                          <h3 className="mt-3 truncate text-lg font-black tracking-tight text-slate-900">
                            {task.cadena ||
                              "Local asignado"}
                          </h3>

                          <p className="mt-2 flex items-start gap-2 text-[10px] font-bold leading-relaxed text-slate-500">
                            <FiMapPin
                              size={13}
                              className="mt-0.5 shrink-0 text-slate-400"
                            />

                            <span className="line-clamp-2">
                              {task.direccion ||
                                "Dirección no disponible"}
                            </span>
                          </p>
                        </div>

                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-50 text-slate-400">
                          <FiNavigation
                            size={18}
                          />
                        </div>
                      </div>

                      <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-4">
                        <span className="rounded-lg border border-blue-100 bg-blue-50 px-2.5 py-1 text-[8px] font-black uppercase tracking-wider text-blue-600">
                          Visita{" "}
                          {task.visit_number ||
                            "S/N"}
                        </span>

                        {task.codigo_local && (
                          <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-[8px] font-black uppercase tracking-wider text-slate-500">
                            Código{" "}
                            {task.codigo_local}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex gap-2 border-t border-slate-100 bg-slate-50/70 p-3">
                      {isCompleted ? (
                        <div className="flex min-h-[50px] flex-1 items-center justify-center gap-2 rounded-2xl border border-[#87be00]/20 bg-[#87be00]/10 px-4 text-[9px] font-black uppercase tracking-wider text-[#87be00]">
                          <FiCheckCircle
                            size={16}
                          />
                          Reporte finalizado
                        </div>
                      ) : isPending ? (
                        <button
                          type="button"
                          onClick={() =>
                            handleStartVisit(
                              task.id,
                            )
                          }
                          disabled={
                            !canStartVisit ||
                            isStarting
                          }
                          className={`
                            flex min-h-[50px]
                            flex-1 items-center
                            justify-center gap-2
                            rounded-2xl px-4
                            text-[9px] font-black
                            uppercase tracking-wider
                            transition

                            ${
                              canStartVisit
                                ? `
                                  bg-slate-900
                                  text-white
                                  shadow-lg
                                  shadow-slate-900/10
                                  hover:bg-[#87be00]
                                `
                                : `
                                  cursor-not-allowed
                                  border
                                  border-slate-200
                                  bg-slate-100
                                  text-slate-400
                                `
                            }
                          `}
                        >
                          {isStarting ? (
                            <>
                              <FiLoader
                                size={16}
                                className="animate-spin"
                              />
                              Validando
                            </>
                          ) : canStartVisit ? (
                            <>
                              <FiPlay
                                size={16}
                              />
                              Iniciar visita
                            </>
                          ) : (
                            <>
                              <FiClock
                                size={16}
                              />
                              {unavailableLabel}
                            </>
                          )}
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() =>
                            navigate(
                              `/usuario/reporte/${task.id}`,
                            )
                          }
                          className="flex min-h-[50px] flex-1 items-center justify-center gap-2 rounded-2xl bg-blue-600 px-4 text-[9px] font-black uppercase tracking-wider text-white shadow-lg shadow-blue-600/15 transition hover:bg-blue-700"
                        >
                          <FiSend
                            size={16}
                          />
                          Continuar visita
                        </button>
                      )}

                      <a
                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                          mapsQuery,
                        )}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label="Abrir ubicación en Google Maps"
                        className="flex h-[50px] w-[50px] shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 transition hover:border-[#87be00]/40 hover:bg-[#87be00]/10 hover:text-[#87be00]"
                      >
                        <FiMapPin
                          size={18}
                        />
                      </a>
                    </div>
                  </article>
                );
              },
            )
          )}
        </section>

        {loading &&
          allTasks.length > 0 && (
            <div className="flex items-center justify-center gap-2 py-3 text-[9px] font-black uppercase tracking-wider text-slate-400">
              <FiLoader
                size={14}
                className="animate-spin text-[#87be00]"
              />
              Actualizando agenda
            </div>
          )}
      </div>
    </div>
  );
};

export default UserHome;