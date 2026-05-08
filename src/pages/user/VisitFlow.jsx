import React, { useState, useRef, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { 
  FiCamera, FiLoader, FiMapPin, FiArrowRight, 
  FiX, FiCheckCircle, FiWifiOff, FiTrash2, FiPlusCircle, FiLogOut, FiSend, FiTag, FiBox 
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
  
  // 📚 ESTADOS DEL CATÁLOGO MAESTRO
  const [brands, setBrands] = useState([]);
  const [allProducts, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [selectedBrand, setSelectedBrand] = useState("");
  const [selectedProduct, setSelectedProduct] = useState("");

  // 🕒 ESTADOS DE TRAZABILIDAD Y GESTIÓN POR PRODUCTO
  const [productStartTime, setProductStartTime] = useState(null);
  const [scannedCodes, setScannedCodes] = useState([]); 
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [comment, setComment] = useState("");
  
  // 📸 FOTOS DEL FLUJO
  const [gondolaInicialPhoto, setGondolaInicialPhoto] = useState(null);
  const [gondolaTerminoPhoto, setGondolaTerminoPhoto] = useState(null); 

  // 🗺️ MAPA DE PASOS OPERATIVOS
  const stepsInfo = {
    1: { key: "foto_fachada", title: "Llegada al Local", sub: "Evidencia de entrada" },
    2: { key: "foto_gondola_inicio", title: "Góndola Inicial", sub: "Selección y Estado Previo" },
    3: { key: "escaneo", title: "Escanear Producto", sub: "Registro de EANs en sala" },
    4: { key: "preguntas", title: "Encuesta de Gestión", sub: "Validación de quiebres/flejes" },
    5: { key: "foto_gondola_termino", title: "Góndola Término", sub: "Evidencia final y observaciones" },
    6: { key: "Decision", title: "¿Siguiente Producto?", sub: "Continuar gestionando o salir" },
    7: { key: "foto_salida", title: "Registro de Salida", sub: "Fin de jornada en local" }
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

  // 1. Cargar Marcas y Productos
  useEffect(() => {
    const fetchMasterData = async () => {
      try {
        const [brandsData, productsData] = await Promise.all([
          api.get("/routes/brands"),
          api.get("/routes/products")
        ]);
        setBrands(brandsData);
        setProducts(productsData);
      } catch (err) {
        console.error("Error al cargar maestros:", err);
      }
    };
    fetchMasterData();
  }, []);

  // 2. Filtrar productos por marca
  useEffect(() => {
    if (selectedBrand) {
      const filtered = allProducts.filter(p => p.brand_id === selectedBrand);
      setFilteredProducts(filtered);
      setSelectedProduct(""); 
    } else {
      setFilteredProducts([]);
    }
  }, [selectedBrand, allProducts]);

  // 3. Registrar inicio de tiempo de producto
  useEffect(() => {
    if (step === 2 && !productStartTime) {
      setProductStartTime(new Date().toISOString());
    }
  }, [step, productStartTime]);

  // 4. Cargar preguntas
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

  // 📸 PROCESADOR DE CÁMARA
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
      const response = await api.post(`/routes/${id}/photo`, formData);
      const photoUrl = response?.offline ? URL.createObjectURL(file) : (response.image_url || response.url);

      // Asignar fotos a sus respectivos estados
      if (step === 2) setGondolaInicialPhoto(photoUrl);
      if (step === 5) setGondolaTerminoPhoto(photoUrl);

      toast.success("Captura guardada", { id: toastId });
      
      // AUTO-AVANCE: Solo en llegada (1) y salida (7)
      if (step === 1 || step === 7) {
        setStep(prev => prev + 1);
      }
    } catch (err) {
      toast.error("Error al procesar imagen", { id: toastId });
    } finally {
      setCapturing(false);
      e.target.value = "";
    }
  };

  // 📦 PROCESADOR DE SCANNER
  const handleScanSuccess = async (decodedText) => {
    if (scannedCodes.includes(decodedText)) return; 
    if (isProcessingScan.current) return;
    
    isProcessingScan.current = true;
    try {
      await api.post(`/routes/${id}/scans`, { barcode: decodedText });
      setScannedCodes(prev => [decodedText, ...prev]);
      if (!navigator.onLine) toast("Escaneo guardado offline", { icon: '📦' });
      setTimeout(() => { isProcessingScan.current = false; }, 600);
    } catch (err) { 
      isProcessingScan.current = false; 
    }
  };

  // 💾 GUARDAR GESTIÓN DEL PRODUCTO (BACKEND)
  const registrarGestionProducto = async (proximoPaso) => {
    setLoading(true);
    const toastId = toast.loading("Registrando gestión...");
    
    const taskData = {
      product_id: selectedProduct, 
      product_codes: scannedCodes,
      start_time: productStartTime,
      end_time: new Date().toISOString(),
      responses: answers,
      comment,
      photo_before: gondolaInicialPhoto,
      photo_after: gondolaTerminoPhoto // Mapeado correctamente para Trazabilidad
    };

    try {
      await api.post(`/routes/${id}/task`, taskData);

      // Limpiar estados para el siguiente ciclo
      setScannedCodes([]);
      setAnswers({});
      setComment("");
      setGondolaTerminoPhoto(null);
      setGondolaInicialPhoto(null);
      setProductStartTime(null);
      setSelectedBrand("");
      setSelectedProduct("");

      toast.success("Producto registrado exitosamente", { id: toastId });

      if (proximoPaso === 'NUEVO') {
        setStep(2); // Vuelve al selector
      } else {
        setStep(7); // Pasa a cerrar visita
      }
    } catch (err) {
      toast.error("Error al registrar tarea", { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  // 🏁 FINALIZAR VISITA TOTAL
  const finalizarVisitaTotal = async () => {
    setLoading(true);
    const toastId = toast.loading("Finalizando visita...");
    try {
      await api.post(`/routes/${id}/finish`, { status: "completed" });
      toast.success("¡Jornada finalizada exitosamente!", { id: toastId });
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

        {/* 🚩 PASO 1 Y 7: LLEGADA / SALIDA */}
        {(step === 1 || step === 7) && (
          <div className="space-y-4 animate-in zoom-in duration-300">
             <div onClick={() => !capturing && fileInputRef.current.click()} className="w-full aspect-square bg-gray-50 border-4 border-dashed border-gray-200 rounded-[3rem] flex flex-col items-center justify-center cursor-pointer active:scale-95 transition-all">
               {capturing ? <FiLoader className="animate-spin text-[#87be00]" size={44} /> : (
                 <>
                   <div className="bg-white p-6 rounded-full shadow-sm mb-4"><FiCamera size={40} className={isOnline ? 'text-[#87be00]' : 'text-orange-500'} /></div>
                   <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-4 text-center">Capturar {stepsInfo[step].title}</span>
                 </>
               )}
             </div>
          </div>
        )}

        {/* 🚩 PASO 2: GÓNDOLA INICIAL Y SELECTORES */}
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
              <div className="pt-2 animate-in zoom-in duration-300">
                {gondolaInicialPhoto ? (
                  <div className="relative rounded-[3rem] overflow-hidden border-4 border-gray-100">
                      <img src={gondolaInicialPhoto} className="w-full aspect-square object-cover" alt="inicio" />
                      <button onClick={() => setGondolaInicialPhoto(null)} className="absolute top-4 right-4 bg-red-500 text-white p-3 rounded-full shadow-lg"><FiX/></button>
                  </div>
                ) : (
                  <div onClick={() => !capturing && fileInputRef.current.click()} className="w-full aspect-square bg-gray-50 border-4 border-dashed border-gray-200 rounded-[3rem] flex flex-col items-center justify-center cursor-pointer active:scale-95 transition-all">
                    {capturing ? <FiLoader className="animate-spin text-[#87be00]" size={44} /> : (
                      <>
                        <div className="bg-white p-6 rounded-full shadow-sm mb-4"><FiCamera size={40} className="text-[#87be00]" /></div>
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-4 text-center">Capturar Foto Inicial</span>
                      </>
                    )}
                  </div>
                )}
                
                {gondolaInicialPhoto && (
                  <button onClick={() => setStep(3)} className="w-full mt-4 bg-[#87be00] text-white py-5 rounded-[2.5rem] font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-3 shadow-xl shadow-[#87be00]/20 active:scale-95 transition-all">
                    Escanear Productos <FiArrowRight size={16}/>
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* 🚩 PASO 3: SCANNER */}
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
            <button onClick={() => setStep(4)} className="w-full bg-black text-white py-5 rounded-[2.5rem] font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-3">Validar Encuesta <FiArrowRight size={16}/></button>
          </div>
        )}

        {/* 🚩 PASO 4: ENCUESTA */}
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
             <button onClick={() => setStep(5)} className="w-full bg-black text-white py-5 rounded-[2.5rem] font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-3">Góndola Final <FiArrowRight/></button>
           </div>
        )}

        {/* 🚩 PASO 5: GÓNDOLA TÉRMINO Y OBSERVACIONES */}
        {step === 5 && (
          <div className="space-y-4 animate-in slide-in-from-right duration-300">
             {gondolaTerminoPhoto ? (
                <div className="relative rounded-[3rem] overflow-hidden border-4 border-gray-100">
                    <img src={gondolaTerminoPhoto} className="w-full aspect-square object-cover" alt="termino" />
                    <button onClick={() => setGondolaTerminoPhoto(null)} className="absolute top-4 right-4 bg-red-500 text-white p-3 rounded-full shadow-lg"><FiX/></button>
                </div>
             ) : (
                <div onClick={() => !capturing && fileInputRef.current.click()} className="w-full aspect-square bg-gray-50 border-4 border-dashed border-gray-200 rounded-[3rem] flex flex-col items-center justify-center cursor-pointer active:scale-95 transition-all">
                  {capturing ? <FiLoader className="animate-spin text-[#87be00]" size={44} /> : (
                    <>
                      <div className="bg-white p-6 rounded-full shadow-sm mb-4"><FiCamera size={40} className="text-gray-400" /></div>
                      <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-4 text-center">Capturar Góndola Término</span>
                    </>
                  )}
                </div>
             )}
             
             <textarea 
               value={comment} 
               onChange={(e) => setComment(e.target.value)} 
               placeholder="Observaciones adicionales sobre este producto..." 
               className="w-full h-24 p-5 bg-gray-50 rounded-[2rem] border-none text-sm outline-none resize-none shadow-inner" 
             />
             
             <button 
               onClick={() => setStep(6)} 
               disabled={!gondolaTerminoPhoto} 
               className="w-full bg-black text-white py-5 rounded-[2.5rem] font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-3 disabled:opacity-50 transition-all"
             >
               Confirmar Producto <FiArrowRight size={16}/>
             </button>
          </div>
        )}

        {/* 🚩 PASO 6: DECISIÓN */}
        {step === 6 && (
          <div className="py-6 space-y-6 animate-in zoom-in">
            <div className="flex flex-col items-center gap-3">
              <div className="w-16 h-16 bg-[#87be00]/10 rounded-full flex items-center justify-center text-[#87be00] mb-2"><FiCheckCircle size={32} /></div>
              <h3 className="text-sm font-black uppercase text-gray-900 tracking-tighter italic">¿Agregar otro producto?</h3>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">El tiempo de este producto ha sido registrado.</p>
            </div>
            
            <div className="flex flex-col gap-3">
              <button onClick={() => registrarGestionProducto('NUEVO')} disabled={loading} className="w-full bg-[#87be00] text-white py-5 rounded-[2.5rem] font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-3 shadow-xl shadow-[#87be00]/20 active:scale-95 transition-all">
                {loading ? <FiLoader className="animate-spin"/> : <><FiPlusCircle size={18}/> Sí, nuevo producto</>}
              </button>
              <button onClick={() => registrarGestionProducto('SALIR')} disabled={loading} className="w-full bg-gray-900 text-white py-5 rounded-[2.5rem] font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-3 active:scale-95 transition-all">
                <FiLogOut size={18}/> No, finalizar jornada
              </button>
            </div>
          </div>
        )}

        {/* 🚩 CIERRE FINAL */}
        {step === 8 && (
          <div className="py-6 space-y-4 animate-in zoom-in">
             <div className="bg-[#87be00]/5 p-8 rounded-[3rem] border border-[#87be00]/10 text-center">
               <FiCheckCircle className="text-[#87be00] mx-auto mb-3" size={40} />
               <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Gestión Finalizada</p>
               <p className="text-xs font-bold text-gray-900 mt-1 uppercase italic leading-tight">Has registrado todos los productos y tu salida del local.</p>
             </div>
             <button onClick={finalizarVisitaTotal} disabled={loading} className="w-full bg-[#87be00] text-white py-6 rounded-[2.5rem] font-black uppercase text-xs tracking-widest shadow-2xl flex items-center justify-center gap-3 active:scale-95 transition-all">
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