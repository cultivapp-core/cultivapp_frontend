import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
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
} from "react-icons/fi";
import Calendar from "react-calendar";
import {
  format,
  isSameDay,
} from "date-fns";
import { es } from "date-fns/locale";
import { useNavigate } from "react-router-dom";

import api from "../../api/apiClient";
import { useAuth } from "../../context/AuthContext";
import { getWeeksOfMonthCalendar } from "../../utils/helper";

import "react-calendar/dist/Calendar.css";

const STATUS_CONFIG = {
  PENDING: {
    label: "Pendiente",
    icon: FiClock,
    badge:
      "border-amber-100 bg-amber-50 text-amber-600",
    iconBox:
      "bg-amber-50 text-amber-500",
    dot: "bg-amber-400",
  },
  PENDIENTE: {
    label: "Pendiente",
    icon: FiClock,
    badge:
      "border-amber-100 bg-amber-50 text-amber-600",
    iconBox:
      "bg-amber-50 text-amber-500",
    dot: "bg-amber-400",
  },
  IN_PROGRESS: {
    label: "En curso",
    icon: FiPlay,
    badge:
      "border-blue-100 bg-blue-50 text-blue-600",
    iconBox:
      "bg-blue-50 text-blue-500",
    dot: "bg-blue-500",
  },
  EN_PROCESO: {
    label: "En curso",
    icon: FiPlay,
    badge:
      "border-blue-100 bg-blue-50 text-blue-600",
    iconBox:
      "bg-blue-50 text-blue-500",
    dot: "bg-blue-500",
  },
  COMPLETED: {
    label: "Completada",
    icon: FiCheckCircle,
    badge:
      "border-[#87be00]/20 bg-[#87be00]/10 text-[#87be00]",
    iconBox:
      "bg-[#87be00]/10 text-[#87be00]",
    dot: "bg-[#87be00]",
  },
  FINALIZADO: {
    label: "Completada",
    icon: FiCheckCircle,
    badge:
      "border-[#87be00]/20 bg-[#87be00]/10 text-[#87be00]",
    iconBox:
      "bg-[#87be00]/10 text-[#87be00]",
    dot: "bg-[#87be00]",
  },
};

const parseLocalDate = (
  dateString,
) => {
  if (!dateString) {
    return null;
  }

  const [year, month, day] =
    String(dateString)
      .split("T")[0]
      .split("-")
      .map(Number);

  if (
    !year ||
    !month ||
    !day
  ) {
    return null;
  }

  return new Date(
    year,
    month - 1,
    day,
  );
};

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

const taskMatchesDate = (
  task,
  date,
) => {
  if (task.visit_date) {
    const taskDate =
      parseLocalDate(
        task.visit_date,
      );

    if (
      taskDate &&
      isSameDay(
        taskDate,
        date,
      )
    ) {
      return true;
    }
  }

  if (!task.is_recurring) {
    return false;
  }

  if (task.created_at) {
    const createdDate =
      new Date(
        task.created_at,
      );

    const isValidDate =
      !Number.isNaN(
        createdDate.getTime(),
      );

    if (
      isValidDate &&
      (
        date.getMonth() !==
          createdDate.getMonth() ||
        date.getFullYear() !==
          createdDate.getFullYear()
      )
    ) {
      return false;
    }
  }

  const jsDay =
    date.getDay();

  const isoDay =
    jsDay === 0
      ? 7
      : jsDay;

  const routeDay =
    Number(
      task.day_of_week,
    );

  const weekNumber =
    getWeekNumber(date);

  const matchesDay =
    routeDay === jsDay ||
    routeDay === isoDay;

  return (
    matchesDay &&
    Number(
      task.week_number,
    ) === weekNumber
  );
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

const UserAgenda = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [allTasks, setAllTasks] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState(null);

  const [
    selectedDate,
    setSelectedDate,
  ] = useState(new Date());

  const fetchAllUserRoutes =
    useCallback(async () => {
      if (!user?.id) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const response =
          await api.get(
            `/routes/user/${user.id}`,
          );

        setAllTasks(
          extractRows(response),
        );
      } catch (requestError) {
        console.error(
          "Error al cargar agenda:",
          requestError,
        );

        setError(
          requestError?.response?.data
            ?.message ??
            requestError?.data?.message ??
            requestError?.message ??
            "No fue posible cargar la agenda.",
        );
      } finally {
        setLoading(false);
      }
    }, [user?.id]);

  useEffect(() => {
    fetchAllUserRoutes();
  }, [fetchAllUserRoutes]);

  const selectedDateKey =
    toLocalDateKey(
      selectedDate,
    );

  const todayKey =
    toLocalDateKey(
      new Date(),
    );

  const displayTasks =
    useMemo(
      () =>
        allTasks
          .filter((task) =>
            taskMatchesDate(
              task,
              selectedDate,
            ),
          )
          .sort((first, second) =>
            String(
              first.start_time ||
                "",
            ).localeCompare(
              String(
                second.start_time ||
                  "",
              ),
            ),
          ),
      [
        allTasks,
        selectedDateKey,
      ],
    );

  const monthlySummary =
    useMemo(() => {
      const selectedMonth =
        selectedDate.getMonth();

      const selectedYear =
        selectedDate.getFullYear();

      const datesWithTasks =
        new Set();

      let completed = 0;

      allTasks.forEach((task) => {
        const explicitDate =
          parseLocalDate(
            task.visit_date,
          );

        if (
          explicitDate &&
          explicitDate.getMonth() ===
            selectedMonth &&
          explicitDate.getFullYear() ===
            selectedYear
        ) {
          datesWithTasks.add(
            toLocalDateKey(
              explicitDate,
            ),
          );
        }

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
          completed += 1;
        }
      });

      return {
        plannedDays:
          datesWithTasks.size,
        totalRoutes:
          allTasks.length,
        completed,
      };
    }, [
      allTasks,
      selectedDateKey,
    ]);

  const tileContent =
    useCallback(
      ({
        date,
        view,
      }) => {
        if (
          view !== "month"
        ) {
          return null;
        }

        const dayTasks =
          allTasks.filter(
            (task) =>
              taskMatchesDate(
                task,
                date,
              ),
          );

        if (
          dayTasks.length === 0
        ) {
          return null;
        }

        const completedCount =
          dayTasks.filter(
            (task) => {
              const status =
                String(
                  task.status ||
                    "",
                ).toUpperCase();

              return (
                status ===
                  "COMPLETED" ||
                status ===
                  "FINALIZADO"
              );
            },
          ).length;

        return (
          <div className="mt-1 flex w-full flex-col items-center overflow-hidden px-1">
            <div className="hidden w-full flex-col gap-1 md:flex">
              {dayTasks
                .slice(0, 2)
                .map(
                  (
                    task,
                    index,
                  ) => (
                    <div
                      key={
                        task.id ??
                        index
                      }
                      className="truncate rounded-md border border-[#87be00]/20 bg-[#87be00]/10 px-1 py-0.5 text-[7px] font-black uppercase leading-tight text-[#87be00]"
                    >
                      {task.cadena ||
                        task.local_name ||
                        "Local"}
                    </div>
                  ),
                )}

              {dayTasks.length >
                2 && (
                <span className="text-[6px] font-bold text-slate-400">
                  +
                  {dayTasks.length -
                    2}{" "}
                  más
                </span>
              )}
            </div>

            <div className="flex items-center gap-1 md:hidden">
              <span className="h-1.5 w-1.5 rounded-full bg-[#87be00] shadow-[0_0_5px_rgba(135,190,0,0.5)]" />

              {completedCount >
                0 && (
                <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
              )}
            </div>
          </div>
        );
      },
      [allTasks],
    );

  const tileClassName =
    useCallback(
      ({
        date,
        view,
      }) => {
        if (
          view !== "month"
        ) {
          return "";
        }

        const hasTasks =
          allTasks.some(
            (task) =>
              taskMatchesDate(
                task,
                date,
              ),
          );

        return hasTasks
          ? "cultiva-calendar-has-routes"
          : "";
      },
      [allTasks],
    );

  const goToToday = () => {
    setSelectedDate(
      new Date(),
    );
  };

  const openTask = (
    task,
  ) => {
    const status =
      String(
        task.status || "",
      ).toUpperCase();

    if (
      status === "PENDING" ||
      status === "PENDIENTE"
    ) {
      return;
    }

    navigate(
      `/usuario/reporte/${task.id}`,
    );
  };

  return (
    <div className="min-h-full bg-slate-50 px-4 pb-[calc(6rem+env(safe-area-inset-bottom))] pt-5 font-[Outfit] sm:px-5 md:px-6 md:pb-10">
      <div className="mx-auto flex w-full max-w-[980px] flex-col gap-5">
        {/* ENCABEZADO */}
        <header className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#87be00]/10 text-[#87be00]">
              <FiCalendar
                size={20}
              />
            </div>

            <div className="min-w-0">
              <h1 className="text-2xl font-black tracking-tight text-slate-900">
                Mi agenda
              </h1>

              <p className="mt-1 text-[9px] font-black uppercase tracking-[0.2em] text-[#87be00]">
                Calendario de rutas asignadas
              </p>
            </div>
          </div>

          {loading && (
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-white">
              <FiLoader
                size={15}
                className="animate-spin"
              />
            </div>
          )}
        </header>

        {/* RESUMEN MENSUAL */}
        <section className="grid grid-cols-3 gap-2">
          <article className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
            <p className="text-lg font-black text-slate-900">
              {
                monthlySummary.totalRoutes
              }
            </p>

            <p className="mt-1 text-[7px] font-black uppercase tracking-wider text-slate-400">
              Rutas
            </p>
          </article>

          <article className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
            <p className="text-lg font-black text-[#87be00]">
              {
                monthlySummary.completed
              }
            </p>

            <p className="mt-1 text-[7px] font-black uppercase tracking-wider text-slate-400">
              Completadas
            </p>
          </article>

          <article className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
            <p className="text-lg font-black text-blue-600">
              {
                monthlySummary.plannedDays
              }
            </p>

            <p className="mt-1 text-[7px] font-black uppercase tracking-wider text-slate-400">
              Días planificados
            </p>
          </article>
        </section>

        {error && (
          <section className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-100 text-red-500">
              <FiAlertCircle
                size={18}
              />
            </div>

            <div className="min-w-0">
              <p className="text-[9px] font-black uppercase tracking-wider text-red-700">
                Error de agenda
              </p>

              <p className="mt-1 text-sm text-red-600">
                {error}
              </p>
            </div>
          </section>
        )}

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(340px,0.85fr)]">
          {/* CALENDARIO */}
          <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white p-3 shadow-sm sm:p-5">
            <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-[#87be00]">
                  Vista mensual
                </p>

                <h2 className="mt-1 text-base font-black tracking-tight text-slate-900">
                  Selecciona una fecha
                </h2>
              </div>

              {selectedDateKey !==
                todayKey && (
                <button
                  type="button"
                  onClick={goToToday}
                  className="rounded-xl bg-slate-100 px-3 py-2 text-[8px] font-black uppercase tracking-wider text-slate-500 transition hover:bg-slate-200 hover:text-slate-900"
                >
                  Hoy
                </button>
              )}
            </div>

            <Calendar
              onChange={
                setSelectedDate
              }
              value={
                selectedDate
              }
              tileContent={
                tileContent
              }
              tileClassName={
                tileClassName
              }
              className="cultiva-calendar-ui"
              prevLabel={
                <FiChevronLeft />
              }
              nextLabel={
                <FiChevronRight />
              }
              prev2Label={null}
              next2Label={null}
              formatShortWeekday={(
                _locale,
                date,
              ) =>
                format(
                  date,
                  "EEEEE",
                  {
                    locale: es,
                  },
                )
              }
              formatMonthYear={(
                _locale,
                date,
              ) =>
                format(
                  date,
                  "MMMM yyyy",
                  {
                    locale: es,
                  },
                )
              }
            />
          </section>

          {/* ITINERARIO */}
          <section className="space-y-4">
            <div className="relative overflow-hidden rounded-[2rem] bg-slate-900 p-5 text-white shadow-xl shadow-slate-900/10">
              <div className="relative z-10 flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-[8px] font-black uppercase tracking-[0.2em] text-[#a8d52c]">
                    Itinerario del día
                  </p>

                  <h2 className="mt-2 text-xl font-black capitalize tracking-tight">
                    {format(
                      selectedDate,
                      "eeee dd 'de' MMMM",
                      {
                        locale: es,
                      },
                    )}
                  </h2>
                </div>

                <span className="shrink-0 rounded-xl bg-[#87be00] px-3 py-2 text-[8px] font-black uppercase tracking-wider text-white">
                  {
                    displayTasks.length
                  }{" "}
                  {displayTasks.length ===
                  1
                    ? "ruta"
                    : "rutas"}
                </span>
              </div>

              <FiCalendar
                className="absolute -bottom-5 -right-4 text-white/[0.04]"
                size={120}
              />
            </div>

            {loading &&
            allTasks.length ===
              0 ? (
              <div className="flex min-h-[260px] items-center justify-center rounded-[2rem] border border-slate-200 bg-white">
                <div className="flex flex-col items-center gap-3">
                  <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-100 border-t-[#87be00]" />

                  <p className="text-[8px] font-black uppercase tracking-wider text-slate-400">
                    Cargando rutas
                  </p>
                </div>
              </div>
            ) : displayTasks.length ===
              0 ? (
              <div className="flex min-h-[260px] flex-col items-center justify-center rounded-[2rem] border border-dashed border-slate-200 bg-white p-8 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-300">
                  <FiCalendar
                    size={25}
                  />
                </div>

                <p className="mt-4 text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">
                  Sin visitas programadas
                </p>

                <p className="mt-2 max-w-xs text-sm text-slate-500">
                  No tienes rutas asignadas para la fecha seleccionada.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {displayTasks.map(
                  (task) => {
                    const status =
                      String(
                        task.status ||
                          "PENDING",
                      ).toUpperCase();

                    const config =
                      STATUS_CONFIG[
                        status
                      ] ||
                      STATUS_CONFIG.PENDING;

                    const StatusIcon =
                      config.icon;

                    const canOpen =
                      ![
                        "PENDING",
                        "PENDIENTE",
                      ].includes(
                        status,
                      );

                    const mapsQuery =
                      task.lat &&
                      task.lng
                        ? `${task.lat},${task.lng}`
                        : task.direccion ||
                          "";

                    return (
                      <article
                        key={task.id}
                        className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm"
                      >
                        <div className="p-4">
                          <div className="flex items-start gap-3">
                            <div
                              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${config.iconBox}`}
                            >
                              <StatusIcon
                                size={18}
                              />
                            </div>

                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="inline-flex items-center gap-1.5 text-[8px] font-black uppercase tracking-wider text-[#87be00]">
                                  <FiClock
                                    size={11}
                                  />

                                  {task.start_time?.slice(
                                    0,
                                    5,
                                  ) ||
                                    "--:--"}

                                  {task.end_time
                                    ? ` — ${task.end_time.slice(
                                        0,
                                        5,
                                      )}`
                                    : ""}
                                </span>

                                <span
                                  className={`inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-[7px] font-black uppercase tracking-wider ${config.badge}`}
                                >
                                  <span
                                    className={`h-1.5 w-1.5 rounded-full ${config.dot}`}
                                  />

                                  {config.label}
                                </span>
                              </div>

                              <h3 className="mt-2 truncate text-sm font-black tracking-tight text-slate-900">
                                {task.cadena ||
                                  task.local_name ||
                                  "Local asignado"}
                              </h3>

                              <p className="mt-1 flex items-start gap-1.5 text-[9px] font-bold leading-relaxed text-slate-500">
                                <FiMapPin
                                  size={11}
                                  className="mt-0.5 shrink-0 text-slate-400"
                                />

                                <span className="line-clamp-2">
                                  {task.direccion ||
                                    task.local_code ||
                                    "Dirección no disponible"}
                                </span>
                              </p>
                            </div>
                          </div>

                          <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-3">
                            <span className="rounded-lg bg-blue-50 px-2 py-1 text-[7px] font-black uppercase tracking-wider text-blue-600">
                              Visita{" "}
                              {task.visit_number ||
                                "S/N"}
                            </span>

                            {task.codigo_local && (
                              <span className="rounded-lg bg-slate-100 px-2 py-1 text-[7px] font-black uppercase tracking-wider text-slate-500">
                                Código{" "}
                                {task.codigo_local}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex gap-2 border-t border-slate-100 bg-slate-50/70 p-3">
                          <button
                            type="button"
                            onClick={() =>
                              openTask(
                                task,
                              )
                            }
                            disabled={
                              !canOpen
                            }
                            className={`
                              flex min-h-[46px] flex-1
                              items-center justify-center
                              gap-2 rounded-2xl px-4
                              text-[8px] font-black
                              uppercase tracking-wider
                              transition

                              ${
                                canOpen
                                  ? `
                                    bg-slate-900
                                    text-white
                                    hover:bg-[#87be00]
                                  `
                                  : `
                                    cursor-not-allowed
                                    border border-slate-200
                                    bg-slate-100
                                    text-slate-400
                                  `
                              }
                            `}
                          >
                            <FiNavigation
                              size={14}
                            />

                            {canOpen
                              ? "Abrir visita"
                              : "Pendiente de inicio"}
                          </button>

                          <a
                            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                              mapsQuery,
                            )}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label="Abrir local en Google Maps"
                            className="flex h-[46px] w-[46px] shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-600 transition hover:border-[#87be00]/40 hover:bg-[#87be00]/10 hover:text-[#87be00]"
                          >
                            <FiMapPin
                              size={17}
                            />
                          </a>
                        </div>
                      </article>
                    );
                  },
                )}
              </div>
            )}
          </section>
        </div>
      </div>

      <style>{`
        .cultiva-calendar-ui {
          width: 100% !important;
          border: none !important;
          background: transparent !important;
          font-family: "Outfit", sans-serif !important;
        }

        .cultiva-calendar-ui .react-calendar__navigation {
          height: 48px !important;
          margin-bottom: 0.75rem !important;
        }

        .cultiva-calendar-ui .react-calendar__navigation button {
          min-width: 42px !important;
          border-radius: 0.875rem !important;
          color: #334155 !important;
          font-size: 12px !important;
          font-weight: 900 !important;
          text-transform: capitalize !important;
          transition: all 0.2s ease !important;
        }

        .cultiva-calendar-ui .react-calendar__navigation button:enabled:hover,
        .cultiva-calendar-ui .react-calendar__navigation button:enabled:focus {
          background: #f1f5f9 !important;
        }

        .cultiva-calendar-ui .react-calendar__month-view__weekdays {
          margin-bottom: 0.35rem !important;
          color: #94a3b8 !important;
          font-size: 8px !important;
          font-weight: 900 !important;
          text-transform: uppercase !important;
        }

        .cultiva-calendar-ui .react-calendar__month-view__weekdays abbr {
          text-decoration: none !important;
        }

        .cultiva-calendar-ui .react-calendar__tile {
          min-height: 68px !important;
          padding: 0.65rem 0.15rem !important;
          border: 2px solid white !important;
          border-radius: 1rem !important;
          background: transparent !important;
          color: #475569 !important;
          font-size: 11px !important;
          font-weight: 900 !important;
          display: flex !important;
          flex-direction: column !important;
          align-items: center !important;
          justify-content: flex-start !important;
          transition: all 0.2s ease !important;
        }

        .cultiva-calendar-ui .react-calendar__tile:enabled:hover,
        .cultiva-calendar-ui .react-calendar__tile:enabled:focus {
          background: #f8fafc !important;
          color: #0f172a !important;
        }

        .cultiva-calendar-ui .react-calendar__tile--now {
          background: #f1f5f9 !important;
          color: #87be00 !important;
        }

        .cultiva-calendar-ui .react-calendar__tile--active,
        .cultiva-calendar-ui .react-calendar__tile--active:enabled:hover,
        .cultiva-calendar-ui .react-calendar__tile--active:enabled:focus {
          background: #0f172a !important;
          color: white !important;
          box-shadow: 0 10px 24px rgba(15, 23, 42, 0.15) !important;
        }

        .cultiva-calendar-ui .react-calendar__tile--neighboringMonth {
          color: #cbd5e1 !important;
        }

        .cultiva-calendar-ui .cultiva-calendar-has-routes:not(.react-calendar__tile--active) {
          background: rgba(135, 190, 0, 0.04) !important;
        }

        @media (min-width: 768px) {
          .cultiva-calendar-ui .react-calendar__tile {
            min-height: 96px !important;
            padding: 0.8rem 0.35rem !important;
            border-radius: 1.25rem !important;
          }
        }
      `}</style>
    </div>
  );
};

export default UserAgenda;