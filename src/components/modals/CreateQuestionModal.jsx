import { useState } from "react"
import { FiX, FiHelpCircle, FiPlus, FiTrash2 } from "react-icons/fi"
import api from "../../api/apiClient"

const CreateQuestionModal = ({ isOpen, onClose, onCreated }) => {
  const [form, setForm] = useState({
    question: "",
    type: "CERRADA", // ABIERTA, CERRADA, MIXTA, MULTIPLE
    is_required: false,
    options: ["Sí", "No"],
    allow_free_text: false
  })

  const [loading, setLoading] = useState(false)

  if (!isOpen) return null

  const handleTypeSelect = (type) => {
    setForm(prev => ({
      ...prev,
      type,
      options: type === "ABIERTA" ? [] : (type === "CERRADA" ? ["Sí", "No"] : prev.options),
      allow_free_text: type === "MIXTA" ? true : prev.allow_free_text
    }))
  }

  const handleOptionChange = (index, value) => {
    const newOptions = [...form.options]
    newOptions[index] = value
    setForm(prev => ({ ...prev, options: newOptions }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      await api.post("/questions", form)
      onCreated()
      onClose()
    } catch (err) { alert(err.message) }
    finally { setLoading(false) }
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-[200] p-4 font-[Outfit]">
      <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col">
        <div className="px-6 py-5 border-b border-gray-50 flex justify-between items-center">
          <h3 className="text-xl font-black uppercase italic">NUEVA <span className="text-[#87be00]">PREGUNTA</span></h3>
          <button onClick={onClose} className="p-2 text-gray-400 hover:bg-gray-100 rounded-full"><FiX size={18} /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto max-h-[70vh]">
          {/* Enunciado */}
          <input name="question" placeholder="Escribe tu pregunta..." value={form.question} onChange={e => setForm({...form, question: e.target.value})} required className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-xs font-bold" />

          {/* Selector de Tipo */}
          <div className="grid grid-cols-2 gap-2">
            {["ABIERTA", "CERRADA", "MIXTA", "MULTIPLE"].map(t => (
              <button key={t} type="button" onClick={() => handleTypeSelect(t)} className={`py-2 text-[9px] font-black rounded-xl uppercase ${form.type === t ? "bg-[#87be00] text-white" : "bg-gray-100"}`}>{t}</button>
            ))}
          </div>

          {/* Opciones Dinámicas (Solo si no es abierta) */}
          {form.type !== "ABIERTA" && (
            <div className="space-y-2">
              <label className="text-[9px] font-black uppercase text-gray-400 ml-2">Opciones</label>
              {form.options.map((opt, i) => (
                <div key={i} className="flex gap-2">
                  <input value={opt} onChange={e => handleOptionChange(i, e.target.value)} className="w-full bg-gray-50 border rounded-lg px-3 py-2 text-xs font-bold" />
                  <button type="button" onClick={() => setForm(p => ({...p, options: p.options.filter((_, idx) => idx !== i)}))} className="text-red-400 p-2"><FiTrash2 size={14}/></button>
                </div>
              ))}
              <button type="button" onClick={() => setForm(p => ({...p, options: [...p.options, ""]}))} className="text-[10px] font-black text-[#87be00]">+ AÑADIR OPCIÓN</button>
            </div>
          )}

          <label className="flex items-center gap-3 px-2 cursor-pointer">
            <input type="checkbox" checked={form.is_required} onChange={e => setForm({...form, is_required: e.target.checked})} className="accent-[#87be00] w-4 h-4" />
            <span className="text-[10px] font-black uppercase text-gray-600">Pregunta Obligatoria</span>
          </label>

          <button type="submit" className="w-full bg-gray-900 text-white py-4 rounded-xl font-black uppercase text-[11px] tracking-[0.2em]">
            {loading ? "GUARDANDO..." : "CREAR PREGUNTA"}
          </button>
        </form>
      </div>
    </div>
  )
}

export default CreateQuestionModal