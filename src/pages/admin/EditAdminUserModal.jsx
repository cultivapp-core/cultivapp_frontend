import { useState, useEffect } from "react";
import { 
  FiX, FiUploadCloud, FiFileText, FiCheck, FiSave, FiUser, FiShield, FiBriefcase 
} from "react-icons/fi";
import api from "../../api/apiClient";

const EditAdminUserModal = ({ isOpen, onClose, onUpdated, user }) => {
  const [form, setForm] = useState({
    first_name: "", last_name: "", email: "", phone: "",
    role: "", rut: "", position: "", trabajando_para: "",
    fecha_inicio_contrato: "", fecha_termino_contrato: "", tipo_contrato: "",
    supervisor_nombre: "", supervisor_telefono: "",
  });

  const [foto, setFoto] = useState(null);
  const [preview, setPreview] = useState(null);
  const [documentoContrato, setDocumentoContrato] = useState(null);
  const [documentoAchs, setDocumentoAchs] = useState(null);
  const [documentoOtro, setDocumentoOtro] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [rutError, setRutError] = useState("");

  useEffect(() => {
    if (isOpen && user) {
      setForm({
        first_name: user?.first_name || "",
        last_name: user?.last_name || "",
        email: user?.email || "",
        phone: user?.phone || "",
        role: user?.role || "",
        rut: user?.rut || "",
        position: user?.position || "",
        trabajando_para: user?.trabajando_para || "",
        fecha_inicio_contrato: user?.fecha_inicio_contrato ? user.fecha_inicio_contrato.split('T')[0] : "",
        fecha_termino_contrato: user?.fecha_termino_contrato ? user.fecha_termino_contrato.split('T')[0] : "",
        tipo_contrato: user?.tipo_contrato || "",
        supervisor_nombre: user?.supervisor_nombre || "",
        supervisor_telefono: user?.supervisor_telefono || "",
      });
      setPreview(user?.foto_url ? `${api.defaults?.baseURL ?? ""}${user.foto_url}` : null);
    }
  }, [isOpen, user]);

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
  };

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
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.rut && !validarRutChileno(form.rut)) {
      setRutError("Ingresa un RUT válido");
      return;
    }
    setLoading(true);
    try {
      const formData = new FormData();
      Object.keys(form).forEach((key) => formData.append(key, form[key]));
      if (foto) formData.append("foto", foto);
      if (documentoContrato) formData.append("documento_contrato", documentoContrato);
      if (documentoAchs) formData.append("documento_achs", documentoAchs);
      if (documentoOtro) formData.append("documento_otro", documentoOtro);
      await api.put(`/users/${user.id}`, formData);
      onUpdated();
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  };

  const DocumentUploader = ({ title, file, onChangeHandler }) => (
    <div className={`flex items-center gap-3 p-3 border rounded-2xl ${file ? 'border-[#87be00] bg-[#87be00]/5' : 'border-gray-200 bg-white'}`}>
      <div className={`p-2 rounded-xl ${file ? 'bg-[#87be00] text-white' : 'bg-gray-100 text-gray-400'}`}>
        {file ? <FiCheck size={18}/> : <FiFileText size={18}/>}
      </div>
      <div className="flex-1 overflow-hidden">
        <p className="text-[10px] font-black uppercase text-gray-500 tracking-widest">{title}</p>
        <p className="text-xs font-bold text-gray-800 truncate">{file ? file.name : "Sin cambios"}</p>
      </div>
      <label className="cursor-pointer bg-white border border-gray-200 px-4 py-2 rounded-xl text-[10px] font-black text-gray-600 hover:text-[#87be00]">
        {file ? "Cambiar" : "Subir"}
        <input type="file" className="hidden" accept=".pdf" onChange={onChangeHandler} />
      </label>
    </div>
  );

  if (!isOpen || !user) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 font-[Outfit]">
      <div className="bg-white w-full max-w-4xl rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[95vh]">
        <div className="px-8 py-5 border-b border-gray-100 flex justify-between items-center bg-white sticky top-0 z-10">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-[#87be00]/10 text-[#87be00] rounded-2xl"><FiSave size={24}/></div>
            <div>
              <h3 className="text-2xl font-black text-gray-800 tracking-tight">Editar Colaborador</h3>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">ID: {user?.id?.slice(0, 8)}...</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2.5 text-gray-400 hover:bg-gray-100 rounded-full"><FiX size={24} /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 overflow-y-auto bg-gray-50/30">
          {error && <div className="mb-6 bg-red-50 text-red-600 p-4 rounded-2xl text-sm border border-red-100 font-medium">⚠️ {error}</div>}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            
            {/* Columna Izquierda */}
            <div className="lg:col-span-6 space-y-6">
              <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm space-y-5">
                <h4 className="text-[11px] font-black text-[#87be00] uppercase tracking-[0.2em] flex items-center gap-2"><FiUser size={14}/> 1. Identificación</h4>
                <div className="flex gap-5 items-center">
                  <img src={preview || "https://via.placeholder.com/150"} className="w-20 h-20 rounded-[1.2rem] object-cover border-2 border-[#87be00]" />
                  <input type="text" value={form.first_name} placeholder="Nombres" required className="w-full bg-gray-50 border rounded-xl px-4 py-2.5 text-sm outline-none" onChange={e => setForm({...form, first_name: e.target.value})} />
                </div>
                <input type="text" value={form.last_name} placeholder="Apellidos" required className="w-full bg-gray-50 border rounded-xl px-4 py-2.5 text-sm outline-none" onChange={e => setForm({...form, last_name: e.target.value})} />
                <input type="text" value={form.rut} placeholder="RUT" required className={`w-full bg-gray-50 border rounded-xl px-4 py-2.5 text-sm outline-none ${rutError ? 'border-red-400' : 'border-gray-200'}`} onChange={handleRutChange} />
                <input type="email" value={form.email} placeholder="Correo Electrónico" required className="w-full bg-gray-50 border rounded-xl px-4 py-2.5 text-sm outline-none" onChange={e => setForm({...form, email: e.target.value})} />
                
                {/* 🚩 NUEVO CAMPO DE TELÉFONO */}
                <input 
                  type="tel" 
                  value={form.phone} 
                  placeholder="Teléfono (Ej: +569...)" 
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none" 
                  onChange={e => setForm({...form, phone: e.target.value})} 
                />
              </div>
              
              <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm space-y-3">
                <h4 className="text-[11px] font-black text-[#87be00] uppercase tracking-[0.2em] flex items-center gap-2"><FiUploadCloud size={14}/> 3. Documentación</h4>
                <DocumentUploader title="Contrato" file={documentoContrato} onChangeHandler={e => setDocumentoContrato(e.target.files[0])} />
                <DocumentUploader title="Mutualidad/ACHS" file={documentoAchs} onChangeHandler={e => setDocumentoAchs(e.target.files[0])} />
                <DocumentUploader title="Otro Doc" file={documentoOtro} onChangeHandler={e => setDocumentoOtro(e.target.files[0])} />
              </div>
            </div>

            {/* Columna Derecha */}
            <div className="lg:col-span-6 space-y-6">
              <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm space-y-4">
                <h4 className="text-[11px] font-black text-[#87be00] uppercase tracking-[0.2em] flex items-center gap-2"><FiBriefcase size={14}/> 2. Datos Laborales</h4>
                <input type="text" value={form.position} placeholder="Cargo" className="w-full bg-gray-50 border rounded-xl px-4 py-2.5 text-sm outline-none" onChange={e => setForm({...form, position: e.target.value})} />
                <input type="text" value={form.trabajando_para} placeholder="Trabajando para..." className="w-full bg-gray-50 border rounded-xl px-4 py-2.5 text-sm outline-none" onChange={e => setForm({...form, trabajando_para: e.target.value})} />
                <select value={form.tipo_contrato} className="w-full bg-gray-50 border rounded-xl px-4 py-2.5 text-sm outline-none" onChange={e => setForm({...form, tipo_contrato: e.target.value})}>
                   <option value="">Tipo Contrato</option>
                   <option value="Indefinido">Indefinido</option><option value="Plazo Fijo">Plazo Fijo</option>
                   <option value="EST">EST</option><option value="OT">OT</option><option value="Propio">Propio</option>
                </select>
                <div className="grid grid-cols-2 gap-3">
                   <input type="date" value={form.fecha_inicio_contrato} className="bg-gray-50 border rounded-xl p-2 text-xs" onChange={e => setForm({...form, fecha_inicio_contrato: e.target.value})} />
                   <input type="date" value={form.fecha_termino_contrato} className="bg-gray-50 border rounded-xl p-2 text-xs" onChange={e => setForm({...form, fecha_termino_contrato: e.target.value})} />
                </div>
              </div>

              <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm space-y-4">
                <h4 className="text-[11px] font-black text-[#87be00] uppercase tracking-[0.2em] flex items-center gap-2"><FiShield size={14}/> 4. Datos del Supervisor</h4>
                <input type="text" value={form.supervisor_nombre} placeholder="Nombre del Supervisor" className="w-full bg-gray-50 border rounded-xl px-4 py-2.5 text-sm outline-none" onChange={e => setForm({...form, supervisor_nombre: e.target.value})} />
                <input type="text" value={form.supervisor_telefono} placeholder="Teléfono del Supervisor" className="w-full bg-gray-50 border rounded-xl px-4 py-2.5 text-sm outline-none" onChange={e => setForm({...form, supervisor_telefono: e.target.value})} />
              </div>
            </div>
          </div>
          <button type="submit" disabled={loading} className="w-full mt-8 bg-[#87be00] text-white py-4 rounded-[1.5rem] font-black uppercase tracking-widest shadow-xl hover:bg-[#76a500]">
            {loading ? "Guardando..." : "Actualizar Colaborador"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default EditAdminUserModal;