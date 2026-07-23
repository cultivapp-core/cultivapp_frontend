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
  FiBox,
  FiCalendar,
  FiDollarSign,
  FiFilter,
  FiHash,
  FiPackage,
  FiRefreshCw,
  FiTag,
  FiTrendingUp,
  FiX,
} from "react-icons/fi";

import api from "../../api/apiClient";

const INITIAL_FORM = {
  start_date: "",
  end_date: "",
  region: "",
  comuna: "",
  cadena: "",
  mercaderista: "",
};

const EMPTY_FILTERS = {
  regiones: [],
  comunas: [],
  cadenas: [],
  mercaderistas: [],
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

const ProductReport = () => {
  const [data, setData] =
    useState([]);
  const [loading, setLoading] =
    useState(true);
  const [error, setError] =
    useState(null);

  const [filters, setFilters] =
    useState(EMPTY_FILTERS);

  const [form, setForm] =
    useState(INITIAL_FORM);

  const [
    appliedFilters,
    setAppliedFilters,
  ] = useState(INITIAL_FORM);

  const [isCleared, setIsCleared] =
    useState(false);

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

  const formatCompactNumber = (
    value,
  ) =>
    new Intl.NumberFormat("es-CL", {
      notation: "compact",
      compactDisplay: "short",
      maximumFractionDigits: 1,
    }).format(Number(value || 0));

  useEffect(() => {
    let cancelled = false;

    const loadFilters = async () => {
      try {
        const response =
          await api.get(
            "/sales/report/filters",
          );

        if (cancelled) {
          return;
        }

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
        if (!cancelled) {
          console.error(
            "Error cargando filtros:",
            requestError,
          );
        }
      }
    };

    loadFilters();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    if (isCleared) {
      setData([]);
      setLoading(false);
      setError(null);

      return () => {
        cancelled = true;
      };
    }

    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        const response =
          await api.get(
            "/sales/report/productos",
            {
              params:
                appliedFilters,
            },
          );

        if (cancelled) {
          return;
        }

        const rows =
          extractRows(response);

        /*
         * Se conserva el orden utilizado por el componente original.
         */
        setData(
          [...rows].reverse(),
        );
      } catch (requestError) {
        if (cancelled) {
          return;
        }

        console.error(
          "Error cargando reporte de productos:",
          requestError,
        );

        setData([]);
        setError(
          requestError?.response?.data
            ?.message ??
            requestError?.data?.message ??
            requestError?.message ??
            "No fue posible cargar el reporte de productos.",
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
  }, [
    appliedFilters,
    isCleared,
  ]);

  const summary = useMemo(() => {
    const brands = new Set();

    const totals = data.reduce(
      (accumulator, item) => {
        accumulator.sales += Number(
          item.total_ventas || 0,
        );

        accumulator.units += Number(
          item.total_unidades || 0,
        );

        if (item.marca) {
          brands.add(item.marca);
        }

        return accumulator;
      },
      {
        sales: 0,
        units: 0,
      },
    );

    return {
      sales: totals.sales,
      units: totals.units,
      products: data.length,
      brands: brands.size,
    };
  }, [data]);

  const hasFormFilters =
    Object.values(form).some(Boolean);

  const chartData = useMemo(
    () =>
      data.map((item) => ({
        ...item,
        producto:
          item.producto ||
          "Producto sin nombre",
        total_ventas: Number(
          item.total_ventas || 0,
        ),
      })),
    [data],
  );

  const chartHeight =
    Math.max(
      460,
      Math.min(
        chartData.length * 34,
        1100,
      ),
    );

  const updateForm = (
    field,
    value,
  ) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const handleApply = () => {
    if (
      form.start_date &&
      form.end_date &&
      form.start_date >
        form.end_date
    ) {
      setError(
        "La fecha desde no puede ser posterior a la fecha hasta.",
      );
      return;
    }

    setError(null);
    setIsCleared(false);
    setAppliedFilters({
      ...form,
    });
  };

  const handleClear = () => {
    setForm(INITIAL_FORM);
    setAppliedFilters(
      INITIAL_FORM,
    );
    setIsCleared(true);
    setData([]);
    setError(null);
  };

  const summaryCards = [
    {
      label: "Venta total",
      value: formatCurrency(
        summary.sales,
      ),
      helper:
        "Acumulado del reporte",
      icon: FiDollarSign,
      tone:
        "bg-[#87be00]/10 text-[#87be00]",
    },
    {
      label: "Unidades",
      value: formatNumber(
        summary.units,
      ),
      helper:
        "Unidades comercializadas",
      icon: FiHash,
      tone:
        "bg-blue-50 text-blue-600",
    },
    {
      label: "Productos",
      value: summary.products,
      helper:
        "Resultados visibles",
      icon: FiPackage,
      tone:
        "bg-violet-50 text-violet-600",
    },
    {
      label: "Marcas",
      value: summary.brands,
      helper:
        "Marcas representadas",
      icon: FiTag,
      tone:
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
              <FiBox size={22} />
            </div>

            <div className="min-w-0">
              <h1 className="text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
                Rendimiento de productos
              </h1>

              <p className="mt-1.5 text-[10px] font-black uppercase tracking-[0.24em] text-[#87be00]">
                Ranking comercial de los 50 principales productos
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <span className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-[9px] font-black uppercase tracking-wider text-slate-500 shadow-sm">
              {data.length} productos
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

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8">
            <label className="flex flex-col gap-1.5">
              <span className="pl-1 text-[9px] font-black uppercase tracking-wider text-slate-400">
                Desde
              </span>

              <input
                type="date"
                value={
                  form.start_date
                }
                max={
                  form.end_date ||
                  undefined
                }
                onChange={(event) =>
                  updateForm(
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
                  form.end_date
                }
                min={
                  form.start_date ||
                  undefined
                }
                onChange={(event) =>
                  updateForm(
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
                value={form.region}
                onChange={(event) =>
                  updateForm(
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
                value={form.comuna}
                onChange={(event) =>
                  updateForm(
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
                value={form.cadena}
                onChange={(event) =>
                  updateForm(
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

            <label className="flex flex-col gap-1.5 xl:col-span-1">
              <span className="pl-1 text-[9px] font-black uppercase tracking-wider text-slate-400">
                Mercaderista
              </span>

              <select
                value={
                  form.mercaderista
                }
                onChange={(event) =>
                  updateForm(
                    "mercaderista",
                    event.target.value,
                  )
                }
                className={inputStyle}
              >
                <option value="">
                  Todos
                </option>

                {filters.mercaderistas
                  .filter(
                    (worker) =>
                      worker &&
                      String(worker)
                        .trim() !== "",
                  )
                  .map((worker) => (
                    <option
                      key={worker}
                      value={worker}
                    >
                      {worker}
                    </option>
                  ))}
              </select>
            </label>

            <button
              type="button"
              onClick={handleApply}
              className="mt-auto flex h-12 items-center justify-center gap-2 rounded-xl bg-[#87be00] px-4 text-[9px] font-black uppercase tracking-wider text-white shadow-lg shadow-[#87be00]/20 transition hover:bg-[#76a600]"
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
                !hasFormFilters &&
                isCleared
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

        {/* GRÁFICO */}
        <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="mb-5 flex flex-col gap-3 border-b border-slate-100 pb-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[9px] font-black uppercase tracking-[0.2em] text-[#87be00]">
                Ranking comercial
              </p>

              <h2 className="mt-1 text-base font-black tracking-tight text-slate-900">
                Venta total por producto
              </h2>

              <p className="mt-2 text-sm text-slate-500">
                Los productos se presentan en formato horizontal para facilitar la lectura de nombres extensos.
              </p>
            </div>

            <span className="rounded-xl bg-slate-100 px-3 py-2 text-[9px] font-black uppercase tracking-wider text-slate-500">
              {chartData.length} resultados
            </span>
          </div>

          <div
            className="w-full"
            style={{
              height: chartHeight,
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
                    right: 35,
                    left: 20,
                    bottom: 8,
                  }}
                  barCategoryGap={8}
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
                      formatCompactNumber
                    }
                  />

                  <YAxis
                    type="category"
                    dataKey="producto"
                    axisLine={false}
                    tickLine={false}
                    width={210}
                    fontSize={9}
                    fontWeight={800}
                    tick={{
                      fill: "#475569",
                    }}
                    tickFormatter={(value) => {
                      const text = String(
                        value || "",
                      );

                      return text.length > 30
                        ? `${text.slice(0, 30)}…`
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
                      "Venta total",
                    ]}
                    labelFormatter={(label) =>
                      `Producto: ${label}`
                    }
                  />

                  <Bar
                    dataKey="total_ventas"
                    name="Venta total"
                    fill="#87be00"
                    radius={[
                      0,
                      8,
                      8,
                      0,
                    ]}
                    maxBarSize={22}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-slate-300">
                  {isCleared ? (
                    <FiCalendar
                      size={30}
                    />
                  ) : (
                    <FiAlertCircle
                      size={30}
                    />
                  )}
                </div>

                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                    {isCleared
                      ? "Selecciona filtros"
                      : "Sin información disponible"}
                  </p>

                  <p className="mt-2 max-w-md text-sm text-slate-500">
                    {isCleared
                      ? "Utiliza los filtros y presiona Aplicar para realizar una búsqueda."
                      : "No existen productos para los criterios seleccionados."}
                  </p>
                </div>
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
                Resultados por producto
              </h2>
            </div>

            <span className="rounded-xl bg-slate-100 px-3 py-2 text-[9px] font-black uppercase tracking-wider text-slate-500">
              {data.length} filas
            </span>
          </div>

          <div className="custom-scrollbar overflow-x-auto">
            <table className="w-full min-w-[760px] border-collapse text-left">
              <thead className="bg-slate-900 text-white">
                <tr>
                  {[
                    "Producto",
                    "Marca",
                    "Ventas",
                    "Unidades",
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
                      colSpan={4}
                      className="py-14 text-center"
                    >
                      <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-slate-100 border-t-[#87be00]" />
                    </td>
                  </tr>
                ) : data.length === 0 ? (
                  <tr>
                    <td
                      colSpan={4}
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
                          `${item.producto}-${index}`
                        }
                        className="transition hover:bg-slate-50/80"
                      >
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-white">
                              <FiPackage
                                size={16}
                              />
                            </div>

                            <p className="max-w-[360px] truncate text-[11px] font-black text-slate-900">
                              {item.producto ||
                                "Producto sin nombre"}
                            </p>
                          </div>
                        </td>

                        <td className="px-5 py-4 text-[11px] font-bold text-slate-500">
                          {item.marca ||
                            "Sin marca"}
                        </td>

                        <td className="px-5 py-4 text-[11px] font-black text-[#87be00]">
                          {formatCurrency(
                            item.total_ventas,
                          )}
                        </td>

                        <td className="px-5 py-4 text-[11px] font-bold text-slate-700">
                          {formatNumber(
                            item.total_unidades,
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

export default ProductReport;