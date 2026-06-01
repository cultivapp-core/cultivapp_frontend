import { useState } from "react"
import { FiX, FiTrash2, FiHelpCircle, FiUser, FiEye, FiPlus } from "react-icons/fi"
import api from "../../api/apiClient"

const defaultForm = () => ({
  question: "",
  type: "TEXTO",
  target_flow: "REPONEDOR",
  is_required: false,
  options: ["Nueva opción"],
  isMultiple: false,
  max_selections: ""
})

const CreateQuestionModal = ({ isOpen, onClose, onCreated }) => {
  const [form, setForm] = useState(defaultForm())
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  if (!isOpen) return null

  const set = (patch) => setForm(prev => ({ ...prev, ...patch }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    // Empaquetamos la configuración para que coincida con el backend
    const payload = {
      question: form.question,
      is_required: form.is_required,
      type: form.type.toLowerCase(),
      target_flow: form.target_flow.toLowerCase(),
      config: {
        options: form.type === "SELECCION" ? form.options : [],
        isMultiple: form.type === "SELECCION" ? form.isMultiple : false,
        max_selections: form.type === "SELECCION" && form.isMultiple ? parseInt(form.max_selections) || 0 : 0
      }
    }

    try {
      await api.post("/questions", payload)
      onCreated()
      onClose()
      setForm(defaultForm())
    } catch (err) { 
      setError(err.message) 
    } finally { 
      setLoading(false) 
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-[200] p-4 font-[Outfit]">
      <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl border border-gray-100 overflow-hidden flex flex-col">
        
        {/* HEADER */}
        <div className="flex items-center justify-between px-6 py-5 bg-white border-b border-gray-50">
          <div>
            <h3 className="text-xl font-black uppercase tracking-tighter text-gray-900 italic">
              Nueva <span className="text-[#87be00]">Pregunta</span>
            </h3>
          </div>
          <button onClick={onClose} className="p-2.5 rounded-xl bg-gray-50 text-gray-400 hover:bg-gray-100 transition-all"><FiX size={18} /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto max-h-[70vh]">
            
            {error && <div className="p-3 bg-red-50 text-red-500 text-[11px] font-bold uppercase rounded-xl">{error}</div>}

            {/* FLUJO DESTINO */}
            <div className="space-y-2">
              <label className="text-[9px] font-black uppercase text-gray-400 ml-2">Asignación del Flujo Destino</label>
              <div className="grid grid-cols-2 gap-2 bg-gray-100 p-1.5 rounded-2xl">
                <button type="button" onClick={() => set({ target_flow: "REPONEDOR" })} className={`py-3 rounded-xl text-[10px] font-black uppercase transition-all ${form.target_flow === "REPONEDOR" ? "bg-white text-[#87be00] shadow-sm" : "text-gray-400"}`}>
                  <FiUser size={12} className="inline mr-1"/> Reponedor
                </button>
                <button type="button" onClick={() => set({ target_flow: "SUPERVISOR" })} className={`py-3 rounded-xl text-[10px] font-black uppercase transition-all ${form.target_flow === "SUPERVISOR" ? "bg-white text-indigo-600 shadow-sm" : "text-gray-400"}`}>
                  <FiEye size={12} className="inline mr-1"/> Supervisor
                </button>
              </div>
            </div>

            {/* ENUNCIADO */}
            <div className="space-y-1.5">
              <label className="text-[9px] font-black uppercase text-gray-400 ml-2 flex items-center gap-1"><FiHelpCircle size={11}/> Enunciado</label>
              <input type="text" value={form.question} onChange={e => set({ question: e.target.value })} required placeholder="Escribe la pregunta..." className="w-full bg-gray-50 border rounded-xl px-4 py-3.5 text-xs font-bold" />
            </div>

            {/* TIPO DE PREGUNTA */}
            <div className="space-y-2">
              <label className="text-[9px] font-black uppercase text-gray-400 ml-2">Formato de Respuesta</label>
              <div className="grid grid-cols-3 gap-2">
                {["TEXTO", "SELECCION", "BOOLEAN"].map((t) => (
                  <button key={t} type="button" onClick={() => set({ type: t })} className={`py-3 rounded-xl text-[9px] font-black uppercase transition-all ${form.type === t ? "bg-[#87be00] text-white" : "bg-gray-100 text-gray-400"}`}>
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {/* Opciones (si es SELECCION) */}
            {form.type === "SELECCION" && (
              <div className="bg-gray-50 p-4 rounded-2xl space-y-3">
                 <label className="flex items-center gap-2 text-[10px] font-black uppercase text-gray-500">
                    <input type="checkbox" checked={form.isMultiple} onChange={e => set({ isMultiple: e.target.checked })} className="accent-[#87be00]" />
                    Selección Múltiple
                 </label>
                 
                 {form.isMultiple && (
                   <div className="flex items-center gap-3">
                      <span className="text-[10px] font-black text-gray-500 uppercase">Máx. respuestas:</span>
                      <input type="number" value={form.max_selections} onChange={e => set({ max_selections: e.target.value })} className="w-20 p-2 text-xs border border-gray-200 rounded-lg text-center" placeholder="Sin límite" />
                   </div>
                 )}

                 {form.options.map((opt, i) => (
                   <div key={i} className="flex gap-2">
                      <input value={opt} onChange={e => { const o = [...form.options]; o[i] = e.target.value; set({ options: o }) }} className="flex-1 p-2 text-xs border border-gray-200 rounded-lg" />
                      <button type="button" onClick={() => set({ options: form.options.filter((_, idx) => idx !== i) })} className="text-gray-300 hover:text-red-500"><FiTrash2 size={14}/></button>
                   </div>
                 ))}
                 <button type="button" onClick={() => set({ options: [...form.options, "Nueva opción"] })} className="text-[#87be00] text-[10px] font-black flex items-center gap-1"><FiPlus size={12}/> Añadir Opción</button>
              </div>
            )}

            <label className="flex items-center gap-3 px-2 cursor-pointer">
              <input type="checkbox" checked={form.is_required} onChange={e => set({ is_required: e.target.checked })} className="w-4 h-4 accent-[#87be00]" />
              <span className="text-[11px] font-black uppercase text-gray-600">Pregunta obligatoria</span>
            </label>

            <button type="submit" disabled={loading} className="w-full bg-gray-900 hover:bg-black text-white py-4 rounded-xl font-black uppercase text-[11px]">
              {loading ? "GUARDANDO..." : "CREAR PREGUNTA"}
            </button>
        </form>
      </div>
    </div>
  )
}

export default CreateQuestionModal