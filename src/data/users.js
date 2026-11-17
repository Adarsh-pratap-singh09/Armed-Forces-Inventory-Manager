/**
 * Demo Users & Role Definitions
 * 
 * NOTE: All names, credentials, and appointments are fictional and synthetic
 * for academic demonstration purposes only.
 * 
 * Roles:
 * - 'store_officer': Manages stock and requisitions for a specific depot.
 * - 'commander': Reviews and approves/rejects requisitions across all depots; views audit log.
 * - 'admin': System administrator; manages user accounts; views audit log; resets data.
 */

export const INITIAL_USERS = [
  {
    id: 'user-001',
    username: 'rthakur',
    password: 'password123',
    name: 'Maj R. Thakur',
    role: 'store_officer',
    roleLabel: 'Store Officer',
    depotId: 'jodhpur',
    depotName: 'Jodhpur',
    service: 'Army',
    status: 'active'
  },
  {
    id: 'user-002',
    username: 'arao',
    password: 'password123',
    name: 'Capt A. Rao',
    role: 'store_officer',
    roleLabel: 'Store Officer',
    depotId: 'leh',
    depotName: 'Leh',
    service: 'Army',
    status: 'active'
  },
  {
    id: 'user-003',
    username: 'knair',
    password: 'password123',
    name: 'Lt Cdr K. Nair',
    role: 'store_officer',
    roleLabel: 'Store Officer',
    depotId: 'kochi',
    depotName: 'Kochi',
    service: 'Navy',
    status: 'active'
  },
  {
    id: 'user-004',
    username: 'smenon',
    password: 'password123',
    name: 'Brig S. Menon',
    role: 'commander',
    roleLabel: 'Commander',
    depotId: 'all',
    depotName: 'All Depots',
    service: 'Joint',
    status: 'active'
  },
  {
    id: 'user-005',
    username: 'pbose',
    password: 'password123',
    name: 'Lt Col P. Bose',
    role: 'admin',
    roleLabel: 'System Admin',
    depotId: 'all',
    depotName: 'All Depots',
    service: 'Joint',
    status: 'active'
  }
];

export const ROLE_LABELS = {
  store_officer: 'Store Officer',
  commander: 'Commander',
  admin: 'Administrator'
};
