import { createElement, useCallback, useEffect, useMemo, useState } from "react";
import {
  FiAlertTriangle,
  FiBox,
  FiLayers,
  FiMapPin,
  FiRefreshCw,
  FiSearch,
  FiTrendingDown,
  FiTruck,
} from "react-icons/fi";
import regionalInventoryService from "../../services/regionalInventoryService";
import {
  formatQuantity,
  getDashboardRows,
  getErrorMessage,
  getFilters,
  idOf,
  localLabel,
  nameOf,
  numberOf,
} from "./regionalAdminUtils";

const initialFilters = {
  company_id: "",
  region_id: "",
  local_id: "",
  unit_type: "",
  sku: "",
};

const FilterSelect = ({ label, value, onChange, children, disabled = false }) => (
  <label className="flex min-w-0 flex-col gap-1.5">
    <span className="text-[8px] font-black uppercase tracking-[0.2em] text-gray-400">
      {label}
    </span>
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      disabled={disabled}
      className="min-h-11 w-full rounded-xl border border-gray-100 bg-gray-50 px-3 text-[10px] font-bold text-gray-700 outline-none transition focus:border-[#87be00] focus:ring-2 focus:ring-[#87be00]/20 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {children}
    </select>
  </label>
);

const MetricCard = ({ title, value, unit, icon: Icon, tone }) => {
  const tones = {
    green: "bg-[#87be00]/10 text-[#75a700]",
    blue: "bg-blue-50 text-blue-600",
    amber: "bg-amber-50 text-amber-600",
    red: "bg-red-50 text-red-500",
  };

  return (
    <div className="rounded-[1.75rem] border border-gray-100 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[8px] font-black uppercase tracking-[0.22em] text-gray-400">
            {title}
          </p>
          <p className="mt-3 text-2xl font-black tracking-tight text-gray-900">
            {formatQuantity(value, unit)}
            <span className="ml-1.5 text-[10px] font-black uppercase text-gray-400">
              {unit}
            </span>
          </p>
        </div>
        <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${tones[tone]}`}>
          {createElement(Icon, { size: 19 })}
        </div>
      </div>
    </div>
  );
};

const RegionalInventoryDashboard = () => {
  const [availableFilters, setAvailableFilters] = useState({
    companies: [],
    regions: [],
    locales: [],
  });
  const [filters, setFilters] = useState(initialFilters);
  const [search, setSearch] = useState("");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtersLoading, setFiltersLoading] = useState(true);
  const [error, setError] = useState("");

  const loadAvailableFilters = useCallback(async () => {
    try {
      setFiltersLoading(true);
      const response = await regionalInventoryService.getAdminFilters();
      const nextFilters = getFilters(response);
      setAvailableFilters(nextFilters);

      if (nextFilters.companies.length === 1) {
        setFilters((current) => ({
          ...current,
          company_id: String(idOf(nextFilters.companies[0])),
        }));
      }
    } catch (requestError) {
      setError(getErrorMessage(requestError, "No fue posible cargar los filtros autorizados."));
    } finally {
      setFiltersLoading(false);
    }
  }, []);

  const loadDashboard = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const response = await regionalInventoryService.getAdminDashboard(filters);
      setRows(getDashboardRows(response));
    } catch (requestError) {
      setRows([]);
      setError(getErrorMessage(requestError, "No fue posible cargar el inventario regional."));
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    loadAvailableFilters();
  }, [loadAvailableFilters]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const regions = useMemo(() => {
    if (!filters.company_id) return availableFilters.regions;
    return availableFilters.regions.filter((region) => {
      const companyId = region?.company_id ?? region?.empresa_id;
      return !companyId || String(companyId) === String(filters.company_id);
    });
  }, [availableFilters.regions, filters.company_id]);

  const locales = useMemo(() => {
    return availableFilters.locales.filter((local) => {
      const matchesCompany =
        !filters.company_id ||
        !local?.company_id ||
        String(local.company_id) === String(filters.company_id);
      const matchesRegion =
        !filters.region_id ||
        !local?.region_id ||
        String(local.region_id) === String(filters.region_id);
      return matchesCompany && matchesRegion;
    });
  }, [availableFilters.locales, filters.company_id, filters.region_id]);

  const visibleRows = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return rows;

    return rows.filter((row) =>
      [
        row?.sku,
        row?.barcode,
        row?.ean,
        row?.product_name,
        row?.nombre_producto,
        row?.brand_name,
        row?.marca,
        row?.codigo_local,
        row?.local_name,
        row?.nombre_local,
      ].some((value) => String(value ?? "").toLowerCase().includes(term))
    );
  }, [rows, search]);

  const metrics = useMemo(() => {
    const totals = {
      UN: { loaded: 0, available: 0, replenished: 0, waste: 0 },
      KG: { loaded: 0, available: 0, replenished: 0, waste: 0 },
    };

    rows.forEach((row) => {
      const unit = String(row?.unit_type ?? row?.unidad ?? "UN").toUpperCase() === "KG" ? "KG" : "UN";
      totals[unit].loaded += numberOf(row?.total_loaded_quantity ?? row?.loaded_quantity);
      totals[unit].available += numberOf(row?.available_quantity ?? row?.stock_available);
      totals[unit].replenished += numberOf(row?.total_replenished_quantity ?? row?.replenished_quantity);
      totals[unit].waste += numberOf(row?.total_waste_quantity ?? row?.waste_quantity);
    });

    return totals;
  }, [rows]);

  const updateFilter = (key, value) => {
    setFilters((current) => {
      const next = { ...current, [key]: value };
      if (key === "company_id") {
        next.region_id = "";
        next.local_id = "";
      }
      if (key === "region_id") next.local_id = "";
      return next;
    });
  };

  const resetFilters = () => {
    const onlyCompany = availableFilters.companies.length === 1
      ? String(idOf(availableFilters.companies[0]))
      : "";
    setFilters({ ...initialFilters, company_id: onlyCompany });
    setSearch("");
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-[9px] font-black uppercase tracking-[0.28em] text-[#75a700]">
            Control multi-local
          </p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-gray-900 sm:text-4xl">
            Inventario regional
          </h1>
          <p className="mt-2 max-w-2xl text-sm font-medium text-gray-500">
            Stock cargado, disponible, repuesto y merma de todos los locales asignados.
          </p>
        </div>

        <button
          type="button"
          onClick={loadDashboard}
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gray-900 px-5 py-3 text-[9px] font-black uppercase tracking-widest text-white transition hover:bg-[#75a700] disabled:opacity-50"
        >
          <FiRefreshCw className={loading ? "animate-spin" : ""} />
          Actualizar stock
        </button>
      </header>

      <section className="rounded-[2rem] border border-gray-100 bg-white p-5 shadow-sm sm:p-6">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <FilterSelect
            label="Empresa"
            value={filters.company_id}
            onChange={(value) => updateFilter("company_id", value)}
            disabled={filtersLoading || availableFilters.companies.length <= 1}
          >
            <option value="">Todas las empresas</option>
            {availableFilters.companies.map((company) => (
              <option key={idOf(company)} value={idOf(company)}>{nameOf(company)}</option>
            ))}
          </FilterSelect>

          <FilterSelect
            label="Región"
            value={filters.region_id}
            onChange={(value) => updateFilter("region_id", value)}
            disabled={filtersLoading}
          >
            <option value="">Todas las regiones</option>
            {regions.map((region) => (
              <option key={idOf(region)} value={idOf(region)}>{nameOf(region)}</option>
            ))}
          </FilterSelect>

          <FilterSelect
            label="Local"
            value={filters.local_id}
            onChange={(value) => updateFilter("local_id", value)}
            disabled={filtersLoading}
          >
            <option value="">Todos los locales</option>
            {locales.map((local) => (
              <option key={idOf(local)} value={idOf(local)}>{localLabel(local)}</option>
            ))}
          </FilterSelect>

          <FilterSelect
            label="Unidad"
            value={filters.unit_type}
            onChange={(value) => updateFilter("unit_type", value)}
          >
            <option value="">UN y KG</option>
            <option value="UN">Unidades</option>
            <option value="KG">Kilogramos</option>
          </FilterSelect>

          <label className="flex min-w-0 flex-col gap-1.5">
            <span className="text-[8px] font-black uppercase tracking-[0.2em] text-gray-400">SKU</span>
            <input
              value={filters.sku}
              onChange={(event) => updateFilter("sku", event.target.value)}
              placeholder="Ej. SKU-001"
              className="min-h-11 rounded-xl border border-gray-100 bg-gray-50 px-3 text-[10px] font-bold text-gray-700 outline-none transition focus:border-[#87be00] focus:ring-2 focus:ring-[#87be00]/20"
            />
          </label>
        </div>

        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-md">
            <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar producto, SKU, EAN o local..."
              className="w-full rounded-xl border border-gray-100 bg-gray-50 py-3 pl-11 pr-4 text-[10px] font-bold outline-none focus:border-[#87be00] focus:ring-2 focus:ring-[#87be00]/20"
            />
          </div>
          <button type="button" onClick={resetFilters} className="text-[9px] font-black uppercase tracking-widest text-gray-400 hover:text-red-500">
            Limpiar filtros
          </button>
        </div>
      </section>

      {error && (
        <div className="flex items-start gap-3 rounded-2xl border border-red-100 bg-red-50 p-4 text-sm font-semibold text-red-600">
          <FiAlertTriangle className="mt-0.5 shrink-0" />
          {error}
        </div>
      )}

      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-gray-900 px-3 py-1 text-[8px] font-black uppercase tracking-widest text-white">UN</span>
          <p className="text-[9px] font-black uppercase tracking-widest text-gray-400">Productos por unidad</p>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard title="Stock cargado" value={metrics.UN.loaded} unit="UN" icon={FiLayers} tone="blue" />
          <MetricCard title="Stock disponible" value={metrics.UN.available} unit="UN" icon={FiBox} tone="green" />
          <MetricCard title="Stock repuesto" value={metrics.UN.replenished} unit="UN" icon={FiTruck} tone="amber" />
          <MetricCard title="Merma" value={metrics.UN.waste} unit="UN" icon={FiTrendingDown} tone="red" />
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-blue-600 px-3 py-1 text-[8px] font-black uppercase tracking-widest text-white">KG</span>
          <p className="text-[9px] font-black uppercase tracking-widest text-gray-400">Productos por kilogramo</p>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard title="Stock cargado" value={metrics.KG.loaded} unit="KG" icon={FiLayers} tone="blue" />
          <MetricCard title="Stock disponible" value={metrics.KG.available} unit="KG" icon={FiBox} tone="green" />
          <MetricCard title="Stock repuesto" value={metrics.KG.replenished} unit="KG" icon={FiTruck} tone="amber" />
          <MetricCard title="Merma" value={metrics.KG.waste} unit="KG" icon={FiTrendingDown} tone="red" />
        </div>
      </section>

      <section className="overflow-hidden rounded-[2rem] border border-gray-100 bg-white shadow-sm">
        <div className="flex flex-col gap-2 border-b border-gray-100 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div>
            <h2 className="text-sm font-black uppercase tracking-wide text-gray-900">Detalle por local y SKU</h2>
            <p className="mt-1 text-[9px] font-bold uppercase tracking-widest text-gray-400">
              {visibleRows.length} registros visibles
            </p>
          </div>
          <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-[#75a700]">
            <FiMapPin /> Alcance autorizado
          </div>
        </div>

        {loading ? (
          <div className="flex min-h-64 items-center justify-center">
            <FiRefreshCw className="animate-spin text-[#87be00]" size={28} />
          </div>
        ) : visibleRows.length === 0 ? (
          <div className="flex min-h-64 flex-col items-center justify-center gap-3 px-6 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-50 text-gray-300"><FiBox size={24} /></div>
            <p className="text-sm font-black text-gray-700">Sin inventario cargado</p>
            <p className="max-w-md text-xs font-medium text-gray-400">Los locales autorizados aparecerán aquí cuando tengan una carga inicial de stock.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1050px] text-left">
              <thead className="bg-gray-50/80 text-[8px] font-black uppercase tracking-[0.18em] text-gray-400">
                <tr>
                  <th className="px-6 py-4">Local</th>
                  <th className="px-4 py-4">SKU / Producto</th>
                  <th className="px-4 py-4">Unidad</th>
                  <th className="px-4 py-4 text-right">Cargado</th>
                  <th className="px-4 py-4 text-right">Disponible</th>
                  <th className="px-4 py-4 text-right">Repuesto</th>
                  <th className="px-6 py-4 text-right">Merma</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {visibleRows.map((row, index) => {
                  const unit = String(row?.unit_type ?? row?.unidad ?? "UN").toUpperCase();
                  return (
                    <tr key={row?.balance_id ?? `${row?.local_id}-${row?.product_id}-${index}`} className="text-[10px] font-semibold text-gray-600 transition hover:bg-[#87be00]/[0.03]">
                      <td className="px-6 py-4">
                        <p className="font-black text-gray-800">{row?.codigo_local ?? row?.local_code ?? row?.local_name ?? row?.nombre_local ?? "—"}</p>
                        <p className="mt-1 text-[8px] uppercase tracking-wider text-gray-400">{row?.region_name ?? row?.region ?? ""}</p>
                      </td>
                      <td className="px-4 py-4">
                        <p className="font-black text-gray-800">{row?.sku ?? "Sin SKU"}</p>
                        <p className="mt-1 max-w-[260px] truncate text-[9px] text-gray-400">{row?.product_name ?? row?.nombre_producto ?? "Producto sin nombre"}</p>
                      </td>
                      <td className="px-4 py-4"><span className={`rounded-full px-2.5 py-1 text-[8px] font-black ${unit === "KG" ? "bg-blue-50 text-blue-600" : "bg-gray-100 text-gray-600"}`}>{unit}</span></td>
                      <td className="px-4 py-4 text-right font-black text-gray-700">{formatQuantity(row?.total_loaded_quantity ?? row?.loaded_quantity, unit)}</td>
                      <td className="px-4 py-4 text-right font-black text-[#75a700]">{formatQuantity(row?.available_quantity ?? row?.stock_available, unit)}</td>
                      <td className="px-4 py-4 text-right">{formatQuantity(row?.total_replenished_quantity ?? row?.replenished_quantity, unit)}</td>
                      <td className="px-6 py-4 text-right text-red-500">{formatQuantity(row?.total_waste_quantity ?? row?.waste_quantity, unit)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
};

export default RegionalInventoryDashboard;
