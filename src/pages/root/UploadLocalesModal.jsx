import { useState, useEffect } from "react";
import {
  FiX,
  FiUpload,
  FiCheckCircle,
  FiAlertCircle,
  FiLoader,
  FiInfo
} from "react-icons/fi";
import api from "../../api/apiClient";
import toast from "react-hot-toast";

const CULTIVA_ADMIN_USER_ID =
  "97c6f210-eccc-48fe-b6b9-65dcf5968857";

const getStoredUser = () => {
  try {
    const storedUser =
      localStorage.getItem("user");

    if (!storedUser) {
      return null;
    }

    const parsedUser =
      JSON.parse(storedUser);

    return parsedUser?.user || parsedUser;
  } catch {
    return null;
  }
};

const UploadLocalesModal = ({
  isOpen,
  onClose,
  onUploaded,
  companies = [],
  companyId: autoCompanyId = null
}) => {
  const currentUser = getStoredUser();

  const normalizedRole = String(
    currentUser?.role || ""
  )
    .trim()
    .toUpperCase();

  const currentUserId = String(
    currentUser?.id ||
      currentUser?.user_id ||
      ""
  ).trim();

  const currentUserCompanyId =
    currentUser?.company_id ||
    currentUser?.companyId ||
    "";

  const isRoot =
    normalizedRole === "ROOT";

  const isCultivaAdmin =
    currentUserId ===
      CULTIVA_ADMIN_USER_ID &&
    [
      "ADMIN",
      "ADMIN_CLIENTE"
    ].includes(normalizedRole);

  const canSelectCompany =
    isRoot || isCultivaAdmin;

  const assignedCompanyId =
    autoCompanyId ||
    currentUserCompanyId ||
    "";

  const [company_id, setCompanyId] = useState(
    assignedCompanyId
  );
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);

  useEffect(() => {
    if (canSelectCompany) {
      if (autoCompanyId) {
        setCompanyId(autoCompanyId);
      }

      return;
    }

    setCompanyId(assignedCompanyId);
  }, [
    autoCompanyId,
    assignedCompanyId,
    canSelectCompany
  ]);

  if (!isOpen) return null;

  const resetState = () => {
    setCompanyId(
      canSelectCompany
        ? autoCompanyId || ""
        : assignedCompanyId
    );

    setFile(null);
    setError("");
    setResult(null);
    setLoading(false);
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files?.[0];

    if (!selectedFile) {
      return;
    }

    const allowedExtensions = [
      ".xlsx",
      ".xls"
    ];

    const fileExtension = selectedFile.name
      .substring(
        selectedFile.name.lastIndexOf(".")
      )
      .toLowerCase();

    if (
      !allowedExtensions.includes(
        fileExtension
      )
    ) {
      setError(
        "El archivo debe ser Excel (.xlsx o .xls)"
      );
      setFile(null);
      e.target.value = "";
      return;
    }

    setFile(selectedFile);
    setError("");
    setResult(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    setError("");
    setResult(null);

    if (!company_id) {
      setError(
        "Debes seleccionar una empresa"
      );
      return;
    }

    if (!file) {
      setError(
        "Selecciona un archivo Excel"
      );
      return;
    }

    try {
      setLoading(true);

      const formData = new FormData();

      formData.append("file", file);
      formData.append(
        "company_id",
        company_id
      );

      const data = await api.post(
        "/locales/upload",
        formData
      );


      setResult(data);

      if (data?.inserted > 0) {
        toast.success(
          `¡Éxito! ${data.inserted} locales procesados.`
        );
      }

      if (data?.skipped > 0) {
        toast(
          `${data.skipped} locales ya existían y fueron omitidos.`,
          {
            icon: "ℹ️"
          }
        );
      }

      if (
        data?.errors &&
        data.errors.length > 0
      ) {
        toast.error(
          `${data.errors.length} locales no pudieron ingresarse.`
        );
      }

      if (onUploaded) {
        onUploaded();
      }
    } catch (err) {
      console.error(
        "❌ Error carga masiva:",
        err.response?.data || err
      );

      const msg =
        err.response?.data?.message ||
        err.message ||
        "Error al procesar el archivo";

      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 font-[Outfit]">
      <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl p-8 space-y-6 animate-in zoom-in duration-300">
        <div className="flex justify-between items-center border-b pb-4">
          <div>
            <h3 className="text-xl font-black text-gray-800 uppercase tracking-tight">
              Carga Masiva
            </h3>

            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">
              Importar locales desde Excel
            </p>
          </div>

          <button
            type="button"
            onClick={handleClose}
            disabled={loading}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-400 disabled:opacity-50"
          >
            <FiX size={22} />
          </button>
        </div>

        <form
          onSubmit={handleSubmit}
          className="space-y-5"
        >
          {error && (
            <div className="bg-red-50 text-red-500 text-[10px] font-black uppercase p-3 rounded-xl border border-red-100 flex items-center gap-2">
              <FiAlertCircle
                size={14}
                className="shrink-0"
              />

              <span>{error}</span>
            </div>
          )}

          {canSelectCompany && (
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase text-gray-400 ml-2">
                Asignar a Empresa
              </label>

              <select
                value={company_id}
                onChange={(e) =>
                  setCompanyId(
                    e.target.value
                  )
                }
                disabled={loading}
                className="w-full border-gray-100 bg-gray-50 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-[#87be00] outline-none transition-all disabled:opacity-50"
              >
                <option value="">
                  Seleccionar Empresa
                </option>

                {companies.map(
                  (company) => (
                    <option
                      key={company.id}
                      value={company.id}
                    >
                      {company.name}
                    </option>
                  )
                )}
              </select>
            </div>
          )}

          <div
            className={`relative border-2 border-dashed rounded-[2rem] p-8 transition-all flex flex-col items-center justify-center gap-3 ${
              file
                ? "border-[#87be00] bg-green-50"
                : "border-gray-100 bg-gray-50"
            }`}
          >
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={
                handleFileChange
              }
              disabled={loading}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
            />

            <div
              className={`p-4 rounded-2xl ${
                file
                  ? "bg-[#87be00] text-white"
                  : "bg-white text-gray-400 shadow-sm"
              }`}
            >
              {file ? (
                <FiCheckCircle
                  size={24}
                />
              ) : (
                <FiUpload size={24} />
              )}
            </div>

            <div className="text-center">
              <p className="text-sm font-bold text-gray-700 break-all">
                {file
                  ? file.name
                  : "Click o arrastra tu Excel"}
              </p>

              <p className="text-[9px] text-gray-400 uppercase font-bold tracking-widest mt-1">
                Formatos soportados:
                .xlsx, .xls
              </p>
            </div>
          </div>

          {result && (
            <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2">
              {result.inserted > 0 && (
                <div className="bg-green-50 p-4 rounded-2xl border border-green-100 flex items-center gap-3 text-green-700">
                  <FiCheckCircle
                    size={18}
                    className="shrink-0"
                  />

                  <p className="text-xs font-black uppercase tracking-wider">
                    Sincronizados:{" "}
                    {result.inserted}{" "}
                    Locales
                  </p>
                </div>
              )}

              {result.skipped > 0 && (
                <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100 flex items-center gap-3 text-blue-700">
                  <FiInfo
                    size={18}
                    className="shrink-0"
                  />

                  <p className="text-xs font-black uppercase tracking-wider">
                    Omitidos:{" "}
                    {result.skipped}{" "}
                    Locales existentes
                  </p>
                </div>
              )}

              {result.errors &&
                result.errors.length >
                  0 && (
                  <div className="bg-amber-50 rounded-2xl border border-amber-100 overflow-hidden">
                    <div className="bg-amber-100/50 px-4 py-2 border-b border-amber-100 flex items-center gap-2 text-amber-700">
                      <FiAlertCircle
                        size={14}
                      />

                      <span className="text-[10px] font-black uppercase tracking-widest">
                        {
                          result.errors
                            .length
                        }{" "}
                        Locales con
                        problemas
                      </span>
                    </div>

                    <div className="max-h-32 overflow-y-auto p-4 space-y-2 scrollbar-hide">
                      {result.errors.map(
                        (
                          item,
                          index
                        ) => (
                          <div
                            key={`${item.fila}-${item.codigo}-${index}`}
                            className="flex flex-col border-b border-amber-100 pb-2 last:border-0"
                          >
                            <div className="flex justify-between gap-3 text-[9px] font-black uppercase text-amber-800">
                              <span>
                                Fila:{" "}
                                {
                                  item.fila
                                }
                              </span>

                              <span>
                                Código:{" "}
                                {item.codigo ||
                                  "S/C"}
                              </span>
                            </div>

                            <p className="text-[10px] text-amber-600 font-bold leading-tight mt-0.5">
                              {
                                item.error
                              }
                            </p>
                          </div>
                        )
                      )}
                    </div>
                  </div>
                )}
            </div>
          )}

          {!result && (
            <div className="bg-blue-50/50 p-4 rounded-2xl border border-blue-100">
              <div className="flex items-start gap-3">
                <FiInfo className="text-blue-500 mt-1 shrink-0" />

                <div>
                  <p className="text-[10px] font-black text-blue-600 uppercase tracking-wider">
                    Columnas
                    requeridas:
                  </p>

                  <p className="text-[10px] text-blue-400 leading-tight mt-1">
                    <b>
                      codigo, cadena,
                      direccion,
                      comuna, gerente,
                      telefono.
                    </b>
                  </p>
                </div>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={
              loading ||
              !file ||
              !company_id
            }
            className="w-full flex items-center justify-center gap-3 bg-black text-white py-4 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] hover:bg-[#87be00] transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <FiLoader className="animate-spin" />
            ) : (
              <FiUpload />
            )}

            {loading
              ? "Procesando..."
              : "Iniciar Carga Masiva"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default UploadLocalesModal;