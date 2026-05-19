import { useState } from "react"
import { FiX, FiHelpCircle } from "react-icons/fi"
import api from "../../api/apiClient"

const CreateQuestionModal = ({
  isOpen,
  onClose,
  onCreated
}) => {

  const [form, setForm] = useState({
    question: "",
    type: "TEXTO", // 🚩 Nuevo campo por defecto para controlar el formato
    is_required: false
  })

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  if (!isOpen) return null

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target

    setForm(prev => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value
    }))
  }

  // 🚩 Función auxiliar para cambiar el tipo de respuesta con un clic en la tarjeta
  const handleTypeSelect = (selectedType) => {
    setForm(prev => ({
      ...prev,
      type: selectedType
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    setLoading(true)
    setError("")

    try {
      await api.post("/questions", form)

      onCreated()
      onClose()

      setForm({
        question: "",
        type: "TEXTO",
        is_required: false
      })

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
            <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-1">
              Añade un nuevo ítem a la encuesta
            </p>
          </div>
          <button onClick={onClose} className="p-2.5 rounded-xl bg-gray-50 text-gray-400 hover:bg-gray-100 transition-all">
            <FiX size={18} />
          </button>
        </div>

        {/* FORMULARIO */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          
          {error && (
            <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-red-500 text-[11px] font-bold uppercase tracking-wide">
              {error}
            </div>
          )}

          {/* INPUT: ENUNCIADO */}
          <div className="space-y-1.5">
            <label className="text-[9px] font-black uppercase text-gray-400 tracking-widest ml-2 flex items-center gap-1">
              <FiHelpCircle size={11}/> Enunciado de la Pregunta
            </label>
            <input
              type="text"
              name="question"
              placeholder="¿Reponedor ordenó góndola?, ¿Hay stock?..."
              value={form.question}
              onChange={handleChange}
              required
              className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3.5 text-xs font-bold outline-none focus:bg-white focus:border-[#87be00]/40 focus:ring-4 focus:ring-[#87be00]/5 transition-all shadow-inner text-gray-800 placeholder-gray-400"
            />
          </div>

          {/* SELECCIÓN DE TIPO ESTILO RADIO-BUTTON PREMIUM (IGUAL A EDICIÓN) */}
          <div className="space-y-2">
            <label className="text-[9px] font-black uppercase text-gray-400 tracking-widest ml-2">
              Formato de Respuesta de la Encuesta
            </label>
            
            <div className="grid grid-cols-1 gap-2.5">
              
              {/* Opción Sí / No */}
              <div 
                onClick={() => handleTypeSelect("BOOLEAN")}
                className={`flex flex-col gap-2 p-4 rounded-2xl border-2 transition-all cursor-pointer bg-white relative ${form.type === "BOOLEAN" ? "border-[#87be00] shadow-sm shadow-[#87be00]/5" : "border-gray-100 hover:border-gray-200"}`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-gray-800 uppercase tracking-tight">Formato Sí / No</span>
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${form.type === "BOOLEAN" ? "border-[#87be00]" : "border-gray-300"}`}>
                    <div className={`w-2.5 h-2.5 rounded-full bg-[#87be00] transition-opacity ${form.type === "BOOLEAN" ? "opacity-100" : "opacity-0"}`} />
                  </div>
                </div>
                
                <div className="flex gap-2 mt-1">
                  <div className="flex items-center gap-1.5 opacity-60">
                    <div className="w-3.5 h-3.5 rounded-full border border-gray-400 flex items-center justify-center">
                      <div className="w-1.5 h-1.5 rounded-full bg-[#87be00]" />
                    </div>
                    <span className="text-[10px] font-bold text-gray-500 uppercase">Sí</span>
                  </div>
                  <div className="flex items-center gap-1.5 opacity-60">
                    <div className="w-3.5 h-3.5 rounded-full border border-gray-400" />
                    <span className="text-[10px] font-bold text-gray-500 uppercase">No</span>
                  </div>
                </div>
              </div>

              {/* Opción Texto Libre */}
              <div 
                onClick={() => handleTypeSelect("TEXTO")}
                className={`flex flex-col gap-2 p-4 rounded-2xl border-2 transition-all cursor-pointer bg-white relative ${form.type === "TEXTO" ? "border-[#87be00] shadow-sm shadow-[#87be00]/5" : "border-gray-100 hover:border-gray-200"}`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-gray-800 uppercase tracking-tight">Texto Abierto</span>
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${form.type === "TEXTO" ? "border-[#87be00]" : "border-gray-300"}`}>
                    <div className={`w-2.5 h-2.5 rounded-full bg-[#87be00] transition-opacity ${form.type === "TEXTO" ? "opacity-100" : "opacity-0"}`} />
                  </div>
                </div>
                <div className="w-full bg-gray-50 border border-dashed border-gray-200 rounded-xl px-3 py-1.5 text-[9px] font-bold text-gray-300 uppercase tracking-wider select-none mt-1">
                  Escribir respuesta...
                </div>
              </div>

            </div>
          </div>

          {/* OBLIGATORIEDAD */}
          <label className="flex items-center gap-3 px-2 py-1.5 cursor-pointer group w-max select-none">
            <input
              type="checkbox"
              name="is_required"
              checked={form.is_required}
              onChange={handleChange}
              className="w-4 h-4 rounded border-gray-300 text-[#87be00] focus:ring-[#87be00] cursor-pointer transition-all accent-[#87be00]"
            />
            <span className="text-[11px] font-black uppercase tracking-wider text-gray-600 group-hover:text-gray-900 transition-colors">
              Pregunta obligatoria
            </span>
          </label>

          {/* BOTÓN DE ACCIÓN */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gray-900 hover:bg-black text-white py-4 rounded-xl font-black uppercase text-[10px] sm:text-[11px] tracking-[0.2em] shadow-xl transition-all flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-50 mt-2"
          >
            {loading ? "Guardando..." : "Crear pregunta"}
          </button>

        </form>
      </div>
    </div>
  )
}

export default CreateQuestionModal