import React, { useState, useEffect } from 'react';
import { Search, ChevronDown, ChevronLeft, ChevronRight, Filter, ShoppingCart, ArrowLeft, Grid, List as ListIcon, X, Clock, Sparkles, Plus, Minus, Box } from 'lucide-react';
import { odooService } from '../services/odoo';
import Loader from '../components/Loader';
import '../components/Loader.css';
import './Products.css';
import './Catalog.css';

const SearchableSelect = ({ label, options, value, onChange, placeholder, disabled }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const wrapperRef = React.useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredOptions = options.filter(opt => 
    opt.name.toLowerCase().includes(search.toLowerCase())
  );

  const selectedName = options.find(opt => opt.name === value)?.name || value;

  return (
    <div className={`filter-dropdown-v2 ${disabled ? 'is-disabled' : ''}`} ref={wrapperRef}>
      <label>{label}</label>
      <div className="searchable-select-container" onClick={() => !disabled && setIsOpen(!isOpen)}>
        <div className="selected-value">
          {isOpen ? (
            <input
              autoFocus
              className="select-search-input"
              placeholder="Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <span>{selectedName === 'All' ? `All ${label}s` : selectedName}</span>
          )}
        </div>
        <ChevronDown size={14} className={`dropdown-icon ${isOpen ? 'rotate-180' : ''}`} />
      </div>
      
      {isOpen && !disabled && (
        <div className="select-options-overlay">
          <div 
            className={`select-option ${value === 'All' ? 'is-selected' : ''}`}
            onClick={() => { onChange('All'); setIsOpen(false); setSearch(''); }}
          >
            All {label}s
          </div>
          {filteredOptions.map(opt => (
            <div 
              key={opt.id} 
              className={`select-option ${value === opt.name ? 'is-selected' : ''}`}
              onClick={() => { onChange(opt.name); setIsOpen(false); setSearch(''); }}
            >
              {opt.name}
            </div>
          ))}
          {filteredOptions.length === 0 && <div className="no-options">No matches</div>}
        </div>
      )}
    </div>
  );
};

const Catalog = ({ onNavigate, partnerId, extraData }) => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categories, setCategories] = useState([]);
  const [seriesList, setSeriesList] = useState([]);
  const [subSeriesList, setSubSeriesList] = useState([]);
  const [colours, setColours] = useState([]);
  const [wattages, setWattages] = useState([]);
  const [ccts, setCcts] = useState([]);
  const [selectedSeries, setSelectedSeries] = useState('All');
  const [selectedSubSeries, setSelectedSubSeries] = useState('All');
  const [selectedColour, setSelectedColour] = useState('All');
  const [selectedWattage, setSelectedWattage] = useState('All');
  const [selectedCCT, setSelectedCCT] = useState('All');
  const [partner, setPartner] = useState(null);
  const [cart, setCart] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [loadingRest, setLoadingRest] = useState(false);
  const itemsPerPage = 20;

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedSeries, selectedSubSeries, selectedColour, selectedWattage, selectedCCT]);
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Step 1: Fetch FIRST 50 and master data
        const [prodData50, masterData] = await Promise.all([
          odooService.getProducts(50, 0),
          odooService.getMasterData()
        ]);
        
        setProducts(prodData50 || []);
        const allCats = masterData.categories || masterData.series || [];
        setCategories(allCats);
        
        // Filter top-level series (those with no parent or where parent is a list/False)
        const parents = allCats.filter(c => !c.parent_id || (Array.isArray(c.parent_id) && c.parent_id.length === 0));
        setSeriesList(parents);
        
        setColours(masterData.colours || []);
        setWattages(masterData.wattages || []);
        setCcts(masterData.ccts || []);
        
        if (partnerId) {
          const p = (masterData.partners || []).find(p => p.id === parseInt(partnerId));
          setPartner(p);
        }
        
        // Let the first 50 render immediately
        setLoading(false);

        // Step 2: Fetch the rest in the background
        setLoadingRest(true);
        const prodDataAll = await odooService.getProducts(10000, 50);
        if (prodDataAll && prodDataAll.length > 0) {
          setProducts(prev => {
            const existingIds = new Set(prev.map(p => p.id));
            const uniqueRest = prodDataAll.filter(p => !existingIds.has(p.id));
            return [...prev, ...uniqueRest];
          });
        }
      } catch (err) {
        console.error("Catalog fetch failed", err);
      } finally {
        setLoading(false);
        setLoadingRest(false);
      }
    };
    fetchData();
  }, [partnerId]);

  const filtered = (products || []).filter(p => {
    const searchVal = (searchTerm || '').toLowerCase();
    const nameStr = (p.name || '').toLowerCase();
    const codeStr = (p.default_code || p.code || '').toLowerCase();
    
    const matchesSearch = !searchTerm || nameStr.includes(searchVal) || codeStr.includes(searchVal);
    const pSeries = p.series || p.category || '';
    
    // Logic for hierarchical match
    let matchesSeries = true;
    if (selectedSeries !== 'All') {
      // Find the selected series category record
      const seriesRec = seriesList.find(s => s.name === selectedSeries);
      if (seriesRec) {
        // Find all child categories of this parent
        const childIds = categories.filter(c => 
          c.id === seriesRec.id || 
          (c.parent_id && Array.isArray(c.parent_id) && c.parent_id[0] === seriesRec.id) ||
          (c.parent_id === seriesRec.id)
        ).map(c => c.name);
        
        matchesSeries = childIds.includes(pSeries);
      }
    }

    const matchesSubSeries = selectedSubSeries === 'All' || pSeries === selectedSubSeries;
    const matchesColour = selectedColour === 'All' || p.colour === selectedColour;
    const matchesWattage = selectedWattage === 'All' || p.wattage === selectedWattage;
    const matchesCCT = selectedCCT === 'All' || p.cct === selectedCCT;

    return matchesSearch && matchesSeries && matchesSubSeries && matchesColour && matchesWattage && matchesCCT;
  });

  const toggleCart = (product, qty = 1) => {
    setCart(prev => {
      const exists = prev.find(p => p.id === product.id);
      if (exists) {
        return prev.filter(p => p.id !== product.id);
      }
      return [...prev, { ...product, qty }];
    });
  };

  const updateCartQty = (productId, delta) => {
    setCart(prev => prev.map(item => {
      if (item.id === productId) {
        const newQty = Math.max(1, item.qty + delta);
        return { ...item, qty: newQty };
      }
      return item;
    }));
  };

  const handleQtyChange = (productId, val) => {
    const n = parseInt(val) || 1;
    setCart(prev => prev.map(item => {
      if (item.id === productId) {
        return { ...item, qty: Math.max(1, n) };
      }
      return item;
    }));
  };

  const handleConvert = (type) => {
    if (cart.length === 0) return;
    const extra = {
      preFilledPartnerId: partnerId,
      preFilledProducts: cart.map(item => ({
        productId: item.id,
        qty: item.qty,
        price: item.price,
        name: item.name
      }))
    };
    onNavigate(type, null, extra);
  };

  const getImageUrl = (p) => {
    if (!p || !p.image_url) return null;
    const token = localStorage.getItem('odoo_session_id') || '';
    const db = import.meta.env.VITE_ODOO_DB || 'stage';
    
    return `${p.image_url}?token=${token}&db=${db}`;
  };

  const fromTab = extraData?.fromTab || (partnerId ? 'customers' : 'quotations');

  return (
    <div className="catalog-page" style={{ paddingBottom: cart.length > 0 ? '120px' : '40px' }}>
      <div className="dt-card">
        {/* Unified Header with Premium Design */}
        <div className="catalog-header-main">
          <div className="catalog-header-top">
            <div className="catalog-title-group">
              <button 
                className="catalog-back-btn" 
                onClick={() => onNavigate(fromTab)}
                aria-label="Go Back"
              >
                <ArrowLeft size={20} />
              </button>
              <h2>Catalog</h2>
            </div>
          </div>

          <div className="catalog-filters-stack">
            {/* Row 1: Search Only */}
            <div className="catalog-search-row">
              <div className="catalog-search-container">
                <Search className="catalog-search-icon" size={18} />
                <input 
                  type="text" 
                  className="catalog-search-input"
                  placeholder="Search products by identity, code or specs..." 
                  value={searchTerm}
                  onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                />
              </div>
            </div>

            {/* Row 2: One-Row Professional Searchable Filters */}
            <div className="catalog-filters-row">
              <SearchableSelect 
                label="Series"
                options={seriesList}
                value={selectedSeries}
                onChange={(val) => {
                  setSelectedSeries(val);
                  setSelectedSubSeries('All');
                  if (val === 'All') {
                    setSubSeriesList([]);
                  } else {
                    const parent = seriesList.find(c => c.name === val);
                    if (parent) {
                      const children = categories.filter(c => 
                        (c.parent_id && Array.isArray(c.parent_id) && c.parent_id[0] === parent.id) ||
                        (c.parent_id === parent.id)
                      );
                      setSubSeriesList(children);
                    }
                  }
                }}
              />

              <SearchableSelect 
                label="Sub Series"
                options={subSeriesList}
                value={selectedSubSeries}
                disabled={selectedSeries === 'All'}
                onChange={setSelectedSubSeries}
              />

              <SearchableSelect 
                label="Colour"
                options={colours}
                value={selectedColour}
                onChange={setSelectedColour}
              />

              <SearchableSelect 
                label="Watts"
                options={wattages}
                value={selectedWattage}
                onChange={setSelectedWattage}
              />

              <SearchableSelect 
                label="CCT"
                options={ccts}
                value={selectedCCT}
                onChange={setSelectedCCT}
              />
            </div>
          </div>
        </div>
        {loadingRest && (
           <div className="h-1 w-full bg-indigo-50 relative overflow-hidden">
              <div className="absolute h-full bg-indigo-500 animate-[loading-bar_2s_infinite]" style={{ width: '40%' }}></div>
           </div>
        )}

        <div className="page-content">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20">
               <Loader message="Gathering items..." />
               <div className="catalog-grid w-full mt-12 opacity-40 pointer-events-none">
                  {[...Array(8)].map((_, i) => (
                    <div key={i} className="animate-pulse bg-slate-50 border border-slate-200 rounded-2xl h-[320px]" />
                  ))}
               </div>
            </div>
          ) : (
            <>
              <div className="catalog-grid">
                {filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map(p => {
                  const isInCart = cart.find(c => c.id === p.id);
                  return (
                    <div key={p.id} className={`catalog-product-card ${isInCart ? 'is-added' : ''}`}>
                        <div className="product-media-wrapper relative flex items-center justify-center bg-slate-50 overflow-hidden">
                          {p.image_url && (
                            <img 
                              src={getImageUrl(p)} 
                              alt={p.name} 
                              className="product-img relative z-10" 
                              onError={(e) => { 
                                e.target.style.display = 'none';
                              }}
                            />
                          )}
                          
                          {/* Status Badge */}
                          {isInCart && <div className="product-added-badge z-20">Added</div>}

                        {/* Quick Action Button */}
                        <button 
                          className={`card-action-trigger ${isInCart ? 'remove' : 'add'}`}
                          onClick={(e) => { e.stopPropagation(); toggleCart(p); }}
                          title={isInCart ? 'Remove from Selection' : 'Add to Selection'}
                        >
                          {isInCart ? <X size={18} /> : <Plus size={18} />}
                        </button>
                      </div>

                      <div className="product-info-section">
                        <span className="product-category-label">{p.category || 'Standard'}</span>
                        <h4 className="product-name-heading" title={p.name}>{p.name}</h4>
                        <p className="product-sku-code">{p.default_code || 'KC01-07'}</p>
                        
                        <div className="product-price-qty-row">
                          <span className="product-price-display">
                            {p.currency_symbol || '₹'}{p.price.toLocaleString()}
                          </span>
                          
                          {/* Qty Pill - Only if added */}
                          {isInCart && (
                            <div className="qty-pill-controls">
                              <button 
                                className="qty-btn"
                                onClick={(e) => { e.stopPropagation(); updateCartQty(p.id, -1); }}
                              >
                                <Minus size={12} />
                              </button>
                              <input 
                                type="number"
                                className="qty-input-field"
                                value={isInCart.qty}
                                onChange={(e) => { e.stopPropagation(); handleQtyChange(p.id, e.target.value); }}
                                onClick={(e) => e.stopPropagation()}
                              />
                              <button 
                                className="qty-btn"
                                onClick={(e) => { e.stopPropagation(); updateCartQty(p.id, 1); }}
                              >
                                <Plus size={12} />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* No Results Fallback */}
              {filtered.length === 0 && (
                <div style={{ padding: '80px 20px', textAlign: 'center' }}>
                  <Box size={48} style={{ color: '#cbd5e1', marginBottom: '16px' }} />
                  <p style={{ fontSize: '15px', color: '#94a3b8', fontWeight: '600' }}>No products found matching your search.</p>
                </div>
              )}

              {/* Pagination Section */}
              {filtered.length > itemsPerPage && (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '12px', padding: '40px 0' }}>
                  <button 
                    className="catalog-back-btn" 
                    onClick={() => { setCurrentPage(prev => Math.max(1, prev - 1)); window.scrollTo(0,0); }}
                    disabled={currentPage === 1}
                    style={{ opacity: currentPage === 1 ? 0.4 : 1, width: '40px', height: '40px' }}
                  >
                    <ChevronLeft size={18} />
                  </button>
                  <div style={{ fontSize: '13px', fontWeight: '900', color: '#64748b', padding: '0 12px' }}>
                    {currentPage} / {Math.ceil(filtered.length / itemsPerPage)}
                  </div>
                  <button 
                    className="catalog-back-btn" 
                    onClick={() => { setCurrentPage(prev => Math.min(Math.ceil(filtered.length / itemsPerPage), prev + 1)); window.scrollTo(0,0); }}
                    disabled={currentPage === Math.ceil(filtered.length / itemsPerPage)}
                    style={{ opacity: currentPage === Math.ceil(filtered.length / itemsPerPage) ? 0.4 : 1, width: '40px', height: '40px' }}
                  >
                    <ChevronRight size={18} />
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Floating Sticky Footer */}
      {cart.length > 0 && (
        <div className="catalog-floating-footer">
          <div className="footer-inner-wrapper">
            <div className="footer-info-block">
              <div className="count-bubble">{cart.length}</div>
              <div className="footer-text-meta">
                <span className="label">Your Selection</span>
                <span className="amount">
                  {products[0]?.currency_symbol || '₹'}
                  {cart.reduce((sum, item) => sum + (item.price * item.qty), 0).toLocaleString()}
                </span>
              </div>
            </div>

            <div className="footer-actions-group">
              <div className="action-options-pill-v2">
                <button className="option-btn-v2 selection" onClick={() => handleConvert('create-selection')}>
                  Selection
                </button>
                <button className="option-btn-v2 quotation" onClick={() => handleConvert('create-order')}>
                  Quotation
                </button>
                <button className="option-btn-v2 order" onClick={() => handleConvert('create-direct-order')}>
                  Order
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Catalog;
