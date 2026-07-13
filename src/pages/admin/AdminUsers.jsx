import React, { useEffect, useState, useCallback, useRef } from "react"
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
  FiPhone,
  FiSearch,
  FiX,
  FiAlertTriangle
} from "react-icons/fi"
import { toast } from "react-hot-toast"
import api from "../../api/apiClient"

import CreateAdminUserModal from "../admin/CreateAdminUserModal"
import EditAdminUserModal from "./EditAdminUserModal"
import ResetPasswordAdminModal from "../../components/ResetPasswordAdminModal"
import AssignLocalesModal from "./AssignLocalesModal"
import AssignUsersModal from "./AssignUsersModal"
import UserQuickView from "../../components/UserQuickView"
import { motion, AnimatePresence } from "framer-motion"

const AdminUsers = () => {
  const [users, setUsers] = useState([])
  const [stats, setStats] = useState(null)
  const [openModal, setOpenModal] = useState(false)
  const [editUser, setEditUser] = useState(null)
  const [resetUser, setResetUser] = useState(null)
  const [assignSupervisor, setAssignSupervisor] = useState(null)
  const [userToDelete, setUserToDelete] = useState(null)
  
  // ESTADO UNIFICADO PARA ASIGNACIÓN DE USUARIOS
  const [assignUser, setAssignUser] = useState(null)
  
  const [loading, setLoading] = useState(true)
  const [bulkLoading, setBulkLoading] = useState(false)
  
  const [searchTerm, setSearchTerm] = useState("")
  const [activePopover, setActivePopover] = useState(null)

  const fileInputRef = useRef(null)
  const userLocal = JSON.parse(localStorage.getItem("user"))

  // LÓGICA DE FILTRADO ACTUALIZADA CON RUT
  const filteredUsers = users.filter((user) => {
    const term = searchTerm.toLowerCase()
    const fullName = `${user.first_name} ${user.last_name}`.toLowerCase()
    const email = user.email?.toLowerCase() || ""
    const rut = user.rut?.toLowerCase() || ""
    
    return fullName.includes(term) || email.includes(term) || rut.includes(term)
  })

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
    try {
      await api.delete(`users/${targetUser.id}`)
      toast.success("Usuario eliminado")
      fetchData()
      setUserToDelete(null)
    } catch (error) {
      toast.error("Error al eliminar")
    }
  }

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-20 gap-4 font-[Outfit]">
      <div className="w-9 h-9 border-2 border-[#5c9200] border-t-transparent rounded-full animate-spin" />
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Sincronizando equipo...</p>
    </div>
  )

  if (!stats) return null

  const usedSupervisors = safe(stats.counts?.SUPERVISOR)
  const usedUsers = safe(stats.counts?.USUARIO)
  const usedView = safe(stats.counts?.VIEW)
  const maxSupervisors = safe(stats.limits?.max_supervisors)
  const maxUsers = safe(stats.limits?.max_users)
  const maxView = safe(stats.limits?.max_view)

  const ProgressCard = ({ title, used, max, color, icon, bgClass }) => {
    const percentage = max > 0 ? (used / max) * 100 : 0
    return (
      <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between transition-all duration-300">
        <div className="flex justify-between items-start mb-4">
          <div className={`p-2.5 rounded-xl ${bgClass} transition-colors`}>{icon}</div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-1">{title}</p>
        </div>
        <div>
          <p className="text-2xl font-extrabold text-[#111111] leading-none mb-3">
            {used} <span className="text-xs text-slate-300 font-bold tracking-wider">/ {max}</span>
          </p>
          <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
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
    /* CAMBIO CLAVE: Cambiamos 'w-full' por 'flex-1 transition-all duration-300' 
      y agregamos 'relative' para que todos los elementos y modales internos se 
      reajusten armónicamente con la animación del Sidebar.
    */
    <div className="flex-1 transition-all duration-300 space-y-8 animate-in fade-in duration-500 font-[Outfit] pb-12 pt-20 md:pt-4 bg-slate-50/50 min-h-screen relative" onClick={() => setActivePopover(null)}>
      
      {/* HEADER */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 px-6">
        <div>
          <h1 className="text-3xl md:text-4xl font-extrabold text-[#111111] tracking-tight uppercase leading-none">
            Usuarios
          </h1>
          <p className="text-[10px] font-bold text-[#5c9200] uppercase tracking-[0.25em] mt-2.5">
            Control de accesos y licencias de empresa
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={bulkLoading}
            className="flex-1 lg:flex-none flex items-center justify-center gap-2 bg-[#111111] text-[#5c9200] px-5 py-3.5 rounded-xl font-bold uppercase text-[10px] tracking-wider transition-all shadow-sm disabled:opacity-40"
          >
            {bulkLoading ? <FiRotateCw className="animate-spin" size={14} /> : <FiUploadCloud size={14} />}
            <span className="truncate">Carga Masiva</span>
          </button>
          <input type="file" ref={fileInputRef} className="hidden" accept=".xlsx, .xls, .csv" onChange={handleBulkUpload} />

          <button
            onClick={() => setOpenModal(true)}
            className="flex-1 lg:flex-none flex items-center justify-center gap-2 bg-[#5c9200] hover:bg-[#4a7500] text-white px-6 py-3.5 rounded-xl font-bold uppercase text-[10px] tracking-wider transition-all shadow-sm"
          >
            <FiUserPlus size={15} />
            <span className="truncate">Crear Usuario</span>
          </button>
        </div>
      </div>

      {/* CARDS DE PROGRESO */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 px-6">
        <ProgressCard title="Supervisores" used={usedSupervisors} max={maxSupervisors} color="bg-[#5c9200]" bgClass="bg-emerald-50 text-[#5c9200]" icon={<FiShield size={18}/>} />
        <ProgressCard title="Mercaderistas" used={usedUsers} max={maxUsers} color="bg-blue-500" bgClass="bg-blue-50 text-blue-500" icon={<FiUsers size={18}/>} />
        <ProgressCard title="Solo Vista" used={usedView} max={maxView} color="bg-slate-800" bgClass="bg-slate-100 text-slate-700" icon={<FiEye size={18}/>} />
      </div>

      {/* VISTA MÓVIL */}
      <div className="md:hidden space-y-4 px-6">
        <div className="relative w-full my-4">
          <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input
            type="text"
            placeholder="Buscar por nombre, correo o RUT..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-white border border-slate-200 pl-11 pr-4 py-3.5 rounded-xl text-[12px] font-medium text-slate-700 placeholder-slate-400 outline-none focus:border-[#5c9200] focus:ring-1 focus:ring-[#5c9200] transition-all shadow-sm"
          />
        </div>

        {filteredUsers.map((user, idx) => (
          <motion.div
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.04 }}
            key={user.id}
            className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex flex-col gap-4 relative overflow-hidden"
          >
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-3.5 min-w-0 pr-2">
                <div className="w-11 h-11 rounded-xl bg-slate-100 text-slate-700 border border-slate-200 flex items-center justify-center font-bold text-xs shrink-0">
                  {user.first_name?.charAt(0)}
                </div>
                <div className="min-w-0">
                  <p className="text-[13px] font-bold text-[#111111] uppercase truncate">{user.first_name} {user.last_name}</p>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    <span className="text-[8px] font-extrabold text-[#5c9200] uppercase bg-[#5c9200]/10 px-2 py-0.5 rounded border border-[#5c9200]/5 whitespace-nowrap">
                      {user.role}
                    </span>
                    <span className="text-[8px] font-extrabold text-blue-600 uppercase bg-blue-50 px-2 py-0.5 rounded border border-blue-100 whitespace-nowrap">
                      {user.tipo_contrato?.replace(/_/g, ' ') || 'NO DEFINIDO'}
                    </span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => toggleUser(user.id)}
                className={`h-5 w-10 rounded-full transition-colors relative inline-flex items-center p-0.5 shrink-0 ${user.is_active ? "bg-[#5c9200]" : "bg-slate-200"}`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${user.is_active ? "translate-x-5" : "translate-x-0"}`} />
              </button>
            </div>

            <div className="flex items-center gap-2 text-[11px] font-medium text-slate-500 truncate bg-slate-50 p-2.5 rounded-xl border border-slate-100">
              <FiFileText className="text-[#5c9200] shrink-0" size={13} /> <span className="truncate">{user.email}</span>
            </div>

            <div className="grid grid-cols-5 gap-1.5 pt-1">
              {(user.role === 'SUPERVISOR' || user.role === 'VIEW') && (
                <button onClick={() => setAssignSupervisor(user)} className="py-2.5 bg-emerald-50 text-[#5c9200] rounded-lg flex items-center justify-center border border-emerald-100" title="Asignar Locales">
                  <FiMapPin size={14}/>
                </button>
              )}
              {(user.role === 'VIEW' || user.role === 'SUPERVISOR') && (
                <button onClick={() => setAssignUser(user)} className="py-2.5 bg-blue-50 text-blue-500 rounded-lg flex items-center justify-center border border-blue-100" title="Asignar Usuarios">
                  <FiUsers size={14}/>
                </button>
              )}
              <button onClick={() => setEditUser(user)} className="py-2.5 bg-slate-50 text-slate-600 border border-slate-200 rounded-lg flex items-center justify-center"><FiEdit size={14}/></button>
              <button onClick={() => setResetUser(user)} className="py-2.5 bg-slate-50 text-slate-600 border border-slate-200 rounded-lg flex items-center justify-center"><FiRotateCw size={14}/></button>
              {user.role !== "ADMIN_CLIENTE" && user.id !== userLocal.id && (
                <button onClick={() => setUserToDelete(user)} className="py-2.5 bg-rose-50 text-rose-600 border border-rose-100 rounded-lg flex items-center justify-center"><FiTrash size={14}/></button>
              )}
            </div>
          </motion.div>
        ))}
      </div>

      {/* VISTA DESKTOP */}
      <div className="hidden md:block bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm mx-6">
        
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/40">
          <div className="relative max-w-md">
            <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              type="text"
              placeholder="Buscar por nombre, correo o RUT..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white border border-slate-200 pl-11 pr-4 py-3 text-[12px] font-medium text-slate-700 placeholder-slate-400 outline-none focus:border-[#5c9200] focus:ring-1 focus:ring-[#5c9200] transition-all shadow-sm"
            />
          </div>
        </div>
        
        <div className="max-h-[65vh] overflow-auto custom-scrollbar">
          <table className="w-full text-left border-collapse min-w-max">
            <thead className="sticky top-0 bg-slate-50 z-20 border-b border-slate-100">
              <tr>
                <th className="px-6 py-4 text-[10px] font-bold uppercase text-slate-400 tracking-[0.15em] whitespace-nowrap">Colaborador</th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase text-slate-400 tracking-[0.15em] text-center whitespace-nowrap">Rol</th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase text-slate-400 tracking-[0.15em] text-center whitespace-nowrap">Contrato</th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase text-slate-400 tracking-[0.15em] text-center whitespace-nowrap">Teléfono</th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase text-slate-400 tracking-[0.15em] text-center whitespace-nowrap">Correo</th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase text-slate-400 tracking-[0.15em] text-center whitespace-nowrap">Estado</th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase text-slate-400 tracking-[0.15em] text-right whitespace-nowrap">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredUsers.map(user => (
                <tr key={user.id} className="hover:bg-slate-50/60 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-4">
                      <UserQuickView
                        user={user}
                        isActive={activePopover === user.id}
                        onToggle={() => setActivePopover(activePopover === user.id ? null : user.id)}
                      />
                      <div className="min-w-0">
                        <p className="text-[13px] font-bold text-[#111111] uppercase tracking-tight">
                          {user.first_name} {user.last_name}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className="bg-[#5c9200]/10 text-[#5c9200] px-3 py-1 rounded-lg text-[9px] font-extrabold uppercase tracking-wider border border-[#5c9200]/5 whitespace-nowrap inline-block">
                      {user.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className="bg-blue-50 text-blue-600 px-3 py-1 rounded-lg text-[9px] font-extrabold uppercase tracking-wider border border-blue-100 whitespace-nowrap inline-block">
                      {user.tipo_contrato?.replace(/_/g, ' ') || 'NO DEFINIDO'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-center gap-2 whitespace-nowrap text-[12px] font-medium text-slate-600">
                      <FiPhone className="text-slate-400" size={13} /> {user.phone || '—'}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-center gap-2 whitespace-nowrap text-[12px] font-medium text-slate-600">
                      <FiFileText className="text-slate-400" size={13} /> {user.email}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <button onClick={() => toggleUser(user.id)} className={`h-5 w-10 rounded-full transition-colors relative inline-flex items-center p-0.5 ${user.is_active ? "bg-[#5c9200]" : "bg-slate-200"}`}>
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${user.is_active ? "translate-x-5" : "translate-x-0"}`} />
                    </button>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-1.5 text-slate-400">
                      {(user.role === 'SUPERVISOR' || user.role === 'VIEW') && (
                        <button onClick={() => setAssignSupervisor(user)} className="p-2.5 bg-emerald-50 text-[#5c9200] border border-emerald-100 rounded-lg flex items-center justify-center transition-colors" title="Asignar Locales">
                          <FiMapPin size={14} />
                        </button>
                      )}
                      {(user.role === 'VIEW' || user.role === 'SUPERVISOR') && (
                        <button onClick={() => setAssignUser(user)} className="p-2.5 bg-blue-50 text-blue-500 border border-blue-100 rounded-lg flex items-center justify-center transition-colors" title="Asignar Usuarios">
                          <FiUsers size={14} />
                        </button>
                      )}
                      <button onClick={() => setEditUser(user)} className="p-2.5 bg-slate-50 text-slate-600 border border-slate-200 rounded-lg transition-colors" title="Editar"><FiEdit size={14} /></button>
                      <button onClick={() => setResetUser(user)} className="p-2.5 bg-slate-50 text-slate-600 border border-slate-200 rounded-lg transition-colors" title="Clave"><FiRotateCw size={14} /></button>
                      {user.role !== "ADMIN_CLIENTE" && user.id !== userLocal.id && (
                        <button onClick={() => setUserToDelete(user)} className="p-2.5 bg-rose-50 text-rose-600 border border-rose-100 rounded-lg transition-colors" title="Eliminar"><FiTrash size={14} /></button>
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
      {assignUser && <AssignUsersModal targetUser={assignUser} onClose={() => setAssignUser(null)} onRefresh={fetchData} />}

      {/* MODAL DE ELIMINACIÓN ASOCIADO EN ABSOLUTE AL FLUJO DEL SIDEBAR */}
      {userToDelete && (
        <DeleteAdminUserModal 
          user={userToDelete} 
          onClose={() => setUserToDelete(null)} 
          onConfirm={() => deleteUser(userToDelete)} 
        />
      )}
    </div>
  )
}

/* SUB-COMPONENTE: MODAL DE ELIMINACIÓN EXCLUSIVO CON POSICIÓN ABSOLUTE */
const DeleteAdminUserModal = ({ user, onClose, onConfirm }) => {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleConfirm = async () => {
    setIsDeleting(true);
    await onConfirm();
    setIsDeleting(false);
  };

  return (
    <div className="absolute inset-0 bg-[#111111]/70 backdrop-blur-sm flex items-center justify-center p-4 z-[110] font-[Outfit] transition-all duration-300 min-h-full">
      <div className="bg-white w-full max-w-md rounded-2xl border border-slate-100 shadow-2xl p-6 relative animate-in fade-in zoom-in duration-200">
        
        <button onClick={onClose} className="absolute top-4 right-4 p-1.5 bg-slate-50 hover:bg-slate-100 text-slate-400 hover:text-slate-600 rounded-lg transition-all">
          <FiX size={16} />
        </button>

        <div className="flex flex-col items-center text-center mt-3">
          <div className="w-11 h-11 bg-rose-50 text-rose-600 rounded-xl flex items-center justify-center mb-4">
            <FiAlertTriangle size={22} />
          </div>
          
          <h3 className="text-base font-extrabold text-[#111111] uppercase tracking-tight">
            ¿Confirmar Eliminación?
          </h3>
          
          <p className="text-xs text-slate-500 mt-2 leading-relaxed">
            Estás a punto de eliminar de forma permanente al colaborador <strong className="text-slate-800 uppercase font-bold">{user.first_name} {user.last_name}</strong>. Esta acción no se puede revertir.
          </p>
          
          <div className="bg-slate-50 border border-slate-100 rounded-xl p-2.5 mt-3.5 w-full flex items-center justify-center gap-2">
            <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider">Rol: {user.role}</span>
            <span className="text-slate-300">•</span>
            <span className="text-[10px] font-medium font-mono text-slate-500">ID: {user.id?.slice(0, 8)}...</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 mt-6">
          <button 
            onClick={onClose} 
            disabled={isDeleting}
            className="w-full py-3 bg-slate-50 hover:bg-slate-100 text-slate-500 font-bold uppercase text-[10px] tracking-wider rounded-xl transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          
          <button
            onClick={handleConfirm}
            disabled={isDeleting}
            className="w-full bg-rose-600 hover:bg-rose-700 text-white py-3 rounded-xl font-bold uppercase tracking-wider text-[10px] transition-all flex items-center justify-center gap-1.5 shadow-sm disabled:opacity-50"
          >
            {isDeleting ? (
              <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <FiTrash size={13} /> Eliminar
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
};

export default AdminUsers;