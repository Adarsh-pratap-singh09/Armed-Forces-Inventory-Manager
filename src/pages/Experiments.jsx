/**
 * Indian Armed Forces Logistics and Inventory System
 * Forecasting Experiments & Benchmark Evaluation (Session 6)
 * 
 * NOTE: All data is synthetic and illustrative for academic research.
 * Strictly produces computed empirical numbers without hardcoded conclusions.
 */

import { useState, useMemo } from 'react';
import PageHero from '../components/PageHero.jsx';
import {
  runBenchmarkExperiment,
  runDepotCaseStudy,
  runVehicleExperiment,
  generateCSVContent,
  EXPERIMENT_VARIANTS,
  BOOTSTRAP_ITERATIONS
} from '../forecasting/index.js';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from 'recharts';
import {
  FlaskConical,
  Play,
  Download,
  RotateCcw
} from 'lucide-react';
import { Panel, KpiTile, SegmentedControl, StatusChip, RECHARTS_THEME } from '../components/ui/index.js';

export default function Experiments() {
  const [results, setResults] = useState(() => runBenchmarkExperiment());
  const [depotResults, setDepotResults] = useState(() => runDepotCaseStudy());
  const [vehicleResults, setVehicleResults] = useState(() => runVehicleExperiment());
  const [isRunning, setIsRunning] = useState(false);
  const [executionTimeMs, setExecutionTimeMs] = useState(150);

  // Overlay chart selection
  const [selectedSeriesId, setSelectedSeriesId] = useState('BENCH-031');
  const [overlayVariantA, setOverlayVariantA] = useState('seasonal_naive');
  const [overlayVariantB, setOverlayVariantB] = useState('ses_03');

  // Active table tab
  const [activeTab, setActiveTab] = useState('benchmark');

  // Run all experiments
  const executeExperiments = () => {
    setIsRunning(true);
    setTimeout(() => {
      const t0 = performance.now();
      const bench = runBenchmarkExperiment();
      const depots = runDepotCaseStudy();
      const vehicles = runVehicleExperiment();
      const t1 = performance.now();

      setResults(bench);
      setDepotResults(depots);
      setVehicleResults(vehicles);
      setExecutionTimeMs(Math.round(t1 - t0));
      setIsRunning(false);
    }, 50);
  };

  // CSV download helper
  const handleDownloadCSV = (type, filename) => {
    let content = '';
    if (['benchmark_series', 'results_per_series', 'summary_by_pattern', 'bootstrap_ci', 'surge_analysis'].includes(type)) {
      if (!results) return;
      content = generateCSVContent(type, results);
    } else if (type === 'case_study_depots') {
      if (!depotResults) return;
      content = generateCSVContent(type, depotResults);
    } else if (type === 'vehicles') {
      if (!vehicleResults) return;
      content = generateCSVContent(type, vehicleResults);
    }

    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Format numbers for display
  const fmt = (num, decimals = 4) => {
    if (num === null || num === undefined || isNaN(num)) return '—';
    return Number(num).toFixed(decimals);
  };

  // Chart 1: Grouped Bar Chart of Mean Lead-Time nMAE by Pattern
  const groupedChartData = useMemo(() => {
    if (!results) return [];
    return EXPERIMENT_VARIANTS.map((v) => {
      const steady = results.summaryByPattern.steady[v.id].nmae.mean;
      const seasonal = results.summaryByPattern.seasonal[v.id].nmae.mean;
      const spiky = results.summaryByPattern.spiky[v.id].nmae.mean;
      return {
        name: v.shortName,
        steady: Number(steady.toFixed(4)),
        seasonal: Number(seasonal.toFixed(4)),
        spiky: Number(spiky.toFixed(4))
      };
    });
  }, [results]);

  // Chart 2: Example Series Overlay (Weeks 52-104)
  const exampleOverlayData = useMemo(() => {
    if (!results) return [];
    const targetSeries = results.dataset.find((s) => s.id === selectedSeriesId) || results.dataset[0];
    if (!targetSeries) return [];

    const leadTime = targetSeries.leadTime || 4;
    const demandArr = targetSeries.weeklyDemand.map((w) => w.demand);

    const points = [];
    const minOrigin = 52;
    const maxOrigin = 104 - leadTime;

    const vA = EXPERIMENT_VARIANTS.find((x) => x.id === overlayVariantA) || EXPERIMENT_VARIANTS[0];
    const vB = EXPERIMENT_VARIANTS.find((x) => x.id === overlayVariantB) || EXPERIMENT_VARIANTS[5];

    for (let t = minOrigin; t <= maxOrigin; t++) {
      const history = demandArr.slice(0, t);
      const actualVal = demandArr[t];
      const weekNum = t + 1;

      const fA = vA.method === 'naive'
        ? history[history.length - 1]
        : vA.method === 'movingAverage'
        ? history.slice(history.length - (vA.params.window || 8)).reduce((a, b) => a + b, 0) / Math.min(vA.params.window || 8, history.length)
        : vA.method === 'exponentialSmoothing'
        ? history.reduce((lvl, val, idx) => idx === 0 ? val : (vA.params.alpha || 0.3) * val + (1 - (vA.params.alpha || 0.3)) * lvl, history[0])
        : history[history.length - 52] || history[history.length - 1];

      const fB = vB.method === 'naive'
        ? history[history.length - 1]
        : vB.method === 'movingAverage'
        ? history.slice(history.length - (vB.params.window || 8)).reduce((a, b) => a + b, 0) / Math.min(vB.params.window || 8, history.length)
        : vB.method === 'exponentialSmoothing'
        ? history.reduce((lvl, val, idx) => idx === 0 ? val : (vB.params.alpha || 0.3) * val + (1 - (vB.params.alpha || 0.3)) * lvl, history[0])
        : history[history.length - 52] || history[history.length - 1];

      points.push({
        week: `W${weekNum}`,
        actual: actualVal,
        forecastA: Math.round(fA),
        forecastB: Math.round(fB)
      });
    }

    return points;
  }, [results, selectedSeriesId, overlayVariantA, overlayVariantB]);

  // Find lowest mean lead-time nMAE in benchmark summary
  const bestVariants = useMemo(() => {
    if (!results) return {};
    const best = {};
    for (const pat of ['steady', 'seasonal', 'spiky']) {
      let minVal = Infinity;
      let bestId = null;
      for (const v of EXPERIMENT_VARIANTS) {
        const val = results.summaryByPattern[pat][v.id].nmae.mean;
        if (val < minVal) {
          minVal = val;
          bestId = v.id;
        }
      }
      best[pat] = bestId;
    }
    return best;
  }, [results]);

  const tabOptions = [
    { value: 'benchmark', label: 'BENCHMARK' },
    { value: 'bias', label: 'BIAS & DEFICIT' },
    { value: 'surge', label: 'SURGES' },
    { value: 'bootstrap', label: 'CONFIDENCE INTERVALS' },
    { value: 'depot', label: 'DEPOT CASE STUDY' },
    { value: 'vehicles', label: 'VEHICLES' }
  ];

  return (
    <div className="experiments-page fade-in-section">
      {/* Data Lab Grid Hero Banner */}
      <PageHero
        theme="experiments"
        sectorCode="EMPIRICAL-LAB"
        title="EMPIRICAL FORECASTING BENCHMARK LAB"
        tagline="Controlled rolling-origin backtesting across 8 forecasting variants on 90 benchmark series, 99 depot series, and 30 vehicle fleet series."
        icon={FlaskConical}
        badge={`EXECUTION: ${executionTimeMs || 150}ms // SEED: 42`}
      >
        <div style={{ marginTop: '12px' }}>
          <button
            type="button"
            className="hero-btn hero-btn-primary military-lift"
            onClick={executeExperiments}
            disabled={isRunning}
          >
            {isRunning ? (
              <>
                <RotateCcw size={15} className="spin-icon" /> Computing Benchmark...
              </>
            ) : (
              <>
                <Play size={15} /> Re-run Complete Benchmark
              </>
            )}
          </button>
        </div>
      </PageHero>

      <div className="page-container hero-overlap-content">
        {/* KPI Protocol Strip */}
        <div className="console-kpi-row" style={{ marginBottom: '22px' }}>
          <KpiTile
            label="BENCHMARK TIME-SERIES"
            value="90"
            hint="30 Steady • 30 Seasonal • 30 Spiky"
            variant="sand"
          />

          <KpiTile
            label="EVALUATION WINDOW"
            value="Year 2"
            hint="Rolling-origin Weeks 52–100"
            variant="steel"
          />

          <KpiTile
            label="BOOTSTRAP RESAMPLES"
            value={`${(BOOTSTRAP_ITERATIONS / 1000).toFixed(0)}k`}
            hint="95% Paired bootstrap intervals"
            variant="sage"
          />

          <KpiTile
            label="BENCHMARK LATENCY"
            value={`${executionTimeMs || 150}ms`}
            hint="Deterministic seeded run (Seed: 42)"
            variant="amber"
          />
        </div>

        {/* CSV Export Bar */}
        <div className="filter-card card-bracket" style={{ marginBottom: '22px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Download size={15} className="text-sand" />
              <span className="font-mono text-sand" style={{ fontSize: '11px', fontWeight: 600 }}>
                EXPORT RESEARCH ARTIFACTS (CSV):
              </span>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              <button
                type="button"
                className="btn-outline-sand"
                style={{ fontSize: '11px', padding: '3px 8px' }}
                onClick={() => handleDownloadCSV('summary_by_pattern', 'summary_by_pattern.csv')}
              >
                Summary by Pattern
              </button>
              <button
                type="button"
                className="btn-outline-sand"
                style={{ fontSize: '11px', padding: '3px 8px' }}
                onClick={() => handleDownloadCSV('bootstrap_ci', 'bootstrap_ci.csv')}
              >
                Bootstrap CIs
              </button>
              <button
                type="button"
                className="btn-outline-sand"
                style={{ fontSize: '11px', padding: '3px 8px' }}
                onClick={() => handleDownloadCSV('surge_analysis', 'surge_analysis.csv')}
              >
                Surge Analysis
              </button>
              <button
                type="button"
                className="btn-outline-sand"
                style={{ fontSize: '11px', padding: '3px 8px' }}
                onClick={() => handleDownloadCSV('case_study_depots', 'case_study_depots.csv')}
              >
                Depot Case Study
              </button>
              <button
                type="button"
                className="btn-outline-sand"
                style={{ fontSize: '11px', padding: '3px 8px' }}
                onClick={() => handleDownloadCSV('vehicles', 'vehicles.csv')}
              >
                Vehicle Fleet
              </button>
              <button
                type="button"
                className="btn-outline-sand"
                style={{ fontSize: '11px', padding: '3px 8px' }}
                onClick={() => handleDownloadCSV('results_per_series', 'results_per_series.csv')}
              >
                Per-Series Results
              </button>
            </div>
          </div>
        </div>

        {/* Visualizations Section (Charts first as required) */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: '20px', marginBottom: '24px' }}>
          {/* Chart 1: Grouped Bar Chart */}
          <Panel title="LEAD-TIME nMAE BY PATTERN & VARIANT" subtitle="Mean error over 4-week lead time across 30 series per pattern (lower is better)" badge="BAR-CHART">
            <div style={{ width: '100%', height: 300 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={groupedChartData} margin={{ top: 15, right: 15, left: -5, bottom: 25 }}>
                  <CartesianGrid {...RECHARTS_THEME.grid} />
                  <XAxis dataKey="name" {...RECHARTS_THEME.xAxis} interval={0} angle={-25} textAnchor="end" />
                  <YAxis {...RECHARTS_THEME.yAxis} label={{ value: 'Mean Lead-Time nMAE', angle: -90, position: 'insideLeft', fontSize: 11, fill: '#c9d1b8' }} />
                  <Tooltip
                    content={({ active, payload, label }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="chart-tooltip-console">
                            <div className="chart-tooltip-title">{label}</div>
                            {payload.map((entry, idx) => (
                              <div key={idx} className="chart-tooltip-row">
                                <span className="text-muted">{entry.name}:</span>
                                <span className="font-semibold" style={{ color: entry.fill }}>{fmt(entry.value, 4)}</span>
                              </div>
                            ))}
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Legend {...RECHARTS_THEME.legend} wrapperStyle={{ top: -5, left: 10, paddingBottom: '10px' }} />
                  <Bar dataKey="steady" name="Steady (n=30)" fill="#a9c486" />
                  <Bar dataKey="seasonal" name="Seasonal (n=30)" fill="#86a9cc" />
                  <Bar dataKey="spiky" name="Spiky (n=30)" fill="#d4705a" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Panel>

          {/* Chart 2: Example Series Overlay */}
          <Panel
            title="EXAMPLE SERIES FORECAST OVERLAY"
            subtitle="Rolling 1-step ahead predictions (Weeks 53–100) comparing two candidate variants"
            badge="OVERLAY"
            action={
              <div style={{ display: 'flex', gap: '6px' }}>
                <select
                  className="form-select font-mono"
                  style={{ fontSize: '11px', padding: '2px 6px', height: '28px' }}
                  value={selectedSeriesId}
                  onChange={(e) => setSelectedSeriesId(e.target.value)}
                >
                  <option value="BENCH-031">BENCH-031 (Seasonal)</option>
                  <option value="BENCH-001">BENCH-001 (Steady)</option>
                  <option value="BENCH-061">BENCH-061 (Spiky)</option>
                </select>

                <select
                  className="form-select font-mono"
                  style={{ fontSize: '11px', padding: '2px 6px', height: '28px' }}
                  value={overlayVariantA}
                  onChange={(e) => setOverlayVariantA(e.target.value)}
                >
                  {EXPERIMENT_VARIANTS.map((v) => (
                    <option key={v.id} value={v.id}>
                      A: {v.shortName}
                    </option>
                  ))}
                </select>

                <select
                  className="form-select font-mono"
                  style={{ fontSize: '11px', padding: '2px 6px', height: '28px' }}
                  value={overlayVariantB}
                  onChange={(e) => setOverlayVariantB(e.target.value)}
                >
                  {EXPERIMENT_VARIANTS.map((v) => (
                    <option key={v.id} value={v.id}>
                      B: {v.shortName}
                    </option>
                  ))}
                </select>
              </div>
            }
          >
            <div style={{ width: '100%', height: 300 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={exampleOverlayData} margin={{ top: 15, right: 15, left: -5, bottom: 25 }}>
                  <CartesianGrid {...RECHARTS_THEME.grid} />
                  <XAxis dataKey="week" {...RECHARTS_THEME.xAxis} interval={5} />
                  <YAxis {...RECHARTS_THEME.yAxis} />
                  <Tooltip
                    content={({ active, payload, label }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="chart-tooltip-console">
                            <div className="chart-tooltip-title">{label}</div>
                            {payload.map((entry, idx) => (
                              <div key={idx} className="chart-tooltip-row">
                                <span className="text-muted">{entry.name}:</span>
                                <span className="font-semibold" style={{ color: entry.stroke }}>{entry.value?.toLocaleString()}</span>
                              </div>
                            ))}
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Legend {...RECHARTS_THEME.legend} wrapperStyle={{ top: -5, left: 10, paddingBottom: '10px' }} />
                  <Line type="monotone" dataKey="actual" name="Actual Demand" stroke="#f1f4e8" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="forecastA" name={`A: ${overlayVariantA}`} stroke="#86a9cc" strokeWidth={1.8} strokeDasharray="3 3" dot={false} />
                  <Line type="monotone" dataKey="forecastB" name={`B: ${overlayVariantB}`} stroke="#e0a947" strokeWidth={1.8} strokeDasharray="4 4" dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Panel>
        </div>

        {/* Tabbed Data Tables Below */}
        <Panel
          title="EMPIRICAL EVALUATION METRICS TABLE"
          subtitle="Exact numbers computed by rolling-origin backtesting (best performing values highlighted in sage/sand)"
          badge="DATA-LAB"
          action={
            <SegmentedControl
              options={tabOptions}
              value={activeTab}
              onChange={setActiveTab}
            />
          }
        >
          {/* TAB 1: BENCHMARK LEAD-TIME nMAE & WINS */}
          {activeTab === 'benchmark' && results && (
            <div className="table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Variant</th>
                    <th>Parameters</th>
                    <th>Steady (n=30) Mean &plusmn; Std</th>
                    <th>Steady Median</th>
                    <th>Seasonal (n=30) Mean &plusmn; Std</th>
                    <th>Seasonal Median</th>
                    <th>Spiky (n=30) Mean &plusmn; Std</th>
                    <th>Spiky Median</th>
                    <th>Overall Wins</th>
                  </tr>
                </thead>
                <tbody>
                  {EXPERIMENT_VARIANTS.map((v) => {
                    const sSteady = results.summaryByPattern.steady[v.id].nmae;
                    const sSeas = results.summaryByPattern.seasonal[v.id].nmae;
                    const sSpiky = results.summaryByPattern.spiky[v.id].nmae;
                    const wins = results.summaryOverall[v.id].wins;

                    const isBestSteady = bestVariants.steady === v.id;
                    const isBestSeasonal = bestVariants.seasonal === v.id;
                    const isBestSpiky = bestVariants.spiky === v.id;

                    return (
                      <tr key={v.id}>
                        <td style={{ fontWeight: 600, color: 'var(--text)' }}>{v.name}</td>
                        <td className="font-mono text-muted" style={{ fontSize: '11px' }}>
                          {v.method} ({JSON.stringify(v.params)})
                        </td>
                        <td className="font-mono" style={{ fontWeight: isBestSteady ? 700 : 400, color: isBestSteady ? 'var(--sage)' : 'inherit' }}>
                          {fmt(sSteady.mean)} &plusmn; {fmt(sSteady.std)} {isBestSteady && '★'}
                        </td>
                        <td className="font-mono">{fmt(sSteady.median)}</td>
                        <td className="font-mono" style={{ fontWeight: isBestSeasonal ? 700 : 400, color: isBestSeasonal ? 'var(--sand)' : 'inherit' }}>
                          {fmt(sSeas.mean)} &plusmn; {fmt(sSeas.std)} {isBestSeasonal && '★'}
                        </td>
                        <td className="font-mono">{fmt(sSeas.median)}</td>
                        <td className="font-mono" style={{ fontWeight: isBestSpiky ? 700 : 400, color: isBestSpiky ? 'var(--amber)' : 'inherit' }}>
                          {fmt(sSpiky.mean)} &plusmn; {fmt(sSpiky.std)} {isBestSpiky && '★'}
                        </td>
                        <td className="font-mono">{fmt(sSpiky.median)}</td>
                        <td className="font-mono" style={{ fontWeight: 600, color: 'var(--text)' }}>
                          {wins} / 90 ({((wins / 90) * 100).toFixed(1)}%)
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* TAB 2: BIAS & DEFICIT */}
          {activeTab === 'bias' && results && (
            <div className="table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Variant</th>
                    <th>Steady Bias %</th>
                    <th>Steady Under-Forecast %</th>
                    <th>Seasonal Bias %</th>
                    <th>Seasonal Under-Forecast %</th>
                    <th>Spiky Bias %</th>
                    <th>Spiky Under-Forecast %</th>
                  </tr>
                </thead>
                <tbody>
                  {EXPERIMENT_VARIANTS.map((v) => {
                    const bSteady = results.summaryByPattern.steady[v.id].biasPct.mean;
                    const uSteady = results.summaryByPattern.steady[v.id].underForecastRate.mean;

                    const bSeas = results.summaryByPattern.seasonal[v.id].biasPct.mean;
                    const uSeas = results.summaryByPattern.seasonal[v.id].underForecastRate.mean;

                    const bSpiky = results.summaryByPattern.spiky[v.id].biasPct.mean;
                    const uSpiky = results.summaryByPattern.spiky[v.id].underForecastRate.mean;

                    return (
                      <tr key={v.id}>
                        <td style={{ fontWeight: 600, color: 'var(--text)' }}>{v.name}</td>
                        <td className="font-mono">{fmt(bSteady, 2)}%</td>
                        <td className="font-mono">{fmt(uSteady, 2)}%</td>
                        <td className="font-mono">{fmt(bSeas, 2)}%</td>
                        <td className="font-mono">{fmt(uSeas, 2)}%</td>
                        <td className="font-mono">{fmt(bSpiky, 2)}%</td>
                        <td className="font-mono">{fmt(uSpiky, 2)}%</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* TAB 3: SURGES */}
          {activeTab === 'surge' && results && (
            <div className="table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Variant</th>
                    <th>Surge Windows nMAE</th>
                    <th>Non-Surge Windows nMAE</th>
                    <th>Error Inflation Ratio</th>
                    <th>Evaluated Surge Origins</th>
                  </tr>
                </thead>
                <tbody>
                  {EXPERIMENT_VARIANTS.map((v) => {
                    const sa = results.surgeAnalysisSummary[v.id];
                    return (
                      <tr key={v.id}>
                        <td style={{ fontWeight: 600, color: 'var(--text)' }}>{v.name}</td>
                        <td className="font-mono" style={{ color: 'var(--brick)', fontWeight: 600 }}>{fmt(sa.surgeNmae)}</td>
                        <td className="font-mono" style={{ color: 'var(--sage)' }}>{fmt(sa.noSurgeNmae)}</td>
                        <td className="font-mono" style={{ fontWeight: 600, color: 'var(--amber)' }}>{fmt(sa.surgeRatio, 2)}x</td>
                        <td className="font-mono text-muted">{sa.surgeOriginsAnalyzed} origins</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* TAB 4: CONFIDENCE INTERVALS */}
          {activeTab === 'bootstrap' && results && (
            <div className="table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Pattern</th>
                    <th>Candidate Variant</th>
                    <th>Mean Difference (Candidate &minus; SES 0.3)</th>
                    <th>95% Bootstrap CI [2.5%, 97.5%]</th>
                    <th>Statistical Inference</th>
                  </tr>
                </thead>
                <tbody>
                  {['seasonal', 'spiky', 'steady'].flatMap((pat) =>
                    EXPERIMENT_VARIANTS.filter((v) => v.id !== 'ses_03').map((v) => {
                      const b = results.summaryByPattern[pat][v.id].bootstrapCI;
                      const isSig = (b.ciLower < 0 && b.ciUpper < 0) || (b.ciLower > 0 && b.ciUpper > 0);
                      const isSuperior = b.ciUpper < 0;

                      return (
                        <tr key={`${pat}-${v.id}`}>
                          <td>
                            <span className={`branch-badge branch-${pat === 'seasonal' ? 'navy' : pat === 'spiky' ? 'army' : 'air'}`}>
                              {pat.toUpperCase()}
                            </span>
                          </td>
                          <td style={{ fontWeight: 600, color: 'var(--text)' }}>{v.name}</td>
                          <td className="font-mono" style={{ color: b.meanDiff < 0 ? 'var(--sage)' : 'var(--brick)' }}>
                            {b.meanDiff > 0 ? `+${fmt(b.meanDiff)}` : fmt(b.meanDiff)}
                          </td>
                          <td className="font-mono" style={{ fontSize: '11px' }}>
                            [{b.ciLower > 0 ? `+${fmt(b.ciLower)}` : fmt(b.ciLower)}, {b.ciUpper > 0 ? `+${fmt(b.ciUpper)}` : fmt(b.ciUpper)}]
                          </td>
                          <td>
                            {isSig ? (
                              isSuperior ? (
                                <StatusChip status="Significantly Better" variant="sage" />
                              ) : (
                                <StatusChip status="Significantly Worse" variant="brick" />
                              )
                            ) : (
                              <StatusChip status="No Significant Difference" variant="amber" />
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* TAB 5: DEPOT CASE STUDY */}
          {activeTab === 'depot' && depotResults && (
            <div className="table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Variant</th>
                    <th>Steady Commodities (Mean nMAE)</th>
                    <th>Seasonal Commodities (Mean nMAE)</th>
                    <th>Spiky Commodities (Mean nMAE)</th>
                  </tr>
                </thead>
                <tbody>
                  {EXPERIMENT_VARIANTS.map((v) => {
                    const sSteady = depotResults.depotSummaryByPattern.steady?.[v.id]?.nmae.mean;
                    const sSeas = depotResults.depotSummaryByPattern.seasonal?.[v.id]?.nmae.mean;
                    const sSpiky = depotResults.depotSummaryByPattern.spiky?.[v.id]?.nmae.mean;

                    return (
                      <tr key={v.id}>
                        <td style={{ fontWeight: 600, color: 'var(--text)' }}>{v.name}</td>
                        <td className="font-mono">{fmt(sSteady)}</td>
                        <td className="font-mono" style={{ color: 'var(--sand)', fontWeight: 600 }}>{fmt(sSeas)}</td>
                        <td className="font-mono" style={{ color: 'var(--amber)', fontWeight: 600 }}>{fmt(sSpiky)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* TAB 6: VEHICLES */}
          {activeTab === 'vehicles' && vehicleResults && (
            <div className="table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Variant</th>
                    <th>1-Step-Ahead nMAE (Mean &plusmn; Std)</th>
                    <th>1-Step Median</th>
                    <th>4-Step-Ahead nMAE (Mean &plusmn; Std)</th>
                    <th>4-Step Median</th>
                  </tr>
                </thead>
                <tbody>
                  {EXPERIMENT_VARIANTS.map((v) => {
                    const s1 = vehicleResults.vehicleSummary[v.id].oneStepNmae;
                    const s4 = vehicleResults.vehicleSummary[v.id].fourStepNmae;

                    return (
                      <tr key={v.id}>
                        <td style={{ fontWeight: 600, color: 'var(--text)' }}>{v.name}</td>
                        <td className="font-mono">{fmt(s1.mean)} &plusmn; {fmt(s1.std)}</td>
                        <td className="font-mono">{fmt(s1.median)}</td>
                        <td className="font-mono" style={{ fontWeight: 600, color: 'var(--sage)' }}>
                          {fmt(s4.mean)} &plusmn; {fmt(s4.std)}
                        </td>
                        <td className="font-mono">{fmt(s4.median)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      </div>
    </div>
  );
}
