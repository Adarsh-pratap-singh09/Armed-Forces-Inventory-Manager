import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useInventory } from '../context/InventoryContext.jsx';
import { useRequisitions } from '../context/RequisitionContext.jsx';
import { useVehicles } from '../context/VehicleContext.jsx';
import { DEPOTS, CATEGORIES } from '../data/index.js';
import PageHero from '../components/PageHero.jsx';
import { Panel, KpiTile, StatusChip, RECHARTS_THEME } from '../components/ui/index.js';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from 'recharts';
import {
  Layers,
  AlertTriangle,
  AlertOctagon,
  Wrench,
  FileClock,
  LayoutDashboard,
  Radio,
  ExternalLink,
  Filter
} from 'lucide-react';
import { getPredictiveAlertsSummary } from '../forecasting/index.js';

// Abstract schematic node positions (rough lat/long proportions, strictly no map outlines)
const ABSTRACT_DEPOT_NODES = [
  { id: 'leh', shortName: 'Leh', x: 180, y: 50 },
  { id: 'pathankot', shortName: 'Pathankot', x: 140, y: 95 },
  { id: 'chandigarh', shortName: 'Chandigarh', x: 165, y: 135 },
  { id: 'jodhpur', shortName: 'Jodhpur', x: 95, y: 185 },
  { id: 'guwahati', shortName: 'Guwahati', x: 420, y: 190 },
  { id: 'pune', shortName: 'Pune', x: 115, y: 280 },
  { id: 'visakhapatnam', shortName: 'Visakhapatnam', x: 285, y: 285 },
  { id: 'kochi', shortName: 'Kochi', x: 160, y: 355 }
];

// Abstract supply line linkages between theatre nodes
const ABSTRACT_SUPPLY_LINES = [
  ['pathankot', 'leh'],
  ['chandigarh', 'pathankot'],
  ['chandigarh', 'jodhpur'],
  ['chandigarh', 'guwahati'],
  ['jodhpur', 'pune'],
  ['pune', 'kochi'],
  ['visakhapatnam', 'kochi'],
  ['chandigarh', 'visakhapatnam']
];

export default function Dashboard() {
  const { currentUser, isStoreOfficer } = useAuth();
  const { stockLines } = useInventory();
  const { requisitions } = useRequisitions();
  const { vehicles } = useVehicles();

  const [selectedNetworkDepot, setSelectedNetworkDepot] = useState(
    isStoreOfficer && currentUser?.depotId ? currentUser.depotId : 'all'
  );

  // Scoped stock lines according to role and network node filter
  const scopedStockLines = useMemo(() => {
    let lines = stockLines;
    if (isStoreOfficer && currentUser?.depotId) {
      lines = lines.filter((l) => l.depotId === currentUser.depotId);
    } else if (selectedNetworkDepot !== 'all') {
      lines = lines.filter((l) => l.depotId === selectedNetworkDepot);
    }
    return lines;
  }, [stockLines, isStoreOfficer, currentUser, selectedNetworkDepot]);

  const scopedVehicles = useMemo(() => {
    let vList = vehicles;
    if (isStoreOfficer && currentUser?.depotId) {
      vList = vList.filter((v) => v.depotId === currentUser.depotId);
    } else if (selectedNetworkDepot !== 'all') {
      vList = vList.filter((v) => v.depotId === selectedNetworkDepot);
    }
    return vList;
  }, [vehicles, isStoreOfficer, currentUser, selectedNetworkDepot]);

  const scopedDepots = useMemo(() => {
    if (isStoreOfficer && currentUser?.depotId) {
      return DEPOTS.filter((d) => d.id === currentUser.depotId);
    }
    return DEPOTS;
  }, [isStoreOfficer, currentUser]);

  // Summary Metrics
  const totalStockLines = scopedStockLines.length;
  const linesBelowReorder = useMemo(
    () => scopedStockLines.filter((l) => l.quantity <= l.reorderLevel).length,
    [scopedStockLines]
  );
  const linesCriticalLow = useMemo(
    () => scopedStockLines.filter((l) => l.status === 'Critical low').length,
    [scopedStockLines]
  );
  const vehiclesDueOrOverdue = useMemo(
    () =>
      scopedVehicles.filter(
        (v) =>
          v.status === 'Service due soon' ||
          v.status === 'Due soon' ||
          v.status === 'Service overdue' ||
          v.status === 'Under repair'
      ).length,
    [scopedVehicles]
  );

  const pendingRequisitionsCount = useMemo(() => {
    return requisitions.filter((r) => {
      if (r.status !== 'Pending') return false;
      if (isStoreOfficer && r.depotId !== currentUser?.depotId) return false;
      if (selectedNetworkDepot !== 'all' && r.depotId !== selectedNetworkDepot) return false;
      return true;
    }).length;
  }, [requisitions, isStoreOfficer, currentUser, selectedNetworkDepot]);

  const predictiveAlerts = useMemo(() => {
    return getPredictiveAlertsSummary(
      scopedStockLines,
      scopedVehicles,
      'exponentialSmoothing',
      { alpha: 0.3 }
    );
  }, [scopedStockLines, scopedVehicles]);

  // Worst stock status per depot for schematic node coloring
  const depotStatusMap = useMemo(() => {
    const map = {};
    DEPOTS.forEach((d) => {
      const dLines = stockLines.filter((l) => l.depotId === d.id);
      const hasCritical = dLines.some((l) => l.status === 'Critical low');
      const hasReorder = dLines.some((l) => l.status === 'Reorder needed');
      map[d.id] = hasCritical
        ? 'critical'
        : hasReorder
        ? 'reorder'
        : 'healthy';
    });
    return map;
  }, [stockLines]);

  // Needs Attention feed: lowest weeks of cover
  const needsAttentionLines = useMemo(() => {
    return [...scopedStockLines]
      .sort((a, b) => a.weeksOfCover - b.weeksOfCover)
      .slice(0, 8);
  }, [scopedStockLines]);

  // Chart 1: Stock lines by status per depot
  const depotStatusData = useMemo(() => {
    return scopedDepots.map((depot) => {
      const depotLines = scopedStockLines.filter((l) => l.depotId === depot.id);
      const healthy = depotLines.filter((l) => l.status === 'Healthy').length;
      const reorder = depotLines.filter((l) => l.status === 'Reorder needed').length;
      const critical = depotLines.filter((l) => l.status === 'Critical low').length;

      return {
        depot: depot.shortName,
        healthy,
        reorder,
        critical,
        total: depotLines.length
      };
    });
  }, [scopedDepots, scopedStockLines]);

  // Chart 2: Low-stock lines by category
  const categoryLowStockData = useMemo(() => {
    return CATEGORIES.map((category) => {
      const catLines = scopedStockLines.filter((l) => l.category === category);
      const lowStockCount = catLines.filter((l) => l.quantity <= l.reorderLevel).length;

      return {
        category,
        lowStockCount,
        total: catLines.length
      };
    });
  }, [scopedStockLines]);

  const activeDepotInfo = DEPOTS.find((d) => d.id === selectedNetworkDepot);

  return (
    <div className="dashboard-page fade-in-section">
      <PageHero
        theme="dashboard"
        sectorCode={isStoreOfficer && currentUser?.depotId ? currentUser.depotId.toUpperCase() : 'HQ-THEATRE'}
        title={isStoreOfficer && currentUser?.depotName
          ? `OPERATIONAL LOGISTICS // ${currentUser.depotName.toUpperCase()}`
          : 'OPERATIONAL LOGISTICS COMMAND CONSOLE'}
        tagline={isStoreOfficer && currentUser?.depotName
          ? `Forward operational sector scoped to ${currentUser.depotName} Depot (${currentUser.service || 'Army'}).`
          : 'Theatre-wide readiness overview across 8 Tri-Services logistics nodes, inventory health, and replenishment pipeline.'}
        icon={LayoutDashboard}
        badge={selectedNetworkDepot !== 'all' ? `${activeDepotInfo?.name.toUpperCase()} FILTER` : 'THEATRE OVERVIEW'}
      />

      <div className="page-container hero-overlap-content">
        {/* Top Strip of KPI Tiles */}
        <div className="dashboard-kpi-strip six-cards-grid">
          <KpiTile
            label="Total Stock Lines"
            value={totalStockLines}
            icon={Layers}
            accent="sage"
            subtext={selectedNetworkDepot !== 'all' ? `${activeDepotInfo?.shortName} Lines` : 'Network Commodities'}
          />
          <KpiTile
            label="Below Reorder"
            value={linesBelowReorder}
            icon={AlertTriangle}
            accent="amber"
            subtext="Reorder point reached"
          />
          <KpiTile
            label="Critical Low"
            value={linesCriticalLow}
            icon={AlertOctagon}
            accent="brick"
            subtext="Cover < Lead Time"
          />
          <KpiTile
            label="Vehicles Due"
            value={vehiclesDueOrOverdue}
            icon={Wrench}
            accent="steel"
            subtext="Overhaul < 4w or in repair"
          />
          <KpiTile
            label="Pending Indents"
            value={pendingRequisitionsCount}
            icon={FileClock}
            accent="sand"
            subtext="Awaiting review"
          />
          <KpiTile
            label="Early Warnings"
            value={predictiveAlerts.totalAlertsCount}
            icon={Radio}
            accent="brick"
            subtext="Predictive algorithmic alerts"
          />
        </div>

        {/* Bento Row: Abstract Depot Network Schematic + Needs Attention List */}
        <div className="dashboard-bento-grid" style={{ marginTop: '20px' }}>
          {/* Panel 1: Abstract Depot Network Schematic (NO border/map outlines) */}
          <Panel
            title="THEATRE DEPOT NETWORK SCHEMATIC"
            icon={Radio}
            badge={selectedNetworkDepot === 'all' ? 'ALL NODES' : activeDepotInfo?.shortName.toUpperCase()}
            hasGrid
            actions={
              !isStoreOfficer && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {selectedNetworkDepot !== 'all' && (
                    <button
                      type="button"
                      onClick={() => setSelectedNetworkDepot('all')}
                      className="filter-btn font-mono"
                      style={{ padding: '2px 8px', fontSize: '10px' }}
                    >
                      RESET NODE
                    </button>
                  )}
                  <span className="font-mono text-muted" style={{ fontSize: '10px' }}>
                    Click node to filter
                  </span>
                </div>
              )
            }
            className="schematic-panel"
          >
            <div className="network-schematic-wrap">
              <svg
                viewBox="0 0 500 390"
                className="network-schematic-svg"
                role="img"
                aria-label="Abstract theatre supply network schematic with 8 nodes"
              >
                {/* Tactical Schematic Coordinate Grid (Pure abstract lines, NO borders) */}
                <g stroke="rgba(180, 200, 150, 0.08)" strokeWidth="0.8">
                  {Array.from({ length: 10 }).map((_, i) => (
                    <line key={`grid-v-${i}`} x1={i * 50} y1="0" x2={i * 50} y2="390" />
                  ))}
                  {Array.from({ length: 8 }).map((_, i) => (
                    <line key={`grid-h-${i}`} x1="0" y1={i * 50} x2="500" y2={i * 50} />
                  ))}
                </g>

                {/* Abstract Supply Arteries */}
                <g stroke="rgba(180, 200, 150, 0.22)" strokeWidth="1.2" strokeDasharray="4 3">
                  {ABSTRACT_SUPPLY_LINES.map(([fromId, toId]) => {
                    const fromNode = ABSTRACT_DEPOT_NODES.find((n) => n.id === fromId);
                    const toNode = ABSTRACT_DEPOT_NODES.find((n) => n.id === toId);
                    if (!fromNode || !toNode) return null;
                    return (
                      <line
                        key={`line-${fromId}-${toId}`}
                        x1={fromNode.x}
                        y1={fromNode.y}
                        x2={toNode.x}
                        y2={toNode.y}
                      />
                    );
                  })}
                </g>

                {/* Depot Nodes */}
                {ABSTRACT_DEPOT_NODES.map((node) => {
                  const status = depotStatusMap[node.id] || 'healthy';
                  const isSelected = selectedNetworkDepot === node.id;
                  const nodeColor =
                    status === 'critical'
                      ? 'var(--brick)'
                      : status === 'reorder'
                      ? 'var(--amber)'
                      : 'var(--sage)';

                  return (
                    <g
                      key={node.id}
                      transform={`translate(${node.x}, ${node.y})`}
                      onClick={() => {
                        if (!isStoreOfficer) {
                          setSelectedNetworkDepot(selectedNetworkDepot === node.id ? 'all' : node.id);
                        }
                      }}
                      style={{ cursor: isStoreOfficer ? 'default' : 'pointer' }}
                      className="schematic-node-group"
                    >
                      {/* Selection Reticle Ring */}
                      {isSelected && (
                        <circle
                          r="16"
                          stroke="var(--sand)"
                          strokeWidth="1.5"
                          fill="none"
                          strokeDasharray="3 2"
                        />
                      )}

                      {/* Pulse Ring */}
                      <circle
                        r="10"
                        stroke={nodeColor}
                        strokeWidth="1"
                        fill="none"
                        opacity="0.4"
                      />

                      {/* Node Core */}
                      <circle
                        r="5.5"
                        fill={nodeColor}
                        stroke="var(--surface)"
                        strokeWidth="1.5"
                      />

                      {/* Node Label */}
                      <text
                        x="12"
                        y="4"
                        fill="var(--text)"
                        fontSize="10"
                        fontWeight="600"
                        fontFamily="'Share Tech Mono', monospace"
                        className="schematic-node-label"
                      >
                        {node.shortName}
                      </text>
                    </g>
                  );
                })}
              </svg>

              <div className="schematic-legend font-mono">
                <span className="legend-item">
                  <span className="legend-dot bg-sage" /> Healthy
                </span>
                <span className="legend-item">
                  <span className="legend-dot bg-amber" /> Reorder
                </span>
                <span className="legend-item">
                  <span className="legend-dot bg-brick" /> Critical
                </span>
              </div>
            </div>
          </Panel>

          {/* Panel 2: Needs Attention Live Feed */}
          <Panel
            title="NEEDS IMMEDIATE REPLENISHMENT ATTENTION"
            icon={AlertTriangle}
            badge={`${needsAttentionLines.length} LINES`}
            actions={
              <Link to="/inventory" className="panel-action-link font-mono">
                <span>View Inventory</span>
                <ExternalLink size={12} />
              </Link>
            }
            className="attention-panel"
          >
            <div className="attention-feed-list font-mono">
              {needsAttentionLines.map((line) => (
                <div key={line.id} className="attention-feed-item">
                  <div className="attention-item-top">
                    <span className="attention-item-name">{line.name}</span>
                    <StatusChip status={line.status} />
                  </div>
                  <div className="attention-item-bottom">
                    <span className="attention-depot-tag">{line.depotName}</span>
                    <span className="attention-stock-val">
                      Stock: <strong>{line.quantity.toLocaleString()}</strong> / ROP: {line.reorderLevel.toLocaleString()}
                    </span>
                    <span className="attention-cover-val text-sand">
                      {line.weeksOfCover}w cover
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </Panel>
        </div>

        {/* Charts Row in Panels */}
        <div className="dashboard-charts-row" style={{ marginTop: '20px' }}>
          {/* Chart Panel 1: Stock Health by Depot */}
          <Panel
            title="DEPOT REPLENISHMENT HEALTH BREAKDOWN"
            icon={Layers}
            className="dashboard-chart-panel"
          >
            <div style={{ height: '280px', width: '100%' }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={depotStatusData} margin={{ top: 15, right: 15, left: 15, bottom: 25 }}>
                  <CartesianGrid {...RECHARTS_THEME.grid} />
                  <XAxis dataKey="depot" {...RECHARTS_THEME.xAxis} />
                  <YAxis {...RECHARTS_THEME.yAxis} allowDecimals={false} />
                  <Tooltip {...RECHARTS_THEME.tooltip} />
                  <Legend {...RECHARTS_THEME.legend} />
                  <Bar dataKey="healthy" name="Healthy" stackId="status" fill="var(--sage)" />
                  <Bar dataKey="reorder" name="Reorder needed" stackId="status" fill="var(--amber)" />
                  <Bar dataKey="critical" name="Critical low" stackId="status" fill="var(--brick)" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Panel>

          {/* Chart Panel 2: Low-Stock Lines by Category */}
          <Panel
            title="LOW-STOCK COMMODITIES BY CATEGORY"
            icon={Filter}
            className="dashboard-chart-panel"
          >
            <div style={{ height: '280px', width: '100%' }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={categoryLowStockData} margin={{ top: 15, right: 15, left: 15, bottom: 25 }}>
                  <CartesianGrid {...RECHARTS_THEME.grid} />
                  <XAxis dataKey="category" {...RECHARTS_THEME.xAxis} />
                  <YAxis {...RECHARTS_THEME.yAxis} allowDecimals={false} />
                  <Tooltip {...RECHARTS_THEME.tooltip} />
                  <Legend {...RECHARTS_THEME.legend} />
                  <Bar dataKey="lowStockCount" name="Lines <= ROP" fill="var(--amber)" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}
