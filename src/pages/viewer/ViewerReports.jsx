import React, { useState, useEffect, useMemo } from "react";
import { FiRefreshCw, FiTrendingUp, FiShoppingBag, FiCheck } from "react-icons/fi";
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
  
  const [draftFilters, setDraftFilters] = useState({ 
    region_id: "", comuna_id: "", cadena: "", local_id: "", startDate: "", endDate: "" 
  });
  const [appliedFilters, setAppliedFilters] = useState({ 
    region_id: "", comuna_id: "", cadena: "", local_id: "", startDate: "", endDate: "" 
  });
  
  const [options, setOptions] = useState({ regiones: [], comunas: [], cadenas: [], locales: [] });

  const getNumericValue = (val) => {
    if (val === null || val === undefined) return 0;
    if (typeof val === 'string') {
      return parseFloat(val.replace(/\./g, "").replace("$", "").replace(",", ".")) || 0;
    }
    return parseFloat(val) || 0;
  };

  useEffect(() => {
    const fetchFilters = async () => {
      try {
        const res = await api.get("/viewer/filter-options");
        setOptions(res.data.data || res.data);
      } catch (err) { console.error("Error cargando filtros", err); }
    };
    fetchFilters();
  }, []);

  useEffect(() => {
    const fetchReportData = async () => {
      setLoading(true);
      try {
        const response = await api.get("/viewer/detailed-reports", { params: appliedFilters });
        const dataList = response.data.data || response.data || [];
        setData(dataList);
      } catch (err) {
        toast.error("Error al cargar reportes");
      } finally {
        setLoading(false);
      }
    };
    fetchReportData();
  }, [appliedFilters]);

  // --- CÁLCULOS ---
  const kpiTotals = useMemo(() => {
    if (!Array.isArray(data)) return { net: 0, gross: 0 };
    return data.reduce((acc, item) => {
      acc.net += getNumericValue(item["Venta neta"] || item.venta_neta || item.sales || 0);
      acc.gross += getNumericValue(item["Venta bruta"] || item.venta_bruta || item.sales_gross || 0);
      return acc;
    }, { net: 0, gross: 0 });
  }, [data]);

  const salesByChain = useMemo(() => {
    if (!Array.isArray(data)) return [];
    const grouped = data.reduce((acc, item) => {
      const chain = item["(L) Cadena"] || item.cadena || item.cadena_nombre || item.name || "Sin Cadena";
      acc[chain] = (acc[chain] || 0) + getNumericValue(item["Venta neta"] || item.venta_neta || item.sales || 0);
      return acc;
    }, {});
    return Object.keys(grouped).map(name => ({ name, sales: grouped[name] }));
  }, [data]);

  const topProducts = useMemo(() => {
    if (!Array.isArray(data)) return [];
    const grouped = data.reduce((acc, item) => {
      const prod = item["(I) Descripción Producto Interno"] || item.descripcion_producto || item.descripcion_producto_interno || "Producto Genérico";
      const units = getNumericValue(item["Unidades vendidas"] || item.unidades_vendidas || item.units || 0);
      if (prod && units > 0) acc[prod] = (acc[prod] || 0) + units;
      return acc;
    }, {});
    return Object.keys(grouped).map(name => ({ name, units: grouped[name] })).sort((a, b) => b.units - a.units).slice(0, 8);
  }, [data]);

  const stockBreakStockData = useMemo(() => {
    if (!Array.isArray(data)) return [];
    let inStock = 0, outOfStock = 0;
    data.forEach(item => {
      const stock = getNumericValue(item.inventario_unidades || item.inventario || item.stock || 0);
      if (stock <= 0) outOfStock++; else inStock++;
    });
    return [{ name: "Con Stock", value: inStock }, { name: "Quiebre de Stock", value: outOfStock }];
  }, [data]);

  const sawToothSimulation = useMemo(() => {
    let stockActual = 45000;
    return Array.from({ length: 7 }).map((_, i) => {
      const diaIndex = i + 1;
      const isReplenishmentDay = diaIndex === 1 || (diaIndex - 1) % 3 === 0;
      const stockEntrada = isReplenishmentDay ? stockActual + 40000 : stockActual;
      const stockSalida = Math.max(0, stockEntrada - 13000);
      stockActual = stockSalida;
      return { dia: `Día ${diaIndex}`, stock_final: stockSalida };
    });
  }, []);

  // Hay al menos un registro con stock > 0 (para no montar el PieChart con todo en cero)
  const hasStockData = stockBreakStockData.some(d => d.value > 0);

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    let newFilters = { ...draftFilters, [name]: value };
    if (name === "region_id") newFilters = { ...newFilters, comuna_id: "", local_id: "" };
    if (name === "comuna_id") newFilters = { ...newFilters, local_id: "" };
    setDraftFilters(newFilters);
  };

  const handleApply = () => setAppliedFilters(draftFilters);

  const clearFilters = () => {
    const reset = { region_id: "", comuna_id: "", cadena: "", local_id: "", startDate: "", endDate: "" };
    setDraftFilters(reset);
    setAppliedFilters(reset);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 font-[Outfit] pb-10">
      <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm">
        <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-black text-gray-900 uppercase italic">Consolidado • Reportes Visualización</h2>
            <div className="flex gap-4">
                <button onClick={clearFilters} className="text-[9px] font-black text-gray-400 hover:text-red-500 uppercase tracking-widest flex items-center gap-2">
                    <FiRefreshCw /> Limpiar
                </button>
                <button onClick={handleApply} className="bg-[#87be00] text-white px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-[#76a600]">
                    <FiCheck /> Aplicar
                </button>
            </div>
        </div>
        
        <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
            <div className="flex flex-col"><label className="text-[9px] font-black text-gray-400 uppercase mb-1 pl-1">Desde</label><input type="date" name="startDate" value={draftFilters.startDate} onChange={handleFilterChange} className="bg-gray-50 p-4 rounded-xl text-[10px] font-black uppercase outline-none" /></div>
            <div className="flex flex-col"><label className="text-[9px] font-black text-gray-400 uppercase mb-1 pl-1">Hasta</label><input type="date" name="endDate" value={draftFilters.endDate} onChange={handleFilterChange} className="bg-gray-50 p-4 rounded-xl text-[10px] font-black uppercase outline-none" /></div>
            <div className="flex flex-col"><label className="text-[9px] font-black text-gray-400 uppercase mb-1 pl-1">Región</label><select name="region_id" value={draftFilters.region_id} onChange={handleFilterChange} className="bg-gray-50 p-4 rounded-xl text-[10px] font-black uppercase outline-none"><option value="">Todas</option>{options.regiones?.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}</select></div>
            <div className="flex flex-col"><label className="text-[9px] font-black text-gray-400 uppercase mb-1 pl-1">Comuna</label><select name="comuna_id" value={draftFilters.comuna_id} onChange={handleFilterChange} className="bg-gray-50 p-4 rounded-xl text-[10px] font-black uppercase outline-none"><option value="">Todas</option>{options.comunas?.filter(c => !draftFilters.region_id || c.region_id == draftFilters.region_id).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
            <div className="flex flex-col"><label className="text-[9px] font-black text-gray-400 uppercase mb-1 pl-1">Cadena</label><select name="cadena" value={draftFilters.cadena} onChange={handleFilterChange} className="bg-gray-50 p-4 rounded-xl text-[10px] font-black uppercase outline-none"><option value="">Todas</option>{options.cadenas?.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
         <div className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-sm flex items-center gap-6"><div className="p-4 bg-green-50 rounded-2xl text-[#87be00]"><FiTrendingUp size={32} /></div><div><p className="text-[10px] font-black text-gray-400 uppercase mb-1">Venta Neta Total</p><span className="text-3xl font-black italic">${Math.round(kpiTotals.net).toLocaleString('es-CL')}</span></div></div>
         <div className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-sm flex items-center gap-6"><div className="p-4 bg-blue-50 rounded-2xl text-blue-600"><FiShoppingBag size={32} /></div><div><p className="text-[10px] font-black text-gray-400 uppercase mb-1">Venta Bruta Total</p><span className="text-3xl font-black italic">${Math.round(kpiTotals.gross).toLocaleString('es-CL')}</span></div></div>
      </div>

      {/* ── GRÁFICOS CON MIN-WIDTH: 0 ── */}
      <div className="bg-white p-8 rounded-[2rem] border border-gray-100 min-h-[300px]">
        <h2 className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-8">Venta Neta por Cadena</h2>
        {loading ? (
          <div className="h-[250px] flex items-center justify-center">Cargando...</div>
        ) : salesByChain.length > 0 ? (
          <div style={{ width: '100%', height: 250, minWidth: 0 }}>
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
              <BarChart data={salesByChain}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" fontSize={9} fontWeight={900} />
                <YAxis fontSize={10} tickFormatter={(val) => `$${(val / 1000000).toFixed(1)}M`} />
                <Tooltip formatter={(val) => `$${Math.round(val).toLocaleString('es-CL')}`} />
                <Bar dataKey="sales" fill="#87be00" radius={[8, 8, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : <p className="text-center text-gray-400">Sin datos disponibles</p>}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-sm flex flex-col min-h-[300px]">
           <h3 className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-6">Top Productos</h3>
           {loading ? (
             <div className="h-[260px] flex items-center justify-center">Cargando...</div>
           ) : topProducts.length > 0 ? (
             <div style={{ width: '100%', height: 260, minWidth: 0 }}>
               <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                  <BarChart data={topProducts} layout="vertical" margin={{ left: 40 }}>
                       <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                       <XAxis type="number" fontSize={8} />
                       <YAxis dataKey="name" type="category" fontSize={7} width={100} />
                       <Tooltip />
                       <Bar dataKey="units" fill="#3b82f6" radius={[0, 8, 8, 0]} barSize={18} />
                  </BarChart>
               </ResponsiveContainer>
             </div>
           ) : <p className="text-center text-gray-400">Sin datos disponibles</p>}
        </div>
        <div className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-sm flex flex-col min-h-[300px]">
           <div><h3 className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-1">Estado de Inventario</h3></div>
           {loading ? (
             <div className="h-[220px] flex items-center justify-center">Cargando...</div>
           ) : hasStockData ? (
             <div style={{ width: '100%', height: 220, minWidth: 0 }}>
               <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                 <PieChart>
                   <Pie data={stockBreakStockData} dataKey="value" outerRadius={70} label={({name, percent}) => `${name} (${(percent*100).toFixed(0)}%)`}>
                     {stockBreakStockData.map((e, i) => <Cell key={i} fill={i === 0 ? '#87be00' : '#ef4444'} />)}
                   </Pie>
                   <Tooltip />
                 </PieChart>
               </ResponsiveContainer>
             </div>
           ) : <p className="text-center text-gray-400">Sin datos disponibles</p>}
        </div>
      </div>
    </div>
  );
};

export default ViewerReports;