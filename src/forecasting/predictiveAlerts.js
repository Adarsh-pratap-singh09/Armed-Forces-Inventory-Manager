/**
 * Indian Armed Forces Logistics and Inventory System
 * Predictive Alerts Engine (Session 5)
 * 
 * Computes forward-looking inventory stock-out projections and tactical
 * vehicle service dates using pure forecasting algorithms.
 */

import {
  FORECAST_METHODS,
  FORECAST_METHOD_MAP
} from './methods.js';
import { SIMULATED_DATA, getWeekCalendarDate } from '../data/index.js';

/**
 * Dispatches historical series to the requested forecasting function.
 */
export function runForecast(methodId, history, horizon, params = {}) {
  const methodEntry = FORECAST_METHOD_MAP[methodId] || FORECAST_METHODS[0];
  const fn = methodEntry.fn;
  const mergedParams = { ...methodEntry.defaultParams, ...params };
  return fn(history, horizon, mergedParams);
}

/**
 * Projects cumulative stock on hand and detects the stock-out week.
 * 
 * @param {number[]} history - 104 weeks of actual demand.
 * @param {number} currentStock - Current stock on hand.
 * @param {number} leadTimeWeeks - Depot lead time in weeks.
 * @param {string} [methodId='exponentialSmoothing'] - Forecasting method identifier.
 * @param {object} [params={}] - Parameters for the method.
 * @param {number} [horizon=26] - Forecast horizon in weeks.
 */
export function evaluateStockLineForecast(
  history,
  currentStock,
  leadTimeWeeks,
  methodId = 'exponentialSmoothing',
  params = {},
  horizon = 26
) {
  const forecasts = runForecast(methodId, history, horizon, params);

  // Cumulative projected consumption & remaining stock trajectory
  const trajectory = [];
  let cumDemand = 0;
  let stockOutWeek = null;
  let stockOutDate = null;

  for (let h = 1; h <= horizon; h++) {
    const fVal = Math.max(0, forecasts[h - 1]);
    cumDemand += fVal;
    const projectedRemaining = currentStock - cumDemand;

    if (stockOutWeek === null && projectedRemaining <= 0) {
      stockOutWeek = h;
      // Simulated calendar date for future week 104 + h
      stockOutDate = getWeekCalendarDate(104 + h).formattedDate;
    }

    trajectory.push({
      horizonStep: h,
      simulationWeek: 104 + h,
      date: getWeekCalendarDate(104 + h).formattedDate,
      forecastDemand: Math.round(fVal),
      cumulativeDemand: Math.round(cumDemand),
      projectedStock: Math.round(projectedRemaining)
    });
  }

  // Lead-time demand: sum of first L weeks of forecast
  const L = Math.min(leadTimeWeeks, horizon);
  let forecastLeadTimeDemand = 0;
  for (let i = 0; i < L; i++) {
    forecastLeadTimeDemand += Math.max(0, forecasts[i]);
  }
  forecastLeadTimeDemand = Math.round(forecastLeadTimeDemand);

  // Alert Rule: Stock-out falls within lead time + 2 weeks
  const alertThresholdWeeks = leadTimeWeeks + 2;
  const isOrderNow = stockOutWeek !== null && stockOutWeek <= alertThresholdWeeks;

  let alertLevel = 'Healthy';
  let alertColor = 'green';

  if (isOrderNow) {
    alertLevel = 'Order now';
    alertColor = 'red';
  } else if (stockOutWeek !== null && stockOutWeek <= horizon) {
    alertLevel = 'Reorder soon';
    alertColor = 'amber';
  }

  return {
    methodId,
    forecasts,
    trajectory,
    forecastLeadTimeDemand,
    stockOutWeek,
    stockOutDate,
    alertThresholdWeeks,
    isOrderNow,
    alertLevel,
    alertColor
  };
}

/**
 * Projects vehicle engine hours and predicts when scheduled service interval is reached.
 * 
 * @param {object} vehicle - Vehicle object with weeklyUsage, hoursSinceLastService, serviceIntervalHours.
 * @param {string} [methodId='exponentialSmoothing'] - Forecasting method identifier.
 * @param {object} [params={}] - Parameters for the method.
 * @param {number} [horizon=26] - Forecast horizon in weeks.
 */
export function evaluateVehicleMaintenanceForecast(
  vehicle,
  methodId = 'exponentialSmoothing',
  params = {},
  horizon = 26
) {
  const usageHistory = (vehicle.weeklyUsage || []).map((u) => u.hours);
  const forecasts = runForecast(methodId, usageHistory, horizon, params);

  const interval = vehicle.serviceIntervalHours || 500;
  const hoursSince = vehicle.hoursSinceLastService || 0;
  const remainingHours = Math.max(0, interval - hoursSince);

  let predictedServiceWeek = null;
  let predictedServiceDate = null;
  let cumRun = hoursSince;

  // If already at or above interval or under repair
  if (vehicle.isUnderRepair) {
    predictedServiceWeek = 0;
    predictedServiceDate = 'Immediate (Under repair)';
  } else if (hoursSince >= interval) {
    predictedServiceWeek = 0;
    predictedServiceDate = 'Immediate (Overdue)';
  } else {
    for (let h = 1; h <= horizon; h++) {
      const fHours = Math.max(1, forecasts[h - 1]);
      cumRun += fHours;
      if (cumRun >= interval && predictedServiceWeek === null) {
        predictedServiceWeek = h;
        predictedServiceDate = getWeekCalendarDate(104 + h).formattedDate;
        break;
      }
    }
  }

  // Simple 12-week static estimate from Maintenance page
  const avg12 = vehicle.avgWeeklyHours12 || 25;
  const staticWeeks = avg12 > 0 ? Number((remainingHours / avg12).toFixed(1)) : 0;

  // Maintenance alert rule: reaches interval within 4 weeks
  const isAlert =
    vehicle.isUnderRepair ||
    hoursSince >= interval ||
    (predictedServiceWeek !== null && predictedServiceWeek <= 4);

  return {
    methodId,
    forecasts,
    hoursSinceLastService: hoursSince,
    serviceIntervalHours: interval,
    remainingHours,
    staticWeeks,
    predictedServiceWeek,
    predictedServiceDate,
    isAlert,
    isOverdue: hoursSince >= interval,
    isUnderRepair: Boolean(vehicle.isUnderRepair)
  };
}

/**
 * Computes high-level alert metrics for stock lines and vehicles.
 */
export function getPredictiveAlertsSummary(
  stockLines,
  vehicles,
  methodId = 'exponentialSmoothing',
  params = {}
) {
  let stockAlertsCount = 0;
  let stockEarlyWarningsCount = 0;
  let maintenanceAlertsCount = 0;

  // Evaluate stock lines
  for (const line of stockLines) {
    const hist = SIMULATED_DATA[line.depotId]?.[line.itemId]?.weeklyDemand?.map((d) => d.demand) || [];
    if (hist.length > 0) {
      const evalRes = evaluateStockLineForecast(
        hist,
        line.quantity,
        line.leadTimeWeeks,
        methodId,
        params,
        26
      );
      if (evalRes.isOrderNow) {
        stockAlertsCount++;
        // Early warning: Static rule is "Healthy" or "Reorder needed", but forecast triggers "Order now"
        if (line.status === 'Healthy' || line.status === 'Reorder needed') {
          stockEarlyWarningsCount++;
        }
      }
    }
  }

  // Evaluate vehicles
  for (const v of vehicles) {
    const vEval = evaluateVehicleMaintenanceForecast(v, methodId, params, 26);
    if (vEval.isAlert) {
      maintenanceAlertsCount++;
    }
  }

  return {
    stockAlertsCount,
    stockEarlyWarningsCount,
    maintenanceAlertsCount,
    totalAlertsCount: stockAlertsCount + maintenanceAlertsCount
  };
}
