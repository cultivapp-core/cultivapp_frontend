import React, { useEffect, useRef, useState, useCallback } from "react";
import { BrowserMultiFormatReader, DecodeHintType, BarcodeFormat } from "@zxing/library";
import { FiLoader, FiAlertTriangle, FiCamera, FiEdit3, FiPlus, FiArrowLeft } from "react-icons/fi";
import toast from "react-hot-toast";

const Scanner = ({ onScanSuccess }) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const codeReaderRef = useRef(null);
  const isMounted = useRef(true);

  // 🚩 MEJORA: Ref para control de tiempo de escaneo
  const lastScanTime = useRef(0);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
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
      stopCamera();

      const hints = new Map();
      hints.set(DecodeHintType.POSSIBLE_FORMATS, [BarcodeFormat.EAN_13, BarcodeFormat.EAN_8, BarcodeFormat.CODE_128, BarcodeFormat.UPC_A]);
      hints.set(DecodeHintType.TRY_HARDER, true);

      const codeReader = new BrowserMultiFormatReader(hints);
      codeReaderRef.current = codeReader;

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } }
      });
      
      if (videoRef.current && isMounted.current && !isManualInput) {
        videoRef.current.srcObject = stream;
        
        // 🚩 MEJORA: Lógica de escaneo con cooldown de 800ms
        codeReader.decodeFromStream(stream, videoRef.current, (result, err) => {
          if (!result || isManualInput) return;

          const now = Date.now();
          if (now - lastScanTime.current < 800) return;

          lastScanTime.current = now;
          const code = result.getText();

          onScanSuccess(code);

          if (navigator.vibrate) navigator.vibrate(100);
          toast.success(`EAN: ${code}`, { id: "scan-success" });
        });
      }
      setLoading(false);
    } catch (err) {
      setError("No se pudo acceder a la cámara. Revisa los permisos.");
      setLoading(false);
    }
  }, [isManualInput, stopCamera, onScanSuccess]);

  useEffect(() => {
    isMounted.current = true;
    if (!isManualInput) startScanner();
    return () => { isMounted.current = false; stopCamera(); };
  }, [isManualInput, startScanner, stopCamera]);

  // 🚩 Actualizado para usar lastScanTime
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
          if (now - lastScanTime.current >= 800) {
             lastScanTime.current = now;
             onScanSuccess(result.getText());
             toast.success("Detectado por captura");
          }
        }
      } catch (scanErr) {
        toast.error("No se detectó código", { id: 'scan-err' });
      }
    } catch (fatalErr) {
      console.error("Error disparo manual:", fatalErr);
    }
  };

  return (
    <div className="relative w-full min-h-[400px] max-h-[70vh] bg-black rounded-[2rem] overflow-hidden shadow-2xl flex flex-col">
      
      {!isManualInput ? (
        <>
          <video ref={videoRef} className="w-full h-full object-cover" playsInline muted autoPlay />
          <canvas ref={canvasRef} className="hidden" />
          
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center pointer-events-none">
             <div className="w-64 h-40 border-2 border-[#87be00]/40 rounded-3xl shadow-[0_0_0_9999px_rgba(0,0,0,0.6)] animate-in zoom-in duration-300">
                <div className="absolute top-1/2 left-0 right-0 h-[1px] bg-[#87be00] opacity-50 shadow-[0_0_15px_#87be00] animate-pulse"></div>
             </div>
          </div>

          {!loading && !error && (
            <div className="absolute bottom-8 left-0 right-0 flex justify-center gap-4 z-30 px-6 pb-4">
              <button onClick={() => setIsManualInput(true)} className="bg-white/10 backdrop-blur-md border border-white/20 px-6 py-4 rounded-full flex items-center gap-2 shadow-2xl active:scale-95 transition-all">
                <FiEdit3 className="text-white" size={18} />
                <span className="text-[10px] font-black text-white uppercase tracking-widest">Digitar EAN</span>
              </button>
            </div>
          )}

          {loading && (
             <div className="absolute inset-0 bg-black/80 z-40 flex items-center justify-center"><FiLoader className="text-[#87be00] animate-spin" size={40} /></div>
          )}
        </>
      ) : (
        <div className="w-full h-full bg-white flex flex-col items-center justify-center p-6 relative">
          <button onClick={() => setIsManualInput(false)} className="absolute top-6 left-6 text-gray-400 p-2">
            <FiArrowLeft size={24} />
          </button>
          
          <div className="w-full max-w-[300px] text-center space-y-4">
            <h3 className="text-sm font-black text-gray-900 uppercase italic">Ingreso Manual</h3>
            <form onSubmit={(e) => { e.preventDefault(); onScanSuccess(manualCode); setManualCode(""); setIsManualInput(false); }} className="space-y-3">
              <input
                type="number"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                placeholder="Escribe el código..."
                className="w-full text-center py-4 bg-gray-100 rounded-2xl text-lg font-bold outline-none"
                autoFocus
              />
              <button type="submit" className="w-full bg-[#87be00] text-white py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest">Agregar</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Scanner;