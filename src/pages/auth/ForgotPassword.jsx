import { useState } from "react"
import { motion } from "framer-motion"
import { Link } from "react-router-dom"
import toast from "react-hot-toast"
import api from "../../api/apiClient"

const ForgotPassword = () => {
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      const data = await api.post("/auth/forgot-password", { email })
      toast.success(data.message)
      setEmail("")
    } catch (error) {
      toast.error(error.message || "Error enviando correo")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f9fbf8] p-6 font-[Outfit] relative overflow-hidden">
      
      {/* Fondo orgánico sutil para la temática */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-[#87be00] rounded-full mix-blend-multiply filter blur-[100px] opacity-20"></div>
        <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-[#87be00] rounded-full mix-blend-multiply filter blur-[100px] opacity-10"></div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="bg-white w-full max-w-md rounded-3xl shadow-2xl shadow-[#87be00]/5 p-10 space-y-8 z-10 border border-gray-50"
      >
        {/* Encabezado e Icono decorativo */}
        <div className="flex flex-col items-center space-y-4">
          <div className="w-16 h-16 bg-[#87be00]/10 rounded-2xl flex items-center justify-center text-[#87be00] shadow-inner">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
            </svg>
          </div>
          <div className="text-center space-y-2">
            <h2 className="text-3xl font-extrabold text-gray-800 tracking-tight">
              Recuperar acceso
            </h2>
            <p className="text-sm text-gray-500 px-2">
              Ingresa tu correo y te enviaremos las instrucciones para restablecer tu contraseña.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-1.5">
            <label htmlFor="email" className="text-sm font-semibold text-gray-700 ml-1">
              Correo electrónico
            </label>
            <input
              id="email"
              type="email"
              placeholder="ejemplo@correo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full border border-gray-200 bg-gray-50 rounded-2xl px-5 py-3.5 text-gray-700 focus:bg-white focus:ring-2 focus:ring-[#87be00] focus:border-transparent outline-none transition-all duration-200"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#87be00] text-white py-3.5 rounded-2xl font-semibold text-lg shadow-md hover:bg-[#78a800] hover:shadow-lg transition-all duration-200 disabled:opacity-70 disabled:cursor-not-allowed flex justify-center items-center"
          >
            {loading ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Enviando...
              </>
            ) : (
              "Enviar enlace"
            )}
          </button>
        </form>

        <div className="text-center pt-2">
          <Link
            to="/"
            className="text-sm font-medium text-gray-500 hover:text-[#87be00] transition-colors duration-200 flex items-center justify-center gap-1"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Volver al inicio de sesión
          </Link>
        </div>
      </motion.div>
    </div>
  )
}

export default ForgotPassword