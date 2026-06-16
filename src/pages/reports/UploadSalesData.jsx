import React, { useState, useRef } from "react";
import { FiUploadCloud, FiFileText, FiX, FiCheckCircle, FiAlertTriangle, FiInfo, FiDatabase } from "react-icons/fi";
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
      setUploadState({ loading: false, success: false, error: "Formato no soportado. Por favor, usa CSV o Excel.", progress: 0 });
      return;
    }
    setFile(selectedFile);
    setUploadState({ loading: false, success: false, error: null, progress: 0 });
  };

  const removeFile = () => {
    setFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    setUploadState({ loading: false, success: false, error: null, progress: 0 });
  };

  const handleUpload = async () => {
    if (!file) return;
    const formData = new FormData();
    formData.append("file", file);
    setUploadState({ loading: true, success: false, error: null, progress: 0 });

    try {
      // Simulación de progreso más visual para la demo, quitar en prod si onUploadProgress es muy rápido
      await api.post("/sales/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setUploadState(prev => ({ ...prev, progress: percentCompleted }));
        }
      });
      
      setUploadState({ loading: false, success: true, error: null, progress: 100 });
      // Mantenemos el archivo en el estado de éxito para mostrar qué se subió, pero permitimos limpiar
    } catch (error) {
      setUploadState({ 
        loading: false, 
        success: false, 
        error: error.response?.data?.message || "Error de conexión con el servidor. Intenta nuevamente.", 
        progress: 0 
      });
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto font-[Outfit] animate-in fade-in slide-in-from-bottom-4 duration-700">
      
      {/* HEADER SECTION */}
      <div className="mb-8 pt-12 flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-black text-gray-900 uppercase italic tracking-tighter flex items-center gap-3">
            <FiDatabase className="text-[#87be00]" />
            Motor de Ingesta
          </h2>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] mt-1">
            Sincronización de ventas diarias (CSV / XLSX)
          </p>
        </div>
      </div>

      {/* MAIN CARD */}
      <div className="bg-white p-8 md:p-12 rounded-[2.5rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100/50 backdrop-blur-xl">
        
        {/* ESTADO DE ÉXITO (PANTALLA VERDE) */}
        {uploadState.success ? (
          <div className="flex flex-col items-center justify-center py-10 animate-in zoom-in duration-500">
            <div className="w-24 h-24 bg-[#87be00]/10 rounded-full flex items-center justify-center mb-6">
              <div className="w-16 h-16 bg-[#87be00] rounded-full flex items-center justify-center shadow-[0_0_20px_rgba(135,190,0,0.4)] animate-pulse">
                <FiCheckCircle size={32} className="text-white" />
              </div>
            </div>
            <h3 className="text-2xl font-black text-gray-900 uppercase tracking-tight mb-2 text-center">¡Carga Completada!</h3>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-widest text-center mb-8">
              El archivo <span className="text-[#87be00]">{file?.name}</span> se procesó correctamente.
            </p>
            
            <button 
              onClick={removeFile}
              className="px-8 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all"
            >
              Subir otro archivo
            </button>
          </div>
        ) : (
          /* ZONA DE CARGA NORMAL */
          <>
            <div 
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => !file && !uploadState.loading && fileInputRef.current.click()}
              className={`
                relative group flex flex-col items-center justify-center p-12 rounded-[2rem] border-2 transition-all duration-300
                ${isDragging ? 'border-[#87be00] bg-[#87be00]/5 scale-[1.02]' : 
                  file ? 'border-gray-100 bg-gray-50' : 
                  'border-dashed border-gray-200 hover:border-[#87be00]/50 hover:bg-[#87be00]/5 cursor-pointer'}
              `}
            >
              <input type="file" ref={fileInputRef} onChange={handleFileInput} accept=".csv, .xlsx, .xls" className="hidden" />

              {!file ? (
                <>
                  <div className={`w-20 h-20 rounded-3xl flex items-center justify-center mb-6 transition-all duration-300 ${isDragging ? 'bg-[#87be00] text-white shadow-lg' : 'bg-white shadow-sm border border-gray-100 text-[#87be00] group-hover:scale-110'}`}>
                    <FiUploadCloud size={36} />
                  </div>
                  <p className="text-sm font-black text-gray-800 uppercase tracking-wider text-center">
                    {isDragging ? '¡Suelta el archivo!' : 'Arrastra tu archivo aquí'}
                  </p>
                  <p className="text-[10px] font-bold text-gray-400 uppercase mt-3 tracking-widest text-center">
                    o haz clic para explorar en tu equipo
                  </p>
                  
                  {/* Etiqueta de formatos permitidos */}
                  <div className="flex gap-2 mt-6">
                    <span className="px-3 py-1 bg-gray-100 text-gray-500 rounded-lg text-[9px] font-black uppercase">CSV</span>
                    <span className="px-3 py-1 bg-gray-100 text-gray-500 rounded-lg text-[9px] font-black uppercase">XLSX</span>
                  </div>
                </>
              ) : (
                <div className="w-full flex items-center justify-between bg-white p-5 rounded-2xl shadow-sm border border-gray-100 animate-in fade-in slide-in-from-bottom-2">
                  <div className="flex items-center gap-4 min-w-0 pr-4">
                    <div className="w-12 h-12 bg-[#87be00]/10 text-[#87be00] rounded-xl flex items-center justify-center shrink-0">
                      <FiFileText size={24} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-black text-gray-900 truncate uppercase tracking-wide mb-1">{file.name}</p>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                        {(file.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                  </div>
                  
                  {!uploadState.loading && (
                    <button 
                      onClick={(e) => { e.stopPropagation(); removeFile(); }}
                      className="p-3 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all shrink-0"
                    >
                      <FiX size={20} />
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* ESTADOS DE CARGA Y ERRORES */}
            {uploadState.loading && (
              <div className="mt-8 animate-in fade-in">
                <div className="flex justify-between mb-3 items-center">
                  <span className="text-[10px] font-black uppercase text-gray-500 tracking-widest animate-pulse">Sincronizando Base de Datos...</span>
                  <span className="text-xs font-black text-[#87be00]">{uploadState.progress}%</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden shadow-inner">
                  <div 
                    className="bg-gradient-to-r from-[#87be00] to-[#a3e600] h-full rounded-full transition-all duration-300 relative" 
                    style={{ width: `${uploadState.progress}%` }}
                  >
                     {/* Efecto de brillo en la barra de progreso */}
                     <div className="absolute top-0 left-0 bottom-0 right-0 bg-white/20 animate-[shimmer_2s_infinite]"></div>
                  </div>
                </div>
              </div>
            )}

            {uploadState.error && (
              <div className="mt-6 p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-4 animate-in shake">
                <div className="w-10 h-10 bg-red-100 text-red-500 rounded-xl flex items-center justify-center shrink-0">
                  <FiAlertTriangle size={18} />
                </div>
                <p className="text-[10px] font-black text-red-600 uppercase tracking-wide leading-tight">
                  {uploadState.error}
                </p>
              </div>
            )}

            {/* AVISO INFORMATIVO (Solo visible cuando hay archivo y no hay error/carga) */}
            {!uploadState.loading && file && !uploadState.error && (
              <div className="mt-6 p-4 bg-blue-50/50 rounded-2xl flex items-start gap-4">
                <FiInfo className="text-blue-400 shrink-0 mt-0.5" size={16} />
                <p className="text-[9px] font-bold text-blue-800/70 uppercase tracking-widest leading-relaxed">
                  Sistema de prevención de duplicados activo. Solo se insertarán registros con identificadores únicos.
                </p>
              </div>
            )}

            {/* BOTÓN DE ACCIÓN PRINCIPAL */}
            {!uploadState.loading && (
              <button 
                onClick={handleUpload}
                disabled={!file}
                className={`
                  w-full mt-8 py-5 rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] transition-all duration-300 flex items-center justify-center gap-3
                  ${!file 
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                    : 'bg-gray-900 text-white hover:bg-[#87be00] hover:shadow-[0_10px_20px_rgba(135,190,0,0.3)] hover:-translate-y-1'
                  }
                `}
              >
                <FiUploadCloud size={18} /> Procesar Datos
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default UploadSalesData;