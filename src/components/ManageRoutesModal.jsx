import React, { useState, useMemo, useEffect, useRef } from "react";
import {
  FiClock, FiX, FiUser, FiBriefcase,
  FiTrash2, FiLoader, FiCheckCircle, FiLayers, FiCalendar, FiMapPin, FiEdit3, FiInfo, FiSearch, FiCopy
} from "react-icons/fi";
import api from "../api/apiClient";
import toast from "react-hot-toast";
import { getWeeksOfMonthCalendar } from "../utils/helper";

const addDays = (date, amount) => {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  next.setHours(12, 0, 0, 0);
  return next;
};

const startOfCalendarWeek = (date) => {
  const normalized = new Date(date);
  normalized.setHours(12, 0, 0, 0);

  const day = normalized.getDay();
  const offset = day === 0 ? -6 : 1 - day;

  return addDays(normalized, offset);
};

const endOfCalendarWeek = (date) =>
  addDays(startOfCalendarWeek(date), 6);

const endOfMonth = (date) => {
  const normalized = new Date(date);

  return new Date(
    normalized.getFullYear(),
    normalized.getMonth() + 1,
    0,
    12,
    0,
    0,
    0,
  );
};

const toDateInputValue = (date) => {
  const normalized =
    date instanceof Date
      ? new Date(date)
      : new Date();

  normalized.setMinutes(
    normalized.getMinutes() -
      normalized.getTimezoneOffset(),
  );

  return normalized
    .toISOString()
    .slice(0, 10);
};

const parseDateInput = (value) => {
  const parsed = value
    ? new Date(`${value}T12:00:00`)
    : new Date();

  return Number.isNaN(parsed.getTime())
    ? new Date()
    : parsed;
};

const getCellKey = (week, day) =>
  `${toDateInputValue(week.start)}-${day}`;

const getDateForWeekDay = (week, day) => {
  const offset =
    Number(day) === 0
      ? 6
      : Number(day) - 1;

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

const isDateInsideRange = (
  date,
  startDate,
  endDate,
) => {
  if (!date || !startDate || !endDate) {
    return false;
  }

  const target = new Date(date);
  const start = new Date(startDate);
  const end = new Date(endDate);

  target.setHours(12, 0, 0, 0);
  start.setHours(0, 0, 0, 0);
  end.setHours(23, 59, 59, 999);

  return target >= start && target <= end;
};

const buildWeeksForRange = (
  startDate,
  endDate,
) => {
  if (!startDate || !endDate || endDate < startDate) {
    return [];
  }

  const firstWeekStart =
    startOfCalendarWeek(startDate);

  const lastWeekStart =
    startOfCalendarWeek(endDate);

  const weeks = [];
  let cursor = new Date(firstWeekStart);
  let index = 1;

  while (cursor <= lastWeekStart) {
    const start = new Date(cursor);
    const end = endOfCalendarWeek(start);

    weeks.push({
      id: index,
      start,
      end,
    });

    cursor = addDays(cursor, 7);
    index += 1;
  }

  return weeks;
};

const createDateRange = (
  startDate,
  endDate,
) => {
  if (!startDate || !endDate || endDate < startDate) {
    return [];
  }

  const dates = [];
  let cursor = new Date(startDate);

  while (cursor <= endDate) {
    dates.push(new Date(cursor));
    cursor = addDays(cursor, 1);
  }

  return dates;
};

const formatLongDate = (date) =>
  new Intl.DateTimeFormat("es-CL", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(date);

const formatShortDate = (date) =>
  new Intl.DateTimeFormat("es-CL", {
    day: "2-digit",
    month: "short",
  })
    .format(date)
    .replace(".", "");

const formatWeekLabel = (week) => {
  if (!week?.start || !week?.end) {
    return "";
  }

  return `${formatShortDate(week.start)} — ${formatShortDate(week.end)}`;
};

const formatPeriodRange = (
  startDate,
  endDate,
) => {
  if (!startDate || !endDate) {
    return "";
  }

  return `${formatLongDate(startDate)} — ${formatLongDate(endDate)}`;
};

const getWeekNumberForDate = (date) => {
  const monthWeeks =
    getWeeksOfMonthCalendar(date);

  const matchedWeek =
    monthWeeks.find((week) =>
      isDateInsideWeek(date, week),
    );

  return Number(matchedWeek?.id) || 1;
};

const DAYS_OF_WEEK = [
  { id: 1, label: "Lunes", short: "L" }, { id: 2, label: "Martes", short: "M" }, 
  { id: 3, label: "Miércoles", short: "X" }, { id: 4, label: "Jueves", short: "J" }, 
  { id: 5, label: "Viernes", short: "V" }, { id: 6, label: "Sábado", short: "S" }, 
  { id: 0, label: "Domingo", short: "D" },
];

const ROLES_TURNOS = [
  { id: "MERCADERISTA FULL", label: "Mercaderista Full Time" },
  { id: "MERCADERISTA PT",   label: "Mercaderista Part Time" },
];

// Cultiva company ID constante
const CULTIVA_COMPANY_ID = "0e342e01-d213-4353-b210-39a12ac335cf";

// ─── COMPONENTE SELECTOR DE HORA EN FORMATO 24H ───────────────────────────────
const TimePicker24h = ({ value, onChange, disabled }) => {
  const [hh, mm] = (value || "00:00").split(":");

  const handleChange = (type, val) => {
    const newHH = type === "h" ? val.padStart(2, "0") : hh;
    const newMM = type === "m" ? val.padStart(2, "0") : mm;
    onChange({ target: { value: `${newHH}:${newMM}` } });
  };

  return (
    <div
      className={`flex items-center justify-center gap-1 w-full bg-white border border-[#87be00]/20 rounded-xl px-3 py-2.5 transition-all ${
        disabled ? "opacity-50 cursor-not-allowed" : "hover:border-[#87be00]/50"
      }`}
    >
      <select
        disabled={disabled}
        className="bg-transparent text-xs font-bold outline-none cursor-pointer text-gray-800"
        value={hh}
        onChange={(e) => handleChange("h", e.target.value)}
      >
        {Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0")).map((h) => (
          <option key={h} value={h}>{h}</option>
        ))}
      </select>
      <span className="text-xs font-black text-gray-400 select-none">:</span>
      <select
        disabled={disabled}
        className="bg-transparent text-xs font-bold outline-none cursor-pointer text-gray-800"
        value={mm}
        onChange={(e) => handleChange("m", e.target.value)}
      >
        {["00", "05", "10", "15", "20", "25", "30", "35", "40", "45", "50", "55"].map((m) => (
          <option key={m} value={m}>{m}</option>
        ))}
      </select>
    </div>
  );
};
// ──────────────────────────────────────────────────────────────────────────────

const ManageRoutesModal = ({
  isOpen, onClose,
  users = [], locales = [], companies = [],
  onCreated, initialData = null,
}) => {
  const isEditing = !!initialData;
  const [loading, setLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [turnosRaw, setTurnosRaw] = useState([]);

  const userString = localStorage.getItem("user");
  const currentUser = userString ? JSON.parse(userString) : null;
  const isRoot = currentUser?.role?.toUpperCase() === "ROOT";
  const isAdminClient = currentUser?.role?.toUpperCase() === "ADMIN_CLIENTE";
  const canSelectCompany = isRoot || isAdminClient;

  // 1. DÓNDE
  const [localId, setLocalId] = useState("");
  const [companyId, setCompanyId] = useState(currentUser?.company_id || "");
  const [cadenaFilter, setCadenaFilter] = useState("");
  const [codigoFilter, setCodigoFilter] = useState("");

  // 2. PERIODO, FECHA DE INICIO Y SEMANA OBJETIVO
  const [
    planningPeriod,
    setPlanningPeriod,
  ] = useState("WEEK");

  const [
    planningStartDate,
    setPlanningStartDate,
  ] = useState(() =>
    toDateInputValue(new Date()),
  );

  const [
    planningEndDate,
    setPlanningEndDate,
  ] = useState(() =>
    toDateInputValue(
      addDays(new Date(), 6),
    ),
  );

  const [
    targetWeek,
    setTargetWeek,
  ] = useState(null);

  const selectedStartDate =
    useMemo(
      () =>
        parseDateInput(
          planningStartDate,
        ),
      [planningStartDate],
    );

  const selectedEndDate =
    useMemo(
      () =>
        planningPeriod === "WEEK"
          ? addDays(
              selectedStartDate,
              6,
            )
          : parseDateInput(
              planningEndDate,
            ),
      [
        planningEndDate,
        planningPeriod,
        selectedStartDate,
      ],
    );

  const isPlanningRangeValid =
    useMemo(
      () =>
        selectedEndDate >=
        selectedStartDate,
      [
        selectedEndDate,
        selectedStartDate,
      ],
    );

  const WEEKS =
    useMemo(
      () =>
        isPlanningRangeValid
          ? buildWeeksForRange(
              selectedStartDate,
              selectedEndDate,
            )
          : [],
      [
        isPlanningRangeValid,
        selectedEndDate,
        selectedStartDate,
      ],
    );

  const weeklyDates =
    useMemo(
      () =>
        planningPeriod === "WEEK"
          ? createDateRange(
              selectedStartDate,
              selectedEndDate,
            )
          : [],
      [
        planningPeriod,
        selectedEndDate,
        selectedStartDate,
      ],
    );

  const periodEndDate =
    useMemo(
      () =>
        toDateInputValue(
          selectedEndDate,
        ),
      [selectedEndDate],
    );

  useEffect(() => {
    if (
      !isOpen ||
      WEEKS.length === 0
    ) {
      return;
    }

    const preferredWeek =
      WEEKS.find((week) =>
        isDateInsideWeek(
          selectedStartDate,
          week,
        ),
      ) ||
      WEEKS[0];

    setTargetWeek(
      preferredWeek,
    );
  }, [
    WEEKS,
    isOpen,
    selectedStartDate,
  ]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const scheduledItems =
      Array.isArray(
        initialData?.scheduled_items,
      )
        ? initialData.scheduled_items
        : [];

    const firstDate =
      initialData?.period_start_date ||
      initialData?.planning_start_date ||
      scheduledItems[0]?.date ||
      initialData?.visit_date ||
      null;

    const finalDate =
      initialData?.period_end_date ||
      initialData?.planning_end_date ||
      scheduledItems[
        scheduledItems.length - 1
      ]?.date ||
      null;

    const resolvedStart =
      firstDate
        ? String(firstDate).slice(0, 10)
        : toDateInputValue(new Date());

    const initialPeriod =
      String(
        initialData?.planning_period ||
        initialData?.period_type ||
        "",
      ).toUpperCase();

    const firstParsed =
      parseDateInput(resolvedStart);

    const resolvedEnd =
      finalDate
        ? String(finalDate).slice(0, 10)
        : toDateInputValue(
            addDays(firstParsed, 6),
          );

    const daysBetween =
      Math.round(
        (
          parseDateInput(resolvedEnd) -
          firstParsed
        ) /
          86400000,
      );

    const useCustomRange =
      initialPeriod === "MONTH" ||
      initialPeriod === "CUSTOM_RANGE" ||
      daysBetween > 6;

    setPlanningPeriod(
      useCustomRange
        ? "MONTH"
        : "WEEK",
    );

    setPlanningStartDate(
      resolvedStart,
    );

    setPlanningEndDate(
      useCustomRange
        ? resolvedEnd
        : toDateInputValue(
            addDays(
              firstParsed,
              6,
            ),
          ),
    );
  }, [
    initialData,
    isOpen,
  ]);

  const [brush, setBrush] = useState({
    user_id: "",
    rol: "",
    turno_id: "",
    start_time: "08:00",
    end_time: "16:00",
  });

  const [
    matrix,
    setMatrix,
  ] = useState({});

  const handlePlanningPeriodChange = (
    nextPeriod,
  ) => {
    const start =
      parseDateInput(
        planningStartDate,
      );

    setPlanningPeriod(
      nextPeriod,
    );

    setMatrix({});

    if (
      nextPeriod === "WEEK"
    ) {
      setPlanningEndDate(
        toDateInputValue(
          addDays(start, 6),
        ),
      );

      return;
    }

    const currentEnd =
      parseDateInput(
        planningEndDate,
      );

    if (
      currentEnd <=
      addDays(start, 6)
    ) {
      setPlanningEndDate(
        toDateInputValue(
          endOfMonth(start),
        ),
      );
    }
  };

  const handlePlanningStartChange = (
    value,
  ) => {
    if (!value) {
      return;
    }

    const start =
      parseDateInput(value);

    setPlanningStartDate(
      value,
    );

    setMatrix({});

    if (
      planningPeriod === "WEEK"
    ) {
      setPlanningEndDate(
        toDateInputValue(
          addDays(start, 6),
        ),
      );

      return;
    }

    const currentEnd =
      parseDateInput(
        planningEndDate,
      );

    if (
      currentEnd < start
    ) {
      setPlanningEndDate(
        toDateInputValue(
          endOfMonth(start),
        ),
      );
    }
  };

  const handlePlanningEndChange = (
    value,
  ) => {
    if (!value) {
      return;
    }

    const nextEnd =
      parseDateInput(value);

    if (
      nextEnd <
      selectedStartDate
    ) {
      toast.error(
        "La fecha final no puede ser anterior a la fecha de inicio.",
      );

      return;
    }

    setPlanningEndDate(
      value,
    );

    setMatrix({});
  };

  const [showClearMenu, setShowClearMenu] = useState(false);
  const [eraserMode, setEraserMode] = useState(false);

  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);
  const [userSearchTerm, setUserSearchTerm] = useState("");
  const userDropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (userDropdownRef.current && !userDropdownRef.current.contains(event.target)) {
        setIsUserDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setEraserMode(false);
    setIsUserDropdownOpen(false);
    setUserSearchTerm("");

    const initializationWeek =
      WEEKS.find(
        (week) =>
          isDateInsideWeek(
            selectedStartDate,
            week,
          ),
      ) ||
      WEEKS[0] ||
      null;

    if (
      initialData &&
      initializationWeek
    ) {
      setLocalId(
        initialData.local_id ||
        "",
      );

      setCompanyId(
        initialData.company_id ||
        currentUser?.company_id ||
        "",
      );

      setCadenaFilter("");
      setCodigoFilter("");

      const newMatrix = {};
      let firstBrush = null;

      const scheduledItems =
        Array.isArray(
          initialData.scheduled_items,
        )
          ? initialData.scheduled_items
          : [];

      scheduledItems.forEach(
        (item) => {
          const day =
            parseInt(
              item.day,
              10,
            );

          const itemWeekId =
            parseInt(
              item.week_number ??
              item.week,
              10,
            ) ||
            initializationWeek.id ||
            1;

          const matchedWeek =
            WEEKS.find(
              (week) =>
                item.date &&
                isDateInsideWeek(
                  parseDateInput(
                    String(
                      item.date,
                    ).slice(
                      0,
                      10,
                    ),
                  ),
                  week,
                ),
            ) ||
            WEEKS.find(
              (week) =>
                Number(
                  week.id,
                ) ===
                Number(
                  itemWeekId,
                ),
            ) ||
            initializationWeek;

          if (
            !matchedWeek ||
            !Number.isInteger(day)
          ) {
            return;
          }

          const key =
            getCellKey(
              matchedWeek,
              day,
            );

          const itemUserId =
            item.user_id;

          if (!itemUserId) {
            return;
          }

          const cellData = {
            user_id:
              String(itemUserId),
            turno_id:
              item.turno_id ||
              item.turno ||
              (
                item.turno &&
                item.turno !== "null"
                  ? item.turno
                  : "INDIVIDUAL"
              ),
            start_time:
              item.time
                ? item.time.slice(
                    0,
                    5,
                  )
                : item.start_time
                  ? item.start_time.slice(
                      0,
                      5,
                    )
                  : "08:00",
            end_time:
              item.endTime
                ? item.endTime.slice(
                    0,
                    5,
                  )
                : item.end_time
                  ? item.end_time.slice(
                      0,
                      5,
                    )
                  : "16:00",
            rol:
              item.rol ||
              (
                initialData.nombre_turno
                  ?.includes("PT")
                  ? "MERCADERISTA PT"
                  : "MERCADERISTA FULL"
              ),
          };

          if (!newMatrix[key]) {
            newMatrix[key] = [];
          }

          const alreadyAdded =
            newMatrix[key].some(
              (assignment) =>
                String(
                  assignment.user_id,
                ) ===
                String(
                  cellData.user_id,
                ),
            );

          if (!alreadyAdded) {
            newMatrix[key].push(
              cellData,
            );
          }

          if (!firstBrush) {
            firstBrush =
              cellData;
          }
        },
      );

      setMatrix(newMatrix);

      if (firstBrush) {
        setBrush(
          firstBrush,
        );
      }

      return;
    }

    setLocalId("");
    setCompanyId(
      currentUser?.company_id ||
      "",
    );
    setCadenaFilter("");
    setCodigoFilter("");
    setMatrix({});
    setBrush({
      user_id: "",
      rol: "",
      turno_id: "",
      start_time: "08:00",
      end_time: "16:00",
    });
  }, [
    WEEKS,
    currentUser?.company_id,
    initialData,
    isOpen,
    selectedStartDate,
  ]);

  const fetchTurnos = async (cId) => {
    try {
      const targetId = cId || (canSelectCompany ? companyId : currentUser?.company_id);
      if (!targetId) return setTurnosRaw([]);
      const res = await api.get(`/turnos-config?company_id=${targetId}`);
      setTurnosRaw(Array.isArray(res) ? res : []);
    } catch { setTurnosRaw([]); }
  };

  useEffect(() => {
    if (isOpen) fetchTurnos(companyId);
  }, [isOpen, companyId]);

  const turnosAgrupados = useMemo(() => {
    if (!brush.rol || brush.rol === "INDIVIDUAL") return [];
    const filtrados = turnosRaw.filter(t => t.categoria_rol?.toString().toUpperCase() === brush.rol.toUpperCase());
    
    const agrupados = filtrados.reduce((acc, curr) => {
      if (!acc[curr.nombre_turno]) {
        acc[curr.nombre_turno] = {
          nombre:
            curr.nombre_turno,
          entrada:
            curr.entrada,
          salida:
            curr.salida,
          dias: [],
          horariosPorDia: {},
        };
      }

      if (
        curr.day_of_week !== null &&
        curr.day_of_week !== undefined
      ) {
        const day =
          parseInt(
            curr.day_of_week,
            10,
          );

        if (
          !acc[
            curr.nombre_turno
          ].dias.includes(day)
        ) {
          acc[
            curr.nombre_turno
          ].dias.push(day);
        }

        acc[
          curr.nombre_turno
        ].horariosPorDia[
          day
        ] = {
          entrada:
            curr.entrada
              ? curr.entrada.slice(
                  0,
                  5,
                )
              : "08:00",
          salida:
            curr.salida
              ? curr.salida.slice(
                  0,
                  5,
                )
              : "16:00",
        };
      }

      return acc;
    }, {});
    
    return Object.values(agrupados);
  }, [turnosRaw, brush.rol]);

  const filteredUsers = useMemo(() => {
    let pool = users.filter((u) => u.role?.toUpperCase() === "USUARIO");
    if (companyId) pool = pool.filter((u) => u.company_id === companyId);
    return pool;
  }, [users, companyId]);

  const selectedUserText = useMemo(() => {
    if (!brush.user_id) return "1º Elige Reponedor...";
    const u = filteredUsers.find(u => String(u.id) === String(brush.user_id));
    return u ? `${u.first_name} ${u.last_name}` : "1º Elige Reponedor...";
  }, [brush.user_id, filteredUsers]);

  const availableCompanies = useMemo(() => {
    const userCompanyId = currentUser?.company_id?.trim?.() || "";
    const isCultivaAdmin = isAdminClient && userCompanyId === CULTIVA_COMPANY_ID;
    
    if (isRoot || isCultivaAdmin) {
      return [...companies].sort((a, b) => {
        if (a.id === CULTIVA_COMPANY_ID) return -1;
        if (b.id === CULTIVA_COMPANY_ID) return 1;
        return a.name.localeCompare(b.name);
      });
    }
    
    if (isAdminClient && userCompanyId) {
      return companies.filter(c => c.id === userCompanyId);
    }
    
    return [];
  }, [companies, isRoot, isAdminClient, currentUser?.company_id]);

  const uniqueCadenas = useMemo(() => {
    const availableLocales = companyId 
      ? locales.filter(l => String(l.company_id).trim() === String(companyId).trim())
      : locales;
    
    const cadenas = [...new Set(availableLocales.map(l => l.cadena).filter(Boolean))].sort();
    return cadenas;
  }, [locales, companyId]);

  const filteredLocales = useMemo(() => locales.filter(l => {
    const matchCompany = !companyId || String(l.company_id).trim() === String(companyId).trim();
    const matchCadena = !cadenaFilter || String(l.cadena).trim() === String(cadenaFilter).trim();
    const matchCodigo = !codigoFilter || (l.codigo_local && String(l.codigo_local).toLowerCase().includes(codigoFilter.toLowerCase()));
    return matchCompany && matchCadena && matchCodigo;
  }), [locales, companyId, cadenaFilter, codigoFilter]);

  useEffect(() => {
    if (filteredLocales.length === 1 && localId !== filteredLocales[0].id) {
      setLocalId(filteredLocales[0].id);
    }
  }, [filteredLocales, localId]);

  const handleTurnoChange = (e) => {
    const tName = e.target.value;
    const tData = turnosAgrupados.find(t => t.nombre === tName);

    const newBrush = {
      ...brush,
      turno_id: tName,
      start_time: tData?.entrada ? tData.entrada.slice(0, 5) : brush.start_time,
      end_time: tData?.salida ? tData.salida.slice(0, 5) : brush.end_time,
    };

    setBrush(newBrush);

    if (
      newBrush.user_id &&
      tName &&
      tName !== "INDIVIDUAL" &&
      tData
    ) {
      const diasObjetivo =
        tData.dias.length > 0
          ? tData.dias
          : [1, 2, 3, 4, 5];

      const weeksToApply =
        planningPeriod ===
        "MONTH"
          ? WEEKS
          : [targetWeek].filter(
              Boolean,
            );

      setMatrix((prev) => {
        const newState = {
          ...prev,
        };

        weeksToApply.forEach(
          (week) => {
            diasObjetivo.forEach(
              (day) => {
                const cellDate =
                  getDateForWeekDay(
                    week,
                    day,
                  );

                if (
                  !isDateInsideRange(
                    cellDate,
                    selectedStartDate,
                    selectedEndDate,
                  )
                ) {
                  return;
                }

                const daySchedule =
                  tData
                    .horariosPorDia?.[
                    day
                  ];

                const assignment = {
                  ...newBrush,
                  start_time:
                    daySchedule
                      ?.entrada ||
                    newBrush.start_time,
                  end_time:
                    daySchedule
                      ?.salida ||
                    newBrush.end_time,
                };

                const key =
                  getCellKey(
                    week,
                    day,
                  );

                const currentCell =
                  newState[key] ||
                  [];

                const hasUser =
                  currentCell.some(
                    (item) =>
                      String(
                        item.user_id,
                      ) ===
                      String(
                        assignment.user_id,
                      ),
                  );

                newState[key] =
                  hasUser
                    ? currentCell.map(
                        (item) =>
                          String(
                            item.user_id,
                          ) ===
                          String(
                            assignment.user_id,
                          )
                            ? assignment
                            : item,
                      )
                    : [
                        ...currentCell,
                        assignment,
                      ];
              },
            );
          },
        );

        return newState;
      });

      toast.success(
        planningPeriod ===
        "MONTH"
          ? "Turno aplicado al periodo personalizado"
          : "Turno aplicado a la semana",
        {
          icon: "⚡",
        },
      );
    }
  };

  const handleIndividualTimeChange = (field, value) => {
    const newBrush = { ...brush, [field]: value };
    setBrush(newBrush);

    if (newBrush.user_id && newBrush.turno_id === "INDIVIDUAL") {
      setMatrix(prev => {
        const newState = { ...prev };
        Object.keys(newState).forEach(key => {
          newState[key] = newState[key].map(a =>
            String(a.user_id) === String(newBrush.user_id) && a.turno_id === "INDIVIDUAL"
              ? { ...a, start_time: newBrush.start_time, end_time: newBrush.end_time }
              : a
          );
        });
        return newState;
      });
    }
  };

  const handleCellClick = (
    week,
    day,
  ) => {
    const cellDate =
      getDateForWeekDay(
        week,
        day,
      );

    if (
      !isDateInsideRange(
        cellDate,
        selectedStartDate,
        selectedEndDate,
      )
    ) {
      return;
    }

    const key =
      getCellKey(
        week,
        day,
      );

    if (eraserMode) {
      setMatrix(prev => {
        const newState = { ...prev };
        delete newState[key];
        return newState;
      });
      return;
    }

    if (!brush.user_id || !brush.turno_id) {
      toast.error("Configura tu pincel (Reponedor y Turno) antes de pintar", { icon: "🖌️" });
      return;
    }

    setMatrix(prev => {
      const currentCellArray = prev[key] || [];
      const userIndex = currentCellArray.findIndex(a => String(a.user_id) === String(brush.user_id));
      let newCellArray;

      if (userIndex >= 0) {
        newCellArray = currentCellArray.map((a, idx) =>
          idx === userIndex ? { ...brush } : a
        );
      } else {
        newCellArray = [...currentCellArray, { ...brush }];
      }

      return { ...prev, [key]: newCellArray };
    });
  };

  const fillTargetWeek = (
    fillAllPeriod = false,
  ) => {
    if (
      !brush.user_id ||
      !brush.turno_id
    ) {
      toast.error(
        "Selecciona un reponedor y un turno antes de llenar el calendario.",
      );

      return;
    }

    const weeks =
      fillAllPeriod
        ? WEEKS
        : [
            targetWeek,
          ].filter(Boolean);

    setMatrix(
      (previous) => {
        const newState = {
          ...previous,
        };

        weeks.forEach(
          (week) => {
            DAYS_OF_WEEK.forEach(
              (day) => {
                const cellDate =
                  getDateForWeekDay(
                    week,
                    day.id,
                  );

                if (
                  !isDateInsideRange(
                    cellDate,
                    selectedStartDate,
                    selectedEndDate,
                  )
                ) {
                  return;
                }

                const key =
                  getCellKey(
                    week,
                    day.id,
                  );

                const current =
                  newState[key] ||
                  [];

                const exists =
                  current.some(
                    (assignment) =>
                      String(
                        assignment.user_id,
                      ) ===
                      String(
                        brush.user_id,
                      ),
                  );

                newState[key] =
                  exists
                    ? current.map(
                        (assignment) =>
                          String(
                            assignment.user_id,
                          ) ===
                          String(
                            brush.user_id,
                          )
                            ? {
                                ...brush,
                              }
                            : assignment,
                      )
                    : [
                        ...current,
                        {
                          ...brush,
                        },
                      ];
              },
            );
          },
        );

        return newState;
      },
    );

    toast.success(
      fillAllPeriod
        ? "Periodo completo llenado"
        : "Semana llenada",
    );
  };

  const clearWeek = () => {
    if (window.confirm(`¿Seguro que deseas borrar la planificación de esta semana?`)) {
      setMatrix(prev => {
        const newState = { ...prev };
        Object.keys(newState).forEach(key => {
          if (
            key.startsWith(
              toDateInputValue(
                targetWeek.start,
              ),
            )
          ) {
            delete newState[key];
          }
        });
        return newState;
      });
      setShowClearMenu(false);
      toast.success(`Semana limpiada`);
    }
  };

  const clearMonth = () => {
    if (window.confirm("¿Seguro que deseas borrar todo el periodo seleccionado?")) {
      setMatrix({});
      setShowClearMenu(false);
      toast.success("Periodo personalizado limpiado");
    }
  };

  const handleManualSubmit = async (e) => {
    e.preventDefault();
    if (!localId) {
      return toast.error(
        "Selecciona un local.",
      );
    }

    if (
      !isPlanningRangeValid
    ) {
      return toast.error(
        "Revisa el rango de fechas seleccionado.",
      );
    }

    if (
      Object.keys(
        matrix,
      ).length === 0
    ) {
      return toast.error(
        "Debes pintar al menos un día.",
      );
    }

    setLoading(true);
    try {
      const assignmentsByUser = {};
      
      /*
       * Cada celda se transforma a su fecha calendario real.
       * Esto permite guardar rangos que cruzan varios meses.
       */
      Object.entries(
        matrix,
      ).forEach(
        ([
          key,
          userArray,
        ]) => {
          const parts =
            key.split("-");

          const day =
            parseInt(
              parts[
                parts.length - 1
              ],
              10,
            );

          const weekStart =
            parts
              .slice(0, 3)
              .join("-");

          const matchedWeek =
            WEEKS.find(
              (week) =>
                toDateInputValue(
                  week.start,
                ) ===
                weekStart,
            );

          if (
            !matchedWeek ||
            !Number.isInteger(day)
          ) {
            return;
          }

          const assignmentDate =
            getDateForWeekDay(
              matchedWeek,
              day,
            );

          if (
            !isDateInsideRange(
              assignmentDate,
              selectedStartDate,
              selectedEndDate,
            )
          ) {
            return;
          }

          const date =
            toDateInputValue(
              assignmentDate,
            );

          const weekNumber =
            getWeekNumberForDate(
              assignmentDate,
            );

          userArray.forEach(
            (data) => {
              const userId =
                String(
                  data.user_id,
                );

              if (
                !assignmentsByUser[
                  userId
                ]
              ) {
                assignmentsByUser[
                  userId
                ] = [];
              }

              assignmentsByUser[
                userId
              ].push({
                date,
                day,
                week_number:
                  weekNumber,
                ...data,
              });
            },
          );
        },
      );

      const promises = [];
      const usersToSave = Object.keys(assignmentsByUser);

      for (const userId of usersToSave) {
        const userAssignments = assignmentsByUser[userId];
        const primaryWeek = userAssignments[0].week_number; // Semana base 
        
        const dataToSubmit = {
          local_id: localId,
          company_id: companyId,
          is_recurring: true,
          origin: "TURNO",
          assignments_data: userAssignments, 
          user_id: userId,
          categoria_rol: userAssignments[0].rol,
          start_time: userAssignments[0].start_time,
          end_time: userAssignments[0].end_time,
          selectedDays: [...new Set(userAssignments.map(a => a.day))],
          week_number:
            primaryWeek,
          planning_period:
            planningPeriod,
          period_type:
            planningPeriod,
          planning_start_date:
            planningStartDate,
          planning_end_date:
            periodEndDate,
          period_start_date:
            planningStartDate,
          period_end_date:
            periodEndDate,
        };

        const existingRouteId = initialData?.route_ids_by_user?.[userId];
        
        if (existingRouteId) {
          promises.push(api.put(`/routes/${existingRouteId}`, dataToSubmit));
        } else {
          promises.push(api.post("/routes", dataToSubmit));
        }
      }

      if (isEditing && initialData?.route_ids_by_user) {
        const existingUsers = Object.keys(initialData.route_ids_by_user);
        const usersToDelete = existingUsers.filter(u => !usersToSave.includes(u));
        
        usersToDelete.forEach(uId => {
          const idToDelete = initialData.route_ids_by_user[uId];
          promises.push(api.delete(`/routes/${idToDelete}`));
        });
      }

      await Promise.all(promises);
      onCreated();
      onClose();
      toast.success("Planificación guardada correctamente");
    } catch (error) {
      console.error("Error completo:", error.response?.data);
      toast.error(error.response?.data?.message || "Error al guardar");
    } finally { 
      setLoading(false); 
    }
  };

  const handleDelete = async () => {
    if (!window.confirm("¿Eliminar completamente esta planificación agrupada para TODOS los mercaderistas?")) return;
    setIsDeleting(true);
    try {
      const idsToDelete = initialData?.route_ids_by_user 
        ? Object.values(initialData.route_ids_by_user) 
        : [initialData.id];

      await Promise.all(idsToDelete.map(id => api.delete(`/routes/${id}`)));
      
      onCreated(); onClose(); toast.success("Rutas eliminadas");
    } catch { toast.error("Error al eliminar"); } 
    finally { setIsDeleting(false); }
  };

  const renderCalendarCell = (
    week,
    day,
    compact = false,
  ) => {
    const cellDate =
      getDateForWeekDay(
        week,
        day.id,
      );

    const isInsideRange =
      isDateInsideRange(
        cellDate,
        selectedStartDate,
        selectedEndDate,
      );

    const key =
      getCellKey(
        week,
        day.id,
      );

    const cellArray =
      matrix[key] ||
      [];

    const isActive =
      cellArray.length > 0;

    const isTargetWeek =
      targetWeek &&
      toDateInputValue(
        targetWeek.start,
      ) ===
      toDateInputValue(
        week.start,
      );

    let stateClass = "";

    if (!isInsideRange) {
      stateClass =
        "cursor-not-allowed border-gray-100 bg-gray-100/80 text-gray-300 opacity-55";
    } else if (eraserMode) {
      stateClass =
        isActive
          ? "border-red-500 bg-red-500 text-white hover:bg-red-600"
          : "border-red-200 bg-red-50 text-red-300 hover:border-red-400";
    } else if (isActive) {
      stateClass =
        "border-[#87be00] bg-[#87be00] text-white shadow-lg shadow-[#87be00]/15";
    } else if (isTargetWeek) {
      stateClass =
        "border-[#87be00]/35 bg-white text-slate-700 hover:border-[#87be00] hover:bg-[#87be00]/5";
    } else {
      stateClass =
        "border-gray-200 bg-white text-slate-700 hover:border-[#87be00]/50 hover:bg-[#87be00]/5";
    }

    return (
      <button
        key={key}
        type="button"
        disabled={!isInsideRange}
        onClick={() =>
          handleCellClick(
            week,
            day.id,
          )
        }
        className={`relative flex min-w-0 flex-col overflow-y-auto rounded-2xl border-2 p-2 text-left transition custom-scrollbar ${
          compact
            ? "min-h-[138px]"
            : "h-24 min-h-[6rem]"
        } ${stateClass}`}
      >
        <div className="flex w-full items-start justify-between gap-1">
          <div>
            {compact && (
              <p className={`text-[8px] font-black uppercase tracking-[0.12em] ${
                isActive
                  ? "text-white/70"
                  : "text-gray-400"
              }`}>
                {day.label}
              </p>
            )}

            <p className={`mt-0.5 text-sm font-black ${
              isActive
                ? "text-white"
                : isInsideRange
                  ? "text-slate-900"
                  : "text-gray-300"
            }`}>
              {cellDate.getDate()}
            </p>

            <p className={`text-[7px] font-black uppercase ${
              isActive
                ? "text-white/65"
                : "text-gray-400"
            }`}>
              {formatShortDate(
                cellDate,
              )}
            </p>
          </div>

          {isInsideRange &&
            !isActive && (
            <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-[#87be00]/10 text-sm font-black text-[#87be00]">
              +
            </span>
          )}
        </div>

        {isActive && (
          <div className="mt-2 w-full space-y-1">
            {cellArray.map(
              (
                assignment,
                index,
              ) => {
                const user =
                  filteredUsers.find(
                    (item) =>
                      String(
                        item.id,
                      ) ===
                      String(
                        assignment.user_id,
                      ),
                  );

                const userName =
                  user
                    ? user.first_name
                    : "Usuario";

                const turnLabel =
                  assignment.turno_id ===
                  "INDIVIDUAL"
                    ? `${assignment.start_time} — ${assignment.end_time}`
                    : assignment.turno_id;

                return (
                  <div
                    key={`${assignment.user_id}-${index}`}
                    className="w-full rounded-lg bg-black/15 px-1.5 py-1.5 text-center"
                  >
                    <span className="block truncate text-[8px] font-black uppercase leading-tight">
                      {userName}
                    </span>

                    <span className="mt-0.5 block truncate text-[6px] font-bold text-white/75">
                      {turnLabel}
                    </span>
                  </div>
                );
              },
            )}
          </div>
        )}
      </button>
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[150] flex items-end justify-center bg-slate-950/65 font-[Outfit] backdrop-blur-md sm:items-center sm:p-4">
      <div className="flex h-full max-h-[100dvh] w-full flex-col overflow-hidden border border-white/60 bg-white shadow-2xl sm:h-auto sm:max-h-[95vh] sm:max-w-6xl sm:rounded-[2.5rem]">
        
        {/* HEADER */}
        <div className="flex shrink-0 items-center justify-between border-b border-gray-100 bg-white px-5 py-4 sm:px-8 sm:py-6">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#87be00]/10 text-[#87be00]">
              <FiCalendar
                size={19}
              />
            </span>

            <div className="min-w-0">
              <p className="text-[9px] font-black uppercase tracking-[0.2em] text-[#87be00]">
                CultivApp · Planificación
              </p>

              <h2 className="mt-1 truncate text-xl font-black tracking-tight text-slate-900 sm:text-2xl">
                {isEditing
                  ? "Editar planificación"
                  : "Nueva planificación"}
              </h2>

              <p className="mt-1 text-[9px] font-bold uppercase tracking-widest text-gray-400 sm:text-[10px]">
                Configuración semanal o mensual
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-gray-100 bg-gray-50 text-gray-400 transition hover:bg-gray-100 hover:text-gray-700"
            aria-label="Cerrar planificación"
          >
            <FiX size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 sm:p-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8">
            
            {/* HERRAMIENTAS */}
            <div className="lg:col-span-5 space-y-4 sm:space-y-6">
              
              {/* PASO 1: DÓNDE */}
              <div className="bg-[#f7faef] p-4 sm:p-5 rounded-[1.5rem] sm:rounded-[2rem] border border-[#87be00]/20 shadow-sm space-y-4">
                 <div className="flex items-center gap-2 text-[9px] font-black text-[#679300] uppercase tracking-widest">
                    <FiMapPin size={12} /> 1. Dónde (Local)
                 </div>
                 
                 {/* ✅ SELECTOR DE EMPRESA MEJORADO */}
                 {availableCompanies.length > 0 && (
                   <div className="space-y-2">
                     <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                       <FiBriefcase size={11} /> Empresa
                     </label>
                     <select
                       className="w-full bg-white rounded-xl px-4 py-3 text-xs font-bold border border-[#87be00]/20 outline-none focus:ring-4 focus:ring-[#87be00]/10 transition-all h-12 text-gray-900"
                       value={companyId} 
                       onChange={(e) => { 
                         setCompanyId(e.target.value); 
                         setLocalId(""); 
                         setCadenaFilter(""); 
                         setCodigoFilter("");
                       }}
                     >
                       <option value="" className="text-gray-900">Selecciona una empresa...</option>
                       {availableCompanies.map((c) => (
                         <option key={c.id} value={c.id} className="text-gray-900">
                           {c.name}
                         </option>
                       ))}
                     </select>
                   </div>
                 )}
                 
                 <div className="grid grid-cols-2 gap-2">
                   <select
                     className="w-full bg-white rounded-xl px-3 py-2 text-xs font-bold border border-[#87be00]/20 outline-none focus:ring-4 focus:ring-[#87be00]/10 transition-all h-10 text-gray-900"
                     value={cadenaFilter} onChange={(e) => setCadenaFilter(e.target.value)}
                   >
                     <option value="" className="text-gray-900">Cadenas (Todas)</option>
                     {uniqueCadenas.map(c => <option key={c} value={c} className="text-gray-900">{c}</option>)}
                   </select>
                   <div className="relative">
                     <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={12} />
                     <input
                       type="text"
                       placeholder="Cód. Local"
                       className="w-full bg-white rounded-xl pl-8 pr-3 py-2 text-xs font-bold border border-[#87be00]/20 outline-none focus:ring-4 focus:ring-[#87be00]/10 transition-all text-gray-900 placeholder-gray-400 h-10"
                       value={codigoFilter} onChange={(e) => setCodigoFilter(e.target.value)}
                     />
                   </div>
                 </div>

                 <select 
                    required className={`w-full rounded-xl px-4 py-3 text-xs font-bold border outline-none transition-all h-12 ${localId ? 'bg-[#87be00] border-[#87be00] text-white' : 'bg-white border-[#87be00]/20 text-gray-900'}`}
                    value={localId} onChange={(e) => setLocalId(e.target.value)}
                 >
                    <option value="" className="text-gray-900">
                      {filteredLocales.length === 1 ? "✅ Local Encontrado" : `Elegir Local (${filteredLocales.length} ref.)`}
                    </option>
                    {filteredLocales.map(l => (
                      <option key={l.id} value={l.id} className="text-gray-900">
                        {l.cadena} - {l.direccion} ({l.codigo_local})
                      </option>
                    ))}
                 </select>
              </div>

              {/* PASO 2: QUIÉN Y CUÁNDO (PINCEL) */}
              <div className="bg-[#f7faef] p-4 sm:p-5 rounded-[1.5rem] sm:rounded-[2rem] border border-[#87be00]/20 shadow-sm space-y-4">
                 <div className="flex items-center gap-2 text-[9px] font-black text-[#679300] uppercase tracking-widest">
                    <FiEdit3 size={12} /> 2. Quién y Cuándo (Pincel)
                 </div>

                 <div className="space-y-4 rounded-[1.5rem] border border-[#87be00]/15 bg-white p-4 shadow-sm sm:p-5">
                   <div className="flex items-center justify-between gap-3">
                     <div>
                       <p className="text-[9px] font-black uppercase tracking-[0.16em] text-[#679300]">
                         Periodo de planificación
                       </p>

                       <p className="mt-1 text-[9px] font-semibold leading-relaxed text-gray-400">
                         Selecciona una semana exacta o un rango personalizado de varios meses.
                       </p>
                     </div>

                     <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#87be00]/10 text-[#87be00]">
                       <FiClock size={16} />
                     </span>
                   </div>

                   <div className="grid grid-cols-1 gap-2 rounded-2xl bg-slate-100 p-1.5 sm:grid-cols-2">
                     {[
                       {
                         value: "WEEK",
                         title: "Por semana",
                         description: "7 días desde la fecha elegida",
                       },
                       {
                         value: "MONTH",
                         title: "Rango personalizado",
                         description: "Desde y hasta, incluso entre meses",
                       },
                     ].map((option) => {
                       const selected =
                         planningPeriod ===
                         option.value;

                       return (
                         <button
                           key={option.value}
                           type="button"
                           onClick={() =>
                             handlePlanningPeriodChange(
                               option.value,
                             )
                           }
                           className={`rounded-xl border px-4 py-3 text-left transition ${
                             selected
                               ? "border-slate-900 bg-slate-900 text-white shadow-md"
                               : "border-transparent bg-transparent text-slate-500 hover:border-white hover:bg-white"
                           }`}
                         >
                           <span className="block text-[9px] font-black uppercase tracking-wider">
                             {option.title}
                           </span>

                           <span className={`mt-1 block text-[8px] font-semibold leading-relaxed ${
                             selected
                               ? "text-white/65"
                               : "text-slate-400"
                           }`}>
                             {option.description}
                           </span>
                         </button>
                       );
                     })}
                   </div>

                   <div className={`grid gap-3 ${
                     planningPeriod ===
                     "MONTH"
                       ? "grid-cols-1 sm:grid-cols-2"
                       : "grid-cols-1"
                   }`}>
                     <label className="block">
                       <span className="mb-2 block text-[8px] font-black uppercase tracking-[0.14em] text-gray-500">
                         {planningPeriod ===
                         "MONTH"
                           ? "Desde"
                           : "Fecha de inicio"}
                       </span>

                       <div className="relative">
                         <FiCalendar
                           size={15}
                           className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#87be00]"
                         />

                         <input
                           type="date"
                           value={
                             planningStartDate
                           }
                           onChange={(event) =>
                             handlePlanningStartChange(
                               event.target.value,
                             )
                           }
                           className="h-12 w-full rounded-2xl border border-gray-100 bg-gray-50 pl-11 pr-4 text-xs font-black text-gray-800 outline-none transition focus:border-[#87be00]/50 focus:bg-white focus:ring-4 focus:ring-[#87be00]/10"
                         />
                       </div>
                     </label>

                     {planningPeriod ===
                       "MONTH" && (
                       <label className="block">
                         <span className="mb-2 block text-[8px] font-black uppercase tracking-[0.14em] text-gray-500">
                           Hasta
                         </span>

                         <div className="relative">
                           <FiCalendar
                             size={15}
                             className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#87be00]"
                           />

                           <input
                             type="date"
                             min={
                               planningStartDate
                             }
                             value={
                               planningEndDate
                             }
                             onChange={(event) =>
                               handlePlanningEndChange(
                                 event.target.value,
                               )
                             }
                             className="h-12 w-full rounded-2xl border border-gray-100 bg-gray-50 pl-11 pr-4 text-xs font-black text-gray-800 outline-none transition focus:border-[#87be00]/50 focus:bg-white focus:ring-4 focus:ring-[#87be00]/10"
                           />
                         </div>
                       </label>
                     )}
                   </div>

                   <div className={`rounded-2xl border px-4 py-3 ${
                     isPlanningRangeValid
                       ? "border-[#87be00]/15 bg-[#87be00]/5"
                       : "border-red-200 bg-red-50"
                   }`}>
                     <p className={`text-[8px] font-black uppercase tracking-[0.14em] ${
                       isPlanningRangeValid
                         ? "text-[#679300]"
                         : "text-red-600"
                     }`}>
                       Periodo seleccionado
                     </p>

                     <p className="mt-1 text-[10px] font-black leading-relaxed text-slate-800">
                       {isPlanningRangeValid
                         ? formatPeriodRange(
                             selectedStartDate,
                             selectedEndDate,
                           )
                         : "La fecha final debe ser posterior a la fecha inicial."}
                     </p>

                     {planningPeriod ===
                       "MONTH" &&
                       isPlanningRangeValid && (
                       <p className="mt-1 text-[8px] font-semibold text-gray-400">
                         {WEEKS.length} semana{WEEKS.length === 1 ? "" : "s"} calendario incluidas.
                       </p>
                     )}
                   </div>

                   {planningPeriod ===
                     "MONTH" &&
                     WEEKS.length > 1 && (
                     <div className="overflow-x-auto pb-1">
                       <div className="flex min-w-max gap-2">
                         {WEEKS.map((week, index) => {
                           const selected =
                             targetWeek &&
                             toDateInputValue(
                               targetWeek.start,
                             ) ===
                             toDateInputValue(
                               week.start,
                             );

                           return (
                             <button
                               key={
                                 toDateInputValue(
                                   week.start,
                                 )
                               }
                               type="button"
                               onClick={() =>
                                 setTargetWeek(
                                   week,
                                 )
                               }
                               className={`min-w-[100px] rounded-xl border px-3 py-2.5 text-center transition ${
                                 selected
                                   ? "border-[#87be00] bg-[#87be00] text-white shadow-md"
                                   : "border-gray-100 bg-gray-50 text-gray-500 hover:border-[#87be00]/30"
                               }`}
                             >
                               <span className="block text-[9px] font-black uppercase">
                                 Semana {index + 1}
                               </span>

                               <span className="mt-1 block text-[8px] font-semibold opacity-80">
                                 {formatWeekLabel(
                                   week,
                                 )}
                               </span>
                             </button>
                           );
                         })}
                       </div>
                     </div>
                   )}
                 </div>

                 <div className="relative" ref={userDropdownRef}>
                   <div
                     className={`w-full bg-white border border-[#87be00]/20 rounded-xl px-4 py-3 text-xs font-bold outline-none focus:ring-4 focus:ring-[#87be00]/10 transition-all h-12 cursor-pointer flex items-center justify-between ${brush.user_id ? 'text-gray-900' : 'text-gray-500'}`}
                     onClick={() => setIsUserDropdownOpen(!isUserDropdownOpen)}
                   >
                     <span className="truncate">{selectedUserText}</span>
                     <svg className={`w-3 h-3 text-[#87be00] transition-transform shrink-0 ${isUserDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 9l-7 7-7-7"></path></svg>
                   </div>

                   {isUserDropdownOpen && (
                     <div className="absolute top-[calc(100%+4px)] left-0 w-full bg-white border border-[#87be00]/20 rounded-xl shadow-2xl z-50 overflow-hidden flex flex-col max-h-[250px]">
                       <div className="p-2 border-b border-gray-50 bg-[#87be00]/5">
                         <input
                           type="text"
                           autoFocus
                           placeholder="🔍 Buscar nombre o correo..."
                           className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-[10px] font-bold outline-none focus:border-[#87be00]/50 transition-colors"
                           value={userSearchTerm}
                           onChange={(e) => setUserSearchTerm(e.target.value)}
                           onClick={(e) => e.stopPropagation()}
                         />
                       </div>
                       <div className="overflow-y-auto custom-scrollbar p-1.5 space-y-0.5 bg-white">
                         <div
                           className="px-3 py-2 text-[10px] font-black uppercase text-gray-500 hover:bg-[#87be00]/10 hover:text-[#679300] rounded-lg cursor-pointer transition-colors"
                           onClick={() => { setBrush({...brush, user_id: ""}); setIsUserDropdownOpen(false); setUserSearchTerm(""); }}
                         >
                           1º Elige Reponedor...
                         </div>
                         {filteredUsers
                           .filter(u => {
                             const fullName = `${u.first_name || ''} ${u.last_name || ''}`.toLowerCase();
                             const email = (u.email || '').toLowerCase();
                             const term = userSearchTerm.toLowerCase();
                             return fullName.includes(term) || email.includes(term);
                           })
                           .map(u => (
                           <div
                             key={u.id}
                             className="px-3 py-2 flex flex-col hover:bg-[#87be00]/10 rounded-lg cursor-pointer transition-colors group"
                             onClick={() => { setBrush({...brush, user_id: u.id}); setIsUserDropdownOpen(false); setUserSearchTerm(""); }}
                           >
                             <span className="text-[10px] font-black uppercase text-gray-800 group-hover:text-[#679300]">{u.first_name} {u.last_name}</span>
                             {u.email && <span className="text-[9px] font-bold text-gray-400 lowercase truncate mt-0.5">{u.email}</span>}
                           </div>
                         ))}
                       </div>
                     </div>
                   )}
                 </div>

                 <select 
                    className="w-full bg-white border border-[#87be00]/20 rounded-xl px-4 py-3 text-xs font-bold outline-none focus:ring-4 focus:ring-[#87be00]/10 transition-all h-12"
                    value={brush.rol} onChange={(e) => setBrush({...brush, rol: e.target.value, turno_id: ""})}
                 >
                    <option value="">2º Elige Rol...</option>
                    <option value="INDIVIDUAL">Visita Individual</option>
                    {ROLES_TURNOS.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
                 </select>

                 <select 
                    className="w-full bg-white border border-[#87be00]/20 rounded-xl px-4 py-3 text-xs font-bold outline-none focus:ring-4 focus:ring-[#87be00]/10 transition-all disabled:opacity-50 h-12"
                    value={brush.turno_id} onChange={handleTurnoChange} disabled={!brush.rol}
                 >
                    <option value="">3º Elige Turno (Auto-carga)</option>
                    {brush.rol === "INDIVIDUAL" ? <option value="INDIVIDUAL">Horario Manual</option> : turnosAgrupados.map(t => <option key={t.nombre} value={t.nombre}>{t.nombre}</option>)}
                 </select>

                 {brush.turno_id && (
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                      <FiClock size={10} /> Horario (formato 24h)
                    </label>
                    <div className="flex gap-2">
                      <TimePicker24h
                        value={brush.start_time}
                        onChange={(e) => handleIndividualTimeChange("start_time", e.target.value)}
                        disabled={brush.rol !== "INDIVIDUAL"}
                      />
                      <TimePicker24h
                        value={brush.end_time}
                        onChange={(e) => handleIndividualTimeChange("end_time", e.target.value)}
                        disabled={brush.rol !== "INDIVIDUAL"}
                      />
                    </div>
                  </div>
                 )}
              </div>
            </div>

            {/* CALENDARIO */}
            <div className="mt-2 flex min-w-0 flex-col self-start lg:col-span-7 lg:mt-0">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 px-1 gap-3">
                <div className="flex items-center gap-2 text-[10px] font-black text-gray-500 uppercase tracking-widest">
                  <FiCalendar size={14} className="shrink-0 text-[#87be00]" /> 3. Calendario · {planningPeriod === "MONTH" ? "Rango personalizado" : "Semana"}
                </div>
                <div className="flex flex-wrap gap-2 relative">
                  <button
                    type="button"
                    disabled={
                      eraserMode ||
                      !targetWeek
                    }
                    onClick={() =>
                      fillTargetWeek(
                        false,
                      )
                    }
                    className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-[#87be00]/10 px-3 py-2.5 text-[9px] font-black uppercase tracking-widest text-[#679300] transition hover:bg-[#87be00]/20 sm:flex-none ${
                      eraserMode
                        ? "cursor-not-allowed opacity-50"
                        : ""
                    }`}
                  >
                    <FiCopy />
                    Llenar semana
                  </button>

                  {planningPeriod ===
                    "MONTH" && (
                    <button
                      type="button"
                      disabled={
                        eraserMode
                      }
                      onClick={() =>
                        fillTargetWeek(
                          true,
                        )
                      }
                      className={`flex-1 rounded-xl bg-slate-900 px-3 py-2.5 text-[9px] font-black uppercase tracking-widest text-white transition hover:bg-black sm:flex-none ${
                        eraserMode
                          ? "cursor-not-allowed opacity-50"
                          : ""
                      }`}
                    >
                      Llenar periodo
                    </button>
                  )}

                  {/* MENÚ DE LIMPIEZA */}
                  {eraserMode ? (
                    <button type="button" onClick={() => setEraserMode(false)} className="flex-1 sm:flex-none text-[9px] font-black uppercase tracking-widest px-3 py-2.5 rounded-lg transition-all flex items-center justify-center gap-1.5 bg-red-500 text-white shadow-md hover:bg-red-600">
                      <FiX size={12} /> Quitar Borrador
                    </button>
                  ) : (
                    <div className="relative">
                      <button type="button" onClick={() => setShowClearMenu(!showClearMenu)} className="flex-1 sm:flex-none text-[9px] font-black uppercase tracking-widest px-3 py-2.5 rounded-lg transition-all flex items-center justify-center gap-1.5 bg-red-50 hover:bg-red-100 text-red-500">
                        <FiTrash2 size={12} /> Limpiar ▾
                      </button>
                      
                      {showClearMenu && (
                        <>
                          <div className="fixed inset-0 z-[150]" onClick={() => setShowClearMenu(false)}></div>
                          <div className="absolute top-full right-0 mt-2 w-56 bg-white border border-gray-100 rounded-2xl shadow-2xl z-[160] overflow-hidden flex flex-col">
                            <button
                              type="button"
                              onClick={() => { setEraserMode(true); setShowClearMenu(false); toast('Modo Borrador activado.', { icon: '🧽' }); }}
                              className="px-4 py-3.5 text-[10px] font-black uppercase text-left hover:bg-gray-50 text-gray-700 transition-all border-b border-gray-50 flex items-center gap-2"
                            >
                              <FiMapPin size={12}/> Limpiar Día (Borrador)
                            </button>
                            <button type="button" onClick={clearWeek} className="px-4 py-3.5 text-[10px] font-black uppercase text-left hover:bg-red-50 text-gray-700 hover:text-red-600 transition-all border-b border-gray-50 flex items-center gap-2">
                              <FiLayers size={12}/> Limpiar Semana Actual
                            </button>
                            <button type="button" onClick={clearMonth} className="px-4 py-3.5 text-[10px] font-black uppercase text-left hover:bg-red-50 text-red-600 transition-all flex items-center gap-2">
                              <FiCalendar size={12}/> Limpiar Todo el Periodo
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="relative overflow-hidden rounded-[1.5rem] border border-gray-100 bg-gray-50 p-3 sm:rounded-[2rem] sm:p-5">
                {planningPeriod === "WEEK" ? (
                  <div className="space-y-4">
                    <div className="flex flex-col gap-2 rounded-2xl border border-[#87be00]/15 bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-[8px] font-black uppercase tracking-[0.14em] text-[#679300]">
                          Semana seleccionada
                        </p>

                        <p className="mt-1 text-[11px] font-black text-slate-900">
                          {formatPeriodRange(
                            selectedStartDate,
                            selectedEndDate,
                          )}
                        </p>
                      </div>

                      <span className="inline-flex w-fit items-center gap-2 rounded-full bg-[#87be00]/10 px-3 py-2 text-[8px] font-black uppercase tracking-wider text-[#679300]">
                        <FiCalendar size={11} />
                        7 días
                      </span>
                    </div>

                    <div className="overflow-x-auto pb-1">
                      <div className="grid min-w-[760px] grid-cols-7 gap-2">
                        {weeklyDates.map((date) => {
                          const week =
                            WEEKS.find((item) =>
                              isDateInsideWeek(
                                date,
                                item,
                              ),
                            );

                          if (!week) {
                            return null;
                          }

                          const day =
                            DAYS_OF_WEEK.find(
                              (item) =>
                                item.id ===
                                date.getDay(),
                            );

                          if (!day) {
                            return null;
                          }

                          return renderCalendarCell(
                            week,
                            day,
                            true,
                          );
                        })}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex flex-col gap-2 rounded-2xl border border-[#87be00]/15 bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-[8px] font-black uppercase tracking-[0.14em] text-[#679300]">
                          Rango personalizado
                        </p>

                        <p className="mt-1 text-[11px] font-black text-slate-900">
                          {formatPeriodRange(
                            selectedStartDate,
                            selectedEndDate,
                          )}
                        </p>
                      </div>

                      <span className="inline-flex w-fit items-center gap-2 rounded-full bg-slate-900 px-3 py-2 text-[8px] font-black uppercase tracking-wider text-white">
                        <FiLayers size={11} />
                        {WEEKS.length} semanas
                      </span>
                    </div>

                    <div className="max-h-[620px] overflow-auto pr-1 custom-scrollbar">
                      <div className="min-w-[760px]">
                        <div className="sticky top-0 z-10 grid grid-cols-[86px_repeat(7,minmax(82px,1fr))] gap-2 border-b border-gray-100 bg-gray-50 pb-2">
                          <div />

                          {DAYS_OF_WEEK.map((day) => (
                            <div
                              key={`header-${day.id}`}
                              className="flex items-center justify-center rounded-xl bg-white py-2 text-[8px] font-black uppercase tracking-[0.14em] text-gray-400"
                            >
                              {day.label}
                            </div>
                          ))}
                        </div>

                        <div className="mt-2 space-y-2">
                          {WEEKS.map((week, index) => (
                            <div
                              key={toDateInputValue(
                                week.start,
                              )}
                              className="grid grid-cols-[86px_repeat(7,minmax(82px,1fr))] gap-2"
                            >
                              <button
                                type="button"
                                onClick={() =>
                                  setTargetWeek(
                                    week,
                                  )
                                }
                                className={`flex min-h-24 flex-col items-center justify-center rounded-2xl border px-2 text-center transition ${
                                  targetWeek &&
                                  toDateInputValue(
                                    targetWeek.start,
                                  ) ===
                                  toDateInputValue(
                                    week.start,
                                  )
                                    ? "border-[#87be00] bg-[#87be00] text-white shadow-md"
                                    : "border-gray-100 bg-white text-gray-500 hover:border-[#87be00]/30"
                                }`}
                              >
                                <span className="text-[10px] font-black uppercase">
                                  S{index + 1}
                                </span>

                                <span className="mt-1 text-[7px] font-semibold leading-relaxed opacity-75">
                                  {formatWeekLabel(
                                    week,
                                  )}
                                </span>
                              </button>

                              {DAYS_OF_WEEK.map((day) =>
                                renderCalendarCell(
                                  week,
                                  day,
                                  false,
                                ),
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* FOOTER */}
        <div className="p-4 sm:p-6 bg-white border-t border-gray-50 shrink-0 flex flex-col-reverse sm:flex-row gap-3 sm:gap-4 pb-8 sm:pb-6">
          {isEditing && (
            <button
              type="button" onClick={handleDelete} disabled={loading || isDeleting}
              className="w-full sm:w-auto px-6 py-4 rounded-[1.5rem] font-black uppercase text-[10px] tracking-widest text-red-500 bg-red-50 hover:bg-red-100 transition-all flex items-center justify-center gap-2 shrink-0"
            >
              {isDeleting ? <FiLoader className="animate-spin" /> : <FiTrash2 size={16} />} Eliminar
            </button>
          )}
          <button
            type="button" onClick={handleManualSubmit} disabled={loading || isDeleting}
            className="flex w-full items-center justify-center gap-3 rounded-[1.5rem] bg-slate-900 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-white shadow-xl transition hover:bg-[#87be00] disabled:cursor-not-allowed disabled:opacity-60 sm:text-[11px]"
          >
            {loading && !isDeleting ? <FiLoader className="animate-spin" /> : <FiCheckCircle size={18} />}
            Confirmar e Implementar
          </button>
        </div>
      </div>
    </div>
  );
};

export default ManageRoutesModal;