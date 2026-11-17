import { useLocation, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import PageHero from './PageHero.jsx';
import { ShieldAlert, KeyRound, Lock } from 'lucide-react';

const ROUTE_HERO_DEFAULTS = {
  '/dashboard': {
    theme: 'dashboard',
    title: 'OPERATIONAL LOGISTICS DASHBOARD',
    tagline: 'Enterprise overview across 8 depots: inventory health, fleet status, and replenishment alerts.',
    sectorCode: 'DASHBOARD'
  },
  '/inventory': {
    theme: 'inventory',
    title: 'CONTINUOUS-REVIEW INVENTORY LEDGER',
    tagline: 'Real-time stock on hand, reorder thresholds, and active depot replenishment lines.',
    sectorCode: 'INVENTORY'
  },
  '/demand': {
    theme: 'home',
    title: 'DEMAND DYNAMICS & OPERATIONAL SURGE EXPLORER',
    tagline: '104-week empirical consumption series across seasonal cycles and exercise surges.',
    sectorCode: 'DEMAND'
  },
  '/forecast': {
    theme: 'forecast',
    title: 'DEMAND FORECASTING & STOCK-OUT RUNWAY',
    tagline: '26-week forward projections and forward depletion modeling using pure algorithms.',
    sectorCode: 'FORECAST'
  },
  '/alerts': {
    theme: 'alerts',
    title: 'PREDICTIVE ALERTS & EARLY WARNING CENTRE',
    tagline: 'Automated early warning engine detecting stockouts and vehicle maintenance ahead of static ROP.',
    sectorCode: 'ALERTS'
  },
  '/maintenance': {
    theme: 'maintenance',
    title: 'TACTICAL VEHICLE MAINTENANCE TRACKER',
    tagline: 'Operational readiness, service intervals, and run-hour projections across 30 vehicles.',
    sectorCode: 'MAINTENANCE'
  },
  '/requisitions': {
    theme: 'requisitions',
    title: 'PROCUREMENT REQUISITIONS & INDENT DISPATCH',
    tagline: 'Multi-echelon indent authorization pipeline, commander approvals, and depot fulfillment.',
    sectorCode: 'REQUISITIONS'
  },
  '/experiments': {
    theme: 'experiments',
    title: 'EMPIRICAL FORECASTING BENCHMARK LAB',
    tagline: 'Rolling-origin backtesting across 90 synthetic series, 8 algorithms, and 2,000 bootstrap resamples.',
    sectorCode: 'EXPERIMENTS'
  },
  '/users': {
    theme: 'users',
    title: 'PERSONNEL ACCESS & ROLE DIRECTORY',
    tagline: 'Tri-Services access governance and authorized personnel roster management.',
    sectorCode: 'PERSONNEL'
  },
  '/audit': {
    theme: 'audit',
    title: 'ENTERPRISE AUDIT & SYSTEM LEDGER',
    tagline: 'Immutable operational audit trail logging authentications, stock edits, and approvals.',
    sectorCode: 'AUDIT'
  },
  '/about': {
    theme: 'about',
    title: 'METHOD AND DATA DOCUMENTATION',
    tagline: 'Theoretical formulations, India-specific operational factors, and analytical limitations.',
    sectorCode: 'DOCS'
  }
};

/**
 * Route protection wrapper.
 * When logged out, displays that page's specific Hero banner along with a centered
 * "Login Required" card that triggers the Login modal and returns the user to the target path.
 */
export default function ProtectedRoute({ children, heroProps, allowedRoles }) {
  const { isAuthenticated, currentUser, openLoginModal } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    // Resolve hero for the attempted route
    const resolvedHero = heroProps || ROUTE_HERO_DEFAULTS[location.pathname] || {
      theme: 'dashboard',
      title: 'RESTRICTED LOGISTICS SECTOR',
      tagline: 'Session authentication required to access classified operational supply data.',
      sectorCode: 'RESTRICTED'
    };

    return (
      <div className="protected-gate-view fade-in-section">
        <PageHero
          theme={resolvedHero.theme}
          title={resolvedHero.title}
          tagline={resolvedHero.tagline}
          sectorCode={resolvedHero.sectorCode}
          icon={ShieldAlert}
        />

        <div className="login-required-container">
          <div className="login-required-card military-chamfer">
            <div className="login-required-top-bar" />
            <div className="login-required-icon-ring">
              <Lock size={30} className="text-sand" />
            </div>

            <h2 className="login-required-title">
              AUTHENTICATION REQUIRED
            </h2>
            <p className="login-required-desc">
              Access to this operational logistics sector is restricted to authenticated Tri-Services Store Officers, Operations Commanders, and Logistics Administrators.
            </p>

            <div className="login-required-meta-box font-mono">
              <span className="login-req-label">REQUESTED ROUTE:</span>
              <span className="login-req-val">{location.pathname}</span>
            </div>

            <button
              type="button"
              onClick={() => openLoginModal(location.pathname)}
              className="login-required-trigger-btn military-lift"
            >
              <KeyRound size={16} />
              <span>Sign In to Access This Page</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Validate allowed roles if specified
  if (allowedRoles && Array.isArray(allowedRoles) && !allowedRoles.includes(currentUser?.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}
