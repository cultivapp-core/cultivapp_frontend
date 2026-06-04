import React, { useState, useEffect, useMemo } from 'react';
import { 
  BarChart, Bar, LineChart, Line, ComposedChart, ScatterChart, Scatter, ZAxis,
  XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, CartesianGrid, Legend 
} from 'recharts';
import { 
  FiDownload, FiTrendingUp, FiShoppingBag, FiDollarSign, 
  FiCalendar, FiLoader, FiPieChart, FiActivity, FiTarget, FiFilter 
} from "react-icons/fi";
import * as XLSX from "xlsx";
import api from "../../api/apiClient"; 
import { useAuth } from "../../context/AuthContext";

const COLORS = ['#87be00', '#2563eb', '#9333ea', '#ea580c', '#eab308'];

// --- UTILIDAD DE FORMATO PARA RECHARTS ---
const formatNumberCL = (val) => new Intl.NumberFormat('es-CL').format(val);

// --- COMPONENTES DE GRÁFICOS MODULARES ---

const SimpleBarChart = ({ title, data, dataKey }) => (
  <div className="bg-white p-6 rounded-[1.5rem] shadow-sm border border-gray-50 flex flex-col h-[350px]">
    <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">{title}</h4>
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
        <XAxis dataKey="label" fontSize={9} tickLine={false} axisLine={false} />
        <YAxis 
          fontSize={9} 
          tickLine={false} 
          axisLine={false} 
          tickFormatter={(val) => `$${formatNumberCL(val)}`} 
        />
        <Tooltip 
          cursor={{fill: '#f3f4f6'}} 
          formatter={(value) => [`$${formatNumberCL(value)}`, 'Ventas']}
          contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} 
        />
        <Bar dataKey={dataKey} radius={[4, 4, 0, 0]} maxBarSize={40}>
          {data?.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  </div>
);

const EvolutionLineChart = ({ title, data }) => (
  <div className="bg-white p-6 rounded-[1.5rem] shadow-sm border border-gray-50 flex flex-col h-[400px]">
    <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">{title}</h4>
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
        <XAxis dataKey="mes" fontSize={9} tickLine={false} axisLine={false} />
        <YAxis 
          fontSize={9} 
          tickLine={false} 
          axisLine={false} 
          tickFormatter={(val) => `$${formatNumberCL(val)}`} 
        />
        <Tooltip 
          formatter={(value, name) => [`$${formatNumberCL(value)}`, name]}
          contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} 
        />
        <Legend wrapperStyle={{ fontSize: '10px', marginTop: '10px' }} />
        <Line type="monotone" dataKey="total_ventas" name="Venta Neta" stroke="#87be00" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
        <Line type="monotone" dataKey="precio_promedio" name="Precio Promedio" stroke="#2563eb" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
      </LineChart>
    </ResponsiveContainer>
  </div>
);

const InventoryCoverageChart = ({ title, data }) => (
  <div className="bg-white p-6 rounded-[1.5rem] shadow-sm border border-gray-50 flex flex-col h-[400px]">
    <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">{title}</h4>
    <ResponsiveContainer width="100%" height="100%">
      <ComposedChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
        <XAxis dataKey="mes" fontSize={9} tickLine={false} axisLine={false} />
        <YAxis 
          yAxisId="left" 
          fontSize={9} 
          tickLine={false} 
          axisLine={false} 
          tickFormatter={(val) => formatNumberCL(val)} 
        />
        <YAxis 
          yAxisId="right" 
          orientation="right" 
          fontSize={9} 
          tickLine={false} 
          axisLine={false} 
          tickFormatter={(val) => `${val}%`} 
        />
        <Tooltip 
          formatter={(value, name) => name === '% Quiebres' ? [`${value}%`, name] : [formatNumberCL(value), name]}
          contentStyle={{ borderRadius: '1rem', border: 'none' }} 
        />
        <Legend wrapperStyle={{ fontSize: '10px' }} />
        <Bar yAxisId="left" dataKey="inventario" name="Inventario (Unds)" fill="#d4edaa" radius={[4, 4, 0, 0]} maxBarSize={50} />
        <Line yAxisId="right" type="monotone" dataKey="quiebres" name="% Quiebres" stroke="#ef4444" strokeWidth={3} dot={{ r: 4 }} />
      </ComposedChart>
    </ResponsiveContainer>
  </div>
);

const PricePointScatterChart = ({ title, data }) => (
  <div className="bg-white p-6 rounded-[1.5rem] shadow-sm border border-gray-50 flex flex-col h-[400px]">
    <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">{title}</h4>
    <ResponsiveContainer width="100%" height="100%">
      <ScatterChart margin={{ top: 10, right: 20, left: 10, bottom: 10 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
        <XAxis 
          type="number" 
          dataKey="volumen" 
          name="Volumen (Kgs)" 
          fontSize={9} 
          tickLine={false} 
          axisLine={false} 
          tickFormatter={(val) => formatNumberCL(val)} 
        />
        <YAxis 
          type="number" 
          dataKey="precio" 
          name="Precio Público" 
          fontSize={9} 
          tickLine={false} 
          axisLine={false} 
          tickFormatter={(val) => `$${formatNumberCL(val)}`} 
        />
        <ZAxis type="category" dataKey="producto" name="Producto" />
        <Tooltip 
          cursor={{ strokeDasharray: '3 3' }} 
          formatter={(value, name) => name === 'Precio Público' ? `$${formatNumberCL(value)}` : formatNumberCL(value)}
          contentStyle={{ borderRadius: '1rem', border: 'none' }} 
        />
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
  
  // ✅ ESTADO DINÁMICO PARA LAS MARCAS
  const [availableBrands, setAvailableBrands] = useState(['Todas']);
  
  const [filters, setFilters] = useState({
    empresa_id: user?.company_id || "",
    fecha_carga: new Date().toISOString().split('T')[0], 
    marca: 'Todas' 
  });

  // ✅ 1. OBTENER MARCAS REALES DESDE LA BASE DE DATOS
  useEffect(() => {
    const fetchBrands = async () => {
      try {
        // Añadimos un timestamp (_=${Date.now()}) para forzar al navegador a ignorar el caché (evitar el 304)
        const response = await api.get("/reports/brands", { 
          params: { 
            company_id: filters.empresa_id,
            _: Date.now() 
          }
        });

        console.log("--- RESPUESTA COMPLETA DEL SERVIDOR ---");
        console.log("Objeto response:", response);
        console.log("response.data:", response.data);

        // A veces, dependiendo de cómo esté configurado tu apiClient,
        // los datos pueden estar directamente en 'response' o en 'response.data'
        const marcas = response.data || response; 

        if (Array.isArray(marcas)) {
          console.log("Marcas identificadas como array:", marcas);
          setAvailableBrands(['Todas', ...marcas]);
        } else if (marcas && typeof marcas === 'object') {
          // Si el servidor envía un objeto { marcas: [...] } en lugar de un array directo
          console.warn("La respuesta es un objeto, revisa si necesitas acceder a una propiedad específica");
        }
      } catch (err) { 
        console.error("Error completo:", err); 
      }
    };
    
    if (filters.empresa_id) {
        fetchBrands();
    }
  }, [filters.empresa_id]);

  // 2. OBTENER DATOS PRINCIPALES
  useEffect(() => {
    const fetchData = async () => {
      if (!filters.empresa_id && user?.role !== 'ROOT') return;
      try {
        setLoading(true);
        const response = await api.get("/reports/sales-summary", {
          params: { 
            company_id: filters.empresa_id, 
            fecha_carga: filters.fecha_carga,
            marca: filters.marca === 'Todas' ? undefined : filters.marca 
          }
        });
        setData(response?.data || response);
      } catch (error) {
        console.error("Error fetching:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [filters.fecha_carga, filters.empresa_id, filters.marca, user?.role]);

  // --- EXPORTACIÓN ---
  const handleExportExcel = () => {
    if (!data) return;
    const wb = XLSX.utils.book_new();

    if (data.byLocal?.length)    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data.byLocal),    "Por Local");
    if (data.byProduct?.length)  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data.byProduct),  "Por Producto");
    if (data.byChain?.length)    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data.byChain),    "Por Cadena");
    if (data.byOperator?.length) XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data.byOperator), "Por Operario");
    if (data.evolution?.length)  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data.evolution),  "Evolución");
    if (data.coverage?.length)   XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data.coverage),   "Cobertura");
    if (data.scatter?.length)    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data.scatter),    "Puntos de Precio");
    if (data.stock?.length)      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data.stock),      "Stock");

    XLSX.writeFile(wb, `Reporte_Ventas_${filters.fecha_carga}.xlsx`);
  };

  const totalVenta = useMemo(() => {
    if (!data?.byLocal) return 0;
    return data.byLocal.reduce((acc, curr) => acc + Number(curr.total || 0), 0);
  }, [data]);

  const formatoMoneda = (valor) => {
    return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(valor);
  };

  return (
    <div className="space-y-6 md:space-y-8 font-[Outfit] pb-10 px-2 md:px-4">
      
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl md:text-2xl font-black text-gray-900 uppercase italic tracking-tighter leading-none">
            Dashboard Analítico
          </h2>
        </div>
        <button 
          onClick={handleExportExcel}
          disabled={loading || !data}
          className="bg-[#87be00] hover:bg-[#76a600] text-white px-6 py-3 rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest flex items-center gap-2 shadow-lg shadow-[#87be00]/20 disabled:opacity-50"
        >
          <FiDownload size={16} /> Exportar Excel
        </button>
      </div>

      {/* FILTROS PRINCIPALES Y DE MARCA (PÍLDORAS) */}
      <div className="bg-white p-4 md:p-6 rounded-[1.5rem] md:rounded-[2.5rem] shadow-sm border border-gray-50 flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative w-full sm:w-64 shrink-0">
            <FiCalendar className="absolute left-4 top-1/2 -translate-y-1/2 text-[#87be00]" />
            <input 
              type="date"
              className="w-full pl-12 pr-4 py-3 bg-gray-50 rounded-xl text-[10px] md:text-xs font-black outline-none focus:ring-2 focus:ring-[#87be00]/20 transition-all text-gray-700 uppercase"
              value={filters.fecha_carga}
              onChange={(e) => setFilters({...filters, fecha_carga: e.target.value})}
            />
          </div>
          
          {/* SELECTOR DE MARCAS TIPO PÍLDORA */}
          <div className="flex-1 overflow-hidden flex items-center">
            <div className="flex gap-2 overflow-x-auto pb-2 sm:pb-0 custom-scrollbar w-full items-center">
              <FiFilter className="text-gray-300 shrink-0 mr-1" size={16} />
              {availableBrands.map(brand => (
                <button
                  key={brand}
                  onClick={() => setFilters({...filters, marca: brand})}
                  className={`px-4 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all border shrink-0 ${
                    filters.marca === brand
                      ? 'bg-gray-900 text-[#87be00] border-gray-900 shadow-md scale-105'
                      : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50 hover:border-gray-300'
                  }`}
                >
                  {brand}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* TABS DE NAVEGACIÓN */}
      <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar">
        {[
          { id: 'general',   icon: FiPieChart,   label: 'Resumen General' },
          { id: 'evolution', icon: FiActivity,   label: 'Evolución Precios' },
          { id: 'coverage',  icon: FiTrendingUp, label: 'Cobertura e Inventario' },
          { id: 'scatter',   icon: FiTarget,     label: 'Puntos de Precio' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-5 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all ${
              activeTab === tab.id ? 'bg-[#87be00] text-white shadow-md' : 'bg-white text-gray-400 hover:bg-gray-50 border border-gray-100'
            }`}
          >
            <tab.icon size={14} /> {tab.label}
          </button>
        ))}
      </div>

      {/* CONTENIDO DEL DASHBOARD */}
      {loading ? (
        <div className="py-20 text-center"><FiLoader className="animate-spin text-[#87be00] mx-auto mb-4" size={40} /></div>
      ) : (
        <div className="mt-4">
          
          {/* TAB 1: RESUMEN GENERAL */}
          {activeTab === 'general' && (
            <>
              {/* KPIs */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-6 mb-6">
                <div className="bg-white p-5 md:p-6 rounded-[1.5rem] md:rounded-[2rem] shadow-sm border border-gray-50 flex items-center gap-4 hover:shadow-md transition-shadow">
                  <div className="w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-[#87be00]/10 text-[#87be00] flex items-center justify-center shrink-0">
                    <FiDollarSign size={24} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[9px] md:text-[10px] font-bold text-gray-400 uppercase tracking-widest truncate">Venta Neta Total</p>
                    <h4 className="text-lg md:text-xl font-black text-gray-900 truncate">{formatoMoneda(totalVenta)}</h4>
                  </div>
                </div>

                <div className="bg-white p-5 md:p-6 rounded-[1.5rem] md:rounded-[2rem] shadow-sm border border-gray-50 flex items-center gap-4 hover:shadow-md transition-shadow">
                  <div className="w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-blue-50 text-blue-500 flex items-center justify-center shrink-0">
                    <FiTrendingUp size={24} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[9px] md:text-[10px] font-bold text-gray-400 uppercase tracking-widest truncate">Locales Activos</p>
                    <h4 className="text-lg md:text-xl font-black text-gray-900 truncate">{data?.byLocal?.length || 0}</h4>
                  </div>
                </div>

                <div className="bg-white p-5 md:p-6 rounded-[1.5rem] md:rounded-[2rem] shadow-sm border border-gray-50 flex items-center gap-4 hover:shadow-md transition-shadow">
                  <div className="w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-purple-50 text-purple-500 flex items-center justify-center shrink-0">
                    <FiShoppingBag size={24} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[9px] md:text-[10px] font-bold text-gray-400 uppercase tracking-widest truncate">Top Producto</p>
                    <h4 className="text-sm md:text-base font-black text-gray-900 truncate w-full" title={data?.byProduct?.[0]?.label}>
                      {data?.byProduct?.[0]?.label || 'N/A'}
                    </h4>
                  </div>
                </div>
              </div>

              {/* GRÁFICOS */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <SimpleBarChart title="Ventas por Local (CLP)"    data={data?.byLocal}    dataKey="total" />
                <SimpleBarChart title="Ventas por Producto (CLP)" data={data?.byProduct}  dataKey="total" />
                <SimpleBarChart title="Ventas por Cadena (CLP)"   data={data?.byChain}    dataKey="total" />
                <SimpleBarChart title="Ventas por Operario (CLP)" data={data?.byOperator} dataKey="total" />
              </div>
            </>
          )}

          {/* TAB 2: EVOLUCIÓN DE PRECIOS */}
          {activeTab === 'evolution' && (
            <div className="w-full">
              {data?.evolution?.length > 0 ? (
                <EvolutionLineChart 
                  title="Evolución de Venta Neta y Precio Promedio" 
                  data={data.evolution} 
                />
              ) : (
                <div className="bg-white rounded-[1.5rem] p-16 text-center text-gray-400 text-xs font-bold uppercase tracking-widest">
                  Sin datos de evolución para el período seleccionado
                </div>
              )}
            </div>
          )}

          {/* TAB 3: COBERTURA E INVENTARIO */}
          {activeTab === 'coverage' && (
            <div className="w-full">
              {data?.coverage?.length > 0 ? (
                <InventoryCoverageChart 
                  title="Inventario vs Quiebres" 
                  data={data.coverage} 
                />
              ) : (
                <div className="bg-white rounded-[1.5rem] p-16 text-center text-gray-400 text-xs font-bold uppercase tracking-widest">
                  Sin datos de cobertura para el período seleccionado
                </div>
              )}
            </div>
          )}

          {/* TAB 4: PUNTOS DE PRECIO */}
          {activeTab === 'scatter' && (
            <div className="w-full">
              {data?.scatter?.length > 0 ? (
                <PricePointScatterChart 
                  title="Dispersión: Volumen vs Precio Promedio" 
                  data={data.scatter} 
                />
              ) : (
                <div className="bg-white rounded-[1.5rem] p-16 text-center text-gray-400 text-xs font-bold uppercase tracking-widest">
                  Sin datos de puntos de precio para el período seleccionado
                </div>
              )}
            </div>
          )}

        </div>
      )}
    </div>
  );
};

export default SalesDashboard;