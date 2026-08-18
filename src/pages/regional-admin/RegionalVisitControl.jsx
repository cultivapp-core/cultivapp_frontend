import { Fragment, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  FiAlertCircle,
  FiArrowRight,
  FiCalendar,
  FiCamera,
  FiCheckCircle,
  FiChevronDown,
  FiChevronUp,
  FiClipboard,
  FiClock,
  FiFilter,
  FiMapPin,
  FiPackage,
  FiRefreshCw,
  FiSearch,
  FiUser,
  FiX,
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
  status: "",
  search: "",
};

const STATUS = {
  IN_PROGRESS: {
    label: "En curso",
    badge: "border-blue-200 bg-blue-50 text-blue-700",
  },
  COMPLETED: {
    label: "Completada",
    badge: "border-lime-200 bg-lime-50 text-lime-700",
  },
  CLOSED: {
    label: "Completada",
    badge: "border-lime-200 bg-lime-50 text-lime-700",
  },
};

const formatDate = (value) => {
  if (!value) return "--";
  const date = new Date(`${String(value).slice(0, 10)}T12:00:00`);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleDateString("es-CL", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
};

const formatTime = (value) => {
  if (!value) return "--:--";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "--:--"
    : date.toLocaleTimeString("es-CL", {
        hour: "2-digit",
        minute: "2-digit",
      });
};

const quantity = (value, unit) => {
  const number = Number(value) || 0;
  return unit === "KG"
    ? number.toLocaleString("es-CL", {
        minimumFractionDigits: 3,
        maximumFractionDigits: 3,
      })
    : number.toLocaleString("es-CL", { maximumFractionDigits: 0 });
};

const duration = (start, end) => {
  if (!start || !end) return "En desarrollo";
  const minutes = Math.max(
    0,
    Math.round((new Date(end).getTime() - new Date(start).getTime()) / 60_000),
  );
  if (!Number.isFinite(minutes)) return "--";
  if (minutes < 60) return `${minutes} min`;
  return `${Math.floor(minutes / 60)} h ${minutes % 60} min`;
};

const productDuration = (movement) => {
  const start = movement.management_started_at;
  const end = movement.management_ended_at;

  if (!start || !end) return null;

  const backendSeconds = Number(movement.duration_seconds);
  const calculatedSeconds = Math.floor(
    (new Date(end).getTime() - new Date(start).getTime()) / 1_000,
  );
  const seconds = Number.isFinite(backendSeconds)
    ? backendSeconds
    : calculatedSeconds;

  if (!Number.isFinite(seconds) || seconds < 0) return null;
  if (seconds < 60) return "< 1 min";

  const minutes = Math.ceil(seconds / 60);
  if (minutes < 60) return `${minutes} min`;

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return remainingMinutes > 0
    ? `${hours} h ${remainingMinutes} min`
    : `${hours} h`;
};

const Metric = ({ label, value, icon, tone = "green" }) => {
  const tones = {
    green: "bg-[#87be00]/10 text-[#75a700]",
    blue: "bg-blue-50 text-blue-600",
    lime: "bg-green-50 text-green-600",
    amber: "bg-amber-50 text-amber-600",
  };

  return (
    <article className="flex items-center gap-3 rounded-[1.5rem] border border-gray-100 bg-white p-4 shadow-sm md:p-5">
      <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl md:h-12 md:w-12 ${tones[tone]}`}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-[8px] font-black uppercase tracking-wider text-gray-400 md:text-[9px]">
          {label}
        </p>
        <p className="mt-1 truncate text-lg font-black text-gray-900 md:text-xl">
          {value}
        </p>
      </div>
    </article>
  );
};

const inputClass =
  "h-12 w-full rounded-2xl border border-gray-100 bg-gray-50 px-4 text-xs font-bold text-gray-700 outline-none transition-all focus:border-[#87be00]/50 focus:bg-white focus:ring-4 focus:ring-[#87be00]/10";

const thClass = "px-5 py-4 text-[9px] font-black uppercase tracking-wider";

const RegionalWorkerCell = ({ visit }) => {
  const worker = visit.worker_name || visit.worker_email || "Sin mercaderista";
  const initials = worker
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

  return (
    <div className="flex items-center gap-3">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#87be00] text-xs font-black text-white">
        {initials || "—"}
      </div>
      <div className="min-w-0">
        <p className="truncate text-[11px] font-black text-gray-900">{worker}</p>
        <p className="mt-1 truncate text-[9px] font-bold text-gray-400">
          {visit.worker_rut ? `RUT: ${visit.worker_rut}` : visit.worker_email || "Sin información"}
        </p>
      </div>
    </div>
  );
};

const RegionalVisitDetails = ({ visit }) => {
  const movements = Array.isArray(visit.movements) ? visit.movements : [];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 text-xs font-bold text-gray-500">
        <span className="inline-flex items-center gap-2 rounded-xl bg-white px-3 py-2">
          <FiClock className="text-[#87be00]" /> Inicio {formatTime(visit.started_at)}
        </span>
        <span className="inline-flex items-center gap-2 rounded-xl bg-white px-3 py-2">
          <FiCheckCircle className="text-[#87be00]" /> Término {formatTime(visit.ended_at)}
        </span>
        <span className="inline-flex items-center gap-2 rounded-xl bg-white px-3 py-2">
          <FiPackage className="text-amber-500" /> {visit.movement_count || movements.length} movimientos
        </span>
      </div>

      {movements.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-gray-200 bg-white p-5 text-sm font-semibold text-gray-400">
          La jornada no registra movimientos de productos.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
          {movements.map((movement) => (
            <article key={movement.id} className="rounded-[1.5rem] border border-gray-100 bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[8px] font-black uppercase tracking-wider text-gray-400">
                    {movement.brand_name || "Sin marca"}
                  </p>
                  <p className="mt-1 truncate text-xs font-black text-gray-900">
                    {movement.product_name || movement.sku || "Sin producto"}
                  </p>
                  <p className="mt-1 text-[8px] font-bold uppercase tracking-wider text-gray-400">
                    SKU {movement.sku || "--"}
                  </p>
                </div>
                <span className={`rounded-xl px-3 py-2 text-[8px] font-black uppercase ${movement.movement_type === "WASTE" ? "bg-red-50 text-red-600" : "bg-[#87be00]/10 text-[#6f9d00]"}`}>
                  {movement.movement_type === "WASTE" ? "Merma" : "Reposición"}
                </span>
              </div>

              <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                <div className="rounded-xl bg-gray-50 p-2.5">
                  <p className="text-[8px] font-black uppercase text-gray-400">Cantidad</p>
                  <p className="mt-1 text-sm font-black text-gray-900">
                    {quantity(movement.quantity, movement.unit_type)} {movement.unit_type}
                  </p>
                </div>
                <div className="rounded-xl bg-gray-50 p-2.5">
                  <p className="text-[8px] font-black uppercase text-gray-400">Anterior</p>
                  <p className="mt-1 text-sm font-black text-gray-900">
                    {quantity(movement.stock_before, movement.unit_type)}
                  </p>
                </div>
                <div className="rounded-xl bg-[#87be00]/5 p-2.5">
                  <p className="text-[8px] font-black uppercase text-[#6f9d00]">Saldo</p>
                  <p className="mt-1 text-sm font-black text-[#6f9d00]">
                    {quantity(movement.stock_after, movement.unit_type)}
                  </p>
                </div>
              </div>

              {movement.movement_type === "REPLENISHMENT" && (
                <div className="mt-3 rounded-2xl border border-[#87be00]/15 bg-[#87be00]/5 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="inline-flex items-center gap-2 text-[8px] font-black uppercase tracking-wider text-[#6f9d00]">
                      <FiClock size={12} /> Tiempo de reposición
                    </p>
                    {productDuration(movement) ? (
                      <span className="rounded-lg bg-white px-2.5 py-1 text-[9px] font-black text-[#6f9d00] shadow-sm">
                        {productDuration(movement)}
                      </span>
                    ) : movement.management_started_at ? (
                      <span className="rounded-lg bg-blue-50 px-2.5 py-1 text-[8px] font-black uppercase text-blue-600">
                        Pendiente de foto final
                      </span>
                    ) : (
                      <span className="rounded-lg bg-gray-100 px-2.5 py-1 text-[8px] font-black uppercase text-gray-500">
                        Sin trazabilidad
                      </span>
                    )}
                  </div>

                  {movement.management_started_at && (
                    <div className="mt-2 flex items-center gap-2 text-[9px] font-bold text-gray-500">
                      <span>Inicio {formatTime(movement.management_started_at)}</span>
                      <FiArrowRight className="shrink-0 text-gray-300" />
                      <span>
                        Término {formatTime(movement.management_ended_at)}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {movement.reason && (
                <p className="mt-3 rounded-xl border border-red-100 bg-red-50 p-3 text-xs font-semibold text-red-700">
                  Motivo: {movement.reason}
                </p>
              )}
            </article>
          ))}
        </div>
      )}

      {visit.closing_observation && (
        <div className="rounded-2xl border border-amber-100 bg-amber-50/70 p-4">
          <p className="text-[8px] font-black uppercase tracking-wider text-amber-700">
            Observación de cierre
          </p>
          <p className="mt-2 whitespace-pre-wrap text-xs font-semibold text-gray-700">
            {visit.closing_observation}
          </p>
        </div>
      )}
    </div>
  );
};

const RegionalMobileVisitCard = ({ visit }) => {
  const [open, setOpen] = useState(false);
  const status = STATUS[visit.status] || {
    label: visit.status || "Sin estado",
    badge: "border-gray-200 bg-gray-50 text-gray-600",
  };

  return (
    <article className="overflow-hidden rounded-[2rem] border border-gray-100 bg-white shadow-sm">
      <button type="button" onClick={() => setOpen((current) => !current)} className="w-full p-5 text-left">
        <div className="flex items-start justify-between gap-3">
          <RegionalWorkerCell visit={visit} />
          <span className={`rounded-xl border px-3 py-2 text-[8px] font-black uppercase ${status.badge}`}>
            {status.label}
          </span>
        </div>

        <div className="mt-4 rounded-2xl border border-gray-100 bg-gray-50 p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                <FiClipboard size={14} />
              </div>
              <div className="min-w-0">
                <p className="text-[8px] font-black uppercase tracking-wider text-gray-400">
                  {visit.visit_number || "Sin N° visita"}
                </p>
                <p className="mt-1 truncate text-[10px] font-black text-gray-800">
                  {visit.local_name || "Sin local"}
                </p>
                <p className="mt-1 text-[8px] font-bold text-[#87be00]">
                  {visit.codigo_local || "Sin código"}
                </p>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-3">
              <p className="text-sm font-black text-gray-900">
                {visit.movement_count || 0} <span className="text-[8px] uppercase text-gray-400">mov.</span>
              </p>
              <FiChevronDown className={`text-gray-400 transition-transform ${open ? "rotate-180" : ""}`} size={18} />
            </div>
          </div>
        </div>
      </button>

      {open && (
        <div className="overflow-hidden border-t border-gray-100 bg-gray-50 p-4">
          <RegionalVisitDetails visit={visit} />
        </div>
      )}
    </article>
  );
};

const RegionalVisitControl = () => {
  const [inputs, setInputs] = useState(INITIAL_FILTERS);
  const [filters, setFilters] = useState(INITIAL_FILTERS);
  const [expanded, setExpanded] = useState(null);
  const [showFilters, setShowFilters] = useState(true);

  const { data = [], isLoading, isFetching, error, refetch } = useQuery({
    queryKey: ["regional-admin-journeys", filters],
    queryFn: async () => {
      const response = await regionalInventoryService.getAdminJourneys({
        ...filters,
        limit: 500,
      });
      const rows = unwrapRegionalData(response);
      if (!Array.isArray(rows)) {
        throw new Error("La API regional devolvió un formato inesperado.");
      }
      return rows;
    },
  });

  const metrics = useMemo(
    () => ({
      total: data.length,
      inProgress: data.filter((item) => item.status === "IN_PROGRESS").length,
      completed: data.filter((item) =>
        ["COMPLETED", "CLOSED"].includes(item.status),
      ).length,
      evidence: data.reduce(
        (total, item) => total + (Number(item.evidence_count) || 0),
        0,
      ),
    }),
    [data],
  );

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
    Boolean(inputs.status) ||
    Boolean(inputs.search);

  return (
    <div className="min-h-full w-full bg-gray-50/40 pb-20 font-[Outfit]">
      <header className="border-b border-gray-100 bg-white">
        <div className="mx-auto flex max-w-[1500px] flex-col justify-between gap-5 px-4 py-5 sm:px-6 xl:flex-row xl:items-end md:px-8 md:py-8">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-[#87be00]/10 p-2.5 text-[#87be00]">
              <FiClipboard size={20} />
            </div>
            <div>
              <h1 className="text-3xl font-black leading-none tracking-tight text-gray-900 md:text-5xl">
                Control de visitas
              </h1>
              <p className="mt-2 text-[10px] font-black uppercase tracking-[0.2em] text-[#87be00]">
                Auditoría regional por ruta
              </p>
            </div>
          </div>

          <div className="grid w-full grid-cols-[1fr_auto_auto] gap-2 xl:w-auto">
            <div className="relative min-w-0 sm:min-w-[320px]">
              <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
              <input
                type="search"
                placeholder="Visita, local o mercaderista..."
                value={inputs.search}
                onChange={(event) =>
                  setInputs((current) => ({ ...current, search: event.target.value }))
                }
                className={`${inputClass} pl-11 pr-11`}
              />
              {inputs.search && (
                <button
                  type="button"
                  aria-label="Limpiar búsqueda"
                  onClick={() => setInputs((current) => ({ ...current, search: "" }))}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 transition hover:text-red-500"
                >
                  <FiX size={15} />
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={() => setShowFilters((current) => !current)}
              className={`flex h-12 w-12 items-center justify-center rounded-2xl border transition ${showFilters ? "border-[#87be00] bg-[#87be00] text-white" : "border-gray-100 bg-white text-gray-500 hover:border-[#87be00]/40 hover:text-[#87be00]"}`}
              title="Mostrar filtros"
            >
              <FiFilter size={17} />
            </button>

            <button
              type="button"
              onClick={() => refetch()}
              disabled={isFetching}
              className="flex h-12 w-12 items-center justify-center rounded-2xl border border-gray-100 bg-white text-gray-500 transition hover:border-[#87be00]/40 hover:text-[#87be00] disabled:opacity-50"
              title="Actualizar información"
            >
              <FiRefreshCw className={isFetching ? "animate-spin" : ""} size={17} />
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1500px] space-y-6 px-4 pt-6 sm:px-6 md:px-8">

      {showFilters && (
      <section className="rounded-[2rem] border border-gray-100 bg-white p-4 shadow-sm sm:p-5">
        <div className="mb-5 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#87be00]/10 text-[#75a700]">
            <FiSearch size={18} />
          </div>
          <div>
            <h2 className="text-sm font-black uppercase tracking-wide text-gray-900">
              Filtros y búsqueda
            </h2>
            <p className="mt-1 text-[9px] font-bold uppercase tracking-widest text-gray-400">
              Periodo, estado, visita, local o mercaderista
            </p>
          </div>
        </div>

        <form
          onSubmit={applyFilters}
          className="grid gap-3 md:grid-cols-2 xl:grid-cols-[1fr_1fr_1fr_2fr_auto]"
        >
          <label className="flex flex-col gap-1.5">
            <span className="text-[8px] font-black uppercase tracking-[0.2em] text-gray-400">
              Desde
            </span>
            <input
              type="date"
              value={inputs.start_date}
              onChange={(event) =>
                setInputs((current) => ({ ...current, start_date: event.target.value }))
              }
              className={inputClass}
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-[8px] font-black uppercase tracking-[0.2em] text-gray-400">
              Hasta
            </span>
            <input
              type="date"
              value={inputs.end_date}
              onChange={(event) =>
                setInputs((current) => ({ ...current, end_date: event.target.value }))
              }
              min={inputs.start_date}
              className={inputClass}
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-[8px] font-black uppercase tracking-[0.2em] text-gray-400">
              Estado
            </span>
            <select
              value={inputs.status}
              onChange={(event) =>
                setInputs((current) => ({ ...current, status: event.target.value }))
              }
              className={inputClass}
            >
              <option value="">Todos</option>
              <option value="IN_PROGRESS">En curso</option>
              <option value="COMPLETED">Completadas</option>
            </select>
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-[8px] font-black uppercase tracking-[0.2em] text-gray-400">
              Búsqueda
            </span>
            <div className="relative">
              <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" />
              <input
                value={inputs.search}
                onChange={(event) =>
                  setInputs((current) => ({ ...current, search: event.target.value }))
                }
                placeholder="Visita, local o mercaderista"
                className={`${inputClass} pl-11`}
              />
            </div>
          </label>
          <div className="flex items-end gap-2">
            <button
              type="submit"
              className="h-12 rounded-2xl bg-[#87be00] px-5 text-[9px] font-black uppercase tracking-widest text-white transition hover:bg-[#75a700]"
            >
              Filtrar
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
      )}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Visitas visibles" value={metrics.total} icon={<FiCalendar size={19} />} />
        <Metric label="En curso" value={metrics.inProgress} icon={<FiClock size={19} />} tone="blue" />
        <Metric label="Completadas" value={metrics.completed} icon={<FiCheckCircle size={19} />} tone="lime" />
        <Metric label="Evidencias" value={metrics.evidence} icon={<FiCamera size={19} />} tone="amber" />
      </section>

      {!isLoading && !error && data.length > 0 && (
        <section className="hidden overflow-hidden rounded-[2rem] border border-gray-100 bg-white shadow-sm md:block">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="bg-gray-900 text-white">
                  <th className={thClass}>Mercaderista</th>
                  <th className={thClass}>Visita</th>
                  <th className={thClass}>Punto de venta</th>
                  <th className={`${thClass} text-center`}>Gestión</th>
                  <th className={`${thClass} text-center`}>Movimientos</th>
                  <th className={`${thClass} text-center`}>Detalle</th>
                </tr>
              </thead>
              <tbody>
                {data.map((visit) => {
                  const status = STATUS[visit.status] || {
                    label: visit.status || "Sin estado",
                    badge: "border-gray-200 bg-gray-50 text-gray-600",
                  };
                  const isExpanded = expanded === visit.journey_id;

                  return (
                    <Fragment key={visit.journey_id}>
                      <tr
                        onClick={() => setExpanded(isExpanded ? null : visit.journey_id)}
                        className={`cursor-pointer border-b border-gray-50 transition-colors ${isExpanded ? "bg-gray-50" : "bg-white hover:bg-gray-50/60"}`}
                      >
                        <td className="px-5 py-4">
                          <RegionalWorkerCell visit={visit} />
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex flex-col items-start gap-2">
                            <span className="inline-flex rounded-xl border border-blue-100 bg-blue-50 px-3 py-1.5 text-[9px] font-black text-blue-700">
                              {visit.visit_number || "Sin N°"}
                            </span>
                            <span className={`inline-flex rounded-lg border px-2.5 py-1 text-[8px] font-black uppercase ${status.badge}`}>
                              {status.label}
                            </span>
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <p className="max-w-[230px] truncate text-xs font-black text-gray-800">
                            {visit.local_name || "Sin local"}
                          </p>
                          <p className="mt-1 text-[9px] font-black text-[#87be00]">
                            {visit.codigo_local || "Sin código"}
                          </p>
                          <p className="mt-1 max-w-[250px] truncate text-[8px] font-bold text-gray-400">
                            {visit.direccion || "Dirección no registrada"}
                            {visit.comuna_name ? `, ${visit.comuna_name}` : ""}
                          </p>
                        </td>
                        <td className="px-5 py-4 text-center">
                          <span className="inline-flex items-center gap-2 rounded-xl bg-[#87be00]/10 px-3 py-2 text-[9px] font-black text-[#6f9d00]">
                            <FiClock size={11} /> {duration(visit.started_at, visit.ended_at)}
                          </span>
                          <p className="mt-2 text-[9px] font-bold text-gray-400">
                            {formatDate(visit.journey_date)}
                          </p>
                        </td>
                        <td className="px-5 py-4 text-center">
                          <span className="inline-flex items-center gap-2 rounded-xl bg-amber-50 px-3 py-2 text-[10px] font-black text-amber-700">
                            <FiPackage size={13} /> {visit.movement_count || 0}
                          </span>
                          <p className="mt-2 text-[8px] font-bold uppercase text-gray-400">
                            {visit.evidence_count || 0} evidencias
                          </p>
                        </td>
                        <td className="px-5 py-4 text-center">
                          <span className={`inline-flex rounded-xl border p-3 transition-colors ${isExpanded ? "border-gray-900 bg-gray-900 text-white" : "border-gray-200 bg-white text-gray-400"}`}>
                            <FiChevronDown className={`transition-transform ${isExpanded ? "rotate-180" : ""}`} size={17} />
                          </span>
                        </td>
                      </tr>

                      {isExpanded && (
                        <tr>
                          <td colSpan={6} className="bg-gray-50/80 px-6 py-6">
                            <RegionalVisitDetails visit={visit} />
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {!isLoading && !error && data.length > 0 && (
        <section className="space-y-4 md:hidden">
          {data.map((visit) => (
            <RegionalMobileVisitCard key={visit.journey_id} visit={visit} />
          ))}
        </section>
      )}

      {(isLoading || error || data.length === 0) && (
      <section className="space-y-4">
        {isLoading ? (
          <div className="flex min-h-[280px] items-center justify-center rounded-[2rem] border border-slate-200 bg-white">
            <FiRefreshCw className="animate-spin text-[#87be00]" size={28} />
          </div>
        ) : error ? (
          <div className="flex min-h-[240px] flex-col items-center justify-center rounded-[2rem] border border-red-100 bg-white p-8 text-center">
            <FiAlertCircle className="text-red-500" size={32} />
            <p className="mt-4 font-black text-slate-900">No fue posible cargar las visitas</p>
            <p className="mt-2 text-sm text-slate-500">{error.message}</p>
          </div>
        ) : data.length === 0 ? (
          <div className="flex min-h-[280px] flex-col items-center justify-center rounded-[2rem] border border-dashed border-slate-200 bg-white p-8 text-center">
            <FiCalendar className="text-slate-300" size={34} />
            <p className="mt-4 font-black text-slate-900">Sin visitas regionales</p>
            <p className="mt-2 text-sm text-slate-500">
              No existen jornadas que coincidan con los filtros seleccionados.
            </p>
          </div>
        ) : (
          data.map((visit) => {
            const status = STATUS[visit.status] || {
              label: visit.status || "Sin estado",
              badge: "border-slate-200 bg-slate-50 text-slate-600",
            };
            const movements = Array.isArray(visit.movements) ? visit.movements : [];
            const isExpanded = expanded === visit.journey_id;

            return (
              <article
                key={visit.journey_id}
                className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm"
              >
                <div className="grid gap-5 p-6 lg:grid-cols-[1.4fr_1fr_auto] lg:items-center">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`rounded-lg border px-2.5 py-1 text-[9px] font-black uppercase ${status.badge}`}>
                        {status.label}
                      </span>
                      <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-[9px] font-black uppercase text-slate-600">
                        {visit.visit_number}
                      </span>
                    </div>
                    <h2 className="mt-3 text-xl font-black text-slate-950">
                      {visit.local_name}
                    </h2>
                    <p className="mt-2 flex items-center gap-2 text-sm font-semibold text-slate-500">
                      <FiMapPin /> {visit.direccion || "Dirección no registrada"}
                      {visit.comuna_name ? `, ${visit.comuna_name}` : ""}
                    </p>
                    <p className="mt-2 flex items-center gap-2 text-sm font-semibold text-slate-500">
                      <FiUser /> {visit.worker_name || visit.worker_email}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="rounded-2xl bg-slate-50 p-3">
                      <p className="text-[8px] font-black uppercase tracking-widest text-slate-400">Fecha</p>
                      <p className="mt-1 font-black text-slate-800">{formatDate(visit.journey_date)}</p>
                    </div>
                    <div className="rounded-2xl bg-slate-50 p-3">
                      <p className="text-[8px] font-black uppercase tracking-widest text-slate-400">Duración</p>
                      <p className="mt-1 font-black text-slate-800">{duration(visit.started_at, visit.ended_at)}</p>
                    </div>
                    <div className="rounded-2xl bg-lime-50 p-3">
                      <p className="text-[8px] font-black uppercase tracking-widest text-lime-600">Repuesto</p>
                      <p className="mt-1 font-black text-slate-800">
                        {quantity(visit.replenished_un, "UN")} UN · {quantity(visit.replenished_kg, "KG")} KG
                      </p>
                    </div>
                    <div className="rounded-2xl bg-amber-50 p-3">
                      <p className="text-[8px] font-black uppercase tracking-widest text-amber-600">Evidencias</p>
                      <p className="mt-1 font-black text-slate-800">{visit.evidence_count}</p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setExpanded(isExpanded ? null : visit.journey_id)}
                    className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl border border-slate-200 px-5 text-[10px] font-black uppercase text-slate-700 hover:border-[#87be00] hover:text-[#74a900]"
                  >
                    Detalle {isExpanded ? <FiChevronUp /> : <FiChevronDown />}
                  </button>
                </div>

                {isExpanded && (
                  <div className="border-t border-slate-100 bg-slate-50/70 p-6">
                    <div className="mb-4 flex flex-wrap gap-3 text-xs font-bold text-slate-500">
                      <span className="inline-flex items-center gap-2"><FiClock /> Inicio {formatTime(visit.started_at)}</span>
                      <span className="inline-flex items-center gap-2"><FiCheckCircle /> Término {formatTime(visit.ended_at)}</span>
                      <span className="inline-flex items-center gap-2"><FiPackage /> {visit.movement_count} movimientos</span>
                    </div>
                    {movements.length === 0 ? (
                      <p className="rounded-2xl bg-white p-5 text-sm font-semibold text-slate-500">
                        La jornada no registra movimientos de productos.
                      </p>
                    ) : (
                      <div className="grid gap-3 lg:grid-cols-2">
                        {movements.map((movement) => (
                          <div key={movement.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <p className="text-sm font-black text-slate-900">
                                  {movement.product_name || movement.sku}
                                </p>
                                <p className="mt-1 text-[9px] font-black uppercase tracking-wider text-slate-400">
                                  {movement.brand_name || "Sin marca"} · SKU {movement.sku || "--"}
                                </p>
                              </div>
                              <span className={`rounded-lg px-2.5 py-1 text-[8px] font-black uppercase ${
                                movement.movement_type === "WASTE"
                                  ? "bg-red-50 text-red-600"
                                  : "bg-lime-50 text-lime-700"
                              }`}>
                                {movement.movement_type === "WASTE" ? "Merma" : "Reposición"}
                              </span>
                            </div>
                            <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                              <div className="rounded-xl bg-slate-50 p-2">
                                <p className="text-[8px] font-black uppercase text-slate-400">Cantidad</p>
                                <p className="mt-1 text-sm font-black">{quantity(movement.quantity, movement.unit_type)} {movement.unit_type}</p>
                              </div>
                              <div className="rounded-xl bg-slate-50 p-2">
                                <p className="text-[8px] font-black uppercase text-slate-400">Anterior</p>
                                <p className="mt-1 text-sm font-black">{quantity(movement.stock_before, movement.unit_type)}</p>
                              </div>
                              <div className="rounded-xl bg-slate-50 p-2">
                                <p className="text-[8px] font-black uppercase text-slate-400">Saldo</p>
                                <p className="mt-1 text-sm font-black text-[#74a900]">{quantity(movement.stock_after, movement.unit_type)}</p>
                              </div>
                            </div>
                            {movement.reason && (
                              <p className="mt-3 rounded-xl bg-red-50 p-3 text-xs font-semibold text-red-700">
                                Motivo: {movement.reason}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                    {visit.closing_observation && (
                      <p className="mt-4 rounded-2xl border border-slate-200 bg-white p-4 text-sm font-semibold text-slate-600">
                        <strong className="text-slate-900">Observación de cierre:</strong>{" "}
                        {visit.closing_observation}
                      </p>
                    )}
                  </div>
                )}
              </article>
            );
          })
        )}
      </section>
      )}
      </main>
    </div>
  );
};

export default RegionalVisitControl;