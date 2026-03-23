import React, { useMemo, useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { odooService } from '../services/odoo';
import './FormPages.css';

/**
 * CreateProductPage.
 * Full-page version of the "New Product" form to keep UI consistent on mobile.
 */
const CreateProductPage = ({ onNavigate }) => {
  const [saving, setSaving] = useState(false);
  const [product, setProduct] = useState({
    name: '',
    product_code: '',
    unit: '',
    price: '',
    note: '',
  });

  useEffect(() => {
    const handleBeforeUnload = (e) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  const canSubmit = useMemo(() => product.name.trim().length > 0, [product.name]);

  const handleSubmit = async () => {
    if (!canSubmit || saving) return;
    setSaving(true);
    try {
      const res = await odooService.createProduct({
        name: product.name,
        default_code: product.product_code,
        list_price: Number(product.price) || 0,
      });

      if (!res) {
        alert('Product creation failed');
        return;
      }

      alert('Product created');
      onNavigate('create-order');
    } catch {
      alert('Product creation failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="form-page">
      <div className="form-card">
        <div className="form-header">
          <div>
            <h2>Create Product</h2>
            <p className="form-subtitle">Add a new product and return to quotation.</p>
          </div>
          <button className="btn-ui secondary" onClick={() => onNavigate('create-order')} aria-label="Back to quotation">
            <X size={16} /> Close
          </button>
        </div>

        <div className="form-grid">
          <div className="form-group">
            <label>Name *</label>
            <input className="form-control" value={product.name} onChange={(e) => setProduct({ ...product, name: e.target.value })} placeholder="Please enter name" />
          </div>
          <div className="form-group">
            <label>Product Code</label>
            <input className="form-control" value={product.product_code} onChange={(e) => setProduct({ ...product, product_code: e.target.value })} placeholder="Please enter product code" />
          </div>
          <div className="form-group">
            <label>Unit</label>
            <input className="form-control" value={product.unit} onChange={(e) => setProduct({ ...product, unit: e.target.value })} placeholder="Please enter unit" />
          </div>
          <div className="form-group">
            <label>Price</label>
            <input type="number" className="form-control" value={product.price} onChange={(e) => setProduct({ ...product, price: e.target.value })} placeholder="Please enter price" />
          </div>
          <div className="form-group" style={{ gridColumn: '1 / -1' }}>
            <label>Note</label>
            <textarea className="form-control" rows={3} value={product.note} onChange={(e) => setProduct({ ...product, note: e.target.value })} placeholder="Please enter note" />
          </div>
        </div>

        <div className="form-footer">
          <button className="btn-ui primary lg" onClick={handleSubmit} disabled={!canSubmit || saving}>
            {saving ? 'Submitting...' : 'Submit'}
          </button>
          <button className="btn-ui secondary lg" onClick={() => onNavigate('create-order')}>
            Back
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreateProductPage;

