import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuditProvider } from './context/AuditContext.jsx';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';
import { InventoryProvider } from './context/InventoryContext.jsx';
import { VehicleProvider } from './context/VehicleContext.jsx';
import { RequisitionProvider } from './context/RequisitionContext.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import LoginModal from './components/LoginModal.jsx';
import Sidebar from './components/Sidebar.jsx';
import TopStatusBar from './components/TopStatusBar.jsx';
import Footer from './components/Footer.jsx';
import Home from './pages/Home.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Inventory from './pages/Inventory.jsx';
import DemandExplorer from './pages/DemandExplorer.jsx';
import Forecast from './pages/Forecast.jsx';
import Alerts from './pages/Alerts.jsx';
import MaintenanceList from './pages/MaintenanceList.jsx';
import VehicleDetail from './pages/VehicleDetail.jsx';
import Requisitions from './pages/Requisitions.jsx';
import Experiments from './pages/Experiments.jsx';
import Users from './pages/Users.jsx';
import AuditLog from './pages/AuditLog.jsx';
import About from './pages/About.jsx';
import './App.css';

/**
 * Handles /login route by opening the login modal dialog and returning to home.
 */
function LoginRouteHandler() {
  const { openLoginModal } = useAuth();
  useEffect(() => {
    openLoginModal('/dashboard');
  }, [openLoginModal]);

  return <Navigate to="/" replace />;
}

/**
 * Main application console shell managing responsive sidebar and status bar.
 */
function ConsoleAppShell() {
  const { isAuthenticated } = useAuth();
  const location = useLocation();

  // Collapsible state persisted in localStorage
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    try {
      return localStorage.getItem('iaf_sidebar_collapsed') === 'true';
    } catch {
      return false;
    }
  });

  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);

  const handleToggleCollapse = (val) => {
    setIsSidebarCollapsed(val);
    try {
      localStorage.setItem('iaf_sidebar_collapsed', String(val));
    } catch {
      // ignore
    }
  };

  // "Home has no sidebar when logged out."
  const isHomePage = location.pathname === '/';
  const showSidebar = isAuthenticated || !isHomePage;

  return (
    <div
      className={`console-shell ${showSidebar ? 'has-sidebar' : 'no-sidebar'} ${
        isSidebarCollapsed ? 'sidebar-collapsed' : 'sidebar-expanded'
      }`}
    >
      {showSidebar && (
        <Sidebar
          isCollapsed={isSidebarCollapsed}
          setIsCollapsed={handleToggleCollapse}
          isOpenOnMobile={isMobileDrawerOpen}
          setIsOpenOnMobile={setIsMobileDrawerOpen}
        />
      )}

      <div className="console-main-wrapper">
        <TopStatusBar
          onToggleMobileSidebar={() => setIsMobileDrawerOpen(!isMobileDrawerOpen)}
          hasSidebar={showSidebar}
        />
        <main className="console-content-area">
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<LoginRouteHandler />} />
            <Route
              path="/about"
              element={
                <ProtectedRoute>
                  <About />
                </ProtectedRoute>
              }
            />

            {/* Protected Routes (Authenticated Personnel) */}
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/inventory"
              element={
                <ProtectedRoute>
                  <Inventory />
                </ProtectedRoute>
              }
            />
            <Route
              path="/demand"
              element={
                <ProtectedRoute>
                  <DemandExplorer />
                </ProtectedRoute>
              }
            />
            <Route
              path="/forecast"
              element={
                <ProtectedRoute>
                  <Forecast />
                </ProtectedRoute>
              }
            />
            <Route
              path="/alerts"
              element={
                <ProtectedRoute>
                  <Alerts />
                </ProtectedRoute>
              }
            />

            {/* Maintenance Tracker */}
            <Route
              path="/maintenance"
              element={
                <ProtectedRoute>
                  <MaintenanceList />
                </ProtectedRoute>
              }
            />
            <Route
              path="/maintenance/:id"
              element={
                <ProtectedRoute>
                  <VehicleDetail />
                </ProtectedRoute>
              }
            />
            <Route path="/fleet" element={<Navigate to="/maintenance" replace />} />

            <Route
              path="/requisitions"
              element={
                <ProtectedRoute>
                  <Requisitions />
                </ProtectedRoute>
              }
            />
            <Route
              path="/experiments"
              element={
                <ProtectedRoute>
                  <Experiments />
                </ProtectedRoute>
              }
            />

            {/* Role-Restricted Protected Routes */}
            <Route
              path="/users"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <Users />
                </ProtectedRoute>
              }
            />
            <Route
              path="/audit"
              element={
                <ProtectedRoute allowedRoles={['commander', 'admin']}>
                  <AuditLog />
                </ProtectedRoute>
              }
            />

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
        <Footer />
      </div>

      <LoginModal />
    </div>
  );
}

export default function App() {
  return (
    <AuditProvider>
      <AuthProvider>
        <InventoryProvider>
          <VehicleProvider>
            <RequisitionProvider>
              <BrowserRouter>
                <ConsoleAppShell />
              </BrowserRouter>
            </RequisitionProvider>
          </VehicleProvider>
        </InventoryProvider>
      </AuthProvider>
    </AuditProvider>
  );
}
