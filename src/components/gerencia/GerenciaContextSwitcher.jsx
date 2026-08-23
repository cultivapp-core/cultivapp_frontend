import {
  FiBriefcase,
  FiChevronDown,
  FiRefreshCw,
  FiShield,
  FiUsers,
} from "react-icons/fi";

import {
  useLocation,
  useNavigate,
} from "react-router-dom";

import { useAuth } from "../../context/AuthContext";

const ROLE_LABELS = {
  ADMIN_CLIENTE: "Administrador",
  ADMIN_REGIONAL: "Administrador Regional",
  SUPERVISOR: "Supervisor",
  USUARIO: "Mercaderista",
  MERCADERISTA_REGIONAL: "Mercaderista Regional",
  VIEW: "Viewer",
};

const normalizeRole = (role) =>
  String(role || "")
    .trim()
    .toUpperCase();

const GerenciaContextSwitcher = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const {
    isGerencia,
    hasGerenciaContext,
    gerenciaContext,
  } = useAuth();

  /* =========================================
     VISIBILIDAD
  ========================================= */

  if (
    !isGerencia ||
    !hasGerenciaContext ||
    location.pathname.startsWith("/gerencia")
  ) {
    return null;
  }

  const companyId = String(
    gerenciaContext?.company_id || "",
  ).trim();

  const companyName =
    gerenciaContext?.company_name ||
    "Empresa";

  const role = normalizeRole(
    gerenciaContext?.role,
  );

  const roleLabel =
    ROLE_LABELS[role] ||
    role ||
    "Perfil";

  /* =========================================
     CAMBIAR SOLO PERFIL
  ========================================= */

  const handleChangeProfile = () => {
    /*
     * IMPORTANTE:
     *
     * NO llamamos clearGerenciaContext() aquí.
     *
     * Si restauramos user.role = GERENCIA mientras
     * todavía estamos dentro de /admin, /usuario,
     * /supervisor, etc., ProtectedRoute detecta que
     * GERENCIA no corresponde al perfil de esa ruta
     * y puede enviarnos a "/" antes de que React Router
     * alcance a navegar a /gerencia.
     *
     * GerenciaContextSelector ya trabaja con
     * gerenciaOriginalToken, por lo que puede solicitar
     * el nuevo contexto sin cerrar ni limpiar la sesión.
     */

    if (!companyId) {
      navigate("/gerencia", {
        replace: true,
      });

      return;
    }

    /*
     * Conservamos la empresa actual y solamente
     * solicitamos elegir un nuevo perfil.
     */
    navigate(
      `/gerencia?companyId=${encodeURIComponent(
        companyId,
      )}&mode=profile`,
      {
        replace: true,
      },
    );
  };

  /* =========================================
     CAMBIAR EMPRESA
  ========================================= */

  const handleChangeCompany = () => {
    /*
     * Tampoco hacemos logout ni limpiamos el
     * contexto antes de navegar.
     *
     * Al entrar a /gerencia sin companyId,
     * GerenciaContextSelector mostrará nuevamente
     * el selector completo:
     *
     * Empresa -> Perfil -> Usuario operacional.
     */
    navigate("/gerencia", {
      replace: true,
    });
  };

  return (
    <div className="fixed bottom-4 right-4 z-[9999] font-[Outfit] sm:bottom-5 sm:right-5">
      <div className="w-[calc(100vw-2rem)] max-w-[330px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl shadow-slate-900/20 sm:w-[330px]">
        {/* CONTEXTO ACTUAL */}
        <div className="flex items-center gap-3 border-b border-slate-100 px-4 py-3.5">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-950 text-white">
            <FiShield size={18} />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-[#87be00]" />

              <p className="text-[8px] font-black uppercase tracking-[0.2em] text-[#6f9d00]">
                Sesión Gerencia
              </p>
            </div>

            <div className="mt-1 flex min-w-0 items-center gap-1.5">
              <FiBriefcase
                size={11}
                className="shrink-0 text-slate-400"
              />

              <p className="truncate text-xs font-black text-slate-900">
                {companyName}
              </p>
            </div>

            <div className="mt-1 flex min-w-0 items-center gap-1.5">
              <FiUsers
                size={11}
                className="shrink-0 text-slate-400"
              />

              <p className="truncate text-[10px] font-bold uppercase tracking-wide text-slate-500">
                {roleLabel}
              </p>
            </div>
          </div>
        </div>

        {/* ACCIONES */}
        <div className="grid grid-cols-2">
          <button
            type="button"
            onClick={handleChangeProfile}
            className="flex min-h-[48px] items-center justify-center gap-2 border-r border-slate-100 px-3 text-[9px] font-black uppercase tracking-wider text-slate-600 transition hover:bg-[#87be00]/10 hover:text-[#638d00]"
            title="Cambiar perfil manteniendo la empresa"
          >
            <FiRefreshCw size={13} />
            Cambiar perfil
          </button>

          <button
            type="button"
            onClick={handleChangeCompany}
            className="flex min-h-[48px] items-center justify-center gap-2 px-3 text-[9px] font-black uppercase tracking-wider text-slate-600 transition hover:bg-slate-100 hover:text-slate-950"
            title="Cambiar empresa y perfil"
          >
            <FiBriefcase size={13} />
            Empresa
            <FiChevronDown size={12} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default GerenciaContextSwitcher;