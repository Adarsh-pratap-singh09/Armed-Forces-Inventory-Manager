/**
 * Indian Armed Forces Logistics and Inventory System
 * Pure Forecasting Evaluation Metrics (Session 5)
 * 
 * NOTE: All data is synthetic for academic research.
 * Written from scratch in plain JavaScript without external forecasting libraries.
 */

/**
 * Validates inputs and returns usable pairs count.
 */
function getValidPairsLength(actuals, forecasts) {
  if (!Array.isArray(actuals) || !Array.isArray(forecasts)) return 0;
  return Math.min(actuals.length, forecasts.length);
}

/**
 * Mean Absolute Error (MAE)
 * 
 * Formula:
 *   MAE = (1 / n) * sum_{t=1}^n |y_t - y_hat_t|
 * 
 * Plain language:
 *   The average magnitude of errors between actual demand and forecasted demand,
 *   treating over-forecasts and under-forecasts equally without squaring.
 * 
 * @param {number[]} actuals - Array of actual values.
 * @param {number[]} forecasts - Array of forecasted values.
 * @returns {number} Mean absolute error.
 */
export function mae(actuals, forecasts) {
  const n = getValidPairsLength(actuals, forecasts);
  if (n === 0) return 0;

  let sum = 0;
  for (let i = 0; i < n; i++) {
    sum += Math.abs(Number(actuals[i]) - Number(forecasts[i]));
  }
  return sum / n;
}

/**
 * Root Mean Squared Error (RMSE)
 * 
 * Formula:
 *   RMSE = sqrt( (1 / n) * sum_{t=1}^n (y_t - y_hat_t)^2 )
 * 
 * Plain language:
 *   The square root of the mean squared errors. Heavily penalizes large outlier
 *   deviations more than small errors.
 * 
 * @param {number[]} actuals - Array of actual values.
 * @param {number[]} forecasts - Array of forecasted values.
 * @returns {number} Root mean squared error.
 */
export function rmse(actuals, forecasts) {
  const n = getValidPairsLength(actuals, forecasts);
  if (n === 0) return 0;

  let sumSquares = 0;
  for (let i = 0; i < n; i++) {
    const error = Number(actuals[i]) - Number(forecasts[i]);
    sumSquares += error * error;
  }
  return Math.sqrt(sumSquares / n);
}

/**
 * Mean Forecast Bias (Mean Error)
 * 
 * Formula:
 *   Bias = (1 / n) * sum_{t=1}^n (y_hat_t - y_t)
 * 
 * Plain language:
 *   The arithmetic mean of forecast minus actual demand.
 *   - Positive bias indicates systematic over-forecasting (holding excess stock).
 *   - Negative bias indicates systematic under-forecasting (heightened stockout risk).
 * 
 * @param {number[]} actuals - Array of actual values.
 * @param {number[]} forecasts - Array of forecasted values.
 * @returns {number} Mean forecast bias.
 */
export function bias(actuals, forecasts) {
  const n = getValidPairsLength(actuals, forecasts);
  if (n === 0) return 0;

  let sumDiff = 0;
  for (let i = 0; i < n; i++) {
    sumDiff += (Number(forecasts[i]) - Number(actuals[i]));
  }
  return sumDiff / n;
}

/**
 * Normalized Mean Absolute Error (NMAE)
 * 
 * Formula:
 *   NMAE = MAE / y_mean
 *   where y_mean = (1 / n) * sum_{t=1}^n y_t
 * 
 * Plain language:
 *   MAE divided by the mean actual demand. Expresses forecasting error as a
 *   dimensionless percentage/ratio of average volume, enabling direct comparison
 *   between high-volume commodities (e.g. diesel, rice) and low-volume items
 *   (e.g. ECWCS, vehicle filters).
 * 
 * @param {number[]} actuals - Array of actual values.
 * @param {number[]} forecasts - Array of forecasted values.
 * @returns {number} Normalized mean absolute error (0 if actual mean is 0).
 */
export function nmae(actuals, forecasts) {
  const n = getValidPairsLength(actuals, forecasts);
  if (n === 0) return 0;

  const m = mae(actuals, forecasts);

  let sumActual = 0;
  for (let i = 0; i < n; i++) {
    sumActual += Number(actuals[i]);
  }
  const meanActual = sumActual / n;

  if (meanActual === 0) return 0;
  return m / meanActual;
}

/**
 * Utility function computing all four standard metrics simultaneously.
 */
export function calculateAllMetrics(actuals, forecasts) {
  const n = getValidPairsLength(actuals, forecasts);
  return {
    mae: mae(actuals, forecasts),
    rmse: rmse(actuals, forecasts),
    bias: bias(actuals, forecasts),
    nmae: nmae(actuals, forecasts),
    n
  };
}
