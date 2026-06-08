import { useState, useEffect } from "react"
import { FiX, FiUserPlus, FiBriefcase, FiMail, FiLock, FiCalendar, FiShield, FiSave, FiPhone, FiUser } from "react-icons/fi"
import api from "../../api/apiClient"
import { toast } from "react-hot-toast"

const CreateUserModal = ({
  isOpen,
  onClose,
  onCreated,
  defaultRole = ""
}) => {

  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    email: "",
    password: "",
    company_id: "",
    role: defaultRole,
    rut: "",
    position: "",
    tipo_contrato: "Plazo Fijo",
    fecha_inicio_contrato: "",
    fecha_termino_contrato: "",
    // 🚩 AGREGADOS: Datos de Supervisor
    supervisor_nombre: "",
    supervisor_telefono: ""
  })

  const [companies, setCompanies] = useState([])
  const [companyStats, setCompanyStats] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    if (isOpen) {
      fetchCompanies()
      setForm({
        first_name: "",
        last_name: "",
        email: "",
        password: "",
        company_id: "",
        role: defaultRole,
        rut: "",
        position: "",
        tipo_contrato: "Plazo Fijo",
        fecha_inicio_contrato: "",
        fecha_termino_contrato: "",
        supervisor_nombre: "",
        supervisor_telefono: ""
      })
      setCompanyStats(null)
      setError("")
    }
  }, [isOpen, defaultRole])

  const fetchCompanies = async () => {
    try {
      const data = await api.get("/companies")
      setCompanies(data)
    } catch (err) { console.error(err) }
  }

  const fetchCompanyStats = async (companyId) => {
    try {
      const data = await api.get(`/api/users/company/${companyId}/stats`)
      setCompanyStats(data)
    } catch (error) { console.error(error) }
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm(prev => ({ ...prev, [name]: value }))
    if (name === "company_id" && value) fetchCompanyStats(value)
  }

  const isRoleFull = (role) => {
    if (!companyStats) return false
    const { counts, limits } = companyStats
    if (role === "SUPERVISOR") return counts.SUPERVISOR >= limits.max_supervisors
    if (role === "USUARIO") return counts.USUARIO >= limits.max_users
    if (role === "VIEW") return counts.VIEW >= limits.max_view
    return false
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    if (form.role !== "ROOT" && isRoleFull(form.role)) {
      setError("No hay cupos disponibles en esta empresa")
      setLoading(false)
      return
    }

    try {
      const finalForm = {
        ...form,
        fecha_inicio_contrato: form.fecha_inicio_contrato || null,
        fecha_termino_contrato: form.fecha_termino_contrato || null
      }
      
      await api.post("/users", finalForm)
      toast.success("Usuario creado exitosamente")
      onCreated()
      onClose()
    } catch (err) {
      setError(err.response?.data?.message || err.message)
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  const Label = ({ children }) => (
    <label className="text-[9px] font-black text-gray-400 uppercase tracking-[0.3em] ml-5 mb-2 block italic">
      {children}
    </label>
  )

  const inputClass = "w-full bg-gray-50 border-2 border-transparent rounded-[1.5rem] px-6 py-4 text-sm font-black text-gray-900 outline-none focus:bg-white focus:border-[#87be00]/20 focus:ring-4 focus:ring-[#87be00]/5 transition-all placeholder:text-gray-300"

  return (
    <div className="fixed inset-0 bg-gray-900/80 backdrop-blur-md flex items-center justify-center p-4 z-[100] font-[Outfit]">
      <div className="bg-white w-full max-w-2xl rounded-[3.5rem] shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-500 max-h-[95vh] flex flex-col">
        
        {/* HEADER */}
        <div className="p-10 pb-6 flex justify-between items-start border-b border-gray-50">
          <div className="flex items-center gap-5">
            <div className="w-14 h-14 bg-gray-900 rounded-[1.5rem] flex items-center justify-center text-[#87be00]">
              <FiUserPlus size={28} />
            </div>
            <div>
              <h2 className="text-2xl font-black text-gray-900 uppercase tracking-tighter leading-none italic">Crear Acceso</h2>
              <p className="text-[10px] font-black text-[#87be00] uppercase tracking-[0.3em] mt-2">Configuración Global ROOT</p>
            </div>
          </div>
          <button onClick={onClose} className="p-3 hover:bg-red-50 text-gray-300 hover:text-red-500 rounded-2xl transition-all"><FiX size={28} /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-10 pt-6 overflow-y-auto space-y-8">
          {error && <div className="bg-red-50 text-red-500 p-4 rounded-2xl text-[11px] font-black uppercase tracking-widest border border-red-100">{error}</div>}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* IDENTIDAD */}
            <div className="space-y-4">
              <Label>Datos Personales</Label>
              <input type="text" name="first_name" placeholder="Nombres" value={form.first_name} onChange={handleChange} required className={inputClass} />
              <input type="text" name="last_name" placeholder="Apellidos" value={form.last_name} onChange={handleChange} required className={inputClass} />
              <input type="text" name="rut" placeholder="RUT (12.345.678-9)" value={form.rut} onChange={handleChange} required className={inputClass} />
            </div>

            {/* CUENTA */}
            <div className="space-y-4">
              <Label>Credenciales de Acceso</Label>
              <input type="email" name="email" placeholder="Correo Electrónico" value={form.email} onChange={handleChange} required className={inputClass} />
              <input type="password" name="password" placeholder="Contraseña Inicial" value={form.password} onChange={handleChange} required className={inputClass} />
              <select name="company_id" value={form.company_id} onChange={handleChange} required className={`${inputClass} bg-white`}>
                <option value="">Seleccionar Empresa</option>
                {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>

            {/* CONTRATO */}
            <div className="md:col-span-2 bg-gray-50/50 p-8 rounded-[2.5rem] border border-gray-100 space-y-6">
               <Label>Vigencia y Cargo</Label>
               <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <input type="text" name="position" placeholder="Cargo (ej: Supervisor)" value={form.position} onChange={handleChange} required className="w-full bg-white border-none rounded-2xl px-5 py-4 text-sm font-bold shadow-sm" />
                  <div className="space-y-2">
                    <span className="text-[8px] font-black text-gray-400 uppercase ml-2 italic">Fecha Inicio</span>
                    <input type="date" name="fecha_inicio_contrato" value={form.fecha_inicio_contrato} onChange={handleChange} required className="w-full bg-white border-none rounded-2xl px-5 py-3 text-xs font-bold shadow-sm" />
                  </div>
                  <div className="space-y-2">
                    <span className="text-[8px] font-black text-gray-400 uppercase ml-2 italic">Fecha Término</span>
                    <input type="date" name="fecha_termino_contrato" value={form.fecha_termino_contrato} onChange={handleChange} className="w-full bg-white border-none rounded-2xl px-5 py-3 text-xs font-bold shadow-sm" />
                  </div>
               </div>
            </div>

            {/* 🚩 NUEVA SECCIÓN: SUPERVISOR ASIGNADO */}
            <div className="md:col-span-2 bg-gray-900 p-8 rounded-[2.5rem] text-white space-y-6 shadow-xl shadow-black/20">
               <div className="flex items-center gap-3">
                  <div className="p-2 bg-[#87be00] rounded-lg text-black">
                    <FiUser size={18} />
                  </div>
                  <Label><span className="text-[#87be00]">Contacto de Supervisor</span> (Aparece en Credencial)</Label>
               </div>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <input 
                    type="text" 
                    name="supervisor_nombre" 
                    placeholder="Nombre del Supervisor" 
                    value={form.supervisor_nombre} 
                    onChange={handleChange} 
                    className="w-full bg-white/10 border-none rounded-2xl px-6 py-4 text-sm font-bold text-white placeholder:text-gray-500 focus:bg-white/20 transition-all outline-none" 
                  />
                  <div className="relative flex items-center">
                    <FiPhone className="absolute left-5 text-[#87be00]" size={16} />
                    <input 
                      type="text" 
                      name="supervisor_telefono" 
                      placeholder="+56 9 0000 0000" 
                      value={form.supervisor_telefono} 
                      onChange={handleChange} 
                      className="w-full bg-white/10 border-none rounded-[1.3rem] pl-12 pr-6 py-4 text-sm font-bold text-white placeholder:text-gray-500 focus:bg-white/20 transition-all outline-none" 
                    />
                  </div>
               </div>
            </div>

            {/* ROL Y CUPOS */}
            <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
               <div>
                  <Label>Perfil de Usuario</Label>
                  <select name="role" value={form.role} onChange={handleChange} required className={`${inputClass} bg-white`}>
                    <option value="">Seleccionar Rol</option>
                    <option value="ROOT">ROOT (Acceso Total)</option>
                    <option value="ADMIN_CLIENTE">Admin Cliente</option>
                    <option value="SUPERVISOR" disabled={isRoleFull("SUPERVISOR")}>Supervisor</option>
                    <option value="USUARIO" disabled={isRoleFull("USUARIO")}>Usuario (Mercaderista)</option>
                  </select>
               </div>
               
               {companyStats && form.role !== "ROOT" && (
                 <div className="bg-gray-100 rounded-[1.5rem] p-5 flex justify-around items-center border border-gray-200">
                    <div className="text-center">
                       <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Cupo Rol</p>
                       <p className="text-xl font-black text-gray-900 italic tracking-tighter">
                          {companyStats.counts[form.role] || 0} / {companyStats.limits[`max_${form.role.toLowerCase()}s`] || 0}
                       </p>
                    </div>
                 </div>
               )}
            </div>
          </div>

          <button type="submit" disabled={loading} className="w-full bg-gray-900 hover:bg-black text-[#87be00] py-6 rounded-[2rem] font-black uppercase tracking-[0.2em] text-[11px] transition-all flex items-center justify-center gap-4 shadow-2xl hover:scale-[1.01] active:scale-95 disabled:opacity-50">
            {loading ? <div className="w-5 h-5 border-4 border-[#87be00]/20 border-t-[#87be00] rounded-full animate-spin" /> : <><FiSave size={20} /> Crear Colaborador</>}
          </button>
        </form>
      </div>
    </div>
  )
}

export default CreateUserModal