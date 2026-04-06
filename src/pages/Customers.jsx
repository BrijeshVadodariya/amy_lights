import React, { useState, useEffect } from 'react';
import { Search, Plus, User, Phone, Mail, MapPin, Clock, UserPlus, MoreVertical, ShoppingCart, Filter } from 'lucide-react';
import { odooService } from '../services/odoo';
import Loader from '../components/Loader';
import '../components/Loader.css';
import './Customers.css';

const Customers = ({ onNavigate }) => {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [entriesPerPage, setEntriesPerPage] = useState(16);
  const [currentPage, setCurrentPage] = useState(1);
  const [isMobile, setIsMobile] = useState(() => (
    typeof window !== 'undefined' ? window.innerWidth <= 768 : false
  ));

  // Consistent color palette from Odoo screenshot
  const avatarColors = [
      '#9e7798', '#634ca6', '#4a76ba', '#4ca698', '#669a47', 
      '#998d4a', '#a16d3f', '#a14d4d', '#784373', '#3d5482'
  ];

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const data = await odooService.getPartners();
      setCustomers(Array.isArray(data) ? data : (data.partners || []));
    } catch (err) {
      console.error("Failed to fetch customers", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  const filtered = customers.filter(c => {
    const search = searchTerm.toLowerCase();
    return (
      String(c.name || '').toLowerCase().includes(search) || 
      String(c.mobile || '').toLowerCase().includes(search) ||
      String(c.phone || '').toLowerCase().includes(search) ||
      String(c.email || '').toLowerCase().includes(search)
    );
  });

  const totalEntries = filtered.length;
  const totalPages = Math.ceil(totalEntries / entriesPerPage);
  const indexOfLastItem = currentPage * entriesPerPage;
  const indexOfFirstItem = indexOfLastItem - entriesPerPage;
  const currentItems = filtered.slice(indexOfFirstItem, indexOfLastItem);

  const handlePageChange = (pageNo) => {
    if (pageNo >= 1 && pageNo <= totalPages) {
       setCurrentPage(pageNo);
       window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const getInitials = (name) => {
    if (!name) return '?';
    return name.charAt(0).toUpperCase();
  };

  const getColor = (id) => {
    return avatarColors[id % avatarColors.length];
  };

  const renderPagination = () => {
    if (totalPages <= 1) return null;
    const pages = [];
    pages.push(
      <button key="prev" className="canban-page-btn" onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage === 1}>
        Prev
      </button>
    );
    const maxVisible = isMobile ? 3 : 5;
    let start = Math.max(1, currentPage - Math.floor(maxVisible / 2));
    let end = Math.min(totalPages, start + maxVisible - 1);
    
    if (end - start < maxVisible - 1) {
        start = Math.max(1, end - maxVisible + 1);
    }

    for (let i = start; i <= end; i++) {
        pages.push(
          <button key={i} className={`canban-page-btn ${currentPage === i ? 'active' : ''}`} onClick={() => handlePageChange(i)}>
            {i}
          </button>
        );
    }
    pages.push(
      <button key="next" className="canban-page-btn" onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage === totalPages}>
        Next
      </button>
    );
    return pages;
  };

  return (
    <div className="kanban-page">
      <div className="kanban-header">
        <div className="kanban-header-left">
           <h2>Customers</h2>
           <span className="kanban-count">{totalEntries}</span>
        </div>
        
        <div className="kanban-header-right">
           <div className="search-container">
             <Search size={14} />
             <input 
                type="text" 
                placeholder="Search..." 
                className="kanban-search-input"
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
             />
           </div>
           <button 
             className="btn-new"
             onClick={() => onNavigate('create-customer')}
           >
             <Plus size={16} />
             <span>NEW</span>
           </button>
        </div>
      </div>

      {loading ? (
        <div className="py-20 flex flex-col items-center">
            <Loader message="Loading directory..." />
        </div>
      ) : (
        <div className="kanban-container">
          {currentItems.map((c) => (
            <div 
                key={c.id} 
                className="kanban-card"
                onClick={() => onNavigate('catalog', c.id, { fromTab: 'customers' })}
            >
                <div 
                    className="kanban-avatar-side"
                    style={{ background: getColor(c.id) }}
                >
                    {getInitials(c.name)}
                    {(c.is_architect || c.is_electrician) && (
                        <div className="type-overlay">
                            {c.is_architect ? 'A' : 'E'}
                        </div>
                    )}
                </div>

                <div className="kanban-content-side">
                    <h3 className="kanban-card-title">{c.name}</h3>
                    
                    <div className="kanban-info-stack">
                        {c.email && (
                            <div className="kanban-row">
                                <Mail size={12} />
                                <span>{c.email}</span>
                            </div>
                        )}
                        {(c.mobile || c.phone) && (
                            <div className="kanban-row">
                                <Phone size={12} />
                                <span>{c.mobile || c.phone}</span>
                            </div>
                        )}
                        {(c.city || c.state_name) && (
                            <div className="kanban-row">
                                <MapPin size={12} />
                                <span>{c.city}{c.state_name ? `, ${c.state_name}` : ''}</span>
                            </div>
                        )}
                    </div>

                    <div className="kanban-footer">
                         <Clock size={12} />
                    </div>

                    <div className="kanban-actions" onClick={e => e.stopPropagation()}>
                         <button 
                            className="action-dot-btn" 
                            title="Create Order" 
                            onClick={() => onNavigate('create-order', null, { partner_id: c.id })}
                         >
                            <ShoppingCart size={14} />
                         </button>
                         <button className="action-dot-btn">
                            <MoreVertical size={14} />
                         </button>
                    </div>
                </div>
            </div>
          ))}
          {currentItems.length === 0 && (
            <div style={{ gridColumn: '1/-1', padding: '100px', textAlign: 'center', color: '#94a3b8', fontSize: '14px', fontStyle: 'italic' }}>
                No records found.
            </div>
          )}
        </div>
      )}

      {!loading && (
        <div className="canban-pagination-footer">
           <div className="canban-pagination-info">
              Showing {indexOfFirstItem + 1} - {Math.min(indexOfLastItem, totalEntries)} of {totalEntries}
           </div>
           <div className="canban-pagination-btns">
              {renderPagination()}
           </div>
        </div>
      )}
    </div>
  );
};

export default Customers;
