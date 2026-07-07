import { useState, useEffect } from "react";
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
  FiGlobe
} from "react-icons/fi";
import api from "../../api/apiClient";

const CreateAdminUserModal = ({ isOpen, onClose, onCreated }) => {
  const userAdmin = JSON.parse(localStorage.getItem("user"));

  const initialForm = {
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    password: "",
    role: "",
    rut: "",
    position: "",
    trabajando_para: "",
    fecha_inicio_contrato: "", 
    fecha_termino_contrato: "",
    tipo_contrato: "",
    supervisor_nombre: "",
    supervisor_telefono: "",
    company_id: "", 
  };

  const [form, setForm] = useState(initialForm);
  const [foto, setFoto] = useState(null);
  const [preview, setPreview] = useState(null);
  
  // ESTADOS PARA DOCUMENTOS
  const [documentoContrato, setDocumentoContrato] = useState(null);
  const [documentoAchs, setDocumentoAchs] = useState(null);
  const [documentoOtro, setDocumentoOtro] = useState(null);
  
  // ESTADOS PARA EMPRESAS (PROTEGIDOS)
  const [empresas, setEmpresas] = useState([]);
  const [loadingEmpresas, setLoadingEmpresas] = useState(false);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [rutError, setRutError] = useState("");

  useEffect(() => {
    if (isOpen) {
      setForm(initialForm);
      setFoto(null);
      setPreview(null);
      setDocumentoContrato(null);
      setDocumentoAchs(null);
      setDocumentoOtro(null);
      setError("");
      setRutError(""); 
      
      // Cargar empresas al abrir con protección
     const fetchEmpresas = async () => {
        try {
          setLoadingEmpresas(true);
          const response = await api.get("/companies");
          console.log("Objeto RESPONSE completo:", response);
          
          // Accedemos directamente a response.data
          const data = Array.isArray(response) ? response : (response.data || []);
          
          if (Array.isArray(data)) {
            console.log("Guardando en estado:", data);
            setEmpresas(data);
          } else {
            console.error("La API no devolvió un array:", data);
            setEmpresas([]);
          }
        } catch (err) {
          console.error("Error al cargar empresas", err);
          setEmpresas([]);
        } finally {
          setLoadingEmpresas(false);
        }
      };
      
      fetchEmpresas();
    }
  }, [isOpen]);

  const validarRutChileno = (rutCompleto) => {
    const rutLimpio = rutCompleto.replace(/[^0-9kK]/g, "").toUpperCase();
    if (rutLimpio.length < 2) return false;
    const cuerpo = rutLimpio.slice(0, -1);
    const dv = rutLimpio.slice(-1);
    let suma = 0;
    let multiplicador = 2;
    for (let i = cuerpo.length - 1; i >= 0; i--) {
      suma += parseInt(cuerpo.charAt(i)) * multiplicador;
      multiplicador = multiplicador === 7 ? 2 : multiplicador + 1;
    }
    const dvEsperado = 11 - (suma % 11);
    let dvFinal = "";
    if (dvEsperado === 11) dvFinal = "0";
    else if (dvEsperado === 10) dvFinal = "K";
    else dvFinal = dvEsperado.toString();
    return dvFinal === dv;
  };

  const handleRutChange = (e) => {
    let value = e.target.value.replace(/[^0-9kK]/g, ""); 
    if (value.length > 9) return;
    
    if (value.length > 1) {
      const dv = value.slice(-1);
      const cuerpo = value.slice(0, -1);
      const cuerpoFormateado = cuerpo.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
      value = `${cuerpoFormateado}-${dv}`;
    }

    setForm({ ...form, rut: value });

    const caracteresLimpios = value.replace(/[^0-9kK]/g, "");
    if (caracteresLimpios.length >= 8) {
      setRutError(validarRutChileno(value) ? "" : "RUT inválido");
    } else {
      setRutError(""); 
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFoto(file);
      setPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validarRutChileno(form.rut)) {
      setRutError("Ingresa un RUT válido para continuar");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const formData = new FormData();
      Object.keys(form).forEach((key) => formData.append(key, form[key]));
      
      if (!form.company_id) throw new Error("Debe seleccionar una empresa");
      
      if (foto) formData.append("foto", foto);
      if (documentoContrato) formData.append("documento_contrato", documentoContrato);
      if (documentoAchs) formData.append("documento_achs", documentoAchs);
      if (documentoOtro) formData.append("documento_otro", documentoOtro);

      await api.post("/users", formData);

      onCreated();
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  };

  const DocumentUploader = ({ title, file, onChangeHandler }) => (
    <div className={`flex items-center gap-3 p-3 border rounded-2xl transition-all ${file ? 'border-[#87be00] bg-[#87be00]/5' : 'border-gray-200 bg-white hover:border-[#87be00]/50'}`}>
      <div className={`p-2 rounded-xl ${file ? 'bg-[#87be00] text-white' : 'bg-gray-100 text-gray-400'}`}>
        {file ? <FiCheck size={18}/> : <FiFileText size={18}/>}
      </div>
      <div className="flex-1 overflow-hidden">
        <p className="text-[10px] font-black uppercase text-gray-500 tracking-widest leading-none">{title}</p>
        <p className="text-xs font-bold text-gray-800 truncate mt-1">{file ? file.name : "Sin adjuntar"}</p>
      </div>
      <label className="cursor-pointer bg-white border border-gray-200 px-4 py-2 rounded-xl text-[10px] font-black text-gray-600 hover:bg-gray-50 hover:text-[#87be00] shadow-sm transition-colors shrink-0">
        {file ? "Cambiar" : "Subir"}
        <input type="file" className="hidden" accept=".pdf" onChange={onChangeHandler} />
      </label>
    </div>
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 font-[Outfit]">
      <div className="bg-white w-full max-w-4xl rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[95vh] animate-in fade-in zoom-in duration-200">
        
        <div className="px-8 py-5 border-b border-gray-100 flex justify-between items-center bg-white sticky top-0 z-10">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-[#87be00]/10 text-[#87be00] rounded-2xl">
              <FiUserPlus size={24} strokeWidth={2.5}/>
            </div>
            <div>
              <h3 className="text-2xl font-black text-gray-800 tracking-tight">Nuevo Colaborador</h3>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-0.5">Ficha de Ingreso</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700 rounded-full transition-colors">
            <FiX size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 overflow-y-auto bg-gray-50/30">
          {error && <div className="mb-6 bg-red-50 text-red-600 p-4 rounded-2xl text-sm border border-red-100 font-medium flex items-center gap-2">⚠️ {error}</div>}

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            
            <div className="lg:col-span-6 space-y-6">
              <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm space-y-5">
                <h4 className="text-[11px] font-black text-[#87be00] uppercase tracking-[0.2em] flex items-center gap-2 mb-4">
                  <FiUser size={14}/> 1. Identificación y Acceso
                </h4>

                <div className="flex gap-5 items-center">
                  <div className="shrink-0 relative group cursor-pointer">
                    {preview ? (
                      <img src={preview} className="w-20 h-20 rounded-[1.2rem] object-cover border-2 border-[#87be00] shadow-md" />
                    ) : (
                      <div className="w-20 h-20 rounded-[1.2rem] bg-gray-100 border-2 border-dashed border-gray-300 flex items-center justify-center group-hover:border-[#87be00] transition-colors">
                        <FiCamera size={24} className="text-gray-400 group-hover:text-[#87be00]"/>
                      </div>
                    )}
                    <label className="absolute inset-0 w-full h-full cursor-pointer rounded-[1.2rem]">
                      <input type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
                    </label>
                  </div>
                  
                  <div className="flex-1 space-y-3">
                    <input type="text" value={form.first_name} placeholder="Nombres" required className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-[#87be00] focus:border-transparent outline-none transition-all"
                      onChange={e => setForm({...form, first_name: e.target.value})} />
                    <input type="text" value={form.last_name} placeholder="Apellidos" required className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-[#87be00] focus:border-transparent outline-none transition-all"
                      onChange={e => setForm({...form, last_name: e.target.value})} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 items-start">
                  <div className="w-full">
                    <input 
                      type="text" 
                      value={form.rut} 
                      placeholder="RUT (Ej: 12.345.678-9)" 
                      required 
                      className={`w-full bg-gray-50 border rounded-xl px-4 py-2.5 text-sm outline-none transition-all ${rutError ? 'border-red-400 focus:ring-2 focus:ring-red-400 focus:bg-red-50/20' : 'border-gray-200 focus:ring-2 focus:ring-[#87be00] focus:border-transparent'}`}
                      onChange={handleRutChange} 
                    />
                    {rutError && <p className="text-red-500 text-[10px] font-bold mt-1 ml-1 animate-in slide-in-from-top-1">{rutError}</p>}
                  </div>
                  <input type="text" value={form.phone} placeholder="Teléfono" required className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-[#87be00] focus:border-transparent outline-none transition-all"
                    onChange={e => setForm({...form, phone: e.target.value})} />
                </div>

                <div className="space-y-3">
                  <input type="email" value={form.email} placeholder="Correo Electrónico" required className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-[#87be00] focus:border-transparent outline-none transition-all"
                    onChange={e => setForm({...form, email: e.target.value})} />
                  
                  {/* SELECTOR DE EMPRESA CON PROTECCIÓN DE ARREGLO */}
                  <select 
                    required 
                    value={form.company_id} 
                    className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-[#87be00] outline-none transition-all cursor-pointer"
                    onChange={e => setForm({...form, company_id: e.target.value})}
                  >
                    <option value="" disabled>
                      {loadingEmpresas ? "Cargando empresas..." : "Seleccione Empresa Asignada"}
                    </option>
                    {(empresas || []).map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.name}
                      </option>
                    ))}
                  </select>

                  <div className="grid grid-cols-2 gap-3">
                    <input type="password" value={form.password} placeholder="Contraseña" required className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-[#87be00] focus:border-transparent outline-none transition-all"
                      onChange={e => setForm({...form, password: e.target.value})} />
                    <select required value={form.role} className="w-full bg-white border border-[#87be00]/30 text-[#87be00] font-bold rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-[#87be00] outline-none transition-all cursor-pointer"
                      onChange={e => setForm({...form, role: e.target.value})}>
                      <option value="" disabled>Perfil de Sistema</option>
                      <option value="USUARIO">Mercaderista</option>
                      <option value="SUPERVISOR">Supervisor</option>
                      <option value="VIEW">Viewer</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            <div className="lg:col-span-6 space-y-6">
              <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm space-y-4">
                <h4 className="text-[11px] font-black text-[#87be00] uppercase tracking-[0.2em] flex items-center gap-2 mb-2">
                  <FiBriefcase size={14}/> 2. Datos Laborales
                </h4>

                <input type="text" value={form.position} placeholder="Cargo Laboral (Ej: Mercaderista)" required className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-[#87be00] focus:border-transparent outline-none transition-all"
                  onChange={e => setForm({...form, position: e.target.value})} />
                
                <input type="text" value={form.trabajando_para} placeholder="Trabajando para..." required className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-[#87be00] focus:border-transparent outline-none transition-all"
                  onChange={e => setForm({...form, trabajando_para: e.target.value})} />
                
                <div className="grid grid-cols-2 gap-3">
                  {/* 🚩 CONTROLADOR DE CAMBIO: Si pasa a Indefinido limpia la fecha de término */}
                  <select 
                    required 
                    value={form.tipo_contrato} 
                    className="col-span-2 bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-[#87be00] outline-none transition-all"
                    onChange={e => {
                      const val = e.target.value;
                      setForm(prev => ({
                        ...prev,
                        tipo_contrato: val,
                        fecha_termino_contrato: val === "Indefinido" ? "" : prev.fecha_termino_contrato
                      }));
                    }}
                  >
                    <option value="" disabled>Seleccione Tipo de Contrato</option>
                    <option value="Indefinido">Indefinido</option>
                    <option value="Plazo Fijo">Plazo Fijo</option>
                    <option value="EST">Servicios Transitorios (EST)</option>
                    <option value="OT">Outsourcing (OT)</option>
                    <option value="Propio">Propio</option>
                  </select>

                  {/* 🚩 CLASE DINÁMICA: Si es indefinido toma col-span-2 para ocupar todo el ancho */}
                  <div className={`flex flex-col bg-gray-50 border border-gray-200 rounded-xl p-2 px-3 ${form.tipo_contrato === "Indefinido" ? "col-span-2" : ""}`}>
                    <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Inicio Contrato</label>
                    <input type="date" required value={form.fecha_inicio_contrato} className="bg-transparent text-sm outline-none mt-1 text-gray-700 font-medium cursor-text"
                      onChange={e => setForm({...form, fecha_inicio_contrato: e.target.value})} />
                  </div>
                  
                  {/* 🚩 RENDERIZADO CONDICIONAL: Oculta el campo de fin si es contrato Indefinido */}
                  {form.tipo_contrato !== "Indefinido" && (
                    <div className="flex flex-col bg-gray-50 border border-gray-200 rounded-xl p-2 px-3">
                      <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Fin (Opcional)</label>
                      <input type="date" value={form.fecha_termino_contrato} className="bg-transparent text-sm outline-none mt-1 text-gray-700 font-medium cursor-text"
                        onChange={e => setForm({...form, fecha_termino_contrato: e.target.value})} />
                    </div>
                  )}
                </div>

                <div className="mt-4 p-4 bg-gray-50 rounded-2xl border border-gray-100">
                  <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest flex items-center gap-1.5 mb-3">
                    <FiShield size={12}/> Supervisor Directo
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    <input type="text" value={form.supervisor_nombre} placeholder="Nombre completo" className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-[#87be00] outline-none"
                        onChange={e => setForm({...form, supervisor_nombre: e.target.value})} />
                    <input type="text" value={form.supervisor_telefono} placeholder="Teléfono" className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-[#87be00] outline-none"
                        onChange={e => setForm({...form, supervisor_telefono: e.target.value})} />
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm space-y-3">
                <h4 className="text-[11px] font-black text-[#87be00] uppercase tracking-[0.2em] flex items-center gap-2 mb-2">
                  <FiUploadCloud size={14}/> 3. Documentación Extra
                </h4>
                
                <DocumentUploader title="Contrato Laboral" file={documentoContrato} onChangeHandler={e => { const f = e.target.files[0]; if(f) setDocumentoContrato(f); }} />
                <DocumentUploader title="Mutualidad / ACHS" file={documentoAchs} onChangeHandler={e => { const f = e.target.files[0]; if(f) setDocumentoAchs(f); }} />
                <DocumentUploader title="Otro Documento" file={documentoOtro} onChangeHandler={e => { const f = e.target.files[0]; if(f) setDocumentoOtro(f); }} />
              </div>

            </div>
          </div>

          <div className="mt-8">
            <button type="submit" disabled={loading || rutError !== ""} className="w-full bg-[#87be00] hover:bg-[#76a500] text-white py-4 rounded-[1.5rem] text-sm font-black uppercase tracking-[0.2em] shadow-xl shadow-[#87be00]/20 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2">
              {loading ? "Procesando..." : <><FiCheck size={18}/> Confirmar y Generar Ficha</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateAdminUserModal;