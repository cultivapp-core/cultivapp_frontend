import { useState } from "react"
import { FiX, FiMail, FiPhone, FiSave, FiShield, FiAtSign, FiUsers, FiClock, FiCalendar } from "react-icons/fi" // FiShield ya estaba importado
import api from "../api/apiClient"
import { toast } from "react-hot-toast"
import { useAuth } from "../context/AuthContext" // Aseguramos acceso al rol del loggedUser

const EditUserContactModal = ({ user, onClose, onUpdated }) => {
  const { user: loggedUser } = useAuth()
  
  const [email, setEmail] = useState(user.email || "")
  const [phone, setPhone] = useState(user.phone || "")
  const [role, setRole] = useState(user.role || "OPERARIO") // ✅ Estado para el Rol
  
  const [supNombre, setSupNombre] = useState(user.supervisor_nombre || "")
  const [supPhone, setSupPhone] = useState(user.supervisor_telefono || "")
  
  const [loading, setLoading] = useState(false)

  const handleSave = async () => {
    try {
      setLoading(true);
      await api.put(`/users/${user.id}`, { 
        ...user, 
        email, 
        phone,
        role, // ✅ Enviamos el rol actualizado
        supervisor_nombre: supNombre,
        supervisor_telefono: supPhone
      });
      
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

  const Label = ({ children }) => (
    <label className="text-[9px] font-black text-gray-400 uppercase tracking-[0.3em] ml-6 mb-2 block italic">
      {children}
    </label>
  )

  const InputWrapper = ({ icon: Icon, children }) => (
    <div className="relative flex items-center group">
      <div className="absolute left-6 text-gray-300 group-focus-within:text-[#87be00] transition-colors duration-300">
        <Icon size={20} />
      </div>
      {children}
    </div>
  )

  const inputClass = "w-full bg-gray-50/80 border-2 border-transparent rounded-[2rem] pl-16 pr-6 py-4 text-sm font-black text-gray-900 outline-none focus:bg-white focus:border-[#87be00]/20 focus:ring-4 focus:ring-[#87be00]/5 transition-all placeholder:text-gray-300 shadow-inner"

  return (
    <div className="fixed inset-0 bg-gray-900/80 backdrop-blur-md flex items-center justify-center p-4 z-[100] font-[Outfit]">
      <div className="bg-white w-full max-w-md rounded-[3.5rem] shadow-[0_50px_100px_-20px_rgba(0,0,0,0.3)] overflow-hidden animate-in fade-in zoom-in duration-500 max-h-[95vh] flex flex-col">
        
        {/* HEADER */}
        <div className="p-12 pb-8 flex justify-between items-start shrink-0">
          <div className="flex items-center gap-5">
            <div className="w-14 h-14 bg-gray-900 rounded-[1.5rem] flex items-center justify-center text-[#87be00] shadow-xl shadow-[#87be00]/10">
              <FiAtSign size={28} />
            </div>
            <div>
              <h2 className="text-2xl font-black text-gray-900 uppercase tracking-tighter leading-none italic">
                Editar Perfil
              </h2>
              <p className="text-[10px] font-black text-[#87be00] uppercase tracking-[0.3em] mt-2">
                Contacto, Rol y Supervisión
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-3 hover:bg-red-50 text-gray-300 hover:text-red-500 rounded-2xl transition-all"><FiX size={28} /></button>
        </div>

        {/* CUERPO - SCROLLABLE */}
        <div className="px-12 pb-4 space-y-8 overflow-y-auto">
          <div className="bg-gray-50 p-5 rounded-[2rem] border border-gray-100 flex items-center gap-4">
             <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-gray-400 font-black text-xs border border-gray-100 uppercase italic shrink-0">
                {user.first_name?.charAt(0)}
             </div>
             <p className="text-sm font-black text-gray-900 uppercase italic tracking-tighter truncate">
               {user.first_name} {user.last_name}
             </p>
          </div>

          {/* SECCIÓN COLABORADOR */}
          <div className="space-y-5">
            <Label>Datos del Colaborador</Label>
            <InputWrapper icon={FiMail}>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" className={inputClass} />
            </InputWrapper>
            <InputWrapper icon={FiPhone}>
              <input type="text" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Teléfono" className={inputClass} />
            </InputWrapper>
          </div>

          {/* 🚩 NUEVA SECCIÓN: ROL DEL USUARIO */}
          <div className="space-y-5">
            <Label>Perfil de Acceso</Label>
            <InputWrapper icon={FiShield}>
               <select 
                value={role} 
                onChange={(e) => setRole(e.target.value)} 
                className={inputClass + " appearance-none"}
               >
                 <option value="ADMIN_CLIENTE">ADMIN CLIENTE</option>
                 <option value="SUPERVISOR">SUPERVISOR</option>
                 <option value="USUARIO">USUARIO</option>
                 <option value="VIEWER">VIEWER</option>
               </select>
            </InputWrapper>
          </div>

          {/* SECCIÓN DATOS SUPERVISOR */}
          <div className="space-y-5 bg-gray-900 p-8 rounded-[2.5rem] shadow-xl">
            <div className="flex items-center gap-2 mb-2">
               <FiUsers className="text-[#87be00]" size={16} />
               <label className="text-[9px] font-black text-[#87be00] uppercase tracking-[0.3em] italic">Datos para Credencial</label>
            </div>
            <div className="space-y-4">
               <input 
                 type="text" 
                 value={supNombre} 
                 onChange={(e) => setSupNombre(e.target.value)} 
                 placeholder="Nombre Supervisor" 
                 className="w-full bg-white/10 border-none rounded-2xl px-6 py-4 text-sm font-bold text-white placeholder:text-gray-600 focus:bg-white/20 transition-all outline-none" 
               />
               <input 
                 type="text" 
                 value={supPhone} 
                 onChange={(e) => setSupPhone(e.target.value)} 
                 placeholder="Teléfono Supervisor" 
                 className="w-full bg-white/10 border-none rounded-2xl px-6 py-4 text-sm font-bold text-white placeholder:text-gray-600 focus:bg-white/20 transition-all outline-none" 
               />
            </div>
          </div>
        </div>

        {/* ACCIONES */}
        <div className="p-12 pt-8 shrink-0">
          <div className="flex flex-col gap-4">
            <button
              onClick={handleSave}
              disabled={loading}
              className="w-full bg-gray-900 hover:bg-black text-[#87be00] py-6 rounded-[2rem] font-black uppercase tracking-[0.2em] text-[11px] transition-all flex items-center justify-center gap-4 shadow-2xl hover:scale-[1.02] active:scale-95 disabled:opacity-50"
            >
              {loading ? <div className="w-5 h-5 border-4 border-[#87be00]/20 border-t-[#87be00] rounded-full animate-spin" /> : <><FiSave size={20} /> Guardar Cambios</>}
            </button>
            <button onClick={onClose} className="w-full py-2 text-gray-400 font-black uppercase text-[9px] tracking-[0.4em] hover:text-gray-600 transition-colors italic">Cancelar</button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default EditUserContactModal