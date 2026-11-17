/**
 * Maintenance Tracker List Page ( /maintenance )
 * 
 * Operational maintenance lifecycle tracker.
 * Displays vehicle fleet status, service intervals, 12-week run averages, and maintenance forecasts.
 */

import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useVehicles } from '../context/VehicleContext.jsx';
import { DEPOTS } from '../data/index.js';
import PageHero from '../components/PageHero.jsx';
import {
  Search,
  ArrowRight,
  Truck
} from 'lucide-react';
import { Panel, KpiTile, RadialGauge, SegmentedControl, StatusChip } from '../components/ui/index.js';

export default function MaintenanceList() {
  const { currentUser, isStoreOfficer } = useAuth();
  const { vehicles, asOfDateLabel } = useVehicles();

  // View state: 'grid' | 'table'
  const [viewMode, setViewMode] = useState('grid');

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [depotFilter, setDepotFilter] = useState(
    isStoreOfficer && currentUser?.depotId ? currentUser.depotId : 'all'
  );
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortOrder, setSortOrder] = useState('asc'); // 'asc' = lowest weeks until service first

  // Scoped vehicles for counts (Store Officer sees only their depot)
  const scopedVehicles = useMemo(() => {
    if (isStoreOfficer && currentUser?.depotId) {
      return vehicles.filter((v) => v.depotId === currentUser.depotId);
    }
    return vehicles;
  }, [vehicles, isStoreOfficer, currentUser]);

  // Four Summary Card Counts
  const operationalCount = useMemo(
    () => scopedVehicles.filter((v) => v.status === 'Operational').length,
    [scopedVehicles]
  );
  const dueSoonCount = useMemo(
    () => scopedVehicles.filter((v) => v.status === 'Service due soon' || v.status === 'Due soon').length,
    [scopedVehicles]
  );
  const overdueCount = useMemo(
    () => scopedVehicles.filter((v) => v.status === 'Service overdue').length,
    [scopedVehicles]
  );
  const underRepairCount = useMemo(
    () => scopedVehicles.filter((v) => v.status === 'Under repair').length,
    [scopedVehicles]
  );

  // Filtered and sorted table list
  const filteredVehicles = useMemo(() => {
    const list = scopedVehicles.filter((veh) => {
      // Search by ID, model, or type
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const inId = veh.id.toLowerCase().includes(q);
        const inModel = veh.model.toLowerCase().includes(q);
        const inType = veh.type?.toLowerCase().includes(q);
        const inDepot = veh.depotName.toLowerCase().includes(q);
        if (!inId && !inModel && !inType && !inDepot) return false;
      }

      // Depot filter (Commander/Admin)
      if (!isStoreOfficer && depotFilter !== 'all' && veh.depotId !== depotFilter) {
        return false;
      }

      // Status filter
      if (statusFilter !== 'all') {
        if (statusFilter === 'Due soon' && (veh.status === 'Due soon' || veh.status === 'Service due soon')) {
          return true;
        }
        if (veh.status !== statusFilter) {
          return false;
        }
      }

      return true;
    });

    // Sort by estimated weeks until service
    list.sort((a, b) => {
      const aWeeks = a.isUnderRepair ? -1 : a.estimatedWeeksUntilService;
      const bWeeks = b.isUnderRepair ? -1 : b.estimatedWeeksUntilService;
      if (sortOrder === 'asc') {
        return aWeeks - bWeeks;
      }
      return bWeeks - aWeeks;
    });

    return list;
  }, [scopedVehicles, searchQuery, depotFilter, statusFilter, sortOrder, isStoreOfficer]);

  const viewOptions = [
    { value: 'grid', label: 'CARD GRID' },
    { value: 'table', label: 'TABLE VIEW' }
  ];

  return (
    <div className="maintenance-page fade-in-section">
      {/* Engineering Schematic Grid Hero Banner */}
      <PageHero
        theme="maintenance"
        sectorCode={isStoreOfficer && currentUser?.depotId ? currentUser.depotId.toUpperCase() : 'FLEET-LOG'}
        title={isStoreOfficer && currentUser?.depotName
          ? `TACTICAL FLEET MAINTENANCE // ${currentUser.depotName.toUpperCase()}`
          : 'TACTICAL VEHICLE FLEET MAINTENANCE TRACKER'}
        tagline="Continuous inspection intervals, 12-week engine run-hour telemetry, and overhaul forecasting across tactical transport assets."
        icon={Truck}
        badge={asOfDateLabel}
      />

      <div className="page-container hero-overlap-content">
        {/* Four Summary Cards */}
        <div className="console-kpi-row" style={{ marginBottom: '22px' }}>
          <KpiTile
            label="OPERATIONAL FLEET"
            value={operationalCount}
            hint="Mission-ready logistics vehicles"
            variant="sage"
          />

          <KpiTile
            label="SERVICE DUE SOON"
            value={dueSoonCount}
            hint="Under 4 weeks of remaining runtime"
            variant="amber"
          />

          <KpiTile
            label="SERVICE OVERDUE"
            value={overdueCount}
            hint="Immediate depot service required"
            variant="brick"
          />

          <KpiTile
            label="UNDER WORKSHOP REPAIR"
            value={underRepairCount}
            hint="In workshop for mechanical repair"
            variant="steel"
          />
        </div>

        {/* Filter and Search Bar with View Toggle */}
        <div className="filter-card card-bracket" style={{ marginBottom: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px' }}>
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center', flex: 1 }}>
              {/* Search */}
              <div style={{ minWidth: '220px', flex: 1 }}>
                <div style={{ position: 'relative' }}>
                  <Search size={14} style={{ position: 'absolute', left: 10, top: 11, color: 'var(--muted)' }} />
                  <input
                    type="text"
                    placeholder="Search by ID, model, or type..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="form-input"
                    style={{ paddingLeft: '32px', height: '36px', fontSize: '12px' }}
                  />
                </div>
              </div>

              {/* Depot Select */}
              <div style={{ minWidth: '180px' }}>
                <select
                  value={isStoreOfficer ? currentUser.depotId : depotFilter}
                  onChange={(e) => setDepotFilter(e.target.value)}
                  disabled={isStoreOfficer}
                  className="form-select"
                  style={{ height: '36px', fontSize: '12px' }}
                >
                  {isStoreOfficer ? (
                    <option value={currentUser.depotId}>{currentUser.depotName} ({currentUser.service})</option>
                  ) : (
                    <>
                      <option value="all">All depots ({scopedVehicles.length} vehicles)</option>
                      {DEPOTS.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.name} ({d.shortName})
                        </option>
                      ))}
                    </>
                  )}
                </select>
              </div>

              {/* Status Select */}
              <div style={{ minWidth: '160px' }}>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="form-select"
                  style={{ height: '36px', fontSize: '12px' }}
                >
                  <option value="all">All statuses</option>
                  <option value="Operational">Operational</option>
                  <option value="Due soon">Due soon (&lt; 4 wks)</option>
                  <option value="Service overdue">Service overdue</option>
                  <option value="Under repair">Under repair</option>
                </select>
              </div>

              {/* Sort Order */}
              <div style={{ minWidth: '160px' }}>
                <select
                  value={sortOrder}
                  onChange={(e) => setSortOrder(e.target.value)}
                  className="form-select"
                  style={{ height: '36px', fontSize: '12px' }}
                >
                  <option value="asc">Shortest runway first</option>
                  <option value="desc">Longest runway first</option>
                </select>
              </div>
            </div>

            {/* View Mode Switcher */}
            <div>
              <SegmentedControl
                options={viewOptions}
                value={viewMode}
                onChange={setViewMode}
              />
            </div>
          </div>
        </div>

        {/* View Mode 1: Card Grid View */}
        {viewMode === 'grid' && (
          <div className="maintenance-card-grid">
            {filteredVehicles.length === 0 ? (
              <div className="console-meta-box" style={{ gridColumn: '1 / -1', padding: '36px', textAlign: 'center' }}>
                <span className="text-muted">No tactical vehicles match the selected criteria.</span>
              </div>
            ) : (
              filteredVehicles.map((veh) => {
                let stripeClass = 'stripe-operational';
                let gaugeColor = 'var(--sage)';
                if (veh.status === 'Under repair') {
                  stripeClass = 'stripe-under-repair';
                  gaugeColor = 'var(--steel)';
                } else if (veh.status === 'Service overdue') {
                  stripeClass = 'stripe-overdue';
                  gaugeColor = 'var(--brick)';
                } else if (veh.status === 'Due soon' || veh.status === 'Service due soon') {
                  stripeClass = 'stripe-due-soon';
                  gaugeColor = 'var(--amber)';
                }

                return (
                  <div key={veh.id} className="vehicle-card">
                    <div className={`vehicle-card-stripe ${stripeClass}`} />

                    <div className="vehicle-card-header">
                      <div>
                        <div className="vehicle-card-id">{veh.id}</div>
                        <div className="vehicle-card-type">{veh.model}</div>
                      </div>
                      <span className={`branch-badge branch-${veh.serviceBranch.toLowerCase().replace(' ', '')}`}>
                        {veh.depotShortName || veh.depotName}
                      </span>
                    </div>

                    <div className="vehicle-card-body">
                      {/* Radial Gauge of Interval Used */}
                      <RadialGauge
                        value={veh.hoursSinceLastService}
                        max={veh.serviceIntervalHours}
                        size={84}
                        strokeWidth={7}
                        label="USED"
                        color={gaugeColor}
                      />

                      {/* Stat Counters */}
                      <div className="vehicle-stats-list font-mono">
                        <div className="vehicle-stat-item">
                          <span className="vehicle-stat-lbl">Interval:</span>
                          <span className="vehicle-stat-num">{veh.serviceIntervalHours}h</span>
                        </div>
                        <div className="vehicle-stat-item">
                          <span className="vehicle-stat-lbl">Remaining:</span>
                          <span className="vehicle-stat-num" style={{ color: veh.remainingHours <= 0 ? 'var(--brick)' : 'var(--text)' }}>
                            {veh.remainingHours > 0 ? `${veh.remainingHours}h` : `0h (${Math.abs(veh.remainingHours)}h over)`}
                          </span>
                        </div>
                        <div className="vehicle-stat-item">
                          <span className="vehicle-stat-lbl">12w Avg:</span>
                          <span className="vehicle-stat-num">{veh.avgWeeklyHours12}h/wk</span>
                        </div>
                        <div className="vehicle-stat-item">
                          <span className="vehicle-stat-lbl">Runway:</span>
                          <span className="vehicle-stat-num" style={{ color: veh.estimatedWeeksUntilService < 4 ? 'var(--amber)' : 'var(--sand)' }}>
                            {veh.isUnderRepair ? 'Under repair' : `~${veh.estimatedWeeksUntilService}w`}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="vehicle-card-footer">
                      <StatusChip status={veh.status} />
                      <Link
                        to={`/maintenance/${veh.id}`}
                        className="table-action-link font-mono"
                        style={{ fontSize: '11px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                      >
                        Manage <ArrowRight size={12} />
                      </Link>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* View Mode 2: Table View */}
        {viewMode === 'table' && (
          <Panel title="FLEET MAINTENANCE LEDGER" subtitle={`Active tactical vehicles stationed across logistics depots (As-of: ${asOfDateLabel})`} badge="FLEET-DATA">
            <div className="table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Vehicle ID</th>
                    <th>Type &amp; Model</th>
                    <th>Depot</th>
                    <th>Hours Run</th>
                    <th>Interval</th>
                    <th>Remaining</th>
                    <th>12w Avg</th>
                    <th>Est. Runway</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredVehicles.length === 0 ? (
                    <tr>
                      <td colSpan={10} style={{ textAlign: 'center', padding: '36px', color: 'var(--text-muted)' }}>
                        No vehicles found matching the selected filters.
                      </td>
                    </tr>
                  ) : (
                    filteredVehicles.map((veh) => (
                      <tr key={veh.id}>
                        <td>
                          <Link to={`/maintenance/${veh.id}`} className="font-mono" style={{ fontWeight: 700, color: 'var(--sand)', textDecoration: 'underline' }}>
                            {veh.id}
                          </Link>
                        </td>
                        <td>
                          <div style={{ fontWeight: 600, color: 'var(--text)' }}>{veh.model}</div>
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{veh.type || veh.role}</div>
                        </td>
                        <td>
                          <span className={`branch-badge branch-${veh.serviceBranch.toLowerCase().replace(' ', '')}`}>
                            {veh.depotName}
                          </span>
                        </td>
                        <td className="font-mono">
                          <div>{veh.hoursSinceLastService}h</div>
                          <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Total: {veh.totalEngineHours}h</div>
                        </td>
                        <td className="font-mono text-muted">
                          {veh.serviceIntervalHours}h
                        </td>
                        <td className="font-mono font-semibold">
                          {veh.remainingHours > 0 ? (
                            <span>{veh.remainingHours}h</span>
                          ) : (
                            <span style={{ color: 'var(--brick)' }}>
                              Overdue ({Math.abs(veh.remainingHours)}h)
                            </span>
                          )}
                        </td>
                        <td className="font-mono">
                          {veh.avgWeeklyHours12}h/wk
                        </td>
                        <td className="font-mono">
                          {veh.isUnderRepair ? (
                            <span className="text-muted" style={{ fontStyle: 'italic', fontSize: '11px' }}>Under repair</span>
                          ) : veh.remainingHours <= 0 ? (
                            <span style={{ color: 'var(--brick)', fontWeight: 700 }}>0.0 wks</span>
                          ) : (
                            <div>
                              <span style={{ color: veh.estimatedWeeksUntilService < 4 ? 'var(--amber)' : 'inherit', fontWeight: 600 }}>
                                ~{veh.estimatedWeeksUntilService}w
                              </span>
                              <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                                {veh.estimatedServiceDate?.replace(' (Simulated)', '')}
                              </div>
                            </div>
                          )}
                        </td>
                        <td>
                          <StatusChip status={veh.status} />
                        </td>
                        <td>
                          <Link
                            to={`/maintenance/${veh.id}`}
                            className="table-action-link font-mono"
                            style={{ fontSize: '11px', display: 'inline-flex', alignItems: 'center', gap: '3px' }}
                          >
                            Manage <ArrowRight size={12} />
                          </Link>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', fontSize: '11px', color: 'var(--muted)', borderTop: '1px solid var(--border)' }}>
              <span>Showing {filteredVehicles.length} of {scopedVehicles.length} tactical vehicles</span>
              <span className="font-mono">Forecasts calculated against {asOfDateLabel}</span>
            </div>
          </Panel>
        )}
      </div>
    </div>
  );
}
