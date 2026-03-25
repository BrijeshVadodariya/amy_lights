import React, { useState, useEffect } from 'react';
import { ShoppingBag, Eye, Edit, Trash2, Search, RefreshCcw, ChevronDown } from 'lucide-react';
import { odooService } from '../services/odoo';
import Loader from '../components/Loader';
import '../components/Loader.css';
import './Products.css'; // Global DataTable styles

const PurchaseOrders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [entriesPerPage, setEntriesPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [openDropdownId, setOpenDropdownId] = useState(null);
  const [isMobile, setIsMobile] = useState(() => (
    typeof window !== 'undefined' ? window.innerWidth <= 768 : false
  ));

  useEffect(() => {
    fetchOrders();
  }, []);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const res = await odooService.getPurchaseOrders(1000, 0);
      setOrders(res.orders || []);
    } catch (err) {
      console.error("Fetch PO failed", err);
    } finally {
      setLoading(false);
    }
  };

  const filtered = orders.filter(o => 
    o.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    o.vendor?.toLowerCase().includes(searchTerm.toLowerCase())
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

  const renderPagination = () => {
    if (totalPages <= 1) return null;
    const pages = [];
    pages.push(
      <button key="prev" className="page-btn prev" onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage === 1}>
        Previous
      </button>
    );

    const maxVisiblePages = isMobile ? 3 : 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
    
    if (endPage - startPage < maxVisiblePages - 1) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
       pages.push(
         <button key={i} className={`page-btn ${currentPage === i ? 'active' : ''}`} onClick={() => handlePageChange(i)}>
           {i}
         </button>
       );
    }

    pages.push(
      <button key="next" className="page-btn next" onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage === totalPages}>
        Next
      </button>
    );

    return pages;
  };

  if (loading) return (
    <div className="dt-page p-6 flex flex-col items-center justify-center min-h-[60vh]">
      <Loader message="Loading Purchase Orders..." />
    </div>
  );

  return (
    <div className="dt-page">
      <div className="dt-card">
        <div className="dt-header">
          <h2>Purchase Orders</h2>
          <button className="btn-ui primary">
            Create RFQ
          </button>
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
                <th className="py-3 px-4 text-left border-none">Purchase Order #</th>
                <th className="py-3 px-4 text-left border-none">Vendor</th>
                <th className="py-3 px-4 text-left border-none">Date</th>
                <th className="py-3 px-4 text-right border-none">Total</th>
                <th className="py-3 px-4 text-left border-none">Status</th>
                <th className="py-3 px-4 text-center w-36 border-none">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-[13px] text-slate-600">
              {currentItems.map((order, idx) => (
                <tr key={order.id} className="row-hover">
                  <td className="py-3 px-4" data-label="No">{indexOfFirstItem + idx + 1}</td>
                  <td className="py-3 px-4 font-bold text-slate-800 text-[12px]" data-label="Purchase Order #">{order.name}</td>
                  <td className="py-3 px-4 font-medium text-slate-700" data-label="Vendor">{order.vendor || '-'}</td>
                  <td className="py-3 px-4" data-label="Date">{order.order_date}</td>
                  <td className="py-3 px-4 text-right font-medium text-slate-800" data-label="Total">
                    {order.currency_symbol} {order.amount_total?.toLocaleString()}
                  </td>
                  <td className="py-3 px-4" data-label="Status">
                    <span className={`status-pill status-${order.status} px-2 py-1 rounded text-[10px] font-bold uppercase`}>
                      {order.status}
                    </span>
                  </td>
                  <td 
                    className="py-4 px-4 border-none text-center" 
                    data-label="Action"
                    onMouseEnter={() => setOpenDropdownId(order.id)}
                    onMouseLeave={() => setOpenDropdownId(null)}
                  >
                    <div className="flex justify-center">
                      <div className="relative">
                        <button 
                          className={`p-2 rounded-full transition-all duration-200 ${openDropdownId === order.id ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-50 text-slate-400 hover:bg-slate-100 hover:text-slate-600'}`}
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
                                // View PO logic to be implemented
                              }}
                            >
                              <Eye size={14} />
                              <span>View Order</span>
                            </button>

                            <button 
                              className="btn-action-soft btn-edit-soft"
                              onClick={(e) => {
                                e.stopPropagation();
                                setOpenDropdownId(null);
                                // Edit PO logic to be implemented
                              }}
                            >
                              <Edit size={14} />
                              <span>Edit Detail</span>
                            </button>
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

export default PurchaseOrders;
