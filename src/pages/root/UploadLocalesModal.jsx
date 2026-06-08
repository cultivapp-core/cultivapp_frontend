import { useState, useEffect } from "react";
import { FiX, FiUpload, FiFileText, FiCheckCircle, FiAlertCircle, FiLoader, FiInfo } from "react-icons/fi";
import api from "../../api/apiClient";
import toast from "react-hot-toast";

const UploadLocalesModal = ({
  isOpen,
  onClose,
  onUploaded,
  companies = [],
  companyId: autoCompanyId = null
}) => {
  const [company_id, setCompanyId] = useState(autoCompanyId || "");
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);

  useEffect(() => {
    if (autoCompanyId) setCompanyId(autoCompanyId);
  }, [autoCompanyId]);

  if (!isOpen) return null;

  const resetState = () => {
    if (!autoCompanyId) setCompanyId("");
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
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      const allowedExtensions = [".xlsx", ".xls"];
      const fileExtension = selectedFile.name.substring(selectedFile.name.lastIndexOf(".")).toLowerCase();
      
      if (!allowedExtensions.includes(fileExtension)) {
        setError("El archivo debe ser Excel (.xlsx o .xls)");
        setFile(null);
        return;
      }
      setFile(selectedFile);
      setError("");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setResult(null);

    if (!company_id) return setError("Debes seleccionar una empresa");
    if (!file) return setError("Selecciona un archivo Excel");

    try {
      setLoading(true);
      const formData = new FormData();
      formData.append("file", file);
      formData.append("company_id", company_id);

      const data = await api.post("/locales/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });

      setResult(data);
      
      if (data.inserted > 0) {
        toast.success(`¡Éxito! ${data.inserted} locales procesados.`);
      }
      
      if (data.errors?.length > 0) {
        toast.error(`${data.errors.length} locales no pudieron ingresarse.`);
      }

      if (onUploaded) onUploaded();
    } catch (err) {
      const msg = err.response?.data?.message || "Error al procesar el archivo";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 font-[Outfit]">
      <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl p-8 space-y-6 animate-in zoom-in duration-300">
        
        {/* HEADER */}
        <div className="flex justify-between items-center border-b pb-4">
          <div>
            <h3 className="text-xl font-black text-gray-800 uppercase tracking-tight">Carga Masiva</h3>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Importar locales desde Excel</p>
          </div>
          <button onClick={handleClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-400">
            <FiX size={22} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div className="bg-red-50 text-red-500 text-[10px] font-black uppercase p-3 rounded-xl border border-red-100 flex items-center gap-2">
              <FiAlertCircle size={14} /> {error}
            </div>
          )}

          {!autoCompanyId && (
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase text-gray-400 ml-2">Asignar a Empresa</label>
              <select
                value={company_id}
                onChange={(e) => setCompanyId(e.target.value)}
                className="w-full border-gray-100 bg-gray-50 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-[#87be00] outline-none transition-all"
              >
                <option value="">Seleccionar Empresa</option>
                {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          )}

          {/* DROPZONE */}
          <div className={`relative border-2 border-dashed rounded-[2rem] p-8 transition-all flex flex-col items-center justify-center gap-3 ${file ? 'border-[#87be00] bg-green-50' : 'border-gray-100 bg-gray-50'}`}>
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileChange}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
            <div className={`p-4 rounded-2xl ${file ? 'bg-[#87be00] text-white' : 'bg-white text-gray-400 shadow-sm'}`}>
              {file ? <FiCheckCircle size={24} /> : <FiUpload size={24} />}
            </div>
            <div className="text-center">
              <p className="text-sm font-bold text-gray-700">{file ? file.name : "Click o arrastra tu Excel"}</p>
              <p className="text-[9px] text-gray-400 uppercase font-bold tracking-widest mt-1">Formatos soportados: .xlsx, .xls</p>
            </div>
          </div>

          {/* RESULTADOS Y ERRORES ESPECÍFICOS */}
          {result && (
            <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2">
              {/* ÉXITOS */}
              {result.inserted > 0 && (
                <div className="bg-green-50 p-4 rounded-2xl border border-green-100 flex items-center gap-3 text-green-700">
                  <FiCheckCircle size={18} className="shrink-0" />
                  <p className="text-xs font-black uppercase tracking-wider">Sincronizados: {result.inserted} Locales</p>
                </div>
              )}

              {/* LISTA DE LOCALES NO INGRESADOS */}
              {result.errors && result.errors.length > 0 && (
                <div className="bg-amber-50 rounded-2xl border border-amber-100 overflow-hidden">
                  <div className="bg-amber-100/50 px-4 py-2 border-b border-amber-100 flex items-center gap-2 text-amber-700">
                    <FiAlertCircle size={14} />
                    <span className="text-[10px] font-black uppercase tracking-widest">{result.errors.length} Locales con problemas</span>
                  </div>
                  
                  <div className="max-h-32 overflow-y-auto p-4 space-y-2 scrollbar-hide">
                    {result.errors.map((err, idx) => (
                      <div key={idx} className="flex flex-col border-b border-amber-100 pb-2 last:border-0">
                        <div className="flex justify-between text-[9px] font-black uppercase text-amber-800">
                          <span>Fila: {err.fila}</span>
                          <span>Código: {err.codigo || 'S/C'}</span>
                        </div>
                        <p className="text-[10px] text-amber-600 font-bold leading-tight mt-0.5">{err.error}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {!result && (
            <div className="bg-blue-50/50 p-4 rounded-2xl border border-blue-100">
              <div className="flex items-start gap-3">
                <FiInfo className="text-blue-500 mt-1" />
                <div>
                  <p className="text-[10px] font-black text-blue-600 uppercase tracking-wider">Columnas requeridas:</p>
                  <p className="text-[10px] text-blue-400 leading-tight mt-1"><b>codigo, cadena, direccion, comuna, gerente, telefono.</b></p>
                </div>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 bg-black text-white py-4 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] hover:bg-[#87be00] transition-all shadow-lg disabled:opacity-50"
          >
            {loading ? <FiLoader className="animate-spin" /> : <FiUpload />}
            {loading ? "Procesando..." : "Iniciar Carga Masiva"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default UploadLocalesModal;