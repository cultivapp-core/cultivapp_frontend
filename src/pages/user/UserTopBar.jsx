import {
  useContext,
  useMemo,
} from "react";
import {
  useNavigate,
} from "react-router-dom";
import {
  FiBell,
  FiLogOut,
  FiMaximize,
} from "react-icons/fi";

import {
  AuthContext,
} from "../../context/AuthContext";
import {
  useNotificationContext,
} from "../../context/NotificationContext";

const UserTopbar = () => {
  const { logout, user } =
    useContext(AuthContext);
  const { unreadCount = 0 } =
    useNotificationContext();
  const navigate = useNavigate();

  const initials = useMemo(() => {
    const first =
      user?.first_name
        ?.trim()
        .charAt(0)
        .toUpperCase() || "";

    const last =
      user?.last_name
        ?.trim()
        .charAt(0)
        .toUpperCase() || "";

    return `${first}${last}` || "M";
  }, [
    user?.first_name,
    user?.last_name,
  ]);

  const handleLogout = async () => {
    await logout();
    navigate("/", {
      replace: true,
    });
  };

  return (
    <header
      className="
        sticky top-0 z-40 shrink-0
        border-b border-slate-200/90
        bg-white/95 backdrop-blur-xl

        md:mx-6 md:mt-6
        md:rounded-[2rem]
        md:border md:shadow-sm
      "
    >
      <div
        className="
          relative flex min-h-[72px]
          items-center justify-end
          px-4
          pt-[env(safe-area-inset-top)]
          sm:px-5
          md:min-h-[76px]
          md:justify-between
          md:px-6
          md:pt-0
        "
      >
        {/* Perfil centrado en móvil */}
        <div
          className="
            absolute left-1/2 top-1/2
            w-[160px]
            -translate-x-1/2
            -translate-y-1/2
            text-center

            md:static md:flex
            md:w-auto md:translate-x-0
            md:translate-y-0
            md:items-center md:gap-3
            md:text-left
          "
        >
          <div
            className="
              hidden h-11 w-11 shrink-0
              items-center justify-center
              rounded-2xl border
              border-[#87be00]/20
              bg-[#87be00]/10
              text-sm font-black
              text-[#87be00]
              md:flex
            "
          >
            {initials}
          </div>

          <div className="min-w-0">
            <h2
              className="
                truncate text-[11px]
                font-black text-slate-900
                sm:text-xs
                md:text-[12px]
              "
            >
              Hola,{" "}
              {user?.first_name ||
                "Mercaderista"}
            </h2>

            <p
              className="
                mt-1 truncate
                text-[8px] font-black
                uppercase tracking-[0.18em]
                text-[#87be00]
                md:text-slate-400
              "
            >
              Panel de colaborador
            </p>
          </div>
        </div>

        {/* Acciones */}
        <div className="ml-auto flex items-center gap-1.5 sm:gap-2 md:gap-3">
          <button
            type="button"
            onClick={() =>
              navigate(
                "/usuario/notifications",
              )
            }
            aria-label="Abrir notificaciones"
            className="
              relative flex h-10 w-10
              items-center justify-center
              rounded-xl text-slate-400
              transition
              hover:bg-[#87be00]/10
              hover:text-[#87be00]
            "
          >
            <FiBell size={18} />

            {unreadCount > 0 && (
              <span
                className="
                  absolute right-1 top-1
                  flex h-[17px] min-w-[17px]
                  items-center justify-center
                  rounded-full bg-red-500
                  px-1 text-[7px]
                  font-black text-white
                  ring-2 ring-white
                "
              >
                {unreadCount > 9
                  ? "9+"
                  : unreadCount}
              </span>
            )}
          </button>

          <button
            type="button"
            aria-label="Abrir código QR"
            className="
              hidden h-10 w-10
              items-center justify-center
              rounded-xl bg-slate-50
              text-slate-400 transition
              hover:bg-slate-100
              hover:text-slate-900
              sm:flex
            "
          >
            <FiMaximize size={18} />
          </button>

          <div className="hidden h-6 w-px bg-slate-200 sm:block" />

          <button
            type="button"
            onClick={handleLogout}
            aria-label="Cerrar sesión"
            title="Cerrar sesión"
            className="
              flex h-10 w-10
              items-center justify-center
              rounded-xl text-slate-400
              transition hover:bg-red-50
              hover:text-red-500
            "
          >
            <FiLogOut size={18} />
          </button>
        </div>
      </div>
    </header>
  );
};

export default UserTopbar;