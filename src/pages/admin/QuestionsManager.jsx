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

  const isRoot =
    user?.role === "ROOT";

  const [questions, setQuestions] =
    useState([]);
  const [companies, setCompanies] =
    useState([]);
  const [
    selectedCompany,
    setSelectedCompany,
  ] = useState(
    isRoot
      ? ""
      : user?.company_id || "",
  );
  const [createOpen, setCreateOpen] =
    useState(false);
  const [editOpen, setEditOpen] =
    useState(false);
  const [
    selectedQuestion,
    setSelectedQuestion,
  ] = useState(null);
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
    if (
      !isRoot &&
      user?.company_id
    ) {
      setSelectedCompany(
        user.company_id,
      );
    }
  }, [
    isRoot,
    user?.company_id,
  ]);

  const fetchCompanies =
    useCallback(async () => {
      if (!isRoot) return;

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
    }, [isRoot]);

  const loadQuestions =
    useCallback(async () => {
      try {
        setLoading(true);
        setError("");

        const params =
          selectedCompany
            ? {
                company_id:
                  selectedCompany,
              }
            : undefined;

        const response =
          await api.get(
            "/questions",
            {
              params,
            },
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

        setQuestions(data);
      } catch (requestError) {
        console.error(
          "Error cargando preguntas:",
          requestError,
        );

        setError(
          requestError?.response?.data
            ?.message ||
            requestError?.message ||
            "No se pudo cargar el cuestionario.",
        );
      } finally {
        setLoading(false);
      }
    }, [selectedCompany]);

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

  const handleDelete = async (
    question,
  ) => {
    const confirmed =
      window.confirm(
        `¿Eliminar esta pregunta?\n\n${question.question}\n\nID: ${question.id}`,
      );

    if (!confirmed) return;

    try {
      await api.delete(
        `/questions/${question.id}`,
      );

      toast.success(
        "Pregunta eliminada",
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
          "No se pudo eliminar la pregunta",
      );
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
              isRoot &&
              !selectedCompany
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
              isRoot
                ? "md:grid-cols-[260px_1fr]"
                : ""
            }`}
          >
            {isRoot && (
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

        {isRoot &&
        !selectedCompany ? (
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
        companyId={selectedCompany}
        companies={companies}
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
        companies={companies}
      />
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