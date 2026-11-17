/**
 * Requisitions Context
 * 
 * Manages procurement requisitions across Army, Navy, and Air Force logistics depots:
 * - Persists to localStorage with INITIAL_REQUISITIONS fallback
 * - Enforces role-based workflows:
 *     - Store Officers create requisitions for their assigned depot and fulfil approved ones
 *     - Commanders review, approve, or reject requisitions (rejection requires mandatory comments)
 *     - Admins cannot approve requisitions (strict separation of duties)
 * - Links fulfillment directly to Inventory stock on hand
 * - Blocks duplicate pending requisitions for the same depot-commodity pair
 */

import { createContext, useContext, useState, useEffect } from 'react';
import { INITIAL_REQUISITIONS } from '../data/requisitions.js';
import { DEPOT_MAP } from '../data/depots.js';
import { ITEM_MAP } from '../data/items.js';
import { useAuth } from './AuthContext.jsx';
import { useAudit } from './AuditContext.jsx';
import { useInventory } from './InventoryContext.jsx';

const STORAGE_KEY = 'iaf_requisitions_v2';

const RequisitionContext = createContext(null);

export function RequisitionProvider({ children }) {
  const { currentUser, isStoreOfficer, isCommander, isAdmin } = useAuth();
  const { logAction } = useAudit();
  const { fulfillStockLine } = useInventory();

  const [requisitions, setRequisitions] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Failed to parse requisitions from localStorage:', e);
    }
    return INITIAL_REQUISITIONS;
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(requisitions));
    } catch (e) {
      console.warn('Failed to save requisitions to localStorage:', e);
    }
  }, [requisitions]);

  /**
   * Creates a new requisition (Store Officer only).
   * Blocks duplicate pending requests for the same depot-item pair.
   */
  const createRequisition = ({ depotId, itemId, quantity, priority, justification }) => {
    if (!currentUser) {
      throw new Error('Authentication required: Please log in to submit procurement requisitions.');
    }
    if (!isStoreOfficer) {
      if (isCommander || isAdmin) {
        throw new Error(`Access denied: ${isCommander ? 'Commanders' : 'System Administrators'} cannot raise requisitions. Requisitions must originate from depot Store Officers.`);
      }
      throw new Error('Access denied: Only Store Officers can submit procurement requisitions.');
    }
    if (currentUser.depotId !== depotId) {
      throw new Error(`Access denied: You can only submit requisitions for your assigned depot (${currentUser.depotName}).`);
    }

    const qty = parseInt(quantity, 10);
    if (isNaN(qty) || qty <= 0) {
      throw new Error('Requisition quantity must be a whole number greater than 0.');
    }

    // Check duplicate pending requisition
    const duplicatePending = requisitions.some(
      (r) => r.depotId === depotId && r.itemId === itemId && r.status === 'Pending'
    );
    if (duplicatePending) {
      throw new Error('A pending requisition already exists for this commodity at this depot. A second requisition cannot be submitted until the previous one is reviewed.');
    }

    const depot = DEPOT_MAP[depotId];
    const item = ITEM_MAP[itemId];
    if (!depot || !item) {
      throw new Error('Invalid depot or commodity specified.');
    }

    const now = new Date();
    const formattedDate = now.toLocaleString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    const nextIdNumber = requisitions.length + 1;
    const newReq = {
      id: `REQ-${String(nextIdNumber).padStart(4, '0')}`,
      depotId: depot.id,
      depotName: depot.shortName,
      itemId: item.id,
      itemName: item.name,
      category: item.category,
      quantity: qty,
      unit: item.unit,
      priority: priority || 'Routine',
      justification: justification?.trim() || 'Standard replenishment requisition.',
      createdBy: currentUser.name,
      createdByUsername: currentUser.username,
      createdAt: now.toISOString(),
      createdAtFormatted: formattedDate,
      status: 'Pending',
      commanderComment: null,
      reviewedBy: null,
      reviewedAt: null,
      reviewedAtFormatted: null,
      fulfilledAt: null,
      fulfilledAtFormatted: null
    };

    setRequisitions((prev) => [newReq, ...prev]);

    logAction({
      user: currentUser,
      actionType: 'requisition_create',
      actionLabel: 'Requisition Submitted',
      description: `Submitted ${newReq.priority} requisition ${newReq.id} for ${qty} ${newReq.unit} of ${newReq.itemName} at ${newReq.depotName}.`
    });

    return newReq;
  };

  /**
   * Approves a requisition (Commander only; Admins prohibited under separation of duties).
   */
  const approveRequisition = (id, comment = '') => {
    if (!currentUser) {
      throw new Error('Authentication required: Please log in to approve requisitions.');
    }
    if (!isCommander) {
      if (isAdmin) {
        throw new Error('Separation of duties violation: System Administrators cannot approve requisitions. Approvals must be performed by a Commander.');
      }
      if (isStoreOfficer) {
        throw new Error('Access denied: Store Officers cannot approve requisitions.');
      }
      throw new Error('Access denied: Only Commanders can approve requisitions.');
    }

    const target = requisitions.find((r) => r.id === id);
    if (!target) throw new Error('Requisition not found.');
    if (target.status !== 'Pending') {
      throw new Error(`Cannot approve requisition in "${target.status}" status.`);
    }

    const now = new Date();
    const formattedDate = now.toLocaleString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    const finalComment = comment?.trim() || 'Approved for supply dispatch.';

    setRequisitions((prev) =>
      prev.map((r) => {
        if (r.id !== id) return r;
        return {
          ...r,
          status: 'Approved',
          commanderComment: finalComment,
          reviewedBy: currentUser.name,
          reviewedAt: now.toISOString(),
          reviewedAtFormatted: formattedDate
        };
      })
    );

    logAction({
      user: currentUser,
      actionType: 'requisition_approve',
      actionLabel: 'Requisition Approved',
      description: `Approved ${target.id} (${target.depotName} - ${target.itemName}) with comment: "${finalComment}".`
    });
  };

  /**
   * Rejects a requisition (Commander only; comment required).
   */
  const rejectRequisition = (id, comment) => {
    if (!currentUser) {
      throw new Error('Authentication required: Please log in to reject requisitions.');
    }
    if (!isCommander) {
      if (isAdmin) {
        throw new Error('Separation of duties violation: System Administrators cannot review requisitions.');
      }
      if (isStoreOfficer) {
        throw new Error('Access denied: Store Officers cannot reject requisitions.');
      }
      throw new Error('Access denied: Only Commanders can reject requisitions.');
    }

    if (!comment || !comment.trim()) {
      throw new Error('A commander review comment is mandatory when rejecting a requisition.');
    }

    const target = requisitions.find((r) => r.id === id);
    if (!target) throw new Error('Requisition not found.');
    if (target.status !== 'Pending') {
      throw new Error(`Cannot reject requisition in "${target.status}" status.`);
    }

    const now = new Date();
    const formattedDate = now.toLocaleString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    setRequisitions((prev) =>
      prev.map((r) => {
        if (r.id !== id) return r;
        return {
          ...r,
          status: 'Rejected',
          commanderComment: comment.trim(),
          reviewedBy: currentUser.name,
          reviewedAt: now.toISOString(),
          reviewedAtFormatted: formattedDate
        };
      })
    );

    logAction({
      user: currentUser,
      actionType: 'requisition_reject',
      actionLabel: 'Requisition Rejected',
      description: `Rejected ${target.id} (${target.depotName} - ${target.itemName}). Reason: "${comment.trim()}".`
    });
  };

  /**
   * Marks an approved requisition as fulfilled and adds stock quantity to Inventory.
   * Executed by the Store Officer for that depot.
   */
  const fulfilRequisition = (id) => {
    if (!currentUser) {
      throw new Error('Authentication required: Please log in to fulfil requisitions.');
    }
    const target = requisitions.find((r) => r.id === id);
    if (!target) throw new Error('Requisition not found.');

    if (target.status !== 'Approved') {
      throw new Error(`Requisition must be in "Approved" status to be fulfilled (current status: ${target.status}).`);
    }

    if (!isStoreOfficer) {
      if (isCommander || isAdmin) {
        throw new Error(`Access denied: ${isCommander ? 'Commanders' : 'System Administrators'} cannot fulfil requisitions. Fulfillment must be confirmed by the depot Store Officer upon receipt.`);
      }
      throw new Error('Access denied: Only Store Officers can mark requisitions as fulfilled.');
    }

    if (currentUser.depotId !== target.depotId) {
      throw new Error(`Access denied: You can only fulfil shipments received at your assigned depot (${currentUser.depotName}).`);
    }

    const now = new Date();
    const formattedDate = now.toLocaleString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    // Update requisition status
    setRequisitions((prev) =>
      prev.map((r) => {
        if (r.id !== id) return r;
        return {
          ...r,
          status: 'Fulfilled',
          fulfilledAt: now.toISOString(),
          fulfilledAtFormatted: formattedDate
        };
      })
    );

    // Link directly to stock on hand in InventoryContext!
    fulfillStockLine(target.depotId, target.itemId, target.quantity);

    logAction({
      user: currentUser,
      actionType: 'requisition_fulfil',
      actionLabel: 'Requisition Fulfilled',
      description: `Marked ${target.id} as fulfilled. Added ${target.quantity} ${target.unit} of ${target.itemName} to ${target.depotName} stock on hand.`
    });
  };

  // Helper count for pending requisitions
  const pendingCount = requisitions.filter((r) => r.status === 'Pending').length;

  return (
    <RequisitionContext.Provider
      value={{
        requisitions,
        createRequisition,
        approveRequisition,
        rejectRequisition,
        fulfilRequisition,
        pendingCount
      }}
    >
      {children}
    </RequisitionContext.Provider>
  );
}

export function useRequisitions() {
  const context = useContext(RequisitionContext);
  if (!context) {
    throw new Error('useRequisitions must be used within a RequisitionProvider');
  }
  return context;
}
