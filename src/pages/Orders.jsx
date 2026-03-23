import React, { useState, useEffect, useCallback } from 'react';
import { Search, Plus, Edit, Trash2, CheckCircle, XCircle, ChevronDown, MoreVertical, Eye } from 'lucide-react';
import { odooService } from '../services/odoo';
import './Products.css'; // Global DataTable styles

const Orders = ({ stateType = 'all', onNavigate }) => {
  const [orders, setOrders] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [entriesPerPage, setEntriesPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [openDropdownId, setOpenDropdownId] = useState(null);
  const [isMobile, setIsMobile] = useState(() => (
    typeof window !== 'undefined' ? window.innerWidth <= 768 : false
  ));

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const fetchOrders = useCallback(async () => {
    try {
      const data = await odooService.getOrders(1000, 0, 'date_order desc', stateType);
      setOrders(data.orders || []);
    } catch {
      console.error("Fetch orders failed");
    }
  }, [stateType]);


  useEffect(() => {
    fetchOrders();
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
      const res = isQuotation ? await odooService.confirmQuotation(id) : await odooService.confirmOrder(id);
      if (res.success) {
        alert(`${isQuotation ? 'Quotation' : 'Order'} Confirmed!`);
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
        const res = await odooService.declineQuotation(id);
        if (res.success) { alert("Quotation Declined"); fetchOrders(); }
      } catch { alert("Error declining quotation"); }
    } else {
      const reason = window.prompt("Reason for decline:");
      if (reason === null) return;
      try {
        const res = await odooService.declineOrder(id, reason);
        if (res.success) { alert("Order Declined!"); fetchOrders(); }
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
          {stateType === 'quotation' && (
            <button className="btn-ui primary" onClick={() => onNavigate('create-order')}>
              Create Quotation
            </button>
          )}
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

        <div className="table-wrapper border border-slate-200 rounded-lg">
          <table className="products-datatable w-full">
            <thead className="bg-[#fcfcfc] border-b text-slate-700 uppercase tracking-tight text-[11px] font-bold">
              <tr>
                <th className="py-3 px-4 text-left w-16 border-none">No</th>
                <th className="py-3 px-4 text-left border-none">{stateType === 'quotation' ? 'Quotation #' : 'Sale Order #'}</th>
                <th className="py-3 px-4 text-left border-none">Customer</th>
                <th className="py-3 px-4 text-center border-none">Date</th>
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
                  <td className="py-3 px-4" data-label="No">{indexOfFirstItem + idx + 1}</td>
                  <td className="py-3 px-4 font-bold text-slate-800 text-[12px]" data-label={stateType === 'quotation' ? 'Quotation #' : 'Sale Order #'}>{order.name}</td>
                  <td className="py-3 px-4 font-medium text-slate-700" data-label="Customer">{order.customer || '-'}</td>
                  <td className="py-3 px-4 text-center" data-label="Date">{order.order_date}</td>
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
                          onClick={(e) => e.stopPropagation()}
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
                            <button 
                              className="btn-action-soft btn-edit-soft"
                              onClick={(e) => {
                                e.stopPropagation();
                                setOpenDropdownId(null);
                                onNavigate('order-detail', order.id);
                              }}
                            >
                              <Eye size={14} />
                              <span>View Detail</span>
                            </button>

                            {(order.status === 'draft' || order.status === 'sent') && (
                              <button 
                                className="btn-action-soft btn-edit-soft"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setOpenDropdownId(null);
                                  onNavigate('create-order', order.id);
                                }}
                              >
                                <Edit size={14} />
                                <span>Edit Detail</span>
                              </button>
                            )}
                            
                            {(stateType === 'quotation' || order.status === 'draft' || order.status === 'sent') && (
                              <>
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
                                
                                <button 
                                  className="btn-action-soft btn-cancel-soft"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setOpenDropdownId(null);
                                    handleDecline(order.id);
                                  }}
                                >
                                  <XCircle size={14} />
                                  <span>Cancel Order</span>
                                </button>
                              </>
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
                   <td colSpan="6" className="py-8 text-center text-slate-400">
                      No records found matching your request.
                   </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="datatable-footer mt-6 dt-flex-between">
           <div className="entries-info text-sm text-slate-500 font-medium">
             Showing {totalEntries > 0 ? indexOfFirstItem + 1 : 0} to {Math.min(indexOfLastItem, totalEntries)} of {totalEntries} entries
           </div>
           <div className="pagination dt-flex border border-slate-300 rounded overflow-hidden">
              {renderPagination()}
           </div>
        </div>
      </div>
    </div>
  );
};

export default Orders;
