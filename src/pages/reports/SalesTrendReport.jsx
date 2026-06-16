import React, { useEffect, useState } from "react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import api from "../../api/apiClient";

const SalesTrendReport = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTrend = async () => {
      setLoading(true);
      try {
        const result = await api.get("/sales/report/trend");
        setData(Array.isArray(result) ? result : []);
      } catch (err) { console.error(err); } 
      finally { setLoading(false); }
    };
    fetchTrend();
  }, []);

  if (loading) return <div className="p-10 text-center">Cargando tendencia...</div>;

  return (
    <div className="p-6 md:p-10 font-[Outfit]">
      <h2 className="text-2xl font-black text-gray-900 uppercase italic mb-8">Tendencia de Ventas (Sell-Out)</h2>
      
      <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100 h-[400px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <defs>
              <linearGradient id="colorVenta" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#87be00" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#87be00" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="fecha_venta" fontSize={10} tickFormatter={(val) => val.slice(5)} />
            <YAxis fontSize={10} tickFormatter={(val) => `$${(val/1000).toFixed(0)}k`} />
            <Tooltip />
            <Area type="monotone" dataKey="total_venta" stroke="#87be00" fillOpacity={1} fill="url(#colorVenta)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default SalesTrendReport;