import { useState, useEffect } from "react";
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
} from "react-icons/fi";
import api from "../../api/apiClient";

const EditQuestionModal = ({
  isOpen,
  onClose,
  onUpdated,
  question,
}) => {
  const [form, setForm] =
    useState({
      question: "",
      type: "TEXTO",
      target_flow: "REPONEDOR",
      is_required: false,
      options: [],
      isMultiple: false,
      max_selections: "",
    });

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  useEffect(() => {
    if (question) {
      const config =
        question.config?.config ||
        question.config ||
        {};

      setForm({
        question:
          question.question || "",
        type:
          String(
            question.type ||
            "TEXTO",
          ).toUpperCase(),
        target_flow:
          String(
            question.target_flow ||
            "REPONEDOR",
          ).toUpperCase(),
        is_required:
          question.is_required ||
          false,
        options:
          config.options || [],
        isMultiple:
          config.isMultiple ||
          false,
        max_selections:
          config.max_selections ||
          "",
      });
    }
  }, [question]);

  if (!isOpen) {
    return null;
  }

  const handleInputChange = (
    event,
  ) => {
    const {
      name,
      value,
    } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const handleCheckboxChange = (
    event,
  ) => {
    const {
      name,
      checked,
    } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: checked,
    }));
  };

  const handleTypeSelect = (
    selectedType,
  ) => {
    setForm((previous) => ({
      ...previous,
      type: selectedType,
    }));
  };

  const handleFlowSelect = (
    selectedFlow,
  ) => {
    setForm((previous) => ({
      ...previous,
      target_flow:
        selectedFlow,
    }));
  };

  const handleSubmit = async (
    event,
  ) => {
    event.preventDefault();
    setLoading(true);
    setError("");

    const payload = {
      question:
        form.question,
      is_required:
        form.is_required,
      type:
        form.type.toLowerCase(),
      target_flow:
        form.target_flow.toLowerCase(),
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
      await api.put(
        `/questions/${question.id}`,
        payload,
      );

      onUpdated();
      onClose();
    } catch (err) {
      setError(
        err?.response?.data
          ?.message ||
          err?.message ||
          "No fue posible actualizar la pregunta.",
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
      aria-labelledby="edit-question-title"
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
                  id="edit-question-title"
                  className="mt-1 text-xl font-black leading-none tracking-tight text-gray-900 sm:text-2xl"
                >
                  Editar pregunta
                </h2>

                <p className="mt-2 text-[11px] font-medium text-gray-400">
                  Modifica el enunciado, flujo y formato de respuesta.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label="Cerrar edición de pregunta"
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
                    Define qué perfil verá esta pregunta.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() =>
                    handleFlowSelect(
                      "REPONEDOR",
                    )
                  }
                  className={`flex items-center justify-between rounded-2xl border px-4 py-3.5 text-left transition-all ${
                    form.target_flow ===
                    "REPONEDOR"
                      ? "border-[#87be00]/30 bg-[#87be00]/10 text-[#679300] shadow-sm"
                      : "border-gray-100 bg-gray-50 text-gray-400 hover:border-[#87be00]/20 hover:bg-[#87be00]/5"
                  }`}
                >
                  <span className="flex items-center gap-3">
                    <span
                      className={`flex h-9 w-9 items-center justify-center rounded-xl ${
                        form.target_flow ===
                        "REPONEDOR"
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

                  {form.target_flow ===
                    "REPONEDOR" && (
                    <FiCheck size={16} />
                  )}
                </button>

                <button
                  type="button"
                  onClick={() =>
                    handleFlowSelect(
                      "SUPERVISOR",
                    )
                  }
                  className={`flex items-center justify-between rounded-2xl border px-4 py-3.5 text-left transition-all ${
                    form.target_flow ===
                    "SUPERVISOR"
                      ? "border-[#87be00]/30 bg-[#87be00]/10 text-[#679300] shadow-sm"
                      : "border-gray-100 bg-gray-50 text-gray-400 hover:border-[#87be00]/20 hover:bg-[#87be00]/5"
                  }`}
                >
                  <span className="flex items-center gap-3">
                    <span
                      className={`flex h-9 w-9 items-center justify-center rounded-xl ${
                        form.target_flow ===
                        "SUPERVISOR"
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

                  {form.target_flow ===
                    "SUPERVISOR" && (
                    <FiCheck size={16} />
                  )}
                </button>
              </div>
            </section>

            {/* ENUNCIADO */}
            <section className="rounded-[1.6rem] border border-gray-100 bg-white p-4 shadow-sm sm:p-5">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#87be00]/10 text-[#87be00]">
                  <FiHelpCircle size={16} />
                </div>

                <div>
                  <h3 className="text-[11px] font-black uppercase tracking-[0.16em] text-gray-800">
                    Enunciado
                  </h3>

                  <p className="mt-0.5 text-[10px] font-medium text-gray-400">
                    Modifica el texto que verá el usuario.
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
                  name="question"
                  value={form.question}
                  onChange={
                    handleInputChange
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
                    Define cómo responderán esta pregunta.
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
                        handleTypeSelect(
                          item.value,
                        )
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
                        setForm({
                          ...form,
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
                          setForm({
                            ...form,
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
                            value={option}
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

                              setForm({
                                ...form,
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
                              setForm({
                                ...form,
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
                      setForm({
                        ...form,
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
                  name="is_required"
                  checked={
                    form.is_required
                  }
                  onChange={
                    handleCheckboxChange
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
              disabled={loading}
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
                  Actualizar pregunta
                </>
              )}
            </button>
          </footer>
        </form>
      </div>
    </div>
  );
};

export default EditQuestionModal;