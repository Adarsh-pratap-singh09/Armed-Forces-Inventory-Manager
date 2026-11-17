/**
 * Automated Test Suite for Forecasting Experiments Engine (Session 6)
 * Uses Node.js built-in test runner (node:test)
 * 
 * Verifies:
 * 1. Benchmark generator determinism and exact category counts.
 * 2. Paired bootstrap confidence interval for identical series includes 0.
 * 3. Statistical aggregation on hand-checked analytical case.
 * 4. Pattern classification rule logic.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  generateBenchmarkSeries,
  calculateStats,
  calculatePairedBootstrapCI,
  getPatternLabel,
  BENCHMARK_SEED
} from '../src/forecasting/experiments.js';

describe('Benchmark Dataset Generator', () => {
  it('generates exactly 90 series with 30 per pattern', () => {
    const seriesList = generateBenchmarkSeries(BENCHMARK_SEED);
    assert.equal(seriesList.length, 90, 'Total series count must be 90');

    const counts = { steady: 0, seasonal: 0, spiky: 0 };
    for (const s of seriesList) {
      assert.ok(['steady', 'seasonal', 'spiky'].includes(s.pattern), `Invalid pattern: ${s.pattern}`);
      counts[s.pattern]++;
      assert.equal(s.weeklyDemand.length, 104, `Series ${s.id} must have exactly 104 weeks`);
      assert.ok(Array.isArray(s.surgeWeeks), `Series ${s.id} must have surgeWeeks array`);
      assert.equal(s.leadTime, 4, `Series ${s.id} benchmark lead time must be 4`);
    }

    assert.equal(counts.steady, 30, 'Must have exactly 30 steady series');
    assert.equal(counts.seasonal, 30, 'Must have exactly 30 seasonal series');
    assert.equal(counts.spiky, 30, 'Must have exactly 30 spiky series');
  });

  it('is completely deterministic across runs with identical seed', () => {
    const run1 = generateBenchmarkSeries(BENCHMARK_SEED);
    const run2 = generateBenchmarkSeries(BENCHMARK_SEED);

    assert.equal(run1.length, run2.length);
    for (let i = 0; i < run1.length; i++) {
      assert.equal(run1[i].id, run2[i].id);
      assert.equal(run1[i].pattern, run2[i].pattern);
      assert.equal(run1[i].base, run2[i].base);
      assert.equal(run1[i].amplitude, run2[i].amplitude);
      assert.deepEqual(run1[i].surgeWeeks, run2[i].surgeWeeks);
      assert.deepEqual(
        run1[i].weeklyDemand.map((w) => w.demand),
        run2[i].weeklyDemand.map((w) => w.demand)
      );
    }
  });
});

describe('Statistical Aggregation - Hand-Checked Case', () => {
  it('computes exact mean, median, sample std, and n on [2, 4, 6, 8, 10]', () => {
    // Array: [2, 4, 6, 8, 10]
    // n = 5
    // Sum = 30 -> mean = 6.0
    // Median (sorted middle) = 6.0
    // Differences from mean: [-4, -2, 0, 2, 4]
    // Squared differences: [16, 4, 0, 4, 16] -> sum = 40
    // Sample variance (n - 1 = 4): 40 / 4 = 10.0
    // Sample std: sqrt(10) ≈ 3.16227766...
    const sample = [2, 4, 6, 8, 10];
    const stats = calculateStats(sample);

    assert.equal(stats.n, 5);
    assert.equal(stats.mean, 6.0);
    assert.equal(stats.median, 6.0);
    assert.equal(stats.std, 3.1623);
  });

  it('handles even sample size for median on [10, 20, 30, 40]', () => {
    const sample = [10, 20, 30, 40];
    const stats = calculateStats(sample);

    assert.equal(stats.n, 4);
    assert.equal(stats.mean, 25.0);
    assert.equal(stats.median, 25.0); // (20 + 30) / 2
  });
});

describe('Paired Bootstrap 95% Confidence Interval', () => {
  it('bootstrap interval for two identical result sets includes 0 (exact [0, 0])', () => {
    const sample = [0.125, 0.231, 0.184, 0.095, 0.312];
    const ci = calculatePairedBootstrapCI(sample, sample, 2000, 12345);

    assert.equal(ci.meanDiff, 0);
    assert.equal(ci.ciLower, 0);
    assert.equal(ci.ciUpper, 0);
    assert.ok(ci.ciLower <= 0 && ci.ciUpper >= 0, 'Confidence interval must include 0');
  });

  it('bootstrap interval for constant positive difference equals that difference', () => {
    const baseline = [0.10, 0.20, 0.30];
    const candidate = [0.15, 0.25, 0.35]; // exactly +0.05 on all elements
    const ci = calculatePairedBootstrapCI(candidate, baseline, 2000, 12345);

    assert.equal(ci.meanDiff, 0.05);
    assert.equal(ci.ciLower, 0.05);
    assert.equal(ci.ciUpper, 0.05);
  });
});

describe('Pattern Classification Rule', () => {
  it('classifies series based on amplitude and surge week frequency', () => {
    assert.equal(getPatternLabel(0.25, 0), 'seasonal', 'Amp >= 0.15 is seasonal');
    assert.equal(getPatternLabel(0.60, 4), 'seasonal', 'Amp >= 0.15 takes precedence as seasonal');
    assert.equal(getPatternLabel(0.04, 5), 'spiky', 'Amp < 0.15 and surges >= 3 is spiky');
    assert.equal(getPatternLabel(0.02, 1), 'steady', 'Low amp and low surges is steady');
    assert.equal(getPatternLabel(0.00, 0), 'steady', 'Zero amp and zero surges is steady');
  });
});
