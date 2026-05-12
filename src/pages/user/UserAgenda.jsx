import React, { useEffect, useState, useCallback, useMemo } from "react";
import { FiMapPin, FiClock, FiLoader, FiCalendar, FiChevronLeft, FiChevronRight, FiCheckCircle } from "react-icons/fi";
import Calendar from 'react-calendar';
import api from "../../api/apiClient";
import { useAuth } from "../../context/AuthContext";
import { format, isSameDay } from 'date-fns';
import { es } from 'date-fns/locale';

import 'react-calendar/dist/Calendar.css';

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────

const parseLocalDate = (dateStr) => {
  if (!dateStr) return null;
  const [year, month, day] = dateStr.split('T')[0].split('-').map(Number);
  return new Date(year, month - 1, day);
};

const getWeekNumber = (date) => {
  const isoDay = date.getDay() === 0 ? 7 : date.getDay();
  const currentMonday = new Date(date);
  currentMonday.setDate(date.getDate() - isoDay + 1);

  const month = currentMonday.getMonth();
  const year = currentMonday.getFullYear();
  let firstMonday = new Date(year, month, 1, 12, 0, 0);
  let fmIsoDay = firstMonday.getDay() === 0 ? 7 : firstMonday.getDay();
  if (fmIsoDay !== 1) firstMonday.setDate(1 + (8 - fmIsoDay));

  const diffWeeks = Math.floor(
    (currentMonday.getTime() - firstMonday.getTime()) / (1000 * 60 * 60 * 24 * 7)
  );
  return diffWeeks < 0 ? 4 : Math.min(diffWeeks + 1, 4);
};

const taskMatchesDate = (task, date) => {
  if (task.visit_date) {
    const taskDate = parseLocalDate(task.visit_date);
    if (taskDate && isSameDay(taskDate, date)) return true;
  }
  if (task.is_recurring) {
    const dayOfWeek = date.getDay() === 0 ? 7 : date.getDay();
    const weekNumber = getWeekNumber(date);
    if (Number(task.day_of_week) === dayOfWeek && Number(task.week_number) === weekNumber) {
      return true;
    }
  }
  return false;
};

// ─────────────────────────────────────────────
// COMPONENTE
// ─────────────────────────────────────────────

const UserAgenda = () => {
  const { user } = useAuth();
  const [allTasks, setAllTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date());

  const fetchAllUserRoutes = useCallback(async () => {
    if (!user?.id) return;
    try {
      setLoading(true);
      const data = await api.get(`/routes/user/${user.id}`);
      const rawData = Array.isArray(data) ? data : (data?.data || []);
      setAllTasks(rawData);
    } catch (error) {
      console.error("Error al cargar agenda:", error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { fetchAllUserRoutes(); }, [fetchAllUserRoutes]);

  const displayTasks = useMemo(() => {
    return allTasks.filter(t => taskMatchesDate(t, selectedDate));
  }, [selectedDate, allTasks]);

  const tileContent = useCallback(({ date, view }) => {
    if (view !== 'month') return null;
    const dayTasks = allTasks.filter(t => taskMatchesDate(t, date));
    if (dayTasks.length === 0) return null;

    return (
      <div className="flex flex-col items-center w-full mt-1 px-1 overflow-hidden">
        <div className="hidden md:flex flex-col gap-1 w-full">
          {dayTasks.slice(0, 2).map((t, i) => (
            <div
              key={i}
              className="text-[7px] font-black bg-[#87be00]/10 text-[#87be00] truncate rounded px-1 uppercase italic leading-tight border border-[#87be00]/20"
            >
              {t.cadena || t.local_name || 'Local'}
            </div>
          ))}
          {dayTasks.length > 2 && (
            <span className="text-[6px] font-bold text-gray-400">+{dayTasks.length - 2} más</span>
          )}
        </div>
        <div className="md:hidden h-1.5 w-1.5 bg-[#87be00] rounded-full shadow-[0_0_5px_rgba(135,190,0,0.5)]" />
      </div>
    );
  }, [allTasks]);

  return (
    <div className="p-3 md:p-10 space-y-6 md:space-y-8 font-[Outfit] pb-24 md:pb-10">

      <header className="flex flex-row justify-between items-center gap-2 px-1">
        <div>
          <h1 className="text-2xl md:text-4xl font-black text-gray-900 uppercase italic tracking-tighter leading-none">
            Mi Agenda
          </h1>
          <p className="text-[#87be00] text-[9px] md:text-[10px] font-black uppercase tracking-[0.2em] mt-1">
            Calendario de Rutas Asignadas
          </p>
        </div>
        {loading && <FiLoader className="animate-spin text-[#87be00]" size={20} />}
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 md:gap-8 items-start">

        {/* CALENDARIO */}
        <section className="lg:col-span-7 bg-white p-4 md:p-8 rounded-[2rem] md:rounded-[3rem] shadow-xl border border-gray-100">
          <Calendar
            onChange={setSelectedDate}
            value={selectedDate}
            tileContent={tileContent}
            className="cultiva-calendar-ui"
            prevLabel={<FiChevronLeft />}
            nextLabel={<FiChevronRight />}
            formatShortWeekday={(locale, date) => format(date, 'EEEEE', { locale: es })}
            formatMonthYear={(locale, date) => format(date, 'MMMM yyyy', { locale: es })}
          />
        </section>

        {/* DETALLE DEL DÍA */}
        <section className="lg:col-span-5 space-y-4">
          <div className="bg-gray-900 p-5 md:p-8 rounded-[1.5rem] md:rounded-[2.5rem] text-white shadow-lg flex justify-between items-center relative overflow-hidden">
            <div className="relative z-10">
              <p className="text-[9px] font-black text-[#87be00] uppercase tracking-widest mb-1 italic">
                Itinerario del día
              </p>
              <h3 className="text-lg md:text-2xl font-black uppercase italic leading-none">
                {format(selectedDate, "eeee dd 'de' MMMM", { locale: es })}
              </h3>
            </div>
            <div className="text-right relative z-10">
              <span className="text-[10px] bg-[#87be00] text-white px-3 py-1 rounded-full font-black uppercase">
                {displayTasks.length} Rutas
              </span>
            </div>
            <FiCalendar className="absolute -right-4 -bottom-4 text-white/5" size={120} />
          </div>

          <div className="space-y-3">
            {displayTasks.length === 0 ? (
              <div className="bg-white border-2 border-dashed border-gray-100 rounded-[2.5rem] py-20 text-center">
                <FiCalendar size={40} className="mx-auto mb-4 text-gray-200" />
                <p className="text-[10px] font-black uppercase italic tracking-[0.2em] text-gray-300">
                  No hay visitas para esta fecha
                </p>
              </div>
            ) : (
              displayTasks.map((task) => (
                // ✅ Sin onClick, sin cursor-pointer, sin hover interactivo — solo lectura
                <div
                  key={task.id}
                  className="bg-white p-4 md:p-6 rounded-[2rem] border border-gray-100 flex justify-between items-center shadow-sm"
                >
                  <div className="flex items-center gap-4 overflow-hidden">
                    <div
                      className={`p-4 rounded-2xl shrink-0 ${
                        task.status === 'COMPLETED'
                          ? 'bg-[#87be00]/10 text-[#87be00]'
                          : 'bg-gray-50 text-gray-400'
                      }`}
                    >
                      {task.status === 'COMPLETED'
                        ? <FiCheckCircle size={20} />
                        : <FiMapPin size={20} />
                      }
                    </div>
                    <div className="overflow-hidden">
                      <div className="flex items-center gap-2 mb-1">
                        <FiClock className="text-[#87be00]" size={10} />
                        <span className="text-[10px] font-black text-gray-400 uppercase">
                          {task.start_time?.slice(0, 5) || "08:00"} HRS
                        </span>
                      </div>
                      <h4 className="text-sm md:text-base font-black text-gray-800 uppercase italic leading-none truncate tracking-tight">
                        {task.cadena || task.local_name}
                      </h4>
                      <p className="text-[9px] font-bold text-gray-400 mt-1 uppercase truncate">
                        {task.direccion || task.local_code}
                      </p>
                    </div>
                  </div>
                  {/* Badge de estado — reemplaza el botón de navegación */}
                  <div className={`px-3 py-1 rounded-xl text-[9px] font-black uppercase shrink-0 ${
                    task.status === 'COMPLETED'
                      ? 'bg-[#87be00]/10 text-[#87be00]'
                      : task.status === 'IN_PROGRESS'
                      ? 'bg-blue-50 text-blue-500'
                      : 'bg-gray-50 text-gray-400'
                  }`}>
                    {task.status === 'COMPLETED' ? 'Completado'
                      : task.status === 'IN_PROGRESS' ? 'En curso'
                      : 'Pendiente'}
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </div>

      <style>{`
        .cultiva-calendar-ui {
          width: 100% !important;
          border: none !important;
          font-family: 'Outfit', sans-serif !important;
        }
        .react-calendar__navigation button {
          font-weight: 900 !important;
          text-transform: uppercase !important;
          font-size: 14px !important;
        }
        .react-calendar__tile {
          padding: 1.5em 0.5em !important;
          font-weight: 900 !important;
          font-size: 0.9rem !important;
          border-radius: 1.5rem !important;
          min-height: 100px !important;
          display: flex !important;
          flex-direction: column !important;
          align-items: center !important;
          justify-content: flex-start !important;
          transition: all 0.3s ease;
          border: 4px solid white !important;
        }
        @media (max-width: 768px) {
          .react-calendar__tile {
            min-height: 70px !important;
            padding: 0.8em 0.2em !important;
          }
        }
        .react-calendar__tile--active {
          background: #87be00 !important;
          color: white !important;
          box-shadow: 0 10px 25px rgba(135, 190, 0, 0.4) !important;
        }
        .react-calendar__tile--active .text-\[7px\] {
          display: none !important;
        }
        .react-calendar__tile--now {
          background: #f8fafc !important;
          color: #87be00 !important;
        }
        .react-calendar__tile:enabled:hover {
          background-color: #f8fafc !important;
        }
      `}</style>
    </div>
  );
};

export default UserAgenda;