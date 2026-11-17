import { useState, useMemo } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import PageHero from '../components/PageHero.jsx';
import {
  DEPOTS,
  ITEMS,
  SIMULATED_DATA,
  getStockedItemsForDepot
} from '../data/index.js';
import {
  LineChart as LineChartIcon,
  Activity,
  Zap,
  Clock
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine
} from 'recharts';
import { Panel, KpiTile, Field, RECHARTS_THEME } from '../components/ui/index.js';

/**
 * Calm, informative dark console tooltip showing week number, calendar date, demand, and operational surge.
 */
function DemandTooltip({ active, payload }) {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="chart-tooltip-console">
        <div className="chart-tooltip-title">
          WEEK {data.week} // {data.date}
        </div>
        <div className="chart-tooltip-row">
          <span className="text-muted">Recorded Demand:</span>
          <span className="font-semibold text-sand">{data.demand?.toLocaleString()} {data.unit}</span>
        </div>
        {data.isSurge && (
          <div className="chart-tooltip-surge">
            <span className="console-surge-pill">
              <Zap size={11} /> {data.surgeLabel} ({data.surgeMultiplier}x)
            </span>
          </div>
        )}
      </div>
    );
  }
  return null;
}

export default function DemandExplorer() {
  const { currentUser, isStoreOfficer } = useAuth();
  const [selectedDepotId, setSelectedDepotId] = useState(
    isStoreOfficer && currentUser?.depotId ? currentUser.depotId : 'leh'
  );

  const activeDepotId = isStoreOfficer && currentUser?.depotId ? currentUser.depotId : selectedDepotId;

  // Items realistically stocked at the selected depot
  const stockedItems = useMemo(() => {
    return getStockedItemsForDepot(activeDepotId);
  }, [activeDepotId]);

  // Selected item ID state
  const [selectedItemId, setSelectedItemId] = useState('diesel');

  const activeItemId = useMemo(() => {
    return stockedItems.some((i) => i.id === selectedItemId)
      ? selectedItemId
      : (stockedItems[0]?.id || 'diesel');
  }, [stockedItems, selectedItemId]);

  const currentDepot = useMemo(
    () => DEPOTS.find((d) => d.id === activeDepotId) || DEPOTS[0],
    [activeDepotId]
  );

  const currentItem = useMemo(
    () => ITEMS.find((i) => i.id === activeItemId) || stockedItems[0] || ITEMS[0],
    [activeItemId, stockedItems]
  );

  const record = useMemo(() => {
    return SIMULATED_DATA[activeDepotId]?.[activeItemId] || null;
  }, [activeDepotId, activeItemId]);

  const chartData = useMemo(() => {
    if (!record) return [];
    return record.weeklyDemand.map((d) => ({
      ...d,
      unit: currentItem.unit
    }));
  }, [record, currentItem]);

  const stockStatusVariant = useMemo(() => {
    if (!record?.inventory) return 'sand';
    if (record.inventory.stockStatusColor === 'red') return 'brick';
    if (record.inventory.stockStatusColor === 'amber') return 'sand';
    return 'sage';
  }, [record]);

  return (
    <div className="explorer-page fade-in-section">
      {/* Hero Banner with right-aligned fade mask */}
      <PageHero
        theme="demand"
        sectorCode="DEMAND-SURGE"
        title="DEMAND DYNAMICS & OPERATIONAL SURGE EXPLORER"
        tagline="104-week empirical consumption series across seasonal cycles, exercise surges, and multi-theatre depots."
        icon={LineChartIcon}
        badge={`${currentDepot.shortName} // ${currentItem.name}`}
      />

      <div className="page-container hero-overlap-content">
        <div className="console-split-layout">
          {/* Left Column: Control Console & Operational Meta */}
          <div className="console-sidebar-stack">
            <Panel title="CONTROL CONSOLE" badge="CONFIG">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <Field
                  label="STATION / DEPOT"
                  help={isStoreOfficer ? "Locked to officer's assigned command" : "Switch logistics depot"}
                >
                  <select
                    id="depot-picker"
                    value={activeDepotId}
                    onChange={(e) => setSelectedDepotId(e.target.value)}
                    disabled={isStoreOfficer}
                    className="form-select"
                  >
                    {isStoreOfficer ? (
                      <option value={currentUser.depotId}>
                        {currentUser.depotName} ({currentUser.service})
                      </option>
                    ) : (
                      <>
                        <optgroup label="Army">
                          {DEPOTS.filter((d) => d.service === 'Army').map((d) => (
                            <option key={d.id} value={d.id}>
                              {d.name} ({d.command})
                            </option>
                          ))}
                        </optgroup>
                        <optgroup label="Navy">
                          {DEPOTS.filter((d) => d.service === 'Navy').map((d) => (
                            <option key={d.id} value={d.id}>
                              {d.name} ({d.command})
                            </option>
                          ))}
                        </optgroup>
                        <optgroup label="Air Force">
                          {DEPOTS.filter((d) => d.service === 'Air Force').map((d) => (
                            <option key={d.id} value={d.id}>
                              {d.name} ({d.command})
                            </option>
                          ))}
                        </optgroup>
                      </>
                    )}
                  </select>
                </Field>

                <Field label={`COMMODITY (${currentDepot.service} STOCKED)`}>
                  <select
                    id="item-picker"
                    value={activeItemId}
                    onChange={(e) => setSelectedItemId(e.target.value)}
                    className="form-select"
                  >
                    {stockedItems.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name} ({item.unit})
                      </option>
                    ))}
                  </select>
                </Field>
              </div>
            </Panel>

            {/* Profile & Surge Details */}
            <div className="console-meta-box">
              <div className="console-meta-title">
                <Activity size={13} /> OPERATIONAL PROFILE
              </div>
              <div className="console-meta-row">
                <span className="console-meta-key">Seasonal Peak:</span>
                <span className="console-meta-val">
                  Week {record?.seasonalityConfig?.peak || 'N/A'} ({(record?.seasonalityConfig?.amp * 100 || 0).toFixed(0)}% amp)
                </span>
              </div>
              <div className="console-meta-row">
                <span className="console-meta-key">Seasonal Rationale:</span>
                <span className="console-meta-val" style={{ fontSize: '11px', textAlign: 'left', fontWeight: 'normal' }}>
                  {record?.seasonalityConfig?.rationale || 'Standard cadence'}
                </span>
              </div>
              <div className="console-meta-row">
                <span className="console-meta-key"><Clock size={11} style={{ display: 'inline', marginRight: 4 }} />Lead Time:</span>
                <span className="console-meta-val">{record?.leadTimeWeeks} weeks</span>
              </div>
              <div className="console-meta-row">
                <span className="console-meta-key">Transit Profile:</span>
                <span className="console-meta-val" style={{ fontSize: '11px', textAlign: 'left', fontWeight: 'normal' }}>
                  {record?.leadTimeReason}
                </span>
              </div>
            </div>

            {/* Simulated Surges Information */}
            {record?.surges && record.surges.length > 0 && (
              <div className="console-meta-box">
                <div className="console-meta-title">
                  <Zap size={13} /> EXERCISE &amp; CLIMATE SURGES
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {record.surges.map((surge, idx) => (
                    <div key={idx} style={{ background: 'rgba(0,0,0,0.2)', padding: '6px 8px', borderRadius: '3px', border: '1px solid var(--border)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
                        <span className="font-semibold text-sand" style={{ fontSize: '11px' }}>{surge.label}</span>
                        <span className="console-surge-pill" style={{ fontSize: '10px', padding: '1px 5px' }}>{surge.multiplier}x</span>
                      </div>
                      <div className="text-muted font-mono" style={{ fontSize: '10px' }}>
                        Active weeks: {surge.weeks.join(', ')} ({surge.weeks.length} {surge.weeks.length === 1 ? 'week' : 'weeks'})
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Big Chart & 4 KPI Tiles */}
          <div className="console-main-stack">
            <Panel
              title="104-WEEK EMPIRICAL CONSUMPTION PROFILE"
              subtitle={`${currentDepot.name} (${currentDepot.command}) // ${currentItem.name}`}
              badge="TELEMETRY"
            >
              <div style={{ width: '100%', height: 380, paddingTop: 10 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 20, right: 25, left: 55, bottom: 25 }}>
                    <CartesianGrid {...RECHARTS_THEME.grid} />
                    <XAxis
                      dataKey="week"
                      {...RECHARTS_THEME.xAxis}
                      label={{
                        value: 'Timeline (104 Weeks // Week 1 begins 1 Jan 2024)',
                        position: 'insideBottom',
                        offset: -12,
                        fill: '#c9d1b8',
                        fontSize: 11
                      }}
                    />
                    <YAxis
                      {...RECHARTS_THEME.yAxis}
                      label={{
                        value: `Demand (${currentItem.unit.split(' ')[0]})`,
                        angle: -90,
                        position: 'insideLeft',
                        fill: '#c9d1b8',
                        fontSize: 11,
                        offset: 12
                      }}
                    />
                    <Tooltip content={<DemandTooltip />} />
                    <Legend
                      {...RECHARTS_THEME.legend}
                      wrapperStyle={{ top: -5, left: 15, paddingBottom: '12px' }}
                    />

                    {/* 26-week Mean (steel dashed line) */}
                    <ReferenceLine
                      y={record?.inventory.avgWeeklyDemand}
                      stroke="#86a9cc"
                      strokeDasharray="4 4"
                      strokeWidth={1.5}
                      name="26-week mean"
                    />

                    {/* Reorder Level (amber dashed line) */}
                    <ReferenceLine
                      y={record?.inventory.reorderLevel}
                      stroke="#e0a947"
                      strokeDasharray="6 4"
                      strokeWidth={1.5}
                      name="Reorder level (ROP)"
                    />

                    {/* Weekly Demand (sage line) */}
                    <Line
                      type="monotone"
                      dataKey="demand"
                      name="Weekly demand"
                      stroke="#a9c486"
                      strokeWidth={2}
                      dot={{ r: 1.5, fill: '#a9c486' }}
                      activeDot={{ r: 5, fill: '#a9c486', stroke: '#f1f4e8', strokeWidth: 2 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Panel>

            {/* Row of 4 stock metric KPI tiles below chart */}
            <div className="console-kpi-row">
              <KpiTile
                label="STOCK ON HAND"
                value={record?.inventory.stockOnHand}
                unit={currentItem.unit}
                status={record?.inventory.stockStatus}
                statusColor={stockStatusVariant}
                variant={stockStatusVariant}
              />

              <KpiTile
                label="26-WEEK AVG DEMAND"
                value={record?.inventory.avgWeeklyDemand}
                unit={`${currentItem.unit}/wk`}
                hint={`Std dev: ${record?.inventory.stdDev26} ${currentItem.unit}`}
                variant="steel"
              />

              <KpiTile
                label="BUFFER / SAFETY STOCK"
                value={record?.inventory.safetyStock}
                unit={currentItem.unit}
                hint="95% cycle service level (k = 1.65)"
                variant="sand"
              />

              <KpiTile
                label="STATIC REORDER POINT"
                value={record?.inventory.reorderLevel}
                unit={currentItem.unit}
                hint={`Runway: ${record?.inventory.weeksOfSupply} weeks`}
                variant="amber"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
