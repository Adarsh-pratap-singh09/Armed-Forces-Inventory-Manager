import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useInventory } from '../context/InventoryContext.jsx';
import { useVehicles } from '../context/VehicleContext.jsx';
import PageHero from '../components/PageHero.jsx';
import {
  Panel,
  RadialGauge,
  Sparkline,
  StatusChip,
  Field
} from '../components/ui/index.js';
import {
  DEPOTS,
  DEPOT_MAP,
  ITEMS,
  ITEM_MAP,
  CATEGORIES,
  SIMULATED_DATA
} from '../data/index.js';
import {
  Boxes,
  Plus,
  RotateCcw,
  Search,
  ArrowUpDown,
  Edit2,
  Trash2,
  Activity,
  TrendingUp,
  X,
  AlertOctagon,
  ChevronRight,
  ShieldCheck
} from 'lucide-react';

export default function Inventory() {
  const { currentUser, isStoreOfficer, isAdmin } = useAuth();
  const {
    stockLines,
    addStockLine,
    updateStockLine,
    deleteStockLine,
    resetToSampleData
  } = useInventory();
  const { resetVehiclesToSampleData } = useVehicles();

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [depotFilter, setDepotFilter] = useState(isStoreOfficer ? currentUser?.depotId : 'all');
  const activeDepotFilter = isStoreOfficer && currentUser?.depotId ? currentUser.depotId : depotFilter;
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortOrder, setSortOrder] = useState('asc'); // 'asc' = lowest weeks of cover first

  // Master-Detail selection
  const [selectedLineId, setSelectedLineId] = useState(null);

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingLine, setEditingLine] = useState(null);
  const [deleteConfirmLine, setDeleteConfirmLine] = useState(null);

  // Add Line Form State
  const initialAddDepot = isStoreOfficer ? currentUser.depotId : 'leh';
  const [addDepotId, setAddDepotId] = useState(initialAddDepot);
  const [addItemId, setAddItemId] = useState('');
  const [addQuantity, setAddQuantity] = useState('100');
  const [addReorderLevel, setAddReorderLevel] = useState('120');
  const [addError, setAddError] = useState('');

  // Edit Line Form State
  const [editQuantity, setEditQuantity] = useState('');
  const [editReorderLevel, setEditReorderLevel] = useState('');
  const [editError, setEditError] = useState('');

  // Available unstocked items for chosen depot in Add modal
  const availableUnstockedItems = useMemo(() => {
    return ITEMS.filter(
      (item) => !stockLines.some((line) => line.depotId === addDepotId && line.itemId === item.id)
    );
  }, [stockLines, addDepotId]);

  const prefillAddReorderLevel = (depotId, itemId) => {
    const depot = DEPOT_MAP[depotId];
    const item = ITEM_MAP[itemId];
    if (!depot || !item) return;

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
    const calculatedROP = Math.round(avgDemand * depot.leadTimeWeeks + safetyStock);
    setAddReorderLevel(String(calculatedROP));
    setAddQuantity(String(Math.round(calculatedROP * 1.25)));
  };

  const handleAddDepotChange = (newDepotId) => {
    setAddDepotId(newDepotId);
    setAddError('');
    const unstocked = ITEMS.filter(
      (item) => !stockLines.some((line) => line.depotId === newDepotId && line.itemId === item.id)
    );
    if (unstocked.length > 0) {
      const firstItem = unstocked[0];
      setAddItemId(firstItem.id);
      prefillAddReorderLevel(newDepotId, firstItem.id);
    } else {
      setAddItemId('');
    }
  };

  const handleAddItemChange = (newItemId) => {
    setAddItemId(newItemId);
    setAddError('');
    prefillAddReorderLevel(addDepotId, newItemId);
  };

  // Filtered and Sorted Lines
  const filteredLines = useMemo(() => {
    return stockLines
      .filter((line) => {
        if (activeDepotFilter !== 'all' && line.depotId !== activeDepotFilter) return false;
        if (categoryFilter !== 'all' && line.category !== categoryFilter) return false;
        if (statusFilter !== 'all' && line.status !== statusFilter) return false;
        if (searchQuery.trim() !== '') {
          const q = searchQuery.toLowerCase();
          const matchName = line.itemName.toLowerCase().includes(q);
          const matchDepot = line.depotName.toLowerCase().includes(q);
          const matchCat = line.category.toLowerCase().includes(q);
          if (!matchName && !matchDepot && !matchCat) return false;
        }
        return true;
      })
      .sort((a, b) => {
        if (sortOrder === 'asc') return a.weeksOfCover - b.weeksOfCover;
        return b.weeksOfCover - a.weeksOfCover;
      });
  }, [stockLines, activeDepotFilter, categoryFilter, statusFilter, searchQuery, sortOrder]);

  // Active selected line for master-detail (defaults to first filtered line)
  const selectedLine = useMemo(() => {
    if (!filteredLines || filteredLines.length === 0) return null;
    const found = filteredLines.find((l) => l.id === selectedLineId);
    return found || filteredLines[0];
  }, [filteredLines, selectedLineId]);

  // 26-week demand history for selected line sparkline
  const selectedDemandHistory = useMemo(() => {
    if (!selectedLine) return [];
    const rec = SIMULATED_DATA[selectedLine.depotId]?.[selectedLine.itemId];
    if (rec && Array.isArray(rec.weeklyDemand)) {
      return rec.weeklyDemand.slice(-26).map((d) => d.demand);
    }
    return [];
  }, [selectedLine]);

  // Add line submission
  const handleAddSubmit = (e) => {
    e.preventDefault();
    setAddError('');
    try {
      addStockLine({
        depotId: addDepotId,
        itemId: addItemId,
        quantity: parseInt(addQuantity, 10),
        reorderLevel: parseInt(addReorderLevel, 10)
      });
      setIsAddModalOpen(false);
    } catch (err) {
      setAddError(err.message);
    }
  };

  // Open Edit Modal
  const openEditModal = (line) => {
    setEditingLine(line);
    setEditQuantity(String(line.quantity));
    setEditReorderLevel(String(line.reorderLevel));
    setEditError('');
  };

  // Edit Line Submission
  const handleEditSubmit = (e) => {
    e.preventDefault();
    setEditError('');
    try {
      updateStockLine(editingLine.id, {
        quantity: parseInt(editQuantity, 10),
        reorderLevel: parseInt(editReorderLevel, 10)
      });
      setEditingLine(null);
    } catch (err) {
      setEditError(err.message);
    }
  };

  // Delete line
  const handleDeleteConfirm = () => {
    if (!deleteConfirmLine) return;
    try {
      deleteStockLine(deleteConfirmLine.id);
      setDeleteConfirmLine(null);
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div className="inventory-page fade-in-section">
      <PageHero
        theme="inventory"
        sectorCode={isStoreOfficer && currentUser?.depotId ? currentUser.depotId.toUpperCase() : 'THEATRE-LEDGER'}
        title={isStoreOfficer && currentUser?.depotName
          ? `CONTINUOUS-REVIEW INVENTORY // ${currentUser.depotName.toUpperCase()}`
          : 'CONTINUOUS-REVIEW INVENTORY LEDGER'}
        tagline="Real-time stock on hand, statistical safety thresholds, and replenishment runway across active theatre depots."
        icon={Boxes}
        badge={isStoreOfficer ? `${currentUser.depotName} DEPOT` : 'MULTI-ECHELON'}
      />

      <div className="page-container hero-overlap-content">
        {/* Compact Filter & Action Toolbar */}
        <div className="inventory-toolbar-card card-bracket">
          <div className="toolbar-search-group">
            <Search size={15} className="toolbar-search-icon text-muted" />
            <input
              type="text"
              placeholder="Search commodity or depot..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="toolbar-search-input font-mono"
            />
          </div>

          <div className="toolbar-filters-row">
            {!isStoreOfficer && (
              <select
                value={depotFilter}
                onChange={(e) => setDepotFilter(e.target.value)}
                className="filter-select font-mono"
              >
                <option value="all">All Depots (8)</option>
                {DEPOTS.map((d) => (
                  <option key={d.id} value={d.id}>{d.shortName} ({d.service})</option>
                ))}
              </select>
            )}

            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="filter-select font-mono"
            >
              <option value="all">All Categories</option>
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="filter-select font-mono"
            >
              <option value="all">All Statuses</option>
              <option value="Healthy">Healthy</option>
              <option value="Reorder needed">Reorder needed</option>
              <option value="Critical low">Critical low</option>
            </select>

            <button
              type="button"
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              className="filter-btn font-mono"
              title="Toggle Cover Sorting"
            >
              <ArrowUpDown size={13} />
              <span>Sort by weeks of cover ({sortOrder.toUpperCase()})</span>
            </button>

            {isStoreOfficer && (
              <button
                type="button"
                onClick={() => {
                  setAddDepotId(currentUser.depotId);
                  const unstocked = ITEMS.filter(
                    (item) => !stockLines.some((line) => line.depotId === currentUser.depotId && line.itemId === item.id)
                  );
                  if (unstocked.length > 0) {
                    setAddItemId(unstocked[0].id);
                    prefillAddReorderLevel(currentUser.depotId, unstocked[0].id);
                  }
                  setIsAddModalOpen(true);
                }}
                className="hero-btn-primary font-mono military-lift"
                style={{ padding: '6px 14px', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <Plus size={14} />
                <span>Add Stock Line</span>
              </button>
            )}

            {isAdmin && (
              <button
                type="button"
                onClick={() => {
                  if (window.confirm('Reset all inventory and vehicles back to default synthetic sample state?')) {
                    resetToSampleData();
                    resetVehiclesToSampleData();
                  }
                }}
                className="filter-btn font-mono"
                title="Reset sample state"
              >
                <RotateCcw size={13} />
                <span>Reset</span>
              </button>
            )}
          </div>
        </div>

        {/* Master-Detail Grid */}
        <div className="inventory-master-detail-grid" style={{ marginTop: '18px' }}>
          {/* Master Table on Left */}
          <div className="inventory-master-col">
            <div className="table-card">
              <div className="table-responsive">
                <table className="clean-table">
                  <thead>
                    <tr>
                      <th>Depot</th>
                      <th>Commodity</th>
                      <th>Category</th>
                      <th style={{ textAlign: 'right' }}>Stock on Hand</th>
                      <th style={{ textAlign: 'right' }}>Reorder Level</th>
                      <th style={{ textAlign: 'right' }}>Cover</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredLines.length === 0 ? (
                      <tr>
                        <td colSpan="7" className="empty-table-cell font-mono">
                          No matching stock lines found.
                        </td>
                      </tr>
                    ) : (
                      filteredLines.map((line) => {
                        const isSelected = selectedLine?.id === line.id;
                        return (
                          <tr
                            key={line.id}
                            onClick={() => setSelectedLineId(line.id)}
                            className={`inventory-row-clickable ${isSelected ? 'row-selected-active' : ''}`}
                          >
                            <td>
                              <span className={`branch-depot-badge branch-${line.service.toLowerCase().replace(' ', '')} font-mono`}>
                                {line.depotShortName}
                              </span>
                            </td>
                            <td>
                              <div className="font-semibold text-dark">{line.itemName}</div>
                              <span className="text-muted font-mono" style={{ fontSize: '10px' }}>{line.unit}</span>
                            </td>
                            <td>
                              <span className="table-category-tag font-mono">{line.category}</span>
                            </td>
                            <td className="font-mono" style={{ textAlign: 'right', fontWeight: '700' }}>
                              {line.quantity.toLocaleString()}
                            </td>
                            <td className="font-mono text-muted" style={{ textAlign: 'right' }}>
                              {line.reorderLevel.toLocaleString()}
                            </td>
                            <td className="font-mono" style={{ textAlign: 'right', fontWeight: '700' }}>
                              <span className={line.weeksOfCover < line.leadTimeWeeks ? 'text-brick' : 'text-sand'}>
                                {line.weeksOfCover}w
                              </span>
                            </td>
                            <td>
                              <StatusChip status={line.status} />
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
              <div className="table-footer-count font-mono">
                Showing {filteredLines.length} of {stockLines.length} active lines
              </div>
            </div>
          </div>

          {/* Detail Panel on Right */}
          <div className="inventory-detail-col">
            {selectedLine ? (
              <Panel
                title="COMMODITY PROFILE & TELEMETRY"
                icon={Boxes}
                badge={selectedLine.depotShortName.toUpperCase()}
                className="inventory-detail-panel"
              >
                <div className="detail-panel-content">
                  <div className="detail-title-block">
                    <span className="table-category-tag font-mono">{selectedLine.category}</span>
                    <h3 className="detail-item-name">{selectedLine.itemName}</h3>
                    <div className="detail-depot-sub font-mono">
                      {selectedLine.depotName} ({selectedLine.service}) • LT: {selectedLine.leadTimeWeeks}w
                    </div>
                  </div>

                  {/* Stock vs Reorder Radial Gauge */}
                  <div className="detail-gauge-box">
                    <RadialGauge
                      value={selectedLine.quantity}
                      max={Math.max(selectedLine.reorderLevel * 1.6, selectedLine.quantity)}
                      size={120}
                      label="STOCK RUNWAY"
                      sublabel={`${selectedLine.quantity.toLocaleString()} ${selectedLine.unit}`}
                      showPercentage={false}
                    />
                    <div className="gauge-legend-col font-mono">
                      <div className="gauge-stat-item">
                        <span className="stat-lbl">CURRENT STOCK:</span>
                        <span className="stat-val text-sand">{selectedLine.quantity.toLocaleString()} {selectedLine.unit}</span>
                      </div>
                      <div className="gauge-stat-item">
                        <span className="stat-lbl">REORDER POINT:</span>
                        <span className="stat-val">{selectedLine.reorderLevel.toLocaleString()} {selectedLine.unit}</span>
                      </div>
                      <div className="gauge-stat-item">
                        <span className="stat-lbl">STATUS:</span>
                        <StatusChip status={selectedLine.status} />
                      </div>
                    </div>
                  </div>

                  {/* 26-Week Demand History Sparkline */}
                  <div className="detail-sparkline-box">
                    <div className="sparkline-header font-mono">
                      <span>RECENT 26-WEEK DEMAND TREND</span>
                      <span className="text-muted">Avg: {selectedLine.avgWeeklyDemand} / wk</span>
                    </div>
                    {selectedDemandHistory.length > 0 ? (
                      <div className="sparkline-container">
                        <Sparkline data={selectedDemandHistory} height={36} color="var(--sage)" />
                      </div>
                    ) : (
                      <div className="text-muted font-mono text-xs">Simulated series loading...</div>
                    )}
                  </div>

                  {/* Technical Specs */}
                  <div className="detail-specs-grid font-mono">
                    <div className="spec-card">
                      <span className="spec-label">SAFETY STOCK</span>
                      <span className="spec-val">{selectedLine.safetyStock?.toLocaleString() || 0}</span>
                    </div>
                    <div className="spec-card">
                      <span className="spec-label">WEEKS OF COVER</span>
                      <span className={`spec-val ${selectedLine.weeksOfCover < selectedLine.leadTimeWeeks ? 'text-brick' : 'text-sand'}`}>
                        {selectedLine.weeksOfCover} Weeks
                      </span>
                    </div>
                    <div className="spec-card">
                      <span className="spec-label">LEAD TIME</span>
                      <span className="spec-val">{selectedLine.leadTimeWeeks} Weeks</span>
                    </div>
                    <div className="spec-card">
                      <span className="spec-label">STD DEV (σ)</span>
                      <span className="spec-val">±{selectedLine.stdDevWeeklyDemand || '0'}</span>
                    </div>
                  </div>

                  {/* Operational Actions */}
                  <div className="detail-actions-box">
                    {isStoreOfficer && selectedLine.depotId === currentUser?.depotId ? (
                      <div className="officer-actions-row">
                        <button
                          type="button"
                          onClick={() => openEditModal(selectedLine)}
                          className="btn-edit-stock font-mono military-lift"
                        >
                          <Edit2 size={13} />
                          <span>Update Levels</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteConfirmLine(selectedLine)}
                          className="btn-delete-stock font-mono military-lift"
                        >
                          <Trash2 size={13} />
                          <span>Delete Line</span>
                        </button>
                      </div>
                    ) : (
                      <div className="detail-readonly-notice font-mono">
                        <ShieldCheck size={14} className="text-muted" />
                        <span>Command Ledger View (Read-Only)</span>
                      </div>
                    )}

                    <div className="detail-nav-links font-mono">
                      <Link
                        to={`/forecast?depot=${selectedLine.depotId}&item=${selectedLine.itemId}`}
                        className="detail-nav-btn"
                      >
                        <Activity size={13} />
                        <span>Forecast Stock-Out</span>
                        <ChevronRight size={13} />
                      </Link>
                      <Link
                        to={`/demand?depot=${selectedLine.depotId}&item=${selectedLine.itemId}`}
                        className="detail-nav-btn"
                      >
                        <TrendingUp size={13} />
                        <span>Explore 104w Series</span>
                        <ChevronRight size={13} />
                      </Link>
                    </div>
                  </div>
                </div>
              </Panel>
            ) : (
              <Panel title="COMMODITY PROFILE" className="inventory-detail-panel">
                <div className="empty-detail-state font-mono">Select a stock line to view telemetry</div>
              </Panel>
            )}
          </div>
        </div>
      </div>

      {/* Add Stock Line Modal */}
      {isAddModalOpen && (
        <div className="modal-backdrop-blur" onClick={() => setIsAddModalOpen(false)}>
          <div className="login-modal-card military-chamfer" onClick={(e) => e.stopPropagation()}>
            <div className="login-modal-header">
              <span className="panel-title font-mono">NEW STOCK LINE INDENT</span>
              <button type="button" onClick={() => setIsAddModalOpen(false)} className="modal-close-btn">
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleAddSubmit} className="login-modal-body">
              {addError && <div className="login-error-alert font-mono">{addError}</div>}
              <Field label="Depot Node" htmlFor="add-depot">
                <select
                  id="add-depot"
                  value={addDepotId}
                  onChange={(e) => handleAddDepotChange(e.target.value)}
                  disabled={isStoreOfficer}
                  className="form-select font-mono"
                >
                  {DEPOTS.map((d) => (
                    <option key={d.id} value={d.id}>{d.name} ({d.service})</option>
                  ))}
                </select>
              </Field>

              <Field label="Supply Commodity" htmlFor="add-item" style={{ marginTop: '12px' }}>
                <select
                  id="add-item"
                  value={addItemId}
                  onChange={(e) => handleAddItemChange(e.target.value)}
                  className="form-select font-mono"
                  required
                >
                  {availableUnstockedItems.map((item) => (
                    <option key={item.id} value={item.id}>{item.name} ({item.unit})</option>
                  ))}
                </select>
              </Field>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '12px' }}>
                <Field label="Initial Stock" htmlFor="add-qty">
                  <input
                    id="add-qty"
                    type="number"
                    min="0"
                    value={addQuantity}
                    onChange={(e) => setAddQuantity(e.target.value)}
                    className="form-input font-mono"
                    required
                  />
                </Field>
                <Field label="Reorder Level (ROP)" htmlFor="add-rop">
                  <input
                    id="add-rop"
                    type="number"
                    min="1"
                    value={addReorderLevel}
                    onChange={(e) => setAddReorderLevel(e.target.value)}
                    className="form-input font-mono"
                    required
                  />
                </Field>
              </div>

              <button type="submit" className="login-submit-btn font-mono military-lift" style={{ marginTop: '18px' }}>
                Confirm Stock Line
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Edit Stock Line Modal */}
      {editingLine && (
        <div className="modal-backdrop-blur" onClick={() => setEditingLine(null)}>
          <div className="login-modal-card military-chamfer" onClick={(e) => e.stopPropagation()}>
            <div className="login-modal-header">
              <span className="panel-title font-mono">UPDATE STOCK // {editingLine.itemName.toUpperCase()}</span>
              <button type="button" onClick={() => setEditingLine(null)} className="modal-close-btn">
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleEditSubmit} className="login-modal-body">
              {editError && <div className="login-error-alert font-mono">{editError}</div>}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <Field label="Current Stock On Hand" htmlFor="edit-qty">
                  <input
                    id="edit-qty"
                    type="number"
                    min="0"
                    value={editQuantity}
                    onChange={(e) => setEditQuantity(e.target.value)}
                    className="form-input font-mono"
                    required
                  />
                </Field>
                <Field label="Reorder Level (ROP)" htmlFor="edit-rop">
                  <input
                    id="edit-rop"
                    type="number"
                    min="1"
                    value={editReorderLevel}
                    onChange={(e) => setEditReorderLevel(e.target.value)}
                    className="form-input font-mono"
                    required
                  />
                </Field>
              </div>
              <button type="submit" className="login-submit-btn font-mono military-lift" style={{ marginTop: '18px' }}>
                Save Updated Levels
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmLine && (
        <div className="modal-backdrop-blur" onClick={() => setDeleteConfirmLine(null)}>
          <div className="login-modal-card military-chamfer" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '440px' }}>
            <div className="login-modal-header">
              <span className="panel-title font-mono text-brick">CONFIRM DECOMMISSION</span>
              <button type="button" onClick={() => setDeleteConfirmLine(null)} className="modal-close-btn">
                <X size={16} />
              </button>
            </div>
            <div className="login-modal-body font-mono">
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '14px' }}>
                <AlertOctagon size={28} className="text-brick" />
                <p style={{ margin: 0, fontSize: '13px' }}>
                  Decommission stock line <strong>{deleteConfirmLine.itemName}</strong> at {deleteConfirmLine.depotName}?
                </p>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '18px' }}>
                <button type="button" onClick={() => setDeleteConfirmLine(null)} className="filter-btn font-mono">
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDeleteConfirm}
                  className="filter-btn font-mono"
                  style={{ backgroundColor: 'var(--brick)', color: '#fff', borderColor: 'var(--brick)' }}
                >
                  Decommission Line
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
