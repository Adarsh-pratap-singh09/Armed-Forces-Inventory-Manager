import { NavLink, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { LogOut, LogIn, MapPin } from 'lucide-react';

export default function Navbar() {
  const { currentUser, isAuthenticated, isStoreOfficer, isCommander, isAdmin, logout, openLoginModal } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/', { replace: true });
  };

  return (
    <header className="navbar-container">
      <div className="navbar-inner">
        <div className="navbar-left-section">
          <Link to="/" className="navbar-brand">
            <span className="navbar-title">Indian Armed Forces Logistics and Inventory System</span>
            <span className="navbar-subtitle">Undergraduate academic simulation</span>
          </Link>

          <nav className="navbar-links">
            <NavLink
              to="/"
              end
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            >
              Home
            </NavLink>

            {isAuthenticated && (
              <>
                <NavLink
                  to="/dashboard"
                  className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                >
                  Dashboard
                </NavLink>

                <NavLink
                  to="/inventory"
                  className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                >
                  Inventory
                </NavLink>

                <NavLink
                  to="/demand"
                  className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                >
                  Demand Explorer
                </NavLink>

                <NavLink
                  to="/forecast"
                  className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                >
                  Forecast
                </NavLink>

                <NavLink
                  to="/alerts"
                  className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                >
                  Alerts
                </NavLink>

                <NavLink
                  to="/maintenance"
                  className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                >
                  Maintenance
                </NavLink>

                <NavLink
                  to="/requisitions"
                  className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                >
                  Requisitions
                </NavLink>

                <NavLink
                  to="/experiments"
                  className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                >
                  Experiments
                </NavLink>

                {isAdmin && (
                  <NavLink
                    to="/users"
                    className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                  >
                    Users
                  </NavLink>
                )}

                {(isCommander || isAdmin) && (
                  <NavLink
                    to="/audit"
                    className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                  >
                    Audit Log
                  </NavLink>
                )}
              </>
            )}

            <NavLink
              to="/about"
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            >
              Method and Data
            </NavLink>
          </nav>
        </div>

        {/* User Session Bar */}
        <div className="navbar-user-section">
          {isAuthenticated ? (
            <div className="user-profile-bar">
              <div className="user-profile-meta">
                <span className="user-profile-name">{currentUser.name}</span>
                <div className="user-badge-group">
                  <span className={`user-role-pill user-role-${currentUser.role}`}>
                    {currentUser.roleLabel}
                  </span>
                  {isStoreOfficer && currentUser.depotName && (
                    <span className="user-depot-pill">
                      <MapPin size={10} />
                      {currentUser.depotName}
                    </span>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={handleLogout}
                className="btn-logout"
                title="Log out of current session"
              >
                <LogOut size={14} />
                <span>Logout</span>
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => openLoginModal()}
              className="btn-nav-login military-lift"
              title="Open authentication dialog"
            >
              <LogIn size={14} />
              <span>Login</span>
            </button>
          )}
        </div>
      </div>
      <div className="navbar-tricolour-stripe" aria-hidden="true" />
    </header>
  );
}
