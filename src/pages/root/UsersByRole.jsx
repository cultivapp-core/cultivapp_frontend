import { useState, useEffect, useMemo } from "react"
import { FiPlus, FiTrash2, FiEdit2, FiKey, FiUsers, FiUserCheck, FiUserX, FiBriefcase, FiMail, FiShield, FiCalendar, FiClock, FiSearch } from "react-icons/fi"
import { useAuth } from "../../context/AuthContext"
import { toast } from "react-hot-toast"

import CreateUserModal from "../../components/CreateUserModal"
import EditUserContactModal from "../../components/EditUserContactModal"
import ResetPasswordModal from "../../components/ResetPasswordModal"
// 🚩 IMPORTANTE: Importamos el componente reutilizable
import UserQuickView from "../../components/UserQuickView" 

const API_URL = import.meta.env.VITE_API_URL

const UsersByRole = ({ role = null, title, buttonLabel }) => {
  const { user: loggedUser } = useAuth()
  const [openModal, setOpenModal] = useState(false)
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)

  const [selectedUser, setSelectedUser] = useState(null)
  const [openEdit, setOpenEdit] = useState(false)
  const [openReset, setOpenReset] = useState(false)

  const [companies, setCompanies] = useState([])
  const [selectedCompany, setSelectedCompany] = useState("")
  
  // 🚩 ESTADO PARA BÚSQUEDA
  const [searchTerm, setSearchTerm] = useState("")

  // 🚩 ESTADO PARA COORDINAR EL QUICK VIEW
  const [activePopover, setActivePopover] = useState(null)

  // 🚩 LÓGICA DE FILTRADO
  const filteredUsers = useMemo(() => {
    if (!searchTerm) return users
    const term = searchTerm.toLowerCase()
    return users.filter(u => 
      (u.first_name?.toLowerCase().includes(term)) || 
      (u.last_name?.toLowerCase().includes(term)) || 
      (u.email?.toLowerCase().includes(term))
    )
  }, [users, searchTerm])

  const fetchCompanies = async () => {
    try {
      const token = localStorage.getItem("token")
      const res = await fetch(`${API_URL}/api/companies`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      const data = await res.json()
      setCompanies(data)
    } catch (error) { console.error(error) }
  }

  const fetchUsers = async () => {
    setLoading(true)
    try {
      const token = localStorage.getItem("token")
      let url = `${API_URL}/api/users`
      const params = []
      if (role) params.push(`role=${role}`)
      if (selectedCompany) params.push(`company_id=${selectedCompany}`)
      if (params.length) url += `?${params.join("&")}`

      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` }
      })
      const data = await res.json()
      setUsers(data)
    } catch (error) { console.error(error) }
    finally { setLoading(false) }
  }

  useEffect(() => { fetchUsers() }, [role, selectedCompany])
  useEffect(() => { if (loggedUser?.role === "ROOT") fetchCompanies() }, [])

  const canDeleteUser = (targetUser) => {
    if (!loggedUser) return false
    if (targetUser.role === "ROOT") return false
    if (loggedUser.id === targetUser.id) return false
    if (loggedUser.role === "ROOT") return true
    if (loggedUser.role === "ADMIN_CLIENTE") {
      return targetUser.company_id === loggedUser.company_id && targetUser.role !== "ADMIN_CLIENTE"
    }
    return false
  }

  const toggleUser = async (id) => {
    try {
      const token = localStorage.getItem("token")
      await fetch(`${API_URL}/api/users/${id}/toggle`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` }
      })
      toast.success("Estado actualizado")
      fetchUsers()
    } catch (error) { console.error(error) }
  }

  const deleteUser = async (id) => {
    if (!window.confirm("¿Seguro que deseas eliminar este usuario?")) return
    try {
      const token = localStorage.getItem("token")
      const res = await fetch(`${API_URL}/api/users/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      })
      if (res.ok) {
        toast.success("Usuario eliminado")
        fetchUsers()
      }
    } catch (error) { console.error(error) }
  }

  const stats = {
    total: filteredUsers.length,
    activos: filteredUsers.filter(u => u.is_active).length,
    inactivos: filteredUsers.filter(u => !u.is_active).length
  }

  const formatDate = (dateStr) => {
    if (!dateStr) return "---";
    const date = new Date(dateStr);
    return date.toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: '2-digit' }).replace('.', '');
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700 font-[Outfit]" onClick={() => setActivePopover(null)}>
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 px-4">
        <div>
          <h2 className="text-5xl font-black text-gray-800 tracking-tighter uppercase italic leading-none">
            {title}
          </h2>
          <p className="text-[10px] font-black text-[#87be00] uppercase tracking-[0.4em] mt-3">
            Gestión de equipo, vigencias y permisos
          </p>
        </div>

        <button
          onClick={() => setOpenModal(true)}
          className="flex items-center gap-3 bg-[#87be00] hover:bg-[#76a500] text-white px-8 py-4 rounded-[1.5rem] font-black uppercase text-[11px] tracking-[0.2em] transition-all shadow-xl shadow-[#87be00]/30 hover:scale-[1.02] active:scale-95"
        >
          <FiPlus size={20} />
          {buttonLabel}
        </button>
      </div>

      {/* STATS & FILTERS */}
      <div className="flex flex-col lg:flex-row gap-6">
        <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard label="Total Equipo" value={stats.total} icon={<FiUsers />} />
          <StatCard label="Activos" value={stats.activos} icon={<FiUserCheck />} color="text-[#87be00]" />
          <StatCard label="Inactivos" value={stats.inactivos} icon={<FiUserX />} color="text-red-500" />
        </div>

        <div className="lg:w-80 flex flex-col gap-4">
          {/* 🚩 BUSCADOR */}
          <div>
            <label className="text-[9px] font-black text-gray-400 uppercase tracking-[0.3em] ml-4 mb-2 block italic">Buscar Colaborador</label>
            <div className="relative">
              <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
              <input 
                type="text"
                placeholder="Nombre o email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-white border border-gray-100 rounded-[1.5rem] pl-12 pr-6 py-4 text-[11px] font-black uppercase tracking-wider outline-none focus:ring-4 focus:ring-[#87be00]/10 shadow-sm transition-all"
              />
            </div>
          </div>

          {loggedUser?.role === "ROOT" && !role && (
            <select
              value={selectedCompany}
              onChange={(e) => setSelectedCompany(e.target.value)}
              className="w-full bg-white border border-gray-100 rounded-[1.5rem] px-6 py-4 text-[11px] font-black uppercase tracking-wider outline-none focus:ring-4 focus:ring-[#87be00]/10 shadow-sm transition-all"
            >
              <option value="">Todas las empresas</option>
              {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          )}
        </div>
      </div>

      {/* TABLA DE USUARIOS */}
      <div className="bg-white rounded-[3.5rem] shadow-2xl shadow-gray-200/60 border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[900px]">
            <thead>
              <tr className="bg-gray-50/70 border-b border-gray-100">
                <th className="p-8 text-[10px] font-black uppercase text-gray-400 tracking-[0.2em]">Colaborador</th>
                <th className="p-8 text-[10px] font-black uppercase text-gray-400 tracking-[0.2em]">Vigencia de Contrato</th>
                {!role && <th className="p-8 text-[10px] font-black uppercase text-gray-400 tracking-[0.2em]">Organización</th>}
                <th className="p-8 text-[10px] font-black uppercase text-gray-400 tracking-[0.2em] text-center">Estado</th>
                <th className="p-8 text-[10px] font-black uppercase text-gray-400 tracking-[0.2em] text-right">Acciones</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr><td colSpan="5" className="p-32 text-center"><div className="inline-block animate-spin rounded-full h-10 w-10 border-[6px] border-[#87be00] border-t-transparent" /></td></tr>
              ) : filteredUsers.length === 0 ? (
                <tr><td colSpan="5" className="p-32 text-center text-gray-400 font-black uppercase text-[10px] tracking-widest italic">Sin registros en esta categoría</td></tr>
              ) : (
                filteredUsers.map(u => (
                  <tr key={u.id} className="hover:bg-gray-50/50 transition-all group">
                    <td className="p-8">
                      <div className="flex items-center gap-5">
                        <UserQuickView 
                          user={u} 
                          isActive={activePopover === u.id}
                          onToggle={() => setActivePopover(activePopover === u.id ? null : u.id)}
                        />
                        <div>
                          <p className="text-base font-black text-gray-900 uppercase tracking-tighter leading-none italic">{u.first_name} {u.last_name}</p>
                          <p className="text-[10px] text-gray-400 mt-2 flex items-center gap-2 font-bold tracking-tight">
                            <FiMail className="text-[#87be00]" size={12}/> {u.email}
                          </p>
                          <p className="text-[9px] text-gray-500 mt-1 font-black uppercase tracking-widest">{u.rut}</p>
                        </div>
                      </div>
                    </td>

                    <td className="p-8">
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-2">
                          <FiClock className="text-[#87be00]" size={12} />
                          <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Inicio:</span>
                          <span className="text-[10px] font-bold text-gray-700 italic">{formatDate(u.fecha_inicio_contrato)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <FiCalendar className={u.fecha_termino_contrato ? "text-red-400" : "text-[#87be00]"} size={12} />
                          <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Término:</span>
                          <span className={`text-[10px] font-bold italic ${u.fecha_termino_contrato ? "text-red-500" : "text-gray-700"}`}>
                            {formatDate(u.fecha_termino_contrato) === "---" ? "INDEFINIDO" : formatDate(u.fecha_termino_contrato)}
                          </span>
                        </div>
                      </div>
                    </td>

                    {!role && (
                      <td className="p-8">
                        <div className="flex flex-col gap-2">
                          <span className="bg-gray-900 text-[#87be00] px-4 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-[0.1em] w-fit shadow-lg shadow-black/10">
                            {u.company_name || 'MASTER CORE'}
                          </span>
                          <span className="bg-[#87be00]/10 text-[#87be00] px-4 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-[0.2em] w-fit italic">
                            {u.role}
                          </span>
                        </div>
                      </td>
                    )}

                    <td className="p-8 text-center">
                      <button
                        onClick={() => toggleUser(u.id)}
                        className={`relative inline-flex h-7 w-14 items-center rounded-full transition-all duration-500 shadow-inner ${
                          u.is_active ? "bg-[#87be00]" : "bg-gray-200"
                        }`}
                      >
                        <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition-all duration-500 ${u.is_active ? "translate-x-8" : "translate-x-1"}`} />
                      </button>
                    </td>

                    <td className="p-8 text-right">
                      <div className="flex justify-end gap-3 opacity-0 group-hover:opacity-100 transition-all transform translate-x-4 group-hover:translate-x-0">
                        <button 
                          onClick={() => { setSelectedUser(u); setOpenEdit(true); }} 
                          className="p-3 bg-gray-50 text-gray-800 rounded-2xl hover:bg-gray-900 hover:text-[#87be00] transition-all shadow-sm border border-gray-100"
                        >
                          <FiEdit2 size={18} />
                        </button>
                        <button 
                          onClick={() => { setSelectedUser(u); setOpenReset(true); }} 
                          className="p-3 bg-gray-50 text-gray-800 rounded-2xl hover:bg-gray-900 hover:text-yellow-400 transition-all shadow-sm border border-gray-100"
                        >
                          <FiKey size={18} />
                        </button>
                        {canDeleteUser(u) && (
                          <button 
                            onClick={() => deleteUser(u.id)} 
                            className="p-3 bg-gray-50 text-gray-800 rounded-2xl hover:bg-red-500 hover:text-white transition-all shadow-sm border border-gray-100"
                          >
                            <FiTrash2 size={18} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODALES */}
      <CreateUserModal isOpen={openModal} onClose={() => setOpenModal(false)} onCreated={fetchUsers} defaultRole={role || ""} />
      {openEdit && <EditUserContactModal user={selectedUser} onClose={() => setOpenEdit(false)} onUpdated={fetchUsers} />}
      {openReset && <ResetPasswordModal user={selectedUser} onClose={() => setOpenReset(false)} />}
    </div>
  )
}

const StatCard = ({ label, value, icon, color = "text-gray-900" }) => (
  <div className="bg-white p-8 rounded-[3rem] shadow-xl shadow-gray-200/40 border border-gray-50 flex items-center gap-6 group hover:scale-[1.02] transition-all">
    <div className={`w-16 h-16 rounded-[1.5rem] bg-gray-50 flex items-center justify-center text-2xl group-hover:bg-gray-900 group-hover:text-[#87be00] transition-all ${color}`}>
      {icon}
    </div>
    <div>
      <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] leading-none mb-2">{label}</p>
      <p className={`text-4xl font-black italic tracking-tighter leading-none ${color}`}>{value}</p>
    </div>
  </div>
)

export default UsersByRole