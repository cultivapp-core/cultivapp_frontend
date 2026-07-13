import { useState, useEffect, useMemo } from "react";
import { 
  FiPlus, FiTrash2, FiEdit2, FiKey, FiUsers, FiUserCheck, 
  FiUserX, FiSearch, FiHome, FiMapPin, FiXSquare 
} from "react-icons/fi";
import { useAuth } from "../../context/AuthContext";
import { toast } from "react-hot-toast";

import CreateUserModal from "../root/CreateUserModal";
import EditUserContactModal from "../root/EditUserContactModal";
import ResetPasswordModal from "../../components/ResetPasswordModal";
import UserQuickView from "../../components/UserQuickView";

// IMPORTAMOS LOS MODALES DE ASIGNACIÓN (Ajusta la ruta "../admin/" según tu estructura de carpetas si es necesario)
import AssignLocalesModal from "../admin/AssignLocalesModal";
import AssignUsersModal from "../admin/AssignUsersModal";

const API_URL = import.meta.env.VITE_API_URL;

const UsersByRole = ({ role = null, title, buttonLabel }) => {
  const { user: loggedUser } = useAuth();
  const [openModal, setOpenModal] = useState(false);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  const [selectedUser, setSelectedUser] = useState(null);
  const [openEdit, setOpenEdit] = useState(false);
  const [openReset, setOpenReset] = useState(false);
  
  // ESTADOS PARA PASAR LA DATA A LOS MODALES (Igual que en AdminUsers)
  const [assignSupervisor, setAssignSupervisor] = useState(null);
  const [assignUser, setAssignUser] = useState(null);

  const [companies, setCompanies] = useState([]);
  const [selectedCompany, setSelectedCompany] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [activePopover, setActivePopover] = useState(null);

  const filteredUsers = useMemo(() => {
    if (!searchTerm) return users;
    const term = searchTerm.toLowerCase();
    return users.filter(u => 
      (u.first_name?.toLowerCase().includes(term)) || 
      (u.last_name?.toLowerCase().includes(term)) || 
      (u.email?.toLowerCase().includes(term))
    );
  }, [users, searchTerm]);

  const fetchCompanies = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_URL}/api/companies`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      setCompanies(data);
    } catch (error) { console.error(error); }
  };

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      let url = `${API_URL}/api/users`;
      const params = [];
      if (role) params.push(`role=${role}`);
      if (selectedCompany) params.push(`company_id=${selectedCompany}`);
      if (params.length) url += `?${params.join("&")}`;

      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      setUsers(data);
    } catch (error) { console.error(error); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchUsers(); }, [role, selectedCompany]);
  useEffect(() => { if (loggedUser?.role === "ROOT") fetchCompanies(); }, []);

  const canDeleteUser = (targetUser) => {
    if (!loggedUser) return false;
    if (targetUser.role === "ROOT") return false;
    if (loggedUser.id === targetUser.id) return false;
    if (loggedUser.role === "ROOT") return true;
    if (loggedUser.role === "ADMIN_CLIENTE") return targetUser.company_id === loggedUser.company_id && targetUser.role !== "ADMIN_CLIENTE";
    return false;
  };

  const toggleUser = async (id) => {
    try {
      const token = localStorage.getItem("token");
      await fetch(`${API_URL}/api/users/${id}/toggle`, { method: "PATCH", headers: { Authorization: `Bearer ${token}` } });
      toast.success("Estado actualizado");
      fetchUsers();
    } catch (error) { console.error(error); }
  };

  const deleteUser = async (id) => {
    if (!window.confirm("¿Seguro que deseas eliminar este usuario?")) return;
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_URL}/api/users/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) { toast.success("Usuario eliminado"); fetchUsers(); }
    } catch (error) { console.error(error); }
  };

  const stats = {
    total: filteredUsers.length,
    activos: filteredUsers.filter(u => u.is_active).length,
    inactivos: filteredUsers.filter(u => !u.is_active).length
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "---";
    return new Date(dateStr).toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: '2-digit' }).replace('.', '');
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 font-[Outfit] pb-12 pt-20 md:pt-4 w-full bg-slate-50/50 min-h-screen" onClick={() => setActivePopover(null)}>
      
      {/* HEADER ESTILO CULTIVA */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 px-6">
        <div>
          <h2 className="text-3xl md:text-4xl font-extrabold text-[#111111] tracking-tight uppercase leading-none">{title}</h2>
          <p className="text-[10px] font-bold text-[#5c9200] uppercase tracking-[0.25em] mt-2.5">Gestión de equipo, vigencias y permisos</p>
        </div>
        <button onClick={() => setOpenModal(true)} className="flex items-center justify-center gap-2.5 bg-[#5c9200] hover:bg-[#4a7500] text-white w-full md:w-auto px-6 py-3.5 rounded-xl font-bold uppercase text-[11px] tracking-[0.15em] transition-all shadow-sm hover:shadow-md flex-shrink-0">
          <FiPlus size={16} /> {buttonLabel}
        </button>
      </div>

      {/* STATS */}
      <div className="px-6 grid grid-cols-1 sm:grid-cols-3 gap-5">
        <StatCard label="Total Colaboradores" value={stats.total} icon={<FiUsers size={20} />} color="text-slate-700" bgIcon="bg-slate-100" />
        <StatCard label="Usuarios Activos" value={stats.activos} icon={<FiUserCheck size={20} />} color="text-[#5c9200]" bgIcon="bg-emerald-50" />
        <StatCard label="Usuarios Inactivos" value={stats.inactivos} icon={<FiUserX size={20} />} color="text-rose-600" bgIcon="bg-rose-50" />
      </div>

      {/* FILTROS: SELECTOR DE EMPRESA + BUSCADOR */}
      <div className="px-6">
        <div className="flex flex-col sm:flex-row items-stretch gap-4 max-w-2xl">
          
          {/* SELECTOR DE EMPRESAS (Visible solo si es ROOT según tu useEffect) */}
          {loggedUser?.role === "ROOT" && (
            <div className="w-full sm:w-64 flex-shrink-0">
              <select
                value={selectedCompany}
                onChange={(e) => setSelectedCompany(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3.5 text-[12px] font-bold text-slate-700 uppercase tracking-wider outline-none focus:border-[#5c9200] focus:ring-1 focus:ring-[#5c9200] transition-all shadow-sm cursor-pointer appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2020%2020%22%20fill%3D%22none%22%3E%3Cpath%20d%3D%22M7%209l3%203%203-3%22%20stroke%3D%22%2394a3b8%22%20stroke-width%3D%221.5%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%2F%3E%3C%2Fsvg%3E')] bg-[length:1.25rem_1.25rem] bg-[right_0.75rem_center] bg-no-repeat"
              >
                <option value="">Todas las empresas</option>
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* BUSCADOR */}
          <div className="relative flex-grow">
            <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input type="text" placeholder="Buscar por nombre o email..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full bg-white border border-slate-200 rounded-xl pl-11 pr-4 py-3.5 text-[12px] font-medium text-slate-700 placeholder-slate-400 outline-none focus:border-[#5c9200] focus:ring-1 focus:ring-[#5c9200] transition-all shadow-sm" />
          </div>

        </div>
      </div>

      {/* VISTA ESCRITORIO (TABLA ESTILO CULTIVA) */}
      <div className="hidden md:block px-6">
        <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left min-w-[1100px]">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="px-6 py-4 text-[10px] font-bold uppercase text-slate-400 tracking-[0.15em] w-[35%]">Colaborador</th>
                  <th className="px-6 py-4 text-[10px] font-bold uppercase text-slate-400 tracking-[0.15em] w-[25%]">Vigencia Contrato</th>
                  {!role && <th className="px-6 py-4 text-[10px] font-bold uppercase text-slate-400 tracking-[0.15em] w-[15%]">Organización</th>}
                  <th className="px-6 py-4 text-[10px] font-bold uppercase text-slate-400 tracking-[0.15em] text-center w-[10%]">Estado</th>
                  <th className="px-6 py-4 text-[10px] font-bold uppercase text-slate-400 tracking-[0.15em] text-right w-[15%]">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredUsers.map(u => (
                  <tr key={u.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3.5 min-w-0">
                        <UserQuickView user={u} isActive={activePopover === u.id} onToggle={() => setActivePopover(activePopover === u.id ? null : u.id)}/>
                        <div className="flex flex-col min-w-0 gap-0.5">
                          <p className="text-[13px] font-bold text-[#111111] uppercase truncate">{u.first_name} {u.last_name}</p>
                          <div className="flex items-center gap-2">
                            <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider">{u.role}</span>
                            <span className="text-[10px] font-medium font-mono text-slate-450 select-all truncate" title={u.id}>• ID: {u.id}</span>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-[12px] text-slate-600 font-medium">
                      <span className="bg-slate-100 px-2 py-1 rounded-md text-slate-700">{formatDate(u.fecha_inicio_contrato)}</span>
                      <span className="mx-1.5 text-slate-300">—</span>
                      <span className="bg-slate-100 px-2 py-1 rounded-md text-slate-700">{formatDate(u.fecha_termino_contrato)}</span>
                    </td>
                    {!role && <td className="px-6 py-4"><span className="text-[11px] font-bold uppercase text-slate-600">{u.company_name}</span></td>}
                    <td className="px-6 py-4 text-center">
                      <button onClick={() => toggleUser(u.id)} className={`h-5 w-10 rounded-full transition-colors relative inline-flex items-center p-0.5 ${u.is_active ? "bg-[#5c9200]" : "bg-slate-200"}`}>
                        <span className={`h-4 w-4 rounded-full bg-white transition-transform transform ${u.is_active ? "translate-x-5" : "translate-x-0"}`} />
                      </button>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-1.5">
                        
                        {/* 👁️ ASIGNAR LOCALES - Mercaderistas (USUARIO) */}
                        {u.role === "USUARIO" && (
                          <button onClick={() => setAssignSupervisor(u)} className="p-2.5 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-lg transition-colors border border-slate-200" title="Asignar Locales">
                            <FiHome size={14}/>
                          </button>
                        )}
                        
                        {/* 📍 ASIGNAR LOCALES (SUPERVISOR / VIEW) */}
                        {(u.role === 'SUPERVISOR' || u.role === 'VIEW') && (
                          <button onClick={() => setAssignSupervisor(u)} className="p-2.5 bg-emerald-50 hover:bg-emerald-100 text-[#5c9200] rounded-lg flex items-center justify-center border border-emerald-100 transition-colors" title="Asignar Locales">
                            <FiMapPin size={14}/>
                          </button>
                        )}

                        {/* 👥 ASIGNAR USUARIOS (SUPERVISOR / VIEW) */}
                        {(u.role === 'VIEW' || u.role === 'SUPERVISOR') && (
                          <button onClick={() => setAssignUser(u)} className="p-2.5 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center border border-blue-100 transition-colors" title="Asignar Usuarios">
                            <FiUsers size={14}/>
                          </button>
                        )}

                        <button onClick={() => { setSelectedUser(u); setOpenEdit(true); }} className="p-2.5 bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 rounded-lg transition-colors" title="Editar Contacto"><FiEdit2 size={14}/></button>
                        <button onClick={() => { setSelectedUser(u); setOpenReset(true); }} className="p-2.5 bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 rounded-lg transition-colors" title="Restablecer Clave"><FiKey size={14}/></button>
                        {canDeleteUser(u) && <button onClick={() => deleteUser(u.id)} className="p-2.5 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-100 rounded-lg transition-colors" title="Eliminar"><FiTrash2 size={14}/></button>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* VISTA MÓVIL (TARJETAS ESTILO CULTIVA) */}
      <div className="md:hidden px-6 space-y-4">
        {filteredUsers.map(u => (
          <div key={u.id} className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col gap-4">
             <div className="flex items-center justify-between">
                <div className="flex items-center gap-3.5 min-w-0 pr-2">
                   <div className="w-11 h-11 bg-slate-100 text-slate-700 rounded-xl flex items-center justify-center font-bold text-xs uppercase flex-shrink-0 border border-slate-200">
                    {(u.first_name?.charAt(0) || "") + (u.last_name?.charAt(0) || "")}
                   </div>
                   <div className="min-w-0">
                     <p className="text-[13px] font-bold text-[#111111] uppercase truncate leading-none mb-1">{u.first_name} {u.last_name}</p>
                     <div className="flex items-center gap-2">
                       <p className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider leading-none">{u.role}</p>
                       <p className="text-[9px] font-medium font-mono text-slate-400 tracking-wider select-all truncate" title={u.id}>ID: {u.id}</p>
                     </div>
                   </div>
                </div>
                <button onClick={() => toggleUser(u.id)} className={`h-5 w-10 rounded-full transition-colors relative inline-flex items-center p-0.5 flex-shrink-0 ${u.is_active ? "bg-[#5c9200]" : "bg-slate-200"}`}>
                  <span className={`h-4 w-4 rounded-full bg-white transition-transform transform ${u.is_active ? "translate-x-5" : "translate-x-0"}`} />
                </button>
             </div>
             
             <div className="flex items-center justify-between border-t border-slate-100 pt-3.5 mt-1">
                <div className="text-[10px] text-slate-500 font-bold bg-slate-50 px-2 py-1 rounded">Vence: {formatDate(u.fecha_termino_contrato)}</div>
                
                <div className="flex gap-1.5">
                   {/* Botón para USUARIO */}
                   {u.role === "USUARIO" && (
                     <button onClick={() => setAssignSupervisor(u)} className="p-2.5 bg-slate-50 text-slate-600 border border-slate-200 rounded-lg"><FiHome size={14}/></button>
                   )}
                   
                   {/* 📍 ASIGNAR LOCALES (SUPERVISOR / VIEW) */}
                   {(u.role === 'SUPERVISOR' || u.role === 'VIEW') && (
                     <button onClick={() => setAssignSupervisor(u)} className="p-2.5 bg-emerald-50 text-[#5c9200] rounded-lg flex items-center justify-center border border-emerald-100" title="Asignar Locales">
                       <FiMapPin size={14}/>
                     </button>
                   )}

                   {/* 👥 ASIGNAR USUARIOS (SUPERVISOR / VIEW) */}
                   {(u.role === 'VIEW' || u.role === 'SUPERVISOR') && (
                     <button onClick={() => setAssignUser(u)} className="p-2.5 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center border border-blue-100" title="Asignar Usuarios">
                       <FiUsers size={14}/>
                     </button>
                   )}

                   <button onClick={() => { setSelectedUser(u); setOpenEdit(true); }} className="p-2.5 bg-slate-50 text-slate-600 border border-slate-200 rounded-lg"><FiEdit2 size={14}/></button>
                   <button onClick={() => { setSelectedUser(u); setOpenReset(true); }} className="p-2.5 bg-slate-50 text-slate-600 border border-slate-200 rounded-lg"><FiKey size={14}/></button>
                </div>
             </div>
          </div>
        ))}
      </div>

      <CreateUserModal isOpen={openModal} onClose={() => setOpenModal(false)} onCreated={fetchUsers} defaultRole={role || ""} />
      {openEdit && <EditUserContactModal user={selectedUser} onClose={() => setOpenEdit(false)} onUpdated={fetchUsers} />}
      {openReset && <ResetPasswordModal user={selectedUser} onClose={() => setOpenReset(false)} />}
      
      {/* RENDER DE MODALES DE ASIGNACIÓN */}
      {assignSupervisor && <AssignLocalesModal supervisor={assignSupervisor} onClose={() => setAssignSupervisor(null)} onRefresh={fetchUsers} />}
      {assignUser && <AssignUsersModal targetUser={assignUser} onClose={() => setAssignUser(null)} onRefresh={fetchUsers} />}
      
    </div>
  )
}

const StatCard = ({ label, value, icon, color = "text-slate-800", bgIcon = "bg-slate-50" }) => (
  <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
    <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${bgIcon} ${color}`}>{icon}</div>
    <div className="space-y-0.5">
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{label}</p>
      <p className={`text-2xl font-extrabold text-slate-800 leading-none`}>{value}</p>
    </div>
  </div>
)

export default UsersByRole;