/**
 * Vehicle Fleet & Maintenance Dataset
 * 
 * NOTE: All vehicle models, IDs, engine hours, maintenance intervals, and fleet
 * records in this project are illustrative and synthetic for academic research.
 * No weapons, ammunition, or classified data are included.
 * 
 * 30 illustrative military logistics and transport vehicles across 8 depots.
 * 
 * Simulated As-Of Date:
 *   28 December 2025 (End of Simulation Week 104).
 *   All forward maintenance forecast dates are calculated from this benchmark date.
 */

import { DEPOTS } from './depots.js';
import { createRNG, seededInt, DEFAULT_SEED } from './prng.js';
import { getWeekCalendarDate } from './demandGenerator.js';

export const SIMULATED_AS_OF_DATE = '2025-12-28';
export const SIMULATED_AS_OF_LABEL = '28 Dec 2025 (Simulated as-of Week 104)';

export const VEHICLE_MODELS = [
  {
    model: 'Ashok Leyland Stallion 4x4',
    type: 'Tactical cargo truck',
    role: 'Tactical cargo transport',
    fuelType: 'High-speed diesel',
    defaultIntervalHours: 500
  },
  {
    model: 'Ashok Leyland Super Stallion 6x6',
    type: 'Heavy container transporter',
    role: 'Heavy container transport',
    fuelType: 'High-speed diesel',
    defaultIntervalHours: 500
  },
  {
    model: 'Tatra T815 8x8 Heavy Chassis',
    type: 'Heavy equipment carrier',
    role: 'Bridge & crane chassis',
    fuelType: 'High-speed diesel',
    defaultIntervalHours: 750
  },
  {
    model: 'Ashok Leyland 7.5 kL Fuel Bowser',
    type: 'Bulk fuel tanker',
    role: 'POL line replenishment',
    fuelType: 'High-speed diesel',
    defaultIntervalHours: 500
  },
  {
    model: 'Tata LPTA 715 4x4',
    type: 'Medium troop carrier',
    role: 'Troop & stores transit',
    fuelType: 'High-speed diesel',
    defaultIntervalHours: 500
  },
  {
    model: 'Force Gurkha 4x4 Light Patrol',
    type: 'Light liaison vehicle',
    role: 'Forward liaison & reconnaissance',
    fuelType: 'High-speed diesel',
    defaultIntervalHours: 250
  },
  {
    model: 'Mahindra Marksman 4x4',
    type: 'Perimeter patrol vehicle',
    role: 'Depot perimeter protection',
    fuelType: 'High-speed diesel',
    defaultIntervalHours: 250
  },
  {
    model: 'Tata 6x6 Wrecker Recovery',
    type: 'Field recovery vehicle',
    role: 'Heavy vehicle towing & crane recovery',
    fuelType: 'High-speed diesel',
    defaultIntervalHours: 500
  }
];

/**
 * Calculates estimated service forecast date from the simulated as-of date.
 */
export function calculateSimulatedDate(asOfDateStr, weeksToAdd) {
  const [y, m, d] = asOfDateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  const days = Math.round(Number(weeksToAdd) * 7);
  date.setDate(date.getDate() + days);

  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const day = date.getDate();
  const month = months[date.getMonth()];
  const year = date.getFullYear();

  return `${day} ${month} ${year} (Simulated)`;
}

/**
 * Evaluates vehicle maintenance status and forecasts.
 * 
 * Status Rules:
 * 1. Under repair (flag set: isUnderRepair === true)
 * 2. Service overdue (hoursSinceLastService >= serviceIntervalHours)
 * 3. Due soon (estimatedWeeksUntilService < 4)
 * 4. Operational (otherwise)
 */
export function calculateVehicleStatus(vehicle) {
  const interval = Number(vehicle.serviceIntervalHours) || 500;
  const hoursSince = Number(vehicle.hoursSinceLastService) || 0;
  const remainingHours = interval - hoursSince;

  // 12-week average weekly engine usage
  const usageHistory = vehicle.weeklyUsage || [];
  const last12 = usageHistory.slice(-12);
  let avgWeeklyHours12 = 25;
  if (last12.length > 0) {
    const sum = last12.reduce((acc, entry) => acc + Number(entry.hours || 0), 0);
    avgWeeklyHours12 = Number((sum / last12.length).toFixed(1));
  } else if (vehicle.weeklyEngineHours) {
    avgWeeklyHours12 = Number(vehicle.weeklyEngineHours);
  }

  // Estimated weeks until next scheduled service
  const estimatedWeeksUntilService = (remainingHours > 0 && avgWeeklyHours12 > 0)
    ? Number((remainingHours / avgWeeklyHours12).toFixed(1))
    : 0;

  // Percentage of service interval exhausted
  const percentIntervalUsed = Math.min(
    100,
    Math.round((hoursSince / interval) * 100)
  );

  // Estimated next service date (Simulated)
  const estimatedServiceDate = remainingHours <= 0
    ? 'Immediate (Overdue)'
    : calculateSimulatedDate(
        vehicle.asOfDate || SIMULATED_AS_OF_DATE,
        estimatedWeeksUntilService
      );

  // Status classification hierarchy
  let status;
  let statusColor;

  if (vehicle.isUnderRepair) {
    status = 'Under repair';
    statusColor = 'purple';
  } else if (hoursSince >= interval || remainingHours <= 0) {
    status = 'Service overdue';
    statusColor = 'red';
  } else if (estimatedWeeksUntilService < 4) {
    status = 'Due soon';
    statusColor = 'amber';
  } else {
    status = 'Operational';
    statusColor = 'green';
  }

  return {
    remainingHours,
    avgWeeklyHours12,
    estimatedWeeksUntilService,
    percentIntervalUsed,
    estimatedServiceDate,
    status,
    statusColor
  };
}

/**
 * Generates 30 initial synthetic vehicles across the 8 depots with 104 weeks of engine usage.
 */
export function generateVehicles(seed = DEFAULT_SEED + 99) {
  const rng = createRNG(seed);
  const vehicles = [];

  const depotAllocation = [
    { depotId: 'leh', count: 4 },
    { depotId: 'pathankot', count: 4 },
    { depotId: 'jodhpur', count: 4 },
    { depotId: 'guwahati', count: 4 },
    { depotId: 'pune', count: 4 },
    { depotId: 'visakhapatnam', count: 4 },
    { depotId: 'kochi', count: 3 },
    { depotId: 'chandigarh', count: 3 }
  ];

  let vehicleIndex = 1;

  for (const alloc of depotAllocation) {
    const depot = DEPOTS.find((d) => d.id === alloc.depotId);

    for (let i = 0; i < alloc.count; i++) {
      const modelTemplate = VEHICLE_MODELS[(vehicleIndex - 1) % VEHICLE_MODELS.length];
      const serviceIntervalHours = modelTemplate.defaultIntervalHours;
      const simpleId = `VEH-${String(vehicleIndex).padStart(3, '0')}`;

      // Cumulative engine hours
      const totalEngineHours = seededInt(rng, 1400, 5600);

      // Base weekly run hours
      const baseWeeklyHours = seededInt(rng, 18, 38);

      // Generate 104 weeks of historical weekly usage
      const weeklyUsage = [];
      for (let w = 1; w <= 104; w++) {
        const cal = getWeekCalendarDate(w);
        // Add random fluctuation + occasional high exercise week
        const noise = seededInt(rng, -5, 6);
        const isSurgeWeek = w === 18 || w === 42 || w === 70 || w === 96;
        const surgeBonus = isSurgeWeek ? seededInt(rng, 12, 20) : 0;
        const weekHours = Math.max(8, baseWeeklyHours + noise + surgeBonus);

        weeklyUsage.push({
          week: w,
          hours: weekHours,
          date: cal.formattedDate
        });
      }

      // Initial hours run since last scheduled service
      let hoursSinceLastService;
      let isUnderRepair = false;
      let repairReason = null;

      // Realistic initial status distribution
      if (vehicleIndex === 5 || vehicleIndex === 19) {
        // Under repair demo vehicles
        isUnderRepair = true;
        repairReason = vehicleIndex === 5
          ? 'Radiator coolant jacket crack during high-altitude transit'
          : 'Air brake compressor line valve replacement';
        hoursSinceLastService = seededInt(rng, 220, 390);
      } else if (vehicleIndex % 6 === 0) {
        // Overdue service
        hoursSinceLastService = seededInt(rng, serviceIntervalHours + 15, serviceIntervalHours + 75);
      } else if (vehicleIndex % 4 === 0) {
        // Due soon (< 4 weeks of remaining hours)
        hoursSinceLastService = seededInt(
          rng,
          Math.round(serviceIntervalHours * 0.85),
          serviceIntervalHours - 10
        );
      } else {
        // Operational
        hoursSinceLastService = seededInt(rng, 45, Math.round(serviceIntervalHours * 0.65));
      }

      // Historical service records
      const serviceHistory = [
        {
          id: `SRV-${String(vehicleIndex).padStart(3, '0')}-01`,
          date: '2025-05-12',
          dateFormatted: '12 May 2025 (Simulated)',
          type: 'Periodic service',
          hoursAtService: totalEngineHours - hoursSinceLastService,
          notes: `${serviceIntervalHours}-hour scheduled depot overhaul: oil change, filters, brake shoe inspection.`,
          loggedBy: depot.service === 'Navy' ? 'Lt Cdr K. Nair' : 'Maj R. Thakur'
        }
      ];

      if (vehicleIndex % 3 === 0) {
        serviceHistory.unshift({
          id: `SRV-${String(vehicleIndex).padStart(3, '0')}-02`,
          date: '2025-09-20',
          dateFormatted: '20 Sep 2025 (Simulated)',
          type: 'Repair',
          hoursAtService: totalEngineHours - Math.round(hoursSinceLastService * 0.4),
          notes: 'Replaced rear shock absorber bushings and alternator belt.',
          loggedBy: 'Capt A. Rao'
        });
      }

      const baseRecord = {
        id: simpleId,
        model: modelTemplate.model,
        type: modelTemplate.type,
        role: modelTemplate.role,
        fuelType: modelTemplate.fuelType,
        depotId: depot.id,
        depotName: depot.shortName,
        serviceBranch: depot.service,
        serviceIntervalHours,
        totalEngineHours,
        hoursSinceLastService,
        weeklyEngineHours: baseWeeklyHours,
        weeklyUsage,
        serviceHistory,
        isUnderRepair,
        repairReason,
        asOfDate: SIMULATED_AS_OF_DATE,
        asOfDateLabel: SIMULATED_AS_OF_LABEL
      };

      const calculated = calculateVehicleStatus(baseRecord);

      vehicles.push({
        ...baseRecord,
        ...calculated
      });

      vehicleIndex++;
    }
  }

  return vehicles;
}

export const INITIAL_VEHICLES = generateVehicles();

/**
 * Filter vehicles by depot.
 */
export function getVehiclesByDepot(depotId, vehicleList = INITIAL_VEHICLES) {
  if (!depotId || depotId === 'all') {
    return vehicleList;
  }
  return vehicleList.filter((v) => v.depotId === depotId);
}
