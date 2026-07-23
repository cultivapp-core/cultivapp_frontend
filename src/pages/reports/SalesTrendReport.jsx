import React, {
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  FiAlertCircle,
  FiCalendar,
  FiFilter,
  FiRefreshCw,
  FiTrendingUp,
  FiX,
} from "react-icons/fi";

import api from "../../api/apiClient";

const EMPTY_FILTERS = {
  regiones: [],
  comunas: [],
  cadenas: [],
};

const EMPTY_SELECTION = {
  start_date: "",
  end_date: "",
  region: "",
  comuna: "",
  cadena: "",
};

const inputStyle =
  "h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-[10px] font-black uppercase text-slate-700 outline-none transition focus:border-[#87be00]/60 focus:bg-white focus:ring-4 focus:ring-[#87be00]/10";

const extractRows = (response) => {
  if (Array.isArray(response)) {
    return response;
  }

  if (Array.isArray(response?.data)) {
    return response.data;
  }

  if (Array.isArray(response?.rows)) {
    return response.rows;
  }

  return [];
};

const formatDateKey = (value) => {
  if (!value) {
    return "Sin fecha";
  }

  const match = String(value).match(
    /^(\d{4})-(\d{2})-(\d{2})/,
  );

  if (match) {
    return `${match[3]}/${match[2]}/${match[1]}`;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toLocaleDateString(
    "es-CL",
  );
};

const formatShortDate = (value) => {
  if (!value) {
    return "";
  }

  const match = String(value).match(
    /^(\d{4})-(\d{2})-(\d{2})/,
  );

  if (match) {
    return `${match[3]}/${match[2]}`;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return `${String(
    date.getDate(),
  ).padStart(2, "0")}/${String(
    date.getMonth() + 1,
  ).padStart(2, "0")}`;
};

const SalesTrendReport = () => {
  const [data, setData] =
    useState([]);
  const [loading, setLoading] =
    useState(false);
  const [error, setError] =
    useState(null);

  const [
    filterOptions,
    setFilterOptions,
  ] = useState(EMPTY_FILTERS);

  const [selected, setSelected] =
    useState(EMPTY_SELECTION);

  const [
    appliedFilters,
    setAppliedFilters,
  ] = useState(EMPTY_SELECTION);

  useEffect(() => {
    const fetchFilters = async () => {
      try {
        const response =
          await api.get(
            "/sales/report/filters",
          );

        const payload =
          response?.data ??
          response;

        setFilterOptions({
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
        });
      } catch (requestError) {
        console.error(
          "Error cargando filtros:",
          requestError,
        );
      }
    };

    fetchFilters();
  }, []);

  useEffect(() => {
    let cancelled = false;

    const fetchTrend = async () => {
      const hasFilters =
        Object.values(
          appliedFilters,
        ).some(Boolean);

      if (!hasFilters) {
        setData([]);
        setLoading(false);
        setError(null);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const response =
          await api.get(
            "/sales/report/trend",
            {
              params:
                appliedFilters,
            },
          );

        if (cancelled) {
          return;
        }

        setData(
          extractRows(response),
        );
      } catch (requestError) {
        if (cancelled) {
          return;
        }

        console.error(
          "Error cargando tendencia:",
          requestError,
        );

        setData([]);
        setError(
          requestError?.response?.data
            ?.message ??
            requestError?.data?.message ??
            requestError?.message ??
            "No fue posible cargar la tendencia de ventas.",
        );
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchTrend();

    return () => {
      cancelled = true;
    };
  }, [appliedFilters]);

  const chartData = useMemo(
    () =>
      data
        .map((item) => ({
          ...item,
          total_venta: Number(
            item.total_venta || 0,
          ),
        }))
        .sort(
          (first, second) =>
            new Date(
              first.fecha_venta,
            ) -
            new Date(
              second.fecha_venta,
            ),
        ),
    [data],
  );

  const summary = useMemo(() => {
    if (chartData.length === 0) {
      return {
        total: 0,
        average: 0,
        peak: 0,
        peakDate: null,
        variation: null,
      };
    }

    const total =
      chartData.reduce(
        (
          accumulator,
          item,
        ) =>
          accumulator +
          Number(
            item.total_venta ||
              0,
          ),
        0,
      );

    const peakItem =
      chartData.reduce(
        (currentPeak, item) =>
          Number(
            item.total_venta ||
              0,
          ) >
          Number(
            currentPeak.total_venta ||
              0,
          )
            ? item
            : currentPeak,
        chartData[0],
      );

    const firstValue =
      Number(
        chartData[0]
          ?.total_venta || 0,
      );

    const lastValue =
      Number(
        chartData[
          chartData.length - 1
        ]?.total_venta || 0,
      );

    const variation =
      firstValue > 0
        ? ((lastValue -
            firstValue) /
            firstValue) *
          100
        : null;

    return {
      total,
      average:
        total /
        chartData.length,
      peak:
        Number(
          peakItem.total_venta ||
            0,
        ),
      peakDate:
        peakItem.fecha_venta,
      variation,
    };
  }, [chartData]);

  const formatCurrency = (
    value,
  ) =>
    new Intl.NumberFormat(
      "es-CL",
      {
        style: "currency",
        currency: "CLP",
        maximumFractionDigits: 0,
      },
    ).format(
      Number(value || 0),
    );

  const formatCompactCurrency = (
    value,
  ) =>
    new Intl.NumberFormat(
      "es-CL",
      {
        notation: "compact",
        compactDisplay:
          "short",
        maximumFractionDigits: 1,
      },
    ).format(
      Number(value || 0),
    );

  const hasSelectedFilters =
    Object.values(selected).some(
      Boolean,
    );

  const hasAppliedFilters =
    Object.values(
      appliedFilters,
    ).some(Boolean);

  const updateSelected = (
    field,
    value,
  ) => {
    setSelected((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const handleApply = () => {
    if (
      selected.start_date &&
      selected.end_date &&
      selected.start_date >
        selected.end_date
    ) {
      setError(
        "La fecha desde no puede ser posterior a la fecha hasta.",
      );
      return;
    }

    setError(null);
    setAppliedFilters({
      ...selected,
    });
  };

  const handleClear = () => {
    setSelected(
      EMPTY_SELECTION,
    );
    setAppliedFilters(
      EMPTY_SELECTION,
    );
    setData([]);
    setError(null);
  };

  const summaryCards = [
    {
      label: "Venta acumulada",
      value: formatCurrency(
        summary.total,
      ),
      helper:
        chartData.length > 0
          ? `${chartData.length} períodos`
          : "Sin períodos",
      tone:
        "bg-[#87be00]/10 text-[#87be00]",
    },
    {
      label: "Promedio por período",
      value: formatCurrency(
        summary.average,
      ),
      helper:
        "Promedio de sell-out",
      tone:
        "bg-blue-50 text-blue-600",
    },
    {
      label: "Mejor resultado",
      value: formatCurrency(
        summary.peak,
      ),
      helper:
        summary.peakDate
          ? formatDateKey(
              summary.peakDate,
            )
          : "Sin fecha",
      tone:
        "bg-violet-50 text-violet-600",
    },
    {
      label: "Variación",
      value:
        summary.variation ===
        null
          ? "--"
          : `${summary.variation >= 0 ? "+" : ""}${summary.variation.toFixed(1)}%`,
      helper:
        "Primer vs. último período",
      tone:
        summary.variation ===
          null
          ? "bg-slate-100 text-slate-500"
          : summary.variation >=
              0
            ? "bg-emerald-50 text-emerald-600"
            : "bg-red-50 text-red-500",
    },
  ];

  return (
    <div className="min-h-full bg-slate-50/70 px-4 pb-10 pt-20 font-[Outfit] sm:px-6 sm:pt-8 lg:px-8">
      <div className="mx-auto flex max-w-[1600px] flex-col gap-6">
        {/* ENCABEZADO */}
        <header className="flex flex-col gap-5 border-b border-slate-200/80 pb-6 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex min-w-0 items-center gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#87be00]/10 text-[#87be00]">
              <FiTrendingUp
                size={22}
              />
            </div>

            <div className="min-w-0">
              <h1 className="text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
                Tendencia de ventas
              </h1>

              <p className="mt-1.5 text-[10px] font-black uppercase tracking-[0.24em] text-[#87be00]">
                Evolución de sell-out por período
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <span className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-[9px] font-black uppercase tracking-wider text-slate-500 shadow-sm">
              {chartData.length} períodos
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

        {/* FILTROS */}
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
                Selecciona los criterios y aplica la consulta
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
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
                  updateSelected(
                    "region",
                    event.target.value,
                  )
                }
                className={inputStyle}
              >
                <option value="">
                  Todas
                </option>

                {filterOptions.regiones.map(
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
                Comuna
              </span>

              <select
                value={
                  selected.comuna
                }
                onChange={(event) =>
                  updateSelected(
                    "comuna",
                    event.target.value,
                  )
                }
                className={inputStyle}
              >
                <option value="">
                  Todas
                </option>

                {filterOptions.comunas.map(
                  (commune) => (
                    <option
                      key={commune}
                      value={commune}
                    >
                      {commune}
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
                  updateSelected(
                    "cadena",
                    event.target.value,
                  )
                }
                className={inputStyle}
              >
                <option value="">
                  Todas
                </option>

                {filterOptions.cadenas.map(
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

            <button
              type="button"
              onClick={handleApply}
              disabled={
                !hasSelectedFilters
              }
              className="mt-auto flex h-12 items-center justify-center gap-2 rounded-xl bg-[#87be00] px-4 text-[9px] font-black uppercase tracking-wider text-white shadow-lg shadow-[#87be00]/20 transition hover:bg-[#76a600] disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none"
            >
              <FiTrendingUp
                size={14}
              />
              Aplicar
            </button>

            <button
              type="button"
              onClick={handleClear}
              disabled={
                !hasSelectedFilters &&
                !hasAppliedFilters
              }
              className="mt-auto flex h-12 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-[9px] font-black uppercase tracking-wider text-slate-500 transition hover:border-red-200 hover:bg-red-50 hover:text-red-500 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-300"
            >
              <FiX size={14} />
              Limpiar
            </button>
          </div>
        </section>

        {/* ERROR */}
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

        {/* RESUMEN */}
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {summaryCards.map(
            ({
              label,
              value,
              helper,
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
                    <FiTrendingUp
                      size={18}
                    />
                  </div>
                </div>
              </article>
            ),
          )}
        </section>

        {/* GRÁFICO */}
        <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="mb-5 flex flex-col gap-3 border-b border-slate-100 pb-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[9px] font-black uppercase tracking-[0.2em] text-[#87be00]">
                Evolución temporal
              </p>

              <h2 className="mt-1 text-base font-black tracking-tight text-slate-900">
                Venta total por fecha
              </h2>

              <p className="mt-2 text-sm text-slate-500">
                Visualiza el comportamiento del sell-out dentro del período seleccionado.
              </p>
            </div>

            {hasAppliedFilters && (
              <div className="flex flex-wrap items-center gap-2">
                {appliedFilters.start_date && (
                  <span className="rounded-lg bg-slate-100 px-3 py-2 text-[8px] font-black uppercase tracking-wider text-slate-500">
                    Desde{" "}
                    {formatDateKey(
                      appliedFilters.start_date,
                    )}
                  </span>
                )}

                {appliedFilters.end_date && (
                  <span className="rounded-lg bg-slate-100 px-3 py-2 text-[8px] font-black uppercase tracking-wider text-slate-500">
                    Hasta{" "}
                    {formatDateKey(
                      appliedFilters.end_date,
                    )}
                  </span>
                )}
              </div>
            )}
          </div>

          <div className="h-[420px] w-full">
            {loading ? (
              <div className="flex h-full items-center justify-center">
                <div className="h-12 w-12 animate-spin rounded-full border-4 border-slate-100 border-t-[#87be00]" />
              </div>
            ) : chartData.length > 0 ? (
              <ResponsiveContainer
                width="100%"
                height="100%"
              >
                <AreaChart
                  data={chartData}
                  margin={{
                    top: 15,
                    right: 20,
                    left: 10,
                    bottom: 10,
                  }}
                >
                  <defs>
                    <linearGradient
                      id="salesTrendGradient"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop
                        offset="5%"
                        stopColor="#87be00"
                        stopOpacity={0.32}
                      />
                      <stop
                        offset="95%"
                        stopColor="#87be00"
                        stopOpacity={0.02}
                      />
                    </linearGradient>
                  </defs>

                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="#e2e8f0"
                  />

                  <XAxis
                    dataKey="fecha_venta"
                    axisLine={false}
                    tickLine={false}
                    fontSize={9}
                    fontWeight={700}
                    tick={{
                      fill: "#64748b",
                    }}
                    tickFormatter={
                      formatShortDate
                    }
                    minTickGap={22}
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
                    width={70}
                  />

                  <Tooltip
                    cursor={{
                      stroke:
                        "#87be00",
                      strokeWidth: 1,
                      strokeDasharray:
                        "4 4",
                    }}
                    contentStyle={{
                      borderRadius:
                        "16px",
                      border:
                        "1px solid #e2e8f0",
                      boxShadow:
                        "0 12px 30px rgba(15, 23, 42, 0.08)",
                      fontFamily:
                        "Outfit",
                      fontSize: "11px",
                    }}
                    labelFormatter={(label) =>
                      formatDateKey(
                        label,
                      )
                    }
                    formatter={(value) => [
                      formatCurrency(value),
                      "Venta total",
                    ]}
                  />

                  <Area
                    type="monotone"
                    dataKey="total_venta"
                    name="Venta total"
                    stroke="#87be00"
                    strokeWidth={3}
                    fillOpacity={1}
                    fill="url(#salesTrendGradient)"
                    activeDot={{
                      r: 5,
                      fill: "#87be00",
                      stroke: "#ffffff",
                      strokeWidth: 3,
                    }}
                    dot={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-slate-300">
                  {hasAppliedFilters ? (
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
                    {hasAppliedFilters
                      ? "Sin información disponible"
                      : "Selecciona filtros"}
                  </p>

                  <p className="mt-2 max-w-md text-sm text-slate-500">
                    {hasAppliedFilters
                      ? "No existen ventas para la combinación seleccionada."
                      : "Selecciona al menos un criterio y presiona Aplicar para visualizar la tendencia."}
                  </p>
                </div>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
};

export default SalesTrendReport;