import React, { useState, useRef, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { 
  FiCamera, FiLoader, FiMapPin, FiArrowRight, 
  FiMessageSquare, FiSend, FiX, FiCheckCircle, 
  FiWifiOff, FiWifi, FiTrash2, FiImage, FiPlusCircle, FiLogOut 
} from "react-icons/fi";
import api from "../../api/apiClient";
import toast from "react-hot-toast";
import Scanner from "../../components/Scanner"; 

const VisitFlow = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const isProcessingScan = useRef(false);

  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [step, setStep] = useState(1); 
  const [loading, setLoading] = useState(false);
  const [capturing, setCapturing] = useState(false);
  
  // 🕒 ESTADOS DE TRACEABILIDAD Y GESTIÓN POR PRODUCTO
  const [productStartTime, setProductStartTime] = useState(null);
  const [scannedCodes, setScannedCodes] = useState([]); 
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [comment, setComment] = useState("");
  const [commentPhoto, setCommentPhoto] = useState(null); 
  const [gondolaInicialPhoto, setGondolaInicialPhoto] = useState(null);

  // Pasos actualizados según fluj.jpeg (Loop de gestión entre 2 y 5)
  const stepsInfo = {
    1: { key: "Fachada", title: "Llegada al Local", sub: "Evidencia de entrada" },
    2: { key: "Góndola Inicio", title: "Góndola Inicial", sub: "Estado previo (Inicio Tarea)" },
    3: { key: "escaneo", title: "Escanear Producto", sub: "Registro de EAN" },
    4: { key: "preguntas", title: "Encuesta de Gestión", sub: "Formulario del producto" },
    5: { key: "Observaciones", title: "Observación Adicional", sub: "Foto y comentarios de tarea" },
    6: { key: "Decision", title: "¿Siguiente Producto?", sub: "Registrar y continuar o finalizar" },
    7: { key: "Salida", title: "Registro de Salida", sub: "Evidencia final de jornada" }
  };

  useEffect(() => {
    const handleStatus = () => setIsOnline(navigator.onLine);
    window.addEventListener("online", handleStatus);
    window.addEventListener("offline", handleStatus);
    return () => {
      window.removeEventListener("online", handleStatus);
      window.removeEventListener("offline", handleStatus);
    };
  }, []);

  // Capturamos el inicio de tiempo cuando se empieza un nuevo producto (Paso 2)
  useEffect(() => {
    if (step === 2 && !productStartTime) {
      setProductStartTime(new Date().toISOString());
    }
  }, [step, productStartTime]);

  useEffect(() => {
    if (step === 4) {
      const loadQuestions = async () => {
        try {
          const data = await api.get("/questions");
          setQuestions(data);
          localStorage.setItem("cultivapp_questions_cache", JSON.stringify(data));
        } catch (err) {
          const cached = localStorage.getItem("cultivapp_questions_cache");
          if (cached) setQuestions(JSON.parse(cached));
        }
      };
      loadQuestions();
    }
  }, [step]);

  const handleCapture = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setCapturing(true);
    const toastId = toast.loading("Procesando imagen...");

    const formData = new FormData();
    const tipoEvidencia = stepsInfo[step].key;
    formData.append("photo_type", tipoEvidencia);
    formData.append("foto", file); 

    try {
      const response = await api.post(`/reports/${id}/photo`, formData);
      const photoUrl = response?.offline ? URL.createObjectURL(file) : response.url;

      if (step === 2) setGondolaInicialPhoto(photoUrl);
      if (step === 5) setCommentPhoto(photoUrl);

      toast.success("Captura guardada", { id: toastId });
      
      // Avance automático en pasos de flujo único
      if (step === 1 || step === 2 || step === 7) {
        setStep(prev => prev + 1);
      }
    } catch (err) {
      toast.error("Error al procesar imagen", { id: toastId });
    } finally {
      setCapturing(false);
      e.target.value = "";
    }
  };

  // 🛒 LÓGICA DE SCANNER (Mantenida intacta)
  const handleScanSuccess = async (decodedText) => {
    if (scannedCodes.includes(decodedText)) return; 
    if (isProcessingScan.current) return;
    isProcessingScan.current = true;
    try {
      const res = await api.post(`/routes/${id}/scans`, { barcode: decodedText });
      setScannedCodes(prev => [decodedText, ...prev]);
      if (res.offline) toast("Escaneo guardado offline", { icon: '📦' });
      setTimeout(() => { isProcessingScan.current = false; }, 600);
    } catch (err) { isProcessingScan.current = false; }
  };

  /**
   * 🚩 REGISTRO DE TAREA POR PRODUCTO (Trazabilidad)
   * Se llama al tomar una decisión en el paso 6.
   */
  const registrarGestionProducto = async (proximoPaso) => {
    setLoading(true);
    const toastId = toast.loading("Registrando gestión de producto...");
    
    const taskData = {
      product_codes: scannedCodes,
      start_time: productStartTime,
      end_time: new Date().toISOString(),
      responses: answers,
      comment,
      photo_before: gondolaInicialPhoto,
      photo_after: commentPhoto
    };

    try {
      // Guardamos la tarea individual en el backend
      await api.post(`/routes/${id}/task`, taskData);

      // Limpiamos estados de producto para el siguiente ciclo
      setScannedCodes([]);
      setAnswers({});
      setComment("");
      setCommentPhoto(null);
      setGondolaInicialPhoto(null);
      setProductStartTime(null);

      toast.success("Producto registrado", { id: toastId });

      if (proximoPaso === 'NUEVO') {
        setStep(2); // Volver a Góndola Inicial
      } else {
        setStep(7); // Ir a Registro de Salida
      }
    } catch (err) {
      toast.error("Error al registrar tarea", { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  const finalizarVisitaTotal = async () => {
    setLoading(true);
    const toastId = toast.loading("Finalizando visita...");
    try {
      await api.post(`/routes/${id}/finish`, { status: "completed" });
      toast.success("¡Visita finalizada exitosamente!", { id: toastId });
      navigate("/usuario/home");
    } catch (err) { 
      toast.error("Error al cerrar visita", { id: toastId }); 
    } finally { 
      setLoading(false); 
    }
  };

  return (
    <div className={`min-h-screen font-[Outfit] p-4 pb-24 flex flex-col items-center transition-colors duration-500 ${isOnline ? 'bg-gray-50' : 'bg-orange-50/40'}`}>
      
      {!isOnline && (
        <div className="fixed top-0 left-0 w-full bg-orange-500 text-white text-[10px] font-black py-1.5 text-center z-[60] flex items-center justify-center gap-2 shadow-lg">
          <FiWifiOff className="animate-pulse" /> MODO SIN CONEXIÓN ACTIVO
        </div>
      )}

      {/* Barra de Progreso */}
      <div className="w-full max-w-md flex justify-between mb-8 sticky top-6 z-20 py-2">
        {[1, 2, 3, 4, 5, 7].map(i => (
          <div key={i} className={`h-1.5 flex-1 mx-1 rounded-full transition-all duration-700 ${step >= i ? 'bg-[#87be00]' : 'bg-gray-200'}`} />
        ))}
      </div>

      <div className="w-full max-w-md bg-white p-6 rounded-[2.5rem] shadow-xl text-center space-y-6 border border-gray-100 relative overflow-hidden">
        
        <div className="space-y-1 pt-2">
            <h2 className="text-xl font-black uppercase text-gray-900 leading-none">{stepsInfo[step]?.title || "Cierre"}</h2>
            <p className={`text-[9px] font-black uppercase tracking-[0.2em] ${isOnline ? 'text-[#87be00]' : 'text-orange-500'}`}>{stepsInfo[step]?.sub}</p>
        </div>

        {/* CAPTURA DE FOTOS: 1, 2, 5, 7 */}
        {(step === 1 || step === 2 || step === 5 || step === 7) && (
          <div className="space-y-4">
             {((step === 5 && commentPhoto) || (step === 2 && gondolaInicialPhoto)) ? (
                <div className="relative rounded-[3rem] overflow-hidden border-4 border-gray-100">
                    <img src={step === 5 ? commentPhoto : gondolaInicialPhoto} className="w-full aspect-square object-cover" />
                    <button onClick={() => step === 5 ? setCommentPhoto(null) : setGondolaInicialPhoto(null)} className="absolute top-4 right-4 bg-red-500 text-white p-3 rounded-full shadow-lg"><FiX/></button>
                </div>
             ) : (
                <div onClick={() => !capturing && fileInputRef.current.click()} className="w-full aspect-square bg-gray-50 border-4 border-dashed border-gray-200 rounded-[3rem] flex flex-col items-center justify-center cursor-pointer active:scale-95 transition-all">
                  {capturing ? <FiLoader className="animate-spin text-[#87be00]" size={44} /> : (
                    <>
                      <div className="bg-white p-6 rounded-full shadow-sm mb-4"><FiCamera size={40} className={isOnline ? 'text-[#87be00]' : 'text-orange-500'} /></div>
                      <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-4 text-center">Capturar {stepsInfo[step].title}</span>
                    </>
                  )}
                </div>
             )}
             {step === 5 && (
               <>
                <textarea value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Comentarios sobre este producto..." className="w-full h-24 p-5 bg-gray-50 rounded-[2rem] border-none text-sm outline-none resize-none shadow-inner" />
                <button onClick={() => setStep(6)} className="w-full bg-black text-white py-5 rounded-[2.5rem] font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-3">Finalizar Producto <FiArrowRight size={16}/></button>
               </>
             )}
          </div>
        )}

        {/* PASO 3: SCANNER (Intacto) */}
        {step === 3 && (
          <div className="space-y-4 animate-in zoom-in duration-300">
            <div className="rounded-[2.5rem] overflow-hidden border-2 shadow-2xl">
              <Scanner onScanSuccess={handleScanSuccess} />
            </div>
            <div className="flex flex-col gap-2 max-h-48 overflow-y-auto px-1 custom-scrollbar border-y border-gray-50 py-3">
                {scannedCodes.length > 0 ? scannedCodes.map((code, idx) => (
                  <div key={idx} className="flex items-center justify-between bg-gray-50 p-3 rounded-2xl border border-gray-100">
                    <div className="flex items-center gap-3">
                      <FiCheckCircle className="text-[#87be00]" size={14}/>
                      <span className="text-[10px] font-bold text-gray-700">{code}</span>
                    </div>
                    <button onClick={() => setScannedCodes(prev => prev.filter(c => c !== code))} className="text-gray-300"><FiTrash2 size={14}/></button>
                  </div>
                )) : <p className="text-[10px] text-gray-300 font-bold uppercase py-8">Esperando productos...</p>}
            </div>
            <button onClick={() => setStep(4)} className="w-full bg-black text-white py-5 rounded-[2.5rem] font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-3">Continuar <FiArrowRight size={16}/></button>
          </div>
        )}

        {/* PASO 4: ENCUESTA */}
        {step === 4 && (
           <div className="space-y-4 animate-in slide-in-from-right duration-300">
             <div className="bg-gray-50 p-2 rounded-[2.5rem] space-y-1">
               {questions.map((q) => (
                 <button key={q.id} onClick={() => setAnswers({...answers, [q.id]: q.question})} className={`w-full flex items-center justify-between p-4 rounded-[1.8rem] transition-all ${answers[q.id] ? 'bg-white shadow-sm' : ''}`}>
                   <span className={`text-[10px] font-bold text-left leading-tight pr-2 ${answers[q.id] ? 'text-[#87be00]' : 'text-gray-500'}`}>{q.question}</span>
                   <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${answers[q.id] ? 'border-[#87be00] bg-[#87be00]' : 'border-gray-200'}`}>{answers[q.id] && <div className="w-1.5 h-1.5 bg-white rounded-full" />}</div>
                 </button>
               ))}
             </div>
             <button onClick={() => setStep(5)} className="w-full bg-black text-white py-5 rounded-[2.5rem] font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-3">Observaciones <FiArrowRight/></button>
           </div>
        )}

        {/* PASO 6: DECISIÓN (Diamante fluj.jpeg) */}
        {step === 6 && (
          <div className="py-6 space-y-6 animate-in zoom-in">
            <div className="flex flex-col items-center gap-3">
              <div className="w-16 h-16 bg-[#87be00]/10 rounded-full flex items-center justify-center text-[#87be00] mb-2"><FiCheckCircle size={32} /></div>
              <h3 className="text-sm font-black uppercase text-gray-900 tracking-tighter italic">¿Agregar otro producto?</h3>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Registraremos el tiempo de esta gestión.</p>
            </div>
            
            <div className="flex flex-col gap-3">
              <button onClick={() => registrarGestionProducto('NUEVO')} disabled={loading} className="w-full bg-[#87be00] text-white py-5 rounded-[2.5rem] font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-3 shadow-xl shadow-[#87be00]/20 active:scale-95 transition-all">
                {loading ? <FiLoader className="animate-spin"/> : <><FiPlusCircle size={18}/> Sí, agregar otro</>}
              </button>
              <button onClick={() => registrarGestionProducto('SALIR')} disabled={loading} className="w-full bg-gray-900 text-white py-5 rounded-[2.5rem] font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-3">
                <FiLogOut size={18}/> No, finalizar jornada
              </button>
            </div>
          </div>
        )}

        {/* PASO FINAL: CIERRE (Aparece tras foto de salida) */}
        {step === 8 && (
          <div className="py-6 space-y-4">
             <div className="bg-[#87be00]/5 p-8 rounded-[3rem] border border-[#87be00]/10">
               <FiCheckCircle className="text-[#87be00] mx-auto mb-3" size={40} />
               <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Gestión Finalizada</p>
               <p className="text-xs font-bold text-gray-900 mt-1 uppercase italic leading-tight">Has registrado todos los productos y tu salida del local.</p>
             </div>
             <button onClick={finalizarTodo} disabled={loading} className="w-full bg-[#87be00] text-white py-6 rounded-[2.5rem] font-black uppercase text-xs tracking-widest shadow-2xl flex items-center justify-center gap-3 active:scale-95 transition-all">
               {loading ? <FiLoader className="animate-spin" /> : <><FiSend/> Enviar y Cerrar Visita</>}
             </button>
          </div>
        )}

        <div className="pt-4 border-t border-gray-50 flex items-center justify-center gap-2 text-gray-300 text-[8px] font-bold uppercase tracking-[0.3em]">
            <FiMapPin className={isOnline ? 'text-[#87be00]' : 'text-orange-500'} /> LOCAL ID: {id?.slice(0,8).toUpperCase()}
        </div>
      </div>

      <input type="file" accept="image/*" capture="environment" ref={fileInputRef} onChange={handleCapture} className="hidden" />
      <style>{`.custom-scrollbar::-webkit-scrollbar { width: 4px; } .custom-scrollbar::-webkit-scrollbar-thumb { background: #eee; border-radius: 10px; }`}</style>
    </div>
  );
};

export default VisitFlow;