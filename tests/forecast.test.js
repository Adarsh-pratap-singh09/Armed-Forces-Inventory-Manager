/**
 * Automated Test Suite for Pure Forecasting Module
 * Uses Node.js built-in test runner (node:test)
 * 
 * Verifies all four methods, error metrics, and rolling-origin evaluation
 * with explicit hand-checked mathematical cases.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  naive,
  movingAverage,
  exponentialSmoothing,
  seasonalNaive
} from '../src/forecasting/methods.js';
import {
  mae,
  rmse,
  bias,
  nmae,
  calculateAllMetrics
} from '../src/forecasting/metrics.js';
import { rollingOrigin } from '../src/forecasting/evaluate.js';

describe('Forecasting Methods - Hand-Checked Cases', () => {
  it('naive: repeats the most recent historical observation', () => {
    const history = [12, 25, 42];
    const result = naive(history, 4);
    assert.deepEqual(result, [42, 42, 42, 42]);

    // Zero-length horizon returns empty array
    assert.deepEqual(naive(history, 0), []);
    // Empty history returns zeros
    assert.deepEqual(naive([], 3), [0, 0, 0]);
  });

  it('movingAverage: [2, 4, 6, 8] with window 2 gives 7 (hand-checked from specification)', () => {
    // Last 2 values are 6 and 8. Arithmetic mean = (6 + 8) / 2 = 7.
    const history = [2, 4, 6, 8];
    const result = movingAverage(history, 3, { window: 2 });
    assert.deepEqual(result, [7, 7, 7]);
  });

  it('movingAverage: defaults to window 8 and handles shorter histories gracefully', () => {
    // 4 observations with default window 8: uses all 4: (10 + 20 + 30 + 40) / 4 = 25.
    const history = [10, 20, 30, 40];
    const result = movingAverage(history, 2);
    assert.deepEqual(result, [25, 25]);
  });

  it('exponentialSmoothing: [10, 20] with alpha 0.5 gives 15 (hand-checked from specification)', () => {
    // Level 1 = 10
    // Level 2 = 0.5 * 20 + (1 - 0.5) * 10 = 10 + 5 = 15.
    // Flat forecast for horizon 3 = [15, 15, 15]
    const history = [10, 20];
    const result = exponentialSmoothing(history, 3, { alpha: 0.5 });
    assert.deepEqual(result, [15, 15, 15]);
  });

  it('exponentialSmoothing: multi-step smoothing with custom alpha', () => {
    // L1 = 100
    // L2 = 0.2 * 150 + 0.8 * 100 = 30 + 80 = 110
    // L3 = 0.2 * 200 + 0.8 * 110 = 40 + 88 = 128
    const history = [100, 150, 200];
    const result = exponentialSmoothing(history, 2, { alpha: 0.2 });
    assert.deepEqual(result, [128, 128]);
  });

  it('seasonalNaive: repeats the exact observation from 52 weeks earlier', () => {
    // Construct 52 distinct historical weeks: 101 through 152
    const history52 = Array.from({ length: 52 }, (_, i) => 101 + i);
    // Horizon 3 should predict:
    // week 1 (future week 53) -> repeats week 1 (value 101)
    // week 2 (future week 54) -> repeats week 2 (value 102)
    // week 3 (future week 55) -> repeats week 3 (value 103)
    const result = seasonalNaive(history52, 3, { period: 52 });
    assert.deepEqual(result, [101, 102, 103]);
  });

  it('seasonalNaive: multi-year history looks back exactly 52 weeks from future week', () => {
    // 54 historical weeks: 1 through 54
    const history54 = Array.from({ length: 54 }, (_, i) => i + 1);
    // Future week 55 (h=1) looks back 52 weeks to week 3 (value 3)
    // Future week 56 (h=2) looks back 52 weeks to week 4 (value 4)
    const result = seasonalNaive(history54, 2, { period: 52 });
    assert.deepEqual(result, [3, 4]);
  });

  it('seasonalNaive: falls back to naive when history is shorter than 52 weeks', () => {
    const shortHistory = [10, 20, 35];
    const result = seasonalNaive(shortHistory, 3, { period: 52 });
    assert.deepEqual(result, [35, 35, 35]);
  });
});

describe('Evaluation Metrics - Hand-Checked Mathematical Cases', () => {
  // actuals = [10, 20, 30]
  // forecasts = [12, 18, 33]
  // errors (forecast - actual) = [2, -2, 3]
  // absolute errors = [2, 2, 3] -> sum = 7 -> MAE = 7/3 = 2.3333...
  // squared errors = [4, 4, 9] -> sum = 17 -> RMSE = sqrt(17/3) ≈ 2.380476...
  // bias (mean of forecast minus actual) = (2 - 2 + 3) / 3 = 1.0
  // mean actual = 20 -> NMAE = (7/3) / 20 = 7/60 ≈ 0.116666...
  const actuals = [10, 20, 30];
  const forecasts = [12, 18, 33];

  it('mae: computes correct mean absolute error', () => {
    const val = mae(actuals, forecasts);
    assert.ok(Math.abs(val - 7 / 3) < 1e-9, `Expected 7/3, got ${val}`);
  });

  it('rmse: computes correct root mean squared error', () => {
    const val = rmse(actuals, forecasts);
    const expected = Math.sqrt(17 / 3);
    assert.ok(Math.abs(val - expected) < 1e-9, `Expected sqrt(17/3), got ${val}`);
  });

  it('bias: computes arithmetic mean of (forecast - actual)', () => {
    const val = bias(actuals, forecasts);
    assert.equal(val, 1.0);
  });

  it('nmae: computes MAE normalized by mean actual demand', () => {
    const val = nmae(actuals, forecasts);
    const expected = (7 / 3) / 20; // 7 / 60
    assert.ok(Math.abs(val - expected) < 1e-9, `Expected 7/60, got ${val}`);
  });

  it('calculateAllMetrics: packages all metrics simultaneously', () => {
    const res = calculateAllMetrics(actuals, forecasts);
    assert.equal(res.n, 3);
    assert.equal(res.bias, 1.0);
    assert.ok(Math.abs(res.mae - 7 / 3) < 1e-9);
    assert.ok(Math.abs(res.rmse - Math.sqrt(17 / 3)) < 1e-9);
    assert.ok(Math.abs(res.nmae - 7 / 60) < 1e-9);
  });
});

describe('Rolling-Origin Framework (Session 6 Preparation)', () => {
  it('rollingOrigin: advances origin week by week and computes one-step and lead-time errors', () => {
    // 60-week synthetic sequence: week 1 to 60 with constant value 50
    const series = new Array(60).fill(50);
    const evalResult = rollingOrigin(
      series,
      movingAverage,
      { window: 4 },
      { minTrain: 52, horizon: 4, leadTime: 3 }
    );

    // Number of origins: 52, 53, 54, 55, 56 -> 5 origins
    assert.equal(evalResult.totalOrigins, 5);
    assert.equal(evalResult.leadTime.leadTimeWeeks, 3);
    // Since all values are 50, MA forecast is 50, error is exactly 0
    assert.equal(evalResult.oneStep.mae, 0);
    assert.equal(evalResult.oneStep.bias, 0);
    assert.equal(evalResult.leadTime.mae, 0);
  });
});
