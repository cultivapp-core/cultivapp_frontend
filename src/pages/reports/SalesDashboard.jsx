import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import api from "../../api/apiClient"; 

const COLORS = ['#87be00', '#76a600', '#a0d635', '#d4edaa'];

const ChartCard = ({ title, data, dataKey }) => {
  // Verificación robusta: aseguramos que sea un array y tenga contenido
  if (!data || !Array.isArray(data) || data.length === 0) {
    return (
      <div className="bg-white p-6 rounded-[2rem] border border-gray-100 h-64 flex flex-col items-center justify-center">
        <h4 className="text-[10px] font-black text-gray-400 uppercase mb-2">{title}</h4>
        <p className="text-[10px] text-gray-300">SIN DATOS PARA MOSTRAR</p>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100">
      <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-6">{title}</h4>
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <XAxis dataKey="label" fontSize={10} tickLine={false} axisLine={false} />
            <YAxis fontSize={10} tickLine={false} axisLine={false} />
            <Tooltip />
            <Bar dataKey={dataKey} radius={[8, 8, 0, 0]}>
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

const SalesDashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await api.get("/reports/sales-summary");
        
        // 🚩 MEJORA: Verificamos dónde está la data realmente
        // Si response.data es undefined, intentamos usar response directamente
        const finalData = response?.data || response;
        
        console.log("Datos asignados al estado:", finalData); 
        setData(finalData);
      } catch (error) {
        console.error("Error fetching:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) return <div className="p-10 text-center text-gray-400">Cargando métricas...</div>;

  return (
    <div className="p-6 md:p-8 font-[Outfit]">
       <h3 className="text-xl font-black text-gray-900 mb-8">Resumen de Ventas</h3>
       <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <ChartCard title="Ventas por Local" data={data?.byLocal} dataKey="total" />
        <ChartCard title="Ventas por Producto" data={data?.byProduct} dataKey="total" />
        <ChartCard title="Ventas por Cadena" data={data?.byChain} dataKey="total" />
        <ChartCard title="Ventas por Operario" data={data?.byOperator} dataKey="total" />
       </div>
    </div>
  );
};

export default SalesDashboard;