import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  FiAlertTriangle,
  FiBox,
  FiCheckCircle,
  FiDownload,
  FiMapPin,
  FiRefreshCw,
  FiSearch,
  FiUploadCloud,
} from "react-icons/fi";
import toast from "react-hot-toast";
import { useAuth } from "../../context/AuthContext";
import regionalInventoryService from "../../services/regionalInventoryService";
import {
  getErrorMessage,
  getFilters,
  getPayload,
  getProductRows,
  idOf,
  localLabel,
  nameOf,
} from "./regionalAdminUtils";

const RegionalProductCatalog = () => {
  const { user } = useAuth();
  const fileInputRef = useRef(null);
  const [companies, setCompanies] = useState([]);
  const [companyId, setCompanyId] = useState(user?.company_id || "");
  const [locales, setLocales] = useState([]);
  const [localId, setLocalId] = useState("");
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState("");
  const [lastResult, setLastResult] = useState(null);

  const loadFilters = useCallback(async () => {
    try {
      const response = await regionalInventoryService.getAdminFilters();
      const filters = getFilters(response);
      const nextCompanies = filters.companies;
      setCompanies(nextCompanies);
      setLocales(filters.locales);

      setCompanyId((currentCompanyId) =>
        currentCompanyId ||
        (nextCompanies.length > 0 ? String(idOf(nextCompanies[0])) : "")
      );
    } catch (requestError) {
      setError(getErrorMessage(requestError, "No fue posible cargar las empresas autorizadas."));
    }
  }, []);

  const loadProducts = useCallback(async () => {
    if (!companyId) {
      setProducts([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError("");
      const response = await regionalInventoryService.getProducts({ company_id: companyId });
      setProducts(getProductRows(response));
    } catch (requestError) {
      setProducts([]);
      setError(getErrorMessage(requestError, "No fue posible cargar el catálogo regional."));
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    loadFilters();
  }, [loadFilters]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  const availableLocales = useMemo(
    () =>
      locales.filter(
        (local) => String(local?.company_id ?? "") === String(companyId)
      ),
    [companyId, locales]
  );

  useEffect(() => {
    if (
      localId &&
      !availableLocales.some((local) => String(idOf(local)) === String(localId))
    ) {
      setLocalId("");
    }
  }, [availableLocales, localId]);

  const visibleProducts = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return products;

    return products.filter((product) =>
      [
        product?.sku,
        product?.barcode,
        product?.ean,
        product?.product_name,
        product?.name,
        product?.brand_name,
        product?.category_name,
      ].some((value) => String(value ?? "").toLowerCase().includes(term))
    );
  }, [products, search]);

  const handleDownload = async () => {
    try {
      setDownloading(true);
      await regionalInventoryService.downloadTemplate("products");
      toast.success("Plantilla de catálogo descargada");
    } catch (requestError) {
      toast.error(getErrorMessage(requestError, "No fue posible descargar la plantilla."));
    } finally {
      setDownloading(false);
    }
  };

  const handleImport = async (event) => {
    event.preventDefault();

    if (!companyId) {
      toast.error("Selecciona una empresa.");
      return;
    }

    if (!localId) {
      toast.error("Selecciona el local al que se cargarán los productos.");
      return;
    }

    if (!selectedFile) {
      toast.error("Selecciona el archivo Excel del catálogo.");
      return;
    }

    try {
      setUploading(true);
      setLastResult(null);
      const response = await regionalInventoryService.importProducts({
        companyId,
        localId,
        file: selectedFile,
      });
      setLastResult(getPayload(response));
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      toast.success("Productos cargados y asociados al local correctamente");
      await loadProducts();
    } catch (requestError) {
      toast.error(getErrorMessage(requestError, "No fue posible importar el catálogo."));
    } finally {
      setUploading(false);
    }
  };

  const resultSummary = lastResult?.summary ?? lastResult?.result ?? lastResult;

  return (
    <div className="space-y-6">
      <header>
        <p className="text-[9px] font-black uppercase tracking-[0.28em] text-[#75a700]">Productos regionales</p>
        <h1 className="mt-2 text-3xl font-black tracking-tight text-gray-900 sm:text-4xl">Catálogo de inventario</h1>
        <p className="mt-2 text-sm font-medium text-gray-500">Gestiona SKU, EAN, producto, marca y unidad de control UN o KG.</p>
      </header>

      {error && (
        <div className="flex items-start gap-3 rounded-2xl border border-red-100 bg-red-50 p-4 text-sm font-semibold text-red-600">
          <FiAlertTriangle className="mt-0.5 shrink-0" />{error}
        </div>
      )}

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="overflow-hidden rounded-[2rem] border border-gray-100 bg-white shadow-sm">
          <div className="flex flex-col gap-4 border-b border-gray-100 p-5 sm:p-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="grid flex-1 grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="flex flex-col gap-1.5">
                <span className="text-[8px] font-black uppercase tracking-[0.2em] text-gray-400">Empresa</span>
                <select
                  value={companyId}
                  onChange={(event) => {
                    setCompanyId(event.target.value);
                    setLocalId("");
                  }}
                  disabled={companies.length <= 1}
                  className="min-h-11 rounded-xl border border-gray-100 bg-gray-50 px-3 text-[10px] font-bold outline-none focus:border-[#87be00] focus:ring-2 focus:ring-[#87be00]/20 disabled:opacity-60"
                >
                  <option value="">Seleccionar empresa</option>
                  {companies.map((company) => <option key={idOf(company)} value={idOf(company)}>{nameOf(company)}</option>)}
                </select>
              </label>

              <label className="flex flex-col gap-1.5">
                <span className="text-[8px] font-black uppercase tracking-[0.2em] text-gray-400">Buscar</span>
                <div className="relative">
                  <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" />
                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="SKU, EAN, nombre o marca"
                    className="min-h-11 w-full rounded-xl border border-gray-100 bg-gray-50 pl-11 pr-3 text-[10px] font-bold outline-none focus:border-[#87be00] focus:ring-2 focus:ring-[#87be00]/20"
                  />
                </div>
              </label>
            </div>

            <button type="button" onClick={loadProducts} disabled={loading} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-gray-100 px-4 text-[9px] font-black uppercase tracking-widest text-gray-500 hover:border-[#87be00]/30 hover:text-[#75a700] disabled:opacity-50">
              <FiRefreshCw className={loading ? "animate-spin" : ""} />Actualizar
            </button>
          </div>

          {loading ? (
            <div className="flex min-h-72 items-center justify-center"><FiRefreshCw className="animate-spin text-[#87be00]" size={28} /></div>
          ) : visibleProducts.length === 0 ? (
            <div className="flex min-h-72 flex-col items-center justify-center gap-3 p-6 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-50 text-gray-300"><FiBox size={24} /></div>
              <p className="text-sm font-black text-gray-700">Sin productos regionales</p>
              <p className="max-w-sm text-xs font-medium text-gray-400">Descarga la plantilla, complétala e importa el primer catálogo.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left">
                <thead className="bg-gray-50/80 text-[8px] font-black uppercase tracking-[0.18em] text-gray-400">
                  <tr><th className="px-6 py-4">SKU / EAN</th><th className="px-4 py-4">Producto</th><th className="px-4 py-4">Marca</th><th className="px-4 py-4">Unidad</th><th className="px-6 py-4">Estado</th></tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {visibleProducts.map((product, index) => {
                    const unit = String(product?.unit_type ?? product?.unidad ?? "UN").toUpperCase();
                    const active = product?.is_active !== false;
                    return (
                      <tr key={product?.id ?? `${product?.sku}-${index}`} className="text-[10px] font-semibold text-gray-600 hover:bg-[#87be00]/[0.03]">
                        <td className="px-6 py-4"><p className="font-black text-gray-800">{product?.sku ?? "—"}</p><p className="mt-1 text-[8px] text-gray-400">{product?.barcode ?? product?.ean ?? "Sin EAN"}</p></td>
                        <td className="px-4 py-4 font-bold text-gray-700">{product?.product_name ?? product?.name ?? "—"}</td>
                        <td className="px-4 py-4">{product?.brand_name ?? product?.marca ?? "—"}</td>
                        <td className="px-4 py-4"><span className={`rounded-full px-2.5 py-1 text-[8px] font-black ${unit === "KG" ? "bg-blue-50 text-blue-600" : "bg-gray-100 text-gray-600"}`}>{unit}</span></td>
                        <td className="px-6 py-4"><span className={`rounded-full px-2.5 py-1 text-[8px] font-black uppercase ${active ? "bg-[#87be00]/10 text-[#75a700]" : "bg-red-50 text-red-500"}`}>{active ? "Activo" : "Inactivo"}</span></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <aside className="h-fit rounded-[2rem] border border-gray-100 bg-white p-6 shadow-sm">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#87be00]/10 text-[#75a700]"><FiUploadCloud size={21} /></div>
          <h2 className="mt-5 text-lg font-black text-gray-900">Importar catálogo</h2>
          <p className="mt-2 text-xs font-medium leading-relaxed text-gray-500">Utiliza el formato oficial para cargar o actualizar varios productos sin duplicar sus SKU.</p>

          <button type="button" onClick={handleDownload} disabled={downloading} className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-[#87be00]/20 bg-[#87be00]/5 px-4 py-3 text-[9px] font-black uppercase tracking-widest text-[#75a700] hover:bg-[#87be00]/10 disabled:opacity-50">
            <FiDownload />{downloading ? "Descargando..." : "Descargar plantilla"}
          </button>

          <form onSubmit={handleImport} className="mt-5 space-y-4">
            <label className="block">
              <span className="mb-2 block text-[8px] font-black uppercase tracking-[0.2em] text-gray-400">
                Local de destino
              </span>
              <div className="relative">
                <FiMapPin className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#87be00]" />
                <select
                  value={localId}
                  onChange={(event) => setLocalId(event.target.value)}
                  disabled={!companyId || availableLocales.length === 0 || uploading}
                  className="min-h-12 w-full appearance-none rounded-xl border border-gray-100 bg-gray-50 pl-11 pr-10 text-[10px] font-bold text-gray-700 outline-none focus:border-[#87be00] focus:ring-2 focus:ring-[#87be00]/20 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <option value="">
                    {availableLocales.length === 0
                      ? "Sin locales disponibles"
                      : "Seleccionar local"}
                  </option>
                  {availableLocales.map((local) => (
                    <option key={idOf(local)} value={idOf(local)}>
                      {localLabel(local)}
                    </option>
                  ))}
                </select>
              </div>
              <p className="mt-2 text-[9px] font-medium leading-relaxed text-gray-400">
                Los productos del Excel quedarán disponibles únicamente para el local seleccionado.
              </p>
            </label>

            <label className="block">
              <span className="mb-2 block text-[8px] font-black uppercase tracking-[0.2em] text-gray-400">Archivo Excel</span>
              <input ref={fileInputRef} type="file" accept=".xlsx,.xls" onChange={(event) => setSelectedFile(event.target.files?.[0] ?? null)} className="block w-full rounded-xl border border-dashed border-gray-200 bg-gray-50 p-3 text-[9px] font-bold text-gray-500 file:mr-3 file:rounded-lg file:border-0 file:bg-gray-900 file:px-3 file:py-2 file:text-[8px] file:font-black file:uppercase file:tracking-wider file:text-white" />
            </label>
            <button type="submit" disabled={uploading || !companyId || !localId || !selectedFile} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gray-900 px-4 py-3.5 text-[9px] font-black uppercase tracking-widest text-white transition hover:bg-[#75a700] disabled:cursor-not-allowed disabled:opacity-40">
              <FiUploadCloud />{uploading ? "Procesando..." : "Importar productos"}
            </button>
          </form>

          {lastResult && (
            <div className="mt-5 rounded-2xl border border-green-100 bg-green-50 p-4">
              <p className="flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-green-700"><FiCheckCircle />Última importación</p>
              <div className="mt-3 grid grid-cols-2 gap-2 text-center">
                <div><p className="text-lg font-black text-gray-900">{resultSummary?.total_rows ?? resultSummary?.processed_rows ?? 0}</p><p className="text-[7px] font-black uppercase text-gray-400">Filas</p></div>
                <div><p className="text-lg font-black text-gray-900">{resultSummary?.inserted ?? resultSummary?.inserted_rows ?? 0}</p><p className="text-[7px] font-black uppercase text-gray-400">Nuevos</p></div>
                <div><p className="text-lg font-black text-gray-900">{resultSummary?.updated ?? resultSummary?.updated_rows ?? 0}</p><p className="text-[7px] font-black uppercase text-gray-400">Actualizados</p></div>
                <div><p className="text-lg font-black text-gray-900">{resultSummary?.assigned_to_local ?? 0}</p><p className="text-[7px] font-black uppercase text-gray-400">Asignados al local</p></div>
              </div>
            </div>
          )}
        </aside>
      </section>
    </div>
  );
};

export default RegionalProductCatalog;
