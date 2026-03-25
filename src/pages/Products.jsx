import React, { useState, useEffect } from 'react';
import { ShoppingCart, Plus, Search, Filter, Box, Eye, Edit, Trash2, ChevronLeft, ChevronRight, ChevronDown } from 'lucide-react';
import { odooService } from '../services/odoo';
import Loader from '../components/Loader';
import '../components/Loader.css';
import './Products.css';

const Products = ({ onNavigate }) => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [entriesPerPage, setEntriesPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [loadingRest, setLoadingRest] = useState(false);
  const [openDropdownId, setOpenDropdownId] = useState(null);
  const dropdownRef = React.useRef(null);
  const [isMobile, setIsMobile] = useState(() => (
    typeof window !== 'undefined' ? window.innerWidth <= 768 : false
  ));

  useEffect(() => {
    fetchProducts();
  }, []);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const fetchProducts = async () => {
    try {
      // Step 1: Fetch first 50
      const data50 = await odooService.getProducts(50, 0);
      setProducts(data50 || []);
      setLoading(false); // Render first 50 immediately

      // Step 2: Fetch rest in background
      setLoadingRest(true);
      const dataAll = await odooService.getProducts(10000, 50);
      if (dataAll && dataAll.length > 0) {
        setProducts(prev => [...prev, ...dataAll]);
      }
    } catch (err) {
      console.error("Products fetch failed", err);
    } finally {
      setLoading(false);
      setLoadingRest(false);
    }
  };

  const filtered = products.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (p.default_code && p.default_code.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const totalEntries = filtered.length;
  const totalPages = Math.ceil(totalEntries / entriesPerPage);
  const indexOfLastItem = currentPage * entriesPerPage;
  const indexOfFirstItem = indexOfLastItem - entriesPerPage;
  const currentItems = filtered.slice(indexOfFirstItem, indexOfLastItem);

  const getImageUrl = (url) => {
    if (!url) return null;
    const token = localStorage.getItem('odoo_session_id') || '';
    const db = import.meta.env.VITE_ODOO_DB || 'stage';
    return `${url}?token=${token}&db=${db}`;
  };

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

  if (loading) {
    return (
      <div className="dt-page p-6 flex flex-col items-center justify-center min-h-[60vh]">
        <Loader message="Synchronizing Product Data..." />
        <div className="dt-card w-full mt-12 opacity-30 pointer-events-none">
           <div className="table-wrapper border border-slate-200 rounded-lg overflow-hidden">
              <div className="h-12 bg-slate-50 border-b border-slate-200"></div>
              {[...Array(6)].map((_, i) => (
                 <div key={i} className="flex p-4 border-b border-slate-100 gap-4">
                    <div className="h-4 w-8 bg-slate-50 animate-pulse rounded"></div>
                    <div className="h-4 flex-1 bg-slate-50 animate-pulse rounded"></div>
                 </div>
              ))}
           </div>
        </div>
      </div>
    );
  }

  return (
    <div className="dt-page">
      <div className="dt-card">
        <div className="dt-header">
          <h2>Products</h2>
          <button className="btn-ui primary" onClick={() => onNavigate('create-product')}>
            Add New
          </button>
        </div>

        <div className="dt-controls">
           <div className="entries-per-page">
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
           <div className="search-control">
              <label className="search-label" htmlFor="products-search">Search</label>
              <input 
                 id="products-search"
                  type="text" 
                  className="search-input"
                  placeholder="Search by name or code"
                  value={searchTerm}
                  onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
               />
           </div>
        </div>

        {loadingRest && (
           <div className="h-1 w-full bg-indigo-50 relative overflow-hidden mb-4">
              <div className="absolute h-full bg-indigo-500 animate-[loading-bar_2s_infinite]" style={{ width: '40%' }}></div>
           </div>
        )}

        <div className="table-wrapper border border-slate-200 rounded-lg">
          <table className="products-datatable w-full">
            <thead className="bg-[#fcfcfc] border-b text-slate-700 uppercase tracking-tight text-[11px] font-bold">
              <tr>
                <th className="py-3 px-4 text-left w-16">No</th>
                <th className="py-3 px-4 text-left">Name</th>
                <th className="py-3 px-4 text-left">File</th>
                <th className="py-3 px-4 text-left">Product Code</th>
                <th className="py-3 px-4 text-left">Unit</th>
                <th className="py-3 px-4 text-right">Price</th>
                <th className="py-3 px-4 text-center w-36 border-none">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-[13px] text-slate-600">
              {currentItems.map((product, idx) => (
                <tr 
                  key={product.id} 
                  className="row-hover"
                  onClick={() => onNavigate('product-detail', product.id)}
                >
                  <td className="py-3 px-4" data-label="No">{indexOfFirstItem + idx + 1}</td>
                  <td className="py-3 px-4 min-w-[240px]" data-label="Name">
                    <div className="dt-flex">
                      <div className="product-thumb w-10 h-10 rounded border border-slate-100 overflow-hidden bg-slate-50 flex-shrink-0 flex items-center justify-center">
                         {product.image_url ? (
                           <img src={getImageUrl(product.image_url)} alt="" className="w-full h-full object-contain" onError={(e)=>{e.target.src='/placeholder-img.png'}} />
                         ) : (
                           <Box size={18} className="text-slate-300 opacity-60" />
                         )}
                      </div>
                      <span className="font-medium text-slate-800 uppercase text-[12px]">{product.name}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-slate-400" data-label="File">{product.file_name || '-'}</td>
                  <td className="py-3 px-4 font-mono text-[12px]" data-label="Product Code">{product.default_code || '-'}</td>
                  <td className="py-3 px-4" data-label="Unit">{product.uom || 'Unit'}</td>
                  <td className="py-3 px-4 text-right font-medium text-slate-800" data-label="Price">
                    {product.price?.toLocaleString()}
                  </td>
                  <td 
                    className="py-3 px-4 text-center" 
                    data-label="Action"
                    onMouseEnter={() => setOpenDropdownId(product.id)}
                    onMouseLeave={() => setOpenDropdownId(null)}
                  >
                    <div className="flex justify-center">
                      <div className="relative">
                        <button 
                          className={`p-2 rounded-full transition-all duration-200 ${openDropdownId === product.id ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-50 text-slate-400 hover:bg-slate-100 hover:text-slate-600'}`}
                        >
                          <ChevronDown size={18} className={`transition-transform duration-200 ${openDropdownId === product.id ? 'rotate-90' : ''}`} />
                        </button>

                        {openDropdownId === product.id && (
                          <div 
                            className="action-dropdown-popover"
                            onMouseEnter={() => setOpenDropdownId(product.id)}
                            onMouseLeave={() => setOpenDropdownId(null)}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button 
                              className="btn-action-soft btn-edit-soft"
                              onClick={(e) => {
                                e.stopPropagation();
                                setOpenDropdownId(null);
                                onNavigate('product-detail', product.id);
                              }}
                            >
                              <Eye size={14} />
                              <span>View Product</span>
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

export default Products;
