/**
 * SegmentedControl UI Component
 * Tactile console tab / pill selector with clean active state and keyboard access.
 */
export default function SegmentedControl({
  options = [],
  value,
  onChange,
  size = 'md', // 'sm' | 'md'
  className = ''
}) {
  return (
    <div
      className={`segmented-control size-${size} font-mono ${className}`}
      role="radiogroup"
    >
      {options.map((opt) => {
        const isSelected = opt.id === value || opt.value === value;
        const Icon = opt.icon;
        return (
          <button
            key={opt.id || opt.value}
            type="button"
            role="radio"
            aria-checked={isSelected}
            onClick={() => onChange(opt.id || opt.value)}
            className={`segmented-item ${isSelected ? 'selected' : ''}`}
          >
            {Icon && <Icon size={14} className="segmented-icon" />}
            <span className="segmented-label">{opt.label || opt.name}</span>
            {opt.badge !== undefined && (
              <span className="segmented-badge">{opt.badge}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
