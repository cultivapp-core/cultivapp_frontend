import React, { useState, useRef, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { 
  FiCamera, FiLoader, FiMapPin, FiArrowRight, 
  FiX, FiCheckCircle, FiWifiOff, FiTrash2, FiPlusCircle, FiLogOut, FiSend, FiTag, FiBox, FiAlertCircle 
} from "react-icons/fi";
import api from "../../api/apiClient";
import toast from "react-hot-toast";
import Scanner from "../../components/Scanner"; 

const VisitFlow = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const isProcessingScan = useRef(false);

  // 🚩 CONFIGURACIÓN DE URL
  const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [step, setStep] = useState(1); 
  const [loading, setLoading] = useState(false);
  const [capturing, setCapturing] = useState(false);
  
  const [brands, setBrands] = useState([]);
  const [allProducts, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [selectedBrand, setSelectedBrand] = useState("");
  const [selectedProduct, setSelectedProduct] = useState("");

  const [productStartTime, setProductStartTime] = useState(null);
  const [scannedCodes, setScannedCodes] = useState([]); 
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [comment, setComment] = useState("");
  
  const [fachadaPhoto, setFachadaPhoto] = useState(null);
  const [gondolaInicialPhoto, setGondolaInicialPhoto] = useState(null);
  const [gondolaTerminoPhoto, setGondolaTerminoPhoto] = useState(null); 

  const stepsInfo = {
    1: { key: "foto_fachada", title: "Llegada al Local", sub: "Evidencia de entrada" },
    2: { key: "foto_gondola_inicio", title: "Góndola Inicial", sub: "Selección y Estado Previo" },
    3: { key: "escaneo", title: "Escanear Producto", sub: "Registro de EANs en sala" },
    4: { key: "preguntas", title: "Encuesta de Gestión", sub: "Validación de quiebres/flejes" },
    5: { key: "foto_gondola_termino", title: "Góndola Término", sub: "Evidencia final y observaciones" },
    6: { key: "Decision", title: "¿Siguiente Producto?", sub: "Continuar gestionando o salir" },
    7: { key: "foto_salida", title: "Registro de Salida", sub: "Fin de jornada en local" },
    8: { key: "cierre", title: "Visita Finalizada", sub: "Proceso completo" } 
  };

  // 🚩 UTILIDAD MEJORADA: Formatear URL de imagen (Compatible con Supabase Storage)
  const formatImageUrl = (url) => {
    if (!url) return null;
    // Si la URL ya viene completa desde Supabase o es un blob local, la retornamos tal cual
    if (url.startsWith('http') || url.startsWith('blob:')) return url;
    // Si por alguna razón es una ruta relativa antigua, concatenamos el BASE_URL
    return `${BASE_URL.replace(/\/$/, '')}/${url.replace(/^\//, '')}`;
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

  useEffect(() => {
    const fetchMasterData = async () => {
      try {
        const [brandsData, productsData] = await Promise.all([
          api.get("/routes/brands"),
          api.get("/routes/products")
        ]);
        setBrands(brandsData);
        setProducts(productsData);
      } catch (err) { console.error("Error al cargar maestros:", err); }
    };
    fetchMasterData();
  }, []);

  useEffect(() => {
    if (selectedBrand) {
      const filtered = allProducts.filter(p => p.brand_id === selectedBrand);
      setFilteredProducts(filtered);
      setSelectedProduct(""); 
    } else { setFilteredProducts([]); }
  }, [selectedBrand, allProducts]);

  useEffect(() => {
    if (step === 2 && !productStartTime) setProductStartTime(new Date().toISOString());
  }, [step, productStartTime]);

  useEffect(() => {
    if (step === 4) {
      const loadQuestions = async () => {
        try {
          const data = await api.get("/questions?flow=reponedor");
          setQuestions(data);
        } catch (err) {
          const cached = localStorage.getItem("cultivapp_questions_cache");
          if (cached) setQuestions(JSON.parse(cached));
        }
      };
      loadQuestions();
    }
  }, [step]);

  // 🚩 FIX: Manejo correcto de la respuesta de Supabase (URL absoluta)
  const handleCapture = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setCapturing(true);
    const toastId = toast.loading("Subiendo imagen...");
    
    try {
      const formData = new FormData();
      formData.append("photo_type", stepsInfo[step].key);
      formData.append("foto", file); 
      
      const response = await api.post(`/routes/${id}/photo`, formData);
      
      // Tomamos directamente la URL que envía el backend (Supabase URL) o usamos un blob local si estamos offline
      const photoPath = response?.offline 
        ? URL.createObjectURL(file) 
        : (response.image_url || response.url || URL.createObjectURL(file));

      if (step === 1) setFachadaPhoto(photoPath);
      if (step === 2) setGondolaInicialPhoto(photoPath);
      if (step === 5) setGondolaTerminoPhoto(photoPath);
      
      toast.success("Captura guardada", { id: toastId });
      if (step === 1) setStep(prev => prev + 1);
    } catch (err) {
      toast.error("Error al subir imagen", { id: toastId });
    } finally {
      setCapturing(false);
      e.target.value = "";
    }
  };

  const handleScanSuccess = async (decodedText) => {
    if (scannedCodes.includes(decodedText)) return; 
    if (isProcessingScan.current) return;
    
    isProcessingScan.current = true;
    try {
      await api.post(`/routes/${id}/scans`, { barcode: decodedText });
      setScannedCodes(prev => [decodedText, ...prev]);
      setTimeout(() => { isProcessingScan.current = false; }, 600);
    } catch (err) { isProcessingScan.current = false; }
  };

  const registrarGestionProducto = async (proximoPaso) => {
    const missingRequired = questions.some(q => q.is_required && !answers[q.id]);
    if (missingRequired) {
      toast.error("Por favor responde todas las preguntas obligatorias");
      setStep(4);
      return;
    }

    setLoading(true);
    const toastId = toast.loading("Registrando gestión...");
    
    const taskData = {
      product_id: selectedProduct, product_codes: scannedCodes,
      start_time: productStartTime, end_time: new Date().toISOString(),
      responses: answers, comment,
      photo_before: gondolaInicialPhoto, photo_after: gondolaTerminoPhoto 
    };

    try {
      await api.post(`/routes/${id}/task`, taskData);
      toast.success("Producto registrado exitosamente", { id: toastId });

      setScannedCodes([]); setAnswers({}); setComment("");
      setGondolaTerminoPhoto(null); setGondolaInicialPhoto(null);
      setProductStartTime(null); setSelectedBrand(""); setSelectedProduct("");

      if (proximoPaso === 'NUEVO') setStep(2); 
      else setStep(7); 
    } catch (err) { toast.error("Error al registrar tarea", { id: toastId }); } 
    finally { setLoading(false); }
  };

  const finalizarVisitaTotal = async () => {
    setLoading(true);
    const toastId = toast.loading("Finalizando visita...");
    try {
      await api.post(`/routes/${id}/finish`, { status: "completed" });
      toast.success("¡Jornada finalizada!", { id: toastId });
      navigate("/usuario/home");
    } catch (err) { toast.error("Error al cerrar visita", { id: toastId }); } 
    finally { setLoading(false); }
  };

  const renderPhotoContainer = (photoUrl, setPhotoUrl, placeholderText) => {
    if (photoUrl) {
      return (
        <div className="relative w-full aspect-square bg-gray-50 rounded-[3rem] overflow-hidden border-4 border-gray-100 shadow-xl group animate-in fade-in zoom-in duration-300">
          <img 
            src={formatImageUrl(photoUrl)} 
            className="w-full h-full object-cover" 
            alt={placeholderText}
            onError={(e) => {
              e.target.style.display = 'none';
              e.target.nextSibling.style.display = 'flex';
            }}
          />
          <div className="hidden absolute inset-0 flex-col items-center justify-center bg-gray-50 text-red-400 p-4">
            <FiAlertCircle size={40} className="mb-2" />
            <span className="text-[10px] font-black uppercase tracking-widest text-center">Error al cargar imagen</span>
          </div>

          <button 
            onClick={(e) => { e.stopPropagation(); setPhotoUrl(null); }} 
            className="absolute top-4 right-4 bg-red-500 text-white p-3 rounded-full shadow-lg active:scale-90 transition-transform z-10"
          >
            <FiX size={18}/>
          </button>
        </div>
      );
    }
    
    return (
      <div 
        onClick={() => !capturing && fileInputRef.current.click()} 
        className="w-full aspect-square bg-gray-50 border-4 border-dashed border-gray-200 rounded-[3rem] flex flex-col items-center justify-center cursor-pointer active:scale-95 hover:border-[#87be00]/50 transition-all group"
      >
        {capturing ? (
          <div className="flex flex-col items-center">
            <FiLoader className="animate-spin text-[#87be00] mb-2" size={44} />
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Procesando...</span>
          </div>
        ) : (
          <>
            <div className="bg-white p-6 rounded-full shadow-sm mb-4 group-hover:scale-110 transition-transform">
                <FiCamera size={40} className={isOnline ? 'text-[#87be00]' : 'text-orange-500'} />
            </div>
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-4 text-center">Capturar {placeholderText}</span>
          </>
        )}
      </div>
    );
  };

  return (
    <div className={`min-h-screen font-[Outfit] p-4 pb-24 flex flex-col items-center transition-colors duration-500 ${isOnline ? 'bg-gray-50' : 'bg-orange-50/40'}`}>
      
      {!isOnline && (
        <div className="fixed top-0 left-0 w-full bg-orange-500 text-white text-[10px] font-black py-1.5 text-center z-[60] flex items-center justify-center gap-2 shadow-lg">
          <FiWifiOff className="animate-pulse" /> MODO SIN CONEXIÓN ACTIVO
        </div>
      )}

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

        {(step === 1 || step === 7) && (
          <div className="space-y-4 animate-in zoom-in duration-300">
             {renderPhotoContainer(
               step === 1 ? fachadaPhoto : null, 
               step === 1 ? setFachadaPhoto : () => {}, 
               stepsInfo[step].title
             )}
             {step === 7 && fachadaPhoto && (
                 <button onClick={finalizarVisitaTotal} className="w-full bg-[#87be00] text-white py-5 rounded-[2.5rem] font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-3 shadow-lg hover:bg-[#76a500]">
                   Confirmar y Finalizar Visita <FiArrowRight size={16}/>
                 </button>
             )}
          </div>
        )}

        {step === 2 && (
          <div className="space-y-5 animate-in slide-in-from-bottom-4 duration-500">
            <div className="grid grid-cols-1 gap-3">
              <div className="relative text-left">
                <FiTag className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 z-10" />
                <select value={selectedBrand} onChange={(e) => setSelectedBrand(e.target.value)} className="w-full pl-11 pr-4 py-4 bg-gray-50 rounded-[1.5rem] border-none text-xs font-bold outline-none shadow-inner appearance-none">
                  <option value="">Seleccione Marca...</option>
                  {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </div>
              <div className="relative text-left">
                <FiBox className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 z-10" />
                <select disabled={!selectedBrand} value={selectedProduct} onChange={(e) => setSelectedProduct(e.target.value)} className="w-full pl-11 pr-4 py-4 bg-gray-50 rounded-[1.5rem] border-none text-xs font-bold outline-none shadow-inner appearance-none disabled:opacity-40">
                  <option value="">Seleccione Producto...</option>
                  {filteredProducts.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
            </div>

            {selectedProduct && (
              <div className="pt-2 animate-in zoom-in duration-300 space-y-4">
                {renderPhotoContainer(gondolaInicialPhoto, setGondolaInicialPhoto, "Foto Inicial")}
                {gondolaInicialPhoto && (
                  <button onClick={() => setStep(3)} className="w-full mt-4 bg-[#87be00] text-white py-5 rounded-[2.5rem] font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-3 shadow-xl shadow-[#87be00]/20 active:scale-95 transition-all">
                    Escanear Productos <FiArrowRight size={16}/>
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4 animate-in zoom-in duration-300">
            <div className="rounded-[2.5rem] overflow-hidden border-2 shadow-2xl">
              <Scanner onScanSuccess={handleScanSuccess} />
            </div>
            <div className="flex flex-col gap-2 max-h-48 overflow-y-auto px-1 custom-scrollbar border-y border-gray-50 py-3 text-left">
                {scannedCodes.length > 0 ? scannedCodes.map((code, idx) => (
                  <div key={idx} className="flex items-center justify-between bg-gray-50 p-3 rounded-2xl border border-gray-100">
                    <div className="flex items-center gap-3"><FiCheckCircle className="text-[#87be00]" size={14}/><span className="text-[10px] font-bold text-gray-700">{code}</span></div>
                    <button onClick={() => setScannedCodes(prev => prev.filter(c => c !== code))} className="text-red-400 p-1 hover:bg-red-50 rounded-lg"><FiTrash2 size={14}/></button>
                  </div>
                )) : <p className="text-[10px] text-gray-300 font-black uppercase py-8 text-center tracking-widest">Esperando escaneo...</p>}
            </div>
            <button onClick={() => setStep(4)} className="w-full bg-black text-white py-5 rounded-[2.5rem] font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-3 shadow-lg">Validar Encuesta <FiArrowRight size={16}/></button>
          </div>
        )}

        {step === 4 && (
           <div className="space-y-5 animate-in slide-in-from-right duration-300 text-left">
             <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-1 custom-scrollbar">
               {questions.map((q) => {
                 const normalizedType = String(q.type || 'TEXTO').toLowerCase().trim();
                 const isBoolean = normalizedType === "boolean" || normalizedType === "si_no" || normalizedType === "si/no";
                 const currentAnswer = answers[q.id];

                 return (
                   <div key={q.id} className="bg-gray-50/70 p-5 rounded-[2rem] border border-gray-100 space-y-3.5 shadow-sm">
                     
                     <p className="text-xs md:text-sm font-black text-gray-800 uppercase tracking-tighter leading-tight">
                       {q.question} {q.is_required && <span className="text-red-500 font-black ml-0.5">*</span>}
                     </p>

                     {isBoolean ? (
                       <div className="grid grid-cols-2 gap-4 pt-1">
                         <label className="flex items-center gap-3 cursor-pointer group select-none">
                           <input
                             type="radio"
                             name={`question-${q.id}`}
                             value="SI"
                             checked={currentAnswer === "SI"}
                             onChange={() => setAnswers({ ...answers, [q.id]: "SI" })}
                             className="w-5 h-5 rounded-full border-2 border-gray-300 text-[#87be00] focus:ring-[#87be00]/20 checked:border-[#87be00] accent-[#87be00] cursor-pointer transition-all"
                           />
                           <span className={`text-xs font-black uppercase tracking-wider transition-colors ${currentAnswer === "SI" ? "text-[#87be00]" : "text-gray-500 group-hover:text-gray-800"}`}>
                             Sí
                           </span>
                         </label>

                         <label className="flex items-center gap-3 cursor-pointer group select-none">
                           <input
                             type="radio"
                             name={`question-${q.id}`}
                             value="NO"
                             checked={currentAnswer === "NO"}
                             onChange={() => setAnswers({ ...answers, [q.id]: "NO" })}
                             className="w-5 h-5 rounded-full border-2 border-gray-300 text-[#87be00] focus:ring-[#87be00]/20 checked:border-[#87be00] accent-[#87be00] cursor-pointer transition-all"
                           />
                           <span className={`text-xs font-black uppercase tracking-wider transition-colors ${currentAnswer === "NO" ? "text-red-500" : "text-gray-500 group-hover:text-gray-800"}`}>
                             No
                           </span>
                         </label>
                       </div>
                     ) : (
                       <input
                         type="text"
                         placeholder="Escribe tu respuesta aquí..."
                         value={currentAnswer || ""}
                         onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })}
                         className="w-full bg-white border border-gray-200/60 rounded-xl px-4 py-3 text-xs font-bold outline-none focus:border-[#87be00]/50 focus:ring-4 focus:ring-[#87be00]/5 transition-all text-gray-800 shadow-inner"
                       />
                     )}
                   </div>
                 );
               })}
             </div>
             
             <button onClick={() => setStep(5)} className="w-full bg-black text-white py-5 rounded-[2.5rem] font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-3 shadow-xl transition-all">
               Góndola Final <FiArrowRight/>
             </button>
           </div>
        )}

        {step === 5 && (
          <div className="space-y-4 animate-in slide-in-from-right duration-300">
             {renderPhotoContainer(gondolaTerminoPhoto, setGondolaTerminoPhoto, "Foto Final")}
             <textarea value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Observaciones adicionales sobre este producto..." className="w-full h-24 p-5 bg-gray-50 rounded-[2rem] border-none text-sm outline-none resize-none shadow-inner focus:ring-2 ring-[#87be00]/20" />
             <button onClick={() => setStep(6)} disabled={!gondolaTerminoPhoto} className="w-full bg-black text-white py-5 rounded-[2.5rem] font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-3 disabled:opacity-50 transition-all">Confirmar Producto <FiArrowRight size={16}/></button>
          </div>
        )}

        {step === 6 && (
          <div className="py-6 space-y-6 animate-in zoom-in">
            <div className="flex flex-col items-center gap-3">
              <div className="w-16 h-16 bg-[#87be00]/10 rounded-full flex items-center justify-center text-[#87be00] mb-2"><FiCheckCircle size={32} /></div>
              <h3 className="text-sm font-black uppercase text-gray-900 tracking-tighter italic">¿Agregar otro producto?</h3>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">El tiempo de este producto ha sido registrado.</p>
            </div>
            <div className="flex flex-col gap-3">
              <button onClick={() => registrarGestionProducto('NUEVO')} disabled={loading} className="w-full bg-[#87be00] text-white py-5 rounded-[2.5rem] font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-3 shadow-xl shadow-[#87be00]/20 active:scale-[0.98] transition-all hover:bg-[#76a500]">{loading ? <FiLoader className="animate-spin"/> : <><FiPlusCircle size={18}/> Sí, nuevo producto</>}</button>
              <button onClick={() => registrarGestionProducto('SALIR')} disabled={loading} className="w-full bg-gray-900 text-white py-5 rounded-[2.5rem] font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-3 active:scale-[0.98] transition-all"><FiLogOut size={18}/> No, finalizar jornada</button>
            </div>
          </div>
        )}

        {step === 8 && (
          <div className="py-6 space-y-4 animate-in zoom-in">
             <div className="bg-[#87be00]/5 p-8 rounded-[3rem] border border-[#87be00]/10 text-center mb-6">
               <FiCheckCircle className="text-[#87be00] mx-auto mb-3" size={40} />
               <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Gestión Finalizada</p>
               <p className="text-xs font-bold text-gray-900 mt-1 uppercase italic leading-tight">Has registrado todos los productos and tu salida del local.</p>
             </div>
             <button onClick={finalizarVisitaTotal} disabled={loading} className="w-full bg-[#87be00] text-white py-6 rounded-[2.5rem] font-black uppercase text-xs tracking-widest shadow-2xl flex items-center justify-center gap-3 active:scale-[0.98] transition-all">
               {loading ? <FiLoader className="animate-spin" /> : <><FiSend size={20}/> Enviar y Cerrar Visita</>}
             </button>
          </div>
        )}

        <div className="pt-4 border-t border-gray-50 flex items-center justify-center gap-2 text-gray-300 text-[8px] font-black uppercase tracking-[0.3em]">
            <FiMapPin className={isOnline ? 'text-[#87be00]' : 'text-orange-500'} /> LOCAL ID: {id?.slice(0,8).toUpperCase()}
        </div>
      </div>

      <input type="file" accept="image/*" capture="environment" ref={fileInputRef} onChange={handleCapture} className="hidden" />
      <style>{`.custom-scrollbar::-webkit-scrollbar { width: 4px; } .custom-scrollbar::-webkit-scrollbar-thumb { background: #eee; border-radius: 10px; }`}</style>
    </div>
  );
};

export default VisitFlow;