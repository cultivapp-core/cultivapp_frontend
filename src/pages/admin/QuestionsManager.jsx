import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  FiAlertCircle,
  FiBriefcase,
  FiCheckCircle,
  FiEdit,
  FiHelpCircle,
  FiPlus,
  FiRefreshCw,
  FiSearch,
  FiTrash2,
  FiX,
} from "react-icons/fi";
import { toast } from "react-hot-toast";
import api from "../../api/apiClient";
import { useAuth } from "../../context/AuthContext";
import CreateQuestionModal from "../../components/modals/CreateQuestionModal";
import EditQuestionModal from "../../components/modals/EditQuestionModal";
import {
  Button,
  IconButton,
} from "../../components/ui";

const CULTIVA_COMPANY_ID =
  "0e342e01-d213-4353-b210-39a12ac335cf";

const getResponseData = (
  response,
  fallback = [],
) => {
  if (response == null) return fallback;
  return response?.data ?? response;
};

const FLOW_LABELS = {
  reponedor: "Mercaderista",
  supervisor: "Supervisor",
  ambos: "Ambos",
};

const TYPE_LABELS = {
  BOOLEAN: "Sí / No",
  SI_NO: "Sí / No",
  "SI/NO": "Sí / No",
  TEXT: "Texto",
  TEXTO: "Texto",
  NUMBER: "Número",
  NUMERO: "Número",
  SELECT: "Selección",
  MULTIPLE: "Selección múltiple",
  PHOTO: "Foto",
};

const QuestionsManager = () => {
  const { user } = useAuth();

  const currentRole =
    String(
      user?.role || "",
    ).toUpperCase();

  const isRoot =
    currentRole === "ROOT";

  const isCultivaAdmin =
    [
      "ADMIN",
      "ADMIN_CLIENTE",
    ].includes(currentRole) &&
    String(
      user?.company_id || "",
    ) === CULTIVA_COMPANY_ID;

  /*
   * Solo ROOT y el administrador de Cultiva pueden
   * cambiar de empresa dentro del módulo.
   */
  const canSelectCompany =
    isRoot || isCultivaAdmin;

  /*
   * Para cualquier otro perfil administrativo, la empresa
   * válida es exclusivamente la asociada a su sesión.
   */
  const sessionCompanyId =
    String(
      user?.company_id || "",
    );

  const [questions, setQuestions] =
    useState([]);
  const [companies, setCompanies] =
    useState([]);
  const [
    selectedCompany,
    setSelectedCompany,
  ] = useState(
    canSelectCompany
      ? ""
      : sessionCompanyId,
  );
  const [createOpen, setCreateOpen] =
    useState(false);
  const [editOpen, setEditOpen] =
    useState(false);
  const [
    selectedQuestion,
    setSelectedQuestion,
  ] = useState(null);
  const [
    deleteQuestionTarget,
    setDeleteQuestionTarget,
  ] = useState(null);
  const [
    deletingQuestion,
    setDeletingQuestion,
  ] = useState(false);
  const [loading, setLoading] =
    useState(true);
  const [error, setError] =
    useState("");
  const [
    activeFilter,
    setActiveFilter,
  ] = useState("TODOS");
  const [searchTerm, setSearchTerm] =
    useState("");

  useEffect(() => {
    if (!canSelectCompany) {
      setSelectedCompany(
        sessionCompanyId,
      );
    }
  }, [
    canSelectCompany,
    sessionCompanyId,
  ]);

  const effectiveCompanyId =
    canSelectCompany
      ? selectedCompany
      : sessionCompanyId;

  const fetchCompanies =
    useCallback(async () => {
      if (!canSelectCompany) return;

      try {
        const response =
          await api.get("/companies");

        const data =
          getResponseData(
            response,
            [],
          );

        setCompanies(
          Array.isArray(data)
            ? data.filter(
                (company) =>
                  company?.is_active !==
                  false,
              )
            : [],
        );
      } catch (requestError) {
        console.error(
          "Error cargando empresas:",
          requestError,
        );

        toast.error(
          "No se pudieron cargar las empresas",
        );
      }
    }, [canSelectCompany]);

  const loadQuestions =
    useCallback(async () => {
      /*
       * Nunca se consulta el endpoint sin una empresa efectiva.
       * Para administradores normales se utiliza siempre la
       * company_id presente en la sesión autenticada.
       */
      if (!effectiveCompanyId) {
        setQuestions([]);
        setLoading(false);

        if (!canSelectCompany) {
          setError(
            "No se pudo identificar la empresa asociada a tu sesión.",
          );
        } else {
          setError("");
        }

        return;
      }

      try {
        setLoading(true);
        setError("");

        const response =
          await api.get(
            `/questions?company_id=${encodeURIComponent(
              effectiveCompanyId,
            )}`,
          );

        const data =
          getResponseData(
            response,
            [],
          );

        if (!Array.isArray(data)) {
          throw new Error(
            "La API devolvió un formato inesperado.",
          );
        }

        /*
         * Protección visual adicional:
         * cuando la API devuelve company_id, se descarta cualquier
         * pregunta perteneciente a otro tenant.
         *
         * La autorización definitiva también debe aplicarse en el
         * backend utilizando la empresa contenida en el token.
         */
        const tenantQuestions =
          data.filter((question) => {
            const questionCompanyId =
              question?.company_id ||
              question?.company?.id ||
              "";

            if (!questionCompanyId) {
              return true;
            }

            return (
              String(questionCompanyId) ===
              String(effectiveCompanyId)
            );
          });

        setQuestions(tenantQuestions);
      } catch (requestError) {
        console.error(
          "Error cargando preguntas:",
          requestError,
        );

        setQuestions([]);

        setError(
          requestError?.response?.data
            ?.message ||
            requestError?.message ||
            "No se pudo cargar el cuestionario.",
        );
      } finally {
        setLoading(false);
      }
    }, [
      effectiveCompanyId,
      canSelectCompany,
    ]);

  useEffect(() => {
    fetchCompanies();
  }, [fetchCompanies]);

  useEffect(() => {
    loadQuestions();
  }, [loadQuestions]);

  const filteredQuestions =
    useMemo(() => {
      const term = searchTerm
        .trim()
        .toLowerCase();

      return questions.filter(
        (question) => {
          const flow = String(
            question.target_flow || "",
          ).toLowerCase();

          const matchesFlow =
            activeFilter === "TODOS" ||
            (activeFilter ===
              "REPONEDOR" &&
              (flow === "reponedor" ||
                flow === "ambos")) ||
            (activeFilter ===
              "SUPERVISOR" &&
              (flow === "supervisor" ||
                flow === "ambos"));

          const searchableText = [
            question.question,
            question.type,
            question.target_flow,
            question.id,
            question.company_name,
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();

          const matchesSearch =
            !term ||
            searchableText.includes(
              term,
            );

          return (
            matchesFlow &&
            matchesSearch
          );
        },
      );
    }, [
      questions,
      activeFilter,
      searchTerm,
    ]);

  const handleDelete = (
    question,
  ) => {
    if (
      !question ||
      deletingQuestion
    ) {
      return;
    }

    setDeleteQuestionTarget(
      question,
    );
  };

  const closeDeleteQuestionModal =
    () => {
      if (deletingQuestion) {
        return;
      }

      setDeleteQuestionTarget(
        null,
      );
    };

  const confirmDeleteQuestion =
    async () => {
      if (
        !deleteQuestionTarget?.id ||
        deletingQuestion
      ) {
        return;
      }

      try {
        setDeletingQuestion(true);

        await api.delete(
          `/questions/${deleteQuestionTarget.id}?company_id=${encodeURIComponent(
            effectiveCompanyId,
          )}`,
        );

        toast.success(
          "Pregunta eliminada",
        );

        setDeleteQuestionTarget(
          null,
        );

        await loadQuestions();
      } catch (requestError) {
        console.error(
          "Error eliminando pregunta:",
          requestError,
        );

        toast.error(
          requestError?.response?.data
            ?.message ||
            requestError?.data
              ?.message ||
            requestError?.message ||
            "No se pudo eliminar la pregunta",
        );
      } finally {
        setDeletingQuestion(false);
      }
    };

  const handleEdit = (
    question,
  ) => {
    setSelectedQuestion(question);
    setEditOpen(true);
  };

  const clearFilters = () => {
    setActiveFilter("TODOS");
    setSearchTerm("");
  };

  const hasFilters =
    activeFilter !== "TODOS" ||
    Boolean(searchTerm);

  return (
    <div className="w-full min-h-full bg-gray-50/40 font-[Outfit] pb-20">
      <header className="bg-white border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 md:px-8 py-5 md:py-8 flex flex-col md:flex-row md:items-end justify-between gap-5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-[#87be00]/10 rounded-xl text-[#87be00]">
              <FiHelpCircle size={20} />
            </div>

            <div>
              <h1 className="text-3xl md:text-5xl font-black text-gray-900 tracking-tight leading-none">
                Preguntas
              </h1>

              <p className="text-[10px] font-black text-[#87be00] uppercase tracking-[0.2em] mt-2">
                Configuración de encuestas
              </p>
            </div>
          </div>

          <Button
            type="button"
            variant="primary"
            size="lg"
            leftIcon={
              <FiPlus size={16} />
            }
            onClick={() =>
              setCreateOpen(true)
            }
            disabled={
              canSelectCompany &&
              !effectiveCompanyId
            }
            className="w-full md:w-auto"
          >
            Nueva pregunta
          </Button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 md:px-8 pt-6 space-y-6">
        <section className="bg-white p-4 sm:p-5 rounded-[2rem] border border-gray-100 shadow-sm">
          <div
            className={`grid grid-cols-1 gap-3 ${
              canSelectCompany
                ? "md:grid-cols-[260px_1fr]"
                : ""
            }`}
          >
            {canSelectCompany && (
              <div className="relative">
                <FiBriefcase
                  size={16}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                />

                <select
                  value={
                    selectedCompany
                  }
                  onChange={(event) => {
                    setSelectedCompany(
                      event.target.value,
                    );
                    clearFilters();
                  }}
                  className={`${inputClass} pl-11`}
                >
                  <option value="">
                    Seleccionar empresa
                  </option>

                  {companies.map(
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
              </div>
            )}

            <div className="relative">
              <FiSearch
                size={16}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
              />

              <input
                type="search"
                value={searchTerm}
                onChange={(event) =>
                  setSearchTerm(
                    event.target.value,
                  )
                }
                placeholder="Buscar pregunta, tipo o ID..."
                className={`${inputClass} pl-11 pr-11`}
              />

              {searchTerm && (
                <button
                  type="button"
                  aria-label="Limpiar búsqueda"
                  onClick={() =>
                    setSearchTerm("")
                  }
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-red-500"
                >
                  <FiX size={15} />
                </button>
              )}
            </div>
          </div>

          <div className="flex gap-2 overflow-x-auto custom-scrollbar mt-4 pb-1">
            {[
              "TODOS",
              "REPONEDOR",
              "SUPERVISOR",
            ].map((filter) => (
              <button
                key={filter}
                type="button"
                onClick={() =>
                  setActiveFilter(
                    filter,
                  )
                }
                className={`px-4 py-2.5 rounded-full text-[10px] font-black uppercase tracking-wider whitespace-nowrap border transition-all ${
                  activeFilter ===
                  filter
                    ? "bg-gray-900 text-white border-gray-900"
                    : "bg-white text-gray-500 border-gray-200 hover:border-[#87be00] hover:text-[#87be00]"
                }`}
              >
                {filter === "REPONEDOR"
                  ? "Mercaderista"
                  : filter}
              </button>
            ))}
          </div>

          {hasFilters && (
            <div className="mt-4">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                leftIcon={
                  <FiX size={13} />
                }
                onClick={clearFilters}
              >
                Limpiar filtros
              </Button>
            </div>
          )}
        </section>

        {canSelectCompany &&
        !effectiveCompanyId ? (
          <InformationMessage
            title="Selecciona una empresa"
            description="Elige una empresa para administrar sus preguntas."
          />
        ) : loading ? (
          <div className="py-20 flex flex-col items-center gap-4 text-gray-400">
            <FiRefreshCw
              size={30}
              className="animate-spin text-[#87be00]"
            />

            <p className="text-[10px] font-black uppercase tracking-wider">
              Cargando preguntas...
            </p>
          </div>
        ) : error ? (
          <InformationMessage
            title="No se pudieron cargar las preguntas"
            description={error}
            action={
              <Button
                type="button"
                variant="secondary"
                leftIcon={
                  <FiRefreshCw
                    size={14}
                  />
                }
                onClick={loadQuestions}
              >
                Intentar nuevamente
              </Button>
            }
          />
        ) : (
          <section className="bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden">
            <div className="p-5 md:p-6 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between gap-4">
              <div>
                <p className="text-[9px] font-black uppercase text-gray-500 tracking-wider">
                  Estructura del cuestionario
                </p>

                <p className="text-[10px] text-gray-400 mt-1">
                  Filtro:{" "}
                  {activeFilter ===
                  "REPONEDOR"
                    ? "Mercaderista"
                    : activeFilter}
                </p>
              </div>

              <span className="text-[9px] font-black text-[#87be00] uppercase bg-[#87be00]/10 px-3 py-1.5 rounded-full">
                {
                  filteredQuestions.length
                }{" "}
                ítem
                {filteredQuestions.length ===
                1
                  ? ""
                  : "s"}
              </span>
            </div>

            {filteredQuestions.length ===
            0 ? (
              <div className="p-5">
                <InformationMessage
                  title="Sin información disponible"
                  description="No existen preguntas que coincidan con los filtros seleccionados."
                  compact
                />
              </div>
            ) : (
              <div className="p-4 md:p-6 space-y-3">
                {filteredQuestions.map(
                  (
                    question,
                    index,
                  ) => (
                    <QuestionCard
                      key={question.id}
                      question={
                        question
                      }
                      index={index}
                      onEdit={() =>
                        handleEdit(
                          question,
                        )
                      }
                      onDelete={() =>
                        handleDelete(
                          question,
                        )
                      }
                    />
                  ),
                )}
              </div>
            )}
          </section>
        )}
      </main>

      <CreateQuestionModal
        isOpen={createOpen}
        onClose={() =>
          setCreateOpen(false)
        }
        onCreated={loadQuestions}
        companyId={effectiveCompanyId}
        companies={
          canSelectCompany
            ? companies
            : []
        }
      />

      <EditQuestionModal
        isOpen={editOpen}
        onClose={() => {
          setEditOpen(false);
          setSelectedQuestion(null);
        }}
        question={
          selectedQuestion
        }
        onUpdated={loadQuestions}
        companyId={effectiveCompanyId}
        companies={
          canSelectCompany
            ? companies
            : []
        }
      />

      {deleteQuestionTarget && (
        <DeleteQuestionModal
          question={
            deleteQuestionTarget
          }
          loading={
            deletingQuestion
          }
          onClose={
            closeDeleteQuestionModal
          }
          onConfirm={
            confirmDeleteQuestion
          }
        />
      )}
    </div>
  );
};

const DeleteQuestionModal = ({
  question,
  loading,
  onClose,
  onConfirm,
}) => {
  const flow = String(
    question?.target_flow || "",
  ).toLowerCase();

  const type = String(
    question?.type || "TEXT",
  ).toUpperCase();

  return (
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center bg-[#111111]/70 p-3 font-[Outfit] backdrop-blur-sm sm:p-5"
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-question-title"
      onMouseDown={(event) => {
        if (
          event.target ===
            event.currentTarget &&
          !loading
        ) {
          onClose();
        }
      }}
    >
      <div className="relative w-full max-w-lg overflow-hidden rounded-[2rem] border border-white/60 bg-white shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        <div className="absolute inset-x-0 top-0 h-1 bg-red-500" />

        <header className="flex items-start justify-between gap-4 border-b border-gray-100 px-5 py-5 sm:px-7 sm:py-6">
          <div className="flex min-w-0 items-start gap-3.5">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-red-50 text-red-500">
              <FiTrash2 size={21} />
            </div>

            <div className="min-w-0">
              <p className="text-[9px] font-black uppercase tracking-[0.22em] text-red-500">
                Confirmar eliminación
              </p>

              <h2
                id="delete-question-title"
                className="mt-1 text-xl font-black leading-tight tracking-tight text-gray-900 sm:text-2xl"
              >
                Eliminar pregunta
              </h2>

              <p className="mt-2 text-[11px] font-medium leading-relaxed text-gray-400">
                Revisa la información antes de continuar.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            aria-label="Cerrar modal de eliminación"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-gray-100 bg-gray-50 text-gray-400 transition-all hover:border-red-100 hover:bg-red-50 hover:text-red-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <FiX size={18} />
          </button>
        </header>

        <div className="space-y-4 bg-gray-50/40 px-5 py-5 sm:px-7 sm:py-6">
          <section className="rounded-[1.5rem] border border-red-100 bg-red-50/70 p-4 sm:p-5">
            <div className="flex items-start gap-3">
              <FiAlertCircle
                className="mt-0.5 shrink-0 text-red-500"
                size={18}
              />

              <div>
                <h3 className="text-[10px] font-black uppercase tracking-[0.14em] text-red-600">
                  Esta acción requiere confirmación
                </h3>

                <p className="mt-2 text-[11px] font-semibold leading-relaxed text-red-700/80">
                  La pregunta dejará de estar disponible en el cuestionario de la empresa.
                </p>
              </div>
            </div>
          </section>

          <section className="overflow-hidden rounded-[1.5rem] border border-gray-100 bg-white shadow-sm">
            <div className="border-b border-gray-100 p-4 sm:p-5">
              <p className="text-[8px] font-black uppercase tracking-[0.16em] text-gray-400">
                Pregunta seleccionada
              </p>

              <p className="mt-2 text-sm font-black leading-relaxed text-gray-900">
                {question?.question ||
                  "Pregunta sin contenido"}
              </p>
            </div>

            <div className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2 sm:p-5">
              <div className="rounded-2xl border border-gray-100 bg-gray-50 px-3.5 py-3">
                <p className="text-[8px] font-black uppercase tracking-[0.14em] text-gray-400">
                  Flujo
                </p>

                <p className="mt-1 text-[10px] font-bold text-gray-700">
                  {FLOW_LABELS[flow] ||
                    question?.target_flow ||
                    "Sin flujo"}
                </p>
              </div>

              <div className="rounded-2xl border border-gray-100 bg-gray-50 px-3.5 py-3">
                <p className="text-[8px] font-black uppercase tracking-[0.14em] text-gray-400">
                  Tipo
                </p>

                <p className="mt-1 text-[10px] font-bold text-gray-700">
                  {TYPE_LABELS[type] ||
                    type}
                </p>
              </div>

              <div className="rounded-2xl border border-gray-100 bg-gray-50 px-3.5 py-3 sm:col-span-2">
                <p className="text-[8px] font-black uppercase tracking-[0.14em] text-gray-400">
                  ID
                </p>

                <p className="mt-1 break-all font-mono text-[9px] font-bold text-gray-500">
                  {question?.id ||
                    "No disponible"}
                </p>
              </div>
            </div>
          </section>
        </div>

        <footer className="grid grid-cols-1 gap-3 border-t border-gray-100 bg-white px-5 py-4 sm:grid-cols-2 sm:px-7">
          <Button
            type="button"
            variant="secondary"
            size="lg"
            fullWidth
            disabled={loading}
            onClick={onClose}
          >
            Cancelar
          </Button>

          <Button
            type="button"
            variant="danger"
            size="lg"
            fullWidth
            loading={loading}
            loadingText="Eliminando..."
            leftIcon={
              !loading ? (
                <FiTrash2 size={15} />
              ) : null
            }
            onClick={onConfirm}
          >
            Eliminar pregunta
          </Button>
        </footer>
      </div>
    </div>
  );
};

const QuestionCard = ({
  question,
  index,
  onEdit,
  onDelete,
}) => {
  const type = String(
    question.type || "TEXT",
  ).toUpperCase();

  const flow = String(
    question.target_flow || "",
  ).toLowerCase();

  return (
    <article className="group bg-white border border-gray-100 rounded-[1.5rem] p-4 md:p-5 hover:border-[#87be00]/40 hover:shadow-sm transition-all">
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div className="flex items-start gap-4 min-w-0 flex-1">
          <div className="w-10 h-10 shrink-0 bg-gray-50 rounded-xl flex items-center justify-center text-gray-400 font-black text-xs">
            {index + 1}
          </div>

          <div className="min-w-0 flex-1">
            <p className="text-sm md:text-base font-black text-gray-800 leading-snug break-words">
              {question.question ||
                "Pregunta sin contenido"}
            </p>

            <div className="flex flex-wrap gap-2 mt-3">
              <span className="text-[8px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full bg-gray-100 text-gray-500 border border-gray-200">
                {FLOW_LABELS[
                  flow
                ] ||
                  question.target_flow ||
                  "Sin flujo"}
              </span>

              <span className="text-[8px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full bg-[#87be00]/10 text-[#6a9400] border border-[#87be00]/20">
                {TYPE_LABELS[
                  type
                ] || type}
              </span>

              {question.is_required !==
                undefined && (
                <span
                  className={`text-[8px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full border ${
                    question.is_required
                      ? "bg-red-50 text-red-600 border-red-100"
                      : "bg-blue-50 text-blue-600 border-blue-100"
                  }`}
                >
                  {question.is_required
                    ? "Obligatoria"
                    : "Opcional"}
                </span>
              )}
            </div>

            <QuestionPreview
              type={type}
              options={
                question.options
              }
            />

            <p
              className="mt-3 font-mono text-[8px] text-gray-400 truncate select-all"
              title={question.id}
            >
              ID:{" "}
              {question.id ||
                "No disponible"}
            </p>
          </div>
        </div>

        <div className="flex gap-2 justify-end shrink-0">
          <IconButton
            label="Editar pregunta"
            size="sm"
            onClick={onEdit}
          >
            <FiEdit size={14} />
          </IconButton>

          <IconButton
            label="Eliminar pregunta"
            size="sm"
            variant="danger"
            onClick={onDelete}
          >
            <FiTrash2
              size={14}
            />
          </IconButton>
        </div>
      </div>
    </article>
  );
};

const QuestionPreview = ({
  type,
  options,
}) => {
  if (
    type === "BOOLEAN" ||
    type === "SI_NO" ||
    type === "SI/NO"
  ) {
    return (
      <div className="mt-4 flex flex-wrap gap-3">
        {["Sí", "No"].map(
          (option) => (
            <div
              key={option}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-gray-50 border border-gray-100"
            >
              <span className="w-4 h-4 rounded-full border-2 border-gray-300" />

              <span className="text-[9px] font-black text-gray-600 uppercase">
                {option}
              </span>
            </div>
          ),
        )}
      </div>
    );
  }

  if (
    type === "SELECT" ||
    type === "MULTIPLE"
  ) {
    const normalizedOptions =
      Array.isArray(options)
        ? options
        : [];

    return (
      <div className="mt-4 flex flex-wrap gap-2">
        {normalizedOptions.length >
        0 ? (
          normalizedOptions.map(
            (option, index) => (
              <span
                key={`${option}-${index}`}
                className="px-3 py-2 rounded-xl bg-gray-50 border border-gray-100 text-[9px] font-bold text-gray-500"
              >
                {String(option)}
              </span>
            ),
          )
        ) : (
          <span className="text-[9px] font-bold text-gray-400">
            Sin opciones configuradas
          </span>
        )}
      </div>
    );
  }

  if (
    type === "NUMBER" ||
    type === "NUMERO"
  ) {
    return (
      <div className="mt-4 max-w-xs bg-gray-50 border border-dashed border-gray-200 rounded-2xl px-4 py-3 text-[10px] font-black text-gray-400">
        Ingresar valor numérico...
      </div>
    );
  }

  if (type === "PHOTO") {
    return (
      <div className="mt-4 max-w-xs bg-gray-50 border border-dashed border-gray-200 rounded-2xl px-4 py-6 text-center">
        <FiCheckCircle
          size={20}
          className="mx-auto text-gray-300"
        />

        <p className="text-[9px] font-black text-gray-400 uppercase mt-2">
          Adjuntar fotografía
        </p>
      </div>
    );
  }

  return (
    <div className="mt-4 max-w-sm bg-gray-50 border border-dashed border-gray-200 rounded-2xl px-4 py-3 text-[10px] font-black text-gray-400">
      Escribir respuesta libre...
    </div>
  );
};

const InformationMessage = ({
  title,
  description,
  action,
  compact = false,
}) => (
  <section
    className={`bg-white border border-dashed border-gray-200 rounded-[2rem] px-6 text-center ${
      compact
        ? "py-10"
        : "py-14"
    }`}
  >
    <FiAlertCircle
      size={28}
      className="mx-auto text-gray-300"
    />

    <h2 className="text-lg font-black text-gray-800 mt-4">
      {title}
    </h2>

    {description && (
      <p className="text-sm text-gray-400 mt-2 max-w-xl mx-auto">
        {description}
      </p>
    )}

    {action && (
      <div className="mt-5">
        {action}
      </div>
    )}
  </section>
);

const inputClass = `
  w-full h-12 px-4
  bg-gray-50 border border-gray-100
  rounded-2xl
  text-xs font-bold text-gray-700
  outline-none transition-all
  focus:bg-white
  focus:border-[#87be00]/50
  focus:ring-4 focus:ring-[#87be00]/10
`;

export default QuestionsManager;