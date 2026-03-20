import React, { useState, useEffect } from 'react';
import { ShoppingCart, Plus, Search, Filter, Box, Eye, Edit, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
import { odooService } from '../services/odoo';
import './Products.css';

const Products = ({ onNavigate }) => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [entriesPerPage, setEntriesPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
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
      const data = await odooService.getProducts();
      setProducts(data || []);
    } finally {
      setLoading(false);
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

  if (loading) return <div className="p-8">Loading Product Catalog...</div>;

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

        <div className="table-wrapper overflow-x-auto border border-slate-200 rounded-lg">
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
                <tr key={product.id} className="hover:bg-slate-50 transition-colors">
                  <td className="py-3 px-4" data-label="No">{indexOfFirstItem + idx + 1}</td>
                  <td className="py-3 px-4 min-w-[240px]" data-label="Name">
                    <div className="dt-flex">
                      <div className="product-thumb w-10 h-10 rounded border border-slate-100 overflow-hidden bg-slate-50 flex-shrink-0 flex items-center justify-center">
                         {product.image_url ? (
                           <img src={product.image_url} alt="" className="w-full h-full object-contain" />
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
                  <td className="py-3 px-4" data-label="Action">
                    <div className="action-buttons-container">
                      <button className="action-box-btn view" title="View" onClick={() => onNavigate('product-detail', product.id)}>
                        <Eye size={14} />
                      </button>
                      <button className="action-box-btn edit" title="Edit">
                        <Edit size={14} />
                      </button>
                      <button className="action-box-btn delete" title="Delete">
                        <Trash2 size={14} />
                      </button>
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
