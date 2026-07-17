import { useState, useEffect } from "react"
import { useNavigate, Link, useLocation } from "react-router-dom"
import { motion } from "framer-motion"
import { useAuth } from "../context/AuthContext"
import toast from "react-hot-toast"
import api from "../api/apiClient"

/* =========================================================
   ALERTAS DE AUTENTICACIÓN
========================================================= */
const authAlerts = {
  multiple_session: {
    type: "error",
    title: "Sesión cerrada",
    message:
      "Tu sesión se cerró porque ingresaste en otro dispositivo.",
    icon: "📱"
  },

  contract_expired: {
    type: "warning",
    title: "Contrato vencido",
    message:
      "Tu contrato laboral se encuentra vencido. Comunícate con un administrador para regularizar tu acceso.",
    icon: "⚠️"
  }
}

const LoginForm = () => {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)

  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  /* =========================================================
     MOSTRAR ALERTAS DE AUTENTICACIÓN DESDE LA URL
  ========================================================= */
  useEffect(() => {
    const params = new URLSearchParams(location.search)
    const errorType = params.get("error")
    const alert = authAlerts[errorType]

    if (!alert) return

    const toastOptions = {
      icon: alert.icon,
      duration: 6000
    }

    if (alert.type === "warning") {
      toast(alert.message, toastOptions)
    } else {
      toast.error(alert.message, toastOptions)
    }

    // Elimina los parámetros para evitar repetir la alerta al recargar.
    navigate("/", { replace: true })
  }, [location.search, navigate])

  const handleSubmit = async (e) => {
    e?.preventDefault()

    const normalizedEmail = email.trim()

    if (!normalizedEmail || !password) {
      toast.error("Debes completar todos los campos")
      return
    }

    setLoading(true)

    try {
      const data = await api.post("auth/login", {
        email: normalizedEmail,
        password
      })

      // Guarda el token con current_session_id.
      login(data)

      /* ==============================
         FORZAR CAMBIO DE CONTRASEÑA
      ============================== */
      if (data.must_change_password) {
        toast("Debes cambiar tu contraseña antes de continuar", {
          icon: "🔐"
        })

        navigate("/change-password", { replace: true })
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

      const redirect = roleRoutes[data.user?.role]

      navigate(redirect || "/", { replace: true })
    } catch (err) {
      /*
       * apiClient puede entregar el error clasificado en distintas
       * propiedades dependiendo de su implementación.
       */
      const errorType = String(
        err?.authError ||
        err?.errorType ||
        err?.type ||
        err?.code ||
        ""
      ).toLowerCase()

      const message =
        err?.message ||
        err?.response?.data?.message ||
        "Error inesperado"

      const normalizedMessage = message.toLowerCase()

      const isContractExpired =
        errorType === "contract_expired" ||
        errorType === "contract_expired_error" ||
        normalizedMessage.includes("contrato vencido") ||
        normalizedMessage.includes("contrato se encuentra vencido")

      if (isContractExpired) {
        const alert = authAlerts.contract_expired

        toast(alert.message, {
          icon: alert.icon,
          duration: 7000
        })

        return
      }

      if (normalizedMessage.includes("deshabilitada")) {
        toast.error(message, {
          icon: "🚫"
        })

        return
      }

      if (normalizedMessage.includes("empresa")) {
        toast.error(message, {
          icon: "🏢"
        })

        return
      }

      if (
        normalizedMessage.includes("credenciales") ||
        normalizedMessage.includes("correo o contraseña")
      ) {
        toast.error("Correo o contraseña incorrectos", {
          icon: "🔑"
        })

        return
      }

      toast.error(message)
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
          grid
          md:grid-cols-2
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
            flex
            flex-col
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
            <form
              onSubmit={handleSubmit}
              className="space-y-6"
            >
              {/* EMAIL */}
              <div>
                <label
                  htmlFor="login-email"
                  className="block text-sm text-gray-600 mb-2"
                >
                  Correo electrónico
                </label>

                <input
                  id="login-email"
                  name="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  disabled={loading}
                  required
                  className="
                    w-full
                    px-4
                    py-3
                    rounded-2xl
                    border
                    border-gray-200
                    bg-gray-50
                    outline-none
                    focus:ring-2
                    focus:ring-[#87be00]
                    disabled:cursor-not-allowed
                    disabled:opacity-60
                    transition
                  "
                />
              </div>

              {/* PASSWORD */}
              <div>
                <label
                  htmlFor="login-password"
                  className="block text-sm text-gray-600 mb-2"
                >
                  Contraseña
                </label>

                <input
                  id="login-password"
                  name="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  disabled={loading}
                  required
                  className="
                    w-full
                    px-4
                    py-3
                    rounded-2xl
                    border
                    border-gray-200
                    bg-gray-50
                    outline-none
                    focus:ring-2
                    focus:ring-[#87be00]
                    disabled:cursor-not-allowed
                    disabled:opacity-60
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
                  disabled:cursor-not-allowed
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