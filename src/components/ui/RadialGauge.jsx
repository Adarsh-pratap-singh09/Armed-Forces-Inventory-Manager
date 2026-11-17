/**
 * RadialGauge UI Component
 * Circular HUD meter displaying asset interval usage, stock ratios, or percentages.
 */
export default function RadialGauge({
  value = 0,
  max = 100,
  size = 110,
  strokeWidth = 9,
  label = '',
  sublabel = '',
  color,
  showPercentage = true,
  className = ''
}) {
  const percentage = Math.min(100, Math.max(0, max > 0 ? (value / max) * 100 : 0));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  // Resolve status color if not explicitly provided
  const resolvedColor = color || (
    percentage >= 90
      ? 'var(--brick)'
      : percentage >= 75
      ? 'var(--amber)'
      : 'var(--sage)'
  );

  return (
    <div
      className={`radial-gauge-container ${className}`}
      style={{ width: size, height: size }}
      role="meter"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-label={label || 'Asset Gauge'}
    >
      <svg width={size} height={size} className="radial-gauge-svg">
        {/* Background Track Ring */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="var(--surface-2)"
          strokeWidth={strokeWidth}
          fill="none"
          className="gauge-track"
        />

        {/* Foreground Progress Ring */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={resolvedColor}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          fill="none"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          className="gauge-progress"
          style={{ transition: 'stroke-dashoffset 0.6s cubic-bezier(0.4, 0, 0.2, 1)' }}
        />
      </svg>

      {/* Center Readout */}
      <div className="gauge-center-content font-mono">
        <span className="gauge-value">
          {showPercentage ? `${Math.round(percentage)}%` : value}
        </span>
        {label && <span className="gauge-label">{label}</span>}
        {sublabel && <span className="gauge-sublabel">{sublabel}</span>}
      </div>
    </div>
  );
}
