import React, {
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  FiAlertCircle,
  FiCalendar,
  FiDollarSign,
  FiHash,
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
  comuna: "",
  cadena: "",
  mercaderista: "",
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

const MercaderistaReport = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] =
    useState(true);
  const [error, setError] =
    useState(null);

  const [filters, setFilters] =
    useState(EMPTY_FILTERS);

  const [selected, setSelected] =
    useState(EMPTY_SELECTED);

  const [chartLimit, setChartLimit] =
    useState(12);

  const formatNumber = (value) =>
    Number(value || 0).toLocaleString(
      "es-CL",
    );

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

  useEffect(() => {
    const loadFilters = async () => {
      try {
        const response =
          await api.get(
            "/sales/report/filters",
          );

        const payload =
          response?.data ??
          response;

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
          mercaderistas:
            Array.isArray(
              payload?.mercaderistas,
            )
              ? payload.mercaderistas
              : [],
        });
      } catch (requestError) {
        console.error(
          "Error cargando filtros:",
          requestError,
        );
      }
    };

    loadFilters();
  }, []);

  useEffect(() => {
    let cancelled = false;

    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        const response =
          await api.get(
            "/sales/report/mercaderistas",
            {
              params: selected,
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
          "Error al obtener datos:",
          requestError,
        );

        setData([]);
        setError(
          requestError?.response?.data
            ?.message ??
            requestError?.data?.message ??
            requestError?.message ??
            "No se pudieron cargar los datos.",
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
  }, [selected]);

  const summary = useMemo(
    () =>
      data.reduce(
        (accumulator, item) => ({
          netSales:
            accumulator.netSales +
            Number(
              item.total_ventas || 0,
            ),
          grossSales:
            accumulator.grossSales +
            Number(
              item.total_venta_bruta ||
                0,
            ),
          units:
            accumulator.units +
            Number(
              item.total_unidades || 0,
            ),
          stores:
            accumulator.stores +
            Number(
              item.locales_visitados ||
                0,
            ),
        }),
        {
          netSales: 0,
          grossSales: 0,
          units: 0,
          stores: 0,
        },
      ),
    [data],
  );

  const chartData = useMemo(() => {
    return data
      .filter((item) => {
        const name = String(
          item.mercaderista || "",
        )
          .trim()
          .toLowerCase();

        return (
          name &&
          name !== "sin información" &&
          name !== "sin informacion" &&
          name !== "sin nombre"
        );
      })
      .map((item) => ({
        ...item,
        total_ventas: Number(
          item.total_ventas || 0,
        ),
      }))
      .sort(
        (first, second) =>
          second.total_ventas -
          first.total_ventas,
      )
      .slice(0, chartLimit);
  }, [data, chartLimit]);

  const unnamedRowsCount =
    useMemo(
      () =>
        data.filter((item) => {
          const name = String(
            item.mercaderista || "",
          )
            .trim()
            .toLowerCase();

          return (
            !name ||
            name === "sin información" ||
            name === "sin informacion" ||
            name === "sin nombre"
          );
        }).length,
      [data],
    );

  const hasActiveFilters =
    Object.values(selected).some(
      Boolean,
    );

  const updateSelected = (
    field,
    value,
  ) => {
    setSelected((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const clearFilters = () => {
    setSelected(
      EMPTY_SELECTED,
    );
  };

  const summaryCards = [
    {
      label: "Venta neta",
      value: formatCurrency(
        summary.netSales,
      ),
      icon: FiDollarSign,
      accent:
        "bg-[#87be00]/10 text-[#87be00]",
    },
    {
      label: "Venta bruta",
      value: formatCurrency(
        summary.grossSales,
      ),
      icon: FiTrendingUp,
      accent:
        "bg-blue-50 text-blue-600",
    },
    {
      label: "Unidades",
      value: formatNumber(
        summary.units,
      ),
      icon: FiHash,
      accent:
        "bg-violet-50 text-violet-600",
    },
    {
      label: "Locales visitados",
      value: formatNumber(
        summary.stores,
      ),
      icon: FiMapPin,
      accent:
        "bg-amber-50 text-amber-600",
    },
  ];

  return (
    <div className="min-h-full bg-slate-50/70 px-4 pb-10 pt-20 font-[Outfit] sm:px-6 sm:pt-8 lg:px-8">
      <div className="mx-auto flex max-w-[1600px] flex-col gap-6">
        {/* ENCABEZADO */}
        <header className="flex flex-col gap-5 border-b border-slate-200/80 pb-6 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex min-w-0 items-center gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#87be00]/10 text-[#87be00]">
              <FiUsers size={22} />
            </div>

            <div className="min-w-0">
              <h1 className="text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
                Rendimiento de mercaderistas
              </h1>

              <p className="mt-1.5 text-[10px] font-black uppercase tracking-[0.24em] text-[#87be00]">
                Ventas, cobertura y productividad
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-[9px] font-black uppercase tracking-wider text-slate-500 shadow-sm">
              {data.length} mercaderistas
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
              <FiCalendar size={18} />
            </div>

            <div>
              <h2 className="text-base font-black tracking-tight text-slate-900">
                Filtros del reporte
              </h2>

              <p className="mt-0.5 text-[9px] font-black uppercase tracking-[0.18em] text-slate-400">
                Ajusta el período y segmentación
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

                {filters.comunas.map(
                  (comuna) => (
                    <option
                      key={comuna}
                      value={comuna}
                    >
                      {comuna}
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
                onChange={(event) =>
                  updateSelected(
                    "mercaderista",
                    event.target.value,
                  )
                }
                className={inputStyle}
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
              onClick={clearFilters}
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
              icon: Icon,
              accent,
            }) => (
              <article
                key={label}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                      {label}
                    </p>

                    <p className="mt-3 text-xl font-black tracking-tight text-slate-900 sm:text-2xl">
                      {value}
                    </p>
                  </div>

                  <div
                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${accent}`}
                  >
                    <Icon size={18} />
                  </div>
                </div>
              </article>
            ),
          )}
        </section>

        {/* GRÁFICO */}
        <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="mb-5 flex flex-col gap-4 border-b border-slate-100 pb-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-[9px] font-black uppercase tracking-[0.2em] text-[#87be00]">
                Comparativo comercial
              </p>

              <h2 className="mt-1 text-base font-black tracking-tight text-slate-900">
                Ranking de venta neta por mercaderista
              </h2>

              <p className="mt-2 max-w-2xl text-sm text-slate-500">
                El gráfico muestra los mejores resultados ordenados de mayor a menor para evitar que los nombres se superpongan.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                <span className="text-[9px] font-black uppercase tracking-wider text-slate-400">
                  Mostrar
                </span>

                <select
                  value={chartLimit}
                  onChange={(event) =>
                    setChartLimit(
                      Number(
                        event.target.value,
                      ),
                    )
                  }
                  className="bg-transparent text-[10px] font-black text-slate-700 outline-none"
                >
                  <option value={10}>
                    Top 10
                  </option>
                  <option value={12}>
                    Top 12
                  </option>
                  <option value={15}>
                    Top 15
                  </option>
                  <option value={20}>
                    Top 20
                  </option>
                </select>
              </label>

              <span className="rounded-xl bg-slate-100 px-3 py-2 text-[9px] font-black uppercase tracking-wider text-slate-500">
                {chartData.length} visibles
              </span>
            </div>
          </div>

          {unnamedRowsCount > 0 && (
            <div className="mb-5 flex items-start gap-3 rounded-xl border border-amber-100 bg-amber-50 p-3">
              <FiAlertCircle
                size={16}
                className="mt-0.5 shrink-0 text-amber-500"
              />

              <p className="text-[10px] font-bold text-amber-700">
                Se excluyeron del gráfico{" "}
                {unnamedRowsCount} registro
                {unnamedRowsCount !== 1
                  ? "s"
                  : ""}{" "}
                sin nombre de mercaderista. Esos registros continúan disponibles en la tabla.
              </p>
            </div>
          )}

          <div
            className="w-full"
            style={{
              height: Math.max(
                360,
                chartData.length * 44,
              ),
            }}
          >
            {loading ? (
              <div className="flex h-full items-center justify-center">
                <div className="h-12 w-12 animate-spin rounded-full border-4 border-slate-100 border-t-[#87be00]" />
              </div>
            ) : chartData.length > 0 ? (
              <ResponsiveContainer
                width="100%"
                height="100%"
              >
                <BarChart
                  data={chartData}
                  layout="vertical"
                  margin={{
                    top: 8,
                    right: 30,
                    left: 10,
                    bottom: 8,
                  }}
                  barCategoryGap={10}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    horizontal={false}
                    stroke="#e2e8f0"
                  />

                  <XAxis
                    type="number"
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
                  />

                  <YAxis
                    type="category"
                    dataKey="mercaderista"
                    axisLine={false}
                    tickLine={false}
                    width={170}
                    fontSize={9}
                    fontWeight={800}
                    tick={{
                      fill: "#475569",
                    }}
                    tickFormatter={(value) => {
                      const text = String(
                        value || "",
                      );

                      return text.length > 24
                        ? `${text.slice(0, 24)}…`
                        : text;
                    }}
                  />

                  <Tooltip
                    cursor={{
                      fill:
                        "rgba(135, 190, 0, 0.06)",
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
                    formatter={(value) => [
                      formatCurrency(value),
                      "Venta neta",
                    ]}
                    labelFormatter={(label) =>
                      `Mercaderista: ${label}`
                    }
                  />

                  <Bar
                    dataKey="total_ventas"
                    name="Venta neta"
                    fill="#87be00"
                    radius={[
                      0,
                      8,
                      8,
                      0,
                    ]}
                    maxBarSize={26}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-300">
                  <FiAlertCircle
                    size={26}
                  />
                </div>

                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                  Sin información disponible
                </p>

                <p className="max-w-sm text-sm text-slate-500">
                  No existen mercaderistas identificados para construir el ranking.
                </p>
              </div>
            )}
          </div>
        </section>

        {/* TABLA */}
        <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[9px] font-black uppercase tracking-[0.2em] text-[#87be00]">
                Detalle del reporte
              </p>

              <h2 className="mt-1 text-base font-black tracking-tight text-slate-900">
                Resultados por mercaderista
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
                    "Mercaderista",
                    "Venta neta",
                    "Venta bruta",
                    "Unidades",
                    "Locales",
                    "Códigos",
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
                          `${item.mercaderista}-${index}`
                        }
                        className="transition hover:bg-slate-50/80"
                      >
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-[10px] font-black text-white">
                              {String(
                                item.mercaderista ||
                                  "M",
                              )
                                .charAt(0)
                                .toUpperCase()}
                            </div>

                            <p className="text-[11px] font-black text-slate-900">
                              {item.mercaderista ||
                                "Sin nombre"}
                            </p>
                          </div>
                        </td>

                        <td className="px-5 py-4 text-[11px] font-black text-[#87be00]">
                          {formatCurrency(
                            item.total_ventas,
                          )}
                        </td>

                        <td className="px-5 py-4 text-[11px] font-black text-blue-600">
                          {formatCurrency(
                            item.total_venta_bruta,
                          )}
                        </td>

                        <td className="px-5 py-4 text-[11px] font-bold text-slate-700">
                          {formatNumber(
                            item.total_unidades,
                          )}
                        </td>

                        <td className="px-5 py-4 text-[11px] font-bold text-slate-700">
                          {formatNumber(
                            item.locales_visitados,
                          )}
                        </td>

                        <td className="max-w-[260px] px-5 py-4 text-[10px] font-bold text-slate-500">
                          <p className="truncate">
                            {item.codigos_locales ||
                              "Sin códigos"}
                          </p>
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

export default MercaderistaReport;