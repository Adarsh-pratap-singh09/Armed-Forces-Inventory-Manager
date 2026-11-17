/**
 * Vehicle Fleet & Maintenance Context
 * 
 * Provides shared state for 30 military transport and logistics vehicles:
 * - Persists vehicle state to localStorage (iaf_vehicles_v2)
 * - Enforces role-based permissions:
 *     - Store Officers can only log service, report repair, return to service,
 *       and record usage for vehicles stationed at their assigned depot.
 *     - Commanders and Administrators have read-only access.
 *     - Only Administrators can reset fleet sample data.
 * - Records all maintenance actions in the audit log.
 */

import { createContext, useContext, useState, useEffect } from 'react';
import {
  INITIAL_VEHICLES,
  calculateVehicleStatus,
  SIMULATED_AS_OF_DATE,
  SIMULATED_AS_OF_LABEL
} from '../data/vehicles.js';
import { getWeekCalendarDate } from '../data/demandGenerator.js';
import { useAuth } from './AuthContext.jsx';
import { useAudit } from './AuditContext.jsx';

const STORAGE_KEY = 'iaf_vehicles_v2';

const VehicleContext = createContext(null);

export function VehicleProvider({ children }) {
  const { currentUser, isStoreOfficer, isCommander, isAdmin } = useAuth();
  const { logAction } = useAudit();

  const [vehicles, setVehicles] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Re-evaluate statuses in case formulas or timestamps evolved
          return parsed.map((v) => ({
            ...v,
            ...calculateVehicleStatus(v)
          }));
        }
      }
    } catch (e) {
      console.warn('Failed to parse vehicles from localStorage:', e);
    }
    return INITIAL_VEHICLES;
  });

  // Persist to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(vehicles));
    } catch (e) {
      console.warn('Failed to save vehicles to localStorage:', e);
    }
  }, [vehicles]);

  /**
   * Finds a vehicle by ID.
   */
  const getVehicleById = (id) => {
    return vehicles.find((v) => v.id === id) || null;
  };

  /**
   * Resets vehicle dataset to initial sample generation (Admin only).
   */
  const resetVehiclesToSampleData = () => {
    if (!isAdmin) {
      throw new Error('Access denied: Only System Administrators can reset fleet data.');
    }

    setVehicles(INITIAL_VEHICLES);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }

    logAction({
      user: currentUser,
      actionType: 'system_reset',
      actionLabel: 'Fleet Reset',
      description: 'Reset tactical vehicle fleet to baseline sample records.'
    });
  };

  /**
   * Logs a completed maintenance service (Store Officer of that depot only).
   * A periodic service resets hours since service to 0 and adds a history row.
   */
  const logService = (vehicleId, { date, type, notes }) => {
    if (!currentUser) {
      throw new Error('Authentication required: Please log in to log maintenance.');
    }

    const target = vehicles.find((v) => v.id === vehicleId);
    if (!target) throw new Error('Vehicle record not found.');

    if (!isStoreOfficer) {
      if (isCommander || isAdmin) {
        throw new Error(`Access denied: ${isCommander ? 'Commanders' : 'System Administrators'} have read-only access to maintenance records.`);
      }
      throw new Error('Access denied: Only Store Officers can log maintenance services.');
    }

    if (currentUser.depotId !== target.depotId) {
      throw new Error(`Access denied: You are only authorized to maintain vehicles assigned to ${currentUser.depotName}.`);
    }

    const serviceType = type === 'Repair' ? 'Repair' : 'Periodic service';
    const serviceDate = date?.trim() || SIMULATED_AS_OF_DATE;
    const serviceNotes = notes?.trim() || `${serviceType} completed at depot maintenance workshop.`;

    const now = new Date();
    const serviceEntry = {
      id: `SRV-${target.id}-${String((target.serviceHistory?.length || 0) + 1).padStart(2, '0')}`,
      date: serviceDate,
      dateFormatted: `${serviceDate} (Simulated)`,
      type: serviceType,
      hoursAtService: target.totalEngineHours,
      notes: serviceNotes,
      loggedBy: currentUser.name,
      loggedAt: now.toISOString()
    };

    setVehicles((prev) =>
      prev.map((v) => {
        if (v.id !== vehicleId) return v;

        // Periodic service resets hours since last service to 0
        const newHoursSinceService = serviceType === 'Periodic service' ? 0 : v.hoursSinceLastService;
        const updatedHistory = [serviceEntry, ...(v.serviceHistory || [])];

        const updatedBase = {
          ...v,
          hoursSinceLastService: newHoursSinceService,
          serviceHistory: updatedHistory,
          // If repairing an under-repair vehicle via repair service, return to active
          isUnderRepair: serviceType === 'Repair' ? false : v.isUnderRepair,
          repairReason: serviceType === 'Repair' ? null : v.repairReason
        };

        const calculated = calculateVehicleStatus(updatedBase);
        return {
          ...updatedBase,
          ...calculated
        };
      })
    );

    logAction({
      user: currentUser,
      actionType: 'maintenance_service',
      actionLabel: 'Service Logged',
      description: `Logged ${serviceType} for ${target.id} (${target.model} at ${target.depotName}): ${serviceNotes}`
    });

    return serviceEntry;
  };

  /**
   * Marks a vehicle as under repair (Store Officer of that depot only).
   * A reason is mandatory.
   */
  const markUnderRepair = (vehicleId, reason) => {
    if (!currentUser) {
      throw new Error('Authentication required: Please log in to update vehicle status.');
    }

    const target = vehicles.find((v) => v.id === vehicleId);
    if (!target) throw new Error('Vehicle record not found.');

    if (!isStoreOfficer) {
      if (isCommander || isAdmin) {
        throw new Error(`Access denied: ${isCommander ? 'Commanders' : 'System Administrators'} have read-only access to maintenance records.`);
      }
      throw new Error('Access denied: Only Store Officers can alter vehicle operational status.');
    }

    if (currentUser.depotId !== target.depotId) {
      throw new Error(`Access denied: You are only authorized to manage vehicles assigned to ${currentUser.depotName}.`);
    }

    if (!reason || !reason.trim()) {
      throw new Error('An operational failure or defect reason is required to mark a vehicle under repair.');
    }

    const cleanReason = reason.trim();

    setVehicles((prev) =>
      prev.map((v) => {
        if (v.id !== vehicleId) return v;

        const updatedBase = {
          ...v,
          isUnderRepair: true,
          repairReason: cleanReason
        };

        const calculated = calculateVehicleStatus(updatedBase);
        return {
          ...updatedBase,
          ...calculated
        };
      })
    );

    logAction({
      user: currentUser,
      actionType: 'maintenance_repair_start',
      actionLabel: 'Marked Under Repair',
      description: `Marked ${target.id} (${target.model} at ${target.depotName}) under repair. Reason: "${cleanReason}".`
    });
  };

  /**
   * Returns a repaired vehicle back to operational service (Store Officer of that depot only).
   */
  const returnToService = (vehicleId) => {
    if (!currentUser) {
      throw new Error('Authentication required: Please log in to update vehicle status.');
    }

    const target = vehicles.find((v) => v.id === vehicleId);
    if (!target) throw new Error('Vehicle record not found.');

    if (!isStoreOfficer) {
      if (isCommander || isAdmin) {
        throw new Error(`Access denied: ${isCommander ? 'Commanders' : 'System Administrators'} have read-only access to maintenance records.`);
      }
      throw new Error('Access denied: Only Store Officers can return vehicles to active service.');
    }

    if (currentUser.depotId !== target.depotId) {
      throw new Error(`Access denied: You are only authorized to manage vehicles assigned to ${currentUser.depotName}.`);
    }

    setVehicles((prev) =>
      prev.map((v) => {
        if (v.id !== vehicleId) return v;

        const updatedBase = {
          ...v,
          isUnderRepair: false,
          repairReason: null
        };

        const calculated = calculateVehicleStatus(updatedBase);
        return {
          ...updatedBase,
          ...calculated
        };
      })
    );

    logAction({
      user: currentUser,
      actionType: 'maintenance_repair_end',
      actionLabel: 'Returned to Service',
      description: `Returned ${target.id} (${target.model} at ${target.depotName}) to operational readiness.`
    });
  };

  /**
   * Records a new week of engine run hours (Store Officer of that depot only).
   * Appends to usage history, adds hours to hoursSinceLastService and totalEngineHours.
   */
  const recordWeeklyUsage = (vehicleId, hours) => {
    if (!currentUser) {
      throw new Error('Authentication required: Please log in to record vehicle usage.');
    }

    const target = vehicles.find((v) => v.id === vehicleId);
    if (!target) throw new Error('Vehicle record not found.');

    if (!isStoreOfficer) {
      if (isCommander || isAdmin) {
        throw new Error(`Access denied: ${isCommander ? 'Commanders' : 'System Administrators'} have read-only access to maintenance records.`);
      }
      throw new Error('Access denied: Only Store Officers can record vehicle operational hours.');
    }

    if (currentUser.depotId !== target.depotId) {
      throw new Error(`Access denied: You are only authorized to manage vehicles assigned to ${currentUser.depotName}.`);
    }

    const runHours = Number(hours);
    if (isNaN(runHours) || runHours <= 0) {
      throw new Error('Weekly engine run hours must be a positive number greater than 0.');
    }

    setVehicles((prev) =>
      prev.map((v) => {
        if (v.id !== vehicleId) return v;

        const currentUsage = v.weeklyUsage || [];
        const nextWeekNum = currentUsage.length + 1;
        const cal = getWeekCalendarDate(nextWeekNum);

        const newUsageEntry = {
          week: nextWeekNum,
          hours: Math.round(runHours * 10) / 10,
          date: cal.formattedDate
        };

        const updatedHistory = [...currentUsage, newUsageEntry];
        const newHoursSince = v.hoursSinceLastService + runHours;
        const newTotal = v.totalEngineHours + runHours;

        const updatedBase = {
          ...v,
          hoursSinceLastService: newHoursSince,
          totalEngineHours: newTotal,
          weeklyUsage: updatedHistory
        };

        const calculated = calculateVehicleStatus(updatedBase);
        return {
          ...updatedBase,
          ...calculated
        };
      })
    );

    logAction({
      user: currentUser,
      actionType: 'maintenance_usage_log',
      actionLabel: 'Usage Recorded',
      description: `Recorded ${runHours} engine hours for ${target.id} (${target.model} at ${target.depotName}). Total hours now ${target.totalEngineHours + runHours}.`
    });
  };

  return (
    <VehicleContext.Provider
      value={{
        vehicles,
        getVehicleById,
        logService,
        markUnderRepair,
        returnToService,
        recordWeeklyUsage,
        resetVehiclesToSampleData,
        asOfDate: SIMULATED_AS_OF_DATE,
        asOfDateLabel: SIMULATED_AS_OF_LABEL
      }}
    >
      {children}
    </VehicleContext.Provider>
  );
}

export function useVehicles() {
  const context = useContext(VehicleContext);
  if (!context) {
    throw new Error('useVehicles must be used within a VehicleProvider');
  }
  return context;
}
