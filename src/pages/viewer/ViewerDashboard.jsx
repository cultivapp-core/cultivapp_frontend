import React, {
  useCallback,
  useEffect,
  useState,
} from "react";
import {
  FiActivity,
  FiAlertTriangle,
  FiBarChart2,
  FiDollarSign,
  FiInfo,
  FiLayout,
  FiLoader,
  FiRefreshCw,
  FiTrendingUp,
  FiUsers,
} from "react-icons/fi";
import {
  Bar,
  BarChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import toast from "react-hot-toast";

import api from "../../api/apiClient";
import InventoryModule from "../inventory/InventoryModule";

const INITIAL_STATS = {
  monthlySales: 0,
  coverage: 0,
  stockouts: 0,
  activeStaff: 0,
  topChains: [],
  activityTrend: [],
};

const formatMoney = (value) => {
  const number = Number.parseFloat(value);

  if (!Number.isFinite(number)) {
    return "—";
  }

  return number.toLocaleString("es-CL", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
};

const formatInt = (value) => {
  const number = Number.parseInt(value, 10);

  if (!Number.isFinite(number)) {
    return "—";
  }

  return number.toLocaleString("es-CL");
};

const formatPercent = (value) => {
  const number = Number.parseFloat(value);

  if (!Number.isFinite(number)) {
    return "—";
  }

  return `${number.toLocaleString("es-CL", {
    maximumFractionDigits: 1,
  })}%`;
};

const normalizeDashboardResponse = (response) => {
  const raw =
    response?.data?.data ??
    response?.data ??
    response ??
    {};

  return {
    monthlySales:
      raw.monthlySales ?? 0,
    coverage:
      raw.coverage ?? 0,
    stockouts:
      raw.stockouts ?? 0,
    activeStaff:
      raw.activeStaff ?? 0,
    topChains:
      Array.isArray(raw.topChains)
        ? raw.topChains
        : [],
    activityTrend:
      Array.isArray(raw.activityTrend)
        ? raw.activityTrend
        : [],
  };
};

const StatCard = ({
  title,
  value,
  subtitle,
  icon: Icon,
  iconBg,
  iconColor,
}) => (
  <article className="flex min-h-[126px] items-center gap-4 rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md sm:p-6">
    <div
      className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl ${iconBg} ${iconColor}`}
    >
      <Icon size={24} />
    </div>

    <div className="min-w-0 flex-1">
      <p className="truncate text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">
        {title}
      </p>

      <div className="mt-2 flex flex-wrap items-end gap-x-2 gap-y-1">
        <h3 className="text-3xl font-black leading-tight tracking-tight text-slate-900 lg:text-4xl">
          {value}
        </h3>

        {subtitle && (
          <span className="pb-1 text-[9px] font-black uppercase tracking-wider text-slate-400">
            {subtitle}
          </span>
        )}
      </div>
    </div>
  </article>
);

const ChainRow = ({ chain }) => {
  const rawCompliance =
    Number.parseFloat(chain?.compliance);

  const compliance =
    Number.isFinite(rawCompliance)
      ? Math.min(
          Math.max(rawCompliance, 0),
          100,
        )
      : 0;

  const barColor =
    compliance >= 90
      ? "bg-[#87be00]"
      : compliance >= 80
        ? "bg-orange-400"
        : "bg-red-500";

  return (
    <div className="space-y-2">
      <div className="flex items-end justify-between gap-3">
        <h4 className="min-w-0 flex-1 truncate text-[11px] font-black uppercase tracking-wide text-slate-900">
          {chain?.name ||
            "Sin nombre"}
        </h4>

        <span className="shrink-0 text-[10px] font-bold text-slate-500">
          {chain?.sales
            ? `$${formatMoney(
                chain.sales,
              )}`
            : "$0"}
        </span>
      </div>

      <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
        <div
          className={`h-full rounded-full transition-all duration-1000 ${barColor}`}
          style={{
            width: `${compliance}%`,
          }}
        />
      </div>

      <div className="text-right text-[8px] font-black uppercase tracking-widest text-slate-400">
        Cobertura{" "}
        {formatPercent(compliance)}
      </div>
    </div>
  );
};

const ViewerDashboard = () => {
  const [loading, setLoading] =
    useState(true);
  const [refreshing, setRefreshing] =
    useState(false);
  const [error, setError] =
    useState(null);
  const [activeView, setActiveView] =
    useState("executive");
  const [stats, setStats] =
    useState(INITIAL_STATS);
  const [lastUpdated, setLastUpdated] =
    useState(null);

  const fetchExecutiveData =
    useCallback(
      async ({
        silent = false,
      } = {}) => {
        try {
          if (silent) {
            setRefreshing(true);
          } else {
            setLoading(true);
          }

          setError(null);

          const response =
            await api.get(
              "/viewer/dashboard-stats",
            );

          setStats(
            normalizeDashboardResponse(
              response,
            ),
          );

          setLastUpdated(new Date());
        } catch (requestError) {
          console.error(
            "Error al cargar dashboard viewer:",
            requestError?.response
              ?.data ||
              requestError?.message ||
              requestError,
          );

          const message =
            requestError?.response?.data
              ?.message ||
            requestError?.message ||
            "No fue posible actualizar los datos";

          setError(message);

          if (!silent) {
            toast.error(message);
          }
        } finally {
          setLoading(false);
          setRefreshing(false);
        }
      },
      [],
    );

  useEffect(() => {
    fetchExecutiveData();

    const interval = setInterval(
      () =>
        fetchExecutiveData({
          silent: true,
        }),
      300000,
    );

    return () => {
      clearInterval(interval);
    };
  }, [fetchExecutiveData]);

  const handleRefresh = () => {
    fetchExecutiveData({
      silent: true,
    });
  };

  const formatLastUpdated = () => {
    if (!lastUpdated) {
      return "Sin actualizar";
    }

    return lastUpdated.toLocaleTimeString(
      "es-CL",
      {
        hour: "2-digit",
        minute: "2-digit",
      },
    );
  };

  if (loading) {
    return (
      <div className="flex min-h-[70vh] flex-1 items-center justify-center px-4 font-[Outfit]">
        <div className="flex flex-col items-center gap-4">
          <FiLoader
            className="animate-spin text-[#87be00]"
            size={40}
          />

          <span className="animate-pulse text-[10px] font-black uppercase tracking-widest text-slate-400">
            Sincronizando dashboard
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-slate-50/70 px-4 pb-12 pt-20 font-[Outfit] sm:px-6 sm:pt-8 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Encabezado unificado */}
        <header className="flex flex-col gap-5 border-b border-slate-200/80 pb-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-center gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#87be00]/10 text-[#87be00]">
              <FiLayout size={22} />
            </div>

            <div className="min-w-0">
              <h1 className="text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
                Reporte consolidado
              </h1>

              <p className="mt-1.5 text-[10px] font-black uppercase tracking-[0.24em] text-[#87be00]">
                Panorama comercial y operativo
              </p>
            </div>
          </div>

          <div className="flex w-full flex-col gap-3 sm:flex-row lg:w-auto lg:items-center">
            <div className="flex w-full gap-2 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-sm sm:w-auto">
              <button
                type="button"
                onClick={() =>
                  setActiveView(
                    "executive",
                  )
                }
                className={`flex-1 rounded-xl px-4 py-2.5 text-[9px] font-black uppercase tracking-wider transition sm:flex-none ${
                  activeView ===
                  "executive"
                    ? "bg-slate-900 text-white shadow-sm"
                    : "text-slate-400 hover:bg-slate-50 hover:text-slate-700"
                }`}
              >
                Vista comercial
              </button>

              <button
                type="button"
                onClick={() =>
                  setActiveView(
                    "inventory",
                  )
                }
                className={`flex-1 rounded-xl px-4 py-2.5 text-[9px] font-black uppercase tracking-wider transition sm:flex-none ${
                  activeView ===
                  "inventory"
                    ? "bg-slate-900 text-white shadow-sm"
                    : "text-slate-400 hover:bg-slate-50 hover:text-slate-700"
                }`}
              >
                Vista inventario
              </button>
            </div>

            <button
              type="button"
              onClick={
                handleRefresh
              }
              disabled={refreshing}
              className="flex h-12 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-[9px] font-black uppercase tracking-wider text-slate-500 shadow-sm transition hover:border-[#87be00]/40 hover:text-[#87be00] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <FiRefreshCw
                size={15}
                className={
                  refreshing
                    ? "animate-spin"
                    : ""
                }
              />

              {refreshing
                ? "Actualizando"
                : `Act. ${formatLastUpdated()}`}
            </button>
          </div>
        </header>

        {error && (
          <div className="flex flex-col gap-4 rounded-2xl border border-red-200 bg-red-50 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-100 text-red-500">
                <FiAlertTriangle
                  size={18}
                />
              </div>

              <div>
                <p className="text-[10px] font-black uppercase tracking-wider text-red-700">
                  Error de sincronización
                </p>

                <p className="mt-1 text-sm font-medium text-red-600">
                  {error}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() =>
                fetchExecutiveData()
              }
              className="rounded-xl bg-red-500 px-4 py-2.5 text-[9px] font-black uppercase tracking-wider text-white transition hover:bg-red-600"
            >
              Reintentar
            </button>
          </div>
        )}

        {activeView ===
        "executive" ? (
          <>
            <section className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
              <StatCard
                title="Sell-Out mensual"
                value={`$${formatMoney(
                  stats.monthlySales,
                )}`}
                subtitle="Millones"
                icon={FiDollarSign}
                iconBg="bg-[#87be00]/10"
                iconColor="text-[#87be00]"
              />

              <StatCard
                title="Cobertura rutas"
                value={formatPercent(
                  stats.coverage,
                )}
                icon={FiActivity}
                iconBg="bg-blue-50"
                iconColor="text-blue-500"
              />

              <StatCard
                title="Quiebres detectados"
                value={formatInt(
                  stats.stockouts,
                )}
                subtitle="Alertas"
                icon={FiAlertTriangle}
                iconBg="bg-red-50"
                iconColor="text-red-500"
              />

              <StatCard
                title="Fuerza en terreno"
                value={formatInt(
                  stats.activeStaff,
                )}
                subtitle="Mercaderistas"
                icon={FiUsers}
                iconBg="bg-purple-50"
                iconColor="text-purple-500"
              />
            </section>

            <section className="grid grid-cols-1 gap-6 xl:grid-cols-3">
              <article className="flex min-h-[420px] flex-col rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-7 xl:col-span-2">
                <div className="mb-8 flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-[0.22em] text-slate-400">
                      Actividad operativa
                    </p>

                    <h2 className="mt-1 text-lg font-black tracking-tight text-slate-900">
                      Visitas por semana
                    </h2>
                  </div>

                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#87be00]/10 text-[#87be00]">
                    <FiBarChart2
                      size={18}
                    />
                  </div>
                </div>

                <div className="relative min-h-[280px] w-full flex-1">
                  {stats.activityTrend
                    .length > 0 ? (
                    <>
                      <ResponsiveContainer
                        width="100%"
                        height={280}
                        minHeight={280}
                      >
                        <BarChart
                          data={
                            stats.activityTrend
                          }
                        >
                          <Tooltip
                            cursor={{
                              fill: "#f8fafc",
                            }}
                            formatter={(
                              value,
                            ) => [
                              `${value} Visitas`,
                              "Total",
                            ]}
                            contentStyle={{
                              borderRadius:
                                "14px",
                              border:
                                "1px solid #e2e8f0",
                              fontFamily:
                                "Outfit, sans-serif",
                              fontSize:
                                "12px",
                            }}
                          />

                          <Bar
                            dataKey="val"
                            fill="#87be00"
                            radius={[
                              8, 8, 0, 0,
                            ]}
                          />
                        </BarChart>
                      </ResponsiveContainer>

                      <div className="mt-4 flex justify-between gap-2 overflow-x-auto px-2 text-[9px] font-black uppercase tracking-[0.16em] text-slate-400 custom-scrollbar">
                        {stats.activityTrend.map(
                          (
                            item,
                            index,
                          ) => (
                            <span
                              key={
                                item?.name ||
                                index
                              }
                              className="shrink-0"
                            >
                              {item?.name ||
                                `S${index + 1}`}
                            </span>
                          ),
                        )}
                      </div>
                    </>
                  ) : (
                    <div className="flex h-[280px] flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-slate-200 bg-slate-50 text-center">
                      <FiInfo
                        size={30}
                        className="text-slate-300"
                      />

                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                        Aún no hay visitas registradas
                      </p>
                    </div>
                  )}
                </div>
              </article>

              <article className="flex min-h-[420px] flex-col rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
                <div className="mb-8 flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-[0.22em] text-slate-400">
                      Ranking comercial
                    </p>

                    <h2 className="mt-1 text-lg font-black tracking-tight text-slate-900">
                      Top cadenas
                    </h2>
                  </div>

                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-400">
                    <FiTrendingUp
                      size={18}
                    />
                  </div>
                </div>

                <div className="flex flex-1 flex-col gap-6 overflow-y-auto pr-1 custom-scrollbar">
                  {stats.topChains
                    .length > 0 ? (
                    stats.topChains.map(
                      (
                        chain,
                        index,
                      ) => (
                        <ChainRow
                          key={
                            chain?.name ||
                            index
                          }
                          chain={
                            chain
                          }
                        />
                      ),
                    )
                  ) : (
                    <div className="flex flex-1 flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-slate-200 bg-slate-50 text-center">
                      <FiInfo
                        size={28}
                        className="text-slate-300"
                      />

                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                        Sin datos disponibles
                      </p>
                    </div>
                  )}
                </div>
              </article>
            </section>
          </>
        ) : (
          <InventoryModule />
        )}
      </div>
    </div>
  );
};

export default ViewerDashboard;
