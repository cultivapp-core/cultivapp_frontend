import React, { useEffect, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import api from "../../api/apiClient";

const ProductReport = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ regiones: [], comunas: [], cadenas: [], mercaderistas: [] });
  const [selected, setSelected] = useState({ 
    start_date: '', end_date: '', region: '', comuna: '', cadena: '', mercaderista: '' 
  });

  const formatNumber = (num) => Number(num || 0).toLocaleString();

  useEffect(() => {
    const loadFilters = async () => {
      try {
        const res = await api.get("/sales/report/filters");
        setFilters(res || { regiones: [], comunas: [], cadenas: [], mercaderistas: [] });
      } catch (e) { console.error("Error cargando filtros:", e); }
    };
    loadFilters();
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const result = await api.get("/sales/report/productos", { params: selected });
        // Invertimos el orden para que los productos con más venta queden arriba en el gráfico horizontal
        const sortedData = [...(Array.isArray(result) ? result : [])].reverse();
        setData(sortedData);
      } catch (err) { console.error(err); } 
      finally { setLoading(false); }
    };
    fetchData();
  }, [selected]);

  return (
    <div className="p-6 md:p-10 font-[Outfit]">
      <h2 className="text-2xl font-black text-gray-900 uppercase italic mb-8">Performance Productos (Top 50)</h2>
      
      {/* BARRA DE FILTROS */}
      <div className="grid grid-cols-2 md:grid-cols-7 gap-4 mb-8 bg-white p-4 rounded-[1.5rem] border border-gray-100 shadow-sm">
        <input type="date" className="p-2 border rounded-xl text-[10px] uppercase font-bold" 
          onChange={(e) => setSelected({...selected, start_date: e.target.value})} />
        <input type="date" className="p-2 border rounded-xl text-[10px] uppercase font-bold" 
          onChange={(e) => setSelected({...selected, end_date: e.target.value})} />
        <select className="p-2 border rounded-xl text-[10px] uppercase font-bold" onChange={(e) => setSelected({...selected, region: e.target.value})}>
          <option value="">Región</option>
          {filters.regiones.map(r => <option key={r} value={r}>{r}</option>)}
        </select>
        <select className="p-2 border rounded-xl text-[10px] uppercase font-bold" onChange={(e) => setSelected({...selected, cadena: e.target.value})}>
          <option value="">Cadena</option>
          {filters.cadenas.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select className="p-2 border rounded-xl text-[10px] uppercase font-bold" onChange={(e) => setSelected({...selected, mercaderista: e.target.value})}>
          <option value="">Mercaderista</option>
          {filters.mercaderistas.map(m => <option key={m} value={m}>{m}</option>)}
        </select>
        <button onClick={() => setSelected({ start_date: '', end_date: '', region: '', comuna: '', cadena: '', mercaderista: '' })}
          className="col-span-2 md:col-span-1 bg-gray-900 text-white rounded-xl text-[10px] font-black uppercase">Limpiar</button>
      </div>

      {/* 🚩 GRÁFICO DE BARRAS HORIZONTAL */}
      {data.length > 0 ? (
        <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100 mb-8 h-[600px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            {/* layout="vertical" permite que las barras se dibujen de izquierda a derecha */}
            <BarChart data={data} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              {/* XAxis ahora mide los valores numéricos */}
              <XAxis type="number" hide />
              {/* YAxis ahora mide las categorías (los nombres de productos) */}
              <YAxis 
                type="category" 
                dataKey="producto" 
                axisLine={false} 
                tickLine={false} 
                fontSize={10} 
                width={150} 
                tick={{fontSize: 10}}
              />
              <Tooltip formatter={(value) => formatNumber(value)} />
              <Bar dataKey="total_ventas" fill="#87be00" radius={[0, 8, 8, 0]} barSize={20} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <p className="text-gray-400 p-10 text-center">No hay datos disponibles.</p>
      )}

      {/* TABLA */}
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
    </div>
  );
};

export default ProductReport;