import { useEffect, useMemo, useState } from "react";
import {
  FiAlertTriangle,
  FiBriefcase,
  FiCheckCircle,
  FiInfo,
  FiLayers,
  FiLoader,
  FiMapPin,
  FiSearch,
  FiSend,
  FiTarget,
  FiUsers,
} from "react-icons/fi";
import toast from "react-hot-toast";

import api from "../../api/apiClient";
import { useAuth } from "../../context/AuthContext";

const INITIAL_FORM = {
  title: "",
  message: "",
  type: "OPERATIVA",
  scope: "TODOS",
  localId: "",
  selectedZone: "",
  selectedTargets: [],
};

const SCOPE_OPTIONS = [
  {
    id: "TODOS",
    label: "Empresa",
    icon: FiLayers,
  },
  {
    id: "individual",
    label: "Personal",
    icon: FiUsers,
  },
  {
    id: "local",
    label: "Punto de venta",
    icon: FiMapPin,
  },
  {
    id: "ZONA",
    label: "Zona",
    icon: FiTarget,
  },
];

const PRIORITY_OPTIONS = [
  {
    id: "OPERATIVA",
    label: "Operativa",
    icon: FiInfo,
  },
  {
    id: "URGENTE",
    label: "Urgente",
    icon: FiAlertTriangle,
  },
];

const ZONE_OPTIONS = [
  {
    value: "Metropolitana",
    label: "Región Metropolitana",
  },
  {
    value: "Norte",
    label: "Zona Norte",
  },
  {
    value: "Sur",
    label: "Zona Sur",
  },
];

const normalizeCollection = (response) => {
  const payload = response?.data ?? response;

  if (Array.isArray(payload)) {
    return payload;
  }

  if (Array.isArray(payload?.rows)) {
    return payload.rows;
  }

  if (Array.isArray(payload?.data)) {
    return payload.data;
  }

  return [];
};

const AlertManager = () => {
  const { user: currentUser } = useAuth();

  const [loading, setLoading] = useState(false);
  const [fetchingData, setFetchingData] = useState(false);

  const [searchTerm, setSearchTerm] = useState("");
  const [searchLocal, setSearchLocal] = useState("");

  const [users, setUsers] = useState([]);
  const [allMyLocales, setAllMyLocales] = useState([]);

  const [form, setForm] = useState(INITIAL_FORM);

  useEffect(() => {
    let cancelled = false;

    const loadInitialData = async () => {
      if (!currentUser?.id) {
        return;
      }

      try {
        setFetchingData(true);

        const isRoot = currentUser.role === "ROOT";

        const usersUrl = isRoot
          ? "/users"
          : `/users?company_id=${encodeURIComponent(
              currentUser.company_id,
            )}`;

        const localesUrl = isRoot
          ? "/locales"
          : currentUser.role === "ADMIN_CLIENTE"
            ? `/locales?company_id=${encodeURIComponent(
                currentUser.company_id,
              )}`
            : `/locales/supervisor/${encodeURIComponent(
                currentUser.id,
              )}`;

        const [usersResponse, localesResponse] = await Promise.all([
          api.get(usersUrl),
          api.get(localesUrl),
        ]);

        if (cancelled) {
          return;
        }

        const usersData = normalizeCollection(usersResponse);
        const localesData = normalizeCollection(localesResponse);

        setUsers(
          usersData.filter(
            (candidate) =>
              candidate?.id &&
              candidate.id !== currentUser.id &&
              !candidate.deleted_at,
          ),
        );

        setAllMyLocales(
          localesData.filter(
            (local) => local?.id && !local.deleted_at,
          ),
        );
      } catch (error) {
        if (cancelled) {
          return;
        }

        console.error(
          "Error al cargar datos del centro de notificaciones:",
          error?.response?.data || error?.message || error,
        );

        toast.error(
          error?.response?.data?.message ||
            "Error al sincronizar usuarios y locales",
        );
      } finally {
        if (!cancelled) {
          setFetchingData(false);
        }
      }
    };

    loadInitialData();

    return () => {
      cancelled = true;
    };
  }, [
    currentUser?.company_id,
    currentUser?.id,
    currentUser?.role,
  ]);

  const filteredUsers = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();

    if (!term) {
      return users;
    }

    return users.filter((candidate) => {
      const fullName = `${candidate?.first_name || ""} ${
        candidate?.last_name || ""
      }`
        .trim()
        .toLowerCase();

      const rut = String(candidate?.rut || "").toLowerCase();
      const role = String(candidate?.role || "").toLowerCase();

      return (
        fullName.includes(term) ||
        rut.includes(term) ||
        role.includes(term)
      );
    });
  }, [users, searchTerm]);

  const filteredLocales = useMemo(() => {
    const term = searchLocal.trim().toLowerCase();

    if (!term) {
      return allMyLocales;
    }

    return allMyLocales.filter((local) => {
      const localName = String(
        local?.nombre_local ||
          local?.cadena ||
          local?.retail ||
          "",
      ).toLowerCase();

      const localCode = String(
        local?.codigo_local || "",
      ).toLowerCase();

      const address = String(
        local?.direccion || "",
      ).toLowerCase();

      const commune = String(
        local?.comuna_name ||
          local?.comuna ||
          "",
      ).toLowerCase();

      return (
        localName.includes(term) ||
        localCode.includes(term) ||
        address.includes(term) ||
        commune.includes(term)
      );
    });
  }, [allMyLocales, searchLocal]);

  const toggleUserSelection = (userId) => {
    setForm((current) => ({
      ...current,
      selectedTargets: current.selectedTargets.includes(userId)
        ? current.selectedTargets.filter(
            (selectedId) => selectedId !== userId,
          )
        : [...current.selectedTargets, userId],
    }));
  };

  const selectScope = (scope) => {
    setSearchTerm("");
    setSearchLocal("");

    setForm((current) => ({
      ...current,
      scope,
      selectedTargets: [],
      localId: "",
      selectedZone: "",
    }));
  };

  const handleSend = async (event) => {
    event.preventDefault();

    if (loading) {
      return;
    }

    const cleanTitle = form.title.trim();
    const cleanMessage = form.message.trim();

    if (!cleanMessage) {
      toast.error("El mensaje es obligatorio");
      return;
    }

    if (
      form.scope === "individual" &&
      form.selectedTargets.length === 0
    ) {
      toast.error("Selecciona al menos un destinatario");
      return;
    }

    if (form.scope === "local" && !form.localId) {
      toast.error("Selecciona un punto de venta");
      return;
    }

    if (form.scope === "ZONA" && !form.selectedZone) {
      toast.error("Selecciona una zona");
      return;
    }

    if (!currentUser?.company_id) {
      toast.error("No fue posible identificar la empresa");
      return;
    }

    setLoading(true);

    try {
      await api.post("/notifications/send-bulk", {
        title:
          cleanTitle ||
          (form.type === "URGENTE"
            ? "ALERTA URGENTE"
            : "AVISO OPERATIVO"),
        message: cleanMessage,
        type: form.type,
        scope: form.scope,
        companyId: currentUser.company_id,
        localId:
          form.scope === "local"
            ? form.localId
            : null,
        targetIds:
          form.scope === "individual"
            ? form.selectedTargets
            : [],
        zone:
          form.scope === "ZONA"
            ? form.selectedZone
            : null,
      });

      toast.success("Instrucción emitida con éxito");

      setForm(INITIAL_FORM);
      setSearchTerm("");
      setSearchLocal("");
    } catch (error) {
      console.error(
        "Error al emitir notificación:",
        error?.response?.data || error?.message || error,
      );

      toast.error(
        error?.response?.data?.message ||
          "Error al emitir la notificación",
      );
    } finally {
      setLoading(false);
    }
  };

  const selectedLocal = useMemo(
    () =>
      allMyLocales.find(
        (local) => local.id === form.localId,
      ) || null,
    [allMyLocales, form.localId],
  );

  return (
    <div className="min-h-full bg-slate-50/70 px-4 pb-12 pt-20 font-[Outfit] sm:px-6 sm:pt-8 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Encabezado unificado */}
        <header className="flex flex-col gap-5 border-b border-slate-200/80 pb-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#87be00]/10 text-[#87be00]">
              <FiSend size={22} />
            </div>

            <div className="min-w-0">
              <h1 className="text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
                Centro de notificaciones
              </h1>

              <p className="mt-1.5 text-[10px] font-black uppercase tracking-[0.24em] text-[#87be00]">
                Emisión de instrucciones operativas
              </p>
            </div>
          </div>

          <div className="flex w-full items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm sm:w-auto sm:justify-start">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
              <FiBriefcase size={15} />
            </div>

            <div className="min-w-0">
              <p className="text-[8px] font-black uppercase tracking-[0.2em] text-slate-400">
                Usuario activo
              </p>

              <p className="truncate text-[10px] font-black uppercase text-slate-700">
                {currentUser?.role === "ROOT"
                  ? "Root"
                  : currentUser?.role === "ADMIN_CLIENTE"
                    ? "Administrador"
                    : "Supervisor"}
                {currentUser?.first_name
                  ? ` · ${currentUser.first_name}`
                  : ""}
              </p>
            </div>
          </div>
        </header>

        <form
          onSubmit={handleSend}
          className="grid grid-cols-1 gap-6 lg:grid-cols-12"
        >
          {/* Columna principal */}
          <section className="space-y-6 lg:col-span-8">
            <div className="space-y-6 rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
              <div>
                <p className="text-[9px] font-black uppercase tracking-[0.22em] text-slate-400">
                  Contenido de la instrucción
                </p>

                <h2 className="mt-1 text-lg font-black tracking-tight text-slate-900">
                  Redacta el mensaje para el equipo
                </h2>
              </div>

              <div className="space-y-4">
                <div>
                  <label
                    htmlFor="notification-title"
                    className="mb-2 block text-[9px] font-black uppercase tracking-[0.2em] text-slate-500"
                  >
                    Asunto
                  </label>

                  <input
                    id="notification-title"
                    type="text"
                    maxLength={120}
                    placeholder="Asunto de la instrucción"
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-800 outline-none transition focus:border-[#87be00]/50 focus:bg-white focus:ring-4 focus:ring-[#87be00]/10"
                    value={form.title}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        title: event.target.value,
                      }))
                    }
                  />
                </div>

                <div>
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <label
                      htmlFor="notification-message"
                      className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500"
                    >
                      Mensaje
                    </label>

                    <span className="text-[9px] font-bold text-slate-400">
                      {form.message.length}/1000
                    </span>
                  </div>

                  <textarea
                    id="notification-message"
                    maxLength={1000}
                    placeholder="Detalle de la instrucción para el equipo"
                    className="h-40 w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm font-medium leading-relaxed text-slate-800 outline-none transition focus:border-[#87be00]/50 focus:bg-white focus:ring-4 focus:ring-[#87be00]/10 sm:h-48"
                    value={form.message}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        message: event.target.value,
                      }))
                    }
                    required
                  />
                </div>
              </div>

              {(form.scope === "individual" ||
                form.scope === "local") && (
                <div className="space-y-4 border-t border-slate-100 pt-6">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">
                        {form.scope === "individual" ? (
                          <FiUsers className="text-[#87be00]" />
                        ) : (
                          <FiMapPin className="text-[#87be00]" />
                        )}

                        {form.scope === "individual"
                          ? `Destinatarios seleccionados: ${form.selectedTargets.length}`
                          : "Punto de venta seleccionado"}
                      </p>

                      {form.scope === "local" &&
                        selectedLocal && (
                          <p className="mt-1 text-xs font-bold text-slate-700">
                            {selectedLocal.nombre_local ||
                              selectedLocal.cadena ||
                              selectedLocal.retail ||
                              "Local"}{" "}
                            ·{" "}
                            {selectedLocal.codigo_local ||
                              "S/C"}
                          </p>
                        )}
                    </div>

                    <div className="relative w-full sm:w-64">
                      <FiSearch
                        className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                        size={14}
                      />

                      <input
                        type="search"
                        placeholder={
                          form.scope === "individual"
                            ? "Buscar usuario"
                            : "Buscar local"
                        }
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-[10px] font-black uppercase text-slate-700 outline-none transition focus:border-[#87be00]/40 focus:bg-white focus:ring-4 focus:ring-[#87be00]/10"
                        value={
                          form.scope === "individual"
                            ? searchTerm
                            : searchLocal
                        }
                        onChange={(event) => {
                          if (
                            form.scope === "individual"
                          ) {
                            setSearchTerm(
                              event.target.value,
                            );
                          } else {
                            setSearchLocal(
                              event.target.value,
                            );
                          }
                        }}
                      />
                    </div>
                  </div>

                  <div className="grid max-h-80 grid-cols-1 gap-3 overflow-y-auto rounded-2xl border border-slate-200 bg-slate-50 p-3 custom-scrollbar sm:grid-cols-2">
                    {fetchingData ? (
                      <div className="col-span-full flex min-h-40 flex-col items-center justify-center gap-3 text-slate-400">
                        <FiLoader
                          className="animate-spin text-[#87be00]"
                          size={24}
                        />

                        <p className="text-[9px] font-black uppercase tracking-widest">
                          Cargando información
                        </p>
                      </div>
                    ) : form.scope === "individual" ? (
                      filteredUsers.length > 0 ? (
                        filteredUsers.map((candidate) => {
                          const isSelected =
                            form.selectedTargets.includes(
                              candidate.id,
                            );

                          return (
                            <button
                              key={candidate.id}
                              type="button"
                              onClick={() =>
                                toggleUserSelection(
                                  candidate.id,
                                )
                              }
                              className={`flex min-w-0 items-center justify-between gap-3 rounded-2xl border bg-white p-4 text-left transition ${
                                isSelected
                                  ? "border-[#87be00] shadow-sm ring-4 ring-[#87be00]/10"
                                  : "border-slate-200 hover:border-slate-300 hover:shadow-sm"
                              }`}
                            >
                              <div className="flex min-w-0 items-center gap-3">
                                <div
                                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-[9px] font-black uppercase ${
                                    isSelected
                                      ? "bg-[#87be00] text-white"
                                      : "bg-slate-900 text-white"
                                  }`}
                                >
                                  {candidate.first_name?.[0] ||
                                    "U"}
                                  {candidate.last_name?.[0] ||
                                    ""}
                                </div>

                                <div className="min-w-0">
                                  <p className="truncate text-[10px] font-black uppercase text-slate-800">
                                    {candidate.first_name ||
                                      "Usuario"}{" "}
                                    {candidate.last_name ||
                                      ""}
                                  </p>

                                  <p className="mt-1 truncate text-[8px] font-bold uppercase tracking-wider text-slate-400">
                                    {candidate.role ||
                                      "Sin rol"}
                                  </p>
                                </div>
                              </div>

                              {isSelected && (
                                <FiCheckCircle
                                  className="shrink-0 text-[#87be00]"
                                  size={16}
                                />
                              )}
                            </button>
                          );
                        })
                      ) : (
                        <div className="col-span-full flex min-h-40 flex-col items-center justify-center gap-3 text-center">
                          <FiUsers
                            size={24}
                            className="text-slate-300"
                          />

                          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                            No hay usuarios disponibles
                          </p>
                        </div>
                      )
                    ) : filteredLocales.length > 0 ? (
                      filteredLocales.map((local) => {
                        const isSelected =
                          form.localId === local.id;

                        const localName =
                          local.nombre_local ||
                          local.cadena ||
                          local.retail ||
                          "Local sin nombre";

                        return (
                          <button
                            key={local.id}
                            type="button"
                            onClick={() =>
                              setForm((current) => ({
                                ...current,
                                localId: local.id,
                              }))
                            }
                            className={`flex min-w-0 items-center justify-between gap-3 rounded-2xl border bg-white p-4 text-left transition ${
                              isSelected
                                ? "border-[#87be00] shadow-sm ring-4 ring-[#87be00]/10"
                                : "border-slate-200 hover:border-slate-300 hover:shadow-sm"
                            }`}
                          >
                            <div className="flex min-w-0 items-center gap-3">
                              <div
                                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                                  isSelected
                                    ? "bg-[#87be00] text-white"
                                    : "bg-slate-100 text-slate-400"
                                }`}
                              >
                                <FiMapPin size={15} />
                              </div>

                              <div className="min-w-0">
                                <p className="truncate text-[10px] font-black uppercase text-slate-800">
                                  {localName}
                                </p>

                                <p className="mt-1 truncate text-[8px] font-bold uppercase tracking-wider text-slate-400">
                                  {local.codigo_local ||
                                    "S/C"}{" "}
                                  ·{" "}
                                  {local.direccion ||
                                    "Sin dirección"}
                                </p>
                              </div>
                            </div>

                            {isSelected && (
                              <FiCheckCircle
                                className="shrink-0 text-[#87be00]"
                                size={16}
                              />
                            )}
                          </button>
                        );
                      })
                    ) : (
                      <div className="col-span-full flex min-h-40 flex-col items-center justify-center gap-3 text-center">
                        <FiMapPin
                          size={24}
                          className="text-slate-300"
                        />

                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                          No hay locales disponibles
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className={`flex w-full items-center justify-center gap-3 rounded-2xl py-4 text-[10px] font-black uppercase tracking-[0.2em] text-white shadow-lg transition ${
                  loading
                    ? "cursor-not-allowed bg-slate-300"
                    : "bg-[#87be00] hover:-translate-y-0.5 hover:bg-slate-900 hover:shadow-xl active:translate-y-0"
                }`}
              >
                {loading ? (
                  <FiLoader className="animate-spin" />
                ) : (
                  <FiSend />
                )}

                {loading
                  ? "Emitiendo instrucción"
                  : "Emitir instrucción"}
              </button>
            </div>
          </section>

          {/* Configuración lateral */}
          <aside className="space-y-6 lg:col-span-4">
            <div className="space-y-5 rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <div>
                <p className="text-[9px] font-black uppercase tracking-[0.22em] text-[#87be00]">
                  Configuración de alcance
                </p>

                <h2 className="mt-1 text-lg font-black tracking-tight text-slate-900">
                  Define quién recibirá el aviso
                </h2>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {SCOPE_OPTIONS.map((option) => {
                  const Icon = option.icon;
                  const isSelected =
                    form.scope === option.id;

                  return (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() =>
                        selectScope(option.id)
                      }
                      className={`flex min-h-24 flex-col items-center justify-center gap-2 rounded-2xl border p-3 text-center transition ${
                        isSelected
                          ? "border-[#87be00] bg-[#87be00]/5 text-slate-900 shadow-sm ring-4 ring-[#87be00]/10"
                          : "border-slate-200 bg-slate-50 text-slate-400 hover:border-slate-300 hover:bg-white"
                      }`}
                    >
                      <Icon size={18} />

                      <span className="text-[9px] font-black uppercase tracking-wider">
                        {option.label}
                      </span>
                    </button>
                  );
                })}
              </div>

              {form.scope === "ZONA" && (
                <div>
                  <label
                    htmlFor="notification-zone"
                    className="mb-2 block text-[9px] font-black uppercase tracking-[0.2em] text-slate-500"
                  >
                    Zona de destino
                  </label>

                  <select
                    id="notification-zone"
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-3 text-[10px] font-black uppercase text-slate-700 outline-none transition focus:border-[#87be00]/50 focus:bg-white focus:ring-4 focus:ring-[#87be00]/10"
                    value={form.selectedZone}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        selectedZone:
                          event.target.value,
                      }))
                    }
                  >
                    <option value="">
                      Seleccionar zona
                    </option>

                    {ZONE_OPTIONS.map((zone) => (
                      <option
                        key={zone.value}
                        value={zone.value}
                      >
                        {zone.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div className="space-y-5 rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <div>
                <p className="text-[9px] font-black uppercase tracking-[0.22em] text-slate-400">
                  Prioridad del sistema
                </p>

                <h2 className="mt-1 text-lg font-black tracking-tight text-slate-900">
                  Nivel de atención
                </h2>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {PRIORITY_OPTIONS.map((option) => {
                  const Icon = option.icon;
                  const isSelected =
                    form.type === option.id;

                  return (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() =>
                        setForm((current) => ({
                          ...current,
                          type: option.id,
                        }))
                      }
                      className={`flex items-center justify-center gap-2 rounded-2xl border px-3 py-3 text-[9px] font-black uppercase tracking-wider transition ${
                        isSelected
                          ? option.id === "URGENTE"
                            ? "border-red-200 bg-red-50 text-red-600 ring-4 ring-red-500/10"
                            : "border-slate-900 bg-slate-900 text-[#87be00] ring-4 ring-slate-900/10"
                          : "border-slate-200 bg-slate-50 text-slate-400 hover:border-slate-300 hover:bg-white"
                      }`}
                    >
                      <Icon
                        size={14}
                        className={
                          option.id === "URGENTE"
                            ? "text-red-500"
                            : ""
                        }
                      />

                      {option.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="rounded-[2rem] border border-[#87be00]/20 bg-[#87be00]/5 p-5">
              <p className="text-[9px] font-black uppercase tracking-[0.22em] text-[#87be00]">
                Resumen del envío
              </p>

              <div className="mt-4 space-y-3 text-[10px] font-bold text-slate-600">
                <div className="flex items-center justify-between gap-4">
                  <span>Alcance</span>
                  <span className="font-black uppercase text-slate-900">
                    {SCOPE_OPTIONS.find(
                      (option) =>
                        option.id === form.scope,
                    )?.label || form.scope}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-4">
                  <span>Prioridad</span>
                  <span className="font-black uppercase text-slate-900">
                    {form.type}
                  </span>
                </div>

                {form.scope === "individual" && (
                  <div className="flex items-center justify-between gap-4">
                    <span>Destinatarios</span>
                    <span className="font-black text-slate-900">
                      {form.selectedTargets.length}
                    </span>
                  </div>
                )}

                {form.scope === "local" &&
                  selectedLocal && (
                    <div className="flex items-start justify-between gap-4">
                      <span>Local</span>
                      <span className="max-w-[180px] text-right font-black uppercase text-slate-900">
                        {selectedLocal.nombre_local ||
                          selectedLocal.cadena ||
                          selectedLocal.retail ||
                          selectedLocal.codigo_local}
                      </span>
                    </div>
                  )}

                {form.scope === "ZONA" &&
                  form.selectedZone && (
                    <div className="flex items-center justify-between gap-4">
                      <span>Zona</span>
                      <span className="font-black uppercase text-slate-900">
                        {form.selectedZone}
                      </span>
                    </div>
                  )}
              </div>
            </div>
          </aside>
        </form>
      </div>
    </div>
  );
};

export default AlertManager;
