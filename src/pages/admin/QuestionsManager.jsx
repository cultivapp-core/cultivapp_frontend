import { useEffect, useState } from "react"
import { FiEdit, FiTrash2, FiPlus, FiHelpCircle, FiCheckCircle, FiAlertCircle } from "react-icons/fi"
import api from "../../api/apiClient"
import { toast } from "react-hot-toast"

import CreateQuestionModal from "../../components/modals/CreateQuestionModal"
import EditQuestionModal from "../../components/modals/EditQuestionModal"

const QuestionsManager = () => {
  const [questions, setQuestions] = useState([])
  const [createOpen, setCreateOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [selectedQuestion, setSelectedQuestion] = useState(null)
  const [loading, setLoading] = useState(true)
  // 🚩 NUEVO: Estado del filtro
  const [activeFilter, setActiveFilter] = useState("TODOS")

  const loadQuestions = async () => {
    try {
      setLoading(true)
      const data = await api.get("/questions")
      setQuestions(data)
    } catch (err) {
      console.error("Error cargando preguntas")
      toast.error("Error al cargar el cuestionario")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadQuestions()
  }, [])

  // 🚩 LOGICA DE FILTRADO
  const filteredQuestions = questions.filter(q => {
    const flow = (q.target_flow || "").toLowerCase();
    if (activeFilter === "TODOS") return true;
    if (activeFilter === "REPONEDOR") return flow === "reponedor" || flow === "ambos";
    if (activeFilter === "SUPERVISOR") return flow === "supervisor" || flow === "ambos";
    return true;
  });

  const handleDelete = async (id) => {
    if (!confirm("¿Estás seguro de que deseas eliminar esta pregunta?")) return
    try {
      await api.delete(`questions/${id}`)
      toast.success("Pregunta eliminada")
      loadQuestions()
    } catch (err) {
      toast.error("No se pudo eliminar la pregunta")
    }
  }

  const handleEdit = (question) => {
    setSelectedQuestion(question)
    setEditOpen(true)
  }

  const renderTypePreview = (type) => {
    const t = String(type).toUpperCase();
    if (t === "BOOLEAN" || t === "SI_NO" || t === "SI/NO") {
      return (
        <div className="mt-4 space-y-3 pl-2" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center gap-3 group/radio cursor-pointer w-max">
            <div className="w-5 h-5 rounded-full border-2 border-gray-300 flex items-center justify-center transition-all group-hover/radio:border-[#87be00]">
              <div className="w-2.5 h-2.5 rounded-full bg-[#87be00] opacity-0 group-hover/radio:opacity-100 transition-opacity" />
            </div>
            <span className="text-xs font-black text-gray-700 uppercase tracking-wide">Sí</span>
          </div>
          <div className="flex items-center gap-3 group/radio cursor-pointer w-max">
            <div className="w-5 h-5 rounded-full border-2 border-gray-300 flex items-center justify-center transition-all group-hover/radio:border-[#87be00]">
              <div className="w-2.5 h-2.5 rounded-full bg-[#87be00] opacity-0 transition-opacity" />
            </div>
            <span className="text-xs font-black text-gray-700 uppercase tracking-wide">No</span>
          </div>
        </div>
      );
    }
    return (
      <div className="w-full max-w-sm mt-4" onClick={(e) => e.stopPropagation()}>
        <div className="w-full bg-gray-50 border border-dashed border-gray-200 rounded-2xl px-4 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest select-none shadow-inner">
          Escribir respuesta libre...
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 md:space-y-8 animate-in fade-in duration-700 font-[Outfit] pb-20 px-2 sm:px-0">
      
      {/* HEADER RESPONSIVO */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 px-2 md:px-4">
        <div className="min-w-0">
          <h2 className="text-3xl md:text-4xl font-black text-gray-800 tracking-tighter uppercase italic leading-none truncate">
            Encuesta
          </h2>
          <p className="text-[9px] md:text-[10px] font-bold text-[#87be00] uppercase tracking-[0.2em] md:tracking-[0.3em] mt-2 md:mt-3 leading-tight">
            Configuración de preguntas
          </p>
        </div>

        <button
          onClick={() => setCreateOpen(true)}
          className="w-full md:w-auto flex items-center justify-center gap-2 bg-[#87be00] hover:bg-[#76a500] text-white px-6 py-4 rounded-xl md:rounded-2xl font-black uppercase text-[10px] md:text-[11px] tracking-widest transition-all shadow-lg shadow-[#87be00]/20 active:scale-95"
        >
          <FiPlus size={18} /> Nueva Pregunta
        </button>
      </div>

      {/* 🚩 FILTROS DE FLUJO */}
      <div className="px-2 md:px-4 flex gap-2">
        {["TODOS", "REPONEDOR", "SUPERVISOR"].map((f) => (
          <button 
            key={f}
            onClick={() => setActiveFilter(f)}
            className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${
              activeFilter === f ? "bg-gray-800 text-white shadow-lg" : "bg-white text-gray-400 border border-gray-100 hover:border-gray-300"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* CONTENEDOR PRINCIPAL */}
      <div className="bg-white rounded-[2rem] md:rounded-[3.5rem] shadow-xl shadow-gray-200/50 border border-gray-100 overflow-hidden">
        <div className="p-5 md:p-8 border-b border-gray-50 bg-gray-50/30 flex items-center justify-between">
            <span className="text-[9px] md:text-[10px] font-black uppercase text-gray-400 tracking-widest flex items-center gap-2">
                <FiHelpCircle className="shrink-0" size={14}/> <span className="truncate">Estructura del Reporte: {activeFilter}</span>
            </span>
            <span className="text-[9px] md:text-[10px] font-black text-[#87be00] uppercase bg-[#87be00]/10 px-3 py-1 rounded-full shrink-0">
                {filteredQuestions.length} Items
            </span>
        </div>

        <div className="p-3 md:p-4 space-y-4">
          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center gap-4 text-gray-300">
                <div className="w-8 h-8 border-4 border-[#87be00] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filteredQuestions.length === 0 ? (
            <div className="py-20 text-center px-4">
                <FiAlertCircle size={40} className="mx-auto text-gray-200 mb-4" />
                <p className="text-gray-400 font-bold uppercase text-[10px] tracking-widest">No hay preguntas para este filtro</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {filteredQuestions.map((q, index) => (
                <div key={q.id} className="group flex flex-col md:flex-row justify-between items-start md:items-center bg-white border border-gray-100 rounded-[1.5rem] md:rounded-[2rem] p-4 md:p-6 hover:border-[#87be00] hover:shadow-md transition-all duration-300 gap-4">
                  <div className="flex items-start gap-4 md:gap-6 min-w-0 w-full">
                    <div className="w-9 h-9 md:w-10 md:h-10 shrink-0 bg-gray-50 rounded-xl md:rounded-2xl flex items-center justify-center text-gray-400 font-black text-xs md:text-base mt-1">
                      {index + 1}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm md:text-base font-black text-gray-800 uppercase tracking-tighter leading-tight mb-2 break-words">
                        {q.question}
                      </p>
                      <div className="flex items-center flex-wrap gap-x-3 gap-y-1">
                        <span className={`text-[8px] md:text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md bg-gray-100 text-gray-500`}>
                           {q.target_flow || 'N/A'}
                        </span>
                        <span className="text-[8px] md:text-[9px] font-black text-[#87be00] uppercase tracking-widest bg-[#87be00]/5 px-2 py-0.5 rounded-md">
                           {q.type || 'TEXTO'}
                        </span>
                      </div>
                      {renderTypePreview(q.type)}
                    </div>
                  </div>
                  <div className="flex gap-2 w-full md:w-auto justify-end md:opacity-0 group-hover:opacity-100 transition-opacity duration-300 shrink-0 self-end md:self-center">
                    <button onClick={() => handleEdit(q)} className="p-3 bg-gray-50 text-gray-600 rounded-xl hover:bg-blue-50 transition-all"><FiEdit size={16} /></button>
                    <button onClick={() => handleDelete(q.id)} className="p-3 bg-gray-50 text-gray-600 rounded-xl hover:bg-red-50 transition-all"><FiTrash2 size={16} /></button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <CreateQuestionModal isOpen={createOpen} onClose={() => setCreateOpen(false)} onCreated={loadQuestions} />
      <EditQuestionModal isOpen={editOpen} onClose={() => setEditOpen(false)} question={selectedQuestion} onUpdated={loadQuestions} />
    </div>
  )
}
export default QuestionsManager;