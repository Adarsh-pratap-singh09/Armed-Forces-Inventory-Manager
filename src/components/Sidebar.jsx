import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import {
  LayoutDashboard,
  Package,
  ClipboardList,
  Wrench,
  TrendingUp,
  Activity,
  AlertTriangle,
  FlaskConical,
  Users,
  ShieldAlert,
  FileText,
  ChevronLeft,
  ChevronRight,
  Shield,
  X
} from 'lucide-react';

export default function Sidebar({
  isCollapsed,
  setIsCollapsed,
  isOpenOnMobile,
  setIsOpenOnMobile
}) {
  const { currentUser, isStoreOfficer, isCommander, isAdmin } = useAuth();

  const handleLinkClick = () => {
    if (isOpenOnMobile) {
      setIsOpenOnMobile(false);
    }
  };

  // Define navigation groups with role permissions
  const navGroups = [
    {
      group: 'OPERATIONS',
      items: [
        { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
        { label: 'Inventory', path: '/inventory', icon: Package },
        { label: 'Requisitions', path: '/requisitions', icon: ClipboardList },
        { label: 'Maintenance', path: '/maintenance', icon: Wrench }
      ]
    },
    {
      group: 'INTELLIGENCE',
      items: [
        { label: 'Demand Explorer', path: '/demand', icon: TrendingUp },
        { label: 'Forecast', path: '/forecast', icon: Activity },
        { label: 'Alerts', path: '/alerts', icon: AlertTriangle },
        { label: 'Experiments', path: '/experiments', icon: FlaskConical }
      ]
    },
    {
      group: 'ADMIN',
      items: [
        ...(isAdmin ? [{ label: 'Users', path: '/users', icon: Users }] : []),
        ...(isCommander || isAdmin
          ? [{ label: 'Audit Log', path: '/audit', icon: ShieldAlert }]
          : [])
      ]
    },
    {
      group: 'REFERENCE',
      items: [
        { label: 'Method & Data', path: '/about', icon: FileText }
      ]
    }
  ];

  return (
    <>
      {/* Mobile Drawer Backdrop Overlay */}
      {isOpenOnMobile && (
        <div
          className="sidebar-mobile-backdrop"
          onClick={() => setIsOpenOnMobile(false)}
          aria-hidden="true"
        />
      )}

      <aside
        className={`console-sidebar ${isCollapsed ? 'collapsed' : 'expanded'} ${
          isOpenOnMobile ? 'mobile-open' : ''
        }`}
        aria-label="Tactical Operations Navigation"
      >
        {/* Sidebar Brand / Header */}
        <div className="sidebar-brand-row">
          <div className="sidebar-brand-badge font-mono">
            <Shield size={18} className="text-sand" />
            {!isCollapsed && <span className="sidebar-brand-text">IAF-LOG CONSOLE</span>}
          </div>
          {isOpenOnMobile && (
            <button
              type="button"
              className="sidebar-mobile-close"
              onClick={() => setIsOpenOnMobile(false)}
              aria-label="Close navigation"
            >
              <X size={18} />
            </button>
          )}
        </div>

        {/* User Scope Banner (When expanded) */}
        {!isCollapsed && currentUser && (
          <div className="sidebar-user-scope font-mono">
            <div className="sidebar-scope-tag">
              <span className="scope-dot" />
              <span>
                {isStoreOfficer
                  ? `${currentUser.depotName.toUpperCase()} DEPOT`
                  : isCommander
                  ? 'THEATRE COMMAND'
                  : 'SYSTEM ADMIN'}
              </span>
            </div>
          </div>
        )}

        {/* Grouped Navigation Links */}
        <nav className="sidebar-nav-container">
          {navGroups.map((group) => {
            if (group.items.length === 0) return null;
            return (
              <div key={group.group} className="sidebar-nav-group">
                {!isCollapsed ? (
                  <div className="sidebar-group-heading font-mono">{group.group}</div>
                ) : (
                  <div className="sidebar-group-divider" />
                )}
                <ul className="sidebar-menu-list">
                  {group.items.map((item) => {
                    const IconComponent = item.icon;
                    return (
                      <li key={item.path} className="sidebar-menu-item">
                        <NavLink
                          to={item.path}
                          onClick={handleLinkClick}
                          className={({ isActive }) =>
                            `sidebar-nav-link ${isActive ? 'active' : ''} ${
                              isCollapsed ? 'collapsed' : ''
                            }`
                          }
                          title={isCollapsed ? item.label : undefined}
                        >
                          <span className="sidebar-active-indicator" />
                          <IconComponent size={18} className="sidebar-nav-icon" />
                          {!isCollapsed && (
                            <span className="sidebar-nav-label">{item.label}</span>
                          )}
                        </NavLink>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </nav>

        {/* Bottom Desktop Collapse/Expand Toggle */}
        <div className="sidebar-bottom-controls">
          <button
            type="button"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="sidebar-collapse-btn font-mono"
            aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {isCollapsed ? (
              <ChevronRight size={16} />
            ) : (
              <>
                <ChevronLeft size={16} />
                <span>COLLAPSE</span>
              </>
            )}
          </button>
        </div>
      </aside>
    </>
  );
}
