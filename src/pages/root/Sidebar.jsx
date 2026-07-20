import { useEffect, useState } from "react";
import {
  Link,
  NavLink,
  useLocation,
} from "react-router-dom";
import {
  FiBarChart2,
  FiBell,
  FiBriefcase,
  FiCamera,
  FiCheckSquare,
  FiChevronLeft,
  FiChevronRight,
  FiClock,
  FiFileText,
  FiHelpCircle,
  FiHome,
  FiLogOut,
  FiMap,
  FiMenu,
  FiMonitor,
  FiNavigation,
  FiPackage,
  FiPieChart,
  FiSend,
  FiTrendingUp,
  FiUserCheck,
  FiUsers,
  FiX,
} from "react-icons/fi";
import { useAuth } from "../../context/AuthContext";
import { useNotificationContext } from "../../context/NotificationContext";

const Sidebar = ({
  isCollapsed,
  setIsCollapsed,
}) => {
  const { user, logout } = useAuth();
  const { unreadCount } = useNotificationContext();
  const location = useLocation();

  const [isOpen, setIsOpen] = useState(false);
  const [hoveredLabel, setHoveredLabel] = useState(null);
  const [tooltipTop, setTooltipTop] = useState(0);

  const userName =
    [
      user?.first_name,
      user?.last_name,
    ]
      .filter(Boolean)
      .join(" ")
      .trim() ||
    user?.name ||
    user?.nombre ||
    user?.email ||
    "Administrador ROOT";

  const userInitial =
    userName.charAt(0).toUpperCase() || "R";

  useEffect(() => {
    setIsOpen(false);
  }, [location.pathname]);

  const NavItem = ({
    to,
    icon: Icon,
    label,
    badge,
    end = false,
  }) => (
    <NavLink
      to={to}
      end={end}
      onMouseEnter={(event) => {
        if (!isCollapsed) return;

        const rect =
          event.currentTarget.getBoundingClientRect();

        setHoveredLabel(label);
        setTooltipTop(rect.top + rect.height / 2);
      }}
      onMouseLeave={() => setHoveredLabel(null)}
      className={({ isActive }) => `
        relative flex items-center gap-3 py-3.5 rounded-2xl
        text-[11px] font-black uppercase tracking-widest
        transition-all duration-300 group
        ${
          isActive
            ? "bg-[#87be00]/10 text-[#87be00] shadow-sm shadow-[#87be00]/5"
            : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
        }
        justify-start px-4
        ${
          isCollapsed
            ? "md:justify-center md:px-0 md:mx-2"
            : "md:justify-start md:px-4 md:mx-0"
        }
      `}
    >
      <div className="relative flex items-center justify-center shrink-0">
        <Icon
          size={isCollapsed ? 20 : 18}
          className="min-w-[20px] transition-all duration-300"
        />

        {badge > 0 && (
          <span className="absolute -top-1.5 -right-2 flex h-4 min-w-4 px-1 items-center justify-center rounded-full bg-red-500 text-[8px] font-black text-white ring-2 ring-white">
            {badge > 9 ? "9+" : badge}
          </span>
        )}
      </div>

      <span
        className={`whitespace-nowrap overflow-hidden transition-all duration-300 ${
          isCollapsed
            ? "block md:hidden"
            : "block opacity-100"
        }`}
      >
        {label}
      </span>
    </NavLink>
  );

  const SectionTitle = ({ title }) => (
    <div className="mt-6 mb-2">
      <p
        className={`text-[9px] font-black text-gray-300 uppercase tracking-[0.3em] ml-4 transition-all duration-300 ${
          isCollapsed
            ? "block md:hidden"
            : "block"
        }`}
      >
        {title}
      </p>

      <div
        className={`h-px bg-gray-100 mx-4 ${
          isCollapsed
            ? "hidden md:block"
            : "hidden"
        }`}
      />
    </div>
  );

  return (
    <>
      {!isOpen && (
        <div className="md:hidden fixed top-4 left-4 z-[9990]">
          <button
            type="button"
            aria-label="Abrir menú ROOT"
            onClick={() => setIsOpen(true)}
            className="p-3 bg-white rounded-xl shadow-lg text-gray-800 border border-gray-100 hover:bg-gray-50 active:scale-95 transition-all"
          >
            <FiMenu size={24} />
          </button>
        </div>
      )}

      {isOpen && (
        <button
          type="button"
          aria-label="Cerrar menú ROOT"
          onClick={() => setIsOpen(false)}
          className="md:hidden fixed inset-0 bg-black/60 z-[9995] backdrop-blur-sm transition-opacity"
        />
      )}

      <aside
        className={`
          fixed md:relative inset-y-0 left-0 z-[9999]
          bg-white h-screen flex flex-col
          font-[Outfit] shadow-2xl md:shadow-none
          border-r border-gray-100
          transition-all duration-300 ease-in-out
          ${
            isOpen
              ? "translate-x-0 w-[86vw] max-w-[320px]"
              : "-translate-x-full"
          }
          md:translate-x-0 md:max-w-none
          ${
            isCollapsed
              ? "md:w-20"
              : "md:w-72"
          }
        `}
      >
        <button
          type="button"
          aria-label="Cerrar menú ROOT"
          onClick={() => setIsOpen(false)}
          className="md:hidden absolute top-4 right-4 p-2.5 text-gray-400 hover:bg-red-50 hover:text-red-500 rounded-xl transition-colors z-50"
        >
          <FiX size={20} />
        </button>

        <button
          type="button"
          aria-label={
            isCollapsed
              ? "Expandir menú ROOT"
              : "Contraer menú ROOT"
          }
          onClick={() =>
            setIsCollapsed?.(!isCollapsed)
          }
          className="hidden md:flex absolute -right-3 top-12 bg-white border border-gray-100 shadow-md rounded-full p-1.5 text-gray-400 hover:text-[#87be00] hover:scale-110 transition-all z-50"
        >
          {isCollapsed ? (
            <FiChevronRight size={14} />
          ) : (
            <FiChevronLeft size={14} />
          )}
        </button>

        <div className="overflow-y-auto overflow-x-hidden custom-scrollbar flex-1 pb-4">
          <Link
            to="/root"
            className={`mt-7 md:mt-8 mb-8 flex items-center px-6 transition-all duration-300 hover:opacity-80 ${
              isCollapsed
                ? "justify-start md:justify-center md:px-0"
                : "justify-start"
            }`}
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-2.5 h-2.5 rounded-full bg-[#87be00] animate-pulse shrink-0 shadow-[0_0_8px_rgba(135,190,0,0.6)]" />

              <div
                className={`overflow-hidden transition-all duration-300 ${
                  isCollapsed
                    ? "block md:hidden"
                    : "block"
                }`}
              >
                <h2 className="text-xl font-black text-gray-900 tracking-tighter uppercase leading-none">
                  Cultiva
                  <span className="text-[#87be00]">
                    App
                  </span>
                </h2>

                <p className="text-[8px] font-black text-gray-400 uppercase tracking-[0.3em] mt-1">
                  Control ROOT
                </p>
              </div>
            </div>
          </Link>

          <nav
            className={`flex flex-col gap-1.5 ${
              isCollapsed
                ? "px-3 md:px-2"
                : "px-3 md:px-4"
            }`}
          >
            <SectionTitle title="Métricas" />
            <NavItem
              to="/root/analytics"
              icon={FiBarChart2}
              label="Resumen"
            />
            <NavItem
              to="/root/sales-report"
              icon={FiPieChart}
              label="Ventas"
            />
            <NavItem
              to="/root/active-sessions"
              icon={FiMonitor}
              label="Sesiones activas"
            />

            <SectionTitle title="Reportes" />
            <NavItem
              to="/root/upload-sales"
              icon={FiTrendingUp}
              label="Cargar ventas"
            />
            <NavItem
              to="/root/reports"
              icon={FiFileText}
              label="Informes"
            />

            <SectionTitle title="Comunicación" />
            <NavItem
              to="/root/notifications-manager"
              icon={FiSend}
              label="Emitir notificaciones"
            />
            <NavItem
              to="/root/notifications"
              icon={FiBell}
              label="Mi bandeja"
              badge={unreadCount}
            />

            <SectionTitle title="Estructura" />
            <NavItem
              to="/root/users"
              icon={FiUsers}
              label="Usuarios"
            />
            <NavItem
              to="/root/locales"
              icon={FiHome}
              label="Locales"
            />
            <NavItem
              to="/root/companies"
              icon={FiBriefcase}
              label="Empresas"
            />
            <NavItem
              to="/root/catalogo"
              icon={FiPackage}
              label="Productos"
            />

            <SectionTitle title="Logística y rutas" />
            <NavItem
              to="/root/routes"
              icon={FiMap}
              label="Planificación de rutas"
            />
            <NavItem
              to="/root/turnos"
              icon={FiClock}
              label="Configurar turnos"
            />
            <NavItem
              to="/root/gps-monitor"
              icon={FiNavigation}
              label="Monitoreo GPS"
            />

            <SectionTitle title="Auditoría y control" />
            <NavItem
              to="/root/attendance-control"
              icon={FiUserCheck}
              label="Control de asistencia"
            />
            <NavItem
              to="/root/task-control"
              icon={FiCheckSquare}
              label="Control de tareas"
            />
            <NavItem
              to="/root/photo-validation"
              icon={FiCamera}
              label="Validar fotos"
            />
            <NavItem
              to="/root/questions"
              icon={FiHelpCircle}
              label="Preguntas"
            />

            <SectionTitle title="Cuenta" />

            <button
              type="button"
              onClick={logout}
              onMouseEnter={(event) => {
                if (!isCollapsed) return;

                const rect =
                  event.currentTarget.getBoundingClientRect();

                setHoveredLabel("Cerrar sesión");
                setTooltipTop(
                  rect.top + rect.height / 2,
                );
              }}
              onMouseLeave={() =>
                setHoveredLabel(null)
              }
              className={`
                relative flex items-center gap-3 py-3.5
                rounded-2xl text-[11px] font-black
                uppercase tracking-widest transition-all
                duration-300 text-gray-500
                hover:bg-red-50 hover:text-red-500
                justify-start px-4 w-full
                ${
                  isCollapsed
                    ? "md:justify-center md:px-0 md:mx-2"
                    : "md:justify-start md:px-4 md:mx-0"
                }
              `}
            >
              <FiLogOut
                size={isCollapsed ? 20 : 18}
                className="min-w-[20px]"
              />

              <span
                className={`whitespace-nowrap overflow-hidden ${
                  isCollapsed
                    ? "block md:hidden"
                    : "block"
                }`}
              >
                Cerrar sesión
              </span>
            </button>
          </nav>
        </div>

        <div className="py-5 px-5 border-t border-gray-100 flex items-center gap-3 shrink-0">
          <div className="w-10 h-10 rounded-full bg-[#87be00]/10 flex items-center justify-center text-[#87be00] font-black shrink-0">
            {userInitial}
          </div>

          <div
            className={`min-w-0 overflow-hidden transition-all duration-300 ${
              isCollapsed
                ? "block md:hidden"
                : "block"
            }`}
          >
            <p className="text-xs font-black text-gray-800 truncate">
              {userName}
            </p>

            <p className="text-[9px] font-black text-[#87be00] uppercase tracking-wider truncate mt-0.5">
              {user?.company_name ||
                "Control ROOT"}
            </p>
          </div>
        </div>
      </aside>

      {isCollapsed && hoveredLabel && (
        <div
          className="hidden md:block fixed left-24 px-3 py-2 bg-gray-900 text-white text-[10px] font-black uppercase tracking-wider rounded-lg shadow-2xl z-[99999] whitespace-nowrap pointer-events-none -translate-y-1/2"
          style={{
            top: `${tooltipTop}px`,
          }}
        >
          {hoveredLabel}
        </div>
      )}
    </>
  );
};

export default Sidebar;