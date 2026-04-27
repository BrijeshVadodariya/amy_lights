import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Plus, X, ChevronLeft, ChevronDown, CheckCircle, 
  Trash, Calendar, ShoppingBag, ShoppingCart, 
  Package2, Box, Info, AlertCircle, GripVertical
} from 'lucide-react';
import { Reorder, useDragControls } from 'framer-motion';
import { odooService } from '../services/odoo';
import SearchableSelect from '../components/SearchableSelect';
import Loader from '../components/Loader';
import './CreatePurchase.css'; 

const createProductRow = () => ({
  id: Date.now() + Math.random(),
  productId: '',
  productName: '',
  qty: 1,
  price: 0,
  line_note: '',
  uom: 'Units'
});

const ProductRow = ({ r, idx, rows, setRows, isMobile, masterData, productOptions, handleRowChange, addRow, onNavigate }) => {
  const dragControls = useDragControls();
  const selectedProduct = masterData.products.find(p => String(p.id) === String(r.productId)) || {
    id: r.productId,
    name: r.productName
  };

  return (
    <Reorder.Item 
      key={r.id} 
      value={r}
      dragListener={false}
      dragControls={dragControls}
      className="product-item-card product-row" 
      style={{ 
        position: 'relative',
        padding: isMobile ? '1.25rem 1rem' : '0.25rem 0.5rem', 
        border: isMobile ? '1px solid #e2e8f0' : 'none', 
        borderBottom: isMobile ? '1px solid #e2e8f0' : '1px solid #f1f5f9', 
        borderRadius: isMobile ? '12px' : 0,
        marginBottom: isMobile ? '0.75rem' : 0,
        display: 'flex',
        alignItems: 'center',
        gap: '8px'
      }}
    >
      <div 
        className="drag-handle" 
        onPointerDown={(e) => dragControls.start(e)}
        style={{ cursor: 'grab', color: '#cbd5e1', padding: '12px 6px', touchAction: 'none' }}
      >
        <GripVertical size={16} />
      </div>
      
      <div style={{ flex: 1, minWidth: 0 }}>
        <div 
          className={isMobile ? "" : "pi-grid-row"} 
          style={{ 
            marginTop: 0, 
            display: isMobile ? 'flex' : 'grid', 
            gridTemplateColumns: isMobile ? 'none' : `1.5fr 1fr 100px 120px 40px`,
            alignItems: 'flex-start', 
            gap: isMobile ? '4px' : '12px', 
            flexWrap: isMobile ? 'wrap' : 'nowrap',
            minHeight: '42px'
          }}
        >
            <div className="pi-main-info" style={{ width: '100%', minWidth: 0 }}>
                {isMobile && <label className="pi-small-label">Product</label>}
                <SearchableSelect
                    placeholder="Select Product"
                    options={productOptions}
                    value={r.productId}
                    defaultValue={r.productName}
                    onChange={(val) => handleRowChange(r.id, 'productId', val)}
                    small
                />
            </div>
            
            <div className="pi-note-col" style={{ width: '100%' }}>
                {isMobile && <label className="pi-small-label">Note</label>}
                <input 
                    type="text"
                    className="co-input-border"
                    placeholder="Add note..."
                    value={r.line_note || ''}
                    onChange={(e) => handleRowChange(r.id, 'line_note', e.target.value)}
                    style={{ width: '100%', height: '32px', fontSize: '12px' }}
                />
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
                {isMobile && <label className="pi-small-label">Qty</label>}
                <input 
                    type="number" 
                    className="co-input-border" 
                    value={r.qty} 
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => handleRowChange(r.id, 'qty', e.target.value)}
                    style={{ width: '100%', height: '32px', textAlign: 'center' }}
                />
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
                {isMobile && <label className="pi-small-label">Price</label>}
                <input 
                    type="number" 
                    className="co-input-border" 
                    value={r.price} 
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => handleRowChange(r.id, 'price', e.target.value)}
                    style={{ width: '100%', height: '32px', textAlign: 'center' }}
                />
            </div>

            <button 
                className="pi-remove" 
                onClick={() => setRows(prev => prev.filter(row => row.id !== r.id))}
                style={{ height: '32px', width: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ef4444' }}
            >
                <Trash size={14} />
            </button>
        </div>
      </div>
    </Reorder.Item>
  );
};

const CreatePurchase = ({ editId, onNavigate, onBack, extraData }) => {
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [masterData, setMasterData] = useState({
    partners: [],
    products: []
  });

  const [header, setHeader] = useState({
    partnerId: extraData?.partnerId || '',
    partnerName: extraData?.partnerName || '',
    partnerPhone: extraData?.partnerPhone || '',
    date: new Date().toISOString().split('T')[0],
    origin: extraData?.origin || '',
    remark: ''
  });

  const [rows, setRows] = useState([createProductRow()]);
  const [initialLineIds, setInitialLineIds] = useState([]);
  const isMobile = window.innerWidth <= 768;

  const fetchMasterData = useCallback(async () => {
    setLoading(true);
    try {
      const [pRes, prodRes] = await Promise.all([
        odooService.getPartners(),
        odooService.getProducts(2000)
      ]);
      setMasterData({
        partners: pRes.partners || pRes || [],
        products: prodRes.products || prodRes || []
      });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchExistingPurchase = useCallback(async () => {
      if (!editId) return;
      setLoading(true);
      try {
          const rawData = await odooService.getPurchaseDetail(editId);
          // The backend returns a list of purchases
          const data = Array.isArray(rawData) ? rawData[0] : rawData;

          if (data) {
              setHeader({
                  partnerId: data.partner_id || '',
                  partnerName: data.partner_name || '',
                  partnerPhone: data.partner_phone || '',
                  date: data.date_order ? data.date_order.split('-').reverse().join('-') : new Date().toISOString().split('T')[0],
                  origin: data.origin || '',
                  remark: data.remark || ''
              });
              if (data.lines) {
                  const mapped = data.lines.map(l => ({
                        id: l.id,
                        productId: l.product_id?.[0] || l.product_id || '',
                        productName: l.product_name || '',
                        qty: l.qty_ordered || l.product_qty || 1,
                        price: l.price_unit || 0,
                        line_note: l.line_note || '',
                        uom: l.uom || 'Units',
                        is_existing: true
                  }));
                  setRows(mapped);
                  setInitialLineIds(mapped.map(m => m.id));
              }
          }
      } catch (err) {
          console.error(err);
      } finally {
          setLoading(false);
      }
  }, [editId]);

  useEffect(() => {
    fetchMasterData();
    fetchExistingPurchase();
  }, [fetchMasterData, fetchExistingPurchase]);

  const productOptions = useMemo(() => {
    return masterData.products.map(p => ({ value: p.id, label: p.name }));
  }, [masterData.products]);

  const partnerOptions = useMemo(() => {
    return masterData.partners.map(p => ({ value: p.id, label: p.name }));
  }, [masterData.partners]);

  const handleRowChange = (id, field, value) => {
    setRows(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r));
  };

  const addRow = () => setRows(prev => [...prev, createProductRow()]);

  const calculateTotal = () => {
    return rows.reduce((sum, r) => sum + (parseFloat(r.qty || 0) * parseFloat(r.price || 0)), 0);
  };

  const handleSubmit = async () => {
    if (submitting) return;
    if (!header.partnerId) return alert("Please select a Vendor");
    if (rows.filter(r => r.productId).length === 0) return alert("Please add at least one product");

    setSubmitting(true);
    try {
      const currentIds = rows.filter(r => r.is_existing).map(r => r.id);
      const deletedIds = initialLineIds.filter(id => !currentIds.includes(id));

      const processedLines = [];
      
      // Add existing updated lines & new lines
      rows.forEach(r => {
        if (!r.productId && !r.line_note) return;
        
        const lineData = {
          product_id: r.productId,
          qty: r.qty,
          price: r.price,
          name: r.line_note || ''
        };

        if (r.is_existing) {
          processedLines.push([1, r.id, lineData]);
        } else {
          processedLines.push([0, 0, lineData]);
        }
      });

      // Add deletions
      deletedIds.forEach(id => {
        processedLines.push([2, id, 0]);
      });

      const payload = {
        purchase_id: editId,
        partner_id: header.partnerId,
        date_order: header.date,
        origin: header.origin,
        lines: processedLines
      };

      const res = await odooService.createPurchase(payload);
      if (res.success) {
        onNavigate('purchases', null, null, true);
      } else {
        alert(res.error?.message || "Failed to save purchase order");
      }
    } catch (err) {
      alert("Network error");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <Loader message="Preparing Procurement Form..." />;

  return (
    <div className="co-container">
      <div className="co-header-sticky">
        <div className="co-header-main">
          <div className="co-header-left">
            <button className="co-back-btn" onClick={onBack}>
              <ChevronLeft size={20} />
            </button>
            <div className="co-title-area">
              <h1 className="co-main-title">{editId ? 'Edit' : 'Create'} Purchase Order</h1>
              <p className="co-subtitle">Manage procurement from vendors</p>
            </div>
          </div>
          <div className="co-header-right">
             <button 
                className="btn-ui primary shadow-lg h-[42px] px-6"
                onClick={handleSubmit}
                disabled={submitting}
             >
                <CheckCircle size={18} />
                <span>{submitting ? 'Saving...' : 'Save Purchase'}</span>
             </button>
          </div>
        </div>
      </div>

      <div className="co-content-wrapper">
        <div className="co-grid-layout">
          {/* Main Info Card */}
          <div className="co-card lead-card" style={{ padding: '0.75rem' }}>
            <div className="co-card-header" style={{ marginBottom: '0.4rem' }}>
              <h3 style={{ fontSize: '0.85rem', fontWeight: 800, textTransform: 'uppercase', color: '#64748b' }}>Vendor Selection</h3>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button className="co-btn-icon" onClick={() => {}}>
                  <Plus size={18} />
                </button>
              </div>
            </div>
            <div className="co-card-body">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label style={{ fontSize: '11px', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '2px', display: 'block' }}>Select Vendor *</label>
                  <style>
                    {`
                      .purchase-vendor-select .ss-control {
                        height: 38px !important;
                        border-radius: 8px !important;
                        border-color: #ddd !important;
                      }
                    `}
                  </style>
                  <SearchableSelect
                    placeholder="Search vendors..."
                    options={partnerOptions}
                    value={header.partnerId}
                    defaultValue={header.partnerName}
                    className="purchase-vendor-select"
                    onChange={(val, opt) => {
                      const selectedPartner = masterData.partners.find(p => String(p.id) === String(val));
                      setHeader(prev => ({ 
                        ...prev, 
                        partnerId: val, 
                        partnerName: opt?.label || '',
                        partnerPhone: selectedPartner?.phone || selectedPartner?.mobile || ''
                      }));
                    }}
                  />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label style={{ fontSize: '11px', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '2px', display: 'block' }}>Phone Number</label>
                  <div style={{ height: '38px', display: 'flex', alignItems: 'center', background: '#f8fafc', padding: '0 12px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '13px', fontWeight: 600, color: '#1e293b' }}>
                    {header.partnerPhone || '-'}
                  </div>
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label style={{ fontSize: '11px', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '2px', display: 'block' }}>Order Date</label>
                  <input 
                    type="date"
                    className="co-input-border"
                    value={header.date}
                    onChange={(e) => setHeader(prev => ({ ...prev, date: e.target.value }))}
                    style={{ height: '38px', border: '1px solid #ddd', borderRadius: '8px', background: '#fff' }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Product Lines */}
          <div className="co-card" style={{ padding: '0.75rem' }}>
            <div className="co-card-header" style={{ marginBottom: '0.6rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.6rem' }}>
               <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <ShoppingCart size={18} className="text-slate-400" />
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 900, color: '#0f172a', margin: 0 }}>Purchase Items</h3>
               </div>
               <div className="flex items-center gap-2">
                  <button className="co-btn-icon" onClick={addRow} title="Add Line">
                    <Plus size={18} />
                  </button>
               </div>
            </div>
            
            <div className="p-0">
               {!isMobile && (
                 <div className="pi-header-row" style={{ gridTemplateColumns: `1.5fr 1fr 100px 120px 40px`, padding: '8px 12px', background: 'transparent' }}>
                    <div className="pi-h-col">Product</div>
                    <div className="pi-h-col">Note</div>
                    <div className="pi-h-col text-center">Quantity</div>
                    <div className="pi-h-col text-center">Unit Price</div>
                    <div className="pi-h-col"></div>
                 </div>
               )}
               
               <Reorder.Group axis="y" values={rows} onReorder={setRows} className="product-lines-list">
                  {rows.map((r, idx) => (
                    <ProductRow 
                      key={r.id}
                      r={r}
                      idx={idx}
                      rows={rows}
                      setRows={setRows}
                      isMobile={isMobile}
                      masterData={masterData}
                      productOptions={productOptions}
                      handleRowChange={handleRowChange}
                      addRow={addRow}
                      onNavigate={onNavigate}
                    />
                  ))}
               </Reorder.Group>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem', padding: '0 4px' }}>
                <div style={{ display: 'flex', gap: '8px' }}>
                    <button 
                        style={{ padding: '6px 16px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '4px', fontSize: '12px', fontWeight: 700, color: '#64748b', cursor: 'pointer' }}
                        onClick={addRow}
                    >
                        + Add Product
                    </button>
                    <button 
                        style={{ padding: '6px 16px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '4px', fontSize: '12px', fontWeight: 700, color: '#64748b', cursor: 'pointer' }}
                        onClick={() => setRows([...rows, { ...createProductRow(), line_type: 'line_section' }])}
                    >
                        + Add Section
                    </button>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', paddingRight: '1rem' }}>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <span style={{ fontSize: '11px', fontWeight: 900, color: '#94a3b8', textTransform: 'uppercase' }}>FINAL:</span>
                        <span style={{ fontSize: '1.25rem', fontStyle: 'italic', fontWeight: 900, color: '#10b981' }}>
                            {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(calculateTotal())}
                        </span>
                    </div>
                </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreatePurchase;
