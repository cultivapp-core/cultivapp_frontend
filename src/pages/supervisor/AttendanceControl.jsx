import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { motion } from "framer-motion";
import {
  FiAlertCircle,
  FiArrowRight,
  FiBriefcase,
  FiCalendar,
  FiCheck,
  FiChevronLeft,
  FiChevronRight,
  FiClock,
  FiHash,
  FiRefreshCw,
  FiSearch,
  FiSliders,
  FiUser,
  FiX,
} from "react-icons/fi";
import api from "../../api/apiClient";
import { useAuth } from "../../context/AuthContext";
import {
  Button,
  IconButton,
} from "../../components/ui";

const getLocalISODate = () => {
  const timezoneOffset =
    new Date().getTimezoneOffset() *
    60_000;

  return new Date(
    Date.now() - timezoneOffset,
  )
    .toISOString()
    .split("T")[0];
};

const getResponseData = (
  response,
  fallback = {},
) => {
  if (response == null) return fallback;
  return response?.data ?? response;
};

const formatDate = (dateString) => {
  if (!dateString) return "--/--/----";

  const normalized =
    String(dateString).split("T")[0];

  const [year, month, day] =
    normalized.split("-");

  if (!year || !month || !day) {
    return "--/--/----";
  }

  return `${day}-${month}-${year}`;
};

const formatWorkTime = (minutes) => {
  const value = Number(minutes);

  if (
    !Number.isFinite(value) ||
    value <= 0
  ) {
    return "--";
  }

  const rounded =
    Math.round(value);

  if (rounded < 60) {
    return `${rounded} min`;
  }

  const hours =
    Math.floor(rounded / 60);
  const rest = rounded % 60;

  return rest
    ? `${hours}h ${rest}m`
    : `${hours}h`;
};

const AttendanceControl = () => {
  const { user } = useAuth();

  const isRoot =
    user?.role === "ROOT";

  const [attendance, setAttendance] =
    useState([]);
  const [companies, setCompanies] =
    useState([]);
  const [loading, setLoading] =
    useState(true);
  const [error, setError] =
    useState("");
  const [searchTerm, setSearchTerm] =
    useState("");

  const [startDate, setStartDate] =
    useState(getLocalISODate());
  const [endDate, setEndDate] =
    useState(getLocalISODate());
  const [localCode, setLocalCode] =
    useState("");
  const [workerName, setWorkerName] =
    useState("");
  const [status, setStatus] =
    useState("");
  const [
    selectedCompany,
    setSelectedCompany,
  ] = useState(
    isRoot
      ? ""
      : user?.company_id || "",
  );

  const [page, setPage] =
    useState(1);
  const [
    totalPages,
    setTotalPages,
  ] = useState(1);
  const [totalRows, setTotalRows] =
    useState(0);

  const isMounted = useRef(false);

  useEffect(() => {
    if (
      !isRoot &&
      user?.company_id
    ) {
      setSelectedCompany(
        user.company_id,
      );
    }
  }, [
    isRoot,
    user?.company_id,
  ]);

  const fetchCompanies =
    useCallback(async () => {
      if (!isRoot) return;

      try {
        const response =
          await api.get("/companies");

        const data =
          getResponseData(
            response,
            [],
          );

        setCompanies(
          Array.isArray(data)
            ? data.filter(
                (company) =>
                  company?.is_active !==
                  false,
              )
            : [],
        );
      } catch (requestError) {
        console.error(
          "Error cargando empresas:",
          requestError,
        );
      }
    }, [isRoot]);

  const fetchAttendance =
    useCallback(
      async (
        pageTarget = page,
      ) => {
        if (
          startDate &&
          endDate &&
          startDate > endDate
        ) {
          setError(
            "La fecha inicial no puede ser posterior a la fecha final.",
          );
          setAttendance([]);
          return;
        }

        try {
          setLoading(true);
          setError("");

          const queryParams = {
            startDate,
            endDate,
            localCode:
              localCode.trim(),
            workerName:
              workerName.trim(),
            status,
            page: pageTarget,
            ...(searchTerm.trim()
              .length > 2 && {
              search:
                searchTerm.trim(),
            }),
            ...(selectedCompany && {
              company_id:
                selectedCompany,
            }),
          };

          const response =
            await api.get(
              "/routes/attendance-report",
              {
                params:
                  queryParams,
              },
            );

          const data =
            getResponseData(
              response,
              {},
            );

          const rows =
            Array.isArray(data)
              ? data
              : Array.isArray(
                    data?.rows,
                  )
                ? data.rows
                : [];

          const pagesCount =
            Number(
              data?.totalPages ||
                data?.pages ||
                1,
            ) || 1;

          const total =
            Number(
              data?.totalRows ||
                data?.total ||
                rows.length,
            ) || 0;

          setAttendance(rows);
          setTotalPages(
            Math.max(
              1,
              pagesCount,
            ),
          );
          setTotalRows(total);
          setPage(pageTarget);
        } catch (requestError) {
          console.error(
            "Error cargando asistencia:",
            requestError,
          );

          setError(
            requestError?.response?.data
              ?.message ||
              requestError?.message ||
              "No se pudo cargar el control de jornada.",
          );

          setAttendance([]);
          setTotalPages(1);
          setTotalRows(0);
        } finally {
          setLoading(false);
        }
      },
      [
        page,
        startDate,
        endDate,
        localCode,
        workerName,
        status,
        searchTerm,
        selectedCompany,
      ],
    );

  useEffect(() => {
    fetchCompanies();
  }, [fetchCompanies]);

  useEffect(() => {
    fetchAttendance(1);
  }, []);

  useEffect(() => {
    if (!isMounted.current) {
      isMounted.current = true;
      return;
    }

    fetchAttendance(page);
  }, [page]);

  useEffect(() => {
    if (!isMounted.current) return;

    const timer = setTimeout(() => {
      if (page === 1) {
        fetchAttendance(1);
      } else {
        setPage(1);
      }
    }, 500);

    return () =>
      clearTimeout(timer);
  }, [searchTerm]);

  const handleApplyFilters = () => {
    if (
      startDate &&
      endDate &&
      startDate > endDate
    ) {
      setError(
        "La fecha inicial no puede ser posterior a la fecha final.",
      );
      return;
    }

    if (page === 1) {
      fetchAttendance(1);
    } else {
      setPage(1);
    }
  };

  const clearFilters = () => {
    const today =
      getLocalISODate();

    setStartDate(today);
    setEndDate(today);
    setLocalCode("");
    setWorkerName("");
    setStatus("");
    setSearchTerm("");

    if (page === 1) {
      setTimeout(
        () =>
          fetchAttendance(1),
        0,
      );
    } else {
      setPage(1);
    }
  };

  const metrics = useMemo(() => {
    const completed =
      attendance.filter(
        (row) =>
          row.status ===
          "COMPLETED",
      ).length;

    const inProgress =
      attendance.filter(
        (row) =>
          row.status ===
          "IN_PROGRESS",
      ).length;

    const late =
      attendance.filter(
        (row) =>
          Number(
            row.entry_delay,
          ) > 10,
      ).length;

    const totalMinutes =
      attendance.reduce(
        (sum, row) =>
          sum +
          Number(
            row.total_work_time ||
              0,
          ),
        0,
      );

    return {
      completed,
      inProgress,
      late,
      totalMinutes,
    };
  }, [attendance]);

  const hasFilters =
    Boolean(searchTerm) ||
    Boolean(localCode) ||
    Boolean(workerName) ||
    Boolean(status) ||
    Boolean(
      isRoot &&
        selectedCompany,
    ) ||
    startDate !==
      getLocalISODate() ||
    endDate !==
      getLocalISODate();

  return (
    <div className="w-full min-h-full bg-gray-50/40 font-[Outfit] pb-20">
      <header className="bg-white border-b border-gray-100">
        <div className="max-w-[1500px] mx-auto px-4 sm:px-6 md:px-8 py-5 md:py-8 flex flex-col lg:flex-row lg:items-end justify-between gap-5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-[#87be00]/10 rounded-xl text-[#87be00]">
              <FiClock size={20} />
            </div>

            <div>
              <h1 className="text-3xl md:text-5xl font-black text-gray-900 tracking-tight leading-none">
                Control de jornada
              </h1>

              <p className="text-[10px] font-black text-[#87be00] uppercase tracking-[0.2em] mt-2">
                {formatDate(startDate)} al{" "}
                {formatDate(endDate)}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-[1fr_auto] gap-2 w-full lg:w-auto">
            <div className="relative min-w-0 lg:min-w-[320px]">
              <FiSearch
                size={15}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
              />

              <input
                type="search"
                placeholder="Buscar por nombre, RUT, local o visita..."
                value={searchTerm}
                onChange={(event) =>
                  setSearchTerm(
                    event.target.value,
                  )
                }
                className={`${inputClass} pl-11 pr-11`}
              />

              {searchTerm && (
                <button
                  type="button"
                  aria-label="Limpiar búsqueda"
                  onClick={() =>
                    setSearchTerm("")
                  }
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-red-500"
                >
                  <FiX size={15} />
                </button>
              )}
            </div>

            <IconButton
              label="Actualizar asistencia"
              size="lg"
              onClick={() =>
                fetchAttendance(page)
              }
              disabled={loading}
            >
              <FiRefreshCw
                size={17}
                className={
                  loading
                    ? "animate-spin"
                    : ""
                }
              />
            </IconButton>
          </div>
        </div>
      </header>

      <main className="max-w-[1500px] mx-auto px-4 sm:px-6 md:px-8 pt-6 space-y-6">
        <section className="bg-white p-4 sm:p-5 rounded-[2rem] border border-gray-100 shadow-sm">
          <div
            className={`grid grid-cols-1 sm:grid-cols-2 gap-3 ${
              isRoot
                ? "xl:grid-cols-7"
                : "xl:grid-cols-6"
            }`}
          >
            {isRoot && (
              <FilterField
                label="Empresa"
                icon={FiBriefcase}
              >
                <select
                  value={
                    selectedCompany
                  }
                  onChange={(event) =>
                    setSelectedCompany(
                      event.target.value,
                    )
                  }
                  className={`${inputClass} pl-11`}
                >
                  <option value="">
                    Todas las empresas
                  </option>

                  {companies.map(
                    (company) => (
                      <option
                        key={company.id}
                        value={company.id}
                      >
                        {company.name ||
                          company.nombre ||
                          "Empresa"}
                      </option>
                    ),
                  )}
                </select>
              </FilterField>
            )}

            <FilterField
              label="Desde"
              icon={FiCalendar}
            >
              <input
                type="date"
                value={startDate}
                onChange={(event) => {
                  setStartDate(
                    event.target.value,
                  );

                  if (
                    endDate &&
                    event.target.value >
                      endDate
                  ) {
                    setEndDate(
                      event.target.value,
                    );
                  }
                }}
                className={`${inputClass} pl-11`}
              />
            </FilterField>

            <FilterField
              label="Hasta"
              icon={FiCalendar}
            >
              <input
                type="date"
                value={endDate}
                min={startDate}
                onChange={(event) =>
                  setEndDate(
                    event.target.value,
                  )
                }
                className={`${inputClass} pl-11`}
              />
            </FilterField>

            <FilterField
              label="Código local"
              icon={FiHash}
            >
              <input
                type="text"
                placeholder="Ej: J04"
                value={localCode}
                onChange={(event) =>
                  setLocalCode(
                    event.target.value.toUpperCase(),
                  )
                }
                className={`${inputClass} pl-11`}
              />
            </FilterField>

            <FilterField
              label="Mercaderista"
              icon={FiUser}
            >
              <input
                type="text"
                placeholder="Nombre o apellido"
                value={workerName}
                onChange={(event) =>
                  setWorkerName(
                    event.target.value,
                  )
                }
                className={`${inputClass} pl-11`}
              />
            </FilterField>

            <FilterField
              label="Estado"
              icon={FiSliders}
            >
              <select
                value={status}
                onChange={(event) =>
                  setStatus(
                    event.target.value,
                  )
                }
                className={`${inputClass} pl-11`}
              >
                <option value="">
                  Todos los estados
                </option>
                <option value="PENDING">
                  Pendiente
                </option>
                <option value="IN_PROGRESS">
                  En curso
                </option>
                <option value="COMPLETED">
                  Completado
                </option>
                <option value="HORAS_EXTRAS">
                  Horas extra
                </option>
                <option value="SALIDA_ANTICIPADA">
                  Salida anticipada
                </option>
              </select>
            </FilterField>

            <div className="flex items-end">
              <Button
                type="button"
                variant="primary"
                size="lg"
                fullWidth
                leftIcon={
                  <FiCheck size={15} />
                }
                onClick={
                  handleApplyFilters
                }
                loading={loading}
                loadingText="Aplicando..."
              >
                Aplicar
              </Button>
            </div>
          </div>

          {hasFilters && (
            <div className="mt-4">
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
            </div>
          )}
        </section>

        <section className="grid grid-cols-2 xl:grid-cols-4 gap-3 md:gap-5">
          <MetricCard
            label="Registros"
            value={
              totalRows ||
              attendance.length
            }
            className="bg-gray-100 text-gray-700"
          />

          <MetricCard
            label="Finalizados"
            value={
              metrics.completed
            }
            className="bg-green-50 text-green-700"
          />

          <MetricCard
            label="En curso"
            value={
              metrics.inProgress
            }
            className="bg-blue-50 text-blue-700"
          />

          <MetricCard
            label="Atrasos"
            value={metrics.late}
            detail={
              metrics.totalMinutes >
              0
                ? `${formatWorkTime(
                    metrics.totalMinutes,
                  )} acumuladas`
                : undefined
            }
            className="bg-red-50 text-red-700"
          />
        </section>

        {loading &&
        attendance.length === 0 ? (
          <LoadingState />
        ) : error ? (
          <InformationMessage
            title="No se pudo cargar el control de jornada"
            description={error}
            action={
              <Button
                type="button"
                variant="secondary"
                leftIcon={
                  <FiRefreshCw
                    size={14}
                  />
                }
                onClick={() =>
                  fetchAttendance(1)
                }
              >
                Intentar nuevamente
              </Button>
            }
          />
        ) : attendance.length ===
          0 ? (
          <InformationMessage
            title="Sin información disponible"
            description="No existen registros para el rango de fechas y los filtros seleccionados."
          />
        ) : (
          <>
            <section className="hidden md:block bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-900 text-white">
                      <th className={thClass}>
                        Mercaderista
                      </th>
                      <th className={thClass}>
                        Visita
                      </th>
                      <th className={thClass}>
                        Local
                      </th>
                      <th className={thClass}>
                        Fecha
                      </th>
                      <th className={`${thClass} text-center`}>
                        Jornada planificada
                      </th>
                      <th className={`${thClass} text-center`}>
                        Jornada real
                      </th>
                      <th className={`${thClass} text-center`}>
                        Tiempo
                      </th>
                      <th className={`${thClass} text-center`}>
                        Estado
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {attendance.map(
                      (
                        row,
                        index,
                      ) => {
                        const statusInfo =
                          getStatusBadge(
                            row.exit_diff,
                            row.status,
                          );

                        const displayDate =
                          row.visit_date ||
                          row.date ||
                          startDate;

                        return (
                          <motion.tr
                            initial={{
                              opacity: 0,
                              y: 8,
                            }}
                            animate={{
                              opacity: 1,
                              y: 0,
                            }}
                            transition={{
                              delay:
                                index *
                                0.025,
                            }}
                            key={
                              row.id ||
                              index
                            }
                            className="border-b border-gray-50 last:border-b-0 hover:bg-gray-50/60"
                          >
                            <td className="px-5 py-4">
                              <WorkerCell
                                row={row}
                              />
                            </td>

                            <td className="px-5 py-4">
                              <span className="inline-flex px-3 py-1.5 rounded-xl bg-blue-50 border border-blue-100 text-blue-700 text-[9px] font-black">
                                {row.visit_number ||
                                  "S/N"}
                              </span>
                            </td>

                            <td className="px-5 py-4">
                              <p className="text-xs font-black text-gray-800 max-w-[180px] truncate">
                                {row.local_name ||
                                  "Sin local"}
                              </p>

                              <p className="text-[9px] font-bold text-[#87be00] mt-1">
                                {row.local_code ||
                                  "Sin código"}
                              </p>
                            </td>

                            <td className="px-5 py-4 text-xs font-black text-gray-700">
                              {formatDate(
                                displayDate,
                              )}
                            </td>

                            <td className="px-5 py-4 text-center">
                              <TimeRange
                                start={
                                  row.plan_in
                                }
                                end={
                                  row.plan_out
                                }
                                muted
                              />
                            </td>

                            <td className="px-5 py-4 text-center">
                              <TimeRange
                                start={
                                  row.check_in
                                }
                                end={
                                  row.check_out
                                }
                                alert={
                                  Number(
                                    row.entry_delay,
                                  ) > 10
                                }
                              />
                            </td>

                            <td className="px-5 py-4 text-center">
                              <p className="text-xs font-black text-gray-900">
                                {formatWorkTime(
                                  row.total_work_time,
                                )}
                              </p>

                              <p className="text-[8px] font-bold text-gray-400 uppercase mt-1">
                                Efectivos
                              </p>
                            </td>

                            <td className="px-5 py-4 text-center">
                              <span
                                className={`inline-flex px-3 py-1.5 rounded-full border text-[8px] font-black uppercase tracking-wider ${statusInfo.style}`}
                              >
                                {
                                  statusInfo.label
                                }
                              </span>
                            </td>
                          </motion.tr>
                        );
                      },
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="md:hidden space-y-4">
              {attendance.map(
                (row, index) => (
                  <AttendanceCard
                    key={
                      row.id || index
                    }
                    row={row}
                    fallbackDate={
                      startDate
                    }
                    index={index}
                  />
                ),
              )}
            </section>
          </>
        )}

        {totalPages > 1 && (
          <Pagination
            page={page}
            totalPages={totalPages}
            loading={loading}
            onPrevious={() =>
              setPage((current) =>
                Math.max(
                  current - 1,
                  1,
                ),
              )
            }
            onNext={() =>
              setPage((current) =>
                Math.min(
                  current + 1,
                  totalPages,
                ),
              )
            }
          />
        )}
      </main>
    </div>
  );
};

const getAvatarStyles = (
  delay,
) => {
  if (
    delay === null ||
    delay === undefined
  ) {
    return "bg-gray-900 text-white";
  }

  if (delay <= 0) {
    return "bg-[#87be00] text-white";
  }

  if (delay <= 10) {
    return "bg-amber-400 text-gray-900";
  }

  return "bg-red-500 text-white";
};

const getStatusBadge = (
  difference,
  currentStatus,
) => {
  if (
    currentStatus !== "COMPLETED"
  ) {
    if (
      currentStatus ===
      "IN_PROGRESS"
    ) {
      return {
        label: "En curso",
        style:
          "bg-blue-50 text-blue-700 border-blue-100",
      };
    }

    return {
      label: "Pendiente",
      style:
        "bg-amber-50 text-amber-700 border-amber-100",
    };
  }

  const normalized =
    Number(difference || 0);

  if (normalized < -5) {
    return {
      label: "Salida anticipada",
      style:
        "bg-red-50 text-red-700 border-red-100",
    };
  }

  if (normalized > 5) {
    return {
      label: "Horas extra",
      style:
        "bg-indigo-50 text-indigo-700 border-indigo-100",
    };
  }

  return {
    label: "Finalizado",
    style:
      "bg-green-50 text-green-700 border-green-100",
  };
};

const FilterField = ({
  label,
  icon: Icon,
  children,
}) => (
  <label className="block">
    <span className="text-[9px] font-black text-gray-500 uppercase tracking-wider block ml-1 mb-2">
      {label}
    </span>

    <div className="relative">
      <Icon
        size={14}
        className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
      />

      {children}
    </div>
  </label>
);

const MetricCard = ({
  label,
  value,
  detail,
  className,
}) => (
  <article className="bg-white rounded-[1.5rem] border border-gray-100 shadow-sm p-4 md:p-5">
    <div
      className={`w-10 h-10 rounded-xl flex items-center justify-center ${className}`}
    >
      <FiClock size={17} />
    </div>

    <p className="text-[8px] font-black uppercase tracking-wider text-gray-400 mt-4">
      {label}
    </p>

    <p className="text-2xl font-black text-gray-900 mt-1">
      {value}
    </p>

    {detail && (
      <p className="text-[9px] text-gray-400 mt-1">
        {detail}
      </p>
    )}
  </article>
);

const WorkerCell = ({ row }) => {
  const name = [
    row.first_name,
    row.last_name,
  ]
    .filter(Boolean)
    .join(" ");

  const initials = [
    row.first_name?.[0],
    row.last_name?.[0],
  ]
    .filter(Boolean)
    .join("")
    .toUpperCase();

  return (
    <div className="flex items-center gap-3">
      <div
        className={`h-10 w-10 rounded-xl ${getAvatarStyles(
          row.entry_delay,
        )} flex items-center justify-center text-[10px] font-black shadow-sm shrink-0`}
      >
        {initials || "—"}
      </div>

      <div className="min-w-0">
        <p className="text-xs font-black text-gray-900 truncate">
          {name ||
            "Sin mercaderista"}
        </p>

        <p className="text-[9px] font-bold text-gray-400 mt-1">
          RUT:{" "}
          {row.worker_rut ||
            row.worker_id ||
            "Sin información"}
        </p>
      </div>
    </div>
  );
};

const TimeRange = ({
  start,
  end,
  muted = false,
  alert = false,
}) => (
  <div className="inline-flex items-center gap-2">
    <span
      className={`text-xs font-black ${
        alert
          ? "text-red-600"
          : muted
            ? "text-gray-400"
            : "text-gray-900"
      }`}
    >
      {start || "--:--"}
    </span>

    <FiArrowRight
      size={9}
      className="text-gray-300"
    />

    <span
      className={`text-xs font-black ${
        muted
          ? "text-gray-400"
          : end
            ? "text-green-600"
            : "text-gray-300"
      }`}
    >
      {end || "--:--"}
    </span>
  </div>
);

const AttendanceCard = ({
  row,
  fallbackDate,
  index,
}) => {
  const statusInfo =
    getStatusBadge(
      row.exit_diff,
      row.status,
    );

  const displayDate =
    row.visit_date ||
    row.date ||
    fallbackDate;

  return (
    <motion.article
      initial={{
        opacity: 0,
        y: 8,
      }}
      animate={{
        opacity: 1,
        y: 0,
      }}
      transition={{
        delay: index * 0.03,
      }}
      className="bg-white p-5 rounded-[2rem] shadow-sm border border-gray-100"
    >
      <div className="flex justify-between items-start gap-3">
        <WorkerCell row={row} />

        <span
          className={`text-[8px] font-black px-2.5 py-1 rounded-full border uppercase tracking-wider ${statusInfo.style}`}
        >
          {statusInfo.label}
        </span>
      </div>

      <div className="bg-gray-50 p-4 rounded-2xl mt-4 border border-gray-100">
        <div className="flex justify-between items-center gap-3 pb-3 border-b border-gray-200">
          <span className="text-[8px] font-black text-gray-400 uppercase">
            Visita
          </span>

          <span className="text-[9px] font-black text-blue-700 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-100">
            {row.visit_number ||
              "S/N"}
          </span>
        </div>

        <div className="pt-3">
          <p className="text-[11px] font-black text-gray-800 truncate">
            {row.local_name ||
              "Sin local"}
          </p>

          <p className="text-[9px] font-bold text-[#87be00] mt-1">
            {row.local_code ||
              "Sin código"}{" "}
            ·{" "}
            {formatDate(
              displayDate,
            )}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 mt-3">
        <div className="border border-gray-100 p-3 rounded-xl text-center">
          <p className="text-[8px] font-black text-gray-400 uppercase mb-2">
            Planificado
          </p>

          <TimeRange
            start={row.plan_in}
            end={row.plan_out}
            muted
          />
        </div>

        <div className="border border-gray-100 p-3 rounded-xl text-center">
          <p className="text-[8px] font-black text-gray-400 uppercase mb-2">
            Real
          </p>

          <TimeRange
            start={row.check_in}
            end={row.check_out}
            alert={
              Number(
                row.entry_delay,
              ) > 10
            }
          />
        </div>
      </div>

      <div className="bg-[#87be00]/5 border border-[#87be00]/10 p-3 rounded-xl flex justify-between items-center mt-3">
        <span className="text-[9px] font-black text-[#6f9d00] uppercase">
          Jornada efectiva
        </span>

        <span className="text-[10px] font-black text-gray-900">
          {formatWorkTime(
            row.total_work_time,
          )}
        </span>
      </div>
    </motion.article>
  );
};

const Pagination = ({
  page,
  totalPages,
  loading,
  onPrevious,
  onNext,
}) => (
  <div className="flex flex-col sm:flex-row justify-center items-center gap-3 pt-3">
    <Button
      type="button"
      variant="secondary"
      size="sm"
      leftIcon={
        <FiChevronLeft
          size={14}
        />
      }
      disabled={
        page === 1 || loading
      }
      onClick={onPrevious}
    >
      Anterior
    </Button>

    <div className="bg-white px-4 py-2.5 rounded-xl border border-gray-100 shadow-sm text-[10px] font-black text-gray-600 uppercase">
      Página{" "}
      <span className="text-[#87be00]">
        {page}
      </span>{" "}
      de {totalPages}
    </div>

    <Button
      type="button"
      variant="secondary"
      size="sm"
      disabled={
        page === totalPages ||
        loading
      }
      onClick={onNext}
    >
      Siguiente
      <FiChevronRight
        size={14}
        className="ml-1"
      />
    </Button>
  </div>
);

const LoadingState = () => (
  <div className="py-20 flex flex-col items-center gap-4 text-gray-400">
    <FiRefreshCw
      size={30}
      className="animate-spin text-[#87be00]"
    />

    <p className="text-[10px] font-black uppercase tracking-wider">
      Cargando jornadas...
    </p>
  </div>
);

const InformationMessage = ({
  title,
  description,
  action,
}) => (
  <section className="bg-white border border-dashed border-gray-200 rounded-[2rem] px-6 py-14 text-center shadow-sm">
    <FiAlertCircle
      size={28}
      className="mx-auto text-gray-300"
    />

    <h2 className="text-lg font-black text-gray-800 mt-4">
      {title}
    </h2>

    {description && (
      <p className="text-sm text-gray-400 mt-2 max-w-xl mx-auto">
        {description}
      </p>
    )}

    {action && (
      <div className="mt-5">
        {action}
      </div>
    )}
  </section>
);

const inputClass = `
  w-full h-12 px-4
  bg-gray-50 border border-gray-100
  rounded-2xl
  text-xs font-bold text-gray-700
  outline-none transition-all
  focus:bg-white
  focus:border-[#87be00]/50
  focus:ring-4 focus:ring-[#87be00]/10
`;

const thClass =
  "px-5 py-4 text-[9px] font-black uppercase tracking-wider";

export default AttendanceControl;