import {
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  AnimatePresence,
  motion,
} from "framer-motion";
import {
  FiAlertCircle,
  FiArrowRight,
  FiBriefcase,
  FiCalendar,
  FiChevronDown,
  FiClipboard,
  FiClock,
  FiFilter,
  FiHash,
  FiMapPin,
  FiMessageSquare,
  FiPackage,
  FiRefreshCw,
  FiSearch,
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
  fallback = [],
) => {
  if (response == null) return fallback;
  return response?.data ?? response;
};

const formatMinutes = (minutes) => {
  if (
    minutes === null ||
    minutes === undefined ||
    Number.isNaN(Number(minutes))
  ) {
    return "--";
  }

  const normalized =
    Math.max(
      0,
      Math.round(Number(minutes)),
    );

  if (normalized < 60) {
    return `${normalized} min`;
  }

  const hours = Math.floor(
    normalized / 60,
  );
  const rest = normalized % 60;

  return rest > 0
    ? `${hours}h ${rest}m`
    : `${hours}h`;
};

const formatTime = (value) => {
  if (!value) return "--:--";

  const date = new Date(value);

  if (
    Number.isNaN(date.getTime())
  ) {
    return "--:--";
  }

  return date.toLocaleTimeString(
    "es-CL",
    {
      hour: "2-digit",
      minute: "2-digit",
    },
  );
};

const TaskControl = () => {
  const { user } = useAuth();

  const isRoot =
    user?.role === "ROOT";

  const [
    groupedVisits,
    setGroupedVisits,
  ] = useState([]);
  const [rawTasks, setRawTasks] =
    useState([]);
  const [workers, setWorkers] =
    useState([]);
  const [brands, setBrands] =
    useState([]);
  const [companies, setCompanies] =
    useState([]);

  const [loading, setLoading] =
    useState(true);
  const [error, setError] =
    useState("");
  const [
    expandedRow,
    setExpandedRow,
  ] = useState(null);

  const [
    selectedDate,
    setSelectedDate,
  ] = useState(getLocalISODate());
  const [searchTerm, setSearchTerm] =
    useState("");
  const [filterBrand, setFilterBrand] =
    useState("");
  const [
    filterWorker,
    setFilterWorker,
  ] = useState("");
  const [
    selectedCompany,
    setSelectedCompany,
  ] = useState(
    isRoot
      ? ""
      : user?.company_id || "",
  );
  const [
    showFilters,
    setShowFilters,
  ] = useState(false);

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

  const fetchTasks =
    useCallback(async () => {
      try {
        setLoading(true);
        setError("");

        const params = {
          date: selectedDate,
          ...(searchTerm.trim()
            .length > 1 && {
            search:
              searchTerm.trim(),
          }),
          ...(filterBrand && {
            brand_id: filterBrand,
          }),
          ...(filterWorker && {
            user_id: filterWorker,
          }),
          ...(selectedCompany && {
            company_id:
              selectedCompany,
          }),
        };

        /*
         * Se conserva la firma utilizada por el componente original.
         * Si apiClient usa Axios directamente, puede cambiarse a:
         * api.get("/routes/tasks-report", { params })
         */
        const response =
          await api.get(
            "/routes/tasks-report",
            params,
          );

        const list =
          getResponseData(
            response,
            [],
          );

        if (!Array.isArray(list)) {
          throw new Error(
            "La API devolvió un formato inesperado.",
          );
        }

        setRawTasks(list);

        const groups = {};

        list.forEach((task) => {
          const visitId =
            task.visit_id ||
            [
              task.user_id,
              task.local_code,
              selectedDate,
            ].join("-");

          if (!groups[visitId]) {
            groups[visitId] = {
              id: visitId,
              visit_number:
                task.visit_number ||
                "S/N",
              user_id:
                task.user_id,
              first_name:
                task.first_name,
              last_name:
                task.last_name,
              worker_rut:
                task.worker_rut,
              local_name:
                task.local_name,
              local_code:
                task.local_code,
              company_id:
                task.company_id,
              company_name:
                task.company_name,
              products: [],
              total_duration: 0,
              total_codes: 0,
              start_time:
                task.start_time,
              end_time:
                task.end_time,
            };
          }

          groups[
            visitId
          ].products.push(task);

          groups[
            visitId
          ].total_duration +=
            Number(
              task.duration_minutes ||
                0,
            );

          groups[
            visitId
          ].total_codes += Number(
            task.codes_count ||
              task.product_codes
                ?.length ||
              0,
          );

          if (
            task.start_time &&
            (!groups[visitId]
              .start_time ||
              new Date(
                task.start_time,
              ) <
                new Date(
                  groups[
                    visitId
                  ].start_time,
                ))
          ) {
            groups[
              visitId
            ].start_time =
              task.start_time;
          }

          if (
            task.end_time &&
            (!groups[visitId]
              .end_time ||
              new Date(
                task.end_time,
              ) >
                new Date(
                  groups[
                    visitId
                  ].end_time,
                ))
          ) {
            groups[
              visitId
            ].end_time =
              task.end_time;
          }
        });

        setGroupedVisits(
          Object.values(groups),
        );

        const workerMap =
          new Map();
        const brandMap =
          new Map();

        list.forEach((task) => {
          if (
            task.user_id &&
            !workerMap.has(
              task.user_id,
            )
          ) {
            workerMap.set(
              task.user_id,
              {
                id: task.user_id,
                name: [
                  task.first_name,
                  task.last_name,
                ]
                  .filter(Boolean)
                  .join(" "),
              },
            );
          }

          if (
            task.brand_id &&
            !brandMap.has(
              task.brand_id,
            )
          ) {
            brandMap.set(
              task.brand_id,
              {
                id: task.brand_id,
                name:
                  task.brand_name ||
                  "Sin marca",
              },
            );
          }
        });

        setWorkers(
          [...workerMap.values()].sort(
            (a, b) =>
              a.name.localeCompare(
                b.name,
                "es",
              ),
          ),
        );

        setBrands(
          [...brandMap.values()].sort(
            (a, b) =>
              a.name.localeCompare(
                b.name,
                "es",
              ),
          ),
        );

        setExpandedRow(null);
      } catch (requestError) {
        console.error(
          "Error cargando control de visitas:",
          requestError,
        );

        setError(
          requestError?.response?.data
            ?.message ||
            requestError?.message ||
            "No se pudo cargar el control de visitas.",
        );

        setGroupedVisits([]);
        setRawTasks([]);
      } finally {
        setLoading(false);
      }
    }, [
      selectedDate,
      searchTerm,
      filterBrand,
      filterWorker,
      selectedCompany,
    ]);

  useEffect(() => {
    fetchCompanies();
  }, [fetchCompanies]);

  useEffect(() => {
    const timer = setTimeout(
      fetchTasks,
      400,
    );

    return () =>
      clearTimeout(timer);
  }, [fetchTasks]);

  const metrics = useMemo(() => {
    const durations =
      rawTasks
        .map((task) =>
          Number(
            task.duration_minutes,
          ),
        )
        .filter(
          (duration) =>
            Number.isFinite(
              duration,
            ) && duration > 0,
        );

    const averageTime =
      durations.length > 0
        ? Math.round(
            durations.reduce(
              (sum, value) =>
                sum + value,
              0,
            ) /
              durations.length,
          )
        : 0;

    const totalCodes =
      rawTasks.reduce(
        (sum, task) =>
          sum +
          Number(
            task.codes_count ||
              task.product_codes
                ?.length ||
              0,
          ),
        0,
      );

    return {
      totalVisits:
        groupedVisits.length,
      averageTime,
      totalCodes,
      totalProducts:
        rawTasks.length,
    };
  }, [
    groupedVisits.length,
    rawTasks,
  ]);

  const hasFilters =
    Boolean(searchTerm) ||
    Boolean(filterBrand) ||
    Boolean(filterWorker) ||
    Boolean(
      isRoot &&
        selectedCompany,
    ) ||
    selectedDate !==
      getLocalISODate();

  const clearFilters = () => {
    setSearchTerm("");
    setFilterBrand("");
    setFilterWorker("");
    setSelectedDate(
      getLocalISODate(),
    );
  };

  return (
    <div className="w-full min-h-full bg-gray-50/40 font-[Outfit] pb-20">
      <header className="bg-white border-b border-gray-100">
        <div className="max-w-[1500px] mx-auto px-4 sm:px-6 md:px-8 py-5 md:py-8 flex flex-col xl:flex-row xl:items-end justify-between gap-5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-[#87be00]/10 rounded-xl text-[#87be00]">
              <FiClipboard
                size={20}
              />
            </div>

            <div>
              <h1 className="text-3xl md:text-5xl font-black text-gray-900 tracking-tight leading-none">
                Control de visitas
              </h1>

              <p className="text-[10px] font-black text-[#87be00] uppercase tracking-[0.2em] mt-2">
                Auditoría por ruta
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-[180px_1fr_auto_auto] gap-2 w-full xl:w-auto">
            <div className="relative">
              <FiCalendar
                size={15}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-[#87be00]"
              />

              <input
                type="date"
                value={selectedDate}
                onChange={(event) =>
                  setSelectedDate(
                    event.target.value,
                  )
                }
                className={`${inputClass} pl-11`}
              />
            </div>

            <div className="relative min-w-0 sm:min-w-[260px]">
              <FiSearch
                size={15}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
              />

              <input
                type="search"
                placeholder="Folio, local, RUT o mercaderista..."
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
              label="Mostrar filtros"
              size="lg"
              onClick={() =>
                setShowFilters(
                  (current) =>
                    !current,
                )
              }
              className={
                showFilters
                  ? "bg-[#87be00] text-white"
                  : ""
              }
            >
              <FiFilter
                size={17}
              />
            </IconButton>

            <IconButton
              label="Actualizar información"
              size="lg"
              onClick={fetchTasks}
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
        <AnimatePresence>
          {showFilters && (
            <motion.section
              initial={{
                opacity: 0,
                y: -8,
              }}
              animate={{
                opacity: 1,
                y: 0,
              }}
              exit={{
                opacity: 0,
                y: -8,
              }}
              className="bg-white rounded-[2rem] p-4 sm:p-5 border border-gray-100 shadow-sm"
            >
              <div
                className={`grid grid-cols-1 gap-3 ${
                  isRoot
                    ? "md:grid-cols-3"
                    : "md:grid-cols-2"
                }`}
              >
                {isRoot && (
                  <div className="relative">
                    <FiBriefcase
                      size={15}
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                    />

                    <select
                      value={
                        selectedCompany
                      }
                      onChange={(
                        event,
                      ) => {
                        setSelectedCompany(
                          event.target
                            .value,
                        );
                        setFilterWorker(
                          "",
                        );
                        setFilterBrand(
                          "",
                        );
                      }}
                      className={`${inputClass} pl-11`}
                    >
                      <option value="">
                        Todas las empresas
                      </option>

                      {companies.map(
                        (company) => (
                          <option
                            key={
                              company.id
                            }
                            value={
                              company.id
                            }
                          >
                            {company.name ||
                              company.nombre ||
                              "Empresa"}
                          </option>
                        ),
                      )}
                    </select>
                  </div>
                )}

                <select
                  value={filterWorker}
                  onChange={(event) =>
                    setFilterWorker(
                      event.target.value,
                    )
                  }
                  className={inputClass}
                >
                  <option value="">
                    Todos los colaboradores
                  </option>

                  {workers.map(
                    (worker) => (
                      <option
                        key={worker.id}
                        value={worker.id}
                      >
                        {worker.name ||
                          "Sin nombre"}
                      </option>
                    ),
                  )}
                </select>

                <select
                  value={filterBrand}
                  onChange={(event) =>
                    setFilterBrand(
                      event.target.value,
                    )
                  }
                  className={inputClass}
                >
                  <option value="">
                    Todas las marcas
                  </option>

                  {brands.map(
                    (brand) => (
                      <option
                        key={brand.id}
                        value={brand.id}
                      >
                        {brand.name}
                      </option>
                    ),
                  )}
                </select>
              </div>

              {hasFilters && (
                <div className="mt-4">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    leftIcon={
                      <FiX
                        size={13}
                      />
                    }
                    onClick={
                      clearFilters
                    }
                  >
                    Limpiar filtros
                  </Button>
                </div>
              )}
            </motion.section>
          )}
        </AnimatePresence>

        <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-5">
          <MetricCard
            label="Total visitas"
            value={
              metrics.totalVisits
            }
            icon={FiMapPin}
            classes="bg-[#87be00]/10 text-[#6f9d00]"
            loading={loading}
          />

          <MetricCard
            label="Promedio gestión"
            value={formatMinutes(
              metrics.averageTime,
            )}
            icon={FiClock}
            classes="bg-blue-50 text-blue-600"
            loading={loading}
          />

          <MetricCard
            label="EAN escaneados"
            value={
              metrics.totalCodes
            }
            icon={FiHash}
            classes="bg-purple-50 text-purple-600"
            loading={loading}
          />

          <MetricCard
            label="Productos revisados"
            value={
              metrics.totalProducts
            }
            icon={FiPackage}
            classes="bg-amber-50 text-amber-600"
            loading={loading}
          />
        </section>

        {loading &&
        groupedVisits.length === 0 ? (
          <LoadingState />
        ) : error ? (
          <InformationMessage
            title="No se pudo cargar el control de visitas"
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
                onClick={fetchTasks}
              >
                Intentar nuevamente
              </Button>
            }
          />
        ) : groupedVisits.length ===
          0 ? (
          <InformationMessage
            title="Sin información disponible"
            description="No existen visitas que coincidan con la fecha y los filtros seleccionados."
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
                        Punto de venta
                      </th>
                      <th className={`${thClass} text-center`}>
                        Tiempo
                      </th>
                      <th className={`${thClass} text-center`}>
                        Productos
                      </th>
                      <th className={`${thClass} text-center`}>
                        Detalle
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {groupedVisits.map(
                      (
                        visit,
                        index,
                      ) => (
                        <Fragment
                          key={
                            visit.id ||
                            index
                          }
                        >
                          <tr
                            onClick={() =>
                              setExpandedRow(
                                expandedRow ===
                                  index
                                  ? null
                                  : index,
                              )
                            }
                            className={`cursor-pointer border-b border-gray-50 transition-colors ${
                              expandedRow ===
                              index
                                ? "bg-gray-50"
                                : "bg-white hover:bg-gray-50/60"
                            }`}
                          >
                            <td className="px-5 py-4">
                              <WorkerCell
                                visit={
                                  visit
                                }
                              />
                            </td>

                            <td className="px-5 py-4">
                              <span className="inline-flex px-3 py-1.5 rounded-xl bg-blue-50 border border-blue-100 text-blue-700 text-[9px] font-black">
                                {
                                  visit.visit_number
                                }
                              </span>
                            </td>

                            <td className="px-5 py-4">
                              <p className="text-xs font-black text-gray-800 max-w-[230px] truncate">
                                {visit.local_name ||
                                  "Sin local"}
                              </p>

                              <p className="text-[9px] font-black text-[#87be00] mt-1">
                                {visit.local_code ||
                                  "Sin código"}
                              </p>
                            </td>

                            <td className="px-5 py-4 text-center">
                              <DurationBadge
                                minutes={
                                  visit.total_duration
                                }
                              />

                              <div className="flex items-center justify-center gap-2 mt-2">
                                <span className="text-[9px] font-bold text-gray-400">
                                  {formatTime(
                                    visit.start_time,
                                  )}
                                </span>

                                <FiArrowRight
                                  size={9}
                                  className="text-gray-300"
                                />

                                <span className="text-[9px] font-bold text-gray-400">
                                  {formatTime(
                                    visit.end_time,
                                  )}
                                </span>
                              </div>
                            </td>

                            <td className="px-5 py-4 text-center">
                              <span className="inline-flex items-center gap-2 bg-amber-50 text-amber-700 text-[10px] font-black px-3 py-2 rounded-xl">
                                <FiPackage
                                  size={13}
                                />

                                {
                                  visit.products
                                    .length
                                }
                              </span>
                            </td>

                            <td className="px-5 py-4 text-center">
                              <span
                                className={`inline-flex p-3 rounded-xl border transition-colors ${
                                  expandedRow ===
                                  index
                                    ? "bg-gray-900 text-white border-gray-900"
                                    : "bg-white text-gray-400 border-gray-200"
                                }`}
                              >
                                <FiChevronDown
                                  size={17}
                                  className={`transition-transform ${
                                    expandedRow ===
                                    index
                                      ? "rotate-180"
                                      : ""
                                  }`}
                                />
                              </span>
                            </td>
                          </tr>

                          <AnimatePresence>
                            {expandedRow ===
                              index && (
                              <motion.tr
                                initial={{
                                  opacity: 0,
                                }}
                                animate={{
                                  opacity: 1,
                                }}
                                exit={{
                                  opacity: 0,
                                }}
                              >
                                <td
                                  colSpan={6}
                                  className="bg-gray-50/80 px-6 py-6"
                                >
                                  <ProductGrid
                                    products={
                                      visit.products
                                    }
                                  />
                                </td>
                              </motion.tr>
                            )}
                          </AnimatePresence>
                        </Fragment>
                      ),
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="md:hidden space-y-4">
              {groupedVisits.map(
                (visit, index) => (
                  <VisitMobileCard
                    key={
                      visit.id ||
                      index
                    }
                    visit={visit}
                  />
                ),
              )}
            </section>
          </>
        )}
      </main>
    </div>
  );
};

const MetricCard = ({
  label,
  value,
  icon: Icon,
  classes,
  loading,
}) => (
  <article className="bg-white rounded-[1.5rem] p-4 md:p-5 border border-gray-100 shadow-sm flex items-center gap-3">
    <div
      className={`w-11 h-11 md:w-12 md:h-12 rounded-xl flex items-center justify-center shrink-0 ${classes}`}
    >
      <Icon size={19} />
    </div>

    <div className="min-w-0">
      <p className="text-[8px] md:text-[9px] font-black text-gray-400 uppercase tracking-wider">
        {label}
      </p>

      <p className="text-lg md:text-xl font-black text-gray-900 truncate mt-1">
        {loading ? "—" : value}
      </p>
    </div>
  </article>
);

const WorkerCell = ({ visit }) => {
  const fullName = [
    visit.first_name,
    visit.last_name,
  ]
    .filter(Boolean)
    .join(" ");

  const initials = [
    visit.first_name?.[0],
    visit.last_name?.[0],
  ]
    .filter(Boolean)
    .join("")
    .toUpperCase();

  return (
    <div className="flex items-center gap-3">
      <div className="w-10 h-10 bg-[#87be00] text-white rounded-xl flex items-center justify-center text-xs font-black shrink-0">
        {initials || "—"}
      </div>

      <div className="min-w-0">
        <p className="text-[11px] font-black text-gray-900 truncate">
          {fullName ||
            "Sin mercaderista"}
        </p>

        <p className="text-[9px] font-bold text-gray-400 mt-1">
          RUT:{" "}
          {visit.worker_rut ||
            "Sin información"}
        </p>
      </div>
    </div>
  );
};

const DurationBadge = ({
  minutes,
}) => {
  const normalized =
    Number(minutes || 0);

  const classes =
    normalized <= 15
      ? "bg-[#87be00]/10 text-[#6f9d00]"
      : "bg-amber-50 text-amber-700";

  return (
    <span
      className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl text-[9px] font-black ${classes}`}
    >
      <FiClock size={11} />
      {formatMinutes(minutes)}
    </span>
  );
};

const ProductGrid = ({
  products,
}) => (
  <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
    {products.map(
      (product, index) => (
        <ProductCard
          key={
            product.id ||
            `${product.product_id}-${index}`
          }
          product={product}
        />
      ),
    )}
  </div>
);

const ProductCard = ({
  product,
}) => {
  const codes = Array.isArray(
    product.product_codes,
  )
    ? product.product_codes
    : [];

  return (
    <article className="bg-white p-5 rounded-[1.5rem] border border-gray-100 shadow-sm">
      <div className="flex justify-between items-start gap-3">
        <div className="min-w-0">
          <p className="text-[8px] font-black text-gray-400 uppercase tracking-wider">
            {product.brand_name ||
              "Sin marca"}
          </p>

          <p className="text-xs font-black text-gray-900 mt-1 truncate">
            {product.product_name ||
              "Sin producto"}
          </p>
        </div>

        <DurationBadge
          minutes={
            product.duration_minutes
          }
        />
      </div>

      <div className="mt-4 pt-3 border-t border-dashed border-gray-100">
        <p className="text-[8px] font-black text-gray-400 uppercase tracking-wider mb-2">
          Códigos EAN ({codes.length})
        </p>

        <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
          {codes.length > 0 ? (
            codes.map(
              (code, index) => (
                <span
                  key={`${code}-${index}`}
                  className="text-[9px] font-mono bg-purple-50 text-purple-700 px-2 py-1 rounded-md border border-purple-100"
                >
                  {code}
                </span>
              ),
            )
          ) : (
            <span className="text-[9px] text-gray-300 italic">
              Sin códigos
            </span>
          )}
        </div>
      </div>

      {product.comment && (
        <div className="bg-gray-50 p-3 rounded-xl mt-3">
          <FiMessageSquare
            className="text-blue-500 mb-1"
            size={12}
          />

          <p className="text-[9px] font-bold text-gray-600 italic break-words">
            “{product.comment}”
          </p>
        </div>
      )}
    </article>
  );
};

const VisitMobileCard = ({
  visit,
}) => {
  const [open, setOpen] =
    useState(false);

  return (
    <article className="bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden">
      <button
        type="button"
        onClick={() =>
          setOpen(
            (current) => !current,
          )
        }
        className="w-full text-left p-5"
      >
        <div className="flex justify-between items-start gap-3">
          <WorkerCell visit={visit} />

          <DurationBadge
            minutes={
              visit.total_duration
            }
          />
        </div>

        <div className="mt-4 bg-gray-50 rounded-2xl p-4 border border-gray-100">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center shrink-0">
                <FiClipboard
                  size={14}
                />
              </div>

              <div className="min-w-0">
                <p className="text-[8px] font-black text-gray-400 uppercase tracking-wider">
                  {
                    visit.visit_number
                  }
                </p>

                <p className="text-[10px] font-black text-gray-800 truncate mt-1">
                  {visit.local_name ||
                    "Sin local"}
                </p>

                <p className="text-[8px] font-bold text-[#87be00] mt-1">
                  {visit.local_code ||
                    "Sin código"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <p className="text-sm font-black text-gray-900">
                {
                  visit.products.length
                }{" "}
                <span className="text-[8px] text-gray-400 uppercase">
                  prod.
                </span>
              </p>

              <FiChevronDown
                size={18}
                className={`text-gray-400 transition-transform ${
                  open
                    ? "rotate-180"
                    : ""
                }`}
              />
            </div>
          </div>
        </div>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{
              height: 0,
              opacity: 0,
            }}
            animate={{
              height: "auto",
              opacity: 1,
            }}
            exit={{
              height: 0,
              opacity: 0,
            }}
            className="bg-gray-50 border-t border-gray-100 overflow-hidden"
          >
            <div className="p-4">
              <ProductGrid
                products={
                  visit.products
                }
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </article>
  );
};

const LoadingState = () => (
  <div className="py-20 flex flex-col items-center gap-4 text-gray-400">
    <FiRefreshCw
      size={30}
      className="animate-spin text-[#87be00]"
    />

    <p className="text-[10px] font-black uppercase tracking-wider">
      Cargando visitas...
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

export default TaskControl;