import React, { useEffect, useRef, useState, useCallback } from "react";
import { BrowserMultiFormatReader, DecodeHintType, BarcodeFormat } from "@zxing/library";
import { FiLoader, FiAlertTriangle, FiCamera, FiEdit3, FiPlus } from "react-icons/fi";
import toast from "react-hot-toast";

const Scanner = ({ onScanSuccess }) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const codeReaderRef = useRef(null);
  const isMounted = useRef(true);

  // 🚩 MEJORA: Reemplazamos las refs antiguas por un simple timestamp
  const lastScanTime = useRef(0);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // 🚩 Estado para el modo de ingreso manual por teclado
  const [isManualInput, setIsManualInput] = useState(false);
  const [manualCode, setManualCode] = useState("");

  const stopCamera = useCallback(() => {
    if (codeReaderRef.current) {
      codeReaderRef.current.reset();
    }
    if (videoRef.current?.srcObject) {
      videoRef.current.srcObject.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
  }, []);

  const startScanner = useCallback(async () => {
    try {
      if (!isMounted.current) return;
      setLoading(true);
      setError(null);

      stopCamera(); // Limpia antes de iniciar

      const hints = new Map();
      hints.set(DecodeHintType.POSSIBLE_FORMATS, [
        BarcodeFormat.EAN_13,
        BarcodeFormat.EAN_8,
        BarcodeFormat.CODE_128,
        BarcodeFormat.UPC_A
      ]);
      hints.set(DecodeHintType.TRY_HARDER, true);

      const codeReader = new BrowserMultiFormatReader(hints);
      codeReaderRef.current = codeReader;

      const constraints = {
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 1280 },
          height: { ideal: 720 },
          focusMode: "continuous"
        },
        audio: false
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      
      if (videoRef.current && isMounted.current && !isManualInput) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute("playsinline", "true");
        videoRef.current.setAttribute("muted", "true");

        // 🚩 LÓGICA DE ESCANEO SIN BLOQUEO POR CONTENIDO
        codeReader.decodeFromStream(stream, videoRef.current, (result, err) => {
          if (!isMounted.current || isManualInput) return;
          
          if (result) {
            const now = Date.now();
            // Permitir escaneo si han pasado al menos 800ms
            if (now - lastScanTime.current > 800) {
              lastScanTime.current = now;
              const code = result.getText();
              
              onScanSuccess(code);
              if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
              toast.success(`EAN: ${code}`, { id: 'scan-success', duration: 800 });
            }
          }
        });
      }

      if (isMounted.current) setLoading(false);
    } catch (err) {
      if (isMounted.current) {
        console.error("Error cámara:", err);
        setError("No se pudo iniciar la cámara. Verifica los permisos.");
        setLoading(false);
      }
    }
  }, [onScanSuccess, isManualInput, stopCamera]);

  useEffect(() => {
    isMounted.current = true;
    
    if (!isManualInput) {
      const timeoutId = setTimeout(startScanner, 500);
      return () => {
        isMounted.current = false;
        clearTimeout(timeoutId);
        stopCamera();
      };
    } else {
      stopCamera();
      setLoading(false);
    }

    return () => {
      isMounted.current = false;
      stopCamera();
    };
  }, [isManualInput, startScanner, stopCamera]);

  // 🚩 Mantiene tu función original de forzar lectura por foto
  const captureManual = async () => {
    if (!videoRef.current || !codeReaderRef.current) return;
    try {
      const canvas = canvasRef.current;
      const context = canvas.getContext("2d");
      const video = videoRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      const imageData = canvas.toDataURL("image/jpeg", 0.9);

      try {
        const result = await codeReaderRef.current.decodeFromImageUrl(imageData);
        if (result) {
          const now = Date.now();
          // Aplicamos la misma lógica de tiempo
          if (now - lastScanTime.current > 800) {
             lastScanTime.current = now;
             onScanSuccess(result.getText());
             toast.success("Detectado por captura fotográfica");
          }
        }
      } catch (scanErr) {
        toast.error("Asegúrate de que el código esté bien iluminado", { id: 'scan-err' });
      }
    } catch (fatalErr) {
      console.error("Error disparo manual:", fatalErr);
    }
  };

  const handleKeyboardSubmit = (e) => {
    e.preventDefault();
    if (manualCode.trim().length >= 4) {
      onScanSuccess(manualCode.trim());
      setManualCode("");
      toast.success("Código agregado manualmente");
    }
  };

  return (
    <div className="relative w-full aspect-[3/4] bg-black rounded-[2.5rem] overflow-hidden shadow-2xl flex flex-col">
      
      {!isManualInput ? (
        <>
          <video ref={videoRef} className="w-full h-full object-cover scale-[1.15]" playsInline muted autoPlay />
          <canvas ref={canvasRef} className="hidden" />

          <div className="absolute inset-0 pointer-events-none z-10 flex flex-col items-center justify-center p-8">
            <div className="relative w-64 h-44 border-2 border-[#87be00]/30 rounded-3xl shadow-[0_0_0_9999px_rgba(0,0,0,0.6)]">
              <div className="absolute -top-1 -left-1 w-8 h-8 border-t-4 border-l-4 border-[#87be00] rounded-tl-xl"></div>
              <div className="absolute -top-1 -right-1 w-8 h-8 border-t-4 border-r-4 border-[#87be00] rounded-tr-xl"></div>
              <div className="absolute -bottom-1 -left-1 w-8 h-8 border-b-4 border-l-4 border-[#87be00] rounded-bl-xl"></div>
              <div className="absolute -bottom-1 -right-1 w-8 h-8 border-b-4 border-r-4 border-[#87be00] rounded-br-xl"></div>
              <div className="absolute top-1/2 left-4 right-4 h-[1px] bg-[#87be00] opacity-40 shadow-[0_0_15px_#87be00] animate-pulse"></div>
            </div>
            <p className="mt-6 text-[9px] font-black text-[#87be00] uppercase tracking-widest bg-black/50 px-3 py-1.5 rounded-xl backdrop-blur-sm">
              Escaneo Continuo Activo
            </p>
          </div>

          {!loading && !error && (
            <div className="absolute bottom-6 left-0 w-full flex justify-center gap-4 z-30 px-6">
              <button onClick={captureManual} className="bg-white/10 backdrop-blur-xl border border-white/30 p-4 rounded-full active:scale-90 transition-transform shadow-2xl">
                <FiCamera className="text-[#87be00]" size={24} />
              </button>
              <button onClick={() => setIsManualInput(true)} className="bg-white/10 backdrop-blur-xl border border-white/30 px-6 py-4 rounded-full flex items-center gap-2 active:scale-90 transition-transform shadow-2xl">
                <FiEdit3 className="text-white" size={18} />
                <span className="text-[10px] font-black text-white uppercase tracking-widest">Digitar EAN</span>
              </button>
            </div>
          )}

          {loading && (
            <div className="absolute inset-0 bg-neutral-900 z-40 flex flex-col items-center justify-center gap-4">
              <FiLoader className="text-[#87be00] animate-spin" size={40} />
              <span className="text-[10px] text-white font-black uppercase tracking-widest leading-none">Iniciando Lente...</span>
            </div>
          )}

          {error && (
            <div className="absolute inset-0 bg-neutral-950 z-40 flex flex-col items-center justify-center p-6 text-center">
              <FiAlertTriangle className="text-red-500 mb-4" size={40} />
              <p className="text-white text-[10px] font-black uppercase leading-relaxed mb-6">{error}</p>
              <button onClick={startScanner} className="bg-white/10 px-6 py-3 rounded-full text-white text-[10px] font-black uppercase tracking-widest border border-white/20 mb-3">Reintentar</button>
              <button onClick={() => setIsManualInput(true)} className="text-[#87be00] text-[10px] font-black uppercase underline">Ingresar Manualmente</button>
            </div>
          )}
        </>
      ) : (
        <div className="w-full h-full bg-white flex flex-col items-center justify-center p-6 relative">
          <button onClick={() => setIsManualInput(false)} className="absolute top-6 right-6 text-gray-400 hover:text-gray-900 bg-gray-50 px-4 py-2 rounded-xl text-[10px] font-black uppercase">
            Volver a Cámara
          </button>

          <div className="w-full space-y-4 text-center mt-8">
            <div className="w-16 h-16 bg-[#87be00]/10 text-[#87be00] rounded-2xl flex items-center justify-center mx-auto mb-4">
              <FiEdit3 size={24} />
            </div>
            <h3 className="text-lg font-black text-gray-900 uppercase italic leading-none">Ingreso Manual</h3>
            
            <form onSubmit={handleKeyboardSubmit} className="pt-2 flex flex-col gap-3">
              <input
                type="number"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                placeholder="Escribe el código EAN..."
                className="w-full text-center py-4 px-4 bg-gray-50 rounded-[1.5rem] border-none text-sm font-black tracking-widest outline-none shadow-inner focus:ring-2 focus:ring-[#87be00]/20"
                autoFocus
              />
              <button 
                type="submit"
                disabled={manualCode.trim().length < 4}
                className="w-full bg-[#87be00] text-white py-4 rounded-[2rem] font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-3 disabled:opacity-50 active:scale-95 transition-all shadow-lg shadow-[#87be00]/20"
              >
                <FiPlus size={16}/> Agregar Código
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Scanner;