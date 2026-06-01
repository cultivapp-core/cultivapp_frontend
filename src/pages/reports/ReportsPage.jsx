import { useState } from "react";
import { FiDownload, FiFileText, FiCalendar, FiFilter, FiLoader } from "react-icons/fi";
import api from "../../api/apiClient";
import { toast } from "react-hot-toast";
import * as XLSX from "xlsx";

const ReportsPage = () => {
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({ 
      type: 'asistencia', 
      startDate: new Date().toISOString().split('T')[0], 
      endDate: new Date().toISOString().split('T')[0] 
  });

  const handleDownload = async () => {
    if (!filters.startDate || !filters.endDate) {
      return toast.error("Por favor selecciona ambas fechas");
    }
    
    setLoading(true);
    try {
      const response = await api.get("/reports/data", { params: filters });
      const data = response.data;

      if (!data || data.length === 0) {
        return toast.error("No se encontraron registros para este periodo");
      }

      // Convertimos los datos JSON a hoja de Excel
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Informe");
      
      // Descarga
      XLSX.writeFile(wb, `Informe_Cultiva_${filters.type}_${filters.startDate}.xlsx`);
      toast.success("Informe generado correctamente");
    } catch (err) {
      console.error(err);
      toast.error("Error al generar el informe");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 md:p-8 font-[Outfit] max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500">
      
      {/* HEADER */}
      <div>
        <h2 className="text-3xl font-black uppercase italic text-gray-900 tracking-tighter">Centro de Informes</h2>
        <p className="text-[10px] font-black uppercase tracking-widest text-[#87be00] mt-2">
          Gestión de datos operativos y asistencia
        </p>
      </div>

      {/* TARJETA DE FILTROS */}
      <div className="bg-white p-6 md:p-8 rounded-[2.5rem] border border-gray-100 shadow-xl shadow-gray-200/50 space-y-6">
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Tipo de Reporte */}
          <div className="space-y-2">
            <label className="text-[9px] font-black uppercase text-gray-400 ml-2">Tipo de Informe</label>
            <select 
              value={filters.type}
              onChange={e => setFilters({...filters, type: e.target.value})} 
              className="w-full p-4 bg-gray-50 rounded-2xl text-xs font-bold uppercase outline-none focus:ring-2 ring-[#87be00]/20"
            >
              <option value="asistencia">Asistencia (Entrada/Salida)</option>
              <option value="gestion">Gestión de Tareas</option>
            </select>
          </div>

          {/* Fecha Inicio */}
          <div className="space-y-2">
            <label className="text-[9px] font-black uppercase text-gray-400 ml-2">Fecha Inicio</label>
            <input 
              type="date" 
              value={filters.startDate}
              onChange={e => setFilters({...filters, startDate: e.target.value})} 
              className="w-full p-4 bg-gray-50 rounded-2xl text-xs font-bold outline-none focus:ring-2 ring-[#87be00]/20" 
            />
          </div>

          {/* Fecha Fin */}
          <div className="space-y-2">
            <label className="text-[9px] font-black uppercase text-gray-400 ml-2">Fecha Fin</label>
            <input 
              type="date" 
              value={filters.endDate}
              onChange={e => setFilters({...filters, endDate: e.target.value})} 
              className="w-full p-4 bg-gray-50 rounded-2xl text-xs font-bold outline-none focus:ring-2 ring-[#87be00]/20" 
            />
          </div>
        </div>

        {/* BOTÓN DESCARGA */}
        <button 
          onClick={handleDownload} 
          disabled={loading}
          className="w-full bg-gray-900 text-white py-5 rounded-2xl font-black uppercase text-[11px] tracking-widest flex items-center justify-center gap-3 hover:bg-black transition-all shadow-lg active:scale-[0.98]"
        >
          {loading ? (
            <><FiLoader className="animate-spin" size={16}/> Procesando...</>
          ) : (
            <><FiDownload size={16}/> Descargar Excel</>
          )}
        </button>
      </div>

      {/* INFO ADICIONAL */}
      <div className="flex items-start gap-3 p-4 bg-[#87be00]/5 rounded-2xl border border-[#87be00]/10">
        <FiFileText className="text-[#87be00] shrink-0 mt-1" size={18} />
        <p className="text-[10px] font-bold text-gray-600">
          Nota: Los informes se descargan en formato Excel (.xlsx). 
          Asegúrate de seleccionar un rango de fechas válido para obtener datos precisos.
        </p>
      </div>
    </div>
  );
};

export default ReportsPage;