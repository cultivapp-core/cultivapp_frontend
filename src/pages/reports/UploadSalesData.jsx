import React, { useState, useRef } from "react";
import { FiUploadCloud, FiFileText, FiX, FiCheckCircle, FiAlertCircle, FiInfo } from "react-icons/fi";
import api from "../../api/apiClient";

const UploadSalesData = () => {
  const [file, setFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadState, setUploadState] = useState({ loading: false, success: false, error: null, progress: 0 });
  const fileInputRef = useRef(null);

  const handleDragOver = (e) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = () => { setIsDragging(false); };
  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files[0];
    validateAndSetFile(droppedFile);
  };

  const handleFileInput = (e) => {
    const selectedFile = e.target.files[0];
    validateAndSetFile(selectedFile);
  };

  const validateAndSetFile = (selectedFile) => {
    if (!selectedFile) return;
    const fileName = selectedFile.name.toLowerCase();
    const isValid = fileName.endsWith('.csv') || fileName.endsWith('.xlsx') || fileName.endsWith('.xls');

    if (!isValid) {
      setUploadState({ loading: false, success: false, error: "Formato no válido. Sube CSV o Excel.", progress: 0 });
      return;
    }
    setFile(selectedFile);
    setUploadState({ loading: false, success: false, error: null, progress: 0 });
  };

  const removeFile = () => {
    setFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleUpload = async () => {
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    setUploadState({ loading: true, success: false, error: null, progress: 0 });

    try {
      await api.post("/sales/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setUploadState(prev => ({ ...prev, progress: percentCompleted }));
        }
      });

      setUploadState({ loading: false, success: true, error: null, progress: 100 });
      setFile(null);
      setTimeout(() => setUploadState(prev => ({ ...prev, success: false })), 3000);

    } catch (error) {
      console.error("Error al subir archivo:", error);
      setUploadState({ 
        loading: false, 
        success: false, 
        error: error.response?.data?.message || "Error al procesar el archivo.", 
        progress: 0 
      });
    }
  };

  return (
    <div className="bg-white p-6 md:p-8 rounded-[2rem] shadow-sm border border-gray-100 font-[Outfit]">
      <div className="mb-6">
        <h3 className="text-xl font-black text-gray-900 uppercase italic tracking-tighter">
          Actualizar Base de Ventas
        </h3>
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">
          Sube tu archivo CSV o Excel exportado del sistema
        </p>
      </div>

      <div 
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !file && !uploadState.loading && fileInputRef.current.click()}
        className={`relative flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-3xl transition-all duration-300 ${
          isDragging ? 'border-[#87be00] bg-[#87be00]/5' : file ? 'border-gray-200 bg-gray-50' : 'border-gray-200 hover:border-[#87be00]/50 hover:bg-gray-50 cursor-pointer'
        }`}
      >
        <input type="file" ref={fileInputRef} onChange={handleFileInput} accept=".csv, .xlsx, .xls" className="hidden" />

        {!file ? (
          <>
            <div className="w-16 h-16 bg-white rounded-2xl shadow-sm border border-gray-100 flex items-center justify-center mb-4 text-[#87be00]">
              <FiUploadCloud size={30} />
            </div>
            <p className="text-sm font-black text-gray-700 uppercase">Arrastra tu archivo aquí</p>
            <p className="text-[10px] font-bold text-gray-400 uppercase mt-2">o haz clic para explorar (.CSV, .XLSX)</p>
          </>
        ) : (
          <div className="w-full flex items-center justify-between bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
            <div className="flex items-center gap-4 truncate">
              <div className="w-10 h-10 bg-[#87be00]/10 text-[#87be00] rounded-xl flex items-center justify-center shrink-0">
                <FiFileText size={20} />
              </div>
              <div className="truncate">
                <p className="text-xs font-black text-gray-900 truncate uppercase">{file.name}</p>
                <p className="text-[10px] font-bold text-gray-400 uppercase">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
              </div>
            </div>
            <button 
              onClick={(e) => { e.stopPropagation(); removeFile(); }}
              className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
            >
              <FiX size={18} />
            </button>
          </div>
        )}
      </div>

      {uploadState.loading && (
        <div className="mt-6">
          <div className="flex justify-between mb-1">
            <span className="text-[10px] font-black uppercase text-gray-500">Subiendo al servidor...</span>
            <span className="text-[10px] font-black uppercase text-[#87be00]">{uploadState.progress}%</span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
            <div 
              className="bg-[#87be00] h-2 rounded-full transition-all duration-300 ease-out" 
              style={{ width: `${uploadState.progress}%` }}
            ></div>
          </div>
        </div>
      )}

      {uploadState.error && (
        <div className="mt-4 p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-3 text-red-600">
          <FiAlertCircle size={18} className="shrink-0" />
          <p className="text-[10px] font-black uppercase">{uploadState.error}</p>
        </div>
      )}

      {uploadState.success && (
        <div className="mt-4 p-4 bg-[#87be00]/10 border border-[#87be00]/20 rounded-2xl flex items-center gap-3 text-[#87be00]">
          <FiCheckCircle size={18} className="shrink-0" />
          <p className="text-[10px] font-black uppercase">¡Datos procesados y sincronizados!</p>
        </div>
      )}

      {/* 🚩 AVISO DE SEGURIDAD PARA EL USUARIO */}
      {!uploadState.loading && file && !uploadState.success && !uploadState.error && (
        <div className="mt-4 p-4 bg-blue-50 border border-blue-100 rounded-2xl flex items-start gap-3">
          <FiInfo className="text-blue-500 shrink-0 mt-0.5" size={16} />
          <p className="text-[9px] font-bold text-blue-800 uppercase tracking-widest leading-relaxed">
            Protección de datos activa: El sistema añadirá únicamente los registros nuevos. Las ventas previamente cargadas para el mismo día y local no serán duplicadas ni eliminadas.
          </p>
        </div>
      )}

      {!uploadState.loading && (
        <button 
          onClick={handleUpload}
          disabled={!file}
          className={`w-full mt-6 py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${
            !file 
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
              : 'bg-[#87be00] text-white hover:bg-[#76a600] shadow-lg shadow-[#87be00]/20 active:scale-[0.98]'
          }`}
        >
          <FiUploadCloud size={16} /> Subir y Sincronizar Datos
        </button>
      )}
    </div>
  );
};

export default UploadSalesData;