import { useState, useMemo } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { useRequisitions } from '../context/RequisitionContext.jsx';
import { useInventory } from '../context/InventoryContext.jsx';
import PageHero from '../components/PageHero.jsx';
import { DEPOTS, getStockedItemsForDepot, DEPOT_MAP, ITEM_MAP } from '../data/index.js';
import {
  PlusCircle,
  CheckCircle2,
  XCircle,
  PackageCheck,
  AlertCircle,
  ClipboardList,
  Filter,
  Check,
  X,
  ShieldCheck
} from 'lucide-react';
import { Panel, KpiTile, SegmentedControl, StatusChip, Field } from '../components/ui/index.js';

export default function Requisitions() {
  const { currentUser, isStoreOfficer, isCommander, isAdmin } = useAuth();
  const {
    requisitions,
    createRequisition,
    approveRequisition,
    rejectRequisition,
    fulfilRequisition
  } = useRequisitions();
  const { stockLines } = useInventory();

  // View mode: 'kanban' | 'table'
  const [viewMode, setViewMode] = useState('kanban');

  // Filters state
  const [statusFilter, setStatusFilter] = useState('all');
  const [depotFilter, setDepotFilter] = useState(isStoreOfficer ? currentUser.depotId : 'all');

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [rejectingReq, setRejectingReq] = useState(null);
  const [rejectComment, setRejectComment] = useState('');
  const [rejectError, setRejectError] = useState('');

  const [approvingReq, setApprovingReq] = useState(null);
  const [approveComment, setApproveComment] = useState('');

  // New Requisition Form State (Store Officer)
  const storeOfficerDepotId = currentUser?.depotId || 'leh';
  const depotItems = useMemo(() => {
    return getStockedItemsForDepot(storeOfficerDepotId);
  }, [storeOfficerDepotId]);

  const [reqItemId, setReqItemId] = useState(depotItems[0]?.id || '');
  const [reqQuantity, setReqQuantity] = useState('');
  const [reqPriority, setReqPriority] = useState('Routine');
  const [reqJustification, setReqJustification] = useState('');
  const [createError, setCreateError] = useState('');

  // Calculate suggested quantity when selected item changes
  // Formula: (reorder level + 4 x average weekly demand) - current stock, rounded up, never below 1, still editable.
  const calculateSuggestedQty = (itemId) => {
    const line = stockLines.find(
      (l) => l.depotId === storeOfficerDepotId && l.itemId === itemId
    );
    let rop;
    let avg;
    let stock;

    if (line) {
      rop = Number(line.reorderLevel) || 0;
      avg = Number(line.avgWeeklyDemand) || 0;
      stock = Number(line.quantity) || 0;
    } else {
      const item = ITEM_MAP[itemId];
      const depot = DEPOT_MAP[storeOfficerDepotId];
      avg = Math.round((item?.baseWeeklyDemand || 20) * (depot?.sizeScale || 1));
      rop = Math.round(avg * (depot?.leadTimeWeeks || 4));
      stock = 0;
    }

    const raw = (rop + 4 * avg) - stock;
    const suggested = Math.max(1, Math.ceil(raw));
    return String(suggested);
  };

  const handleOpenCreateModal = () => {
    setCreateError('');
    const firstItemId = depotItems[0]?.id || '';
    setReqItemId(firstItemId);
    setReqQuantity(calculateSuggestedQty(firstItemId));
    setReqPriority('Routine');
    setReqJustification('');
    setIsCreateModalOpen(true);
  };

  const handleItemSelectChange = (newItemId) => {
    setReqItemId(newItemId);
    setReqQuantity(calculateSuggestedQty(newItemId));
    setCreateError('');
  };

  const handleCreateSubmit = (e) => {
    e.preventDefault();
    setCreateError('');

    try {
      createRequisition({
        depotId: storeOfficerDepotId,
        itemId: reqItemId,
        quantity: reqQuantity,
        priority: reqPriority,
        justification: reqJustification
      });
      setIsCreateModalOpen(false);
    } catch (err) {
      setCreateError(err.message);
    }
  };

  const handleOpenRejectModal = (req) => {
    setRejectingReq(req);
    setRejectComment('');
    setRejectError('');
  };

  const handleRejectSubmit = (e) => {
    e.preventDefault();
    setRejectError('');
    if (!rejectComment.trim()) {
      setRejectError('A review comment is mandatory when rejecting a requisition.');
      return;
    }

    try {
      rejectRequisition(rejectingReq.id, rejectComment);
      setRejectingReq(null);
    } catch (err) {
      setRejectError(err.message);
    }
  };

  const handleOpenApproveModal = (req) => {
    setApprovingReq(req);
    setApproveComment('Approved for supply dispatch.');
  };

  const handleApproveSubmit = (e) => {
    e.preventDefault();
    try {
      approveRequisition(approvingReq.id, approveComment);
      setApprovingReq(null);
    } catch (err) {
      alert(err.message);
    }
  };

  const handleFulfilClick = (req) => {
    if (window.confirm(`Confirm receipt and fulfillment of requisition ${req.id}?\n\nThis will add ${req.quantity} ${req.unit} of ${req.itemName} to ${req.depotName} stock on hand.`)) {
      try {
        fulfilRequisition(req.id);
      } catch (err) {
        alert(err.message);
      }
    }
  };

  // Filtered requisitions list
  const filteredRequisitions = useMemo(() => {
    return requisitions.filter((r) => {
      // Role scope: Store Officer sees only their depot
      if (isStoreOfficer && r.depotId !== currentUser.depotId) {
        return false;
      }
      // Depot filter (for Commander / Admin)
      if (!isStoreOfficer && depotFilter !== 'all' && r.depotId !== depotFilter) {
        return false;
      }
      // Status filter dropdown
      if (statusFilter !== 'all' && r.status !== statusFilter) {
        return false;
      }

      return true;
    });
  }, [
    requisitions,
    isStoreOfficer,
    currentUser,
    depotFilter,
    statusFilter
  ]);

  // Kanban Column Buckets
  const kanbanColumns = useMemo(() => {
    return [
      {
        id: 'Pending',
        title: 'PENDING APPROVAL',
        color: 'var(--amber)',
        items: filteredRequisitions.filter((r) => r.status === 'Pending')
      },
      {
        id: 'Approved',
        title: 'APPROVED FOR DISPATCH',
        color: 'var(--steel)',
        items: filteredRequisitions.filter((r) => r.status === 'Approved')
      },
      {
        id: 'Fulfilled',
        title: 'FULFILLED & RESTOCKED',
        color: 'var(--sage)',
        items: filteredRequisitions.filter((r) => r.status === 'Fulfilled')
      },
      {
        id: 'Rejected',
        title: 'REJECTED / CLOSED',
        color: 'var(--brick)',
        items: filteredRequisitions.filter((r) => r.status === 'Rejected')
      }
    ];
  }, [filteredRequisitions]);

  // Counts for KPIs
  const pendingCount = requisitions.filter((r) => r.status === 'Pending').length;
  const approvedCount = requisitions.filter((r) => r.status === 'Approved').length;
  const fulfilledCount = requisitions.filter((r) => r.status === 'Fulfilled').length;
  const totalCount = requisitions.length;

  const viewOptions = [
    { value: 'kanban', label: 'KANBAN BOARD' },
    { value: 'table', label: 'LIST TABLE' }
  ];

  return (
    <div className="requisitions-page fade-in-section">
      {/* Dispatch Document Hero Banner */}
      <PageHero
        theme="requisitions"
        sectorCode={isStoreOfficer && currentUser?.depotId ? currentUser.depotId.toUpperCase() : 'HQ-INDENTS'}
        title="PROCUREMENT REQUISITIONS & INDENT DISPATCH"
        tagline="Multi-echelon indent authorization pipeline: store officer submission, commander review, and depot fulfillment."
        icon={ClipboardList}
        badge={isCommander ? 'COMMANDER REVIEW ACCESS' : isStoreOfficer ? `${currentUser.depotName} DEPOT` : 'LEDGER VIEW'}
      >
        {isStoreOfficer && (
          <div style={{ marginTop: '12px' }}>
            <button
              type="button"
              onClick={handleOpenCreateModal}
              className="hero-btn hero-btn-primary military-lift"
            >
              <PlusCircle size={15} />
              <span>Raise New Indent Requisition</span>
            </button>
          </div>
        )}
      </PageHero>

      <div className="page-container hero-overlap-content">
        {/* Row of 4 KPI Tiles */}
        <div className="console-kpi-row" style={{ marginBottom: '22px' }}>
          <KpiTile
            label="PENDING AUTHORIZATION"
            value={pendingCount}
            hint="Awaiting Commander validation"
            variant="amber"
          />

          <KpiTile
            label="APPROVED IN-TRANSIT"
            value={approvedCount}
            hint="Dispatching to forward depot"
            variant="steel"
          />

          <KpiTile
            label="FULFILLED THIS CYCLE"
            value={fulfilledCount}
            hint="Successfully received into stock"
            variant="sage"
          />

          <KpiTile
            label="TOTAL REQUISITION PIPELINE"
            value={totalCount}
            hint="All logged indent records"
            variant="sand"
          />
        </div>

        {/* Filter and Action Bar */}
        <div className="filter-card card-bracket" style={{ marginBottom: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px' }}>
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
              <Filter size={14} className="text-sand" />
              {!isStoreOfficer && (
                <div style={{ minWidth: '180px' }}>
                  <select
                    id="req-depot-filter"
                    value={depotFilter}
                    onChange={(e) => setDepotFilter(e.target.value)}
                    className="form-select"
                    style={{ height: '36px', fontSize: '12px' }}
                  >
                    <option value="all">All depots</option>
                    {DEPOTS.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.shortName} ({d.service})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div style={{ minWidth: '160px' }}>
                <select
                  id="req-status-filter"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="form-select"
                  style={{ height: '36px', fontSize: '12px' }}
                >
                  <option value="all">All statuses</option>
                  <option value="Pending">Pending</option>
                  <option value="Approved">Approved</option>
                  <option value="Fulfilled">Fulfilled</option>
                  <option value="Rejected">Rejected</option>
                </select>
              </div>

              {isStoreOfficer && (
                <button
                  type="button"
                  onClick={handleOpenCreateModal}
                  className="btn-primary-olive"
                  style={{ height: '36px', padding: '0 14px', fontSize: '12px' }}
                >
                  <PlusCircle size={14} />
                  <span>Raise Indent</span>
                </button>
              )}
            </div>

            {/* View Mode Toggle */}
            <div>
              <SegmentedControl
                options={viewOptions}
                value={viewMode}
                onChange={setViewMode}
              />
            </div>
          </div>
        </div>

        {/* View Mode 1: Kanban Board */}
        {viewMode === 'kanban' && (
          <div className="kanban-board">
            {kanbanColumns.map((col) => (
              <div key={col.id} className="kanban-column">
                <div className="kanban-column-header">
                  <div className="kanban-column-title">
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: col.color }} />
                    <span>{col.title}</span>
                  </div>
                  <span className="kanban-column-count">{col.items.length}</span>
                </div>

                <div className="kanban-column-cards">
                  {col.items.length === 0 ? (
                    <div style={{ padding: '24px 12px', textAlign: 'center', color: 'var(--muted)', fontSize: '11px' }}>
                      No indents in this stage
                    </div>
                  ) : (
                    col.items.map((req) => {
                      const priorityColor =
                        req.priority === 'Critical'
                          ? 'var(--brick)'
                          : req.priority === 'Urgent'
                          ? 'var(--amber)'
                          : 'var(--sage)';

                      return (
                        <div key={req.id} className="kanban-card">
                          <div className="kanban-card-head">
                            <span className="kanban-card-id">{req.id}</span>
                            <span
                              className="font-mono"
                              style={{
                                fontSize: '10px',
                                padding: '1px 6px',
                                borderRadius: '2px',
                                border: `1px solid ${priorityColor}`,
                                color: priorityColor
                              }}
                            >
                              {req.priority.toUpperCase()}
                            </span>
                          </div>

                          <div className="kanban-card-item">{req.itemName}</div>

                          <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--sand)', fontFamily: 'var(--font-mono)' }}>
                            {req.quantity.toLocaleString()} <span style={{ fontSize: '11px', color: 'var(--muted)' }}>{req.unit}</span>
                          </div>

                          <div className="kanban-card-meta">
                            <span>{req.depotName}</span>
                            <span>{req.createdAtFormatted || 'Recent'}</span>
                          </div>

                          <div className="text-muted font-mono" style={{ fontSize: '10px' }}>
                            By: {req.createdBy}
                          </div>

                          {req.commanderComment && (
                            <div style={{ fontSize: '11px', background: 'rgba(0,0,0,0.2)', padding: '6px 8px', borderRadius: '3px', borderLeft: '2px solid var(--sand)', color: 'var(--text)' }}>
                              "{req.commanderComment}"
                            </div>
                          )}

                          {/* Quick Card Actions */}
                          {isCommander && req.status === 'Pending' && (
                            <div className="kanban-card-actions">
                              <button
                                type="button"
                                onClick={() => handleOpenApproveModal(req)}
                                className="btn-action-primary"
                                style={{ flex: 1, padding: '4px', fontSize: '11px', justifyContent: 'center' }}
                              >
                                <Check size={12} /> Approve
                              </button>
                              <button
                                type="button"
                                onClick={() => handleOpenRejectModal(req)}
                                className="btn-action-warning"
                                style={{ flex: 1, padding: '4px', fontSize: '11px', justifyContent: 'center' }}
                              >
                                <X size={12} /> Reject
                              </button>
                            </div>
                          )}

                          {isStoreOfficer &&
                            req.depotId === currentUser.depotId &&
                            req.status === 'Approved' && (
                              <div className="kanban-card-actions">
                                <button
                                  type="button"
                                  onClick={() => handleFulfilClick(req)}
                                  className="btn-action-success"
                                  style={{ width: '100%', padding: '4px', fontSize: '11px', justifyContent: 'center' }}
                                >
                                  <PackageCheck size={12} /> Mark Fulfilled
                                </button>
                              </div>
                            )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* View Mode 2: List Table */}
        {viewMode === 'table' && (
          <Panel title="PROCUREMENT REQUISITIONS LEDGER" subtitle={`Showing ${filteredRequisitions.length} of ${requisitions.length} indents`} badge="INDENTS">
            <div className="table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Req ID</th>
                    <th>Depot</th>
                    <th>Commodity</th>
                    <th>Quantity</th>
                    <th>Priority</th>
                    <th>Submitted By</th>
                    <th>Date</th>
                    <th>Status</th>
                    <th>Commander Remarks</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRequisitions.length === 0 ? (
                    <tr>
                      <td colSpan="10" style={{ textAlign: 'center', padding: '36px', color: 'var(--text-muted)' }}>
                        No requisitions match the selected filters.
                      </td>
                    </tr>
                  ) : (
                    filteredRequisitions.map((req) => (
                      <tr key={req.id}>
                        <td className="font-mono text-sand" style={{ fontWeight: 700 }}>{req.id}</td>
                        <td>
                          <span className={`branch-badge branch-${(DEPOT_MAP[req.depotId]?.service || 'Joint').toLowerCase().replace(' ', '')}`}>
                            {req.depotName}
                          </span>
                        </td>
                        <td>
                          <div style={{ fontWeight: 600, color: 'var(--text)' }}>{req.itemName}</div>
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{req.category}</div>
                        </td>
                        <td className="font-mono font-semibold">
                          {req.quantity.toLocaleString()} {req.unit}
                        </td>
                        <td>
                          <span className={`priority-tag priority-${req.priority.toLowerCase()}`}>
                            {req.priority}
                          </span>
                        </td>
                        <td>
                          <div style={{ fontWeight: 600, color: 'var(--text)' }}>{req.createdBy}</div>
                          <div className="font-mono text-muted" style={{ fontSize: '10px' }}>@{req.createdByUsername}</div>
                        </td>
                        <td className="font-mono text-muted" style={{ fontSize: '11px' }}>
                          {req.createdAtFormatted}
                        </td>
                        <td>
                          <StatusChip status={req.status} />
                        </td>
                        <td>
                          {req.commanderComment ? (
                            <div style={{ fontSize: '11px' }}>
                              <span style={{ color: 'var(--text)' }}>"{req.commanderComment}"</span>
                              <div className="text-muted font-mono" style={{ fontSize: '10px' }}>— {req.reviewedBy}</div>
                            </div>
                          ) : (
                            <span className="text-muted font-mono" style={{ fontSize: '11px' }}>Pending</span>
                          )}
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: '6px' }}>
                            {isCommander && req.status === 'Pending' && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => handleOpenApproveModal(req)}
                                  className="btn-action-primary"
                                  style={{ padding: '3px 8px', fontSize: '11px' }}
                                >
                                  <CheckCircle2 size={12} /> Approve
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleOpenRejectModal(req)}
                                  className="btn-action-warning"
                                  style={{ padding: '3px 8px', fontSize: '11px' }}
                                >
                                  <XCircle size={12} /> Reject
                                </button>
                              </>
                            )}

                            {isStoreOfficer &&
                              req.depotId === currentUser.depotId &&
                              req.status === 'Approved' && (
                                <button
                                  type="button"
                                  onClick={() => handleFulfilClick(req)}
                                  className="btn-action-success"
                                  style={{ padding: '3px 8px', fontSize: '11px' }}
                                >
                                  <PackageCheck size={12} /> Fulfil
                                </button>
                              )}

                            {req.status === 'Fulfilled' && (
                              <span className="text-muted font-mono" style={{ fontSize: '11px' }}>Fulfilled</span>
                            )}
                            {req.status === 'Rejected' && (
                              <span className="font-mono" style={{ fontSize: '11px', color: 'var(--brick)' }}>Closed</span>
                            )}
                            {isAdmin && req.status === 'Pending' && (
                              <span className="text-muted font-mono" style={{ fontSize: '10px' }}>Read-only</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Panel>
        )}
      </div>

      {/* Modal 1: New Requisition Form (Store Officer) */}
      {isCreateModalOpen && (
        <div className="modal-backdrop" onClick={() => setIsCreateModalOpen(false)}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ClipboardList size={18} className="text-sand" />
                <h3 className="modal-title font-mono">SUBMIT PROCUREMENT INDENT</h3>
              </div>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setIsCreateModalOpen(false)}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit}>
              <div className="modal-body">
                {createError && (
                  <div className="error-banner">
                    <AlertCircle size={16} />
                    <span>{createError}</span>
                  </div>
                )}

                <Field label="STATIONED DEPOT">
                  <div className="font-mono" style={{ padding: '8px 12px', background: 'var(--surface-2)', borderRadius: '3px', border: '1px solid var(--border)', fontSize: '12px', color: 'var(--text)' }}>
                    <strong>{currentUser.depotName}</strong> ({currentUser.service})
                  </div>
                </Field>

                <Field label="SUPPLY COMMODITY">
                  <select
                    id="new-req-item"
                    value={reqItemId}
                    onChange={(e) => handleItemSelectChange(e.target.value)}
                    className="form-select"
                    required
                  >
                    {depotItems.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name} ({item.unit})
                      </option>
                    ))}
                  </select>
                </Field>

                <Field
                  label="REQUISITION QUANTITY"
                  help="Formula suggested: (Reorder level + 4 x average weekly demand) - Current stock"
                >
                  <input
                    id="new-req-qty"
                    type="number"
                    min="1"
                    className="form-input font-mono"
                    value={reqQuantity}
                    onChange={(e) => setReqQuantity(e.target.value)}
                    required
                  />
                </Field>

                <Field label="OPERATIONAL PRIORITY">
                  <select
                    id="new-req-priority"
                    value={reqPriority}
                    onChange={(e) => setReqPriority(e.target.value)}
                    className="form-select"
                  >
                    <option value="Routine">Routine replenishment</option>
                    <option value="Urgent">Urgent operational need</option>
                    <option value="Critical">Critical readiness deficit</option>
                  </select>
                </Field>

                <Field label="JUSTIFICATION / REASON (OPTIONAL)">
                  <textarea
                    id="new-req-justification"
                    rows={2}
                    className="form-textarea"
                    placeholder="Provide operational justification, seasonal peak context, or field exercise requirements..."
                    value={reqJustification}
                    onChange={(e) => setReqJustification(e.target.value)}
                  />
                </Field>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setIsCreateModalOpen(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary-olive">
                  Submit Indent
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: Commander Reject Requisition */}
      {rejectingReq && (
        <div className="modal-backdrop" onClick={() => setRejectingReq(null)}>
          <div className="modal-dialog modal-sm" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <XCircle size={18} className="text-brick" />
                <h3 className="modal-title font-mono">REJECT INDENT ({rejectingReq.id})</h3>
              </div>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setRejectingReq(null)}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleRejectSubmit}>
              <div className="modal-body">
                {rejectError && (
                  <div className="error-banner">
                    <AlertCircle size={16} />
                    <span>{rejectError}</span>
                  </div>
                )}

                <div style={{ fontSize: '12px', color: 'var(--text)', marginBottom: '10px' }}>
                  Rejecting indent for <strong>{rejectingReq.quantity} {rejectingReq.unit}</strong> of{' '}
                  <strong>{rejectingReq.itemName}</strong> from {rejectingReq.depotName}.
                </div>

                <Field label="REJECTION REASON (MANDATORY)">
                  <textarea
                    rows={3}
                    className="form-textarea"
                    placeholder="Provide review reasoning for the store officer..."
                    value={rejectComment}
                    onChange={(e) => setRejectComment(e.target.value)}
                    required
                  />
                </Field>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setRejectingReq(null)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn-danger-red">
                  Confirm Rejection
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 3: Commander Approve Requisition */}
      {approvingReq && (
        <div className="modal-backdrop" onClick={() => setApprovingReq(null)}>
          <div className="modal-dialog modal-sm" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ShieldCheck size={18} className="text-sand" />
                <h3 className="modal-title font-mono">AUTHORIZE INDENT ({approvingReq.id})</h3>
              </div>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setApprovingReq(null)}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleApproveSubmit}>
              <div className="modal-body">
                <div style={{ fontSize: '12px', color: 'var(--text)', marginBottom: '10px' }}>
                  Authorizing indent for <strong>{approvingReq.quantity} {approvingReq.unit}</strong> of{' '}
                  <strong>{approvingReq.itemName}</strong> for {approvingReq.depotName}.
                </div>

                <Field label="DISPATCH REMARKS">
                  <input
                    type="text"
                    className="form-input"
                    value={approveComment}
                    onChange={(e) => setApproveComment(e.target.value)}
                  />
                </Field>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setApprovingReq(null)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary-olive">
                  Authorize Indent
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
