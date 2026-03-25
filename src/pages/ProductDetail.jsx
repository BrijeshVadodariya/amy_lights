import React, { useState, useEffect } from 'react';
import { ChevronLeft, Box, ShoppingCart, Loader2, BadgeIndianRupee, FileText, Package, ScanBarcode, Tag } from 'lucide-react';
import { odooService } from '../services/odoo';
import Loader from '../components/Loader';
import '../components/Loader.css';
import './OrderDetail.css';

const ProductDetail = ({ productId, onBack }) => {
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);

  const formatValue = (value, fallback = 'Not available') => {
    if (value === null || value === undefined || value === '') return fallback;
    return value;
  };

  const formatPrice = (value) => {
    const amount = Number(value);
    if (!Number.isFinite(amount)) return '-';
    return amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  useEffect(() => {
    const fetchDetail = async () => {
      try {
        const res = await odooService.getProductDetail(productId);
        if (res) {
          setProduct(res);
        }
      } catch (err) {
        console.error('Error fetching product details', err);
      } finally {
        setLoading(false);
      }
    };

    if (productId) fetchDetail();
  }, [productId]);
  
  const getImageUrl = (url) => {
    if (!url) return null;
    const token = localStorage.getItem('odoo_session_id') || '';
    const db = import.meta.env.VITE_ODOO_DB || 'stage';
    return `${url}?token=${token}&db=${db}`;
  };

  if (loading) {
    return (
      <div className="order-detail-page detail-page-shell flex flex-col items-center justify-center min-vh-70">
        <Loader message="Loading Product Specifications..." />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="p-12 text-center text-red-500 card">
        Product not found or access denied.
      </div>
    );
  }

  const quickFacts = [
    { label: 'Category', value: formatValue(product.category, 'Standard'), icon: Tag },
    { label: 'Unit of Measure', value: formatValue(product.uom, 'Units'), icon: Package },
    { label: 'Internal Reference', value: formatValue(product.code), icon: ScanBarcode },
    { label: 'List Price', value: `${formatValue(product.currency, 'INR')} ${formatPrice(product.price)}`, icon: BadgeIndianRupee },
  ];

  return (
    <div className="order-detail-page detail-page-shell product-detail-view">
      <div className="detail-card detail-surface">
        <div className="detail-hero">
          <button className="detail-back-btn" onClick={onBack}>
            <ChevronLeft size={18} />
            <span>Back to Products</span>
          </button>

          <div className="detail-hero-copy">
            <span className="detail-eyebrow">Product Details</span>
            <h1>{formatValue(product.name, 'Product')}</h1>
            <p>Reference #{product.code || product.id}</p>
          </div>

          <div className="detail-hero-status detail-hero-price">
            <span className="product-price-pill">
              {formatValue(product.currency, 'INR')} {formatPrice(product.price)}
            </span>
          </div>
        </div>

        <div className="product-detail-layout">
          <div className="product-visual-panel">
            <div className="product-main-image">
              <div className="product-image-shell">
                <div className="product-image-glow"></div>
                {product.image_url ? (
                  <img src={getImageUrl(product.image_url)} alt={product.name} className="product-image" />
                ) : (
                  <div className="product-image-placeholder">
                    <Box size={96} strokeWidth={1.2} />
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="product-content-panel">
            <section className="detail-section">
              <div className="detail-section-header">
                <div>
                  <span className="detail-section-kicker">Overview</span>
                  <h2>Quick Facts</h2>
                </div>
              </div>

              <div className="detail-summary-grid product-summary-grid">
                {quickFacts.map((fact) => {
                  const Icon = fact.icon;

                  return (
                    <div key={fact.label} className="summary-card">
                      <div className="summary-icon">
                        <Icon size={18} />
                      </div>

                      <div>
                        <span className="summary-label">{fact.label}</span>
                        <strong>{fact.value}</strong>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            <section className="detail-section">
              <div className="detail-section-header">
                <div>
                  <span className="detail-section-kicker">Description</span>
                  <h2>Product Notes</h2>
                </div>
              </div>

              <div className="remark-value-box product-description-box">
                <FileText size={18} />
                <p>{formatValue(product.description, 'No description available for this product yet.')}</p>
              </div>
            </section>

            <div className="detail-footer-actions">
              <button className="detail-action-btn detail-action-primary detail-action-wide">
                <ShoppingCart size={18} />
                <span>Add to Current Quotation</span>
              </button>

              <button className="detail-action-btn detail-action-secondary" onClick={onBack}>
                <span>Back</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductDetail;
