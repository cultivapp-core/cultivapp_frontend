import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom"; 
import { FiMapPin, FiPlay, FiClock, FiSend, FiCheckCircle } from "react-icons/fi";
import api from "../../api/apiClient";
import toast from "react-hot-toast";
import { useAuth } from "../../context/AuthContext";

const UserHome = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [allTasks, setAllTasks] = useState([]); 
  const [displayTasks, setDisplayTasks] = useState([]); 
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null); 
  const [selectedDate, setSelectedDate] = useState(new Date());

  const fetchData = useCallback(async () => {
    const token = localStorage.getItem("token");
    if (!token || !user) return;
    try {
      setLoading(true);
      const dateStr = selectedDate.toLocaleDateString('en-CA');
      // 🚩 La API debe devolver 'visit_number' en este endpoint
      const data = await api.get(`/routes/my-tasks?date=${dateStr}`);
      setAllTasks(Array.isArray(data) ? data : []);
    } catch (error) {
      if (error.status !== 401) toast.error("Error al cargar agenda");
    } finally {
      setLoading(false);
    }
  }, [user, selectedDate]);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    const dateStr = selectedDate.toLocaleDateString('en-CA'); 
    const filtered = allTasks.filter(t => {
        const taskDate = t.visit_date ? new Date(t.visit_date).toLocaleDateString('en-CA') : null;
        return taskDate === dateStr || (t.is_recurring && t.day_of_week === (selectedDate.getDay() || 7));
    });
    setDisplayTasks(filtered);
  }, [selectedDate, allTasks]);

  const handleStartVisit = async (taskId) => {
    if (!navigator.geolocation) return toast.error("GPS no disponible");
    setActionLoading(taskId); 
    const toastId = toast.loading("Validando GPS...");
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          await api.post(`/routes/${taskId}/check-in`, {
            lat_in: position.coords.latitude,
            lng_in: position.coords.longitude
          });
          toast.success("Visita iniciada", { id: toastId });
          navigate(`/usuario/reporte/${taskId}`);
        } catch (error) {
          toast.error(error.response?.data?.message || "Error al iniciar", { id: toastId });
        } finally { setActionLoading(null); }
      },
      () => { toast.error("Activa el GPS", { id: toastId }); setActionLoading(null); },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const getWeekDays = () => {
    const days = [];
    const baseDate = new Date(selectedDate);
    const day = baseDate.getDay();
    const diff = baseDate.getDate() - day + (day === 0 ? -6 : 1); 
    const monday = new Date(baseDate.setDate(diff));
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      days.push(d);
    }
    return days;
  };

  if (!user || (loading && allTasks.length === 0)) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-white">
        <div className="w-10 h-10 border-4 border-gray-100 border-t-[#87be00] rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F9FA] pb-24 font-[Outfit]">
      <header className="bg-white px-5 pt-10 pb-5 flex items-center justify-between sticky top-0 z-30 border-b border-gray-100">
        <div>
          <p className="text-[10px] font-black text-[#87be00] uppercase tracking-widest">Cultiva</p>
          <h1 className="text-xl font-black text-gray-900 leading-none">Mi Agenda</h1>
        </div>
        <div className="text-right">
          <p className="text-[10px] font-bold text-gray-400 uppercase">{selectedDate.toLocaleDateString('es-CL', { month: 'short' })}</p>
          <p className="text-lg font-black text-gray-800 leading-none">{selectedDate.getFullYear()}</p>
        </div>
      </header>

      <main className="p-4 space-y-6 max-w-md mx-auto">
        {/* CALENDARIO */}
        <section className="bg-white p-3 rounded-3xl shadow-sm border border-gray-50">
          <div className="grid grid-cols-7 gap-1">
            {getWeekDays().map((date, idx) => {
              const isSelected = date.toLocaleDateString() === selectedDate.toLocaleDateString();
              return (
                <button key={idx} onClick={() => setSelectedDate(date)} className={`flex flex-col items-center py-3 rounded-2xl transition-all ${isSelected ? 'bg-black text-white shadow-lg' : 'bg-transparent text-gray-400'}`}>
                  <span className="text-[8px] font-bold uppercase mb-1">{date.toLocaleDateString('es-CL', { weekday: 'short' }).substring(0,2)}</span>
                  <span className="text-sm font-black">{date.getDate()}</span>
                </button>
              );
            })}
          </div>
        </section>

        {/* LISTADO */}
        <section className="space-y-4">
          {displayTasks.length === 0 ? (
            <div className="text-center py-20 text-gray-300 uppercase text-[10px] font-bold tracking-widest">No hay visitas</div>
          ) : (
            displayTasks.map((task) => {
              const isPending = task.status === 'PENDING' || task.status === 'PENDIENTE';
              const isInProgress = task.status === 'IN_PROGRESS' || task.status === 'EN_PROCESO';
              const isCompleted = task.status === 'COMPLETED' || task.status === 'FINALIZADO';

              return (
                <div key={task.id} className={`bg-white p-5 rounded-[2rem] shadow-sm border border-gray-100 ${isCompleted ? 'opacity-70' : ''}`}>
                  <div className="flex justify-between items-start mb-4">
                    <div className="max-w-[70%]">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] font-black text-[#87be00] flex items-center gap-1">
                           <FiClock size={12}/> {task.start_time?.slice(0, 5)}
                        </span>
                        {isCompleted && <span className="text-[8px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full font-bold uppercase">Completado</span>}
                      </div>
                      
                      <h2 className="text-lg font-black text-gray-800 uppercase leading-none truncate">{task.cadena}</h2>
                      
                      {/* 🚩 VISUALIZACIÓN DEL NÚMERO DE VISITA (ESTILO BLUE BADGE) */}
                      <div className="mt-2 mb-1">
                        <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-100 italic tracking-tighter">
                          N° de Visita: {task.visit_number || 'S/N'}
                        </span>
                      </div>
                      
                      <p className="text-[9px] font-bold text-gray-400 uppercase mt-2 truncate">{task.direccion}</p>
                    </div>
                    <div className={`w-3 h-3 rounded-full ${isPending ? 'bg-orange-400' : isInProgress ? 'bg-blue-500 animate-pulse' : 'bg-[#87be00]'}`}></div>
                  </div>

                  <div className="flex gap-2">
                    {isCompleted ? (
                      <div className="flex-1 bg-gray-50 text-gray-400 py-4 rounded-2xl text-[10px] font-black uppercase flex items-center justify-center gap-2 border border-gray-100">
                        <FiCheckCircle size={16}/> Reporte Finalizado
                      </div>
                    ) : isPending ? (
                      <button onClick={() => handleStartVisit(task.id)} className="flex-1 bg-black text-white py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 active:bg-[#87be00]">
                        <FiPlay size={16}/> Iniciar
                      </button>
                    ) : (
                      <button onClick={() => navigate(`/usuario/reporte/${task.id}`)} className="flex-1 bg-blue-600 text-white py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2">
                        <FiSend size={16}/> Continuar
                      </button>
                    )}
                    
                    <a 
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(task.direccion)}`} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="bg-gray-100 text-gray-900 p-4 rounded-2xl active:bg-black active:text-white"
                    >
                      <FiMapPin size={18}/>
                    </a>
                  </div>
                </div>
              );
            })
          )}
        </section>
      </main>
    </div>
  );
};

export default UserHome;