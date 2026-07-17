import { useState, useEffect } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../context/AuthContext";
import toast from "react-hot-toast";
import api from "../api/apiClient";

const LoginAlertModal = ({ isOpen, type = "error", title, message, onClose }) => {
  const styles = {
    error: {
      iconBg: "bg-red-50",
      iconText: "text-red-500",
      button: "bg-red-500 hover:bg-red-600",
      ring: "ring-red-100",
      icon: "!"
    },
    warning: {
      iconBg: "bg-amber-50",
      iconText: "text-amber-500",
      button: "bg-amber-500 hover:bg-amber-600",
      ring: "ring-amber-100",
      icon: "!"
    },
    info: {
      iconBg: "bg-blue-50",
      iconText: "text-blue-500",
      button: "bg-blue-600 hover:bg-blue-700",
      ring: "ring-blue-100",
      icon: "i"
    },
    success: {
      iconBg: "bg-green-50",
      iconText: "text-[#87be00]",
      button: "bg-[#87be00] hover:bg-[#76a600]",
      ring: "ring-green-100",
      icon: "✓"
    }
  };

  const currentStyle = styles[type] || styles.error;

  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (event) => {
      if (event.key === "Escape") onClose();
    };

    document.addEventListener("keydown", handleEscape);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "";
    };
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/45 backdrop-blur-sm p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) onClose();
          }}
        >
          <motion.div
            role="alertdialog"
            aria-modal="true"
            initial={{ opacity: 0, scale: 0.92, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 20 }}
            transition={{ duration: 0.22 }}
            className="w-full max-w-sm rounded-[2rem] bg-white p-6 shadow-2xl border border-gray-100 font-[Outfit]"
          >
            <div className="flex flex-col items-center text-center font-[Outfit]">
              <div className={`w-16 h-16 rounded-2xl ${currentStyle.iconBg} ${currentStyle.iconText} ${currentStyle.ring} ring-8 flex items-center justify-center text-3xl font-black mb-6`}>
                {currentStyle.icon}
              </div>

              <p className="text-[9px] font-black uppercase tracking-[0.25em] text-gray-400 mb-2">
                Cultivapp
              </p>

              <h2 className="text-xl font-black uppercase italic tracking-tight text-gray-900">
                {title}
              </h2>

              <p className="mt-3 text-sm font-medium leading-relaxed text-gray-500">
                {message}
              </p>

              <button
                type="button"
                autoFocus
                onClick={onClose}
                className={`mt-7 w-full rounded-2xl py-3.5 text-[10px] font-black uppercase tracking-widest text-white transition-colors ${currentStyle.button}`}
              >
                Entendido
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

const LoginForm = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [alertModal, setAlertModal] = useState({
    isOpen: false,
    type: "error",
    title: "",
    message: ""
  });

  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const showLoginAlert = ({ type = "error", title, message }) => {
    setAlertModal({ isOpen: true, type, title, message });
  };

  const closeLoginAlert = () => {
    setAlertModal((previous) => ({ ...previous, isOpen: false }));
  };

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const authError = params.get("error");

    if (!authError) return;

    const authAlerts = {
      multiple_session: {
        type: "warning",
        title: "Sesión cerrada",
        message:
          "Tu sesión se cerró porque se inició sesión con tu cuenta en otro dispositivo."
      },
      session_expired: {
        type: "warning",
        title: "Sesión expirada",
        message:
          "Tu sesión expiró por seguridad. Ingresa nuevamente para continuar."
      },
      token_expired: {
        type: "warning",
        title: "Sesión expirada",
        message:
          "Tu sesión expiró por seguridad. Ingresa nuevamente para continuar."
      },
      unauthorized: {
        type: "warning",
        title: "Acceso no autorizado",
        message:
          "Debes iniciar sesión nuevamente para acceder a este módulo."
      },
      forbidden: {
        type: "warning",
        title: "Acceso denegado",
        message:
          "Tu cuenta no tiene permisos para acceder al módulo solicitado."
      },
      account_disabled: {
        type: "warning",
        title: "Cuenta deshabilitada",
        message:
          "Tu cuenta se encuentra deshabilitada. Comunícate con un administrador."
      },
      company_disabled: {
        type: "warning",
        title: "Empresa no disponible",
        message:
          "La empresa asociada a tu cuenta se encuentra inactiva o suspendida."
      },
      contract_expired: {
        type: "warning",
        title: "Contrato vencido",
        message:
          "Tu contrato laboral se encuentra vencido. Comunícate con un administrador para regularizar tu acceso."
      }
    };

    const alertConfig = authAlerts[authError];

    if (alertConfig) {
      showLoginAlert(alertConfig);
    }

    // Limpia los parámetros sin cerrar el modal recién abierto.
    navigate("/", { replace: true });
  }, [location.search, navigate]);

  const validateForm = () => {
    const cleanEmail = email.trim();
    const cleanPassword = password.trim();

    if (!cleanEmail) {
      showLoginAlert({
        title: "Correo requerido",
        message: "Debes ingresar tu correo electrónico para continuar."
      });
      return false;
    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailPattern.test(cleanEmail)) {
      showLoginAlert({
        title: "Correo incorrecto",
        message: "Ingresa un correo electrónico válido."
      });
      return false;
    }

    if (!cleanPassword) {
      showLoginAlert({
        title: "Contraseña requerida",
        message: "Debes ingresar tu contraseña para continuar."
      });
      return false;
    }

    return true;
  };

  const getErrorMessage = (error) =>
    error?.response?.data?.message ||
    error?.data?.message ||
    error?.message ||
    "No fue posible iniciar sesión. Inténtalo nuevamente.";

  const handleLoginError = (error) => {
    const message = getErrorMessage(error);
    const normalizedMessage = message.toLowerCase();
    const status = error?.response?.status || error?.status;
    const errorCode =
      error?.response?.data?.code ||
      error?.data?.code ||
      "";

    const normalizedCode = String(errorCode).toLowerCase();
    const normalizedAuthError = String(
      error?.authError ||
      error?.response?.data?.authError ||
      error?.data?.authError ||
      ""
    ).toLowerCase();

    /* =========================================
       CONTRATO VENCIDO
       Debe evaluarse antes del 403 genérico.
    ========================================= */
    if (
      normalizedAuthError === "contract_expired" ||
      normalizedCode === "contract_expired" ||
      normalizedMessage.includes("contrato vencido") ||
      normalizedMessage.includes("contrato se encuentra vencido")
    ) {
      showLoginAlert({
        type: "warning",
        title: "Contrato vencido",
        message:
          "Tu contrato laboral se encuentra vencido. Comunícate con un administrador para regularizar tu acceso."
      });
      return;
    }
    /* =========================================
       SESIÓN / TOKEN EXPIRADO
    ========================================= */
    if (
      normalizedCode === "token_expired" ||
      normalizedCode === "session_expired" ||
      normalizedMessage.includes("token expirado") ||
      normalizedMessage.includes("token expired") ||
      normalizedMessage.includes("jwt expired") ||
      normalizedMessage.includes("sesión expirada") ||
      normalizedMessage.includes("session expired")
    ) {
      showLoginAlert({
        type: "warning",
        title: "Sesión expirada",
        message:
          "Tu sesión expiró por seguridad. Ingresa nuevamente para continuar."
      });
      return;
    }

    /* =========================================
       EMPRESA INACTIVA / SUSPENDIDA
       Se evalúa antes que la cuenta para evitar
       que el texto “empresa deshabilitada” caiga
       en la alerta genérica de cuenta.
    ========================================= */
    if (
      normalizedCode === "company_disabled" ||
      (
        normalizedMessage.includes("empresa") &&
        (
          normalizedMessage.includes("inactiva") ||
          normalizedMessage.includes("inactivo") ||
          normalizedMessage.includes("deshabilitada") ||
          normalizedMessage.includes("deshabilitado") ||
          normalizedMessage.includes("suspendida") ||
          normalizedMessage.includes("suspendido")
        )
      )
    ) {
      showLoginAlert({
        type: "warning",
        title: "Empresa no disponible",
        message:
          "La empresa asociada a tu cuenta se encuentra inactiva o suspendida."
      });
      return;
    }

    /* =========================================
       CUENTA DESHABILITADA
    ========================================= */
    if (
      normalizedCode === "account_disabled" ||
      normalizedMessage.includes("cuenta deshabilitada") ||
      normalizedMessage.includes("usuario deshabilitado") ||
      normalizedMessage.includes("usuario inactivo") ||
      normalizedMessage.includes("cuenta inactiva")
    ) {
      showLoginAlert({
        type: "warning",
        title: "Cuenta deshabilitada",
        message:
          "Tu cuenta se encuentra deshabilitada. Comunícate con un administrador."
      });
      return;
    }

    /* =========================================
       DEMASIADOS INTENTOS
    ========================================= */
    if (
      status === 429 ||
      normalizedCode === "too_many_attempts" ||
      normalizedMessage.includes("demasiados intentos") ||
      normalizedMessage.includes("too many")
    ) {
      showLoginAlert({
        type: "warning",
        title: "Demasiados intentos",
        message:
          "Has realizado demasiados intentos de acceso. Espera unos minutos antes de volver a intentarlo."
      });
      return;
    }

    /* =========================================
       ACCESO DENEGADO
    ========================================= */
    if (
      status === 403 ||
      normalizedCode === "forbidden" ||
      normalizedMessage.includes("acceso denegado") ||
      normalizedMessage.includes("sin permisos") ||
      normalizedMessage.includes("no tienes permisos")
    ) {
      showLoginAlert({
        type: "warning",
        title: "Acceso denegado",
        message:
          "Tu cuenta no tiene permisos para acceder al módulo solicitado."
      });
      return;
    }

    /* =========================================
       CORREO NO REGISTRADO
    ========================================= */
    if (
      status === 404 ||
      normalizedCode === "user_not_found" ||
      normalizedMessage.includes("usuario no encontrado") ||
      normalizedMessage.includes("correo no encontrado") ||
      normalizedMessage.includes("email no encontrado") ||
      normalizedMessage.includes("correo no registrado")
    ) {
      showLoginAlert({
    type: "error",
    title: "Correo incorrecto",
    message:
      "El correo ingresado no está registrado. Ingresa un correo válido."
  });
      return;
    }


    /* =========================================
       CREDENCIALES / CONTRASEÑA INCORRECTA
    ========================================= */
    if (
      status === 401 ||
      normalizedCode === "invalid_credentials" ||
      normalizedMessage.includes("credenciales") ||
      normalizedMessage.includes("contraseña") ||
      normalizedMessage.includes("password")
    ) {
      showLoginAlert({
    type: "error",
    title: "Contraseña inválida",
    message:
      "La contraseña ingresada no es correcta. Favor volver a intentarlo."
  });
      return;
    }

    /* =========================================
       SIN CONEXIÓN
    ========================================= */
    if (
      !error?.response ||
      normalizedMessage.includes("network error") ||
      normalizedMessage.includes("failed to fetch") ||
      normalizedMessage.includes("error de red")
    ) {
      showLoginAlert({
        type: "warning",
        title: "Sin conexión",
        message:
          "No fue posible conectar con el servidor. Revisa tu conexión a internet e inténtalo nuevamente."
      });
      return;
    }

    /* =========================================
       ERROR GENERAL
    ========================================= */
    showLoginAlert({
      type: "error",
      title: "No se pudo iniciar sesión",
      message
    });
  };

  const handleSubmit = async (event) => {
    event?.preventDefault?.();

    if (loading || !validateForm()) return;

    setLoading(true);

    try {
      const response = await api.post("auth/login", {
        email: email.trim(),
        password: password.trim()
      });

      const data = response?.data || response;

      login(data);

      if (data.must_change_password) {
        toast("Debes cambiar tu contraseña antes de continuar", {
          icon: "🔐"
        });

        navigate("/change-password");
        return;
      }

      toast.success("Bienvenido a Cultivapp");

      const roleRoutes = {
        ROOT: "/root",
        ADMIN_CLIENTE: "/admin",
        SUPERVISOR: "/supervisor",
        USER: "/usuario",
        USUARIO: "/usuario",
        VIEW: "/viewer"
      };

      const redirect = roleRoutes[data.user.role];
      navigate(redirect || "/");
    } catch (error) {
      handleLoginError(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="min-h-screen flex md:items-center md:justify-center font-[Outfit]">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-6xl bg-white overflow-hidden grid md:grid-cols-2 rounded-none md:rounded-2xl md:shadow-2xl"
        >
          <div className="hidden md:flex bg-[#87be00] text-white items-center justify-center p-12">
            <div>
              <h2 className="text-4xl font-bold mb-4">Bienvenido</h2>
              <p className="opacity-90 text-lg">
                Plataforma interna Cultiva Strategic Partners
              </p>
            </div>
          </div>

          <div className="flex flex-col min-h-screen md:min-h-0 px-6 pt-20 pb-10 md:p-12 md:justify-center">
            <div className="md:hidden mb-10 text-center">
              <h1 className="text-2xl font-semibold text-gray-900">
                Iniciar sesión
              </h1>
              <p className="text-sm text-gray-500 mt-2">
                Accede a tu cuenta
              </p>
            </div>

            <div className="flex-1 flex flex-col justify-center md:justify-start">
              <form onSubmit={handleSubmit} className="space-y-6" noValidate>
                <div>
                  <label htmlFor="login-email" className="block text-sm text-gray-600 mb-2">
                    Correo electrónico
                  </label>

                  <input
                    id="login-email"
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    autoComplete="email"
                    disabled={loading}
                    className="w-full px-4 py-3 rounded-2xl border border-gray-200 bg-gray-50 outline-none focus:ring-2 focus:ring-[#87be00] focus:border-transparent transition disabled:opacity-60"
                  />
                </div>

                <div>
                  <label htmlFor="login-password" className="block text-sm text-gray-600 mb-2">
                    Contraseña
                  </label>

                  <input
                    id="login-password"
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    autoComplete="current-password"
                    disabled={loading}
                    className="w-full px-4 py-3 rounded-2xl border border-gray-200 bg-gray-50 outline-none focus:ring-2 focus:ring-[#87be00] focus:border-transparent transition disabled:opacity-60"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-[#87be00] hover:bg-[#6e9e00] text-white py-3 rounded-2xl transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? "Ingresando..." : "Ingresar"}
                </button>
              </form>

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

      <LoginAlertModal
        isOpen={alertModal.isOpen}
        type={alertModal.type}
        title={alertModal.title}
        message={alertModal.message}
        onClose={closeLoginAlert}
      />
    </>
  );
};

export default LoginForm;