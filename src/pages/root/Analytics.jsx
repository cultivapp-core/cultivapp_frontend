import { Link } from "react-router-dom";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  FiActivity,
  FiBell,
  FiBriefcase,
  FiFileText,
  FiGlobe,
  FiMap,
  FiMonitor,
  FiNavigation,
  FiRefreshCw,
  FiTrendingUp,
  FiUsers,
} from "react-icons/fi";
import api from "../../api/apiClient";
import { Button } from "../../components/ui";

const getResponseData = (response, fallback = []) => {
  if (response == null) return fallback;
  return response?.data ?? response;
};

const Analytics = () => {
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeUsers: 0,
    totalCompanies: 0,
    activeCompanies: 0,
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchStats = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const [usersResponse, companiesResponse] =
        await Promise.all([
          api.get("/users"),
          api.get("/companies"),
        ]);

      const userData = getResponseData(
        usersResponse,
        [],
      );
      const companyData = getResponseData(
        companiesResponse,
        [],
      );

      if (
        !Array.isArray(userData) ||
        !Array.isArray(companyData)
      ) {
        throw new Error(
          "La API devolvió un formato de datos inesperado.",
        );
      }

      const activeUsers = userData.filter(
        (user) => Boolean(user.is_active),
      ).length;

      const activeCompanies = companyData.filter(
        (company) => Boolean(company.is_active),
      ).length;

      setStats({
        totalUsers: userData.length,
        activeUsers,
        totalCompanies: companyData.length,
        activeCompanies,
      });
    } catch (requestError) {
      console.error(
        "Error cargando métricas ROOT:",
        requestError,
      );

      setError(
        requestError?.response?.data?.message ||
          requestError?.message ||
          "No se pudieron cargar las métricas globales.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const networkActivity = useMemo(() => {
    if (stats.totalCompanies === 0) return 0;

    return Math.round(
      (stats.activeCompanies /
        stats.totalCompanies) *
        100,
    );
  }, [
    stats.activeCompanies,
    stats.totalCompanies,
  ]);

  const inactiveCompanies = Math.max(
    stats.totalCompanies -
      stats.activeCompanies,
    0,
  );

  const inactiveUsers = Math.max(
    stats.totalUsers - stats.activeUsers,
    0,
  );

  const quickLinks = [
    {
      to: "/root/companies",
      label: "Empresas",
      icon: <FiBriefcase size={15} />,
    },
    {
      to: "/root/users",
      label: "Usuarios",
      icon: <FiUsers size={15} />,
    },
    {
      to: "/root/active-sessions",
      label: "Sesiones activas",
      icon: <FiMonitor size={15} />,
    },
    {
      to: "/root/routes",
      label: "Planificación",
      icon: <FiMap size={15} />,
    },
    {
      to: "/root/gps-monitor",
      label: "Monitoreo GPS",
      icon: <FiNavigation size={15} />,
    },
    {
      to: "/root/sales-report",
      label: "Ventas",
      icon: <FiTrendingUp size={15} />,
    },
    {
      to: "/root/notifications-manager",
      label: "Notificaciones",
      icon: <FiBell size={15} />,
    },
    {
      to: "/root/reports",
      label: "Informes",
      icon: <FiFileText size={15} />,
    },
  ];

  const operationalAlerts = [
    inactiveCompanies > 0 && {
      label: `${inactiveCompanies} ${
        inactiveCompanies === 1
          ? "empresa inactiva"
          : "empresas inactivas"
      }`,
      tone: "danger",
    },
    inactiveUsers > 0 && {
      label: `${inactiveUsers} ${
        inactiveUsers === 1
          ? "usuario inactivo"
          : "usuarios inactivos"
      }`,
      tone: "warning",
    },
    {
      label: `${networkActivity}% de red operativa`,
      tone:
        networkActivity >= 80
          ? "success"
          : networkActivity >= 50
            ? "warning"
            : "danger",
    },
  ].filter(Boolean);

  if (loading) {
    return (
      <div className="min-h-[60vh] w-full flex flex-col items-center justify-center gap-4 font-[Outfit]">
        <div className="w-11 h-11 border-4 border-gray-100 border-t-[#87be00] rounded-full animate-spin" />

        <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.22em] animate-pulse">
          Cargando métricas globales...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center p-4 font-[Outfit]">
        <div className="w-full max-w-lg bg-white border border-red-100 rounded-3xl shadow-sm p-7 text-center">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-red-50 text-red-500 flex items-center justify-center">
            <FiActivity size={22} />
          </div>

          <h1 className="mt-4 text-lg font-black text-gray-800">
            No se pudieron cargar las métricas
          </h1>

          <p className="mt-2 text-sm text-gray-500">
            {error}
          </p>

          <Button
            type="button"
            variant="secondary"
            size="lg"
            leftIcon={<FiRefreshCw size={16} />}
            onClick={fetchStats}
            className="mt-5"
          >
            Intentar nuevamente
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full min-h-full flex flex-col animate-in fade-in duration-500 font-[Outfit]">
      <header className="bg-white border-b border-gray-100 px-4 py-6 sm:px-6 md:px-8 md:py-8">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-[#87be00]/10 rounded-xl text-[#87be00] shrink-0">
            <FiGlobe size={20} />
          </div>

          <div className="min-w-0">
            <h1 className="text-2xl md:text-4xl font-black text-gray-800 tracking-tight leading-tight">
              Resumen global
            </h1>

            <p className="text-[10px] md:text-xs font-bold text-[#87be00] uppercase tracking-[0.16em] md:tracking-[0.22em] mt-1">
              Estado general de CultivaApp
            </p>
          </div>
        </div>
      </header>

      <section className="px-4 pt-5 sm:px-6 md:px-8">
        <div className="flex items-end justify-between gap-4 mb-3">
          <div>
            <h2 className="text-xs font-black text-gray-700">
              Accesos rápidos
            </h2>

            <p className="text-[10px] text-gray-400 mt-0.5">
              Funciones principales del panel ROOT
            </p>
          </div>
        </div>

        <div className="flex gap-2.5 overflow-x-auto pb-3 custom-scrollbar">
          {quickLinks.map((item) => (
            <QuickLink
              key={item.to}
              to={item.to}
              icon={item.icon}
              label={item.label}
            />
          ))}
        </div>
      </section>

      <section className="px-4 pt-1 sm:px-6 md:px-8">
        <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar">
          {operationalAlerts.map((alert) => (
            <StatusPill
              key={alert.label}
              label={alert.label}
              tone={alert.tone}
            />
          ))}
        </div>
      </section>

      <main className="p-4 sm:p-6 md:p-8 flex-1">
        <section className="grid grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-5 md:gap-6">
          <StatCard
            label="Empresas"
            value={stats.totalCompanies}
            icon={<FiBriefcase size={21} />}
            trend={`${stats.activeCompanies} activas`}
            detail={`${inactiveCompanies} inactivas`}
            color="text-gray-800"
          />

          <StatCard
            label="Usuarios"
            value={stats.totalUsers}
            icon={<FiUsers size={21} />}
            trend={`${stats.activeUsers} activos`}
            detail={`${inactiveUsers} inactivos`}
            color="text-gray-800"
          />

          <StatCard
            label="Actividad de red"
            value={`${networkActivity}%`}
            icon={<FiActivity size={21} />}
            trend={
              networkActivity >= 80
                ? "Operativa"
                : networkActivity >= 50
                  ? "Atención"
                  : "Crítica"
            }
            detail={`${stats.activeCompanies}/${stats.totalCompanies} empresas activas`}
            color={
              networkActivity >= 80
                ? "text-[#87be00]"
                : networkActivity >= 50
                  ? "text-amber-500"
                  : "text-red-500"
            }
          />

          <StatCard
            label="Usuarios activos"
            value={stats.activeUsers}
            icon={<FiActivity size={21} />}
            trend="Actualmente habilitados"
            detail={`${stats.totalUsers} usuarios registrados`}
            color="text-[#87be00]"
          />
        </section>
      </main>
    </div>
  );
};

const QuickLink = ({
  to,
  icon,
  label,
}) => (
  <Link
    to={to}
    className="
      inline-flex items-center gap-2
      min-h-10 px-4 py-2
      rounded-full shrink-0
      bg-white border border-gray-200
      text-xs font-black text-gray-600
      shadow-sm
      hover:border-[#87be00]
      hover:bg-[#87be00]/5
      hover:text-[#87be00]
      focus:outline-none
      focus-visible:ring-2
      focus-visible:ring-[#87be00]
      focus-visible:ring-offset-2
      active:scale-[0.98]
      transition-all
      whitespace-nowrap
    "
  >
    <span className="text-[#87be00]">
      {icon}
    </span>

    <span>{label}</span>
  </Link>
);

const StatusPill = ({
  label,
  tone = "neutral",
}) => {
  const tones = {
    success:
      "bg-green-50 text-green-700 border-green-200",
    warning:
      "bg-amber-50 text-amber-700 border-amber-200",
    danger:
      "bg-red-50 text-red-600 border-red-200",
    neutral:
      "bg-gray-50 text-gray-600 border-gray-200",
  };

  return (
    <span
      className={`
        inline-flex items-center min-h-8
        px-3 py-1.5 rounded-full shrink-0
        border text-[10px] font-black
        uppercase tracking-wider whitespace-nowrap
        ${tones[tone] || tones.neutral}
      `}
    >
      {label}
    </span>
  );
};

const StatCard = ({
  label,
  value,
  icon,
  trend,
  detail,
  color,
}) => (
  <article className="bg-white p-4 sm:p-6 md:p-7 rounded-[1.75rem] md:rounded-[2.25rem] shadow-sm border border-gray-100 flex flex-col justify-between gap-5 min-h-[180px] sm:min-h-[210px] group hover:shadow-lg transition-all">
    <div className="flex justify-between items-start gap-3">
      <div className="p-3 sm:p-4 bg-gray-50 rounded-2xl text-gray-400 group-hover:bg-gray-900 group-hover:text-white transition-colors">
        {icon}
      </div>

      <span className="text-[8px] sm:text-[9px] font-black text-gray-400 uppercase tracking-wider text-right leading-tight">
        {trend}
      </span>
    </div>

    <div>
      <p className="text-[9px] sm:text-[10px] font-black text-gray-400 uppercase tracking-wider mb-2">
        {label}
      </p>

      <p
        className={`text-3xl sm:text-4xl md:text-5xl font-black tracking-tight leading-none ${color}`}
      >
        {value}
      </p>

      <p className="mt-2 text-[10px] text-gray-400 font-medium">
        {detail}
      </p>
    </div>
  </article>
);

export default Analytics;