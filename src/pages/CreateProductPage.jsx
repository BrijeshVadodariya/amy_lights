import React, { useMemo, useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { odooService } from '../services/odoo';
import './FormPages.css';

/**
 * CreateProductPage.
 * Full-page version of the "New Product" form to keep UI consistent on mobile.
 */
const CreateProductPage = ({ onNavigate, onBack, extraData, editId }) => {
  const [saving, setSaving] = useState(false);
  const [product, setProduct] = useState({
    name: '',
    product_code: '',
    unit: '',
    price: '',
    note: '',
    image: '', // Base64 string for new upload
    image_url: '', // URL for existing image
  });

  const isEdit = !!editId;

  useEffect(() => {
    if (isEdit && extraData?.product) {
      const p = extraData.product;
      setProduct({
        name: p.name || '',
        product_code: p.code || p.default_code || '',
        unit: p.uom || p.unit || '',
        price: p.price || '',
        note: p.description || '',
        image: '',
        image_url: p.image_url || '',
      });
    }
  }, [editId, extraData]);

  const getFullImageUrl = (url) => {
    if (!url) return null;
    const token = localStorage.getItem('odoo_session_id') || '';
    const db = import.meta.env.VITE_ODOO_DB || 'stage';
    return `${url}?token=${token}&db=${db}`;
  };

  const [hasChanges, setHasChanges] = useState(false);
  
  useEffect(() => {
    const isDirty = product.name !== '' || product.price !== '';
    setHasChanges(isDirty);
  }, [product]);

  const safeNavigate = (to) => {
    if (hasChanges) {
      if (window.confirm("You have unsaved changes. Are you sure?")) {
        setHasChanges(false);
        if (to === 'back' && onBack) onBack();
        else onNavigate(to);
      }
    } else {
      if (to === 'back' && onBack) onBack();
      else onNavigate(to);
    }
  };

  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (hasChanges) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasChanges]);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        // Remove the data:image/jpeg;base64, prefix if Odoo expects just the base64 data
        const base64String = reader.result.split(',')[1];
        setProduct({ ...product, image: base64String, image_url: '' });
      };
      reader.readAsDataURL(file);
    }
  };

  const canSubmit = useMemo(() => product.name.trim().length > 0, [product.name]);

  const handleSubmit = async () => {
    if (!canSubmit || saving) return;
    setSaving(true);
    try {
      let res;
      const payload = {
        name: product.name,
        default_code: product.product_code,
        list_price: Number(product.price) || 0,
        description: product.note,
        unit: product.unit,
      };
      if (product.image) payload.image = product.image;
      if (isEdit) payload.id = editId;

      if (isEdit) {
        res = await odooService.updateProduct(payload);
      } else {
        res = await odooService.createProduct(payload);
      }

      if (!res) {
        alert(`Product ${isEdit ? 'update' : 'creation'} failed`);
        return;
      }

      if (onBack) onBack();
      else onNavigate('products');
    } catch {
      alert(`Product ${isEdit ? 'update' : 'creation'} failed`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="form-page">
      <div className="form-card">
        <div className="form-header">
          <div>
            <h2>{isEdit ? 'Edit Product' : 'Create Product'}</h2>
            <p className="form-subtitle">{isEdit ? 'Update product information.' : 'Add a new product to your system.'}</p>
          </div>
          <button className="btn-ui secondary" onClick={() => safeNavigate('back')} aria-label="Back">
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
          <div className="form-group">
            <label>Product Image</label>
            <input type="file" accept="image/*" className="form-control" onChange={handleImageChange} />
            {(product.image || product.image_url) && (
              <div style={{ marginTop: '10px' }}>
                <img 
                  src={product.image ? `data:image/png;base64,${product.image}` : getFullImageUrl(product.image_url)} 
                  alt="Preview" 
                  style={{ width: '80px', height: '80px', objectFit: 'cover', borderRadius: '4px', border: '1px solid #ddd' }} 
                />
              </div>
            )}
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
          <button className="btn-ui secondary lg" onClick={() => safeNavigate('back')}>
            Back
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreateProductPage;

