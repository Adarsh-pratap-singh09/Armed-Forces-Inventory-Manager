/* eslint-disable react-refresh/only-export-components */
/**
 * Shared Recharts Dark Theme Helper for Command Console
 * Standardizes axes, grids, tooltips, and legends across all pages.
 * Complies with WCAG 2.1 AA text hierarchy and surface contrast.
 */

export const RECHARTS_THEME = {
  grid: {
    stroke: 'rgba(190, 210, 160, 0.15)',
    strokeDasharray: '3 3'
  },
  xAxis: {
    stroke: 'rgba(190, 210, 160, 0.28)',
    tick: { fill: '#c9d1b8', fontSize: 11, fontFamily: "'Share Tech Mono', monospace" },
    tickLine: { stroke: 'rgba(190, 210, 160, 0.25)' }
  },
  yAxis: {
    stroke: 'rgba(190, 210, 160, 0.28)',
    tick: { fill: '#c9d1b8', fontSize: 11, fontFamily: "'Share Tech Mono', monospace" },
    tickLine: { stroke: 'rgba(190, 210, 160, 0.25)' }
  },
  legend: {
    verticalAlign: 'top',
    align: 'left',
    iconType: 'rect',
    wrapperStyle: {
      top: 0,
      left: 20,
      paddingBottom: '14px',
      fontSize: '12px',
      fontFamily: "'Share Tech Mono', monospace",
      color: '#c9d1b8'
    }
  },
  tooltip: {
    contentStyle: {
      backgroundColor: '#212d21',
      borderColor: 'rgba(190, 210, 160, 0.22)',
      borderRadius: '4px',
      boxShadow: '0 8px 24px rgba(0, 0, 0, 0.6)',
      color: '#f1f4e8',
      fontFamily: "'Share Tech Mono', monospace",
      fontSize: '12px',
      padding: '10px 14px'
    },
    cursor: { fill: 'rgba(190, 210, 160, 0.08)' }
  }
};

/**
 * Custom dark tooltip component for Recharts
 */
export function ConsoleTooltip({ active, payload, label, title, unit = '' }) {
  if (active && payload && payload.length) {
    return (
      <div className="console-chart-tooltip font-mono">
        <div className="tooltip-header">{title || label}</div>
        <div className="tooltip-items">
          {payload.map((entry, index) => (
            <div key={`entry-${index}`} className="tooltip-item">
              <span className="tooltip-dot" style={{ backgroundColor: entry.color || entry.fill }} />
              <span className="tooltip-name">{entry.name}:</span>
              <span className="tooltip-val font-semibold">
                {typeof entry.value === 'number' ? entry.value.toLocaleString() : entry.value}{' '}
                {unit}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }
  return null;
}
