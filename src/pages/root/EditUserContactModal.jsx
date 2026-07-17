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

  // 6. COMPONENTES VISUALES REUTILIZABLES (Estilo Cultiva)
  const Label = ({ children, icon: Icon }) => (
    <label className="text-[10px] font-bold text-[#5c9200] uppercase tracking-[0.2em] mb-3 flex items-center gap-2">
      {Icon && <Icon size={14} />} {children}
    </label>
  )

  const inputClass = "w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium text-[#111111] placeholder-slate-400 outline-none focus:bg-white focus:border-[#5c9200] focus:ring-1 focus:ring-[#5c9200] transition-all"
  
  const selectClass = "w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium text-[#111111] outline-none focus:bg-white focus:border-[#5c9200] focus:ring-1 focus:ring-[#5c9200] transition-all appearance-none cursor-pointer bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2020%2020%22%20fill%3D%22none%22%3E%3Cpath%20d%3D%22M7%209l3%203%203-3%22%20stroke%3D%22%2394a3b8%22%20stroke-width%3D%221.5%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%2F%3E%3C%2Fsvg%3E')] bg-[length:1.25rem_1.25rem] bg-[right_0.75rem_center] bg-no-repeat"

  const DocumentUploader = ({ title, file, onChangeHandler }) => (
    <div className={`flex items-center gap-3 p-3 rounded-xl border border-dashed transition-all ${file ? 'border-[#5c9200] bg-emerald-50/40' : 'border-slate-200 bg-white'}`}>
      <div className={`p-2.5 rounded-lg ${file ? 'bg-[#5c9200] text-white' : 'bg-slate-100 text-slate-400'}`}>
        {file ? <FiCheck size={16}/> : <FiFileText size={16}/>}
      </div>
      <div className="flex-1 overflow-hidden">
        <p className="text-[9px] font-bold uppercase text-slate-400 tracking-wider">{title}</p>
        <p className="text-xs font-semibold text-slate-700 truncate">{file ? file.name : "Sin archivo seleccionado"}</p>
      </div>
      <label className="cursor-pointer bg-white border border-slate-200 px-3 py-1.5 rounded-lg text-[10px] font-bold text-slate-600 hover:text-[#5c9200] hover:border-[#5c9200] transition-colors shadow-sm">
        {file ? "Cambiar" : "Subir PDF"}
        <input type="file" className="hidden" accept=".pdf" onChange={onChangeHandler} />
      </label>
    </div>
  )

  return (
    <div className="absolute inset-0 bg-[#111111]/70 backdrop-blur-sm flex items-center justify-center p-4 z-[100] font-[Outfit] transition-all duration-300 min-h-full">
      
      <div className="bg-white w-full max-w-4xl rounded-2xl border border-slate-100 shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300 max-h-[92vh] flex flex-col">
        
        {/* HEADER */}
        <div className="p-6 md:p-8 border-b border-slate-100 flex justify-between items-center shrink-0 bg-white">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-[#111111] rounded-xl flex items-center justify-center text-[#5c9200]">
              <FiAtSign size={22} />
            </div>
            <div>
              <h2 className="text-xl font-extrabold text-[#111111] uppercase tracking-tight">
                Editar Perfil Completo
              </h2>
              <p className="text-[10px] font-bold text-[#5c9200] uppercase tracking-[0.2em] mt-1">
                ID: {user?.id}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 bg-slate-50 hover:bg-rose-50 text-slate-400 hover:text-rose-500 rounded-lg transition-all"><FiX size={20} /></button>
        </div>

        {/* CUERPO SCROLLABLE */}
        <div className="p-6 md:p-8 space-y-6 overflow-y-auto bg-slate-50/40">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* COLUMNA IZQUIERDA */}
            <div className="space-y-6">
              {/* Identificación */}
              <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-4">
                <Label icon={FiUser}>Identificación Personal</Label>
                
                <div className="flex gap-4 items-center mb-1">
                  <label className="cursor-pointer relative group flex-shrink-0">
                    <img src={preview ? preview : (foto ? URL.createObjectURL(foto) : "https://via.placeholder.com/150")} alt="Perfil" className="w-16 h-16 rounded-xl object-cover border border-slate-200 group-hover:opacity-75 transition-opacity" />
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40 rounded-xl">
                      <FiUploadCloud className="text-white" size={18} />
                    </div>
                    <input type="file" className="hidden" accept="image/*" onChange={(e) => setFoto(e.target.files[0])} />
                  </label>
                  <div className="flex-1">
                    <input type="text" value={form.first_name} onChange={(e) => setForm({...form, first_name: e.target.value})} placeholder="Nombres" className={inputClass} />
                  </div>
                </div>
                
                <input type="text" value={form.last_name} onChange={(e) => setForm({...form, last_name: e.target.value})} placeholder="Apellidos" className={inputClass} />
                <div>
                  <input type="text" value={form.rut} onChange={handleRutChange} placeholder="RUT (12.345.678-9)" className={`${inputClass} ${rutError ? '!border-rose-400 focus:!ring-rose-500/20' : ''}`} />
                  {rutError && <p className="text-[10px] text-rose-500 font-bold ml-1 mt-1.5">{rutError}</p>}
                </div>
                
                <input type="email" value={form.email} onChange={(e) => setForm({...form, email: e.target.value})} placeholder="Correo Electrónico" className={inputClass} />
                <input type="tel" value={form.phone} onChange={(e) => setForm({...form, phone: e.target.value})} placeholder="Teléfono de Contacto" className={inputClass} />
              </div>

              {/* Documentación */}
              <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-3.5">
                <Label icon={FiUploadCloud}>Documentos Obligatorios</Label>
                <DocumentUploader title="Contrato de Trabajo" file={documentoContrato} onChangeHandler={e => setDocumentoContrato(e.target.files[0])} />
                <DocumentUploader title="Certificado Mutualidad / ACHS" file={documentoAchs} onChangeHandler={e => setDocumentoAchs(e.target.files[0])} />
                <DocumentUploader title="Otros Documentos Anexos" file={documentoOtro} onChangeHandler={e => setDocumentoOtro(e.target.files[0])} />
              </div>
            </div>

            {/* COLUMNA DERECHA */}
            <div className="space-y-6">
              {/* Datos Laborales */}
              <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-4">
                <Label icon={FiBriefcase}>Datos Laborales y Contrato</Label>
                
                <select value={form.role} onChange={(e) => setForm({...form, role: e.target.value})} className={selectClass}>
                  <option value="ADMIN_CLIENTE">ADMIN CLIENTE</option>
                  <option value="SUPERVISOR">SUPERVISOR</option>
                  <option value="USUARIO">USUARIO</option>
                  <option value="VIEW">VIEW</option>
                </select>

                <input type="text" value={form.position} onChange={(e) => setForm({...form, position: e.target.value})} placeholder="Cargo / Puesto" className={inputClass} />
                <input type="text" value={form.trabajando_para} onChange={(e) => setForm({...form, trabajando_para: e.target.value})} placeholder="Trabajando para..." className={inputClass} />
                
                <select value={form.tipo_contrato} onChange={(e) => setForm({...form, tipo_contrato: e.target.value})} className={selectClass}>
                   <option value="">Seleccione Tipo Contrato</option>
                   <option value="Indefinido">Indefinido</option>
                   <option value="Plazo Fijo">Plazo Fijo</option>
                   <option value="EST">EST</option>
                   <option value="OT">OT</option>
                   <option value="Propio">Propio</option>
                </select>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-[9px] font-bold text-slate-400 uppercase ml-1 block mb-1">Inicio Contrato</span>
                    <input type="date" value={form.fecha_inicio_contrato} onChange={(e) => setForm({...form, fecha_inicio_contrato: e.target.value})} className={inputClass} />
                  </div>
                  <div>
                    <span className="text-[9px] font-bold text-slate-400 uppercase ml-1 block mb-1">Término Contrato</span>
                    <input type="date" value={form.fecha_termino_contrato} onChange={(e) => setForm({...form, fecha_termino_contrato: e.target.value})} className={inputClass} />
                  </div>
                </div>
              </div>

              {/* 
                MEJORA: RENDERIZADO CONDICIONAL DE LOS DATOS DEL SUPERVISOR
                Solo se muestra en pantalla si el rol del colaborador es "USUARIO" (mercaderista/terreno)
              */}
              {form.role === "USUARIO" && (
                <div className="bg-[#111111] p-6 rounded-2xl shadow-sm space-y-4 relative overflow-hidden animate-in fade-in slide-in-from-top-4 duration-300">
                  <div className="absolute top-0 right-0 p-4 opacity-[0.03] text-white pointer-events-none"><FiUsers size={120} /></div>
                  <Label icon={FiUsers}><span className="text-[#5c9200]">Datos del Supervisor</span></Label>
                  <div className="relative z-10 space-y-3.5">
                    <input 
                      type="text" 
                      value={form.supervisor_nombre} 
                      onChange={(e) => setForm({...form, supervisor_nombre: e.target.value})} 
                      placeholder="Nombre Supervisor" 
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm font-medium text-white placeholder:text-slate-500 focus:bg-white/10 focus:border-[#5c9200] transition-all outline-none" 
                    />
                    <input 
                      type="text" 
                      value={form.supervisor_telefono} 
                      onChange={(e) => setForm({...form, supervisor_telefono: e.target.value})} 
                      placeholder="Teléfono Supervisor" 
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm font-medium text-white placeholder:text-slate-500 focus:bg-white/10 focus:border-[#5c9200] transition-all outline-none" 
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ACCIONES */}
        <div className="p-6 md:p-8 border-t border-slate-100 shrink-0 bg-white">
          <div className="flex flex-col sm:flex-row gap-3 justify-end">
            <button onClick={onClose} className="w-full sm:w-32 py-3 bg-slate-50 hover:bg-slate-100 text-slate-500 font-bold uppercase text-[10px] tracking-wider rounded-xl transition-colors">
              Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={loading}
              className="w-full sm:w-52 bg-[#5c9200] hover:bg-[#4a7500] text-white py-3 rounded-xl font-bold uppercase tracking-wider text-[11px] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" /> : <><FiSave size={14} /> Guardar Cambios</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default EditUserContactModal;