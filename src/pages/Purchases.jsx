import React, { useState, useEffect, useCallback } from 'react';
import { 
  Search, Eye, Printer, Filter, ShoppingCart, 
  Calendar, ChevronDown, List as ListIcon, X, 
  CheckCircle, XCircle, ArrowRight
} from 'lucide-react';
import { createPortal } from 'react-dom';
import { odooService } from '../services/odoo';
import Loader from '../components/Loader';
import './Products.css'; 

const Purchases = ({ onNavigate }) => {
  const [purchases, setPurchases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [entriesPerPage, setEntriesPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [openDropdownId, setOpenDropdownId] = useState(null);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0 });
  const [isMobile, setIsMobile] = useState(() => (
    typeof window !== 'undefined' ? window.innerWidth <= 768 : false
  ));
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const fetchPurchases = useCallback(async () => {
    setLoading(true);
    try {
      const data = await odooService.getAllPurchases({ limit: 1000 });
      setPurchases(data || []);
    } catch {
      console.error("Fetch purchases failed");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPurchases();
  }, [fetchPurchases]);

  const filtered = purchases.filter(p => {
    // 1. Date Range Filter
    if (dateFrom || dateTo) {
      if (!p.date_order) return false;
      const [day, month, year] = p.date_order.split('-').map(Number);
      const orderDate = new Date(year, month - 1, day);
      if (dateFrom) {
        const fromDate = new Date(dateFrom);
        if (orderDate < fromDate) return false;
      }
      if (dateTo) {
        const toDate = new Date(dateTo);
        if (orderDate > toDate) return false;
      }
    }

    // 2. Search Filter
    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLowerCase();
    return (
      String(p.name || '').toLowerCase().includes(q)           ||
      String(p.partner_name || '').toLowerCase().includes(q)    ||
      String(p.origin || '').toLowerCase().includes(q)         ||
      String(p.status_label || '').toLowerCase().includes(q)
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

  const renderPagination = () => {
    if (totalPages <= 1) return null;
    const pages = [];
    pages.push(<button key="prev" className="page-btn prev" onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage === 1}>Previous</button>);
    for (let i = 1; i <= totalPages; i++) {
        if (i > 5 && i < totalPages) {
            if (pages[pages.length-1].key !== 'dots') pages.push(<span key="dots" className="px-2">...</span>);
            continue;
        }
        pages.push(<button key={i} className={`page-btn ${currentPage === i ? 'active' : ''}`} onClick={() => handlePageChange(i)}>{i}</button>);
    }
    pages.push(<button key="next" className="page-btn next" onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage === totalPages}>Next</button>);
    return pages;
  };

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
    }).format(val);
  };

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
                placeholder="Search PO, Vendor, Origin..."
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
              </div>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center">
             <Loader message="Loading Purchases..." />
          </div>
        ) : (
          <div className="table-wrapper">
            <table className="products-datatable">
              <thead>
                <tr>
                  <th className="text-center" style={{ width: '50px' }}>Sr.No</th>
                  <th style={{ width: '150px' }}>PO Number</th>
                  <th style={{ width: '250px' }}>Vendor</th>
                  <th style={{ width: '120px' }}>Origin</th>
                  <th style={{ width: '100px' }}>Date</th>
                  <th style={{ width: '120px' }}>Total</th>
                  <th style={{ width: '120px' }}>Status</th>
                  <th className="text-center" style={{ width: '80px' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {currentItems.map((po, idx) => (
                  <tr 
                    key={po.id} 
                    onClick={() => onNavigate('purchase-detail', po.id)}
                    className="hover:bg-slate-50 transition-colors cursor-pointer"
                  >
                    <td className="text-center cell-light" style={{ fontSize: '12px' }}>
                      {indexOfFirstItem + idx + 1}
                    </td>
                    <td className="cell-highlight font-black">
                      {po.name}
                    </td>
                    <td className="cell-highlight">
                      <div className="font-bold text-slate-800">{po.partner_name}</div>
                    </td>
                    <td className="cell-light" style={{ fontSize: '12px' }}>
                      {po.origin || '-'}
                    </td>
                    <td className="cell-light" style={{ fontSize: '12px' }}>
                      {po.date_order}
                    </td>
                    <td className="cell-highlight text-indigo-600 font-bold">
                      {formatCurrency(po.amount_total)}
                    </td>
                    <td>
                        <span className={`status-step active`} 
                                      style={{ transform: 'none', padding: '4px 10px', margin: 0, borderRadius: '6px', fontSize: '10px', fontWeight: 800,
                                              backgroundColor: po.state === 'purchase' || po.state === 'done' ? '#dcfce7' : '#fef3c7', 
                                              color: po.state === 'purchase' || po.state === 'done' ? '#16a34a' : '#d97706' }}>
                                    {po.status_label || po.state}
                        </span>
                    </td>
                    <td className="text-center">
                        <button className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                            <Eye size={16} className="text-slate-500" />
                        </button>
                    </td>
                  </tr>
                ))}
                {currentItems.length === 0 && (
                  <tr>
                    <td colSpan="8" className="py-20 text-center text-slate-400">
                      No purchase orders found matching your filters.
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
    </div>
  );
};

export default Purchases;
