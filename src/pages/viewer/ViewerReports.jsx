import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  FiAlertTriangle,
  FiBarChart2,
  FiCheck,
  FiFilter,
  FiInfo,
  FiLoader,
  FiRefreshCw,
  FiShoppingBag,
  FiTrendingUp,
} from "react-icons/fi";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { toast } from "react-hot-toast";

import api from "../../api/apiClient";

const EMPTY_FILTERS = {
  region_id: "",
  comuna_id: "",
  cadena: "",
  local_id: "",
  startDate: "",
  endDate: "",
};

const EMPTY_OPTIONS = {
  regiones: [],
  comunas: [],
  cadenas: [],
  locales: [],
};

const getNumericValue = (value) => {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return 0;
  }

  if (typeof value === "number") {
    return Number.isFinite(value)
      ? value
      : 0;
  }

  const raw = String(value)
    .trim()
    .replace(/\$/g, "")
    .replace(/\s/g, "");

  let normalized = raw;

  /*
   * PostgreSQL suele devolver numeric como "3982.79".
   * Los archivos locales también pueden usar "3.982,79".
   */
  if (
    raw.includes(".") &&
    raw.includes(",")
  ) {
    const decimalSeparator =
      raw.lastIndexOf(",") >
      raw.lastIndexOf(".")
        ? ","
        : ".";

    const thousandsSeparator =
      decimalSeparator === ","
        ? "."
        : ",";

    normalized = raw
      .replace(
        new RegExp(
          `\\${thousandsSeparator}`,
          "g",
        ),
        "",
      )
      .replace(
        decimalSeparator,
        ".",
      );
  } else if (
    raw.includes(",")
  ) {
    normalized = raw.replace(
      /,/g,
      ".",
    );
  }

  const parsed =
    Number.parseFloat(normalized);

  return Number.isFinite(parsed)
    ? parsed
    : 0;
};

const formatCurrency = (value) =>
  Math.round(
    getNumericValue(value),
  ).toLocaleString("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  });

const normalizeOptions = (
  response,
) => {
  const raw =
    response?.data?.data ??
    response?.data ??
    response ??
    {};

  return {
    regiones: Array.isArray(
      raw.regiones,
    )
      ? raw.regiones
      : [],
    comunas: Array.isArray(
      raw.comunas,
    )
      ? raw.comunas
      : [],
    cadenas: Array.isArray(
      raw.cadenas,
    )
      ? raw.cadenas
      : [],
    locales: Array.isArray(
      raw.locales,
    )
      ? raw.locales
      : [],
  };
};

const normalizeReportData = (
  response,
) => {
  const raw =
    response?.data?.data ??
    response?.data ??
    response ??
    [];

  return Array.isArray(raw)
    ? raw
    : [];
};

const FIELD_ALIASES = {
  productDescription: [
    "(I) Descripción Producto Interno",
    "(I) Descripcion Producto Interno",
    "Descripción Producto Interno",
    "Descripcion Producto Interno",
    "descripcion_producto",
    "descripcionProducto",
    "descripcion_producto_interno",
    "product_description",
    "producto",
    "producto_nombre",
    "nombre_producto",
    "product_name",
  ],
  units: [
    "Unidades vendidas",
    "unidades_vendidas",
    "unidadesVendidas",
    "units",
    "total_unidades",
  ],
  inventory: [
    "Inventario Unidades",
    "Inventario unidades",
    "inventario_unidades",
    "inventarioUnidades",
    "inventory_units",
    "inventario",
    "stock_unidades",
    "stock",
  ],
  ean: [
    "(E) EAN",
    "EAN",
    "ean",
  ],
  internalCode: [
    "(I) Código Producto Interno",
    "(I) Codigo Producto Interno",
    "codigo_producto_interno",
    "codigoProductoInterno",
    "internal_product_code",
  ],
  externalCode: [
    "(E) Codigo Producto Externo",
    "(E) Código Producto Externo",
    "codigo_producto_externo",
    "codigoProductoExterno",
    "external_product_code",
  ],
  brand: [
    "(E) Marca",
    "Marca",
    "marca",
    "brand",
  ],
  format: [
    "(I) Formato",
    "Formato",
    "formato",
  ],
};

const normalizeFieldName = (value) =>
  String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

const createFieldLookup = (item) =>
  Object.entries(item || {}).reduce(
    (lookup, [key, value]) => {
      lookup[
        normalizeFieldName(key)
      ] = value;

      return lookup;
    },
    {},
  );

const readField = (
  item,
  lookup,
  aliases,
) => {
  for (const alias of aliases) {
    if (
      Object.prototype.hasOwnProperty.call(
        item,
        alias,
      )
    ) {
      return {
        found: true,
        value: item[alias],
      };
    }

    const normalizedAlias =
      normalizeFieldName(alias);

    if (
      Object.prototype.hasOwnProperty.call(
        lookup,
        normalizedAlias,
      )
    ) {
      return {
        found: true,
        value:
          lookup[
            normalizedAlias
          ],
      };
    }
  }

  return {
    found: false,
    value: undefined,
  };
};

const getOptionalNumericValue = (
  field,
) => {
  if (
    !field.found ||
    field.value === null ||
    field.value === undefined ||
    String(field.value).trim() === ""
  ) {
    return null;
  }

  return getNumericValue(
    field.value,
  );
};

const isMeaningfulProductText = (
  value,
) => {
  const text =
    String(value || "").trim();

  if (!text) {
    return false;
  }

  const normalized =
    normalizeFieldName(text);

  return ![
    "productogenerico",
    "productosindescripcion",
    "productosininformacion",
    "sininformacion",
    "sininfo",
    "null",
    "undefined",
  ].includes(normalized);
};

const resolveProductIdentity = (
  item,
  lookup,
) => {
  const descriptionField =
    readField(
      item,
      lookup,
      FIELD_ALIASES.productDescription,
    );

  if (
    isMeaningfulProductText(
      descriptionField.value,
    )
  ) {
    return {
      name: String(
        descriptionField.value,
      ).trim(),
      hasDescription: true,
    };
  }

  const internalCode =
    readField(
      item,
      lookup,
      FIELD_ALIASES.internalCode,
    ).value;

  const externalCode =
    readField(
      item,
      lookup,
      FIELD_ALIASES.externalCode,
    ).value;

  const ean =
    readField(
      item,
      lookup,
      FIELD_ALIASES.ean,
    ).value;

  const brand =
    readField(
      item,
      lookup,
      FIELD_ALIASES.brand,
    ).value;

  const productFormat =
    readField(
      item,
      lookup,
      FIELD_ALIASES.format,
    ).value;

  const validEan =
    ean &&
    String(ean).trim() !== "0";

  if (internalCode) {
    return {
      name: `Código interno ${internalCode}`,
      hasDescription: false,
    };
  }

  if (externalCode) {
    return {
      name: `Código externo ${externalCode}`,
      hasDescription: false,
    };
  }

  if (validEan) {
    return {
      name: `EAN ${ean}`,
      hasDescription: false,
    };
  }

  const descriptiveFallback = [
    brand,
    productFormat,
  ]
    .filter(
      isMeaningfulProductText,
    )
    .map((value) =>
      String(value).trim(),
    )
    .join(" · ");

  if (descriptiveFallback) {
    return {
      name: descriptiveFallback,
      hasDescription: false,
    };
  }

  return {
    name: "Producto sin identificar",
    hasDescription: false,
  };
};

const EmptyState = ({
  message,
  compact = false,
}) => (
  <div
    className={`flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-slate-200 bg-slate-50 text-center ${
      compact
        ? "min-h-[220px]"
        : "min-h-[250px]"
    }`}
  >
    <FiInfo
      size={28}
      className="text-slate-300"
    />

    <p className="px-4 text-[10px] font-black uppercase tracking-widest text-slate-400">
      {message}
    </p>
  </div>
);

const ChartLoader = ({
  height = 250,
}) => (
  <div
    className="flex items-center justify-center"
    style={{
      height,
    }}
  >
    <div className="flex items-center gap-3 text-slate-400">
      <FiLoader
        size={20}
        className="animate-spin text-[#87be00]"
      />

      <span className="text-[10px] font-black uppercase tracking-widest">
        Cargando datos
      </span>
    </div>
  </div>
);

const FilterField = ({
  label,
  children,
}) => (
  <label className="flex min-w-0 flex-col gap-1.5">
    <span className="pl-1 text-[9px] font-black uppercase tracking-[0.16em] text-slate-400">
      {label}
    </span>

    {children}
  </label>
);

const ViewerReports = () => {
  const [data, setData] =
    useState([]);
  const [loading, setLoading] =
    useState(true);
  const [
    loadingFilters,
    setLoadingFilters,
  ] = useState(true);
  const [error, setError] =
    useState(null);
  const [
    filtersError,
    setFiltersError,
  ] = useState(null);

  const [
    draftFilters,
    setDraftFilters,
  ] = useState(EMPTY_FILTERS);
  const [
    appliedFilters,
    setAppliedFilters,
  ] = useState(EMPTY_FILTERS);
  const [options, setOptions] =
    useState(EMPTY_OPTIONS);

  const fetchFilters =
    useCallback(async () => {
      try {
        setLoadingFilters(true);
        setFiltersError(null);

        const response =
          await api.get(
            "/viewer/filter-options",
          );

        setOptions(
          normalizeOptions(response),
        );
      } catch (requestError) {
        console.error(
          "Error cargando filtros viewer:",
          requestError?.response
            ?.data ||
            requestError?.message ||
            requestError,
        );

        setFiltersError(
          requestError?.response?.data
            ?.message ||
            "No fue posible cargar los filtros",
        );
      } finally {
        setLoadingFilters(false);
      }
    }, []);

  const fetchReportData =
    useCallback(async () => {
      try {
        setLoading(true);
        setError(null);

        const response =
          await api.get(
            "/viewer/detailed-reports",
            {
              params:
                appliedFilters,
            },
          );

        setData(
          normalizeReportData(
            response,
          ),
        );
      } catch (requestError) {
        console.error(
          "Error cargando reportes viewer:",
          requestError?.response
            ?.data ||
            requestError?.message ||
            requestError,
        );

        const message =
          requestError?.response?.data
            ?.message ||
          "Error al cargar reportes";

        setError(message);
        toast.error(message);
      } finally {
        setLoading(false);
      }
    }, [appliedFilters]);

  useEffect(() => {
    fetchFilters();
  }, [fetchFilters]);

  useEffect(() => {
    fetchReportData();
  }, [fetchReportData]);

  const preparedData =
    useMemo(
      () =>
        data.map((item) => {
          const lookup =
            createFieldLookup(item);

          const productIdentity =
            resolveProductIdentity(
              item,
              lookup,
            );

          return {
            source: item,
            productName:
              productIdentity.name,
            hasProductDescription:
              productIdentity.hasDescription,
            units:
              getOptionalNumericValue(
                readField(
                  item,
                  lookup,
                  FIELD_ALIASES.units,
                ),
              ) ?? 0,
            inventory:
              getOptionalNumericValue(
                readField(
                  item,
                  lookup,
                  FIELD_ALIASES.inventory,
                ),
              ),
          };
        }),
      [data],
    );

  const productDescriptionRecordsCount =
    useMemo(
      () =>
        preparedData.filter(
          (item) =>
            item.hasProductDescription,
        ).length,
      [preparedData],
    );

  const inventoryRecordsCount =
    useMemo(
      () =>
        preparedData.filter(
          (item) =>
            item.inventory !== null,
        ).length,
      [preparedData],
    );

  const kpiTotals =
    useMemo(() => {
      return data.reduce(
        (accumulator, item) => {
          accumulator.net +=
            getNumericValue(
              item["Venta neta"] ??
                item.venta_neta ??
                item.sales ??
                0,
            );

          accumulator.gross +=
            getNumericValue(
              item["Venta bruta"] ??
                item.venta_bruta ??
                item.sales_gross ??
                0,
            );

          return accumulator;
        },
        {
          net: 0,
          gross: 0,
        },
      );
    }, [data]);

  const salesByChain =
    useMemo(() => {
      const grouped =
        data.reduce(
          (accumulator, item) => {
            const chain =
              item["(L) Cadena"] ??
              item.cadena ??
              item.cadena_nombre ??
              item.name ??
              "Sin cadena";

            const sales =
              getNumericValue(
                item["Venta neta"] ??
                  item.venta_neta ??
                  item.sales ??
                  0,
              );

            accumulator[chain] =
              (accumulator[chain] ||
                0) + sales;

            return accumulator;
          },
          {},
        );

      return Object.entries(
        grouped,
      )
        .map(
          ([name, sales]) => ({
            name,
            sales,
          }),
        )
        .sort(
          (first, second) =>
            second.sales -
            first.sales,
        )
        .slice(0, 12);
    }, [data]);

  const topProducts =
    useMemo(() => {
      const grouped =
        preparedData.reduce(
          (accumulator, item) => {
            if (
              item.units <= 0 ||
              !item.productName
            ) {
              return accumulator;
            }

            accumulator[
              item.productName
            ] =
              (accumulator[
                item.productName
              ] || 0) +
              item.units;

            return accumulator;
          },
          {},
        );

      return Object.entries(
        grouped,
      )
        .map(
          ([name, units]) => ({
            name,
            units,
          }),
        )
        .sort(
          (first, second) =>
            second.units -
            first.units,
        )
        .slice(0, 8);
    }, [preparedData]);

  const stockBreakStockData =
    useMemo(() => {
      let inStock = 0;
      let outOfStock = 0;

      preparedData.forEach(
        (item) => {
          /*
           * Un inventario ausente no se considera quiebre.
           * Así evitamos mostrar 100% de quiebre cuando el
           * endpoint no incluyó inventario_unidades.
           */
          if (
            item.inventory === null
          ) {
            return;
          }

          if (
            item.inventory <= 0
          ) {
            outOfStock += 1;
          } else {
            inStock += 1;
          }
        },
      );

      return [
        {
          name: "Con stock",
          value: inStock,
        },
        {
          name:
            "Quiebre de stock",
          value: outOfStock,
        },
      ];
    }, [preparedData]);

  const hasStockData =
    inventoryRecordsCount > 0 &&
    stockBreakStockData.some(
      (item) => item.value > 0,
    );

  const reportFieldsWarning =
    data.length > 0 &&
    (
      productDescriptionRecordsCount ===
        0 ||
      inventoryRecordsCount === 0
    );

  const filteredComunas =
    useMemo(() => {
      if (
        !draftFilters.region_id
      ) {
        return options.comunas;
      }

      return options.comunas.filter(
        (comuna) =>
          String(
            comuna.region_id,
          ) ===
          String(
            draftFilters.region_id,
          ),
      );
    }, [
      draftFilters.region_id,
      options.comunas,
    ]);

  const filteredLocales =
    useMemo(() => {
      return options.locales.filter(
        (local) => {
          const matchesRegion =
            !draftFilters.region_id ||
            String(
              local.region_id,
            ) ===
              String(
                draftFilters.region_id,
              );

          const matchesComuna =
            !draftFilters.comuna_id ||
            String(
              local.comuna_id,
            ) ===
              String(
                draftFilters.comuna_id,
              );

          const localChain =
            local.cadena ??
            local.cadena_nombre ??
            "";

          const matchesChain =
            !draftFilters.cadena ||
            String(localChain) ===
              String(
                draftFilters.cadena,
              );

          return (
            matchesRegion &&
            matchesComuna &&
            matchesChain
          );
        },
      );
    }, [
      draftFilters.cadena,
      draftFilters.comuna_id,
      draftFilters.region_id,
      options.locales,
    ]);

  const handleFilterChange = (
    event,
  ) => {
    const {
      name,
      value,
    } = event.target;

    setDraftFilters(
      (current) => {
        let next = {
          ...current,
          [name]: value,
        };

        if (
          name === "region_id"
        ) {
          next = {
            ...next,
            comuna_id: "",
            local_id: "",
          };
        }

        if (
          name === "comuna_id" ||
          name === "cadena"
        ) {
          next = {
            ...next,
            local_id: "",
          };
        }

        return next;
      },
    );
  };

  const handleApply = () => {
    if (
      draftFilters.startDate &&
      draftFilters.endDate &&
      draftFilters.startDate >
        draftFilters.endDate
    ) {
      toast.error(
        "La fecha desde no puede ser posterior a la fecha hasta",
      );
      return;
    }

    setAppliedFilters({
      ...draftFilters,
    });
  };

  const clearFilters = () => {
    setDraftFilters(
      EMPTY_FILTERS,
    );
    setAppliedFilters(
      EMPTY_FILTERS,
    );
  };

  const controlClassName =
    "h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-[10px] font-black uppercase text-slate-700 outline-none transition focus:border-[#87be00]/60 focus:bg-white focus:ring-4 focus:ring-[#87be00]/10 disabled:cursor-not-allowed disabled:opacity-60";

  return (
    <div className="min-h-full bg-slate-50/70 px-4 pb-12 pt-20 font-[Outfit] sm:px-6 sm:pt-8 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="flex flex-col gap-5 border-b border-slate-200/80 pb-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-center gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#87be00]/10 text-[#87be00]">
              <FiBarChart2
                size={22}
              />
            </div>

            <div className="min-w-0">
              <h1 className="text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
                Reportes de ventas
              </h1>

              <p className="mt-1.5 text-[10px] font-black uppercase tracking-[0.24em] text-[#87be00]">
                Consolidado comercial
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
            <FiShoppingBag
              size={16}
              className="text-[#87be00]"
            />

            <span className="text-[9px] font-black uppercase tracking-wider text-slate-400">
              Registros
            </span>

            <strong className="text-sm font-black text-slate-900">
              {data.length.toLocaleString(
                "es-CL",
              )}
            </strong>
          </div>
        </header>

        <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
                <FiFilter size={18} />
              </div>

              <div>
                <h2 className="text-base font-black tracking-tight text-slate-900">
                  Filtros del reporte
                </h2>

                <p className="mt-0.5 text-[9px] font-black uppercase tracking-[0.18em] text-slate-400">
                  Selecciona y aplica los criterios
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                onClick={clearFilters}
                className="flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-[9px] font-black uppercase tracking-wider text-slate-500 transition hover:border-red-200 hover:bg-red-50 hover:text-red-500"
              >
                <FiRefreshCw
                  size={14}
                />
                Limpiar
              </button>

              <button
                type="button"
                onClick={handleApply}
                disabled={loading}
                className="flex h-11 items-center justify-center gap-2 rounded-xl bg-[#87be00] px-5 text-[9px] font-black uppercase tracking-wider text-white transition hover:bg-[#76a600] disabled:cursor-not-allowed disabled:opacity-60"
              >
                <FiCheck size={14} />
                Aplicar filtros
              </button>
            </div>
          </div>

          {filtersError && (
            <div className="mb-5 flex flex-col gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <FiAlertTriangle
                  size={18}
                  className="mt-0.5 shrink-0 text-amber-500"
                />

                <p className="text-sm font-medium text-amber-700">
                  {filtersError}
                </p>
              </div>

              <button
                type="button"
                onClick={fetchFilters}
                className="rounded-xl bg-amber-500 px-4 py-2 text-[9px] font-black uppercase tracking-wider text-white"
              >
                Reintentar
              </button>
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-6">
            <FilterField label="Desde">
              <input
                type="date"
                name="startDate"
                value={
                  draftFilters.startDate
                }
                onChange={
                  handleFilterChange
                }
                className={
                  controlClassName
                }
              />
            </FilterField>

            <FilterField label="Hasta">
              <input
                type="date"
                name="endDate"
                value={
                  draftFilters.endDate
                }
                onChange={
                  handleFilterChange
                }
                className={
                  controlClassName
                }
              />
            </FilterField>

            <FilterField label="Región">
              <select
                name="region_id"
                value={
                  draftFilters.region_id
                }
                onChange={
                  handleFilterChange
                }
                disabled={
                  loadingFilters
                }
                className={
                  controlClassName
                }
              >
                <option value="">
                  Todas
                </option>

                {options.regiones.map(
                  (region) => (
                    <option
                      key={region.id}
                      value={region.id}
                    >
                      {region.name}
                    </option>
                  ),
                )}
              </select>
            </FilterField>

            <FilterField label="Comuna">
              <select
                name="comuna_id"
                value={
                  draftFilters.comuna_id
                }
                onChange={
                  handleFilterChange
                }
                disabled={
                  loadingFilters
                }
                className={
                  controlClassName
                }
              >
                <option value="">
                  Todas
                </option>

                {filteredComunas.map(
                  (comuna) => (
                    <option
                      key={comuna.id}
                      value={comuna.id}
                    >
                      {comuna.name}
                    </option>
                  ),
                )}
              </select>
            </FilterField>

            <FilterField label="Cadena">
              <select
                name="cadena"
                value={
                  draftFilters.cadena
                }
                onChange={
                  handleFilterChange
                }
                disabled={
                  loadingFilters
                }
                className={
                  controlClassName
                }
              >
                <option value="">
                  Todas
                </option>

                {options.cadenas.map(
                  (chain) => {
                    const value =
                      typeof chain ===
                      "string"
                        ? chain
                        : chain.name ??
                          chain.cadena ??
                          "";

                    return (
                      <option
                        key={value}
                        value={value}
                      >
                        {value}
                      </option>
                    );
                  },
                )}
              </select>
            </FilterField>

            <FilterField label="Local">
              <select
                name="local_id"
                value={
                  draftFilters.local_id
                }
                onChange={
                  handleFilterChange
                }
                disabled={
                  loadingFilters
                }
                className={
                  controlClassName
                }
              >
                <option value="">
                  Todos
                </option>

                {filteredLocales.map(
                  (local) => (
                    <option
                      key={local.id}
                      value={local.id}
                    >
                      {local.name ??
                        local.local_nombre ??
                        local.cadena ??
                        local.codigo_local ??
                        "Local"}
                    </option>
                  ),
                )}
              </select>
            </FilterField>
          </div>
        </section>

        {error && (
          <section className="flex flex-col gap-4 rounded-2xl border border-red-200 bg-red-50 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-100 text-red-500">
                <FiAlertTriangle
                  size={18}
                />
              </div>

              <div>
                <p className="text-[10px] font-black uppercase tracking-wider text-red-700">
                  Error al cargar datos
                </p>

                <p className="mt-1 text-sm font-medium text-red-600">
                  {error}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={
                fetchReportData
              }
              className="rounded-xl bg-red-500 px-4 py-2.5 text-[9px] font-black uppercase tracking-wider text-white transition hover:bg-red-600"
            >
              Reintentar
            </button>
          </section>
        )}

        {reportFieldsWarning && (
          <section className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
            <div className="flex items-start gap-3">
              <FiAlertTriangle
                size={18}
                className="mt-0.5 shrink-0 text-amber-500"
              />

              <div>
                <p className="text-[9px] font-black uppercase tracking-wider text-amber-700">
                  Campos incompletos en la respuesta
                </p>

                <p className="mt-1 text-sm leading-relaxed text-amber-700">
                  El endpoint debe incluir{" "}
                  <strong>
                    descripcion_producto
                  </strong>{" "}
                  e{" "}
                  <strong>
                    inventario_unidades
                  </strong>
                  . Los valores ausentes ya no se interpretan como producto genérico ni como quiebre de stock.
                </p>
              </div>
            </div>
          </section>
        )}

        <section className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <article className="flex min-h-[132px] items-center gap-5 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#87be00]/10 text-[#87be00]">
              <FiTrendingUp
                size={26}
              />
            </div>

            <div className="min-w-0">
              <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">
                Venta neta total
              </p>

              <p className="mt-2 truncate text-3xl font-black tracking-tight text-slate-900">
                {formatCurrency(
                  kpiTotals.net,
                )}
              </p>
            </div>
          </article>

          <article className="flex min-h-[132px] items-center gap-5 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
              <FiShoppingBag
                size={26}
              />
            </div>

            <div className="min-w-0">
              <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">
                Venta bruta total
              </p>

              <p className="mt-2 truncate text-3xl font-black tracking-tight text-slate-900">
                {formatCurrency(
                  kpiTotals.gross,
                )}
              </p>
            </div>
          </article>
        </section>

        <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
          <div className="mb-7">
            <p className="text-[9px] font-black uppercase tracking-[0.22em] text-slate-400">
              Distribución comercial
            </p>

            <h2 className="mt-1 text-lg font-black tracking-tight text-slate-900">
              Venta neta por cadena
            </h2>
          </div>

          {loading ? (
            <ChartLoader />
          ) : salesByChain.length >
            0 ? (
            <div className="overflow-x-auto custom-scrollbar">
              <div
                className="h-[300px]"
                style={{
                  minWidth: Math.max(
                    700,
                    salesByChain.length *
                      90,
                  ),
                }}
              >
                <ResponsiveContainer
                  width="100%"
                  height="100%"
                  minWidth={0}
                  minHeight={0}
                >
                  <BarChart
                    data={
                      salesByChain
                    }
                    margin={{
                      top: 10,
                      right: 20,
                      left: 10,
                      bottom: 10,
                    }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                      stroke="#e2e8f0"
                    />

                    <XAxis
                      dataKey="name"
                      fontSize={9}
                      fontWeight={800}
                      tickLine={false}
                      axisLine={false}
                    />

                    <YAxis
                      fontSize={9}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(
                        value,
                      ) =>
                        `$${(
                          value /
                          1000000
                        ).toFixed(1)}M`
                      }
                    />

                    <Tooltip
                      formatter={(
                        value,
                      ) =>
                        formatCurrency(
                          value,
                        )
                      }
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
                      dataKey="sales"
                      fill="#87be00"
                      radius={[
                        8, 8, 0, 0,
                      ]}
                      barSize={40}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          ) : (
            <EmptyState message="Sin ventas disponibles para los filtros seleccionados" />
          )}
        </section>

        <section className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <article className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
            <div className="mb-6">
              <p className="text-[9px] font-black uppercase tracking-[0.22em] text-slate-400">
                Ranking de unidades
              </p>

              <h3 className="mt-1 text-lg font-black tracking-tight text-slate-900">
                Top productos
              </h3>
            </div>

            {loading ? (
              <ChartLoader
                height={280}
              />
            ) : topProducts.length >
              0 ? (
              <div className="h-[300px] w-full min-w-0">
                <ResponsiveContainer
                  width="100%"
                  height="100%"
                  minWidth={0}
                  minHeight={0}
                >
                  <BarChart
                    data={
                      topProducts
                    }
                    layout="vertical"
                    margin={{
                      left: 20,
                      right: 20,
                    }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      horizontal={false}
                      stroke="#e2e8f0"
                    />

                    <XAxis
                      type="number"
                      fontSize={8}
                      tickLine={false}
                      axisLine={false}
                    />

                    <YAxis
                      dataKey="name"
                      type="category"
                      fontSize={8}
                      width={130}
                      tickLine={false}
                      axisLine={false}
                    />

                    <Tooltip
                      formatter={(
                        value,
                      ) => [
                        Number(
                          value,
                        ).toLocaleString(
                          "es-CL",
                        ),
                        "Unidades",
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
                      dataKey="units"
                      fill="#3b82f6"
                      radius={[
                        0, 8, 8, 0,
                      ]}
                      barSize={18}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <EmptyState
                compact
                message="Sin productos con unidades vendidas"
              />
            )}

            {!loading &&
              data.length > 0 &&
              productDescriptionRecordsCount === 0 && (
                <p className="mt-4 rounded-xl border border-amber-100 bg-amber-50 px-3 py-2 text-[8px] font-black uppercase tracking-wider text-amber-600">
                  La API no está entregando descripcion_producto; se muestran códigos como respaldo.
                </p>
              )}
          </article>

          <article className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
            <div className="mb-6">
              <p className="text-[9px] font-black uppercase tracking-[0.22em] text-slate-400">
                Disponibilidad
              </p>

              <h3 className="mt-1 text-lg font-black tracking-tight text-slate-900">
                Estado de inventario
              </h3>
            </div>

            {loading ? (
              <ChartLoader
                height={280}
              />
            ) : hasStockData ? (
              <div className="h-[300px] w-full min-w-0">
                <ResponsiveContainer
                  width="100%"
                  height="100%"
                  minWidth={0}
                  minHeight={0}
                >
                  <PieChart>
                    <Pie
                      data={
                        stockBreakStockData
                      }
                      dataKey="value"
                      nameKey="name"
                      outerRadius={88}
                      innerRadius={48}
                      paddingAngle={3}
                      label={({
                        name,
                        percent,
                      }) =>
                        `${name} (${(
                          percent * 100
                        ).toFixed(
                          0,
                        )}%)`
                      }
                    >
                      {stockBreakStockData.map(
                        (
                          item,
                          index,
                        ) => (
                          <Cell
                            key={
                              item.name
                            }
                            fill={
                              index === 0
                                ? "#87be00"
                                : "#ef4444"
                            }
                          />
                        ),
                      )}
                    </Pie>

                    <Tooltip
                      formatter={(
                        value,
                      ) => [
                        Number(
                          value,
                        ).toLocaleString(
                          "es-CL",
                        ),
                        "Registros",
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
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <EmptyState
                compact
                message={data.length > 0 && inventoryRecordsCount === 0 ? "La API no está entregando inventario_unidades" : "Sin información de inventario"}
              />
            )}
          </article>
        </section>
      </div>
    </div>
  );
};

export default ViewerReports;