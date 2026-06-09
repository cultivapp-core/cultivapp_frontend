import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { 
  FiPieChart, FiTrendingUp, FiDownload, FiCalendar, FiFilter, 
  FiMapPin, FiCamera, FiPackage, FiCheckCircle, FiAlertTriangle 
} from "react-icons/fi";
import api from "../../api/apiClient";
import { useAuth } from "../../context/AuthContext";

const getLocalISODate = () => {
  const tzOffset = (new Date()).getTimezoneOffset() * 60000;
  return new Date(Date.now() - tzOffset).toISOString().split('T')[0];
};

// Función helper para construir la URL real de la imagen (basada en tu PhotoValidation)
const getImageUrl = (path) => {
  if (!path) return "https://via.placeholder.com/400x300?text=Sin+Imagen";
  if (path.startsWith('http')) return path;
  
  const baseUrl = import.meta.env.VITE_API_URL?.split('/api')[0] || "";
  let cleanPath = path.trim().replace(/\\/g, "/").replace(/^uploads\//i, '');
  return `${baseUrl}/uploads/${cleanPath}`;
};

const KamExecutiveDashboard = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  
  const [dateRange, setDateRange] = useState({
    start: getLocalISODate(),
    end: getLocalISODate()
  });

  const [kpis, setKpis] = useState({ coverage: 0, executionTime: 0, totalEans: 0, photos: 0 });
  const [chainPerformance, setChainPerformance] = useState([]);
  const [recentPhotos, setRecentPhotos] = useState([]);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const params = { 
        start_date: dateRange.start, 
        end_date: dateRange.end,
        company_id: user?.company_id || undefined
      };

      // 1. Ejecutamos todas las consultas en paralelo para mayor velocidad
      const [kpiRes, chainRes, photoRes] = await Promise.all([
        api.get("/reports/kam/kpis", { params }),
        api.get("/reports/kam/chains", { params }),
        api.get("/reports/photos", { params: { ...params, limit: 5 } }) // Reutilizamos tu endpoint de fotos
      ]);

      // 2. Mapeo de KPIs (Asegúrate de que tu backend envíe estas llaves)
      const kpiData = kpiRes?.data || kpiRes || {};
      setKpis({ 
        coverage: kpiData.coverage || 0, 
        executionTime: kpiData.executionTime || 0, 
        totalEans: kpiData.totalEans || 0, 
        photos: kpiData.photos || 0 
      });

      // 3. Mapeo de Cadenas
      const chainData = chainRes?.data || chainRes || [];
      setChainPerformance(chainData);

      // 4. Mapeo de Fotos (Adaptamos la respuesta de tu endpoint actual)
      const photoData = photoRes?.data || photoRes || [];
      const mappedPhotos = photoData.slice(0, 5).map(p => ({
        id: p.id,
        url: getImageUrl(p.photo_url || p.image_url),
        chain: p.cadena || "Sin Cadena",
        type: p.photo_type || p.evidence_type || "Evidencia"
      }));
      setRecentPhotos(mappedPhotos);

    } catch (error) {
      console.error("Error cargando Dashboard KAM:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [dateRange]);

  const handleExport = () => {
    console.log("Descargando reporte KAM...");
    // Aquí puedes integrar la lógica de Excel (ej: usando xlsx o un endpoint de descarga directo)
  };

  const getComplianceColor = (percent) => {
    if (percent >= 90) return "bg-[#87be00]";
    if (percent >= 75) return "bg-amber-400";
    return "bg-red-500";
  };

  return (
    <div className="space-y-8 font-[Outfit] pb-10">
      
      {/* HEADER ESTRATÉGICO */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-6 px-4 md:px-0">
        <div>
          <h2 className="text-3xl md:text-5xl font-black text-gray-900 uppercase italic tracking-tighter leading-none">
            Visión <span className="text-[#87be00]">Ejecutiva</span>
          </h2>
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] mt-3">
            Resumen Comercial • {user?.company_name || 'Global'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
          <div className="flex items-center bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
            <div className="px-4 py-4 bg-gray-50 text-gray-400 border-r border-gray-100"><FiCalendar size={16} /></div>
            <input type="date" value={dateRange.start} onChange={(e) => setDateRange({...dateRange, start: e.target.value})} className="px-4 py-4 text-[10px] font-black uppercase outline-none bg-white" />
            <span className="text-gray-300 font-bold bg-white px-1">-</span>
            <input type="date" value={dateRange.end} onChange={(e) => setDateRange({...dateRange, end: e.target.value})} className="px-4 py-4 text-[10px] font-black uppercase outline-none bg-white" />
          </div>

          <button onClick={handleExport} className="flex-1 lg:flex-none flex items-center justify-center gap-2 bg-gray-900 hover:bg-black text-[#87be00] px-6 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all shadow-xl">
            <FiDownload size={16} /> Exportar Excel
          </button>
        </div>
      </div>

      {loading ? (
        <div className="py-20 text-center text-[10px] font-black uppercase italic animate-pulse text-gray-400">
          Consolidando métricas comerciales...
        </div>
      ) : (
        <>
          {/* KPIs GLOBALES */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 px-4 md:px-0">
            <KpiCard title="Cobertura de Visitas" value={`${kpis.coverage}%`} subtitle="Vs plan de ruta" icon={FiMapPin} color="text-blue-500" />
            <KpiCard title="Promedio Ejecución" value={`${kpis.executionTime}m`} subtitle="Tiempo en local" icon={FiPieChart} color="text-[#87be00]" />
            <KpiCard title="EANs Gestionados" value={Number(kpis.totalEans).toLocaleString('es-CL')} subtitle="Volumen total" icon={FiPackage} color="text-purple-500" />
            <KpiCard title="Evidencias Visuales" value={kpis.photos} subtitle="Fotos aprobadas" icon={FiCamera} color="text-amber-500" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 px-4 md:px-0">
            
            {/* TABLA DE RENDIMIENTO POR CADENA */}
            <div className="lg:col-span-8 bg-white rounded-[2.5rem] shadow-xl shadow-gray-100/50 border border-gray-50 overflow-hidden flex flex-col">
              <div className="p-6 md:p-8 border-b border-gray-50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-gray-50/30">
                <h3 className="text-xl font-black text-gray-800 uppercase italic tracking-tighter">Cumplimiento por Cadena</h3>
                <div className="flex gap-2">
                  <span className="flex items-center gap-1 text-[9px] font-black text-gray-400 uppercase tracking-widest"><div className="w-2 h-2 rounded-full bg-[#87be00]"></div> Óptimo</span>
                  <span className="flex items-center gap-1 text-[9px] font-black text-gray-400 uppercase tracking-widest ml-2"><div className="w-2 h-2 rounded-full bg-amber-400"></div> Alerta</span>
                  <span className="flex items-center gap-1 text-[9px] font-black text-gray-400 uppercase tracking-widest ml-2"><div className="w-2 h-2 rounded-full bg-red-500"></div> Riesgo</span>
                </div>
              </div>
              
              <div className="overflow-x-auto p-4">
                <table className="w-full text-left min-w-[500px]">
                  <thead>
                    <tr>
                      <th className="px-6 py-4 text-[10px] font-black uppercase text-gray-400 tracking-[0.2em]">Cadena</th>
                      <th className="px-6 py-4 text-[10px] font-black uppercase text-gray-400 tracking-[0.2em] text-center">Visitas (Real / Plan)</th>
                      <th className="px-6 py-4 text-[10px] font-black uppercase text-gray-400 tracking-[0.2em] w-[40%]">Cumplimiento</th>
                      <th className="px-6 py-4 text-[10px] font-black uppercase text-gray-400 tracking-[0.2em] text-right">T. Promedio</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {chainPerformance.length === 0 ? (
                      <tr>
                        <td colSpan="4" className="text-center py-10 text-[10px] font-black text-gray-400 uppercase tracking-widest">Sin datos para este periodo</td>
                      </tr>
                    ) : (
                      chainPerformance.map((chain, idx) => (
                        <motion.tr initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.1 }} key={chain.id || idx} className="hover:bg-gray-50/50 transition-colors">
                          <td className="px-6 py-5">
                            <p className="text-[12px] font-black text-gray-900 uppercase italic leading-none">{chain.chain}</p>
                          </td>
                          <td className="px-6 py-5 text-center">
                            <span className="text-[11px] font-black text-gray-800">{chain.visitsDone || 0}</span>
                            <span className="text-[9px] font-bold text-gray-400 mx-1">/</span>
                            <span className="text-[10px] font-black text-gray-400">{chain.visitsPlanned || 0}</span>
                          </td>
                          <td className="px-6 py-5">
                            <div className="flex items-center gap-3">
                              <span className={`text-[10px] font-black w-8 ${getComplianceColor(chain.compliance || 0).replace('bg-', 'text-')}`}>
                                {chain.compliance || 0}%
                              </span>
                              <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                                <motion.div 
                                  initial={{ width: 0 }} 
                                  animate={{ width: `${chain.compliance || 0}%` }} 
                                  transition={{ duration: 1, ease: "easeOut" }}
                                  className={`h-full rounded-full ${getComplianceColor(chain.compliance || 0)}`} 
                                />
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-5 text-right">
                            <span className="px-3 py-1.5 bg-gray-50 rounded-lg text-[10px] font-black text-gray-600 border border-gray-100">
                              {chain.avgTime || "0m"}
                            </span>
                          </td>
                        </motion.tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* FEED DE EVIDENCIAS RECIENTES */}
            <div className="lg:col-span-4 bg-gray-900 rounded-[2.5rem] shadow-xl overflow-hidden flex flex-col p-8">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-black text-white uppercase italic tracking-tighter">Últimas Evidencias</h3>
              </div>
              
              <div className="space-y-4 flex-1 overflow-y-auto pr-2 custom-scrollbar">
                {recentPhotos.length === 0 ? (
                  <p className="text-center py-10 text-[10px] font-black text-gray-500 uppercase tracking-widest">Sin evidencias</p>
                ) : (
                  recentPhotos.map((photo, i) => (
                    <div key={photo.id || i} className="relative h-32 rounded-2xl overflow-hidden group">
                      <img 
                        src={photo.url} 
                        alt="Evidencia" 
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 opacity-80 group-hover:opacity-100 bg-gray-800" 
                        onError={(e) => { e.target.src = "https://via.placeholder.com/400x300?text=No+Encontrada"; }}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent"></div>
                      <div className="absolute bottom-3 left-3">
                        <p className="text-[11px] font-black text-white uppercase italic leading-tight">{photo.chain}</p>
                        <p className="text-[8px] font-black text-[#87be00] uppercase tracking-widest">{photo.type}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

          </div>
        </>
      )}
    </div>
  );
};

const KpiCard = ({ title, value, subtitle, icon: Icon, color }) => (
  <motion.div whileHover={{ y: -5 }} className="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-50 relative overflow-hidden group">
    <div className={`absolute top-0 right-0 p-6 opacity-[0.03] group-hover:opacity-10 transition-opacity ${color}`}>
      <Icon size={80} />
    </div>
    <div className={`w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center mb-4 ${color}`}>
      <Icon size={18} />
    </div>
    <p className="text-3xl font-black text-gray-900 tracking-tighter italic leading-none">{value}</p>
    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-2">{title}</p>
    <p className="text-[8px] font-bold text-gray-300 uppercase mt-1">{subtitle}</p>
  </motion.div>
);

export default KamExecutiveDashboard;