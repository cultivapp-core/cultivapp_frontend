import { useState, useEffect } from "react";
// 🚩 IMPORT CORREGIDO: Agregado FiUserPlus
import { 
  FiX, 
  FiCamera, 
  FiUploadCloud, 
  FiFileText, 
  FiCheck, 
  FiPhone, 
  FiUser, 
  FiUserPlus, 
  FiShield 
} from "react-icons/fi";
import api from "../api/apiClient";

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
    fecha_inicio_contrato: "", 
    fecha_termino_contrato: "",
    tipo_contrato: "",
    supervisor_nombre: "",
    supervisor_telefono: "",
  };

  const [form, setForm] = useState(initialForm);
  const [foto, setFoto] = useState(null);
  const [preview, setPreview] = useState(null);
  const [documentoAchs, setDocumentoAchs] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isOpen) {
      setForm(initialForm);
      setFoto(null);
      setPreview(null);
      setDocumentoAchs(null);
      setError("");
    }
  }, [isOpen]);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFoto(file);
      setPreview(URL.createObjectURL(file));
    }
  };

  const handleAchsChange = (e) => {
    const file = e.target.files[0];
    if (file) setDocumentoAchs(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const formData = new FormData();
      
      Object.keys(form).forEach((key) => {
        formData.append(key, form[key]);
      });

      formData.append("company_id", userAdmin.company_id);
      
      if (foto) formData.append("foto", foto);
      if (documentoAchs) formData.append("documento_achs", documentoAchs);

      await api.post("/users", formData);

      onCreated();
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[95vh]">
        
        <div className="p-6 border-b flex justify-between items-center bg-gray-50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#87be00] text-white rounded-lg">
              <FiUserPlus size={20}/>
            </div>
            <h3 className="text-xl font-bold text-gray-800">Nuevo Colaborador</h3>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
            <FiX size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 overflow-y-auto space-y-6">
          {error && <div className="bg-red-50 text-red-500 p-3 rounded-xl text-xs border border-red-100 italic font-bold">⚠️ {error}</div>}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <div className="flex flex-col items-center p-4 border-2 border-dashed border-gray-200 rounded-[2rem] bg-gray-50 group hover:border-[#87be00] transition-colors">
                {preview ? (
                  <img src={preview} className="w-24 h-24 rounded-2xl object-cover mb-2 border-2 border-[#87be00]" />
                ) : (
                  <div className="w-24 h-24 rounded-2xl bg-gray-200 flex items-center justify-center mb-2">
                    <FiCamera size={30} className="text-gray-400"/>
                  </div>
                )}
                <label className="cursor-pointer text-[10px] font-black text-[#87be00] uppercase tracking-widest">
                  <FiUploadCloud className="inline mr-1"/> Subir Foto Perfil
                  <input type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
                </label>
              </div>

              <div className={`flex items-center gap-3 p-4 border-2 rounded-2xl transition-all ${documentoAchs ? 'border-[#87be00] bg-green-50' : 'border-gray-100 bg-white'}`}>
                <div className={`${documentoAchs ? 'text-[#87be00]' : 'text-gray-400'}`}>
                  {documentoAchs ? <FiCheck size={24}/> : <FiFileText size={24}/>}
                </div>
                <div className="flex-1">
                  <p className="text-[9px] font-black uppercase text-gray-400 tracking-widest leading-none">Mutualidad / ACHS</p>
                  <p className="text-[11px] font-bold text-gray-700 truncate mt-1">
                    {documentoAchs ? documentoAchs.name : "Sin archivo .pdf"}
                  </p>
                </div>
                <label className="cursor-pointer bg-white border border-gray-200 px-3 py-1.5 rounded-lg text-[10px] font-black text-gray-600 hover:bg-gray-100 shadow-sm">
                  {documentoAchs ? "Cambiar" : "Adjuntar"}
                  <input type="file" className="hidden" accept=".pdf" onChange={handleAchsChange} />
                </label>
              </div>

              <input type="text" placeholder="Nombres" required className="w-full border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-[#87be00] outline-none"
                onChange={e => setForm({...form, first_name: e.target.value})} />
              <input type="text" placeholder="Apellidos" required className="w-full border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-[#87be00] outline-none"
                onChange={e => setForm({...form, last_name: e.target.value})} />
              
              <div className="grid grid-cols-2 gap-3">
                <input type="text" placeholder="RUT" required className="w-full border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-[#87be00] outline-none"
                  onChange={e => setForm({...form, rut: e.target.value})} />
                <input type="text" placeholder="Teléfono" required className="w-full border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-[#87be00] outline-none"
                  onChange={e => setForm({...form, phone: e.target.value})} />
              </div>
            </div>

            <div className="space-y-4">
              <input type="text" placeholder="Cargo Laboral" required className="w-full border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-[#87be00] outline-none"
                onChange={e => setForm({...form, position: e.target.value})} />
              
              <div className="grid grid-cols-2 gap-3">
                <select required className="border-gray-200 rounded-xl px-3 py-2.5 text-xs bg-white col-span-2 outline-none focus:ring-2 focus:ring-[#87be00]"
                  onChange={e => setForm({...form, tipo_contrato: e.target.value})}>
                  <option value="">Tipo de Contrato</option>
                  <option value="Indefinido">Indefinido</option>
                  <option value="Plazo Fijo">Plazo Fijo</option>
                  <option value="Part-Time">Part-Time</option>
                  <option value="Honorarios">Honorarios</option>
                  <option value="EST">Servicios Transitorios (EST)</option>
                  <option value="OT">Outsourcing (OT)</option>
                  <option value="Propio">Propio</option>
                </select>

                <div className="flex flex-col">
                  <label className="text-[9px] font-black text-gray-400 uppercase mb-1 ml-1 tracking-tighter">Inicio Contrato</label>
                  <input type="date" required className="border-gray-200 rounded-xl px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-[#87be00]"
                    onChange={e => setForm({...form, fecha_inicio_contrato: e.target.value})} />
                </div>
                
                <div className="flex flex-col">
                  <label className="text-[9px] font-black text-gray-400 uppercase mb-1 ml-1 tracking-tighter">Término (Opcional)</label>
                  <input type="date" className="border-gray-200 rounded-xl px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-[#87be00]"
                    onChange={e => setForm({...form, fecha_termino_contrato: e.target.value})} />
                </div>
              </div>

              <input type="email" placeholder="Email" required className="w-full border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-[#87be00] outline-none"
                onChange={e => setForm({...form, email: e.target.value})} />
              <input type="password" placeholder="Contraseña" required className="w-full border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-[#87be00] outline-none"
                onChange={e => setForm({...form, password: e.target.value})} />
              
              <select required className="w-full border-gray-200 rounded-xl px-4 py-2.5 text-sm bg-white outline-none focus:ring-2 focus:ring-[#87be00] font-bold text-gray-700"
                onChange={e => setForm({...form, role: e.target.value})}>
                <option value="">Perfil de Sistema</option>
                <option value="USUARIO">Mercaderista / Operativo</option>
                <option value="SUPERVISOR">Supervisor de Terreno</option>
                <option value="VIEW">Solo Lectura / Cliente</option>
              </select>
            </div>
          </div>

          <div className="bg-gray-50 p-6 rounded-[2rem] border border-gray-100 space-y-4">
             <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2 flex items-center gap-2">
               <FiShield className="text-[#87be00]"/> Información del Supervisor Responsable
             </p>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               <input type="text" placeholder="Nombre Completo Supervisor" className="w-full border-gray-200 rounded-xl px-4 py-2.5 text-sm bg-white outline-none focus:ring-2 focus:ring-[#87be00]"
                  onChange={e => setForm({...form, supervisor_nombre: e.target.value})} />
               <input type="text" placeholder="WhatsApp / Teléfono Supervisor" className="w-full border-gray-200 rounded-xl px-4 py-2.5 text-sm bg-white outline-none focus:ring-2 focus:ring-[#87be00]"
                  onChange={e => setForm({...form, supervisor_telefono: e.target.value})} />
             </div>
          </div>

          <button type="submit" disabled={loading} className="w-full bg-[#87be00] hover:bg-[#76a500] text-white py-4 rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-[#87be00]/20 transition-all active:scale-[0.98] disabled:opacity-50">
            {loading ? "Sincronizando con Servidor..." : "Generar Ficha de Colaborador"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default CreateAdminUserModal;