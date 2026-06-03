import { useState, useEffect, useMemo } from "react";
import api from "../../api/apiClient";
import { toast } from "react-hot-toast";
import { Send, Users, Store, Globe, Loader2, X, CheckCircle2, Mail, UserCircle, Search } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { FiShield } from "react-icons/fi";

const NotificationManager = () => {
  const { user } = useAuth();
  const [companies, setCompanies] = useState([]);
  const [chains, setChains] = useState([]);
  const [locales, setLocales] = useState([]);
  const [users, setUsers] = useState([]);
  
  const [loading, setLoading] = useState(false);
  const [fetchingData, setFetchingData] = useState(false);
  
  // 🔍 Nuevo estado para el buscador
  const [searchTerm, setSearchTerm] = useState("");

  const ID_CULTIVA = '0e342e01-d213-4353-b210-39a12ac335cf'; 
  
  const canSeeCompanies = 
    user?.role === 'ROOT' || 
    (user?.role === 'ADMIN_CLIENTE' && user?.company_id === ID_CULTIVA);

  const [form, setForm] = useState({
    title: "",
    message: "",
    scope: "global",
    companyId: canSeeCompanies ? "" : (user?.company_id || ""),
    chainId: "",
    localId: "",
    selectedTargets: [] 
  });

  useEffect(() => {
    if (canSeeCompanies) {
      api.get("/companies").then(res => setCompanies(res || []));
    }
  }, [canSeeCompanies]);

  useEffect(() => {
    if (form.companyId) {
      setFetchingData(true);
      api.get(`/chains?company_id=${form.companyId}`).then(res => setChains(res || []));
      api.get(`/users?company_id=${form.companyId}`).then(res => {
        setUsers(res || []);
        setFetchingData(false);
      });
    }
    setForm(prev => ({ ...prev, chainId: "", localId: "", selectedTargets: [] }));
    setSearchTerm(""); // Resetear búsqueda al cambiar de empresa
  }, [form.companyId]);

  useEffect(() => {
    if (form.chainId) {
      api.get(`/locales?chain_id=${form.chainId}`).then(res => setLocales(res || []));
    }
    setForm(prev => ({ ...prev, localId: "", selectedTargets: [] }));
  }, [form.chainId]);

  useEffect(() => {
    if (form.scope === 'local' && form.localId) {
      setFetchingData(true);
      api.get(`/users?local_id=${form.localId}`).then(res => {
        setUsers(res || []);
        setFetchingData(false);
      });
    }
    setSearchTerm(""); // Resetear búsqueda al cambiar de local
  }, [form.localId, form.scope]);

  // 🔍 Lógica de filtrado de usuarios
  const filteredUsers = useMemo(() => {
    if (!searchTerm.trim()) return users;
    
    const term = searchTerm.toLowerCase().trim();
    return users.filter(u => {
      const nameMatch = `${u.first_name || ''} ${u.last_name || ''}`.toLowerCase().includes(term);
      const emailMatch = (u.email || '').toLowerCase().includes(term);
      const rutMatch = (u.rut || '').toLowerCase().includes(term); // Asumiendo que existe u.rut
      
      return nameMatch || emailMatch || rutMatch;
    });
  }, [users, searchTerm]);

  const toggleUserSelection = (userId) => {
    setForm(prev => {
      const isSelected = prev.selectedTargets.includes(userId);
      return {
        ...prev,
        selectedTargets: isSelected 
          ? prev.selectedTargets.filter(id => id !== userId)
          : [...prev.selectedTargets, userId]
      };
    });
  };

  const getUserInfo = (u) => {
    if (!u) return { name: "Desconocido", email: "-", role: "-", rut: "-" };
    const name = `${u.first_name || ''} ${u.last_name || ''}`.trim() || "Sin nombre";
    const email = u.email || "No registra";
    const role = u.role || "Personal";
    const rut = u.rut || "";
    return { name, email, role, rut };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.scope !== 'global' && form.selectedTargets.length === 0) {
      return toast.error("Selecciona al menos un destinatario");
    }

    setLoading(true);
    try {
      await api.post("/notifications/send-bulk", {
        title: form.title,
        message: form.message,
        scope: form.scope,
        companyId: form.companyId,
        targetIds: form.selectedTargets, 
        localId: form.localId || null
      });
      
      toast.success("¡Alertas enviadas con éxito en Cultivapp!");
      setForm(prev => ({ ...prev, title: "", message: "", selectedTargets: [] }));
      setSearchTerm("");
    } catch (error) {
      toast.error("Error: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto font-[Outfit] animate-in fade-in duration-500 pb-20">
      
      <div className="bg-white rounded-[2rem] md:rounded-[3rem] p-6 md:p-10 shadow-2xl shadow-gray-200/50 border border-gray-100">
        
        <div className="mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-xl md:text-2xl font-black text-gray-900 uppercase tracking-tighter leading-tight">Generador de Alertas</h2>
            <p className="text-[9px] md:text-[10px] font-bold text-[#87be00] uppercase tracking-[0.2em] md:tracking-[0.3em]">
              {canSeeCompanies ? "Panel Maestro de Comunicaciones" : "Gestión de Alertas Internas"}
            </p>
          </div>
          {canSeeCompanies && (
            <div className="px-4 py-1.5 bg-blue-50 border border-blue-100 rounded-xl flex items-center gap-2 shrink-0">
              <FiShield className="text-blue-600" size={14} />
              <span className="text-[9px] font-black text-blue-600 uppercase">Acceso Elevado</span>
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 md:space-y-8">
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-4 bg-gray-50 p-4 md:p-6 rounded-[1.5rem] md:rounded-[2.5rem]">
            
            {canSeeCompanies ? (
              <div className="md:col-span-1">
                <label className="text-[9px] font-black text-gray-400 uppercase ml-2 mb-1 block">Empresa Destino</label>
                <select 
                  className="w-full bg-white border-none rounded-2xl px-5 py-4 text-xs font-bold outline-none ring-1 ring-gray-100 focus:ring-2 focus:ring-[#87be00]/20 transition-all appearance-none"
                  value={form.companyId}
                  onChange={(e) => setForm({...form, companyId: e.target.value})}
                  required
                >
                  <option value="">Seleccionar Cliente...</option>
                  {companies.map(c => <option key={c.id} value={c.id}>{c.name.toUpperCase()}</option>)}
                </select>
              </div>
            ) : (
              <div className="md:col-span-1 flex items-center px-6 py-4 md:py-0 bg-white/80 rounded-2xl border border-gray-100 shadow-sm">
                <div className="flex items-center gap-3">
                   <CheckCircle2 size={18} className="text-[#87be00] shrink-0" />
                   <div className="flex flex-col">
                      <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest leading-none">Canal Seguro</p>
                      <p className="text-[10px] md:text-[11px] font-black text-gray-800 uppercase italic leading-none mt-1">Mi Organización</p>
                   </div>
                </div>
              </div>
            )}

            <div className="md:col-span-2">
              <label className="text-[9px] font-black text-gray-400 uppercase ml-2 mb-1 block">Alcance</label>
              <div className="flex flex-col xs:flex-row gap-2">
                {[
                  { id: 'global', label: 'Global', icon: <Globe size={14}/> },
                  { id: 'individual', label: 'Usuarios', icon: <Users size={14}/> },
                  { id: 'local', label: 'Por Local', icon: <Store size={14}/> }
                ].map(s => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setForm({...form, scope: s.id, selectedTargets: []})}
                    className={`flex-1 py-4 rounded-xl md:rounded-2xl flex items-center justify-center gap-2 transition-all font-black text-[9px] uppercase border ${
                      form.scope === s.id ? 'bg-gray-900 text-white border-gray-900 shadow-lg' : 'bg-white text-gray-400 hover:bg-gray-100 border-gray-100'
                    }`}
                  >
                    {s.icon} {s.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {form.scope === 'local' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 px-1 animate-in slide-in-from-top-4">
              <select className="bg-gray-50 border-none rounded-2xl px-5 py-4 text-xs font-bold outline-none ring-1 ring-gray-100 appearance-none" value={form.chainId} onChange={(e) => setForm({...form, chainId: e.target.value})}>
                <option value="">Seleccione cadena...</option>
                {chains.map(ch => <option key={ch.id} value={ch.id}>{ch.name}</option>)}
              </select>
              <select className="bg-gray-50 border-none rounded-2xl px-5 py-4 text-xs font-bold outline-none ring-1 ring-gray-100 appearance-none" value={form.localId} onChange={(e) => setForm({...form, localId: e.target.value})} disabled={!form.chainId}>
                <option value="">Seleccione local...</option>
                {locales.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
            </div>
          )}

          {(form.scope === 'individual' || form.scope === 'local') && (
            <div className="space-y-4">
              
              {/* 🔍 Buscador y Contador de Seleccionados */}
              <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 px-2">
                <div className="w-full md:w-1/2">
                  <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-2 block">Buscar Personal</label>
                  <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                    <input 
                      type="text" 
                      placeholder="Buscar por nombre, correo o RUT..."
                      className="w-full bg-gray-50 border-none rounded-xl px-11 py-3 text-[10px] font-bold outline-none focus:ring-2 focus:ring-[#87be00]/20 transition shadow-inner"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-2 w-full md:w-1/2 md:text-right">
                  <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">
                    Seleccionados ({form.selectedTargets.length})
                  </span>
                  {form.selectedTargets.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 md:justify-end">
                      {form.selectedTargets.slice(0, 3).map(id => {
                        const u = users.find(user => user.id === id);
                        const { name } = getUserInfo(u);
                        return (
                          <span key={id} className="bg-[#87be00] text-white px-2 py-1 rounded-full text-[8px] font-bold flex items-center gap-1 shadow-sm">
                            <span className="max-w-[60px] truncate">{name}</span>
                            <X size={10} className="cursor-pointer shrink-0" onClick={() => toggleUserSelection(id)}/>
                          </span>
                        );
                      })}
                      {form.selectedTargets.length > 3 && (
                        <span className="bg-gray-200 text-gray-600 px-2 py-1 rounded-full text-[8px] font-bold">
                          +{form.selectedTargets.length - 3} más
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-64 md:max-h-80 overflow-y-auto p-3 md:p-4 bg-gray-50 rounded-[1.5rem] md:rounded-[2.5rem] border border-gray-100">
                {fetchingData ? (
                  <div className="col-span-full py-12 flex justify-center"><Loader2 className="animate-spin text-[#87be00]"/></div>
                ) : filteredUsers.length === 0 ? (
                  <div className="col-span-full py-8 text-center text-gray-400 text-[10px] font-black uppercase">
                    No se encontraron usuarios {searchTerm && 'para tu búsqueda'}
                  </div>
                ) : (
                  filteredUsers.map(u => {
                    const isSelected = form.selectedTargets.includes(u.id);
                    const { name, email, role, rut } = getUserInfo(u);
                    return (
                      <button
                        key={u.id}
                        type="button"
                        onClick={() => toggleUserSelection(u.id)}
                        className={`group p-4 md:p-5 rounded-2xl md:rounded-[2rem] text-left transition-all border-2 flex flex-col justify-between h-32 md:h-36 ${
                          isSelected ? 'bg-white border-[#87be00] shadow-xl' : 'bg-white/60 border-transparent hover:border-gray-200 shadow-sm'
                        }`}
                      >
                        <div className="space-y-1 min-w-0">
                          <div className={`text-[10px] md:text-[11px] font-black leading-tight truncate ${isSelected ? 'text-[#87be00]' : 'text-gray-800'}`}>
                            {name}
                          </div>
                          <div className="flex items-center gap-1 text-[8px] md:text-[9px] font-medium text-gray-400 truncate">
                            <Mail size={10} className="shrink-0"/> {email}
                          </div>
                          {rut && (
                            <div className="flex items-center gap-1 text-[8px] md:text-[9px] font-medium text-gray-400 truncate">
                              <UserCircle size={10} className="shrink-0"/> {rut}
                            </div>
                          )}
                        </div>
                        <div className="flex justify-between items-center mt-3 md:mt-4">
                          <div className={`text-[7px] md:text-[8px] font-black px-2 py-0.5 md:py-1 rounded-lg uppercase truncate ${isSelected ? 'bg-[#87be00] text-white' : 'bg-gray-100 text-gray-500'}`}>
                            {role}
                          </div>
                          {isSelected && <CheckCircle2 className="text-[#87be00] shrink-0" size={16}/>}
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 bg-gray-50 p-5 md:p-8 rounded-[1.5rem] md:rounded-[2.5rem]">
            <input 
              type="text" placeholder="Título de la alerta..."
              className="w-full bg-white border-none rounded-xl md:rounded-2xl px-5 py-4 md:py-5 text-[11px] md:text-xs font-bold outline-none focus:ring-2 focus:ring-[#87be00]/20 shadow-sm"
              value={form.title} onChange={(e) => setForm({...form, title: e.target.value})} required
            />
            <textarea 
              placeholder="Mensaje..." rows="3"
              className="w-full bg-white border-none rounded-xl md:rounded-2xl px-5 py-4 md:py-5 text-[11px] md:text-xs font-bold outline-none focus:ring-2 focus:ring-[#87be00]/20 resize-none shadow-sm"
              value={form.message} onChange={(e) => setForm({...form, message: e.target.value})} required
            />
            <button 
              type="submit" disabled={loading}
              className="mt-2 md:mt-4 w-full bg-[#87be00] hover:bg-[#76a500] text-white font-black uppercase text-[10px] md:text-[12px] py-5 md:py-6 rounded-xl md:rounded-2xl shadow-xl transition-all flex items-center justify-center gap-3 md:gap-4 disabled:opacity-50 active:scale-95"
            >
              {loading ? <Loader2 className="animate-spin" size={18}/> : <Send size={18}/>}
              {loading ? "Sincronizando..." : `Emitir Notificación`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default NotificationManager;