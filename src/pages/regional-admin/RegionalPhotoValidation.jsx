import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import JSZip from "jszip";
import toast from "react-hot-toast";
import {
  FiAlertCircle,
  FiCalendar,
  FiCamera,
  FiDownload,
  FiExternalLink,
  FiImage,
  FiMapPin,
  FiRefreshCw,
  FiSearch,
  FiUser,
} from "react-icons/fi";
import regionalInventoryService, {
  unwrapRegionalData,
} from "../../services/regionalInventoryService";

const localISODate = (offsetDays = 0) => {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().split("T")[0];
};

const INITIAL_FILTERS = {
  start_date: localISODate(-30),
  end_date: localISODate(),
  evidence_type: "",
  search: "",
};

const EVIDENCE_LABELS = {
  JOURNEY_START: "Inicio de jornada",
  BEFORE_REPLENISHMENT: "Góndola inicial",
  AFTER_REPLENISHMENT: "Góndola final",
  WASTE: "Evidencia de merma",
  JOURNEY_END: "Cierre de jornada",
};

const EVIDENCE_STYLES = {
  JOURNEY_START: "bg-blue-50 text-blue-700",
  BEFORE_REPLENISHMENT: "bg-amber-50 text-amber-700",
  AFTER_REPLENISHMENT: "bg-lime-50 text-lime-700",
  WASTE: "bg-red-50 text-red-700",
  JOURNEY_END: "bg-slate-100 text-slate-700",
};

const safeName = (value, fallback = "sin-dato") =>
  String(value || fallback)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9_-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "") || fallback;

const formatDateTime = (value) => {
  if (!value) return "--";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleString("es-CL", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
};

const extensionFrom = (item) => {
  const byMime = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/heic": "heic",
    "image/heif": "heif",
  };
  if (byMime[item.mime_type]) return byMime[item.mime_type];
  const cleanUrl = String(item.file_url || "").split("?")[0];
  const extension = cleanUrl.split(".").pop()?.toLowerCase();
  return extension && extension.length <= 5 ? extension : "jpg";
};

const inputClass =
  "h-12 w-full rounded-2xl border border-gray-100 bg-gray-50 px-4 text-xs font-bold text-gray-700 outline-none transition-all focus:border-[#87be00]/50 focus:bg-white focus:ring-4 focus:ring-[#87be00]/10";

const RegionalPhotoValidation = () => {
  const [inputs, setInputs] = useState(INITIAL_FILTERS);
  const [filters, setFilters] = useState(INITIAL_FILTERS);
  const [downloading, setDownloading] = useState(null);

  const { data = [], isLoading, isFetching, error, refetch } = useQuery({
    queryKey: ["regional-admin-evidence", filters],
    queryFn: async () => {
      const response = await regionalInventoryService.getAdminEvidence({
        ...filters,
        limit: 1000,
      });
      const rows = unwrapRegionalData(response);
      if (!Array.isArray(rows)) {
        throw new Error("La API regional devolvió un formato inesperado.");
      }
      return rows;
    },
  });

  const groups = useMemo(() => {
    const map = new Map();

    data.forEach((evidence) => {
      if (!map.has(evidence.journey_id)) {
        map.set(evidence.journey_id, {
          journey_id: evidence.journey_id,
          visit_number: evidence.visit_number,
          journey_date: evidence.journey_date,
          status: evidence.status,
          worker_name: evidence.worker_name,
          worker_email: evidence.worker_email,
          worker_rut: evidence.worker_rut,
          local_name: evidence.local_name,
          codigo_local: evidence.codigo_local,
          direccion: evidence.direccion,
          comuna_name: evidence.comuna_name,
          company_name: evidence.company_name,
          captured_at: evidence.captured_at,
          evidence: [],
        });
      }

      map.get(evidence.journey_id).evidence.push(evidence);
    });

    return [...map.values()].sort((a, b) =>
      String(b.captured_at || "").localeCompare(String(a.captured_at || "")),
    );
  }, [data]);

  const applyFilters = (event) => {
    event.preventDefault();
    setFilters({
      ...inputs,
      search: inputs.search.trim(),
    });
  };

  const clearFilters = () => {
    setInputs(INITIAL_FILTERS);
    setFilters(INITIAL_FILTERS);
  };

  const hasFilters =
    inputs.start_date !== INITIAL_FILTERS.start_date ||
    inputs.end_date !== INITIAL_FILTERS.end_date ||
    Boolean(inputs.evidence_type) ||
    Boolean(inputs.search);

  const downloadVisit = async (group) => {
    setDownloading(group.journey_id);
    const toastId = toast.loading("Preparando evidencias...");

    try {
      const zip = new JSZip();
      let saved = 0;

      await Promise.all(
        group.evidence.map(async (item, index) => {
          if (!item.file_url) return;
          const response = await fetch(item.file_url);
          if (!response.ok) return;
          const blob = await response.blob();
          const label = safeName(EVIDENCE_LABELS[item.evidence_type], "evidencia");
          const product = item.product_name
            ? `-${safeName(item.product_name)}`
            : "";
          zip.file(
            `${String(index + 1).padStart(2, "0")}-${label}${product}.${extensionFrom(item)}`,
            blob,
          );
          saved += 1;
        }),
      );

      if (!saved) throw new Error("No fue posible descargar las imágenes.");

      const content = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(content);
      const link = document.createElement("a");
      link.href = url;
      link.download = `evidencias-${safeName(group.codigo_local)}-${safeName(group.visit_number)}.zip`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      toast.success(`${saved} evidencia(s) descargada(s)`, { id: toastId });
    } catch (downloadError) {
      toast.error(downloadError.message || "No fue posible descargar las evidencias.", {
        id: toastId,
      });
    } finally {
      setDownloading(null);
    }
  };

  return (
    <div className="min-h-full w-full bg-gray-50/40 pb-20 font-[Outfit]">
      <header className="border-b border-gray-100 bg-white">
        <div className="mx-auto flex max-w-[1500px] flex-col justify-between gap-5 px-4 py-5 sm:px-6 sm:flex-row sm:items-end md:px-8 md:py-8">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-[#87be00]/10 p-2.5 text-[#87be00]">
              <FiCamera size={20} />
            </div>
            <div>
              <h1 className="text-3xl font-black leading-none tracking-tight text-gray-900 md:text-5xl">
                Evidencias regionales
              </h1>
              <p className="mt-2 text-[10px] font-black uppercase tracking-[0.2em] text-[#87be00]">
                Validación de ejecución
              </p>
            </div>
          </div>

          <div className="flex w-full items-stretch gap-2 sm:w-auto">
            <div className="min-w-28 flex-1 rounded-xl border border-gray-100 bg-white px-4 py-3 shadow-sm">
              <p className="text-[8px] font-black uppercase tracking-wider text-gray-400">
                Visitas
              </p>
              <p className="mt-1 text-xl font-black text-gray-900">{groups.length}</p>
            </div>
            <div className="min-w-28 flex-1 rounded-xl border border-gray-100 bg-white px-4 py-3 shadow-sm">
              <p className="text-[8px] font-black uppercase tracking-wider text-gray-400">
                Fotografías
              </p>
              <p className="mt-1 text-xl font-black text-gray-900">{data.length}</p>
            </div>
            <button
              type="button"
              onClick={() => refetch()}
              disabled={isFetching}
              className="flex w-12 shrink-0 items-center justify-center rounded-xl border border-gray-100 bg-white text-gray-400 shadow-sm transition hover:border-[#87be00]/40 hover:text-[#87be00] disabled:opacity-50"
              title="Actualizar evidencias"
            >
              <FiRefreshCw className={isFetching ? "animate-spin" : ""} size={17} />
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1500px] space-y-6 px-4 pt-6 sm:px-6 md:px-8">
        <section className="rounded-[2rem] border border-gray-100 bg-white p-4 shadow-sm sm:p-5">
          <form
            onSubmit={applyFilters}
            className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-[1fr_1fr_1.2fr_2fr_auto]"
          >
            <label className="block">
              <span className="mb-2 ml-1 block text-[9px] font-black uppercase tracking-wider text-gray-500">
                Desde
              </span>
              <div className="relative">
                <FiCalendar className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                <input
                  type="date"
                  value={inputs.start_date}
                  onChange={(event) =>
                    setInputs((current) => ({ ...current, start_date: event.target.value }))
                  }
                  className={`${inputClass} pl-11`}
                />
              </div>
            </label>

            <label className="block">
              <span className="mb-2 ml-1 block text-[9px] font-black uppercase tracking-wider text-gray-500">
                Hasta
              </span>
              <div className="relative">
                <FiCalendar className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                <input
                  type="date"
                  min={inputs.start_date}
                  value={inputs.end_date}
                  onChange={(event) =>
                    setInputs((current) => ({ ...current, end_date: event.target.value }))
                  }
                  className={`${inputClass} pl-11`}
                />
              </div>
            </label>

            <label className="block">
              <span className="mb-2 ml-1 block text-[9px] font-black uppercase tracking-wider text-gray-500">
                Tipo de evidencia
              </span>
              <div className="relative">
                <FiImage className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                <select
                  value={inputs.evidence_type}
                  onChange={(event) =>
                    setInputs((current) => ({ ...current, evidence_type: event.target.value }))
                  }
                  className={`${inputClass} pl-11`}
                >
                  <option value="">Todas las evidencias</option>
                  {Object.entries(EVIDENCE_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
            </label>

            <label className="block">
              <span className="mb-2 ml-1 block text-[9px] font-black uppercase tracking-wider text-gray-500">
                Búsqueda
              </span>
              <div className="relative">
                <FiSearch className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                <input
                  type="search"
                  value={inputs.search}
                  onChange={(event) =>
                    setInputs((current) => ({ ...current, search: event.target.value }))
                  }
                  placeholder="Visita, local, usuario o producto"
                  className={`${inputClass} pl-11`}
                />
              </div>
            </label>

            <div className="flex items-end">
              <button
                type="submit"
                disabled={isFetching}
                className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#87be00] px-5 text-[9px] font-black uppercase tracking-widest text-white transition hover:bg-[#75a700] disabled:opacity-50 xl:w-auto"
              >
                {isFetching && <FiRefreshCw className="animate-spin" size={14} />}
                {isFetching ? "Aplicando..." : "Aplicar"}
              </button>
            </div>
          </form>

          {hasFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className="mt-4 rounded-xl border border-gray-100 bg-gray-50 px-4 py-2.5 text-[9px] font-black uppercase tracking-wider text-gray-500 transition hover:bg-gray-900 hover:text-white"
            >
              Limpiar filtros
            </button>
          )}
        </section>

        {isLoading ? (
          <div className="flex min-h-[280px] flex-col items-center justify-center gap-4 text-gray-400">
            <FiRefreshCw className="animate-spin text-[#87be00]" size={30} />
            <p className="text-[10px] font-black uppercase tracking-wider">
              Cargando evidencias...
            </p>
          </div>
        ) : error ? (
          <section className="rounded-[2rem] border border-dashed border-gray-200 bg-white px-6 py-14 text-center shadow-sm">
            <FiAlertCircle className="mx-auto text-red-400" size={28} />
            <h2 className="mt-4 text-lg font-black text-gray-800">
              No se pudieron cargar las evidencias
            </h2>
            <p className="mx-auto mt-2 max-w-xl text-sm text-gray-400">{error.message}</p>
            <button
              type="button"
              onClick={() => refetch()}
              className="mt-5 inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-gray-100 bg-gray-50 px-4 text-[9px] font-black uppercase tracking-wider text-gray-600 transition hover:bg-gray-900 hover:text-white"
            >
              <FiRefreshCw size={14} />
              Intentar nuevamente
            </button>
          </section>
        ) : groups.length === 0 ? (
          <section className="rounded-[2rem] border border-dashed border-gray-200 bg-white px-6 py-14 text-center shadow-sm">
            <FiAlertCircle className="mx-auto text-gray-300" size={28} />
            <h2 className="mt-4 text-lg font-black text-gray-800">
              Sin información disponible
            </h2>
            <p className="mx-auto mt-2 max-w-xl text-sm text-gray-400">
              No existen evidencias para el rango de fechas y los filtros seleccionados.
            </p>
          </section>
        ) : (
          <section className="space-y-6">
            {groups.map((group) => (
              <article
                key={group.journey_id}
                className="overflow-hidden rounded-[2rem] border border-gray-100 bg-white shadow-sm"
              >
                <header className="flex flex-col justify-between gap-4 border-b border-gray-100 bg-gray-50/50 p-5 md:flex-row md:items-center md:p-6">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-sm font-black text-gray-900 md:text-base">
                        {group.local_name || "Local sin nombre"}
                      </h2>
                      <span className="rounded-full bg-[#87be00]/10 px-2.5 py-1 text-[8px] font-black uppercase tracking-wider text-[#6f9d00]">
                        {group.codigo_local || "Sin código"}
                      </span>
                      <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[8px] font-black uppercase tracking-wider text-blue-700">
                        {group.visit_number || "Sin N° visita"}
                      </span>
                    </div>

                    <p className="mt-2 text-[9px] font-bold uppercase text-gray-400">
                      {group.worker_name || group.worker_email || "Sin mercaderista"} ·{" "}
                      {group.evidence.length} foto{group.evidence.length === 1 ? "" : "s"}
                      {group.company_name ? ` · ${group.company_name}` : ""}
                    </p>

                    {(group.direccion || group.comuna_name) && (
                      <p className="mt-1 flex items-center gap-1.5 text-[9px] font-bold text-gray-400">
                        <FiMapPin size={11} />
                        {[group.direccion, group.comuna_name].filter(Boolean).join(", ")}
                      </p>
                    )}

                    <p
                      className="mt-2 max-w-xl truncate font-mono text-[8px] text-gray-400 select-all"
                      title={group.journey_id}
                    >
                      ID visita: {group.journey_id}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => downloadVisit(group)}
                    disabled={downloading === group.journey_id}
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-gray-100 bg-white px-4 text-[9px] font-black uppercase tracking-wider text-gray-600 transition hover:bg-gray-900 hover:text-white disabled:opacity-50"
                  >
                    {downloading === group.journey_id ? (
                      <FiRefreshCw className="animate-spin" size={14} />
                    ) : (
                      <FiDownload size={14} />
                    )}
                    {downloading === group.journey_id ? "Empaquetando..." : "Descargar visita"}
                  </button>
                </header>

                <div className="grid grid-cols-1 gap-5 p-5 sm:grid-cols-2 md:p-6 lg:grid-cols-3 xl:grid-cols-4">
                  {group.evidence.map((item) => (
                    <article
                      key={item.evidence_id}
                      className="flex flex-col overflow-hidden rounded-[1.5rem] border border-gray-100 bg-white transition-shadow hover:shadow-lg"
                    >
                      <div className="relative aspect-[4/3] overflow-hidden bg-gray-100">
                        {item.file_url ? (
                          <img
                            src={item.file_url}
                            alt={EVIDENCE_LABELS[item.evidence_type] || "Evidencia regional"}
                            loading="lazy"
                            className="h-full w-full object-cover transition-transform duration-500 hover:scale-105"
                          />
                        ) : (
                          <div className="flex h-full w-full flex-col items-center justify-center text-gray-300">
                            <FiImage size={30} />
                            <span className="mt-2 text-[9px] font-black uppercase">Sin imagen</span>
                          </div>
                        )}

                        <div className="absolute left-3 right-3 top-3 flex items-start gap-2">
                          <span className="max-w-full truncate rounded-full bg-black/80 px-3 py-1.5 text-[8px] font-black uppercase text-[#a8db29]">
                            {item.product_name || EVIDENCE_LABELS[item.evidence_type] || "Evidencia"}
                          </span>
                          <span className={`shrink-0 rounded-full px-2.5 py-1.5 text-[8px] font-black uppercase ${EVIDENCE_STYLES[item.evidence_type] || "bg-white/90 text-gray-700"}`}>
                            {EVIDENCE_LABELS[item.evidence_type] || item.evidence_type}
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-1 flex-col p-4">
                        <p className="truncate text-sm font-black text-gray-900">
                          {item.product_name || "Evidencia de jornada"}
                        </p>
                        <p className="mt-1 truncate text-[9px] font-black uppercase tracking-wider text-gray-400">
                          {item.brand_name || (item.product_name ? "Sin marca" : group.local_name)}
                        </p>

                        {item.movement_quantity && (
                          <p className="mt-3 rounded-xl bg-gray-50 p-2.5 text-xs font-bold text-gray-600">
                            {item.movement_type === "WASTE" ? "Merma" : "Reposición"}: {Number(item.movement_quantity).toLocaleString("es-CL", { maximumFractionDigits: 3 })} {item.movement_unit_type}
                          </p>
                        )}

                        <div className="mt-auto flex gap-2 pt-4">
                          <a
                            href={item.file_url || undefined}
                            target="_blank"
                            rel="noreferrer"
                            aria-disabled={!item.file_url}
                            className={`flex h-10 flex-1 items-center justify-center rounded-xl border transition-colors ${item.file_url ? "border-gray-100 bg-gray-50 text-gray-500 hover:bg-gray-900 hover:text-white" : "pointer-events-none border-gray-100 bg-gray-50 text-gray-300"}`}
                            title="Abrir fotografía"
                          >
                            <FiExternalLink size={15} />
                          </a>
                          <a
                            href={item.file_url || undefined}
                            download={item.file_url ? `evidencia-${item.evidence_id}.${extensionFrom(item)}` : undefined}
                            aria-disabled={!item.file_url}
                            className={`flex h-10 flex-1 items-center justify-center rounded-xl border transition-colors ${item.file_url ? "border-gray-100 bg-gray-50 text-gray-500 hover:border-[#87be00] hover:bg-[#87be00] hover:text-white" : "pointer-events-none border-gray-100 bg-gray-50 text-gray-300"}`}
                            title="Descargar fotografía"
                          >
                            <FiDownload size={15} />
                          </a>
                        </div>

                        <p className="mt-3 text-[8px] font-bold text-gray-400">
                          {formatDateTime(item.captured_at)}
                        </p>
                      </div>
                    </article>
                  ))}
                </div>
              </article>
            ))}
          </section>
        )}
      </main>
    </div>
  );
};

export default RegionalPhotoValidation;