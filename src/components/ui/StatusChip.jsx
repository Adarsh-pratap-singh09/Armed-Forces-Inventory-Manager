/**
 * StatusChip UI Component
 * Clean military status badge with pulsing tactical dot and high-contrast styling.
 */
export default function StatusChip({
  status,
  label,
  variant, // 'healthy' | 'reorder' | 'critical' | 'operational' | 'due-soon' | 'overdue' | 'repair' | 'pending' | 'approved' | 'rejected' | 'fulfilled'
  pulse = true,
  className = ''
}) {
  const normalizedVariant = variant || (
    status === 'Healthy' || status === 'Operational' || status === 'Approved'
      ? 'healthy'
      : status === 'Reorder needed' || status === 'Due soon' || status === 'Pending' || status === 'Reorder soon'
      ? 'reorder'
      : status === 'Critical low' || status === 'Service overdue' || status === 'Rejected' || status === 'Order now'
      ? 'critical'
      : status === 'Under repair'
      ? 'repair'
      : status === 'Fulfilled'
      ? 'fulfilled'
      : 'neutral'
  );

  return (
    <span className={`status-chip-v2 variant-${normalizedVariant} font-mono ${className}`}>
      <span
        className={`status-chip-dot ${pulse ? 'pulse-anim' : ''}`}
        aria-hidden="true"
      />
      <span className="status-chip-text">{label || status}</span>
    </span>
  );
}
