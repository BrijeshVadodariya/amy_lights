import React, { useState, useEffect } from 'react';
import { ShoppingCart, Plus, Search, Filter, Box, Eye, Edit, Trash2, ChevronLeft, ChevronRight, ChevronDown } from 'lucide-react';
import { odooService } from '../services/odoo';
import Loader from '../components/Loader';
import '../components/Loader.css';
import './Products.css';
import './Catalog.css';

const Products = ({ onNavigate }) => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [entriesPerPage, setEntriesPerPage] = useState(20);
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
        setProducts(prev => {
          const ids = new Set(prev.map(p => p.id));
          const uniqueNew = dataAll.filter(p => !ids.has(p.id));
          return [...prev, ...uniqueNew];
        });
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
    <div className="dt-page products-page">
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
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
              <span className="dt-control-label">entries</span>
            </div>
            
            <div className="dt-flex dt-search-box">
              <span className="dt-control-label">Search:</span>
              <input 
                type="text" 
                className="search-input"
                placeholder="Search products..."
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              />
            </div>
          </div>

          <div className="dt-toolbar-right">
            <button className="btn-ui primary" onClick={() => onNavigate('create-product')}>
              <Plus size={18} />
              <span>Add Product</span>
            </button>
          </div>
        </div>



        {loadingRest && (
           <div className="h-1 w-full bg-indigo-50 relative overflow-hidden mb-4">
              <div className="absolute h-full bg-indigo-500 animate-[loading-bar_2s_infinite]" style={{ width: '40%' }}></div>
           </div>
        )}
        <div className="product-view-gallery mt-2">
          {filtered.length === 0 ? (
            <div className="py-20 text-center text-slate-400">
              <Box size={48} className="mx-auto mb-4 opacity-20" />
              <p>No products found matching your search.</p>
            </div>
          ) : (
            <div className="catalog-grid">
              {currentItems.map(p => (
                <div 
                  key={p.id} 
                  className="catalog-product-card cursor-pointer group" 
                  onClick={() => onNavigate('product-detail', p.id)}
                >
                   <div className="product-media-wrapper">
                      {p.image_url ? (
                        <img 
                          src={getImageUrl(p.image_url)} 
                          alt={p.name} 
                          className="product-img group-hover:scale-110 transition-transform duration-500" 
                        />
                      ) : (
                        <div className="flex items-center justify-center text-slate-200">
                          <Box size={48} />
                        </div>
                      )}
                      
                      <div className="product-eye-overlay">
                         <div className="eye-badge">
                            <Eye size={16} />
                         </div>
                      </div>
                   </div>

                   <div className="product-info-section">
                      <div className="flex items-center justify-between mb-1">
                        <span className="product-category-label">{p.category || 'Standard'}</span>
                      </div>
                      
                      <h4 className="product-name-heading" title={p.name}>
                        {p.name}
                      </h4>
                      
                      <p className="product-sku-code">
                        {p.default_code || '---'}
                      </p>
                      
                      <div className="product-price-qty-row">
                        <span className="product-price-display">
                          {p.currency_symbol || '₹'}{p.price?.toLocaleString()}
                        </span>
                        
                        <div className="card-details-label flex-inline items-center gap-1">
                          <span>Details</span>
                          <ChevronRight size={14} />
                        </div>
                      </div>
                   </div>
                </div>
              ))}
            </div>
          )}
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
