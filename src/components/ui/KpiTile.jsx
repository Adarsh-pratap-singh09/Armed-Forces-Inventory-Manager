import CountUp from '../CountUp.jsx';
import Sparkline from './Sparkline.jsx';

/**
 * KpiTile UI Component
 * Data-dense command console KPI card with mono label, big count-up value,
 * optional sparkline or delta indicator, and status stripe.
 */
export default function KpiTile({
  label,
  value,
  decimals = 0,
  unit = '',
  delta,
  deltaType = 'neutral', // 'positive' | 'negative' | 'neutral'
  sparklineData,
  icon: Icon,
  accent = 'sage', // 'sage' | 'sand' | 'amber' | 'brick' | 'steel'
  subtext,
  className = '',
  onClick
}) {
  return (
    <div
      className={`kpi-tile accent-${accent} ${onClick ? 'interactive-tile' : ''} ${className}`}
      onClick={onClick}
    >
      <div className="kpi-top-stripe" />
      <div className="kpi-content">
        <div className="kpi-header">
          <span className="kpi-label font-mono">{label}</span>
          {Icon && <Icon size={16} className={`kpi-icon text-${accent}`} />}
        </div>

        <div className="kpi-value-row">
          <div className="kpi-value font-mono">
            {typeof value === 'number' ? (
              <CountUp value={value} decimals={decimals} />
            ) : (
              value
            )}
            {unit && <span className="kpi-unit font-mono"> {unit}</span>}
          </div>

          {delta && (
            <span className={`kpi-delta font-mono delta-${deltaType}`}>
              {delta}
            </span>
          )}
        </div>

        {sparklineData && sparklineData.length > 1 && (
          <div className="kpi-sparkline-wrap">
            <Sparkline data={sparklineData} color={`var(--${accent})`} height={24} />
          </div>
        )}

        {subtext && <div className="kpi-subtext font-mono">{subtext}</div>}
      </div>
    </div>
  );
}
