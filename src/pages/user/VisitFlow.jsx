import React, { useState, useRef, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { 
  FiCamera, FiLoader, FiMapPin, FiArrowRight, 
  FiX, FiCheckCircle, FiWifiOff, FiTrash2, FiPlusCircle, FiLogOut, FiSend, FiTag, FiBox, FiAlertCircle 
} from "react-icons/fi";
import api from "../../api/apiClient";
import toast from "react-hot-toast";
import Scanner from "../../components/Scanner"; 
import QuestionRenderer from "../../components/modals/QuestionRenderer"; 

// 🚀 FUNCIÓN DE COMPRESIÓN (Optimiza carga en móvil)
const compressImage = (file, maxWidth = 1024, quality = 0.7) => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let width = img.width;
        let height = img.height;
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob((blob) => {
          resolve(new File([blob], file.name, { type: "image/jpeg", lastModified: Date.now() }));
        }, "image/jpeg", quality);
      };
    };
  });
};

const VisitFlow = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const isProcessingScan = useRef(false);
  const captureStepRef = useRef(1); // 🚀 FIX: Captura el paso exacto al disparar cámara

  const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [step, setStep] = useState(1); 
  const [loading, setLoading] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const [imageError, setImageError] = useState(false); 
  
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
  const [exitPhoto, setExitPhoto] = useState(null); // 🚀 FIX: Estado salida

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

  const formatImageUrl = (url) => {
    if (!url) return null;
    if (url.startsWith('http') || url.startsWith('blob:')) return url;
    return `${BASE_URL.replace(/\/$/, '')}/${url.replace(/^\//, '')}`;
  };

  // 🚀 LÓGICA DE AGRUPACIÓN EAN (Permite duplicados y los cuenta)
  const groupedScannedCodes = useMemo(() => scannedCodes.reduce((acc, code) => {
    acc[code] = (acc[code] || 0) + 1;
    return acc;
  }, {}), [scannedCodes]);

  useEffect(() => {
    const handleStatus = () => setIsOnline(navigator.onLine);
    window.addEventListener("online", handleStatus);
    window.addEventListener("offline", handleStatus);
    return () => { window.removeEventListener("online", handleStatus); window.removeEventListener("offline", handleStatus); };
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

  const handleCapture = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setCapturing(true);
    setImageError(false);
    const toastId = toast.loading("Optimizando y subiendo...");
    
    try {
      const compressedFile = await compressImage(file, 1024, 0.7);
      const activeStepKey = stepsInfo[captureStepRef.current]?.key;
      
      const formData = new FormData();
      formData.append("photo_type", activeStepKey);
      formData.append("foto", compressedFile); 
      
      const response = await api.post(`/routes/${id}/photo`, formData);
      
      let photoPath = response?.offline 
        ? URL.createObjectURL(compressedFile) 
        : (response.image_url || response.url || URL.createObjectURL(compressedFile));

      // 🚀 ROMPE CACHÉ: Añade timestamp único para forzar refresco visual
      if (photoPath && !photoPath.startsWith('blob:')) {
        photoPath = `${photoPath}${photoPath.includes('?') ? '&' : '?'}t=${Date.now()}`;
      }

      // 🚀 ASIGNACIÓN SEGURA
      if (activeStepKey === "foto_fachada") setFachadaPhoto(photoPath);
      if (activeStepKey === "foto_gondola_inicio") setGondolaInicialPhoto(photoPath);
      if (activeStepKey === "foto_gondola_termino") setGondolaTerminoPhoto(photoPath);
      if (activeStepKey === "foto_salida") setExitPhoto(photoPath);
      
      toast.success("Captura guardada", { id: toastId });
      if (captureStepRef.current === 1) setStep(prev => prev + 1);
    } catch (err) {
      toast.error("Error al subir", { id: toastId });
    } finally {
      setCapturing(false);
      e.target.value = "";
    }
  };

  const handleScanSuccess = async (decodedText) => {
    if (isProcessingScan.current) return;
    
    isProcessingScan.current = true;
    try {
      await api.post(`/routes/${id}/scans`, { barcode: decodedText });
      setScannedCodes(prev => [decodedText, ...prev]);
      toast.success("EAN registrado", { duration: 800, position: 'bottom-center' });
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

      // 🚀 LIMPIEZA TOTAL: Evita el efecto fantasma
      setScannedCodes([]); setAnswers({}); setComment("");
      setGondolaTerminoPhoto(null); setGondolaInicialPhoto(null);
      setProductStartTime(null); setSelectedBrand(""); setSelectedProduct("");
      setImageError(false); isProcessingScan.current = false;

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

  // 🚀 RENDERIZADO MEJORADO: Ahora acepta un setPhotoUrl genérico para el Step 7
  const renderPhotoContainer = (photoUrl, setPhotoUrl, stepKey) => {
    if (photoUrl && !imageError) {
      return (
        <div className="relative w-full aspect-square bg-gray-50 rounded-[3rem] overflow-hidden border-4 border-gray-100 shadow-xl group animate-in fade-in zoom-in duration-300">
          <img 
            src={formatImageUrl(photoUrl)} 
            className="w-full h-full object-cover" 
            alt="Foto"
            onError={() => setImageError(true)}
          />
          <button onClick={(e) => { e.stopPropagation(); setPhotoUrl(null); setImageError(false); }} className="absolute top-4 right-4 bg-red-500 text-white p-3 rounded-full shadow-lg active:scale-90 transition-transform z-10">
            <FiX size={18}/>
          </button>
        </div>
      );
    }
    
    if (imageError) {
        return (
            <div className="w-full aspect-square bg-gray-50 border-4 border-dashed border-red-200 rounded-[3rem] flex flex-col items-center justify-center text-red-400">
                <FiAlertCircle size={40} className="mb-2" />
                <span className="text-[10px] font-black uppercase tracking-widest text-center">Error al cargar</span>
                <button onClick={() => setImageError(false)} className="mt-4 text-xs font-bold underline">Reintentar</button>
            </div>
        )
    }
    
    return (
      <div onClick={() => !capturing && (captureStepRef.current = stepKey) && fileInputRef.current.click()} className="w-full aspect-square bg-gray-50 border-4 border-dashed border-gray-200 rounded-[3rem] flex flex-col items-center justify-center cursor-pointer active:scale-95 hover:border-[#87be00]/50 transition-all group">
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
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-4 text-center">Capturar</span>
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

        {/* STEP 1: FACHADA */}
        {step === 1 && <div className="space-y-4 animate-in zoom-in">{renderPhotoContainer(fachadaPhoto, setFachadaPhoto, 1)}</div>}

        {/* STEP 2 */}
        {step === 2 && (
          <div className="space-y-5 animate-in slide-in-from-bottom-4">
            <div className="grid grid-cols-1 gap-3">
              <select value={selectedBrand} onChange={(e) => setSelectedBrand(e.target.value)} className="w-full p-4 bg-gray-50 rounded-[1.5rem] text-xs font-bold border-none shadow-inner">
                <option value="">Seleccione Marca...</option>
                {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
              <select disabled={!selectedBrand} value={selectedProduct} onChange={(e) => setSelectedProduct(e.target.value)} className="w-full p-4 bg-gray-50 rounded-[1.5rem] text-xs font-bold border-none shadow-inner">
                <option value="">Seleccione Producto...</option>
                {filteredProducts.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            {selectedProduct && (
              <div className="space-y-4">
                {renderPhotoContainer(gondolaInicialPhoto, setGondolaInicialPhoto, 2)}
                {gondolaInicialPhoto && <button onClick={() => setStep(3)} className="w-full bg-[#87be00] text-white py-5 rounded-[2.5rem] font-black text-[10px] tracking-widest">Escanear Productos</button>}
              </div>
            )}
          </div>
        )}

        {/* STEP 3: ESCANEO EAN */}
        {step === 3 && (
          <div className="space-y-4 animate-in zoom-in">
            <div className="rounded-[2.5rem] overflow-hidden border-2 shadow-2xl"><Scanner onScanSuccess={handleScanSuccess} /></div>
            <div className="max-h-48 overflow-y-auto space-y-2 text-left">
                {Object.entries(groupedScannedCodes).map(([code, qty], idx) => (
                  <div key={idx} className="flex justify-between bg-gray-50 p-3 rounded-2xl border border-gray-100">
                    <div className="flex items-center gap-3"><FiCheckCircle className="text-[#87be00]" size={14}/><span className="text-[10px] font-bold">{code}</span></div>
                    {qty > 1 && <span className="bg-[#87be00] text-white text-[9px] font-black px-2 rounded-lg">x{qty}</span>}
                    <button onClick={() => setScannedCodes(prev => prev.filter(c => c !== code))} className="text-red-400 p-1"><FiTrash2 size={14}/></button>
                  </div>
                ))}
            </div>
            <button onClick={() => setStep(4)} className="w-full bg-black text-white py-5 rounded-[2.5rem] font-black text-[10px]">Validar Encuesta</button>
          </div>
        )}

        {/* STEP 4: ENCUESTA */}
        {step === 4 && (
           <div className="space-y-4 text-left">
             {questions.map((q) => (
               <div key={q.id} className="bg-gray-50 p-5 rounded-[2rem]">
                 <p className="text-xs font-black uppercase mb-3">{q.question}</p>
                 <QuestionRenderer question={q} answer={answers[q.id]} onChange={(val) => setAnswers({...answers, [q.id]: val})} />
               </div>
             ))}
             <button onClick={() => setStep(5)} className="w-full bg-black text-white py-5 rounded-[2.5rem] font-black text-[10px]">Góndola Final</button>
           </div>
        )}

        {/* STEP 5: GONDOLA TERMINO */}
        {step === 5 && (
          <div className="space-y-4">
             {renderPhotoContainer(gondolaTerminoPhoto, setGondolaTerminoPhoto, 5)}
             <textarea value={comment} onChange={(e) => setComment(e.target.value)} className="w-full h-24 p-5 bg-gray-50 rounded-[2rem] border-none text-sm outline-none resize-none shadow-inner" />
             <button onClick={() => setStep(6)} disabled={!gondolaTerminoPhoto} className="w-full bg-black text-white py-5 rounded-[2.5rem] font-black text-[10px]">Confirmar Producto</button>
          </div>
        )}

        {/* STEP 6: DECISIÓN */}
        {step === 6 && (
          <div className="space-y-4 py-6">
              <button onClick={() => registrarGestionProducto('NUEVO')} className="w-full bg-[#87be00] text-white py-5 rounded-[2.5rem] font-black text-[10px]">Sí, nuevo producto</button>
              <button onClick={() => registrarGestionProducto('SALIR')} className="w-full bg-gray-900 text-white py-5 rounded-[2.5rem] font-black text-[10px]">Finalizar jornada</button>
          </div>
        )}

        {/* STEP 7: SALIDA */}
        {step === 7 && (
          <div className="space-y-4">
             {renderPhotoContainer(exitPhoto, setExitPhoto, 7)}
             {exitPhoto && <button onClick={finalizarVisitaTotal} className="w-full bg-[#87be00] text-white py-5 rounded-[2.5rem] font-black text-[10px]">Confirmar y Finalizar</button>}
          </div>
        )}

        {/* STEP 8: CIERRE */}
        {step === 8 && (
          <div className="py-6 space-y-4">
             <FiCheckCircle className="text-[#87be00] mx-auto" size={40} />
             <button onClick={() => navigate("/usuario/home")} className="w-full bg-[#87be00] text-white py-6 rounded-[2.5rem] font-black text-xs">Volver al inicio</button>
          </div>
        )}

        <div className="pt-4 border-t flex justify-center text-gray-300 text-[8px] font-black uppercase tracking-[0.3em]">
            <FiMapPin /> LOCAL: {id?.slice(0,8).toUpperCase()}
        </div>
      </div>

      <input type="file" accept="image/*" capture="environment" ref={fileInputRef} onChange={handleCapture} className="hidden" />
    </div>
  );
};

export default VisitFlow;