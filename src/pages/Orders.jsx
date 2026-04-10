import React, { useState, useEffect, useCallback } from 'react';
import { Search, Plus, Edit, Trash2, CheckCircle, XCircle, ChevronDown, MoreVertical, Eye, Filter, ShoppingCart, ArrowLeft, Grid, List as ListIcon, X, Clock, UserPlus, MessageSquare, Calendar, Link as LinkIcon, Send } from 'lucide-react';
import { createPortal } from 'react-dom';
import { odooService } from '../services/odoo';
import Loader from '../components/Loader';
import '../components/Loader.css';
import SearchableSelect from '../components/SearchableSelect';
import './Products.css'; // Global DataTable styles
import '../CreateOrder.css'; // Use shared form styles for consistency

const Orders = ({ stateType = 'all', onNavigate }) => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [entriesPerPage, setEntriesPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [openDropdownId, setOpenDropdownId] = useState(null);
  const [isMobile, setIsMobile] = useState(() => (
    typeof window !== 'undefined' ? window.innerWidth <= 768 : false
  ));
  const [partners, setPartners] = useState([]);
  const [selectedPartnerId, setSelectedPartnerId] = useState('');
  const [catalogAnchor, setCatalogAnchor] = useState(null);
  const catalogBtnRef = React.useRef(null);
  const [showProfessional, setShowProfessional] = useState(false);
  
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
      const data = await odooService.getOrders(1000, 0, 'date_order desc', stateType);
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

  const filtered = orders.filter(o => {
    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLowerCase();
    return (
      o.name?.toLowerCase().includes(q)           ||  // Sale Order Number (e.g. S00012)
      o.customer?.toLowerCase().includes(q)        ||  // Customer Name
      o.phone?.toLowerCase().includes(q)           ||  // Customer Phone / Mobile
      o.salesperson?.toLowerCase().includes(q)     ||  // Salesperson Name
      o.architect?.toLowerCase().includes(q)       ||  // Architect Name
      o.architect_phone?.toLowerCase().includes(q) ||  // Architect Phone
      o.electrician?.toLowerCase().includes(q)     ||  // Electrician Name
      o.electrician_phone?.toLowerCase().includes(q)|| // Electrician Phone
      o.remark?.toLowerCase().includes(q)          ||  // Last Remark / Note
      o.last_activity?.toLowerCase().includes(q)       // Last Planned Activity / Task
    );
  });

  const totalEntries = filtered.length;
  const totalPages = Math.ceil(totalEntries / entriesPerPage);
  const indexOfLastItem = currentPage * entriesPerPage;
  const indexOfFirstItem = indexOfLastItem - entriesPerPage;
  const currentItems = filtered.slice(indexOfFirstItem, indexOfLastItem);

  const handlePageChange = (pageNumber) => {
    if (pageNumber >= 1 && pageNumber <= totalPages) {
      setCurrentPage(pageNumber);
    }
  };

  const handleConfirm = async (id) => {
    const isQuotation = stateType === 'quotation';
    if (!window.confirm(`Confirm this ${isQuotation ? 'quotation' : 'order'}?`)) return;
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
  const title = titleMap[stateType] || 'All Orders';

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
          </div>

          <div className="dt-toolbar-right">
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
                  <th className="text-center" style={{ width: '40px' }}>Sr.No</th>
                  <th style={{ width: '100px' }}>Date</th>
                  <th style={{ width: '130px' }}>Sale Person</th>
                  <th style={{ width: '180px' }}>Customer</th>
                  {showProfessional && <th style={{ width: '150px' }}>Professional</th>}
                  <th style={{ minWidth: '150px' }}>Note</th>
                  <th style={{ minWidth: '150px' }}>Task</th>
                  <th className="text-center" style={{ width: '60px' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {currentItems.map((order, idx) => (
                  <tr 
                    key={order.id} 
                    onClick={() => onNavigate('order-detail', order.id)}
                  >
                    <td className="text-center cell-light" data-label="Sr.No">
                      {indexOfFirstItem + idx + 1}
                    </td>
                    <td className="cell-light" data-label="Date">
                      {order.order_date || '-'}
                    </td>
                    <td className="cell-light" data-label="Sale Person">
                      {order.salesperson || '-'}
                    </td>
                    <td className="cell-highlight" data-label="Customer">
                      <div className="customer-main">{order.customer || '-'}</div>
                      {order.phone && <div className="cell-light" style={{ fontSize: '15px', marginTop: '2px' }}>{order.phone}</div>}
                    </td>
                    {showProfessional && (
                      <td className="cell-light" data-label="Professional">
                        {order.architect && (
                          <div className="pro-line">
                            <strong>A:</strong> {order.architect}
                            {order.architect_phone && <span className="cell-light" style={{ fontSize: '11px', marginLeft: '4px' }}>({order.architect_phone})</span>}
                          </div>
                        )}
                        {order.electrician && (
                          <div className="pro-line">
                            <strong>E:</strong> {order.electrician}
                            {order.electrician_phone && <span className="cell-light" style={{ fontSize: '11px', marginLeft: '4px' }}>({order.electrician_phone})</span>}
                          </div>
                        )}
                        {!order.architect && !order.electrician && '-'}
                      </td>
                    )}
                    <td className="cell-highlight" data-label="Note" style={{ padding: '10px 12px' }}>
                      {(() => {
                        if (!order.note) return '-';
                        const parts = order.note.split(/\n---\n|<br\s*\/?>/).filter(Boolean);
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
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                            <div className="note-truncate" title={cleanText} style={{ fontWeight: 600, color: '#000', marginBottom: 0 }}>
                              {cleanText}
                            </div>
                            {authorName && (
                              <div style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.025em' }}>
                                By {authorName}
                              </div>
                            )}
                          </div>
                        );
                      })()}
                    </td>
                    <td className="cell-highlight" data-label="Task">
                      <div className="note-truncate" title={order.last_activity}>
                        {order.last_activity || '-'}
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
                            setOpenDropdownId(openDropdownId === order.id ? null : order.id);
                          }}
                        >
                          <ChevronDown size={14} />
                        </button>

                        {openDropdownId === order.id && (
                          <div 
                            className="action-dropdown-popover"
                            onMouseEnter={() => setOpenDropdownId(order.id)}
                            onMouseLeave={() => setOpenDropdownId(null)}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button 
                              className="btn-action-soft"
                              onClick={(e) => {
                                e.stopPropagation();
                                setOpenDropdownId(null);
                                setQuickDetailOrderId(order.id);
                              }}
                            >
                              <Eye size={12} className="text-blue-500" />
                              <span>View Quick Details</span>
                            </button>

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
                   label: `${p.name}${p.mobile ? ' - ' + p.mobile : (p.phone ? ' - ' + p.phone : '')}`
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
                     <div className="partner-contact-pill">{p?.mobile || p?.phone || 'No Contact Info'}</div>
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
     {/* VIEW QUICK DETAIL MODAL */}
     {quickDetailOrderId && (
       <QuickDetailModal 
          orderId={quickDetailOrderId} 
          onClose={() => setQuickDetailOrderId(null)} 
       />
     )}

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

// --- QUICK ACTION MODALS ---

const QuickDetailModal = ({ orderId, onClose }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await odooService.getOrderDetail(orderId);
        setData(res);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [orderId]);

  return createPortal(
    <div className="co-modal-overlay animate-fade-in" onClick={onClose}>
      <div className="co-modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '600px', width: '90%' }}>
        <div className="co-modal-header" style={{ borderBottom: '1px solid #eee', paddingBottom: '1rem' }}>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 800 }}>Order Quick Details</h2>
          <button className="co-btn-close" onClick={onClose}><X size={20} /></button>
        </div>
        
        <div className="co-modal-body" style={{ maxHeight: '70vh', overflowY: 'auto', padding: '1rem 0' }}>
          {loading ? <Loader message="Fetching internal data..." /> : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <section>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                  <div style={{ background: '#fff7ed', padding: '8px', borderRadius: '8px' }}>
                    <Calendar size={18} className="text-orange-500" />
                  </div>
                  <h3 style={{ fontSize: '13px', fontWeight: 800, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.025em' }}>Recent Activities</h3>
                </div>
                {data?.activities?.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {data.activities.map((act, i) => (
                      <div key={i} style={{ padding: '12px', background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
                          <span style={{ fontWeight: 700, fontSize: '14px', color: '#1e293b' }}>{act.summary || 'Task'}</span>
                          <span style={{ fontSize: '11px', color: '#64748b', background: '#f1f5f9', padding: '2px 8px', borderRadius: '4px' }}>{act.date_deadline}</span>
                        </div>
                        <div style={{ fontSize: '13px', color: '#475569', lineHeight: 1.5 }} dangerouslySetInnerHTML={{ __html: act.note }} />
                      </div>
                    ))}
                  </div>
                ) : <div style={{ fontSize: '13px', color: '#94a3b8', padding: '10px', background: '#f8fafc', borderRadius: '8px', textAlign: 'center' }}>No active tasks found.</div>}
              </section>

              <section>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                  <div style={{ background: '#ecfdf5', padding: '8px', borderRadius: '8px' }}>
                    <MessageSquare size={18} className="text-emerald-500" />
                  </div>
                  <h3 style={{ fontSize: '13px', fontWeight: 800, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.025em' }}>Historical Remarks</h3>
                </div>
                {data?.remark ? (
                   <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {data.remark.split(/\n?---\n?|<br\s*\/?>/).filter(Boolean).map((t, idx) => {
                         const authorMatch = t.match(/<b>(.*?)<\/b>/) || t.match(/^\[(.*?) - .*?\]/);
                         const authorName = authorMatch ? authorMatch[1] : null;
                         
                         let cleanText = t.replace(/<[^>]*>/g, '').trim();
                         if (authorName) {
                            cleanText = cleanText.replace(new RegExp(`^${authorName}:\\s*`, 'i'), '');
                            cleanText = cleanText.replace(new RegExp(`^\\[${authorName}.*?\\].*?(\\n|$)`, 'i'), '');
                         }
                         
                         return (
                           <div key={idx} style={{ padding: '12px', background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                             <div style={{ fontSize: '14px', color: '#334155', lineHeight: 1.5, fontWeight: 500 }}>{cleanText}</div>
                             {authorName && (
                               <div style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', marginTop: '6px', borderTop: '1px solid #f1f5f9', paddingTop: '4px' }}>
                                 By {authorName}
                               </div>
                             )}
                           </div>
                         );
                      })}
                   </div>
                ) : <div style={{ fontSize: '13px', color: '#94a3b8', padding: '10px', background: '#f8fafc', borderRadius: '8px', textAlign: 'center' }}>No remarks found.</div>}
              </section>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};

const QuickNoteModal = ({ orderId, onClose, onSuccess }) => {
  const [text, setText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!text.trim()) return alert("Please enter some text");
    setSubmitting(true);
    try {
      const res = await odooService.addQuickNote(orderId, text);
      if (res.success || !res.error) onSuccess();
      else alert(res.error || "Failed to add note");
    } finally {
      setSubmitting(false);
    }
  };

  return createPortal(
    <div className="co-modal-overlay animate-fade-in" onClick={onClose}>
      <div className="co-modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '450px', width: '90%' }}>
        <div className="co-modal-header" style={{ marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <MessageSquare size={20} className="text-emerald-500" />
            <h2 style={{ fontSize: '1.1rem', fontWeight: 800 }}>Add Remark</h2>
          </div>
          <button className="co-btn-close" onClick={onClose}><X size={20} /></button>
        </div>
        <textarea 
          placeholder="Type your remark here..."
          value={text}
          onChange={e => setText(e.target.value)}
          style={{ width: '100%', minHeight: '120px', padding: '12px', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '1rem', fontSize: '14px' }}
        />
        <div style={{ display: 'flex', gap: '10px' }}>
          <button 
            className="co-btn co-btn-primary" 
            style={{ flex: 1, background: '#10b981', height: '44px', color: '#fff' }}
            onClick={handleSubmit}
            disabled={submitting}
          >
            {submitting ? 'Saving...' : 'Add Remark'}
          </button>
          <button className="co-btn co-btn-secondary" style={{ flex: 1, height: '44px' }} onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>,
    document.body
  );
};

const QuickTaskModal = ({ orderId, users = [], onClose, onSuccess }) => {
  const [vals, setVals] = useState({ summary: '', note: '', deadline: new Date().toISOString().split('T')[0], userId: '' });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      // Use summary or generic 'Task' if empty
      const finalSummary = vals.summary.trim() || 'Task';
      const res = await odooService.addQuickActivity(orderId, finalSummary, vals.note, vals.deadline, vals.userId);
      if (res.success || !res.error) onSuccess();
      else alert(res.error || "Failed to create task");
    } finally {
      setSubmitting(false);
    }
  };

  return createPortal(
    <div className="co-modal-overlay animate-fade-in" onClick={onClose}>
      <div className="co-modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '600px', width: '95%' }}>
        <div className="co-modal-header" style={{ marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
             <Calendar size={20} className="text-orange-500" />
             <h2 style={{ fontSize: '1.1rem', fontWeight: 800 }}>TASKS</h2>
          </div>
          <button className="co-btn-close" onClick={onClose}><X size={20} /></button>
        </div>
        
        <div className="co-modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
           <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '16px' }}>
             <div>
               <label style={{ fontSize: '11px', fontWeight: 800, color: '#94a3b8', display: 'block', marginBottom: '8px', textTransform: 'uppercase' }}>Due Date</label>
               <input 
                 type="date" 
                 className="co-input" 
                 value={vals.deadline} 
                 onChange={e => setVals({...vals, deadline: e.target.value})}
                 style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #e2e8f0', fontSize: '14px' }}
               />
             </div>
             <div>
               <label style={{ fontSize: '11px', fontWeight: 800, color: '#94a3b8', display: 'block', marginBottom: '8px', textTransform: 'uppercase' }}>Assigned To</label>
               <SearchableSelect 
                 options={users.map(u => ({ value: u.id, label: u.name }))}
                 value={vals.userId}
                 onChange={(id) => setVals({...vals, userId: id})}
                 placeholder="Select User"
               />
             </div>
           </div>

           <div>
             <label style={{ fontSize: '11px', fontWeight: 800, color: '#94a3b8', display: 'block', marginBottom: '8px', textTransform: 'uppercase' }}>Activity Note</label>
             <textarea 
               placeholder="Type details here..." 
               value={vals.note} 
               onChange={e => setVals({...vals, note: e.target.value})}
               style={{ width: '100%', minHeight: '120px', padding: '14px', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '14px', lineHeight: '1.5', resize: 'vertical' }}
             />
           </div>

           <button 
             className="co-btn co-btn-primary" 
             style={{ width: '100%', background: '#3b82f6', height: '52px', color: '#fff', fontSize: '15px', fontWeight: 700, borderRadius: '12px', marginTop: '8px' }}
             onClick={handleSubmit}
             disabled={submitting}
           >
             {submitting ? 'Creating...' : 'Create Task'}
           </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default Orders;
