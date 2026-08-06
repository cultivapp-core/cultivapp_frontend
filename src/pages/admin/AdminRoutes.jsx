import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useAuth } from "../../context/AuthContext";
import api from "../../api/apiClient";
import ManageRoutesModal from "../../components/ManageRoutesModal";
import toast from "react-hot-toast";
import {
  FiAlertCircle,
  FiBarChart2,
  FiBriefcase,
  FiCalendar,
  FiCheckCircle,
  FiChevronDown,
  FiChevronLeft,
  FiChevronRight,
  FiClock,
  FiDownload,
  FiEdit3,
  FiFileText,
  FiFilter,
  FiGlobe,
  FiGrid,
  FiHash,
  FiHelpCircle,
  FiLayers,
  FiList,
  FiMapPin,
  FiPlayCircle,
  FiPlus,
  FiRefreshCw,
  FiSearch,
  FiTrash2,
  FiUploadCloud,
  FiUser,
  FiUsers,
  FiX,
  FiXCircle,
} from "react-icons/fi";
import * as XLSX from "xlsx";
import planningTemplateUrl from "../../assets/plantilla_planificacion_masiva_multimes_calendario.xlsx?url";
import { motion } from "framer-motion";
import { getWeeksOfMonthCalendar } from "../../utils/helper";
import { Button, IconButton } from "../../components/ui";

const CULTIVA_COMPANY_ID =
  "0e342e01-d213-4353-b210-39a12ac335cf";

const AUTHORIZED_ROOT_USER_ID =
  "177b6c2d-2ec0-417e-a0a7-24354904e2e7";

const DAY_DEFINITIONS = [
  { id: 1, label: "L", name: "Lunes" },
  { id: 2, label: "M", name: "Martes" },
  { id: 3, label: "X", name: "Miércoles" },
  { id: 4, label: "J", name: "Jueves" },
  { id: 5, label: "V", name: "Viernes" },
  { id: 6, label: "S", name: "Sábado" },
  { id: 0, label: "D", name: "Domingo" },
];

const STATUS_PRIORITY = [
  "IN_PROGRESS",
  "INCOMPLETE",
  "PARTIAL",
  "PENDING",
  "COMPLETED",
];

const normalizeRole = (value) =>
  String(value || "")
    .trim()
    .toUpperCase();

const normalizeStatus = (value) =>
  String(value || "PENDING")
    .trim()
    .toUpperCase();

const normalizeTime = (value) => {
  if (!value || value === "null") {
    return "00:00";
  }

  return String(value).slice(0, 5);
};

const extractArray = (response) => {
  const payload = response?.data ?? response;

  if (Array.isArray(payload)) {
    return payload;
  }

  if (Array.isArray(payload?.data)) {
    return payload.data;
  }

  if (Array.isArray(payload?.items)) {
    return payload.items;
  }

  if (Array.isArray(payload?.rows)) {
    return payload.rows;
  }

  return [];
};

const toDateKey = (value) => {
  if (!value) {
    return "";
  }

  const raw = String(value).trim();

  const directMatch = raw.match(
    /^(\d{4})-(\d{2})-(\d{2})/,
  );

  if (directMatch) {
    return `${directMatch[1]}-${directMatch[2]}-${directMatch[3]}`;
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return "";
  }

  parsed.setMinutes(
    parsed.getMinutes() -
      parsed.getTimezoneOffset(),
  );

  return parsed.toISOString().slice(0, 10);
};

const parseDateKey = (value) => {
  const key = toDateKey(value);

  if (!key) {
    return null;
  }

  const parsed = new Date(`${key}T12:00:00`);

  return Number.isNaN(parsed.getTime())
    ? null
    : parsed;
};

const toMonthKey = (date) => {
  const parsed =
    date instanceof Date
      ? new Date(date)
      : parseDateKey(date) || new Date();

  return `${parsed.getFullYear()}-${String(
    parsed.getMonth() + 1,
  ).padStart(2, "0")}`;
};

const parseMonthKey = (monthKey) => {
  const match = String(monthKey || "").match(
    /^(\d{4})-(\d{2})$/,
  );

  if (!match) {
    return new Date();
  }

  return new Date(
    Number(match[1]),
    Number(match[2]) - 1,
    1,
    12,
    0,
    0,
    0,
  );
};

const MONTH_NAME_TO_NUMBER = {
  enero: 1,
  febrero: 2,
  marzo: 3,
  abril: 4,
  mayo: 5,
  junio: 6,
  julio: 7,
  agosto: 8,
  septiembre: 9,
  setiembre: 9,
  octubre: 10,
  noviembre: 11,
  diciembre: 12,
};

const normalizeMonthNumber = (value) => {
  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    return null;
  }

  const numeric = Number.parseInt(
    String(value).trim(),
    10,
  );

  if (
    Number.isInteger(numeric) &&
    numeric >= 1 &&
    numeric <= 12
  ) {
    return numeric;
  }

  const normalizedName =
    String(value)
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");

  return (
    MONTH_NAME_TO_NUMBER[
      normalizedName
    ] || null
  );
};

const normalizePlanningYear = (value) => {
  const parsed = Number.parseInt(
    String(value || "").trim(),
    10,
  );

  return (
    Number.isInteger(parsed) &&
    parsed >= 2000 &&
    parsed <= 2100
  )
    ? parsed
    : null;
};

const buildMonthKey = (
  yearValue,
  monthValue,
) => {
  const year =
    normalizePlanningYear(
      yearValue,
    );

  const month =
    normalizeMonthNumber(
      monthValue,
    );

  if (!year || !month) {
    return "";
  }

  return `${year}-${String(
    month,
  ).padStart(2, "0")}`;
};

const normalizeDirectMonthKey = (
  value,
) => {
  if (!value) {
    return "";
  }

  const raw =
    String(value).trim();

  const directMatch =
    raw.match(
      /^(\d{4})-(\d{1,2})(?:-\d{1,2})?$/,
    );

  if (directMatch) {
    return buildMonthKey(
      directMatch[1],
      directMatch[2],
    );
  }

  const reverseMatch =
    raw.match(
      /^(\d{1,2})[/-](\d{4})$/,
    );

  if (reverseMatch) {
    return buildMonthKey(
      reverseMatch[2],
      reverseMatch[1],
    );
  }

  return "";
};

const resolvePlanningMonthKey = (
  route,
  fallbackMonthKey = "",
) => {
  const metadata =
    route?.metadata &&
    typeof route.metadata ===
      "object"
      ? route.metadata
      : {};

  const directDate =
    resolveRouteDate(route) ||
    resolvePeriodStart(route) ||
    resolvePeriodEnd(route);

  if (directDate) {
    return directDate.slice(
      0,
      7,
    );
  }

  const directMonthCandidates = [
    route?.planning_month_key,
    route?.month_key,
    route?.schedule_month_key,
    route?.period_month,
    route?.selected_month,
    metadata?.planning_month_key,
    metadata?.month_key,
  ];

  for (
    const candidate of
    directMonthCandidates
  ) {
    const monthKey =
      normalizeDirectMonthKey(
        candidate,
      );

    if (monthKey) {
      return monthKey;
    }
  }

  const year =
    route?.planning_year ??
    route?.schedule_year ??
    route?.period_year ??
    route?.year ??
    route?.anio ??
    route?.["año"] ??
    route?.planning_period?.year ??
    metadata?.planning_year ??
    metadata?.year;

  const month =
    route?.planning_month ??
    route?.schedule_month ??
    route?.month ??
    route?.mes ??
    route?.planning_period?.month ??
    metadata?.planning_month ??
    metadata?.month;

  return (
    buildMonthKey(
      year,
      month,
    ) ||
    normalizeDirectMonthKey(
      fallbackMonthKey,
    ) ||
    fallbackMonthKey ||
    ""
  );
};

const getMonthBounds = (
  monthKey,
) => {
  const monthDate =
    parseMonthKey(
      monthKey,
    );

  const start =
    new Date(
      monthDate.getFullYear(),
      monthDate.getMonth(),
      1,
      12,
      0,
      0,
      0,
    );

  const end =
    new Date(
      monthDate.getFullYear(),
      monthDate.getMonth() + 1,
      0,
      12,
      0,
      0,
      0,
    );

  return {
    start:
      toDateKey(start),
    end:
      toDateKey(end),
  };
};

const resolveGroupMonthKey = (
  group,
  fallbackMonthKey,
) => {
  const explicitGroupMonth =
    normalizeDirectMonthKey(
      group?.planning_month_key,
    );

  if (explicitGroupMonth) {
    return explicitGroupMonth;
  }

  const itemMonth =
    group?.scheduled_items
      ?.map(
        (item) =>
          item?.month_key ||
          (
            item?.date
              ? toMonthKey(
                  item.date,
                )
              : ""
          ),
      )
      .find(Boolean);

  if (itemMonth) {
    return itemMonth;
  }

  return (
    resolvePlanningMonthKey(
      group,
      fallbackMonthKey,
    ) ||
    fallbackMonthKey
  );
};

const addDays = (date, amount) => {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  next.setHours(12, 0, 0, 0);
  return next;
};

const getCalendarWeeksMondayFirst = (
  monthDate,
) => {
  const monthStart =
    new Date(
      monthDate.getFullYear(),
      monthDate.getMonth(),
      1,
      12,
      0,
      0,
      0,
    );

  const monthEnd =
    new Date(
      monthDate.getFullYear(),
      monthDate.getMonth() + 1,
      0,
      12,
      0,
      0,
      0,
    );

  /*
   * JavaScript:
   * 0 = domingo
   * 1 = lunes
   * ...
   * 6 = sábado
   *
   * El calendario visual comienza el lunes.
   */
  const startOffset =
    monthStart.getDay() === 0
      ? 6
      : monthStart.getDay() - 1;

  const calendarStart =
    addDays(
      monthStart,
      -startOffset,
    );

  const endOffset =
    monthEnd.getDay() === 0
      ? 0
      : 7 - monthEnd.getDay();

  const calendarEnd =
    addDays(
      monthEnd,
      endOffset,
    );

  const weeks = [];
  let cursor =
    new Date(
      calendarStart,
    );

  while (
    cursor <= calendarEnd
  ) {
    const start =
      new Date(
        cursor,
      );

    const end =
      addDays(
        start,
        6,
      );

    weeks.push({
      id:
        weeks.length + 1,
      start,
      end,
    });

    cursor =
      addDays(
        cursor,
        7,
      );
  }

  return weeks;
};

const getDateForWeekDay = (week, dayId) => {
  const offset =
    Number(dayId) === 0
      ? 6
      : Number(dayId) - 1;

  return addDays(week.start, offset);
};

const isDateInsideWeek = (date, week) => {
  if (!date || !week?.start || !week?.end) {
    return false;
  }

  const target = new Date(date);
  const start = new Date(week.start);
  const end = new Date(week.end);

  target.setHours(12, 0, 0, 0);
  start.setHours(0, 0, 0, 0);
  end.setHours(23, 59, 59, 999);

  return target >= start && target <= end;
};

const resolveRouteDate = (route) =>
  toDateKey(
    route?.visit_date ||
      route?.fecha ||
      route?.date ||
      route?.fecha_planificacion ||
      route?.fecha_planificada ||
      route?.planned_date ||
      route?.effective_date ||
      route?.planning_date ||
      route?.selected_date ||
      route?.route_date,
  );

const resolvePeriodStart = (route) =>
  toDateKey(
    route?.period_start_date ||
      route?.planning_start_date ||
      route?.fecha_inicio_planificacion ||
      route?.effective_from ||
      route?.start_date ||
      resolveRouteDate(route),
  );

const resolvePeriodEnd = (route) =>
  toDateKey(
    route?.period_end_date ||
      route?.planning_end_date ||
      route?.fecha_fin_planificacion ||
      route?.effective_to ||
      route?.end_date ||
      resolveRouteDate(route),
  );

const resolveWeekNumber = (
  route,
  routeDate,
) => {
  const raw =
    route?.week_number ??
    route?.weekNumber ??
    route?.week ??
    route?.semana ??
    route?.numero_semana;

  if (raw !== undefined && raw !== null) {
    const parsed = Number(
      String(raw).replace(/\D/g, ""),
    );

    if (Number.isInteger(parsed) && parsed > 0) {
      return parsed;
    }
  }

  const date = parseDateKey(routeDate);

  if (!date) {
    return 1;
  }

  const weeks = getWeeksOfMonthCalendar(date);
  const matched = weeks.find((week) =>
    isDateInsideWeek(date, week),
  );

  return Number(matched?.id) || 1;
};

const normalizeCalendarDayId = (
  value,
) => {
  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    return null;
  }

  const parsed =
    Number.parseInt(
      String(value),
      10,
    );

  if (
    !Number.isInteger(
      parsed,
    )
  ) {
    return null;
  }

  if (parsed === 7) {
    return 0;
  }

  if (
    parsed >= 0 &&
    parsed <= 6
  ) {
    return parsed;
  }

  return null;
};

const resolveDayNumber = (
  route,
  routeDate,
) => {
  const raw =
    route?.day_of_week ??
    route?.dayOfWeek ??
    route?.day ??
    route?.dia;

  const normalizedDay =
    normalizeCalendarDayId(
      raw,
    );

  if (normalizedDay !== null) {
    return normalizedDay;
  }

  const date =
    parseDateKey(
      routeDate,
    );

  return date
    ? date.getDay()
    : null;
};

const deriveLegacyDate = (
  monthDate,
  weekNumber,
  dayId,
) => {
  if (
    !monthDate ||
    !Number.isInteger(
      Number(weekNumber),
    )
  ) {
    return "";
  }

  const normalizedDay =
    normalizeCalendarDayId(
      dayId,
    );

  if (normalizedDay === null) {
    return "";
  }

  const weeks =
    getWeeksOfMonthCalendar(
      monthDate,
    );

  const week =
    weeks.find(
      (item) =>
        Number(item.id) ===
        Number(weekNumber),
    ) ||
    weeks[
      Number(weekNumber) - 1
    ];

  if (!week) {
    return "";
  }

  let cursor =
    new Date(
      week.start,
    );

  const end =
    new Date(
      week.end,
    );

  cursor.setHours(
    12,
    0,
    0,
    0,
  );

  end.setHours(
    12,
    0,
    0,
    0,
  );

  while (cursor <= end) {
    if (
      cursor.getDay() ===
      normalizedDay
    ) {
      return toDateKey(
        cursor,
      );
    }

    cursor =
      addDays(
        cursor,
        1,
      );
  }

  return "";
};

const formatDate = (
  value,
  options = {},
) => {
  const date =
    value instanceof Date
      ? value
      : parseDateKey(value);

  if (!date) {
    return "Sin fecha";
  }

  return new Intl.DateTimeFormat(
    "es-CL",
    options,
  ).format(date);
};

const formatPeriod = (
  startDate,
  endDate,
) => {
  const start = parseDateKey(startDate);
  const end = parseDateKey(endDate);

  if (!start && !end) {
    return "Periodo no informado";
  }

  if (start && end) {
    if (toDateKey(start) === toDateKey(end)) {
      return formatDate(start, {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    }

    return `${formatDate(start, {
      day: "2-digit",
      month: "short",
      year: "numeric",
    })} — ${formatDate(end, {
      day: "2-digit",
      month: "short",
      year: "numeric",
    })}`;
  }

  return formatDate(start || end, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const getGroupDisplayStatus = (statuses) => {
  const normalized = statuses.map(normalizeStatus);

  if (normalized.includes("IN_PROGRESS")) {
    return "IN_PROGRESS";
  }

  if (normalized.includes("INCOMPLETE")) {
    return "INCOMPLETE";
  }

  const completedCount = normalized.filter(
    (status) =>
      status === "COMPLETED" ||
      status === "OK",
  ).length;

  if (
    normalized.length > 0 &&
    completedCount === normalized.length
  ) {
    return "COMPLETED";
  }

  if (completedCount > 0) {
    return "PARTIAL";
  }

  return "PENDING";
};

const getStatusConfig = (status) => {
  const config = {
    COMPLETED: {
      bg: "bg-emerald-50",
      text: "text-emerald-700",
      border: "border-emerald-200",
      dot: "bg-emerald-500",
      icon: FiCheckCircle,
      label: "Completado",
    },
    IN_PROGRESS: {
      bg: "bg-blue-50",
      text: "text-blue-700",
      border: "border-blue-200",
      dot: "bg-blue-500",
      icon: FiPlayCircle,
      label: "En curso",
    },
    PARTIAL: {
      bg: "bg-violet-50",
      text: "text-violet-700",
      border: "border-violet-200",
      dot: "bg-violet-500",
      icon: FiRefreshCw,
      label: "Parcial",
    },
    INCOMPLETE: {
      bg: "bg-red-50",
      text: "text-red-600",
      border: "border-red-200",
      dot: "bg-red-500",
      icon: FiXCircle,
      label: "Incompleto",
    },
    PENDING: {
      bg: "bg-slate-50",
      text: "text-slate-600",
      border: "border-slate-200",
      dot: "bg-slate-400",
      icon: FiAlertCircle,
      label: "Pendiente",
    },
  };

  return (
    config[normalizeStatus(status)] ||
    config.PENDING
  );
};

const StatusBadge = ({ status }) => {
  const config = getStatusConfig(status);
  const Icon = config.icon;

  return (
    <span
      className={`inline-flex w-max items-center gap-1.5 rounded-full border px-3 py-1.5 text-[9px] font-black uppercase tracking-wider ${config.bg} ${config.text} ${config.border}`}
    >
      <Icon
        size={12}
        className={
          status === "IN_PROGRESS"
            ? "animate-pulse"
            : ""
        }
      />
      {config.label}
    </span>
  );
};

const PlanningMonthGrid = ({
  scheduledItems = [],
  monthDate,
}) => {
  const weeks = useMemo(
    () =>
      getCalendarWeeksMondayFirst(
        monthDate,
      ),
    [monthDate],
  );

  const itemsByDate = useMemo(() => {
    const result = {};
    const targetMonthKey =
      toMonthKey(
        monthDate,
      );

    scheduledItems.forEach((item) => {
      const dateKey =
        toDateKey(item.date) ||
        deriveLegacyDate(
          monthDate,
          Number(item.week),
          Number(item.day),
        );

      if (
        !dateKey ||
        toMonthKey(dateKey) !==
          targetMonthKey
      ) {
        return;
      }

      if (!result[dateKey]) {
        result[dateKey] = [];
      }

      result[dateKey].push(item);
    });

    Object.values(
      result,
    ).forEach(
      (assignments) => {
        assignments.sort(
          (a, b) =>
            normalizeTime(
              a.time,
            ).localeCompare(
              normalizeTime(
                b.time,
              ),
            ) ||
            Number(
              a.order_sequence ||
                0,
            ) -
              Number(
                b.order_sequence ||
                  0,
              ) ||
            String(
              a.visit_number ||
                a.route_id ||
                "",
            ).localeCompare(
              String(
                b.visit_number ||
                  b.route_id ||
                  "",
              ),
            ),
        );
      },
    );

    return result;
  }, [monthDate, scheduledItems]);

  return (
    <div className="min-w-0">
      <div className="mb-2 grid grid-cols-[26px_repeat(7,minmax(30px,1fr))] gap-1">
        <div />

        {DAY_DEFINITIONS.map((day) => (
          <div
            key={day.id}
            className="text-center text-[7px] font-black uppercase tracking-wider text-slate-400"
          >
            {day.label}
          </div>
        ))}
      </div>

      <div className="space-y-1.5">
        {weeks.map((week, weekIndex) => (
          <div
            key={toDateKey(week.start)}
            className="grid grid-cols-[26px_repeat(7,minmax(30px,1fr))] gap-1"
          >
            <div className="flex items-center justify-center text-[8px] font-black text-slate-400">
              S{weekIndex + 1}
            </div>

            {DAY_DEFINITIONS.map((day) => {
              const date =
                getDateForWeekDay(
                  week,
                  day.id,
                );

              const dateKey = toDateKey(date);
              const assignments =
                itemsByDate[dateKey] || [];

              const isCurrentMonth =
                date.getMonth() ===
                  monthDate.getMonth() &&
                date.getFullYear() ===
                  monthDate.getFullYear();

              const isActive =
                assignments.length > 0;

              return (
                <div
                  key={`${dateKey}-${day.id}`}
                  className="group relative"
                >
                  <div
                    className={`flex h-8 min-w-0 items-center justify-center rounded-lg border text-[8px] font-black transition ${
                      isActive
                        ? "border-[#87be00] bg-[#87be00] text-white shadow-sm"
                        : isCurrentMonth
                          ? "border-slate-100 bg-white text-slate-600"
                          : "border-transparent bg-slate-100/60 text-slate-300"
                    }`}
                  >
                    {date.getDate()}

                    {assignments.length > 1 && (
                      <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-slate-900 px-1 text-[6px] font-black text-white">
                        {assignments.length}
                      </span>
                    )}
                  </div>

                  {isActive && (
                    <div className="pointer-events-none absolute bottom-[calc(100%+8px)] left-1/2 z-[500] hidden w-56 -translate-x-1/2 rounded-2xl border border-white/10 bg-slate-950 p-3 text-left shadow-2xl group-hover:block">
                      <p className="text-[8px] font-black uppercase tracking-[0.16em] text-[#87be00]">
                        {formatDate(date, {
                          weekday: "long",
                          day: "2-digit",
                          month: "long",
                        })}
                      </p>

                      <div className="mt-2 space-y-2">
                        {assignments.map(
                          (assignment, index) => (
                            <div
                              key={
                                assignment.route_id ||
                                assignment.visit_number ||
                                `${assignment.user_id}-${assignment.date}-${assignment.time}-${index}`
                              }
                              className="rounded-xl bg-white/5 px-3 py-2"
                            >
                              <p className="truncate text-[9px] font-black uppercase text-white">
                                {assignment.userName ||
                                  "Usuario"}
                              </p>

                              <p className="mt-1 truncate text-[8px] font-semibold text-slate-300">
                                {assignment.turno ||
                                  "Planificado"}
                              </p>

                              {assignment.visit_number && (
                                <p className="mt-1 truncate text-[7px] font-bold text-slate-400">
                                  {assignment.visit_number}
                                </p>
                              )}

                              <p className="mt-1 text-[8px] font-black text-[#87be00]">
                                {normalizeTime(
                                  assignment.time,
                                )}{" "}
                                —{" "}
                                {normalizeTime(
                                  assignment.endTime,
                                )}
                              </p>
                            </div>
                          ),
                        )}
                      </div>

                      <span className="absolute left-1/2 top-full h-3 w-3 -translate-x-1/2 -translate-y-1.5 rotate-45 bg-slate-950" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
};

const PlanningAssignmentList = ({
  items = [],
  maxItems = 4,
}) => {
  const sorted = useMemo(
    () =>
      [...items]
        .sort((a, b) =>
          String(a.date || "").localeCompare(
            String(b.date || ""),
          ),
        )
        .slice(0, maxItems),
    [items, maxItems],
  );

  if (sorted.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-4 text-center">
        <p className="text-[9px] font-black uppercase tracking-wider text-slate-400">
          Sin días planificados
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {sorted.map((item, index) => (
        <div
          key={
            item.route_id ||
            item.visit_number ||
            `${item.date}-${item.user_id}-${item.time}-${index}`
          }
          className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50/70 px-3 py-2.5"
        >
          <div className="min-w-0">
            <p className="truncate text-[9px] font-black uppercase text-slate-800">
              {item.date
                ? formatDate(item.date, {
                    weekday: "short",
                    day: "2-digit",
                    month: "short",
                  })
                : `Semana ${item.week} · Día ${item.day}`}
            </p>

            <p className="mt-0.5 truncate text-[8px] font-semibold text-slate-400">
              {item.userName} · {item.turno}
            </p>
          </div>

          <span className="shrink-0 rounded-lg bg-[#87be00]/10 px-2 py-1 text-[8px] font-black text-[#679300]">
            {normalizeTime(item.time)} —{" "}
            {normalizeTime(item.endTime)}
          </span>
        </div>
      ))}

      {items.length > maxItems && (
        <p className="px-1 text-right text-[8px] font-black uppercase tracking-wider text-slate-400">
          +{items.length - maxItems} asignaciones adicionales
        </p>
      )}
    </div>
  );
};

const MetricCard = ({
  icon: Icon,
  label,
  value,
  detail,
  accent = false,
}) => (
  <div
    className={`rounded-[1.5rem] border p-4 sm:p-5 ${
      accent
        ? "border-[#87be00]/20 bg-[#87be00]/5"
        : "border-slate-100 bg-white"
    }`}
  >
    <div className="flex items-start justify-between gap-3">
      <div>
        <p className="text-[8px] font-black uppercase tracking-[0.16em] text-slate-400">
          {label}
        </p>

        <p className="mt-2 text-2xl font-black tracking-tight text-slate-900">
          {value}
        </p>

        {detail && (
          <p className="mt-1 text-[9px] font-semibold text-slate-400">
            {detail}
          </p>
        )}
      </div>

      <span
        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${
          accent
            ? "bg-[#87be00] text-white"
            : "bg-slate-100 text-slate-500"
        }`}
      >
        <Icon size={18} />
      </span>
    </div>
  </div>
);

const AdminRoutes = () => {
  const { user } = useAuth();

  const [routes, setRoutes] =
    useState([]);
  const [users, setUsers] =
    useState([]);
  const [locales, setLocales] =
    useState([]);
  const [companies, setCompanies] =
    useState([]);

  const [isModalOpen, setIsModalOpen] =
    useState(false);
  const [selectedRoute, setSelectedRoute] =
    useState(null);
  const [loading, setLoading] =
    useState(true);

  const [groupToDelete, setGroupToDelete] =
    useState(null);
  const [showBulkHelp, setShowBulkHelp] =
    useState(false);

  const [filterDate, setFilterDate] =
    useState("");
  const [filterCompany, setFilterCompany] =
    useState("");
  const [searchTerm, setSearchTerm] =
    useState("");
  const [filterUser, setFilterUser] =
    useState("");
  const [selectedRegion, setSelectedRegion] =
    useState("");
  const [selectedComuna, setSelectedComuna] =
    useState("");

  const [calendarMonth, setCalendarMonth] =
    useState(() => toMonthKey(new Date()));
  const [viewMode, setViewMode] =
    useState("cards");

  const fileInputRef = useRef(null);
  const didResolveInitialMonth =
    useRef(false);

  const normalizedRole =
    normalizeRole(user?.role);

  const currentUserId =
    String(
      user?.id ||
        user?.user_id ||
        user?.sub ||
        "",
    );

  const isCultivaAdmin =
    normalizedRole === "ADMIN_CLIENTE" &&
    String(user?.company_id || "") ===
      CULTIVA_COMPANY_ID;

  const isAuthorizedRoot =
    normalizedRole === "ROOT" &&
    (
      !currentUserId ||
      currentUserId ===
        AUTHORIZED_ROOT_USER_ID
    );

  const canManageCompanies =
    isCultivaAdmin ||
    isAuthorizedRoot;

  const visibleMonthDate =
    useMemo(
      () => parseMonthKey(calendarMonth),
      [calendarMonth],
    );

  const fetchData =
    useCallback(async () => {
      try {
        setLoading(true);

        const [
          routesResponse,
          usersResponse,
          localesResponse,
          companiesResponse,
        ] = await Promise.all([
          api.get("/routes"),
          api.get("/users"),
          api.get("/locales"),
          api.get("/companies"),
        ]);

        setRoutes(
          extractArray(routesResponse),
        );
        setUsers(
          extractArray(usersResponse),
        );
        setLocales(
          extractArray(localesResponse),
        );
        setCompanies(
          extractArray(companiesResponse),
        );
      } catch (error) {
        console.error(
          "❌ Error cargando planificaciones:",
          error,
        );

        toast.error(
          error?.response?.data?.message ||
            error?.message ||
            "Error al sincronizar las planificaciones",
        );
      } finally {
        setLoading(false);
      }
    }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (
      didResolveInitialMonth.current ||
      routes.length === 0
    ) {
      return;
    }

    didResolveInitialMonth.current = true;

    const routeMonths = routes
      .map((route) =>
        resolvePlanningMonthKey(
          route,
        ),
      )
      .filter(Boolean)
      .sort();

    if (
      routeMonths.length > 0 &&
      !routeMonths.includes(calendarMonth)
    ) {
      setCalendarMonth(
        routeMonths[
          routeMonths.length - 1
        ],
      );
    }
  }, [calendarMonth, routes]);

  const handleDeleteRoute = (group) => {
    setGroupToDelete(group);
  };

  const confirmDelete = async () => {
    if (!groupToDelete) {
      return;
    }

    // Se obtienen TODOS los IDs de las rutas/asignaciones pertenecientes al grupo
    const routeIdsToDelete = groupToDelete.route_ids || [];

    if (routeIdsToDelete.length === 0) {
      toast.error(
        "No fue posible identificar las planificaciones a eliminar.",
      );
      setGroupToDelete(null);
      return;
    }

    const toastId = toast.loading(
      "Eliminando planificación...",
    );

    try {
      const params = new URLSearchParams();

      if (groupToDelete.company_id) {
        params.set(
          "company_id",
          String(groupToDelete.company_id),
        );
      }

      if (groupToDelete.local_id) {
        params.set(
          "local_id",
          String(groupToDelete.local_id),
        );
      }

      const query = params.toString();
      const queryString = query ? `?${query}` : "";

      // Ejecutar la eliminación de todas las rutas del grupo en paralelo
      await Promise.all(
        routeIdsToDelete.map(id => 
          api.delete(`/routes/${id}${queryString}`)
        )
      );

      toast.success(
        "Planificación eliminada correctamente",
        { id: toastId },
      );

      await fetchData();
    } catch (error) {
      console.error(
        "❌ Error eliminando planificación:",
        error?.response?.data ||
          error?.data ||
          error,
      );

      toast.error(
        error?.response?.data?.message ||
          error?.data?.message ||
          error?.message ||
          "Error al eliminar la planificación",
        { id: toastId },
      );
    } finally {
      setGroupToDelete(null);
    }
  };

  /*
   * Las semanas del filtro deben usar exactamente la misma
   * cuadrícula que el calendario visual:
   *
   * - comienzan el lunes;
   * - terminan el domingo;
   * - incluyen los días visibles del mes anterior/siguiente;
   * - pueden existir 4, 5 o 6 semanas según el mes y el año.
   */
  const selectedMonthWeeks =
    useMemo(
      () =>
        getCalendarWeeksMondayFirst(
          visibleMonthDate,
        ),
      [visibleMonthDate],
    );

  const weekRanges = useMemo(
    () =>
      selectedMonthWeeks.map(
        (week, index) => {
          const startYear =
            week.start.getFullYear();

          const endYear =
            week.end.getFullYear();

          const crossesYear =
            startYear !== endYear;

          const dateOptions = {
            day: "2-digit",
            month: "short",
            ...(crossesYear
              ? {
                  year: "numeric",
                }
              : {}),
          };

          return {
            weekNum:
              index + 1,
            label:
              `S${index + 1}`,
            start:
              toDateKey(
                week.start,
              ),
            end:
              toDateKey(
                week.end,
              ),
            dates:
              `${formatDate(
                week.start,
                dateOptions,
              )} — ${formatDate(
                week.end,
                dateOptions,
              )}`,
          };
        },
      ),
    [selectedMonthWeeks],
  );

  const targetDateInfo = useMemo(() => {
    if (!filterDate) {
      return null;
    }

    const selected =
      parseDateKey(
        filterDate,
      );

    if (!selected) {
      return null;
    }

    /*
     * Se calcula contra el mes seleccionado en el filtro.
     * Esto evita diferencias al cambiar de mes o de año.
     */
    const filterMonthDate =
      parseMonthKey(
        filterDate.slice(
          0,
          7,
        ),
      );

    const weeks =
      getCalendarWeeksMondayFirst(
        filterMonthDate,
      );

    const foundIndex =
      weeks.findIndex(
        (week) =>
          isDateInsideWeek(
            selected,
            week,
          ),
      );

    return {
      date:
        filterDate,
      weekNum:
        foundIndex >= 0
          ? foundIndex + 1
          : null,
      dayId:
        selected.getDay(),
    };
  }, [filterDate]);

  const activeWeekByDate =
    targetDateInfo?.weekNum || null;

  const userById = useMemo(
    () =>
      new Map(
        users.map((item) => [
          String(item.id),
          item,
        ]),
      ),
    [users],
  );

  const localById = useMemo(
    () =>
      new Map(
        locales.map((item) => [
          String(item.id),
          item,
        ]),
      ),
    [locales],
  );

  const companyById = useMemo(
    () =>
      new Map(
        companies.map((item) => [
          String(item.id),
          item,
        ]),
      ),
    [companies],
  );

  const uniqueMercaderistas =
    useMemo(() => {
      const names = routes
        .map((route) => {
          const userData =
            userById.get(
              String(route.user_id),
            ) || {};

          const firstName =
            route.first_name ||
            userData.first_name ||
            userData.nombre ||
            "";

          const lastName =
            route.last_name ||
            userData.last_name ||
            userData.apellido ||
            "";

          return `${firstName} ${lastName}`.trim();
        })
        .filter(Boolean);

      return [...new Set(names)].sort(
        (a, b) =>
          a.localeCompare(b, "es"),
      );
    }, [routes, userById]);

  const regions = useMemo(
    () =>
      [
        ...new Set(
          locales
            .map(
              (local) =>
                local.region_name ||
                local.region,
            )
            .filter(Boolean),
        ),
      ].sort((a, b) =>
        String(a).localeCompare(
          String(b),
          "es",
        ),
      ),
    [locales],
  );

  const comunas = useMemo(
    () =>
      [
        ...new Set(
          locales
            .filter(
              (local) =>
                !selectedRegion ||
                (
                  local.region_name ||
                  local.region
                ) === selectedRegion,
            )
            .map(
              (local) =>
                local.comuna_name ||
                local.comuna,
            )
            .filter(Boolean),
        ),
      ].sort((a, b) =>
        String(a).localeCompare(
          String(b),
          "es",
        ),
      ),
    [locales, selectedRegion],
  );

  const handleImportExcel = async (event) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    const reader = new FileReader();
    const toastId = toast.loading(
      "Analizando Excel...",
    );

    const normalizeExcelHeader = (value) =>
      String(value || "")
        .trim()
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "_")
        .replace(/^_+|_+$/g, "");

    const getBackendError = (error) => {
      const payload =
        error?.response?.data ||
        error?.data ||
        {};

      const details = [
        ...(Array.isArray(payload?.errors)
          ? payload.errors
          : []),
        ...(Array.isArray(payload?.warnings)
          ? payload.warnings
          : []),
      ];

      return {
        message:
          payload?.message ||
          error?.message ||
          "Error al procesar el archivo.",
        details,
        payload,
      };
    };

    reader.onload = async (loadEvent) => {
      try {
        const data = new Uint8Array(
          loadEvent.target.result,
        );

        const workbook = XLSX.read(data, {
          type: "array",
          cellDates: true,
        });

        const planningSheetName =
          workbook.SheetNames.find(
            (name) =>
              normalizeExcelHeader(name) ===
              "planificacion",
          ) ||
          workbook.SheetNames[0];

        const worksheet =
          workbook.Sheets[
            planningSheetName
          ];

        if (!worksheet) {
          throw new Error(
            "No se encontró la hoja Planificacion.",
          );
        }

        const rawJson =
          XLSX.utils.sheet_to_json(
            worksheet,
            {
              defval: "",
              raw: true,
            },
          );

        const finalData = rawJson
          .map((row) => {
            const normalized = {};

            Object.entries(row).forEach(
              ([key, rawValue]) => {
                const header =
                  normalizeExcelHeader(
                    key,
                  );

                const stringValue =
                  String(
                    rawValue ?? "",
                  ).trim();

                switch (header) {
                  case "rut_mercaderista":
                  case "rut":
                    normalized.Rut_Mercaderista =
                      stringValue;
                    break;

                  case "codigo":
                  case "codigo_local":
                  case "cod":
                    normalized.Codigo =
                      stringValue;
                    break;

                  case "fecha_inicio":
                  case "fecha_desde":
                  case "desde":
                  case "planning_start_date":
                    /*
                     * Se conserva el valor original. Puede llegar como
                     * Date, serial de Excel o texto YYYY-MM-DD.
                     */
                    normalized.Fecha_Inicio =
                      rawValue;
                    break;

                  case "fecha_termino":
                  case "fecha_fin":
                  case "hasta":
                  case "planning_end_date":
                    normalized.Fecha_Termino =
                      rawValue;
                    break;

                  case "turno":
                  case "nombre_turno":
                    normalized.Turno =
                      stringValue;
                    break;

                  case "tipo_periodo":
                  case "periodo":
                  case "planning_period":
                    normalized.Tipo_Periodo =
                      stringValue.toUpperCase();
                    break;

                  case "observacion":
                  case "observaciones":
                    normalized.Observacion =
                      stringValue;
                    break;

                  case "anio":
                  case "ano":
                  case "year":
                  case "planning_year":
                    normalized.Anio =
                      rawValue;
                    break;

                  case "mes":
                  case "month":
                  case "planning_month":
                    normalized.Mes =
                      rawValue;
                    break;

                  default:
                    /*
                     * Compatibilidad con el formato anterior:
                     * Turno Semana 1 ... Turno Semana 5.
                     */
                    if (
                      (
                        header.includes(
                          "semana",
                        ) ||
                        header.startsWith(
                          "turno_",
                        )
                      ) &&
                      /\d+/.test(
                        header,
                      )
                    ) {
                      normalized[
                        key.trim()
                      ] = stringValue;
                    }
                    break;
                }
              },
            );

            return normalized;
          })
          .filter((item) => {
            const hasIdentity =
              item.Rut_Mercaderista &&
              item.Codigo;

            const hasRangeFormat =
              item.Fecha_Inicio ||
              item.Fecha_Termino ||
              item.Turno ||
              item.Tipo_Periodo;

            const hasWeeklyFormat =
              Object.keys(item).some(
                (key) =>
                  /semana\s*\d+/i.test(
                    key,
                  ),
              );

            return (
              hasIdentity &&
              (
                hasRangeFormat ||
                hasWeeklyFormat
              )
            );
          });

        if (finalData.length === 0) {
          throw new Error(
            "El Excel no contiene filas válidas en la hoja Planificacion.",
          );
        }

        const targetMonth =
          visibleMonthDate;

        const payload = {
          month:
            targetMonth.getMonth() + 1,
          year:
            targetMonth.getFullYear(),
          routes:
            finalData,
        };

        if (
          canManageCompanies &&
          filterCompany
        ) {
          payload.company_id =
            filterCompany;
        }

        console.log(
          "📤 PAYLOAD EXCEL MULTIMES:",
          {
            sheet:
              planningSheetName,
            rows:
              finalData.length,
            first_row:
              finalData[0],
            payload,
          },
        );

        const response =
          await api.post(
            "/routes/bulk-create",
            payload,
          );

        const result =
          response?.data ||
          response;

        if (!result?.success) {
          const requestError =
            new Error(
              result?.message ||
              "La carga masiva no fue procesada.",
            );

          requestError.data =
            result;

          throw requestError;
        }

        const warnings = [
          ...(Array.isArray(
            result?.errors,
          )
            ? result.errors
            : []),
          ...(Array.isArray(
            result?.warnings,
          )
            ? result.warnings
            : []),
        ];

        if (warnings.length > 0) {
          console.warn(
            "⚠️ Advertencias carga multimes:",
            warnings,
          );
        }

        toast.success(
          `${
            result?.count || 0
          } rutas creadas correctamente.`,
          {
            id:
              toastId,
            duration:
              warnings.length > 0
                ? 6500
                : 3500,
          },
        );

        await fetchData();
      } catch (error) {
        const {
          message,
          details,
          payload,
        } =
          getBackendError(
            error,
          );

        console.error(
          "❌ Error procesando Excel:",
          {
            message,
            details,
            payload,
            error,
          },
        );

        const detailText =
          details.length > 0
            ? ` ${details
                .slice(0, 2)
                .join(" | ")}`
            : "";

        toast.error(
          `${message}${detailText}`,
          {
            id:
              toastId,
            duration:
              9000,
          },
        );
      } finally {
        event.target.value = "";
      }
    };

    reader.readAsArrayBuffer(file);
  };

  const groupedRoutes = useMemo(() => {
    const groups = {};
    const search =
      searchTerm
        .trim()
        .toLowerCase();

    routes.forEach((route) => {
      if (!route.local_id) {
        return;
      }

      if (
        canManageCompanies &&
        filterCompany &&
        String(route.company_id) !==
          String(filterCompany)
      ) {
        return;
      }

      const localData =
        localById.get(
          String(route.local_id),
        ) || {};

      const userData =
        userById.get(
          String(route.user_id),
        ) || {};

      const companyData =
        companyById.get(
          String(route.company_id),
        ) || {};

      const region =
        localData.region_name ||
        localData.region ||
        route.region ||
        "";

      const comuna =
        localData.comuna_name ||
        localData.comuna ||
        route.comuna ||
        "";

      if (
        selectedRegion &&
        region !== selectedRegion
      ) {
        return;
      }

      if (
        selectedComuna &&
        comuna !== selectedComuna
      ) {
        return;
      }

      const cadena =
        route.cadena ||
        localData.cadena ||
        localData.nombre ||
        "Local sin nombre";

      const direccion =
        route.direccion ||
        localData.direccion ||
        "Sin dirección";

      const codigoLocal =
        route.codigo_local ||
        localData.codigo_local ||
        localData.codigo ||
        "S/C";

      const firstName =
        route.first_name ||
        userData.first_name ||
        userData.nombre ||
        "";

      const lastName =
        route.last_name ||
        userData.last_name ||
        userData.apellido ||
        "";

      const fullName =
        `${firstName} ${lastName}`.trim() ||
        "Sin asignar";

      const matchesSearch =
        !search ||
        cadena
          .toLowerCase()
          .includes(search) ||
        direccion
          .toLowerCase()
          .includes(search) ||
        String(codigoLocal)
          .toLowerCase()
          .includes(search) ||
        fullName
          .toLowerCase()
          .includes(search);

      const matchesUser =
        !filterUser ||
        fullName === filterUser;

      if (!matchesSearch || !matchesUser) {
        return;
      }

      const routeDate =
        resolveRouteDate(route);

      const periodStart =
        resolvePeriodStart(route);

      const periodEnd =
        resolvePeriodEnd(route);

      const finalWeek =
        resolveWeekNumber(
          route,
          routeDate,
        );

      const finalDay =
        resolveDayNumber(
          route,
          routeDate,
        );

      const routeMonthKey =
        resolvePlanningMonthKey(
          route,
          calendarMonth,
        );

      const routeMonthDate =
        parseMonthKey(
          routeMonthKey,
        );

      const effectiveRouteDate =
        routeDate ||
        (
          finalDay !== null &&
          Number.isInteger(
            finalDay,
          )
            ? deriveLegacyDate(
                routeMonthDate,
                finalWeek,
                finalDay,
              )
            : ""
        );

      const dateAnchor =
        periodStart ||
        effectiveRouteDate ||
        (
          routeMonthKey
            ? `${routeMonthKey}-01`
            : ""
        );

      /*
       * La clave incluye el mes. De esta forma una planificación
       * de agosto y otra de septiembre nunca se mezclan aunque
       * compartan local o schedule_group_id.
       */
      const groupKey =
        route.schedule_group_id
          ? `group-${route.schedule_group_id}-${routeMonthKey}`
          : [
              "local",
              route.local_id,
              routeMonthKey ||
                dateAnchor ||
                route.origin ||
                "legacy",
            ].join("-");

      const hasDay =
        finalDay !== null &&
        Number.isInteger(finalDay);

      const startTime =
        route.start_time ??
        route.startTime ??
        route.entrada;

      const endTime =
        route.end_time ??
        route.endTime ??
        route.salida;

      const turnName =
        route.nombre_turno ??
        route.nombreTurno ??
        route.turno_id ??
        "Turno";

      const item = hasDay
        ? {
            route_id:
              route.id,
            visit_number:
              route.visit_number ||
              null,
            order_sequence:
              Number(
                route.order_sequence,
              ) || 0,
            schedule_group_id:
              route.schedule_group_id ||
              null,
            date:
              effectiveRouteDate,
            month_key:
              routeMonthKey,
            day:
              finalDay,
            week:
              finalWeek,
            time:
              startTime,
            endTime,
            turno:
              route.origin === "INDIVIDUAL"
                ? (
                    turnName &&
                    turnName !== "Turno"
                      ? turnName
                      : "Individual"
                  )
                : turnName,
            userName:
              fullName,
            user_id:
              route.user_id,
            turno_id:
              route.nombre_turno ||
              route.turno_id,
            status:
              normalizeStatus(
                route.status,
              ),
          }
        : null;

      if (!groups[groupKey]) {
        groups[groupKey] = {
          ...route,
          key:
            groupKey,
          cadena,
          direccion,
          codigo_local:
            codigoLocal,
          company_name:
            companyData.name ||
            companyData.nombre ||
            route.company_name ||
            "",
          region,
          comuna,
          id:
            route.id,
          route_ids: [
            route.id,
          ],
          route_ids_by_user: {
            [route.user_id]:
              route.id,
          },
          users:
            new Set([
              fullName,
            ]),
          scheduled_items:
            item ? [item] : [],
          all_statuses: [
            route.status,
          ],
          period_start_date:
            periodStart ||
            routeDate ||
            "",
          period_end_date:
            periodEnd ||
            routeDate ||
            "",
          planning_period:
            route.planning_period ||
            route.period_type ||
            "",
          planning_month_key:
            routeMonthKey,
        };

        const monthBounds =
          getMonthBounds(
            routeMonthKey,
          );

        if (
          !groups[groupKey]
            .period_start_date
        ) {
          groups[groupKey]
            .period_start_date =
            monthBounds.start;
        }

        if (
          !groups[groupKey]
            .period_end_date
        ) {
          groups[groupKey]
            .period_end_date =
            monthBounds.end;
        }

        return;
      }

      const group =
        groups[groupKey];

      group.users.add(fullName);
      group.route_ids.push(route.id);
      group.route_ids_by_user[
        route.user_id
      ] = route.id;

      if (item) {
        const itemIdentity =
          item.route_id
            ? `route:${item.route_id}`
            : [
                "legacy",
                item.visit_number ||
                  "",
                item.user_id ||
                  "",
                item.date ||
                  "",
                item.week ??
                  "",
                item.day ??
                  "",
                normalizeTime(
                  item.time,
                ),
                normalizeTime(
                  item.endTime,
                ),
                item.turno_id ||
                  item.turno ||
                  "",
                item.order_sequence ??
                  0,
              ].join(":");

        const exists =
          group.scheduled_items.some(
            (existing) => {
              const existingIdentity =
                existing.route_id
                  ? `route:${existing.route_id}`
                  : [
                      "legacy",
                      existing.visit_number ||
                        "",
                      existing.user_id ||
                        "",
                      existing.date ||
                        "",
                      existing.week ??
                        "",
                      existing.day ??
                        "",
                      normalizeTime(
                        existing.time,
                      ),
                      normalizeTime(
                        existing.endTime,
                      ),
                      existing.turno_id ||
                        existing.turno ||
                        "",
                      existing.order_sequence ??
                        0,
                    ].join(":");

              return (
                existingIdentity ===
                itemIdentity
              );
            },
          );

        if (!exists) {
          group.scheduled_items.push(
            item,
          );
        }
      }

      group.all_statuses.push(
        route.status,
      );

      const currentStart =
        group.period_start_date;

      const currentEnd =
        group.period_end_date;

      const candidateStart =
        periodStart ||
        routeDate;

      const candidateEnd =
        periodEnd ||
        routeDate;

      if (
        candidateStart &&
        (
          !currentStart ||
          candidateStart < currentStart
        )
      ) {
        group.period_start_date =
          candidateStart;
      }

      if (
        candidateEnd &&
        (
          !currentEnd ||
          candidateEnd > currentEnd
        )
      ) {
        group.period_end_date =
          candidateEnd;
      }
    });

    return Object.values(groups)
      .map((group) => {
        const scheduledDates =
          group.scheduled_items
            .map((item) => item.date)
            .filter(Boolean)
            .sort();

        const periodStart =
          group.period_start_date ||
          scheduledDates[0] ||
          "";

        const periodEnd =
          group.period_end_date ||
          scheduledDates[
            scheduledDates.length - 1
          ] ||
          "";

        const planningMonthKey =
          resolveGroupMonthKey(
            group,
            calendarMonth,
          );

        const monthBounds =
          getMonthBounds(
            planningMonthKey,
          );

        return {
          ...group,
          planning_month_key:
            planningMonthKey,
          users:
            Array.from(
              group.users,
            ),
          scheduled_items:
            [...group.scheduled_items].sort(
              (a, b) =>
                String(
                  a.date || "",
                ).localeCompare(
                  String(
                    b.date || "",
                  ),
                ) ||
                normalizeTime(
                  a.time,
                ).localeCompare(
                  normalizeTime(
                    b.time,
                  ),
                ) ||
                Number(
                  a.order_sequence ||
                    0,
                ) -
                  Number(
                    b.order_sequence ||
                      0,
                  ) ||
                String(
                  a.visit_number ||
                    a.route_id ||
                    "",
                ).localeCompare(
                  String(
                    b.visit_number ||
                      b.route_id ||
                      "",
                  ),
                ),
            ),
          period_start_date:
            periodStart ||
            monthBounds.start,
          period_end_date:
            periodEnd ||
            monthBounds.end,
          displayStatus:
            getGroupDisplayStatus(
              group.all_statuses,
            ),
        };
      })
      .filter((group) => {
        const groupMonthKey =
          resolveGroupMonthKey(
            group,
            calendarMonth,
          );

        /*
         * Cada tarjeta pertenece a un único mes.
         * Ya no se usa una intersección amplia que podía mantener
         * visibles planificaciones de agosto/septiembre bajo julio.
         */
        if (
          groupMonthKey !==
          calendarMonth
        ) {
          return false;
        }

        if (!targetDateInfo) {
          return true;
        }

        return group.scheduled_items.some(
          (item) => {
            const itemDate =
              item.date ||
              deriveLegacyDate(
                parseMonthKey(
                  groupMonthKey,
                ),
                Number(item.week),
                Number(item.day),
              );

            return (
              itemDate ===
              targetDateInfo.date
            );
          },
        );
      })
      .sort((a, b) => {
        const statusCompare =
          STATUS_PRIORITY.indexOf(
            a.displayStatus,
          ) -
          STATUS_PRIORITY.indexOf(
            b.displayStatus,
          );

        if (statusCompare !== 0) {
          return statusCompare;
        }

        return String(a.cadena).localeCompare(
          String(b.cadena),
          "es",
        );
      });
  }, [
    calendarMonth,
    canManageCompanies,
    companyById,
    filterCompany,
    filterUser,
    localById,
    routes,
    searchTerm,
    selectedComuna,
    selectedRegion,
    targetDateInfo,
    userById,
    visibleMonthDate,
  ]);

  const metrics = useMemo(() => {
    const stores =
      new Set(
        groupedRoutes.map(
          (group) =>
            String(group.local_id),
        ),
      ).size;

    const assignedUsers =
      new Set(
        groupedRoutes.flatMap(
          (group) =>
            group.scheduled_items
              .map((item) =>
                String(item.user_id || ""),
              )
              .filter(Boolean),
        ),
      ).size;

    const assignments =
      groupedRoutes.reduce(
        (total, group) =>
          total +
          group.scheduled_items.length,
        0,
      );

    return {
      plans:
        groupedRoutes.length,
      stores,
      assignedUsers,
      assignments,
    };
  }, [groupedRoutes]);

  const hasActiveFilters =
    Boolean(
      searchTerm ||
        filterUser ||
        filterDate ||
        filterCompany ||
        selectedRegion ||
        selectedComuna,
    );

  const clearFilters = () => {
    setSearchTerm("");
    setFilterUser("");
    setFilterDate("");
    setFilterCompany("");
    setSelectedRegion("");
    setSelectedComuna("");
  };

  const moveMonth = (amount) => {
    const next =
      new Date(
        visibleMonthDate.getFullYear(),
        visibleMonthDate.getMonth() +
          amount,
        1,
        12,
        0,
        0,
        0,
      );

    setCalendarMonth(
      toMonthKey(
        next,
      ),
    );

    setFilterDate("");
  };

  const renderPlanningCard = (
    group,
    index,
  ) => {
    const groupMonthKey =
      resolveGroupMonthKey(
        group,
        calendarMonth,
      );

    const groupMonthDate =
      parseMonthKey(
        groupMonthKey,
      );

    const groupMonthBounds =
      getMonthBounds(
        groupMonthKey,
      );

    const monthItems =
      group.scheduled_items.filter(
        (item) => {
          const itemDate =
            item.date ||
            deriveLegacyDate(
              groupMonthDate,
              Number(item.week),
              Number(item.day),
            );

          return (
            itemDate &&
            toMonthKey(itemDate) ===
              groupMonthKey
          );
        },
      );

    return (
      <motion.article
        key={group.key || `card-${index}`}
        initial={{
          opacity: 0,
          y: 10,
        }}
        animate={{
          opacity: 1,
          y: 0,
        }}
        transition={{
          duration: 0.2,
          delay:
            Math.min(index * 0.03, 0.18),
        }}
        className="flex min-w-0 flex-col overflow-hidden rounded-[2rem] border border-slate-100 bg-white shadow-sm transition hover:border-[#87be00]/25 hover:shadow-md"
      >
        <div className="flex flex-col gap-4 border-b border-slate-100 p-5 sm:p-6">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-[#87be00]/10 px-3 py-1 text-[8px] font-black uppercase tracking-wider text-[#679300]">
                  {group.codigo_local}
                </span>

                {group.company_name &&
                  canManageCompanies && (
                    <span className="max-w-full truncate rounded-full border border-slate-100 bg-slate-50 px-3 py-1 text-[8px] font-black uppercase tracking-wider text-slate-500">
                      {group.company_name}
                    </span>
                  )}
              </div>

              <h3 className="mt-3 truncate text-lg font-black tracking-tight text-slate-900">
                {group.cadena}
              </h3>

              <p className="mt-1 flex items-start gap-2 text-[10px] font-semibold leading-relaxed text-slate-400">
                <FiMapPin
                  size={13}
                  className="mt-0.5 shrink-0"
                />
                <span className="line-clamp-2">
                  {group.direccion}
                </span>
              </p>
            </div>

            <StatusBadge
              status={group.displayStatus}
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-3.5">
              <p className="text-[8px] font-black uppercase tracking-[0.14em] text-slate-400">
                Periodo
              </p>

              <p className="mt-1.5 text-[10px] font-black leading-relaxed text-slate-800">
                {formatPeriod(
                  group.period_start_date ||
                    groupMonthBounds.start,
                  group.period_end_date ||
                    groupMonthBounds.end,
                )}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-3.5">
              <p className="text-[8px] font-black uppercase tracking-[0.14em] text-slate-400">
                Cobertura del mes
              </p>

              <p className="mt-1.5 text-[10px] font-black text-slate-800">
                {monthItems.length} asignación
                {monthItems.length === 1
                  ? ""
                  : "es"}
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-1 flex-col gap-5 p-5 sm:p-6">
          <div>
            <div className="mb-3 flex items-center justify-between gap-3">
              <p className="text-[9px] font-black uppercase tracking-[0.16em] text-slate-500">
                Calendario del mes
              </p>

              <span className="text-[8px] font-black uppercase tracking-wider text-[#679300]">
                {formatDate(groupMonthDate, {
                  month: "long",
                  year: "numeric",
                })}
              </span>
            </div>

            <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-3">
              <PlanningMonthGrid
                scheduledItems={
                  monthItems
                }
                monthDate={
                  groupMonthDate
                }
              />
            </div>
          </div>

          <div>
            <p className="mb-3 text-[9px] font-black uppercase tracking-[0.16em] text-slate-500">
              Equipo y próximos turnos
            </p>

            <div className="mb-3 flex items-center gap-3 rounded-2xl border border-slate-100 bg-white px-3 py-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
                <FiUsers size={15} />
              </span>

              <p className="min-w-0 truncate text-[10px] font-black uppercase text-slate-700">
                {group.users.join(" / ")}
              </p>
            </div>

            <PlanningAssignmentList
              items={monthItems}
            />
          </div>
        </div>

        <footer className="flex items-center justify-end gap-2 border-t border-slate-100 bg-slate-50/50 px-5 py-4 sm:px-6">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            leftIcon={
              <FiEdit3 size={14} />
            }
            onClick={() => {
              setSelectedRoute(group);
              setIsModalOpen(true);
            }}
          >
            Editar
          </Button>

          <IconButton
            label="Eliminar planificación"
            size="sm"
            variant="danger"
            onClick={() =>
              handleDeleteRoute(group)
            }
          >
            <FiTrash2 size={15} />
          </IconButton>
        </footer>
      </motion.article>
    );
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-4 text-center font-[Outfit]">
        <span className="flex h-16 w-16 items-center justify-center rounded-full bg-[#87be00]/10 text-[#87be00]">
          <FiRefreshCw
            className="animate-spin"
            size={28}
          />
        </span>

        <div>
          <p className="text-sm font-black text-slate-900">
            Cargando planificaciones
          </p>

          <p className="mt-1 text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">
            Sincronizando rutas y calendarios
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-20 font-[Outfit] sm:space-y-6">
      <section className="overflow-hidden rounded-[2rem] border border-slate-100 bg-white shadow-sm sm:rounded-[2.5rem]">
        <div className="relative overflow-hidden border-b border-slate-100 px-5 py-6 sm:px-7 sm:py-8">
          <div className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-[#87be00]/8" />

          <div className="relative flex flex-col gap-6 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex min-w-0 items-start gap-4">
              <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[1.25rem] bg-[#87be00] text-white shadow-lg shadow-[#87be00]/20">
                <FiCalendar size={23} />
              </span>

              <div className="min-w-0">
                <p className="text-[9px] font-black uppercase tracking-[0.22em] text-[#87be00]">
                  CultivApp · Planificación operativa
                </p>

                <h1 className="mt-2 text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
                  Planificaciones
                </h1>

                <p className="mt-2 max-w-2xl text-[11px] font-semibold leading-relaxed text-slate-400">
                  Visualiza periodos, equipos, horarios y cobertura mensual de cada punto de venta.
                </p>
              </div>
            </div>

            <div className="flex w-full flex-wrap items-center gap-2 xl:w-auto xl:justify-end">
              <IconButton
                label="Actualizar planificaciones"
                size="lg"
                onClick={fetchData}
              >
                <FiRefreshCw size={18} />
              </IconButton>

              <IconButton
                label="Ver formato de carga masiva"
                size="lg"
                onClick={() =>
                  setShowBulkHelp(true)
                }
              >
                <FiHelpCircle size={18} />
              </IconButton>

              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept=".xlsx,.xls"
                onChange={handleImportExcel}
              />

              <Button
                type="button"
                size="lg"
                leftIcon={
                  <FiUploadCloud size={16} />
                }
                onClick={() =>
                  fileInputRef.current?.click()
                }
                className="flex-1 whitespace-nowrap sm:flex-none"
              >
                Importar Excel
              </Button>

              <Button
                type="button"
                variant="dark"
                size="lg"
                leftIcon={
                  <FiPlus size={16} />
                }
                onClick={() => {
                  setSelectedRoute(null);
                  setIsModalOpen(true);
                }}
                className="flex-1 whitespace-nowrap sm:flex-none"
              >
                Nueva planificación
              </Button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 bg-slate-50/50 p-4 sm:p-6 lg:grid-cols-4">
          <MetricCard
            icon={FiLayers}
            label="Planificaciones"
            value={metrics.plans}
            detail="Grupos visibles"
            accent
          />

          <MetricCard
            icon={FiMapPin}
            label="Locales"
            value={metrics.stores}
            detail="Puntos de venta"
          />

          <MetricCard
            icon={FiUsers}
            label="Mercaderistas"
            value={metrics.assignedUsers}
            detail="Usuarios asignados"
          />

          <MetricCard
            icon={FiBarChart2}
            label="Asignaciones"
            value={metrics.assignments}
            detail="Días planificados"
          />
        </div>
      </section>

      <section className="rounded-[2rem] border border-slate-100 bg-white p-4 shadow-sm sm:p-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#87be00]/10 text-[#87be00]">
              <FiFilter size={16} />
            </span>

            <div>
              <p className="text-[9px] font-black uppercase tracking-[0.16em] text-slate-700">
                Filtros y periodo
              </p>

              <p className="mt-1 text-[9px] font-semibold text-slate-400">
                Selecciona el mes que deseas visualizar.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 rounded-2xl border border-slate-100 bg-slate-50 p-1.5">
            <button
              type="button"
              onClick={() => moveMonth(-1)}
              className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-500 transition hover:bg-white hover:text-[#679300]"
              aria-label="Mes anterior"
            >
              <FiChevronLeft size={16} />
            </button>

            <div className="relative min-w-0 flex-1 sm:min-w-[190px]">
              <input
                type="month"
                value={calendarMonth}
                onChange={(event) => {
                  setCalendarMonth(
                    event.target.value,
                  );
                  setFilterDate("");
                }}
                className="block h-9 w-full min-w-0 border-0 bg-transparent p-0 text-center text-[10px] font-black uppercase text-slate-800 outline-none"
              />
            </div>

            <button
              type="button"
              onClick={() => moveMonth(1)}
              className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-500 transition hover:bg-white hover:text-[#679300]"
              aria-label="Mes siguiente"
            >
              <FiChevronRight size={16} />
            </button>
          </div>
        </div>

        <div
          className={`mt-5 grid grid-cols-1 gap-3 md:grid-cols-2 ${
            canManageCompanies
              ? "xl:grid-cols-6"
              : "xl:grid-cols-5"
          }`}
        >
          {canManageCompanies && (
            <label className="block">
              <span className="mb-2 block text-[8px] font-black uppercase tracking-[0.14em] text-slate-400">
                Empresa
              </span>

              <div className="relative">
                <FiBriefcase
                  className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#87be00]"
                  size={15}
                />

                <select
                  value={filterCompany}
                  onChange={(event) =>
                    setFilterCompany(
                      event.target.value,
                    )
                  }
                  className="h-12 w-full appearance-none rounded-2xl border border-slate-100 bg-slate-50 pl-11 pr-11 text-[10px] font-black text-slate-600 outline-none transition focus:border-[#87be00]/40 focus:bg-white focus:ring-4 focus:ring-[#87be00]/10"
                >
                  <option value="">
                    Todas las empresas
                  </option>

                  {companies.map((company) => (
                    <option
                      key={company.id}
                      value={company.id}
                    >
                      {company.name ||
                        company.nombre ||
                        "Empresa"}
                    </option>
                  ))}
                </select>

                <FiChevronDown
                  className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-400"
                  size={14}
                />
              </div>
            </label>
          )}

          <label className="block">
            <span className="mb-2 block text-[8px] font-black uppercase tracking-[0.14em] text-slate-400">
              Búsqueda
            </span>

            <div className="relative">
              <FiSearch
                className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#87be00]"
                size={15}
              />

              <input
                type="text"
                value={searchTerm}
                onChange={(event) =>
                  setSearchTerm(
                    event.target.value,
                  )
                }
                placeholder="Local, código o usuario"
                className="h-12 w-full rounded-2xl border border-slate-100 bg-slate-50 pl-11 pr-10 text-[10px] font-black text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-[#87be00]/40 focus:bg-white focus:ring-4 focus:ring-[#87be00]/10"
              />

              {searchTerm && (
                <button
                  type="button"
                  onClick={() =>
                    setSearchTerm("")
                  }
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-red-500"
                  aria-label="Limpiar búsqueda"
                >
                  <FiX size={14} />
                </button>
              )}
            </div>
          </label>

          <label className="block">
            <span className="mb-2 block text-[8px] font-black uppercase tracking-[0.14em] text-slate-400">
              Región
            </span>

            <div className="relative">
              <FiGlobe
                className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#87be00]"
                size={15}
              />

              <select
                value={selectedRegion}
                onChange={(event) => {
                  setSelectedRegion(
                    event.target.value,
                  );
                  setSelectedComuna("");
                }}
                className="h-12 w-full appearance-none rounded-2xl border border-slate-100 bg-slate-50 pl-11 pr-11 text-[10px] font-black text-slate-600 outline-none transition focus:border-[#87be00]/40 focus:bg-white focus:ring-4 focus:ring-[#87be00]/10"
              >
                <option value="">
                  Todas las regiones
                </option>

                {regions.map((region) => (
                  <option
                    key={region}
                    value={region}
                  >
                    {region}
                  </option>
                ))}
              </select>

              <FiChevronDown
                className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-400"
                size={14}
              />
            </div>
          </label>

          <label className="block">
            <span className="mb-2 block text-[8px] font-black uppercase tracking-[0.14em] text-slate-400">
              Comuna
            </span>

            <div className="relative">
              <FiMapPin
                className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#87be00]"
                size={15}
              />

              <select
                value={selectedComuna}
                onChange={(event) =>
                  setSelectedComuna(
                    event.target.value,
                  )
                }
                className="h-12 w-full appearance-none rounded-2xl border border-slate-100 bg-slate-50 pl-11 pr-11 text-[10px] font-black text-slate-600 outline-none transition focus:border-[#87be00]/40 focus:bg-white focus:ring-4 focus:ring-[#87be00]/10"
              >
                <option value="">
                  Todas las comunas
                </option>

                {comunas.map((comuna) => (
                  <option
                    key={comuna}
                    value={comuna}
                  >
                    {comuna}
                  </option>
                ))}
              </select>

              <FiChevronDown
                className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-400"
                size={14}
              />
            </div>
          </label>

          <label className="block">
            <span className="mb-2 block text-[8px] font-black uppercase tracking-[0.14em] text-slate-400">
              Mercaderista
            </span>

            <div className="relative">
              <FiUsers
                className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#87be00]"
                size={15}
              />

              <select
                value={filterUser}
                onChange={(event) =>
                  setFilterUser(
                    event.target.value,
                  )
                }
                className="h-12 w-full appearance-none rounded-2xl border border-slate-100 bg-slate-50 pl-11 pr-11 text-[10px] font-black text-slate-600 outline-none transition focus:border-[#87be00]/40 focus:bg-white focus:ring-4 focus:ring-[#87be00]/10"
              >
                <option value="">
                  Todos los mercaderistas
                </option>

                {uniqueMercaderistas.map(
                  (name) => (
                    <option
                      key={name}
                      value={name}
                    >
                      {name}
                    </option>
                  ),
                )}
              </select>

              <FiChevronDown
                className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-400"
                size={14}
              />
            </div>
          </label>

          <label className="block">
            <span className="mb-2 block text-[8px] font-black uppercase tracking-[0.14em] text-slate-400">
              Fecha exacta
            </span>

            <div className="flex h-12 w-full min-w-0 items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50 px-4 transition focus-within:border-[#87be00]/40 focus-within:bg-white focus-within:ring-4 focus-within:ring-[#87be00]/10">
              <FiCalendar
                className="shrink-0 text-[#87be00]"
                size={15}
              />

              <input
                type="date"
                value={filterDate}
                onChange={(event) => {
                  setFilterDate(
                    event.target.value,
                  );

                  if (event.target.value) {
                    setCalendarMonth(
                      event.target.value.slice(
                        0,
                        7,
                      ),
                    );
                  }
                }}
                className="block w-full min-w-0 border-0 bg-transparent p-0 text-[10px] font-black text-slate-600 outline-none"
              />

              {filterDate && (
                <button
                  type="button"
                  onClick={() =>
                    setFilterDate("")
                  }
                  className="shrink-0 text-slate-400 hover:text-red-500"
                  aria-label="Limpiar fecha"
                >
                  <FiX size={14} />
                </button>
              )}
            </div>
          </label>
        </div>

        <div className="mt-4 flex flex-col gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex gap-2 overflow-x-auto pb-1">
            {weekRanges.map((week) => (
              <span
                key={week.weekNum}
                className={`shrink-0 rounded-xl border px-3 py-2 text-[8px] font-black uppercase tracking-wider ${
                  activeWeekByDate ===
                  week.weekNum
                    ? "border-[#87be00] bg-[#87be00] text-white"
                    : "border-slate-100 bg-slate-50 text-slate-400"
                }`}
              >
                {week.label} · {week.dates}
              </span>
            ))}
          </div>

          <div className="flex items-center gap-2">
            {hasActiveFilters && (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                leftIcon={
                  <FiX size={13} />
                }
                onClick={clearFilters}
              >
                Limpiar filtros
              </Button>
            )}

            <div className="hidden items-center gap-1 rounded-xl border border-slate-100 bg-slate-50 p-1 lg:flex">
              <button
                type="button"
                onClick={() =>
                  setViewMode("cards")
                }
                className={`flex h-8 w-8 items-center justify-center rounded-lg transition ${
                  viewMode === "cards"
                    ? "bg-white text-[#679300] shadow-sm"
                    : "text-slate-400"
                }`}
                aria-label="Vista en tarjetas"
              >
                <FiGrid size={14} />
              </button>

              <button
                type="button"
                onClick={() =>
                  setViewMode("table")
                }
                className={`flex h-8 w-8 items-center justify-center rounded-lg transition ${
                  viewMode === "table"
                    ? "bg-white text-[#679300] shadow-sm"
                    : "text-slate-400"
                }`}
                aria-label="Vista en tabla"
              >
                <FiList size={14} />
              </button>
            </div>
          </div>
        </div>
      </section>

      {groupedRoutes.length === 0 ? (
        <section className="rounded-[2rem] border border-dashed border-slate-200 bg-white px-6 py-16 text-center">
          <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 text-slate-300">
            <FiCalendar size={25} />
          </span>

          <h2 className="mt-5 text-base font-black text-slate-800">
            Sin planificaciones disponibles
          </h2>

          <p className="mx-auto mt-2 max-w-md text-[10px] font-semibold leading-relaxed text-slate-400">
            No existen planificaciones para el mes y los filtros seleccionados.
          </p>
        </section>
      ) : (
        <>
          <div
            className={`grid grid-cols-1 gap-5 ${
              viewMode === "cards"
                ? "xl:grid-cols-2"
                : "lg:hidden"
            }`}
          >
            {groupedRoutes.map(
              renderPlanningCard,
            )}
          </div>

          {viewMode === "table" && (
            <section className="hidden overflow-hidden rounded-[2rem] border border-slate-100 bg-white shadow-sm lg:block">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1180px] border-collapse text-left">
                  <thead className="border-b border-slate-100 bg-slate-50/70">
                    <tr>
                      <th className="px-6 py-5 text-[9px] font-black uppercase tracking-[0.16em] text-slate-400">
                        Punto de venta
                      </th>

                      <th className="px-6 py-5 text-[9px] font-black uppercase tracking-[0.16em] text-slate-400">
                        Periodo y equipo
                      </th>

                      <th className="px-6 py-5 text-[9px] font-black uppercase tracking-[0.16em] text-slate-400">
                        Calendario mensual
                      </th>

                      <th className="px-6 py-5 text-center text-[9px] font-black uppercase tracking-[0.16em] text-slate-400">
                        Estado
                      </th>

                      <th className="px-6 py-5 text-right text-[9px] font-black uppercase tracking-[0.16em] text-slate-400">
                        Acciones
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {groupedRoutes.map(
                      (group) => (
                        <tr
                          key={`table-${group.key}`}
                          className="transition hover:bg-slate-50/50"
                        >
                          <td className="px-6 py-5">
                            <div className="max-w-xs">
                              <p className="truncate text-[12px] font-black uppercase text-slate-900">
                                {group.cadena}
                              </p>

                              <p className="mt-1.5 line-clamp-2 text-[10px] font-semibold leading-relaxed text-slate-400">
                                {group.direccion}
                              </p>

                              <span className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-2.5 py-1 text-[8px] font-black uppercase tracking-wider text-slate-500">
                                <FiHash size={10} />
                                {group.codigo_local}
                              </span>
                            </div>
                          </td>

                          <td className="px-6 py-5">
                            <div className="max-w-sm">
                              <p className="text-[9px] font-black uppercase tracking-wider text-[#679300]">
                                {(() => {
                                  const groupMonthKey =
                                    resolveGroupMonthKey(
                                      group,
                                      calendarMonth,
                                    );

                                  const bounds =
                                    getMonthBounds(
                                      groupMonthKey,
                                    );

                                  return formatPeriod(
                                    group.period_start_date ||
                                      bounds.start,
                                    group.period_end_date ||
                                      bounds.end,
                                  );
                                })()}
                              </p>

                              <div className="mt-3 flex items-center gap-2">
                                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
                                  <FiUsers size={13} />
                                </span>

                                <p className="truncate text-[10px] font-black uppercase text-slate-700">
                                  {group.users.join(" / ")}
                                </p>
                              </div>

                              <p className="mt-2 text-[8px] font-semibold text-slate-400">
                                {group.scheduled_items.length} asignaciones registradas
                              </p>
                            </div>
                          </td>

                          <td className="px-6 py-5">
                            <div className="w-[330px] rounded-2xl border border-slate-100 bg-slate-50/60 p-3">
                              <PlanningMonthGrid
                                scheduledItems={
                                  group.scheduled_items
                                }
                                monthDate={
                                  parseMonthKey(
                                    resolveGroupMonthKey(
                                      group,
                                      calendarMonth,
                                    ),
                                  )
                                }
                              />
                            </div>
                          </td>

                          <td className="px-6 py-5 text-center">
                            <div className="flex justify-center">
                              <StatusBadge
                                status={
                                  group.displayStatus
                                }
                              />
                            </div>
                          </td>

                          <td className="px-6 py-5">
                            <div className="flex justify-end gap-2">
                              <IconButton
                                label="Editar planificación"
                                size="sm"
                                variant="primary"
                                onClick={() => {
                                  setSelectedRoute(
                                    group,
                                  );
                                  setIsModalOpen(
                                    true,
                                  );
                                }}
                              >
                                <FiEdit3 size={15} />
                              </IconButton>

                              <IconButton
                                label="Eliminar planificación"
                                size="sm"
                                variant="danger"
                                onClick={() =>
                                  handleDeleteRoute(
                                    group,
                                  )
                                }
                              >
                                <FiTrash2 size={15} />
                              </IconButton>
                            </div>
                          </td>
                        </tr>
                      ),
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </>
      )}

      <ManageRoutesModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedRoute(null);
        }}
        users={users}
        locales={locales}
        companies={companies}
        onCreated={fetchData}
        initialData={selectedRoute}
      />

      {showBulkHelp && (
        <BulkPlanningHelpModal
          onClose={() =>
            setShowBulkHelp(false)
          }
        />
      )}

      {groupToDelete && (
        <DeleteRouteModal
          group={groupToDelete}
          onClose={() =>
            setGroupToDelete(null)
          }
          onConfirm={confirmDelete}
        />
      )}
    </div>
  );
};

/* SUBCOMPONENTE: AYUDA Y PLANTILLA DE CARGA MASIVA */
const BulkPlanningHelpModal = ({ onClose }) => {
  /*
   * La plantilla multimes se genera directamente con SheetJS.
   *
   * Esto evita depender de una ruta pública que pueda ser
   * interceptada por el fallback SPA de Vercel.
   *
   * El archivo generado contiene:
   * - Planificacion
   * - Ejemplos
   * - Formato_Mensual
   * - Instrucciones
   */
  const handleDownloadTemplate = async () => {
    try {
      /*
       * Se descarga el archivo XLSX real incluido como asset de Vite.
       *
       * Esto permite conservar funciones que SheetJS Community no
       * genera de forma confiable, como el selector desplegable de
       * Tipo_Periodo.
       */
      const response =
        await fetch(
          planningTemplateUrl,
        );

      if (!response.ok) {
        throw new Error(
          "No fue posible cargar la plantilla.",
        );
      }

      const blob =
        await response.blob();

      const objectUrl =
        URL.createObjectURL(
          blob,
        );

      const link =
        document.createElement(
          "a",
        );

      link.href =
        objectUrl;

      link.download =
        "plantilla_planificacion_masiva_multimes.xlsx";

      document.body.appendChild(
        link,
      );

      link.click();
      link.remove();

      URL.revokeObjectURL(
        objectUrl,
      );
    } catch (error) {
      console.error(
        "❌ Error descargando plantilla multimes:",
        error,
      );

      toast.error(
        "No fue posible descargar la plantilla de planificación.",
      );
    }
  };

  const requiredColumns = [
    {
      name:
        "Rut_Mercaderista",
      description:
        "RUT del mercaderista con dígito verificador. Debe existir y pertenecer a la empresa seleccionada.",
      example:
        "18.083.379-K",
    },
    {
      name:
        "Codigo",
      description:
        "Código interno exacto del local registrado en CultivApp.",
      example:
        "CASA",
    },
    {
      name:
        "Fecha_Inicio",
      description:
        "Primer día del periodo que se planificará. Usa el formato YYYY-MM-DD.",
      example:
        "2026-08-03",
    },
    {
      name:
        "Fecha_Termino",
      description:
        "Último día incluido en la planificación. Puede pertenecer a otro mes cuando Tipo_Periodo es RANGO.",
      example:
        "2026-09-30",
    },
    {
      name:
        "Turno",
      description:
        "Nombre exacto de un turno activo. Sus días y horarios se obtienen automáticamente desde la configuración.",
      example:
        "TURNO VENDEDOR",
    },
    {
      name:
        "Tipo_Periodo",
      description:
        "Usa SEMANA, MES o RANGO. Para planificar varios meses utiliza RANGO.",
      example:
        "RANGO",
    },
    {
      name:
        "Observacion",
      description:
        "Campo opcional para identificar el objetivo o alcance de la fila.",
      example:
        "Turno de lunes y viernes",
    },
  ];

  const rules = [
    "Usa una fila por cada turno que quieras aplicar.",
    "Selecciona RANGO, MES o SEMANA desde la lista desplegable.",
    "Para dos turnos en el mismo usuario y local, repite RUT, código y fechas en dos filas.",
    "Mantén una sola hoja principal llamada Planificacion.",
    "No cambies los nombres de los encabezados.",
    "Usa el código exacto del local.",
    "Usa el nombre exacto del turno.",
    "No combines celdas.",
    "Guarda el archivo en formato .xlsx.",
  ];

  return (
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center bg-[#111111]/70 p-3 font-[Outfit] backdrop-blur-sm sm:p-5"
      role="dialog"
      aria-modal="true"
      aria-labelledby="bulk-planning-help-title"
    >
      <div className="relative flex max-h-[94vh] w-full max-w-4xl flex-col overflow-hidden rounded-[2rem] border border-white/60 bg-white shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        <header className="relative shrink-0 border-b border-gray-100 bg-white px-5 py-5 sm:px-7 sm:py-6">
          <div className="absolute inset-x-0 top-0 h-1 bg-[#87be00]" />

          <div className="flex items-start justify-between gap-4">
            <div className="flex min-w-0 items-center gap-3.5">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#87be00]/10 text-[#87be00]">
                <FiFileText size={20} />
              </div>

              <div className="min-w-0">
                <p className="text-[9px] font-black uppercase tracking-[0.22em] text-[#87be00]">
                  Carga masiva multimes
                </p>

                <h2
                  id="bulk-planning-help-title"
                  className="mt-1 text-xl font-black leading-none tracking-tight text-gray-900 sm:text-2xl"
                >
                  Formato de planificaciones
                </h2>

                <p className="mt-2 text-[11px] font-medium leading-relaxed text-gray-400">
                  Descarga la plantilla para semanas, meses, rangos multimes y varios turnos por usuario/local.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label="Cerrar ayuda de carga masiva"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-gray-100 bg-gray-50 text-gray-400 transition-all hover:border-red-100 hover:bg-red-50 hover:text-red-500"
            >
              <FiX size={18} />
            </button>
          </div>
        </header>

        <div className="custom-scrollbar min-h-0 flex-1 space-y-5 overflow-y-auto overscroll-contain bg-gray-50/40 px-5 py-5 sm:px-7 sm:py-6">
          <section className="rounded-[1.6rem] border border-[#87be00]/20 bg-[#87be00]/5 p-4 sm:p-5">
            <div className="flex items-start gap-3">
              <FiAlertCircle
                className="mt-0.5 shrink-0 text-[#679300]"
                size={17}
              />

              <div>
                <h3 className="text-[10px] font-black uppercase tracking-[0.16em] text-[#679300]">
                  Regla para varios turnos
                </h3>

                <p className="mt-2 text-[11px] font-semibold leading-relaxed text-gray-600">
                  Cada fila representa un turno. Para asignar TURNO VENDEDOR y TURNO VENDEDOR B al mismo usuario y local, crea dos filas con el mismo RUT, código y periodo.
                </p>
              </div>
            </div>
          </section>

          <section className="overflow-hidden rounded-[1.6rem] border border-gray-100 bg-white shadow-sm">
            <div className="border-b border-gray-100 px-4 py-4 sm:px-5">
              <h3 className="text-[10px] font-black uppercase tracking-[0.16em] text-gray-800">
                Ejemplo: dos turnos
              </h3>

              <p className="mt-1 text-[10px] font-medium leading-relaxed text-gray-400">
                Ambas filas se aplicarán al mismo mercaderista, local y rango de fechas.
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-[820px] w-full text-left">
                <thead className="bg-gray-50">
                  <tr>
                    {[
                      "RUT",
                      "Código",
                      "Inicio",
                      "Término",
                      "Turno",
                      "Periodo",
                    ].map(
                      (heading) => (
                        <th
                          key={heading}
                          className="px-4 py-3 text-[8px] font-black uppercase tracking-wider text-gray-400"
                        >
                          {heading}
                        </th>
                      ),
                    )}
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-100">
                  {[
                    [
                      "18.083.379-K",
                      "CASA",
                      "2026-08-03",
                      "2026-09-30",
                      "TURNO VENDEDOR",
                      "RANGO",
                    ],
                    [
                      "18.083.379-K",
                      "CASA",
                      "2026-08-03",
                      "2026-09-30",
                      "TURNO VENDEDOR B",
                      "RANGO",
                    ],
                  ].map(
                    (row) => (
                      <tr
                        key={row[4]}
                      >
                        {row.map(
                          (
                            cell,
                            index,
                          ) => (
                            <td
                              key={`${row[4]}-${index}`}
                              className="whitespace-nowrap px-4 py-3 text-[9px] font-bold text-gray-600"
                            >
                              {cell}
                            </td>
                          ),
                        )}
                      </tr>
                    ),
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <section className="overflow-hidden rounded-[1.6rem] border border-gray-100 bg-white shadow-sm">
            <div className="border-b border-gray-100 px-4 py-4 sm:px-5">
              <h3 className="text-[10px] font-black uppercase tracking-[0.16em] text-gray-800">
                Leyenda de columnas
              </h3>

              <p className="mt-1 text-[10px] font-medium text-gray-400">
                El RUT, código del local y nombre del turno deben coincidir con los registros existentes.
              </p>
            </div>

            <div className="divide-y divide-gray-100">
              {requiredColumns.map(
                (column) => (
                  <div
                    key={
                      column.name
                    }
                    className="grid grid-cols-1 gap-2 px-4 py-4 sm:grid-cols-[170px_1fr] sm:px-5"
                  >
                    <div>
                      <span className="inline-flex rounded-lg border border-[#87be00]/20 bg-[#87be00]/10 px-2.5 py-1 font-mono text-[9px] font-black text-[#679300]">
                        {
                          column.name
                        }
                      </span>
                    </div>

                    <div>
                      <p className="text-[10px] font-semibold leading-relaxed text-gray-600">
                        {
                          column.description
                        }
                      </p>

                      <p className="mt-1 text-[9px] font-medium text-gray-400">
                        Ejemplo:{" "}
                        <strong className="text-gray-600">
                          {
                            column.example
                          }
                        </strong>
                      </p>
                    </div>
                  </div>
                ),
              )}
            </div>
          </section>

          <section className="rounded-[1.6rem] border border-gray-100 bg-white p-4 shadow-sm sm:p-5">
            <h3 className="text-[10px] font-black uppercase tracking-[0.16em] text-gray-800">
              Antes de importar
            </h3>

            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {rules.map(
                (rule) => (
                  <div
                    key={rule}
                    className="flex items-start gap-2 rounded-2xl border border-gray-100 bg-gray-50 px-3.5 py-3"
                  >
                    <FiCheckCircle
                      className="mt-0.5 shrink-0 text-[#87be00]"
                      size={14}
                    />

                    <span className="text-[10px] font-semibold leading-relaxed text-gray-600">
                      {rule}
                    </span>
                  </div>
                ),
              )}
            </div>
          </section>
        </div>

        <footer className="grid shrink-0 grid-cols-1 gap-3 border-t border-gray-100 bg-white px-5 py-4 sm:grid-cols-[auto_1fr] sm:px-7">
          <button
            type="button"
            onClick={onClose}
            className="order-2 rounded-2xl border border-gray-100 bg-gray-50 px-6 py-3.5 text-[9px] font-black uppercase tracking-[0.16em] text-gray-500 transition-all hover:bg-gray-100 sm:order-1"
          >
            Cerrar
          </button>

          <button
            type="button"
            onClick={
              handleDownloadTemplate
            }
            className="order-1 flex items-center justify-center gap-2 rounded-2xl bg-gray-900 px-6 py-3.5 text-[9px] font-black uppercase tracking-[0.18em] text-white shadow-lg shadow-gray-200 transition-all hover:bg-[#87be00] sm:order-2"
          >
            <FiDownload
              size={15}
            />
            Descargar plantilla multimes
          </button>
        </footer>
      </div>
    </div>
  );
};

/* SUBCOMPONENTE: MODAL DE ELIMINACIÓN DE RUTA */
const DeleteRouteModal = ({ group, onClose, onConfirm }) => {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleConfirm = async () => {
    try {
      setIsDeleting(true);
      await onConfirm();
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-[#111111]/70 backdrop-blur-sm flex items-center justify-center p-4 z-[9999] font-[Outfit]">
      <div className="bg-white w-full max-w-md rounded-2xl border border-gray-100 shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200 p-6 relative">
        
        <IconButton
          label="Cerrar confirmación"
          size="sm"
          onClick={onClose}
          className="absolute top-4 right-4"
        >
          <FiX size={16} />
        </IconButton>

        <div className="flex flex-col items-center text-center mt-3">
          <div className="w-12 h-12 bg-red-50 text-red-600 rounded-xl flex items-center justify-center mb-4">
            <FiAlertCircle size={24} />
          </div>
          
          <h3 className="text-base font-extrabold text-[#111111] uppercase tracking-tight">
            ¿Eliminar planificación?
          </h3>
          
          <p className="text-xs text-gray-500 mt-2 leading-relaxed">
            Se eliminarán permanentemente <strong>{group.route_ids?.length || 1} asignaciones</strong> asociadas al punto de venta <strong className="text-gray-800 uppercase font-bold">{group.cadena}</strong>. Esta acción no se puede deshacer.
          </p>
          
          <div className="bg-gray-50 border border-gray-100 rounded-xl p-2.5 mt-3 w-full flex items-center justify-center gap-2">
            <span className="text-[9px] font-extrabold text-gray-400 uppercase tracking-wider">Código: {group.codigo_local}</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 mt-6">
          <button 
            onClick={onClose} 
            disabled={isDeleting}
            className="w-full py-3 bg-gray-50 hover:bg-gray-100 text-gray-500 font-bold uppercase text-[10px] tracking-wider rounded-xl transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          
          <button
            onClick={handleConfirm}
            disabled={isDeleting}
            className="w-full bg-red-600 hover:bg-red-700 text-white py-3 rounded-xl font-bold uppercase tracking-wider text-[10px] transition-all flex items-center justify-center gap-1.5 shadow-sm disabled:opacity-50"
          >
            {isDeleting ? (
              <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
            ) : (
              <> <FiTrash2 size={13} /> Eliminar </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminRoutes;