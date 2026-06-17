import React, { useEffect, useState, useMemo } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';
import api from "../../api/apiClient";

const GeoChainReport = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ regiones: [], comunas: [], cadenas: [], mercaderistas: [] });
  const [selected, setSelected] = useState({ date: '', region: '', cadena: '', mercaderista: '' });

  const formatNumber = (num) => Number(num || 0).toLocaleString();
  const COLORS = ["#87be00", "#1e293b", "#f59e0b", "#ef4444", "#3b82f6", "#8b5cf6", "#ec4899"];

  // 🚩 Tooltip Personalizado para mostrar el Código de Local
  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const item = payload[0].payload;
      return (
        <div className="bg-white p-3 border border-gray-100 shadow-xl rounded-xl">
          {item.codigo_local && (
             <p className="text-[10px] font-black uppercase text-gray-400">Local: {item.codigo_local}</p>
          )}
          <p className="text-xs font-bold text-gray-900">{item.label || item.region}</p>
          <p className="text-xs font-bold text-[#87be00]">Ventas: ${formatNumber(payload[0].value)}</p>
        </div>
      );
    }
    return null;
  };

  // 🚩 Lógica: Determinar si estamos en modo "Detalle" (Comunas)
  const isDrillDown = selected.region !== '' && selected.cadena !== '';

  const chartData = useMemo(() => {
    if (isDrillDown) {
      // Formato para modo Detalle (Comunas + Codigo Local)
      return data.map(item => ({
        label: item.comuna,
        ventas: Number(item.total_ventas),
        codigo_local: item.codigo_local
      }));
    } else {
      // Formato para modo General
      const map = {};
      data.forEach(item => {
        if (!map[item.region]) map[item.region] = { region: item.region };
        map[item.region][item.cadena] = (map[item.region][item.cadena] || 0) + Number(item.total_ventas);
      });
      return Object.values(map);
    }
  }, [data, isDrillDown]);

  const uniqueChains = useMemo(() => Array.from(new Set(data.map(d => d.cadena))), [data]);

  useEffect(() => {
    const loadFilters = async () => {
      const res = await api.get("/sales/report/filters");
      setFilters(res || { regiones: [], comunas: [], cadenas: [], mercaderistas: [] });
    };
    loadFilters();
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const params = {
        region: selected.region,
        cadena: selected.cadena,
        mercaderista: selected.mercaderista,
        start_date: selected.date,
        end_date: selected.date
      };
      
      const result = await api.get("/sales/report/geo-chain", { params });
      setData(Array.isArray(result) ? result : []);
      setLoading(false);
    };
    fetchData();
  }, [selected]);

  return (
    <div className="p-6 md:p-10 font-[Outfit]">
      <h2 className="text-2xl font-black text-gray-900 uppercase italic mb-8">Performance Geográfica y Canal</h2>

      {/* FILTROS */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8 bg-white p-4 rounded-[1.5rem] border border-gray-100 shadow-sm">
        <input 
          type="date" 
          className="p-2 border rounded-xl text-[10px] uppercase font-bold"
          value={selected.date}
          onChange={(e) => setSelected({...selected, date: e.target.value})} 
        />
        <select className="p-2 border rounded-xl text-[10px] uppercase font-bold" onChange={(e) => setSelected({...selected, region: e.target.value})}>
          <option value="">Todas las Regiones</option>
          {filters.regiones.map(r => <option key={r} value={r}>{r}</option>)}
        </select>
        <select className="p-2 border rounded-xl text-[10px] uppercase font-bold" onChange={(e) => setSelected({...selected, cadena: e.target.value})}>
          <option value="">Todas las Cadenas</option>
          {filters.cadenas.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select className="p-2 border rounded-xl text-[10px] uppercase font-bold" onChange={(e) => setSelected({...selected, mercaderista: e.target.value})}>
          <option value="">Mercaderista</option>
          {filters.mercaderistas.map(m => <option key={m} value={m}>{m}</option>)}
        </select>
        <button onClick={() => setSelected({ date: '', region: '', cadena: '', mercaderista: '' })}
          className="bg-gray-900 text-white rounded-xl text-[10px] font-black uppercase">Limpiar</button>
      </div>

      {/* GRÁFICO CONDICIONAL */}
      {data.length > 0 && (
        <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100 mb-8 h-[400px] w-full">
          <h3 className="text-[10px] font-black text-gray-400 uppercase mb-4">{isDrillDown ? "Ventas por Comuna" : "Tendencia por Región"}</h3>
          <ResponsiveContainer width="100%" height="100%">
            {isDrillDown ? (
              <LineChart data={chartData} margin={{ top: 20, right: 30, bottom: 20, left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                <XAxis dataKey="label" axisLine={false} tickLine={false} fontSize={10} />
                <YAxis axisLine={false} tickLine={false} fontSize={10} tickFormatter={(val) => `$${(val/1000000).toFixed(1)}M`} />
                <Tooltip content={<CustomTooltip />} />
                <Line type="monotone" dataKey="ventas" stroke="#87be00" strokeWidth={1} dot={{ r: 6, fill: "#87be00" }} />
              </LineChart>
            ) : (
              <LineChart data={chartData} margin={{ top: 20, right: 30, bottom: 20, left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                <XAxis dataKey="region" axisLine={false} tickLine={false} fontSize={10} />
                <YAxis axisLine={false} tickLine={false} fontSize={10} tickFormatter={(val) => `$${(val/1000000).toFixed(1)}M`} />
                <Tooltip content={<CustomTooltip />} />
                <Legend iconType="circle" />
                {uniqueChains.map((chain, index) => (
                  <Line key={chain} type="monotone" dataKey={chain} stroke={COLORS[index % COLORS.length]} strokeWidth={3} dot={{ r: 5 }} />
                ))}
              </LineChart>
            )}
          </ResponsiveContainer>
        </div>
      )}

      {/* TABLA */}
      <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-50">
            <tr>
              <th className="p-4 text-[10px] font-black uppercase text-gray-500">Región</th>
              <th className="p-4 text-[10px] font-black uppercase text-gray-500">Comuna</th>
              <th className="p-4 text-[10px] font-black uppercase text-gray-500">Cadena</th>
              <th className="p-4 text-[10px] font-black uppercase text-gray-500">Ventas</th>
            </tr>
          </thead>
          <tbody>
            {data.map((item, idx) => (
              <tr key={idx} className="border-t hover:bg-gray-50">
                <td className="p-4 text-xs font-bold text-gray-900">{item.region}</td>
                <td className="p-4 text-xs font-bold text-gray-700">{item.comuna}</td>
                <td className="p-4 text-xs font-bold text-gray-700">{item.cadena}</td>
                <td className="p-4 text-xs font-bold text-[#87be00]">${formatNumber(item.total_ventas)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default GeoChainReport;