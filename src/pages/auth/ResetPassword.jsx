import { useState } from "react"
import { motion } from "framer-motion"
import { useParams, useNavigate } from "react-router-dom" // MODIFICADO: Importamos useParams
import toast from "react-hot-toast"
import api from "../../api/apiClient"

const ResetPassword = () => {
  // MODIFICADO: Extraemos el token directamente de la URL usando useParams
  const { token } = useParams() 
  const navigate = useNavigate()

  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (password !== confirmPassword) {
      return toast.error("Las contraseñas no coinciden")
    }

    setLoading(true)

    try {
      await api.post("/auth/reset-password", {
        token,
        newPassword: password
      })

      toast.success("Contraseña actualizada correctamente")

      setTimeout(() => {
        navigate("/")
      }, 2000)

    } catch (error) {
      toast.error(error.message || "Error al actualizar contraseña")
    } finally {
      setLoading(false)
    }
  }

  // Vista de error si no hay token en la URL
  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f9fbf8] p-6 font-[Outfit]">
        <div className="bg-white w-full max-w-md rounded-3xl shadow-xl shadow-red-500/5 p-10 text-center border border-red-50 space-y-4">
          <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center text-red-500 mx-auto shadow-inner">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Enlace inválido</h2>
            <p className="text-sm text-gray-500 mt-2 px-4">
              El enlace de recuperación no es válido o está incompleto. Por favor, solicita uno nuevo.
            </p>
          </div>
          <button 
            onClick={() => navigate("/forgot-password")}
            className="mt-6 w-full bg-gray-100 text-gray-700 py-3 rounded-2xl font-medium hover:bg-gray-200 transition"
          >
            Volver a solicitar
          </button>
        </div>
      </div>
    )
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
        {/* Encabezado e Icono decorativo (Candado) */}
        <div className="flex flex-col items-center space-y-4">
          <div className="w-16 h-16 bg-[#87be00]/10 rounded-2xl flex items-center justify-center text-[#87be00] shadow-inner">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <div className="text-center space-y-2">
            <h2 className="text-3xl font-extrabold text-gray-800 tracking-tight">
              Nueva contraseña
            </h2>
            <p className="text-sm text-gray-500 px-2">
              Ingresa y confirma tu nueva contraseña para acceder a tu cuenta.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-gray-700 ml-1">
              Contraseña nueva
            </label>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full border border-gray-200 bg-gray-50 rounded-2xl px-5 py-3.5 text-gray-700 focus:bg-white focus:ring-2 focus:ring-[#87be00] focus:border-transparent outline-none transition-all duration-200"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-gray-700 ml-1">
              Confirmar contraseña
            </label>
            <input
              type="password"
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              className="w-full border border-gray-200 bg-gray-50 rounded-2xl px-5 py-3.5 text-gray-700 focus:bg-white focus:ring-2 focus:ring-[#87be00] focus:border-transparent outline-none transition-all duration-200"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#87be00] text-white py-3.5 rounded-2xl font-semibold text-lg shadow-md hover:bg-[#78a800] hover:shadow-lg transition-all duration-200 disabled:opacity-70 disabled:cursor-not-allowed flex justify-center items-center mt-2"
          >
            {loading ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Actualizando...
              </>
            ) : (
              "Actualizar contraseña"
            )}
          </button>
        </form>
      </motion.div>
    </div>
  )
}

export default ResetPassword