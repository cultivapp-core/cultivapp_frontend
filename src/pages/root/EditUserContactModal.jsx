import { useState, useEffect } from "react"
import { 
  FiX, FiMail, FiPhone, FiSave, FiShield, FiAtSign, 
  FiUsers, FiClock, FiCalendar, FiUser, FiBriefcase, 
  FiUploadCloud, FiFileText, FiCheck 
} from "react-icons/fi"
import api from "../../api/apiClient"
import { toast } from "react-hot-toast"
import { useAuth } from "../../context/AuthContext"

const EditUserContactModal = ({ user, onClose, onUpdated }) => {
  const { user: loggedUser } = useAuth()
  
  // 1. ESTADO UNIFICADO PARA TODOS LOS CAMPOS
  const [form, setForm] = useState({
    first_name: "", last_name: "", email: "", phone: "",
    role: "OPERARIO", rut: "", position: "", trabajando_para: "",
    fecha_inicio_contrato: "", fecha_termino_contrato: "", tipo_contrato: "",
    supervisor_nombre: "", supervisor_telefono: "",
  })

  // 2. ESTADOS PARA ARCHIVOS Y UTILIDADES
  const [foto, setFoto] = useState(null)
  const [preview, setPreview] = useState(null)
  const [documentoContrato, setDocumentoContrato] = useState(null)
  const [documentoAchs, setDocumentoAchs] = useState(null)
  const [documentoOtro, setDocumentoOtro] = useState(null)
  
  const [loading, setLoading] = useState(false)
  const [rutError, setRutError] = useState("")

  // 3. INICIALIZAR DATOS
  useEffect(() => {
    if (user) {
      setForm({
        first_name: user.first_name || "",
        last_name: user.last_name || "",
        email: user.email || "",
        phone: user.phone || "",
        role: user.role || "OPERARIO",
        rut: user.rut || "",
        position: user.position || "",
        trabajando_para: user.trabajando_para || "",
        fecha_inicio_contrato: user.fecha_inicio_contrato ? user.fecha_inicio_contrato.split('T')[0] : "",
        fecha_termino_contrato: user.fecha_termino_contrato ? user.fecha_termino_contrato.split('T')[0] : "",
        tipo_contrato: user.tipo_contrato || "",
        supervisor_nombre: user.supervisor_nombre || "",
        supervisor_telefono: user.supervisor_telefono || "",
      })
      setPreview(user.foto_url ? `${api.defaults?.baseURL ?? ""}${user.foto_url}` : null)
    }
  }, [user])

  // 4. FUNCIONES DE VALIDACIÓN DE RUT
  const validarRutChileno = (rut) => {
    if (!rut) return true;
    const rutLimpio = rut.replace(/[^0-9kK]/g, "").toUpperCase();
    if (rutLimpio.length < 2) return false;
    const cuerpo = rutLimpio.slice(0, -1);
    const dv = rutLimpio.slice(-1);
    let suma = 0;
    let mult = 2;
    for (let i = cuerpo.length - 1; i >= 0; i--) {
      suma += parseInt(cuerpo.charAt(i)) * mult;
      mult = mult === 7 ? 2 : mult + 1;
    }
    const res = 11 - (suma % 11);
    const dvEsperado = res === 11 ? "0" : res === 10 ? "K" : res.toString();
    return dvEsperado === dv;
  }

  const handleRutChange = (e) => {
    let value = e.target.value.replace(/[^0-9kK]/g, "");
    if (value.length > 9) return;
    if (value.length > 1) {
      const dv = value.slice(-1);
      const cuerpo = value.slice(0, -1);
      value = `${cuerpo.replace(/\B(?=(\d{3})+(?!\d))/g, ".")}-${dv}`;
    }
    setForm({ ...form, rut: value });
    setRutError(value.length >= 8 && !validarRutChileno(value) ? "RUT inválido" : "");
  }

  // 5. ENVÍO DE DATOS CON FORMDATA
  const handleSave = async () => {
    if (form.rut && !validarRutChileno(form.rut)) {
      toast.error("Por favor, ingresa un RUT válido");
      return;
    }

    try {
      setLoading(true);
      const formData = new FormData();
      
      // Adjuntar todos los campos de texto
      Object.keys(form).forEach((key) => formData.append(key, form[key]));
      
      // Adjuntar archivos si existen
      if (foto) formData.append("foto", foto);
      if (documentoContrato) formData.append("documento_contrato", documentoContrato);
      if (documentoAchs) formData.append("documento_achs", documentoAchs);
      if (documentoOtro) formData.append("documento_otro", documentoOtro);

      await api.put(`/users/${user.id}`, formData);
      
      toast.success("Perfil actualizado correctamente");
      onUpdated();
      onClose();
    } catch (error) {
      toast.error(error.response?.data?.message || "Error al actualizar");
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  // 6. COMPONENTES VISUALES REUTILIZABLES
  const Label = ({ children, icon: Icon }) => (
    <label className="text-[10px] font-black text-[#87be00] uppercase tracking-[0.2em] mb-3 flex items-center gap-2 italic">
      {Icon && <Icon size={14} />} {children}
    </label>
  )

  const inputClass = "w-full bg-gray-50 border-2 border-transparent rounded-[1.5rem] px-5 py-3.5 text-sm font-bold text-gray-900 outline-none focus:bg-white focus:border-[#87be00]/20 focus:ring-4 focus:ring-[#87be00]/5 transition-all placeholder:text-gray-400"

  const DocumentUploader = ({ title, file, onChangeHandler }) => (
    <div className={`flex items-center gap-3 p-3 rounded-[1.5rem] border-2 transition-all ${file ? 'border-[#87be00] bg-[#87be00]/5' : 'border-gray-100 bg-white'}`}>
      <div className={`p-2.5 rounded-xl ${file ? 'bg-[#87be00] text-white' : 'bg-gray-100 text-gray-400'}`}>
        {file ? <FiCheck size={18}/> : <FiFileText size={18}/>}
      </div>
      <div className="flex-1 overflow-hidden">
        <p className="text-[9px] font-black uppercase text-gray-500 tracking-widest">{title}</p>
        <p className="text-xs font-bold text-gray-800 truncate">{file ? file.name : "Sin archivo nuevo"}</p>
      </div>
      <label className="cursor-pointer bg-white border border-gray-200 px-4 py-2 rounded-xl text-[10px] font-black text-gray-600 hover:text-[#87be00] transition-colors shadow-sm">
        {file ? "Cambiar" : "Subir"}
        <input type="file" className="hidden" accept=".pdf" onChange={onChangeHandler} />
      </label>
    </div>
  )

  return (
    <div className="fixed inset-0 bg-gray-900/80 backdrop-blur-md flex items-center justify-center p-4 z-[100] font-[Outfit]">
      {/* Se amplió el ancho a max-w-4xl para acomodar todos los campos */}
      <div className="bg-white w-full max-w-4xl rounded-[3.5rem] shadow-[0_50px_100px_-20px_rgba(0,0,0,0.3)] overflow-hidden animate-in fade-in zoom-in duration-500 max-h-[95vh] flex flex-col">
        
        {/* HEADER */}
        <div className="p-8 md:p-10 border-b border-gray-50 flex justify-between items-start shrink-0 bg-white z-10">
          <div className="flex items-center gap-5">
            <div className="w-14 h-14 bg-gray-900 rounded-[1.5rem] flex items-center justify-center text-[#87be00] shadow-xl shadow-[#87be00]/10">
              <FiAtSign size={28} />
            </div>
            <div>
              <h2 className="text-2xl font-black text-gray-900 uppercase tracking-tighter leading-none italic">
                Editar Perfil Completo
              </h2>
              <p className="text-[10px] font-black text-[#87be00] uppercase tracking-[0.3em] mt-2">
                ID: {user?.id?.slice(0, 8)}...
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-3 bg-gray-50 hover:bg-red-50 text-gray-400 hover:text-red-500 rounded-2xl transition-all"><FiX size={24} /></button>
        </div>

        {/* CUERPO - SCROLLABLE Y GRID A 2 COLUMNAS */}
        <div className="p-8 md:p-10 space-y-8 overflow-y-auto bg-gray-50/30">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            
            {/* COLUMNA IZQUIERDA */}
            <div className="space-y-8">
              {/* Identificación */}
              <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm space-y-4">
                <Label icon={FiUser}>Identificación</Label>
                
                <div className="flex gap-5 items-center mb-2">
                  <label className="cursor-pointer relative group">
                    <img src={preview ? preview : (foto ? URL.createObjectURL(foto) : "https://via.placeholder.com/150")} alt="Perfil" className="w-16 h-16 rounded-[1.2rem] object-cover border-2 border-[#87be00] group-hover:opacity-70 transition-opacity" />
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <FiUploadCloud className="text-white drop-shadow-md" size={20} />
                    </div>
                    <input type="file" className="hidden" accept="image/*" onChange={(e) => setFoto(e.target.files[0])} />
                  </label>
                  <div className="flex-1 space-y-3">
                    <input type="text" value={form.first_name} onChange={(e) => setForm({...form, first_name: e.target.value})} placeholder="Nombres" className={inputClass} />
                  </div>
                </div>
                
                <input type="text" value={form.last_name} onChange={(e) => setForm({...form, last_name: e.target.value})} placeholder="Apellidos" className={inputClass} />
                <input type="text" value={form.rut} onChange={handleRutChange} placeholder="RUT" className={`${inputClass} ${rutError ? '!border-red-400 focus:!ring-red-500/20' : ''}`} />
                {rutError && <p className="text-[10px] text-red-500 font-bold ml-2 -mt-2">{rutError}</p>}
                
                <input type="email" value={form.email} onChange={(e) => setForm({...form, email: e.target.value})} placeholder="Correo Electrónico" className={inputClass} />
                <input type="tel" value={form.phone} onChange={(e) => setForm({...form, phone: e.target.value})} placeholder="Teléfono" className={inputClass} />
              </div>

              {/* Documentación */}
              <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm space-y-4">
                <Label icon={FiUploadCloud}>Documentos</Label>
                <DocumentUploader title="Contrato" file={documentoContrato} onChangeHandler={e => setDocumentoContrato(e.target.files[0])} />
                <DocumentUploader title="Mutualidad/ACHS" file={documentoAchs} onChangeHandler={e => setDocumentoAchs(e.target.files[0])} />
                <DocumentUploader title="Otro Documento" file={documentoOtro} onChangeHandler={e => setDocumentoOtro(e.target.files[0])} />
              </div>
            </div>

            {/* COLUMNA DERECHA */}
            <div className="space-y-8">
              {/* Datos Laborales */}
              <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm space-y-4">
                <Label icon={FiBriefcase}>Datos Laborales</Label>
                
                <select value={form.role} onChange={(e) => setForm({...form, role: e.target.value})} className={inputClass + " appearance-none cursor-pointer"}>
                  <option value="ADMIN_CLIENTE">ADMIN CLIENTE</option>
                  <option value="SUPERVISOR">SUPERVISOR</option>
                  <option value="USUARIO">USUARIO</option>
                  <option value="VIEW">VIEW</option>
                </select>

                <input type="text" value={form.position} onChange={(e) => setForm({...form, position: e.target.value})} placeholder="Cargo" className={inputClass} />
                <input type="text" value={form.trabajando_para} onChange={(e) => setForm({...form, trabajando_para: e.target.value})} placeholder="Trabajando para..." className={inputClass} />
                
                <select value={form.tipo_contrato} onChange={(e) => setForm({...form, tipo_contrato: e.target.value})} className={inputClass + " appearance-none cursor-pointer"}>
                   <option value="">Tipo Contrato</option>
                   <option value="Indefinido">Indefinido</option>
                   <option value="Plazo Fijo">Plazo Fijo</option>
                   <option value="EST">EST</option>
                   <option value="OT">OT</option>
                   <option value="Propio">Propio</option>
                </select>
                
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <span className="text-[9px] font-black text-gray-400 uppercase ml-2">Inicio Contrato</span>
                    <input type="date" value={form.fecha_inicio_contrato} onChange={(e) => setForm({...form, fecha_inicio_contrato: e.target.value})} className={inputClass} />
                  </div>
                  <div>
                    <span className="text-[9px] font-black text-gray-400 uppercase ml-2">Término Contrato</span>
                    <input type="date" value={form.fecha_termino_contrato} onChange={(e) => setForm({...form, fecha_termino_contrato: e.target.value})} className={inputClass} />
                  </div>
                </div>
              </div>

              {/* Datos Supervisor */}
              <div className="bg-gray-900 p-8 rounded-[2.5rem] shadow-xl space-y-4 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-6 opacity-10"><FiUsers size={100} /></div>
                <Label icon={FiUsers}><span className="text-[#87be00]">Datos del Supervisor</span></Label>
                <div className="relative z-10 space-y-3">
                  <input 
                    type="text" 
                    value={form.supervisor_nombre} 
                    onChange={(e) => setForm({...form, supervisor_nombre: e.target.value})} 
                    placeholder="Nombre Supervisor" 
                    className="w-full bg-white/10 border-none rounded-2xl px-5 py-3.5 text-sm font-bold text-white placeholder:text-gray-500 focus:bg-white/20 transition-all outline-none" 
                  />
                  <input 
                    type="text" 
                    value={form.supervisor_telefono} 
                    onChange={(e) => setForm({...form, supervisor_telefono: e.target.value})} 
                    placeholder="Teléfono Supervisor" 
                    className="w-full bg-white/10 border-none rounded-2xl px-5 py-3.5 text-sm font-bold text-white placeholder:text-gray-500 focus:bg-white/20 transition-all outline-none" 
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ACCIONES */}
        <div className="p-8 md:p-10 border-t border-gray-50 shrink-0 bg-white">
          <div className="flex flex-col md:flex-row gap-4">
            <button onClick={onClose} className="w-full md:w-1/3 py-5 bg-gray-50 hover:bg-gray-100 text-gray-400 font-black uppercase text-[10px] tracking-[0.2em] rounded-[2rem] transition-colors italic">
              Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={loading}
              className="w-full md:w-2/3 bg-gray-900 hover:bg-black text-[#87be00] py-5 rounded-[2rem] font-black uppercase tracking-[0.2em] text-[11px] transition-all flex items-center justify-center gap-3 shadow-xl hover:shadow-2xl hover:scale-[1.01] active:scale-95 disabled:opacity-50"
            >
              {loading ? <div className="w-5 h-5 border-4 border-[#87be00]/20 border-t-[#87be00] rounded-full animate-spin" /> : <><FiSave size={18} /> Guardar Cambios</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default EditUserContactModal