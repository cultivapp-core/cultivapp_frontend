import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"
import { AuthProvider, useAuth } from "./context/AuthContext" 
import { NotificationProvider } from "./context/NotificationContext" 
import { Toaster } from "react-hot-toast"
import { useEffect } from "react" 
import api from "./api/apiClient" 
import { presenceSocket } from "./services/presenceSocket"
import { getDeviceInfo } from "./utils/deviceInfo"

// --- SINCRONIZACIÓN OFFLINE GLOBAL ---
import OfflineSyncMonitor from "./components/OfflineSyncMonitor"
import { OFFLINE_SYNC_EVENTS } from "./services/offlineManager"

// --- AUTH PAGES ---
import Login from "./pages/Login"
import ChangePassword from "./pages/auth/ChangePassword"
import ForgotPassword from "./pages/auth/ForgotPassword"
import ResetPassword from "./pages/auth/ResetPassword"
import UserCredential from "./components/UserCredential"

// --- COMPONENTES GLOBALES ---
import ProtectedRoute from "./components/ProtectedRoute"
import NotificationsLayout from "./components/NotificationsLayout" 

/* ================= ROOT ================= */
import RootLayout from "./pages/root/RootLayout" 
import RootDashboard from "./pages/root/RootDashboard"
import Analytics from "./pages/root/Analytics"
import ActiveSessions from "./pages/root/ActiveSession" 
import Companies from "./pages/root/Companies"
import Users from "./pages/root/Users"
import Locales from "./pages/root/Locales"
import NotificationManager from "./pages/root/NotificationManager"
import TurnosManager from "./pages/root/TurnosManager"
import UploadSalesData from "./pages/reports/UploadSalesData" 
import SalesDashboard from "./pages/reports/SalesDashboard" 
import ReportsPage from "./pages/reports/ReportsPage" 

/* ================= ADMIN CLIENTE ================= */
import AdminLayout from "./pages/admin/AdminLayout" 
import AdminOverview from "./pages/admin/AdminOverview"
import AdminUsers from "./pages/admin/AdminUsers"
import AdminLocales from "./pages/admin/AdminLocales"
import AdminRoutes from "./pages/admin/AdminRoutes"
import GpsMonitor from "./pages/admin/GpsMonitor" 
import CatalogManager from "./pages/admin/CatalogManager"
import QuestionsManager from "./pages/admin/QuestionsManager"
import TaskControl from "./pages/supervisor/TaskControl"
import AttendanceControl from "./pages/supervisor/AttendanceControl"
import PhotoValidation from "./pages/supervisor/PhotoValidation"

/* ================= SUPERVISOR ================= */
import SupervisorDashboard from "./pages/supervisor/SupervisorDashboard"
import SupervisorLayout from "./pages/supervisor/SupervisorLayout";
import SupervisorPanel from "./pages/supervisor/SupervisorPanel"
import LiveMap from "./pages/supervisor/LiveMap"
import AlertManager from "./pages/supervisor/AlertManager"
import SupervisorVisitFlow from "./pages/supervisor/SupervisorVisitFlow" 

/* ================= USUARIO ================= */
import UserDashboard from "./pages/user/UserDashboard"
import UserHome from "./pages/user/UserHome" 
import UserLocales from "./pages/user/UserLocales"
import VisitFlow from "./pages/user/VisitFlow" 
import UserAgenda from "./pages/user/UserAgenda"

/* ================= VIEWER ================= */
import ViewerLayout from "./pages/viewer/ViewerLayout"
import ViewerDashboard from "./pages/viewer/ViewerDashboard" 
import ViewerReports from "./pages/viewer/ViewerReports" 
import RoutePlanningMap from "./pages/viewer/RoutePlanningMap" 
import ConsolidatedControl from "./pages/viewer/ConsolidatedControl"
import MercaderistaReport from "./pages/reports/MercaderistaReport"
import SalesTrendReport from "./pages/reports/SalesTrendReport";
import ProductReport from "./pages/reports/ProductReport";
import GeoChainReport from "./pages/reports/GeoChainReport";

/* ================= ADMIN REGIONAL ================= */
import RegionalAdminLayout from "./pages/regional-admin/RegionalAdminLayout";
import RegionalInventoryDashboard from "./pages/regional-admin/RegionalInventoryDashboard";
import RegionalProductCatalog from "./pages/regional-admin/RegionalProductCatalog";
import RegionalStockLoads from "./pages/regional-admin/RegionalStockLoads";
import RegionalMovements from "./pages/regional-admin/RegionalMovements";
import RegionalVisitControl from "./pages/regional-admin/RegionalVisitControl";
import RegionalPhotoValidation from "./pages/regional-admin/RegionalPhotoValidation";

/* ================= MERCADERISTA REGIONAL ================= */
import RegionalWorkerDashboard from "./pages/regional-worker/RegionalWorkerDashboard";
import RegionalWorkerLocales from "./pages/regional-worker/RegionalWorkerLocales";
import RegionalWorkerLayout from "./pages/regional-worker/RegionalWorkerLayout";

import "./App.css"

const HeartbeatMonitor = () => {
  const { user } = useAuth();

  useEffect(() => {
    if (!user?.id) return;

    const socket = presenceSocket;
    let authBlocked = false;

    const markSessionExpired = (
      error,
    ) => {
      const status =
        Number(
          error?.response
            ?.status ??
          error?.status ??
          0,
        );

      const message =
        error?.response
          ?.data?.message ??
        error?.data?.message ??
        error?.message ??
        "";

      if (
        status !== 401 &&
        !String(
          message,
        ).toLowerCase()
          .includes(
            "sesión",
          )
      ) {
        return false;
      }

      authBlocked = true;

      try {
        sessionStorage.setItem(
          "cultivapp_offline_auth_required",
          "true",
        );
      } catch {
        // El almacenamiento puede estar restringido.
      }

      window.dispatchEvent(
        new CustomEvent(
          OFFLINE_SYNC_EVENTS
            .AUTH_REQUIRED,
          {
            detail: {
              message:
                message ||
                "Tu sesión venció.",
            },
          },
        ),
      );

      socket.disconnect();

      return true;
    };

    const registerPresence = () => {
      if (authBlocked) return;
      if (!socket.connected) return;

      const deviceInfo = getDeviceInfo();

      console.log("📡 Registrando presencia global:", {
        user_id: user.id,
        socket_id: socket.id,
        api_url: import.meta.env.VITE_API_URL,
        ...deviceInfo
      });

      socket.emit("register_user", {
        user_id: user.id,
        ...deviceInfo
      });
    };

    const sendPresencePing = () => {
      if (
        authBlocked ||
        !socket.connected
      ) {
        return;
      }

      socket.emit("presence_ping", {
        user_id: user.id,
        ...getDeviceInfo()
      });
    };

    const sendHttpPing = async () => {
      try {
        await api.post("/users/ping");
      } catch (error) {
        if (
          markSessionExpired(
            error,
          )
        ) {
          console.warn(
            "⚠️ Heartbeat detenido: sesión vencida."
          );
          return;
        }

        console.warn(
          "⚠️ Ping HTTP fallido:",
          error?.message || error
        );
      }
    };

    const handleConnect = () => {
      if (authBlocked) return;

      console.log(
        "🟢 Socket de presencia conectado:",
        socket.id
      );

      registerPresence();
      sendPresencePing();
      sendHttpPing();
    };

    const handleReconnect = () => {
      if (authBlocked) return;

      console.log(
        "🔄 Socket de presencia reconectado:",
        socket.id
      );

      registerPresence();
      sendPresencePing();
      sendHttpPing();
    };

    const handleConnectError = (error) => {
      console.error(
        "❌ Error conectando Socket.IO:",
        {
          message: error?.message,
          apiUrl: import.meta.env.VITE_API_URL
        }
      );
    };

    const handleDisconnect = (reason) => {
      console.warn(
        "🟠 Socket de presencia desconectado:",
        reason
      );
    };

    const restorePresence = () => {
      if (
        authBlocked ||
        document.visibilityState !== "visible"
      ) {
        return;
      }

      if (!socket.connected) {
        socket.connect();
        return;
      }

      registerPresence();
      sendPresencePing();
      sendHttpPing();
    };

    const handleOnline = () => {
      if (authBlocked) return;

      if (!socket.connected) {
        socket.connect();
        return;
      }

      registerPresence();
      sendPresencePing();
      sendHttpPing();
    };

    socket.on("connect", handleConnect);
    socket.on("connect_error", handleConnectError);
    socket.on("disconnect", handleDisconnect);
    socket.io.on("reconnect", handleReconnect);

    document.addEventListener(
      "visibilitychange",
      restorePresence
    );

    window.addEventListener(
      "focus",
      restorePresence
    );

    window.addEventListener(
      "pageshow",
      restorePresence
    );

    window.addEventListener(
      "online",
      handleOnline
    );

    const handleAuthRequired =
      () => {
        authBlocked = true;
        socket.disconnect();
      };

    window.addEventListener(
      OFFLINE_SYNC_EVENTS
        .AUTH_REQUIRED,
      handleAuthRequired
    );

    console.log("🧪 HeartbeatMonitor montado:", {
      userId: user.id,
      apiUrl: import.meta.env.VITE_API_URL,
      device: getDeviceInfo()
    });

    if (!socket.connected) {
      socket.connect();
    } else {
      handleConnect();
    }

    const presenceInterval = window.setInterval(() => {
      if (
        authBlocked ||
        !navigator.onLine
      ) {
        return;
      }

      if (!socket.connected) {
        socket.connect();
        return;
      }

      sendPresencePing();
    }, 15000);

    const httpPingInterval = window.setInterval(
      sendHttpPing,
      60000
    );

    return () => {
      window.clearInterval(presenceInterval);
      window.clearInterval(httpPingInterval);

      document.removeEventListener(
        "visibilitychange",
        restorePresence
      );

      window.removeEventListener(
        "focus",
        restorePresence
      );

      window.removeEventListener(
        "pageshow",
        restorePresence
      );

      window.removeEventListener(
        "online",
        handleOnline
      );

      window.removeEventListener(
        OFFLINE_SYNC_EVENTS
          .AUTH_REQUIRED,
        handleAuthRequired
      );

      socket.off("connect", handleConnect);
      socket.off(
        "connect_error",
        handleConnectError
      );
      socket.off("disconnect", handleDisconnect);
      socket.io.off("reconnect", handleReconnect);

      /*
       * No desconectamos aquí porque este cleanup también puede
       * ejecutarse durante navegación interna o recargas.
       * El cierre real se gestiona desde logout() en AuthContext.
       */
    };
  }, [user?.id]);

  return null;
};

function App() {
  return (
    <AuthProvider>
      <NotificationProvider> 
        <BrowserRouter>
          {/*
           * Monitor global único.
           * Mantiene useOfflineSync activo durante toda la sesión,
           * incluso cuando el usuario cambia de pantalla.
           */}
          <OfflineSyncMonitor />

          <HeartbeatMonitor /> 
          <Toaster 
            position="top-right"
            toastOptions={{
              style: {
                borderRadius: '1rem',
                background: '#fff',
                color: '#1e293b',
                fontFamily: 'Outfit, sans-serif',
                border: '1px solid #e5e7eb',
                padding: '16px',
              },
              success: {
                style: { border: '1px solid #87be00' },
                iconTheme: { primary: '#87be00', secondary: '#fff' },
              },
              error: {
                style: { border: '1px solid #ef4444' },
                iconTheme: { primary: '#ef4444', secondary: '#fff' },
              },
            }}
          />
          <Routes>
            <Route path="/" element={<Login />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password/:token" element={<ResetPassword />} />
            <Route path="/verify/:id" element={<UserCredential />} />
            <Route path="/change-password" element={<ProtectedRoute><ChangePassword /></ProtectedRoute>} />

            {/* ROOT */}
            <Route path="/root" element={<ProtectedRoute role="ROOT"><RootLayout /></ProtectedRoute>}>
              <Route index element={<Analytics />} /> 
              <Route path="analytics" element={<Analytics />} />
              <Route path="upload-sales" element={<UploadSalesData />} />
              <Route path="sales-report" element={<SalesDashboard />} />
              <Route path="reports" element={<ReportsPage />} /> 
              <Route path="active-sessions" element={<ActiveSessions />} /> 
              <Route path="companies" element={<Companies />} />
              <Route path="users" element={<Users />} />
              <Route path="locales" element={<Locales />} />
              <Route path="routes" element={<AdminRoutes />} />
              <Route path="turnos" element={<TurnosManager />} />
              <Route path="gps-monitor" element={<GpsMonitor />} />
              <Route path="notifications-manager" element={<NotificationManager />} />
              <Route path="notifications" element={<NotificationsLayout userRole="ROOT" />} />
              <Route path="questions" element={<QuestionsManager />} />
              <Route path="catalogo" element={<CatalogManager />} />
              <Route path="task-control" element={<TaskControl />} />
              <Route path="attendance-control" element={<AttendanceControl />} />
              <Route path="photo-validation" element={<PhotoValidation />} />
            </Route>

            {/* USUARIO */}
            <Route path="/usuario" element={<ProtectedRoute role="USUARIO"><UserDashboard /></ProtectedRoute>}>
              <Route index element={<UserHome />} />
              <Route path="home" element={<UserHome />} />
              <Route path="agenda" element={<UserAgenda />} /> 
              <Route path="locales" element={<UserLocales />} />
              <Route path="reporte/:id" element={<VisitFlow />} />
              <Route path="notifications" element={<NotificationsLayout userRole="MERCADERISTA" />} />
            </Route>

           {/* SUPERVISOR */}
            <Route 
              path="/supervisor" 
              element={
                <ProtectedRoute role="SUPERVISOR">
                  <SupervisorLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<SupervisorPanel />} />
              <Route path="routes" element={<AdminRoutes />} /> 
              <Route path="mapa" element={<LiveMap />} />
              <Route path="alertas" element={<AlertManager />} />
              <Route path="visita" element={<SupervisorVisitFlow />} />
              <Route path="asistencia" element={<AttendanceControl />} />
              <Route path="ejecucion" element={<PhotoValidation />} />
              <Route path="tareas" element={<TaskControl />} />
              <Route path="notificaciones" element={<NotificationsLayout userRole="SUPERVISOR" />} />
              <Route path="informes" element={<ReportsPage />} />
            </Route>

            {/* ADMIN */}
            <Route path="/admin" element={<ProtectedRoute roles={["ADMIN_CLIENTE", "ROOT"]}><AdminLayout /></ProtectedRoute>}>
              <Route index element={<AdminOverview />} />
              <Route path="informes" element={<ReportsPage />} />
              <Route path="upload-sales" element={<UploadSalesData />} />
              <Route path="sales-report" element={<SalesDashboard />} />
              <Route path="users" element={<AdminUsers />} />
              <Route path="locales" element={<AdminLocales />} />
              <Route path="companies" element={<Companies />} />
              <Route path="turnos" element={<TurnosManager />} />
              <Route path="routes" element={<AdminRoutes />} />
              <Route path="gps-monitor" element={<GpsMonitor />} /> 
              <Route path="notification-manager" element={<NotificationManager />} />
              <Route path="questions" element={<QuestionsManager />} />
              <Route path="notifications" element={<NotificationsLayout userRole="ADMIN" />} />
              <Route path="catalogo" element={<CatalogManager />} />
              <Route path="task-control" element={<TaskControl />} />
              <Route path="attendance-control" element={<AttendanceControl />} />
              <Route path="photo-validation" element={<PhotoValidation />} />
            </Route>

            {/* ADMIN REGIONAL */}
            <Route
              path="/admin-regional"
              element={
                <ProtectedRoute role="ADMIN_REGIONAL">
                  <RegionalAdminLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<RegionalInventoryDashboard />} />

              {/* INVENTARIO REGIONAL */}
              <Route path="catalogo" element={<RegionalProductCatalog />} />
              <Route path="cargas" element={<RegionalStockLoads />} />
              <Route path="movimientos" element={<RegionalMovements />} />

              {/* SECCIONES DEL ADMINISTRADOR */}
              <Route path="informes" element={<ReportsPage />} />
              <Route path="locales" element={<AdminLocales />} />
              <Route path="turnos" element={<TurnosManager />} />
              <Route path="routes" element={<AdminRoutes />} />
              <Route path="gps-monitor" element={<GpsMonitor />} />
              <Route path="notification-manager" element={<NotificationManager />} />
              <Route path="questions" element={<QuestionsManager />} />
              <Route
                path="notifications"
                element={<NotificationsLayout userRole="ADMIN_REGIONAL" />}
              />
              <Route path="task-control" element={<RegionalVisitControl />} />
              <Route path="attendance-control" element={<AttendanceControl />} />
              <Route path="photo-validation" element={<RegionalPhotoValidation />} />
            </Route>

            {/* MERCADERISTA REGIONAL */}
            <Route
              path="/mercaderista-regional"
              element={
                <ProtectedRoute role="MERCADERISTA_REGIONAL">
                  <RegionalWorkerLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Navigate to="home" replace />} />
              <Route path="home" element={<RegionalWorkerDashboard />} />
              <Route path="agenda" element={<RegionalWorkerDashboard />} />
              <Route path="jornada" element={<Navigate to="/mercaderista-regional/home" replace />} />
              <Route path="locales" element={<RegionalWorkerLocales />} />
              <Route path="notifications" element={<NotificationsLayout userRole="MERCADERISTA_REGIONAL" />} />
            </Route>

            {/* VIEWER */}
            <Route path="/viewer" element={<ProtectedRoute roles={["VIEW", "ADMIN_CLIENTE", "ROOT"]}><ViewerLayout /></ProtectedRoute>}>
              <Route index element={<ViewerDashboard />} />
              <Route path="dashboard" element={<ViewerDashboard />} />
              <Route path="reportes" element={<ViewerReports />} />
              <Route path="planificacion" element={<RoutePlanningMap />} />
              <Route path="consolidado" element={<ConsolidatedControl />} />
              <Route path="galeria" element={<PhotoValidation />} />
              <Route path="mercaderistas" element={<MercaderistaReport />} />
              <Route path="trend" element={<SalesTrendReport />} />
              <Route path="productos" element={<ProductReport />} />
              <Route path="geo-chain" element={<GeoChainReport />} />
            </Route>

            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </BrowserRouter>
      </NotificationProvider>
    </AuthProvider>
  )
}

export default App;
