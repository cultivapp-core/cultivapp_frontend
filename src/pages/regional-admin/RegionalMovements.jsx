import { useCallback, useEffect, useMemo, useState } from "react";
import {
  FiAlertTriangle,
  FiClock,
  FiRefreshCw,
  FiSearch,
} from "react-icons/fi";
import regionalInventoryService from "../../services/regionalInventoryService";
import {
  formatDate,
  formatQuantity,
  getErrorMessage,
  getFilters,
  getMovementRows,
  idOf,
  localLabel,
} from "./regionalAdminUtils";

const movementLabels = {
  INITIAL_LOAD: "Carga inicial",
  ADDITIONAL_LOAD: "Carga adicional",
  REPLENISHMENT: "Reposición",
  WASTE: "Merma",
  POSITIVE_ADJUSTMENT: "Ajuste positivo",
  NEGATIVE_ADJUSTMENT: "Ajuste negativo",
  REVERSAL: "Reversa",
};

const movementStyles = {
  INITIAL_LOAD: "bg-blue-50 text-blue-600",
  ADDITIONAL_LOAD: "bg-indigo-50 text-indigo-600",
  REPLENISHMENT: "bg-amber-50 text-amber-600",
  WASTE: "bg-red-50 text-red-500",
  POSITIVE_ADJUSTMENT: "bg-green-50 text-green-600",
  NEGATIVE_ADJUSTMENT: "bg-orange-50 text-orange-600",
  REVERSAL: "bg-gray-100 text-gray-600",
};

const RegionalMovements = () => {
  const [locales, setLocales] = useState([]);
  const [localId, setLocalId] = useState("");
  const [movementType, setMovementType] = useState("");
  const [search, setSearch] = useState("");
  const [movements, setMovements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadFilters = useCallback(async () => {
    try {
      const response = await regionalInventoryService.getAdminFilters();
      setLocales(getFilters(response).locales);
    } catch (requestError) {
      setError(getErrorMessage(requestError, "No fue posible cargar los locales autorizados."));
    }
  }, []);

  const loadMovements = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const response = await regionalInventoryService.getMovements({
        local_id: localId,
        movement_type: movementType,
      });
      setMovements(getMovementRows(response));
    } catch (requestError) {
      setMovements([]);
      setError(getErrorMessage(requestError, "No fue posible cargar los movimientos regionales."));
    } finally {
      setLoading(false);
    }
  }, [localId, movementType]);

  useEffect(() => {
    loadFilters();
  }, [loadFilters]);

  useEffect(() => {
    loadMovements();
  }, [loadMovements]);

  const visibleMovements = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return movements;

    return movements.filter((movement) =>
      [
        movement?.sku,
        movement?.product_name,
        movement?.codigo_local,
        movement?.local_name,
        movement?.reason,
        movement?.created_by_name,
        movement?.user_name,
      ].some((value) => String(value ?? "").toLowerCase().includes(term))
    );
  }, [movements, search]);

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-[9px] font-black uppercase tracking-[0.28em] text-[#75a700]">Trazabilidad de stock</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-gray-900 sm:text-4xl">Movimientos regionales</h1>
          <p className="mt-2 text-sm font-medium text-gray-500">Audita cargas, reposiciones, mermas y ajustes realizados sobre cada saldo.</p>
        </div>
        <button type="button" onClick={loadMovements} disabled={loading} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gray-900 px-5 py-3 text-[9px] font-black uppercase tracking-widest text-white transition hover:bg-[#75a700] disabled:opacity-50"><FiRefreshCw className={loading ? "animate-spin" : ""} />Actualizar</button>
      </header>

      {error && <div className="flex items-start gap-3 rounded-2xl border border-red-100 bg-red-50 p-4 text-sm font-semibold text-red-600"><FiAlertTriangle className="mt-0.5 shrink-0" />{error}</div>}

      <section className="rounded-[2rem] border border-gray-100 bg-white p-5 shadow-sm sm:p-6">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-[minmax(220px,1fr)_minmax(190px,0.7fr)_minmax(260px,1.4fr)]">
          <label className="flex flex-col gap-1.5"><span className="text-[8px] font-black uppercase tracking-[0.2em] text-gray-400">Local</span><select value={localId} onChange={(event) => setLocalId(event.target.value)} className="min-h-11 rounded-xl border border-gray-100 bg-gray-50 px-3 text-[10px] font-bold outline-none focus:border-[#87be00]"><option value="">Todos los locales</option>{locales.map((local) => <option key={idOf(local)} value={idOf(local)}>{localLabel(local)}</option>)}</select></label>
          <label className="flex flex-col gap-1.5"><span className="text-[8px] font-black uppercase tracking-[0.2em] text-gray-400">Movimiento</span><select value={movementType} onChange={(event) => setMovementType(event.target.value)} className="min-h-11 rounded-xl border border-gray-100 bg-gray-50 px-3 text-[10px] font-bold outline-none focus:border-[#87be00]"><option value="">Todos</option>{Object.entries(movementLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          <label className="flex flex-col gap-1.5"><span className="text-[8px] font-black uppercase tracking-[0.2em] text-gray-400">Buscar</span><div className="relative"><FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="SKU, producto, local, motivo o usuario" className="min-h-11 w-full rounded-xl border border-gray-100 bg-gray-50 pl-11 pr-3 text-[10px] font-bold outline-none focus:border-[#87be00]" /></div></label>
        </div>
      </section>

      <section className="overflow-hidden rounded-[2rem] border border-gray-100 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-gray-100 p-5 sm:p-6"><div><h2 className="text-sm font-black uppercase tracking-wide text-gray-900">Historial auditable</h2><p className="mt-1 text-[9px] font-bold uppercase tracking-widest text-gray-400">{visibleMovements.length} movimientos</p></div><FiClock className="text-[#87be00]" size={21} /></div>
        {loading ? (
          <div className="flex min-h-72 items-center justify-center"><FiRefreshCw className="animate-spin text-[#87be00]" size={28} /></div>
        ) : visibleMovements.length === 0 ? (
          <div className="flex min-h-72 flex-col items-center justify-center gap-3 p-6 text-center"><div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-50 text-gray-300"><FiClock size={24} /></div><p className="text-sm font-black text-gray-700">Sin movimientos registrados</p><p className="text-xs font-medium text-gray-400">Los movimientos aparecerán cuando exista una carga o gestión de stock.</p></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1100px] text-left">
              <thead className="bg-gray-50/80 text-[8px] font-black uppercase tracking-[0.18em] text-gray-400"><tr><th className="px-6 py-4">Fecha</th><th className="px-4 py-4">Tipo</th><th className="px-4 py-4">Local</th><th className="px-4 py-4">SKU / Producto</th><th className="px-4 py-4 text-right">Cantidad</th><th className="px-4 py-4 text-right">Antes</th><th className="px-4 py-4 text-right">Después</th><th className="px-6 py-4">Responsable / Motivo</th></tr></thead>
              <tbody className="divide-y divide-gray-50">
                {visibleMovements.map((movement, index) => {
                  const type = String(movement?.movement_type ?? movement?.type ?? "").toUpperCase();
                  const unit = String(movement?.unit_type ?? movement?.unidad ?? "UN").toUpperCase();
                  return (
                    <tr key={movement?.movement_id ?? movement?.id ?? index} className="text-[10px] font-semibold text-gray-600 hover:bg-[#87be00]/[0.03]">
                      <td className="px-6 py-4 font-bold text-gray-700">{formatDate(movement?.created_at ?? movement?.movement_at, true)}</td>
                      <td className="px-4 py-4"><span className={`rounded-full px-2.5 py-1 text-[8px] font-black uppercase ${movementStyles[type] ?? "bg-gray-100 text-gray-600"}`}>{movementLabels[type] ?? type ?? "—"}</span></td>
                      <td className="px-4 py-4">{movement?.codigo_local ?? movement?.local_name ?? "—"}</td>
                      <td className="px-4 py-4"><p className="font-black text-gray-800">{movement?.sku ?? "—"}</p><p className="mt-1 max-w-[210px] truncate text-[8px] text-gray-400">{movement?.product_name ?? "—"}</p></td>
                      <td className="px-4 py-4 text-right font-black">{formatQuantity(movement?.quantity, unit)} <span className="text-[8px] text-gray-400">{unit}</span></td>
                      <td className="px-4 py-4 text-right">{formatQuantity(movement?.stock_before, unit)}</td>
                      <td className="px-4 py-4 text-right font-black text-[#75a700]">{formatQuantity(movement?.stock_after, unit)}</td>
                      <td className="px-6 py-4"><p className="font-bold text-gray-700">{movement?.created_by_name ?? movement?.user_name ?? movement?.created_by_email ?? "—"}</p><p className="mt-1 max-w-[220px] truncate text-[8px] text-gray-400">{movement?.reason ?? "Sin observación"}</p></td>
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

export default RegionalMovements;
