import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  FiActivity,
  FiCheckCircle,
  FiLayers,
  FiMapPin,
  FiUsers,
} from "react-icons/fi";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import api from "../../api/apiClient";
import LocalesMap from "../../components/LocalesMap";

const getResponseData = (response, fallback) => {
  if (response == null) return fallback;
  return response?.data ?? response;
};

const safeNumber = (value) => {
  const parsedValue = Number(value ?? 0);
  return Number.isFinite(parsedValue) ? parsedValue : 0;
};

const AdminOverview = () => {
  const [stats, setStats] = useState(null);
  const [locales, setLocales] = useState([]);
  const [selectedLocalId, setSelectedLocalId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const storedUser = localStorage.getItem("user");
      const user = storedUser ? JSON.parse(storedUser) : null;
      const companyId = user?.company_id;

      if (!companyId) {
        throw new Error("No se encontró una empresa asociada al usuario.");
      }

      const [statsResponse, localesResponse] = await Promise.all([
        api
          .get(`/users/company/${companyId}/stats`)
          .catch(() => null),
        api
          .get(`/locales?company_id=${companyId}`)
          .catch(() => []),
      ]);

      const statsData = getResponseData(statsResponse, null);
      const localesData = getResponseData(localesResponse, []);

      setStats(statsData);
      setLocales(Array.isArray(localesData) ? localesData : []);
    } catch (requestError) {
      setError(
        requestError?.response?.data?.message ||
          requestError?.message ||
          "No se pudo cargar el resumen de la empresa.",
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
      selectedLocalId &&
      !locales.some((local) => local.id === selectedLocalId)
    ) {
      setSelectedLocalId(null);
    }
  }, [locales, selectedLocalId]);

  const selectedLocal = useMemo(
    () =>
      locales.find((local) => local.id === selectedLocalId) ??
      null,
    [locales, selectedLocalId],
  );

  const chartData = useMemo(() => {
    const counts = locales.reduce((accumulator, local) => {
      const label =
        local.cadena?.split("-")[0]?.trim() ||
        "Sin cadena";

      accumulator[label] =
        (accumulator[label] || 0) + 1;

      return accumulator;
    }, {});

    return Object.entries(counts)
      .map(([name, count]) => ({
        name,
        locales: count,
      }))
      .sort((a, b) => b.locales - a.locales);
  }, [locales]);

  const statsCounts = stats?.counts ?? {};
  const statsLimits = stats?.limits ?? {};

  const usedSupervisors = safeNumber(
    statsCounts.SUPERVISOR,
  );
  const usedUsers = safeNumber(statsCounts.USUARIO);
  const usedView = safeNumber(statsCounts.VIEW);

  const maxSupervisors = safeNumber(
    statsLimits.max_supervisors,
  );
  const maxUsers = safeNumber(statsLimits.max_users);
  const maxView = safeNumber(statsLimits.max_view);

  const totalLocales = locales.length;

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4 font-[Outfit]">
        <div className="w-12 h-12 border-4 border-gray-100 border-t-[#87be00] rounded-full animate-spin" />

        <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.25em] animate-pulse">
          Cargando resumen...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center font-[Outfit]">
        <div className="w-full max-w-lg bg-red-50 border border-red-100 rounded-3xl p-6 text-center">
          <p className="text-sm font-black text-red-600">
            {error}
          </p>

          <button
            type="button"
            onClick={fetchData}
            className="mt-4 px-5 py-2.5 rounded-xl bg-white border border-red-200 text-xs font-black text-red-600 hover:bg-red-100 transition-colors"
          >
            Intentar nuevamente
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-7 md:space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700 font-[Outfit]">
      <header className="px-1 sm:px-2">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-[#87be00]/10 rounded-xl text-[#87be00] shrink-0">
            <FiLayers size={20} />
          </div>

          <div className="min-w-0">
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-gray-800 tracking-tight leading-tight">
              Resumen de la empresa
            </h1>

            <p className="text-[10px] sm:text-xs font-bold text-[#87be00] uppercase tracking-[0.15em] sm:tracking-[0.22em] mt-1">
              Cuentas y locales configurados
            </p>
          </div>
        </div>
      </header>

      <section className="grid grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-5">
        <StatCard
          label="Supervisores"
          used={usedSupervisors}
          max={maxSupervisors}
          icon={<FiUsers size={22} />}
          trend={
            usedSupervisors >= maxSupervisors &&
            maxSupervisors > 0
              ? "Límite"
              : "Disponible"
          }
          color={
            usedSupervisors >= maxSupervisors &&
            maxSupervisors > 0
              ? "text-red-500"
              : "text-gray-800"
          }
        />

        <StatCard
          label="Mercaderistas"
          used={usedUsers}
          max={maxUsers}
          icon={<FiUsers size={22} />}
          trend={
            usedUsers >= maxUsers && maxUsers > 0
              ? "Límite"
              : "Disponible"
          }
          color={
            usedUsers >= maxUsers && maxUsers > 0
              ? "text-red-500"
              : "text-gray-800"
          }
        />

        <StatCard
          label="Visualizadores"
          used={usedView}
          max={maxView}
          icon={<FiCheckCircle size={22} />}
          trend={
            usedView >= maxView && maxView > 0
              ? "Límite"
              : "Disponible"
          }
          color={
            usedView >= maxView && maxView > 0
              ? "text-red-500"
              : "text-gray-800"
          }
        />

        <StatCard
          label="Locales"
          value={totalLocales}
          icon={<FiMapPin size={22} />}
          trend="Configurados"
          color="text-[#87be00]"
          isGlobalCard
        />
      </section>

      <section className="grid grid-cols-1 xl:grid-cols-5 gap-6 lg:gap-8 items-start">
        <article className="xl:col-span-2 self-start bg-white p-5 sm:p-7 lg:p-9 rounded-[2rem] lg:rounded-[3rem] border border-gray-100 shadow-xl shadow-gray-200/40">
          <div className="flex justify-between items-center mb-5 sm:mb-8">
            <div>
              <h2 className="text-xs font-black text-gray-700">
                Locales por cadena
              </h2>

              <p className="text-[10px] text-gray-400 mt-1">
                Distribución de los puntos de venta
              </p>
            </div>

            <FiActivity
              className="text-[#87be00]"
              size={18}
            />
          </div>

          {chartData.length > 0 ? (
            <div className="w-full overflow-y-auto custom-scrollbar pr-1">
              <div
                style={{
                  height: `${Math.max(chartData.length * 42, 260)}px`,
                }}
              >
                <ResponsiveContainer
                  width="100%"
                  height="100%"
                >
                  <BarChart
                    data={chartData}
                    layout="vertical"
                    margin={{
                      top: 4,
                      right: 18,
                      left: 8,
                      bottom: 4,
                    }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      horizontal={false}
                      stroke="#f1f5f9"
                    />

                    <XAxis
                      type="number"
                      allowDecimals={false}
                      fontSize={9}
                      tickLine={false}
                      axisLine={false}
                      tick={{
                        fill: "#cbd5e1",
                      }}
                    />

                    <YAxis
                      type="category"
                      dataKey="name"
                      width={105}
                      fontSize={9}
                      fontWeight={700}
                      tickLine={false}
                      axisLine={false}
                      tick={{
                        fill: "#64748b",
                      }}
                      tickFormatter={(value) =>
                        value.length > 16
                          ? `${value.slice(0, 15)}…`
                          : value
                      }
                    />

                    <Tooltip
                      cursor={{
                        fill: "rgba(148, 163, 184, 0.08)",
                      }}
                      formatter={(value) => [
                        value,
                        "Locales",
                      ]}
                      labelFormatter={(label) =>
                        `Cadena: ${label}`
                      }
                      contentStyle={{
                        borderRadius: "16px",
                        border: "1px solid #f1f5f9",
                        fontFamily: "Outfit",
                        fontSize: "11px",
                        boxShadow:
                          "0 10px 25px rgba(0,0,0,0.05)",
                      }}
                    />

                    <Bar
                      dataKey="locales"
                      fill="#87be00"
                      radius={[0, 8, 8, 0]}
                      maxBarSize={22}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          ) : (
            <EmptyState
              title="Sin datos para el gráfico"
              description="Los locales aparecerán aquí cuando estén configurados."
            />
          )}
        </article>

        <article className="xl:col-span-3 self-start bg-white p-5 sm:p-7 lg:p-9 rounded-[2rem] lg:rounded-[3rem] border border-gray-100 shadow-xl shadow-gray-200/40">
          <div className="mb-5 sm:mb-8">
            <h2 className="text-xs font-black text-gray-700">
              Ubicación de los puntos de venta
            </h2>

            <p className="text-[10px] text-gray-400 mt-1">
              Selecciona un local para destacarlo en el mapa
            </p>
          </div>

          {locales.length > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 lg:gap-6 items-start">
              <div className="lg:col-span-5 h-72 lg:h-[380px] overflow-y-auto pr-1 lg:pr-3 custom-scrollbar space-y-2.5">
                {locales.map((local) => {
                  const isSelected =
                    selectedLocalId === local.id;

                  return (
                    <button
                      key={local.id}
                      type="button"
                      onClick={() =>
                        setSelectedLocalId(local.id)
                      }
                      aria-pressed={isSelected}
                      className={`w-full text-left p-4 sm:p-5 rounded-2xl border-2 transition-all active:scale-[0.99] ${
                        isSelected
                          ? "bg-gray-900 border-gray-900 shadow-lg"
                          : "bg-white border-gray-100 hover:border-gray-200"
                      }`}
                    >
                      <p
                        className={`text-xs font-black truncate ${
                          isSelected
                            ? "text-[#87be00]"
                            : "text-gray-800"
                        }`}
                      >
                        {local.cadena ||
                          "Local sin cadena"}
                      </p>

                      <p
                        className={`text-[10px] font-bold mt-1.5 line-clamp-2 ${
                          isSelected
                            ? "text-gray-300"
                            : "text-gray-400"
                        }`}
                      >
                        {local.direccion ||
                          "Dirección no registrada"}
                      </p>
                    </button>
                  );
                })}
              </div>

              <div className="lg:col-span-7 h-72 sm:h-[360px] lg:h-[380px] rounded-[2rem] overflow-hidden bg-gray-50 border border-gray-100 shadow-inner">
                <LocalesMap
                  locales={locales}
                  selectedLocal={selectedLocal}
                />
              </div>
            </div>
          ) : (
            <EmptyState
              title="No hay locales configurados"
              description="Cuando registres locales, podrás verlos y seleccionarlos desde este panel."
            />
          )}
        </article>
      </section>
    </div>
  );
};

const StatCard = ({
  label,
  used,
  max,
  value,
  icon,
  trend,
  color,
  isGlobalCard = false,
}) => {
  const hasReachedLimit =
    trend === "Límite";

  return (
    <article className="bg-white p-4 sm:p-6 lg:p-7 rounded-[1.75rem] sm:rounded-[2.25rem] shadow-lg shadow-gray-200/35 border border-gray-100 flex flex-col justify-between gap-5 min-h-[175px] sm:min-h-[210px] group hover:shadow-xl transition-all">
      <div className="flex justify-between items-start gap-2">
        <div className="p-3 sm:p-4 bg-gray-50 rounded-2xl text-gray-400 group-hover:bg-gray-900 group-hover:text-white transition-colors">
          {icon}
        </div>

        <span
          className={`text-[8px] sm:text-[9px] font-black uppercase tracking-wider text-right ${
            hasReachedLimit
              ? "text-red-500"
              : "text-gray-400"
          }`}
        >
          {trend}
        </span>
      </div>

      <div>
        <p className="text-[9px] sm:text-[10px] font-black text-gray-400 uppercase tracking-wider mb-2">
          {label}
        </p>

        <p
          className={`text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight leading-none ${color}`}
        >
          {isGlobalCard ? (
            value
          ) : (
            <>
              {used}
              <span className="text-base sm:text-xl font-normal text-gray-300 mx-1">
                /
              </span>
              <span className="text-xl sm:text-2xl lg:text-3xl text-gray-400 font-bold">
                {max}
              </span>
            </>
          )}
        </p>
      </div>
    </article>
  );
};

const EmptyState = ({ title, description }) => (
  <div className="min-h-52 flex flex-col items-center justify-center text-center p-6 bg-gray-50 rounded-[2rem] border border-dashed border-gray-200">
    <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center text-gray-300 shadow-sm">
      <FiMapPin size={22} />
    </div>

    <p className="mt-4 text-sm font-black text-gray-700">
      {title}
    </p>

    <p className="mt-1 text-xs text-gray-400 max-w-xs">
      {description}
    </p>
  </div>
);

export default AdminOverview;