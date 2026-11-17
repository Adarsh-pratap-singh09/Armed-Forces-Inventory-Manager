/**
 * Panel UI Component
 * Tactical command console card with title bar, icon, action slot, corner brackets,
 * and optional faint inner grid background.
 */
export default function Panel({
  title,
  icon: Icon,
  actions,
  badge,
  hasGrid = false,
  className = '',
  children,
  style = {}
}) {
  return (
    <div className={`console-panel ${hasGrid ? 'panel-grid-bg' : ''} ${className}`} style={style}>
      {/* Corner Bracket Accents */}
      <span className="panel-bracket bracket-tl" aria-hidden="true" />
      <span className="panel-bracket bracket-tr" aria-hidden="true" />
      <span className="panel-bracket bracket-bl" aria-hidden="true" />
      <span className="panel-bracket bracket-br" aria-hidden="true" />

      {/* Panel Title Bar */}
      {(title || Icon || actions) && (
        <div className="panel-header">
          <div className="panel-title-wrap">
            {Icon && <Icon size={16} className="panel-header-icon text-sand" />}
            {title && <h3 className="panel-title font-mono">{title}</h3>}
            {badge && <span className="panel-badge font-mono">{badge}</span>}
          </div>
          {actions && <div className="panel-actions">{actions}</div>}
        </div>
      )}

      {/* Panel Body */}
      <div className="panel-body">{children}</div>
    </div>
  );
}
