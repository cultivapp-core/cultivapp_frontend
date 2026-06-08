import React, { useState } from "react";
import { FiDownload, FiFileText, FiLoader, FiCheckCircle, FiClock, FiUsers } from "react-icons/fi";
import api from "../../api/apiClient";
import { toast } from "react-hot-toast";
import * as XLSX from "xlsx";

// ─── Mapeo de columnas ───────────────────────────────────
const COLUMN_LABELS = {
  asistencia: { operario: "Operario", local: "Local", fecha: "Fecha", hora_ingreso: "Hora Ingreso", hora_salida: "Hora Salida", status: "Estado" },
  visitas: { operario: "Operario", local: "Local", fecha: "Fecha Visita", hora_ingreso: "Inicio Visita", hora_salida: "Fin Visita", duracion_min: "Duración (min)", status: "Estado" },
  gestion: { fecha: "Fecha", operario: "Operario", local: "Local", cantidad_codigos: "Cantidad EAN", codigos_ean: "Códigos EAN", producto: "Producto", marca: "Marca", task_type: "Tipo Tarea", observacion: "Observación", start_time: "Inicio Tarea", end_time: "Fin Tarea", duracion_minutos: "Duración (min)", foto_antes: "Foto Antes", foto_despues: "Foto Después" },
};

const formatDateTime = (value) => {
  if (!value) return "—";
  const d = new Date(value);
  return isNaN(d) ? value : d.toLocaleString("es-CL", { timeZone: "America/Santiago", day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
};

const formatDate = (value) => {
  if (!value) return "—";
  const d = new Date(value);
  return isNaN(d) ? value : d.toLocaleDateString("es-CL", { timeZone: "America/Santiago" });
};

const buildRows = (data, type) => {
  const labels = COLUMN_LABELS[type] || {};
  return data.map((row) => {
    const out = {};
    Object.entries(labels).forEach(([key, label]) => {
      if (!(key in row)) return;
      let val = row[key];
      if (key === "hora_ingreso" || key === "hora_salida" || key === "start_time" || key === "end_time") val = formatDateTime(val);
      else if (key === "fecha") val = formatDate(val);
      else if (key === "status") val = { PENDING: "Pendiente", COMPLETED: "Completado", IN_PROGRESS: "En curso" }[val] || val || "—";
      out[label] = val ?? "—";
    });
    return out;
  });
};

const REPORT_TYPES = [
  { value: "asistencia", label: "Asistencia", desc: "Entrada/Salida", icon: <FiUsers size={16} /> },
  { value: "visitas", label: "Visitas", desc: "Duración Visitas", icon: <FiClock size={16} /> },
  { value: "gestion", label: "Gestión", desc: "Tareas y EANs", icon: <FiCheckCircle size={16} /> },
];

const ReportsPage = () => {
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    type: "asistencia",
    startDate: new Date().toISOString().split("T")[0],
    endDate: new Date().toISOString().split("T")[0],
  });

  const handleDownload = async () => {
    if (!filters.startDate || !filters.endDate) return toast.error("Selecciona fechas");
    setLoading(true);
    try {
      const reportType = filters.type === "visitas" ? "asistencia" : filters.type;
      const response = await api.get("/reports/data", { params: { ...filters, type: reportType, _t: Date.now() } });
      let data = response || [];
      if (data.length === 0) return toast.error("Sin registros");

      if (filters.type === "visitas") {
        data = data.map((row) => ({ ...row, duracion_min: row.hora_ingreso && row.hora_salida ? Math.round((new Date(row.hora_salida) - new Date(row.hora_ingreso)) / 60000) : null }));
      }

      const rows = buildRows(data, filters.type);
      const ws = XLSX.utils.json_to_sheet(rows);
      ws["!cols"] = Object.keys(rows[0] || {}).map(() => ({ wch: 18 }));
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Informe");
      XLSX.writeFile(wb, `Informe_${filters.type}_${filters.startDate}.xlsx`);
      toast.success("Generado correctamente");
    } catch (err) { toast.error("Error al generar"); } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-gray-50/30 font-[Outfit] pb-10">
      
      {/* 🔴 HEADER RESPONSIVO: pt-20 evita el solapamiento con el botón hamburguesa en móviles */}
      <div className="pt-20 md:pt-8 px-4 md:px-8 pb-6">
        <h2 className="text-2xl md:text-3xl font-black uppercase italic text-gray-900 tracking-tighter">Centro de Informes</h2>
        <p className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-[#87be00] mt-1">Gestión de datos operativos</p>
      </div>

      <div className="px-4 md:px-8 space-y-6 max-w-4xl mx-auto">
        
        {/* SELECTOR DE TIPO (Grid responsivo: 1 col móvil, 3 col desktop) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {REPORT_TYPES.map((r) => {
            const active = filters.type === r.value;
            return (
              <button
                key={r.value}
                onClick={() => setFilters({ ...filters, type: r.value })}
                className={`flex flex-row sm:flex-col items-center sm:items-start gap-3 sm:gap-1 p-4 rounded-2xl border transition-all ${active ? "bg-gray-900 border-gray-900 text-white shadow-lg" : "bg-white border-gray-100 text-gray-500 hover:border-gray-300"}`}
              >
                <span className={active ? "text-[#87be00]" : "text-gray-400"}>{r.icon}</span>
                <div className="text-left">
                  <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-wider block">{r.label}</span>
                  <span className={`text-[8px] sm:text-[9px] font-bold block ${active ? "text-gray-300" : "text-gray-400"}`}>{r.desc}</span>
                </div>
              </button>
            );
          })}
        </div>

        {/* TARJETA DE FILTROS */}
        <div className="bg-white p-5 md:p-8 rounded-[2rem] border border-gray-100 shadow-xl shadow-gray-200/50 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[9px] font-black uppercase text-gray-400 ml-2">Inicio</label>
              <input type="date" value={filters.startDate} onChange={(e) => setFilters({ ...filters, startDate: e.target.value })} className="w-full p-3.5 bg-gray-50 rounded-xl text-xs font-bold outline-none focus:ring-2 ring-[#87be00]/20" />
            </div>
            <div className="space-y-1">
              <label className="text-[9px] font-black uppercase text-gray-400 ml-2">Fin</label>
              <input type="date" value={filters.endDate} onChange={(e) => setFilters({ ...filters, endDate: e.target.value })} className="w-full p-3.5 bg-gray-50 rounded-xl text-xs font-bold outline-none focus:ring-2 ring-[#87be00]/20" />
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {Object.values(COLUMN_LABELS[filters.type] || {}).map((col) => (
              <span key={col} className="text-[8px] font-black uppercase tracking-wider px-3 py-1 bg-[#87be00]/10 text-[#6a9400] rounded-full">{col}</span>
            ))}
          </div>

          <button
            onClick={handleDownload}
            disabled={loading}
            className="w-full bg-gray-900 text-white py-4 rounded-xl font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-3 hover:bg-black transition-all shadow-lg active:scale-[0.98] disabled:opacity-60"
          >
            {loading ? <><FiLoader className="animate-spin" size={14} /> Procesando...</> : <><FiDownload size={14} /> Descargar Informe</>}
          </button>
        </div>

        {/* INFO ADICIONAL */}
        <div className="flex items-start gap-3 p-4 bg-[#87be00]/5 rounded-xl border border-[#87be00]/10">
          <FiFileText className="text-[#87be00] shrink-0 mt-0.5" size={16} />
          <p className="text-[9px] font-bold text-gray-600 leading-tight">
            Los informes se exportan en formato .xlsx. Asegúrate de seleccionar el rango de fechas correcto antes de procesar la descarga.
          </p>
        </div>
      </div>
    </div>
  );
};

export default ReportsPage;