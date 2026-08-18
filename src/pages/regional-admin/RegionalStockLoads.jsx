import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  FiAlertTriangle,
  FiCheckCircle,
  FiDownload,
  FiFileText,
  FiRefreshCw,
  FiUploadCloud,
} from "react-icons/fi";
import toast from "react-hot-toast";
import regionalInventoryService from "../../services/regionalInventoryService";
import {
  formatDate,
  formatQuantity,
  getErrorMessage,
  getFilters,
  getHistoryRows,
  getPayload,
  idOf,
  localLabel,
  todayInputValue,
} from "./regionalAdminUtils";

const RegionalStockLoads = () => {
  const fileInputRef = useRef(null);
  const [locales, setLocales] = useState([]);
  const [localId, setLocalId] = useState("");
  const [inventoryDate, setInventoryDate] = useState(todayInputValue());
  const [loadType, setLoadType] = useState("INITIAL");
  const [file, setFile] = useState(null);
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState("");
  const [lastResult, setLastResult] = useState(null);

  const loadLocales = useCallback(async () => {
    try {
      const response = await regionalInventoryService.getAdminFilters();
      const nextLocales = getFilters(response).locales;
      setLocales(nextLocales);
      if (!localId && nextLocales.length === 1) setLocalId(String(idOf(nextLocales[0])));
    } catch (requestError) {
      setError(getErrorMessage(requestError, "No fue posible cargar los locales autorizados."));
    }
  }, [localId]);

  const loadHistory = useCallback(async () => {
    try {
      setLoadingHistory(true);
      setError("");

      const params = localId ? { local_id: localId } : {};
      let response;

      try {
        response = await regionalInventoryService.getLoadHistory(params);
      } catch (historyError) {
        if (historyError?.status !== 404) throw historyError;
        response = await regionalInventoryService.getLoads(params);
      }

      setHistory(getHistoryRows(response));
    } catch (requestError) {
      setHistory([]);
      setError(getErrorMessage(requestError, "No fue posible cargar el historial de stock."));
    } finally {
      setLoadingHistory(false);
    }
  }, [localId]);

  useEffect(() => {
    loadLocales();
  }, [loadLocales]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const localeMap = useMemo(
    () => new Map(locales.map((local) => [String(idOf(local)), localLabel(local)])),
    [locales]
  );

  const handleDownload = async () => {
    try {
      setDownloading(true);
      await regionalInventoryService.downloadTemplate("stock");
      toast.success("Plantilla de stock descargada");
    } catch (requestError) {
      toast.error(getErrorMessage(requestError, "No fue posible descargar la plantilla."));
    } finally {
      setDownloading(false);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!localId || !inventoryDate || !file) {
      toast.error("Completa el local, la fecha y el archivo Excel.");
      return;
    }

    try {
      setUploading(true);
      setLastResult(null);
      const response = await regionalInventoryService.importStockLoad({
        localId,
        inventoryDate,
        loadType,
        file,
      });
      setLastResult(getPayload(response));
      setFile(null);
      setLoadType("ADDITIONAL");
      if (fileInputRef.current) fileInputRef.current.value = "";
      toast.success(loadType === "INITIAL" ? "Carga inicial procesada" : "Stock adicional sumado correctamente");
      await loadHistory();
    } catch (requestError) {
      toast.error(getErrorMessage(requestError, "No fue posible procesar la carga de stock."));
    } finally {
      setUploading(false);
    }
  };

  const result = lastResult?.load ?? lastResult?.result ?? lastResult;

  return (
    <div className="space-y-6">
      <header>
        <p className="text-[9px] font-black uppercase tracking-[0.28em] text-[#75a700]">Abastecimiento regional</p>
        <h1 className="mt-2 text-3xl font-black tracking-tight text-gray-900 sm:text-4xl">Cargas de stock</h1>
        <p className="mt-2 text-sm font-medium text-gray-500">La carga adicional suma cantidades al saldo disponible y conserva el historial por fecha, local y SKU.</p>
      </header>

      {error && (
        <div className="flex items-start gap-3 rounded-2xl border border-red-100 bg-red-50 p-4 text-sm font-semibold text-red-600"><FiAlertTriangle className="mt-0.5 shrink-0" />{error}</div>
      )}

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-[400px_minmax(0,1fr)]">
        <aside className="h-fit rounded-[2rem] border border-gray-100 bg-white p-6 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#87be00]/10 text-[#75a700]"><FiUploadCloud size={21} /></div>
            <button type="button" onClick={handleDownload} disabled={downloading} className="inline-flex items-center gap-2 rounded-xl border border-[#87be00]/20 bg-[#87be00]/5 px-3 py-2.5 text-[8px] font-black uppercase tracking-widest text-[#75a700] hover:bg-[#87be00]/10 disabled:opacity-50"><FiDownload />{downloading ? "Descargando" : "Plantilla"}</button>
          </div>
          <h2 className="mt-5 text-lg font-black text-gray-900">Nueva carga</h2>
          <p className="mt-2 text-xs font-medium leading-relaxed text-gray-500">Selecciona el local y utiliza INITIAL solo para su primera carga. Las siguientes deben ser ADDITIONAL.</p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <label className="block">
              <span className="mb-2 block text-[8px] font-black uppercase tracking-[0.2em] text-gray-400">Local</span>
              <select value={localId} onChange={(event) => setLocalId(event.target.value)} className="min-h-11 w-full rounded-xl border border-gray-100 bg-gray-50 px-3 text-[10px] font-bold outline-none focus:border-[#87be00] focus:ring-2 focus:ring-[#87be00]/20">
                <option value="">Seleccionar local</option>
                {locales.map((local) => <option key={idOf(local)} value={idOf(local)}>{localLabel(local)}</option>)}
              </select>
            </label>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-1">
              <label className="block">
                <span className="mb-2 block text-[8px] font-black uppercase tracking-[0.2em] text-gray-400">Fecha de inventario</span>
                <input type="date" value={inventoryDate} onChange={(event) => setInventoryDate(event.target.value)} className="min-h-11 w-full rounded-xl border border-gray-100 bg-gray-50 px-3 text-[10px] font-bold outline-none focus:border-[#87be00] focus:ring-2 focus:ring-[#87be00]/20" />
              </label>
              <label className="block">
                <span className="mb-2 block text-[8px] font-black uppercase tracking-[0.2em] text-gray-400">Tipo de carga</span>
                <select value={loadType} onChange={(event) => setLoadType(event.target.value)} className="min-h-11 w-full rounded-xl border border-gray-100 bg-gray-50 px-3 text-[10px] font-bold outline-none focus:border-[#87be00] focus:ring-2 focus:ring-[#87be00]/20">
                  <option value="INITIAL">Carga inicial</option>
                  <option value="ADDITIONAL">Carga adicional</option>
                </select>
              </label>
            </div>

            <label className="block">
              <span className="mb-2 block text-[8px] font-black uppercase tracking-[0.2em] text-gray-400">Archivo Excel</span>
              <input ref={fileInputRef} type="file" accept=".xlsx,.xls" onChange={(event) => setFile(event.target.files?.[0] ?? null)} className="block w-full rounded-xl border border-dashed border-gray-200 bg-gray-50 p-3 text-[9px] font-bold text-gray-500 file:mr-3 file:rounded-lg file:border-0 file:bg-gray-900 file:px-3 file:py-2 file:text-[8px] file:font-black file:uppercase file:tracking-wider file:text-white" />
            </label>

            <button type="submit" disabled={uploading || !localId || !inventoryDate || !file} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gray-900 px-4 py-3.5 text-[9px] font-black uppercase tracking-widest text-white transition hover:bg-[#75a700] disabled:cursor-not-allowed disabled:opacity-40"><FiUploadCloud />{uploading ? "Procesando carga..." : "Procesar stock"}</button>
          </form>

          {lastResult && (
            <div className="mt-5 rounded-2xl border border-green-100 bg-green-50 p-4">
              <p className="flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-green-700"><FiCheckCircle />Carga completada</p>
              <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                <div><p className="text-lg font-black text-gray-900">{result?.total_rows ?? result?.total_items ?? 0}</p><p className="text-[7px] font-black uppercase text-gray-400">Filas</p></div>
                <div><p className="text-lg font-black text-gray-900">{result?.valid_rows ?? result?.processed_items ?? 0}</p><p className="text-[7px] font-black uppercase text-gray-400">Válidas</p></div>
                <div><p className="text-lg font-black text-gray-900">{result?.rejected_rows ?? 0}</p><p className="text-[7px] font-black uppercase text-gray-400">Rechazadas</p></div>
              </div>
            </div>
          )}
        </aside>

        <div className="overflow-hidden rounded-[2rem] border border-gray-100 bg-white shadow-sm">
          <div className="flex flex-col gap-4 border-b border-gray-100 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
            <div><h2 className="text-sm font-black uppercase tracking-wide text-gray-900">Historial de cargas</h2><p className="mt-1 text-[9px] font-bold uppercase tracking-widest text-gray-400">Fecha, SKU, unidad, cantidad y saldo</p></div>
            <div className="flex gap-2">
              <select value={localId} onChange={(event) => setLocalId(event.target.value)} className="min-h-10 max-w-[230px] rounded-xl border border-gray-100 bg-gray-50 px-3 text-[9px] font-bold outline-none focus:border-[#87be00]"><option value="">Todos los locales</option>{locales.map((local) => <option key={idOf(local)} value={idOf(local)}>{localLabel(local)}</option>)}</select>
              <button type="button" onClick={loadHistory} disabled={loadingHistory} className="flex h-10 w-10 items-center justify-center rounded-xl border border-gray-100 text-gray-400 hover:text-[#75a700] disabled:opacity-50"><FiRefreshCw className={loadingHistory ? "animate-spin" : ""} /></button>
            </div>
          </div>

          {loadingHistory ? (
            <div className="flex min-h-72 items-center justify-center"><FiRefreshCw className="animate-spin text-[#87be00]" size={28} /></div>
          ) : history.length === 0 ? (
            <div className="flex min-h-72 flex-col items-center justify-center gap-3 p-6 text-center"><div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-50 text-gray-300"><FiFileText size={24} /></div><p className="text-sm font-black text-gray-700">Sin cargas registradas</p><p className="text-xs font-medium text-gray-400">El historial aparecerá después de procesar la primera carga del local.</p></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1050px] text-left">
                <thead className="bg-gray-50/80 text-[8px] font-black uppercase tracking-[0.18em] text-gray-400"><tr><th className="px-6 py-4">Fecha</th><th className="px-4 py-4">Local</th><th className="px-4 py-4">SKU / Producto</th><th className="px-4 py-4">Unidad</th><th className="px-4 py-4 text-right">Cantidad cargada</th><th className="px-4 py-4 text-right">Stock tras carga</th><th className="px-6 py-4 text-right">Disponible actual</th></tr></thead>
                <tbody className="divide-y divide-gray-50">
                  {history.map((item, index) => {
                    const unit = String(item?.unit_type ?? item?.unidad ?? "UN").toUpperCase();
                    const itemLocalId = item?.local_id ?? item?.load?.local_id;
                    return (
                      <tr key={item?.load_item_id ?? item?.id ?? `${item?.load_id}-${item?.sku}-${index}`} className="text-[10px] font-semibold text-gray-600 hover:bg-[#87be00]/[0.03]">
                        <td className="px-6 py-4"><p className="font-black text-gray-800">{formatDate(item?.inventory_date ?? item?.load_date)}</p><p className="mt-1 text-[8px] text-gray-400">Subido {formatDate(item?.loaded_at ?? item?.created_at, true)}</p></td>
                        <td className="px-4 py-4 font-bold text-gray-700">{item?.codigo_local ?? item?.local_name ?? localeMap.get(String(itemLocalId)) ?? "—"}</td>
                        <td className="px-4 py-4"><p className="font-black text-gray-800">{item?.sku ?? "Detalle no disponible"}</p><p className="mt-1 max-w-[220px] truncate text-[8px] text-gray-400">{item?.product_name ?? item?.original_filename ?? "—"}</p></td>
                        <td className="px-4 py-4"><span className={`rounded-full px-2.5 py-1 text-[8px] font-black ${unit === "KG" ? "bg-blue-50 text-blue-600" : "bg-gray-100 text-gray-600"}`}>{item?.unit_type ? unit : "—"}</span></td>
                        <td className="px-4 py-4 text-right font-black">{item?.loaded_quantity != null || item?.quantity != null ? formatQuantity(item?.loaded_quantity ?? item?.quantity, unit) : "—"}</td>
                        <td className="px-4 py-4 text-right">{item?.stock_after_load != null ? formatQuantity(item.stock_after_load, unit) : "—"}</td>
                        <td className="px-6 py-4 text-right font-black text-[#75a700]">{item?.current_available_quantity != null || item?.available_quantity != null ? formatQuantity(item?.current_available_quantity ?? item?.available_quantity, unit) : "—"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

export default RegionalStockLoads;
