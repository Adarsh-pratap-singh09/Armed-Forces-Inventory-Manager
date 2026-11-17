/**
 * Indian Armed Forces Logistics and Inventory System
 * Forecasting Experiments Engine & Benchmark Framework (Session 6)
 * 
 * NOTE: All data is synthetic and illustrative for academic research.
 * Never hard-codes results or conclusions: produces computed numbers only.
 * 
 * Shared between headless Node.js scripts (CLI) and the browser React interface.
 */

import { createRNG, seededFloat, seededInt, DEFAULT_SEED } from '../data/prng.js';
import { naive, movingAverage, exponentialSmoothing, seasonalNaive } from './methods.js';
import { SIMULATED_DATA, DEPOTS } from '../data/index.js';
import { INITIAL_VEHICLES } from '../data/vehicles.js';

// Deterministic seed constants
export const BENCHMARK_SEED = DEFAULT_SEED + 500;
export const BOOTSTRAP_SEED = DEFAULT_SEED + 800;
export const BOOTSTRAP_ITERATIONS = 2000;

/**
 * 8 Standard Forecasting Variants (No per-series tuning)
 */
export const EXPERIMENT_VARIANTS = [
  { id: 'naive', name: 'Naive', shortName: 'Naive', method: 'naive', params: {} },
  { id: 'ma_4', name: 'MA (w=4)', shortName: 'MA (4)', method: 'movingAverage', params: { window: 4 } },
  { id: 'ma_8', name: 'MA (w=8)', shortName: 'MA (8)', method: 'movingAverage', params: { window: 8 } },
  { id: 'ma_12', name: 'MA (w=12)', shortName: 'MA (12)', method: 'movingAverage', params: { window: 12 } },
  { id: 'ses_01', name: 'SES (alpha=0.1)', shortName: 'SES (0.1)', method: 'exponentialSmoothing', params: { alpha: 0.1 } },
  { id: 'ses_03', name: 'SES (alpha=0.3)', shortName: 'SES (0.3)', method: 'exponentialSmoothing', params: { alpha: 0.3 } },
  { id: 'ses_05', name: 'SES (alpha=0.5)', shortName: 'SES (0.5)', method: 'exponentialSmoothing', params: { alpha: 0.5 } },
  { id: 'seasonal_naive', name: 'Seasonal Naive', shortName: 'S. Naive', method: 'seasonalNaive', params: { period: 52 } }
];

export const VARIANT_MAP = Object.fromEntries(
  EXPERIMENT_VARIANTS.map((v) => [v.id, v])
);

/**
 * Pattern Classification Rule
 * 
 * Derives qualitative demand pattern label ('seasonal' | 'spiky' | 'steady')
 * from underlying generator characteristics:
 * - 'seasonal': seasonal amplitude >= 0.15 (harmonic cyclic modulation)
 * - else 'spiky': surge active weeks >= 3 (intermittent operational spikes)
 * - else 'steady': baseline demand without pronounced cycles or spikes
 * 
 * @param {number} amplitude - Harmonic seasonal amplitude (0.0 to 1.0)
 * @param {number} surgeWeeksCount - Number of weeks with active surge events
 * @returns {'seasonal' | 'spiky' | 'steady'}
 */
export function getPatternLabel(amplitude, surgeWeeksCount) {
  if (amplitude >= 0.15) {
    return 'seasonal';
  }
  if (surgeWeeksCount >= 3) {
    return 'spiky';
  }
  return 'steady';
}

/**
 * Helper to classify an existing depot-item series from SIMULATED_DATA
 */
export function classifyDepotItemRecord(record) {
  const amp = record?.seasonalityConfig?.amp ?? 0;
  const surgeCount = record?.surgeWeeks?.length ?? (record?.surges?.length ? record.surges.length * 2 : 0);
  return getPatternLabel(amp, surgeCount);
}

/**
 * Benchmark Generator
 * 
 * Generates 90 seeded synthetic series of 104 weeks, exactly 30 per pattern
 * ('steady', 'seasonal', 'spiky'), using the identical demand formulation:
 *   rawDemand = base * seasonality * surgeMultiplier * noise
 *   demand = Math.max(1, Math.round(rawDemand))
 * 
 * Parameter ranges:
 * - base: 100 to 5000
 * - noise: 5% to 15% (bipolar bounded stochastic variation)
 * - seasonal: amplitude 0.2 to 0.6, peak week 1 to 52, surge probability <= 0.01
 * - spiky: surge probability 0.04 to 0.08 per week, magnitude 1.6 to 2.8, duration 1 to 3 weeks, amplitude <= 0.05
 * - steady: amplitude <= 0.05, surge probability <= 0.01
 * 
 * @param {number} [seed=BENCHMARK_SEED] - Deterministic PRNG seed
 * @returns {Array} Array of 90 series objects
 */
export function generateBenchmarkSeries(seed = BENCHMARK_SEED) {
  const rng = createRNG(seed);
  const seriesList = [];
  const PATTERNS = ['steady', 'seasonal', 'spiky'];
  const SERIES_PER_PATTERN = 30;

  let globalId = 1;

  for (const pattern of PATTERNS) {
    for (let i = 1; i <= SERIES_PER_PATTERN; i++) {
      const id = `BENCH-${String(globalId).padStart(3, '0')}`;
      globalId++;

      // 1. Base consumption
      const base = seededInt(rng, 100, 5000);

      // 2. Noise magnitude (5% to 15%)
      const noiseAmp = seededFloat(rng, 0.05, 0.15);

      // 3. Pattern-specific parameters
      let amplitude;
      let peakWeek;
      let surgeProbability;

      if (pattern === 'seasonal') {
        amplitude = seededFloat(rng, 0.20, 0.60);
        peakWeek = seededInt(rng, 1, 52);
        surgeProbability = 0.008; // negligible surge
      } else if (pattern === 'spiky') {
        amplitude = seededFloat(rng, 0.01, 0.05);
        peakWeek = 26;
        surgeProbability = seededFloat(rng, 0.04, 0.08); // 4% to 8% weekly surge probability
      } else {
        // steady
        amplitude = seededFloat(rng, 0.01, 0.05);
        peakWeek = 26;
        surgeProbability = 0.005; // <= 0.01
      }

      // Generate 104 weeks of demand
      const weeklyDemand = [];
      const surgeWeeks = [];
      let remainingSurgeWeeks = 0;
      let currentSurgeMultiplier = 1.0;

      for (let w = 1; w <= 104; w++) {
        const weekOfYear = ((w - 1) % 52) + 1;

        // Seasonality factor
        const seasonality = 1 + amplitude * Math.cos((2 * Math.PI * (weekOfYear - peakWeek)) / 52);

        // Surge logic
        let isSurge = false;
        let surgeMultiplier = 1.0;

        if (remainingSurgeWeeks > 0) {
          isSurge = true;
          surgeMultiplier = currentSurgeMultiplier;
          remainingSurgeWeeks--;
          surgeWeeks.push(w);
        } else if (rng() < surgeProbability) {
          isSurge = true;
          const duration = seededInt(rng, 1, 3);
          const magnitude = seededFloat(rng, 1.6, 2.8);
          currentSurgeMultiplier = magnitude;
          surgeMultiplier = magnitude;
          remainingSurgeWeeks = duration - 1; // current week counts as 1
          surgeWeeks.push(w);
        }

        // Noise factor: uniform in [1 - noiseAmp, 1 + noiseAmp]
        const noise = 1 + seededFloat(rng, -noiseAmp, noiseAmp);

        const raw = base * seasonality * surgeMultiplier * noise;
        const demand = Math.max(1, Math.round(raw));

        weeklyDemand.push({
          week: w,
          demand,
          isSurge,
          seasonality: Number(seasonality.toFixed(3)),
          surgeMultiplier: Number(surgeMultiplier.toFixed(2))
        });
      }

      seriesList.push({
        id,
        pattern,
        base,
        amplitude: Number(amplitude.toFixed(3)),
        peakWeek,
        noiseAmp: Number(noiseAmp.toFixed(3)),
        surgeProbability: Number(surgeProbability.toFixed(3)),
        surgeWeeks,
        weeklyDemand,
        leadTime: 4 // benchmark standard lead time
      });
    }
  }

  return seriesList;
}

/**
 * Dispatches a forecasting function call.
 */
function callForecastMethod(methodName, history, horizon, params) {
  switch (methodName) {
    case 'naive':
      return naive(history, horizon, params);
    case 'movingAverage':
      return movingAverage(history, horizon, params);
    case 'exponentialSmoothing':
      return exponentialSmoothing(history, horizon, params);
    case 'seasonalNaive':
      return seasonalNaive(history, horizon, params);
    default:
      return naive(history, horizon, params);
  }
}

/**
 * Evaluates a single time-series against all 8 variants using rolling origins.
 * 
 * Rolling origin protocol:
 * - Test origins: week 52 up to (104 - leadTime) inclusive.
 * - History at origin t: series[0 ... t-1] (length t).
 * - Target future at origin t: series[t ... t + leadTime - 1] (length leadTime).
 * 
 * Metrics evaluated per origin:
 * - One-step ahead: actual, forecast, error (forecast - actual).
 * - Lead-time demand: sum(actuals), sum(forecasts), lead error (sum_forecast - sum_actual).
 * 
 * @param {object} seriesObj - Object containing id, pattern, leadTime, weeklyDemand (array of numbers or {demand})
 * @param {Array} [variants=EXPERIMENT_VARIANTS] - Model variants
 * @returns {object} Map of variantId -> performance metrics
 */
export function evaluateSeriesVariants(seriesObj, variants = EXPERIMENT_VARIANTS) {
  const demandArray = seriesObj.weeklyDemand.map((d) => (typeof d === 'number' ? d : d.demand));
  const leadTime = Math.max(1, Math.floor(seriesObj.leadTime || 4));
  const surgeWeeksSet = new Set(seriesObj.surgeWeeks || []);

  const N = demandArray.length;
  const minOrigin = 52;
  const maxOrigin = N - leadTime;

  if (maxOrigin < minOrigin) {
    throw new Error(`Series length ${N} insufficient for minOrigin ${minOrigin} and leadTime ${leadTime}`);
  }

  const results = {};

  for (const variant of variants) {
    let sumOneStepAbsErr = 0;
    let sumOneStepSqErr = 0;
    let sumOneStepErr = 0;
    let sumOneStepActual = 0;

    let sumLeadAbsErr = 0;
    let sumLeadErr = 0;
    let sumLeadActual = 0;
    let underForecastCount = 0;

    // Surge isolation tracking
    let sumSurgeLeadAbsErr = 0;
    let sumSurgeLeadActual = 0;
    let countSurgeOrigins = 0;

    let sumNoSurgeLeadAbsErr = 0;
    let sumNoSurgeLeadActual = 0;
    let countNoSurgeOrigins = 0;

    const totalOrigins = maxOrigin - minOrigin + 1;

    for (let t = minOrigin; t <= maxOrigin; t++) {
      const history = demandArray.slice(0, t);
      const actualFuture = demandArray.slice(t, t + leadTime);

      const forecastFuture = callForecastMethod(variant.method, history, leadTime, variant.params);

      // 1. One-step ahead
      const act1 = actualFuture[0];
      const fcast1 = forecastFuture[0];
      const err1 = fcast1 - act1;

      sumOneStepActual += act1;
      sumOneStepErr += err1;
      sumOneStepAbsErr += Math.abs(err1);
      sumOneStepSqErr += err1 * err1;

      // 2. Lead-time demand
      let actualLead = 0;
      let forecastLead = 0;
      let windowHasSurge = false;

      for (let i = 0; i < leadTime; i++) {
        actualLead += actualFuture[i];
        forecastLead += forecastFuture[i];
        const weekNum = t + i + 1; // 1-based week
        if (surgeWeeksSet.has(weekNum)) {
          windowHasSurge = true;
        }
      }

      const leadErr = forecastLead - actualLead;
      const absLeadErr = Math.abs(leadErr);

      sumLeadActual += actualLead;
      sumLeadErr += leadErr;
      sumLeadAbsErr += absLeadErr;

      // Under-forecast check (< 80% of actual)
      if (forecastLead < 0.80 * actualLead) {
        underForecastCount++;
      }

      // Surge partition
      if (windowHasSurge) {
        sumSurgeLeadAbsErr += absLeadErr;
        sumSurgeLeadActual += actualLead;
        countSurgeOrigins++;
      } else {
        sumNoSurgeLeadAbsErr += absLeadErr;
        sumNoSurgeLeadActual += actualLead;
        countNoSurgeOrigins++;
      }
    }

    // One-step metrics
    const oneStepMae = sumOneStepAbsErr / totalOrigins;
    const oneStepRmse = Math.sqrt(sumOneStepSqErr / totalOrigins);
    const oneStepBias = sumOneStepErr / totalOrigins;
    const meanOneStepActual = sumOneStepActual / totalOrigins;
    const oneStepNmae = meanOneStepActual > 0 ? oneStepMae / meanOneStepActual : 0;

    // Lead-time metrics
    const leadMae = sumLeadAbsErr / totalOrigins;
    const meanLeadActual = sumLeadActual / totalOrigins;
    const leadTimeNmae = meanLeadActual > 0 ? leadMae / meanLeadActual : 0;
    const biasPct = meanLeadActual > 0 ? ((sumLeadErr / totalOrigins) / meanLeadActual) * 100 : 0;
    const underForecastRate = (underForecastCount / totalOrigins) * 100;

    // Surge analysis metrics
    const surgeNmae =
      countSurgeOrigins > 0 && sumSurgeLeadActual > 0
        ? (sumSurgeLeadAbsErr / countSurgeOrigins) / (sumSurgeLeadActual / countSurgeOrigins)
        : null;

    const noSurgeNmae =
      countNoSurgeOrigins > 0 && sumNoSurgeLeadActual > 0
        ? (sumNoSurgeLeadAbsErr / countNoSurgeOrigins) / (sumNoSurgeLeadActual / countNoSurgeOrigins)
        : null;

    results[variant.id] = {
      variantId: variant.id,
      variantName: variant.name,
      totalOrigins,
      oneStep: {
        mae: Number(oneStepMae.toFixed(3)),
        rmse: Number(oneStepRmse.toFixed(3)),
        bias: Number(oneStepBias.toFixed(3)),
        nmae: Number(oneStepNmae.toFixed(4))
      },
      leadTime: {
        mae: Number(leadMae.toFixed(3)),
        meanActual: Number(meanLeadActual.toFixed(2)),
        nmae: Number(leadTimeNmae.toFixed(4)),
        biasPct: Number(biasPct.toFixed(2)),
        underForecastRate: Number(underForecastRate.toFixed(2))
      },
      surgeAnalysis: {
        countSurgeOrigins,
        countNoSurgeOrigins,
        surgeNmae: surgeNmae !== null ? Number(surgeNmae.toFixed(4)) : null,
        noSurgeNmae: noSurgeNmae !== null ? Number(noSurgeNmae.toFixed(4)) : null,
        surgeRatio:
          surgeNmae !== null && noSurgeNmae !== null && noSurgeNmae > 0
            ? Number((surgeNmae / noSurgeNmae).toFixed(2))
            : null
      }
    };
  }

  return results;
}

/**
 * Statistical Aggregation Functions: Mean, Median, Sample Standard Deviation
 */
export function calculateStats(arr) {
  if (!Array.isArray(arr) || arr.length === 0) {
    return { mean: 0, median: 0, std: 0, n: 0 };
  }
  const n = arr.length;
  const sum = arr.reduce((acc, val) => acc + val, 0);
  const mean = sum / n;

  // Median
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(n / 2);
  const median = n % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;

  // Sample standard deviation (n - 1)
  let std = 0;
  if (n > 1) {
    const sumSqDiff = arr.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0);
    std = Math.sqrt(sumSqDiff / (n - 1));
  }

  return {
    mean: Number(mean.toFixed(4)),
    median: Number(median.toFixed(4)),
    std: Number(std.toFixed(4)),
    n
  };
}

/**
 * Paired Bootstrap 95% Confidence Interval
 * 
 * Computes 2000 seeded resamples of the difference in mean metric (e.g. lead-time nMAE)
 * between a candidate variant and the baseline 'ses_03' across n series.
 * 
 * @param {number[]} candidateValues - Array of metric values for variant
 * @param {number[]} baselineValues - Array of metric values for baseline (ses_03)
 * @param {number} [iterations=BOOTSTRAP_ITERATIONS] - Number of resamples
 * @param {number} [seed=BOOTSTRAP_SEED] - Deterministic PRNG seed
 * @returns {object} { meanDiff, ciLower, ciUpper, iterations }
 */
export function calculatePairedBootstrapCI(
  candidateValues,
  baselineValues,
  iterations = BOOTSTRAP_ITERATIONS,
  seed = BOOTSTRAP_SEED
) {
  if (
    !Array.isArray(candidateValues) ||
    !Array.isArray(baselineValues) ||
    candidateValues.length === 0 ||
    candidateValues.length !== baselineValues.length
  ) {
    return { meanDiff: 0, ciLower: 0, ciUpper: 0, iterations: 0 };
  }

  const n = candidateValues.length;
  const pairedDiffs = candidateValues.map((v, i) => v - baselineValues[i]);
  const sampleMeanDiff = pairedDiffs.reduce((a, b) => a + b, 0) / n;

  // If all differences are identical (e.g. comparing ses_03 to itself), interval is degenerate
  const allIdentical = pairedDiffs.every((d) => Math.abs(d - pairedDiffs[0]) < 1e-12);
  if (allIdentical) {
    return {
      meanDiff: Number(sampleMeanDiff.toFixed(4)),
      ciLower: Number(sampleMeanDiff.toFixed(4)),
      ciUpper: Number(sampleMeanDiff.toFixed(4)),
      iterations
    };
  }

  const rng = createRNG(seed);
  const bootstrapMeans = new Float64Array(iterations);

  for (let b = 0; b < iterations; b++) {
    let bSum = 0;
    for (let i = 0; i < n; i++) {
      const idx = Math.floor(rng() * n);
      bSum += pairedDiffs[idx];
    }
    bootstrapMeans[b] = bSum / n;
  }

  bootstrapMeans.sort();

  // 95% Percentile Confidence Interval: 2.5th and 97.5th percentiles
  const lowerIndex = Math.floor(iterations * 0.025);
  const upperIndex = Math.floor(iterations * 0.975);

  const ciLower = bootstrapMeans[lowerIndex];
  const ciUpper = bootstrapMeans[upperIndex];

  return {
    meanDiff: Number(sampleMeanDiff.toFixed(4)),
    ciLower: Number(ciLower.toFixed(4)),
    ciUpper: Number(ciUpper.toFixed(4)),
    iterations
  };
}

/**
 * Runs the complete Benchmark Experiment across 90 synthetic series.
 */
export function runBenchmarkExperiment(seriesList = null, variants = EXPERIMENT_VARIANTS) {
  const dataset = seriesList || generateBenchmarkSeries();
  const perSeriesResults = [];

  // 1. Evaluate every series
  for (const series of dataset) {
    const variantEvals = evaluateSeriesVariants(series, variants);
    perSeriesResults.push({
      seriesId: series.id,
      pattern: series.pattern,
      base: series.base,
      amplitude: series.amplitude,
      surgeWeeksCount: series.surgeWeeks.length,
      leadTime: series.leadTime,
      evals: variantEvals
    });
  }

  // 2. Count "wins" per series (lowest lead-time nMAE)
  const winsCount = {};
  for (const v of variants) {
    winsCount[v.id] = { steady: 0, seasonal: 0, spiky: 0, overall: 0 };
  }

  for (const res of perSeriesResults) {
    let bestVariantId = null;
    let minNmae = Infinity;

    for (const v of variants) {
      const nmae = res.evals[v.id].leadTime.nmae;
      if (nmae < minNmae) {
        minNmae = nmae;
        bestVariantId = v.id;
      }
    }

    if (bestVariantId) {
      winsCount[bestVariantId][res.pattern]++;
      winsCount[bestVariantId].overall++;
    }
  }

  // 3. Aggregate by Pattern x Variant
  const patterns = ['steady', 'seasonal', 'spiky'];
  const summaryByPattern = {};

  for (const pattern of patterns) {
    summaryByPattern[pattern] = {};
    const patternSeries = perSeriesResults.filter((s) => s.pattern === pattern);

    // Extract baseline values for paired bootstrap (ses_03)
    const baselineNmaeList = patternSeries.map((s) => s.evals['ses_03'].leadTime.nmae);

    for (const v of variants) {
      const nmaeList = patternSeries.map((s) => s.evals[v.id].leadTime.nmae);
      const biasPctList = patternSeries.map((s) => s.evals[v.id].leadTime.biasPct);
      const underForecastList = patternSeries.map((s) => s.evals[v.id].leadTime.underForecastRate);

      const statsNmae = calculateStats(nmaeList);
      const statsBias = calculateStats(biasPctList);
      const statsUnder = calculateStats(underForecastList);

      // Bootstrap CI vs ses_03
      const bootstrapCI = calculatePairedBootstrapCI(nmaeList, baselineNmaeList);

      summaryByPattern[pattern][v.id] = {
        variantId: v.id,
        variantName: v.name,
        shortName: v.shortName,
        pattern,
        nmae: statsNmae,
        biasPct: { mean: statsBias.mean, median: statsBias.median },
        underForecastRate: { mean: statsUnder.mean, median: statsUnder.median },
        wins: winsCount[v.id][pattern],
        bootstrapCI
      };
    }
  }

  // 4. Overall aggregation across all 90 series
  const summaryOverall = {};
  const allBaselineNmae = perSeriesResults.map((s) => s.evals['ses_03'].leadTime.nmae);

  for (const v of variants) {
    const allNmae = perSeriesResults.map((s) => s.evals[v.id].leadTime.nmae);
    const allBias = perSeriesResults.map((s) => s.evals[v.id].leadTime.biasPct);
    const allUnder = perSeriesResults.map((s) => s.evals[v.id].leadTime.underForecastRate);

    summaryOverall[v.id] = {
      variantId: v.id,
      variantName: v.name,
      shortName: v.shortName,
      nmae: calculateStats(allNmae),
      biasPct: calculateStats(allBias),
      underForecastRate: calculateStats(allUnder),
      wins: winsCount[v.id].overall,
      bootstrapCI: calculatePairedBootstrapCI(allNmae, allBaselineNmae)
    };
  }

  // 5. Surge Analysis (spiky series)
  const surgeAnalysisSummary = {};
  const spikyResults = perSeriesResults.filter((s) => s.pattern === 'spiky');

  for (const v of variants) {
    const surgeNmaeList = [];
    const noSurgeNmaeList = [];

    for (const s of spikyResults) {
      const sa = s.evals[v.id].surgeAnalysis;
      if (sa.surgeNmae !== null) surgeNmaeList.push(sa.surgeNmae);
      if (sa.noSurgeNmae !== null) noSurgeNmaeList.push(sa.noSurgeNmae);
    }

    const surgeStats = calculateStats(surgeNmaeList);
    const noSurgeStats = calculateStats(noSurgeNmaeList);
    const ratio = noSurgeStats.mean > 0 ? Number((surgeStats.mean / noSurgeStats.mean).toFixed(2)) : 0;

    surgeAnalysisSummary[v.id] = {
      variantId: v.id,
      variantName: v.name,
      shortName: v.shortName,
      surgeNmae: surgeStats.mean,
      noSurgeNmae: noSurgeStats.mean,
      surgeRatio: ratio,
      surgeOriginsAnalyzed: surgeStats.n
    };
  }

  return {
    dataset,
    perSeriesResults,
    summaryByPattern,
    summaryOverall,
    surgeAnalysisSummary,
    totalSeries: dataset.length
  };
}

/**
 * Runs the Case Study on real Depot Logistics Series (SIMULATED_DATA).
 */
export function runDepotCaseStudy(variants = EXPERIMENT_VARIANTS) {
  const caseStudyResults = [];

  for (const depot of DEPOTS) {
    const depotData = SIMULATED_DATA[depot.id];
    if (!depotData) continue;

    for (const [itemId, record] of Object.entries(depotData)) {
      const pattern = classifyDepotItemRecord(record);
      const leadTimeWeeks = Math.max(1, Math.round(depot.leadTimeWeeks || 4));

      const seriesObj = {
        id: `${depot.id}-${itemId}`,
        depotId: depot.id,
        depotName: depot.name,
        service: depot.service,
        itemId,
        itemName: record.itemName,
        pattern,
        leadTime: leadTimeWeeks,
        surgeWeeks: record.surgeWeeks || [],
        weeklyDemand: record.weeklyDemand.map((d) => d.demand)
      };

      const evals = evaluateSeriesVariants(seriesObj, variants);

      caseStudyResults.push({
        id: seriesObj.id,
        depotId: depot.id,
        depotShortName: depot.shortName,
        service: depot.service,
        itemId,
        itemName: record.itemName,
        pattern,
        leadTimeWeeks,
        evals
      });
    }
  }

  // Summary aggregation by pattern for depots
  const patterns = ['steady', 'seasonal', 'spiky'];
  const depotSummaryByPattern = {};

  for (const pattern of patterns) {
    depotSummaryByPattern[pattern] = {};
    const group = caseStudyResults.filter((r) => r.pattern === pattern);
    if (group.length === 0) continue;

    for (const v of variants) {
      const nmaeList = group.map((r) => r.evals[v.id].leadTime.nmae);
      const biasList = group.map((r) => r.evals[v.id].leadTime.biasPct);
      const underList = group.map((r) => r.evals[v.id].leadTime.underForecastRate);

      depotSummaryByPattern[pattern][v.id] = {
        variantId: v.id,
        variantName: v.name,
        shortName: v.shortName,
        pattern,
        nmae: calculateStats(nmaeList),
        biasPct: calculateStats(biasList),
        underForecastRate: calculateStats(underList)
      };
    }
  }

  return {
    caseStudyResults,
    depotSummaryByPattern,
    totalDepotSeries: caseStudyResults.length
  };
}

/**
 * Runs the Fleet Maintenance Engine Hours Experiment on the 30 Vehicles.
 */
export function runVehicleExperiment(vehicles = INITIAL_VEHICLES, variants = EXPERIMENT_VARIANTS) {
  const vehicleResults = [];

  for (const v of vehicles) {
    const weeklyUsage = (v.weeklyUsage || []).map((u) => u.hours);
    const seriesObj = {
      id: v.id,
      depotId: v.depotId,
      model: v.model,
      type: v.type,
      leadTime: 4, // 4-step ahead engine usage forecast
      surgeWeeks: [18, 42, 70, 96], // vehicle exercise surges
      weeklyDemand: weeklyUsage
    };

    const evals = evaluateSeriesVariants(seriesObj, variants);
    vehicleResults.push({
      vehicleId: v.id,
      depotId: v.depotId,
      model: v.model,
      evals
    });
  }

  // Summary across all 30 vehicles
  const vehicleSummary = {};
  for (const v of variants) {
    const oneStepNmaeList = vehicleResults.map((r) => r.evals[v.id].oneStep.nmae);
    const fourStepNmaeList = vehicleResults.map((r) => r.evals[v.id].leadTime.nmae);

    vehicleSummary[v.id] = {
      variantId: v.id,
      variantName: v.name,
      shortName: v.shortName,
      oneStepNmae: calculateStats(oneStepNmaeList),
      fourStepNmae: calculateStats(fourStepNmaeList)
    };
  }

  return {
    vehicleResults,
    vehicleSummary,
    totalVehicles: vehicleResults.length
  };
}

/**
 * CSV Generation Utilities for Headless CLI & Browser Downloads
 */
export function generateCSVContent(type, data) {
  switch (type) {
    case 'benchmark_series': {
      const rows = ['series_id,pattern,week,demand,is_surge,seasonality,surge_multiplier'];
      for (const s of data.dataset) {
        for (const w of s.weeklyDemand) {
          rows.push(`${s.id},${s.pattern},${w.week},${w.demand},${w.isSurge ? 1 : 0},${w.seasonality},${w.surgeMultiplier}`);
        }
      }
      return rows.join('\n');
    }

    case 'results_per_series': {
      const rows = [
        'series_id,pattern,base,amplitude,surge_weeks_count,variant_id,one_step_mae,one_step_rmse,one_step_bias,one_step_nmae,lead_time_nmae,lead_time_bias_pct,under_forecast_rate'
      ];
      for (const s of data.perSeriesResults) {
        for (const [vId, ev] of Object.entries(s.evals)) {
          rows.push(
            `${s.seriesId},${s.pattern},${s.base},${s.amplitude},${s.surgeWeeksCount},${vId},${ev.oneStep.mae},${ev.oneStep.rmse},${ev.oneStep.bias},${ev.oneStep.nmae},${ev.leadTime.nmae},${ev.leadTime.biasPct},${ev.leadTime.underForecastRate}`
          );
        }
      }
      return rows.join('\n');
    }

    case 'summary_by_pattern': {
      const rows = [
        'pattern,variant_id,variant_name,mean_nmae,median_nmae,std_nmae,mean_bias_pct,mean_under_forecast_rate,wins,n'
      ];
      for (const [pattern, vars] of Object.entries(data.summaryByPattern)) {
        for (const [vId, row] of Object.entries(vars)) {
          rows.push(
            `${pattern},${vId},"${row.variantName}",${row.nmae.mean},${row.nmae.median},${row.nmae.std},${row.biasPct.mean},${row.underForecastRate.mean},${row.wins},${row.nmae.n}`
          );
        }
      }
      return rows.join('\n');
    }

    case 'bootstrap_ci': {
      const rows = [
        'pattern,variant_id,variant_name,mean_diff_vs_ses03,ci_lower_95,ci_upper_95,iterations'
      ];
      for (const [pattern, vars] of Object.entries(data.summaryByPattern)) {
        for (const [vId, row] of Object.entries(vars)) {
          const b = row.bootstrapCI;
          rows.push(
            `${pattern},${vId},"${row.variantName}",${b.meanDiff},${b.ciLower},${b.ciUpper},${b.iterations}`
          );
        }
      }
      return rows.join('\n');
    }

    case 'surge_analysis': {
      const rows = [
        'variant_id,variant_name,surge_lead_nmae,no_surge_lead_nmae,surge_ratio,origins_analyzed'
      ];
      for (const [vId, row] of Object.entries(data.surgeAnalysisSummary)) {
        rows.push(
          `${vId},"${row.variantName}",${row.surgeNmae},${row.noSurgeNmae},${row.surgeRatio},${row.surgeOriginsAnalyzed}`
        );
      }
      return rows.join('\n');
    }

    case 'case_study_depots': {
      const rows = [
        'depot_id,item_id,item_name,service,pattern,lead_time_weeks,variant_id,one_step_nmae,lead_time_nmae,bias_pct,under_forecast_rate'
      ];
      for (const s of data.caseStudyResults) {
        for (const [vId, ev] of Object.entries(s.evals)) {
          rows.push(
            `${s.depotId},${s.itemId},"${s.itemName}",${s.service},${s.pattern},${s.leadTimeWeeks},${vId},${ev.oneStep.nmae},${ev.leadTime.nmae},${ev.leadTime.biasPct},${ev.leadTime.underForecastRate}`
          );
        }
      }
      return rows.join('\n');
    }

    case 'vehicles': {
      const rows = [
        'vehicle_id,depot_id,model,variant_id,one_step_nmae,four_step_nmae'
      ];
      for (const v of data.vehicleResults) {
        for (const [vId, ev] of Object.entries(v.evals)) {
          rows.push(
            `${v.vehicleId},${v.depotId},"${v.model}",${vId},${ev.oneStep.nmae},${ev.leadTime.nmae}`
          );
        }
      }
      return rows.join('\n');
    }

    default:
      return '';
  }
}
