import React, {
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  FiAlertCircle,
  FiCalendar,
  FiFilter,
  FiMapPin,
  FiRefreshCw,
  FiTrendingUp,
  FiUsers,
  FiX,
} from "react-icons/fi";

import api from "../../api/apiClient";

const EMPTY_FILTERS = {
  regiones: [],
  comunas: [],
  cadenas: [],
  mercaderistas: [],
};

const EMPTY_SELECTED = {
  start_date: "",
  end_date: "",
  region: "",
  cadena: "",
  mercaderista: "",
};

const inputStyle =
  "h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-[10px] font-black uppercase text-slate-700 outline-none transition focus:border-[#87be00]/60 focus:bg-white focus:ring-4 focus:ring-[#87be00]/10";

const CHART_COLORS = [
  "#87be00",
  "#2563eb",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#ec4899",
  "#14b8a6",
];

const extractRows = (response) => {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.data)) return response.data;
  if (Array.isArray(response?.rows)) return response.rows;
  return [];
};

const GeoChainReport = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] =
    useState(false);
  const [error, setError] =
    useState(null);

  const [filters, setFilters] =
    useState(EMPTY_FILTERS);

  const [selected, setSelected] =
    useState(EMPTY_SELECTED);

  const formatCurrency = (value) =>
    new Intl.NumberFormat("es-CL", {
      style: "currency",
      currency: "CLP",
      maximumFractionDigits: 0,
    }).format(Number(value || 0));

  const formatCompactCurrency = (value) =>
    new Intl.NumberFormat("es-CL", {
      notation: "compact",
      compactDisplay: "short",
      maximumFractionDigits: 1,
    }).format(Number(value || 0));

  const hasActiveFilters =
    Object.values(selected).some(Boolean);

  const isDrillDown =
    selected.region !== "" &&
    selected.cadena !== "";

  const chartData = useMemo(() => {
    if (isDrillDown) {
      return data
        .map((item) => ({
          label:
            item.comuna ||
            item.codigo_local ||
            "Sin comuna",
          ventas: Number(
            item.total_ventas || 0,
          ),
          ventas_brutas: Number(
            item.total_ventas_brutas || 0,
          ),
          codigo_local:
            item.codigo_local || "S/N",
          region:
            item.region || selected.region,
          cadena:
            item.cadena || selected.cadena,
        }))
        .sort(
          (first, second) =>
            second.ventas -
            first.ventas,
        );
    }

    const grouped = {};

    data.forEach((item) => {
      const region =
        item.region || "Sin región";
      const chain =
        item.cadena || "Sin cadena";

      if (!grouped[region]) {
        grouped[region] = {
          region,
        };
      }

      grouped[region][chain] =
        Number(grouped[region][chain] || 0) +
        Number(item.total_ventas || 0);
    });

    return Object.values(grouped);
  }, [
    data,
    isDrillDown,
    selected.cadena,
    selected.region,
  ]);

  const uniqueChains = useMemo(
    () =>
      Array.from(
        new Set(
          data
            .map((item) => item.cadena)
            .filter(Boolean),
        ),
      ),
    [data],
  );

  const summary = useMemo(() => {
    return data.reduce(
      (accumulator, item) => {
        accumulator.netSales += Number(
          item.total_ventas || 0,
        );

        accumulator.grossSales += Number(
          item.total_ventas_brutas || 0,
        );

        if (item.region) {
          accumulator.regions.add(
            item.region,
          );
        }

        if (item.codigo_local) {
          accumulator.stores.add(
            item.codigo_local,
          );
        }

        return accumulator;
      },
      {
        netSales: 0,
        grossSales: 0,
        regions: new Set(),
        stores: new Set(),
      },
    );
  }, [data]);

  useEffect(() => {
    let cancelled = false;

    const loadFilters = async () => {
      try {
        const response = await api.get(
          "/sales/report/filters",
          {
            params: {
              region: selected.region,
              cadena: selected.cadena,
            },
          },
        );

        if (cancelled) return;

        const payload =
          response?.data ?? response;

        setFilters({
          regiones: Array.isArray(
            payload?.regiones,
          )
            ? payload.regiones
            : [],
          comunas: Array.isArray(
            payload?.comunas,
          )
            ? payload.comunas
            : [],
          cadenas: Array.isArray(
            payload?.cadenas,
          )
            ? payload.cadenas
            : [],
          mercaderistas: Array.isArray(
            payload?.mercaderistas,
          )
            ? payload.mercaderistas
            : [],
        });
      } catch (requestError) {
        if (!cancelled) {
          console.error(
            "Error cargando filtros dinámicos:",
            requestError,
          );
        }
      }
    };

    loadFilters();

    return () => {
      cancelled = true;
    };
  }, [
    selected.region,
    selected.cadena,
  ]);

  useEffect(() => {
    let cancelled = false;

    const fetchData = async () => {
      if (!hasActiveFilters) {
        setData([]);
        setLoading(false);
        setError(null);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const response = await api.get(
          "/sales/report/geo-chain",
          {
            params: {
              region: selected.region,
              cadena: selected.cadena,
              mercaderista:
                selected.mercaderista,
              start_date:
                selected.start_date,
              end_date:
                selected.end_date,
            },
          },
        );

        if (cancelled) return;

        setData(
          extractRows(response),
        );
      } catch (requestError) {
        if (cancelled) return;

        console.error(
          "Error obteniendo datos:",
          requestError,
        );

        setData([]);
        setError(
          requestError?.response?.data
            ?.message ??
            requestError?.data?.message ??
            requestError?.message ??
            "No fue posible cargar el reporte geográfico.",
        );
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchData();

    return () => {
      cancelled = true;
    };
  }, [selected, hasActiveFilters]);

  const updateSelected = (
    field,
    value,
  ) => {
    setSelected((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const handleClear = () => {
    setSelected(EMPTY_SELECTED);
    setData([]);
    setError(null);
  };

  const CustomTooltip = ({
    active,
    payload,
    label,
  }) => {
    if (
      !active ||
      !payload?.length
    ) {
      return null;
    }

    const item =
      payload[0]?.payload ?? {};

    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xl">
        <p className="text-[9px] font-black uppercase tracking-wider text-slate-400">
          {item.codigo_local
            ? `Local ${item.codigo_local}`
            : isDrillDown
              ? "Detalle territorial"
              : "Región"}
        </p>

        <p className="mt-1 text-sm font-black text-slate-900">
          {item.label ||
            item.region ||
            label ||
            "Sin información"}
        </p>

        <div className="mt-3 space-y-1.5">
          {payload.map(
            (entry, index) => (
              <div
                key={`${entry.name}-${index}`}
                className="flex items-center justify-between gap-4"
              >
                <span className="flex items-center gap-2 text-[10px] font-bold text-slate-500">
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{
                      backgroundColor:
                        entry.color,
                    }}
                  />

                  {entry.name}
                </span>

                <strong className="text-[10px] font-black text-slate-900">
                  {formatCurrency(
                    entry.value,
                  )}
                </strong>
              </div>
            ),
          )}
        </div>
      </div>
    );
  };

  const summaryCards = [
    {
      label: "Venta neta",
      value: formatCurrency(
        summary.netSales,
      ),
      helper:
        "Acumulado del filtro",
      icon: FiTrendingUp,
      tone:
        "bg-[#87be00]/10 text-[#87be00]",
    },
    {
      label: "Venta bruta",
      value: formatCurrency(
        summary.grossSales,
      ),
      helper:
        "Acumulado del filtro",
      icon: FiTrendingUp,
      tone:
        "bg-blue-50 text-blue-600",
    },
    {
      label: "Regiones",
      value: summary.regions.size,
      helper:
        "Cobertura geográfica",
      icon: FiMapPin,
      tone:
        "bg-violet-50 text-violet-600",
    },
    {
      label: "Locales",
      value: summary.stores.size,
      helper:
        "Puntos de venta",
      icon: FiUsers,
      tone:
        "bg-amber-50 text-amber-600",
    },
  ];

  return (
    <div className="min-h-full bg-slate-50/70 px-4 pb-10 pt-20 font-[Outfit] sm:px-6 sm:pt-8 lg:px-8">
      <div className="mx-auto flex max-w-[1600px] flex-col gap-6">
        <header className="flex flex-col gap-5 border-b border-slate-200/80 pb-6 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex min-w-0 items-center gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#87be00]/10 text-[#87be00]">
              <FiMapPin size={22} />
            </div>

            <div className="min-w-0">
              <h1 className="text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
                Rendimiento geográfico y canal
              </h1>

              <p className="mt-1.5 text-[10px] font-black uppercase tracking-[0.24em] text-[#87be00]">
                Cobertura territorial y desempeño comercial
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <span className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-[9px] font-black uppercase tracking-wider text-slate-500 shadow-sm">
              {data.length} registros
            </span>

            {loading && (
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-900 text-white shadow-lg">
                <FiRefreshCw
                  size={15}
                  className="animate-spin"
                />
              </div>
            )}
          </div>
        </header>

        <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
              <FiFilter size={18} />
            </div>

            <div>
              <h2 className="text-base font-black tracking-tight text-slate-900">
                Filtros del reporte
              </h2>

              <p className="mt-0.5 text-[9px] font-black uppercase tracking-[0.18em] text-slate-400">
                Ajusta período, región, cadena y mercaderista
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
            <label className="flex flex-col gap-1.5">
              <span className="pl-1 text-[9px] font-black uppercase tracking-wider text-slate-400">
                Desde
              </span>

              <input
                type="date"
                value={
                  selected.start_date
                }
                max={
                  selected.end_date ||
                  undefined
                }
                onChange={(event) =>
                  updateSelected(
                    "start_date",
                    event.target.value,
                  )
                }
                className={inputStyle}
              />
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="pl-1 text-[9px] font-black uppercase tracking-wider text-slate-400">
                Hasta
              </span>

              <input
                type="date"
                value={
                  selected.end_date
                }
                min={
                  selected.start_date ||
                  undefined
                }
                onChange={(event) =>
                  updateSelected(
                    "end_date",
                    event.target.value,
                  )
                }
                className={inputStyle}
              />
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="pl-1 text-[9px] font-black uppercase tracking-wider text-slate-400">
                Región
              </span>

              <select
                value={
                  selected.region
                }
                onChange={(event) =>
                  setSelected(
                    (current) => ({
                      ...current,
                      region:
                        event.target.value,
                      mercaderista: "",
                    }),
                  )
                }
                className={inputStyle}
              >
                <option value="">
                  Todas
                </option>

                {filters.regiones.map(
                  (region) => (
                    <option
                      key={region}
                      value={region}
                    >
                      {region}
                    </option>
                  ),
                )}
              </select>
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="pl-1 text-[9px] font-black uppercase tracking-wider text-slate-400">
                Cadena
              </span>

              <select
                value={
                  selected.cadena
                }
                onChange={(event) =>
                  setSelected(
                    (current) => ({
                      ...current,
                      cadena:
                        event.target.value,
                      mercaderista: "",
                    }),
                  )
                }
                className={inputStyle}
              >
                <option value="">
                  Todas
                </option>

                {filters.cadenas.map(
                  (chain) => (
                    <option
                      key={chain}
                      value={chain}
                    >
                      {chain}
                    </option>
                  ),
                )}
              </select>
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="pl-1 text-[9px] font-black uppercase tracking-wider text-slate-400">
                Mercaderista
              </span>

              <select
                value={
                  selected.mercaderista
                }
                disabled={
                  !selected.cadena ||
                  filters.mercaderistas
                    .length === 0
                }
                onChange={(event) =>
                  updateSelected(
                    "mercaderista",
                    event.target.value,
                  )
                }
                className={`${inputStyle} disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-300`}
              >
                <option value="">
                  Todos
                </option>

                {filters.mercaderistas.map(
                  (worker) => (
                    <option
                      key={worker}
                      value={worker}
                    >
                      {worker}
                    </option>
                  ),
                )}
              </select>
            </label>

            <button
              type="button"
              onClick={handleClear}
              disabled={
                !hasActiveFilters
              }
              className="mt-auto flex h-12 items-center justify-center gap-2 rounded-xl border border-red-100 bg-red-50 px-4 text-[9px] font-black uppercase tracking-wider text-red-500 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-50 disabled:text-slate-300"
            >
              <FiX size={14} />
              Limpiar
            </button>
          </div>
        </section>

        {error && (
          <section className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-100 text-red-500">
              <FiAlertCircle
                size={19}
              />
            </div>

            <div>
              <p className="text-[9px] font-black uppercase tracking-wider text-red-700">
                Error del reporte
              </p>

              <p className="mt-1 text-sm font-medium text-red-600">
                {error}
              </p>
            </div>
          </section>
        )}

        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {summaryCards.map(
            ({
              label,
              value,
              helper,
              icon: Icon,
              tone,
            }) => (
              <article
                key={label}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                      {label}
                    </p>

                    <p className="mt-3 truncate text-xl font-black tracking-tight text-slate-900 sm:text-2xl">
                      {value}
                    </p>

                    <p className="mt-2 text-[9px] font-bold text-slate-400">
                      {helper}
                    </p>
                  </div>

                  <div
                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${tone}`}
                  >
                    <Icon size={18} />
                  </div>
                </div>
              </article>
            ),
          )}
        </section>

        <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="mb-5 flex flex-col gap-3 border-b border-slate-100 pb-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[9px] font-black uppercase tracking-[0.2em] text-[#87be00]">
                {isDrillDown
                  ? "Detalle territorial"
                  : "Comparativo regional"}
              </p>

              <h2 className="mt-1 text-base font-black tracking-tight text-slate-900">
                {isDrillDown
                  ? "Venta neta y bruta por comuna"
                  : "Venta neta por región y cadena"}
              </h2>

              <p className="mt-2 text-sm text-slate-500">
                {isDrillDown
                  ? "Compara el desempeño de cada comuna dentro de la región y cadena seleccionadas."
                  : "Visualiza la evolución comercial de las cadenas presentes en cada región."}
              </p>
            </div>

            <span className="rounded-xl bg-slate-100 px-3 py-2 text-[9px] font-black uppercase tracking-wider text-slate-500">
              {chartData.length} puntos
            </span>
          </div>

          <div className="h-[430px] w-full">
            {loading ? (
              <div className="flex h-full items-center justify-center">
                <div className="h-12 w-12 animate-spin rounded-full border-4 border-slate-100 border-t-[#87be00]" />
              </div>
            ) : chartData.length > 0 ? (
              <ResponsiveContainer
                width="100%"
                height="100%"
              >
                {isDrillDown ? (
                  <LineChart
                    data={chartData}
                    margin={{
                      top: 20,
                      right: 25,
                      bottom: 20,
                      left: 5,
                    }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                      stroke="#e2e8f0"
                    />

                    <XAxis
                      dataKey="label"
                      axisLine={false}
                      tickLine={false}
                      fontSize={9}
                      fontWeight={700}
                      tick={{
                        fill: "#64748b",
                      }}
                      minTickGap={18}
                    />

                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      fontSize={9}
                      fontWeight={700}
                      tick={{
                        fill: "#94a3b8",
                      }}
                      tickFormatter={
                        formatCompactCurrency
                      }
                      width={72}
                    />

                    <Tooltip
                      content={
                        <CustomTooltip />
                      }
                    />

                    <Legend
                      iconType="circle"
                      wrapperStyle={{
                        fontSize: "10px",
                        fontWeight: 800,
                        color: "#475569",
                      }}
                    />

                    <Line
                      name="Venta neta"
                      type="monotone"
                      dataKey="ventas"
                      stroke="#87be00"
                      strokeWidth={3}
                      dot={{
                        r: 4,
                        fill: "#87be00",
                        stroke: "#ffffff",
                        strokeWidth: 2,
                      }}
                      activeDot={{
                        r: 6,
                      }}
                    />

                    <Line
                      name="Venta bruta"
                      type="monotone"
                      dataKey="ventas_brutas"
                      stroke="#2563eb"
                      strokeWidth={3}
                      dot={{
                        r: 4,
                        fill: "#2563eb",
                        stroke: "#ffffff",
                        strokeWidth: 2,
                      }}
                      activeDot={{
                        r: 6,
                      }}
                    />
                  </LineChart>
                ) : (
                  <LineChart
                    data={chartData}
                    margin={{
                      top: 20,
                      right: 25,
                      bottom: 20,
                      left: 5,
                    }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                      stroke="#e2e8f0"
                    />

                    <XAxis
                      dataKey="region"
                      axisLine={false}
                      tickLine={false}
                      fontSize={9}
                      fontWeight={700}
                      tick={{
                        fill: "#64748b",
                      }}
                      minTickGap={18}
                    />

                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      fontSize={9}
                      fontWeight={700}
                      tick={{
                        fill: "#94a3b8",
                      }}
                      tickFormatter={
                        formatCompactCurrency
                      }
                      width={72}
                    />

                    <Tooltip
                      content={
                        <CustomTooltip />
                      }
                    />

                    <Legend
                      iconType="circle"
                      wrapperStyle={{
                        fontSize: "10px",
                        fontWeight: 800,
                        color: "#475569",
                      }}
                    />

                    {uniqueChains.map(
                      (
                        chain,
                        index,
                      ) => (
                        <Line
                          key={chain}
                          name={chain}
                          type="monotone"
                          dataKey={chain}
                          stroke={
                            CHART_COLORS[
                              index %
                                CHART_COLORS.length
                            ]
                          }
                          strokeWidth={3}
                          dot={{
                            r: 4,
                            fill:
                              CHART_COLORS[
                                index %
                                  CHART_COLORS.length
                              ],
                            stroke: "#ffffff",
                            strokeWidth: 2,
                          }}
                          activeDot={{
                            r: 6,
                          }}
                        />
                      ),
                    )}
                  </LineChart>
                )}
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-slate-300">
                  {hasActiveFilters ? (
                    <FiAlertCircle
                      size={30}
                    />
                  ) : (
                    <FiCalendar
                      size={30}
                    />
                  )}
                </div>

                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                    {hasActiveFilters
                      ? "Sin información disponible"
                      : "Selecciona filtros"}
                  </p>

                  <p className="mt-2 max-w-md text-sm text-slate-500">
                    {hasActiveFilters
                      ? "No existen resultados para la combinación seleccionada."
                      : "Selecciona al menos un criterio para visualizar el desempeño geográfico."}
                  </p>
                </div>
              </div>
            )}
          </div>
        </section>

        <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[9px] font-black uppercase tracking-[0.2em] text-[#87be00]">
                Detalle del reporte
              </p>

              <h2 className="mt-1 text-base font-black tracking-tight text-slate-900">
                Resultados por territorio y canal
              </h2>
            </div>

            <span className="rounded-xl bg-slate-100 px-3 py-2 text-[9px] font-black uppercase tracking-wider text-slate-500">
              {data.length} filas
            </span>
          </div>

          <div className="custom-scrollbar overflow-x-auto">
            <table className="w-full min-w-[900px] border-collapse text-left">
              <thead className="bg-slate-900 text-white">
                <tr>
                  {[
                    "Región",
                    "Comuna",
                    "Cadena",
                    "Código",
                    "Venta neta",
                    "Venta bruta",
                  ].map(
                    (header) => (
                      <th
                        key={header}
                        className="px-5 py-4 text-[9px] font-black uppercase tracking-wider"
                      >
                        {header}
                      </th>
                    ),
                  )}
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="py-14 text-center"
                    >
                      <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-slate-100 border-t-[#87be00]" />
                    </td>
                  </tr>
                ) : data.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="py-16 text-center"
                    >
                      <FiAlertCircle
                        className="mx-auto mb-3 text-slate-300"
                        size={28}
                      />

                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                        Sin información disponible
                      </p>
                    </td>
                  </tr>
                ) : (
                  data.map(
                    (item, index) => (
                      <tr
                        key={
                          item.id ??
                          `${item.codigo_local}-${index}`
                        }
                        className="transition hover:bg-slate-50/80"
                      >
                        <td className="px-5 py-4 text-[11px] font-black text-slate-900">
                          {item.region ||
                            "Sin región"}
                        </td>

                        <td className="px-5 py-4 text-[11px] font-bold text-slate-700">
                          {item.comuna ||
                            "Sin comuna"}
                        </td>

                        <td className="px-5 py-4 text-[11px] font-bold text-slate-700">
                          {item.cadena ||
                            "Sin cadena"}
                        </td>

                        <td className="px-5 py-4 text-[10px] font-bold text-slate-500">
                          {item.codigo_local ||
                            "S/N"}
                        </td>

                        <td className="px-5 py-4 text-[11px] font-black text-[#87be00]">
                          {formatCurrency(
                            item.total_ventas,
                          )}
                        </td>

                        <td className="px-5 py-4 text-[11px] font-black text-blue-600">
                          {formatCurrency(
                            item.total_ventas_brutas,
                          )}
                        </td>
                      </tr>
                    ),
                  )
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
};

export default GeoChainReport;