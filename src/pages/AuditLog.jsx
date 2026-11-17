/**
 * Audit Log Page ( /audit )
 * 
 * Accessible to Commander and System Administrator.
 * Records operational activities: authentication events, stock adjustments,
 * requisition approvals/rejections/fulfillments, and user profile management.
 */

import { useState, useMemo } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { useAudit } from '../context/AuditContext.jsx';
import PageHero from '../components/PageHero.jsx';
import { ShieldCheck, AlertTriangle, Terminal, Filter, Search } from 'lucide-react';
import { KpiTile } from '../components/ui/index.js';

function getAuditCategory(log) {
  const type = log.actionType || '';
  if (type === 'login' || type === 'logout') {
    return { code: 'AUTH', label: 'AUTH', classCat: 'cat-AUTH' };
  }
  if (type === 'inventory_add') {
    return { code: 'STOCK_CREATE', label: 'STOCK_CREATE', classCat: 'cat-STOCK' };
  }
  if (type === 'inventory_edit') {
    return { code: 'STOCK_UPDATE', label: 'STOCK_UPDATE', classCat: 'cat-STOCK' };
  }
  if (type === 'inventory_delete') {
    return { code: 'STOCK_DELETE', label: 'STOCK_DELETE', classCat: 'cat-SYS' };
  }
  if (type === 'requisition_create') {
    return { code: 'REQ_CREATE', label: 'REQ_CREATE', classCat: 'cat-REQ' };
  }
  if (type === 'requisition_approve') {
    return { code: 'REQ_APPROVE', label: 'REQ_APPROVE', classCat: 'cat-STOCK' };
  }
  if (type === 'requisition_reject') {
    return { code: 'REQ_REJECT', label: 'REQ_REJECT', classCat: 'cat-SYS' };
  }
  if (type === 'requisition_fulfil') {
    return { code: 'REQ_FULFILL', label: 'REQ_FULFILL', classCat: 'cat-STOCK' };
  }
  if (type === 'system_reset') {
    return { code: 'RESET', label: 'RESET', classCat: 'cat-SYS' };
  }
  if (type.startsWith('maintenance_')) {
    return { code: 'MAINT', label: 'MAINT', classCat: 'cat-AUTH' };
  }
  return { code: 'SYS', label: 'SYS', classCat: 'cat-SYS' };
}

export default function AuditLog() {
  const { isCommander, isAdmin } = useAuth();
  const { auditLogs } = useAudit();

  const [userFilter, setUserFilter] = useState('all');
  const [actionCategoryFilter, setActionCategoryFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Extract unique users for filtering
  const uniqueUsers = useMemo(() => {
    const map = new Map();
    auditLogs.forEach((log) => {
      if (log.userId && !map.has(log.userId)) {
        map.set(log.userId, { id: log.userId, name: log.userName, role: log.userRole });
      }
    });
    return Array.from(map.values());
  }, [auditLogs]);

  // Action category mapping helper
  const matchesCategory = (actionType, category) => {
    if (category === 'all') return true;
    if (category === 'auth') return actionType === 'login' || actionType === 'logout';
    if (category === 'inventory') return actionType?.startsWith('inventory_') || actionType === 'system_reset';
    if (category === 'requisition') return actionType?.startsWith('requisition_');
    if (category === 'maintenance') return actionType?.startsWith('maintenance_');
    if (category === 'user_management') return actionType === 'user_management';
    return true;
  };

  // Filter logs
  const filteredLogs = useMemo(() => {
    return auditLogs.filter((log) => {
      if (userFilter !== 'all' && log.userId !== userFilter) return false;
      if (!matchesCategory(log.actionType, actionCategoryFilter)) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const inDesc = log.description?.toLowerCase().includes(q);
        const inUser = log.userName?.toLowerCase().includes(q);
        const inLabel = log.actionLabel?.toLowerCase().includes(q);
        const inId = log.id?.toLowerCase().includes(q);
        if (!inDesc && !inUser && !inLabel && !inId) return false;
      }

      return true;
    });
  }, [auditLogs, userFilter, actionCategoryFilter, searchQuery]);

  // Counts for KPIs
  const authCount = auditLogs.filter((l) => l.actionType === 'login' || l.actionType === 'logout').length;
  const stockCount = auditLogs.filter((l) => l.actionType?.startsWith('inventory_')).length;
  const reqCount = auditLogs.filter((l) => l.actionType?.startsWith('requisition_')).length;

  // If accessed by non-authorized role
  if (!isCommander && !isAdmin) {
    return (
      <div className="page-container">
        <div style={{ padding: '4rem 1rem', textAlign: 'center' }}>
          <AlertTriangle size={36} color="var(--brick)" />
          <h3 style={{ marginTop: '1rem', color: 'var(--text)' }}>Restricted Access</h3>
          <p style={{ color: 'var(--text-muted)', maxWidth: '480px', margin: '0.5rem auto' }}>
            The operational audit trail is reserved for Commanders and System Administrators.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="audit-page fade-in-section">
      <PageHero
        theme="audit"
        sectorCode="IMMUTABLE-LEDGER"
        title="ENTERPRISE AUDIT & SYSTEM LEDGER"
        tagline="Cryptographic and immutable audit records of all user authentication, stock modifications, requisition approvals, and access controls."
        icon={ShieldCheck}
        badge={`${auditLogs.length} LOGGED EVENTS`}
      />

      <div className="page-container hero-overlap-content">
        {/* KPI Strip */}
        <div className="console-kpi-row" style={{ marginBottom: '22px' }}>
          <KpiTile
            label="TOTAL AUDIT EVENTS"
            value={auditLogs.length}
            hint="Append-only cryptographic store"
            variant="sand"
          />

          <KpiTile
            label="AUTH & ACCESS LOGS"
            value={authCount}
            hint="Sign-in & credential sessions"
            variant="steel"
          />

          <KpiTile
            label="STOCK LEDGER TRANSACTIONS"
            value={stockCount}
            hint="Material level updates & counts"
            variant="sage"
          />

          <KpiTile
            label="REQUISITION ACTIONS"
            value={reqCount}
            hint="Authorizations, rejections & receipts"
            variant="amber"
          />
        </div>

        {/* Compact Filter Toolbar */}
        <div className="filter-card card-bracket" style={{ marginBottom: '20px' }}>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center', flex: 1 }}>
              <Filter size={14} className="text-sand" />

              <div style={{ minWidth: '220px', flex: 1 }}>
                <div style={{ position: 'relative' }}>
                  <Search size={14} style={{ position: 'absolute', left: 10, top: 11, color: 'var(--muted)' }} />
                  <input
                    type="text"
                    placeholder="Search action or keywords..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="form-input"
                    style={{ paddingLeft: '32px', height: '36px', fontSize: '12px' }}
                  />
                </div>
              </div>

              <div style={{ minWidth: '180px' }}>
                <select
                  value={userFilter}
                  onChange={(e) => setUserFilter(e.target.value)}
                  className="form-select"
                  style={{ height: '36px', fontSize: '12px' }}
                >
                  <option value="all">All Personnel</option>
                  {uniqueUsers.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ minWidth: '180px' }}>
                <select
                  value={actionCategoryFilter}
                  onChange={(e) => setActionCategoryFilter(e.target.value)}
                  className="form-select"
                  style={{ height: '36px', fontSize: '12px' }}
                >
                  <option value="all">All Categories</option>
                  <option value="requisition">Requisitions (Approval / Fulfillment)</option>
                  <option value="maintenance">Fleet Maintenance (Service / Repairs)</option>
                  <option value="inventory">Inventory Adjustments</option>
                  <option value="auth">Logins &amp; Logouts</option>
                  <option value="user_management">User &amp; Role Management</option>
                </select>
              </div>
            </div>

            {(userFilter !== 'all' || actionCategoryFilter !== 'all' || searchQuery) && (
              <button
                type="button"
                className="btn-outline-sand"
                style={{ padding: '6px 12px', fontSize: '11px' }}
                onClick={() => {
                  setUserFilter('all');
                  setActionCategoryFilter('all');
                  setSearchQuery('');
                }}
              >
                Reset Filters
              </button>
            )}
          </div>
        </div>

        {/* Terminal-Style Live Feed */}
        <div className="audit-terminal-container">
          <div className="audit-terminal-header font-mono">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Terminal size={14} className="text-sand" />
              <span>SYS // AUDIT-STREAM LIVE</span>
              <span className="live-dot" />
            </div>
            <span>Showing {filteredLogs.length} of {auditLogs.length} records</span>
          </div>

          <div className="audit-terminal-body">
            {filteredLogs.length === 0 ? (
              <div style={{ padding: '36px', textAlign: 'center', color: 'var(--muted)' }}>
                No audit records match the current filter query.
              </div>
            ) : (
              filteredLogs.map((log) => {
                const cat = getAuditCategory(log);

                return (
                  <div key={log.id} className="audit-terminal-row font-mono">
                    <span className="audit-terminal-time">{log.timestampFormatted}</span>
                    <span className={`audit-terminal-cat ${cat.classCat}`}>{cat.label}</span>
                    <span className="audit-terminal-desc">
                      {log.description}
                    </span>
                    <span className="audit-terminal-user">
                      {log.userName}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
