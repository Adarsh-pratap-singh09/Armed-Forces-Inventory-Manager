import { useMemo } from 'react';

/**
 * Sparkline UI Component
 * Lightweight, zero-dependency inline SVG trendline with smooth gradient fill.
 */
export default function Sparkline({
  data = [],
  width = 120,
  height = 28,
  color = 'var(--sage)',
  strokeWidth = 1.5,
  showDot = true,
  className = ''
}) {
  const { pathD, fillD, lastPoint } = useMemo(() => {
    if (!Array.isArray(data) || data.length < 2) {
      return { pathD: '', fillD: '', lastPoint: null };
    }

    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;

    const pad = 3;
    const w = width - pad * 2;
    const h = height - pad * 2;

    const points = data.map((val, idx) => {
      const x = pad + (idx / (data.length - 1)) * w;
      const y = pad + h - ((val - min) / range) * h;
      return { x, y };
    });

    const d = points.reduce((acc, pt, i) => {
      return i === 0 ? `M ${pt.x} ${pt.y}` : `${acc} L ${pt.x} ${pt.y}`;
    }, '');

    const last = points[points.length - 1];
    const first = points[0];
    const fill = `${d} L ${last.x} ${height} L ${first.x} ${height} Z`;

    return { pathD: d, fillD: fill, lastPoint: last };
  }, [data, width, height]);

  if (!pathD) return <div style={{ width, height }} />;

  return (
    <svg
      width="100%"
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      className={`sparkline-svg ${className}`}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="sparklineGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0.0" />
        </linearGradient>
      </defs>

      <path d={fillD} fill="url(#sparklineGrad)" />
      <path d={pathD} fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
      {showDot && lastPoint && (
        <circle cx={lastPoint.x} cy={lastPoint.y} r={2.5} fill={color} />
      )}
    </svg>
  );
}
