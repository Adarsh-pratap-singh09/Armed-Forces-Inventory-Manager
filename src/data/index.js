/**
 * Indian Armed Forces Logistics and Inventory System - Central Data Hub
 * 
 * NOTE: All depot names, inventory numbers, parameters, and time-series
 * data in this project are illustrative and synthetic for academic research.
 * No ammunition or weapons are included.
 * 
 * - 8 illustrative depots (Army, Navy, Air Force)
 * - 14 items across 5 categories
 * - Realistic item stocking per depot service branch
 * - 104-week weekly demand time-series with India-specific seasonality
 * - Inventory state: stock on hand, safety stock (1.65 * sigma * sqrt(lead time)), reorder level
 * - 30 illustrative vehicles with simple IDs (VEH-001 to VEH-030)
 */

import { DEPOTS, DEPOT_MAP, isItemStockedAtDepot } from './depots.js';
import { ITEMS, ITEM_MAP, CATEGORIES } from './items.js';
import {
  generateAllData,
  getSeasonalityConfig,
  getWeekCalendarDate,
  TOTAL_WEEKS,
  EVAL_WEEKS,
  SIMULATION_START_DATE_STR
} from './demandGenerator.js';
import {
  generateVehicles,
  VEHICLE_MODELS,
  INITIAL_VEHICLES,
  calculateVehicleStatus,
  calculateSimulatedDate,
  SIMULATED_AS_OF_DATE,
  SIMULATED_AS_OF_LABEL
} from './vehicles.js';
import { DEFAULT_SEED } from './prng.js';

// Pre-generate deterministic dataset and vehicle fleet
export const SIMULATED_DATA = generateAllData(DEFAULT_SEED);
export const VEHICLES = generateVehicles(DEFAULT_SEED + 99);

/**
 * Returns demand & inventory data for a single depot-item pair.
 */
export function getDepotItemRecord(depotId, itemId) {
  if (SIMULATED_DATA[depotId] && SIMULATED_DATA[depotId][itemId]) {
    return SIMULATED_DATA[depotId][itemId];
  }
  return null;
}

/**
 * Returns only the supply items realistically stocked by a given depot.
 */
export function getStockedItemsForDepot(depotId) {
  const depot = DEPOT_MAP[depotId] || DEPOTS[0];
  return ITEMS.filter((item) => isItemStockedAtDepot(depot.service, item.id));
}

/**
 * Returns vehicles stationed at a specific depot (or all if depotId === 'all').
 */
export function getVehiclesByDepot(depotId) {
  if (!depotId || depotId === 'all') {
    return VEHICLES;
  }
  return VEHICLES.filter((v) => v.depotId === depotId);
}

/**
 * Summary statistics for the whole system.
 */
export function getSystemSummaryStats() {
  const totalDepots = DEPOTS.length;
  const totalItems = ITEMS.length;
  
  let totalStockedCombinations = 0;
  let reorderAlertsCount = 0;
  let criticalAlertsCount = 0;

  for (const depot of DEPOTS) {
    for (const item of ITEMS) {
      if (isItemStockedAtDepot(depot.service, item.id) && SIMULATED_DATA[depot.id]?.[item.id]) {
        totalStockedCombinations++;
        const record = SIMULATED_DATA[depot.id][item.id];
        if (record.inventory.stockStatus === 'Reorder needed') {
          reorderAlertsCount++;
        } else if (record.inventory.stockStatus === 'Critical low') {
          criticalAlertsCount++;
        }
      }
    }
  }

  const totalDataPoints = totalStockedCombinations * TOTAL_WEEKS;
  const vehiclesDueSoon = VEHICLES.filter((v) => v.status === 'Service due soon').length;
  const vehiclesOverdue = VEHICLES.filter((v) => v.status === 'Service overdue').length;

  return {
    totalDepots,
    totalItems,
    totalStockedCombinations,
    totalWeeks: TOTAL_WEEKS,
    totalDataPoints,
    seed: DEFAULT_SEED,
    reorderAlertsCount,
    criticalAlertsCount,
    totalVehicles: VEHICLES.length,
    vehiclesDueSoon,
    vehiclesOverdue,
    startDateStr: SIMULATION_START_DATE_STR
  };
}

export {
  DEPOTS,
  DEPOT_MAP,
  isItemStockedAtDepot,
  ITEMS,
  ITEM_MAP,
  CATEGORIES,
  VEHICLE_MODELS,
  INITIAL_VEHICLES,
  calculateVehicleStatus,
  calculateSimulatedDate,
  SIMULATED_AS_OF_DATE,
  SIMULATED_AS_OF_LABEL,
  TOTAL_WEEKS,
  EVAL_WEEKS,
  DEFAULT_SEED,
  getSeasonalityConfig,
  getWeekCalendarDate,
  SIMULATION_START_DATE_STR
};
