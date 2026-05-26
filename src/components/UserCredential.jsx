import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import api from "../api/apiClient"; 
import { FiXCircle, FiPhone, FiDownload, FiBriefcase, FiAlertTriangle, FiExternalLink } from "react-icons/fi";

import logoEmpresa from "../assets/logo-cultiva.png"; 

const UserCredential = () => {
  const { id } = useParams();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // 🚩 FUNCIÓN AUXILIAR PARA CONSTRUIR URLS INFALIBLES
  const getFullUrl = (path) => {
    if (!path) return null;
    if (path.startsWith('http')) return path;
    
    const baseUrl = "http://localhost:5000";
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    return `${baseUrl}${cleanPath}`;
  };

  useEffect(() => {
    const fetchUser = async () => {
      try {
        setLoading(true);
        const data = await api.get(`users/public/verify/${id}`);
        setUser(data);
      } catch (err) {
        console.error("Error:", err);
      } finally {
        setLoading(false);
      }
    };
    if (id) fetchUser();
  }, [id]);

  const handleDownload = async (e) => {
    e.preventDefault();
    if (!user?.achs_url) return;

    try {
      const fileUrl = getFullUrl(user.achs_url);
      const response = await fetch(fileUrl);
      if (!response.ok) throw new Error("Error al descargar el archivo");
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `ACHS_${user.last_name || 'Documento'}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Error en la descarga:", err);
      window.open(getFullUrl(user.achs_url), '_blank');
    }
  };

  const getVigenciaStatus = () => {
    if (!user?.fecha_contrato) return { valid: true, color: 'bg-[#87be00]', label: 'Vigente', alert: false };
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const expDate = new Date(user.fecha_contrato);
    const diffTime = expDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return { valid: false, color: 'bg-red-500', label: 'Expirado', alert: false };
    if (diffDays <= 5) return { valid: true, color: 'bg-orange-500', label: 'Próximo a Vencer', alert: true };
    return { valid: true, color: 'bg-[#87be00]', label: 'Vigente', alert: false };
  };

  const status = getVigenciaStatus();

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-[#87be00]"></div>
    </div>
  );

  if (!user || !user.is_active || !status.valid) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-6 font-[Outfit]">
        <div className="bg-white p-10 rounded-[2.5rem] shadow-2xl text-center border-t-8 border-red-500 max-w-sm w-full">
          <FiXCircle className="text-red-500 text-7xl mx-auto mb-4" />
          <h2 className="text-2xl font-black text-gray-800 uppercase tracking-tight">Acceso Denegado</h2>
          <p className="text-gray-500 mt-4 text-sm leading-relaxed">
            {!status.valid ? "Esta credencial ha caducado por vencimiento de contrato." : "Esta credencial se encuentra inhabilitada temporalmente."}
          </p>
          <button onClick={() => window.location.reload()} className="mt-8 w-full py-3 bg-gray-900 text-white rounded-2xl font-bold">
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center p-4 font-[Outfit]">
      <div className="max-w-sm w-full bg-white rounded-[2.5rem] shadow-[0_30px_60px_-12px_rgba(0,0,0,0.12)] overflow-hidden border border-gray-100 relative">
        
        {/* CABECERA */}
        <div className={`${status.color} px-8 pt-6 pb-16 flex flex-col items-center relative transition-colors duration-500`}>
          <img src={logoEmpresa} alt="Cultiva" className="h-16 w-auto object-contain mb-4" />
          <div className="bg-white/20 backdrop-blur-md px-5 py-1.5 rounded-full border border-white/30 flex items-center gap-2.5">
            <div className={`h-2.5 w-2.5 rounded-full bg-white ${status.alert ? 'animate-ping' : 'animate-pulse'}`} />
            <span className="text-white text-[11px] font-black tracking-[0.2em] uppercase">{status.label}</span>
          </div>
        </div>

        {/* FOTO */}
        <div className="flex justify-center -mt-10 relative z-10">
          <div className="p-1.5 bg-white rounded-[2.2rem] shadow-2xl">
            <img 
              src={getFullUrl(user.foto_url) || "https://via.placeholder.com/150"} 
              alt="Perfil" 
              className="w-32 h-32 rounded-[2rem] object-cover"
            />
          </div>
        </div>

        <div className="p-6 text-center">
          {status.alert && (
            <div className="mb-4 bg-orange-50 border border-orange-100 p-3 rounded-2xl flex items-center gap-3 text-orange-600 animate-pulse">
              <FiAlertTriangle size={20} className="shrink-0" />
              <p className="text-[10px] font-bold text-left leading-tight">Su contrato vence pronto. Gestione su renovación.</p>
            </div>
          )}

          <h2 className="text-2xl font-black text-gray-800 tracking-tight leading-tight">{user.first_name} {user.last_name}</h2>
          <p className="text-[#87be00] font-extrabold text-[11px] uppercase tracking-[0.2em] mt-2 mb-6">{user.position}</p>
          
          <div className="space-y-3 text-left">
            {/* 🚩 BLOQUE EMPRESA Y TRABAJANDO PARA */}
            <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100 flex items-center gap-4">
              <div className="bg-white p-2.5 rounded-xl shadow-sm text-[#87be00]"><FiBriefcase size={18} /></div>
              <div className="flex-1 space-y-3">
                <div>
                  <p className="text-[9px] text-gray-400 font-black uppercase mb-0.5">Empresa</p>
                  <p className="text-sm font-bold text-gray-700 leading-tight">{user.empresa_cliente || "CULTIVA S.A."}</p>
                </div>
                <div className="border-t border-gray-200 pt-2">
                  <p className="text-[9px] text-gray-400 font-black uppercase mb-0.5">Trabajando para:</p>
                  <p className="text-sm font-bold text-[#87be00] leading-tight">{user.trabajando_para || "No especificado"}</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-gray-50/80 rounded-2xl p-3 border border-gray-100">
                <p className="text-[8px] text-gray-400 font-bold uppercase mb-1">Contrato</p>
                <p className="text-[11px] font-bold text-gray-700 uppercase">{user.tipo_contrato || "Indefinido"}</p>
              </div>
              <div className="bg-gray-50/80 rounded-2xl p-3 border border-gray-100">
                <p className="text-[8px] text-gray-400 font-black uppercase mb-1 text-center">RUT</p>
                <p className="text-[11px] font-bold text-gray-700 text-center">{user.rut}</p>
              </div>
            </div>

            <div className="bg-gray-50/80 rounded-2xl p-3 border border-gray-100 text-center">
                <p className="text-[8px] text-gray-400 font-bold uppercase mb-1 tracking-widest">Vencimiento del Documento</p>
                <p className="text-sm font-bold text-gray-700">
                  {user.fecha_contrato ? new Date(user.fecha_contrato).toLocaleDateString('es-CL', { day: '2-digit', month: 'long', year: 'numeric'}) : "Vigencia Indefinida"}
                </p>
            </div>

            <button 
                onClick={handleDownload}
                className="w-full group flex items-center justify-between px-6 py-4 bg-[#eff6ff] hover:bg-blue-600 text-blue-600 hover:text-white rounded-2xl font-bold text-xs transition-all duration-300 border border-blue-100 mt-2 shadow-sm"
            >
                <div className="flex items-center gap-3">
                    <FiDownload size={18} className="group-hover:animate-bounce" />
                    <span>Descargar Documentos</span>
                </div>
                <FiExternalLink className="opacity-40 group-hover:opacity-100" />
            </button>
          </div>
        </div>

        {/* SECCIÓN DE SUPERVISOR */}
        <div className="px-6 pb-8">
            <div className="flex items-center justify-between bg-gray-50 border border-gray-100 p-4 rounded-3xl shadow-sm">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-white flex items-center justify-center text-[#87be00] border border-gray-100">
                  <FiPhone size={20} />
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-800 leading-none">{user.supervisor_nombre || "Ignacio Muñoz"}</p>
                  <p className="text-[10px] text-[#87be00] font-bold mt-1 tracking-wider">
                    {user.supervisor_telefono || "Sin teléfono"}
                  </p>
                  <p className="text-[9px] text-gray-400 font-medium italic">Contacto Supervisor</p>
                </div>
              </div>
              <a 
                href={`tel:${user.supervisor_telefono}`} 
                className="bg-[#87be00] h-11 w-11 rounded-2xl flex items-center justify-center text-white shadow-lg active:scale-90 transition-transform"
              >
                <FiPhone size={18} />
              </a>
            </div>
        </div>
      </div>
    </div>
  );
};

export default UserCredential;