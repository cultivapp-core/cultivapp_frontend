import { useEffect, useState } from "react";
import { FiAlertTriangle, FiMapPin, FiRefreshCw } from "react-icons/fi";
import regionalInventoryService from "../../services/regionalInventoryService";

const getRows = (response) => {
  const payload = response?.data ?? response;
  if (Array.isArray(payload)) return payload;
  return payload?.locales ?? payload?.locals ?? payload?.items ?? [];
};

const RegionalWorkerLocales = () => {
  const [locales, setLocales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadLocales = async () => {
    try {
      setLoading(true);
      setError("");
      const response = await regionalInventoryService.getMercaderistaLocales();
      setLocales(getRows(response));
    } catch (requestError) {
      setError(requestError?.data?.message ?? requestError?.message ?? "No fue posible cargar tus locales regionales.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLocales();
  }, []);

  return (
    <div className="min-h-full bg-slate-50 px-4 pb-24 pt-4 sm:px-5 md:pb-8">
      <div className="mx-auto w-full max-w-[760px] space-y-4">
        <header className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-[8px] font-black uppercase tracking-[0.2em] text-[#87be00]">Inventario regional</p>
          <div className="mt-2 flex items-end justify-between gap-4">
            <div><h1 className="text-2xl font-black tracking-tight text-slate-900">Mis locales</h1><p className="mt-2 text-sm text-slate-500">Puntos de venta habilitados para tu gestión de inventario.</p></div>
            <button type="button" onClick={loadLocales} disabled={loading} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-slate-500 transition hover:text-[#87be00]"><FiRefreshCw className={loading ? "animate-spin" : ""} /></button>
          </div>
        </header>

        {error && <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-600"><FiAlertTriangle className="mt-0.5 shrink-0" />{error}</div>}

        {loading ? (
          <div className="flex min-h-52 items-center justify-center"><FiRefreshCw className="animate-spin text-[#87be00]" size={28} /></div>
        ) : locales.length === 0 ? (
          <div className="rounded-[2rem] border border-slate-200 bg-white p-8 text-center"><FiMapPin className="mx-auto text-slate-300" size={30} /><p className="mt-4 text-sm font-black text-slate-700">Sin locales asignados</p><p className="mt-2 text-xs text-slate-400">Solicita una asignación activa al Administrador Regional.</p></div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {locales.map((local) => (
              <article key={local?.id ?? local?.local_id} className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-start gap-3"><div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#87be00]/10 text-[#87be00]"><FiMapPin size={20} /></div><div className="min-w-0"><p className="text-[8px] font-black uppercase tracking-wider text-[#87be00]">{local?.codigo_local ?? local?.local_code ?? "Local"}</p><h2 className="mt-1 truncate text-base font-black text-slate-900">{local?.local_name ?? local?.nombre_local ?? local?.name ?? "Punto de venta"}</h2><p className="mt-2 text-[9px] font-bold uppercase tracking-wider text-slate-400">{local?.region_name ?? local?.region ?? "Región no informada"}</p><p className="mt-1 text-xs text-slate-500">{local?.comuna ?? local?.address ?? local?.direccion ?? ""}</p></div></div>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default RegionalWorkerLocales;