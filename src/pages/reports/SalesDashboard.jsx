import React, { useState, useEffect, useMemo } from 'react';
import { 
  BarChart, Bar, LineChart, Line, ComposedChart, ScatterChart, Scatter, ZAxis,
  XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, CartesianGrid, Legend 
} from 'recharts';
import { 
  FiDownload, FiTrendingUp, FiShoppingBag, FiDollarSign, 
  FiLoader, FiPieChart, FiActivity, FiTarget 
} from "react-icons/fi";
import * as XLSX from "xlsx";
import api from "../../api/apiClient"; 
import { useAuth } from "../../context/AuthContext";

const COLORS = ['#87be00', '#2563eb', '#9333ea', '#ea580c', '#eab308'];
const formatNumberCL = (val) => new Intl.NumberFormat('es-CL').format(val);

// --- COMPONENTES DE GRÁFICOS MODULARES ---

const SimpleBarChart = ({ title, data, dataKey }) => (
  <div className="bg-white p-4 md:p-6 rounded-[1.5rem] md:rounded-[2rem] shadow-sm border border-gray-100 flex flex-col h-[300px] md:h-[350px]">
    <h4 className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-4">{title}</h4>
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
        <XAxis dataKey="label" fontSize={8} tickLine={false} axisLine={false} />
        <YAxis fontSize={8} tickLine={false} axisLine={false} tickFormatter={(val) => `$${formatNumberCL(val)}`} />
        <Tooltip cursor={{fill: '#f3f4f6'}} formatter={(value) => [`$${formatNumberCL(value)}`, 'Ventas']} contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
        <Bar dataKey={dataKey} radius={[4, 4, 0, 0]} maxBarSize={40}>
          {data?.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  </div>
);

const EvolutionLineChart = ({ title, data }) => (
  <div className="bg-white p-4 md:p-6 rounded-[1.5rem] md:rounded-[2rem] shadow-sm border border-gray-100 flex flex-col h-[350px] md:h-[400px]">
    <h4 className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-4">{title}</h4>
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
        <XAxis dataKey="mes" fontSize={8} tickLine={false} axisLine={false} />
        <YAxis fontSize={8} tickLine={false} axisLine={false} tickFormatter={(val) => `$${formatNumberCL(val)}`} />
        <Tooltip formatter={(value, name) => [`$${formatNumberCL(value)}`, name]} contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
        <Legend wrapperStyle={{ fontSize: '9px', marginTop: '10px' }} />
        <Line type="monotone" dataKey="total_ventas" name="Venta Neta" stroke="#87be00" strokeWidth={3} dot={{ r: 3 }} activeDot={{ r: 5 }} />
        <Line type="monotone" dataKey="precio_promedio" name="Precio Promedio" stroke="#2563eb" strokeWidth={3} dot={{ r: 3 }} activeDot={{ r: 5 }} />
      </LineChart>
    </ResponsiveContainer>
  </div>
);

const InventoryCoverageChart = ({ title, data }) => (
  <div className="bg-white p-4 md:p-6 rounded-[1.5rem] md:rounded-[2rem] shadow-sm border border-gray-100 flex flex-col h-[350px] md:h-[400px]">
    <h4 className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-4">{title}</h4>
    <ResponsiveContainer width="100%" height="100%">
      <ComposedChart data={data} margin={{ top: 10, right: -10, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
        <XAxis dataKey="mes" fontSize={8} tickLine={false} axisLine={false} />
        <YAxis yAxisId="left" fontSize={8} tickLine={false} axisLine={false} tickFormatter={(val) => formatNumberCL(val)} />
        <YAxis yAxisId="right" orientation="right" fontSize={8} tickLine={false} axisLine={false} tickFormatter={(val) => `${val}%`} />
        <Tooltip formatter={(value, name) => name === '% Quiebres' ? [`${value}%`, name] : [formatNumberCL(value), name]} contentStyle={{ borderRadius: '1rem', border: 'none' }} />
        <Legend wrapperStyle={{ fontSize: '9px' }} />
        <Bar yAxisId="left" dataKey="inventario" name="Inventario (Unds)" fill="#d4edaa" radius={[4, 4, 0, 0]} maxBarSize={50} />
        <Line yAxisId="right" type="monotone" dataKey="quiebres" name="% Quiebres" stroke="#ef4444" strokeWidth={3} dot={{ r: 3 }} />
      </ComposedChart>
    </ResponsiveContainer>
  </div>
);

const PricePointScatterChart = ({ title, data }) => (
  <div className="bg-white p-4 md:p-6 rounded-[1.5rem] md:rounded-[2rem] shadow-sm border border-gray-100 flex flex-col h-[350px] md:h-[400px]">
    <h4 className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-4">{title}</h4>
    <ResponsiveContainer width="100%" height="100%">
      <ScatterChart margin={{ top: 10, right: 10, left: -10, bottom: 10 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
        <XAxis type="number" dataKey="volumen" name="Volumen (Kgs)" fontSize={8} tickLine={false} axisLine={false} tickFormatter={(val) => formatNumberCL(val)} />
        <YAxis type="number" dataKey="precio" name="Precio Público" fontSize={8} tickLine={false} axisLine={false} tickFormatter={(val) => `$${formatNumberCL(val)}`} />
        <ZAxis type="category" dataKey="producto" name="Producto" />
        <Tooltip cursor={{ strokeDasharray: '3 3' }} formatter={(value, name) => name === 'Precio Público' ? `$${formatNumberCL(value)}` : formatNumberCL(value)} contentStyle={{ borderRadius: '1rem', border: 'none' }} />
        <Scatter name="Puntos de Precio" data={data} fill="#87be00" />
      </ScatterChart>
    </ResponsiveContainer>
  </div>
);

// --- DASHBOARD PRINCIPAL ---

const SalesDashboard = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('general');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [availableBrands, setAvailableBrands] = useState(['Todas']);
  const [filters, setFilters] = useState({
    empresa_id: user?.company_id || "",
    fecha_carga: new Date().toISOString().split('T')[0], 
    marca: 'Todas' 
  });

  useEffect(() => {
    const fetchBrands = async () => {
      try {
        const response = await api.get("/reports/brands", { params: { company_id: filters.empresa_id, _: Date.now() } });
        const marcas = response.data || response;
        if (Array.isArray(marcas)) setAvailableBrands(['Todas', ...marcas]);
      } catch (err) { console.error(err); }
    };
    if (filters.empresa_id) fetchBrands();
  }, [filters.empresa_id]);

  useEffect(() => {
    const fetchData = async () => {
      if (!filters.empresa_id && user?.role !== 'ROOT') return;
      try {
        setLoading(true);
        const response = await api.get("/reports/sales-summary", {
          params: { company_id: filters.empresa_id, fecha_carga: filters.fecha_carga, marca: filters.marca === 'Todas' ? undefined : filters.marca }
        });
        setData(response?.data || response);
      } catch (error) { console.error(error); } finally { setLoading(false); }
    };
    fetchData();
  }, [filters.fecha_carga, filters.empresa_id, filters.marca, user?.role]);

  const handleExportExcel = () => {
    if (!data) return;
    const wb = XLSX.utils.book_new();
    if (data.byLocal?.length) XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data.byLocal), "Por Local");
    if (data.byProduct?.length) XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data.byProduct), "Por Producto");
    if (data.byChain?.length) XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data.byChain), "Por Cadena");
    if (data.byOperator?.length) XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data.byOperator), "Por Operario");
    if (data.evolution?.length) XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data.evolution), "Evolución");
    if (data.coverage?.length) XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data.coverage), "Cobertura");
    if (data.scatter?.length) XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data.scatter), "Puntos de Precio");
    if (data.stock?.length) XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data.stock), "Stock");
    XLSX.writeFile(wb, `Reporte_Ventas_${filters.fecha_carga}.xlsx`);
  };

  const totalVenta = useMemo(() => data?.byLocal?.reduce((acc, curr) => acc + Number(curr.total || 0), 0) || 0, [data]);
  const formatoMoneda = (valor) => new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(valor);

  return (
    <div className="w-full h-full flex flex-col font-[Outfit] bg-gray-50/30">
      
      {/* HEADER INTEGRADO (Ajustado para Menú Hamburguesa) */}
      {/* 🔴 pl-[76px] en móvil deja un espacio exacto a la izquierda para el botón del Sidebar */}
      <div className="bg-white border-b border-gray-100 pl-[76px] pr-4 py-5 md:px-8 md:py-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shrink-0 min-h-[80px]">
        <div className="flex flex-col justify-center">
          <h2 className="text-xl md:text-2xl font-black text-gray-900 uppercase italic tracking-tighter leading-none">
            Dashboard Analítico
          </h2>
          <p className="text-[9px] md:text-[10px] font-black text-[#87be00] uppercase tracking-widest mt-1.5">
            Análisis de ventas y cobertura
          </p>
        </div>
        <button 
          onClick={handleExportExcel}
          disabled={loading || !data}
          className="w-full md:w-auto mt-2 md:mt-0 justify-center bg-gray-900 hover:bg-black text-white px-6 py-3 rounded-xl md:rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all disabled:opacity-50"
        >
          <FiDownload size={16} /> Exportar
        </button>
      </div>

      {/* CONTENIDO PRINCIPAL */}
      <div className="p-4 md:p-8 flex-1 overflow-y-auto">
        
        {/* Filtros */}
        <div className="bg-white p-4 md:p-6 rounded-[1.5rem] md:rounded-[2rem] shadow-sm border border-gray-100 flex flex-col gap-4 mb-6 md:mb-8">
           <div className="flex flex-col md:flex-row gap-4">
              <input 
                type="date" 
                className="px-4 py-3 bg-gray-50 rounded-xl text-[10px] font-black outline-none w-full md:w-48 uppercase border border-gray-100 focus:border-[#87be00] transition-colors" 
                value={filters.fecha_carga} 
                onChange={(e) => setFilters({...filters, fecha_carga: e.target.value})}
              />
              <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0 custom-scrollbar flex-1 items-center">
                {availableBrands.map(brand => (
                  <button key={brand} onClick={() => setFilters({...filters, marca: brand})} className={`px-4 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all border shrink-0 ${filters.marca === brand ? 'bg-[#87be00] text-white border-[#87be00] shadow-md shadow-[#87be00]/20' : 'bg-gray-50 text-gray-400 border-transparent hover:bg-gray-100'}`}>
                    {brand}
                  </button>
                ))}
              </div>
           </div>
        </div>

        {/* TABS */}
        <div className="flex gap-2 overflow-x-auto pb-4 md:pb-6 custom-scrollbar -mx-4 px-4 md:mx-0 md:px-0">
          {[
            { id: 'general',   icon: FiPieChart,   label: 'Resumen General' },
            { id: 'evolution', icon: FiActivity,   label: 'Evolución Precios' },
            { id: 'coverage',  icon: FiTrendingUp, label: 'Cobertura e Inventario' },
            { id: 'scatter',   icon: FiTarget,     label: 'Puntos de Precio' },
          ].map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex items-center gap-2 px-5 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all shrink-0 ${activeTab === tab.id ? 'bg-[#87be00] text-white shadow-md shadow-[#87be00]/20' : 'bg-white text-gray-400 border border-gray-100 hover:bg-gray-50'}`}>
              <tab.icon size={14} /> {tab.label}
            </button>
          ))}
        </div>

        {/* CONTENIDO DINÁMICO */}
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-4">
            <FiLoader className="animate-spin text-[#87be00]" size={32} />
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Cargando métricas...</p>
          </div>
        ) : (
          <div className="mt-2 md:mt-4">
            {activeTab === 'general' && (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 mb-6 md:mb-8">
                  <div className="bg-white p-5 md:p-6 rounded-[1.5rem] md:rounded-[2rem] shadow-sm border border-gray-100 flex items-center gap-4">
                    <div className="w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-[#87be00]/10 text-[#87be00] flex items-center justify-center shrink-0"><FiDollarSign size={20} className="md:w-6 md:h-6" /></div>
                    <div className="min-w-0">
                      <p className="text-[9px] md:text-[10px] font-bold text-gray-400 uppercase tracking-widest">Venta Neta</p>
                      <h4 className="text-lg md:text-xl font-black truncate">{formatoMoneda(totalVenta)}</h4>
                    </div>
                  </div>
                  
                  <div className="bg-white p-5 md:p-6 rounded-[1.5rem] md:rounded-[2rem] shadow-sm border border-gray-100 flex items-center gap-4">
                    <div className="w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-blue-50 text-blue-500 flex items-center justify-center shrink-0"><FiTrendingUp size={20} className="md:w-6 md:h-6" /></div>
                    <div className="min-w-0">
                      <p className="text-[9px] md:text-[10px] font-bold text-gray-400 uppercase tracking-widest">Locales</p>
                      <h4 className="text-lg md:text-xl font-black truncate">{data?.byLocal?.length || 0}</h4>
                    </div>
                  </div>
                  
                  <div className="bg-white p-5 md:p-6 rounded-[1.5rem] md:rounded-[2rem] shadow-sm border border-gray-100 flex items-center gap-4 sm:col-span-2 lg:col-span-1">
                    <div className="w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-purple-50 text-purple-500 flex items-center justify-center shrink-0"><FiShoppingBag size={20} className="md:w-6 md:h-6" /></div>
                    <div className="min-w-0">
                      <p className="text-[9px] md:text-[10px] font-bold text-gray-400 uppercase tracking-widest">Top Producto</p>
                      <h4 className="text-xs md:text-sm font-black truncate pr-2">{data?.byProduct?.[0]?.label || 'N/A'}</h4>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 md:gap-6">
                  <SimpleBarChart title="Ventas por Local" data={data?.byLocal} dataKey="total" />
                  <SimpleBarChart title="Ventas por Producto" data={data?.byProduct} dataKey="total" />
                  <SimpleBarChart title="Ventas por Cadena" data={data?.byChain} dataKey="total" />
                  <SimpleBarChart title="Ventas por Operario" data={data?.byOperator} dataKey="total" />
                </div>
              </>
            )}
            
            {activeTab === 'evolution' && data?.evolution && <EvolutionLineChart title="Evolución" data={data.evolution} />}
            {activeTab === 'coverage' && data?.coverage && <InventoryCoverageChart title="Cobertura" data={data.coverage} />}
            {activeTab === 'scatter' && data?.scatter && <PricePointScatterChart title="Puntos de Precio" data={data.scatter} />}
          </div>
        )}
      </div>
    </div>
  );
};

export default SalesDashboard;