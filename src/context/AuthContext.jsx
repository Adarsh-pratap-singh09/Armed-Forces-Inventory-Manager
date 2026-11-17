/**
 * Authentication & User Management Context
 * 
 * Provides:
 * - Current authenticated user state (stored in sessionStorage)
 * - User database (stored in localStorage with INITIAL_USERS fallback)
 * - Login / Logout functions with audit logging
 * - Role-based permissions checks
 * - Admin user management (add, edit, activate/deactivate)
 */

import { createContext, useContext, useState, useEffect } from 'react';
import { INITIAL_USERS, ROLE_LABELS } from '../data/users.js';
import { DEPOT_MAP } from '../data/depots.js';
import { useAudit } from './AuditContext.jsx';

const SESSION_USER_KEY = 'iaf_current_user_v2';
const USERS_STORAGE_KEY = 'iaf_users_v2';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const { logAction } = useAudit();

  // Users database stored in localStorage
  const [users, setUsers] = useState(() => {
    try {
      const saved = localStorage.getItem(USERS_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Failed to parse users from localStorage:', e);
    }
    return INITIAL_USERS;
  });

  // Current logged in user stored in sessionStorage
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const saved = sessionStorage.getItem(SESSION_USER_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.warn('Failed to parse current user from sessionStorage:', e);
    }
    return null;
  });

  // Modal Login Dialog state
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [intendedPath, setIntendedPath] = useState(null);

  const openLoginModal = (targetPath = null) => {
    if (targetPath) {
      setIntendedPath(targetPath);
    }
    setIsLoginModalOpen(true);
  };

  const closeLoginModal = () => {
    setIsLoginModalOpen(false);
  };

  // Persist users to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
    } catch (e) {
      console.warn('Failed to save users to localStorage:', e);
    }
  }, [users]);

  // Persist current session user to sessionStorage
  useEffect(() => {
    try {
      if (currentUser) {
        sessionStorage.setItem(SESSION_USER_KEY, JSON.stringify(currentUser));
      } else {
        sessionStorage.removeItem(SESSION_USER_KEY);
      }
    } catch (e) {
      console.warn('Failed to save current user to sessionStorage:', e);
    }
  }, [currentUser]);

  /**
   * Authenticates user against users database.
   */
  const login = (username, password) => {
    const cleanUser = username?.trim().toLowerCase();
    const foundUser = users.find(
      (u) => u.username.toLowerCase() === cleanUser && u.password === password
    );

    if (!foundUser) {
      throw new Error('Invalid username or password.');
    }

    if (foundUser.status === 'inactive') {
      throw new Error('This account has been deactivated. Please contact an Administrator.');
    }

    setCurrentUser(foundUser);
    setIsLoginModalOpen(false);

    logAction({
      user: foundUser,
      actionType: 'login',
      actionLabel: 'User Login',
      description: `${foundUser.name} logged into the system as ${foundUser.roleLabel}.`
    });

    const target = intendedPath;
    setIntendedPath(null);
    return { user: foundUser, targetPath: target };
  };

  /**
   * Logs out the current user.
   */
  const logout = () => {
    if (currentUser) {
      logAction({
        user: currentUser,
        actionType: 'logout',
        actionLabel: 'User Logout',
        description: `${currentUser.name} logged out.`
      });
    }
    setCurrentUser(null);
    try {
      sessionStorage.removeItem(SESSION_USER_KEY);
    } catch {
      // ignore
    }
  };

  /**
   * Adds a new user account (Admin only).
   */
  const addUser = ({ name, username, password, role, depotId }) => {
    if (currentUser?.role !== 'admin') {
      throw new Error('Access denied: Only administrators can register new users.');
    }

    const cleanUser = username?.trim().toLowerCase();
    if (!cleanUser || !password || !name) {
      throw new Error('Name, username, and password are required.');
    }

    if (users.some((u) => u.username.toLowerCase() === cleanUser)) {
      throw new Error(`Username "${cleanUser}" is already taken.`);
    }

    const depot = depotId === 'all' ? null : DEPOT_MAP[depotId];
    const newUser = {
      id: `user-${String(users.length + 1).padStart(3, '0')}`,
      username: cleanUser,
      password,
      name: name.trim(),
      role,
      roleLabel: ROLE_LABELS[role] || role,
      depotId: role === 'store_officer' ? depotId : 'all',
      depotName: role === 'store_officer' ? (depot?.shortName || depotId) : 'All Depots',
      service: depot?.service || 'Joint',
      status: 'active'
    };

    setUsers((prev) => [...prev, newUser]);

    logAction({
      user: currentUser,
      actionType: 'user_management',
      actionLabel: 'User Created',
      description: `Created user ${newUser.name} (@${newUser.username}) with role ${newUser.roleLabel}.`
    });

    return newUser;
  };

  /**
   * Updates an existing user account (Admin only).
   */
  const updateUser = (id, updates) => {
    if (currentUser?.role !== 'admin') {
      throw new Error('Access denied: Only administrators can modify users.');
    }

    setUsers((prev) =>
      prev.map((u) => {
        if (u.id !== id) return u;

        const role = updates.role || u.role;
        const depotId = role === 'store_officer' ? (updates.depotId || u.depotId) : 'all';
        const depot = depotId === 'all' ? null : DEPOT_MAP[depotId];

        const updated = {
          ...u,
          ...updates,
          role,
          roleLabel: ROLE_LABELS[role] || role,
          depotId,
          depotName: depotId === 'all' ? 'All Depots' : (depot?.shortName || depotId),
          service: depot?.service || u.service
        };

        logAction({
          user: currentUser,
          actionType: 'user_management',
          actionLabel: 'User Updated',
          description: `Updated profile for ${updated.name} (@${updated.username}).`
        });

        return updated;
      })
    );
  };

  /**
   * Toggles activation status of a user account (Admin only).
   */
  const toggleUserStatus = (id) => {
    if (currentUser?.role !== 'admin') {
      throw new Error('Access denied: Only administrators can change account activation.');
    }

    setUsers((prev) =>
      prev.map((u) => {
        if (u.id !== id) return u;
        if (u.id === currentUser.id) {
          throw new Error('Administrators cannot deactivate their own account.');
        }

        const nextStatus = u.status === 'active' ? 'inactive' : 'active';

        logAction({
          user: currentUser,
          actionType: 'user_management',
          actionLabel: nextStatus === 'active' ? 'User Activated' : 'User Deactivated',
          description: `${nextStatus === 'active' ? 'Activated' : 'Deactivated'} account for ${u.name} (@${u.username}).`
        });

        return { ...u, status: nextStatus };
      })
    );
  };

  // Helper flags
  const isAuthenticated = Boolean(currentUser);
  const isStoreOfficer = currentUser?.role === 'store_officer';
  const isCommander = currentUser?.role === 'commander';
  const isAdmin = currentUser?.role === 'admin';
  const userDepotId = currentUser?.depotId || null;

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        users,
        login,
        logout,
        addUser,
        updateUser,
        toggleUserStatus,
        isAuthenticated,
        isStoreOfficer,
        isCommander,
        isAdmin,
        userDepotId,
        isLoginModalOpen,
        intendedPath,
        openLoginModal,
        closeLoginModal
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
