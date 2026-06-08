import { useEffect, useState } from "react"
import { FiPlus, FiEdit3, FiTrash2 } from "react-icons/fi"
import CreateCompanyModal from "../root/CreateCompanyModal"
import { toast } from "react-hot-toast"
import api from "../../api/apiClient"
import { useAuth } from "../../context/AuthContext"
import { motion } from "framer-motion"
import EmpresaQuickView from "../../components/EmpresaQuickView"

const Companies = () => {
  const { user } = useAuth()
  const [companies, setCompanies] = useState([])
  const [openModal, setOpenModal] = useState(false)
  const [loading, setLoading] = useState(true)
  const [editingCompany, setEditingCompany] = useState(null)
  const [activePopover, setActivePopover] = useState(null)

  const ID_CULTIVA = '0e342e01-d213-4353-b210-39a12ac335cf';
  const isRoot = user?.role === "ROOT";
  const isCultivaAdmin = user?.role === "ADMIN_CLIENTE" && user?.company_id === ID_CULTIVA;
  const hasFullAccess = isRoot || isCultivaAdmin;

  useEffect(() => { fetchCompanies() }, [])

  const fetchCompanies = async () => {
    try { setLoading(true); const data = await api.get("/companies"); setCompanies(data || []) }
    catch (err) { toast.error("Error al cargar empresas") }
    finally { setLoading(false) }
  }

  const handleDelete = async (company) => {
    if (!isRoot) return toast.error("Solo ROOT puede eliminar")
    if (window.confirm(`¿Eliminar "${company.name}"?`)) {
        try { await api.delete(`/companies/${company.id}`); toast.success("Eliminado"); fetchCompanies() }
        catch (err) { toast.error("Error al eliminar") }
    }
  }

  return (
    <div className="pt-20 md:pt-8 pb-20 px-4 md:px-8 font-[Outfit] max-w-7xl mx-auto" onClick={() => setActivePopover(null)}>
      
      {/* HEADER: 🔴 pl-12 en móvil evita el choque con el menú hamburguesa */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8 pl-10 md:pl-0">
        <div>
          <h2 className="text-3xl md:text-5xl font-black text-gray-900 tracking-tighter uppercase italic">Empresas</h2>
          <p className="text-[9px] md:text-[10px] font-black text-[#87be00] uppercase tracking-[0.3em] mt-2 italic">Administración Global</p>
        </div>
        {hasFullAccess && (
          <button 
            onClick={() => setOpenModal(true)} 
            className="w-full md:w-auto flex items-center justify-center gap-2 bg-[#87be00] text-white px-6 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-black transition-all shadow-lg"
          >
            <FiPlus size={16} /> Crear Empresa
          </button>
        )}
      </div>

      {/* VISTA MÓVIL (CARDS) */}
      <div className="md:hidden space-y-4">
        {companies.map((c, i) => (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} key={c.id} className="bg-white p-5 rounded-[2rem] border border-gray-100 shadow-sm">
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-3">
                <EmpresaQuickView company={c} isActive={activePopover === c.id} onToggle={() => setActivePopover(activePopover === c.id ? null : c.id)} />
                <p className="font-black uppercase text-[11px] leading-tight">{c.name}</p>
              </div>
              <button onClick={() => { setEditingCompany(c); setOpenModal(true); }} className="p-2 bg-gray-50 rounded-lg text-gray-400"><FiEdit3 size={14}/></button>
            </div>
            {/* Stats compactos */}
            <div className="grid grid-cols-3 gap-2 bg-gray-50 p-3 rounded-xl text-center">
              <div className="flex flex-col"><span className="text-[7px] font-black text-gray-400 uppercase">Sups</span><span className="text-[10px] font-black">{c.max_supervisors}</span></div>
              <div className="flex flex-col"><span className="text-[7px] font-black text-gray-400 uppercase">Users</span><span className="text-[10px] font-black">{c.max_users}</span></div>
              <div className="flex flex-col"><span className="text-[7px] font-black text-gray-400 uppercase">Views</span><span className="text-[10px] font-black">{c.max_view}</span></div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* VISTA ESCRITORIO (TABLA) */}
      <div className="hidden md:block bg-white rounded-[2rem] shadow-xl border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50">
              <tr>
                <th className="p-6 text-[9px] font-black uppercase text-gray-400">Empresa</th>
                <th className="p-6 text-[9px] font-black uppercase text-gray-400">Plan (Sups/Users/Views)</th>
                <th className="p-6 text-[9px] font-black uppercase text-gray-400 text-center">Gestión</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {companies.map(c => (
                <tr key={c.id} className="hover:bg-gray-50/50">
                  <td className="p-6 flex items-center gap-4">
                    <EmpresaQuickView company={c} isActive={activePopover === c.id} onToggle={() => setActivePopover(activePopover === c.id ? null : c.id)} />
                    <span className="font-black uppercase text-sm">{c.name}</span>
                  </td>
                  <td className="p-6 text-[10px] font-bold">{c.max_supervisors} / {c.max_users} / {c.max_view}</td>
                  <td className="p-6 flex justify-center gap-2">
                    <button onClick={() => { setEditingCompany(c); setOpenModal(true); }} className="p-2 bg-gray-50 rounded-lg"><FiEdit3 size={14}/></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <CreateCompanyModal isOpen={openModal} onClose={() => { setEditingCompany(null); setOpenModal(false) }} onCreated={fetchCompanies} editingCompany={editingCompany} />
    </div>
  )
}

export default Companies;