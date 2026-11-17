/**
 * Vehicle Maintenance Detail Page ( /maintenance/:id )
 * 
 * In-depth technical view of a specific military transport vehicle:
 * - Interval usage RadialGauge meter
 * - Recharts line chart of 104+ weeks of weekly engine run hours
 * - Scheduled service history log
 * - Operational actions for Store Officer (own depot only):
 *     1. "Log service" (Periodic service or Repair, resets interval if Periodic)
 *     2. "Mark under repair" / "Return to service"
 *     3. "Record weekly usage" (appends a new week of engine hours)
 * - Commanders and Administrators retain read-only view.
 */

import { useState, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useVehicles } from '../context/VehicleContext.jsx';
import PageHero from '../components/PageHero.jsx';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine
} from 'recharts';
import {
  ArrowLeft,
  Wrench,
  CheckCircle2,
  Hammer,
  AlertTriangle,
  PlusCircle,
  X,
  AlertOctagon,
  Truck,
  Fuel,
  MapPin
} from 'lucide-react';
import { Panel, RadialGauge, StatusChip, Field, RECHARTS_THEME } from '../components/ui/index.js';

export default function VehicleDetail() {
  const { id } = useParams();
  const { currentUser, isStoreOfficer } = useAuth();
  const {
    getVehicleById,
    logService,
    markUnderRepair,
    returnToService,
    recordWeeklyUsage,
    asOfDateLabel
  } = useVehicles();

  const vehicle = getVehicleById(id);

  // Modals state
  const [isLogServiceOpen, setIsLogServiceOpen] = useState(false);
  const [serviceType, setServiceType] = useState('Periodic service');
  const [serviceDate, setServiceDate] = useState('2025-12-28');
  const [serviceNotes, setServiceNotes] = useState('');
  const [serviceError, setServiceError] = useState('');

  const [isUnderRepairModalOpen, setIsUnderRepairModalOpen] = useState(false);
  const [repairReasonInput, setRepairReasonInput] = useState('');
  const [repairError, setRepairError] = useState('');

  const [isRecordUsageOpen, setIsRecordUsageOpen] = useState(false);
  const [weeklyHoursInput, setWeeklyHoursInput] = useState('25');
  const [usageError, setUsageError] = useState('');

  // Can the current user modify this vehicle?
  // Only Store Officer belonging to the vehicle's assigned depot
  const canManage = isStoreOfficer && currentUser?.depotId === vehicle?.depotId;

  // Chart data: all weekly usage records
  const chartData = useMemo(() => {
    if (!vehicle?.weeklyUsage) return [];
    return vehicle.weeklyUsage.map((w) => ({
      week: w.week,
      hours: w.hours,
      date: w.date
    }));
  }, [vehicle]);

  if (!vehicle) {
    return (
      <div className="page-container">
        <div style={{ padding: '4rem 1rem', textAlign: 'center' }}>
          <AlertOctagon size={40} color="var(--brick)" />
          <h3 style={{ marginTop: '1rem', color: 'var(--text)' }}>Vehicle Not Found</h3>
          <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
            No fleet record exists for vehicle identifier "{id}".
          </p>
          <Link to="/maintenance" className="btn-primary-olive inline-action-btn">
            <ArrowLeft size={16} />
            <span>Return to Maintenance Tracker</span>
          </Link>
        </div>
      </div>
    );
  }

  // Handle Log Service Submit
  const handleLogServiceSubmit = (e) => {
    e.preventDefault();
    setServiceError('');
    try {
      logService(vehicle.id, {
        date: serviceDate,
        type: serviceType,
        notes: serviceNotes
      });
      setIsLogServiceOpen(false);
      setServiceNotes('');
    } catch (err) {
      setServiceError(err.message);
    }
  };

  // Handle Mark Under Repair Submit
  const handleMarkUnderRepairSubmit = (e) => {
    e.preventDefault();
    setRepairError('');
    try {
      markUnderRepair(vehicle.id, repairReasonInput);
      setIsUnderRepairModalOpen(false);
      setRepairReasonInput('');
    } catch (err) {
      setRepairError(err.message);
    }
  };

  // Handle Return to Service
  const handleReturnToService = () => {
    if (window.confirm(`Confirm return to service for vehicle ${vehicle.id}?\n\nThis will clear the workshop repair flag and restore operational status.`)) {
      try {
        returnToService(vehicle.id);
      } catch (err) {
        alert(err.message);
      }
    }
  };

  // Handle Record Weekly Usage Submit
  const handleRecordUsageSubmit = (e) => {
    e.preventDefault();
    setUsageError('');
    try {
      recordWeeklyUsage(vehicle.id, weeklyHoursInput);
      setIsRecordUsageOpen(false);
      setWeeklyHoursInput('25');
    } catch (err) {
      setUsageError(err.message);
    }
  };

  let gaugeColor = 'var(--sage)';
  if (vehicle.hoursSinceLastService >= vehicle.serviceIntervalHours) {
    gaugeColor = 'var(--brick)';
  } else if (vehicle.estimatedWeeksUntilService < 4) {
    gaugeColor = 'var(--amber)';
  }

  return (
    <div className="vehicle-detail-page fade-in-section">
      <PageHero
        theme="maintenance"
        sectorCode={vehicle.depotId.toUpperCase()}
        title={`TACTICAL ASSET DOSSIER // ${vehicle.id}`}
        tagline={`${vehicle.type} stationed at ${vehicle.depotName} (${vehicle.serviceBranch}) • Service Interval: ${vehicle.serviceIntervalHours} Hrs`}
        icon={Truck}
        badge={vehicle.status.toUpperCase()}
      >
        <div style={{ marginTop: '12px' }}>
          <Link to="/maintenance" className="hero-btn hero-btn-secondary military-lift">
            <ArrowLeft size={15} />
            <span>Return to Maintenance Fleet</span>
          </Link>
        </div>
      </PageHero>

      <div className="page-container hero-overlap-content">
        {/* Main Vehicle Header Dossier Panel */}
        <div className="console-split-layout" style={{ marginBottom: '22px' }}>
          {/* Left Column: Dossier Card with RadialGauge */}
          <Panel title={`DOSSIER // ${vehicle.id}`} badge={vehicle.serviceBranch.toUpperCase()}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <h2 style={{ fontSize: '18px', fontWeight: 700, margin: '0 0 4px', color: 'var(--text)' }}>
                    {vehicle.model}
                  </h2>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                    {vehicle.type || vehicle.role}
                  </div>
                </div>
                <StatusChip status={vehicle.status} />
              </div>

              {vehicle.isUnderRepair && (
                <div style={{ background: 'rgba(192, 85, 63, 0.15)', border: '1px solid rgba(192, 85, 63, 0.3)', borderRadius: '3px', padding: '8px 12px', fontSize: '12px', color: 'var(--brick)' }}>
                  <strong>Defect:</strong> {vehicle.repairReason}
                </div>
              )}

              {/* Gauge & Key Stats */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-around', padding: '12px 0', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}>
                <RadialGauge
                  value={vehicle.hoursSinceLastService}
                  max={vehicle.serviceIntervalHours}
                  size={100}
                  strokeWidth={8}
                  label="EXHAUSTED"
                  color={gaugeColor}
                />
                <div className="font-mono" style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '12px' }}>
                  <div>
                    <span className="text-muted">Hours Run: </span>
                    <span className="font-semibold text-sand">{vehicle.hoursSinceLastService}h</span>
                  </div>
                  <div>
                    <span className="text-muted">Threshold: </span>
                    <span className="font-semibold">{vehicle.serviceIntervalHours}h</span>
                  </div>
                  <div>
                    <span className="text-muted">Remaining: </span>
                    <span className="font-semibold" style={{ color: vehicle.remainingHours <= 0 ? 'var(--brick)' : 'var(--sage)' }}>
                      {vehicle.remainingHours > 0 ? `${vehicle.remainingHours}h` : `Overdue (${Math.abs(vehicle.remainingHours)}h)`}
                    </span>
                  </div>
                </div>
              </div>

              {/* Meta details */}
              <div className="console-meta-box">
                <div className="console-meta-row">
                  <span className="console-meta-key"><MapPin size={11} style={{ display: 'inline', marginRight: 4 }} />Assigned Base:</span>
                  <span className="console-meta-val">{vehicle.depotName}</span>
                </div>
                <div className="console-meta-row">
                  <span className="console-meta-key"><Fuel size={11} style={{ display: 'inline', marginRight: 4 }} />Fuel Type:</span>
                  <span className="console-meta-val">{vehicle.fuelType}</span>
                </div>
                <div className="console-meta-row">
                  <span className="console-meta-key">Total Engine Hours:</span>
                  <span className="console-meta-val font-mono">{vehicle.totalEngineHours.toLocaleString()}h</span>
                </div>
                <div className="console-meta-row">
                  <span className="console-meta-key">12-Week Average Run:</span>
                  <span className="console-meta-val font-mono">{vehicle.avgWeeklyHours12}h/wk</span>
                </div>
                <div className="console-meta-row">
                  <span className="console-meta-key">Est. Next Service:</span>
                  <span className="console-meta-val font-mono" style={{ color: 'var(--sand)' }}>
                    {vehicle.estimatedServiceDate}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div>
                {canManage ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <button
                      type="button"
                      onClick={() => {
                        setServiceError('');
                        setServiceDate('2025-12-28');
                        setServiceType('Periodic service');
                        setServiceNotes('');
                        setIsLogServiceOpen(true);
                      }}
                      className="btn-primary-olive"
                      style={{ width: '100%', justifyContent: 'center' }}
                    >
                      <Wrench size={14} />
                      <span>Log Service Overhaul</span>
                    </button>

                    {vehicle.isUnderRepair ? (
                      <button
                        type="button"
                        onClick={handleReturnToService}
                        className="btn-action-success"
                        style={{ width: '100%', justifyContent: 'center' }}
                      >
                        <CheckCircle2 size={14} />
                        <span>Return to Operational Service</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setRepairError('');
                          setRepairReasonInput('');
                          setIsUnderRepairModalOpen(true);
                        }}
                        className="btn-action-warning"
                        style={{ width: '100%', justifyContent: 'center' }}
                      >
                        <Hammer size={14} />
                        <span>Flag Under Workshop Repair</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => {
                        setUsageError('');
                        setWeeklyHoursInput('25');
                        setIsRecordUsageOpen(true);
                      }}
                      className="btn-action-secondary"
                      style={{ width: '100%', justifyContent: 'center' }}
                    >
                      <PlusCircle size={14} />
                      <span>Record Weekly Engine Run</span>
                    </button>
                  </div>
                ) : (
                  <div style={{ padding: '8px 12px', background: 'var(--surface-2)', borderRadius: '3px', border: '1px solid var(--border)', fontSize: '11px', color: 'var(--muted)', textAlign: 'center' }}>
                    {isStoreOfficer
                      ? `Managed by ${vehicle.depotName} Store Officer (Read-only)`
                      : 'Commander / Admin Operational View (Read-only)'}
                  </div>
                )}
              </div>
            </div>
          </Panel>

          {/* Right Column: Engine Usage History Chart & Service History */}
          <div className="console-main-stack">
            {/* Engine Hours Usage Chart */}
            <Panel title="WEEKLY ENGINE RUN-HOUR TELEMETRY" subtitle={`Historical operational hours logged across ${chartData.length} simulation weeks`} badge="TELEMETRY">
              <div style={{ width: '100%', height: 260 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 15, right: 20, left: 10, bottom: 25 }}>
                    <CartesianGrid {...RECHARTS_THEME.grid} />
                    <XAxis
                      dataKey="week"
                      {...RECHARTS_THEME.xAxis}
                      label={{ value: 'Simulation Week', position: 'insideBottom', offset: -12, fontSize: 11, fill: '#c9d1b8' }}
                    />
                    <YAxis
                      {...RECHARTS_THEME.yAxis}
                      label={{ value: 'Run Hours', angle: -90, position: 'insideLeft', offset: 12, fontSize: 11, fill: '#c9d1b8' }}
                    />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          return (
                            <div className="chart-tooltip-console">
                              <div className="chart-tooltip-title">WEEK {data.week} // {data.date}</div>
                              <div className="chart-tooltip-row">
                                <span className="text-muted">Recorded Hours:</span>
                                <span className="font-semibold text-sand">{data.hours} hrs</span>
                              </div>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <ReferenceLine
                      y={vehicle.avgWeeklyHours12}
                      stroke="#e0a947"
                      strokeDasharray="4 4"
                      label={{
                        value: `12w Avg (${vehicle.avgWeeklyHours12}h)`,
                        position: 'top',
                        fill: '#e0a947',
                        fontSize: 10
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="hours"
                      name="Weekly Run Hours"
                      stroke="#a9c486"
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 4, fill: '#d8cb9f' }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Panel>

            {/* Service & Overhaul History Table */}
            <Panel title="DEPOT SERVICE & OVERHAUL HISTORY" subtitle={`${vehicle.serviceHistory?.length || 0} maintenance events logged`} badge="AUDIT-LOG">
              <div className="table-wrapper">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Log ID</th>
                      <th>Date</th>
                      <th>Type</th>
                      <th>Hours at Service</th>
                      <th>Notes &amp; Scope</th>
                      <th>Officer</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(!vehicle.serviceHistory || vehicle.serviceHistory.length === 0) ? (
                      <tr>
                        <td colSpan={6} style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>
                          No maintenance records logged yet for this vehicle.
                        </td>
                      </tr>
                    ) : (
                      vehicle.serviceHistory.map((item) => (
                        <tr key={item.id}>
                          <td className="font-mono text-sand" style={{ fontWeight: 600 }}>{item.id}</td>
                          <td className="font-mono text-muted">{item.dateFormatted || item.date}</td>
                          <td>
                            <StatusChip
                              status={item.type}
                              variant={item.type === 'Periodic service' ? 'sage' : 'amber'}
                            />
                          </td>
                          <td className="font-mono">
                            {item.hoursAtService ? `${item.hoursAtService} hrs` : '—'}
                          </td>
                          <td style={{ fontSize: '12px', color: 'var(--text)' }}>
                            {item.notes}
                          </td>
                          <td className="font-mono text-sand" style={{ fontSize: '11px' }}>
                            {item.loggedBy}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </Panel>
          </div>
        </div>
      </div>

      {/* Modal 1: Log Service */}
      {isLogServiceOpen && (
        <div className="modal-backdrop" onClick={() => setIsLogServiceOpen(false)}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Wrench size={18} className="text-sand" />
                <h3 className="modal-title font-mono">LOG MAINTENANCE SERVICE ({vehicle.id})</h3>
              </div>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setIsLogServiceOpen(false)}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleLogServiceSubmit}>
              <div className="modal-body">
                {serviceError && (
                  <div className="error-banner">
                    <AlertTriangle size={16} />
                    <span>{serviceError}</span>
                  </div>
                )}

                <Field label="SERVICE TYPE">
                  <select
                    className="form-select"
                    value={serviceType}
                    onChange={(e) => setServiceType(e.target.value)}
                  >
                    <option value="Periodic service">
                      Periodic service (Scheduled overhaul — Resets interval to 0)
                    </option>
                    <option value="Repair">
                      Repair (Component fix / Workshop defect repair)
                    </option>
                  </select>
                </Field>

                <Field label="MAINTENANCE DATE" help={`Simulated benchmark date: ${asOfDateLabel}`}>
                  <input
                    type="date"
                    className="form-input"
                    value={serviceDate}
                    onChange={(e) => setServiceDate(e.target.value)}
                    required
                  />
                </Field>

                <Field label="MAINTENANCE NOTES & REPLACED SPARES">
                  <textarea
                    rows={3}
                    className="form-textarea"
                    placeholder="Describe maintenance performed, e.g. 500-hr overhaul, engine oil changed, new air & fuel filters installed..."
                    value={serviceNotes}
                    onChange={(e) => setServiceNotes(e.target.value)}
                    required
                  />
                </Field>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setIsLogServiceOpen(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary-olive">
                  Log Service
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: Mark Under Repair */}
      {isUnderRepairModalOpen && (
        <div className="modal-backdrop" onClick={() => setIsUnderRepairModalOpen(false)}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Hammer size={18} className="text-brick" />
                <h3 className="modal-title font-mono">FLAG UNDER REPAIR ({vehicle.id})</h3>
              </div>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setIsUnderRepairModalOpen(false)}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleMarkUnderRepairSubmit}>
              <div className="modal-body">
                {repairError && (
                  <div className="error-banner">
                    <AlertTriangle size={16} />
                    <span>{repairError}</span>
                  </div>
                )}

                <Field label="DEFECT / MECHANICAL FAILURE REASON (MANDATORY)">
                  <textarea
                    rows={3}
                    className="form-textarea"
                    placeholder="Specify mechanical breakdown reason, e.g. Transmission clutch slip, turbocharger leak, radiator crack..."
                    value={repairReasonInput}
                    onChange={(e) => setRepairReasonInput(e.target.value)}
                    required
                  />
                </Field>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setIsUnderRepairModalOpen(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn-danger-red">
                  Mark Under Repair
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 3: Record Weekly Usage */}
      {isRecordUsageOpen && (
        <div className="modal-backdrop" onClick={() => setIsRecordUsageOpen(false)}>
          <div className="modal-dialog modal-sm" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <PlusCircle size={18} className="text-sand" />
                <h3 className="modal-title font-mono">RECORD WEEKLY USAGE</h3>
              </div>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setIsRecordUsageOpen(false)}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleRecordUsageSubmit}>
              <div className="modal-body">
                {usageError && (
                  <div className="error-banner">
                    <AlertTriangle size={16} />
                    <span>{usageError}</span>
                  </div>
                )}

                <Field label={`ENGINE RUN HOURS (WEEK ${(vehicle.weeklyUsage?.length || 104) + 1})`}>
                  <input
                    type="number"
                    min="1"
                    max="168"
                    step="0.5"
                    className="form-input font-mono"
                    value={weeklyHoursInput}
                    onChange={(e) => setWeeklyHoursInput(e.target.value)}
                    required
                  />
                </Field>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setIsRecordUsageOpen(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary-olive">
                  Append Usage
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
