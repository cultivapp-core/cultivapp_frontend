import { useState, useEffect, useMemo } from "react";
import { FiPlus, FiTrash2, FiEdit2, FiKey, FiUsers, FiUserCheck, FiUserX, FiMail, FiSearch, FiCalendar, FiClock } from "react-icons/fi";
import { useAuth } from "../../context/AuthContext";
import { toast } from "react-hot-toast";

import CreateUserModal from "../root/CreateUserModal";
import EditUserContactModal from "../root/EditUserContactModal";
import ResetPasswordModal from "../../components/ResetPasswordModal";
import UserQuickView from "../../components/UserQuickView";

const API_URL = import.meta.env.VITE_API_URL;

const UsersByRole = ({ role = null, title, buttonLabel }) => {
  const { user: loggedUser } = useAuth();
  const [openModal, setOpenModal] = useState(false);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  const [selectedUser, setSelectedUser] = useState(null);
  const [openEdit, setOpenEdit] = useState(false);
  const [openReset, setOpenReset] = useState(false);

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
    <div className="space-y-8 animate-in fade-in duration-700 font-[Outfit] pb-10 pt-20 md:pt-0" onClick={() => setActivePopover(null)}>
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 px-4">
        <div>
          <h2 className="text-3xl md:text-5xl font-black text-gray-800 tracking-tighter uppercase italic leading-none">{title}</h2>
          <p className="text-[9px] font-black text-[#87be00] uppercase tracking-[0.2em] mt-3">Gestión de equipo, vigencias y permisos</p>
        </div>
        <button onClick={() => setOpenModal(true)} className="flex items-center justify-center gap-3 bg-[#87be00] hover:bg-[#76a500] text-white w-full md:w-auto px-8 py-4 rounded-[1.5rem] font-black uppercase text-[11px] tracking-[0.2em] transition-all shadow-xl">
          <FiPlus size={18} /> {buttonLabel}
        </button>
      </div>

      {/* STATS */}
      <div className="px-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard label="Total" value={stats.total} icon={<FiUsers />} />
        <StatCard label="Activos" value={stats.activos} icon={<FiUserCheck />} color="text-[#87be00]" />
        <StatCard label="Inactivos" value={stats.inactivos} icon={<FiUserX />} color="text-red-500" />
      </div>

      {/* SEARCH */}
      <div className="px-4">
        <div className="relative">
          <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
          <input type="text" placeholder="Buscar..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full bg-white border border-gray-100 rounded-2xl pl-12 pr-6 py-4 text-[11px] font-black uppercase tracking-wider outline-none shadow-sm" />
        </div>
      </div>

      {/* VISTA ESCRITORIO (TABLA) */}
      <div className="hidden md:block px-4">
        <div className="bg-white rounded-[3.5rem] shadow-2xl shadow-gray-200/60 border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left min-w-[900px]">
              <thead className="bg-gray-50/70 border-b border-gray-100">
                <tr>
                  <th className="p-8 text-[10px] font-black uppercase text-gray-400 tracking-[0.2em]">Colaborador</th>
                  <th className="p-8 text-[10px] font-black uppercase text-gray-400 tracking-[0.2em]">Vigencia</th>
                  {!role && <th className="p-8 text-[10px] font-black uppercase text-gray-400">Org</th>}
                  <th className="p-8 text-[10px] font-black uppercase text-gray-400 text-center">Estado</th>
                  <th className="p-8 text-[10px] font-black uppercase text-gray-400 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredUsers.map(u => (
                  <tr key={u.id} className="hover:bg-gray-50/50">
                    <td className="p-8"><div className="flex items-center gap-4"><UserQuickView user={u} isActive={activePopover === u.id} onToggle={() => setActivePopover(activePopover === u.id ? null : u.id)}/><p className="text-sm font-black uppercase">{u.first_name} {u.last_name}</p></div></td>
                    <td className="p-8 text-[10px] font-bold">{formatDate(u.fecha_inicio_contrato)} - {formatDate(u.fecha_termino_contrato)}</td>
                    {!role && <td className="p-8"><span className="text-[9px] font-black">{u.company_name}</span></td>}
                    <td className="p-8 text-center"><button onClick={() => toggleUser(u.id)} className={`h-6 w-12 rounded-full ${u.is_active ? "bg-[#87be00]" : "bg-gray-200"}`}/></td>
                    <td className="p-8 text-right flex justify-end gap-2">
                        <button onClick={() => { setSelectedUser(u); setOpenEdit(true); }} className="p-2 bg-gray-100 rounded-lg"><FiEdit2 size={14}/></button>
                        <button onClick={() => { setSelectedUser(u); setOpenReset(true); }} className="p-2 bg-gray-100 rounded-lg"><FiKey size={14}/></button>
                        {canDeleteUser(u) && <button onClick={() => deleteUser(u.id)} className="p-2 bg-red-50 text-red-500 rounded-lg"><FiTrash2 size={14}/></button>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* VISTA MÓVIL (TARJETAS) */}
      <div className="md:hidden px-4 space-y-4">
        {filteredUsers.map(u => (
          <div key={u.id} className="bg-white p-5 rounded-[2rem] border border-gray-100 shadow-sm flex flex-col gap-4">
             <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                   <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center font-black text-xs uppercase">
                    {(u.first_name?.charAt(0) || "") + (u.last_name?.charAt(0) || "")}
                   </div>
                   <div>
                     <p className="text-[11px] font-black uppercase">{u.first_name} {u.last_name}</p>
                     <p className="text-[9px] text-gray-400">{u.role}</p>
                   </div>
                </div>
                <button onClick={() => toggleUser(u.id)} className={`w-10 h-5 rounded-full ${u.is_active ? "bg-[#87be00]" : "bg-gray-200"}`}/>
             </div>
             
             <div className="flex items-center justify-between border-t border-gray-50 pt-4">
                <div className="text-[9px] text-gray-400 font-bold">{formatDate(u.fecha_termino_contrato)}</div>
                <div className="flex gap-2">
                   <button onClick={() => { setSelectedUser(u); setOpenEdit(true); }} className="p-2 bg-gray-50 rounded-lg"><FiEdit2 size={14}/></button>
                   <button onClick={() => { setSelectedUser(u); setOpenReset(true); }} className="p-2 bg-gray-50 rounded-lg"><FiKey size={14}/></button>
                </div>
             </div>
          </div>
        ))}
      </div>

      <CreateUserModal isOpen={openModal} onClose={() => setOpenModal(false)} onCreated={fetchUsers} defaultRole={role || ""} />
      {openEdit && <EditUserContactModal user={selectedUser} onClose={() => setOpenEdit(false)} onUpdated={fetchUsers} />}
      {openReset && <ResetPasswordModal user={selectedUser} onClose={() => setOpenReset(false)} />}
    </div>
  )
}

const StatCard = ({ label, value, icon, color = "text-gray-900" }) => (
  <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100 flex items-center gap-4">
    <div className={`w-12 h-12 rounded-xl bg-gray-50 flex items-center justify-center ${color}`}>{icon}</div>
    <div>
      <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">{label}</p>
      <p className={`text-xl font-black ${color}`}>{value}</p>
    </div>
  </div>
)

export default UsersByRole;