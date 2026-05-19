import { useEffect, useRef, useState } from "react"
import { FiPlus, FiBriefcase, FiUsers, FiEye, FiActivity, FiEdit3, FiTrash2, FiShield, FiHash } from "react-icons/fi"
import CreateCompanyModal from "../../components/CreateCompanyModal"
import { toast } from "react-hot-toast"
import api from "../../api/apiClient"
import { useAuth } from "../../context/AuthContext"
import { motion, AnimatePresence } from "framer-motion"
// 🚩 IMPORTANTE: Importamos el nuevo componente
import EmpresaQuickView from "../../components/EmpresaQuickView"

const Companies = () => {
  const { user } = useAuth()
  const [companies, setCompanies] = useState([])
  const [openModal, setOpenModal] = useState(false)
  const [loading, setLoading] = useState(true)
  const [editingCompany, setEditingCompany] = useState(null)

  // 🚩 ESTADO PARA COORDINAR EL QUICK VIEW
  const [activePopover, setActivePopover] = useState(null)

  const ID_CULTIVA = '0e342e01-d213-4353-b210-39a12ac335cf'; 

  const isRoot = user?.role === "ROOT"
  const isCultivaAdmin = user?.role === "ADMIN_CLIENTE" && user?.company_id === ID_CULTIVA
  const hasFullAccess = isRoot || isCultivaAdmin

  // 🛡️ REGLA DE SEGURIDAD: Define si el usuario actual puede apagar esta empresa específica
  const canToggle = (companyId) => {
    if (!hasFullAccess) return false;
    // Si es el Admin de Cultiva y la empresa en la fila es Cultiva, bloqueamos la acción
    if (isCultivaAdmin && companyId === ID_CULTIVA) return false;
    // El Root siempre puede, o el Admin de Cultiva sobre otras empresas
    return true;
  }

  useEffect(() => {
    fetchCompanies()
  }, [])

  const fetchCompanies = async () => {
    try {
      setLoading(true)
      const data = await api.get("/companies")
      setCompanies(data || [])
    } catch (err) {
      toast.error("No se pudieron cargar las empresas")
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (company) => {
    setEditingCompany(company)
    setOpenModal(true)
  }

  const handleCloseModal = () => {
    setEditingCompany(null)
    setOpenModal(false)
  }

  const toggleCompany = async (id) => {
    // 🛡️ Doble validación en la función por seguridad
    if (!canToggle(id)) return toast.error("No tienes permisos para cambiar el estado de la empresa principal")
    try {
      await api.patch(`/companies/${id}/toggle`)
      toast.success("Estado de empresa actualizado")
      fetchCompanies()
    } catch (err) {
      toast.error("Error al cambiar estado")
    }
  }

  const handleDelete = async (company) => {
    if (!isRoot) return toast.error("Acción restringida: Solo ROOT puede eliminar")
    const confirmDelete = window.confirm(`¿Estás seguro de eliminar a "${company.name}"?`)
    if (!confirmDelete) return
    try {
      await api.delete(`/companies/${company.id}`)
      toast.success("Empresa eliminada correctamente")
      fetchCompanies()
    } catch (err) {
      toast.error(err.message || "Error al eliminar")
    }
  }

  return (
    // 🚩 Al hacer clic en el fondo cerramos cualquier QuickView abierto
    <div 
      className="space-y-6 md:space-y-8 animate-in fade-in duration-700 font-[Outfit] pb-20 px-2 sm:px-0"
      onClick={() => setActivePopover(null)}
    >
      
      {/* HEADER RESPONSIVO */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 px-2 md:px-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="min-w-0">
            <h2 className="text-3xl md:text-5xl font-black text-gray-900 tracking-tighter uppercase italic leading-none">
              Empresas
            </h2>
            <p className="text-[9px] md:text-[10px] font-black text-[#87be00] uppercase tracking-[0.3em] mt-3 italic leading-tight">
              {hasFullAccess ? "Administración Global de Clientes" : `Gestión: ${user?.company_name}`}
            </p>
          </div>
          {isCultivaAdmin && (
            <div className="px-3 py-1.5 bg-blue-50 border border-blue-100 rounded-xl flex items-center gap-2 w-max animate-pulse">
              <FiShield className="text-blue-600" size={12} />
              <span className="text-[8px] font-black text-blue-600 uppercase">Acceso Elevado</span>
            </div>
          )}
        </div>

        {hasFullAccess && (
          <button
            onClick={() => setOpenModal(true)}
            className="w-full lg:w-auto flex items-center justify-center gap-2 bg-[#87be00] hover:bg-black text-white px-8 py-4 rounded-xl md:rounded-2xl font-black uppercase text-[10px] md:text-[11px] tracking-widest transition-all shadow-xl shadow-[#87be00]/20 active:scale-95 group"
          >
            <FiPlus size={18} className="group-hover:rotate-90 transition-transform" />
            Crear Nueva Empresa
          </button>
        )}
      </div>

      {/* 🚩 VISTA MÓVIL: CARDS (Oculta en md) */}
      <div className="md:hidden space-y-4 px-2">
        {loading ? (
          <div className="py-20 text-center"><div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-[#87be00] border-t-transparent"></div></div>
        ) : (
          companies.map((company, idx) => {
            const disableToggle = !canToggle(company.id);

            return (
              <motion.div 
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.05 }}
                key={company.id}
                className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-gray-100 flex flex-col gap-4 relative"
              >
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-3 min-w-0">
                    
                    {/* INTEGRACIÓN QUICK VIEW EN MÓVIL */}
                    <EmpresaQuickView 
                      company={company}
                      isActive={activePopover === `mob-${company.id}`}
                      onToggle={() => setActivePopover(activePopover === `mob-${company.id}` ? null : `mob-${company.id}`)}
                    />

                    <div className="min-w-0">
                      <p className="text-sm font-black text-gray-800 uppercase italic truncate tracking-tight">{company.name}</p>
                      <p className="text-[10px] text-gray-400 font-bold uppercase font-mono">{company.rut}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                     <button onClick={() => handleEdit(company)} className="p-2.5 bg-gray-50 text-gray-400 rounded-xl"><FiEdit3 size={14}/></button>
                     {isRoot && <button onClick={() => handleDelete(company)} className="p-2.5 bg-red-50 text-red-400 rounded-xl"><FiTrash2 size={14}/></button>}
                  </div>
                </div>

                {/* LIMITES EN GRID */}
                <div className="grid grid-cols-3 gap-2 bg-gray-50 p-4 rounded-[1.5rem] border border-gray-100">
                  <StatSimple label="SUPS" value={company.max_supervisors} icon={<FiActivity size={10} />} />
                  <StatSimple label="MERCS" value={company.max_users} icon={<FiUsers size={10} />} isBorder />
                  <StatSimple label="VIEWS" value={company.max_view} icon={<FiEye size={10} />} />
                </div>

                <div className="flex items-center justify-between pt-2">
                   <span className="text-[8px] font-black text-gray-300 italic uppercase tracking-widest">ID: {company.id.split('-')[0]}</span>
                   <div className="flex items-center gap-3">
                      <span className={`text-[8px] font-black uppercase italic tracking-widest ${company.is_active ? 'text-[#87be00]' : 'text-gray-400'}`}>
                        {company.is_active ? 'Activo' : 'Inactivo'}
                      </span>
                      <button
                        onClick={() => !disableToggle && toggleCompany(company.id)}
                        disabled={disableToggle}
                        className={`relative inline-flex h-5 w-10 items-center rounded-full transition-all ${
                          disableToggle ? "opacity-30 cursor-not-allowed" : ""
                        } ${company.is_active ? "bg-[#87be00]" : "bg-gray-200"}`}
                      >
                        <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-all ${
                            company.is_active ? "translate-x-5" : "translate-x-1"
                          }`}
                        />
                      </button>
                   </div>
                </div>
              </motion.div>
            )
          })
        )}
      </div>

      {/* 🚩 VISTA DESKTOP: TABLA INTEGRADA CON QUICK VIEW */}
      <div className="hidden md:block bg-white rounded-[3.5rem] shadow-2xl shadow-gray-200/50 border border-gray-100 overflow-hidden mx-2 lg:mx-0">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-100">
                <th className="p-8 text-[10px] font-black uppercase text-gray-400 tracking-[0.2em]">Empresa / Ficha</th>
                <th className="p-8 text-[10px] font-black uppercase text-gray-400 tracking-[0.2em]">Identificación</th>
                <th className="p-8 text-[10px] font-black uppercase text-gray-400 tracking-[0.2em]">Plan / Límites</th>
                <th className="p-8 text-[10px] font-black uppercase text-gray-400 tracking-[0.2em] text-center">Estado / Gestión</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr><td colSpan="4" className="p-20 text-center"><div className="inline-block animate-spin rounded-full h-10 w-10 border-[6px] border-[#87be00] border-t-transparent"></div></td></tr>
              ) : (
                companies.map(company => {
                  const disableToggle = !canToggle(company.id);

                  return (
                    <tr key={company.id} className="hover:bg-gray-50/50 transition-all group">
                      <td className="p-8">
                        <div className="flex items-center gap-5">
                          
                          {/* 🚩 INTEGRACIÓN DEL COMPONENTE REUTILIZABLE */}
                          <EmpresaQuickView 
                            company={company}
                            isActive={activePopover === company.id}
                            onToggle={() => setActivePopover(activePopover === company.id ? null : company.id)}
                          />

                          <div>
                            <p className="text-base font-black text-gray-900 uppercase tracking-tighter leading-none italic truncate">{company.name}</p>
                            <p className="text-[9px] text-gray-400 mt-2 uppercase font-bold italic tracking-widest">ID: {company.id.split('-')[0]}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-8">
                        <span className="bg-gray-50 px-4 py-2 rounded-xl text-[11px] font-black text-gray-700 uppercase font-mono border border-gray-100 shadow-sm">
                          {company.rut}
                        </span>
                      </td>
                      <td className="p-8">
                        <div className="flex gap-6">
                          <LimitBadge label="Sups" value={company.max_supervisors} icon={<FiActivity size={12}/>} />
                          <LimitBadge label="Mercs" value={company.max_users} icon={<FiUsers size={12}/>} />
                          <LimitBadge label="Views" value={company.max_view} icon={<FiEye size={12}/>} />
                        </div>
                      </td>
                      <td className="p-8">
                        <div className="flex items-center justify-center gap-4">
                          <button onClick={() => handleEdit(company)} className="p-3 bg-gray-50 text-gray-400 rounded-2xl hover:bg-gray-900 hover:text-[#87be00] transition-all shadow-sm border border-gray-100"><FiEdit3 size={18} /></button>
                          
                          <button
                            onClick={() => !disableToggle && toggleCompany(company.id)}
                            disabled={disableToggle}
                            className={`relative inline-flex h-7 w-14 items-center rounded-full transition-all duration-500 shadow-inner ${disableToggle ? "opacity-20 cursor-not-allowed" : ""} ${company.is_active ? "bg-[#87be00]" : "bg-gray-200"}`}
                          >
                            <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition-all duration-500 ${company.is_active ? "translate-x-8" : "translate-x-1"}`}/>
                          </button>

                          {isRoot && (
                            <button onClick={() => handleDelete(company)} className="p-3 bg-red-50 text-red-300 rounded-2xl hover:bg-red-500 hover:text-white transition-all shadow-sm border border-red-50"><FiTrash2 size={18} /></button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <CreateCompanyModal isOpen={openModal} onClose={handleCloseModal} onCreated={fetchCompanies} editingCompany={editingCompany} />
    </div>
  )
}

// 🚩 SUB-COMPONENTES PARA LIMPIEZA VISUAL
const LimitBadge = ({ label, value, icon }) => (
  <div className="flex flex-col">
    <span className="text-[8px] font-black text-gray-400 uppercase mb-1 tracking-[0.2em]">{label}</span>
    <div className="flex items-center gap-1.5 text-xs font-black text-gray-800">
      <div className="text-[#87be00]">{icon}</div> {value}
    </div>
  </div>
);

const StatSimple = ({ label, value, icon, isBorder }) => (
  <div className={`flex flex-col items-center py-1 ${isBorder ? 'border-x border-gray-200' : ''}`}>
    <span className="text-[7px] font-black text-gray-400 uppercase mb-1 tracking-tighter">{label}</span>
    <div className="flex items-center gap-1.5 text-[11px] font-black text-gray-800">
      <div className="text-[#87be00]">{icon}</div> {value}
    </div>
  </div>
);

export default Companies