import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"
import { AuthProvider, useAuth } from "./context/AuthContext" 
import { NotificationProvider } from "./context/NotificationContext" 
import { Toaster } from "react-hot-toast"
import { useEffect } from "react" 
import api from "./api/apiClient" 

// --- HOOKS ---
import { useOfflineSync } from "./hooks/useOfflineSync"
import { FiCloudOff, FiRefreshCw } from "react-icons/fi"

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
import AdminLayout from "./pages/admin/AdminLayout" // Asegúrate de tener este layout creado
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

import "./App.css"

const HeartbeatMonitor = () => {
  const { user } = useAuth();
  useEffect(() => {
    if (!user) return;
    const sendPing = async () => {
      try { await api.post("/users/ping"); } catch (error) { console.warn("Ping fallido..."); }
    };
    sendPing();
    const intervalId = setInterval(sendPing, 60000);
    return () => clearInterval(intervalId);
  }, [user]);
  return null; 
};

const OfflineMonitor = () => {
  const { isOnline, syncing } = useOfflineSync();
  return (
    <>
      {!isOnline && (
        <div className="fixed top-0 left-0 w-full bg-orange-500 text-white text-[10px] font-black py-1.5 flex items-center justify-center gap-2 z-[9999] shadow-lg uppercase tracking-widest animate-pulse">
          <FiCloudOff size={14} /> Modo Offline
        </div>
      )}
      {syncing && (
        <div className="fixed bottom-6 right-6 bg-black text-white px-4 py-3 rounded-2xl shadow-2xl z-[9999] flex items-center gap-3 border border-white/10 animate-bounce">
          <FiRefreshCw size={18} className="animate-spin text-[#87be00]" />
          <span className="text-[10px] font-black uppercase tracking-tighter">Sincronizando...</span>
        </div>
      )}
    </>
  );
};

function App() {
  return (
    <AuthProvider>
      <NotificationProvider> 
        <BrowserRouter>
          <OfflineMonitor />
          <HeartbeatMonitor /> 
          <Toaster position="top-right" />
          <Routes>
            <Route path="/" element={<Login />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
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
            <Route path="/supervisor" element={<ProtectedRoute role="SUPERVISOR"><SupervisorDashboard /></ProtectedRoute>}>
              <Route index element={<SupervisorPanel />} />
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