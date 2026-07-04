import React, { useState, useRef, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { 
  FiCamera, FiLoader, FiMapPin, FiX, 
  FiCheckCircle
} from "react-icons/fi";
import api from "../../api/apiClient";
import toast from "react-hot-toast";
import QuestionRenderer from "../../components/modals/QuestionRenderer"; 

const SupervisorVisitFlow = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  
  // 🚩 Referencia para saber qué foto estamos tomando
  const captureTypeRef = useRef(null); 

  const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [step, setStep] = useState(1); 
  const [loading, setLoading] = useState(false);
  const [capturing, setCapturing] = useState(false);
  
  const [chains, setChains] = useState([]);
  const [allLocals, setAllLocals] = useState([]);
  const [filteredLocals, setFilteredLocals] = useState([]);
  const [selectedChain, setSelectedChain] = useState(""); 
  const [selectedLocal, setSelectedLocal] = useState("");

  const [visitStartTime, setVisitStartTime] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [generalObservations, setGeneralObservations] = useState("");
  
  // 🚩 ESTADOS PARA LAS 3 FOTOS
  const [fotoEntrada, setFotoEntrada] = useState(null);
  const [fotoObservacion, setFotoObservacion] = useState(null); // Nueva foto
  const [fotoTermino, setFotoTermino] = useState(null); 

  const stepsInfo = {
    1: { title: "Inicio de Visita", sub: "Selección de punto de venta" },
    2: { title: "Auditoría de Sala", sub: "Cuestionario y Observación" },
    3: { title: "Cierre de Auditoría", sub: "Evidencia final y notas" },
    4: { title: "Visita Sincronizada", sub: "Proceso completado" } 
  };

  const formatImageUrl = (url) => {
    if (!url) return null;
    if (url.startsWith('blob:') || url.startsWith('http')) return url;
    const cleanUrl = url.replace(/^\//, '');
    return `${BASE_URL.replace(/\/$/, '')}/uploads/${cleanUrl}`;
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
    const fetchSupervisorMasters = async () => {
      try {
        const user = JSON.parse(localStorage.getItem("user"));
        if (!user?.id) throw new Error("Sesión no válida");
        const myLocalsData = await api.get("/users/my-locales");
        setAllLocals(myLocalsData);
        const uniqueChains = [...new Set(myLocalsData.filter(l => l.cadena).map(l => l.cadena))];
        setChains(uniqueChains);
        if (myLocalsData.length === 1) {
          setSelectedChain(myLocalsData[0].cadena);
          setSelectedLocal(myLocalsData[0].id);
        }
      } catch (err) { toast.error("Error cargando tus locales"); }
    };
    fetchSupervisorMasters();
  }, []);

  useEffect(() => {
    if (selectedChain) {
      const filtered = allLocals.filter(l => l.cadena === selectedChain);
      setFilteredLocals(filtered);
      if (filtered.length === 1) setSelectedLocal(filtered[0].id);
      else if (!filtered.find(l => l.id === selectedLocal)) setSelectedLocal("");
    } else {
      setFilteredLocals([]);
      setSelectedLocal("");
    }
  }, [selectedChain, allLocals]);

  useEffect(() => {
    if (selectedLocal && !visitStartTime) setVisitStartTime(new Date().toISOString());
  }, [selectedLocal, visitStartTime]);

  useEffect(() => {
    if (step === 2) {
      const loadSupervisorQuestions = async () => {
        try {
          const data = await api.get("/questions?flow=supervisor");
          setQuestions(data);
        } catch (err) {
          const cached = localStorage.getItem("cultivapp_supervisor_questions_cache");
          if (cached) setQuestions(JSON.parse(cached));
        }
      };
      loadSupervisorQuestions();
    }
  }, [step]);

  const handleCapture = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setCapturing(true);
    const toastId = toast.loading("Subiendo captura...");
    
    try {
      const currentPhotoType = captureTypeRef.current; // Sabremos si es inicio, observacion o termino
      
      const formData = new FormData();
      formData.append("photo_type", currentPhotoType);
      formData.append("local_id", selectedLocal);
      formData.append("foto", file); 
      
      const response = await api.post(`/supervisor/photo`, formData);
      const photoPath = response?.offline ? URL.createObjectURL(file) : (response.image_url || response.url || URL.createObjectURL(file));
      
      // Asignar al estado correspondiente
      if (currentPhotoType === "inicio_Jornada") setFotoEntrada(photoPath);
      if (currentPhotoType === "foto_observacion") setFotoObservacion(photoPath);
      if (currentPhotoType === "termino_jornada") setFotoTermino(photoPath);
      
      toast.success("Evidencia guardada", { id: toastId });
    } catch (err) { 
      toast.error("Error al subir", { id: toastId }); 
    } finally {
      setCapturing(false);
      e.target.value = "";
    }
  };

  const enviarAuditoriaFinal = async () => {
    const missingRequired = questions.some(q => q.is_required && !answers[q.id]);
    if (missingRequired) { toast.error("Faltan preguntas obligatorias"); setStep(2); return; }
    
    // Validación de fotos obligatorias
    if (!fotoTermino) { toast.error("Falta foto de término"); return; }
    if (!fotoObservacion) { toast.error("Falta foto de observación"); setStep(2); return; }

    setLoading(true);
    const toastId = toast.loading("Sincronizando...");
    const localData = allLocals.find(l => l.id === selectedLocal);
    
    const supervisorReportPayload = {
      local_id: selectedLocal, 
      chain_id: localData?.chain_id || null, 
      cadena: selectedChain,
      start_time: visitStartTime, 
      end_time: new Date().toISOString(), 
      responses: answers,
      observations: generalObservations, 
      photo_entry: fotoEntrada, 
      photo_observation: fotoObservacion, 
      photo_exit: fotoTermino 
    };
    
    try {
      await api.post(`/supervisor/audit`, supervisorReportPayload);
      toast.success("¡Registrado!", { id: toastId });
      setStep(4);
    } catch (err) { 
      toast.error("Error al registrar", { id: toastId }); 
    } finally { 
      setLoading(false); 
    }
  };

  const salirDeModulo = () => navigate("/supervisor");

  // Uso de renderPhoto con key identificador
  const renderPhotoContainer = (photoUrl, setPhotoUrl, placeholderText, photoKey) => {
    if (photoUrl) {
      return (
        <div className="relative w-full aspect-square bg-gray-50 rounded-[3rem] overflow-hidden border-4 border-gray-100 shadow-xl max-w-sm mx-auto">
          <img src={formatImageUrl(photoUrl)} className="w-full h-full object-contain" alt={placeholderText} />
          <button onClick={(e) => { e.stopPropagation(); setPhotoUrl(null); }} className="absolute top-4 right-4 bg-red-500 text-white p-3 rounded-full shadow-lg z-10"><FiX size={18}/></button>
        </div>
      );
    }
    return (
      <div 
        onClick={() => {
          if (!capturing) {
            captureTypeRef.current = photoKey; 
            fileInputRef.current.click();
          }
        }} 
        className="w-full max-w-sm mx-auto aspect-square bg-gray-50 border-4 border-dashed border-gray-200 rounded-[3rem] flex flex-col items-center justify-center cursor-pointer active:scale-95"
      >
        {capturing 
          ? <FiLoader className="animate-spin text-[#87be00]" size={44} /> 
          : <>
              <FiCamera size={40} className={isOnline ? 'text-[#87be00]' : 'text-orange-500'} />
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-2">Capturar {placeholderText}</span>
            </>
        }
      </div>
    );
  };

  const localSeleccionado = allLocals.find(l => l.id === selectedLocal);

  return (
    <div className={`min-h-screen p-4 md:p-6 pb-24 flex flex-col items-center ${isOnline ? 'bg-gray-50' : 'bg-orange-50/40'}`}>
      <div className="w-full max-w-md md:max-w-xl flex justify-between mb-8 sticky top-6 z-20 py-2">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className={`h-1.5 flex-1 mx-1 rounded-full transition-all duration-700 ${step >= i ? 'bg-[#87be00]' : 'bg-gray-200'}`} />
        ))}
      </div>

      <div className="w-full max-w-md md:max-w-xl bg-white p-6 md:p-10 rounded-[2.5rem] shadow-xl text-center space-y-6 border border-gray-100">
        <div className="space-y-1 pt-2">
          <h2 className="text-xl md:text-2xl font-black uppercase text-gray-900">{stepsInfo[step]?.title}</h2>
          <p className={`text-[9px] md:text-[11px] font-black uppercase tracking-[0.2em] ${isOnline ? 'text-[#87be00]' : 'text-orange-500'}`}>
            {stepsInfo[step]?.sub}
          </p>
        </div>

        {/* PASO 1: INICIO JORNADA */}
        {step === 1 && (
          <div className="space-y-5 animate-in slide-in-from-bottom-4 duration-500">
            <div className="grid grid-cols-1 gap-4">
              <select value={selectedChain} onChange={(e) => setSelectedChain(e.target.value)}
                className="w-full p-4 md:p-5 bg-gray-50 rounded-[1.5rem] text-xs md:text-sm font-bold shadow-inner">
                <option value="">Seleccione Cadena...</option>
                {chains.map(cadena => <option key={cadena} value={cadena}>{cadena}</option>)}
              </select>

              <select disabled={!selectedChain} value={selectedLocal} onChange={(e) => setSelectedLocal(e.target.value)}
                className="w-full p-4 md:p-5 bg-gray-50 rounded-[1.5rem] text-xs md:text-sm font-bold shadow-inner disabled:opacity-40">
                <option value="">Seleccione Local...</option>
                {filteredLocals.map(l => <option key={l.id} value={l.id}>{l.codigo_local} — {l.direccion}</option>)}
              </select>

              {localSeleccionado && (
                <div className="flex items-center gap-3 bg-[#87be00]/10 border border-[#87be00]/30 rounded-[1.2rem] px-5 py-4 text-left animate-in zoom-in duration-300">
                  <FiMapPin className="text-[#87be00] shrink-0" size={20} />
                  <div>
                    <p className="text-[10px] font-black uppercase text-[#87be00]">Local asignado</p>
                    <p className="text-xs md:text-sm font-bold text-gray-700">{localSeleccionado.codigo_local} — {localSeleccionado.direccion}</p>
                  </div>
                </div>
              )}
            </div>

            {selectedLocal && (
              <div className="pt-2 animate-in zoom-in space-y-4">
                {renderPhotoContainer(fotoEntrada, setFotoEntrada, "Fachada", "inicio_Jornada")}
                {fotoEntrada && (
                  <button onClick={() => setStep(2)} className="w-full bg-[#87be00] text-white py-5 md:py-6 rounded-[2.5rem] font-black uppercase text-[10px] md:text-xs">
                    Comenzar
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* PASO 2: AUDITORÍA + FOTO OBSERVACIÓN */}
        {step === 2 && (
          <div className="space-y-5 animate-in slide-in-from-right duration-300 text-left">
            <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-1 custom-scrollbar">
              {questions.map((q) => {
                const config = typeof q.config === 'string' ? JSON.parse(q.config || '{}') : (q.config || {});
                const normalizedQuestion = { ...q, config };
                
                return (
                  <div key={q.id} className="bg-gray-50/70 p-5 rounded-[2rem] border shadow-sm">
                    <p className="text-xs md:text-sm font-black uppercase mb-3 text-gray-700">
                      {q.question} {q.is_required && <span className="text-red-500">*</span>}
                    </p>
                    <QuestionRenderer 
                      question={normalizedQuestion} 
                      answer={answers[q.id]} 
                      onChange={(val) => setAnswers({...answers, [q.id]: val})} 
                    />
                  </div>
                );
              })}
            </div>

            <div className="pt-2">
              <p className="text-center text-[10px] font-black uppercase text-gray-400 tracking-widest mb-3">Evidencia de Sala</p>
              {renderPhotoContainer(fotoObservacion, setFotoObservacion, "Observación", "foto_observacion")}
            </div>

            {/* 🚩 BOTÓN SIGUIENTE BLOQUEADO ESTRICTAMENTE */}
            <button 
              onClick={() => {
                // 1. Validar preguntas obligatorias antes de avanzar
                const missingRequired = questions.some(q => q.is_required && !answers[q.id]);
                if (missingRequired) {
                  toast.error("Faltan preguntas obligatorias por responder (*)");
                  return;
                }

                // 2. Validar foto obligatoria (seguro extra)
                if (!fotoObservacion) {
                  toast.error("Debes capturar la evidencia de sala para continuar.");
                  return;
                }
                
                setStep(3);
              }} 
              disabled={!fotoObservacion} 
              className={`w-full py-5 md:py-6 rounded-[2.5rem] font-black uppercase text-[10px] md:text-xs transition-all duration-300 ${
                !fotoObservacion 
                  ? 'bg-gray-200 text-gray-400 cursor-not-allowed' 
                  : 'bg-black text-white active:scale-95'
              }`}
            >
              {!fotoObservacion ? "Falta Evidencia de Sala" : "Siguiente"}
            </button>
          </div>
        )}

        {/* PASO 3: CIERRE + FOTO TÉRMINO */}
        {step === 3 && (
          <div className="space-y-4 animate-in slide-in-from-right duration-300 text-left">
            <textarea value={generalObservations} onChange={(e) => setGeneralObservations(e.target.value)} placeholder="Observaciones..." className="w-full h-28 p-5 bg-gray-50 rounded-[2rem] text-xs md:text-sm font-bold" />
            
            {renderPhotoContainer(fotoTermino, setFotoTermino, "Término", "termino_jornada")}
            
            <button onClick={enviarAuditoriaFinal} disabled={loading} className="w-full bg-black text-white py-5 md:py-6 rounded-[2.5rem] font-black uppercase text-[10px] md:text-xs disabled:opacity-40">
              {loading ? "Sincronizando..." : "Sincronizar"}
            </button>
          </div>
        )}

        {/* PASO 4: COMPLETADO */}
        {step === 4 && (
          <div className="py-6 space-y-4 animate-in zoom-in">
            <FiCheckCircle className="text-[#87be00] mx-auto" size={64} />
            <p className="text-xs md:text-sm font-bold uppercase">Auditoría Sincronizada</p>
            <button onClick={salirDeModulo} className="w-full bg-[#87be00] text-white py-6 rounded-[2.5rem] font-black uppercase text-xs md:text-sm">Volver</button>
          </div>
        )}
      </div>

      <input type="file" accept="image/*" capture="environment" ref={fileInputRef} onChange={handleCapture} className="hidden" />
    </div>
  );
};

export default SupervisorVisitFlow;