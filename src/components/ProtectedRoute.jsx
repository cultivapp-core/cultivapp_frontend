import { useContext } from "react"
import { Navigate, useLocation } from "react-router-dom"
import { AuthContext } from "../context/AuthContext"

const ProtectedRoute = ({ children, role, roles }) => {
  const { user, mustChangePassword, loading } = useContext(AuthContext) // 🚩 Añadimos loading si lo tienes
  const location = useLocation()

  // 1. Si el contexto está cargando, no redirigir todavía
  if (loading) return null; 

  /* ===============================
     ❌ NO AUTENTICADO
  =============================== */
  if (!user) {
    return <Navigate to="/" state={{ from: location }} replace />
  }

  /* ===============================
     🔐 FORZAR CAMBIO DE CONTRASEÑA
  =============================== */
  if (mustChangePassword && location.pathname !== "/change-password") {
    return <Navigate to="/change-password" replace />
  }

  /* ===============================
     🔒 VALIDACIÓN DE ROLES
  =============================== */
  const allowedRoles = roles || (role ? [role] : null)

  if (allowedRoles) {
    // Normalizamos a mayúsculas para evitar errores de tipeo (USUARIO vs usuario)
    const userRole = user.role?.toUpperCase();
    const isAuthorized = allowedRoles.some(r => r.toUpperCase() === userRole);

    if (!isAuthorized) {
      console.warn(`🚫 Acceso denegado para el rol: ${userRole}. Requerido:`, allowedRoles);
      return redirectByRole(userRole);
    }
  }

  return children
}

const redirectByRole = (role) => {
  // 🚩 Solo redirigimos si el usuario intenta entrar a una ruta que NO es la suya
  switch (role) {
    case "ROOT": return <Navigate to="/root" replace />;
    case "ADMIN_CLIENTE": return <Navigate to="/admin" replace />;
    case "SUPERVISOR": return <Navigate to="/supervisor" replace />;
    case "USUARIO": return <Navigate to="/usuario" replace />;
    case "VIEW": return <Navigate to="/viewer" replace />;
    default: return <Navigate to="/" replace />;
  }
}

export default ProtectedRoute