/**
 * Indian Armed Forces Logistics and Inventory System
 * Pure Forecasting Methods (Session 5)
 * 
 * NOTE: All data is synthetic for academic research.
 * Written from scratch in plain JavaScript without external forecasting libraries.
 * 
 * Every method takes (history, horizon, params) and returns an array of `horizon` forecasts.
 */

/**
 * 1. Naive Method
 * 
 * Formula:
 *   Y_hat(T + h) = Y(T)   for all h = 1, 2, ..., H
 * 
 * Plain language:
 *   The forecast for all future periods is flat, set equal to the most recent
 *   actual observation in the historical time series.
 * 
 * @param {number[]} history - Historical time series observations.
 * @param {number} horizon - Number of future periods to forecast.
 * @param {object} [params] - Optional parameters (unused for naive).
 * @returns {number[]} Array of `horizon` forecast values.
 */
export function naive(history, horizon, _params = {}) {
  const h = Math.max(0, Math.floor(horizon));
  if (h === 0) return [];
  if (!history || history.length === 0) {
    return new Array(h).fill(0);
  }
  const lastObs = history[history.length - 1];
  return new Array(h).fill(lastObs);
}

/**
 * 2. Moving Average Method
 * 
 * Formula:
 *   Y_hat(T + h) = (1 / k) * sum_{i=0}^{k-1} Y(T - i)   for all h = 1, 2, ..., H
 *   where k = min(window, history.length).
 * 
 * Plain language:
 *   The forecast for all future periods is flat, equal to the simple arithmetic
 *   mean of the last `window` observations (default window: 8 weeks).
 *   If the historical series contains fewer observations than the window,
 *   the mean of all available historical points is used.
 * 
 * @param {number[]} history - Historical time series observations.
 * @param {number} horizon - Number of future periods to forecast.
 * @param {object} [params] - Configuration options:
 *   - window: integer number of recent observations to average (default: 8).
 * @returns {number[]} Array of `horizon` forecast values.
 */
export function movingAverage(history, horizon, params = {}) {
  const h = Math.max(0, Math.floor(horizon));
  if (h === 0) return [];
  if (!history || history.length === 0) {
    return new Array(h).fill(0);
  }

  const windowSize = Math.max(1, Math.floor(params.window ?? 8));
  const k = Math.min(windowSize, history.length);
  const recentSlice = history.slice(history.length - k);
  const sum = recentSlice.reduce((acc, val) => acc + val, 0);
  const mean = sum / k;

  return new Array(h).fill(mean);
}

/**
 * 3. Simple Exponential Smoothing (SES)
 * 
 * Formula:
 *   L_1 = Y_1                                  (level initialized to first observation)
 *   L_t = alpha * Y_t + (1 - alpha) * L_{t-1}  for t = 2, 3, ..., T
 *   Y_hat(T + h) = L_T                         for all h = 1, 2, ..., H
 * 
 * Plain language:
 *   Simple exponential smoothing maintains an internal smoothed level that updates
 *   recursively each week as a weighted average: alpha weight on the newest
 *   observation and (1 - alpha) weight on the prior smoothed level.
 *   The initial level L_1 is set directly to the first observation Y_1.
 *   The forecast for all future periods is flat, set to the final smoothed level L_T.
 * 
 * @param {number[]} history - Historical time series observations.
 * @param {number} horizon - Number of future periods to forecast.
 * @param {object} [params] - Configuration options:
 *   - alpha: smoothing factor between 0 and 1 (default: 0.3).
 * @returns {number[]} Array of `horizon` forecast values.
 */
export function exponentialSmoothing(history, horizon, params = {}) {
  const h = Math.max(0, Math.floor(horizon));
  if (h === 0) return [];
  if (!history || history.length === 0) {
    return new Array(h).fill(0);
  }

  const alpha = Number(params.alpha ?? 0.3);

  // Initialize level to the first observation
  let level = history[0];

  for (let t = 1; t < history.length; t++) {
    level = alpha * history[t] + (1 - alpha) * level;
  }

  return new Array(h).fill(level);
}

/**
 * 4. Seasonal Naive Method
 * 
 * Formula:
 *   Y_hat(T + j) = Y(T + j - period)   for j = 1, 2, ..., H
 *   where period = 52 (one full annual operational cycle).
 *   If history.length < period, falls back to naive: Y_hat(T + j) = Y(T).
 * 
 * Plain language:
 *   The forecast for future week j is set equal to the actual demand observed exactly
 *   52 weeks prior (the corresponding week of the previous annual cycle).
 *   If the historical series is shorter than 52 weeks, it falls back to the simple
 *   naive method (repeating the most recent observation).
 * 
 * @param {number[]} history - Historical time series observations.
 * @param {number} horizon - Number of future periods to forecast.
 * @param {object} [params] - Configuration options:
 *   - period: length of the seasonal cycle in weeks (default: 52).
 * @returns {number[]} Array of `horizon` forecast values.
 */
export function seasonalNaive(history, horizon, params = {}) {
  const h = Math.max(0, Math.floor(horizon));
  if (h === 0) return [];
  if (!history || history.length === 0) {
    return new Array(h).fill(0);
  }

  const period = Math.max(1, Math.floor(params.period ?? 52));

  // Fall back to naive if history is shorter than the seasonal cycle
  if (history.length < period) {
    return naive(history, h, params);
  }

  const T = history.length;
  const forecasts = [];

  for (let j = 1; j <= h; j++) {
    // 0-based index of observation from 1 full seasonal period earlier:
    const targetIndex = T + j - period - 1;

    if (targetIndex >= 0 && targetIndex < T) {
      forecasts.push(history[targetIndex]);
    } else if (targetIndex >= T) {
      // If horizon extends beyond a full seasonal period, cycle from earlier generated forecasts
      const forecastIndex = targetIndex - T;
      forecasts.push(forecasts[forecastIndex] ?? history[T - 1]);
    } else {
      forecasts.push(history[T - 1]);
    }
  }

  return forecasts;
}

/**
 * Registry of available forecasting methods with metadata and defaults
 */
export const FORECAST_METHODS = [
  {
    id: 'exponentialSmoothing',
    name: 'Exponential Smoothing',
    shortName: 'SES (alpha=0.3)',
    description: 'Level-updated weighted smoothing (alpha default 0.3)',
    fn: exponentialSmoothing,
    defaultParams: { alpha: 0.3 }
  },
  {
    id: 'movingAverage',
    name: 'Moving Average',
    shortName: 'MA (w=8)',
    description: 'Arithmetic mean of recent observations (window default 8)',
    fn: movingAverage,
    defaultParams: { window: 8 }
  },
  {
    id: 'naive',
    name: 'Naive',
    shortName: 'Naive (Last)',
    description: 'Flat projection of the most recent historical observation',
    fn: naive,
    defaultParams: {}
  },
  {
    id: 'seasonalNaive',
    name: 'Seasonal Naive',
    shortName: 'Seasonal Naive (52w)',
    description: 'Repeats observations from 52 weeks prior (annual cycle)',
    fn: seasonalNaive,
    defaultParams: { period: 52 }
  }
];

export const FORECAST_METHOD_MAP = Object.fromEntries(
  FORECAST_METHODS.map((m) => [m.id, m])
);
