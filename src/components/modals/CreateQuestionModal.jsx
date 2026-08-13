import { useEffect, useMemo, useState } from "react";
import {
  FiX,
  FiTrash2,
  FiHelpCircle,
  FiUser,
  FiEye,
  FiPlus,
  FiCheck,
  FiAlertCircle,
  FiList,
  FiType,
  FiBriefcase,
} from "react-icons/fi";
import api from "../../api/apiClient";
import { useAuth } from "../../context/AuthContext";

const defaultForm = () => ({
  question: "",
  type: "TEXTO",
  target_flows: ["REPONEDOR"],
  is_required: false,
  options: ["Nueva opción"],
  isMultiple: false,
  max_selections: "",
});

const ADMIN_CULTIVA_USER_ID =
  "97c6f210-eccc-48fe-b6b9-65dcf5968857";

const CreateQuestionModal = ({
  isOpen,
  onClose,
  onCreated,
  companyId = "",
  companies = [],
}) => {
  const { user } = useAuth();

  const currentRole = String(
    user?.role || "",
  ).toUpperCase();

  const currentUserId = String(
    user?.id ||
      user?.user_id ||
      "",
  );

  const isRoot =
    currentRole === "ROOT";

  const isAuthorizedCultivaAdmin =
    [
      "ADMIN",
      "ADMIN_CLIENTE",
    ].includes(currentRole) &&
    currentUserId ===
      ADMIN_CULTIVA_USER_ID;

  const canSelectCompany =
    isRoot ||
    isAuthorizedCultivaAdmin;

  const sessionCompanyId = String(
    user?.company_id || "",
  );

  const normalizedCompanies =
    useMemo(
      () =>
        Array.isArray(companies)
          ? companies.filter(
              (company) =>
                company?.is_active !== false,
            )
          : [],
      [companies],
    );

  const [
    selectedCompanyId,
    setSelectedCompanyId,
  ] = useState(
    canSelectCompany
      ? String(companyId || "")
      : sessionCompanyId ||
          String(companyId || ""),
  );
  const [form, setForm] =
    useState(defaultForm());

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  useEffect(() => {
    if (!isOpen) return;

    if (canSelectCompany) {
      setSelectedCompanyId(
        String(companyId || ""),
      );
      return;
    }

    setSelectedCompanyId(
      sessionCompanyId ||
        String(companyId || ""),
    );
  }, [
    isOpen,
    companyId,
    canSelectCompany,
    sessionCompanyId,
  ]);

  if (!isOpen) {
    return null;
  }

  const set = (patch) =>
    setForm((previous) => ({
      ...previous,
      ...patch,
    }));

  const toggleFlow = (flow) => {
    setForm((previous) => {
      const isSelected =
        previous.target_flows.includes(
          flow,
        );

      const newFlows =
        isSelected
          ? previous.target_flows.filter(
              (item) =>
                item !== flow,
            )
          : [
              ...previous.target_flows,
              flow,
            ];

      if (
        newFlows.length === 0
      ) {
        return previous;
      }

      return {
        ...previous,
        target_flows:
          newFlows,
      };
    });
  };

  const handleSubmit = async (
    event,
  ) => {
    event.preventDefault();
    setError("");

    const effectiveCompanyId =
      canSelectCompany
        ? selectedCompanyId
        : sessionCompanyId ||
          String(companyId || "");

    if (!effectiveCompanyId) {
      setError(
        "Debes seleccionar una empresa para crear la pregunta.",
      );
      return;
    }

    setLoading(true);

    const finalFlow =
      form.target_flows.length > 1
        ? "AMBOS"
        : form.target_flows[0];

    const payload = {
      company_id:
        effectiveCompanyId,
      question:
        form.question,
      is_required:
        form.is_required,
      type:
        form.type.toLowerCase(),
      target_flow:
        finalFlow.toLowerCase(),
      config: {
        options:
          form.type ===
          "SELECCION"
            ? form.options
            : [],
        isMultiple:
          form.type ===
          "SELECCION"
            ? form.isMultiple
            : false,
        max_selections:
          form.type ===
            "SELECCION" &&
          form.isMultiple
            ? parseInt(
                form.max_selections,
              ) || 0
            : 0,
      },
    };

    try {
      await api.post(
        "/questions",
        payload,
      );

      onCreated();
      onClose();
      setForm(defaultForm());

      setSelectedCompanyId(
        canSelectCompany
          ? String(companyId || "")
          : sessionCompanyId ||
              String(companyId || ""),
      );
    } catch (err) {
      setError(
        err?.response?.data
          ?.message ||
          err?.message ||
          "No fue posible crear la pregunta.",
      );
    } finally {
      setLoading(false);
    }
  };

  const inputClassName = `
    w-full rounded-2xl
    border border-gray-100
    bg-gray-50
    px-4 py-3.5
    text-[12px] font-bold
    text-gray-800
    outline-none
    shadow-inner
    transition-all
    placeholder:text-gray-300
    focus:border-[#87be00]/40
    focus:bg-white
    focus:ring-4
    focus:ring-[#87be00]/10
    disabled:cursor-not-allowed
    disabled:opacity-50
  `;

  const labelClassName = `
    ml-1 flex items-center gap-1.5
    text-[9px] font-black
    uppercase tracking-[0.16em]
    text-gray-400
  `;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-[#111111]/70 p-3 font-[Outfit] backdrop-blur-sm sm:p-5"
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-question-title"
    >
      <div className="relative flex max-h-[94vh] w-full max-w-2xl flex-col overflow-hidden rounded-[2rem] border border-white/60 bg-white shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        {/* ENCABEZADO */}
        <header className="relative shrink-0 border-b border-gray-100 bg-white px-5 py-5 sm:px-7 sm:py-6">
          <div className="absolute inset-x-0 top-0 h-1 bg-[#87be00]" />

          <div className="flex items-start justify-between gap-4">
            <div className="flex min-w-0 items-center gap-3.5">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#87be00]/10 text-[#87be00]">
                <FiHelpCircle
                  size={20}
                />
              </div>

              <div className="min-w-0">
                <p className="text-[9px] font-black uppercase tracking-[0.22em] text-[#87be00]">
                  Configuración de encuestas
                </p>

                <h2
                  id="create-question-title"
                  className="mt-1 text-xl font-black leading-none tracking-tight text-gray-900 sm:text-2xl"
                >
                  Nueva pregunta
                </h2>

                <p className="mt-2 text-[11px] font-medium text-gray-400">
                  Define el enunciado, flujo y formato de respuesta.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label="Cerrar creación de pregunta"
              disabled={loading}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-gray-100 bg-gray-50 text-gray-400 transition-all hover:border-red-100 hover:bg-red-50 hover:text-red-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <FiX size={18} />
            </button>
          </div>
        </header>

        <form
          onSubmit={handleSubmit}
          className="flex min-h-0 flex-1 flex-col overflow-hidden"
        >
          {/* CONTENIDO */}
          <div className="custom-scrollbar min-h-0 flex-1 space-y-5 overflow-y-auto overscroll-contain bg-gray-50/40 px-5 py-5 sm:px-7 sm:py-6">
            {error && (
              <div className="flex items-start gap-3 rounded-2xl border border-red-100 bg-red-50 p-4 text-red-600">
                <FiAlertCircle
                  className="mt-0.5 shrink-0"
                  size={16}
                />

                <div>
                  <p className="text-[9px] font-black uppercase tracking-[0.18em]">
                    No fue posible continuar
                  </p>

                  <p className="mt-1 text-[11px] font-semibold leading-relaxed">
                    {error}
                  </p>
                </div>
              </div>
            )}

            {canSelectCompany && (
              <section className="rounded-[1.6rem] border border-gray-100 bg-white p-4 shadow-sm sm:p-5">
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#87be00]/10 text-[#87be00]">
                    <FiBriefcase size={16} />
                  </div>

                  <div>
                    <h3 className="text-[11px] font-black uppercase tracking-[0.16em] text-gray-800">
                      Empresa de destino
                    </h3>

                    <p className="mt-0.5 text-[10px] font-medium text-gray-400">
                      Define a qué empresa pertenecerá esta pregunta.
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className={labelClassName}>
                    <FiBriefcase size={11} />
                    Empresa
                  </label>

                  <div className="relative">
                    <select
                      value={selectedCompanyId}
                      onChange={(event) => {
                        setSelectedCompanyId(
                          event.target.value,
                        );
                        setError("");
                      }}
                      required
                      disabled={loading}
                      className={`${inputClassName} appearance-none pr-10`}
                    >
                      <option value="">
                        Seleccionar empresa
                      </option>

                      {normalizedCompanies.map(
                        (company) => (
                          <option
                            key={company.id}
                            value={company.id}
                          >
                            {company.name ||
                              company.nombre ||
                              "Empresa"}
                          </option>
                        ),
                      )}
                    </select>

                    <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-gray-400">
                      <svg
                        className="h-3.5 w-3.5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="3"
                          d="M19 9l-7 7-7-7"
                        />
                      </svg>
                    </div>
                  </div>
                </div>
              </section>
            )}

            {/* FLUJO DESTINO */}
            <section className="rounded-[1.6rem] border border-gray-100 bg-white p-4 shadow-sm sm:p-5">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gray-100 text-gray-500">
                  <FiUser size={16} />
                </div>

                <div>
                  <h3 className="text-[11px] font-black uppercase tracking-[0.16em] text-gray-800">
                    Flujo de destino
                  </h3>

                  <p className="mt-0.5 text-[10px] font-medium text-gray-400">
                    Selecciona uno o ambos perfiles.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() =>
                    toggleFlow(
                      "REPONEDOR",
                    )
                  }
                  className={`flex items-center justify-between rounded-2xl border px-4 py-3.5 text-left transition-all ${
                    form.target_flows.includes(
                      "REPONEDOR",
                    )
                      ? "border-[#87be00]/30 bg-[#87be00]/10 text-[#679300] shadow-sm"
                      : "border-gray-100 bg-gray-50 text-gray-400 hover:border-[#87be00]/20 hover:bg-[#87be00]/5"
                  }`}
                >
                  <span className="flex items-center gap-3">
                    <span
                      className={`flex h-9 w-9 items-center justify-center rounded-xl ${
                        form.target_flows.includes(
                          "REPONEDOR",
                        )
                          ? "bg-[#87be00] text-white"
                          : "bg-white text-gray-400"
                      }`}
                    >
                      <FiUser size={15} />
                    </span>

                    <span>
                      <span className="block text-[10px] font-black uppercase tracking-[0.14em]">
                        Mercaderista
                      </span>

                      <span className="mt-0.5 block text-[9px] font-medium opacity-70">
                        Flujo de terreno
                      </span>
                    </span>
                  </span>

                  {form.target_flows.includes(
                    "REPONEDOR",
                  ) && (
                    <FiCheck size={16} />
                  )}
                </button>

                <button
                  type="button"
                  onClick={() =>
                    toggleFlow(
                      "SUPERVISOR",
                    )
                  }
                  className={`flex items-center justify-between rounded-2xl border px-4 py-3.5 text-left transition-all ${
                    form.target_flows.includes(
                      "SUPERVISOR",
                    )
                      ? "border-[#87be00]/30 bg-[#87be00]/10 text-[#679300] shadow-sm"
                      : "border-gray-100 bg-gray-50 text-gray-400 hover:border-[#87be00]/20 hover:bg-[#87be00]/5"
                  }`}
                >
                  <span className="flex items-center gap-3">
                    <span
                      className={`flex h-9 w-9 items-center justify-center rounded-xl ${
                        form.target_flows.includes(
                          "SUPERVISOR",
                        )
                          ? "bg-[#87be00] text-white"
                          : "bg-white text-gray-400"
                      }`}
                    >
                      <FiEye size={15} />
                    </span>

                    <span>
                      <span className="block text-[10px] font-black uppercase tracking-[0.14em]">
                        Supervisor
                      </span>

                      <span className="mt-0.5 block text-[9px] font-medium opacity-70">
                        Flujo de supervisión
                      </span>
                    </span>
                  </span>

                  {form.target_flows.includes(
                    "SUPERVISOR",
                  ) && (
                    <FiCheck size={16} />
                  )}
                </button>
              </div>
            </section>

            {/* ENUNCIADO */}
            <section className="rounded-[1.6rem] border border-gray-100 bg-white p-4 shadow-sm sm:p-5">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#87be00]/10 text-[#87be00]">
                  <FiHelpCircle
                    size={16}
                  />
                </div>

                <div>
                  <h3 className="text-[11px] font-black uppercase tracking-[0.16em] text-gray-800">
                    Enunciado
                  </h3>

                  <p className="mt-0.5 text-[10px] font-medium text-gray-400">
                    Escribe la pregunta que verá el usuario.
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <label className={labelClassName}>
                  <FiType size={11} />
                  Texto de la pregunta
                </label>

                <input
                  type="text"
                  value={form.question}
                  onChange={(event) =>
                    set({
                      question:
                        event.target.value,
                    })
                  }
                  required
                  placeholder="Escribe la pregunta..."
                  className={inputClassName}
                />
              </div>
            </section>

            {/* FORMATO */}
            <section className="rounded-[1.6rem] border border-gray-100 bg-white p-4 shadow-sm sm:p-5">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gray-100 text-gray-500">
                  <FiList size={16} />
                </div>

                <div>
                  <h3 className="text-[11px] font-black uppercase tracking-[0.16em] text-gray-800">
                    Formato de respuesta
                  </h3>

                  <p className="mt-0.5 text-[10px] font-medium text-gray-400">
                    Define cómo responderán la pregunta.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                {[
                  {
                    value:
                      "TEXTO",
                    label:
                      "Texto",
                  },
                  {
                    value:
                      "SELECCION",
                    label:
                      "Selección",
                  },
                  {
                    value:
                      "BOOLEAN",
                    label:
                      "Sí / No",
                  },
                ].map(
                  (item) => (
                    <button
                      key={item.value}
                      type="button"
                      onClick={() =>
                        set({
                          type:
                            item.value,
                        })
                      }
                      className={`rounded-2xl border px-4 py-3 text-[9px] font-black uppercase tracking-[0.14em] transition-all ${
                        form.type ===
                        item.value
                          ? "border-[#87be00] bg-[#87be00] text-white shadow-md shadow-[#87be00]/20"
                          : "border-gray-100 bg-gray-50 text-gray-400 hover:border-[#87be00]/20 hover:bg-[#87be00]/5 hover:text-[#679300]"
                      }`}
                    >
                      {item.label}
                    </button>
                  ),
                )}
              </div>

              {form.type ===
                "SELECCION" && (
                <div className="mt-5 space-y-4 rounded-2xl border border-gray-100 bg-gray-50/70 p-4">
                  <label className="flex cursor-pointer items-center justify-between gap-4 rounded-2xl border border-gray-100 bg-white px-4 py-3">
                    <span>
                      <span className="block text-[10px] font-black uppercase tracking-[0.12em] text-gray-600">
                        Selección múltiple
                      </span>

                      <span className="mt-1 block text-[9px] font-medium text-gray-400">
                        Permite escoger más de una opción.
                      </span>
                    </span>

                    <input
                      type="checkbox"
                      checked={
                        form.isMultiple
                      }
                      onChange={(
                        event,
                      ) =>
                        set({
                          isMultiple:
                            event.target
                              .checked,
                        })
                      }
                      className="h-4 w-4 accent-[#87be00]"
                    />
                  </label>

                  {form.isMultiple && (
                    <div className="space-y-2">
                      <label className={labelClassName}>
                        Máximo de respuestas
                      </label>

                      <input
                        type="number"
                        min="1"
                        value={
                          form.max_selections
                        }
                        onChange={(
                          event,
                        ) =>
                          set({
                            max_selections:
                              event.target
                                .value,
                          })
                        }
                        className={inputClassName}
                        placeholder="Sin límite"
                      />
                    </div>
                  )}

                  <div className="space-y-2">
                    <p className={labelClassName}>
                      Opciones disponibles
                    </p>

                    {form.options.map(
                      (
                        option,
                        index,
                      ) => (
                        <div
                          key={index}
                          className="flex items-center gap-2"
                        >
                          <input
                            value={
                              option
                            }
                            onChange={(
                              event,
                            ) => {
                              const options =
                                [
                                  ...form.options,
                                ];

                              options[
                                index
                              ] =
                                event.target.value;

                              set({
                                options,
                              });
                            }}
                            className={`${inputClassName} min-w-0 flex-1`}
                          />

                          <button
                            type="button"
                            aria-label={`Eliminar opción ${
                              index + 1
                            }`}
                            onClick={() =>
                              set({
                                options:
                                  form.options.filter(
                                    (
                                      _,
                                      optionIndex,
                                    ) =>
                                      optionIndex !==
                                      index,
                                  ),
                              })
                            }
                            disabled={
                              form.options.length ===
                              1
                            }
                            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-red-100 bg-red-50 text-red-500 transition-all hover:bg-red-600 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            <FiTrash2
                              size={15}
                            />
                          </button>
                        </div>
                      ),
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      set({
                        options: [
                          ...form.options,
                          "Nueva opción",
                        ],
                      })
                    }
                    className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-[#87be00]/30 bg-[#87be00]/5 px-4 py-3 text-[9px] font-black uppercase tracking-[0.14em] text-[#679300] transition-all hover:bg-[#87be00]/10"
                  >
                    <FiPlus size={13} />
                    Añadir opción
                  </button>
                </div>
              )}
            </section>

            {/* OBLIGATORIA */}
            <section className="rounded-[1.6rem] border border-gray-100 bg-white p-4 shadow-sm sm:p-5">
              <label className="flex cursor-pointer items-center justify-between gap-4">
                <span>
                  <span className="block text-[10px] font-black uppercase tracking-[0.14em] text-gray-700">
                    Pregunta obligatoria
                  </span>

                  <span className="mt-1 block text-[9px] font-medium text-gray-400">
                    El usuario deberá responder antes de continuar.
                  </span>
                </span>

                <input
                  type="checkbox"
                  checked={
                    form.is_required
                  }
                  onChange={(
                    event,
                  ) =>
                    set({
                      is_required:
                        event.target
                          .checked,
                    })
                  }
                  className="h-4 w-4 accent-[#87be00]"
                />
              </label>
            </section>
          </div>

          {/* ACCIONES */}
          <footer className="grid shrink-0 grid-cols-1 gap-3 border-t border-gray-100 bg-white px-5 py-4 sm:grid-cols-[auto_1fr] sm:px-7">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="order-2 rounded-2xl border border-gray-100 bg-gray-50 px-6 py-3.5 text-[9px] font-black uppercase tracking-[0.16em] text-gray-500 transition-all hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50 sm:order-1"
            >
              Cancelar
            </button>

            <button
              type="submit"
              disabled={
                loading ||
                (canSelectCompany &&
                  !selectedCompanyId)
              }
              className="order-1 flex items-center justify-center gap-2 rounded-2xl bg-gray-900 px-6 py-3.5 text-[9px] font-black uppercase tracking-[0.18em] text-white shadow-lg shadow-gray-200 transition-all hover:bg-[#87be00] disabled:cursor-not-allowed disabled:opacity-60 sm:order-2"
            >
              {loading ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  Guardando...
                </>
              ) : (
                <>
                  <FiCheck size={15} />
                  Crear pregunta
                </>
              )}
            </button>
          </footer>
        </form>
      </div>
    </div>
  );
};

export default CreateQuestionModal;