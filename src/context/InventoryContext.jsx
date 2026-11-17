/**
 * Inventory Context (React Context)
 * 
 * Provides shared state for stock lines loaded from the simulation dataset:
 * - Persists edits and additions to localStorage
 * - Provides addStockLine, updateStockLine, deleteStockLine, fulfillStockLine, and resetToSampleData
 * - Enforces role-based permissions:
 *     - Store Officers can only add/edit/delete stock lines for their assigned depot
 *     - Commanders and Admins have read-only access to inventory lines
 *     - Only Admins can reset to sample data
 * - Stock status classification rule:
 *     - Healthy: quantity > reorder level
 *     - Reorder needed: quantity <= reorder level and weeks of cover >= lead time
 *     - Critical low: weeks of cover < lead time
 * - Computes weeks of cover dynamically
 */

import { createContext, useContext, useState, useEffect } from 'react';
import {
  DEPOTS,
  DEPOT_MAP,
  ITEMS,
  ITEM_MAP,
  SIMULATED_DATA,
  isItemStockedAtDepot
} from '../data/index.js';
import { useAuth } from './AuthContext.jsx';
import { useAudit } from './AuditContext.jsx';

const STORAGE_KEY = 'iaf_logistics_stock_lines_v3';

const InventoryContext = createContext(null);

/**
 * Calculates stock status and badge color:
 * - Healthy: quantity > reorder level
 * - Reorder needed: quantity <= reorder level and weeks of cover >= lead time
 * - Critical low: weeks of cover < lead time
 */
export function calculateStockStatus(quantity, reorderLevel, weeksOfCover, leadTimeWeeks) {
  const qty = Number(quantity);
  const rop = Number(reorderLevel);
  const cover = Number(weeksOfCover);
  const lead = Number(leadTimeWeeks);

  if (cover < lead) {
    return {
      status: 'Critical low',
      statusColor: 'red'
    };
  }
  if (qty <= rop) {
    return {
      status: 'Reorder needed',
      statusColor: 'amber'
    };
  }
  return {
    status: 'Healthy',
    statusColor: 'green'
  };
}

/**
 * Calculates weeks of supply coverage.
 */
export function calculateWeeksOfCover(quantity, avgWeeklyDemand) {
  const qty = Number(quantity);
  const avg = Number(avgWeeklyDemand);
  if (!avg || avg <= 0) return 0;
  return Number((qty / avg).toFixed(1));
}

/**
 * Constructs baseline sample stock lines from the deterministic simulation data.
 */
export function generateInitialStockLines() {
  const lines = [];

  for (const depot of DEPOTS) {
    for (const item of ITEMS) {
      if (isItemStockedAtDepot(depot.service, item.id) && SIMULATED_DATA[depot.id]?.[item.id]) {
        const simRecord = SIMULATED_DATA[depot.id][item.id];
        const qty = simRecord.inventory.stockOnHand;
        const rop = simRecord.inventory.reorderLevel;
        const avgDemand = simRecord.inventory.avgWeeklyDemand;
        const weeksOfCover = calculateWeeksOfCover(qty, avgDemand);
        const statusInfo = calculateStockStatus(qty, rop, weeksOfCover, depot.leadTimeWeeks);

        lines.push({
          id: `${depot.id}-${item.id}`,
          depotId: depot.id,
          depotName: depot.name,
          depotShortName: depot.shortName,
          service: depot.service,
          itemId: item.id,
          itemName: item.name,
          itemShortName: item.shortName,
          category: item.category,
          unit: item.unit,
          leadTimeWeeks: depot.leadTimeWeeks,
          quantity: qty,
          reorderLevel: rop,
          avgWeeklyDemand: avgDemand,
          safetyStock: simRecord.inventory.safetyStock,
          weeksOfCover,
          status: statusInfo.status,
          statusColor: statusInfo.statusColor,
          isCustom: false
        });
      }
    }
  }

  return lines;
}

export function InventoryProvider({ children }) {
  const { currentUser, isStoreOfficer, isCommander, isAdmin } = useAuth();
  const { logAction } = useAudit();

  const [stockLines, setStockLines] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map((line) => {
            const depotId = line.depotId || line.depot || 'leh';
            const itemId = line.itemId || line.item || 'diesel';
            const depot = DEPOT_MAP[depotId] || DEPOTS[0];
            const item = ITEM_MAP[itemId] || ITEMS[0];
            const simRecord = SIMULATED_DATA[depot.id]?.[item.id];

            const leadTimeWeeks = Number(line.leadTimeWeeks ?? depot.leadTimeWeeks ?? 4);
            const qty = Number(line.quantity ?? simRecord?.inventory?.stockOnHand ?? 0);
            const rop = Number(line.reorderLevel ?? simRecord?.inventory?.reorderLevel ?? 0);
            const avgDemand = Number(line.avgWeeklyDemand ?? simRecord?.inventory?.avgWeeklyDemand ?? 50);
            const safetyStock = Number(line.safetyStock ?? simRecord?.inventory?.safetyStock ?? Math.round(rop * 0.35));

            const safeQty = isNaN(qty) ? 0 : qty;
            const safeRop = isNaN(rop) ? 0 : rop;
            const safeAvg = isNaN(avgDemand) || avgDemand <= 0 ? 50 : avgDemand;
            const safeSs = isNaN(safetyStock) ? Math.round(safeRop * 0.35) : safetyStock;
            const safeLt = isNaN(leadTimeWeeks) ? depot.leadTimeWeeks : leadTimeWeeks;

            const weeksOfCover = calculateWeeksOfCover(safeQty, safeAvg);
            const statusInfo = calculateStockStatus(
              safeQty,
              safeRop,
              weeksOfCover,
              safeLt
            );

            return {
              id: line.id || `${depot.id}-${item.id}`,
              depotId: depot.id,
              depotName: depot.name,
              depotShortName: depot.shortName,
              service: depot.service,
              itemId: item.id,
              itemName: item.name,
              itemShortName: item.shortName,
              category: item.category,
              unit: item.unit,
              leadTimeWeeks: safeLt,
              quantity: safeQty,
              reorderLevel: safeRop,
              avgWeeklyDemand: safeAvg,
              safetyStock: safeSs,
              weeksOfCover,
              status: statusInfo.status,
              statusColor: statusInfo.statusColor,
              isCustom: Boolean(line.isCustom)
            };
          });
        }
      }
    } catch (e) {
      console.warn('Failed to parse saved stock lines from localStorage:', e);
    }
    return generateInitialStockLines();
  });

  // Persist to localStorage on change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(stockLines));
    } catch (e) {
      console.warn('Failed to save stock lines to localStorage:', e);
    }
  }, [stockLines]);

  /**
   * Resets stock lines to the deterministic initial dataset (Admin only).
   */
  const resetToSampleData = () => {
    if (!isAdmin) {
      throw new Error('Access denied: Only System Administrators can reset sample data.');
    }

    const initial = generateInitialStockLines();
    setStockLines(initial);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }

    logAction({
      user: currentUser,
      actionType: 'system_reset',
      actionLabel: 'Sample Data Reset',
      description: 'Reset inventory stock lines to the default sample dataset.'
    });
  };

  /**
   * Adds a new stock line.
   * Store Officers can only add to their assigned depot.
   * Commanders and Admins cannot edit stock (read-only).
   */
  const addStockLine = ({ depotId, itemId, quantity, reorderLevel }) => {
    if (!currentUser) {
      throw new Error('Authentication required: Please log in to register stock lines.');
    }
    if (!isStoreOfficer) {
      if (isCommander || isAdmin) {
        throw new Error(`Access denied: ${isCommander ? 'Commanders' : 'System Administrators'} have read-only access to inventory and cannot add stock lines.`);
      }
      throw new Error('Access denied: Only Store Officers can register new stock lines.');
    }
    if (currentUser.depotId !== depotId) {
      throw new Error(`Access denied: You are only authorized to manage inventory for ${currentUser.depotName}.`);
    }

    const qty = parseInt(quantity, 10);
    const rop = parseInt(reorderLevel, 10);

    if (isNaN(qty) || qty < 0) {
      throw new Error('Quantity must be a whole number 0 or greater.');
    }
    if (isNaN(rop) || rop <= 0) {
      throw new Error('Reorder level must be a whole number greater than 0.');
    }

    const depot = DEPOT_MAP[depotId];
    const item = ITEM_MAP[itemId];

    if (!depot || !item) {
      throw new Error('Invalid depot or item specified.');
    }

    const existingIndex = stockLines.findIndex(
      (line) => line.depotId === depotId && line.itemId === itemId
    );
    if (existingIndex !== -1) {
      throw new Error(`Item ${item.name} is already stocked at ${depot.shortName}.`);
    }

    let avgDemand;
    let safetyStock;

    if (SIMULATED_DATA[depotId]?.[itemId]) {
      avgDemand = SIMULATED_DATA[depotId][itemId].inventory.avgWeeklyDemand;
      safetyStock = SIMULATED_DATA[depotId][itemId].inventory.safetyStock;
    } else {
      avgDemand = Math.round(item.baseWeeklyDemand * depot.sizeScale);
      const estStdDev = Math.round(avgDemand * 0.15);
      safetyStock = Math.round(1.65 * estStdDev * Math.sqrt(depot.leadTimeWeeks));
    }

    const weeksOfCover = calculateWeeksOfCover(qty, avgDemand);
    const statusInfo = calculateStockStatus(qty, rop, weeksOfCover, depot.leadTimeWeeks);

    const newLine = {
      id: `${depotId}-${itemId}`,
      depotId: depot.id,
      depotName: depot.name,
      depotShortName: depot.shortName,
      service: depot.service,
      itemId: item.id,
      itemName: item.name,
      itemShortName: item.shortName,
      category: item.category,
      unit: item.unit,
      leadTimeWeeks: depot.leadTimeWeeks,
      quantity: qty,
      reorderLevel: rop,
      avgWeeklyDemand: avgDemand,
      safetyStock,
      weeksOfCover,
      status: statusInfo.status,
      statusColor: statusInfo.statusColor,
      isCustom: true
    };

    setStockLines((prev) => [newLine, ...prev]);

    logAction({
      user: currentUser,
      actionType: 'inventory_add',
      actionLabel: 'Stock Line Added',
      description: `Added ${newLine.itemName} (${qty} ${newLine.unit}) to ${newLine.depotShortName} with ROP ${rop}.`
    });

    return newLine;
  };

  /**
   * Updates an existing stock line's quantity and reorder level.
   * Store Officers can only update lines for their assigned depot.
   * Commanders and Admins cannot edit stock (read-only).
   */
  const updateStockLine = (id, { quantity, reorderLevel }) => {
    if (!currentUser) {
      throw new Error('Authentication required: Please log in to modify stock levels.');
    }
    const targetLine = stockLines.find((l) => l.id === id);
    if (!targetLine) {
      throw new Error('Stock line not found.');
    }

    if (!isStoreOfficer) {
      if (isCommander || isAdmin) {
        throw new Error(`Access denied: ${isCommander ? 'Commanders' : 'System Administrators'} have read-only access to inventory and cannot edit stock levels.`);
      }
      throw new Error('Access denied: Only Store Officers can modify stock levels.');
    }
    if (currentUser.depotId !== targetLine.depotId) {
      throw new Error(`Access denied: You are only authorized to modify inventory for ${currentUser.depotName}.`);
    }

    const qty = parseInt(quantity, 10);
    const rop = parseInt(reorderLevel, 10);

    if (isNaN(qty) || qty < 0) {
      throw new Error('Quantity must be a whole number 0 or greater.');
    }
    if (isNaN(rop) || rop <= 0) {
      throw new Error('Reorder level must be a whole number greater than 0.');
    }

    setStockLines((prev) =>
      prev.map((line) => {
        if (line.id !== id) return line;

        const weeksOfCover = calculateWeeksOfCover(qty, line.avgWeeklyDemand);
        const statusInfo = calculateStockStatus(
          qty,
          rop,
          weeksOfCover,
          line.leadTimeWeeks
        );

        return {
          ...line,
          quantity: qty,
          reorderLevel: rop,
          weeksOfCover,
          status: statusInfo.status,
          statusColor: statusInfo.statusColor
        };
      })
    );

    logAction({
      user: currentUser,
      actionType: 'inventory_edit',
      actionLabel: 'Stock Line Updated',
      description: `Updated ${targetLine.itemName} at ${targetLine.depotShortName}: Qty ${qty}, ROP ${rop}.`
    });
  };

  /**
   * Deletes a stock line by its ID.
   * Store Officers can only delete lines for their assigned depot.
   * Commanders and Admins cannot edit stock (read-only).
   */
  const deleteStockLine = (id) => {
    if (!currentUser) {
      throw new Error('Authentication required: Please log in to remove stock lines.');
    }
    const targetLine = stockLines.find((l) => l.id === id);
    if (!targetLine) return;

    if (!isStoreOfficer) {
      if (isCommander || isAdmin) {
        throw new Error(`Access denied: ${isCommander ? 'Commanders' : 'System Administrators'} have read-only access to inventory and cannot delete stock lines.`);
      }
      throw new Error('Access denied: Only Store Officers can remove stock lines.');
    }
    if (currentUser.depotId !== targetLine.depotId) {
      throw new Error(`Access denied: You are only authorized to remove stock lines for ${currentUser.depotName}.`);
    }

    setStockLines((prev) => prev.filter((line) => line.id !== id));

    logAction({
      user: currentUser,
      actionType: 'inventory_delete',
      actionLabel: 'Stock Line Deleted',
      description: `Deleted ${targetLine.itemName} from ${targetLine.depotShortName}.`
    });
  };

  /**
   * Automatically replenishes stock when a requisition is fulfilled.
   */
  const fulfillStockLine = (depotId, itemId, quantityToAdd) => {
    const qtyAdd = Number(quantityToAdd);
    if (isNaN(qtyAdd) || qtyAdd <= 0) return;

    setStockLines((prev) =>
      prev.map((line) => {
        if (line.depotId === depotId && line.itemId === itemId) {
          const newQty = line.quantity + qtyAdd;
          const weeksOfCover = calculateWeeksOfCover(newQty, line.avgWeeklyDemand);
          const statusInfo = calculateStockStatus(
            newQty,
            line.reorderLevel,
            weeksOfCover,
            line.leadTimeWeeks
          );
          return {
            ...line,
            quantity: newQty,
            weeksOfCover,
            status: statusInfo.status,
            statusColor: statusInfo.statusColor
          };
        }
        return line;
      })
    );
  };

  return (
    <InventoryContext.Provider
      value={{
        stockLines,
        addStockLine,
        updateStockLine,
        deleteStockLine,
        fulfillStockLine,
        resetToSampleData
      }}
    >
      {children}
    </InventoryContext.Provider>
  );
}

export function useInventory() {
  const context = useContext(InventoryContext);
  if (!context) {
    throw new Error('useInventory must be used within an InventoryProvider');
  }
  return context;
}
