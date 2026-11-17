/**
 * Users Management Page ( /users )
 * 
 * Accessible to System Administrator only.
 * Allows managing user accounts: adding new personnel, updating role or assigned depot,
 * and activating / deactivating access.
 */

import { useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import PageHero from '../components/PageHero.jsx';
import { DEPOTS } from '../data/index.js';
import { ROLE_LABELS } from '../data/users.js';
import {
  UserPlus,
  Edit2,
  UserX,
  UserCheck,
  AlertTriangle,
  X,
  Users as UsersIcon,
  Key,
  MapPin
} from 'lucide-react';
import { KpiTile, StatusChip, Field } from '../components/ui/index.js';

export default function Users() {
  const { users, addUser, updateUser, toggleUserStatus, currentUser, isAdmin } = useAuth();

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);

  // New user form state
  const [newName, setNewName] = useState('');
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState('store_officer');
  const [newDepotId, setNewDepotId] = useState(DEPOTS[0]?.id || 'leh');
  const [addError, setAddError] = useState('');

  // Edit user form state
  const [editRole, setEditRole] = useState('store_officer');
  const [editDepotId, setEditDepotId] = useState('');
  const [editError, setEditError] = useState('');

  if (!isAdmin) {
    return (
      <div className="page-container">
        <div style={{ padding: '4rem 1rem', textAlign: 'center' }}>
          <AlertTriangle size={36} color="var(--brick)" />
          <h3 style={{ marginTop: '1rem', color: 'var(--text)' }}>Restricted Access</h3>
          <p style={{ color: 'var(--text-muted)', maxWidth: '480px', margin: '0.5rem auto' }}>
            User management is strictly reserved for the System Administrator (Lt Col P. Bose).
          </p>
        </div>
      </div>
    );
  }

  // Open Add Modal
  const handleOpenAddModal = () => {
    setNewName('');
    setNewUsername('');
    setNewPassword('password123');
    setNewRole('store_officer');
    setNewDepotId(DEPOTS[0]?.id || 'leh');
    setAddError('');
    setIsAddModalOpen(true);
  };

  const handleAddSubmit = (e) => {
    e.preventDefault();
    setAddError('');
    try {
      addUser({
        name: newName,
        username: newUsername,
        password: newPassword,
        role: newRole,
        depotId: newRole === 'store_officer' ? newDepotId : 'all'
      });
      setIsAddModalOpen(false);
    } catch (err) {
      setAddError(err.message);
    }
  };

  // Open Edit Modal
  const handleOpenEditModal = (user) => {
    setEditingUser(user);
    setEditRole(user.role);
    setEditDepotId(user.depotId === 'all' ? (DEPOTS[0]?.id || 'leh') : user.depotId);
    setEditError('');
  };

  const handleEditSubmit = (e) => {
    e.preventDefault();
    setEditError('');
    try {
      updateUser(editingUser.id, {
        role: editRole,
        depotId: editRole === 'store_officer' ? editDepotId : 'all'
      });
      setEditingUser(null);
    } catch (err) {
      setEditError(err.message);
    }
  };

  const handleToggleStatus = (user) => {
    const actionVerb = user.status === 'active' ? 'deactivate' : 'activate';
    if (window.confirm(`Are you sure you want to ${actionVerb} account access for ${user.name} (@${user.username})?`)) {
      try {
        toggleUserStatus(user.id);
      } catch (err) {
        alert(err.message);
      }
    }
  };

  const activeAccountsCount = users.filter((u) => u.status === 'active').length;
  const storeOfficersCount = users.filter((u) => u.role === 'store_officer').length;

  return (
    <div className="users-page fade-in-section">
      <PageHero
        theme="users"
        sectorCode="ADMIN-ACCESS"
        title="PERSONNEL ACCESS & ROLE DIRECTORY"
        tagline="Tri-Services access governance: manage user accounts, assign operational roles, and enforce account credentials."
        icon={UsersIcon}
        badge="ADMINISTRATOR PRIVILEGES"
      >
        <div style={{ marginTop: '12px' }}>
          <button
            type="button"
            onClick={handleOpenAddModal}
            className="hero-btn hero-btn-primary military-lift"
          >
            <UserPlus size={15} />
            <span>Add Personnel Account</span>
          </button>
        </div>
      </PageHero>

      <div className="page-container hero-overlap-content">
        {/* KPI Strip */}
        <div className="console-kpi-row" style={{ marginBottom: '22px' }}>
          <KpiTile
            label="REGISTERED ACCOUNTS"
            value={users.length}
            hint="Total personnel roster"
            variant="sand"
          />

          <KpiTile
            label="ACTIVE CLEARANCES"
            value={activeAccountsCount}
            hint="Authenticated access enabled"
            variant="sage"
          />

          <KpiTile
            label="STORE OFFICERS"
            value={storeOfficersCount}
            hint="Assigned to forward bases"
            variant="steel"
          />

          <KpiTile
            label="GOVERNANCE MODEL"
            value="RBAC"
            hint="Role-Based Access Control"
            variant="amber"
          />
        </div>

        {/* ID-Card Style Grid */}
        <div className="users-card-grid">
          {users.map((user) => {
            const isSelf = user.id === currentUser?.id;
            const initials = user.name
              ? user.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
              : 'XX';

            return (
              <div key={user.id} className="user-id-card">
                <div className="user-id-header">
                  <div className="user-id-avatar">
                    {initials}
                  </div>

                  <div className="user-id-meta">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span className="user-id-name">{user.name}</span>
                      {isSelf && (
                        <span className="font-mono text-sand" style={{ fontSize: '10px', background: 'rgba(205, 191, 147, 0.15)', padding: '1px 5px', borderRadius: '2px' }}>
                          (You)
                        </span>
                      )}
                    </div>

                    <span className="user-id-rank font-mono">
                      {user.roleLabel || ROLE_LABELS[user.role] || user.role}
                    </span>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: 'var(--muted)' }}>
                      <MapPin size={11} className="text-sand" />
                      <span>{user.depotId === 'all' ? 'All Depots (Tri-Service HQ)' : user.depotName}</span>
                    </div>
                  </div>
                </div>

                {/* Credentials Callout */}
                <div className="user-id-credentials">
                  <span className="font-mono text-sand">@{user.username}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--muted)' }}>
                    <Key size={11} />
                    <span>demo123</span>
                  </div>
                </div>

                {/* Status & Actions Row */}
                <div className="user-id-status-row">
                  <StatusChip
                    status={user.status === 'active' ? 'Operational' : 'Inactive'}
                    variant={user.status === 'active' ? 'sage' : 'brick'}
                  />

                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      type="button"
                      className="btn-outline-sand"
                      style={{ padding: '3px 8px', fontSize: '11px' }}
                      onClick={() => handleOpenEditModal(user)}
                    >
                      <Edit2 size={11} style={{ marginRight: 4 }} /> Edit
                    </button>

                    {!isSelf && (
                      <button
                        type="button"
                        className={user.status === 'active' ? 'btn-action-warning' : 'btn-action-success'}
                        style={{ padding: '3px 8px', fontSize: '11px' }}
                        onClick={() => handleToggleStatus(user)}
                      >
                        {user.status === 'active' ? (
                          <>
                            <UserX size={11} style={{ marginRight: 4 }} /> Deactivate
                          </>
                        ) : (
                          <>
                            <UserCheck size={11} style={{ marginRight: 4 }} /> Activate
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Add User Modal */}
      {isAddModalOpen && (
        <div className="modal-backdrop" onClick={() => setIsAddModalOpen(false)}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <UserPlus size={18} className="text-sand" />
                <h3 className="modal-title font-mono">CREATE PERSONNEL ACCOUNT</h3>
              </div>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setIsAddModalOpen(false)}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddSubmit}>
              <div className="modal-body">
                {addError && (
                  <div className="error-banner">
                    <AlertTriangle size={16} />
                    <span>{addError}</span>
                  </div>
                )}

                <Field label="FULL NAME & RANK">
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Maj S. Sharma"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    required
                  />
                </Field>

                <Field label="LOGIN USERNAME">
                  <input
                    type="text"
                    className="form-input font-mono"
                    placeholder="e.g. ssharma"
                    value={newUsername}
                    onChange={(e) => setNewUsername(e.target.value.toLowerCase().replace(/\s+/g, ''))}
                    required
                  />
                </Field>

                <Field label="INITIAL PASSWORD">
                  <input
                    type="password"
                    className="form-input font-mono"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                  />
                </Field>

                <Field label="AUTHORIZATION ROLE">
                  <select
                    className="form-select"
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value)}
                  >
                    <option value="store_officer">Store Officer (Base level inventory &amp; indents)</option>
                    <option value="commander">Commander (Cross-theatre overview &amp; indent approvals)</option>
                    <option value="admin">System Administrator (RBAC and security logs)</option>
                  </select>
                </Field>

                {newRole === 'store_officer' && (
                  <Field label="ASSIGNED BASE / DEPOT">
                    <select
                      className="form-select"
                      value={newDepotId}
                      onChange={(e) => setNewDepotId(e.target.value)}
                    >
                      {DEPOTS.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.name} ({d.service})
                        </option>
                      ))}
                    </select>
                  </Field>
                )}
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setIsAddModalOpen(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary-olive">
                  Create Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {editingUser && (
        <div className="modal-backdrop" onClick={() => setEditingUser(null)}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Edit2 size={18} className="text-sand" />
                <h3 className="modal-title font-mono">EDIT ROLE &amp; ASSIGNMENT</h3>
              </div>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setEditingUser(null)}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleEditSubmit}>
              <div className="modal-body">
                {editError && (
                  <div className="error-banner">
                    <AlertTriangle size={16} />
                    <span>{editError}</span>
                  </div>
                )}

                <div style={{ fontSize: '12px', color: 'var(--text)', marginBottom: '10px' }}>
                  Modifying clearance for <strong>{editingUser.name}</strong> (@{editingUser.username}).
                </div>

                <Field label="AUTHORIZATION ROLE">
                  <select
                    className="form-select"
                    value={editRole}
                    onChange={(e) => setEditRole(e.target.value)}
                  >
                    <option value="store_officer">Store Officer</option>
                    <option value="commander">Commander</option>
                    <option value="admin">System Administrator</option>
                  </select>
                </Field>

                {editRole === 'store_officer' && (
                  <Field label="ASSIGNED BASE / DEPOT">
                    <select
                      className="form-select"
                      value={editDepotId}
                      onChange={(e) => setEditDepotId(e.target.value)}
                    >
                      {DEPOTS.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.name} ({d.service})
                        </option>
                      ))}
                    </select>
                  </Field>
                )}
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setEditingUser(null)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary-olive">
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
