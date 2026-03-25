import React, { useState, useEffect } from 'react';
import { Search, ChevronDown, ChevronLeft, ChevronRight, Filter, ShoppingCart, ArrowLeft, Grid, List as ListIcon, X, Clock, Sparkles, Plus, Minus, Box } from 'lucide-react';import { odooService } from '../services/odoo';
import './Products.css';
import './Catalog.css'; // Reuse table/grid styles

const Catalog = ({ onNavigate, partnerId }) => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categories, setCategories] = useState([]);
  const [selectedBrand, setSelectedBrand] = useState('All');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedSubCategory, setSelectedSubCategory] = useState('All');
  const [partner, setPartner] = useState(null);
  const [cart, setCart] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 40;

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedBrand, selectedCategory]);
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [prodData, masterData] = await Promise.all([
          odooService.getProducts(),
          odooService.getMasterData()
        ]);
        setProducts(prodData || []);
        setCategories(masterData.categories || []);
        
        if (partnerId) {
          const p = masterData.partners.find(p => p.id === parseInt(partnerId));
          setPartner(p);
        }
      } catch (err) {
        console.error("Catalog fetch failed", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [partnerId]);

  const filtered = (products || []).filter(p => {
    const searchVal = searchTerm.toLowerCase();
    const nameStr = (p.name || '').toLowerCase();
    const codeStr = (p.default_code || '').toLowerCase();
    const matchesSearch = !searchTerm || nameStr.includes(searchVal) || codeStr.includes(searchVal);
    const matchesCategory = selectedCategory === 'All' || p.category === selectedCategory;
    return matchesSearch && matchesCategory;
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
    if (!p.image_url) return null;
    const cleanPath = p.image_url.replace('/web/image/product.product/', '/web/image/product.template/').replace('image_128', 'image_1024');
    if (cleanPath.startsWith('http')) return cleanPath;
    return cleanPath.startsWith('/') ? cleanPath : '/' + cleanPath;
  };

  return (
    <div className="catalog-page" style={{ paddingBottom: cart.length > 0 ? '120px' : '40px' }}>
      <div className="dt-card">
        {/* Unified Header with Premium Design */}
        <div className="catalog-header-main">
          <div className="catalog-header-top">
            <div className="catalog-title-group">
              <button 
                className="catalog-back-btn" 
                onClick={() => window.history.back()}
                aria-label="Go Back"
              >
                <ArrowLeft size={20} />
              </button>
              <h2>Catalog</h2>
            </div>
            <div style={{ padding: '8px 16px', background: '#eff6ff', borderRadius: '12px', fontSize: '11px', fontWeight: '900', color: '#3b82f6', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {filtered.length} Items Found
            </div>
          </div>

          <div className="catalog-controls-row">
            <div className="catalog-search-container">
              <Search className="catalog-search-icon" size={18} />
              <input 
                type="text" 
                className="catalog-search-input"
                placeholder="Search products by identity..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <select 
              className="catalog-filter-select"
              value={selectedCategory} 
              onChange={(e) => { setSelectedCategory(e.target.value); setCurrentPage(1); }}
            >
              <option value="All">All Categories</option>
              {categories.map(c => <option key={c.id || c} value={c.name || c}>{c.name || c}</option>)}
            </select>
          </div>
        </div>

        <div className="page-content">
          {loading ? (
            <div className="catalog-grid">
              {[...Array(12)].map((_, i) => (
                <div key={i} className="animate-pulse bg-slate-50 border border-slate-200 rounded-2xl h-[320px]" />
              ))}
            </div>
          ) : (
            <>
              <div className="catalog-grid">
                {filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map(p => {
                  const isInCart = cart.find(c => c.id === p.id);
                  return (
                    <div key={p.id} className={`catalog-product-card ${isInCart ? 'is-added' : ''}`}>
                      <div className="product-media-wrapper">
                        {p.image_url ? (
                          <img 
                            src={getImageUrl(p)} 
                            alt={p.name} 
                            className="product-img" 
                            onError={(e) => { e.target.src = '/placeholder-img.png'; }}
                          />
                        ) : (
                          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#cbd5e1' }}>
                            <Box size={40} />
                          </div>
                        )}
                        
                        {/* Status Badge */}
                        {isInCart && <div className="product-added-badge">Added</div>}

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
