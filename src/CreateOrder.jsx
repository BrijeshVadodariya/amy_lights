import React, { useState, useEffect } from 'react';
import { odooService } from './services/odoo';
import SearchableSelect from './components/SearchableSelect';
import { 
  Plus, 
  X, 
  ChevronRight, 
  ChevronDown,
  Activity, 
  Users, 
  Phone, 
  Paperclip, 
  CheckSquare,
  Send,
  FileText,
  ToggleRight,
  Sparkles,
  Wind,
  Lightbulb,
  Layers,
  MoreHorizontal,
  MapPin
} from 'lucide-react';
import './CreateOrder.css';

const createProductRow = () => ({
  id: Date.now(),
  productId: '',
  qty: 1,
  price: 0,
  discount: 0,
  remark: ''
});

// Simple in-memory cache for products/partners to speed up loading
const dataCache = {
  products: null,
  partners: null,
  architects: null,
  electricians: null
};

const CreateOrder = ({ editId, onNavigate, isSelection, isOrder, extraData }) => {
  const [loading, setLoading] = useState(false);
  const [masterData, setMasterData] = useState({
    partners: [],
    products: [],
  });

  const [orderHeader, setOrderHeader] = useState({
    partnerId: '',
    date: new Date().toISOString().split('T')[0],
    remark: '',
    is_desc: true,
    is_image: true,
    is_beam: true,
    is_automate: false
  });

  const [showProducts, setShowProducts] = useState(false);
  const [showMore, setShowMore] = useState('call');

  const [rows, setRows] = useState([
    createProductRow()
  ]);

  const [activityInputs, setActivityInputs] = useState({});
  const [activityHistory, setActivityHistory] = useState({
    call: [],
    whatsapp: [],
    visit: [],
    email: []
  });
  useEffect(() => {
    if (extraData) {
      if (extraData.preFilledPartnerId) {
        setOrderHeader(prev => ({ ...prev, partnerId: extraData.preFilledPartnerId }));
      }
      if (extraData.preFilledProducts && extraData.preFilledProducts.length > 0) {
        setRows(extraData.preFilledProducts.map(p => ({
          id: Date.now() + Math.random(),
          productId: p.productId,
          qty: p.qty || 1,
          price: p.price || 0,
          discount: 0,
          remark: ''
        })));
      }
    }
  }, [extraData]);
  
  useEffect(() => {
    const fetchOrderForEdit = async () => {
      if (!editId) return;
      setLoading(true);
      try {
        const order = await odooService.getOrderDetail(editId);
        if (order) {
          setOrderHeader({
            partnerId: String(order.partner_id?.[0] || order.partner_id || ''),
            date: order.date_order ? order.date_order.split(' ')[0] : new Date().toISOString().split('T')[0],
            remark: order.remark || '',
            is_desc: order.is_desc ?? true,
            is_image: order.is_image ?? true,
            is_beam: order.is_beam ?? true,
            is_automate: order.is_automate ?? false
          });
          
          if (order.lines && order.lines.length > 0) {
            setRows(order.lines.map(l => ({
              id: Date.now() + Math.random(),
              productId: String(l.product_id?.[0] || l.product_id || ''),
              qty: l.qty || 1,
              price: l.price_unit || 0,
              discount: l.discount || 0,
              remark: l.remark || ''
            })));
          }
        }
      } catch (err) {
        console.error("Failed to fetch order for edit", err);
      } finally {
        setLoading(false);
      }
    };
    fetchOrderForEdit();
  }, [editId]);


  const [generalNotes, setGeneralNotes] = useState([]);
  const [generalNoteInput, setGeneralNoteInput] = useState('');
  const [debugRawData, setDebugRawData] = useState(null);
  const [showCategories, setShowCategories] = useState(false);

  const handleAddGeneralNote = () => {
    if (!generalNoteInput.trim()) return;
    const newNote = {
      id: Date.now(),
      text: generalNoteInput,
      by: 'CurrentUser',
      date: new Date().toLocaleString()
    };
    setGeneralNotes(prev => [...prev, newNote]);
    setGeneralNoteInput('');
  };

  const handleImageUpload = async (id, files) => {
    const fileArray = Array.from(files);
    const base64Promises = fileArray.map(file => new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (e) => {
        const img = new Image();
        img.src = e.target.result;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          
          // Max dimension to compress payload (prevents 413 Payload Too Large)
          const MAX_SIZE = 800;
          if (width > height && width > MAX_SIZE) {
            height *= MAX_SIZE / width;
            width = MAX_SIZE;
          } else if (height > MAX_SIZE) {
            width *= MAX_SIZE / height;
            height = MAX_SIZE;
          }
          
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          
          // Downsample beautifully to JPEG 60% quality
          resolve(canvas.toDataURL('image/jpeg', 0.6));
        };
        img.onerror = () => reject('Image load error');
      };
      reader.onerror = reject;
    }));

    try {
      const base64Images = await Promise.all(base64Promises);
      setActivityInputs(prev => {
        const current = prev[id] || { text: '', images: [] };
        return {
          ...prev,
          [id]: { ...current, images: [...current.images, ...base64Images] }
        };
      });
    } catch (err) {
      console.error("Image upload failed", err);
    }
  };

  const handleRemoveImageInput = (actId, imgIdx) => {
    setActivityInputs(prev => {
      const current = prev[actId];
      if (!current) return prev;
      return {
        ...prev,
        [actId]: { ...current, images: current.images.filter((_, i) => i !== imgIdx) }
      };
    });
  };

  const handleAddActivityNote = (id) => {
    const input = activityInputs[id] || { text: '', images: [] };
    if (!input.text && input.images.length === 0) return;
    
    const newNote = {
      id: Date.now(),
      text: input.text,
      images: input.images,
      by: 'CurrentUser',
      date: new Date().toLocaleString()
    };
    
    setActivityHistory(prev => ({
      ...prev,
      [id]: [...(prev[id] || []), newNote]
    }));
    setActivityInputs(prev => ({ ...prev, [id]: { text: '', images: [] } }));
  };

  useEffect(() => {
    const handleBeforeUnload = (e) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  const fetchMasterData = React.useCallback(async () => {
    // If cache exists, use it immediately for responsiveness
    if (dataCache.products) {
      setMasterData(prev => ({ ...prev, ...dataCache }));
    }

    try {
      // Parallelize fetching
      const [masterRes, productRes, partnerRes] = await Promise.all([
        odooService.getMasterData().catch(() => null),
        odooService.getProducts().catch(() => null),
        odooService.getPartners().catch(() => null)
      ]);

      const newData = { ...masterData };

      if (masterRes) {
        if (masterRes.products) newData.products = masterRes.products;
        if (masterRes.partners) newData.partners = masterRes.partners;
        if (masterRes.architects) newData.architects = masterRes.architects;
        if (masterRes.electricians) newData.electricians = masterRes.electricians;
        if (masterRes.success && masterRes.data) {
           Object.assign(newData, masterRes.data);
        }
      }

      // Merge products from dedicated call
      if (Array.isArray(productRes)) {
        newData.products = productRes;
      } else if (productRes && productRes.products) {
        newData.products = productRes.products;
      }

      // Merge partners from dedicated call
      if (Array.isArray(partnerRes)) {
        newData.partners = partnerRes;
      } else if (partnerRes && partnerRes.partners) {
        newData.partners = partnerRes.partners;
      }

      // Update cache and state
      // Update cache and state without wiping newly injected edit items
      if (newData.products.length > 0 || newData.partners.length > 0) {
        setMasterData(prev => {
          // Merge arrays securely using Map to preserve existing UI items (specifically injected by edit flow)
          const mergeArrays = (arr1, arr2) => {
             const map = new Map();
             (arr1 || []).forEach(item => map.set(item.id, item));
             (arr2 || []).forEach(item => map.set(item.id, item));
             return Array.from(map.values());
          };

          const result = {
            ...prev,
            ...newData,
            products: mergeArrays(prev.products, newData.products),
            partners: mergeArrays(prev.partners, newData.partners)
          };
          
          Object.assign(dataCache, result);
          return result;
        });
      }
    } catch (err) {
      console.error('Fetch master data failed', err);
    }
  }, []);

  const fetchEditOrder = React.useCallback(async () => {
    setLoading(true);
    try {
      const data = await odooService.getOrderDetail(editId);
      if (data) {
        if (data.state === 'sale' || data.status === 'sale') {
           alert("This order is confirmed and can no longer be edited.");
           return;
        }
        
        setDebugRawData(data);

        const extractId = (val) => {
          if (val === null || val === undefined || val === false) return '';
          if (Array.isArray(val)) return val.length > 0 ? val[0] : '';
          if (typeof val === 'object') {
             return val.id || val.value || val.product_id || val.partner_id || '';
          }
          return val;
        };

        const extractName = (val) => {
          if (Array.isArray(val) && val.length > 1) return val[1];
          if (typeof val === 'object' && val !== null) return val.name || val.display_name || '';
          return 'Unknown';
        };

        const missingPartners = [];
        const missingProducts = [];

        let pId = extractId(data.partner_id) || extractId(data.customer_id);
        if (!pId && data.partner_name) {
          // Attempt reverse lookup if cache is available
          const cachedPartner = dataCache.partners?.find(p => p.name === data.partner_name);
          pId = cachedPartner ? cachedPartner.id : `_GHOST_PARTNER-${data.partner_name}`;
        }
        
        if (pId && String(pId).startsWith('_GHOST_PARTNER-')) {
          missingPartners.push({ id: pId, name: data.partner_name });
        } else if (pId && !masterData.partners.find(p => p.id === pId)) {
          missingPartners.push({ id: pId, name: extractName(data.partner_id || data.customer_id) || data.partner_name });
        }

        setOrderHeader({
          partnerId: pId,
          date: data.date_order ? data.date_order.split(' ')[0] : new Date().toISOString().split('T')[0],
          architectId: extractId(data.architect_id) || extractId(data.architect) || '',
          electricianId: extractId(data.electrician_id) || extractId(data.electrician) || '',
          remark: data.remark || ''
        });
        
        const lineItems = data.lines || data.order_line || [];
        const productLines = lineItems.filter(l => !l.line_type || l.line_type === 'product' || !!l.product_id || l.product_uom_qty > 0 || l.qty > 0 || !!l.product_name);

        setRows(productLines.length ? productLines.map((l, i) => {
          let prodId = extractId(l.product_id) || extractId(l.product) || extractId(l.product_template_id) || extractId(l.product_tmpl_id);
          const searchName = l.product_name || l.name;
          
          if (!prodId && searchName) {
            const cachedProduct = dataCache.products?.find(p => p.name === searchName || p.default_code === l.product_code);
            prodId = cachedProduct ? cachedProduct.id : `_GHOST_PRODUCT-${searchName}`;
          }

          if (prodId && String(prodId).startsWith('_GHOST_PRODUCT-')) {
             let ghostName = prodId.replace('_GHOST_PRODUCT-', '');
             missingProducts.push({ id: prodId, name: ghostName });
          } else if (prodId && !masterData.products.find(p => p.id === prodId)) {
             const extractedName = extractName(l.product_id || l.product || l.product_template_id || l.product_tmpl_id);
             missingProducts.push({ id: prodId, name: extractedName !== 'Unknown' ? extractedName : (searchName || 'Unknown Product') });
          }
          return {
            id: l.id || Date.now() + i,
            productId: prodId || '',
            qty: l.product_uom_qty || l.qty || 1,
            price: l.price_unit || l.price || 0,
            discount: l.discount || 0,
            remark: searchName || l.remark || l.description || ''
          };
        }) : [createProductRow()]);
        
        if (missingPartners.length > 0 || missingProducts.length > 0) {
          setMasterData(prev => ({
            ...prev,
            partners: [...prev.partners, ...missingPartners],
            products: [...prev.products, ...missingProducts]
          }));
        }

        setShowProducts(productLines.length > 0);
      }
    } catch {
      console.error('Edit fetch failed');
    }
    finally { setLoading(false); }
  }, [editId]);

  useEffect(() => {
    fetchMasterData();
    if (editId) fetchEditOrder();
  }, [editId, fetchMasterData, fetchEditOrder]);

  const handleRowChange = (id, field, value) => {
    setRows(prev => prev.map(r => {
      if (r.id === id) {
        if (field === 'productId') {
          const prod = masterData.products.find(p => p.id === parseInt(value));
          return { ...r, productId: value, price: prod ? prod.price : 0 };
        }
        if (field === 'qty') {
          const numVal = parseFloat(value) || 0;
          return { ...r, [field]: numVal < 1 ? 1 : numVal };
        }
        return { ...r, [field]: value };
      }
      return r;
    }));
  };

  const addRow = () => {
    setRows(prev => [...prev, createProductRow(prev.length)]);
  };

  const handleSaveCustomer = async () => {
    if (!newCustomer.name) return alert("Party Name is required");
    try {
      // Mapping to Odoo (Simplified check)
      const res = await odooService.createPartner({
         name: newCustomer.name,
         phone: newCustomer.mobile,
         email: '', // Not in form
         comment: newCustomer.billing_address // Simplified
      });
      if (res) {
        setMasterData(prev => ({ ...prev, partners: [...prev.partners, res] }));
        setOrderHeader(prev => ({ ...prev, partnerId: res.id }));
        setShowCustomerModal(false);
        setNewCustomer({ name: '', billing_name: '', contact_person: '', mobile: '', billing_address: '', delivery_address: '', electrician: '', electrician_number: '', architect: '', architect_number: '', office_contact_person: '' });
      }
    } catch {
      alert("Customer creation failed");
    }
  };

  const handleSaveProduct = async () => {
     if (!newProduct.name) return alert("Name is required");
     try {
        const res = await odooService.createProduct({
          name: newProduct.name,
          default_code: newProduct.product_code,
          list_price: newProduct.price
        });
        if (res) {
          setMasterData(prev => ({ ...prev, products: [...prev.products, res] }));
          setShowProductModal(false);
          setNewProduct({ name: '', product_code: '', unit: '', price: 0, note: '' });
        }
     } catch {
       alert("Product creation failed");
     }
  };

  const handleProcess = async () => {

    const resolveGhostId = (ghostId, type) => {
      if (String(ghostId).startsWith(`_GHOST_${type.toUpperCase()}-`)) {
        const trueName = String(ghostId).replace(`_GHOST_${type.toUpperCase()}-`, '');
        const list = type === 'partner' ? masterData.partners : masterData.products;
        const real = list.find(item => item.name === trueName);
        return real ? real.id : null;
      }
      return ghostId;
    };

    const finalPartnerId = parseInt(resolveGhostId(orderHeader.partnerId, 'partner'));
    if (!finalPartnerId || isNaN(finalPartnerId)) {
        return alert("Please select a valid customer before proceeding.");
    }

    const productLines = rows.filter(r => r.productId);
    if (productLines.length === 0) {
        return alert("Please add at least one product to your selection.");
    }

    setLoading(true);
    try {
      const finalProductLines = productLines.map(r => {
        let finalProdId = parseInt(resolveGhostId(r.productId, 'product'));
        return {
          product_id: finalProdId || 0,
          qty: parseFloat(r.qty) || 0,
          price_unit: parseFloat(r.price) || 0,
          discount: parseFloat(r.discount) || 0,
          name: r.remark,
          line_type: 'product'
        };
      });

      const amyNoteLines = [];
      Object.keys(activityHistory).forEach(type => {
        activityHistory[type].forEach(note => {
          if (note.images && note.images.length > 0) {
            note.images.forEach(imgBase64 => {
              amyNoteLines.push({ note_type: type, text: note.text, image: imgBase64.split(',')[1] });
            });
          } else if (note.text) {
            amyNoteLines.push({ note_type: type, text: note.text });
          }
        });
      });

      Object.keys(activityInputs).forEach(type => {
        const input = activityInputs[type];
        if (!input) return;
        if (input.images && input.images.length > 0) {
          input.images.forEach(imgBase64 => {
            amyNoteLines.push({ note_type: type, text: input.text, image: imgBase64.split(',')[1] });
          });
        } else if (input.text) {
          amyNoteLines.push({ note_type: type, text: input.text });
        }
      });

      generalNotes.forEach(note => {
        amyNoteLines.push({ note_type: 'general', text: note.text });
      });

      const extraData = {
        remark: orderHeader.remark,
        amy_note_lines: amyNoteLines,
        is_desc: orderHeader.is_desc,
        is_image: orderHeader.is_image,
        is_beam: orderHeader.is_beam,
        is_automate: orderHeader.is_automate,
        state: isSelection ? 'selection' : isOrder ? 'sale' : 'draft'
      };

      console.log("Submitting order with state:", extraData.state);
      const res = editId 
        ? await odooService.updateQuotation(editId, finalPartnerId, finalProductLines, extraData)
        : await odooService.createQuotation(finalPartnerId, finalProductLines, extraData);
        
      if (res.success) {
        setActivityHistory({});
        onNavigate(isSelection ? 'selection' : isOrder ? 'orders' : 'quotations');
      } else {
        alert(res.error?.message || "Error processing order");
      }
    } catch {
      alert("Network error");
    } finally {
      setLoading(false);
    }
  };

  const selectedPartner = masterData.partners.find(p => p.id === parseInt(orderHeader.partnerId));

  if (loading) return <div className="p-20 text-center text-slate-500">Processing...</div>;

  return (
    <div className="create-order-page dt-page">
      <div className="co-container">
        <div className="co-card lead-card">
          <div className="co-card-header">
            <h3>Customer Selection</h3>
            <button className="co-btn-icon" onClick={() => onNavigate('create-customer')}>
              <Plus size={18} />
            </button>
          </div>
          <div className="co-card-body">
            <div className="form-group">
              <label>Select Customer *</label>
              <SearchableSelect
                placeholder="Choose a customer..."
                value={orderHeader.partnerId}
                onChange={(val) => setOrderHeader({ ...orderHeader, partnerId: val })}
                options={masterData.partners.map((p) => ({ value: p.id, label: p.name }))}
              />
            </div>
            {selectedPartner && (
              <div className="lead-body-simple">
                <div className="lead-left">
                  <div className="lead-info-row">
                    <span className="lead-label">Customer Name</span>
                    <span className="lead-value-name">{selectedPartner.name}</span>
                  </div>
                  <div className="lead-info-row">
                    <span className="lead-label">Contact No.</span>
                    <div className="lead-value contact-val">
                      <Phone size={14} className="text-blue-500" />
                      <span>{selectedPartner.phone || selectedPartner.mobile || '-'}</span>
                    </div>
                  </div>
                </div>
                <div className="lead-right">
                  <div className="lead-info-row address-row">
                    <span className="lead-label">Address</span>
                    <div className="lead-value address-val">
                      <MapPin size={14} className="text-blue-500" />
                      <span>{[selectedPartner.street, selectedPartner.city, selectedPartner.zip].filter(Boolean).join(', ') || 'No address provided'}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="co-expandable-card">
          <div className="co-expand-header" onClick={() => setShowProducts(!showProducts)}>
            <h2>{isSelection ? 'Selection Products' : 'Quotation'}</h2>
            <div className={`co-chevron ${showProducts ? 'open' : ''}`}>
              <ChevronRight size={18} />
            </div>
          </div>
          {showProducts && (
            <div className="co-card-body product-cards-list">
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.5rem', alignItems: 'center', marginBottom: '0.5rem', paddingBottom: '1.25rem', borderBottom: '1px solid #f1f5f9' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', fontWeight: 500, color: '#334155', cursor: 'pointer' }}>
                  <input type="checkbox" checked={orderHeader.is_desc} onChange={(e) => setOrderHeader({...orderHeader, is_desc: e.target.checked})} style={{ width: '16px', height: '16px', cursor: 'pointer' }} />
                  Description
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', fontWeight: 500, color: '#334155', cursor: 'pointer' }}>
                  <input type="checkbox" checked={orderHeader.is_image} onChange={(e) => setOrderHeader({...orderHeader, is_image: e.target.checked})} style={{ width: '16px', height: '16px', cursor: 'pointer' }} />
                  Image
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', fontWeight: 500, color: '#334155', cursor: 'pointer' }}>
                  <input type="checkbox" checked={orderHeader.is_beam} onChange={(e) => setOrderHeader({...orderHeader, is_beam: e.target.checked})} style={{ width: '16px', height: '16px', cursor: 'pointer' }} />
                  Beam
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', fontWeight: 500, color: '#334155', cursor: 'pointer' }}>
                  <input type="checkbox" checked={orderHeader.is_automate} onChange={(e) => setOrderHeader({...orderHeader, is_automate: e.target.checked})} style={{ width: '16px', height: '16px', cursor: 'pointer' }} />
                  Automation
                </label>
              </div>

              <div style={{ width: '100%', overflowX: 'auto', paddingBottom: '1rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', minWidth: 'max-content' }}>
                  {rows.map((r) => {
                const selectedProduct = masterData.products.find(p => p.id === parseInt(r.productId));
                return (
                <div key={r.id} className="product-item-card">
                  <div className="pi-header">
                    <button className="pi-remove" onClick={() => setRows(prev => prev.filter(row => row.id !== r.id))}>
                      <X size={14} />
                    </button>
                  </div>
                  <div className="pi-grid-container" style={{ paddingBottom: '8px' }}>
                    <div className="pi-grid pi-grid-scrollable">
                      <div className="form-group product-select-group" style={{ minWidth: '200px', flex: '1 1 auto' }}>
                        <label className="pi-small-label desktop-alignment-label">Product Box Alignment</label>
                        <SearchableSelect
                          placeholder="Select Product..."
                          value={r.productId}
                          options={masterData.products.filter(p => orderHeader.is_automate ? true : !p.is_automation).map(p => ({ ...p, value: p.id, label: p.name }))}
                          onChange={(val) => handleRowChange(r.id, 'productId', val)}
                        />
                      </div>
                      <div className="pi-sub-grid" style={{ minWidth: '280px', flex: '0 0 auto' }}>
                        <div className="form-group pi-small-input">
                          <label className="pi-small-label">Qty</label>
                          <input type="number" min="1" className="co-input-clean" value={r.qty} onChange={(e) => handleRowChange(r.id, 'qty', e.target.value)} />
                        </div>
                        <div className="form-group pi-small-input">
                          <label className="pi-small-label">Price</label>
                          <input type="number" className="co-input-clean" value={r.price} onChange={(e) => handleRowChange(r.id, 'price', e.target.value)} />
                        </div>
                        <div className="form-group pi-small-input">
                          <label className="pi-small-label">Disc %</label>
                          <input type="number" className="co-input-clean" value={r.discount} onChange={(e) => handleRowChange(r.id, 'discount', e.target.value)} />
                        </div>
                      </div>
                      {orderHeader.is_desc && (
                        <div className="form-group pi-small-input" style={{ minWidth: '150px', flex: '0 0 auto' }}>
                          <label className="pi-small-label">Description</label>
                          <div className="text-sm text-slate-600 font-medium p-3 bg-slate-50 rounded border border-slate-200 whitespace-pre-wrap break-words leading-relaxed" title={selectedProduct?.description || ''}>
                            {selectedProduct?.description || '-'}
                          </div>
                        </div>
                      )}
                      {orderHeader.is_image && (
                        <div className="form-group pi-small-input" style={{ minWidth: '60px', flex: '0 0 auto' }}>
                          <label className="pi-small-label">Image</label>
                          <div className="flex items-center justify-center h-[42px] w-[50px] bg-slate-50 border border-slate-200 rounded overflow-hidden relative">
                              {selectedProduct?.image_url && selectedProduct?.id && (
                                <img 
                                  src={(() => {
                                    const url = selectedProduct.image_url;
                                    const token = localStorage.getItem('odoo_session_id') || '';
                                    const db = import.meta.env.VITE_ODOO_DB || 'stage';
                                    return `${url}?token=${token}&db=${db}`;
                                  })()} 
                                  alt="Prod" 
                                  className="h-full w-full object-cover relative z-10" 
                                  onError={(e) => { 
                                    e.target.style.display = 'none';
                                  }} 
                                />
                              )}
                          </div>
                        </div>
                      )}
                      {orderHeader.is_beam && (
                        <div className="form-group pi-small-input" style={{ minWidth: '80px', flex: '0 0 auto' }}>
                          <label className="pi-small-label">Beam</label>
                          <div className="text-sm text-slate-600 font-medium p-3 bg-slate-50 rounded border border-slate-200 whitespace-pre-wrap break-words leading-relaxed" title={selectedProduct?.beam || ''}>
                            {selectedProduct?.beam || '-'}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )})}
                </div>
              </div>
              <button className="co-btn-secondary w-full py-3" onClick={addRow} style={{ marginTop: '0.5rem' }}>
                <Plus size={18} style={{ marginRight: '8px' }} />
                Add Product Row
              </button>
            </div>
          )}
        </div>

        <div className="co-card main-notes-card">
          <div className="co-card-header">
            <h2>Notes</h2>
            <Plus size={18} />
          </div>
          <div className="co-card-body">
            <div className="general-notes-list">
              {generalNotes.map(note => (
                <div key={note.id} className="general-note-item">
                  <div className="gn-avatar-wrapper">
                    <div className="gn-avatar">{note.by.substring(0,2).toUpperCase()}</div>
                  </div>
                  <div className="gn-content">
                    <p className="gn-text">{note.text}</p>
                    <div className="gn-meta">
                      <span className="gn-tag">Task - NOTE</span>
                      <div className="gn-bottom">
                        <span className="gn-by">By {note.by}</span>
                        <span className="gn-date">{note.date}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="gn-input-wrapper">
              <input type="text" placeholder="Add Note" className="gn-input" value={generalNoteInput} onChange={e => setGeneralNoteInput(e.target.value)} onKeyPress={e => e.key === 'Enter' && handleAddGeneralNote()} />
              <Send size={18} className="gn-send-icon" onClick={handleAddGeneralNote} />
            </div>
          </div>
        </div>

        <div className="activity-section">
          <div className="activity-toggle-bar" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0 1rem', marginBottom: '0.5rem' }}>
             <label className="switch" style={{ position: 'relative', display: 'inline-block', width: '40px', height: '22px' }}>
                <input type="checkbox" checked={showCategories} onChange={() => setShowCategories(!showCategories)} style={{ opacity: 0, width: 0, height: 0 }} />
                <span className="slider round" style={{ position: 'absolute', cursor: 'pointer', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: showCategories ? '#3b82f6' : '#cbd5e1', transition: '.4s', borderRadius: '34px' }}>
                  <span style={{ position: 'absolute', content: '""', height: '16px', width: '16px', left: showCategories ? '20px' : '3px', bottom: '3px', backgroundColor: 'white', transition: '.4s', borderRadius: '50%' }}></span>
                </span>
             </label>
             <span style={{ fontSize: '0.9rem', fontWeight: 600, color: '#475569' }}>Show Product Selections</span>
          </div>

          {[
            { id: 'switches', title: 'Switches', icon: <ToggleRight size={18} />, group: 'cat' },
            { id: 'decorative', title: 'Decorative', icon: <Sparkles size={18} />, group: 'cat' },
            { id: 'fan', title: 'Fan', icon: <Wind size={18} />, group: 'cat' },
            { id: 'lights', title: 'Lights', icon: <Lightbulb size={18} />, group: 'cat' },
            { id: 'profile', title: 'Profile', icon: <Layers size={18} />, group: 'cat' },
            { id: 'others', title: 'Others', icon: <MoreHorizontal size={18} />, group: 'cat' },
            { id: 'tasks', title: 'Tasks', icon: <CheckSquare size={18} />, group: 'always' },
          ].map((act) => {
            if (act.group === 'cat' && !showCategories) return null;
            return (
            <div key={act.id} className="activity-card">
              <div className="activity-header" onClick={() => setShowMore(showMore === act.id ? null : act.id)}>
                <div className="activity-title-group">
                  <span className="activity-icon">{act.icon}</span>
                  <span className="activity-label">{act.title}</span>
                </div>
                <div className="activity-actions">
                  <Plus size={16} />
                  <ChevronDown size={18} className={showMore === act.id ? 'rotate-180' : ''} />
                </div>
              </div>
              {showMore === act.id && (
                <div className="activity-body">
                  {(activityHistory[act.id] || []).map(note => (
                    <div key={note.id} className="activity-note">
                      <div className="note-avatar-wrapper">
                        <div className="note-avatar">{note.by.substring(0,2).toUpperCase()}</div>
                      </div>
                      <div className="note-content-wrapper">
                        {note.text && <p className="note-text">{note.text}</p>}
                        {note.images && note.images.length > 0 && (
                          <div className="note-images">
                            {note.images.map((img, i) => (
                              <img key={i} src={img} alt="attachment" className="note-img-thumb" onClick={() => window.open(img, '_blank')} />
                            ))}
                          </div>
                        )}
                        <div className="note-meta">
                          <span className="note-type">Amy Note - {act.title}</span>
                          <span className="note-by">By {note.by}</span>
                          <span className="note-date">{note.date}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                  <div className="add-note-form-v2">
                    <div className="note-half left-half">
                      <textarea placeholder={`Write ${act.title} notes...`} className="v2-textarea" value={activityInputs[act.id]?.text || ''} onChange={e => setActivityInputs(prev => ({ ...prev, [act.id]: { ...(prev[act.id] || { text: '', images: [] }), text: e.target.value } }))} />
                    </div>
                    <div className="note-half right-half">
                      <label className="v2-upload-zone">
                        <Paperclip size={20} />
                        <span className="upload-text">Upload Images</span>
                        <input type="file" multiple accept="image/*" className="hidden-file-input" onChange={e => handleImageUpload(act.id, e.target.files)} />
                      </label>
                      {activityInputs[act.id]?.images?.length > 0 && (
                        <div className="v2-image-previews">
                          {activityInputs[act.id].images.map((img, i) => (
                            <div key={i} className="v2-img-item">
                              <img src={img} alt="attachment" />
                              <button className="v2-img-remove" onClick={() => handleRemoveImageInput(act.id, i)}><X size={10} /></button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
            );
          })}
        </div>

        <div className="co-page-footer">
          <button className="co-btn co-btn-primary co-btn-lg" onClick={handleProcess}>
            {loading ? "Processing..." : (editId ? (isSelection ? "Update Selection" : "Update Target") : (isSelection ? "Create Selection" : isOrder ? "Create Order" : "Submit Quotation"))}
          </button>
          <button className="co-btn co-btn-secondary co-btn-lg" onClick={() => onNavigate(isSelection ? 'selection' : isOrder ? 'orders' : 'quotations')}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreateOrder;
