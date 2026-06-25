import React, { useEffect, useState, useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import api from "../../api/apiClient";

const MercaderistaReport = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
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
      } catch (e) {
        console.error("Error cargando filtros:", e);
      }
    };
    loadFilters();
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const result = await api.get("/sales/report/mercaderistas", { params: selected });
        setData(Array.isArray(result) ? result : []);
      } catch (err) {
        console.error("Error al obtener datos:", err);
        setError("No se pudieron cargar los datos.");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [selected]);

  if (loading && data.length === 0) return <div className="text-center p-10 font-[Outfit]">Cargando métricas...</div>;

  return (
    <div className="p-6 md:p-10 font-[Outfit]">
      <h2 className="text-2xl font-black text-gray-900 uppercase italic mb-8">Performance Mercaderistas</h2>
      
      {/* BARRA DE FILTROS */}
      <div className="grid grid-cols-2 md:grid-cols-7 gap-4 mb-8 bg-white p-4 rounded-[1.5rem] border border-gray-100 shadow-sm">
        <input type="date" className="p-2 border rounded-xl text-[10px] uppercase font-bold" 
          value={selected.start_date}
          onChange={(e) => setSelected({...selected, start_date: e.target.value})} />
        <input type="date" className="p-2 border rounded-xl text-[10px] uppercase font-bold" 
          value={selected.end_date}
          onChange={(e) => setSelected({...selected, end_date: e.target.value})} />
        
        <select className="p-2 border rounded-xl text-[10px] uppercase font-bold" 
          value={selected.region}
          onChange={(e) => setSelected({...selected, region: e.target.value})}>
          <option value="">Región</option>
          {filters.regiones.map(r => <option key={r} value={r}>{r}</option>)}
        </select>

        <select className="p-2 border rounded-xl text-[10px] uppercase font-bold" 
          value={selected.cadena}
          onChange={(e) => setSelected({...selected, cadena: e.target.value})}>
          <option value="">Cadena</option>
          {filters.cadenas.map(c => <option key={c} value={c}>{c}</option>)}
        </select>

        <select className="p-2 border rounded-xl text-[10px] uppercase font-bold" 
          value={selected.mercaderista}
          onChange={(e) => setSelected({...selected, mercaderista: e.target.value})}>
          <option value="">Mercaderista</option>
          {filters.mercaderistas.map(m => <option key={m} value={m}>{m}</option>)}
        </select>

        <button 
          onClick={() => setSelected({ start_date: '', end_date: '', region: '', comuna: '', cadena: '', mercaderista: '' })}
          className="col-span-2 md:col-span-1 bg-gray-900 text-white rounded-xl text-[10px] font-black uppercase hover:bg-[#87be00] transition-colors"
        >
          Limpiar
        </button>
      </div>

      {/* GRÁFICO */}
      {data.length > 0 ? (
        <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100 mb-8 h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="mercaderista" axisLine={false} tickLine={false} fontSize={10} />
              <YAxis axisLine={false} tickLine={false} fontSize={10} tickFormatter={formatNumber} />
              <Tooltip formatter={(value) => formatNumber(value)} />
              <Bar dataKey="total_ventas" fill="#87be00" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <p className="text-gray-400 p-10 text-center">No hay datos disponibles para estos filtros.</p>
      )}

      {/* TABLA */}
      <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 overflow-hidden mt-6">
  <table className="w-full text-left">
    <thead className="bg-gray-50">
      <tr>
        <th className="p-4 text-[10px] font-black uppercase text-gray-500">Mercaderista</th>
        <th className="p-4 text-[10px] font-black uppercase text-gray-500">Venta Neta</th>
        <th className="p-4 text-[10px] font-black uppercase text-gray-500">Venta Bruta</th> {/* Nueva */}
        <th className="p-4 text-[10px] font-black uppercase text-gray-500">Unidades</th>
        <th className="p-4 text-[10px] font-black uppercase text-gray-500">Locales</th>
        <th className="p-4 text-[10px] font-black uppercase text-gray-500">Código</th> {/* Nueva */}
      </tr>
    </thead>
    <tbody>
      {data.map((item, idx) => (
        <tr key={idx} className="border-t border-gray-100 hover:bg-gray-50 transition-colors">
          <td className="p-4 text-xs font-bold text-gray-900">{item.mercaderista}</td>
          <td className="p-4 text-xs font-bold text-[#87be00]">
            ${formatNumber(item.total_ventas)}
          </td>
          <td className="p-4 text-xs font-bold text-blue-600">
            ${formatNumber(item.total_venta_bruta)}
          </td>
          <td className="p-4 text-xs font-bold text-gray-700">{formatNumber(item.total_unidades)}</td>
          <td className="p-4 text-xs font-bold text-gray-700">{formatNumber(item.locales_visitados)}</td>
          <td className="p-4 text-xs font-bold text-gray-500 max-w-[200px] truncate">
            {item.codigos_locales || '-'}
          </td>
        </tr>
      ))}
    </tbody>
  </table>
      </div>
    </div>
  );
};

export default MercaderistaReport;