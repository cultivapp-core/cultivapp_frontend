import React, { useState, useEffect } from "react";
import {
  FiDollarSign, FiActivity, FiAlertTriangle, FiUsers,
  FiLoader, FiTrendingUp, FiLayout, FiFilter, FiBarChart2, FiBox, FiPackage
} from "react-icons/fi";
import api from "../../api/apiClient";
import toast from "react-hot-toast";

// ─── Helpers de formato ──────────────────────────────────────────────────────
const formatMoney = (value) => {
  const num = parseFloat(value);
  if (isNaN(num)) return "—";
  return num.toLocaleString("es-CL", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
};

const formatInt = (value) => {
  const num = parseInt(value, 10);
  if (isNaN(num)) return "—";
  return num.toLocaleString("es-CL");
};

const formatPercent = (value) => {
  const num = parseFloat(value);
  if (isNaN(num)) return "—";
  return `${num.toLocaleString("es-CL", { maximumFractionDigits: 1 })}%`;
};

const extractData = (response) => {
  if (response?.data?.data && typeof response.data.data === "object") return response.data.data;
  if (response?.data?.monthlySales !== undefined) return response.data;
  if (response?.monthlySales !== undefined) return response;
  return null;
};

// ─── Componentes internos ────────────────────────────────────────────────────
const StatCard = ({ title, value, subtitle, icon, iconBg, iconColor }) => (
  <div className="bg-white p-6 lg:p-8 rounded-[2rem] shadow-sm border border-gray-100 flex items-center gap-5 hover:shadow-md transition-all duration-300">
    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 ${iconBg} ${iconColor}`}>
      {React.cloneElement(icon, { size: 24 })}
    </div>
    <div className="flex flex-col justify-center">
      <p className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em] mb-1">{title}</p>
      <div className="flex items-baseline gap-2">
        <h3 className="text-3xl lg:text-4xl font-black text-gray-900 tracking-tighter italic leading-none">{value}</h3>
        {subtitle && <span className="text-[10px] font-bold text-gray-400 uppercase">{subtitle}</span>}
      </div>
    </div>
  </div>
);

const ChainRow = ({ chain }) => {
  const barColor = chain.compliance >= 90 ? "bg-[#87be00]" : chain.compliance >= 80 ? "bg-orange-400" : "bg-red-500";
  return (
    <div className="flex flex-col gap-2">
      <div className="flex justify-between items-end">
        <h4 className="text-[11px] font-black text-gray-900 uppercase tracking-wide truncate max-w-[65%]">{chain.name}</h4>
        <span className="text-[10px] font-bold text-gray-500 shrink-0">{chain.sales}</span>
      </div>
      <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-1000 ${barColor}`} style={{ width: `${Math.min(Math.max(chain.compliance, 0), 100)}%` }} />
      </div>
      <div className="text-[8px] font-black text-gray-400 uppercase tracking-widest text-right">Cobertura {formatPercent(chain.compliance)}</div>
    </div>
  );
};

// ─── Módulo de Inventario ───────────────────────────────────────────────────
const InventoryModule = () => (
  <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 animate-in fade-in duration-500">
    <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100">
      <h3 className="text-[11px] font-black text-gray-900 uppercase tracking-widest mb-4">Estado de Inventario</h3>
      <p className="text-xs text-gray-400">Modulo de control de stock activo. Configura alertas de reposición aquí.</p>
    </div>
    <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100">
      <h3 className="text-[11px] font-black text-gray-900 uppercase tracking-widest mb-4">Alertas de Quiebre</h3>
    </div>
  </div>
);

// ─── Componente principal ────────────────────────────────────────────────────
const ViewerDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState("executive");
  const [stats, setStats] = useState({ monthlySales: 0, coverage: 0, stockouts: 0, activeStaff: 0, topChains: [] });

  useEffect(() => {
    let cancelled = false;
    const fetchExecutiveData = async () => {
      try {
        setLoading(true);
        const response = await api.get("/viewer/dashboard-stats");
        const raw = extractData(response);
        if (raw && !cancelled) {
          setStats({
            monthlySales: raw.monthlySales ?? 0,
            coverage:     raw.coverage     ?? 0,
            stockouts:    raw.stockouts    ?? 0,
            activeStaff:  raw.activeStaff  ?? 0,
            topChains:    Array.isArray(raw.topChains) ? raw.topChains : [],
          });
        }
      } catch (err) {
        if (!cancelled) toast.error("Error al sincronizar");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchExecutiveData();
    return () => { cancelled = true; };
  }, []);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <FiLoader className="animate-spin text-[#87be00]" size={40} />
          <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest animate-pulse">Sincronizando...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500 font-[Outfit]">

      {/* BARRA DE CONTEXTO Y TABS ESTILO BOTÓN */}
      <div className="bg-white p-6 lg:px-8 lg:py-6 rounded-[2rem] shadow-sm border border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4 sticky top-4 z-10">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-[#87be00]/10 text-[#87be00] flex items-center justify-center">
            <FiLayout size={20} />
          </div>
          <div>
            <h2 className="text-sm font-black text-gray-900 uppercase tracking-tighter">Reporte Consolidado</h2>
            
            {/* NUEVA BARRA DE BOTONES (TABS) */}
            <div className="flex gap-2 bg-gray-50 p-1 rounded-2xl border border-gray-100 mt-2 w-fit">
              <button 
                onClick={() => setActiveView('executive')} 
                className={`px-5 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${
                  activeView === 'executive' 
                    ? 'bg-white text-[#87be00] shadow-sm' 
                    : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                Vista Comercial
              </button>
              <button 
                onClick={() => setActiveView('inventory')} 
                className={`px-5 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${
                  activeView === 'inventory' 
                    ? 'bg-white text-[#87be00] shadow-sm' 
                    : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                Vista Inventario
              </button>
            </div>

          </div>
        </div>
      </div>

      {activeView === 'executive' ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
            <StatCard title="Sell-Out Mensual" value={`$${formatMoney(stats.monthlySales)}`} subtitle="Millones" icon={<FiDollarSign />} iconBg="bg-[#87be00]/10" iconColor="text-[#87be00]" />
            <StatCard title="Cobertura Rutas" value={formatPercent(stats.coverage)} icon={<FiActivity />} iconBg="bg-blue-50" iconColor="text-blue-500" />
            <StatCard title="Quiebres Detectados" value={formatInt(stats.stockouts)} subtitle="Alertas" icon={<FiAlertTriangle />} iconBg="bg-red-50" iconColor="text-red-500" />
            <StatCard title="Fuerza en Terreno" value={formatInt(stats.activeStaff)} subtitle="Mercaderistas" icon={<FiUsers />} iconBg="bg-purple-50" iconColor="text-purple-500" />
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <div className="xl:col-span-2 bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100 flex flex-col min-h-[420px]">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h2 className="text-[11px] font-black text-gray-900 uppercase tracking-widest">Actividad Operativa</h2>
                  <p className="text-[9px] font-bold text-gray-400 uppercase mt-1">Tendencia Mensual</p>
                </div>
                <FiBarChart2 className="text-gray-300" size={20} />
              </div>
              <div className="flex-1 flex items-end justify-between gap-3 border-b-2 border-gray-50 pb-4 mt-8">
                {[65, 45, 80, 55, 90, 75, 100].map((height, i) => (
                  <div key={i} className="w-full relative flex flex-col items-center justify-end h-full group z-10">
                    <div className="w-full max-w-[40px] bg-[#87be00] rounded-t-xl transition-all duration-500 group-hover:bg-[#76a600] shadow-[0_4px_15px_rgba(135,190,0,0.2)]" style={{ height: `${height}%` }} />
                  </div>
                ))}
              </div>
              <div className="flex justify-between mt-4 text-[9px] font-black text-gray-400 uppercase tracking-[0.2em] px-2">
                <span>Sem 1</span><span>Sem 2</span><span>Sem 3</span><span>Sem 4</span><span>Sem 5</span><span>Sem 6</span><span>Actual</span>
              </div>
            </div>

            <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100 flex flex-col min-h-[420px]">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-[11px] font-black text-gray-900 uppercase tracking-widest">Top Cadenas</h2>
                <FiTrendingUp className="text-gray-300" size={18} />
              </div>
              <div className="flex-1 flex flex-col gap-6 overflow-y-auto custom-scrollbar pr-2">
                {stats.topChains.length > 0 ? stats.topChains.map((chain) => <ChainRow key={chain.name} chain={chain} />) : <p className="text-[10px] font-bold text-gray-400 text-center mt-10">Sin datos</p>}
              </div>
            </div>
          </div>
        </>
      ) : (
        <InventoryModule />
      )}
    </div>
  );
};

export default ViewerDashboard;