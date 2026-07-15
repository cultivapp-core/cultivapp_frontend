import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { useAuth } from "../../context/AuthContext"
import { motion } from "framer-motion"
import toast from "react-hot-toast"
import api from "../../api/apiClient"

const ChangePassword = () => {
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [loading, setLoading] = useState(false)

  const navigate = useNavigate()
  const { logout, clearMustChangePassword } = useAuth()

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (password.length < 6) {
      toast.error("La contraseña debe tener al menos 6 caracteres")
      return
    }

    if (password !== confirmPassword) {
      toast.error("Las contraseñas no coinciden")
      return
    }

    try {
      setLoading(true)

      await api.put("/auth/change-password", {
        newPassword: password
      })

      toast.success("Contraseña actualizada correctamente")

      // Limpiar flag
      clearMustChangePassword()

      // Cerrar sesión
      logout()

      // Volver al login
      navigate("/")

    } catch (err) {
      toast.error(err.message || "Error al cambiar contraseña")
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
        {/* Encabezado e Icono decorativo (Escudo/Seguridad) */}
        <div className="flex flex-col items-center space-y-4">
          <div className="w-16 h-16 bg-[#87be00]/10 rounded-2xl flex items-center justify-center text-[#87be00] shadow-inner">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <div className="text-center space-y-2">
            <h2 className="text-3xl font-extrabold text-gray-800 tracking-tight">
              Actualizar contraseña
            </h2>
            <p className="text-sm text-gray-500 px-2">
              Por medidas de seguridad, es necesario que configures una nueva contraseña.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-gray-700 ml-1">
              Nueva contraseña
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
              "Guardar contraseña"
            )}
          </button>
        </form>
      </motion.div>
    </div>
  )
}

export default ChangePassword