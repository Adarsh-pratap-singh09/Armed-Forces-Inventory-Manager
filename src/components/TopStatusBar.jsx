import { useMemo } from 'react';
import { useLocation, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useInventory } from '../context/InventoryContext.jsx';
import { useVehicles } from '../context/VehicleContext.jsx';
import { getPredictiveAlertsSummary } from '../forecasting/index.js';
import { SIMULATED_AS_OF_LABEL } from '../data/index.js';
import {
  Menu,
  Bell,
  Calendar,
  LogOut,
  LogIn,
  User,
  ChevronRight
} from 'lucide-react';

const ROUTE_BREADCRUMBS = {
  '/': { section: 'PORTAL', title: 'LOGISTICS OVERVIEW' },
  '/dashboard': { section: 'OPERATIONS', title: 'OPERATIONAL DASHBOARD' },
  '/inventory': { section: 'OPERATIONS', title: 'CONTINUOUS-REVIEW INVENTORY' },
  '/requisitions': { section: 'OPERATIONS', title: 'INDENT REQUISITIONS' },
  '/maintenance': { section: 'OPERATIONS', title: 'TACTICAL VEHICLE FLEET' },
  '/demand': { section: 'INTELLIGENCE', title: 'DEMAND & SURGE EXPLORER' },
  '/forecast': { section: 'INTELLIGENCE', title: '26-WEEK FORECAST & RUNWAY' },
  '/alerts': { section: 'INTELLIGENCE', title: 'PREDICTIVE EARLY WARNING' },
  '/experiments': { section: 'INTELLIGENCE', title: 'EMPIRICAL BENCHMARK LAB' },
  '/users': { section: 'ADMIN', title: 'PERSONNEL ACCESS DIRECTORY' },
  '/audit': { section: 'ADMIN', title: 'ENTERPRISE AUDIT LEDGER' },
  '/about': { section: 'REFERENCE', title: 'METHOD & DATA DOCUMENTATION' }
};

export default function TopStatusBar({
  onToggleMobileSidebar,
  hasSidebar
}) {
  const location = useLocation();
  const navigate = useNavigate();
  const { currentUser, isAuthenticated, logout, openLoginModal } = useAuth();
  const { stockLines } = useInventory();
  const { vehicles } = useVehicles();

  // Compute predictive alerts count
  const alertSummary = useMemo(() => {
    try {
      if (!Array.isArray(stockLines) || !Array.isArray(vehicles)) return { totalAlertsCount: 0 };
      return getPredictiveAlertsSummary(stockLines, vehicles);
    } catch {
      return { totalAlertsCount: 0 };
    }
  }, [stockLines, vehicles]);

  const activeBreadcrumb = useMemo(() => {
    if (ROUTE_BREADCRUMBS[location.pathname]) {
      return ROUTE_BREADCRUMBS[location.pathname];
    }
    if (location.pathname.startsWith('/maintenance/')) {
      const id = location.pathname.split('/')[2];
      return { section: 'OPERATIONS', title: `ASSET DOSSIER // ${id}` };
    }
    return { section: 'HEADQUARTERS', title: 'TRI-SERVICES LOGISTICS' };
  }, [location.pathname]);

  const handleLogout = () => {
    logout();
    navigate('/', { replace: true });
  };

  return (
    <header className="top-status-bar" role="banner">
      <div className="status-bar-left">
        {hasSidebar && (
          <button
            type="button"
            className="mobile-hamburger-btn"
            onClick={onToggleMobileSidebar}
            aria-label="Toggle navigation drawer"
          >
            <Menu size={18} />
          </button>
        )}

        <div className="status-bar-breadcrumbs font-mono">
          <Link to="/" className="breadcrumb-root">IAF-LOG</Link>
          <ChevronRight size={12} className="breadcrumb-arrow" />
          <span className="breadcrumb-section">{activeBreadcrumb.section}</span>
          <ChevronRight size={12} className="breadcrumb-arrow" />
          <span className="breadcrumb-title">{activeBreadcrumb.title}</span>
        </div>
      </div>

      <div className="status-bar-right">
        {/* SIM DATE Chip */}
        <div className="status-chip sim-date-chip font-mono" title="Simulated as-of evaluation date">
          <Calendar size={13} className="text-sand" />
          <span>SIM DATE: {SIMULATED_AS_OF_LABEL.toUpperCase()}</span>
        </div>

        {/* Predictive Alerts Bell */}
        {isAuthenticated && (
          <Link
            to="/alerts"
            className="status-bell-link font-mono"
            title={`${alertSummary.totalAlertsCount} predictive early warnings active`}
            aria-label={`View alerts (${alertSummary.totalAlertsCount} active)`}
          >
            <Bell size={16} />
            {alertSummary.totalAlertsCount > 0 ? (
              <span className="status-bell-badge">{alertSummary.totalAlertsCount}</span>
            ) : (
              <span className="status-bell-dot" />
            )}
          </Link>
        )}

        {/* User Persona Chip / Login Button */}
        {isAuthenticated && currentUser ? (
          <div className="status-user-chip">
            <div className="user-chip-avatar font-mono" aria-hidden="true">
              <User size={13} />
            </div>
            <div className="user-chip-meta">
              <span className="user-chip-name">{currentUser.name}</span>
              <span className={`user-chip-role role-${currentUser.role} font-mono`}>
                {currentUser.roleLabel || currentUser.role}
              </span>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="status-logout-btn"
              title="Sign Out"
              aria-label="Sign out"
            >
              <LogOut size={14} />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => openLoginModal(location.pathname)}
            className="status-login-btn font-mono military-lift"
          >
            <LogIn size={14} />
            <span>SIGN IN</span>
          </button>
        )}
      </div>

      {/* Subtle Tri-Services Accent Stripe */}
      <div className="status-bar-bottom-accent" aria-hidden="true" />
    </header>
  );
}
