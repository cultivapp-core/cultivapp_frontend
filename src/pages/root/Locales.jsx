import { useEffect, useState, useMemo } from "react"
import { FiPlus, FiUpload, FiTrash2, FiEdit, FiEye, FiEyeOff, FiSearch } from "react-icons/fi"
import toast from "react-hot-toast"
import CreateLocalModal from "../../components/CreateLocalModal"
import UploadLocalesModal from "../../components/UploadLocalesModal"
import EditLocalModal from "../../components/EditLocalModal"
import LocalesMap from "../../components/LocalesMap"
import api from "../../api/apiClient" 
import { useAuth } from "../../context/AuthContext"

const Locales = () => {
  const { user } = useAuth();
  const [locales, setLocales] = useState([])
  const [companies, setCompanies] = useState([])
  const [selectedCompany, setSelectedCompany] = useState("")
  const [showInactive, setShowInactive] = useState(false)
  const [searchTerm, setSearchTerm] = useState("") // 🔍 Estado para el buscador

  const [openCreate, setOpenCreate] = useState(false)
  const [openUpload, setOpenUpload] = useState(false)
  const [openEdit, setOpenEdit] = useState(false)
  const [selectedLocal, setSelectedLocal] = useState(null)
  const [mapSelectedId, setMapSelectedId] = useState(null)

  const ID_CULTIVA = '0e342e01-d213-4353-b210-39a12ac335cf';
  const hasElevatedAccess = user?.role === "ROOT" || user?.company_id === ID_CULTIVA;

  useEffect(() => {
    fetchCompanies()
  }, [])

  useEffect(() => {
    fetchLocales()
  }, [selectedCompany])

  const fetchCompanies = async () => {
    try {
      const data = await api.get("/companies")
      setCompanies(data || [])
    } catch (error) {
      toast.error("Error al cargar empresas")
    }
  }

  const fetchLocales = async () => {
    try {
      let url = "/locales"
      if (selectedCompany) url += `?company_id=${selectedCompany}`
      
      const data = await api.get(url)
      setLocales(data || [])
    } catch (error) {
      toast.error("No se pudieron cargar los locales")
    }
  }

  const toggleLocal = async (id) => {
    try {
      await api.patch(`/locales/${id}/toggle`)
      setLocales(prev => prev.map(l => 
        l.id === id ? { ...l, is_active: !l.is_active } : l
      ))
      toast.success("Estado actualizado")
    } catch (error) {
      toast.error("Error al cambiar estado")
    }
  }

  const deleteLocal = async (id) => {
    if (!window.confirm("¿Estás seguro de eliminar este local?")) return
    try {
      await api.delete(`/locales/${id}`)
      setLocales(prev => prev.filter(l => l.id !== id))
      toast.success("Local eliminado")
    } catch (error) {
      toast.error("No se pudo eliminar")
    }
  }

  // 🔍 Lógica de filtrado combinada (Activos/Inactivos + Buscador)
  const visibleLocales = useMemo(() => {
    return locales.filter(l => {
      const matchesStatus = showInactive || l.is_active;
      const matchesSearch = 
        (l.codigo?.toLowerCase() || "").includes(searchTerm.toLowerCase()) || 
        (l.cadena?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
        (l.direccion?.toLowerCase() || "").includes(searchTerm.toLowerCase());
      
      return matchesStatus && matchesSearch;
    });
  }, [locales, showInactive, searchTerm])

  const activeSelectedLocal = useMemo(() => {
    return visibleLocales.find(l => l.id === mapSelectedId)
  }, [mapSelectedId, visibleLocales])

  const openEditModal = (local) => {
    setSelectedLocal(local)
    setOpenEdit(true)
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500 font-[Outfit]">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-gray-800 tracking-tight uppercase">Gestión de Locales</h2>
          <p className="text-xs font-bold text-[#87be00] uppercase tracking-widest">Puntos de venta de la red Cultiva</p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => setOpenUpload(true)}
            className="flex items-center gap-2 bg-white border border-gray-200 hover:bg-gray-50 px-4 py-2.5 rounded-2xl text-xs font-black uppercase tracking-widest transition shadow-sm"
          >
            <FiUpload size={16} className="text-gray-500" />
            Carga Masiva
          </button>
          <button
            onClick={() => setOpenCreate(true)}
            className="flex items-center gap-2 bg-gray-900 text-white px-5 py-2.5 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-black transition shadow-xl shadow-gray-200"
          >
            <FiPlus size={16} />
            Crear Local
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-12 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-5 rounded-[2rem] border border-gray-100 shadow-sm">
             
             <div className="flex flex-wrap items-center gap-4 flex-1">
                {/* 🔍 INPUT DE BÚSQUEDA */}
                <div className="relative flex items-center min-w-[280px]">
                  <FiSearch className="absolute left-4 text-gray-400" size={16} />
                  <input
                    type="text"
                    placeholder="BUSCAR POR CÓDIGO, CADENA O DIRECCIÓN..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-gray-50 border-none rounded-xl pl-11 pr-4 py-2.5 text-[10px] font-black outline-none focus:ring-2 focus:ring-[#87be00]/20 transition uppercase tracking-widest placeholder:text-gray-400"
                  />
                </div>

                {/* FILTRO: Solo visible para ROOT o ADMIN CULTIVA */}
                {hasElevatedAccess ? (
                  <div className="flex items-center gap-3 border-l pl-4 border-gray-100">
                      <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Empresa:</span>
                      <select
                        value={selectedCompany}
                        onChange={(e) => setSelectedCompany(e.target.value)}
                        className="bg-gray-50 border-none rounded-xl px-4 py-2 text-xs font-bold outline-none focus:ring-2 focus:ring-[#87be00]/20 transition min-w-[180px]"
                      >
                        <option value="">Todas</option>
                        {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                  </div>
                ) : (
                  <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest italic border-l pl-4 border-gray-100">
                      Locales de {user?.company_name}
                  </div>
                )}
             </div>

             <button 
              onClick={() => setShowInactive(!showInactive)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black tracking-widest transition-all ${
                showInactive ? "bg-orange-50 text-orange-600 border border-orange-100" : "bg-gray-50 text-gray-400 border border-gray-100"
              }`}
             >
               {showInactive ? <FiEye size={14}/> : <FiEyeOff size={14}/>}
               {showInactive ? "MOSTRANDO INACTIVOS" : "OCULTANDO INACTIVOS"}
             </button>
          </div>

          <div className="h-[350px] w-full rounded-[2.5rem] overflow-hidden border border-gray-100 shadow-inner bg-gray-50 relative">
             <LocalesMap locales={visibleLocales} selectedLocal={activeSelectedLocal} />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-100">
                <th className="p-5 text-left font-black text-gray-400 uppercase text-[9px] tracking-widest">Código</th>
                <th className="p-5 text-left font-black text-gray-400 uppercase text-[9px] tracking-widest">Cadena</th>
                <th className="p-5 text-left font-black text-gray-400 uppercase text-[9px] tracking-widest">Ubicación</th>
                <th className="p-5 text-left font-black text-gray-400 uppercase text-[9px] tracking-widest">Dirección</th>
                <th className="p-5 text-left font-black text-gray-400 uppercase text-[9px] tracking-widest">Contacto</th>
                <th className="p-5 text-center font-black text-gray-400 uppercase text-[9px] tracking-widest">Estado</th>
                <th className="p-5 text-center font-black text-gray-400 uppercase text-[9px] tracking-widest">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {visibleLocales.length > 0 ? (
                visibleLocales.map(local => (
                  <tr 
                    key={local.id} 
                    className={`group hover:bg-gray-50/80 transition-colors cursor-pointer ${mapSelectedId === local.id ? 'bg-[#87be00]/5' : ''} ${!local.is_active ? 'opacity-60 grayscale-[0.5]' : ''}`}
                    onClick={() => setMapSelectedId(local.id)}
                  >
                    <td className="p-5 font-bold text-xs text-[#87be00] uppercase tracking-tighter">
                      {local.codigo || '—'}
                    </td>
                    <td className="p-5 font-black text-gray-800 uppercase tracking-tight">{local.cadena}</td>
                    <td className="p-5 flex flex-col">
                        <span className="text-xs font-bold text-gray-700">{local.region}</span>
                        <span className="text-[9px] font-black text-[#87be00] uppercase tracking-tighter">{local.comuna}</span>
                    </td>
                    <td className="p-5 text-xs text-gray-500 font-medium">{local.direccion}</td>
                    <td className="p-5 flex flex-col">
                        <span className="text-[11px] font-black text-gray-800 uppercase leading-none mb-1">{local.gerente}</span>
                        <span className="text-[10px] text-gray-400 font-bold">{local.telefono}</span>
                    </td>
                    <td className="p-5 text-center" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => toggleLocal(local.id)}
                        className={`relative inline-flex h-5 w-10 items-center rounded-full transition-colors ${
                          local.is_active ? "bg-[#87be00]" : "bg-gray-200"
                        }`}
                      >
                        <span className={`h-3 w-3 transform rounded-full bg-white transition-transform ${local.is_active ? "translate-x-6" : "translate-x-1"}`} />
                      </button>
                    </td>
                    <td className="p-5" onClick={(e) => e.stopPropagation()}>
                      <div className="flex justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => openEditModal(local)} className="p-2 text-gray-400 hover:text-[#87be00] hover:bg-[#87be00]/5 rounded-xl transition">
                          <FiEdit size={16} />
                        </button>
                        <button onClick={() => deleteLocal(local.id)} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition">
                          <FiTrash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="7" className="p-10 text-center text-gray-400 text-xs font-bold uppercase tracking-widest">
                    No se encontraron locales con esos criterios
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <CreateLocalModal isOpen={openCreate} onClose={() => setOpenCreate(false)} onCreated={fetchLocales} companies={companies} />
      <UploadLocalesModal isOpen={openUpload} onClose={() => setOpenUpload(false)} onUploaded={fetchLocales} companies={companies} />
      <EditLocalModal isOpen={openEdit} onClose={() => setOpenEdit(false)} onUpdated={fetchLocales} companies={companies} local={selectedLocal} />
    </div>
  )
}

export default Locales;