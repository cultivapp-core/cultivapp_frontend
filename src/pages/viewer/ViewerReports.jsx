import React, { useState, useEffect } from "react";
import { FiRefreshCw } from "react-icons/fi";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import api from "../../api/apiClient";
import { toast } from "react-hot-toast";

const ViewerReports = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [filters, setFilters] = useState({ region_id: "", comuna_id: "", cadena: "", local_id: "" });
  const [options, setOptions] = useState({ regiones: [], comunas: [], cadenas: [], locales: [] });

  // Función para convertir el string "$1.200.000" a número 1200000 para el gráfico
  const getNumericSales = (salesStr) => {
    if (!salesStr) return 0;
    // Eliminamos puntos y símbolos de moneda para obtener el número puro
    const cleanNumber = salesStr.toString().replace(/\./g, "").replace("$", "");
    return parseFloat(cleanNumber) || 0;
  };

  // 1. Cargar opciones
  useEffect(() => {
    const fetchFilters = async () => {
      try {
        const res = await api.get("/viewer/filter-options");
        setOptions(res.data.data || res.data);
      } catch (err) { console.error("Error cargando filtros", err); }
    };
    fetchFilters();
  }, []);

  // 2. Cargar datos
  useEffect(() => {
    const fetchReportData = async () => {
      setLoading(true);
      try {
        const response = await api.get("/viewer/detailed-reports", { params: filters });
        setData(response.data.data || response.data || []);
      } catch (err) {
        toast.error("Error al cargar reportes");
      } finally {
        setLoading(false);
      }
    };
    fetchReportData();
  }, [filters]);

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    let newFilters = { ...filters, [name]: value };
    if (name === "region_id") newFilters = { ...newFilters, comuna_id: "", local_id: "" };
    if (name === "comuna_id") newFilters = { ...newFilters, local_id: "" };
    setFilters(newFilters);
  };

  const clearFilters = () => setFilters({ region_id: "", comuna_id: "", cadena: "", local_id: "" });

  return (
    <div className="space-y-6 animate-in fade-in duration-500 font-[Outfit] pb-10">
      
      {/* HEADER Y FILTROS */}
      <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm">
        <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-black text-gray-900 uppercase italic">Reportes de Visualización</h2>
            <button onClick={clearFilters} className="text-[9px] font-black text-gray-400 hover:text-[#87be00] uppercase tracking-widest flex items-center gap-2">
                <FiRefreshCw /> Limpiar
            </button>
        </div>
        
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <select name="region_id" value={filters.region_id} onChange={handleFilterChange} className="bg-gray-50 p-4 rounded-xl text-[10px] font-black uppercase outline-none">
                <option value="">Región: Todas</option>
                {options.regiones?.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
            
            <select name="comuna_id" value={filters.comuna_id} onChange={handleFilterChange} className="bg-gray-50 p-4 rounded-xl text-[10px] font-black uppercase outline-none">
                <option value="">Comuna: Todas</option>
                {options.comunas?.filter(c => !filters.region_id || c.region_id === filters.region_id).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            
            <select name="cadena" value={filters.cadena} onChange={handleFilterChange} className="bg-gray-50 p-4 rounded-xl text-[10px] font-black uppercase outline-none">
                <option value="">Cadena: Todas</option>
                {options.cadenas?.map(c => <option key={c} value={c}>{c}</option>)}
            </select>           
        </div>
      </div>

      {/* GRÁFICO */}
      <div className="bg-white p-8 rounded-[2rem] border border-gray-100 min-h-[300px]">
        <h2 className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-8">Venta Neta por Cadena y Código</h2>
        {loading ? (
            <div className="h-[250px] flex items-center justify-center text-gray-400">Cargando...</div>
        ) : data.length > 0 ? (
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              {/* Cambiado dataKey a 'label' e inclinamos texto para legibilidad */}
              <XAxis 
                dataKey="label" 
                fontSize={9} 
                angle={-45} 
                textAnchor="end" 
                height={60} 
              />
              <YAxis fontSize={10} tickFormatter={(value) => `$${(value / 1000000).toFixed(1)}M`} />
              <Tooltip formatter={(value) => `$${value.toLocaleString('es-CL')}`} />
              <Bar dataKey={(d) => getNumericSales(d.sales)} fill="#87be00" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : <p className="text-center text-gray-400">Sin datos disponibles</p>}
      </div>

      {/* TABLA */}
      <div className="bg-white rounded-[2rem] border border-gray-100 overflow-hidden shadow-sm">
        <table className="w-full text-left">
            <thead>
                <tr className="bg-gray-50/50">
                    <th className="p-6 text-[9px] font-black text-gray-400 uppercase">Local</th>
                    <th className="p-6 text-[9px] font-black text-gray-400 uppercase">Cadena</th>
                    <th className="p-6 text-[9px] font-black text-gray-400 uppercase">Venta Neta</th>
                </tr>
            </thead>
            <tbody>
                {data.map((item, i) => (
                    <tr key={i} className="border-t border-gray-50 hover:bg-gray-50 transition-colors">
                        <td className="p-6 text-[11px] font-bold">{item?.local_nombre || "N/A"}</td>
                        <td className="p-6 text-[11px] font-bold text-gray-500">{item?.name || "N/A"}</td>
                        <td className="p-6 text-[11px] font-black text-[#87be00]">${item?.sales || "0"}</td>
                    </tr>
                ))}
            </tbody>
        </table>
      </div>
    </div>
  );
};

export default ViewerReports;