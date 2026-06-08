import { useEffect, useState } from "react"
import { FiX, FiBriefcase, FiUser, FiBarChart2, FiLock, FiPlus, FiSave, FiShield, FiMapPin } from "react-icons/fi"
import api from "../../api/apiClient"
import { toast } from "react-hot-toast"
import { useAuth } from "../../context/AuthContext" 

const CreateCompanyModal = ({ isOpen, onClose, onCreated, editingCompany }) => {
  const { user } = useAuth()
  
  const ID_CULTIVA = '0e342e01-d213-4353-b210-39a12ac335cf'; 
  const isRoot = user?.role === "ROOT"
  const isCultivaAdmin = user?.role === "ADMIN_CLIENTE" && user?.company_id === ID_CULTIVA
  const hasFullAccess = isRoot || isCultivaAdmin

  const initialState = {
    rut: "", name: "", address: "", max_supervisors: 2, max_users: 10, max_view: 1,
    admin_name: "", admin_email: "", admin_phone: "", admin_position: "", admin_password: ""
  }

  const [form, setForm] = useState(initialState)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (editingCompany) {
      setForm({ ...initialState, ...editingCompany, admin_password: "••••••••" })
    } else {
      setForm(initialState)
    }
  }, [editingCompany, isOpen])

  const cleanRut = (rut) => rut.replace(/\./g, "").replace("-", "").toUpperCase()
  
  const formatRut = (rut) => {
    const clean = cleanRut(rut)
    if (clean.length <= 1) return clean
    const body = clean.slice(0, -1)
    const dv = clean.slice(-1)
    const formattedBody = body.replace(/\B(?=(\d{3})+(?!\d))/g, ".")
    return `${formattedBody}-${dv}`
  }

  const validateRut = (rut) => {
    const clean = cleanRut(rut)
    if (clean.length < 8) return false
    const body = clean.slice(0, -1)
    const dv = clean.slice(-1)
    let sum = 0, multiplier = 2
    for (let i = body.length - 1; i >= 0; i--) {
      sum += multiplier * parseInt(body[i])
      multiplier = multiplier === 7 ? 2 : multiplier + 1
    }
    const expected = 11 - (sum % 11)
    const dvCalc = expected === 11 ? "0" : expected === 10 ? "K" : expected.toString()
    return dvCalc === dv
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm(prev => ({ ...prev, [name]: name === "rut" ? formatRut(value) : value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!editingCompany && !validateRut(form.rut)) return toast.error("El RUT no es válido")
    setLoading(true)
    try {
      const payload = { ...form, rut: cleanRut(form.rut), max_supervisors: parseInt(form.max_supervisors) || 0, max_users: parseInt(form.max_users) || 0, max_view: parseInt(form.max_view) || 0 }
      if (editingCompany) {
        await api.patch(`/companies/${editingCompany.id}`, { max_supervisors: payload.max_supervisors, max_users: payload.max_users, max_view: payload.max_view })
        toast.success("Suscripción actualizada")
      } else {
        await api.post("/companies/with-admin", payload)
        toast.success("Empresa creada correctamente")
      }
      onCreated(); onClose()
    } catch (err) { toast.error(err.message || "Error al procesar") } finally { setLoading(false) }
  }

  if (!isOpen) return null

  const Label = ({ children }) => <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-2 mb-1 block">{children}</label>
  const InputStyle = "w-full bg-gray-50 border-none rounded-xl px-4 py-3 text-xs font-bold outline-none focus:ring-2 focus:ring-[#87be00]/20 transition-all shadow-sm"

  return (
    <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center z-[100] p-2 md:p-4 font-[Outfit]">
      <div className="bg-white w-full max-w-2xl rounded-[2rem] md:rounded-[3rem] shadow-2xl p-5 md:p-10 max-h-[90vh] overflow-y-auto custom-scrollbar relative animate-in zoom-in duration-300">
        
        {/* HEADER */}
        <div className="flex justify-between items-start mb-6">
          <div className="flex items-start gap-4">
            <div>
              <h3 className="text-xl md:text-2xl font-black text-gray-900 uppercase tracking-tighter leading-none">{editingCompany ? "Editar Suscripción" : "Nueva Empresa"}</h3>
              <p className="text-[9px] font-bold text-[#87be00] uppercase tracking-[0.2em] mt-2">{editingCompany ? `Cliente: ${editingCompany.name}` : "Configuración Maestro"}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full text-gray-400"><FiX size={20} /></button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          
          {/* SECCIÓN 1: LEGAL */}
          <div className={`space-y-4 ${editingCompany ? 'opacity-60 pointer-events-none' : ''}`}>
             <div className="flex items-center gap-2 px-2"><FiBriefcase className="text-[#87be00]" size={14} /><h4 className="text-[10px] font-black uppercase tracking-widest">Información Legal</h4></div>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><Label>RUT Empresa</Label><input name="rut" value={form.rut} onChange={handleChange} placeholder="76.123.456-7" required className={InputStyle} /></div>
                <div><Label>Nombre de Fantasía</Label><input name="name" value={form.name} onChange={handleChange} placeholder="Empresa SPA" required className={InputStyle} /></div>
                <div className="md:col-span-2"><Label>Dirección Casa Matriz</Label><input name="address" value={form.address} onChange={handleChange} placeholder="Av. Vitacura 123" required className={InputStyle} /></div>
             </div>
          </div>

          {/* SECCIÓN 2: PLAN */}
          <div className="bg-gray-50 p-6 rounded-[2rem] border border-gray-100">
            <div className="flex items-center gap-2 mb-4"><FiBarChart2 className="text-[#87be00]" size={14} /><h4 className="text-[10px] font-black uppercase tracking-widest">Capacidad del Plan</h4></div>
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-white p-3 rounded-2xl border border-gray-100 text-center"><Label>Sups</Label><input type="number" name="max_supervisors" value={form.max_supervisors} onChange={handleChange} className="w-full text-center font-black outline-none bg-transparent" /></div>
              <div className="bg-white p-3 rounded-2xl border border-gray-100 text-center"><Label>Mercs</Label><input type="number" name="max_users" value={form.max_users} onChange={handleChange} className="w-full text-center font-black outline-none bg-transparent" /></div>
              <div className="bg-white p-3 rounded-2xl border border-gray-100 text-center"><Label>Views</Label><input type="number" name="max_view" value={form.max_view} onChange={handleChange} className="w-full text-center font-black outline-none bg-transparent" /></div>
            </div>
          </div>

          {/* SECCIÓN 3: ADMIN */}
          {!editingCompany && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 px-2"><FiUser className="text-[#87be00]" size={14} /><h4 className="text-[10px] font-black uppercase tracking-widest">Administrador</h4></div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><Label>Nombre Completo</Label><input name="admin_name" value={form.admin_name} onChange={handleChange} required className={InputStyle} /></div>
                <div><Label>Cargo</Label><input name="admin_position" value={form.admin_position} onChange={handleChange} className={InputStyle} /></div>
                <div><Label>Email</Label><input name="admin_email" value={form.admin_email} onChange={handleChange} required className={InputStyle} /></div>
                <div><Label>Teléfono</Label><input name="admin_phone" value={form.admin_phone} onChange={handleChange} className={InputStyle} /></div>
              </div>
              <div className="relative">
                <Label>Contraseña</Label>
                <input type="password" name="admin_password" value={form.admin_password} onChange={handleChange} required className={InputStyle} />
              </div>
            </div>
          )}

          <button type="submit" disabled={loading} className="w-full bg-gray-900 text-[#87be00] py-4 rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-black transition-all">
            {loading ? "Procesando..." : (editingCompany ? "Guardar Cambios" : "Crear Empresa")}
          </button>
        </form>
      </div>
    </div>
  )
}

export default CreateCompanyModal