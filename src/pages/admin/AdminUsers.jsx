import { useEffect, useState, useCallback, useRef } from "react"
import {
  FiUserPlus,
  FiRotateCw,
  FiEdit,
  FiTrash,
  FiActivity,
  FiUsers,
  FiEye,
  FiShield,
  FiMapPin,
  FiFileText,
  FiUploadCloud,
  FiMoreVertical,
  FiCheckCircle,
  FiPhone 
} from "react-icons/fi"
import { toast } from "react-hot-toast"
import api from "../../api/apiClient"

import CreateAdminUserModal from "../../components/CreateAdminUserModal"
import EditAdminUserModal from "../../components/EditAdminUserModal"
import ResetPasswordAdminModal from "../../components/ResetPasswordAdminModal"
import AssignLocalesModal from "./AssignLocalesModal" 
import UserQuickView from "../../components/UserQuickView" 
import { motion, AnimatePresence } from "framer-motion"

const AdminUsers = () => {
  const [users, setUsers] = useState([])
  const [stats, setStats] = useState(null)
  const [openModal, setOpenModal] = useState(false)
  const [editUser, setEditUser] = useState(null)
  const [resetUser, setResetUser] = useState(null)
  const [assignSupervisor, setAssignSupervisor] = useState(null)
  const [loading, setLoading] = useState(true)
  const [bulkLoading, setBulkLoading] = useState(false)

  const [activePopover, setActivePopover] = useState(null)

  const fileInputRef = useRef(null)
  const userLocal = JSON.parse(localStorage.getItem("user"))

  const safe = (value) => {
    const num = Number(value)
    return isNaN(num) ? 0 : num
  }

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      const timestamp = Date.now()
      const [usersData, statsData] = await Promise.all([
        api.get(`users?ts=${timestamp}`),
        api.get(`users/company/${userLocal.company_id}/stats?ts=${timestamp}`)
      ])
      setUsers(usersData)
      setStats(statsData)
    } catch (error) {
      console.error("FETCH ERROR:", error)
    } finally {
      setLoading(false)
    }
  }, [userLocal.company_id])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleBulkUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    const formData = new FormData()
    formData.append("excel", file)
    formData.append("company_id", userLocal.company_id)

    try {
      setBulkLoading(true)
      const res = await api.post("/users/bulk", formData)
      toast.success(res.message || "Carga masiva completada con éxito")
      if (res.errors?.length > 0) toast.error("Algunos registros fallaron.")
      fetchData()
    } catch (error) {
      toast.error(error.response?.data?.message || "Error al procesar el archivo")
    } finally {
      setBulkLoading(false)
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
  }

  const toggleUser = async (id) => {
    try {
      await api.patch(`users/${id}/toggle`)
      toast.success("Estado actualizado")
      fetchData()
    } catch (error) {
      toast.error("Error al cambiar estado")
    }
  }

  const deleteUser = async (targetUser) => {
    if (targetUser.role === "ADMIN_CLIENTE") return toast.error("No puedes eliminar otro Administrador")
    if (targetUser.id === userLocal.id) return toast.error("No puedes eliminarte a ti mismo")
    if (!window.confirm(`¿Eliminar permanentemente a ${targetUser.first_name}?`)) return
    try {
      await api.delete(`users/${targetUser.id}`)
      toast.success("Usuario eliminado")
      fetchData()
    } catch (error) {
      toast.error("Error al eliminar")
    }
  }

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-20 gap-4">
      <div className="w-10 h-10 border-4 border-[#87be00] border-t-transparent rounded-full animate-spin" />
      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest italic">Sincronizando equipo...</p>
    </div>
  )

  if (!stats) return null

  const usedSupervisors = safe(stats.counts?.SUPERVISOR)
  const usedUsers = safe(stats.counts?.USUARIO)
  const usedView = safe(stats.counts?.VIEW)
  const maxSupervisors = safe(stats.limits?.max_supervisors)
  const maxUsers = safe(stats.limits?.max_users)
  const maxView = safe(stats.limits?.max_view)

  const ProgressCard = ({ title, used, max, color, icon }) => {
    const percentage = max > 0 ? (used / max) * 100 : 0
    return (
      <div className="bg-white p-5 md:p-6 rounded-[1.5rem] md:rounded-[2rem] shadow-sm border border-gray-50 flex flex-col justify-between group hover:shadow-lg transition-all duration-500">
        <div className="flex justify-between items-start mb-4">
          <div className="p-2.5 md:p-3 bg-gray-50 rounded-xl md:rounded-2xl text-gray-400 group-hover:bg-gray-900 group-hover:text-[#87be00] transition-colors">{icon}</div>
          <p className="text-[8px] md:text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mt-1">{title}</p>
        </div>
        <div>
          <p className="text-2xl md:text-3xl font-black text-gray-800 tracking-tighter italic leading-none mb-3 md:mb-4">
            {used} <span className="text-xs md:text-sm text-gray-200 font-bold uppercase tracking-widest not-italic">/ {max}</span>
          </p>
          <div className="w-full bg-gray-100 rounded-full h-1 md:h-1.5 overflow-hidden">
            <div
              className={`${color} h-full rounded-full transition-all duration-1000 ease-out`}
              style={{ width: `${percentage}%` }}
            />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 md:space-y-10 animate-in fade-in duration-700 font-[Outfit] pb-20 px-2 sm:px-0" onClick={() => setActivePopover(null)}>
      
      {/* HEADER */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 px-2 md:px-4">
        <div>
          <h1 className="text-3xl md:text-5xl font-black text-gray-900 tracking-tighter uppercase italic leading-none">
            Usuarios
          </h1>
          <p className="text-[9px] md:text-[10px] font-black text-[#87be00] uppercase tracking-[0.3em] mt-2 md:mt-3">
            Control de accesos y licencias de empresa
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 md:gap-3">
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={bulkLoading}
            className="flex-1 lg:flex-none flex items-center justify-center gap-2 md:gap-3 bg-gray-900 text-[#87be00] px-4 md:px-6 py-3.5 md:py-4 rounded-xl md:rounded-2xl font-black uppercase text-[9px] md:text-[10px] tracking-widest transition-all hover:bg-black shadow-xl shadow-gray-200 disabled:opacity-40"
          >
            {bulkLoading ? <FiRotateCw className="animate-spin" size={16} /> : <FiUploadCloud size={16} />}
            <span className="truncate">Carga Masiva</span>
          </button>
          <input type="file" ref={fileInputRef} className="hidden" accept=".xlsx, .xls, .csv" onChange={handleBulkUpload} />

          <button
            onClick={() => setOpenModal(true)}
            className="flex-1 lg:flex-none flex items-center justify-center gap-2 md:gap-3 bg-[#87be00] hover:bg-[#76a500] text-white px-4 md:px-8 py-3.5 md:py-4 rounded-xl md:rounded-2xl font-black uppercase text-[9px] md:text-[10px] tracking-widest transition-all shadow-xl shadow-[#87be00]/20 disabled:opacity-40"
          >
            <FiUserPlus size={18} />
            <span className="truncate">Crear Usuario</span>
          </button>
        </div>
      </div>

      {/* STATS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 px-2 md:px-0">
        <ProgressCard title="Supervisores" used={usedSupervisors} max={maxSupervisors} color="bg-[#87be00]" icon={<FiShield size={20}/>} />
        <ProgressCard title="Mercaderistas" used={usedUsers} max={maxUsers} color="bg-blue-600" icon={<FiUsers size={20}/>} />
        <ProgressCard title="Solo Vista" used={usedView} max={maxView} color="bg-gray-900" icon={<FiEye size={20}/>} />
      </div>

      {/* VISTA MÓVIL */}
      <div className="md:hidden space-y-4 px-2">
        {users.map((user, idx) => (
          <motion.div 
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.05 }}
            key={user.id}
            className="bg-white p-5 rounded-[2rem] shadow-sm border border-gray-100 flex flex-col gap-4 relative overflow-hidden"
          >
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-4 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-gray-900 text-[#87be00] flex items-center justify-center font-black text-xs shrink-0">
                  {user.first_name?.charAt(0)}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-black text-gray-900 uppercase italic truncate">{user.first_name} {user.last_name}</p>
                  <div className="flex flex-wrap gap-2 mt-1">
                    <span className="text-[8px] font-black text-[#87be00] uppercase italic bg-[#87be00]/10 px-2 py-0.5 rounded-md border border-[#87be00]/10 whitespace-nowrap">
                      {user.role}
                    </span>
                    <span className="text-[8px] font-black text-blue-500 uppercase italic bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100 whitespace-nowrap">
                      {user.tipo_contrato?.replace(/_/g, ' ') || 'NO DEFINIDO'}
                    </span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => toggleUser(user.id)}
                className={`relative inline-flex h-5 w-10 items-center rounded-full transition-all shrink-0 ${user.is_active ? "bg-[#87be00]" : "bg-gray-200"}`}
              >
                <span className={`inline-block h-3 w-3 transform rounded-full bg-white transition-all ${user.is_active ? "translate-x-6" : "translate-x-1"}`} />
              </button>
            </div>

            <div className="flex items-center gap-2 text-[10px] font-bold text-gray-400 truncate bg-gray-50 p-2.5 rounded-xl border border-gray-50">
              <FiFileText className="text-[#87be00] shrink-0" /> <span className="truncate">{user.email}</span>
            </div>

            <div className="grid grid-cols-4 gap-2 pt-1">
              {user.role === 'SUPERVISOR' && (
                <button onClick={() => setAssignSupervisor(user)} className="py-2.5 bg-gray-50 text-[#87be00] rounded-xl flex items-center justify-center border border-gray-100"><FiMapPin size={16}/></button>
              )}
              <button onClick={() => setEditUser(user)} className="py-2.5 bg-gray-50 text-gray-700 rounded-xl flex items-center justify-center border border-gray-100"><FiEdit size={16}/></button>
              <button onClick={() => setResetUser(user)} className="py-2.5 bg-gray-50 text-gray-700 rounded-xl flex items-center justify-center border border-gray-100"><FiRotateCw size={16}/></button>
              {user.role !== "ADMIN_CLIENTE" && user.id !== userLocal.id && (
                <button onClick={() => deleteUser(user)} className="py-2.5 bg-red-50 text-red-400 rounded-xl flex items-center justify-center border border-red-50"><FiTrash size={16}/></button>
              )}
            </div>
          </motion.div>
        ))}
      </div>

      {/* VISTA DESKTOP */}
      <div className="hidden md:block bg-white rounded-[2rem] shadow-xl shadow-gray-100/50 border border-gray-100 overflow-hidden mx-2 lg:mx-0">
        <div className="max-h-[65vh] overflow-auto custom-scrollbar">
          <table className="w-full text-left border-collapse min-w-max">
            <thead className="sticky top-0 bg-white z-20 border-b border-gray-100 shadow-sm">
              <tr>
                <th className="px-6 py-5 text-[10px] font-black uppercase text-gray-400 tracking-[0.2em] whitespace-nowrap">Colaborador</th>
                <th className="px-6 py-5 text-[10px] font-black uppercase text-gray-400 tracking-[0.2em] text-center whitespace-nowrap">Rol</th>
                <th className="px-6 py-5 text-[10px] font-black uppercase text-gray-400 tracking-[0.2em] text-center whitespace-nowrap">Contrato</th>
                <th className="px-6 py-5 text-[10px] font-black uppercase text-gray-400 tracking-[0.2em] text-center whitespace-nowrap">Teléfono</th>
                <th className="px-6 py-5 text-[10px] font-black uppercase text-gray-400 tracking-[0.2em] text-center whitespace-nowrap">Correo</th>
                <th className="px-6 py-5 text-[10px] font-black uppercase text-gray-400 tracking-[0.2em] text-center whitespace-nowrap">Estado</th>
                <th className="px-6 py-5 text-[10px] font-black uppercase text-gray-400 tracking-[0.2em] text-right whitespace-nowrap">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50/50">
              {users.map(user => (
                <tr key={user.id} className="hover:bg-gray-50/80 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-5">
                      <UserQuickView 
                        user={user} 
                        isActive={activePopover === user.id} 
                        onToggle={() => setActivePopover(activePopover === user.id ? null : user.id)}
                      />
                      <div className="min-w-0">
                        <p className="text-[13px] font-black text-gray-900 uppercase tracking-tighter leading-none italic">
                          {user.first_name} {user.last_name}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className="bg-[#87be00]/10 text-[#87be00] px-4 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest italic border border-[#87be00]/10 whitespace-nowrap inline-block">
                      {user.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className="bg-blue-50 text-blue-600 px-4 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest italic border border-blue-100 whitespace-nowrap inline-block">
                      {user.tipo_contrato?.replace(/_/g, ' ') || 'NO DEFINIDO'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-center gap-2 whitespace-nowrap text-[11px] font-bold text-gray-500">
                      <FiPhone className="text-[#87be00]/60" size={12} /> {user.phone || '—'}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-center gap-2 whitespace-nowrap text-[11px] font-bold text-gray-500">
                      <FiFileText className="text-[#87be00]/60" size={12} /> {user.email}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <button onClick={() => toggleUser(user.id)} className={`relative inline-flex h-6 w-12 items-center rounded-full transition-colors duration-300 shadow-inner ${user.is_active ? "bg-[#87be00]" : "bg-gray-200"}`}>
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform duration-300 ${user.is_active ? "translate-x-7" : "translate-x-1"}`} />
                    </button>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2 text-gray-400">
                      {user.role === 'SUPERVISOR' && (
                        <button onClick={() => setAssignSupervisor(user)} className="p-2.5 bg-gray-50 rounded-xl hover:bg-gray-900 hover:text-white transition-all shadow-sm" title="Asignar Cobertura"><FiMapPin size={16} /></button>
                      )}
                      <button onClick={() => setEditUser(user)} className="p-2.5 bg-gray-50 rounded-xl hover:bg-gray-900 hover:text-[#87be00] transition-all shadow-sm"><FiEdit size={16} /></button>
                      <button onClick={() => setResetUser(user)} className="p-2.5 bg-gray-50 rounded-xl hover:bg-gray-900 hover:text-yellow-400 transition-all shadow-sm"><FiRotateCw size={16} /></button>
                      {user.role !== "ADMIN_CLIENTE" && user.id !== userLocal.id && (
                        <button onClick={() => deleteUser(user)} className="p-2.5 bg-gray-50 rounded-xl hover:bg-red-500 hover:text-white transition-all shadow-sm"><FiTrash size={16} /></button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <CreateAdminUserModal isOpen={openModal} onClose={() => setOpenModal(false)} onCreated={fetchData} />
      <EditAdminUserModal isOpen={!!editUser} user={editUser} stats={stats} onClose={() => setEditUser(null)} onUpdated={fetchData} />
      {resetUser && <ResetPasswordAdminModal user={resetUser} onClose={() => setResetUser(null)} onUpdated={fetchData} />}
      {assignSupervisor && <AssignLocalesModal supervisor={assignSupervisor} onClose={() => setAssignSupervisor(null)} onRefresh={fetchData} />}
    </div>
  )
}

export default AdminUsers