import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { INITIAL_USERS } from '../data/users.js';
import {
  Shield,
  User,
  Lock,
  AlertCircle,
  X,
  KeyRound,
  CheckCircle2,
  ArrowRight
} from 'lucide-react';

export default function LoginModal() {
  const { isLoginModalOpen, closeLoginModal, login, intendedPath } = useAuth();
  const navigate = useNavigate();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [selectedPreset, setSelectedPreset] = useState(null);

  const dialogRef = useRef(null);
  const usernameInputRef = useRef(null);
  const previousFocusRef = useRef(null);

  // Focus management & Escape key
  useEffect(() => {
    if (isLoginModalOpen) {
      previousFocusRef.current = document.activeElement;
      // Focus username input once modal mounts
      const timer = setTimeout(() => {
        usernameInputRef.current?.focus();
      }, 50);

      const handleKeyDown = (e) => {
        if (e.key === 'Escape') {
          e.preventDefault();
          closeLoginModal();
          return;
        }

        // Focus trap
        if (e.key === 'Tab' && dialogRef.current) {
          const focusable = dialogRef.current.querySelectorAll(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
          );
          if (focusable.length === 0) return;

          const first = focusable[0];
          const last = focusable[focusable.length - 1];

          if (e.shiftKey && document.activeElement === first) {
            e.preventDefault();
            last.focus();
          } else if (!e.shiftKey && document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      };

      window.addEventListener('keydown', handleKeyDown);
      return () => {
        clearTimeout(timer);
        window.removeEventListener('keydown', handleKeyDown);
        if (previousFocusRef.current && typeof previousFocusRef.current.focus === 'function') {
          previousFocusRef.current.focus();
        }
      };
    }
  }, [isLoginModalOpen, closeLoginModal]);

  if (!isLoginModalOpen) {
    return null;
  }

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    try {
      const result = login(username, password);
      closeLoginModal();
      const destination = result?.targetPath || intendedPath || '/dashboard';
      navigate(destination, { replace: true });
    } catch (err) {
      setError(err.message || 'Authentication failed. Please verify credentials.');
    }
  };

  const handleQuickFill = (user) => {
    setUsername(user.username);
    setPassword(user.password);
    setSelectedPreset(user.username);
    setError('');
    usernameInputRef.current?.focus();
  };

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      closeLoginModal();
    }
  };

  return (
    <div
      className="modal-backdrop-blur"
      onClick={handleBackdropClick}
      role="presentation"
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="login-dialog-title"
        className="login-modal-card military-chamfer-lg"
      >
        {/* Top Military Stripe Accent */}
        <div className="login-modal-top-accent" />

        {/* Modal Header */}
        <div className="login-modal-header">
          <div className="login-modal-brand">
            <div className="login-modal-shield-wrap">
              <Shield size={20} className="text-sand" />
            </div>
            <div>
              <span className="login-modal-tag font-mono">IAF-LOG // SECURE ACCESS GATE</span>
              <h2 id="login-dialog-title" className="login-modal-title">
                PERSONNEL AUTHENTICATION
              </h2>
            </div>
          </div>
          <button
            type="button"
            onClick={closeLoginModal}
            className="modal-close-btn"
            aria-label="Close authentication dialog"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="login-modal-body">
          {error && (
            <div className="login-error-alert" role="alert">
              <AlertCircle size={16} className="text-brick" />
              <span>{error}</span>
            </div>
          )}

          {intendedPath && (
            <div className="login-intended-path font-mono">
              <span>TARGET SECTOR:</span> <code>{intendedPath}</code>
            </div>
          )}

          <form onSubmit={handleSubmit} className="login-form">
            <div className="form-field">
              <label htmlFor="modal-username" className="form-label">
                <User size={14} className="inline-label-icon text-sand" />
                <span>Username or Call-Sign</span>
              </label>
              <input
                ref={usernameInputRef}
                id="modal-username"
                type="text"
                autoComplete="username"
                placeholder="e.g. rthakur, arao, smenon..."
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value);
                  setSelectedPreset(null);
                }}
                className="form-input font-mono"
                required
              />
            </div>

            <div className="form-field">
              <label htmlFor="modal-password" className="form-label">
                <Lock size={14} className="inline-label-icon text-sand" />
                <span>Access Passcode</span>
              </label>
              <input
                id="modal-password"
                type="password"
                autoComplete="current-password"
                placeholder="Enter passcode..."
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setSelectedPreset(null);
                }}
                className="form-input font-mono"
                required
              />
            </div>

            <button type="submit" className="login-submit-btn military-lift">
              <KeyRound size={16} />
              <span>Authenticate Session</span>
              <ArrowRight size={16} className="btn-arrow-icon" />
            </button>
          </form>

          {/* Quick-Select Demo Personas */}
          <div className="login-quick-select-wrap">
            <div className="quick-select-header">
              <span className="quick-select-title font-mono">AUTHORIZED DEMO CREDENTIALS</span>
              <span className="quick-select-hint">Click any persona below to auto-fill credentials</span>
            </div>

            <div className="demo-credentials-list" role="list">
              {INITIAL_USERS.map((user) => {
                const isSelected = selectedPreset === user.username;
                const initials = user.name
                  .replace(/^(Maj|Capt|Lt Cdr|Brig|Lt Col|Col)\s+/i, '')
                  .split(' ')
                  .map((w) => w[0])
                  .filter(Boolean)
                  .join('')
                  .toUpperCase() || 'IAF';

                const formattedRole = user.roleLabel || (
                  user.role === 'store_officer'
                    ? 'Store Officer'
                    : user.role === 'commander'
                    ? 'Commander'
                    : 'Admin'
                );

                const depotDisplay = user.depotName
                  ? `${user.depotName} Depot (${user.service || 'Joint'})`
                  : 'HQ Command (All Depots)';

                return (
                  <button
                    key={user.username}
                    type="button"
                    onClick={() => handleQuickFill(user)}
                    className={`demo-persona-card ${isSelected ? 'active-persona' : ''} military-lift`}
                    aria-label={`Select ${user.name}, ${formattedRole}`}
                  >
                    <div className="persona-avatar-wrap" aria-hidden="true">
                      <span className="persona-avatar-initials font-mono">{initials}</span>
                    </div>

                    <div className="persona-info-col">
                      <div className="persona-name-row">
                        <span className="persona-name">{user.name}</span>
                        <span className={`persona-role-chip role-${user.role} font-mono`}>
                          {formattedRole}
                        </span>
                      </div>
                      <div className="persona-meta-row font-mono">
                        <span className="persona-depot">{depotDisplay}</span>
                        <span className="persona-divider">•</span>
                        <span className="persona-user">user: <code>{user.username}</code></span>
                      </div>
                    </div>

                    <div className="persona-action-col" aria-hidden="true">
                      {isSelected ? (
                        <CheckCircle2 size={18} className="text-sage" />
                      ) : (
                        <div className="persona-use-btn font-mono">
                          <span>USE</span>
                          <ArrowRight size={13} />
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Modal Footer Note */}
        <div className="login-modal-footer font-mono">
          <span>CLASSIFICATION: UNCLASSIFIED // ACADEMIC RESEARCH SIMULATION</span>
        </div>
      </div>
    </div>
  );
}
