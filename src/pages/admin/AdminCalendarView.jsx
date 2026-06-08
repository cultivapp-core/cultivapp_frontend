import { useState, useEffect, useRef } from "react";
import { FiChevronLeft, FiChevronRight, FiPlus, FiUploadCloud } from "react-icons/fi";
import api from "../../api/apiClient";
import toast from "react-hot-toast";
import * as XLSX from "xlsx";

const AdminCalendarView = ({ onSelectDate }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [routes, setRoutes] = useState([]);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef(null);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  
  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const blanks = Array.from({ length: firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1 });
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  const fetchMonthRoutes = async () => {
    try {
      setLoading(true);
      const data = await api.get("/routes"); 
      setRoutes(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("❌ Error al cargar rutas:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMonthRoutes();
  }, [currentDate]);

  const handleImportExcel = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        setLoading(true);
        const bstr = evt.target.result;
        const wb = XLSX.read(bstr, { type: "binary" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const excelData = XLSX.utils.sheet_to_json(ws);

        const diasMap = [
          { key: "lunes", val: 1 }, { key: "martes", val: 2 },
          { key: "miercoles", val: 3 }, { key: "jueves", val: 4 },
          { key: "viernes", val: 5 }, { key: "sabadodomingo", val: 6 }
        ];

        const routesToUpload = [];
        excelData.forEach(row => {
          const rut = row["Rut 2"];
          const centerCode = row["center_code"];
          if (!rut || rut === "#VALUE!") return;
          diasMap.forEach(dia => {
            if (row[dia.key] && parseFloat(row[dia.key]) > 0) {
              routesToUpload.push({
                rut_mercaderista: String(rut).trim(),
                codigo_local: String(centerCode).trim(),
                day_of_week: dia.val,
                start_time: "08:00",
                end_time: "16:00"
              });
            }
          });
        });

        await api.post("/routes/bulk-create", { routes: routesToUpload });
        toast.success(`Cargadas ${routesToUpload.length} visitas correctamente`);
        fetchMonthRoutes();
      } catch (err) {
        toast.error("Error al procesar el Excel");
      } finally {
        setLoading(false);
      }
    };
    reader.readAsBinaryString(file);
  };

  return (
    <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-gray-100 font-[Outfit] relative">
      
      {/* HEADER PRINCIPAL */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 mb-10">
        <div>
          <h2 className="text-2xl font-black uppercase tracking-tight text-gray-900 leading-none">
            {currentDate.toLocaleDateString('es-CL', { month: 'long', year: 'numeric' })}
          </h2>
          <p className="text-[10px] font-bold text-[#87be00] uppercase tracking-[0.2em] mt-2">
            Panel de Planificación Estratégica
          </p>
        </div>

        {/* CONTENEDOR DE ACCIONES (AQUÍ ESTÁ EL BOTÓN) */}
        <div className="flex flex-wrap items-center gap-4 w-full lg:w-auto">
          
          {/* INPUT DE ARCHIVO OCULTO */}
          <input 
            type="file" 
            ref={fileInputRef} 
            className="hidden" 
            accept=".xlsx, .xls" 
            onChange={handleImportExcel} 
          />
          
          {/* BOTÓN IMPORTAR (ALTA VISIBILIDAD) */}
          <button 
            type="button"
            onClick={() => {
                console.log("Click en importar"); // Log para debug en consola
                fileInputRef.current?.click();
            }}
            className="z-50 flex items-center gap-3 px-8 py-4 bg-[#87be00] text-white rounded-2xl text-[11px] font-black uppercase tracking-widest hover:bg-[#76a600] active:scale-95 transition-all shadow-xl shadow-[#87be00]/30"
          >
            <FiUploadCloud size={18} strokeWidth={3}/> 
            {loading ? "Procesando..." : "Importar Planificación"}
          </button>

          {/* NAVEGACIÓN DE MESES */}
          <div className="flex gap-2 bg-gray-100 p-1.5 rounded-2xl">
            <button 
                onClick={() => setCurrentDate(new Date(year, month - 1))} 
                className="p-3 bg-white rounded-xl shadow-sm text-gray-500 hover:text-black transition-colors"
            >
                <FiChevronLeft size={20}/>
            </button>
            <button 
                onClick={() => setCurrentDate(new Date(year, month + 1))} 
                className="p-3 bg-white rounded-xl shadow-sm text-gray-500 hover:text-black transition-colors"
            >
                <FiChevronRight size={20}/>
            </button>
          </div>
        </div>
      </div>

      {/* GRID DEL CALENDARIO */}
      <div className="grid grid-cols-7 gap-3">
        {['Lunes', 'Martes', 'Miérc', 'Jueves', 'Viernes', 'Sáb', 'Dom'].map(d => (
          <div key={d} className="text-center text-[10px] font-black text-gray-400 uppercase py-2 tracking-widest">{d}</div>
        ))}
        
        {blanks.map((_, i) => (
          <div key={`b-${i}`} className="h-28 bg-gray-50/20 rounded-[1.5rem] border border-dashed border-gray-100"></div>
        ))}
        
        {days.map(day => {
          const cellDate = new Date(year, month, day);
          const cellDateStr = cellDate.toISOString().split('T')[0];
          const jsDay = cellDate.getDay();
          const cellDayOfWeek = jsDay === 0 ? 7 : jsDay;

          const dayRoutes = routes.filter(r => {
            const activeDays = Array.isArray(r.days_array) ? r.days_array.map(Number) : [Number(r.day_of_week)];
            return activeDays.includes(cellDayOfWeek);
          });
          
          return (
            <div 
              key={day} 
              onClick={() => onSelectDate(cellDateStr)}
              className="h-28 p-4 bg-gray-50/40 rounded-[2rem] border-2 border-transparent hover:border-[#87be00]/40 hover:bg-white hover:shadow-lg transition-all cursor-pointer group relative overflow-hidden"
            >
              <span className={`text-sm font-black ${dayRoutes.length > 0 ? 'text-black' : 'text-gray-300'}`}>{day}</span>
              
              <div className="mt-2 space-y-1.5">
                {dayRoutes.slice(0, 2).map((r, idx) => (
                  <div key={idx} className="text-[7.5px] bg-[#87be00] text-white px-2 py-1 rounded-lg font-extrabold uppercase truncate shadow-sm">
                    {r.first_name}
                  </div>
                ))}
                {dayRoutes.length > 2 && (
                    <div className="text-[8px] text-gray-400 font-bold pl-1">+{dayRoutes.length - 2}</div>
                )}
              </div>
              <div className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-all bg-black text-white p-1.5 rounded-xl"><FiPlus size={12}/></div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default AdminCalendarView;