/**
 * Demand & Inventory Simulation Engine
 * 
 * NOTE: All depot names, inventory numbers, parameters, and time-series
 * data in this project are illustrative and synthetic for academic research.
 * No ammunition or weapons are included.
 * 
 * Simulates 104 weeks of weekly demand per depot-item tuple:
 * 
 * Demand Formula:
 *   demand = base * depot_scale * seasonality * surge * noise
 * 
 * Where:
 *   seasonality = 1 + amp * cos(2 * pi * (week - peak) / 52)
 *   Surges = random 1-3 week spikes using seeded generator falling on
 *            different weeks in each of the two years, with generic labels.
 *   Noise = deterministic stochastic variation from seeded PRNG
 * 
 * Calendar Reference:
 *   Week 1 corresponds to Monday, 1 January 2024.
 * 
 * Inventory Calculations:
 *   - Reorder level = avg weekly demand * lead time + safety stock
 *   - Safety stock = 1.65 * std dev * sqrt(lead time) (computed over last 26 weeks)
 */

import { DEPOTS, isItemStockedAtDepot } from './depots.js';
import { ITEMS } from './items.js';
import { createRNG, seededFloat, seededInt, DEFAULT_SEED } from './prng.js';

export const TOTAL_WEEKS = 104;
export const EVAL_WEEKS = 26; // Last 26 weeks used for statistical baseline & safety stock
export const SIMULATION_START_DATE_STR = '2024-01-01'; // 1 January 2024 (Monday)

/**
 * Maps a simulation week number (1 to 104) to its corresponding calendar date.
 * Week 1 begins on Monday, 1 January 2024.
 * 
 * @param {number} week - 1 to 104
 * @returns {{ formattedDate: string, month: string, year: number, isoDate: string }}
 */
export function getWeekCalendarDate(week) {
  const d = new Date(2024, 0, 1);
  d.setDate(d.getDate() + (week - 1) * 7);
  const day = d.getDate();
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const month = months[d.getMonth()];
  const year = d.getFullYear();
  const isoDate = d.toISOString().split('T')[0];
  return {
    formattedDate: `${day} ${month} ${year}`,
    month,
    year,
    isoDate
  };
}

/**
 * Returns India-specific seasonality configuration (amp, peakWeek, rationale)
 * for a specific depot and item.
 */
export function getSeasonalityConfig(depotId, itemId) {
  // 1. Leh Extreme Winter Effects (Weeks 1-5 & 49-52)
  if (depotId === 'leh') {
    if (itemId === 'diesel') {
      return {
        amp: 0.65,
        peak: 2, // Early January
        rationale: 'Leh winter heating: continuous bukhari stove heating and sub-zero engine idling'
      };
    }
    if (itemId === 'oxygen-cylinders') {
      return {
        amp: 0.58,
        peak: 3, // Mid January
        rationale: 'High altitude acclimatization: extreme cold worsens hypoxia; medical oxygen consumption spikes'
      };
    }
    if (itemId === 'batteries') {
      return {
        amp: 0.52,
        peak: 2, // Early January
        rationale: 'Sub-zero battery drain: rapid electrolyte cold failure in temperatures down to -35°C'
      };
    }
    if (itemId === 'ecwcs') {
      return {
        amp: 0.88,
        peak: 41, // Mid October (Advance Winter Stocking AWS)
        rationale: 'Advance winter stocking: mass pre-winter issue before mountain passes close in November'
      };
    }
  }

  // 2. Pre-Winter Clothing Peak in October (Cold/Border Depots)
  if (itemId === 'ecwcs') {
    if (['chandigarh', 'pathankot', 'guwahati'].includes(depotId)) {
      return {
        amp: 0.55,
        peak: 41, // Mid October
        rationale: 'Pre-winter staging: logistics nodes dispatching extreme cold kits forward'
      };
    }
    return {
      amp: 0.15,
      peak: 41,
      rationale: 'Baseline training issues'
    };
  }

  // 3. Monsoon Peak for IV Fluids (July - September / Weeks 28-34)
  if (itemId === 'iv-fluids') {
    if (['guwahati', 'kochi', 'visakhapatnam', 'pathankot'].includes(depotId)) {
      return {
        amp: 0.50,
        peak: 32, // Early August (peak monsoon)
        rationale: 'Monsoon medical surge: high humidity, dehydration, and waterborne infection treatment'
      };
    }
    return {
      amp: 0.32,
      peak: 32,
      rationale: 'Monsoon seasonal hydration and field clinic replenishment'
    };
  }

  // 4. Jodhpur Desert Summer Strain (May - June / Weeks 20-25)
  if (depotId === 'jodhpur') {
    if (itemId === 'batteries' || itemId === 'tyres') {
      return {
        amp: 0.35,
        peak: 22, // Late May
        rationale: 'Thar Desert heat: tarmac heat degradation of tyres and accelerated battery thermal wear'
      };
    }
    if (itemId === 'filters') {
      return {
        amp: 0.40,
        peak: 21, // May sandstorms
        rationale: 'Dust storm filter clogging: desert sandstorm season requires frequent filter replacement'
      };
    }
  }

  // 5. Aviation Turbine Fuel (ATF) operational profiles
  if (itemId === 'atf') {
    if (depotId === 'chandigarh') {
      return {
        amp: 0.28,
        peak: 12, // Spring transport flights
        rationale: 'Air logistics flights: transport aircraft servicing northern outposts'
      };
    }
    if (depotId === 'visakhapatnam' || depotId === 'kochi') {
      return {
        amp: 0.25,
        peak: 44, // Post-monsoon naval flight exercises
        rationale: 'Naval aviation exercises: maritime patrol and helicopter sorties'
      };
    }
  }

  // 6. Rations (Steady with minor seasonal / Advance Winter Stocking boost)
  if (['rice', 'atta', 'dal'].includes(itemId)) {
    if (depotId === 'leh') {
      return {
        amp: 0.30,
        peak: 38, // September pre-winter dry ration dump
        rationale: 'Advance winter stocking: non-perishable ration dumping before pass blockade'
      };
    }
    return {
      amp: 0.08,
      peak: 42,
      rationale: 'Standard seasonal troop rotation and field exercise requirements'
    };
  }

  // Default baseline seasonality
  return {
    amp: 0.12,
    peak: 26,
    rationale: 'Standard seasonal operational cadence'
  };
}

/**
 * Deterministically generates operational surges across the 104-week horizon.
 * Falls on DIFFERENT weeks in Year 1 (weeks 1-52) and Year 2 (weeks 53-104).
 * Uses generic labels: "Field exercise", "Cold wave stock pull", "Air sortie surge",
 * "Naval exercise", "Flood relief operation".
 * Surges are stored in the data so experiments can use them later.
 */
export function generateSurges(rng, depot, item) {
  // Determine appropriate generic label based on context
  let genericLabel = 'Field exercise';
  if (depot.service === 'Navy') {
    genericLabel = 'Naval exercise';
  } else if (depot.service === 'Air Force') {
    genericLabel = 'Air sortie surge';
  } else if (depot.id === 'leh' && (item.id === 'diesel' || item.id === 'oxygen-cylinders')) {
    genericLabel = 'Cold wave stock pull';
  } else if (['guwahati', 'kochi'].includes(depot.id) && item.id === 'iv-fluids') {
    genericLabel = 'Flood relief operation';
  }

  // Year 1 surge: 1-3 weeks between weeks 8 and 46
  const y1Start = seededInt(rng, 8, 46);
  const y1Duration = seededInt(rng, 1, 3);
  const y1Multiplier = Number(seededFloat(rng, 1.35, 1.65).toFixed(2));
  const y1Weeks = [];
  for (let w = y1Start; w < y1Start + y1Duration; w++) {
    y1Weeks.push(w);
  }

  // Year 2 surge: 1-3 weeks between weeks 60 and 98
  // Ensure that (y2WeekOfYear) does not fall on the same week-of-year as y1Start
  let y2WeekOfYear = seededInt(rng, 6, 46);
  if (Math.abs(y2WeekOfYear - y1Start) <= 4) {
    y2WeekOfYear = ((y1Start + 16) % 40) + 6;
  }
  const y2Start = 52 + y2WeekOfYear;
  const y2Duration = seededInt(rng, 1, 3);
  const y2Multiplier = Number(seededFloat(rng, 1.30, 1.60).toFixed(2));
  const y2Weeks = [];
  for (let w = y2Start; w < y2Start + y2Duration; w++) {
    y2Weeks.push(w);
  }

  const surges = [
    {
      id: 'surge-y1',
      label: genericLabel,
      year: 1,
      startWeek: y1Start,
      duration: y1Duration,
      endWeek: y1Start + y1Duration - 1,
      multiplier: y1Multiplier,
      weeks: y1Weeks
    },
    {
      id: 'surge-y2',
      label: genericLabel,
      year: 2,
      startWeek: y2Start,
      duration: y2Duration,
      endWeek: y2Start + y2Duration - 1,
      multiplier: y2Multiplier,
      weeks: y2Weeks
    }
  ];

  return surges;
}

/**
 * Checks if a given week is inside any surge window.
 */
export function getSurgeForWeek(week, surges) {
  for (const surge of surges) {
    if (week >= surge.startWeek && week < surge.startWeek + surge.duration) {
      return {
        isSurge: true,
        multiplier: surge.multiplier,
        label: surge.label
      };
    }
  }
  return { isSurge: false, multiplier: 1.0, label: null };
}

/**
 * Computes weekly demand time series, inventory stats, and safety stock
 * for a specific (depot, item) combination.
 */
export function computeDepotItemData(depot, item, rng) {
  const seasonalityConfig = getSeasonalityConfig(depot.id, item.id);
  const surges = generateSurges(rng, depot, item);
  const surgeWeeks = surges.flatMap((s) => s.weeks);

  const weeklyDemand = [];

  for (let week = 1; week <= TOTAL_WEEKS; week++) {
    const weekOfYear = ((week - 1) % 52) + 1;
    const year = week <= 52 ? 1 : 2;
    const dateInfo = getWeekCalendarDate(week);

    // 1. Seasonality: 1 + amp * cos(2 * pi * (week - peak) / 52)
    const seasonality = 1 + seasonalityConfig.amp * Math.cos(
      (2 * Math.PI * (weekOfYear - seasonalityConfig.peak)) / 52
    );

    // 2. Surge
    const surgeInfo = getSurgeForWeek(week, surges);

    // 3. Noise: bounded deterministic noise ~ +-8%
    const noise = 1 + (rng() - 0.5) * 0.16;

    // 4. Combined demand formula: base * depot_scale * seasonality * surge * noise
    const rawDemand = item.baseWeeklyDemand * depot.sizeScale * seasonality * surgeInfo.multiplier * noise;
    const demand = Math.max(1, Math.round(rawDemand));

    weeklyDemand.push({
      week,
      weekOfYear,
      year,
      date: dateInfo.formattedDate,
      isoDate: dateInfo.isoDate,
      demand,
      seasonality: Number(seasonality.toFixed(3)),
      isSurge: surgeInfo.isSurge,
      surgeMultiplier: surgeInfo.multiplier,
      surgeLabel: surgeInfo.label
    });
  }

  // --- Inventory & Reorder Calculations using last 26 weeks ---
  const last26Weeks = weeklyDemand.slice(TOTAL_WEEKS - EVAL_WEEKS, TOTAL_WEEKS);
  const demandValues26 = last26Weeks.map((d) => d.demand);

  const sumDemand26 = demandValues26.reduce((acc, val) => acc + val, 0);
  const avgWeeklyDemand = sumDemand26 / EVAL_WEEKS;

  const variance26 = demandValues26.reduce((acc, val) => acc + Math.pow(val - avgWeeklyDemand, 2), 0) / EVAL_WEEKS;
  const stdDev26 = Math.sqrt(variance26);

  const leadTimeWeeks = depot.leadTimeWeeks;

  // Safety stock formula: 1.65 * std_dev * sqrt(lead_time)
  const safetyStock = 1.65 * stdDev26 * Math.sqrt(leadTimeWeeks);

  // Reorder level formula: avg weekly demand * lead time + safety stock
  const reorderLevel = Math.round(avgWeeklyDemand * leadTimeWeeks + safetyStock);

  // Stock on hand:
  // Deterministically simulated stock level with realistic distribution
  const stockSeedMultiplier = seededFloat(rng, 0.75, 1.40);
  const stockOnHand = Math.max(10, Math.round(reorderLevel * stockSeedMultiplier));

  // Weeks of supply coverage
  const weeksOfSupply = avgWeeklyDemand > 0 ? Number((stockOnHand / avgWeeklyDemand).toFixed(1)) : 0;

  // Stock status classification rule:
  // - Healthy: quantity > reorder level
  // - Reorder needed: quantity <= reorder level and weeks of cover >= lead time
  // - Critical low: weeks of cover < lead time (stock is expected to run out before a requisition can arrive)
  let stockStatus = 'Healthy';
  let stockStatusColor = 'green';
  if (weeksOfSupply < leadTimeWeeks) {
    stockStatus = 'Critical low';
    stockStatusColor = 'red';
  } else if (stockOnHand <= reorderLevel) {
    stockStatus = 'Reorder needed';
    stockStatusColor = 'amber';
  }

  return {
    depotId: depot.id,
    depotName: depot.name,
    itemId: item.id,
    itemName: item.name,
    unit: item.unit,
    leadTimeWeeks,
    leadTimeReason: depot.leadTimeReason,
    weeklyDemand,
    seasonalityConfig,
    surges,
    surgeWeeks, // Flat array of weeks with active surges for easy experimental access
    inventory: {
      stockOnHand,
      reorderLevel,
      safetyStock: Math.round(safetyStock),
      avgWeeklyDemand: Math.round(avgWeeklyDemand),
      stdDev26: Number(stdDev26.toFixed(2)),
      leadTimeWeeks,
      weeksOfSupply,
      stockStatus,
      stockStatusColor
    }
  };
}

/**
 * Generates the full deterministic dataset for all 8 depots and only their stocked items.
 * Seeded RNG ensures identical output on every run.
 */
export function generateAllData(seed = DEFAULT_SEED) {
  const rng = createRNG(seed);
  const dataset = {};

  for (const depot of DEPOTS) {
    dataset[depot.id] = {};
    for (const item of ITEMS) {
      // Only generate and store data for items stocked by this depot
      if (isItemStockedAtDepot(depot.service, item.id)) {
        dataset[depot.id][item.id] = computeDepotItemData(depot, item, rng);
      }
    }
  }

  return dataset;
}
