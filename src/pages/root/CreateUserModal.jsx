import { useState, useEffect } from "react"
import { 
  FiX, 
  FiCamera, 
  FiUploadCloud, 
  FiFileText, 
  FiCheck, 
  FiPhone, 
  FiUser, 
  FiUserPlus, 
  FiShield,
  FiBriefcase,
  FiSave
} from "react-icons/fi"
import api from "../../api/apiClient"
import { toast } from "react-hot-toast"

const CreateUserModal = ({
  isOpen,
  onClose,
  onCreated,
  defaultRole = ""
}) => {
  const initialForm = {
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    password: "",
    role: defaultRole,
    rut: "",
    position: "",
    trabajando_para: "",
    fecha_inicio_contrato: "", 
    fecha_termino_contrato: "",
    tipo_contrato: "Plazo Fijo",
    supervisor_nombre: "",
    supervisor_telefono: "",
    company_id: "", 
  }

  const [form, setForm] = useState(initialForm)
  const [foto, setFoto] = useState(null)
  const [preview, setPreview] = useState(null)
  
  // ESTADOS PARA ADJUNTOS LEGALES
  const [documentoContrato, setDocumentoContrato] = useState(null)
  const [documentoAchs, setDocumentoAchs] = useState(null)
  const [documentoOtro, setDocumentoOtro] = useState(null)
  
  // ESTADOS DE EMPRESA Y LICENCIAS
  const [companies, setCompanies] = useState([])
  const [companyStats, setCompanyStats] = useState(null)
  const [loadingCompanies, setLoadingCompanies] = useState(false)
  
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [rutError, setRutError] = useState("")

  useEffect(() => {
    if (isOpen) {
      fetchCompanies()
      setForm(initialForm)
      setFoto(null)
      setPreview(null)
      setDocumentoContrato(null)
      setDocumentoAchs(null)
      setDocumentoOtro(null)
      setCompanyStats(null)
      setError("")
      setRutError("")
    }
  }, [isOpen, defaultRole])

  const fetchCompanies = async () => {
    try {
      setLoadingCompanies(true)
      const response = await api.get("/companies")
      const data = Array.isArray(response) ? response : (response.data || [])
      setCompanies(data)
    } catch (err) { 
      console.error("Error al cargar empresas", err) 
    } finally {
      setLoadingCompanies(false)
    }
  }

  const fetchCompanyStats = async (companyId) => {
    try {
      const data = await api.get(`/api/users/company/${companyId}/stats`)
      setCompanyStats(data)
    } catch (error) { 
      console.error(error) 
    }
  }

  const validarRutChileno = (rutCompleto) => {
    const rutLimpio = rutCompleto.replace(/[^0-9kK]/g, "").toUpperCase()
    if (rutLimpio.length < 2) return false
    const cuerpo = rutLimpio.slice(0, -1)
    const dv = rutLimpio.slice(-1)
    let suma = 0
    let multiplicador = 2
    for (let i = cuerpo.length - 1; i >= 0; i--) {
      suma += parseInt(cuerpo.charAt(i)) * multiplicador
      multiplicador = multiplicador === 7 ? 2 : multiplicador + 1
    }
    const dvEsperado = 11 - (suma % 11)
    let dvFinal = ""
    if (dvEsperado === 11) dvFinal = "0"
    else if (dvEsperado === 10) dvFinal = "K"
    else dvFinal = dvEsperado.toString()
    return dvFinal === dv
  }

  const handleRutChange = (e) => {
    let value = e.target.value.replace(/[^0-9kK]/g, "")
    if (value.length > 9) return
    
    if (value.length > 1) {
      const dv = value.slice(-1)
      const cuerpo = value.slice(0, -1)
      const cuerpoFormateado = cuerpo.replace(/\B(?=(\d{3})+(?!\d))/g, ".")
      value = `${cuerpoFormateado}-${dv}`
    }

    setForm(prev => ({ ...prev, rut: value }))

    const caracteresLimpios = value.replace(/[^0-9kK]/g, "")
    if (caracteresLimpios.length >= 8) {
      setRutError(validarRutChileno(value) ? "" : "RUT inválido")
    } else {
      setRutError("")
    }
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm(prev => ({ ...prev, [name]: value }))
    if (name === "company_id" && value) fetchCompanyStats(value)
  }

  const handleFileChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      setFoto(file)
      setPreview(URL.createObjectURL(file))
    }
  }

  const isRoleFull = (role) => {
    if (!companyStats || !role) return false
    const { counts, limits } = companyStats
    if (role === "SUPERVISOR") return counts.SUPERVISOR >= limits.max_supervisors
    if (role === "USUARIO") return counts.USUARIO >= limits.max_users
    if (role === "VIEW") return counts.VIEW >= limits.max_view
    return false
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validarRutChileno(form.rut)) {
      setRutError("Ingresa un RUT válido para continuar")
      return
    }

    if (form.role !== "ROOT" && isRoleFull(form.role)) {
      setError("No hay cupos disponibles para este rol en la empresa seleccionada")
      return
    }

    setLoading(true)
    setError("")

    try {
      const formData = new FormData()
      Object.keys(form).forEach((key) => {
        if (form.role !== "USUARIO" && (key === "supervisor_nombre" || key === "supervisor_telefono")) {
          formData.append(key, "")
        } else if (key === "fecha_inicio_contrato" || key === "fecha_termino_contrato") {
          formData.append(key, form[key] || "")
        } else {
          formData.append(key, form[key])
        }
      })
      
      if (!form.company_id) throw new Error("Debe seleccionar una empresa obligatoriamente")
      
      if (foto) formData.append("foto", foto)
      if (documentoContrato) formData.append("documento_contrato", documentoContrato)
      if (documentoAchs) formData.append("documento_achs", documentoAchs)
      if (documentoOtro) formData.append("documento_otro", documentoOtro)

      await api.post("/users", formData)
      toast.success("Usuario creado exitosamente")
      onCreated()
      onClose()
    } catch (err) {
      setError(err.response?.data?.message || err.message)
    } finally {
      setLoading(false)
    }
  }

  const DocumentUploader = ({ title, file, onChangeHandler }) => (
    <div className={`flex items-center gap-3 p-3 border rounded-xl transition-all ${file ? 'border-[#87be00] bg-[#87be00]/5' : 'border-slate-200 bg-white hover:border-[#87be00]/30'}`}>
      <div className={`p-2 rounded-lg shrink-0 ${file ? 'bg-[#87be00] text-white' : 'bg-slate-100 text-slate-400'}`}>
        {file ? <FiCheck size={16}/> : <FiFileText size={16}/>}
      </div>
      <div className="flex-1 overflow-hidden">
        <p className="text-[9px] font-black uppercase text-slate-400 tracking-wider leading-none">{title}</p>
        <p className="text-xs font-bold text-slate-700 truncate mt-1">{file ? file.name : "Sin adjuntar"}</p>
      </div>
      <label className="cursor-pointer bg-white border border-slate-200 px-3 py-1.5 rounded-lg text-[9px] font-bold text-slate-600 hover:bg-slate-50 hover:text-[#87be00] shadow-sm transition-colors shrink-0">
        {file ? "Cambiar" : "Subir"}
        <input type="file" className="hidden" accept=".pdf" onChange={onChangeHandler} />
      </label>
    </div>
  )

  if (!isOpen) return null

  const inputClass = "w-full bg-slate-50 border border-slate-200 rounded-xl px-5 py-3.5 text-xs font-bold text-slate-800 outline-none focus:bg-white focus:border-[#87be00] focus:ring-1 focus:ring-[#87be00] transition-all placeholder:text-slate-400 placeholder:font-medium shadow-sm"

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-[100] font-[Outfit]">
      <div className="bg-white w-full max-w-4xl rounded-[2rem] shadow-xl overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-200 border border-slate-100">
        
        {/* HEADER MODAL */}
        <div className="px-6 py-5 md:px-8 border-b border-slate-100 flex justify-between items-center bg-white shrink-0">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-slate-900 text-[#87be00] rounded-xl shadow-md">
              <FiUserPlus size={22} />
            </div>
            <div>
              <h3 className="text-xl md:text-2xl font-extrabold text-slate-900 uppercase tracking-tight leading-none italic">Nuevo Colaborador</h3>
              <p className="text-[9px] font-black text-[#87be00] uppercase tracking-[0.2em] mt-1.5">Ficha de Ingreso Global</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 rounded-xl transition-all">
            <FiX size={22} />
          </button>
        </div>

        {/* FORMS CON CONTROL SCROLLBAR RESPONSIVO */}
        <form onSubmit={handleSubmit} className="p-6 md:p-8 overflow-y-auto bg-slate-50/30 flex-1 space-y-6 custom-scrollbar">
          {error && (
            <div className="bg-red-50 text-red-600 p-4 rounded-xl text-[10px] font-bold uppercase tracking-wider border border-red-100 shadow-sm flex items-center gap-2">
              ⚠️ {error}
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            
            {/* LADO IZQUIERDO: IDENTIFICACIÓN Y ACCESO */}
            <div className="lg:col-span-6 space-y-5">
              <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-4">
                <h4 className="text-[10px] font-black text-[#87be00] uppercase tracking-[0.2em] flex items-center gap-2 mb-2">
                  <FiUser size={13}/> 1. Identificación y Acceso
                </h4>

                <div className="flex gap-4 items-center">
                  <div className="shrink-0 relative group cursor-pointer">
                    {preview ? (
                      <img src={preview} className="w-20 h-20 rounded-xl object-cover border-2 border-[#87be00] shadow-sm" />
                    ) : (
                      <div className="w-20 h-20 rounded-xl bg-slate-50 border border-dashed border-slate-300 flex items-center justify-center group-hover:border-[#87be00] transition-colors shadow-inner">
                        <FiCamera size={20} className="text-slate-400 group-hover:text-[#87be00]"/>
                      </div>
                    )}
                    <label className="absolute inset-0 w-full h-full cursor-pointer rounded-xl">
                      <input type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
                    </label>
                  </div>
                  
                  <div className="flex-1 space-y-2.5">
                    <input type="text" name="first_name" value={form.first_name} placeholder="Nombres" required className={inputClass} onChange={handleChange} />
                    <input type="text" name="last_name" value={form.last_name} placeholder="Apellidos" required className={inputClass} onChange={handleChange} />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-start">
                  <div className="w-full">
                    <input 
                      type="text" 
                      name="rut"
                      value={form.rut} 
                      placeholder="RUT (Ej: 12.345.678-9)" 
                      required 
                      className={`w-full px-5 py-3.5 text-xs font-bold text-slate-800 rounded-xl outline-none border transition-all ${
                        rutError ? 'border-red-400 focus:ring-1 focus:ring-red-400 focus:bg-red-50/20' : 'border-slate-200 focus:border-[#87be00] focus:ring-1 focus:ring-[#87be00]'
                      }`}
                      onChange={handleRutChange} 
                    />
                    {rutError && <p className="text-red-500 text-[9px] font-bold mt-1 ml-1 animate-in fade-in">{rutError}</p>}
                  </div>
                  <input type="text" name="phone" value={form.phone} placeholder="Teléfono" required className={inputClass} onChange={handleChange} />
                </div>

                <div className="space-y-3">
                  <input type="email" name="email" value={form.email} placeholder="Correo Electrónico" required className={inputClass} onChange={handleChange} />
                  
                  <select 
                    name="company_id"
                    required 
                    value={form.company_id} 
                    className={`${inputClass} bg-white cursor-pointer`}
                    onChange={handleChange}
                  >
                    <option value="" disabled>
                      {loadingCompanies ? "Cargando empresas..." : "Seleccione Empresa Asignada"}
                    </option>
                    {companies.map((emp) => (
                      <option key={emp.id} value={emp.id}>{emp.name}</option>
                    ))}
                  </select>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <input type="password" name="password" value={form.password} placeholder="Contraseña Inicial" required className={inputClass} onChange={handleChange} />
                    <select 
                      name="role"
                      required 
                      value={form.role} 
                      className="w-full bg-white border border-[#87be00]/30 text-[#87be00] font-bold rounded-xl px-4 py-3.5 text-xs focus:ring-1 focus:ring-[#87be00] outline-none transition-all cursor-pointer shadow-sm"
                      onChange={handleChange}
                    >
                      <option value="" disabled>Perfil de Sistema</option>
                      <option value="ROOT">ROOT (Acceso Total)</option>
                      <option value="ADMIN_CLIENTE">Admin Cliente</option>
                      <option value="USUARIO" disabled={isRoleFull("USUARIO")}>Mercaderista</option>
                      <option value="SUPERVISOR" disabled={isRoleFull("SUPERVISOR")}>Supervisor</option>
                      <option value="VIEW" disabled={isRoleFull("VIEW")}>Viewer</option>
                    </select>
                  </div>

                  {companyStats && form.role !== "ROOT" && form.role !== "" && (
                    <div className="bg-emerald-50/50 rounded-xl p-3 flex justify-between items-center border border-emerald-100/60 shadow-sm">
                      <span className="text-[8px] font-black text-slate-400 uppercase tracking-wider ml-1">Licencias de Perfil:</span>
                      <span className="text-[11px] font-extrabold text-slate-800 bg-white px-2.5 py-1 rounded-lg border border-slate-100 shadow-sm">
                        {companyStats.counts[form.role] || 0} / {companyStats.limits[`max_${form.role.toLowerCase()}s`] || 0}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* LADO DERECHO: SECCIÓN LABORAL Y ADJUNTOS */}
            <div className="lg:col-span-6 space-y-5">
              <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-4">
                <h4 className="text-[10px] font-black text-[#87be00] uppercase tracking-[0.2em] flex items-center gap-2 mb-2">
                  <FiBriefcase size={13}/> 2. Datos Laborales
                </h4>

                <input type="text" name="position" value={form.position} placeholder="Cargo Laboral (Ej: Mercaderista)" required className={inputClass} onChange={handleChange} />
                <input type="text" name="trabajando_para" value={form.trabajando_para} placeholder="Trabajando para..." required className={inputClass} onChange={handleChange} />
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <select 
                    name="tipo_contrato"
                    required 
                    value={form.tipo_contrato} 
                    className="sm:col-span-2 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3.5 text-xs font-bold text-slate-800 outline-none focus:bg-white focus:border-[#87be00] transition-all"
                    onChange={e => {
                      const val = e.target.value
                      setForm(prev => ({
                        ...prev,
                        tipo_contrato: val,
                        fecha_termino_contrato: val === "Indefinido" ? "" : prev.fecha_termino_contrato
                      }))
                    }}
                  >
                    <option value="" disabled>Seleccione Tipo de Contrato</option>
                    <option value="Indefinido">Indefinido</option>
                    <option value="Plazo Fijo">Plazo Fijo</option>
                    <option value="EST">Servicios Transitorios (EST)</option>
                    <option value="OT">Outsourcing (OT)</option>
                    <option value="Propio">Propio</option>
                  </select>

                  <div className={`flex flex-col bg-slate-50 border border-slate-200 rounded-xl p-2 px-3 ${form.tipo_contrato === "Indefinido" ? "sm:col-span-2" : ""}`}>
                    <label className="text-[8px] font-black text-slate-400 uppercase tracking-wider">Inicio Contrato</label>
                    <input type="date" name="fecha_inicio_contrato" required value={form.fecha_inicio_contrato} className="bg-transparent text-xs outline-none mt-1 text-slate-700 font-bold cursor-pointer" onChange={handleChange} />
                  </div>
                  
                  {form.tipo_contrato !== "Indefinido" && (
                    <div className="flex flex-col bg-slate-50 border border-slate-200 rounded-xl p-2 px-3">
                      <label className="text-[8px] font-black text-slate-400 uppercase tracking-wider">Fin Contrato</label>
                      <input type="date" name="fecha_termino_contrato" value={form.fecha_termino_contrato} className="bg-transparent text-xs outline-none mt-1 text-slate-700 font-bold cursor-pointer" onChange={handleChange} />
                    </div>
                  )}
                </div>

                {/* SUPERVISOR DIRECTO CONDICIONAL */}
                {form.role === "USUARIO" && (
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 animate-in fade-in duration-200">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1.5 mb-2.5 italic">
                      <FiShield size={12}/> Supervisor Directo de Campo
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <input type="text" name="supervisor_nombre" value={form.supervisor_nombre} placeholder="Nombre completo" className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold outline-none focus:border-[#87be00]" onChange={handleChange} />
                      <input type="text" name="supervisor_telefono" value={form.supervisor_telefono} placeholder="Teléfono" className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold outline-none focus:border-[#87be00]" onChange={handleChange} />
                    </div>
                  </div>
                )}
              </div>

              {/* CARGA DE ARCHIVOS MULTIPLE */}
              <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-2.5">
                <h4 className="text-[10px] font-black text-[#87be00] uppercase tracking-[0.2em] flex items-center gap-2 mb-1">
                  <FiUploadCloud size={13}/> 3. Documentación Extra (PDF)
                </h4>
                
                <DocumentUploader title="Contrato Laboral" file={documentoContrato} onChangeHandler={e => { const f = e.target.files[0]; if(f) setDocumentoContrato(f); }} />
                <DocumentUploader title="Mutualidad / ACHS" file={documentoAchs} onChangeHandler={e => { const f = e.target.files[0]; if(f) setDocumentoAchs(f); }} />
                <DocumentUploader title="Otros Antecedentes" file={documentoOtro} onChangeHandler={e => { const f = e.target.files[0]; if(f) setDocumentoOtro(f); }} />
              </div>
            </div>
          </div>

          {/* ACCIÓN PRINCIPAL */}
          <div className="pt-2">
            <button 
              type="submit" 
              disabled={loading || rutError !== ""} 
              className="w-full bg-slate-900 hover:bg-black text-[#87be00] py-4 rounded-xl font-bold uppercase tracking-wider text-[11px] transition-all flex items-center justify-center gap-2 shadow-md hover:scale-[1.002] active:scale-95 disabled:opacity-50"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-[#87be00]/20 border-t-[#87be00] rounded-full animate-spin" />
              ) : (
                <>
                  <FiSave size={15} /> 
                  <span>Confirmar y Registrar Ficha</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default CreateUserModal