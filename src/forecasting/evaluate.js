/**
 * Indian Armed Forces Logistics and Inventory System
 * Rolling-Origin Evaluation Framework (Session 5)
 * 
 * NOTE: All data is synthetic for academic research.
 * Written from scratch in plain JavaScript without external forecasting libraries.
 * 
 * Used for rolling evaluation across historical origins (Session 6 preparation).
 */

import { mae, rmse, bias, nmae } from './metrics.js';

/**
 * Executes rolling-origin backtesting over a time series.
 * 
 * Moves the forecast origin forward week by week from `minTrain` up to
 * `series.length - horizon`, generating out-of-sample forecasts at each origin.
 * 
 * Computes:
 * 1. One-step-ahead errors: comparing step 1 forecast vs step 1 actual.
 * 2. Lead-time-demand errors: comparing cumulative demand over the next L weeks
 *    (sum of forecasts vs sum of actuals).
 * 
 * @param {number[]} series - Historical time series array.
 * @param {Function} method - Pure forecasting function (history, horizon, params).
 * @param {object} params - Parameters for the forecasting method.
 * @param {object} options - Evaluation options:
 *   - minTrain: minimum training window before first evaluation origin (default: 52).
 *   - horizon: forecast horizon steps (default: 1).
 *   - leadTime: lead time L in weeks for cumulative demand (default: horizon).
 * @returns {object} Object containing summary metrics and per-origin details:
 *   - oneStep: { mae, rmse, bias, nmae }
 *   - leadTime: { mae, rmse, bias, nmae }
 *   - origins: array of per-origin evaluation records
 *   - totalOrigins: number of evaluation origins processed
 */
export function rollingOrigin(series, method, params = {}, options = {}) {
  if (!Array.isArray(series) || series.length === 0) {
    return {
      oneStep: { mae: 0, rmse: 0, bias: 0, nmae: 0 },
      leadTime: { mae: 0, rmse: 0, bias: 0, nmae: 0 },
      origins: [],
      totalOrigins: 0
    };
  }

  const minTrain = Math.max(1, Math.floor(options.minTrain ?? 52));
  const horizon = Math.max(1, Math.floor(options.horizon ?? 1));
  const leadTime = Math.min(
    horizon,
    Math.max(1, Math.floor(options.leadTime ?? horizon))
  );

  const N = series.length;
  const origins = [];

  const oneStepActuals = [];
  const oneStepForecasts = [];

  const leadTimeActuals = [];
  const leadTimeForecasts = [];

  // Slide origin t from minTrain to N - horizon
  for (let t = minTrain; t <= N - horizon; t++) {
    const history = series.slice(0, t);
    const actualFuture = series.slice(t, t + horizon);
    const forecastFuture = method(history, horizon, params);

    // 1. One-step-ahead (step 1)
    const act1 = Number(actualFuture[0]);
    const fcast1 = Number(forecastFuture[0]);
    const err1 = fcast1 - act1;

    oneStepActuals.push(act1);
    oneStepForecasts.push(fcast1);

    // 2. Lead-time-demand (sum of next L weeks)
    let sumActLead = 0;
    let sumFcastLead = 0;
    for (let i = 0; i < leadTime; i++) {
      sumActLead += Number(actualFuture[i]);
      sumFcastLead += Number(forecastFuture[i]);
    }
    const errLead = sumFcastLead - sumActLead;

    leadTimeActuals.push(sumActLead);
    leadTimeForecasts.push(sumFcastLead);

    origins.push({
      origin: t,
      oneStepActual: act1,
      oneStepForecast: fcast1,
      oneStepError: err1,
      leadTimeActual: sumActLead,
      leadTimeForecast: sumFcastLead,
      leadTimeError: errLead
    });
  }

  return {
    oneStep: {
      mae: mae(oneStepActuals, oneStepForecasts),
      rmse: rmse(oneStepActuals, oneStepForecasts),
      bias: bias(oneStepActuals, oneStepForecasts),
      nmae: nmae(oneStepActuals, oneStepForecasts)
    },
    leadTime: {
      mae: mae(leadTimeActuals, leadTimeForecasts),
      rmse: rmse(leadTimeActuals, leadTimeForecasts),
      bias: bias(leadTimeActuals, leadTimeForecasts),
      nmae: nmae(leadTimeActuals, leadTimeForecasts),
      leadTimeWeeks: leadTime
    },
    origins,
    totalOrigins: origins.length
  };
}
