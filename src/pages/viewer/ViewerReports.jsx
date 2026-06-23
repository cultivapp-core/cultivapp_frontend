import React, { useState, useEffect, useMemo } from "react";
import { FiRefreshCw, FiTrendingUp, FiShoppingBag } from "react-icons/fi";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  LineChart, Line, ReferenceLine, PieChart, Pie, Cell 
} from "recharts";
import api from "../../api/apiClient";
import { toast } from "react-hot-toast";

const COLORS = ['#87be00', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#10b981'];

const ViewerReports = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // 🚩 AGREGADO: startDate y endDate en el estado inicial de filtros
  const [filters, setFilters] = useState({ 
    region_id: "", comuna_id: "", cadena: "", local_id: "", startDate: "", endDate: "" 
  });
  const [options, setOptions] = useState({ regiones: [], comunas: [], cadenas: [], locales: [] });

  // Función para normalizar valores numéricos de cadenas o numéricos puros
  const getNumericValue = (val) => {
    if (val === null || val === undefined) return 0;
    if (typeof val === 'string') {
      return parseFloat(val.replace(/\./g, "").replace("$", "").replace(",", ".")) || 0;
    }
    return parseFloat(val) || 0;
  };

  // 1. Cargar opciones de filtro
  useEffect(() => {
    const fetchFilters = async () => {
      try {
        const res = await api.get("/viewer/filter-options");
        setOptions(res.data.data || res.data);
      } catch (err) { 
        console.error("Error cargando filtros", err); 
      }
    };
    fetchFilters();
  }, []);

  // 2. Cargar datos del reporte
  useEffect(() => {
    const fetchReportData = async () => {
      setLoading(true);
      try {
        const response = await api.get("/viewer/detailed-reports", { params: filters });
        const dataList = response.data.data || response.data || [];
        setData(dataList);
        
        // Inspección de la estructura de datos en consola (F12)
        console.log("ESTRUCTURA DE UN ITEM:", dataList[0]);
      } catch (err) {
        toast.error("Error al cargar reportes");
      } finally {
        setLoading(false);
      }
    };
    fetchReportData();
  }, [filters]);

  // --- 🔴 CÁLCULOS Y AGRUPAMIENTO DE DATOS ---

  // 1. Kpis Globales: Venta Neta y Venta Bruta
  const kpiTotals = useMemo(() => {
    if (!Array.isArray(data)) return { net: 0, gross: 0 };
    return data.reduce((acc, item) => {
      acc.net += getNumericValue(item["Venta neta"] || item.venta_neta || item.sales || 0);
      acc.gross += getNumericValue(item["Venta bruta"] || item.venta_bruta || item.sales_gross || 0);
      return acc;
    }, { net: 0, gross: 0 });
  }, [data]);

  // 2. Ventas Netas agrupadas por Cadena
  const salesByChain = useMemo(() => {
    if (!Array.isArray(data)) return [];
    const grouped = data.reduce((acc, item) => {
      const chain = item["(L) Cadena"] || item.cadena || item.cadena_nombre || item.name || "Sin Cadena";
      acc[chain] = (acc[chain] || 0) + getNumericValue(item["Venta neta"] || item.venta_neta || item.sales || 0);
      return acc;
    }, {});
    return Object.keys(grouped).map(name => ({ name, sales: grouped[name] }));
  }, [data]);

  // 3. Top 8 Productos más vendidos
  const topProducts = useMemo(() => {
    if (!Array.isArray(data)) return [];
    const grouped = data.reduce((acc, item) => {
      const prod = item["(I) Descripción Producto Interno"] || 
                   item.descripcion_producto || 
                   item.descripcion_producto_interno || 
                   item.descripcion || 
                   item.product_name ||
                   item.name || 
                   item.producto || 
                   "Producto Genérico";
                   
      const units = getNumericValue(
        item["Unidades vendidas"] || 
        item.unidades_vendidas || 
        item.unidades || 
        item.cantidad || 
        item.units || 
        0
      );

      if (prod && units > 0) {
        acc[prod] = (acc[prod] || 0) + units;
      }
      return acc;
    }, {});
    
    return Object.keys(grouped)
      .map(name => ({ name, units: grouped[name] }))
      .sort((a, b) => b.units - a.units)
      .slice(0, 8);
  }, [data]);

  // 4. Estado de Stock (Con stock vs Quiebres de stock)
  const stockBreakStockData = useMemo(() => {
    if (!Array.isArray(data)) return [];
    let inStock = 0;
    let outOfStock = 0;
    data.forEach(item => {
      const stock = getNumericValue(item.inventario_unidades || item.inventario || item.stock || 0);
      if (stock <= 0) outOfStock++;
      else inStock++;
    });
    return [
      { name: "Con Stock", value: inStock },
      { name: "Quiebre de Stock", value: outOfStock }
    ];
  }, [data]);

  // 5. Simulación de Curva de Sierra (Inventario a 7 días con reposición cada 3 días)
  const sawToothSimulation = useMemo(() => {
    const stockInicial = 45000;
    const loteReposicion = 40000;
    
    let stockActual = stockInicial;
    return Array.from({ length: 7 }).map((_, i) => {
      const diaIndex = i + 1;
      const isReplenishmentDay = diaIndex === 1 || (diaIndex - 1) % 3 === 0;
      
      const stockEntrada = isReplenishmentDay ? stockActual + loteReposicion : stockActual;
      const ventasDia = 13000; 
      const stockSalida = Math.max(0, stockEntrada - ventasDia);
      
      stockActual = stockSalida;

      return {
        dia: `Día ${diaIndex}`,
        stock_inicial: stockEntrada,
        stock_final: stockSalida,
        limite_quiebre: 0
      };
    });
  }, []);

  // --- 🔴 EVENTOS Y FILTROS ---
  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    let newFilters = { ...filters, [name]: value };
    if (name === "region_id") newFilters = { ...newFilters, comuna_id: "", local_id: "" };
    if (name === "comuna_id") newFilters = { ...newFilters, local_id: "" };
    setFilters(newFilters);
  };

  // 🚩 AGREGADO: Resetear fechas en la función limpiar
  const clearFilters = () => setFilters({ 
    region_id: "", comuna_id: "", cadena: "", local_id: "", startDate: "", endDate: "" 
  });

  return (
    <div className="space-y-8 animate-in fade-in duration-500 font-[Outfit] pb-10">
      
      {/* ── HEADER Y FILTROS ── */}
      <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm">
        <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-black text-gray-900 uppercase italic">Consolidado • Reportes Visualización</h2>
            <button onClick={clearFilters} className="text-[9px] font-black text-gray-400 hover:text-[#87be00] uppercase tracking-widest flex items-center gap-2">
                <FiRefreshCw /> Limpiar
            </button>
        </div>
        
        {/* 🚩 AGREGADO: Se cambió el grid a 5 columnas (lg:grid-cols-5) para acomodar las fechas y se añadieron labels pequeños para mantener el orden visual */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            
            <div className="flex flex-col">
                <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1 pl-1">Desde</label>
                <input type="date" name="startDate" value={filters.startDate} onChange={handleFilterChange} className="bg-gray-50 p-4 rounded-xl text-[10px] font-black uppercase outline-none" />
            </div>

            <div className="flex flex-col">
                <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1 pl-1">Hasta</label>
                <input type="date" name="endDate" value={filters.endDate} onChange={handleFilterChange} className="bg-gray-50 p-4 rounded-xl text-[10px] font-black uppercase outline-none" />
            </div>

            <div className="flex flex-col">
                <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1 pl-1">Región</label>
                <select name="region_id" value={filters.region_id} onChange={handleFilterChange} className="bg-gray-50 p-4 rounded-xl text-[10px] font-black uppercase outline-none">
                    <option value="">Todas</option>
                    {options.regiones?.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                </select>
            </div>
            
            <div className="flex flex-col">
                <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1 pl-1">Comuna</label>
                <select name="comuna_id" value={filters.comuna_id} onChange={handleFilterChange} className="bg-gray-50 p-4 rounded-xl text-[10px] font-black uppercase outline-none">
                    <option value="">Todas</option>
                    {options.comunas?.filter(c => !filters.region_id || c.region_id === filters.region_id).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
            </div>
            
            <div className="flex flex-col">
                <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1 pl-1">Cadena</label>
                <select name="cadena" value={filters.cadena} onChange={handleFilterChange} className="bg-gray-50 p-4 rounded-xl text-[10px] font-black uppercase outline-none">
                    <option value="">Todas</option>
                    {options.cadenas?.map(c => <option key={c} value={c}>{c}</option>)}
                </select>           
            </div>
        </div>
      </div>

      {/* ── KPI'S O TARJETAS DE VALOR TOTALES ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
         <div className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-sm flex items-center gap-6">
           <div className="p-4 bg-green-50 rounded-2xl text-[#87be00]"><FiTrendingUp size={32} /></div>
           <div>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Venta Neta Total</p>
              <span className="text-3xl font-black italic tracking-tighter leading-none text-gray-900">${Math.round(kpiTotals.net).toLocaleString('es-CL')}</span>
           </div>
         </div>
         <div className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-sm flex items-center gap-6">
           <div className="p-4 bg-blue-50 rounded-2xl text-blue-600"><FiShoppingBag size={32} /></div>
           <div>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Venta Bruta Total</p>
              <span className="text-3xl font-black italic tracking-tighter leading-none text-gray-900">${Math.round(kpiTotals.gross).toLocaleString('es-CL')}</span>
           </div>
         </div>
      </div>

      {/* ── GRÁFICO DE BARRAS: VENTAS NETAS POR CADENA ── */}
      <div className="bg-white p-8 rounded-[2rem] border border-gray-100 min-h-[300px]">
        <h2 className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-8">Venta Neta por Cadena</h2>
        {loading ? (
            <div className="h-[250px] flex items-center justify-center text-gray-400">Cargando...</div>
        ) : salesByChain.length > 0 ? (
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={salesByChain}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="name" fontSize={9} fontWeight={900} height={50} />
              <YAxis fontSize={10} tickFormatter={(value) => `$${(value / 1000000).toFixed(1)}M`} />
              <Tooltip formatter={(value) => `$${Math.round(value).toLocaleString('es-CL')}`} />
              <Bar dataKey="sales" fill="#87be00" radius={[8, 8, 0, 0]} barSize={40} />
            </BarChart>
          </ResponsiveContainer>
        ) : <p className="text-center text-gray-400">Sin datos disponibles</p>}
      </div>

      {/* ── GRÁFICOS SECUNDARIOS (DOBLE COLUMNA) ── */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        
        {/* Gráfico Horizontal: Productos más vendidos */}
        <div className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-sm flex flex-col">
           <h3 className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-6">Top Productos más vendidos (Unidades)</h3>
           <div className="h-[260px] w-full">
             {loading ? <p className="text-center text-gray-400">Cargando...</p> : topProducts.length === 0 ? <p className="text-center text-gray-400 py-10">Sin unidades vendidas registradas</p> : (
               <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={topProducts} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                     <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                     <XAxis type="number" fontSize={8} />
                     <YAxis dataKey="name" type="category" fontSize={7} width={140} tick={{ fontSize: 7 }} />
                     <Tooltip />
                     <Bar dataKey="units" fill="#3b82f6" radius={[0, 8, 8, 0]} barSize={18} />
                  </BarChart>
               </ResponsiveContainer>
             )}
           </div>
        </div>

        {/* Gráfico Pie: Estado de Stock / Quiebres */}
        <div className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-sm flex flex-col justify-between">
           <div>
             <h3 className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-1">Estado de Inventario / Quiebres de Stock</h3>
             <p className="text-[8px] font-black text-[#87be00] uppercase tracking-[0.2em] italic mb-4">SKU's con unidades disponibles vs ruptura</p>
           </div>
           <div className="h-[220px] w-full">
             {loading ? <p className="text-center text-gray-400">Cargando...</p> : (
               <ResponsiveContainer width="110%" height="100%">
                 <PieChart>
                   <Pie 
                     data={stockBreakStockData} 
                     dataKey="value" 
                     nameKey="name" 
                     cx="50%" 
                     cy="50%" 
                     outerRadius={70} 
                     label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`} 
                     labelStyle={{ fontSize: '9px', fontWeight: 'bold' }}
                   >
                     {stockBreakStockData.map((entry, index) => <Cell key={`cell-${index}`} fill={index === 0 ? '#87be00' : '#ef4444'} />)}
                   </Pie>
                   <Tooltip />
                 </PieChart>
               </ResponsiveContainer>
             )}
           </div>
        </div>
      </div>

      {/* ── CURVA DE SIERRA (CONTROL DE INVENTARIO Y REPOSICIÓN CADA 3 DÍAS) ── */}
      <div className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-sm">
         <div className="mb-6">
            <h3 className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-1">Simulación Curva de Cierre (Inventario Físico)</h3>
            <p className="text-[8px] font-black text-red-500 uppercase tracking-[0.2em] italic">Riesgo de quiebre de stock (línea roja de quiebre en cero)</p>
         </div>
         <div className="h-[300px]">
           <ResponsiveContainer width="100%" height="100%">
             <LineChart data={sawToothSimulation}>
               <CartesianGrid strokeDasharray="3 3" vertical={false} />
               <XAxis dataKey="dia" fontSize={9} fontWeight={900} />
               <YAxis fontSize={9} />
               <Tooltip formatter={(value) => `${value.toLocaleString('es-CL')} und`} />
               <ReferenceLine y={0} stroke="red" strokeDasharray="5 5" label="QUIEBRE" />
               <Line type="stepAfter" dataKey="stock_final" stroke="#87be00" strokeWidth={3} dot={{ r: 5 }} name="Stock Disponible" />
             </LineChart>
           </ResponsiveContainer>
         </div>
      </div>
    </div>
  );
};

export default ViewerReports;