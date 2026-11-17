/**
 * Initial Audit Log Seed Records
 * 
 * Tracks system events across authentication, inventory changes, requisitions,
 * and user account modifications.
 */

export const INITIAL_AUDIT_LOGS = [
  {
    id: 'AUD-0001',
    timestamp: '2024-05-10T09:30:00Z',
    timestampFormatted: '10 May 2024, 09:30',
    userId: 'user-001',
    userName: 'Maj R. Thakur',
    userRole: 'store_officer',
    actionType: 'requisition_create',
    actionLabel: 'Requisition Created',
    description: 'Created Urgent requisition REQ-0001 for 180 Sets of Filters at Jodhpur.'
  },
  {
    id: 'AUD-0002',
    timestamp: '2024-05-11T10:15:00Z',
    timestampFormatted: '11 May 2024, 10:15',
    userId: 'user-004',
    userName: 'Brig S. Menon',
    userRole: 'commander',
    actionType: 'requisition_approve',
    actionLabel: 'Requisition Approved',
    description: 'Approved requisition REQ-0001 (Jodhpur - Filters) with comment: Approved for desert maintenance operations.'
  },
  {
    id: 'AUD-0003',
    timestamp: '2024-05-14T16:00:00Z',
    timestampFormatted: '14 May 2024, 16:00',
    userId: 'user-001',
    userName: 'Maj R. Thakur',
    userRole: 'store_officer',
    actionType: 'requisition_fulfil',
    actionLabel: 'Requisition Fulfilled',
    description: 'Marked REQ-0001 as fulfilled. Added 180 Sets of Filters to Jodhpur stock on hand.'
  },
  {
    id: 'AUD-0004',
    timestamp: '2024-10-02T11:45:00Z',
    timestampFormatted: '02 Oct 2024, 11:45',
    userId: 'user-002',
    userName: 'Capt A. Rao',
    userRole: 'store_officer',
    actionType: 'requisition_create',
    actionLabel: 'Requisition Created',
    description: 'Created Emergency requisition REQ-0002 for 120 Sets of ECWCS at Leh.'
  },
  {
    id: 'AUD-0005',
    timestamp: '2024-10-03T09:15:00Z',
    timestampFormatted: '03 Oct 2024, 09:15',
    userId: 'user-004',
    userName: 'Brig S. Menon',
    userRole: 'commander',
    actionType: 'requisition_approve',
    actionLabel: 'Requisition Approved',
    description: 'Approved requisition REQ-0002 (Leh - ECWCS) with comment: Priority winter clearance granted.'
  },
  {
    id: 'AUD-0006',
    timestamp: '2024-09-16T14:45:00Z',
    timestampFormatted: '16 Sep 2024, 14:45',
    userId: 'user-004',
    userName: 'Brig S. Menon',
    userRole: 'commander',
    actionType: 'requisition_reject',
    actionLabel: 'Requisition Rejected',
    description: 'Rejected requisition REQ-0005 (Kochi - Ready-to-eat rations). Reason: Existing supply pipeline sufficient.'
  }
];
