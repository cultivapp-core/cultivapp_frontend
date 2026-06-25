import React, { useEffect, useState, useMemo } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';
import api from "../../api/apiClient";

const GeoChainReport = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ regiones: [], comunas: [], cadenas: [], mercaderistas: [] });
  
  const [selected, setSelected] = useState({ 
    start_date: '', 
    end_date: '', 
    region: '', 
    cadena: '', 
    mercaderista: '' 
  });

  const formatNumber = (num) => Number(num || 0).toLocaleString();
  const COLORS = ["#87be00", "#3b82f6", "#f59e0b", "#ef4444", "#3b82f6", "#8b5cf6", "#ec4899"];

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const item = payload[0].payload;
      return (
        <div className="bg-white p-3 border border-gray-100 shadow-xl rounded-xl">
          {item.codigo_local && (
             <p className="text-[10px] font-black uppercase text-gray-400">Local: {item.codigo_local}</p>
          )}
          <p className="text-xs font-bold text-gray-900 mb-2">{item.label || item.region}</p>
          {payload.map((entry, index) => (
             <p key={index} className="text-xs font-bold" style={{ color: entry.color }}>
               {entry.name}: ${formatNumber(entry.value)}
             </p>
          ))}
        </div>
      );
    }
    return null;
  };

  const isDrillDown = selected.region !== '' && selected.cadena !== '';

  const chartData = useMemo(() => {
    if (isDrillDown) {
      return data.map(item => ({
        label: item.comuna,
        ventas: Number(item.total_ventas),
        ventas_brutas: Number(item.total_ventas_brutas),
        codigo_local: item.codigo_local
      }));
    } else {
      const map = {};
      data.forEach(item => {
        if (!map[item.region]) map[item.region] = { region: item.region };
        map[item.region][item.cadena] = (map[item.region][item.cadena] || 0) + Number(item.total_ventas);
      });
      return Object.values(map);
    }
  }, [data, isDrillDown]);

  const uniqueChains = useMemo(() => Array.from(new Set(data.map(d => d.cadena))), [data]);

  // Recarga los filtros disponibles si cambia la región o la cadena
  useEffect(() => {
    const loadFilters = async () => {
      try {
        const params = {
          region: selected.region,
          cadena: selected.cadena
        };
        const res = await api.get("/sales/report/filters", { params });
        setFilters(res || { regiones: [], comunas: [], cadenas: [], mercaderistas: [] });
      } catch (error) {
        console.error("Error cargando filtros dinámicos:", error);
      }
    };
    loadFilters();
  }, [selected.region, selected.cadena]);

  // Obtiene los datos del gráfico
  useEffect(() => {
    const fetchData = async () => {
      // 🚩 Validación: Si todos los filtros están vacíos, no buscamos datos
      const hasActiveFilters = Object.values(selected).some(val => val !== '');
      if (!hasActiveFilters) {
        setData([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      const params = {
        region: selected.region,
        cadena: selected.cadena,
        mercaderista: selected.mercaderista,
        start_date: selected.start_date,
        end_date: selected.end_date
      };
      
      try {
        const result = await api.get("/sales/report/geo-chain", { params });
        setData(Array.isArray(result) ? result : []);
      } catch (error) {
        console.error("Error obteniendo datos", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [selected]);

  // 🚩 Función para limpiar y vaciar la tabla/gráfico
  const handleClear = () => {
    setSelected({ start_date: '', end_date: '', region: '', cadena: '', mercaderista: '' });
    setData([]);
  };

  return (
    <div className="p-6 md:p-10 font-[Outfit]">
      <h2 className="text-2xl font-black text-gray-900 uppercase italic mb-8">Performance Geográfica y Canal</h2>

      {/* FILTROS */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-8 bg-white p-4 rounded-[1.5rem] border border-gray-100 shadow-sm">
        <div className="flex flex-col">
            <label className="text-[9px] font-black uppercase text-gray-400 mb-1">Desde</label>
            <input type="date" className="p-2 border rounded-xl text-[10px] uppercase font-bold" value={selected.start_date} onChange={(e) => setSelected({...selected, start_date: e.target.value})} />
        </div>
        <div className="flex flex-col">
            <label className="text-[9px] font-black uppercase text-gray-400 mb-1">Hasta</label>
            <input type="date" className="p-2 border rounded-xl text-[10px] uppercase font-bold" value={selected.end_date} onChange={(e) => setSelected({...selected, end_date: e.target.value})} />
        </div>
        
        <select className="p-2 border rounded-xl text-[10px] uppercase font-bold self-end" value={selected.region} onChange={(e) => setSelected({...selected, region: e.target.value, mercaderista: ''})}>
          <option value="">Región</option>{filters.regiones.map(r => <option key={r} value={r}>{r}</option>)}
        </select>
        
        <select className="p-2 border rounded-xl text-[10px] uppercase font-bold self-end" value={selected.cadena} onChange={(e) => setSelected({...selected, cadena: e.target.value, mercaderista: ''})}>
          <option value="">Cadena</option>{filters.cadenas.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        
        {/* 🚩 Condición: Solo aparece si hay cadena seleccionada y tiene mercaderistas */}
        {selected.cadena !== '' && filters.mercaderistas && filters.mercaderistas.length > 0 ? (
          <select className="p-2 border rounded-xl text-[10px] uppercase font-bold self-end" value={selected.mercaderista} onChange={(e) => setSelected({...selected, mercaderista: e.target.value})}>
            <option value="">Mercaderista</option>{filters.mercaderistas.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        ) : (
          <div></div> /* Espaciador para mantener el diseño de la cuadrícula */
        )}
        
        <button onClick={handleClear} className="bg-gray-900 text-white rounded-xl text-[10px] font-black uppercase h-[42px] self-end hover:bg-gray-800 transition-colors">
          Limpiar
        </button>
      </div>

      {/* GRÁFICO */}
      {data.length > 0 && (
        <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100 mb-8 h-[400px] w-full animate-in fade-in duration-500">
          <h3 className="text-[10px] font-black text-gray-400 uppercase mb-4">{isDrillDown ? "Comparativa Venta Neta vs Bruta" : "Tendencia por Región"}</h3>
          <ResponsiveContainer width="100%" height="100%">
            {isDrillDown ? (
              <LineChart data={chartData} margin={{ top: 20, right: 30, bottom: 20, left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                <XAxis dataKey="label" axisLine={false} tickLine={false} fontSize={10} />
                <YAxis axisLine={false} tickLine={false} fontSize={10} tickFormatter={(val) => `$${(val/1000000).toFixed(1)}M`} />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Line name="Venta Neta" type="monotone" dataKey="ventas" stroke="#87be00" strokeWidth={3} dot={{ r: 6 }} />
                <Line name="Venta Bruta" type="monotone" dataKey="ventas_brutas" stroke="#3b82f6" strokeWidth={3} dot={{ r: 6 }} />
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
      {data.length > 0 && (
        <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 overflow-hidden animate-in fade-in duration-500">
          <table className="w-full text-left">
            <thead className="bg-gray-50">
              <tr>
                <th className="p-4 text-[10px] font-black uppercase text-gray-500">Región</th>
                <th className="p-4 text-[10px] font-black uppercase text-gray-500">Comuna</th>
                <th className="p-4 text-[10px] font-black uppercase text-gray-500">Cadena</th>
                <th className="p-4 text-[10px] font-black uppercase text-gray-500">Código</th>
                <th className="p-4 text-[10px] font-black uppercase text-gray-500">Venta Neta</th>
                <th className="p-4 text-[10px] font-black uppercase text-gray-500">Venta Bruta</th>
              </tr>
            </thead>
            <tbody>
              {data.map((item, idx) => (
                <tr key={idx} className="border-t hover:bg-gray-50">
                  <td className="p-4 text-xs font-bold text-gray-900">{item.region}</td>
                  <td className="p-4 text-xs font-bold text-gray-700">{item.comuna}</td>
                  <td className="p-4 text-xs font-bold text-gray-700">{item.cadena}</td>
                  <td className="p-4 text-xs font-bold text-gray-500">{item.codigo_local}</td>
                  <td className="p-4 text-xs font-bold text-[#87be00]">${formatNumber(item.total_ventas)}</td>
                  <td className="p-4 text-xs font-bold text-blue-600">${formatNumber(item.total_ventas_brutas)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      
      {/* MENSAJE DE ESPERA CUANDO NO HAY FILTROS */}
      {!loading && data.length === 0 && (
        <div className="text-center p-10 mt-10">
          <p className="text-gray-400 font-bold uppercase text-[10px] tracking-widest">
            Aplica un filtro para visualizar los datos de desempeño
          </p>
        </div>
      )}
    </div>
  );
};

export default GeoChainReport;