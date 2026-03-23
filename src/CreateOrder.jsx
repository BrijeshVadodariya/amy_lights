import React, { useState, useEffect } from 'react';
import { odooService } from './services/odoo';
import SearchableSelect from './components/SearchableSelect';
import { Plus, X } from 'lucide-react';
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

const CreateOrder = ({ editId, onNavigate }) => {
  const [loading, setLoading] = useState(false);
  const [masterData, setMasterData] = useState({
    partners: [],
    products: [],
    architects: [],
    electricians: [],
  });

  const [orderHeader, setOrderHeader] = useState({
    partnerId: '',
    date: new Date().toISOString().split('T')[0],
    architectId: '',
    electricianId: '',
    remark: ''
  });

  const [rows, setRows] = useState([
    createProductRow()
  ]);

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
      if (newData.products.length > 0 || newData.partners.length > 0) {
        Object.assign(dataCache, newData);
        setMasterData(newData);
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
        setOrderHeader({
          partnerId: data.partner_id || '',
          date: data.date_order || new Date().toISOString().split('T')[0],
          architectId: data.architect_id || '',
          electricianId: data.electrician_id || '',
          remark: data.remark || ''
        });
        const lineItems = data.lines || [];
        const productLines = lineItems.filter(l => !l.line_type || l.line_type === 'product');

        setRows(productLines.length ? productLines.map((l, i) => ({
          id: l.id || Date.now() + i,
          productId: l.product_id || '',
          qty: l.qty || 1,
          price: l.price_unit || 0,
          discount: l.discount || 0,
          remark: l.remark || l.name || ''
        })) : [createProductRow()]);
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
    if (!orderHeader.partnerId) return alert("Please select a customer.");
    setLoading(true);
    try {
      const productLines = rows.filter(r => r.productId).map(r => ({
        product_id: parseInt(r.productId),
        qty: parseFloat(r.qty) || 0,
        price_unit: parseFloat(r.price) || 0,
        discount: parseFloat(r.discount) || 0,
        name: r.remark,
        line_type: 'product'
      }));

      const res = await odooService.createQuotation(parseInt(orderHeader.partnerId), productLines, {
        architect_id: orderHeader.architectId ? parseInt(orderHeader.architectId) : null,
        electrician_id: orderHeader.electricianId ? parseInt(orderHeader.electricianId) : null,
        remark: orderHeader.remark,
      });

      if (res.success) {
        alert(editId ? "Order Updated" : "Order Created");
        onNavigate('orders');
      } else {
        alert(res.error?.message || "Error processing order");
      }
    } catch {
      alert("Network error");
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="p-20 text-center text-slate-500">Processing...</div>;

  return (
    <div className="create-order-page dt-page">
        <div className="dt-card">
          <div className="dt-header co-header">
          <div className="co-title">
            <h2>{editId ? "Edit Quotation" : "Create Quotation"}</h2>
            <p className="co-subtitle">Select a customer, add product lines, and submit the quotation.</p>
          </div>
          <div className="co-actions">
            <button className="co-btn co-btn-primary" onClick={() => onNavigate('create-customer')}>New Customer</button>
            <button className="co-btn co-btn-primary" onClick={() => onNavigate('create-product')}>New Product</button>
          </div>
        </div>

        <div className="dt-form co-form">
          <div className="form-group">
            <label>Customer *</label>
            <SearchableSelect
              placeholder="Select Customer..."
              value={orderHeader.partnerId}
              onChange={(val) => setOrderHeader({ ...orderHeader, partnerId: val })}
              options={masterData.partners.map((p) => ({
                value: p.id,
                label: p.name,
              }))}
            />
          </div>
          <div className="form-group">
            <label>Order Date</label>
            <input 
              type="date" 
              value={orderHeader.date}
              onChange={e => setOrderHeader({...orderHeader, date: e.target.value})}
            />
          </div>
        </div>

        <div className="products-table-section">
          <div className="co-section-header">
            <h3>Products</h3>
            <button className="co-btn co-btn-primary" onClick={addRow}>
              <Plus size={16} /> Add Product
            </button>
          </div>
          <div className="table-wrapper">
            <table className="co-table">
              <thead>
                <tr>
                  <th>Sr. No</th>
                  <th>Product</th>
                  <th>Quantity</th>
                  <th>Price</th>
                  <th>Discount %</th>
                  <th>Remark</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, idx) => (
                  <tr key={r.id}>
                    <td className="co-cell-strong" data-label="Sr. No">{idx + 1}</td>
                    <td className="co-col-product" data-label="Product">
                      <SearchableSelect
                        placeholder="Select Product..."
                        value={r.productId}
                        onChange={(val) => handleRowChange(r.id, 'productId', val)}
                        options={masterData.products.map((p) => ({
                          value: p.id,
                          label: p.default_code ? `[${p.default_code}] ${p.name}` : p.name,
                        }))}
                        />
                    </td>
                    <td className="co-col-qty" data-label="Quantity">
                       <input 
                          type="number" 
                          value={r.qty}
                          onChange={e => handleRowChange(r.id, 'qty', e.target.value)}
                       />
                    </td>
                    <td className="co-col-price" data-label="Price">
                       <input 
                          type="number" 
                          value={r.price}
                          onChange={e => handleRowChange(r.id, 'price', e.target.value)}
                       />
                    </td>
                    <td className="co-col-discount" data-label="Discount %">
                       <input
                          type="number"
                          min="0"
                          max="100"
                          value={r.discount}
                          onChange={e => handleRowChange(r.id, 'discount', e.target.value)}
                       />
                    </td>
                    <td className="co-col-remark" data-label="Remark">
                       <textarea 
                          rows="1"
                          placeholder="Please enter remark"
                          value={r.remark}
                          onChange={e => handleRowChange(r.id, 'remark', e.target.value)}
                       />
                    </td>
                    <td className="co-cell-actions" data-label="Action">
                       <button className="co-btn co-btn-danger" onClick={() => setRows(prev => prev.filter(row => row.id !== r.id))} aria-label="Remove product row">
                         <X size={16} />
                       </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="remark-section">
           <label className="co-remark-label">Remark</label>
           <textarea 
              className="co-remark"
              placeholder="Please enter remark"
              value={orderHeader.remark}
              onChange={e => setOrderHeader({...orderHeader, remark: e.target.value})}
           ></textarea>
        </div>

        <div className="dt-footer co-footer">
           <button className="co-btn co-btn-primary co-btn-lg" onClick={handleProcess}>
             {editId ? "Update" : "Submit"}
           </button>
           <button className="co-btn co-btn-secondary co-btn-lg" onClick={() => onNavigate('orders')}>
             Back
           </button>
        </div>
      </div>

    </div>
  );
};

export default CreateOrder;
