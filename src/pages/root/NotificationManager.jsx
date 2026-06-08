import React, { useState, useEffect, useMemo } from "react";
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

  useEffect(() => {
    if (canSeeCompanies) api.get("/companies").then(res => setCompanies(res || []));
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
  }, [form.companyId]);

  useEffect(() => {
    if (form.chainId) api.get(`/locales?chain_id=${form.chainId}`).then(res => setLocales(res || []));
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
  }, [form.localId, form.scope]);

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
    if (form.scope !== 'global' && form.selectedTargets.length === 0) return toast.error("Selecciona destinatarios");
    setLoading(true);
    try {
      await api.post("/notifications/send-bulk", { ...form, targetIds: form.selectedTargets, localId: form.localId || null });
      toast.success("Notificación enviada");
      setForm(prev => ({ ...prev, title: "", message: "", selectedTargets: [] }));
    } catch (error) { toast.error("Error al enviar"); } finally { setLoading(false); }
  };

  return (
    // 🔴 pt-20 asegura que el header no se solape con el botón de hamburguesa móvil
    <div className="pt-20 md:pt-10 px-4 md:px-8 max-w-5xl mx-auto pb-20 font-[Outfit]">
      
      <div className="bg-white rounded-[2rem] md:rounded-[3rem] p-6 md:p-10 shadow-xl border border-gray-100">
        
        {/* 🔴 Header: pl-10 en móvil para evitar choque visual */}
        <div className="mb-8 pl-10 md:pl-0 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-xl md:text-2xl font-black text-gray-900 uppercase tracking-tighter italic">Generador de Alertas</h2>
            <p className="text-[9px] font-bold text-[#87be00] uppercase tracking-[0.2em] mt-1">Centro de Comunicaciones</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-gray-50 p-4 rounded-[1.5rem]">
            {canSeeCompanies && (
              <select 
                className="w-full bg-white border border-gray-100 rounded-xl px-4 py-3 text-xs font-bold outline-none"
                value={form.companyId} onChange={(e) => setForm({...form, companyId: e.target.value})} required
              >
                <option value="">Seleccionar Empresa...</option>
                {companies.map(c => <option key={c.id} value={c.id}>{c.name.toUpperCase()}</option>)}
              </select>
            )}

            <div className="flex gap-2 col-span-1 md:col-span-2">
              {['global', 'individual', 'local'].map(s => (
                <button key={s} type="button" onClick={() => setForm({...form, scope: s})} 
                  className={`flex-1 py-3 rounded-xl text-[9px] font-black uppercase border transition-all ${form.scope === s ? 'bg-gray-900 text-white' : 'bg-white text-gray-400 border-gray-100'}`}>
                  {s}
                </button>
              ))}
            </div>
          </div>

          {form.scope === 'local' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <select className="bg-gray-50 rounded-xl px-4 py-3 text-xs font-bold border-none ring-1 ring-gray-100" value={form.chainId} onChange={(e) => setForm({...form, chainId: e.target.value})}>
                <option value="">Cadena...</option>
                {chains.map(ch => <option key={ch.id} value={ch.id}>{ch.name}</option>)}
              </select>
              <select className="bg-gray-50 rounded-xl px-4 py-3 text-xs font-bold border-none ring-1 ring-gray-100" value={form.localId} onChange={(e) => setForm({...form, localId: e.target.value})}>
                <option value="">Local...</option>
                {locales.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
            </div>
          )}

          {(form.scope === 'individual' || form.scope === 'local') && (
            <div className="space-y-4">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                <input type="text" placeholder="Buscar personal..." className="w-full bg-gray-50 rounded-xl px-12 py-3 text-[10px] font-bold outline-none ring-1 ring-gray-100" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-60 overflow-y-auto custom-scrollbar">
                {filteredUsers.map(u => {
                  const isSelected = form.selectedTargets.includes(u.id);
                  return (
                    <button key={u.id} type="button" onClick={() => toggleUserSelection(u.id)}
                      className={`p-4 rounded-2xl text-left border-2 flex items-center gap-3 ${isSelected ? 'border-[#87be00] bg-green-50' : 'border-gray-100 bg-white'}`}>
                      <div className={`p-2 rounded-lg ${isSelected ? 'bg-[#87be00] text-white' : 'bg-gray-100 text-gray-400'}`}>
                        <UserCircle size={16}/>
                      </div>
                      <div className="min-w-0">
                        <p className="text-[10px] font-black uppercase truncate">{u.first_name} {u.last_name}</p>
                        <p className="text-[8px] font-bold text-gray-400">{u.role}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="space-y-4 bg-gray-50 p-5 rounded-[2rem]">
            <input type="text" placeholder="Título..." className="w-full p-4 rounded-xl text-xs font-bold border-none outline-none" value={form.title} onChange={(e) => setForm({...form, title: e.target.value})} required />
            <textarea placeholder="Mensaje..." rows="3" className="w-full p-4 rounded-xl text-xs font-bold border-none outline-none resize-none" value={form.message} onChange={(e) => setForm({...form, message: e.target.value})} required />
            <button type="submit" disabled={loading} className="w-full bg-[#87be00] text-white py-4 rounded-xl font-black uppercase text-[10px] tracking-widest shadow-lg">
              {loading ? "Enviando..." : "Emitir Notificación"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default NotificationManager;