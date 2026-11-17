/**
 * Audit Log Context
 * 
 * Records system actions across authentication, inventory modifications,
 * requisition workflows, and user account management.
 * Persists to localStorage.
 */

import { createContext, useContext, useState, useEffect } from 'react';
import { INITIAL_AUDIT_LOGS } from '../data/auditLogs.js';

const STORAGE_KEY = 'iaf_audit_logs_v2';

const AuditContext = createContext(null);

export function AuditProvider({ children }) {
  const [auditLogs, setAuditLogs] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Failed to parse audit logs from localStorage:', e);
    }
    return INITIAL_AUDIT_LOGS;
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(auditLogs));
    } catch (e) {
      console.warn('Failed to save audit logs to localStorage:', e);
    }
  }, [auditLogs]);

  /**
   * Appends an audit log entry.
   */
  const logAction = ({ user, actionType, actionLabel, description }) => {
    const now = new Date();
    const formatted = now.toLocaleString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    const newEntry = {
      id: `AUD-${String(auditLogs.length + 1).padStart(4, '0')}`,
      timestamp: now.toISOString(),
      timestampFormatted: formatted,
      userId: user?.id || 'guest',
      userName: user?.name || 'Guest / System',
      userRole: user?.role || 'guest',
      actionType,
      actionLabel: actionLabel || actionType,
      description
    };

    setAuditLogs((prev) => [newEntry, ...prev]);
  };

  return (
    <AuditContext.Provider value={{ auditLogs, logAction }}>
      {children}
    </AuditContext.Provider>
  );
}

export function useAudit() {
  const context = useContext(AuditContext);
  if (!context) {
    throw new Error('useAudit must be used within an AuditProvider');
  }
  return context;
}
