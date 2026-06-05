import { useState, useEffect } from "react"
import { useNavigate, Link, useLocation } from "react-router-dom"
import { motion } from "framer-motion"
import { useAuth } from "../context/AuthContext"
import toast from "react-hot-toast"
import api from "../api/apiClient"

const LoginForm = () => {

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)

  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation() // 🔑 Captura parámetros de la URL para detectar cierres forzados

  /* =========================================================
     DETECTAR CIERRE DE SESIÓN POR MÚLTIPLES DISPOSITIVOS
  ========================================================= */
  useEffect(() => {
    const params = new URLSearchParams(location.search)
    if (params.get("error") === "multiple_session") {
      toast.error("Tu sesión se cerró porque ingresaste en otro dispositivo", {
        icon: "📱",
        duration: 6000
      })
      // Limpiamos los query params para que no vuelva a saltar el toast al recargar
      navigate("/", { replace: true })
    }
  }, [location, navigate])

  const handleSubmit = async (e) => {

    if (e && e.preventDefault) {
      e.preventDefault()
    }

    if (!email || !password) {
      toast.error("Debes completar todos los campos")
      return
    }

    setLoading(true)

    try {

      const data = await api.post("auth/login", {
        email: email.trim(),
        password: password.trim()
      })

      // Guarda el token modificado por el backend (con el current_session_id en el payload)
      login(data)

      /* ==============================
         FORZAR CAMBIO DE CONTRASEÑA
      ============================== */

      if (data.must_change_password) {

        toast("Debes cambiar tu contraseña antes de continuar", {
          icon: "🔐"
        })

        navigate("/change-password")
        return

      }

      toast.success("Bienvenido a Cultivapp")

      /* ==============================
         REDIRECCIÓN POR ROL
      ============================== */

      const roleRoutes = {
        ROOT: "/root",
        ADMIN_CLIENTE: "/admin",
        SUPERVISOR: "/supervisor",
        USER: "/usuario",
        USUARIO: "/usuario",
        VIEW: "/viewer"
      }

      const redirect = roleRoutes[data.user.role]

      navigate(redirect || "/")

    } catch (err) {

      const message = err.message || "Error inesperado"

      if (message.includes("deshabilitada")) {
        toast.error(message, { icon: "🚫" })
      } 
      else if (message.includes("Empresa")) {
        toast.error(message, { icon: "🏢" })
      } 
      else if (message.includes("Credenciales")) {
        toast.error("Correo o contraseña incorrectos", { icon: "🔑" })
      } 
      else {
        toast.error(message)
      }

    } finally {

      setLoading(false)

    }

  }

  return (
    <div
      className="
      min-h-screen
      flex
      md:items-center
      md:justify-center
      font-[Outfit]
    "
    >

      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="
          w-full
          max-w-6xl
          bg-white
          overflow-hidden
          grid md:grid-cols-2
          rounded-none
          md:rounded-2xl
          md:shadow-2xl
        "
      >

        {/* PANEL IZQUIERDO */}
        <div className="hidden md:flex bg-[#87be00] text-white items-center justify-center p-12">
          <div>
            <h2 className="text-4xl font-bold mb-4">
              Bienvenido
            </h2>
            <p className="opacity-90 text-lg">
              Plataforma interna Cultiva Strategic Partners
            </p>
          </div>
        </div>

        {/* FORMULARIO */}
        <div
          className="
          flex flex-col
          min-h-screen
          md:min-h-0
          px-6
          pt-20
          pb-10
          md:p-12
          md:justify-center
        "
        >

          <div className="md:hidden mb-10 text-center">
            <h1 className="text-2xl font-semibold text-gray-900">
              Iniciar sesión
            </h1>
            <p className="text-sm text-gray-500 mt-2">
              Accede a tu cuenta
            </p>
          </div>

          <div className="flex-1 flex flex-col justify-center md:justify-start">

            <form onSubmit={handleSubmit} className="space-y-6">

              {/* EMAIL */}
              <div>
                <label className="block text-sm text-gray-600 mb-2">
                  Correo electrónico
                </label>

                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="
                    w-full
                    px-4
                    py-3
                    rounded-2xl
                    border border-gray-200
                    bg-gray-50
                    focus:ring-2 focus:ring-[#87be00]
                    transition
                  "
                />
              </div>

              {/* PASSWORD */}
              <div>
                <label className="block text-sm text-gray-600 mb-2">
                  Contraseña
                </label>

                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="
                    w-full
                    px-4
                    py-3
                    rounded-2xl
                    border border-gray-200
                    bg-gray-50
                    focus:ring-2 focus:ring-[#87be00]
                    transition
                  "
                />
              </div>

              {/* BOTÓN LOGIN */}
              <button
                type="submit"
                disabled={loading}
                className="
                  w-full
                  bg-[#87be00]
                  hover:bg-[#6e9e00]
                  text-white
                  py-3
                  rounded-2xl
                  transition
                  disabled:opacity-50
                "
              >
                {loading ? "Ingresando..." : "Ingresar"}
              </button>

            </form>

            {/* RECUPERAR PASSWORD */}
            <p className="text-sm text-gray-500 mt-8 text-center md:text-left">
              ¿Olvidaste tu contraseña?{" "}
              <Link
                to="/forgot-password"
                className="text-[#87be00] hover:underline font-medium"
              >
                Recuperar
              </Link>
            </p>

          </div>

        </div>

      </motion.div>

    </div>
  )
}

export default LoginForm