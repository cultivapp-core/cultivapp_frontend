import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import {
  FiBriefcase,
  FiDownload,
  FiDollarSign,
  FiLoader,
  FiRefreshCw,
  FiShoppingBag,
  FiTrendingUp,
} from "react-icons/fi";
import * as XLSX from "xlsx";
import api from "../../api/apiClient";
import { useAuth } from "../../context/AuthContext";
import {
  Button,
} from "../../components/ui";

const COLORS = [
  "#87be00",
  "#2563eb",
  "#9333ea",
  "#ea580c",
  "#eab308",
];

const formatNumberCL = (value) =>
  new Intl.NumberFormat("es-CL").format(
    Number(value) || 0,
  );

const formatCurrencyCLP = (value) =>
  new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);

const getResponseData = (
  response,
  fallback = null,
) => {
  if (response == null) return fallback;
  return response?.data ?? response;
};

const hasData = (data) =>
  Array.isArray(data) && data.length > 0;

const SimpleBarChart = ({
  title,
  data,
  dataKey,
}) => {
  const chartData = Array.isArray(data)
    ? data
    : [];

  return (
    <section className="bg-white p-5 md:p-6 rounded-[2rem] shadow-sm border border-gray-100 flex flex-col min-h-[320px] md:min-h-[360px]">
      <div className="mb-4">
        <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-widest">
          {title}
        </h3>

        <p className="text-[10px] text-gray-400 mt-1">
          Distribución de venta neta.
        </p>
      </div>

      {!hasData(chartData) ? (
        <EmptyChartState />
      ) : (
        <div className="flex-1 min-h-[250px]">
          <ResponsiveContainer
            width="100%"
            height="100%"
          >
            <BarChart
              data={chartData}
              margin={{
                top: 10,
                right: 10,
                left: -12,
                bottom: 12,
              }}
            >
              <XAxis
                dataKey="label"
                fontSize={9}
                tickLine={false}
                axisLine={false}
                interval={0}
                angle={-18}
                textAnchor="end"
                height={55}
              />

              <YAxis
                fontSize={9}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) =>
                  `$${formatNumberCL(value)}`
                }
              />

              <Tooltip
                cursor={{
                  fill: "#f3f4f6",
                }}
                formatter={(value) => [
                  formatCurrencyCLP(value),
                  "Ventas",
                ]}
                contentStyle={{
                  borderRadius: "1rem",
                  border: "1px solid #f3f4f6",
                  boxShadow:
                    "0 10px 25px -8px rgb(0 0 0 / 0.18)",
                  fontSize: "11px",
                }}
              />

              <Bar
                dataKey={dataKey}
                radius={[6, 6, 0, 0]}
                maxBarSize={42}
              >
                {chartData.map(
                  (entry, index) => (
                    <Cell
                      key={`cell-${
                        entry.label || index
                      }`}
                      fill={
                        COLORS[
                          index %
                            COLORS.length
                        ]
                      }
                    />
                  ),
                )}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </section>
  );
};

const SalesDashboard = () => {
  const { user } = useAuth();

  const isRoot =
    user?.role === "ROOT";

  const [data, setData] =
    useState(null);
  const [companies, setCompanies] =
    useState([]);
  const [
    availableBrands,
    setAvailableBrands,
  ] = useState(["Todas"]);
  const [loading, setLoading] =
    useState(true);
  const [error, setError] =
    useState("");

  const [filters, setFilters] =
    useState({
      empresa_id:
        user?.company_id || "",
      fecha_carga: new Date()
        .toISOString()
        .split("T")[0],
      marca: "Todas",
    });

  useEffect(() => {
    if (
      !isRoot &&
      user?.company_id &&
      filters.empresa_id !==
        user.company_id
    ) {
      setFilters((current) => ({
        ...current,
        empresa_id: user.company_id,
      }));
    }
  }, [
    isRoot,
    user?.company_id,
    filters.empresa_id,
  ]);

  const fetchCompanies =
    useCallback(async () => {
      if (!isRoot) return;

      try {
        const response =
          await api.get("/companies");

        const companyData =
          getResponseData(response, []);

        setCompanies(
          Array.isArray(companyData)
            ? companyData
            : [],
        );
      } catch (requestError) {
        console.error(
          "Error cargando empresas:",
          requestError,
        );
      }
    }, [isRoot]);

  useEffect(() => {
    fetchCompanies();
  }, [fetchCompanies]);

  useEffect(() => {
    const fetchBrands = async () => {
      if (!filters.empresa_id) {
        setAvailableBrands(["Todas"]);

        setFilters((current) => ({
          ...current,
          marca: "Todas",
        }));

        return;
      }

      try {
        const response = await api.get(
          "/reports/brands",
          {
            params: {
              company_id:
                filters.empresa_id,
              _: Date.now(),
            },
          },
        );

        const brands =
          getResponseData(response, []);

        const normalizedBrands =
          Array.isArray(brands)
            ? brands.filter(Boolean)
            : [];

        setAvailableBrands([
          "Todas",
          ...normalizedBrands,
        ]);

        if (
          filters.marca !== "Todas" &&
          !normalizedBrands.includes(
            filters.marca,
          )
        ) {
          setFilters((current) => ({
            ...current,
            marca: "Todas",
          }));
        }
      } catch (requestError) {
        console.error(
          "Error cargando marcas:",
          requestError,
        );

        setAvailableBrands(["Todas"]);
      }
    };

    fetchBrands();
  }, [
    filters.empresa_id,
    filters.marca,
  ]);

  const fetchData =
    useCallback(async () => {
      if (!filters.empresa_id) {
        setData(null);
        setLoading(false);
        setError("");
        return;
      }

      try {
        setLoading(true);
        setError("");

        const response = await api.get(
          "/reports/sales-summary",
          {
            params: {
              company_id:
                filters.empresa_id,
              fecha_carga:
                filters.fecha_carga,
              marca:
                filters.marca ===
                "Todas"
                  ? undefined
                  : filters.marca,
            },
          },
        );

        setData(
          getResponseData(response, null),
        );
      } catch (requestError) {
        console.error(
          "Error cargando resumen de ventas:",
          requestError,
        );

        setError(
          requestError?.response?.data
            ?.message ||
            requestError?.message ||
            "No se pudo cargar la información de ventas.",
        );

        setData(null);
      } finally {
        setLoading(false);
      }
    }, [
      filters.empresa_id,
      filters.fecha_carga,
      filters.marca,
    ]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const totalVenta = useMemo(
    () =>
      Array.isArray(data?.byLocal)
        ? data.byLocal.reduce(
            (total, item) =>
              total +
              (Number(item.total) || 0),
            0,
          )
        : 0,
    [data],
  );

  const totalLocales =
    data?.byLocal?.length || 0;

  const topProduct =
    data?.byProduct?.[0]?.label ||
    null;

  const hasAnyInformation =
    hasData(data?.byLocal) ||
    hasData(data?.byProduct) ||
    hasData(data?.byChain) ||
    hasData(data?.byOperator);

  const handleExportExcel = () => {
    if (!hasAnyInformation) {
      return;
    }

    const workbook =
      XLSX.utils.book_new();

    const sheets = [
      {
        name: "Por Local",
        rows: data?.byLocal,
      },
      {
        name: "Por Producto",
        rows: data?.byProduct,
      },
      {
        name: "Por Cadena",
        rows: data?.byChain,
      },
      {
        name: "Por Operario",
        rows: data?.byOperator,
      },
    ];

    sheets.forEach((sheet) => {
      if (hasData(sheet.rows)) {
        XLSX.utils.book_append_sheet(
          workbook,
          XLSX.utils.json_to_sheet(
            sheet.rows,
          ),
          sheet.name,
        );
      }
    });

    XLSX.writeFile(
      workbook,
      `Reporte_Ventas_${filters.fecha_carga}.xlsx`,
    );
  };

  const updateFilter = (
    field,
    value,
  ) => {
    setFilters((current) => ({
      ...current,
      [field]: value,
    }));
  };

  return (
    <div className="w-full min-h-full bg-gray-50/40 font-[Outfit] pb-20">
      <header className="bg-white border-b border-gray-100">
        <div className="max-w-[1500px] mx-auto px-4 sm:px-6 md:px-8 py-5 md:py-8 flex flex-col md:flex-row md:items-end justify-between gap-5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-[#87be00]/10 rounded-xl text-[#87be00]">
              <FiTrendingUp size={20} />
            </div>

            <div>
              <h1 className="text-3xl md:text-5xl font-black text-gray-900 tracking-tight leading-none">
                Ventas globales
              </h1>

              <p className="text-[10px] font-black text-[#87be00] uppercase tracking-[0.2em] mt-2">
                Resumen analítico de ventas
              </p>
            </div>
          </div>

          <Button
            type="button"
            variant="dark"
            size="lg"
            leftIcon={
              <FiDownload size={16} />
            }
            disabled={
              loading ||
              !hasAnyInformation
            }
            onClick={handleExportExcel}
            className="w-full md:w-auto"
          >
            Exportar Excel
          </Button>
        </div>
      </header>

      <main className="max-w-[1500px] mx-auto px-4 sm:px-6 md:px-8 pt-6 space-y-6">
        <section className="bg-white p-4 sm:p-5 md:p-6 rounded-[2rem] shadow-sm border border-gray-100">
          <div
            className={`grid grid-cols-1 gap-3 ${
              isRoot
                ? "md:grid-cols-[minmax(220px,300px)_190px_1fr]"
                : "md:grid-cols-[190px_1fr]"
            }`}
          >
            {isRoot && (
              <div className="relative">
                <FiBriefcase
                  size={16}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                />

                <select
                  value={
                    filters.empresa_id
                  }
                  onChange={(event) =>
                    updateFilter(
                      "empresa_id",
                      event.target.value,
                    )
                  }
                  className="w-full h-12 pl-11 pr-4 bg-gray-50 border border-gray-100 rounded-2xl text-xs font-black text-gray-600 outline-none focus:bg-white focus:border-[#87be00]/50 transition-all cursor-pointer"
                >
                  <option value="">
                    Seleccionar empresa
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
              </div>
            )}

            <input
              type="date"
              value={
                filters.fecha_carga
              }
              onChange={(event) =>
                updateFilter(
                  "fecha_carga",
                  event.target.value,
                )
              }
              className="w-full h-12 px-4 bg-gray-50 border border-gray-100 rounded-2xl text-xs font-black text-gray-600 outline-none focus:bg-white focus:border-[#87be00]/50 transition-all"
            />

            <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0 custom-scrollbar">
              {availableBrands.map(
                (brand) => (
                  <button
                    key={brand}
                    type="button"
                    onClick={() =>
                      updateFilter(
                        "marca",
                        brand,
                      )
                    }
                    className={`min-h-11 px-4 rounded-full text-[10px] font-black uppercase tracking-wider whitespace-nowrap transition-all border shrink-0 ${
                      filters.marca ===
                      brand
                        ? "bg-[#87be00] text-white border-[#87be00] shadow-sm"
                        : "bg-gray-50 text-gray-500 border-gray-100 hover:border-[#87be00] hover:text-[#87be00]"
                    }`}
                  >
                    {brand}
                  </button>
                ),
              )}
            </div>
          </div>
        </section>

        {!filters.empresa_id ? (
          <InformationMessage
            title="Selecciona una empresa"
            description="Elige una empresa para consultar sus ventas."
          />
        ) : loading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-4">
            <FiLoader
              className="animate-spin text-[#87be00]"
              size={34}
            />

            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">
              Cargando métricas...
            </p>
          </div>
        ) : error ? (
          <InformationMessage
            title="No se pudo cargar la información"
            description={error}
            action={
              <Button
                type="button"
                variant="secondary"
                leftIcon={
                  <FiRefreshCw
                    size={15}
                  />
                }
                onClick={fetchData}
              >
                Intentar nuevamente
              </Button>
            }
          />
        ) : (
          <>
            <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <KpiCard
                label="Venta neta"
                value={
                  totalVenta > 0
                    ? formatCurrencyCLP(
                        totalVenta,
                      )
                    : null
                }
                icon={
                  <FiDollarSign
                    size={22}
                  />
                }
                tone="green"
              />

              <KpiCard
                label="Locales"
                value={
                  totalLocales > 0
                    ? formatNumberCL(
                        totalLocales,
                      )
                    : null
                }
                icon={
                  <FiTrendingUp
                    size={22}
                  />
                }
                tone="blue"
              />

              <KpiCard
                label="Top producto"
                value={topProduct}
                icon={
                  <FiShoppingBag
                    size={22}
                  />
                }
                tone="purple"
                className="sm:col-span-2 lg:col-span-1"
              />
            </section>

            {!hasAnyInformation && (
              <InformationMessage
                title="Sin información disponible"
                description="No existen datos de ventas para la empresa, fecha y marca seleccionadas."
              />
            )}

            <section className="grid grid-cols-1 xl:grid-cols-2 gap-4 md:gap-6">
              <SimpleBarChart
                title="Ventas por local"
                data={data?.byLocal}
                dataKey="total"
              />

              <SimpleBarChart
                title="Ventas por producto"
                data={data?.byProduct}
                dataKey="total"
              />

              <SimpleBarChart
                title="Ventas por cadena"
                data={data?.byChain}
                dataKey="total"
              />

              <SimpleBarChart
                title="Ventas por operario"
                data={data?.byOperator}
                dataKey="total"
              />
            </section>
          </>
        )}
      </main>
    </div>
  );
};

const KpiCard = ({
  label,
  value,
  icon,
  tone,
  className = "",
}) => {
  const tones = {
    green:
      "bg-[#87be00]/10 text-[#87be00]",
    blue:
      "bg-blue-50 text-blue-600",
    purple:
      "bg-purple-50 text-purple-600",
  };

  return (
    <article
      className={`bg-white p-5 md:p-6 rounded-[2rem] shadow-sm border border-gray-100 flex items-center gap-4 ${className}`}
    >
      <div
        className={`w-12 h-12 md:w-14 md:h-14 rounded-2xl flex items-center justify-center shrink-0 ${
          tones[tone] ||
          tones.green
        }`}
      >
        {icon}
      </div>

      <div className="min-w-0">
        <p className="text-[9px] md:text-[10px] font-black text-gray-400 uppercase tracking-widest">
          {label}
        </p>

        {value ? (
          <p
            className="text-lg md:text-xl font-black text-gray-900 truncate mt-1"
            title={String(value)}
          >
            {value}
          </p>
        ) : (
          <p className="text-xs font-bold text-gray-400 mt-1">
            Sin información disponible
          </p>
        )}
      </div>
    </article>
  );
};

const EmptyChartState = () => (
  <div className="flex-1 min-h-[240px] rounded-2xl border border-dashed border-gray-200 bg-gray-50/60 flex items-center justify-center px-5 text-center">
    <p className="text-xs font-bold text-gray-400">
      Sin información disponible
    </p>
  </div>
);

const InformationMessage = ({
  title,
  description,
  action,
}) => (
  <section className="bg-white border border-dashed border-gray-200 rounded-[2rem] px-6 py-14 text-center shadow-sm">
    <div className="w-14 h-14 mx-auto rounded-2xl bg-gray-50 text-gray-300 flex items-center justify-center">
      <FiShoppingBag size={25} />
    </div>

    <h2 className="mt-4 text-lg font-black text-gray-800">
      {title}
    </h2>

    {description && (
      <p className="mt-2 text-sm text-gray-400 max-w-xl mx-auto">
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

export default SalesDashboard;