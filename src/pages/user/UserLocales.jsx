import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  FiAlertCircle,
  FiCheckCircle,
  FiClock,
  FiHash,
  FiMapPin,
  FiNavigation,
  FiPhone,
  FiRefreshCw,
  FiSearch,
  FiUser,
  FiX,
} from "react-icons/fi";
import toast from "react-hot-toast";

import api from "../../api/apiClient";

const STATUS_CONFIG = {
  PENDING: {
    label: "Pendiente",
    badge:
      "border-amber-100 bg-amber-50 text-amber-600",
    bar: "bg-amber-400",
    dot: "bg-amber-400",
  },
  PENDIENTE: {
    label: "Pendiente",
    badge:
      "border-amber-100 bg-amber-50 text-amber-600",
    bar: "bg-amber-400",
    dot: "bg-amber-400",
  },
  IN_PROGRESS: {
    label: "En curso",
    badge:
      "border-blue-100 bg-blue-50 text-blue-600",
    bar: "bg-blue-500",
    dot: "bg-blue-500",
  },
  EN_PROCESO: {
    label: "En curso",
    badge:
      "border-blue-100 bg-blue-50 text-blue-600",
    bar: "bg-blue-500",
    dot: "bg-blue-500",
  },
  COMPLETED: {
    label: "Completado",
    badge:
      "border-[#87be00]/20 bg-[#87be00]/10 text-[#87be00]",
    bar: "bg-[#87be00]",
    dot: "bg-[#87be00]",
  },
  FINALIZADO: {
    label: "Completado",
    badge:
      "border-[#87be00]/20 bg-[#87be00]/10 text-[#87be00]",
    bar: "bg-[#87be00]",
    dot: "bg-[#87be00]",
  },
};

const normalizeText = (value) =>
  String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();

const extractRows = (response) => {
  if (Array.isArray(response)) {
    return response;
  }

  if (Array.isArray(response?.locales)) {
    return response.locales;
  }

  if (Array.isArray(response?.data)) {
    return response.data;
  }

  if (Array.isArray(response?.data?.locales)) {
    return response.data.locales;
  }

  if (Array.isArray(response?.rows)) {
    return response.rows;
  }

  return [];
};

const hasUsefulValue = (value) => {
  const normalized = normalizeText(value);

  return (
    normalized !== "" &&
    normalized !== "sin informacion" &&
    normalized !== "sin información" &&
    normalized !== "null" &&
    normalized !== "undefined"
  );
};

const UserLocales = () => {
  const [locales, setLocales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] =
    useState(false);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] =
    useState("");

  const fetchMyLocales = useCallback(
    async ({ silent = false } = {}) => {
      try {
        if (silent) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

        setError(null);

        const response = await api.get(
          "/locales/my-assigned",
        );

        setLocales(extractRows(response));
      } catch (requestError) {
        console.error(
          "Error cargando locales asignados:",
          requestError,
        );

        setLocales([]);

        const message =
          requestError?.response?.data?.message ??
          requestError?.data?.message ??
          requestError?.message ??
          "No se pudieron cargar tus locales.";

        setError(message);
        toast.error(message);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [],
  );

  useEffect(() => {
    fetchMyLocales();
  }, [fetchMyLocales]);

  const filteredLocales = useMemo(() => {
    const normalizedSearch =
      normalizeText(searchTerm);

    if (!normalizedSearch) {
      return locales;
    }

    return locales.filter((local) => {
      const searchableValues = [
        local?.cadena,
        local?.direccion,
        local?.codigo_local,
        local?.comuna_name,
        local?.comuna,
        local?.contacto_nombre,
      ];

      return searchableValues.some((value) =>
        normalizeText(value).includes(
          normalizedSearch,
        ),
      );
    });
  }, [locales, searchTerm]);

  const summary = useMemo(
    () =>
      locales.reduce(
        (result, local) => {
          const status = String(
            local?.status || "PENDING",
          ).toUpperCase();

          if (
            status === "COMPLETED" ||
            status === "FINALIZADO"
          ) {
            result.completed += 1;
          } else if (
            status === "IN_PROGRESS" ||
            status === "EN_PROCESO"
          ) {
            result.inProgress += 1;
          } else {
            result.pending += 1;
          }

          return result;
        },
        {
          pending: 0,
          inProgress: 0,
          completed: 0,
        },
      ),
    [locales],
  );

  const todayLabel =
    new Date().toLocaleDateString("es-CL", {
      weekday: "long",
      day: "numeric",
      month: "long",
    });

  if (loading) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center bg-slate-50 px-4">
        <div className="flex flex-col items-center gap-4">
          <div className="h-11 w-11 animate-spin rounded-full border-4 border-slate-100 border-t-[#87be00]" />

          <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">
            Sincronizando locales
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-slate-50 px-4 pb-[calc(6rem+env(safe-area-inset-bottom))] pt-5 font-[Outfit] sm:px-5 md:px-6 md:pb-10">
      <div className="mx-auto flex w-full max-w-[880px] flex-col gap-5">
        {/* ENCABEZADO */}
        <header className="rounded-[2rem] bg-slate-900 p-5 text-white shadow-xl shadow-slate-900/10">
          <div className="flex items-start justify-between gap-4">
            <div className="flex min-w-0 items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-[#a8d52c]">
                <FiMapPin size={20} />
              </div>

              <div className="min-w-0">
                <p className="text-[9px] font-black uppercase tracking-[0.22em] text-[#a8d52c]">
                  Puntos de venta
                </p>

                <h1 className="mt-1 text-2xl font-black tracking-tight">
                  Mis locales
                </h1>

                <p className="mt-2 text-sm capitalize text-slate-400">
                  Ruta de hoy — {todayLabel}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() =>
                fetchMyLocales({
                  silent: true,
                })
              }
              disabled={refreshing}
              aria-label="Actualizar locales"
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-white transition hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <FiRefreshCw
                size={17}
                className={
                  refreshing
                    ? "animate-spin"
                    : ""
                }
              />
            </button>
          </div>

          <div className="mt-5 grid grid-cols-4 gap-2">
            <div className="rounded-2xl bg-white/5 p-3">
              <p className="text-xl font-black text-white">
                {locales.length}
              </p>

              <p className="mt-1 text-[7px] font-black uppercase tracking-wider text-slate-400">
                Total
              </p>
            </div>

            <div className="rounded-2xl bg-white/5 p-3">
              <p className="text-xl font-black text-amber-400">
                {summary.pending}
              </p>

              <p className="mt-1 text-[7px] font-black uppercase tracking-wider text-slate-400">
                Pendientes
              </p>
            </div>

            <div className="rounded-2xl bg-white/5 p-3">
              <p className="text-xl font-black text-blue-400">
                {summary.inProgress}
              </p>

              <p className="mt-1 text-[7px] font-black uppercase tracking-wider text-slate-400">
                En curso
              </p>
            </div>

            <div className="rounded-2xl bg-white/5 p-3">
              <p className="text-xl font-black text-[#a8d52c]">
                {summary.completed}
              </p>

              <p className="mt-1 text-[7px] font-black uppercase tracking-wider text-slate-400">
                Listos
              </p>
            </div>
          </div>
        </header>

        {/* BUSCADOR */}
        <section className="rounded-[2rem] border border-slate-200 bg-white p-4 shadow-sm">
          <div className="relative">
            <FiSearch
              className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
              size={17}
            />

            <input
              type="search"
              value={searchTerm}
              onChange={(event) =>
                setSearchTerm(
                  event.target.value,
                )
              }
              placeholder="Buscar cadena, dirección, comuna o código"
              className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 pl-12 pr-12 text-[10px] font-black uppercase text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-[#87be00]/50 focus:bg-white focus:ring-4 focus:ring-[#87be00]/10"
            />

            {searchTerm && (
              <button
                type="button"
                onClick={() =>
                  setSearchTerm("")
                }
                aria-label="Limpiar búsqueda"
                className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-900"
              >
                <FiX size={16} />
              </button>
            )}
          </div>

          <div className="mt-3 flex items-center justify-between px-1">
            <p className="text-[8px] font-black uppercase tracking-wider text-slate-400">
              {searchTerm
                ? `${filteredLocales.length} resultados`
                : `${locales.length} locales asignados`}
            </p>

            {refreshing && (
              <span className="inline-flex items-center gap-1.5 text-[8px] font-black uppercase tracking-wider text-[#87be00]">
                <FiRefreshCw
                  size={11}
                  className="animate-spin"
                />
                Actualizando
              </span>
            )}
          </div>
        </section>

        {error && (
          <section className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-100 text-red-500">
              <FiAlertCircle size={18} />
            </div>

            <div className="min-w-0 flex-1">
              <p className="text-[9px] font-black uppercase tracking-wider text-red-700">
                Error al cargar locales
              </p>

              <p className="mt-1 text-sm text-red-600">
                {error}
              </p>

              <button
                type="button"
                onClick={() =>
                  fetchMyLocales()
                }
                className="mt-3 rounded-xl bg-red-600 px-3 py-2 text-[8px] font-black uppercase tracking-wider text-white transition hover:bg-red-700"
              >
                Reintentar
              </button>
            </div>
          </section>
        )}

        {/* LISTADO */}
        <section className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <div>
              <p className="text-[9px] font-black uppercase tracking-[0.2em] text-[#87be00]">
                Planificación
              </p>

              <h2 className="mt-1 text-lg font-black tracking-tight text-slate-900">
                Locales asignados
              </h2>
            </div>

            <span className="rounded-xl bg-white px-3 py-2 text-[9px] font-black uppercase tracking-wider text-slate-500 shadow-sm">
              {filteredLocales.length}
            </span>
          </div>

          {filteredLocales.length === 0 ? (
            <div className="flex min-h-[280px] flex-col items-center justify-center rounded-[2rem] border border-dashed border-slate-200 bg-white p-8 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-slate-300">
                <FiAlertCircle size={28} />
              </div>

              <p className="mt-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                {searchTerm
                  ? "Sin resultados"
                  : "Sin locales asignados"}
              </p>

              <p className="mt-2 max-w-xs text-sm text-slate-500">
                {searchTerm
                  ? "No encontramos locales que coincidan con tu búsqueda."
                  : "No tienes puntos de venta programados para hoy."}
              </p>

              {searchTerm && (
                <button
                  type="button"
                  onClick={() =>
                    setSearchTerm("")
                  }
                  className="mt-4 rounded-xl bg-slate-900 px-4 py-3 text-[8px] font-black uppercase tracking-wider text-white transition hover:bg-[#87be00]"
                >
                  Limpiar búsqueda
                </button>
              )}
            </div>
          ) : (
            filteredLocales.map(
              (local, index) => {
                const status = String(
                  local?.status ||
                    "PENDING",
                ).toUpperCase();

                const config =
                  STATUS_CONFIG[status] ||
                  STATUS_CONFIG.PENDING;

                const hasCoordinates =
                  local?.lat !== null &&
                  local?.lat !== undefined &&
                  local?.lng !== null &&
                  local?.lng !== undefined &&
                  String(local.lat) !== "" &&
                  String(local.lng) !== "";

                const mapsDestination =
                  hasCoordinates
                    ? `${local.lat},${local.lng}`
                    : local?.direccion || "";

                const phoneAvailable =
                  hasUsefulValue(
                    local?.contacto_telefono,
                  );

                const contactAvailable =
                  hasUsefulValue(
                    local?.contacto_nombre,
                  );

                return (
                  <article
                    key={
                      local.route_id ||
                      local.id ||
                      `${local.codigo_local}-${index}`
                    }
                    className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm transition hover:shadow-md"
                  >
                    <div
                      className={`h-1.5 w-full ${config.bar}`}
                    />

                    <div className="p-5">
                      <div className="flex items-start gap-3">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-[11px] font-black text-slate-500">
                          {String(
                            index + 1,
                          ).padStart(2, "0")}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="truncate text-base font-black tracking-tight text-slate-900">
                              {local.cadena ||
                                "Local asignado"}
                            </h3>

                            <span
                              className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[7px] font-black uppercase tracking-wider ${config.badge}`}
                            >
                              <span
                                className={`h-1.5 w-1.5 rounded-full ${config.dot}`}
                              />

                              {config.label}
                            </span>
                          </div>

                          <p className="mt-2 flex items-start gap-2 text-[10px] font-bold leading-relaxed text-slate-500">
                            <FiMapPin
                              size={13}
                              className="mt-0.5 shrink-0 text-[#87be00]"
                            />

                            <span className="line-clamp-2">
                              {local.direccion ||
                                "Dirección no disponible"}

                              {(local.comuna_name ||
                                local.comuna) &&
                                `, ${
                                  local.comuna_name ||
                                  local.comuna
                                }`}
                            </span>
                          </p>
                        </div>
                      </div>

                      <div className="mt-5 grid grid-cols-2 gap-3">
                        <div className="rounded-2xl bg-slate-50 p-3">
                          <div className="flex items-center gap-2">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white text-slate-400 shadow-sm">
                              <FiHash size={13} />
                            </div>

                            <div className="min-w-0">
                              <p className="text-[7px] font-black uppercase tracking-wider text-slate-400">
                                Código
                              </p>

                              <p className="mt-0.5 truncate text-[10px] font-black text-slate-700">
                                {local.codigo_local ||
                                  "Sin código"}
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="rounded-2xl bg-slate-50 p-3">
                          <div className="flex items-center gap-2">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white text-[#87be00] shadow-sm">
                              <FiClock size={13} />
                            </div>

                            <div className="min-w-0">
                              <p className="text-[7px] font-black uppercase tracking-wider text-slate-400">
                                Horario
                              </p>

                              <p className="mt-0.5 truncate text-[10px] font-black text-slate-700">
                                {local.start_time
                                  ? local.start_time.slice(
                                      0,
                                      5,
                                    )
                                  : "--:--"}

                                {local.end_time
                                  ? ` — ${local.end_time.slice(
                                      0,
                                      5,
                                    )}`
                                  : ""}
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="rounded-2xl bg-slate-50 p-3">
                          <div className="flex items-center gap-2">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white text-slate-400 shadow-sm">
                              <FiUser size={13} />
                            </div>

                            <div className="min-w-0">
                              <p className="text-[7px] font-black uppercase tracking-wider text-slate-400">
                                Contacto
                              </p>

                              <p className="mt-0.5 truncate text-[10px] font-black text-slate-700">
                                {contactAvailable
                                  ? local.contacto_nombre
                                  : "Sin información"}
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="rounded-2xl bg-slate-50 p-3">
                          <div className="flex items-center gap-2">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white text-slate-400 shadow-sm">
                              <FiPhone size={13} />
                            </div>

                            <div className="min-w-0">
                              <p className="text-[7px] font-black uppercase tracking-wider text-slate-400">
                                Teléfono
                              </p>

                              {phoneAvailable ? (
                                <a
                                  href={`tel:${local.contacto_telefono}`}
                                  className="mt-0.5 block truncate text-[10px] font-black text-[#87be00]"
                                >
                                  {local.contacto_telefono}
                                </a>
                              ) : (
                                <p className="mt-0.5 truncate text-[10px] font-black text-slate-400">
                                  Sin información
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2 border-t border-slate-100 bg-slate-50/70 p-3">
                      <a
                        href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
                          mapsDestination,
                        )}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`Navegar a ${
                          local.cadena ||
                          "local asignado"
                        }`}
                        className="flex min-h-[50px] flex-1 items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 text-[9px] font-black uppercase tracking-wider text-white shadow-lg shadow-slate-900/10 transition hover:bg-[#87be00]"
                      >
                        <FiNavigation size={16} />
                        Cómo llegar
                      </a>

                      {phoneAvailable && (
                        <a
                          href={`tel:${local.contacto_telefono}`}
                          aria-label="Llamar al contacto del local"
                          className="flex h-[50px] w-[50px] shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-600 transition hover:border-[#87be00]/40 hover:bg-[#87be00]/10 hover:text-[#87be00]"
                        >
                          <FiPhone size={17} />
                        </a>
                      )}

                      {status === "COMPLETED" ||
                      status === "FINALIZADO" ? (
                        <div
                          aria-label="Visita completada"
                          className="flex h-[50px] w-[50px] shrink-0 items-center justify-center rounded-2xl border border-[#87be00]/20 bg-[#87be00]/10 text-[#87be00]"
                        >
                          <FiCheckCircle size={18} />
                        </div>
                      ) : null}
                    </div>
                  </article>
                );
              },
            )
          )}
        </section>
      </div>
    </div>
  );
};

export default UserLocales;