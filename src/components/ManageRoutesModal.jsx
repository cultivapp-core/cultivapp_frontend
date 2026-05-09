import React, { useState, useMemo, useEffect } from "react";
import {
  FiClock, FiX, FiUser, FiBriefcase,
  FiTrash2, FiLoader, FiCheckCircle, FiLayers, FiTag, FiCalendar, FiMapPin,
} from "react-icons/fi";
import api from "../api/apiClient";
import toast from "react-hot-toast";

const DAYS_OF_WEEK = [
  { id: 1, label: "L" }, { id: 2, label: "M" }, { id: 3, label: "X" },
  { id: 4, label: "J" }, { id: 5, label: "V" }, { id: 6, label: "S" }, { id: 0, label: "D" },
];

const ROLES_TURNOS = [
  { id: "MERCADERISTA FULL", label: "Mercaderista Full Time" },
  { id: "MERCADERISTA PT",   label: "Mercaderista Part Time" },
];

const ManageRoutesModal = ({
  isOpen, onClose,
  users = [], locales = [], companies = [],
  onCreated, initialData = null,
}) => {
  const isEditing = !!initialData;
  const [loading, setLoading]     = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [turnosRaw, setTurnosRaw] = useState([]);
  const [selectedRol, setSelectedRol] = useState("");

  const userString  = localStorage.getItem("user");
  const currentUser = userString ? JSON.parse(userString) : null;
  const isRoot      = currentUser?.role?.toUpperCase() === "ROOT";

  const [filters, setFilters] = useState({ region: "", comuna: "", cadena: "" });
  const [manualTask, setManualTask] = useState({
    user_id: "", local_id: "", company_id: currentUser?.company_id || "",
    selectedDays: [], start_time: "08:00", end_time: "16:00", turno_id: "",
    visit_date: new Date().toISOString().split("T")[0],
  });

  // ── LOGICA DE CARGA (Mantenida intacta) ──
  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        const isManual = initialData.origin === "INDIVIDUAL" || !initialData.is_recurring;
        let vDate = new Date().toISOString().split("T")[0];
        if (initialData.visit_date) {
          try { vDate = new Date(initialData.visit_date).toISOString().split("T")[0]; } catch (e) {}
        }
        let days = [];
        if (initialData.scheduled_items) {
          days = [...new Set(initialData.scheduled_items.map((item) => Number(item.day)))];
        } else if (initialData.day_of_week != null) {
          days = [Number(initialData.day_of_week)];
        }
        setManualTask({
          user_id:      initialData.user_id || "",
          local_id:     initialData.local_id || "",
          company_id:   initialData.company_id || currentUser?.company_id || "",
          start_time:   initialData.start_time ? initialData.start_time.slice(0, 5) : "08:00",
          end_time:     initialData.end_time ? initialData.end_time.slice(0, 5) : "16:00",
          turno_id:     isManual ? "INDIVIDUAL" : (initialData.nombre_turno || ""),
          visit_date:   vDate,
          selectedDays: days,
        });
        if (isManual) setSelectedRol("INDIVIDUAL");
      } else {
        setManualTask({
          user_id: "", local_id: "", company_id: currentUser?.company_id || "",
          selectedDays: [], start_time: "08:00", end_time: "16:00", turno_id: "",
          visit_date: new Date().toISOString().split("T")[0],
        });
        setSelectedRol("");
        setFilters({ region: "", comuna: "", cadena: "" });
      }
    }
  }, [isOpen, initialData, currentUser?.company_id]);

  const fetchTurnos = async (companyId) => {
    try {
      const targetId = companyId || (isRoot ? manualTask.company_id : currentUser?.company_id);
      if (!targetId) { setTurnosRaw([]); return; }
      const res = await api.get(`/turnos-config?company_id=${targetId}`);
      setTurnosRaw(Array.isArray(res) ? res : []);
    } catch { setTurnosRaw([]); }
  };

  useEffect(() => {
    if (isOpen) fetchTurnos(manualTask.company_id);
  }, [isOpen, manualTask.company_id]);

  const turnosAgrupados = useMemo(() => {
    if (!selectedRol || selectedRol === "INDIVIDUAL") return [];
    const filtrados = turnosRaw.filter(
      (t) => t.categoria_rol?.toString().toUpperCase() === selectedRol.toUpperCase()
    );
    const agrupados = filtrados.reduce((acc, curr) => {
      if (!acc[curr.nombre_turno]) {
        acc[curr.nombre_turno] = {
          nombre: curr.nombre_turno,
          entrada: curr.entrada,
          salida:  curr.salida,
          dias:    [],
        };
      }
      acc[curr.nombre_turno].dias.push(curr.day_of_week);
      return acc;
    }, {});
    return Object.values(agrupados);
  }, [turnosRaw, selectedRol]);

  const handleTurnoChange = (e) => {
    const nombreTurno = e.target.value;
    if (nombreTurno === "INDIVIDUAL" || !nombreTurno) {
      setManualTask((prev) => ({ ...prev, turno_id: nombreTurno, selectedDays: [] }));
      return;
    }
    const t = turnosAgrupados.find((item) => item.nombre === nombreTurno);
    if (t) {
      setManualTask((prev) => ({
        ...prev,
        turno_id:     nombreTurno,
        start_time:   t.entrada ? t.entrada.slice(0, 5) : "08:00",
        end_time:     t.salida  ? t.salida.slice(0, 5)  : "16:00",
        selectedDays: t.dias.map(Number),
      }));
    }
  };

  const toggleDay = (dayId) => {
    setManualTask((prev) => ({
      ...prev,
      selectedDays: prev.selectedDays.includes(dayId)
        ? prev.selectedDays.filter((d) => d !== dayId)
        : [...prev.selectedDays, dayId],
    }));
  };

  const filteredUsers = useMemo(() => {
    let pool = users.filter((u) => u.role?.toUpperCase() === "USUARIO");
    if (isRoot && manualTask.company_id)
      pool = pool.filter((u) => u.company_id === manualTask.company_id);
    return pool;
  }, [users, manualTask.company_id, isRoot]);

  const filteredLocales = useMemo(
    () =>
      locales.filter(
        (l) =>
          (!filters.region  || l.region  === filters.region)  &&
          (!filters.comuna  || l.comuna  === filters.comuna)  &&
          (!filters.cadena  || l.cadena  === filters.cadena)  &&
          (!isRoot || !manualTask.company_id || l.company_id === manualTask.company_id)
      ),
    [locales, filters, isRoot, manualTask.company_id]
  );

  const uniqueRegions = useMemo(() => [...new Set(filteredLocales.map((l) => l.region))].filter(Boolean).sort(), [filteredLocales]);
  const uniqueComunas = useMemo(() => [...new Set(filteredLocales.filter((l) => !filters.region || l.region === filters.region).map((l) => l.comuna))].filter(Boolean).sort(), [filteredLocales, filters.region]);
  const uniqueCadenas = useMemo(() => [...new Set(filteredLocales.map((l) => l.cadena))].filter(Boolean).sort(), [filteredLocales]);

  const handleManualSubmit = async (e) => {
    e.preventDefault();
    const isManual = selectedRol === "INDIVIDUAL" || manualTask.turno_id === "INDIVIDUAL";
    if (!isManual && manualTask.selectedDays.length === 0) return toast.error("Selecciona los días");
    if (!manualTask.user_id || !manualTask.local_id) return toast.error("Faltan datos");

    setLoading(true);
    try {
      const data = { ...manualTask, categoria_rol: selectedRol, is_recurring: !isManual, visit_date: isManual ? manualTask.visit_date : null, origin: isManual ? "INDIVIDUAL" : "TURNO" };
      if (isEditing) await api.put(`/routes/${initialData.id}`, data);
      else await api.post("/routes", data);
      onCreated();
      onClose();
      toast.success("Operación exitosa");
    } catch (error) {
      toast.error("Error al guardar");
    } finally { setLoading(false); }
  };

  const handleDelete = async () => {
    if (!window.confirm("¿Eliminar planificación?")) return;
    setIsDeleting(true);
    try {
      await api.delete(`/routes/${initialData.id}`);
      onCreated(); onClose();
      toast.success("Eliminado");
    } catch { toast.error("Error"); }
    finally { setIsDeleting(false); }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-[150] p-4 font-[Outfit]">
      <div className="bg-white w-full max-w-xl rounded-[2.5rem] shadow-2xl border border-gray-100 overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* HEADER */}
        <div className="flex items-center justify-between px-8 py-7 bg-white border-b border-gray-50">
          <div>
            <h2 className="text-xl font-black uppercase tracking-tight text-gray-900 italic leading-none">
              {isEditing ? "Gestionar Planificación" : "Nueva Planificación"}
            </h2>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-2">Configuración de asignación mensual</p>
          </div>
          <button onClick={onClose} className="p-3 rounded-2xl text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-all">
            <FiX size={20} />
          </button>
        </div>

        {/* FORM */}
        <form onSubmit={handleManualSubmit} className="px-8 py-6 space-y-6 overflow-y-auto custom-scrollbar">
          
          {/* SECCIÓN EMPRESA (ROOT) */}
          {isRoot && (
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-[9px] font-black text-[#87be00] uppercase tracking-[0.2em] ml-1">
                <FiBriefcase size={12} /> Empresa Cliente
              </label>
              <select
                required
                className="w-full bg-gray-50 rounded-2xl px-5 py-4 text-sm font-bold border-2 border-transparent focus:border-[#87be00]/20 outline-none transition-all"
                value={manualTask.company_id}
                onChange={(e) => {
                  setManualTask({ ...manualTask, company_id: e.target.value, user_id: "", turno_id: "", selectedDays: [] });
                  setSelectedRol("");
                }}
              >
                <option value="">Seleccionar Empresa...</option>
                {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          )}

          {/* SECCIÓN ROL Y TURNO */}
          <div className="bg-gray-50/50 p-6 rounded-[2rem] border border-gray-100 space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-[9px] font-black text-blue-600 uppercase tracking-[0.2em] ml-1">
                  <FiTag size={12} /> Tipo de Rol
                </label>
                <select
                  required
                  className="w-full bg-white rounded-2xl px-5 py-4 text-sm font-bold border border-gray-100 outline-none focus:ring-4 focus:ring-blue-50 transition-all"
                  value={selectedRol}
                  onChange={(e) => {
                    setSelectedRol(e.target.value);
                    setManualTask((prev) => ({ ...prev, turno_id: "", selectedDays: [] }));
                  }}
                >
                  <option value="">Elegir Rol...</option>
                  <option value="INDIVIDUAL" className="font-black text-amber-600 italic">Visita Individual</option>
                  {ROLES_TURNOS.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
                </select>
              </div>

              <div className="space-y-2">
                <label className="flex items-center gap-2 text-[9px] font-black text-blue-600 uppercase tracking-[0.2em] ml-1">
                  <FiLayers size={12} /> Turno Maestro
                </label>
                <select
                  className="w-full bg-white rounded-2xl px-5 py-4 text-sm font-bold border border-gray-100 outline-none focus:ring-4 focus:ring-blue-50 disabled:opacity-40 transition-all"
                  value={manualTask.turno_id}
                  onChange={handleTurnoChange}
                  disabled={!selectedRol}
                >
                  <option value="">{selectedRol === "INDIVIDUAL" ? "Sin Turno" : "Elegir Turno..."}</option>
                  {selectedRol === "INDIVIDUAL" ? (
                    <option value="INDIVIDUAL">Manual (Una vez)</option>
                  ) : (
                    turnosAgrupados.map((t) => <option key={t.nombre} value={t.nombre}>{t.nombre}</option>)
                  )}
                </select>
              </div>
            </div>

            {selectedRol === "INDIVIDUAL" && (
              <div className="space-y-2 pt-1 animate-in fade-in slide-in-from-top-2">
                <label className="flex items-center gap-2 text-[9px] font-black text-amber-500 uppercase tracking-[0.2em] ml-1">
                  <FiCalendar size={12} /> Fecha Específica
                </label>
                <input
                  type="date"
                  required
                  className="w-full bg-white rounded-2xl px-5 py-4 text-sm font-bold border border-gray-100 outline-none focus:ring-4 focus:ring-amber-50 transition-all"
                  value={manualTask.visit_date}
                  onChange={(e) => setManualTask({ ...manualTask, visit_date: e.target.value })}
                />
              </div>
            )}
          </div>

          {/* REPONEDOR Y HORARIO */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-[9px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">
                <FiUser size={12} /> Reponedor
              </label>
              <select
                required
                className="w-full bg-gray-50 rounded-2xl px-5 py-4 text-sm font-bold border-2 border-transparent focus:border-gray-200 outline-none transition-all"
                value={manualTask.user_id}
                onChange={(e) => setManualTask({ ...manualTask, user_id: e.target.value })}
                disabled={isRoot && !manualTask.company_id}
              >
                <option value="">Seleccionar...</option>
                {filteredUsers.map((u) => <option key={u.id} value={u.id}>{u.first_name} {u.last_name}</option>)}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-[9px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">
                  <FiClock size={12} /> Entrada
                </label>
                <input
                  type="time" required
                  className="w-full bg-gray-50 rounded-2xl px-4 py-4 text-sm font-bold border-2 border-transparent focus:border-gray-200 outline-none transition-all"
                  value={manualTask.start_time}
                  onChange={(e) => setManualTask({ ...manualTask, start_time: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-[9px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">
                  <FiClock size={12} /> Salida
                </label>
                <input
                  type="time" required
                  className="w-full bg-gray-50 rounded-2xl px-4 py-4 text-sm font-bold border-2 border-transparent focus:border-gray-200 outline-none transition-all"
                  value={manualTask.end_time}
                  onChange={(e) => setManualTask({ ...manualTask, end_time: e.target.value })}
                />
              </div>
            </div>
          </div>

          {/* LOCAL Y FILTROS */}
          <div className="bg-gray-50/50 p-6 rounded-[2rem] border border-gray-100 space-y-4">
            <label className="flex items-center gap-2 text-[9px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">
              <FiMapPin size={12} /> Ubicación del Local
            </label>
            <div className="grid grid-cols-3 gap-2">
              {['region', 'comuna', 'cadena'].map((f) => (
                <select
                  key={f}
                  className="bg-white rounded-xl px-3 py-2.5 text-[9px] font-black outline-none border border-gray-100 uppercase transition-all"
                  value={filters[f]}
                  onChange={(e) => setFilters({ ...filters, [f]: e.target.value })}
                >
                  <option value="">{f}</option>
                  {(f === 'region' ? uniqueRegions : f === 'comuna' ? uniqueComunas : uniqueCadenas).map(v => <option key={v} value={v}>{v}</option>)}
                </select>
              ))}
            </div>
            <select
              required
              className="w-full bg-white rounded-2xl px-5 py-4 text-sm font-bold border-2 border-[#87be00]/10 outline-none focus:border-[#87be00] transition-all"
              value={manualTask.local_id}
              onChange={(e) => setManualTask({ ...manualTask, local_id: e.target.value })}
              disabled={isRoot && !manualTask.company_id}
            >
              <option value="">Elegir Local...</option>
              {filteredLocales.map((l) => <option key={l.id} value={l.id}>{l.cadena} - {l.direccion}</option>)}
            </select>
          </div>

          {/* DÍAS (Solo Turnos) */}
          {selectedRol !== "INDIVIDUAL" && (
            <div className="space-y-3">
               <label className="flex items-center gap-2 text-[9px] font-black text-[#87be00] uppercase tracking-[0.2em] ml-1">
                Días Programados
              </label>
              <div className="flex justify-between gap-1.5">
                {DAYS_OF_WEEK.map((day) => {
                  const isSel = manualTask.selectedDays.includes(day.id);
                  return (
                    <button
                      key={day.id} type="button"
                      onClick={() => toggleDay(day.id)}
                      className={`w-10 h-10 rounded-full text-[10px] font-black transition-all flex items-center justify-center
                        ${isSel ? "bg-[#87be00] text-white shadow-lg scale-110" : "bg-gray-100 text-gray-300 hover:bg-gray-200"}`}
                    >
                      {day.label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* ACCIONES FINAL */}
          <div className="flex flex-col gap-3 pt-4">
            <button
              type="submit" disabled={loading || isDeleting}
              className="w-full bg-gray-900 hover:bg-black text-white py-5 rounded-[1.5rem] font-black uppercase text-[10px] tracking-[0.2em] shadow-xl transition-all flex items-center justify-center gap-3 disabled:opacity-50"
            >
              {loading && !isDeleting ? <FiLoader className="animate-spin" /> : <FiCheckCircle size={16} />}
              {isEditing ? "Guardar Cambios" : "Confirmar Planificación"}
            </button>

            {isEditing && (
              <button
                type="button" onClick={handleDelete} disabled={loading || isDeleting}
                className="w-full bg-red-50 text-red-500 py-4 rounded-[1.5rem] font-black uppercase text-[9px] tracking-[0.2em] border border-red-100 hover:bg-red-100 transition-all flex items-center justify-center gap-2"
              >
                {isDeleting ? <FiLoader className="animate-spin" /> : <FiTrash2 size={14} />}
                {isDeleting ? "Eliminando..." : "Eliminar Ruta Definitivamente"}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};

export default ManageRoutesModal;