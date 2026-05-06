import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"
import { AuthProvider } from "./context/AuthContext"
import { NotificationProvider } from "./context/NotificationContext" 
import { Toaster } from "react-hot-toast"

// --- HOOKS ---
import { useOfflineSync } from "./hooks/useOfflineSync"
import { FiCloudOff, FiRefreshCw } from "react-icons/fi"

// --- AUTH PAGES ---
import Login from "./pages/Login"
import ChangePassword from "./pages/auth/ChangePassword"
import ForgotPassword from "./pages/auth/ForgotPassword"
import ResetPassword from "./pages/auth/ResetPassword"

// 🚩 IMPORTACIÓN DE CREDENCIALES (PARA EL QR)
import UserCredential from "./components/UserCredential"

// --- COMPONENTES GLOBALES ---
import ProtectedRoute from "./components/ProtectedRoute"
import NotificationsLayout from "./components/NotificationsLayout" 
import AlertsHistory from "./components/AlertsHistory" 

/* ================= ROOT ================= */
import RootDashboard from "./pages/root/RootDashboard"
import Analytics from "./pages/root/Analytics"
import Companies from "./pages/root/Companies"
import Users from "./pages/root/Users"
import Locales from "./pages/root/Locales"
import NotificationManager from "./pages/root/NotificationManager"
import TurnosManager from "./pages/root/TurnosManager"

/* ================= ADMIN CLIENTE ================= */
import AdminDashboard from "./pages/admin/AdminDashboard"
import AdminOverview from "./pages/admin/AdminOverview"
import AdminUsers from "./pages/admin/AdminUsers"
import AdminLocales from "./components/AdminLocales"
import AdminRoutes from "./pages/admin/AdminRoutes"
import GpsMonitor from "./pages/admin/GpsMonitor" 
// 🚩 NUEVA IMPORTACIÓN: GESTOR DE CATÁLOGO
import CatalogManager from "./pages/admin/CatalogManager"

/* ================= SUPERVISOR ================= */
import SupervisorDashboard from "./pages/supervisor/SupervisorDashboard"
import SupervisorPanel from "./pages/supervisor/SupervisorPanel"
import LiveMap from "./pages/supervisor/LiveMap"
import AlertManager from "./pages/supervisor/AlertManager"
import AttendanceControl from "./pages/supervisor/AttendanceControl"
import PhotoValidation from "./pages/supervisor/PhotoValidation"

/* ================= USUARIO (MERCADERISTA) ================= */
import UserDashboard from "./pages/user/UserDashboard"
import UserHome from "./pages/user/UserHome" 
import UserLocales from "./pages/user/UserLocales"
import VisitFlow from "./pages/user/VisitFlow" 
import UserAgenda from "./pages/user/UserAgenda"

/* ================= QUESTIONS ================= */
import QuestionsManager from "./pages/admin/QuestionsManager"

import "./App.css"
import { useAuth } from "./context/AuthContext"

// 🚩 ROUTER: Admin de Cultiva ve Locales.jsx (acceso elevado), resto ve AdminLocales.jsx
const ID_CULTIVA = '0e342e01-d213-4353-b210-39a12ac335cf';
const AdminLocalesRouter = () => {
  const { user } = useAuth();
  const isCultivaAdmin = user?.company_id === ID_CULTIVA;
  return isCultivaAdmin ? <Locales /> : <AdminLocales />;
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
          <Toaster position="top-right" />
          <Routes>
            <Route path="/" element={<Login />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            
            {/* 🚩 RUTA PÚBLICA PARA CREDENCIAL QR (FUERA DE PROTECTED) */}
            <Route path="/verify/:id" element={<UserCredential />} />

            <Route path="/change-password" element={<ProtectedRoute><ChangePassword /></ProtectedRoute>} />

            {/* 👑 SECCIÓN ROOT */}
            <Route path="/root" element={<ProtectedRoute role="ROOT"><RootDashboard /></ProtectedRoute>}>
              <Route index element={<Analytics />} /> 
              <Route path="analytics" element={<Analytics />} />
              <Route path="companies" element={<Companies />} />
              <Route path="users" element={<Users />} />
              <Route path="locales" element={<Locales />} />
              
              <Route path="planificacion" element={<Analytics />} /> 
              <Route path="routes" element={<AdminRoutes />} />
              <Route path="turnos" element={<TurnosManager />} />
              <Route path="gps-monitor" element={<GpsMonitor />} />

              <Route path="notifications-manager" element={<NotificationManager />} />
              <Route path="trazabilidad-global" element={<AlertsHistory userRole="ROOT" />} />
              <Route path="notifications" element={<NotificationsLayout userRole="ROOT" />} />
              <Route path="questions" element={<QuestionsManager />} />
              {/* 🚩 ACCESO ROOT AL CATÁLOGO */}
              <Route path="catalogo" element={<CatalogManager />} />
            </Route>

            {/* 👤 SECCIÓN USUARIO */}
            <Route path="/usuario" element={<ProtectedRoute role="USUARIO"><UserDashboard /></ProtectedRoute>}>
              <Route index element={<UserHome />} />
              <Route path="home" element={<UserHome />} />
              <Route path="agenda" element={<UserAgenda />} /> 
              <Route path="locales" element={<UserLocales />} />
              <Route path="reporte/:id" element={<VisitFlow />} />
              <Route path="notifications" element={<NotificationsLayout userRole="MERCADERISTA" />} />
            </Route>

            {/* 🛡️ SECCIÓN SUPERVISOR */}
            <Route path="/supervisor" element={<ProtectedRoute role="SUPERVISOR"><SupervisorDashboard /></ProtectedRoute>}>
              <Route index element={<SupervisorPanel />} />
              <Route path="trazabilidad-alertas" element={<AlertsHistory userRole="SUPERVISOR" />} />
              <Route path="mapa" element={<LiveMap />} />
              <Route path="alertas" element={<AlertManager />} />
              <Route path="asistencia" element={<AttendanceControl />} />
              <Route path="ejecucion" element={<PhotoValidation />} />
              <Route path="notificaciones" element={<NotificationsLayout userRole="SUPERVISOR" />} />
            </Route>

            {/* 💼 SECCIÓN ADMIN CLIENTE */}
            <Route path="/admin" element={<ProtectedRoute roles={["ADMIN_CLIENTE", "ROOT"]}><AdminDashboard /></ProtectedRoute>}>
              <Route index element={<Analytics />} />
              <Route path="users" element={<AdminUsers />} />

              {/* 🚩 FIX: Admin Cultiva ve Locales.jsx, resto ve AdminLocales.jsx */}
              <Route path="locales" element={<AdminLocales />} />
              
              <Route path="companies" element={<Companies />} />
              
              <Route path="turnos" element={<TurnosManager />} />
              <Route path="routes" element={<AdminRoutes />} />
              <Route path="gps-monitor" element={<GpsMonitor />} /> 
              <Route path="notification-manager" element={<NotificationManager />} />
              <Route path="trazabilidad-alertas" element={<AlertsHistory userRole="ADMIN" />} />
              <Route path="questions" element={<QuestionsManager />} />
              <Route path="notifications" element={<NotificationsLayout userRole="ADMIN" />} />
              {/* 🚩 ACCESO ADMIN AL CATÁLOGO */}
              <Route path="catalogo" element={<CatalogManager />} />
            </Route>

            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </BrowserRouter>
      </NotificationProvider>
    </AuthProvider>
  )
}

export default App;