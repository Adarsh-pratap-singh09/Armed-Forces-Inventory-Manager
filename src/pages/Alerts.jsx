/**
 * Indian Armed Forces Logistics and Inventory System
 * Predictive Alerts & Early Warning Centre (Session 5)
 * 
 * NOTE: All data is synthetic for academic research.
 * Proactively flags stockout risks and vehicle servicing requirements
 * ahead of static replenishment thresholds.
 */

import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useInventory } from '../context/InventoryContext.jsx';
import { useVehicles } from '../context/VehicleContext.jsx';
import PageHero from '../components/PageHero.jsx';
import {
  DEPOTS,
  DEPOT_MAP,
  SIMULATED_DATA,
  SIMULATED_AS_OF_LABEL
} from '../data/index.js';
import {
  FORECAST_METHODS,
  FORECAST_METHOD_MAP,
  evaluateStockLineForecast,
  evaluateVehicleMaintenanceForecast
} from '../forecasting/index.js';
import {
  Zap,
  ArrowRight,
  Radio,
  Filter
} from 'lucide-react';
import { Panel, KpiTile, SegmentedControl, StatusChip } from '../components/ui/index.js';

const DEPOT_RADAR_COORDS = {
  leh: { x: 140, y: 45, label: 'LEH' },
  pathankot: { x: 95, y: 80, label: 'PTK' },
  chandigarh: { x: 155, y: 100, label: 'IXC' },
  jodhpur: { x: 60, y: 155, label: 'JDH' },
  pune: { x: 85, y: 210, label: 'PUN' },
  kochi: { x: 110, y: 255, label: 'COK' },
  visakhapatnam: { x: 205, y: 200, label: 'VTZ' },
  guwahati: { x: 235, y: 125, label: 'GAU' }
};

export default function Alerts() {
  const { currentUser, isStoreOfficer } = useAuth();
  const { stockLines } = useInventory();
  const { vehicles } = useVehicles();

  // Tab state: 'inventory' | 'maintenance'
  const [activeTab, setActiveTab] = useState('inventory');

  // Global Forecasting Method state (Default: Exponential Smoothing alpha 0.3)
  const [selectedMethodId, setSelectedMethodId] = useState('exponentialSmoothing');
  const [stockFilter, setStockFilter] = useState('alertsOnly'); // 'alertsOnly' | 'all'
  const [maintenanceFilter, setMaintenanceFilter] = useState('alertsOnly'); // 'alertsOnly' | 'all'
  const [selectedDepotFilter, setSelectedDepotFilter] = useState('all');

  // Role Scoping: Store Officers see only their assigned depot
  const scopedStockLines = useMemo(() => {
    if (isStoreOfficer && currentUser?.depotId) {
      return stockLines.filter((l) => l.depotId === currentUser.depotId);
    }
    return stockLines;
  }, [stockLines, isStoreOfficer, currentUser]);

  const scopedVehicles = useMemo(() => {
    if (isStoreOfficer && currentUser?.depotId) {
      return vehicles.filter((v) => v.depotId === currentUser.depotId);
    }
    return vehicles;
  }, [vehicles, isStoreOfficer, currentUser]);

  // Method parameters
  const methodParams = useMemo(() => {
    const entry = FORECAST_METHOD_MAP[selectedMethodId];
    return entry?.defaultParams || {};
  }, [selectedMethodId]);

  // 1. Process Stock Lines with Predictive Forecasting
  const evaluatedStockLines = useMemo(() => {
    return scopedStockLines.map((line) => {
      const rawDemand =
        SIMULATED_DATA[line.depotId]?.[line.itemId]?.weeklyDemand?.map((d) => d.demand) || [];

      const evalResult = evaluateStockLineForecast(
        rawDemand,
        line.quantity,
        line.leadTimeWeeks,
        selectedMethodId,
        methodParams,
        26
      );

      const isEarlyWarning =
        evalResult.isOrderNow &&
        (line.status === 'Healthy' || line.status === 'Reorder needed');

      return {
        ...line,
        evalResult,
        isEarlyWarning
      };
    });
  }, [scopedStockLines, selectedMethodId, methodParams]);

  // 2. Process Vehicles with Engine Usage Forecasting
  const evaluatedVehicles = useMemo(() => {
    return scopedVehicles.map((v) => {
      const vEval = evaluateVehicleMaintenanceForecast(
        v,
        selectedMethodId,
        methodParams,
        26
      );

      const staticWeeks = vEval.staticWeeks;
      const forecastWeeks = vEval.predictedServiceWeek;
      let earlierByWeeks = 0;
      if (forecastWeeks !== null && forecastWeeks < staticWeeks) {
        earlierByWeeks = Number((staticWeeks - forecastWeeks).toFixed(1));
      }

      return {
        ...v,
        vEval,
        earlierByWeeks
      };
    });
  }, [scopedVehicles, selectedMethodId, methodParams]);

  // Filtered Stock Lines
  const displayStockLines = useMemo(() => {
    let list = evaluatedStockLines;
    if (selectedDepotFilter !== 'all') {
      list = list.filter((l) => l.depotId === selectedDepotFilter);
    }
    if (stockFilter === 'alertsOnly') {
      list = list.filter((l) => l.evalResult.isOrderNow);
    }
    return list;
  }, [evaluatedStockLines, stockFilter, selectedDepotFilter]);

  // Filtered Vehicles
  const displayVehicles = useMemo(() => {
    let list = evaluatedVehicles;
    if (selectedDepotFilter !== 'all') {
      list = list.filter((v) => v.depotId === selectedDepotFilter);
    }
    if (maintenanceFilter === 'alertsOnly') {
      list = list.filter((v) => v.vEval.isAlert);
    }
    return list;
  }, [evaluatedVehicles, maintenanceFilter, selectedDepotFilter]);

  // Summary Metrics
  const stockOrderNowCount = useMemo(() => {
    return evaluatedStockLines.filter((l) => l.evalResult.isOrderNow).length;
  }, [evaluatedStockLines]);

  const stockEarlyWarningsCount = useMemo(() => {
    return evaluatedStockLines.filter((l) => l.isEarlyWarning).length;
  }, [evaluatedStockLines]);

  const maintenanceAlertsCount = useMemo(() => {
    return evaluatedVehicles.filter((v) => v.vEval.isAlert).length;
  }, [evaluatedVehicles]);

  // Depot alert counts for Radar Blips
  const depotAlertMap = useMemo(() => {
    const map = {};
    DEPOTS.forEach((d) => {
      const stockAlerts = evaluatedStockLines.filter((l) => l.depotId === d.id && l.evalResult.isOrderNow);
      const maintAlerts = evaluatedVehicles.filter((v) => v.depotId === d.id && v.vEval.isAlert);
      const isCritical = stockAlerts.some((l) => l.evalResult.alertColor === 'red') || maintAlerts.some((v) => v.vEval.isOverdue);
      const isOrderNow = stockAlerts.length > 0 || maintAlerts.length > 0;

      map[d.id] = {
        depot: d,
        stockCount: stockAlerts.length,
        maintCount: maintAlerts.length,
        totalAlerts: stockAlerts.length + maintAlerts.length,
        status: isCritical ? 'critical' : isOrderNow ? 'order-now' : 'healthy'
      };
    });
    return map;
  }, [evaluatedStockLines, evaluatedVehicles]);

  const tabOptions = [
    { value: 'inventory', label: `INVENTORY REPLENISHMENT (${stockOrderNowCount})` },
    { value: 'maintenance', label: `FLEET SERVICING (${maintenanceAlertsCount})` }
  ];

  return (
    <div className="alerts-page fade-in-section">
      {/* Radar Early Warning Hero Banner */}
      <PageHero
        theme="alerts"
        sectorCode="EARLY-WARNING"
        title="PREDICTIVE ALERTS & EARLY WARNING CENTRE"
        tagline="Forward-looking replenishment stock-outs and tactical vehicle servicing overhauls ahead of static thresholds."
        icon={Zap}
        badge={SIMULATED_AS_OF_LABEL}
      />

      <div className="page-container hero-overlap-content">
        {/* 4 Summary Metric Cards */}
        <div className="console-kpi-row" style={{ marginBottom: '20px' }}>
          <KpiTile
            label="STOCK 'ORDER NOW' ALERTS"
            value={stockOrderNowCount}
            hint="Projected stock-out <= Lead Time + 2w"
            variant="brick"
          />

          <KpiTile
            label="EARLY WARNINGS (VS ROP)"
            value={stockEarlyWarningsCount}
            hint="Alert triggers ahead of static ROP"
            variant="amber"
          />

          <KpiTile
            label="VEHICLE OVERHAUL ALERTS"
            value={maintenanceAlertsCount}
            hint="Interval reached within 4 weeks"
            variant="steel"
          />

          <KpiTile
            label="ACTIVE FORECAST ENGINE"
            value={FORECAST_METHOD_MAP[selectedMethodId]?.shortName || 'SES (0.3)'}
            hint="Uniform lead-time forward projection"
            variant="sage"
          />
        </div>

        {/* Console Split Layout: Left Radar Panel, Right Alert Lists */}
        <div className="console-split-layout">
          {/* Left Column: Early Warning Radar & Engine Select */}
          <div className="console-sidebar-stack">
            <Panel title="TACTICAL RADAR" badge="SECTOR-SCAN">
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                {/* SVG Tactical Radar Display */}
                <div style={{ position: 'relative', width: '280px', height: '280px' }}>
                  <svg width="280" height="280" viewBox="0 0 280 280" style={{ background: '#090d09', borderRadius: '4px', border: '1px solid var(--border)' }}>
                    {/* Concentric rings */}
                    <circle cx="140" cy="140" r="30" fill="none" stroke="rgba(180, 200, 150, 0.15)" strokeWidth="1" />
                    <circle cx="140" cy="140" r="65" fill="none" stroke="rgba(180, 200, 150, 0.15)" strokeWidth="1" strokeDasharray="3 3" />
                    <circle cx="140" cy="140" r="100" fill="none" stroke="rgba(180, 200, 150, 0.15)" strokeWidth="1" />
                    <circle cx="140" cy="140" r="130" fill="none" stroke="rgba(180, 200, 150, 0.22)" strokeWidth="1.5" />

                    {/* Crosshairs */}
                    <line x1="140" y1="10" x2="140" y2="270" stroke="rgba(180, 200, 150, 0.15)" strokeWidth="1" />
                    <line x1="10" y1="140" x2="270" y2="140" stroke="rgba(180, 200, 150, 0.15)" strokeWidth="1" />

                    {/* Diagonal azimuth guides */}
                    <line x1="48" y1="48" x2="232" y2="232" stroke="rgba(180, 200, 150, 0.08)" strokeWidth="1" strokeDasharray="2 4" />
                    <line x1="232" y1="48" x2="48" y2="232" stroke="rgba(180, 200, 150, 0.08)" strokeWidth="1" strokeDasharray="2 4" />

                    {/* Radar Sweep Effect (CSS Animated) */}
                    <line
                      x1="140"
                      y1="140"
                      x2="260"
                      y2="140"
                      stroke="rgba(155, 179, 122, 0.5)"
                      strokeWidth="1.5"
                      style={{
                        transformOrigin: '140px 140px',
                        animation: 'radarSweep 6s linear infinite'
                      }}
                    />

                    {/* Depot Blips */}
                    {Object.entries(DEPOT_RADAR_COORDS).map(([depotId, coords]) => {
                      const data = depotAlertMap[depotId];
                      const isSelected = selectedDepotFilter === depotId;
                      const isCrit = data?.status === 'critical';
                      const isOrder = data?.status === 'order-now';
                      const blipColor = isCrit ? '#d4705a' : isOrder ? '#e0a947' : '#a9c486';

                      return (
                        <g
                          key={depotId}
                          onClick={() => setSelectedDepotFilter(isSelected ? 'all' : depotId)}
                          style={{ cursor: 'pointer' }}
                        >
                          {/* Pulsing ring for alerts */}
                          {(isCrit || isOrder) && (
                            <circle
                              cx={coords.x}
                              cy={coords.y}
                              r="10"
                              fill="none"
                              stroke={blipColor}
                              strokeWidth="1"
                              opacity="0.6"
                              className="blip-pulse"
                            />
                          )}

                          {/* Center blip */}
                          <circle
                            cx={coords.x}
                            cy={coords.y}
                            r={isSelected ? 6 : 4}
                            fill={blipColor}
                            stroke={isSelected ? '#f1f4e8' : 'none'}
                            strokeWidth={isSelected ? 1.5 : 0}
                          />

                          {/* Monospace Depot Label */}
                          <text
                            x={coords.x + 8}
                            y={coords.y + 4}
                            fill={isSelected ? '#d8cb9f' : '#c9d1b8'}
                            fontSize="10"
                            fontFamily="'Share Tech Mono', monospace"
                            fontWeight="600"
                          >
                            {coords.label} {data?.totalAlerts > 0 ? `(${data.totalAlerts})` : ''}
                          </text>
                        </g>
                      );
                    })}
                  </svg>
                </div>

                {/* Radar Legend & Filter Reset */}
                <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px', fontFamily: 'var(--font-mono)' }}>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--brick)' }}>
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--brick)' }} /> Critical
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--amber)' }}>
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--amber)' }} /> Order Now
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--sage)' }}>
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--sage)' }} /> Healthy
                    </span>
                  </div>

                  {selectedDepotFilter !== 'all' && (
                    <button
                      type="button"
                      onClick={() => setSelectedDepotFilter('all')}
                      className="btn-outline-sand"
                      style={{ padding: '2px 8px', fontSize: '10px' }}
                    >
                      Clear Filter
                    </button>
                  )}
                </div>
              </div>
            </Panel>

            {/* Global Engine Selector Panel */}
            <div className="console-meta-box">
              <div className="console-meta-title">
                <Radio size={13} /> PROJECTION ENGINE
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <select
                  className="form-select font-mono"
                  value={selectedMethodId}
                  onChange={(e) => setSelectedMethodId(e.target.value)}
                  style={{ fontSize: '12px' }}
                >
                  {FORECAST_METHODS.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({m.shortName})
                    </option>
                  ))}
                </select>
                <span className="text-muted font-mono" style={{ fontSize: '10px' }}>
                  Forecast horizon: 26 weeks. Early warning threshold: Lead time + 2 weeks.
                </span>
              </div>
            </div>
          </div>

          {/* Right Column: Tabbed Alert Tables */}
          <div className="console-main-stack">
            <Panel
              title={activeTab === 'inventory' ? 'PREDICTIVE INVENTORY REPLENISHMENT ALERTS' : 'PREDICTIVE FLEET SERVICING ALERTS'}
              subtitle={
                activeTab === 'inventory'
                  ? 'Commodity lines where forward projected stock exhaustion occurs within procurement lead time'
                  : 'Tactical vehicles projected to exceed manufacturer overhaul intervals within 4 weeks'
              }
              action={
                <SegmentedControl
                  options={tabOptions}
                  value={activeTab}
                  onChange={setActiveTab}
                />
              }
            >
              {/* Filter Sub-toolbar */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Filter size={13} className="text-sand" />
                  <span className="font-mono text-sand" style={{ fontSize: '11px', fontWeight: 600 }}>FILTER:</span>
                  {activeTab === 'inventory' ? (
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button
                        type="button"
                        className={`filter-btn ${stockFilter === 'alertsOnly' ? 'active' : ''}`}
                        onClick={() => setStockFilter('alertsOnly')}
                      >
                        Order Now Only ({stockOrderNowCount})
                      </button>
                      <button
                        type="button"
                        className={`filter-btn ${stockFilter === 'all' ? 'active' : ''}`}
                        onClick={() => setStockFilter('all')}
                      >
                        All Monitored Lines ({scopedStockLines.length})
                      </button>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button
                        type="button"
                        className={`filter-btn ${maintenanceFilter === 'alertsOnly' ? 'active' : ''}`}
                        onClick={() => setMaintenanceFilter('alertsOnly')}
                      >
                        Due Soon Only ({maintenanceAlertsCount})
                      </button>
                      <button
                        type="button"
                        className={`filter-btn ${maintenanceFilter === 'all' ? 'active' : ''}`}
                        onClick={() => setMaintenanceFilter('all')}
                      >
                        All Vehicles ({scopedVehicles.length})
                      </button>
                    </div>
                  )}
                </div>

                {selectedDepotFilter !== 'all' && (
                  <span className="font-mono text-sand" style={{ fontSize: '11px' }}>
                    Depot: <strong>{DEPOT_MAP[selectedDepotFilter]?.name}</strong>
                  </span>
                )}
              </div>

              {/* Tab 1: Inventory Table */}
              {activeTab === 'inventory' && (
                <div className="table-wrapper">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Depot</th>
                        <th>Commodity / Item</th>
                        <th>Current Stock</th>
                        <th>Lead Time</th>
                        <th>Projected Stock-Out</th>
                        <th>Static Status</th>
                        <th>Predictive Alert</th>
                        <th>Early Warning Analysis</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {displayStockLines.length === 0 ? (
                        <tr>
                          <td colSpan="9" style={{ textAlign: 'center', padding: '36px', color: 'var(--text-muted)' }}>
                            No stock lines currently requiring "Order now" alerts under {FORECAST_METHOD_MAP[selectedMethodId]?.name}.
                          </td>
                        </tr>
                      ) : (
                        displayStockLines.map((line) => {
                          const evalRes = line.evalResult;
                          return (
                            <tr
                              key={line.id}
                              style={{
                                backgroundColor: line.isEarlyWarning ? 'rgba(212, 154, 58, 0.08)' : undefined
                              }}
                            >
                              <td>
                                <span className={`branch-badge branch-${line.service}`}>
                                  {line.depotShortName || line.depotName}
                                </span>
                              </td>
                              <td>
                                <div style={{ fontWeight: 600, color: 'var(--text)' }}>
                                  {line.itemName}
                                </div>
                                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                                  {line.category}
                                </div>
                              </td>
                              <td className="font-mono">
                                {line.quantity.toLocaleString()} {line.unit}
                              </td>
                              <td className="font-mono">
                                <strong>{line.leadTimeWeeks}w</strong>
                                <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                                  Limit: {evalRes.alertThresholdWeeks}w
                                </div>
                              </td>
                              <td className="font-mono">
                                {evalRes.stockOutWeek ? (
                                  <div>
                                    <span style={{ fontWeight: 700, color: 'var(--brick)' }}>
                                      Week +{evalRes.stockOutWeek}
                                    </span>
                                    <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                                      ~{evalRes.stockOutDate}
                                    </div>
                                  </div>
                                ) : (
                                  <span style={{ color: 'var(--sage)', fontSize: '12px' }}>
                                    &gt; 26 weeks
                                  </span>
                                )}
                              </td>
                              <td>
                                <StatusChip status={line.status} />
                              </td>
                              <td>
                                <StatusChip
                                  status={evalRes.alertLevel}
                                  variant={evalRes.alertColor === 'red' ? 'brick' : evalRes.alertColor === 'amber' ? 'amber' : 'sage'}
                                />
                              </td>
                              <td>
                                {line.isEarlyWarning ? (
                                  <span className="console-surge-pill" title="Demand spike triggers order before static ROP">
                                    <Zap size={10} /> Early warning: Spikes ahead of static rule
                                  </span>
                                ) : evalRes.isOrderNow ? (
                                  <span className="font-mono" style={{ fontSize: '11px', color: 'var(--brick)', fontWeight: 600 }}>
                                    Confirmed Critical Deficit
                                  </span>
                                ) : (
                                  <span className="text-muted font-mono" style={{ fontSize: '11px' }}>
                                    Aligned with buffer
                                  </span>
                                )}
                              </td>
                              <td>
                                <Link
                                  to={`/forecast?depot=${line.depotId}&item=${line.itemId}`}
                                  className="table-action-link font-mono"
                                  style={{ fontSize: '11px', display: 'inline-flex', alignItems: 'center', gap: '3px' }}
                                >
                                  Forecast <ArrowRight size={12} />
                                </Link>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Tab 2: Maintenance Table */}
              {activeTab === 'maintenance' && (
                <div className="table-wrapper">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Vehicle ID</th>
                        <th>Type &amp; Model</th>
                        <th>Depot</th>
                        <th>Hours / Interval</th>
                        <th>Remaining</th>
                        <th>Static 12w</th>
                        <th>Forecasted Service</th>
                        <th>Variance</th>
                        <th>Alert Status</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {displayVehicles.length === 0 ? (
                        <tr>
                          <td colSpan="10" style={{ textAlign: 'center', padding: '36px', color: 'var(--text-muted)' }}>
                            No tactical vehicles currently flagged for service within 4 weeks under {FORECAST_METHOD_MAP[selectedMethodId]?.name}.
                          </td>
                        </tr>
                      ) : (
                        displayVehicles.map((vehicle) => {
                          const vEval = vehicle.vEval;
                          const depot = DEPOT_MAP[vehicle.depotId];

                          return (
                            <tr key={vehicle.id}>
                              <td>
                                <Link
                                  to={`/maintenance/${vehicle.id}`}
                                  className="font-mono"
                                  style={{ fontWeight: 700, color: 'var(--sand)', textDecoration: 'underline' }}
                                >
                                  {vehicle.id}
                                </Link>
                              </td>
                              <td>
                                <div style={{ fontWeight: 600, color: 'var(--text)' }}>
                                  {vehicle.model}
                                </div>
                                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                                  {vehicle.type}
                                </div>
                              </td>
                              <td>
                                <span className={`branch-badge branch-${depot?.service || 'army'}`}>
                                  {depot?.shortName || vehicle.depotId}
                                </span>
                              </td>
                              <td className="font-mono">
                                <strong>{vehicle.hoursSinceLastService}h</strong> / {vehicle.serviceIntervalHours}h
                              </td>
                              <td className="font-mono" style={{ color: vEval.isOverdue ? 'var(--brick)' : 'var(--text)' }}>
                                {vEval.remainingHours}h buffer
                              </td>
                              <td className="font-mono">
                                {vEval.isOverdue
                                  ? 'Overdue'
                                  : vEval.isUnderRepair
                                  ? 'In Workshop'
                                  : `${vEval.staticWeeks}w`}
                              </td>
                              <td className="font-mono">
                                {vEval.isUnderRepair ? (
                                  <span style={{ color: 'var(--steel)', fontWeight: 600 }}>Workshop Repair</span>
                                ) : vEval.isOverdue ? (
                                  <span style={{ color: 'var(--brick)', fontWeight: 600 }}>Overdue Now</span>
                                ) : vEval.predictedServiceWeek !== null ? (
                                  <div>
                                    <span style={{ fontWeight: 600, color: 'var(--amber)' }}>
                                      Week +{vEval.predictedServiceWeek}
                                    </span>
                                    <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                                      ~{vEval.predictedServiceDate}
                                    </div>
                                  </div>
                                ) : (
                                  <span style={{ color: 'var(--sage)' }}>&gt; 26 weeks</span>
                                )}
                              </td>
                              <td>
                                {vehicle.earlierByWeeks > 0 ? (
                                  <span className="console-surge-pill" style={{ fontSize: '10px' }}>
                                    <Zap size={9} /> {vehicle.earlierByWeeks}w earlier
                                  </span>
                                ) : vEval.isOverdue ? (
                                  <span className="font-mono" style={{ fontSize: '11px', color: 'var(--brick)' }}>Overdue</span>
                                ) : (
                                  <span className="text-muted font-mono" style={{ fontSize: '11px' }}>Aligned with 12w</span>
                                )}
                              </td>
                              <td>
                                <StatusChip
                                  status={
                                    vEval.isUnderRepair
                                      ? 'Under repair'
                                      : vEval.isOverdue
                                      ? 'Service overdue'
                                      : vEval.predictedServiceWeek !== null && vEval.predictedServiceWeek <= 4
                                      ? 'Due soon'
                                      : 'Operational'
                                  }
                                />
                              </td>
                              <td>
                                <Link
                                  to={`/maintenance/${vehicle.id}`}
                                  className="table-action-link font-mono"
                                  style={{ fontSize: '11px', display: 'inline-flex', alignItems: 'center', gap: '3px' }}
                                >
                                  Manage <ArrowRight size={12} />
                                </Link>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </Panel>
          </div>
        </div>
      </div>
    </div>
  );
}
