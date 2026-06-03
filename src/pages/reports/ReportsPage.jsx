import { useState } from "react";
import { FiDownload, FiFileText, FiLoader, FiCheckCircle, FiClock, FiUsers } from "react-icons/fi";
import api from "../../api/apiClient";
import { toast } from "react-hot-toast";
import * as XLSX from "xlsx";

// ─── Mapeo de columnas por tipo de reporte ───────────────────────────────────
const COLUMN_LABELS = {
  asistencia: {
    operario:     "Operario",
    local:        "Local",
    fecha:        "Fecha",
    hora_ingreso: "Hora Ingreso",
    hora_salida:  "Hora Salida",
    status:       "Estado",
  },
  visitas: {
    operario:     "Operario",
    local:        "Local",
    fecha:        "Fecha Visita",
    hora_ingreso: "Inicio Visita",
    hora_salida:  "Fin Visita",
    duracion_min: "Duración (min)",
    status:       "Estado",
  },
  gestion: {
    fecha:              "Fecha",
    operario:           "Operario",
    local:              "Local",
    tareas_completadas: "Tareas Completadas",
  },
};

// ─── Formatea una fecha/hora ISO a string legible ─────────────────────────────
const formatDateTime = (value) => {
  if (!value) return "—";
  const d = new Date(value);
  if (isNaN(d)) return value;
  return d.toLocaleString("es-CL", {
    timeZone: "America/Santiago",
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
};

const formatDate = (value) => {
  if (!value) return "—";
  const d = new Date(value);
  if (isNaN(d)) return value;
  return d.toLocaleDateString("es-CL", { timeZone: "America/Santiago" });
};

// ─── Construye filas del Excel con columnas renombradas ───────────────────────
const buildRows = (data, type) => {
  const labels = COLUMN_LABELS[type] || {};

  return data.map((row) => {
    const out = {};

    Object.entries(labels).forEach(([key, label]) => {
      if (!(key in row)) return;

      let val = row[key];

      if (key === "hora_ingreso" || key === "hora_salida") {
        val = formatDateTime(val);
      } else if (key === "fecha") {
        val = formatDate(val);
      } else if (key === "status") {
        const map = { PENDING: "Pendiente", COMPLETED: "Completado", IN_PROGRESS: "En curso" };
        val = map[val] ?? val ?? "—";
      } else if (val === null || val === undefined) {
        val = "—";
      }

      out[label] = val;
    });

    return out;
  });
};

// ─── Tipos de reporte disponibles ────────────────────────────────────────────
const REPORT_TYPES = [
  {
    value: "asistencia",
    label: "Asistencia",
    desc: "Entrada y salida por local",
    icon: <FiUsers size={18} />,
  },
  {
    value: "visitas",
    label: "Visitas",
    desc: "Inicio y fin de cada visita",
    icon: <FiClock size={18} />,
  },
  {
    value: "gestion",
    label: "Gestión",
    desc: "Tareas completadas por ruta",
    icon: <FiCheckCircle size={18} />,
  },
];

// ─── Componente principal ─────────────────────────────────────────────────────
const ReportsPage = () => {
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    type: "asistencia",
    startDate: new Date().toISOString().split("T")[0],
    endDate: new Date().toISOString().split("T")[0],
  });

  const handleDownload = async () => {
    if (!filters.startDate || !filters.endDate) {
      return toast.error("Por favor selecciona ambas fechas");
    }

    setLoading(true);
    try {
      // Para "visitas" usamos el mismo endpoint de asistencia
      const reportType = filters.type === "visitas" ? "asistencia" : filters.type;

      const response = await api.get("/reports/data", {
        params: { ...filters, type: reportType, _t: Date.now() },
      });

      let data = response;

      if (!data || data.length === 0) {
        return toast.error("No se encontraron registros para este periodo");
      }

      // Calcular duración si es reporte de visitas
      if (filters.type === "visitas") {
        data = data.map((row) => {
          let duracion_min = null;
          if (row.hora_ingreso && row.hora_salida) {
            const diff = new Date(row.hora_salida) - new Date(row.hora_ingreso);
            duracion_min = Math.round(diff / 60000);
          }
          return { ...row, duracion_min };
        });
      }

      const rows = buildRows(data, filters.type);

      const ws = XLSX.utils.json_to_sheet(rows);

      // Ancho automático de columnas
      const colWidths = Object.keys(rows[0] || {}).map((k) => ({
        wch: Math.max(k.length, 18),
      }));
      ws["!cols"] = colWidths;

      const wb = XLSX.utils.book_new();
      const sheetName =
        REPORT_TYPES.find((r) => r.value === filters.type)?.label ?? "Informe";
      XLSX.utils.book_append_sheet(wb, ws, sheetName);

      XLSX.writeFile(
        wb,
        `Informe_${sheetName}_${filters.startDate}_${filters.endDate}.xlsx`
      );
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
        <h2 className="text-3xl font-black uppercase italic text-gray-900 tracking-tighter">
          Centro de Informes
        </h2>
        <p className="text-[10px] font-black uppercase tracking-widest text-[#87be00] mt-2">
          Gestión de datos operativos y asistencia
        </p>
      </div>

      {/* SELECTOR DE TIPO */}
      <div className="grid grid-cols-3 gap-3">
        {REPORT_TYPES.map((r) => {
          const active = filters.type === r.value;
          return (
            <button
              key={r.value}
              onClick={() => setFilters({ ...filters, type: r.value })}
              className={`
                flex flex-col items-start gap-1 p-4 rounded-2xl border transition-all text-left
                ${active
                  ? "bg-gray-900 border-gray-900 text-white shadow-lg shadow-gray-900/20"
                  : "bg-white border-gray-100 text-gray-500 hover:border-gray-300"}
              `}
            >
              <span className={active ? "text-[#87be00]" : "text-gray-400"}>
                {r.icon}
              </span>
              <span className="text-[11px] font-black uppercase tracking-wider leading-none mt-1">
                {r.label}
              </span>
              <span className={`text-[9px] font-bold leading-tight ${active ? "text-gray-300" : "text-gray-400"}`}>
                {r.desc}
              </span>
            </button>
          );
        })}
      </div>

      {/* TARJETA DE FILTROS */}
      <div className="bg-white p-6 md:p-8 rounded-[2.5rem] border border-gray-100 shadow-xl shadow-gray-200/50 space-y-6">

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Fecha Inicio */}
          <div className="space-y-2">
            <label className="text-[9px] font-black uppercase text-gray-400 ml-2">
              Fecha Inicio
            </label>
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
              className="w-full p-4 bg-gray-50 rounded-2xl text-xs font-bold outline-none focus:ring-2 ring-[#87be00]/20"
            />
          </div>

          {/* Fecha Fin */}
          <div className="space-y-2">
            <label className="text-[9px] font-black uppercase text-gray-400 ml-2">
              Fecha Fin
            </label>
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
              className="w-full p-4 bg-gray-50 rounded-2xl text-xs font-bold outline-none focus:ring-2 ring-[#87be00]/20"
            />
          </div>
        </div>

        {/* Preview de columnas que tendrá el Excel */}
        <div className="flex flex-wrap gap-2">
          {Object.values(COLUMN_LABELS[filters.type] || {}).map((col) => (
            <span
              key={col}
              className="text-[9px] font-black uppercase tracking-wider px-3 py-1 bg-[#87be00]/10 text-[#6a9400] rounded-full"
            >
              {col}
            </span>
          ))}
        </div>

        {/* BOTÓN DESCARGA */}
        <button
          onClick={handleDownload}
          disabled={loading}
          className="w-full bg-gray-900 text-white py-5 rounded-2xl font-black uppercase text-[11px] tracking-widest flex items-center justify-center gap-3 hover:bg-black transition-all shadow-lg active:scale-[0.98] disabled:opacity-60"
        >
          {loading ? (
            <><FiLoader className="animate-spin" size={16} /> Procesando...</>
          ) : (
            <><FiDownload size={16} /> Descargar Excel</>
          )}
        </button>
      </div>

      {/* INFO ADICIONAL */}
      <div className="flex items-start gap-3 p-4 bg-[#87be00]/5 rounded-2xl border border-[#87be00]/10">
        <FiFileText className="text-[#87be00] shrink-0 mt-1" size={18} />
        <p className="text-[10px] font-bold text-gray-600">
          Los informes se descargan en formato Excel (.xlsx). El reporte de{" "}
          <span className="text-gray-900">Visitas</span> incluye inicio, fin y
          duración en minutos de cada visita realizada.
        </p>
      </div>
    </div>
  );
};

export default ReportsPage;