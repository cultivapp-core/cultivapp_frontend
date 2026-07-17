import { useState, useEffect, useMemo } from "react"
import { FiPlus, FiUpload, FiTrash2, FiEdit, FiEye, FiEyeOff, FiSearch, FiGlobe, FiMapPin, FiShoppingCart } from "react-icons/fi"
import toast from "react-hot-toast"
import CreateLocalModal from "../root/CreateLocalModal"
import UploadLocalesModal from "../root/UploadLocalesModal"
import EditLocalModal from "./EditLocalModal"
import LocalesMap from "../../components/LocalesMap"
import api from "../../api/apiClient" 
import { useAuth } from "../../context/AuthContext"

const Locales = () => {
  const { user } = useAuth();
  const [locales, setLocales] = useState([])
  const [companies, setCompanies] = useState([])
  const [selectedCompany, setSelectedCompany] = useState("")
  const [showInactive, setShowInactive] = useState(false)
  
  const [searchTerm, setSearchTerm] = useState("") 
  const [selectedRegion, setSelectedRegion] = useState("")
  const [selectedComuna, setSelectedComuna] = useState("")
  const [selectedChain, setSelectedChain] = useState("")

  const [openCreate, setOpenCreate] = useState(false)
  const [openUpload, setOpenUpload] = useState(false)
  const [openEdit, setOpenEdit] = useState(false)
  const [selectedLocal, setSelectedLocal] = useState(null)
  const [mapSelectedId, setMapSelectedId] = useState(null)

  const ID_CULTIVA = '0e342e01-d213-4353-b210-39a12ac335cf';
  const hasElevatedAccess = user?.role === "ROOT" || user?.company_id === ID_CULTIVA;

  useEffect(() => { fetchCompanies(); fetchLocales(); }, [])
  useEffect(() => { fetchLocales() }, [selectedCompany])
  useEffect(() => { setSelectedComuna("") }, [selectedRegion])

  const fetchCompanies = async () => { try { const data = await api.get("/companies"); setCompanies(data || []) } catch (e) { toast.error("Error al cargar empresas") } }
  const fetchLocales = async () => { try { let url = "/locales"; if (selectedCompany) url += `?company_id=${selectedCompany}`; const data = await api.get(url); setLocales(data || []) } catch (e) { toast.error("Error cargando locales") } }

  const toggleLocal = async (id) => {
    try { await api.patch(`/locales/${id}/toggle`); setLocales(prev => prev.map(l => l.id === id ? { ...l, is_active: !l.is_active } : l)); toast.success("Estado actualizado") } catch (e) { toast.error("Error al cambiar estado") }
  }

  const deleteLocal = async (id) => {
    if (!window.confirm("¿Eliminar este local?")) return
    try { await api.delete(`/locales/${id}`); setLocales(prev => prev.filter(l => l.id !== id)); toast.success("Local eliminado") } catch (e) { toast.error("No se pudo eliminar") }
  }

  const regionsList = useMemo(() => [...new Set(locales.map(l => l.region).filter(Boolean))].sort(), [locales])
  const chainsList = useMemo(() => [...new Set(locales.map(l => l.cadena).filter(Boolean))].sort(), [locales])
  const comunasList = useMemo(() => {
    const filteredForComunas = selectedRegion ? locales.filter(l => l.region === selectedRegion) : locales;
    return [...new Set(filteredForComunas.map(l => l.comuna).filter(Boolean))].sort();
  }, [locales, selectedRegion])

  const visibleLocales = useMemo(() => {
    return locales.filter(l => {
      const matchesStatus = showInactive || l.is_active;
      const matchesSearch = (l.codigo_local?.toString().toLowerCase() || "").includes(searchTerm.toLowerCase()) || (l.direccion?.toLowerCase() || "").includes(searchTerm.toLowerCase());
      const matchesRegion = selectedRegion ? l.region === selectedRegion : true;
      const matchesComuna = selectedComuna ? l.comuna === selectedComuna : true;
      const matchesChain = selectedChain ? l.cadena === selectedChain : true;
      return matchesStatus && matchesSearch && matchesRegion && matchesComuna && matchesChain;
    });
  }, [locales, showInactive, searchTerm, selectedRegion, selectedComuna, selectedChain])

  return (
    // 🔴 pt-20 md:pt-8 para que el header no se solape con el botón hamburguesa
    <div className="space-y-6 pt-20 md:pt-8 animate-in fade-in duration-500 font-[Outfit] px-4">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-black text-gray-800 tracking-tight uppercase">Gestión de Locales</h2>
          <p className="text-[10px] font-bold text-[#87be00] uppercase tracking-widest">Puntos de venta de la red Cultiva</p>
        </div>
        <div className="flex gap-2 w-full md:w-auto">
          <button onClick={() => setOpenUpload(true)} className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-white border border-gray-200 px-4 py-3 rounded-xl text-[10px] font-black uppercase transition shadow-sm">
             Carga
          </button>
          <button onClick={() => setOpenCreate(true)} className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-gray-900 text-white px-4 py-3 rounded-xl text-[10px] font-black uppercase hover:bg-black transition shadow-xl">
             <FiPlus /> Crear Local
          </button>
        </div>
      </div>

      {/* FILTROS */}
      <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm grid grid-cols-1 md:grid-cols-4 gap-4">
        <select 
    value={selectedCompany} 
    onChange={(e) => setSelectedCompany(e.target.value)} 
    className="bg-gray-50 border-none rounded-xl px-4 py-3 text-[10px] font-bold outline-none uppercase"
  >
    <option value="">Todas las empresas</option>
    {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
  </select>
        <input type="text" placeholder="Código o dirección..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="md:col-span-1 bg-gray-50 border-none rounded-xl px-4 py-3 text-[10px] font-bold outline-none uppercase" />
        <select value={selectedRegion} onChange={(e) => setSelectedRegion(e.target.value)} className="bg-gray-50 border-none rounded-xl px-4 py-3 text-[10px] font-bold outline-none uppercase"><option value="">Región</option>{regionsList.map(r=><option key={r} value={r}>{r}</option>)}</select>
        <select value={selectedComuna} onChange={(e) => setSelectedComuna(e.target.value)} className="bg-gray-50 border-none rounded-xl px-4 py-3 text-[10px] font-bold outline-none uppercase"><option value="">Comuna</option>{comunasList.map(c=><option key={c} value={c}>{c}</option>)}</select>
        <button onClick={() => setShowInactive(!showInactive)} className={`px-4 py-3 rounded-xl text-[9px] font-black uppercase ${showInactive ? "bg-orange-50 text-orange-600" : "bg-gray-100"}`}>
          {showInactive ? "Inactivos Visibles" : "Ocultando Inactivos"}
        </button>
      </div>

      {/* MAPA */}
      <div className="h-[250px] md:h-[350px] w-full rounded-[2rem] overflow-hidden border border-gray-100">
         <LocalesMap locales={visibleLocales} />
      </div>

      {/* VISTA ESCRITORIO (TABLA) */}
      <div className="hidden md:block bg-white rounded-[2rem] shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="bg-gray-50/50">
              <th className="p-4 uppercase text-[9px] font-black">Código</th>
              <th className="p-4 uppercase text-[9px] font-black">Cadena</th>
              <th className="p-4 uppercase text-[9px] font-black">Dirección</th>
              <th className="p-4 uppercase text-[9px] font-black">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {visibleLocales.map(l => (
              <tr key={l.id} className="border-t border-gray-50 hover:bg-gray-50">
                <td className="p-4 font-bold">{l.codigo_local}</td>
                <td className="p-4">{l.cadena}</td>
                <td className="p-4 text-gray-500">{l.direccion}</td>
                <td className="p-4 flex gap-2">
                  <button onClick={() => { setSelectedLocal(l); setOpenEdit(true); }} className="p-2 hover:bg-green-100 rounded-lg"><FiEdit/></button>
                  <button onClick={() => deleteLocal(l.id)} className="p-2 hover:bg-red-100 rounded-lg"><FiTrash2/></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* VISTA MÓVIL (TARJETAS) */}
      <div className="md:hidden space-y-3">
        {visibleLocales.map(l => (
          <div key={l.id} className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex justify-between items-center">
             <div>
                <p className="text-[11px] font-black uppercase">{l.cadena} - {l.codigo_local}</p>
                <p className="text-[9px] text-gray-400">{l.direccion}</p>
             </div>
             <div className="flex gap-2">
                <button onClick={() => { setSelectedLocal(l); setOpenEdit(true); }} className="p-2 bg-gray-50 rounded-lg"><FiEdit size={14}/></button>
                <button onClick={() => deleteLocal(l.id)} className="p-2 bg-gray-50 rounded-lg text-red-500"><FiTrash2 size={14}/></button>
             </div>
          </div>
        ))}
      </div>

      <CreateLocalModal isOpen={openCreate} onClose={() => setOpenCreate(false)} onCreated={fetchLocales} companies={companies} />
      <UploadLocalesModal isOpen={openUpload} onClose={() => setOpenUpload(false)} onUploaded={fetchLocales} companies={companies} />
      <EditLocalModal isOpen={openEdit} onClose={() => setOpenEdit(false)} onUpdated={fetchLocales} companies={companies} local={selectedLocal} />
    </div>
  )
}

export default Locales;