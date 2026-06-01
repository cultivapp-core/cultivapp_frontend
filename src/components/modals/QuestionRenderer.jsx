import React from 'react';

const QuestionRenderer = ({ question, answer, onChange }) => {
  // 🚩 MEJORA: Acceso inteligente a la configuración anidada
  const rawConfig = question.config || {};
  const config = rawConfig.config ? rawConfig.config : rawConfig;
  
  // Normalizamos el tipo a mayúsculas
  const type = String(question?.type || "TEXTO").toUpperCase().trim();
  
  // Extraemos las opciones y límites
  const options = Array.isArray(config.options) ? config.options : [];
  const isMultiple = !!config.isMultiple;
  const maxSelections = parseInt(config.max_selections) || 0; // 🚩 Límite de selecciones

  console.log(`QuestionRenderer: Procesando tipo '${type}' para pregunta:`, question.id);

  switch (type) {
    case "BOOLEAN":
      return (
        <div className="flex gap-3">
          {["Sí", "No"].map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => onChange(opt)}
              className={`flex-1 py-3 rounded-xl font-black uppercase text-xs transition-all ${
                answer === opt ? 'bg-[#87be00] text-white shadow-lg' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
              }`}
            >
              {opt}
            </button>
          ))}
        </div>
      );

    case "SELECCION":
      return (
        <div className="space-y-2">
          {options.length > 0 ? (
            options.map((opt, i) => (
              <label key={i} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl cursor-pointer hover:bg-gray-100 transition-colors border border-transparent hover:border-gray-200">
                <input
                  type={isMultiple ? "checkbox" : "radio"}
                  name={question.id}
                  value={opt}
                  checked={isMultiple ? (Array.isArray(answer) ? answer.includes(opt) : false) : answer === opt}
                  onChange={(e) => {
                    if (isMultiple) {
                      const current = Array.isArray(answer) ? answer : [];
                      
                      if (e.target.checked) {
                        // 🚩 VALIDACIÓN DE LÍMITE: Si hay límite, no permitir más selecciones
                        if (maxSelections > 0 && current.length >= maxSelections) {
                          return; // Ignora el cambio si ya alcanzó el máximo
                        }
                        onChange([...current, opt]);
                      } else {
                        onChange(current.filter(a => a !== opt));
                      }
                    } else {
                      onChange(opt);
                    }
                  }}
                  className="accent-[#87be00] w-4 h-4"
                />
                <span className="text-sm font-bold text-gray-700">{opt}</span>
              </label>
            ))
          ) : (
            <p className="text-xs text-red-500 font-bold p-2">Error: Esta pregunta no tiene opciones.</p>
          )}
          {isMultiple && maxSelections > 0 && (
            <p className="text-[10px] text-gray-400 font-bold pl-2">
              Máximo {maxSelections} selección{maxSelections > 1 ? 'es' : ''} permitidas.
            </p>
          )}
        </div>
      );

    case "TEXTO":
    default:
      return (
        <textarea 
          className="w-full border border-gray-200 p-4 rounded-2xl focus:ring-2 focus:ring-[#87be00] outline-none min-h-[100px] bg-white text-sm" 
          value={answer || ""} 
          onChange={(e) => onChange(e.target.value)}
          placeholder="Escribe tu respuesta aquí..."
        />
      );
  }
};

export default QuestionRenderer;