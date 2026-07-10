import React, { useState, useEffect, useMemo } from "react";
import api from "../../api/apiClient";
import { toast } from "react-hot-toast";
import { Bell, Search, UserCircle } from "lucide-react";
import { useAuth } from "../../context/AuthContext";

const NotificationManager = () => {
  const { user } = useAuth();
  const [companies, setCompanies] = useState([]);
  const [chains, setChains] = useState([]);
  const [locales, setLocales] = useState([]);
  const [users, setUsers] = useState([]);
  
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const ID_CULTIVA = '0e342e01-d213-4353-b210-39a12ac335cf'; 
  const canSeeCompanies = user?.role === 'ROOT' || (user?.role === 'ADMIN_CLIENTE' && user?.company_id === ID_CULTIVA);

  const [form, setForm] = useState({
    title: "",
    message: "",
    scope: "global",
    companyId: canSeeCompanies ? "" : (user?.company_id || ""),
    chainId: "",
    localId: "",
    selectedTargets: [] 
  });

  const safeGetData = (res) => (res?.data ? res.data : (Array.isArray(res) ? res : []));

  useEffect(() => {
    if (canSeeCompanies) {
      api.get("/companies").then(res => setCompanies(safeGetData(res)));
    }
  }, [canSeeCompanies]);

  useEffect(() => {
    if (form.companyId) {
      api.get(`/chains?company_id=${form.companyId}`)
        .then(res => setChains(safeGetData(res)))
        .catch(err => console.error("Error cargando cadenas:", err));
        
      api.get(`/users?company_id=${form.companyId}`)
        .then(res => setUsers(safeGetData(res)));
    }
  }, [form.companyId]);

  useEffect(() => {
    if (form.chainId && form.companyId) {
      api.get(`/locales?chain_id=${form.chainId}&company_id=${form.companyId}`)
        .then(res => {
            setLocales(safeGetData(res));
        })
        .catch(err => {
            console.error("Error cargando locales:", err);
            setLocales([]);
        });
    } else {
        setLocales([]);
    }
    setForm(prev => ({ ...prev, localId: "", selectedTargets: [] }));
  }, [form.chainId, form.companyId]);

  useEffect(() => {
    if (form.scope === 'local' && form.localId) {
      api.get(`/users?local_id=${form.localId}`).then(res => setUsers(safeGetData(res)));
    } else if (form.scope === 'global' && form.companyId) {
      api.get(`/users?company_id=${form.companyId}`).then(res => setUsers(safeGetData(res)));
    }
  }, [form.localId, form.scope, form.companyId]);

  const filteredUsers = useMemo(() => {
    if (!searchTerm.trim()) return users;
    const term = searchTerm.toLowerCase().trim();
    return users.filter(u => 
      `${u.first_name} ${u.last_name}`.toLowerCase().includes(term) ||
      (u.email || '').toLowerCase().includes(term)
    );
  }, [users, searchTerm]);

  const toggleUserSelection = (userId) => {
    setForm(prev => ({
      ...prev,
      selectedTargets: prev.selectedTargets.includes(userId) 
        ? prev.selectedTargets.filter(id => id !== userId)
        : [...prev.selectedTargets, userId]
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // 🚩 VALIDACIÓN CORREGIDA: Solo requerir usuarios si el scope es individual
    if (form.scope === 'individual' && form.selectedTargets.length === 0) {
        return toast.error("Selecciona al menos un destinatario");
    }
    // Opcional: Validar que si es local, haya seleccionado un local
    if (form.scope === 'local' && !form.localId) {
        return toast.error("Selecciona un local");
    }

    setLoading(true);
    try {
      await api.post("/notifications/send-bulk", { ...form, targetIds: form.selectedTargets, localId: form.localId || null });
      toast.success("Notificación enviada correctamente");
      setForm(prev => ({ ...prev, title: "", message: "", selectedTargets: [], localId: "" }));
    } catch (error) { toast.error("Error al enviar notificación"); } finally { setLoading(false); }
  };

  return (
    <div className="w-full h-full flex flex-col font-[Outfit] bg-gray-50/30">
      <div className="bg-white border-b border-gray-100 pl-[76px] pr-4 py-5 md:px-8 md:py-8 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 shrink-0">
        <div>
          <h2 className="text-xl md:text-2xl font-black text-gray-900 uppercase italic tracking-tighter leading-none">
            Generador de Alertas
          </h2>
          <p className="text-[9px] md:text-[10px] font-bold text-[#87be00] uppercase tracking-widest mt-2">
            Centro de Comunicaciones • Gestión de Notificaciones
          </p>
        </div>
        <div className="bg-black p-3 md:p-4 rounded-xl md:rounded-2xl shadow-xl shrink-0">
          <Bell className="text-[#87be00] text-xl md:text-2xl" />
        </div>
      </div>

      <div className="p-4 md:p-8 flex-1 overflow-y-auto pb-10">
        <form onSubmit={handleSubmit} className="max-w-4xl mx-auto space-y-6">
          <div className="bg-white p-6 md:p-8 rounded-[2rem] border border-gray-100 shadow-sm space-y-6">
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {canSeeCompanies && (
                <div className="md:col-span-2">
                    <label className="text-[9px] font-black text-gray-400 uppercase mb-1 block pl-1">Empresa</label>
                    <select 
                      className="w-full bg-gray-50 border border-gray-100 rounded-[1.2rem] px-4 py-4 text-[10px] font-black outline-none focus:border-[#87be00] transition-colors"
                      value={form.companyId} onChange={(e) => setForm({...form, companyId: e.target.value})} required
                    >
                      <option value="">SELECCIONAR EMPRESA...</option>
                      {companies.map(c => <option key={c.id} value={c.id}>{c.name.toUpperCase()}</option>)}
                    </select>
                </div>
              )}

              <div className="md:col-span-2">
                <label className="text-[9px] font-black text-gray-400 uppercase mb-2 block pl-1">Alcance</label>
                <div className="flex gap-2">
                  {['global', 'individual', 'local'].map(s => (
                    <button key={s} type="button" onClick={() => setForm({...form, scope: s})} 
                      className={`flex-1 py-4 rounded-[1.2rem] text-[10px] font-black uppercase transition-all ${form.scope === s ? 'bg-[#87be00] text-white shadow-lg' : 'bg-gray-50 text-gray-400 hover:bg-gray-100'}`}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {form.scope === 'local' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-gray-50 rounded-[1.5rem]">
                <select className="bg-white rounded-[1.2rem] px-4 py-4 text-[10px] font-black border border-gray-100 outline-none focus:border-[#87be00]" value={form.chainId} onChange={(e) => setForm({...form, chainId: e.target.value})}>
                  <option value="">CADENA...</option>
                  {chains.map(ch => <option key={ch.id} value={ch.id}>{ch.name}</option>)}
                </select>
                <select className="bg-white rounded-[1.2rem] px-4 py-4 text-[10px] font-black border border-gray-100 outline-none focus:border-[#87be00]" value={form.localId} onChange={(e) => setForm({...form, localId: e.target.value})}>
                  <option value="">LOCAL...</option>
                  {locales.map(l => (
                    <option key={l.id} value={l.id}>
                      {l.nombre_local || `LOCAL ${l.codigo_local}`}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* 🚩 CORRECCIÓN: Ahora esto solo aparece si el scope es individual */}
            {form.scope === 'individual' && (
              <div className="space-y-4">
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                  <input type="text" placeholder="BUSCAR PERSONAL..." className="w-full bg-gray-50 rounded-[1.2rem] px-12 py-4 text-[10px] font-black outline-none border border-gray-100 focus:border-[#87be00]" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-60 overflow-y-auto custom-scrollbar pr-2">
                  {filteredUsers.map(u => {
                    const isSelected = form.selectedTargets.includes(u.id);
                    return (
                      <button key={u.id} type="button" onClick={() => toggleUserSelection(u.id)}
                        className={`p-4 rounded-2xl text-left border-2 flex items-center gap-3 transition-all ${isSelected ? 'border-[#87be00] bg-[#87be00]/5' : 'border-gray-50 bg-white hover:border-gray-200'}`}>
                        <div className={`p-3 rounded-xl ${isSelected ? 'bg-[#87be00] text-white' : 'bg-gray-50 text-gray-400'}`}>
                          <UserCircle size={18}/>
                        </div>
                        <div className="min-w-0">
                          <p className={`text-[10px] font-black uppercase truncate ${isSelected ? 'text-[#87be00]' : 'text-gray-900'}`}>{u.first_name} {u.last_name}</p>
                          <p className="text-[8px] font-bold text-gray-400">{u.role}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="space-y-4 pt-4 border-t border-gray-50">
              <input type="text" placeholder="TÍTULO DE LA ALERTA..." className="w-full p-4 bg-gray-50 rounded-[1.2rem] text-[10px] font-black uppercase outline-none focus:border-[#87be00] border border-gray-100" value={form.title} onChange={(e) => setForm({...form, title: e.target.value})} required />
              <textarea placeholder="MENSAJE PARA EL USUARIO..." rows="3" className="w-full p-4 bg-gray-50 rounded-[1.2rem] text-[10px] font-black uppercase outline-none focus:border-[#87be00] border border-gray-100 resize-none" value={form.message} onChange={(e) => setForm({...form, message: e.target.value})} required />
              
              <button type="submit" disabled={loading} className="w-full bg-gray-900 hover:bg-black text-white py-5 rounded-[1.2rem] font-black uppercase text-[10px] tracking-widest shadow-xl active:scale-95 transition-all">
                {loading ? "EMITIENDO..." : "EMITIR NOTIFICACIÓN"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default NotificationManager;