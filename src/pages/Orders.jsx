import React, { useState, useEffect, useCallback } from 'react';
import { Search, Plus, Edit, Trash2, CheckCircle, XCircle, ChevronDown, MoreVertical, Eye, Filter, ShoppingCart, ArrowLeft, Grid, List as ListIcon, X, Clock, UserPlus, MessageSquare, Calendar, Link as LinkIcon, Send } from 'lucide-react';
import { createPortal } from 'react-dom';
import { odooService } from '../services/odoo';
import Loader from '../components/Loader';
import '../components/Loader.css';
import SearchableSelect from '../components/SearchableSelect';
import { QuickNoteModal, QuickTaskModal } from '../components/QuickActionModals';
import './Products.css'; // Global DataTable styles
import '../CreateOrder.css'; // Use shared form styles for consistency

const Orders = ({ stateType = 'all', isTaskView = false, onNavigate }) => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [entriesPerPage, setEntriesPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [openDropdownId, setOpenDropdownId] = useState(null);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0 });
  const [isMobile, setIsMobile] = useState(() => (
    typeof window !== 'undefined' ? window.innerWidth <= 768 : false
  ));
  const [partners, setPartners] = useState([]);
  const [selectedPartnerId, setSelectedPartnerId] = useState('');
  const [catalogAnchor, setCatalogAnchor] = useState(null);
  const catalogBtnRef = React.useRef(null);
  const [showProfessional, setShowProfessional] = useState(false);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  
  // Multi-select state
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);

  // Today's task filter
  const [filterToday, setFilterToday] = useState(false);
  const [filterMyTasks, setFilterMyTasks] = useState(false);
  const [filterAssignee, setFilterAssignee] = useState('');

  // Quick Actions State
  const [quickDetailOrderId, setQuickDetailOrderId] = useState(null);
  const [quickNoteOrderId, setQuickNoteOrderId] = useState(null);
  const [quickTaskOrderId, setQuickTaskOrderId] = useState(null);
  const [users, setUsers] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const data = await odooService.getOrders(1000, 0, 'id desc', stateType);
      setOrders(data.orders || []);
    } catch {
      console.error("Fetch orders failed");
    } finally {
      setLoading(false);
    }
  }, [stateType]);


  useEffect(() => {
    fetchOrders();
    const fetchPartners = async () => {
      try {
        const data = await odooService.getMasterData();
        if (data.error) {
          console.error("Master data error:", data.error);
        } else {
          setPartners(data.partners || []);
          setUsers(data.users || []);
        }
      } catch (err) {
        console.error("Failed to fetch master data", err);
      }
    };
    fetchPartners();
  }, [fetchOrders]);

  // Today's task filter — uses ISO YYYY-MM-DD to match backend activity_date format
  const todayISO = new Date().toISOString().split('T')[0]; // e.g. "2026-04-17"

  const currentUserName = (() => {
    try {
      const session = JSON.parse(localStorage.getItem('amyLightsLoginSession'));
      return session?.user?.name || '';
    } catch { return ''; }
  })();

  const filtered = orders.filter(o => {
    if (isTaskView) {
      if (filterMyTasks && currentUserName) {
         if (!String(o.last_activity || '').includes(currentUserName)) return false;
      }
      if (filterAssignee) {
         const assigneeName = users.find(u => u.id === parseInt(filterAssignee))?.name;
         if (assigneeName && !String(o.last_activity || '').includes(assigneeName)) return false;
      }
    }

    // 1. Today's Task Filter — activity_date is YYYY-MM-DD from backend
    if (filterToday) {
      if (!o.activity_date) return false;
      if (o.activity_date !== todayISO) return false;
    }

    // 2. Date Range Filter
    if (dateFrom || dateTo) {
      if (!o.order_date) return false;
      const [day, month, year] = o.order_date.split('-').map(Number);
      const orderDate = new Date(year, month - 1, day);
      if (dateFrom) {
        const fromDate = new Date(dateFrom);
        fromDate.setHours(0,0,0,0);
        if (orderDate < fromDate) return false;
      }
      if (dateTo) {
        const toDate = new Date(dateTo);
        toDate.setHours(23,59,59,999);
        if (orderDate > toDate) return false;
      }
    }

    // 3. Search Filter
    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLowerCase();
    return (
      String(o.name || '').toLowerCase().includes(q)           ||
      String(o.customer || '').toLowerCase().includes(q)        ||
      String(o.phone || '').toLowerCase().includes(q)           ||
      String(o.salesperson || '').toLowerCase().includes(q)     ||
      String(o.architect || '').toLowerCase().includes(q)       ||
      String(o.architect_phone || '').toLowerCase().includes(q) ||
      String(o.electrician || '').toLowerCase().includes(q)     ||
      String(o.electrician_phone || '').toLowerCase().includes(q)||
      String(o.remark || '').toLowerCase().includes(q)          ||
      String(o.last_activity || '').toLowerCase().includes(q)   ||
      String(o.products || '').toLowerCase().includes(q)        ||
      String(o.creator_name || '').toLowerCase().includes(q)
    );
  });

  const totalEntries = filtered.length;
  const totalPages = Math.ceil(totalEntries / entriesPerPage);
  const indexOfLastItem = currentPage * entriesPerPage;
  const indexOfFirstItem = indexOfLastItem - entriesPerPage;
  const currentItems = filtered.slice(indexOfFirstItem, indexOfLastItem);

  // Multi-select helpers (defined AFTER currentItems)
  const allCurrentSelected = currentItems.length > 0 && currentItems.every(o => selectedIds.has(o.id));
  const someSelected = selectedIds.size > 0;

  const toggleSelectAll = () => {
    if (allCurrentSelected) {
      setSelectedIds(prev => { const next = new Set(prev); currentItems.forEach(o => next.delete(o.id)); return next; });
    } else {
      setSelectedIds(prev => { const next = new Set(prev); currentItems.forEach(o => next.add(o.id)); return next; });
    }
  };

  const toggleSelectOne = (id) => {
    setSelectedIds(prev => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next; });
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    if (!window.confirm(`Delete ${selectedIds.size} selected record(s)? Confirmed orders will be cancelled first. This cannot be undone.`)) return;
    
    setIsBulkDeleting(true);
    try {
      // Process each selected ID
      for (const id of selectedIds) {
        const order = orders.find(o => o.id === id);
        if (!order) continue;

        try {
          // If it's a confirmed sale order, we must cancel it first
          if (order.state === 'sale' || order.status === 'sale') {
            await odooService.declineOrder(id, "Bulk cancelled before deletion");
          }
          // Now perform the actual deletion
          await odooService.deleteOrder(id);
        } catch (err) {
          console.error(`Failed to delete order ${id}:`, err);
        }
      }
      
      setSelectedIds(new Set());
      await fetchOrders(); // Force fresh reload
    } finally {
      setIsBulkDeleting(false);
    }
  };

  const handlePageChange = (pageNumber) => {
    if (pageNumber >= 1 && pageNumber <= totalPages) {
      setCurrentPage(pageNumber);
    }
  };

  const handleConfirm = async (id) => {
    if (!window.confirm('Confirm this order?')) return;
    try {
      const res = await odooService.confirmOrder(id);
      if (res.success) {
        fetchOrders();
      } else {
        alert(res.error?.message || "Failed to confirm");
      }
    } catch {
      alert("Network error");
    }
  };

  const handleConvertSelection = async (id, targetState) => {
    const stateName = targetState === 'sale' ? 'Sale Order' : 'Quotation';
    if (!window.confirm(`Convert this selection to a ${stateName}?`)) return;
    try {
      const res = await odooService.convertSelection(id, targetState);
      if (res.success) {
        fetchOrders();
      } else {
        alert(res.error?.message || `Error converting to ${stateName}`);
      }
    } catch {
      alert("Network error while converting.");
    }
  };

  const handleDecline = async (id) => {
    const isQuotation = stateType === 'quotation';
    if (isQuotation) {
      if (!window.confirm("Decline this quotation?")) return;
      try {
        const res = await odooService.declineOrder(id);
        if (res.success) { fetchOrders(); }
        else alert(res.error?.message || "Failed to decline");
      } catch { alert("Error declining quotation"); }
    } else {
      const reason = window.prompt("Reason for decline:");
      if (reason === null) return;
      try {
        const res = await odooService.declineOrder(id, reason);
        if (res.success) { fetchOrders(); }
        else alert(res.error?.message || "Failed to decline");
      } catch { alert("Network error"); }
    }
  };

  const renderPagination = () => {
    if (totalPages <= 1) return null;
    const pages = [];
    pages.push(<button key="prev" className="page-btn prev" onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage === 1}>Previous</button>);
    const maxVisiblePages = isMobile ? 3 : 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

    if (endPage - startPage < maxVisiblePages - 1) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(<button key={i} className={`page-btn ${currentPage === i ? 'active' : ''}`} onClick={() => handlePageChange(i)}>{i}</button>);
    }
    pages.push(<button key="next" className="page-btn next" onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage === totalPages}>Next</button>);
    return pages;
  };

  const titleMap = {
    'quotation': 'Quotations',
    'order': 'Sale Orders',
    'selection': 'Selections',
    'cancel': 'Cancelled Orders'
  };
  const title = isTaskView ? 'Tasks' : (titleMap[stateType] || 'All Orders');

  return (
    <div className="dt-page">
      <div className="dt-card">
        <div className="dt-toolbar-row">
          <div className="dt-toolbar-left">
            <div className="dt-flex">
              <span className="dt-control-label">Show</span>
              <select 
                className="entries-select"
                value={entriesPerPage}
                onChange={(e) => { setEntriesPerPage(Number(e.target.value)); setCurrentPage(1); }}
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
              </select>
              <span className="dt-control-label">entries</span>
            </div>
            
            <div className="dt-flex dt-search-box">
              <input 
                type="text" 
                className="search-input"
                value={searchTerm}
                placeholder="Search customer, name..."
                onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              />
            </div>

            <div className="dt-date-range">
              <div className="dt-date-input-wrap">
                <Calendar size={12} className="text-slate-400" />
                <input 
                  type="date" 
                  value={dateFrom}
                  onChange={(e) => { setDateFrom(e.target.value); setCurrentPage(1); }}
                  className="dt-date-input"
                />
                {dateFrom && <X size={12} className="cursor-pointer text-slate-300 hover:text-red-500" onClick={() => setDateFrom('')} />}
              </div>
              <span className="dt-date-sep">TO</span>
              <div className="dt-date-input-wrap">
                <Calendar size={12} className="text-slate-400" />
                <input 
                  type="date" 
                  value={dateTo}
                  onChange={(e) => { setDateTo(e.target.value); setCurrentPage(1); }}
                  className="dt-date-input"
                />
                {dateTo && <X size={12} className="cursor-pointer text-slate-300 hover:text-red-500" onClick={() => setDateTo('')} />}
              </div>
            </div>
          </div>

          <div className="dt-toolbar-right" style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            {isTaskView && (
              <>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '11px', fontWeight: 700, color: filterMyTasks ? '#3b82f6' : '#64748b', background: filterMyTasks ? '#eff6ff' : '#f8fafc', border: `1px solid ${filterMyTasks ? '#bfdbfe' : '#e2e8f0'}`, borderRadius: '8px', padding: '5px 10px', transition: 'all 0.2s', userSelect: 'none' }}>
                  <input
                    type="checkbox"
                    checked={filterMyTasks}
                    onChange={(e) => { setFilterMyTasks(e.target.checked); setCurrentPage(1); }}
                    style={{ width: '14px', height: '14px', accentColor: '#3b82f6', cursor: 'pointer' }}
                  />
                  My Tasks
                </label>
                <div style={{ width: '180px' }}>
                  <SearchableSelect
                    placeholder="Assignee..."
                    value={filterAssignee}
                    small
                    options={[
                      { value: '', label: 'All' },
                      ...users.map(u => ({ value: String(u.id), label: u.name }))
                    ]}
                    onChange={(val) => { setFilterAssignee(val); setCurrentPage(1); }}
                  />
                </div>
              </>
            )}

            {/* Today's Tasks filter */}
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '11px', fontWeight: 700, color: filterToday ? '#3b82f6' : '#64748b', background: filterToday ? '#eff6ff' : '#f8fafc', border: `1px solid ${filterToday ? '#bfdbfe' : '#e2e8f0'}`, borderRadius: '8px', padding: '5px 10px', transition: 'all 0.2s', userSelect: 'none' }}>
              <input
                type="checkbox"
                checked={filterToday}
                onChange={(e) => { setFilterToday(e.target.checked); setCurrentPage(1); }}
                style={{ width: '14px', height: '14px', accentColor: '#3b82f6', cursor: 'pointer' }}
              />
              Today's Tasks
            </label>

            <div className="pro-toggle-wrap">
              <input 
                type="checkbox" 
                id="toggle-pro"
                checked={showProfessional} 
                onChange={(e) => setShowProfessional(e.target.checked)}
                className="pro-checkbox"
              />
              <label htmlFor="toggle-pro" className="pro-toggle-label">Show Professional</label>
            </div>
            <div className="btn-group-wrap">
              {someSelected ? (
                <button
                  className="btn-ui"
                  style={{ background: '#fee2e2', color: '#dc2626', border: '1px solid #fca5a5', fontWeight: 700 }}
                  onClick={handleBulkDelete}
                  disabled={isBulkDeleting}
                >
                  <Trash2 size={14} />
                  <span>{isBulkDeleting ? 'Deleting...' : `Delete (${selectedIds.size})`}</span>
                </button>
              ) : !isTaskView ? (
                <>
                  <button 
                    ref={catalogBtnRef}
                    className={`btn-ui secondary ${catalogAnchor ? 'active-popover' : ''}`} 
                    onClick={() => setCatalogAnchor(catalogAnchor ? null : catalogBtnRef.current)}
                  >
                    <ShoppingCart size={14} />
                    <span>Catalog</span>
                  </button>
                  <button 
                    className="btn-ui primary" 
                    onClick={() => onNavigate(stateType === 'selection' ? 'create-selection' : stateType === 'order' ? 'create-direct-order' : 'create-order')}
                  >
                    <Plus size={14} />
                    <span>
                      {stateType === 'selection' ? 'Selection' : stateType === 'order' ? 'Order' : 'Quotation'}
                    </span>
                  </button>
                </>
              ) : null}
            </div>
          </div>
        </div>



        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center">
             <Loader message={`Loading ${title}...`} />
             <div className="w-full h-1 bg-slate-50 relative overflow-hidden mt-8 opacity-40">
                <div className="absolute h-full bg-indigo-500 animate-[loading-bar_2s_infinite]" style={{ width: '30%' }}></div>
             </div>
          </div>
        ) : (
          <div className="table-wrapper">
            <table className="products-datatable">
              <thead>
                <tr>
                  <th style={{ width: '36px', padding: '8px 6px' }} className="text-center">
                    <input
                      type="checkbox"
                      checked={allCurrentSelected}
                      onChange={toggleSelectAll}
                      style={{ width: '15px', height: '15px', accentColor: '#3b82f6', cursor: 'pointer' }}
                      title="Select all on this page"
                    />
                  </th>
                  <th className="text-center" style={{ width: '40px' }}>Sr.No</th>
                  <th style={{ width: '230px' }}>Customer</th>
                  <th style={{ width: '120px', fontSize: '11px' }}>Sale Person</th>
                  <th style={{ width: '80px', fontSize: '11px' }}>Date</th>
                  {showProfessional && <th style={{ width: '250px' }}>Professional</th>}
                  <th style={{ width: showProfessional ? '120px' : '140px' }}>Note</th>
                  <th style={{ width: showProfessional ? '120px' : '320px' }}>Task</th>
                  <th className="text-center" style={{ width: '90px' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {currentItems.map((order, idx) => (
                  <tr 
                    key={order.id} 
                    onClick={() => onNavigate('order-detail', order.id)}
                    className="hover:bg-slate-50 transition-colors"
                    style={{ background: selectedIds.has(order.id) ? '#eff6ff' : undefined }}
                  >
                    <td style={{ padding: '8px 6px', width: '36px' }} className="text-center" onClick={(e) => e.stopPropagation()} data-label="">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(order.id)}
                        onChange={() => toggleSelectOne(order.id)}
                        style={{ width: '15px', height: '15px', accentColor: '#3b82f6', cursor: 'pointer' }}
                      />
                    </td>
                    <td className="text-center cell-light" data-label="Sr.No" style={{ fontSize: '12px' }}>
                      {indexOfFirstItem + idx + 1}
                    </td>
                    <td className="cell-highlight" data-label="Customer">
                      <div className="customer-main" style={{ fontSize: '17px', fontWeight: 800, color: '#0f172a' }}>{order.customer || '-'}</div>
                      {order.phone && <div className="cell-light" style={{ fontSize: '14px', marginTop: '2px', color: '#64748b' }}>{order.phone}</div>}
                    </td>
                    <td className="cell-light" data-label="Sale Person" style={{ fontSize: '11px', color: '#64748b', maxWidth: '90px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {order.salesperson || '-'}
                    </td>
                    <td className="cell-light" data-label="Date" style={{ fontSize: '11px' }}>
                      {order.activity_date
                        ? <span style={{ color: order.activity_date === todayISO ? '#3b82f6' : '#64748b', fontWeight: order.activity_date === todayISO ? 700 : 400 }}>{order.activity_date}</span>
                        : <span style={{ color: '#cbd5e1' }}>{order.order_date || '-'}</span>
                      }
                    </td>
                    {showProfessional && (
                      <td className="cell-light" data-label="Professional">
                        {order.architect && (
                          <div className="pro-line" style={{ fontSize: '13px' }}>
                            <strong>A:</strong> {order.architect}
                            {order.architect_phone && <span className="cell-light" style={{ fontSize: '11px', marginLeft: '4px' }}>({order.architect_phone})</span>}
                          </div>
                        )}
                        {order.electrician && (
                          <div className="pro-line" style={{ fontSize: '13px' }}>
                            <strong>E:</strong> {order.electrician}
                            {order.electrician_phone && <span className="cell-light" style={{ fontSize: '11px', marginLeft: '4px' }}>({order.electrician_phone})</span>}
                          </div>
                        )}
                        {!order.architect && !order.electrician && '-'}
                      </td>
                    )}
                    <td className="cell-highlight" data-label="Note" style={{ padding: '12px' }}>
                      {(() => {
                        if (!order.note) return <span style={{ color: '#cbd5e1' }}>-</span>;
                        const parts = order.note.split(/\n?---\n?|<br\s*\/?>/).filter(Boolean);
                        if (parts.length === 0) return '-';
                        
                        const latestRaw = parts[parts.length - 1];
                        const authorMatch = latestRaw.match(/<b>(.*?)<\/b>/) || latestRaw.match(/^\[(.*?) - .*?\]/);
                        const authorName = authorMatch ? authorMatch[1] : null;
                        
                        let cleanText = latestRaw.replace(/<[^>]*>/g, '').trim();
                        if (authorName) {
                          cleanText = cleanText.replace(new RegExp(`^${authorName}:\\s*`, 'i'), '');
                          cleanText = cleanText.replace(new RegExp(`^\\[${authorName}.*?\\].*?(\\n|$)`, 'i'), '');
                        }
                        
                        return (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                            <div className="note-truncate" title={cleanText} style={{ fontWeight: 600, color: '#334155', fontSize: '14px', lineHeight: '1.4' }}>
                              {cleanText}
                            </div>
                            {authorName && (
                              <div style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase' }}>
                                By {authorName}
                              </div>
                            )}
                          </div>
                        );
                      })()}
                    </td>
                    <td className="cell-highlight" data-label="Task" style={{ padding: '12px' }}>
                      <div className="note-truncate" title={order.last_activity} style={{ fontSize: '14px', fontWeight: 500, color: '#475569' }}>
                        {order.last_activity || <span style={{ color: '#cbd5e1' }}>-</span>}
                      </div>
                    </td>
                    <td 
                      className="text-center" 
                      data-label="Actions" 
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="action-cell">
                        <button 
                          className="action-trigger"
                          onClick={(e) => {
                            e.stopPropagation();
                            const rect = e.currentTarget.getBoundingClientRect();
                            if (openDropdownId === order.id) {
                              setOpenDropdownId(null);
                            } else {
                              setDropdownPos({ 
                                top: rect.bottom, 
                                left: rect.right - 180 
                              });
                              setOpenDropdownId(order.id);
                            }
                          }}
                        >
                          <ChevronDown size={14} />
                        </button>

                        {openDropdownId === order.id && createPortal(
                          <div 
                            className={`action-dropdown-popover portal-fix ${idx >= currentItems.length - 3 && currentItems.length > 5 ? 'open-up' : ''}`}
                            style={{ 
                              position: 'fixed',
                              top: idx >= currentItems.length - 3 && currentItems.length > 5 
                                ? `${dropdownPos.top - (stateType === 'selection' ? 240 : 180)}px` 
                                : `${dropdownPos.top + 5}px`, 
                              left: `${dropdownPos.left}px`,
                              right: 'auto',
                              bottom: 'auto',
                              zIndex: 9999,
                              minWidth: '180px'
                            }}
                            onMouseLeave={() => setOpenDropdownId(null)}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div style={{ paddingBottom: '4px', borderBottom: '1px solid #f1f5f9' }}>
                              <button 
                                className="btn-action-soft"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setOpenDropdownId(null);
                                  setQuickNoteOrderId(order.id);
                                }}
                              >
                                <MessageSquare size={12} className="text-emerald-500" />
                                <span>Add Remark</span>
                              </button>

                              <button 
                                className="btn-action-soft"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setOpenDropdownId(null);
                                  setQuickTaskOrderId(order.id);
                                }}
                              >
                                <Calendar size={12} className="text-orange-500" />
                                <span>Add Task</span>
                              </button>
                            </div>

                            <div style={{ marginTop: '4px' }}>
                              {/* Smart actions based on order.status and stateType */}
                              {(order.status === 'selection' || stateType === 'selection') && (
                                <>
                                  <button 
                                    className="btn-action-soft"
                                    style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: '8px', marginBottom: '4px' }}
                                    onClick={(e) => { e.stopPropagation(); handleConvertSelection(order.id, 'draft'); setOpenDropdownId(null); }}
                                  >
                                    <CheckCircle size={12} style={{ color: '#6366f1' }} />
                                    <span style={{ fontWeight: 700, color: '#6366f1' }}>Convert to Quotation</span>
                                  </button>
                                  <button 
                                    className="btn-action-soft"
                                    style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: '8px', marginBottom: '4px' }}
                                    onClick={(e) => { e.stopPropagation(); handleConvertSelection(order.id, 'sale'); setOpenDropdownId(null); }}
                                  >
                                    <CheckCircle size={12} style={{ color: '#10b981' }} />
                                    <span style={{ fontWeight: 700, color: '#10b981' }}>Convert to Order</span>
                                  </button>
                                  <button 
                                    className="btn-action-soft"
                                    onClick={async (e) => {
                                      e.stopPropagation();
                                      if (!window.confirm("Are you sure you want to delete this selection?")) return;
                                      setOpenDropdownId(null);
                                      try { 
                                        await odooService.deleteOrder(order.id); 
                                        fetchOrders();
                                      } catch(err) {
                                        console.error('Error deleting selection', err);
                                      }
                                    }}
                                  >
                                    <Trash2 size={12} className="text-orange-500" />
                                    <span>Delete</span>
                                  </button>
                                </>
                              )}
                              {(order.status === 'draft' || stateType === 'quotation') && (
                                <>
                                  <button 
                                    className="btn-action-soft"
                                    style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: '8px', marginBottom: '4px' }}
                                    onClick={(e) => { e.stopPropagation(); handleConfirm(order.id); setOpenDropdownId(null); }}
                                  >
                                    <CheckCircle size={12} style={{ color: '#10b981' }} />
                                    <span style={{ fontWeight: 700, color: '#10b981' }}>Confirm Order</span>
                                  </button>
                                  <button 
                                    className="btn-action-soft"
                                    onClick={async (e) => {
                                      e.stopPropagation();
                                      if (!window.confirm("Are you sure you want to delete this quotation?")) return;
                                      setOpenDropdownId(null);
                                      try { 
                                        await odooService.deleteOrder(order.id); 
                                        fetchOrders();
                                      } catch(err) {
                                        console.error('Error deleting quotation', err);
                                      }
                                    }}
                                  >
                                    <Trash2 size={12} className="text-orange-500" />
                                    <span>Delete</span>
                                  </button>
                                </>
                              )}
                              {(order.status === 'sale' || stateType === 'order') && (
                                <button 
                                  className="btn-action-soft"
                                  onClick={async (e) => {
                                    e.stopPropagation();
                                    if (!window.confirm("This order is confirmed. Are you sure you want to cancel and delete it?")) return;
                                    setOpenDropdownId(null);
                                    try {
                                      // Cancel (Decline) first as Odoo might not allow deleting a confirmed order
                                      const res = await odooService.declineOrder(order.id, "Cancelled before intentional deletion");
                                      if (res.success || !res.error) {
                                        await odooService.deleteOrder(order.id);
                                        fetchOrders();
                                      } else {
                                        alert(res.error?.message || "Failed to cancel order before deletion");
                                      }
                                    } catch(err) {
                                      console.error('Error deleting sale order', err);
                                      alert("Error during order deletion process");
                                    }
                                  }}
                                >
                                  <Trash2 size={12} className="text-orange-500" />
                                  <span>Delete</span>
                                </button>
                              )}
                              {(order.status === 'cancel' || stateType === 'cancel') && (
                                <button 
                                  className="btn-action-soft"
                                  onClick={async (e) => {
                                    e.stopPropagation();
                                    if (!window.confirm("Are you sure you want to delete this cancelled order?")) return;
                                    setOpenDropdownId(null);
                                    try { 
                                      await odooService.deleteOrder(order.id); 
                                      fetchOrders();
                                    } catch(err) {
                                      console.error('Error deleting order', err);
                                    }
                                  }}
                                >
                                  <Trash2 size={12} className="text-orange-500" />
                                  <span>Delete</span>
                                </button>
                              )}
                              

                            </div>
                          </div>,
                          document.body
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                  {currentItems.length === 0 && (
                    <tr>
                      <td colSpan="7" className="py-8 text-center text-slate-400">
                        No records found matching your request.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
        )}

        <div className="datatable-footer dt-flex-between">
          <div className="pagination dt-flex border border-slate-300 rounded overflow-hidden">
            {renderPagination()}
          </div>
        </div>
      </div>

      {catalogAnchor && createPortal(
        <>
          <div className="catalog-popover-portal fixed-popover animate-fade-in shadow-2xl">
             <div className="popover-section-header">
                <h3>Select Customer</h3>
                <button className="close-popover-btn" onClick={() => setCatalogAnchor(null)}>
                  <X size={16} />
                </button>
             </div>

             <div className="popover-body-content">
               <div className="flex-between mb-2">
                  <label className="context-label">Identify Your Customer</label>
                  <button 
                    className="ghost-action-btn"
                    onClick={() => { setCatalogAnchor(null); onNavigate('create-customer'); }}
                  >
                    <UserPlus size={12} />
                    <span>New Contact</span>
                  </button>
               </div>
               <SearchableSelect
                 placeholder="Search by name, phone or email..."
                 value={selectedPartnerId}
                 onChange={(val) => setSelectedPartnerId(val)}
                 options={partners.map((p) => ({ 
                   value: p.id, 
                   label: `${p.name}${p.phone ? ' - ' + p.phone : ''}`
                 }))}
               />
             </div>

             {selectedPartnerId && (() => {
               const p = partners.find(part => part.id === parseInt(selectedPartnerId));
               return (
                 <div className="selected-partner-card mb-6 animate-slide-up">
                   <div className="partner-icon-large">
                     {p?.name?.substring(0,1).toUpperCase()}
                   </div>
                   <div className="partner-meta-info">
                     <div className="partner-name-bold">{p?.name}</div>
                     <div className="partner-contact-pill">{p?.phone || 'No Contact Info'}</div>
                   </div>
                 </div>
               );
             })()}

             <div className="popover-footer-actions">
               <button 
                 className="popover-btn-secondary"
                 onClick={() => setCatalogAnchor(null)}
               >
                 Cancel
               </button>
               <button 
                 className="popover-btn-primary"
                 disabled={!selectedPartnerId}
                 onClick={() => {
                   setCatalogAnchor(null);
                   const backTab = stateType === 'quotation' ? 'quotations' : stateType === 'order' ? 'orders' : 'selection';
                   onNavigate('catalog', selectedPartnerId, { fromTab: backTab });
                 }}
               >
                 Open Catalog
               </button>
             </div>
          </div>
          <div 
            className="popover-backdrop-dark" 
            onClick={() => setCatalogAnchor(null)} 
          />
        </>,
        document.body
      )}
     {/* VIEW QUICK DETAIL MODAL REMOVED */}

     {/* ADD QUICK NOTE MODAL */}
     {quickNoteOrderId && (
       <QuickNoteModal 
          orderId={quickNoteOrderId}
          onClose={() => setQuickNoteOrderId(null)}
          onSuccess={() => { fetchOrders(); setQuickNoteOrderId(null); }}
       />
     )}

     {/* ADD QUICK TASK MODAL */}
     {quickTaskOrderId && (
       <QuickTaskModal 
          orderId={quickTaskOrderId}
          users={users}
          onClose={() => setQuickTaskOrderId(null)}
          onSuccess={() => { fetchOrders(); setQuickTaskOrderId(null); }}
       />
     )}
    </div>
  );
};

// --- SHARED MODAL COMPONENTS (IMPORTED FROM QuickActionModals.jsx) ---

// --- MODAL COMPONENTS REMOVED (NOW IMPORTED FROM QuickActionModals.jsx) ---

export default Orders;
