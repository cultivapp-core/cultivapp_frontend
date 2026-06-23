import React, { useEffect, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import api from "../../api/apiClient";

const ProductReport = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ regiones: [], comunas: [], cadenas: [], mercaderistas: [] });
  
  // 1. Estado para los inputs visuales (lo que el usuario está eligiendo)
  const initialForm = { start_date: '', end_date: '', region: '', comuna: '', cadena: '', mercaderista: '' };
  const [form, setForm] = useState(initialForm);
  
  // 2. Estado para la búsqueda real y bandera de limpieza
  const [appliedFilters, setAppliedFilters] = useState(initialForm);
  const [isCleared, setIsCleared] = useState(false);

  const formatNumber = (num) => Number(num || 0).toLocaleString();

  useEffect(() => {
    const loadFilters = async () => {
      try {
        const res = await api.get("/sales/report/filters");
        // Aseguramos que las listas existan para evitar errores de map
        setFilters(res.data || res || { regiones: [], comunas: [], cadenas: [], mercaderistas: [] });
      } catch (e) { console.error("Error cargando filtros:", e); }
    };
    loadFilters();
  }, []);

  useEffect(() => {
    // Si se presionó limpiar, vaciamos la data y cortamos la ejecución (no llama a la API)
    if (isCleared) {
      setData([]);
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      setLoading(true);
      try {
        const result = await api.get("/sales/report/productos", { params: appliedFilters });
        const rawData = result.data || result;
        const sortedData = [...(Array.isArray(rawData) ? rawData : [])].reverse();
        setData(sortedData);
      } catch (err) { 
        console.error(err); 
      } finally { 
        setLoading(false); 
      }
    };
    fetchData();
  }, [appliedFilters, isCleared]);

  // Funciones para los botones
  const handleApply = () => {
    setIsCleared(false); // Quitamos el modo "limpio"
    setAppliedFilters(form); // Disparamos la búsqueda con los filtros actuales
  };

  const handleClear = () => {
    setForm(initialForm); // Reseteamos las casillas visuales
    setIsCleared(true); // Vaciamos el gráfico y la tabla
  };

  return (
    <div className="p-6 md:p-10 font-[Outfit]">
      <h2 className="text-2xl font-black text-gray-900 uppercase italic mb-8">Performance Productos (Top 50)</h2>
      
      {/* BARRA DE FILTROS */}
      <div className="grid grid-cols-2 md:grid-cols-8 gap-4 mb-8 bg-white p-4 rounded-[1.5rem] border border-gray-100 shadow-sm">
        <input type="date" className="p-2 border rounded-xl text-[10px] uppercase font-bold outline-none" 
          value={form.start_date} onChange={(e) => setForm({...form, start_date: e.target.value})} />
          
        <input type="date" className="p-2 border rounded-xl text-[10px] uppercase font-bold outline-none" 
          value={form.end_date} onChange={(e) => setForm({...form, end_date: e.target.value})} />
          
        <select className="p-2 border rounded-xl text-[10px] uppercase font-bold outline-none" 
          value={form.region} onChange={(e) => setForm({...form, region: e.target.value})}>
          <option value="">Región</option>
          {filters.regiones?.map(r => <option key={r} value={r}>{r}</option>)}
        </select>
        
        <select className="p-2 border rounded-xl text-[10px] uppercase font-bold outline-none" 
          value={form.cadena} onChange={(e) => setForm({...form, cadena: e.target.value})}>
          <option value="">Cadena</option>
          {filters.cadenas?.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        
        <select className="p-2 border rounded-xl text-[10px] uppercase font-bold outline-none" 
          value={form.mercaderista} onChange={(e) => setForm({...form, mercaderista: e.target.value})}>
          <option value="">Mercaderista</option>
          {/* Filtramos para no mostrar mercaderistas en blanco, null o indefinidos */}
          {filters.mercaderistas
            ?.filter(m => m && m.toString().trim() !== "")
            .map(m => <option key={m} value={m}>{m}</option>)}
        </select>

        {/* BOTONES DE ACCIÓN */}
        <button onClick={handleApply}
          className="col-span-1 bg-[#87be00] hover:bg-[#76a600] transition-colors text-white rounded-xl text-[10px] font-black uppercase">
          Aplicar
        </button>
        
        <button onClick={handleClear}
          className="col-span-1 bg-gray-900 hover:bg-black transition-colors text-white rounded-xl text-[10px] font-black uppercase">
          Limpiar
        </button>
      </div>

      {/* GRÁFICO DE BARRAS HORIZONTAL */}
      {loading ? (
        <div className="bg-white p-10 rounded-[2rem] shadow-sm border border-gray-100 mb-8 flex justify-center text-gray-400 text-xs font-bold uppercase tracking-widest animate-pulse">
          Cargando datos...
        </div>
      ) : data.length > 0 ? (
        <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100 mb-8 h-[600px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" hide />
              <YAxis 
                type="category" 
                dataKey="producto" 
                axisLine={false} 
                tickLine={false} 
                fontSize={10} 
                width={150} 
                tick={{fontSize: 10}}
              />
              <Tooltip formatter={(value) => formatNumber(value)} cursor={{ fill: '#f3f4f6' }} />
              <Bar dataKey="total_ventas" fill="#87be00" radius={[0, 8, 8, 0]} barSize={20} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="bg-white p-10 rounded-[2rem] shadow-sm border border-gray-100 mb-8 flex justify-center text-gray-400 text-[10px] font-black uppercase tracking-widest">
          {isCleared ? "Utiliza los filtros para realizar una búsqueda" : "No hay datos disponibles para estos filtros."}
        </div>
      )}

      {/* TABLA */}
      {!isCleared && data.length > 0 && (
        <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-gray-50">
              <tr>
                <th className="p-4 text-[10px] font-black uppercase text-gray-500">Producto</th>
                <th className="p-4 text-[10px] font-black uppercase text-gray-500">Marca</th>
                <th className="p-4 text-[10px] font-black uppercase text-gray-500">Ventas</th>
                <th className="p-4 text-[10px] font-black uppercase text-gray-500">Unidades</th>
              </tr>
            </thead>
            <tbody>
              {data.map((item, idx) => (
                <tr key={idx} className="border-t hover:bg-gray-50 transition-colors">
                  <td className="p-4 text-xs font-bold text-gray-900 truncate max-w-[200px]">{item.producto}</td>
                  <td className="p-4 text-xs font-bold text-gray-500">{item.marca}</td>
                  <td className="p-4 text-xs font-bold text-[#87be00]">${formatNumber(item.total_ventas)}</td>
                  <td className="p-4 text-xs font-bold text-gray-700">{formatNumber(item.total_unidades)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default ProductReport;