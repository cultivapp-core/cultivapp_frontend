import { useState, useEffect, useMemo } from "react";
import { 
  FiSend, FiUsers, FiInfo, FiAlertTriangle, 
  FiMapPin, FiLayers, FiCheckCircle, 
  FiSearch, FiTarget, FiLoader, FiShield, FiBriefcase, FiHash
} from "react-icons/fi";
import api from "../../api/apiClient";
import { useAuth } from "../../context/AuthContext";
import toast from "react-hot-toast";

const AlertManager = () => {
  const { user: currentUser } = useAuth();
  
  const [loading, setLoading] = useState(false);
  const [fetchingData, setFetchingData] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchLocal, setSearchLocal] = useState("");

  const [users, setUsers] = useState([]);
  const [allMyLocales, setAllMyLocales] = useState([]); 

  const [form, setForm] = useState({
    title: "",
    message: "",
    type: "OPERATIVA",
    scope: "TODOS",
    localId: "",
    selectedZone: "",
    selectedTargets: [] 
  });

  useEffect(() => {
    const loadInitialData = async () => {
      if (!currentUser?.id) return; 
      
      try {
        setFetchingData(true);
        
        const isElevated = currentUser.role === 'ROOT' || currentUser.role === 'ADMIN_CLIENTE';
        
        // 🚩 CORRECCIÓN: Eliminamos la petición a /chains que daba error 500
        const promises = [
          api.get(isElevated ? `/users` : `/users?company_id=${currentUser.company_id}`)
        ];

        // Si es elevado (ROOT o Admin), traemos todos los locales. 
        if (isElevated) {
          promises.push(api.get('/locales')); 
        } else {
          promises.push(api.get(`/locales/supervisor/${currentUser.id}`));
        }

        const [uRes, lRes] = await Promise.all(promises);

        const userData = uRes?.data || uRes || [];
        const localeData = lRes?.data || lRes || [];

        setUsers(Array.isArray(userData) ? userData.filter(u => u.id !== currentUser.id && !u.deleted_at) : []);
        setAllMyLocales(Array.isArray(localeData) ? localeData : []);
        
      } catch (error) {
        console.error("Detalle del error:", error.response?.data || error.message);
        toast.error("Error al sincronizar datos");
      } finally {
        setFetchingData(false);
      }
    };
    
    loadInitialData();
  }, [currentUser]);

  const filteredUsers = useMemo(() => {
    return users.filter(u => 
      `${u.first_name} ${u.last_name}`.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [users, searchTerm]);

  const filteredLocales = useMemo(() => {
    return allMyLocales.filter(l => 
      l.cadena?.toLowerCase().includes(searchLocal.toLowerCase()) || 
      l.codigo_local?.toLowerCase().includes(searchLocal.toLowerCase()) ||
      l.direccion?.toLowerCase().includes(searchLocal.toLowerCase())
    );
  }, [allMyLocales, searchLocal]);

  const toggleUserSelection = (userId) => {
    setForm(prev => ({
      ...prev,
      selectedTargets: prev.selectedTargets.includes(userId)
        ? prev.selectedTargets.filter(id => id !== userId)
        : [...prev.selectedTargets, userId]
    }));
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!form.message) return toast.error("El mensaje es obligatorio");
    if (form.scope === 'individual' && form.selectedTargets.length === 0) return toast.error("Selecciona destinatarios");
    if (form.scope === 'local' && !form.localId) return toast.error("Selecciona un Punto de Venta");
    if (form.scope === 'ZONA' && !form.selectedZone) return toast.error("Selecciona una zona");

    setLoading(true);
    try {
      await api.post("/notifications/send-bulk", {
        title:     form.title || (form.type === "URGENTE" ? "ALERTA URGENTE" : "AVISO OPERATIVO"),
        message:   form.message,
        type:      form.type,
        scope:     form.scope,
        companyId: currentUser.company_id,   
        localId:   form.localId || null,
        targetIds: form.selectedTargets,     
      });

      toast.success("Instrucción emitida con éxito");
      setForm(prev => ({ 
        ...prev, 
        title: "", 
        message: "", 
        selectedTargets: [], 
        localId: "", 
        selectedZone: "" 
      }));
    } catch (error) {
      toast.error("Error al emitir notificación");
    } finally { 
      setLoading(false); 
    }
  };

  return (
    <div className="space-y-6 md:space-y-8 font-[Outfit] max-w-7xl mx-auto pb-10 px-3 sm:px-6">
      
      <div className="bg-white p-5 md:p-8 rounded-[2rem] md:rounded-[3rem] border border-gray-100 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4 md:gap-6">
        <div className="flex items-center gap-3 md:gap-5 w-full md:w-auto">
            <div className="w-12 h-12 md:w-14 md:h-14 shrink-0 bg-gray-900 rounded-xl md:rounded-[1.5rem] flex items-center justify-center text-[#87be00] shadow-xl">
                <FiShield className="text-xl md:text-2xl" />
            </div>
            <div className="flex-1">
                <h2 className="text-xl md:text-3xl font-black uppercase italic tracking-tighter text-gray-900 leading-none truncate">Centro Notificaciones</h2>
                <p className="text-[9px] md:text-[10px] text-gray-400 font-black uppercase tracking-[0.2em] md:tracking-[0.3em] mt-1.5 md:mt-2 flex items-center gap-1.5 italic">
                    <span className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-[#87be00] animate-pulse shrink-0"></span>
                    <span className="truncate">Emisión Instrucciones</span>
                </p>
            </div>
        </div>
        <div className="w-full md:w-auto flex items-center gap-2 bg-gray-50 px-4 md:px-6 py-2.5 md:py-3 rounded-xl md:rounded-2xl border border-gray-100 italic justify-center md:justify-start">
            <FiBriefcase className="text-gray-400 shrink-0" size={14} />
            <span className="text-[9px] md:text-[10px] font-black uppercase text-gray-500 tracking-widest truncate">
                {currentUser?.role === 'ROOT' ? 'Root Admin: ' : 'Supervisor: '} {currentUser?.first_name}
            </span>
        </div>
      </div>

      <form onSubmit={handleSend} className="grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-8">
        
        <div className="lg:col-span-8 space-y-6">
          <div className="bg-white p-5 md:p-8 rounded-[2rem] md:rounded-[3rem] border border-gray-100 shadow-sm space-y-5 md:space-y-6">
            
            <div className="space-y-3 md:space-y-4">
              <input 
                type="text" placeholder="ASUNTO DE LA INSTRUCCIÓN..."
                className="w-full bg-gray-50 border-2 border-transparent rounded-xl md:rounded-2xl px-4 md:px-6 py-3 md:py-4 text-[10px] md:text-xs font-black uppercase outline-none focus:bg-white focus:border-[#87be00]/20 transition-all shadow-inner"
                value={form.title}
                onChange={(e) => setForm({...form, title: e.target.value})}
              />
              <textarea 
                placeholder="DETALLE DE LA INSTRUCCIÓN PARA EL EQUIPO..."
                className="w-full h-32 md:h-48 bg-gray-50 border-2 border-transparent rounded-[1.5rem] md:rounded-[2rem] p-4 md:p-6 text-xs md:text-sm font-medium outline-none focus:bg-white focus:border-[#87be00]/20 resize-none transition-all shadow-inner"
                value={form.message}
                onChange={(e) => setForm({...form, message: e.target.value})}
                required
              />
            </div>

            {(form.scope === 'individual' || form.scope === 'local') && (
              <div className="space-y-4 pt-5 md:pt-6 border-t border-gray-100 animate-in fade-in slide-in-from-top-4">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 px-2">
                  <p className="text-[9px] md:text-[10px] font-black text-gray-900 uppercase italic tracking-widest flex items-center gap-2">
                    {form.scope === 'individual' ? <FiUsers className="text-[#87be00]" /> : <FiMapPin className="text-[#87be00]" />}
                    {form.scope === 'individual' ? `Personal: ${form.selectedTargets.length}` : `Punto de Venta Destino`}
                  </p>
                  <div className="relative w-full sm:w-48">
                    <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" size={12}/>
                    <input 
                      type="text" placeholder="BUSCAR..."
                      className="w-full pl-9 pr-4 py-2 bg-gray-50 rounded-xl text-[9px] font-black outline-none border border-transparent focus:border-[#87be00]/30 transition-all uppercase"
                      value={form.scope === 'individual' ? searchTerm : searchLocal}
                      onChange={(e) => form.scope === 'individual' ? setSearchTerm(e.target.value) : setSearchLocal(e.target.value)}
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-64 md:max-h-80 overflow-y-auto p-3 md:p-5 bg-gray-50 rounded-[1.5rem] md:rounded-[2.5rem] border border-gray-100 shadow-inner">
                  {fetchingData ? (
                    <div className="col-span-full py-10 md:py-16 flex flex-col items-center justify-center"><FiLoader className="animate-spin text-[#87be00]" size={24}/></div>
                  ) : form.scope === 'individual' ? (
                    filteredUsers.map(u => (
                      <button key={u.id} type="button" onClick={() => toggleUserSelection(u.id)}
                        className={`p-3 md:p-4 rounded-xl md:rounded-2xl text-left transition-all border-2 flex items-center justify-between bg-white ${form.selectedTargets.includes(u.id) ? 'border-[#87be00] shadow-md' : 'border-transparent hover:border-gray-200'}`}>
                        <div className="flex items-center gap-2 md:gap-3 min-w-0">
                          <div className={`w-7 h-7 md:w-8 md:h-8 rounded-lg flex items-center justify-center text-[8px] md:text-[9px] font-black shrink-0 ${form.selectedTargets.includes(u.id) ? 'bg-[#87be00] text-white' : 'bg-gray-900 text-white'}`}>
                            {u.first_name?.[0]}{u.last_name?.[0]}
                          </div>
                          <div className="min-w-0">
                            <p className="text-[9px] md:text-[10px] font-black uppercase truncate leading-none">{u.first_name} {u.last_name}</p>
                            <p className="text-[7px] md:text-[8px] font-bold text-gray-400 uppercase mt-1 italic truncate">{u.role}</p>
                          </div>
                        </div>
                        {form.selectedTargets.includes(u.id) && <FiCheckCircle className="text-[#87be00] shrink-0 ml-2" size={14}/>}
                      </button>
                    ))
                  ) : (
                    filteredLocales.map(l => (
                      <button key={l.id} type="button" onClick={() => setForm({...form, localId: l.id})}
                        className={`p-3 md:p-4 rounded-xl md:rounded-2xl text-left transition-all border-2 flex items-center justify-between bg-white ${form.localId === l.id ? 'border-[#87be00] shadow-md' : 'border-transparent hover:border-gray-200'}`}>
                        <div className="flex items-center gap-2 md:gap-3 min-w-0">
                          <div className={`w-7 h-7 md:w-8 md:h-8 rounded-lg flex items-center justify-center text-[9px] md:text-[10px] shrink-0 ${form.localId === l.id ? 'bg-[#87be00] text-white' : 'bg-gray-100 text-gray-400'}`}>
                            <FiMapPin />
                          </div>
                          <div className="min-w-0">
                            <p className="text-[9px] md:text-[10px] font-black uppercase truncate leading-none italic">{l.cadena}</p>
                            <p className="text-[7px] md:text-[8px] font-bold text-gray-400 uppercase mt-1 truncate tracking-tighter">#{l.codigo_local} - {l.direccion}</p>
                          </div>
                        </div>
                        {form.localId === l.id && <FiCheckCircle className="text-[#87be00] shrink-0 ml-2" size={14}/>}
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}

            <button type="submit" disabled={loading} className="w-full relative py-3 md:py-4 rounded-xl md:rounded-2xl bg-[#87be00] text-white text-[10px] md:text-[11px] font-black uppercase italic tracking-[0.2em] shadow-xl hover:bg-gray-900 transition-all flex items-center justify-center gap-2 md:gap-3">
               {loading ? <FiLoader className="animate-spin" /> : <FiSend />}
               Emitir Instrucción
            </button>
          </div>
        </div>

        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white p-5 md:p-7 rounded-[2rem] md:rounded-[3rem] border border-gray-100 shadow-sm space-y-5 md:space-y-6">
            <p className="text-[8px] md:text-[9px] font-black uppercase text-[#87be00] tracking-[0.2em] italic text-center">Configuración de Alcance</p>
            <div className="grid grid-cols-2 gap-2 md:gap-3">
               {[
                 { id: 'TODOS', label: 'Empresa', icon: <FiLayers size={16}/> },
                 { id: 'individual', label: 'Personal', icon: <FiUsers size={16}/> },
                 { id: 'local', label: 'Punto Venta', icon: <FiMapPin size={16}/> },
                 { id: 'ZONA', label: 'Zona', icon: <FiTarget size={16}/> }
               ].map(opt => (
                 <button key={opt.id} type="button" onClick={() => setForm({...form, scope: opt.id, selectedTargets: [], localId: "", selectedZone: ""})}
                    className={`p-3 md:p-4 rounded-xl md:rounded-[1.8rem] flex flex-col items-center gap-1.5 md:gap-2 border-2 transition-all duration-300 ${form.scope === opt.id ? 'border-[#87be00] bg-[#87be00]/5 text-gray-900 shadow-sm' : 'border-transparent bg-gray-50 text-gray-400 hover:bg-gray-100'}`}
                 >
                    <div className="md:scale-110">{opt.icon}</div>
                    <span className="text-[8px] md:text-[9px] font-black uppercase tracking-tighter italic">{opt.label}</span>
                 </button>
               ))}
            </div>

            {form.scope === 'ZONA' && (
              <select className="w-full p-3 md:p-4 bg-gray-50 rounded-xl md:rounded-2xl text-[9px] md:text-[10px] font-black uppercase outline-none border-2 border-transparent focus:border-[#87be00]/30 transition-all animate-in slide-in-from-right-4"
                value={form.selectedZone} onChange={(e) => setForm({...form, selectedZone: e.target.value})}>
                <option value="">Seleccionar Zona</option>
                <option value="Metropolitana">Región Metropolitana</option>
                <option value="Norte">Zona Norte</option>
                <option value="Sur">Zona Sur</option>
              </select>
            )}
          </div>

          <div className="bg-white p-5 md:p-7 rounded-[2rem] md:rounded-[3rem] border border-gray-100 shadow-sm space-y-4 md:space-y-5">
            <p className="text-[8px] md:text-[9px] font-black uppercase text-gray-400 tracking-[0.2em] md:tracking-widest text-center italic">Prioridad del Sistema</p>
            <div className="flex flex-col sm:flex-row bg-transparent sm:bg-gray-50 p-0 sm:p-2 rounded-xl sm:rounded-[1.5rem] gap-2">
              {['OPERATIVA', 'URGENTE'].map(t => (
                <button key={t} type="button" onClick={() => setForm({...form, type: t})}
                  className={`flex-1 py-2.5 md:py-3 rounded-xl text-[8px] md:text-[9px] font-black uppercase transition-all duration-300 flex items-center justify-center gap-2 ${form.type === t ? 'bg-gray-900 text-[#87be00] shadow-md' : 'bg-gray-50 sm:bg-transparent text-gray-400 hover:text-gray-600'}`}>
                  {t === 'URGENTE' ? <FiAlertTriangle size={12} className="text-red-500 md:scale-110" /> : <FiInfo size={12} className="md:scale-110" />} 
                  {t}
                </button>
              ))}
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};

export default AlertManager;