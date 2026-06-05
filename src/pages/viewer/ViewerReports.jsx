import React, { useState, useEffect } from "react";
import { FiDownload, FiFilter, FiCalendar } from "react-icons/fi";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import api from "../../api/apiClient";

const ViewerReports = () => {
  const [data, setData] = useState([]); // Iniciamos como array vacío
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchReportData = async () => {
      try {
        const response = await api.get("/viewer/detailed-reports");
        // Aseguramos que tomamos la propiedad .data si existe
        const result = response.data.data || response.data || [];
        setData(result);
      } catch (err) {
        console.error("Error al obtener reportes:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchReportData();
  }, []);

  if (loading) return <div>Cargando...</div>;

  return (
    <div className="space-y-6 animate-in fade-in duration-500 font-[Outfit]">
      {/* ... (Header igual) ... */}

      {/* GRÁFICO (Aseguramos que data sea array) */}
      <div className="bg-white p-8 rounded-[2rem] border border-gray-100 min-h-[300px]">
        <h2 className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-8">Venta Neta por Cadena</h2>
        {data.length > 0 ? (
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="name" fontSize={10} />
              <YAxis fontSize={10} />
              <Tooltip />
              <Bar dataKey="sales" fill="#87be00" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : <p className="text-center text-gray-400">Sin datos para graficar</p>}
      </div>

      {/* TABLA */}
      <div className="bg-white rounded-[2rem] border border-gray-100 overflow-hidden">
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
                    <tr key={i} className="border-t border-gray-50">
                        <td className="p-6 text-[11px] font-bold">{item?.local_nombre || "N/A"}</td>
                        <td className="p-6 text-[11px] font-bold text-gray-500">{item?.name || "N/A"}</td>
                        <td className="p-6 text-[11px] font-black">${item?.sales || "0"}</td>
                    </tr>
                ))}
            </tbody>
        </table>
      </div>
    </div>
  );
};

export default ViewerReports;