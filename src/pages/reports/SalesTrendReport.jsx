import React, { useEffect, useState } from "react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import api from "../../api/apiClient";
import { FiRefreshCw } from "react-icons/fi";

const SalesTrendReport = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // 1. Opciones para los filtros (Inicializadas como arrays vacíos para evitar errores)
  const [filterOptions, setFilterOptions] = useState({ regiones: [], comunas: [], cadenas: [] });
  
  // 2. Estado de selección y aplicado
  const [selected, setSelected] = useState({ 
    start_date: '', end_date: '', region: '', comuna: '', cadena: '' 
  });
  const [appliedFilters, setAppliedFilters] = useState({ 
    start_date: '', end_date: '', region: '', comuna: '', cadena: '' 
  });

  // Cargar opciones de filtros al inicio
  useEffect(() => {
    const fetchFilters = async () => {
      try {
        const res = await api.get("/sales/report/filters");
        
        // MANEJO ROBUSTO: Validamos que la respuesta tenga el formato esperado
        const data = res.data || res;
        setFilterOptions({
          regiones: Array.isArray(data.regiones) ? data.regiones : [],
          comunas: Array.isArray(data.comunas) ? data.comunas : [],
          cadenas: Array.isArray(data.cadenas) ? data.cadenas : [],
        });
      } catch (e) { 
        console.error("Error cargando filtros:", e); 
      }
    };
    fetchFilters();
  }, []);

  // Cargar datos cuando cambian los filtros aplicados
  useEffect(() => {
    const fetchTrend = async () => {
      // Comprobar si hay filtros activos (se verifica si alguno tiene valor)
      const hasFilters = appliedFilters.start_date || appliedFilters.end_date || 
                         appliedFilters.region || appliedFilters.comuna || appliedFilters.cadena;

      if (!hasFilters) {
        setData([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const result = await api.get("/sales/report/trend", { params: appliedFilters });
        const rawData = Array.isArray(result.data) ? result.data : (Array.isArray(result) ? result : []);
        setData(rawData);
      } catch (err) { console.error(err); } 
      finally { setLoading(false); }
    };
    fetchTrend();
  }, [appliedFilters]);

  const handleApply = () => setAppliedFilters(selected);
  
  const handleClear = () => {
    const reset = { start_date: '', end_date: '', region: '', comuna: '', cadena: '' };
    setSelected(reset);
    setAppliedFilters(reset);
  };

  return (
    <div className="p-6 md:p-10 font-[Outfit]">
      <h2 className="text-2xl font-black text-gray-900 uppercase italic mb-8">Tendencia de Ventas (Sell-Out)</h2>
      
      {/* ── BARRA DE FILTROS ── */}
      <div className="grid grid-cols-2 md:grid-cols-7 gap-4 mb-8 bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm items-end">
        <div className="flex flex-col gap-1">
            <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest pl-1">Desde</label>
            <input type="date" className="p-3 border rounded-xl text-[10px] uppercase font-black outline-none bg-gray-50" 
                value={selected.start_date} onChange={(e) => setSelected({...selected, start_date: e.target.value})} />
        </div>
        <div className="flex flex-col gap-1">
            <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest pl-1">Hasta</label>
            <input type="date" className="p-3 border rounded-xl text-[10px] uppercase font-black outline-none bg-gray-50" 
                value={selected.end_date} onChange={(e) => setSelected({...selected, end_date: e.target.value})} />
        </div>
        <div className="flex flex-col gap-1">
            <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest pl-1">Región</label>
            <select className="p-3 border rounded-xl text-[10px] uppercase font-black outline-none bg-gray-50" 
                value={selected.region} onChange={(e) => setSelected({...selected, region: e.target.value})}>
                <option value="">Todas</option>
                {filterOptions.regiones.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
        </div>
        <div className="flex flex-col gap-1">
            <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest pl-1">Comuna</label>
            <select className="p-3 border rounded-xl text-[10px] uppercase font-black outline-none bg-gray-50" 
                value={selected.comuna} onChange={(e) => setSelected({...selected, comuna: e.target.value})}>
                <option value="">Todas</option>
                {filterOptions.comunas.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
        </div>
        <div className="flex flex-col gap-1">
            <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest pl-1">Cadena</label>
            <select className="p-3 border rounded-xl text-[10px] uppercase font-black outline-none bg-gray-50" 
                value={selected.cadena} onChange={(e) => setSelected({...selected, cadena: e.target.value})}>
                <option value="">Todas</option>
                {filterOptions.cadenas.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
        </div>
        <button onClick={handleApply} className="bg-[#87be00] hover:bg-[#76a600] text-white rounded-xl text-[10px] font-black uppercase py-4 transition-all shadow-md">
            Aplicar
        </button>
        <button onClick={handleClear} className="bg-gray-900 hover:bg-black text-white rounded-xl text-[10px] font-black uppercase py-4 transition-all shadow-md flex items-center justify-center gap-2">
            <FiRefreshCw size={12} /> Limpiar
        </button>
      </div>

      {/* ── GRÁFICO ── */}
      <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100 h-[400px]">
        {loading ? (
            <div className="h-full flex items-center justify-center text-xs font-black text-gray-300 uppercase animate-pulse">Cargando datos...</div>
        ) : data.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data}>
                <defs>
                <linearGradient id="colorVenta" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#87be00" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#87be00" stopOpacity={0}/>
                </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                
                <XAxis 
                  dataKey="fecha_venta" 
                  fontSize={10} 
                  tickFormatter={(val) => {
                    const d = new Date(val);
                    return isNaN(d) ? val : `${d.getUTCDate().toString().padStart(2, '0')}/${(d.getUTCMonth() + 1).toString().padStart(2, '0')}`;
                  }} 
                />
                
                <YAxis 
                  fontSize={10} 
                  tickFormatter={(val) => `$${(val / 1000000).toFixed(1)}M`} 
                />
                
                <Tooltip 
                  labelFormatter={(label) => {
                      const d = new Date(label);
                      return isNaN(d) ? label : d.toLocaleDateString('es-CL');
                  }}
                  formatter={(val) => [`$${Number(val).toLocaleString('es-CL')}`, 'Venta Total']}
                />
                
                <Area type="monotone" dataKey="total_venta" stroke="#87be00" fillOpacity={1} fill="url(#colorVenta)" />
            </AreaChart>
            </ResponsiveContainer>
        ) : (
            <div className="h-full flex items-center justify-center text-xs font-black text-gray-400 uppercase">
                {appliedFilters.start_date === '' && appliedFilters.region === '' ? "Selecciona filtros para ver datos" : "No hay datos para esta selección"}
            </div>
        )}
      </div>
    </div>
  );
};

export default SalesTrendReport;