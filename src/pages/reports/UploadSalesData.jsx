import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  FiAlertTriangle,
  FiBriefcase,
  FiCheckCircle,
  FiDatabase,
  FiFileText,
  FiInfo,
  FiRefreshCw,
  FiUploadCloud,
  FiX,
} from "react-icons/fi";
import { toast } from "react-hot-toast";
import api from "../../api/apiClient";
import { useAuth } from "../../context/AuthContext";
import {
  Button,
  IconButton,
} from "../../components/ui";

const ALLOWED_EXTENSIONS = [
  ".csv",
  ".xlsx",
  ".xls",
];

const MAX_FILE_SIZE =
  25 * 1024 * 1024;

const INITIAL_UPLOAD_STATE = {
  loading: false,
  success: false,
  error: null,
  progress: 0,
  result: null,
};

const getResponseData = (
  response,
  fallback = null,
) => {
  if (response == null) return fallback;
  return response?.data ?? response;
};

const getFileExtension = (fileName = "") => {
  const normalized = String(fileName)
    .trim()
    .toLowerCase();

  const dotIndex =
    normalized.lastIndexOf(".");

  return dotIndex >= 0
    ? normalized.slice(dotIndex)
    : "";
};

const formatFileSize = (bytes = 0) => {
  const size = Number(bytes) || 0;

  if (size < 1024) {
    return `${size} B`;
  }

  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(
      1,
    )} KB`;
  }

  return `${(
    size /
    1024 /
    1024
  ).toFixed(2)} MB`;
};

const UploadSalesData = () => {
  const { user } = useAuth();

  const isRoot =
    user?.role === "ROOT";

  const [file, setFile] =
    useState(null);
  const [
    isDragging,
    setIsDragging,
  ] = useState(false);
  const [
    companies,
    setCompanies,
  ] = useState([]);
  const [
    companyId,
    setCompanyId,
  ] = useState(
    user?.company_id || "",
  );
  const [
    loadingCompanies,
    setLoadingCompanies,
  ] = useState(false);
  const [
    uploadState,
    setUploadState,
  ] = useState(
    INITIAL_UPLOAD_STATE,
  );

  const fileInputRef =
    useRef(null);

  useEffect(() => {
    if (
      !isRoot &&
      user?.company_id
    ) {
      setCompanyId(
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
        setLoadingCompanies(true);

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
      } catch (error) {
        console.error(
          "Error cargando empresas:",
          error,
        );

        toast.error(
          "No se pudieron cargar las empresas",
        );
      } finally {
        setLoadingCompanies(false);
      }
    }, [isRoot]);

  useEffect(() => {
    fetchCompanies();
  }, [fetchCompanies]);

  const resetUploadState = () => {
    setUploadState(
      INITIAL_UPLOAD_STATE,
    );
  };

  const validateFile = (
    selectedFile,
  ) => {
    if (!selectedFile) {
      return {
        valid: false,
        message:
          "No se seleccionó ningún archivo.",
      };
    }

    const extension =
      getFileExtension(
        selectedFile.name,
      );

    if (
      !ALLOWED_EXTENSIONS.includes(
        extension,
      )
    ) {
      return {
        valid: false,
        message:
          "Formato no soportado. Usa CSV, XLSX o XLS.",
      };
    }

    if (
      Number(selectedFile.size) <= 0
    ) {
      return {
        valid: false,
        message:
          "El archivo está vacío.",
      };
    }

    if (
      selectedFile.size >
      MAX_FILE_SIZE
    ) {
      return {
        valid: false,
        message:
          "El archivo supera el máximo permitido de 25 MB.",
      };
    }

    return {
      valid: true,
      message: "",
    };
  };

  const validateAndSetFile = (
    selectedFile,
  ) => {
    const validation =
      validateFile(selectedFile);

    if (!validation.valid) {
      setFile(null);

      setUploadState({
        ...INITIAL_UPLOAD_STATE,
        error:
          validation.message,
      });

      if (
        fileInputRef.current
      ) {
        fileInputRef.current.value =
          "";
      }

      return;
    }

    setFile(selectedFile);
    resetUploadState();
  };

  const handleDragOver = (
    event,
  ) => {
    event.preventDefault();

    if (!uploadState.loading) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (
    event,
  ) => {
    event.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (event) => {
    event.preventDefault();
    setIsDragging(false);

    if (uploadState.loading) {
      return;
    }

    validateAndSetFile(
      event.dataTransfer
        .files?.[0],
    );
  };

  const handleFileInput = (
    event,
  ) => {
    validateAndSetFile(
      event.target.files?.[0],
    );
  };

  const removeFile = () => {
    if (uploadState.loading) {
      return;
    }

    setFile(null);

    if (
      fileInputRef.current
    ) {
      fileInputRef.current.value =
        "";
    }

    resetUploadState();
  };

  const handleUpload = async () => {
    if (!file) {
      toast.error(
        "Selecciona un archivo para continuar.",
      );
      return;
    }

    if (!companyId) {
      toast.error(
        "Selecciona una empresa para cargar las ventas.",
      );
      return;
    }

    const validation =
      validateFile(file);

    if (!validation.valid) {
      setUploadState({
        ...INITIAL_UPLOAD_STATE,
        error:
          validation.message,
      });
      return;
    }

    const formData =
      new FormData();

    formData.append(
      "file",
      file,
    );
    formData.append(
      "company_id",
      companyId,
    );

    setUploadState({
      loading: true,
      success: false,
      error: null,
      progress: 0,
      result: null,
    });

    try {
      const response =
        await api.post(
          "/sales/upload",
          formData,
          {
            headers: {
              "Content-Type":
                "multipart/form-data",
            },
            onUploadProgress: (
              progressEvent,
            ) => {
              const total =
                progressEvent.total;

              if (!total) return;

              const progress =
                Math.min(
                  100,
                  Math.round(
                    (progressEvent.loaded *
                      100) /
                      total,
                  ),
                );

              setUploadState(
                (current) => ({
                  ...current,
                  progress,
                }),
              );
            },
          },
        );

      const result =
        getResponseData(
          response,
          {},
        );

      setUploadState({
        loading: false,
        success: true,
        error: null,
        progress: 100,
        result,
      });

      toast.success(
        "Archivo procesado correctamente",
      );
    } catch (error) {
      console.error(
        "Error cargando ventas:",
        error,
      );

      setUploadState({
        loading: false,
        success: false,
        error:
          error?.response?.data
            ?.message ||
          error?.response?.data
            ?.error ||
          error?.message ||
          "No se pudo procesar el archivo.",
        progress: 0,
        result: null,
      });
    }
  };

  const selectedCompany =
    companies.find(
      (company) =>
        company.id === companyId,
    );

  const canUpload =
    Boolean(file) &&
    Boolean(companyId) &&
    !uploadState.loading;

  return (
    <div className="w-full min-h-full bg-gray-50/40 font-[Outfit] pb-20">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 md:px-8 pt-4 md:pt-8">
        <header className="mb-6 md:mb-8">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-[#87be00]/10 rounded-xl text-[#87be00]">
              <FiDatabase
                size={20}
              />
            </div>

            <div>
              <h1 className="text-3xl md:text-5xl font-black text-gray-900 tracking-tight leading-none">
                Carga de ventas
              </h1>

              <p className="text-[10px] font-black text-[#87be00] uppercase tracking-[0.2em] mt-2">
                Importación de archivos
                CSV y Excel
              </p>
            </div>
          </div>
        </header>

        <section className="bg-white p-5 sm:p-7 md:p-9 rounded-[2rem] md:rounded-[2.5rem] shadow-sm border border-gray-100">
          {isRoot && (
            <div className="mb-6">
              <label className="text-[9px] font-black text-gray-500 uppercase tracking-wider ml-1 mb-2 block">
                Empresa de destino
              </label>

              <div className="relative">
                <FiBriefcase
                  size={16}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                />

                <select
                  value={companyId}
                  disabled={
                    loadingCompanies ||
                    uploadState.loading
                  }
                  onChange={(event) => {
                    setCompanyId(
                      event.target.value,
                    );
                    resetUploadState();
                  }}
                  className="w-full h-12 pl-11 pr-4 bg-gray-50 border border-gray-100 rounded-2xl text-xs font-black text-gray-600 outline-none focus:bg-white focus:border-[#87be00]/50 transition-all cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
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

              {loadingCompanies && (
                <p className="text-[10px] text-gray-400 mt-2 ml-1">
                  Cargando empresas...
                </p>
              )}
            </div>
          )}

          {!isRoot &&
            user?.company_id && (
              <div className="mb-6 rounded-2xl border border-green-100 bg-green-50 px-4 py-3">
                <p className="text-[9px] font-black text-green-700 uppercase tracking-wider">
                  Empresa asignada
                </p>

                <p className="text-xs font-bold text-green-800 mt-1">
                  {user?.company_name ||
                    user?.company?.name ||
                    "Empresa actual"}
                </p>
              </div>
            )}

          {uploadState.success ? (
            <SuccessState
              file={file}
              companyName={
                selectedCompany?.name ||
                selectedCompany?.nombre ||
                user?.company_name ||
                user?.company?.name
              }
              result={
                uploadState.result
              }
              onReset={removeFile}
            />
          ) : (
            <>
              <UploadDropzone
                file={file}
                isDragging={
                  isDragging
                }
                loading={
                  uploadState.loading
                }
                fileInputRef={
                  fileInputRef
                }
                onDragOver={
                  handleDragOver
                }
                onDragLeave={
                  handleDragLeave
                }
                onDrop={handleDrop}
                onFileInput={
                  handleFileInput
                }
                onRemove={removeFile}
              />

              {uploadState.loading && (
                <UploadProgress
                  progress={
                    uploadState.progress
                  }
                />
              )}

              {uploadState.error && (
                <ErrorMessage
                  message={
                    uploadState.error
                  }
                />
              )}

              {!uploadState.loading &&
                file &&
                !uploadState.error && (
                  <div className="mt-6 p-4 bg-blue-50/70 border border-blue-100 rounded-2xl flex items-start gap-3">
                    <FiInfo
                      className="text-blue-500 shrink-0 mt-0.5"
                      size={17}
                    />

                    <div>
                      <p className="text-[10px] font-black text-blue-800 uppercase tracking-wider">
                        Prevención de
                        duplicados activa
                      </p>

                      <p className="text-[10px] text-blue-700/80 mt-1 leading-relaxed">
                        El servidor validará
                        los registros antes
                        de insertarlos. Revisa
                        que el archivo
                        corresponda a la
                        empresa seleccionada.
                      </p>
                    </div>
                  </div>
                )}

              <Button
                type="button"
                variant="dark"
                size="lg"
                fullWidth
                loading={
                  uploadState.loading
                }
                loadingText={`Procesando ${uploadState.progress}%`}
                disabled={!canUpload}
                leftIcon={
                  <FiUploadCloud
                    size={18}
                  />
                }
                onClick={handleUpload}
                className="mt-7"
              >
                Procesar datos
              </Button>

              {!companyId && (
                <p className="text-center text-[10px] font-bold text-amber-600 mt-3">
                  Selecciona una empresa
                  antes de procesar el
                  archivo.
                </p>
              )}
            </>
          )}
        </section>
      </div>
    </div>
  );
};

const UploadDropzone = ({
  file,
  isDragging,
  loading,
  fileInputRef,
  onDragOver,
  onDragLeave,
  onDrop,
  onFileInput,
  onRemove,
}) => (
  <div
    onDragOver={onDragOver}
    onDragLeave={onDragLeave}
    onDrop={onDrop}
    onClick={() => {
      if (
        !file &&
        !loading
      ) {
        fileInputRef.current?.click();
      }
    }}
    className={`
      relative flex flex-col items-center justify-center
      min-h-[300px] p-6 sm:p-10
      rounded-[2rem] border-2 transition-all
      ${
        isDragging
          ? "border-[#87be00] bg-[#87be00]/5 scale-[1.01]"
          : file
            ? "border-gray-100 bg-gray-50"
            : "border-dashed border-gray-200 hover:border-[#87be00]/50 hover:bg-[#87be00]/5 cursor-pointer"
      }
    `}
  >
    <input
      type="file"
      ref={fileInputRef}
      onChange={onFileInput}
      accept=".csv,.xlsx,.xls"
      disabled={loading}
      className="hidden"
    />

    {!file ? (
      <>
        <div
          className={`w-20 h-20 rounded-3xl flex items-center justify-center mb-6 transition-all ${
            isDragging
              ? "bg-[#87be00] text-white shadow-lg"
              : "bg-white border border-gray-100 text-[#87be00] shadow-sm"
          }`}
        >
          <FiUploadCloud
            size={36}
          />
        </div>

        <p className="text-sm font-black text-gray-800 text-center">
          {isDragging
            ? "Suelta el archivo aquí"
            : "Arrastra tu archivo aquí"}
        </p>

        <p className="text-[10px] font-bold text-gray-400 uppercase mt-3 tracking-wider text-center">
          o haz clic para buscar en tu
          equipo
        </p>

        <div className="flex flex-wrap justify-center gap-2 mt-6">
          {["CSV", "XLSX", "XLS"].map(
            (extension) => (
              <span
                key={extension}
                className="px-3 py-1 bg-gray-100 text-gray-500 rounded-lg text-[9px] font-black"
              >
                {extension}
              </span>
            ),
          )}
        </div>

        <p className="text-[9px] text-gray-400 mt-4">
          Tamaño máximo: 25 MB
        </p>
      </>
    ) : (
      <div className="w-full flex items-center justify-between gap-4 bg-white p-4 sm:p-5 rounded-2xl shadow-sm border border-gray-100">
        <div className="flex items-center gap-4 min-w-0">
          <div className="w-12 h-12 bg-[#87be00]/10 text-[#87be00] rounded-xl flex items-center justify-center shrink-0">
            <FiFileText
              size={23}
            />
          </div>

          <div className="min-w-0">
            <p
              className="text-xs font-black text-gray-900 truncate"
              title={file.name}
            >
              {file.name}
            </p>

            <p className="text-[10px] font-bold text-gray-400 mt-1">
              {formatFileSize(
                file.size,
              )}
            </p>
          </div>
        </div>

        {!loading && (
          <IconButton
            label="Quitar archivo"
            size="sm"
            variant="danger"
            onClick={(event) => {
              event.stopPropagation();
              onRemove();
            }}
            className="shrink-0"
          >
            <FiX size={16} />
          </IconButton>
        )}
      </div>
    )}
  </div>
);

const UploadProgress = ({
  progress,
}) => (
  <div className="mt-7">
    <div className="flex justify-between items-center mb-3 gap-4">
      <span className="text-[10px] font-black uppercase text-gray-500 tracking-wider">
        Procesando archivo...
      </span>

      <span className="text-xs font-black text-[#87be00]">
        {progress}%
      </span>
    </div>

    <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
      <div
        className="bg-[#87be00] h-full rounded-full transition-all duration-300"
        style={{
          width: `${progress}%`,
        }}
      />
    </div>
  </div>
);

const ErrorMessage = ({
  message,
}) => (
  <div className="mt-6 p-4 bg-red-50 border border-red-100 rounded-2xl flex items-start gap-3">
    <div className="w-10 h-10 bg-red-100 text-red-500 rounded-xl flex items-center justify-center shrink-0">
      <FiAlertTriangle
        size={18}
      />
    </div>

    <div>
      <p className="text-[10px] font-black text-red-700 uppercase tracking-wider">
        No se pudo procesar el archivo
      </p>

      <p className="text-xs text-red-600 mt-1 leading-relaxed">
        {message}
      </p>
    </div>
  </div>
);

const SuccessState = ({
  file,
  companyName,
  result,
  onReset,
}) => {
  const inserted =
    result?.inserted ??
    result?.insertedRows ??
    result?.created ??
    result?.success_count;

  const skipped =
    result?.skipped ??
    result?.duplicates ??
    result?.duplicateRows ??
    result?.skipped_count;

  const errors =
    result?.errors_count ??
    result?.failed ??
    result?.invalidRows;

  const hasSummary = [
    inserted,
    skipped,
    errors,
  ].some(
    (value) =>
      value !== undefined &&
      value !== null,
  );

  return (
    <div className="py-8 sm:py-10 text-center">
      <div className="w-20 h-20 mx-auto bg-[#87be00]/10 rounded-full flex items-center justify-center">
        <div className="w-14 h-14 bg-[#87be00] rounded-full flex items-center justify-center shadow-lg shadow-[#87be00]/25">
          <FiCheckCircle
            size={29}
            className="text-white"
          />
        </div>
      </div>

      <h2 className="text-2xl font-black text-gray-900 mt-6">
        Carga completada
      </h2>

      <p className="text-sm text-gray-500 mt-2">
        El archivo{" "}
        <strong className="text-[#87be00] break-all">
          {file?.name}
        </strong>{" "}
        se procesó correctamente.
      </p>

      {companyName && (
        <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider mt-2">
          Empresa: {companyName}
        </p>
      )}

      {hasSummary && (
        <div className="grid grid-cols-3 gap-2 sm:gap-3 mt-7">
          <ResultCard
            label="Insertados"
            value={inserted ?? 0}
            tone="success"
          />

          <ResultCard
            label="Omitidos"
            value={skipped ?? 0}
            tone="warning"
          />

          <ResultCard
            label="Errores"
            value={errors ?? 0}
            tone="danger"
          />
        </div>
      )}

      {!hasSummary && (
        <div className="mt-7 rounded-2xl border border-gray-100 bg-gray-50 p-4">
          <p className="text-xs font-bold text-gray-400">
            El servidor no entregó un
            resumen detallado de la carga.
          </p>
        </div>
      )}

      <Button
        type="button"
        variant="secondary"
        size="lg"
        leftIcon={
          <FiRefreshCw size={15} />
        }
        onClick={onReset}
        className="mt-7"
      >
        Subir otro archivo
      </Button>
    </div>
  );
};

const ResultCard = ({
  label,
  value,
  tone,
}) => {
  const tones = {
    success:
      "bg-green-50 border-green-100 text-green-700",
    warning:
      "bg-amber-50 border-amber-100 text-amber-700",
    danger:
      "bg-red-50 border-red-100 text-red-600",
  };

  return (
    <div
      className={`rounded-2xl border p-3 sm:p-4 ${
        tones[tone]
      }`}
    >
      <p className="text-[8px] sm:text-[9px] font-black uppercase tracking-wider opacity-70">
        {label}
      </p>

      <p className="text-xl sm:text-2xl font-black mt-1">
        {value}
      </p>
    </div>
  );
};

export default UploadSalesData;