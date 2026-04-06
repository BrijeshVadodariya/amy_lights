import React, { useState, useEffect, useCallback } from 'react';
import { Search, Plus, Edit, Trash2, CheckCircle, XCircle, ChevronDown, MoreVertical, Eye, Filter, ShoppingCart, ArrowLeft, Grid, List as ListIcon, X, Clock, UserPlus } from 'lucide-react';
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
        }
      } catch (err) {
        console.error("Failed to fetch partners", err);
      }
    };
    fetchPartners();
  }, [fetchOrders]);

  const filtered = orders.filter(o => 
    o.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    o.customer?.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
    'selection': 'Selections'
  };
  const title = titleMap[stateType] || 'All Orders';

  return (
    <div className="dt-page">
      <div className="dt-card">
        <div className="dt-header">
          <h2>{title}</h2>
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <button 
              ref={catalogBtnRef}
              className={`btn-ui secondary ${catalogAnchor ? 'active-popover' : ''}`} 
              onClick={() => setCatalogAnchor(catalogAnchor ? null : catalogBtnRef.current)}
              title="Open Catalog Choice"
            >
              <ShoppingCart size={18} />
              <span className="hide-text-mobile">Catalog</span>
            </button>
            <button 
              className="btn-ui primary" 
              onClick={() => onNavigate(stateType === 'selection' ? 'create-selection' : stateType === 'order' ? 'create-direct-order' : 'create-order')}
              title={stateType === 'selection' ? 'Create Selection' : 'Create Quotation'}
            >
              <Plus size={18} />
              <span className="hide-text-mobile">
                {stateType === 'selection' ? 'Create Selection' : stateType === 'order' ? 'Create Order' : 'Create Quotation'}
              </span>
            </button>
          </div>
        </div>

        <div className="dt-controls">
           <div className="dt-flex">
              <span className="text-sm text-slate-600">Show</span>
              <select 
                className="entries-select border border-slate-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                value={entriesPerPage}
                onChange={(e) => { setEntriesPerPage(Number(e.target.value)); setCurrentPage(1); }}
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
              </select>
              <span className="text-sm text-slate-600">entries</span>
           </div>
           <div className="dt-flex">
              <span className="text-sm text-slate-600">Search:</span>
              <input 
                type="text" 
                className="search-input border border-slate-300 rounded px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500 w-full max-w-[200px] bg-white"
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              />
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
          <div className="table-wrapper-fixed-outer" style={{ width: '100%', maxWidth: '100%', overflow: 'hidden', border: '1px solid #e2e8f0', borderRadius: '12px' }}>
            <div className="table-wrapper-scrollable-inner" style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch', display: 'block', width: '100%' }}>
              <table className="products-datatable" style={{ width: '100%', minWidth: '950px', borderCollapse: 'collapse' }}>
                <thead className="bg-[#fcfcfc] border-b text-slate-700 uppercase tracking-tight text-[11px] font-bold">
                  <tr>
                    <th className="py-3 px-4 text-left border-none">Number</th>
                    <th className="py-3 px-4 text-left border-none">Customer</th>
                    <th className="py-3 px-4 text-center border-none">Date</th>
                    <th className="py-3 px-4 text-left border-none">Architect</th>
                    <th className="py-3 px-4 text-left border-none">Electrician</th>
                    <th className="py-3 px-4 text-center border-none">Status</th>
                    <th className="py-3 px-4 text-center w-36 border-none">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-[13px] text-slate-600">
                  {currentItems.map((order, idx) => (
                    <tr 
                      key={order.id} 
                      className="row-hover"
                      onClick={() => onNavigate('order-detail', order.id)}
                    >
                      <td className="py-3 px-4 font-bold text-slate-800 text-[12px]" data-label="Number">{order.name}</td>
                      <td className="py-3 px-4" data-label="Customer">
                        <div className="font-semibold text-slate-700">{order.customer || '-'}</div>
                        {order.phone && <div className="text-[11px] text-slate-400 mt-0.5">{order.phone}</div>}
                      </td>
                      <td className="py-3 px-4 text-center" data-label="Date">{order.order_date || '-'}</td>
                      <td className="py-3 px-4" data-label="Architect">{order.architect || '-'}</td>
                      <td className="py-3 px-4" data-label="Electrician">{order.electrician || '-'}</td>
                      <td className="py-3 px-4 text-center" data-label="Status">
                        <span className={`status-pill status-${order.status} px-2 py-1 rounded text-[10px] font-bold uppercase`}>
                          {order.status}
                        </span>
                      </td>
                      <td 
                        className="py-4 px-4 border-none" 
                        data-label="Action" 
                        onClick={(e) => e.stopPropagation()}
                        onMouseEnter={() => setOpenDropdownId(order.id)}
                        onMouseLeave={() => setOpenDropdownId(null)}
                      >
                        <div className="flex justify-center">
                          <div className="relative">
                            <button 
                              className={`p-2 rounded-full transition-all duration-200 ${openDropdownId === order.id ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-50 text-slate-400 hover:bg-slate-100 hover:text-slate-600'}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                setOpenDropdownId(openDropdownId === order.id ? null : order.id);
                              }}
                            >
                              <ChevronDown size={18} className={`transition-transform duration-200 ${openDropdownId === order.id ? 'rotate-90' : ''}`} />
                            </button>

                            {openDropdownId === order.id && (
                              <div 
                                className="action-dropdown-popover"
                                onMouseEnter={() => setOpenDropdownId(order.id)}
                                onMouseLeave={() => setOpenDropdownId(null)}
                                onClick={(e) => e.stopPropagation()}
                              >
                                {(order.status === 'draft' || order.status === 'sent' || order.status === 'selection') && (
                                  <button 
                                    className="btn-action-soft btn-edit-soft"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setOpenDropdownId(null);
                                      onNavigate(order.status === 'selection' ? 'create-selection' : 'create-order', order.id);
                                    }}
                                  >
                                    <Edit size={14} />
                                    <span>{order.status === 'selection' ? 'Edit Selection' : 'Edit Detail'}</span>
                                  </button>
                                )}
                                
                                {(order.status === 'draft' || order.status === 'sent') && (
                                    <button 
                                      className="btn-action-soft btn-confirm-soft"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setOpenDropdownId(null);
                                        handleConfirm(order.id);
                                      }}
                                    >
                                      <CheckCircle size={14} />
                                      <span>Confirm Order</span>
                                    </button>
                                )}

                                {(order.status === 'draft' || order.status === 'sent' || order.status === 'sale') && (
                                    <button 
                                      className="btn-action-soft btn-cancel-soft"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setOpenDropdownId(null);
                                        handleDecline(order.id);
                                      }}
                                    >
                                      <XCircle size={14} />
                                      <span>{order.status === 'sale' ? 'Cancel Order' : 'Cancel Quotation'}</span>
                                    </button>
                                )}
                              </div>
                            )}
                          </div>
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
          </div>
        )}

        <div className="datatable-footer mt-6 dt-flex-between">
          <div className="entries-info text-sm text-slate-500 font-medium">
            Showing {totalEntries > 0 ? indexOfFirstItem + 1 : 0} to {Math.min(indexOfLastItem, totalEntries)} of {totalEntries} entries
          </div>
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
    </div>
  );
};

export default Orders;
