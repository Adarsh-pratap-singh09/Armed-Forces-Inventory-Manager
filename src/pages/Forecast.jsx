/**
 * Indian Armed Forces Logistics and Inventory System
 * Demand Forecasting & Inventory Projection Page (Session 5)
 * 
 * NOTE: All data is synthetic for academic research.
 * No ammunition, weapons, or classified data are included.
 */

import { useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useInventory } from '../context/InventoryContext.jsx';
import PageHero from '../components/PageHero.jsx';
import {
  DEPOTS,
  DEPOT_MAP,
  ITEMS,
  ITEM_MAP,
  SIMULATED_DATA,
  getStockedItemsForDepot,
  getWeekCalendarDate
} from '../data/index.js';
import {
  FORECAST_METHOD_MAP,
  evaluateStockLineForecast
} from '../forecasting/index.js';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine
} from 'recharts';
import {
  Activity,
  Info,
  Clock,
  Cpu
} from 'lucide-react';
import { Panel, KpiTile, Field, SegmentedControl, RECHARTS_THEME } from '../components/ui/index.js';

export default function Forecast() {
  const [searchParams] = useSearchParams();
  const { currentUser, isStoreOfficer } = useAuth();
  const { stockLines } = useInventory();

  // Query parameter overrides
  const urlDepotParam = searchParams.get('depot');
  const urlItemParam = searchParams.get('item');

  // Determine initial depot safely based on role and URL
  const defaultDepotId = useMemo(() => {
    if (isStoreOfficer && currentUser?.depotId && DEPOT_MAP[currentUser.depotId]) {
      return currentUser.depotId;
    }
    if (urlDepotParam && DEPOT_MAP[urlDepotParam]) {
      return urlDepotParam;
    }
    return 'leh';
  }, [isStoreOfficer, currentUser, urlDepotParam]);

  const [selectedDepotId, setSelectedDepotId] = useState(defaultDepotId);

  const activeDepotId = (isStoreOfficer && currentUser?.depotId && DEPOT_MAP[currentUser.depotId])
    ? currentUser.depotId
    : (selectedDepotId || defaultDepotId);

  // Safe depot object
  const currentDepot = useMemo(() => {
    return DEPOT_MAP[activeDepotId] || DEPOTS[0];
  }, [activeDepotId]);

  // Available stocked items at selected depot
  const availableItems = useMemo(() => {
    const stocked = getStockedItemsForDepot(activeDepotId);
    return stocked && stocked.length > 0 ? stocked : ITEMS;
  }, [activeDepotId]);

  // Selected item state
  const [selectedItemId, setSelectedItemId] = useState(() => {
    if (urlItemParam && availableItems.some((i) => i.id === urlItemParam)) {
      return urlItemParam;
    }
    return availableItems[0]?.id || 'diesel';
  });

  // Active item ID (failsafe for first-render before effect sync)
  const activeItemId = useMemo(() => {
    if (urlItemParam && availableItems.some((i) => i.id === urlItemParam)) {
      return urlItemParam;
    }
    if (availableItems.some((i) => i.id === selectedItemId)) {
      return selectedItemId;
    }
    return availableItems[0]?.id || 'diesel';
  }, [availableItems, selectedItemId, urlItemParam]);

  const currentItem = useMemo(() => {
    return ITEM_MAP[activeItemId] || availableItems[0] || ITEMS[0];
  }, [activeItemId, availableItems]);

  // Algorithm selection and parameter states
  const [selectedMethodId, setSelectedMethodId] = useState('exponentialSmoothing');
  const [alpha, setAlpha] = useState(0.3);
  const [windowSize, setWindowSize] = useState(8);

  // Method parameters
  const methodParams = useMemo(() => {
    if (selectedMethodId === 'exponentialSmoothing') {
      return { alpha: Number(alpha) };
    }
    if (selectedMethodId === 'movingAverage') {
      return { window: Number(windowSize) };
    }
    if (selectedMethodId === 'seasonalNaive') {
      return { period: 52 };
    }
    return {};
  }, [selectedMethodId, alpha, windowSize]);

  // Retrieve raw demand history for depot-item
  const rawRecord = useMemo(() => {
    return SIMULATED_DATA[selectedDepotId]?.[activeItemId] || null;
  }, [selectedDepotId, activeItemId]);

  const weeklyDemand = useMemo(() => {
    return Array.isArray(rawRecord?.weeklyDemand) ? rawRecord.weeklyDemand : [];
  }, [rawRecord]);

  // Safely find live stock line state from InventoryContext (handles legacy localStorage formats)
  const currentStockLine = useMemo(() => {
    const found = Array.isArray(stockLines)
      ? stockLines.find(
          (l) =>
            (l.depotId === selectedDepotId || l.depot === selectedDepotId) &&
            (l.itemId === activeItemId || l.item === activeItemId)
        )
      : null;

    const rawInv = rawRecord?.inventory;
    const defaultRop = rawInv?.reorderLevel ?? 300;
    const defaultSs = rawInv?.safetyStock ?? Math.round(defaultRop * 0.35);

    const qty = Number(found?.quantity ?? rawInv?.stockOnHand ?? 500);
    const rop = Number(found?.reorderLevel ?? defaultRop);
    const ss = Number(found?.safetyStock ?? defaultSs);
    const lt = Number(found?.leadTimeWeeks ?? currentDepot?.leadTimeWeeks ?? 4);

    return {
      quantity: isNaN(qty) ? 0 : qty,
      reorderLevel: isNaN(rop) ? 0 : rop,
      safetyStock: isNaN(ss) ? 0 : ss,
      leadTimeWeeks: isNaN(lt) || lt <= 0 ? (currentDepot?.leadTimeWeeks || 4) : lt
    };
  }, [stockLines, selectedDepotId, activeItemId, rawRecord, currentDepot]);

  // Execute 26-week forecast and stock projection
  const forecastEvaluation = useMemo(() => {
    const history = weeklyDemand.map((d) => Number(d.demand || 0));
    return evaluateStockLineForecast(
      history,
      currentStockLine.quantity,
      currentStockLine.leadTimeWeeks,
      selectedMethodId,
      methodParams,
      26
    );
  }, [weeklyDemand, currentStockLine, selectedMethodId, methodParams]);

  // Forecast-based reorder level: Lead-time demand forecast + Safety stock
  const forecastReorderLevel = useMemo(() => {
    const fLead = Number(forecastEvaluation?.forecastLeadTimeDemand || 0);
    const ss = Number(currentStockLine?.safetyStock || 0);
    return Math.round(fLead + ss);
  }, [forecastEvaluation, currentStockLine]);

  // Percentage difference vs static ROP
  const ropDiff = forecastReorderLevel - currentStockLine.reorderLevel;
  const ropDiffPct =
    currentStockLine.reorderLevel > 0
      ? Number(((ropDiff / currentStockLine.reorderLevel) * 100).toFixed(1))
      : 0;

  // Chart 1 Data: Last 52 weeks of actual demand + 26 weeks forecast dashed
  const demandChartData = useMemo(() => {
    if (weeklyDemand.length < 52) return [];

    const last52Actual = weeklyDemand.slice(52); // weeks 53..104
    const chartPoints = [];

    // Historical 52 weeks (weeks 53 to 104)
    last52Actual.forEach((d, idx) => {
      const isWeek104 = idx === last52Actual.length - 1;
      chartPoints.push({
        weekLabel: `W${d.week}`,
        fullLabel: `Week ${d.week} (${d.date})`,
        actual: Number(d.demand || 0),
        forecast: isWeek104 ? Number(d.demand || 0) : null,
        isForecast: false
      });
    });

    // 26 Weeks Forward Forecast (weeks 105 to 130 / future weeks +1 to +26)
    if (Array.isArray(forecastEvaluation?.forecasts)) {
      forecastEvaluation.forecasts.forEach((fVal, idx) => {
        const futureWeek = 104 + (idx + 1);
        const cal = getWeekCalendarDate(futureWeek);
        chartPoints.push({
          weekLabel: `+${idx + 1}`,
          fullLabel: `Week ${futureWeek} (~${cal.formattedDate}) [Forecast +${idx + 1}]`,
          actual: null,
          forecast: Number((fVal || 0).toFixed(1)),
          isForecast: true
        });
      });
    }

    return chartPoints;
  }, [weeklyDemand, forecastEvaluation]);

  // Chart 2 Data: Projected Stock on Hand over 26 future weeks
  const stockProjectionChartData = useMemo(() => {
    const points = [];

    // Week 0: Current stock as-of week 104
    points.push({
      weekLabel: 'W104',
      fullLabel: 'Current Stock (Week 104)',
      projectedStock: currentStockLine.quantity,
      safetyStock: currentStockLine.safetyStock,
      reorderLevel: currentStockLine.reorderLevel,
      zero: 0
    });

    // 26 future weeks from trajectory
    if (Array.isArray(forecastEvaluation?.trajectory)) {
      forecastEvaluation.trajectory.forEach((step) => {
        points.push({
          weekLabel: `+${step.horizonStep}`,
          fullLabel: `Week ${step.simulationWeek} (~${step.date}) [Step +${step.horizonStep}]`,
          projectedStock: step.projectedStock,
          safetyStock: currentStockLine.safetyStock,
          reorderLevel: currentStockLine.reorderLevel,
          zero: 0
        });
      });
    }

    return points;
  }, [forecastEvaluation, currentStockLine]);

  // Find exact week label for stock-out reference line
  const stockOutWeekLabel = useMemo(() => {
    if (!forecastEvaluation?.stockOutWeek) return null;
    return `+${forecastEvaluation.stockOutWeek}`;
  }, [forecastEvaluation]);

  const algorithmOptions = [
    { value: 'exponentialSmoothing', label: 'EXP SMOOTH' },
    { value: 'movingAverage', label: 'MOVING AVG' },
    { value: 'seasonalNaive', label: 'SEASONAL' },
    { value: 'naive', label: 'NAIVE' }
  ];

  return (
    <div className="forecast-page fade-in-section">
      {/* Oscilloscope Waveform Hero Banner */}
      <PageHero
        theme="forecast"
        sectorCode="OSCILLOSCOPE"
        title="DEMAND FORECASTING & STOCK-OUT RUNWAY"
        tagline="26-week mathematical forward projection, stock-out depletion modeling, and predictive lead-time analysis."
        icon={Activity}
        badge={`${currentDepot.shortName} // ${currentItem.name}`}
      />

      <div className="page-container hero-overlap-content">
        <div className="console-split-layout">
          {/* Left Column: Control Console */}
          <div className="console-sidebar-stack">
            <Panel title="PREDICTION CONTROLS" badge="MATH-MODEL">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <Field
                  label="STATION / DEPOT"
                  help={isStoreOfficer ? "Locked to officer's assigned command" : "Switch logistics base"}
                >
                  <select
                    className="form-select"
                    value={activeDepotId}
                    onChange={(e) => setSelectedDepotId(e.target.value)}
                    disabled={isStoreOfficer}
                  >
                    {DEPOTS.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name} ({d.service.toUpperCase()}) — {d.leadTimeWeeks}w lead
                      </option>
                    ))}
                  </select>
                </Field>

                <Field label="COMMODITY / ITEM">
                  <select
                    className="form-select"
                    value={activeItemId}
                    onChange={(e) => setSelectedItemId(e.target.value)}
                  >
                    {availableItems.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name} ({item.unit})
                      </option>
                    ))}
                  </select>
                </Field>

                <Field label="ALGORITHM SELECTION">
                  <SegmentedControl
                    options={algorithmOptions}
                    value={selectedMethodId}
                    onChange={setSelectedMethodId}
                  />
                </Field>

                {/* Dynamic Parameter Sliders */}
                {selectedMethodId === 'exponentialSmoothing' && (
                  <Field label={`SMOOTHING FACTOR α: ${alpha}`}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <input
                        type="range"
                        min="0.05"
                        max="0.95"
                        step="0.05"
                        value={alpha}
                        onChange={(e) => setAlpha(Number(e.target.value))}
                        style={{ flex: 1, accentColor: 'var(--sand)' }}
                      />
                      <span className="font-mono text-sand" style={{ fontSize: '12px', minWidth: '32px' }}>
                        {alpha}
                      </span>
                    </div>
                  </Field>
                )}

                {selectedMethodId === 'movingAverage' && (
                  <Field label={`WINDOW SIZE: ${windowSize} WEEKS`}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <input
                        type="range"
                        min="2"
                        max="26"
                        step="1"
                        value={windowSize}
                        onChange={(e) => setWindowSize(Number(e.target.value))}
                        style={{ flex: 1, accentColor: 'var(--sand)' }}
                      />
                      <span className="font-mono text-sand" style={{ fontSize: '12px', minWidth: '32px' }}>
                        {windowSize}w
                      </span>
                    </div>
                  </Field>
                )}

                {selectedMethodId === 'seasonalNaive' && (
                  <div className="font-mono text-muted" style={{ fontSize: '11px', padding: '6px 8px', background: 'var(--surface-2)', borderRadius: '3px', border: '1px solid var(--border)' }}>
                    Fixed 52-week annual cycle lag. Falls back to naive if history &lt; 52w.
                  </div>
                )}

                {selectedMethodId === 'naive' && (
                  <div className="font-mono text-muted" style={{ fontSize: '11px', padding: '6px 8px', background: 'var(--surface-2)', borderRadius: '3px', border: '1px solid var(--border)' }}>
                    Zero parameters (repeats last recorded historical observation).
                  </div>
                )}
              </div>
            </Panel>

            {/* Model & Logistics Telemetry Box */}
            <div className="console-meta-box">
              <div className="console-meta-title">
                <Cpu size={13} /> MODEL PARAMETERS
              </div>
              <div className="console-meta-row">
                <span className="console-meta-key">Method:</span>
                <span className="console-meta-val">{FORECAST_METHOD_MAP[selectedMethodId]?.name}</span>
              </div>
              <div className="console-meta-row">
                <span className="console-meta-key">Active Stock on Hand:</span>
                <span className="console-meta-val font-mono">{currentStockLine.quantity.toLocaleString()} {currentItem.unit}</span>
              </div>
              <div className="console-meta-row">
                <span className="console-meta-key"><Clock size={11} style={{ display: 'inline', marginRight: 4 }} />Transit Lead Time:</span>
                <span className="console-meta-val font-mono">{currentStockLine.leadTimeWeeks} weeks</span>
              </div>
              <div className="console-meta-row">
                <span className="console-meta-key">Evaluation Horizon:</span>
                <span className="console-meta-val font-mono">26 weeks forward</span>
              </div>
            </div>
          </div>

          {/* Right Column: Demand Forecast Chart, 4 KPI Tiles & Depletion Runway */}
          <div className="console-main-stack">
            {weeklyDemand.length === 0 ? (
              <Panel title="NO HISTORICAL DEMAND RECORDED" badge="EMPTY">
                <div style={{ padding: '36px 20px', textAlign: 'center' }}>
                  <Info size={36} color="var(--amber)" style={{ marginBottom: '10px' }} />
                  <p style={{ color: 'var(--text-muted)', maxWidth: '480px', margin: '0 auto', fontSize: '13px' }}>
                    {currentItem?.name || 'This commodity'} is not stocked at {currentDepot?.name || 'the selected depot'}.
                    Please choose another commodity from the control panel.
                  </p>
                </div>
              </Panel>
            ) : (
              <>
                {/* Main 26-Week Forward Forecast Chart */}
                <Panel
                  title="WEEKLY DEMAND TIME SERIES & 26-WEEK FORECAST"
                  subtitle={`Solid: 52w historical actuals (W53–104) • Dashed: 26w forward projection (${FORECAST_METHOD_MAP[selectedMethodId]?.name})`}
                  badge="PROJECTION"
                >
                  <div style={{ width: '100%', height: 320 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart
                        data={demandChartData}
                        margin={{ top: 20, right: 30, left: 55, bottom: 25 }}
                      >
                        <CartesianGrid {...RECHARTS_THEME.grid} />
                        <XAxis
                          dataKey="weekLabel"
                          {...RECHARTS_THEME.xAxis}
                          interval={3}
                          label={{
                            value: 'Operational Weeks (Historical W53-W104 → Future Forecast +1 to +26)',
                            position: 'insideBottom',
                            offset: -12,
                            fontSize: 11,
                            fill: '#c9d1b8'
                          }}
                        />
                        <YAxis
                          {...RECHARTS_THEME.yAxis}
                          label={{
                            value: `Demand (${currentItem.unit.split(' ')[0]})`,
                            angle: -90,
                            position: 'insideLeft',
                            fontSize: 11,
                            fill: '#c9d1b8',
                            offset: 12
                          }}
                        />
                        <Tooltip
                          content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                              const data = payload[0].payload;
                              return (
                                <div className="chart-tooltip-console">
                                  <div className="chart-tooltip-title">{data.fullLabel}</div>
                                  {data.actual !== null && (
                                    <div className="chart-tooltip-row">
                                      <span className="text-muted">Actual Demand:</span>
                                      <span className="font-semibold text-sage">
                                        {data.actual} {currentItem.unit}
                                      </span>
                                    </div>
                                  )}
                                  {data.forecast !== null && data.isForecast && (
                                    <div className="chart-tooltip-row">
                                      <span className="text-muted">Forecast Demand:</span>
                                      <span className="font-semibold text-sand">
                                        {data.forecast} {currentItem.unit}
                                      </span>
                                    </div>
                                  )}
                                </div>
                              );
                            }
                            return null;
                          }}
                        />
                        <Legend
                          {...RECHARTS_THEME.legend}
                          wrapperStyle={{ top: -5, left: 15, paddingBottom: '12px' }}
                        />
                        <ReferenceLine
                          x="W104"
                          stroke="#d8cb9f"
                          strokeWidth={1.5}
                          strokeDasharray="2 2"
                          label={{
                            value: 'As-Of (W104)',
                            position: 'top',
                            fill: '#d8cb9f',
                            fontSize: 10
                          }}
                        />
                        <Line
                          type="monotone"
                          dataKey="actual"
                          name="Historical Actual Demand"
                          stroke="#a9c486"
                          strokeWidth={2}
                          dot={{ r: 1.5, fill: '#a9c486' }}
                          connectNulls={false}
                        />
                        <Line
                          type="monotone"
                          dataKey="forecast"
                          name="Forecast Projection (26w)"
                          stroke="#d8cb9f"
                          strokeWidth={2}
                          strokeDasharray="5 5"
                          dot={{ r: 2.5, fill: '#d8cb9f' }}
                          connectNulls={true}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </Panel>

                {/* Row of 4 Compact KPI Tiles below chart */}
                <div className="console-kpi-row">
                  <KpiTile
                    label="FORECAST LEAD-TIME DEMAND"
                    value={forecastEvaluation?.forecastLeadTimeDemand ?? 0}
                    unit={currentItem.unit}
                    hint={`Next ${currentStockLine.leadTimeWeeks}w lead window`}
                    variant="steel"
                  />

                  <KpiTile
                    label="FORECAST VS STATIC ROP"
                    value={forecastReorderLevel ?? 0}
                    unit={currentItem.unit}
                    hint={`${ropDiff >= 0 ? `+${ropDiff.toLocaleString()}` : ropDiff.toLocaleString()} units (${ropDiff >= 0 ? `+${ropDiffPct}%` : `${ropDiffPct}%`} var)`}
                    variant={ropDiff > 0 ? "amber" : "sage"}
                  />

                  <KpiTile
                    label="STOCK-OUT RUNWAY"
                    value={forecastEvaluation?.stockOutWeek ? `Week +${forecastEvaluation.stockOutWeek}` : '> 26 Weeks'}
                    hint={forecastEvaluation?.stockOutDate ? `Est. ~${forecastEvaluation.stockOutDate} (Simulated)` : 'Zero stockout risk across 26w'}
                    variant={forecastEvaluation?.stockOutWeek ? "brick" : "sage"}
                  />

                  <KpiTile
                    label="PREDICTIVE ALERT LEVEL"
                    value={forecastEvaluation?.alertLevel || 'Healthy'}
                    status={forecastEvaluation?.alertLevel || 'Healthy'}
                    statusColor={forecastEvaluation?.alertColor === 'red' ? 'brick' : forecastEvaluation?.alertColor === 'amber' ? 'amber' : 'sage'}
                    hint={forecastEvaluation?.alertReason || 'Buffer within operating parameters'}
                    variant={forecastEvaluation?.alertColor === 'red' ? 'brick' : forecastEvaluation?.alertColor === 'amber' ? 'amber' : 'sage'}
                  />
                </div>

                {/* Runway Depletion Chart in Bottom Panel */}
                <Panel
                  title="PROJECTED STOCK ON HAND RUNWAY (DEPLETION TRAJECTORY)"
                  subtitle={`Simulated forward consumption vs Static ROP (${(currentStockLine.reorderLevel ?? 0).toLocaleString()} ${currentItem.unit}) and Safety Stock (${(currentStockLine.safetyStock ?? 0).toLocaleString()} ${currentItem.unit})`}
                  badge="DEPLETION"
                >
                  <div style={{ width: '100%', height: 300 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart
                        data={stockProjectionChartData}
                        margin={{ top: 20, right: 30, left: 55, bottom: 25 }}
                      >
                        <CartesianGrid {...RECHARTS_THEME.grid} />
                        <XAxis
                          dataKey="weekLabel"
                          {...RECHARTS_THEME.xAxis}
                          label={{
                            value: 'Forecast Horizon (Weeks forward from Week 104)',
                            position: 'insideBottom',
                            offset: -12,
                            fontSize: 11,
                            fill: '#c9d1b8'
                          }}
                        />
                        <YAxis
                          {...RECHARTS_THEME.yAxis}
                          label={{
                            value: `Stock (${currentItem.unit.split(' ')[0]})`,
                            angle: -90,
                            position: 'insideLeft',
                            fontSize: 11,
                            fill: '#c9d1b8',
                            offset: 12
                          }}
                        />
                        <Tooltip
                          content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                              const data = payload[0].payload;
                              return (
                                <div className="chart-tooltip-console">
                                  <div className="chart-tooltip-title">{data.fullLabel}</div>
                                  <div className="chart-tooltip-row">
                                    <span className="text-muted">Projected Stock:</span>
                                    <span className="font-semibold text-sand">
                                      {(data.projectedStock ?? 0).toLocaleString()} {currentItem.unit}
                                    </span>
                                  </div>
                                  <div className="chart-tooltip-row">
                                    <span className="text-muted">Static ROP:</span>
                                    <span className="text-amber">
                                      {(data.reorderLevel ?? 0).toLocaleString()} {currentItem.unit}
                                    </span>
                                  </div>
                                  <div className="chart-tooltip-row">
                                    <span className="text-muted">Safety Stock:</span>
                                    <span className="text-steel">
                                      {(data.safetyStock ?? 0).toLocaleString()} {currentItem.unit}
                                    </span>
                                  </div>
                                </div>
                              );
                            }
                            return null;
                          }}
                        />
                        <Legend
                          {...RECHARTS_THEME.legend}
                          wrapperStyle={{ top: -5, left: 15, paddingBottom: '12px' }}
                        />

                        {currentStockLine.reorderLevel > 0 && (
                          <ReferenceLine
                            y={currentStockLine.reorderLevel}
                            stroke="#e0a947"
                            strokeDasharray="4 4"
                            strokeWidth={1.5}
                            name="Static ROP"
                          />
                        )}
                        {currentStockLine.safetyStock > 0 && (
                          <ReferenceLine
                            y={currentStockLine.safetyStock}
                            stroke="#86a9cc"
                            strokeDasharray="4 4"
                            strokeWidth={1.5}
                            name="Safety Stock"
                          />
                        )}
                        <ReferenceLine y={0} stroke="rgba(190, 210, 160, 0.22)" strokeWidth={1} />

                        {stockOutWeekLabel && (
                          <ReferenceLine
                            x={stockOutWeekLabel}
                            stroke="#d4705a"
                            strokeWidth={2}
                            label={{
                              value: `Stock-Out (Wk ${stockOutWeekLabel})`,
                              position: 'top',
                              fill: '#d4705a',
                              fontSize: 11,
                              fontWeight: 600
                            }}
                          />
                        )}

                        <Area
                          type="monotone"
                          dataKey="projectedStock"
                          name="Projected Stock on Hand"
                          stroke="#86a9cc"
                          strokeWidth={2}
                          fill="rgba(134, 169, 204, 0.18)"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </Panel>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
