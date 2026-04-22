import React, { useState, useEffect } from 'react';
import { ChevronLeft, Edit, CalendarDays,Sparkles, ShoppingCart, Calendar,MessageSquare, UserRound, MapPin, Package2, FileText, CheckCircle, XCircle, ChevronDown, ToggleRight, Wind, Activity, Layers, Zap, Lightbulb, MoreHorizontal, Printer, Plus, Edit2, Trash, MessageCircle, Truck } from 'lucide-react';
import { odooService } from '../services/odoo';
import Loader from '../components/Loader';
import SearchableSelect from '../components/SearchableSelect';
import WhatsappModal from '../components/WhatsappModal';
import { QuickNoteModal, QuickTaskModal } from '../components/QuickActionModals';
import '../components/Loader.css';
import './OrderDetail.css';
import './Products.css';

const OrderDetail = ({ orderId, onBack, onNavigate }) => {
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showCustomerDetails, setShowCustomerDetails] = useState(false);
  const [showWhatsappModal, setShowWhatsappModal] = useState(false);
  const [isMobile, setIsMobile] = useState(() => (
    typeof window !== 'undefined' ? window.innerWidth <= 1024 : false
  ));
  const [lightboxImage, setLightboxImage] = useState(null);
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [users, setUsers] = useState([]);
  const [noteTypes, setNoteTypes] = useState([]);
  const [editingActivityId, setEditingActivityId] = useState(null);
  const [activityEditVals, setActivityEditVals] = useState({ summary: '', note: '', date_deadline: '', user_id: '' });
  const [editingRemarkIdx, setEditingRemarkIdx] = useState(null);
  const [remarkEditText, setRemarkEditText] = useState('');
  const [noteInput, setNoteInput] = useState('');
  const [addingNote, setAddingNote] = useState(false);

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await odooService.getMasterData();
        if (res.users) setUsers(res.users);
        if (res.amy_note_types) setNoteTypes(res.amy_note_types);
      } catch (err) { console.error("Error fetching master data:", err); }
    };
    fetch();
  }, []);

  // Column-visibility toggles — initialised from backend flags, user can override locally
  const [showDesc, setShowDesc]   = useState(false);
  const [showImg,  setShowImg]    = useState(false);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 1024);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const formatValue = (value, fallback = 'Not available') => {
    if (value === null || value === undefined || value === '' || value === 'null') return fallback;
    return value;
  };

  const formatCurrency = (value) => {
    const amount = Number(value);
    if (!Number.isFinite(amount)) return '-';

    return `${order?.currency_symbol || ''} ${amount.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`.trim();
  };

  const fetchOrder = React.useCallback(async () => {
    try {
      const res = await odooService.getOrderDetail(orderId);
      if (res) {
        setOrder(res);
        setShowDesc(!!res.is_desc);
        setShowImg(!!res.is_image);
      }
    } catch (err) {
      console.error('Error fetching order details', err);
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  const handleShowDeliveries = () => {
    const count = order.delivery_count ?? (order.picking_ids?.length ?? 0);
    if (count === 1 && order.picking_ids?.length === 1) {
        onNavigate('delivery-detail', order.picking_ids[0]);
    } else {
        onNavigate('delivery-list', orderId);
    }
  };

  const handleShowPurchases = () => {
    const count = order.purchase_count ?? (order.purchase_ids?.length ?? 0);
    if (count === 1 && order.purchase_ids?.length === 1) {
        onNavigate('purchase-detail', order.purchase_ids[0]);
    } else {
        onNavigate('purchase-list', orderId);
    }
  };

  useEffect(() => {
    if (orderId) fetchOrder();
  }, [orderId, fetchOrder]);

  const handleConfirm = async () => {
    if (!window.confirm("Confirm this quotation?")) return;
    try {
      const res = await odooService.confirmOrder(orderId);
      if (res.success) {
        alert("Quotation Confirmed!");
        onBack();
      } else {
        alert(res.error?.message || "Failed to confirm");
      }
    } catch {
      alert("Error confirming quotation");
    }
  };

  const handleDecline = async () => {
    if (!window.confirm("Decline this quotation?")) return;
    try {
      const res = await odooService.declineOrder(orderId);
      if (res.success) {
        alert("Quotation Declined");
        onBack();
      } else {
        alert(res.error?.message || "Failed to decline");
      }
    } catch {
      alert("Error declining quotation");
    }
  };

  const handleConvertSelection = async (targetState) => {
    const stateName = targetState === 'sale' ? 'Sale Order' : 'Quotation';
    if (!window.confirm(`Convert this selection to a ${stateName}?`)) return;
    try {
      const res = await odooService.convertSelection(orderId, targetState);
      if (res.success) {
        onNavigate(targetState === 'sale' ? 'orders' : 'quotations');
      } else {
        alert(res.error?.message || `Error converting to ${stateName}`);
      }
    } catch {
      alert("Network error while converting.");
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(`Are you sure you want to delete this ${order.state === 'sale' ? 'Confirmed Order' : order.state === 'selection' ? 'Selection' : 'Quotation'}?`)) return;
    try {
      setLoading(true);
      if (order.state === 'sale') {
        const cancelRes = await odooService.declineOrder(orderId, "Cancelled before deletion");
        if (!cancelRes.success && cancelRes.error) {
          alert(cancelRes.error.message || "Failed to cancel before deletion");
          setLoading(false);
          return;
        }
      }
      const res = await odooService.deleteOrder(orderId);
      if (res.success || !res.error) {
        onBack();
      } else {
        alert(res.error?.message || "Deletion failed");
        setLoading(false);
      }
    } catch {
      alert("Network error");
      setLoading(false);
    }
  };

  const handleAddNote = async () => {
    if (!noteInput.trim()) return;
    setAddingNote(true);
    try {
      const res = await odooService.addQuickNote(orderId, noteInput, 'sale.order');
      if (res.success || !res.error) {
        setNoteInput('');
        fetchOrder();
      } else {
        alert(res.error || "Failed to add note");
      }
    } catch {
      alert("Network error while adding note");
    } finally {
      setAddingNote(false);
    }
  };

  if (loading) {
    return (
      <div className="order-detail-page detail-page-shell flex flex-col items-center justify-center min-vh-70">
        <Loader message="Fetching order details..." />
      </div>
    );
  }

  if (!order) {
    return <div className="p-8 text-center text-red-500 card">Order not found or access denied.</div>;
  }

  const fullAddress = [
    order.street,
    order.street2,
    order.city,
    order.zip,
    order.state_id?.[1] || order.state_name
  ].filter(part => part && part !== 'Not available' && part !== 'null').join(', ');

  const infoItems = [
    { 
      label: 'Customer', 
      value: (
        <div>
          <div className="font-bold text-slate-900">{formatValue(order.partner_name)}</div>
          <div className="text-[12px] text-slate-500 font-medium">
            {order.phone && <div>{order.phone}</div>}
            {order.email && order.email !== 'null' && <div className="text-slate-400">{order.email}</div>}
            {order.vat && order.vat !== 'null' && <div className="mt-1 text-slate-400 uppercase">GST: {order.vat}</div>}
          </div>
        </div>
      ) 
    },
    { 
      label: 'Architect', 
      value: (
        <div>
          <div className="font-bold text-slate-900">{formatValue(order.architect)}</div>
          {order.architect_phone && order.architect_phone !== 'null' && (
            <div className="text-[12px] text-slate-500 font-medium">{order.architect_phone}</div>
          )}
        </div>
      ) 
    },
    { 
      label: 'Electrician', 
      value: (
        <div>
          <div className="font-bold text-slate-900">{formatValue(order.electrician)}</div>
          {order.electrician_phone && order.electrician_phone !== 'null' && (
            <div className="text-[12px] text-slate-500 font-medium">{order.electrician_phone}</div>
          )}
        </div>
      ) 
    },
    { label: 'Address', value: formatValue(fullAddress) },
  ];

  const orderLines = order.lines || [];

  return (
    <div className="order-detail-page detail-page-shell">
      <div className="detail-card detail-surface">
        <div className="detail-hero">
          <button className="btn-ui" onClick={onBack} style={{ height: '32px', borderRadius: '4px' }}>
            <ChevronLeft size={16} />
            <span>Back</span>
          </button>

          {/* Odoo-style Smart Button - Centered */}
          <div className="oe_button_box center-box">
            {(order.delivery_count !== undefined || order.picking_count !== undefined || (order.picking_ids?.length > 0)) && (
              <button 
                className="smart-button" 
                onClick={handleShowDeliveries}
                title="View Deliveries"
              >
                <div className="smart-button-inner">
                  <Truck size={20} className="smart-icon" />
                  <div className="smart-label-group">
                    <span className="smart-count">{order.delivery_count ?? (order.picking_ids?.length ?? 0)}</span>
                    <span className="smart-label">Delivery</span>
                  </div>
                </div>
              </button>
            )}

            {(order.purchase_count > 0 || (order.purchase_ids?.length > 0)) && (
              <button 
                className="smart-button purchase-btn" 
                onClick={handleShowPurchases}
                title="View Purchases"
                style={{ marginLeft: '8px' }}
              >
                <div className="smart-button-inner">
                  <ShoppingCart size={20} className="smart-icon" style={{ color: '#8b5cf6' }} />
                  <div className="smart-label-group">
                    <span className="smart-count" style={{ color: '#8b5cf6' }}>{order.purchase_count ?? (order.purchase_ids?.length ?? 0)}</span>
                    <span className="smart-label">Purchase</span>
                  </div>
                </div>
              </button>
            )}
          </div>
                   <div className="detail-hero-actions">
            <button 
              className="btn-ui hover:bg-[#25D366] hover:text-white" 
              onClick={() => setShowWhatsappModal(true)} 
              style={{ height: '32px', borderRadius: '4px', transition: 'all 0.2s', borderColor: 'transparent' }}
            >
              <MessageCircle size={14} />
              <span className="hidden sm:inline">WhatsApp</span>
            </button>
            <button className="btn-ui" onClick={() => odooService.printQuotation(order.id)} style={{ height: '32px', borderRadius: '4px' }}>
              <Printer size={14} />
              <span>Print</span>
            </button>
            <button 
              className="btn-ui hover:bg-red-50 hover:text-red-500 hover:border-red-200" 
              onClick={handleDelete}
              style={{ height: '32px', borderRadius: '4px', transition: 'all 0.2s' }}
            >
              <Trash size={14} />
              <span className="hidden sm:inline">Delete</span>
            </button>
            {(order.state === 'draft' || order.state === 'sent' || order.state === 'selection') && (
              <button 
                className="btn-ui primary"
                onClick={() => onNavigate?.(order.state === 'selection' ? 'create-selection' : 'create-order', order.id)}
                style={{ height: '32px', borderRadius: '4px' }}
              >
                <Edit size={14} />
                <span>{order.state === 'selection' ? 'Edit Selection' : 'Edit Quotation'}</span>
              </button>
            )}
          </div>
        </div>
        <section className="detail-section">
          <div 
            className="detail-section-header collapsible-trigger" 
            onClick={() => setShowCustomerDetails(!showCustomerDetails)}
            style={{ cursor: 'pointer', userSelect: 'none', padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flex: 1, minWidth: 0 }}>
              {!showCustomerDetails && (
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '12px', 
                  fontSize: '15px', 
                  color: '#000', 
                  flex: 1,
                  minWidth: 0
                }}>
                  <div style={{ fontSize: '16px', fontWeight: 900, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: isMobile ? '135px' : '200px' }}>
                    {order.partner_name}
                  </div>
                  <div style={{ 
                    fontSize: '14px',
                    whiteSpace: 'nowrap', 
                    overflow: 'hidden', 
                    textOverflow: 'ellipsis', 
                    color: '#666',
                    fontWeight: 600,
                    flex: 1
                  }}>
                    {fullAddress}
                  </div>
                </div>
              )}
            </div>
            
            <div className={`section-toggle-icon ${showCustomerDetails ? 'rotate-180' : ''}`} style={{ width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ChevronDown size={14} />
            </div>
          </div>

          {showCustomerDetails && (
            <div className="animate-fade-in" style={{ padding: '0 14px 14px' }}>
              <div className="detail-info-grid" style={{ 
                display: 'grid',
                gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4, 1fr)',
                gap: '8px'
              }}>
                <div className="detail-info-card" style={{ gridColumn: isMobile ? 'span 2' : 'auto' }}>
                  <span className="dt-control-label" style={{ marginBottom: '4px', display: 'block' }}>Customer</span>
                  <div className="field-value-box" style={{ padding: '8px 12px', borderRadius: '4px', border: '1px solid #eee' }}>{infoItems[0].value}</div>
                </div>
                
                <div className="detail-info-card">
                  <span className="dt-control-label" style={{ marginBottom: '4px', display: 'block' }}>Architect</span>
                  <div className="field-value-box" style={{ padding: '8px 12px', borderRadius: '4px', border: '1px solid #eee' }}>{infoItems[1].value}</div>
                </div>

                <div className="detail-info-card">
                  <span className="dt-control-label" style={{ marginBottom: '4px', display: 'block' }}>Electrician</span>
                  <div className="field-value-box" style={{ padding: '8px 12px', borderRadius: '4px', border: '1px solid #eee' }}>{infoItems[2].value}</div>
                </div>

                <div className="detail-info-card" style={{ gridColumn: isMobile ? 'span 2' : 'auto' }}>
                  <span className="dt-control-label" style={{ marginBottom: '4px', display: 'block' }}>Address</span>
                  <div className="field-value-box" style={{ padding: '8px 12px', borderRadius: '4px', border: '1px solid #eee', fontSize: '11px', lineHeight: 1.4 }}>{infoItems[3].value}</div>
                </div>
              </div>
            </div>
          )}
        </section>        <section className="detail-section">
          <div className="detail-section-header" style={{ padding: '12px 14px' }}>
            <h2 style={{ margin: 0, fontWeight: 700, fontSize: '0.9rem', color: '#000', textTransform: 'uppercase' }}>Items</h2>
          </div>

          {/* Column-visibility toggles */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center', margin: '4px 14px 12px', paddingBottom: '8px', borderBottom: '1px solid #f5f5f5' }}>
            <label className="pro-toggle-wrap">
              <input type="checkbox" checked={showDesc} onChange={e => setShowDesc(e.target.checked)} className="pro-checkbox" />
              <span className="pro-toggle-label">Description</span>
            </label>
            <label className="pro-toggle-wrap">
              <input type="checkbox" checked={showImg} onChange={e => setShowImg(e.target.checked)} className="pro-checkbox" />
              <span className="pro-toggle-label">Image</span>
            </label>

          </div>

          {orderLines.length > 0 ? (
            <>
              <div className="table-wrapper" style={{ border: '1px solid #eee', borderRadius: '4px', overflowX: 'auto', display: 'block', width: '100%' }}>
                <table className="products-datatable" style={{ width: '100%', minWidth: '700px', tableLayout: 'auto' }}>
                  <thead>
                    <tr>
                      <th style={{ textAlign: 'left', minWidth: '320px', width: '350px' }}>Product</th>
                      <th style={{ textAlign: 'left', width: '150px' }}>Notes</th>
                      {showImg  && <th className="text-center" style={{ width: '60px' }}>Img</th>}

                      <th className="text-center" style={{ width: '50px' }}>Qty</th>
                      <th className="text-right"  style={{ width: '100px' }}>Price</th>
                      <th className="text-center" style={{ width: '60px' }}>Disc%</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {orderLines.map((line, idx) => {
                      const colCount = 5 + (showImg ? 1 : 0);
                      const isSection = line.display_type === 'line_section' || (!line.product_id && line.product_name && line.qty === 0);
                      const isNote    = line.display_type === 'line_note';

                      if (isSection || isNote) {
                        return (
                          <tr key={line.id || idx} className={isSection ? 'bg-slate-50' : 'bg-white'}>
                            <td colSpan={colCount} className="py-2 px-4" style={{ textAlign: 'left' }}>
                              <span style={{ fontWeight: 850, color: '#000', fontSize: '13px', textTransform: 'uppercase' }}>
                                {line.product_name}
                              </span>
                            </td>
                          </tr>
                        );
                      }

                      const token   = localStorage.getItem('odoo_session_id') || '';
                      const db      = import.meta.env.VITE_ODOO_DB || 'stage';
                      let imgPath   = line.image_url;
                      if (!imgPath && line.product_id) {
                        const pId = Array.isArray(line.product_id) ? line.product_id[0] : line.product_id;
                        if (pId) imgPath = `/web/image/product.template/${pId}/image_128`;
                      }
                      const imgSrc = imgPath ? `${imgPath}${imgPath.includes('?') ? '&' : '?'}token=${token}&db=${db}` : '';
                      const descText = line.description || '';

                      return (
                        <tr key={line.id || idx} className="row-hover">
                          <td className="py-2 px-4" style={{ verticalAlign: 'top', textAlign: 'left' }}>
                            <div style={{ fontWeight: 500, color: '#000', fontSize: '13px' }}>
                              {line.product_name || 'Unnamed product'}
                            </div>
                            {showDesc && descText && (
                              <div style={{ marginTop: '2px', fontSize: '11px', color: '#666', whiteSpace: 'pre-wrap' }}>
                                {descText}
                              </div>
                            )}
                            {line.remark && line.remark !== descText && (
                              <div style={{ marginTop: '2px', fontSize: '10px', color: '#999' }}>
                                {line.remark}
                              </div>
                            )}
                          </td>
                          <td className="py-2 px-4" style={{ verticalAlign: 'top', textAlign: 'left' }}>
                            {line.line_note && (
                              <div style={{ padding: '6px', fontSize: '11px', color: '#1e293b', background: '#f8fafc', borderRadius: '4px', borderLeft: '2px solid #3b82f6', whiteSpace: 'pre-wrap' }}>
                                {line.line_note}
                              </div>
                            )}
                          </td>
                          {showImg && (
                            <td className="py-2 px-4" style={{ verticalAlign: 'top' }}>
                              <div style={{ width: '40px', height: '40px', borderRadius: '4px', border: '1px solid #eee', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                {imgSrc && (
                                  <img src={imgSrc} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} onError={(e) => { e.target.style.display = 'none'; }} />
                                )}
                              </div>
                            </td>
                          )}

                          <td className="py-2 px-4 text-center" style={{ verticalAlign: 'top', fontWeight: 600 }}>{line.qty || '0'}</td>
                          <td className="py-2 px-4 text-right" style={{ verticalAlign: 'top' }}>{formatCurrency(line.price_unit)}</td>
                          <td className="py-2 px-4 text-center" style={{ verticalAlign: 'top', color: '#666' }}>
                            {line.discount ? `${line.discount}%` : '-'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Summary Block */}
              <div style={{ marginTop: '8px', padding: '0 14px 14px', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                <div style={{ display: 'flex', width: isMobile ? '100%' : '260px', justifyContent: 'space-between', fontSize: '12px', color: '#666' }}>
                  <span>Untaxed Amount:</span>
                  <span style={{ fontWeight: 600, color: '#000' }}>
                    {formatCurrency(orderLines.reduce((acc, l) => acc + (Number(l.qty || 0) * Number(l.price_unit || 0)), 0))}
                  </span>
                </div>
                {orderLines.some(l => l.discount) && (
                  <div style={{ display: 'flex', width: isMobile ? '100%' : '260px', justifyContent: 'space-between', fontSize: '12px', color: '#000' }}>
                    <span>Discount:</span>
                    <span style={{ fontWeight: 600 }}>
                      -{formatCurrency(orderLines.reduce((acc, l) => acc + (Number(l.qty || 0) * Number(l.price_unit || 0) * (Number(l.discount || 0) / 100)), 0))}
                    </span>
                  </div>
                )}
                <div style={{ display: 'flex', width: isMobile ? '100%' : '260px', justifyContent: 'space-between', fontSize: '12px', color: '#666' }}>
                  <span>Taxes:</span>
                  <span style={{ fontWeight: 600, color: '#000' }}>
                    {formatCurrency((order?.amount_total || 0) - orderLines.reduce((acc, l) => acc + (Number(l.qty || 0) * Number(l.price_unit || 0) * (1 - (Number(l.discount || 0) / 100))), 0))}
                  </span>
                </div>
                <div style={{ borderTop: '1px solid #eee', width: isMobile ? '100%' : '260px', marginTop: '4px', paddingTop: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '12px', fontWeight: 800, color: '#000', textTransform: 'uppercase' }}>Total:</span>
                  <span style={{ fontSize: '18px', fontWeight: 900, color: '#000' }}>{formatCurrency(order?.amount_total || 0)}</span>
                </div>
              </div>
            </>
          ) : (
            <div className="detail-empty-state" style={{ margin: '0 14px 14px' }}>
              <Package2 size={16} />
              <span>No items added.</span>
            </div>
          )}
        </section>

        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
          borderTop: '1px solid #eee'
        }}>
          {/* Tasks Column */}
          <div style={{ borderRight: isMobile ? 'none' : '1px solid #eee', borderBottom: isMobile ? '1px solid #eee' : '1px solid #eee' }}>
            <div className="detail-section-header" style={{ padding: '12px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ margin: 0, fontWeight: 700, fontSize: '0.9rem', color: '#000', textTransform: 'uppercase' }}>Tasks</h2>
              <button 
                className="ghost-action-btn" 
                onClick={() => setShowTaskModal(true)}
                style={{ padding: '4px 10px', height: '28px', fontSize: '11px', color: '#3b82f6', fontWeight: 700 }}
              >
                <Plus size={14} />
                <span>Add Task</span>
              </button>
            </div>
            <div style={{ padding: '0 14px', borderBottom: '14px solid transparent', display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '300px', overflowY: 'auto', minHeight: '0', boxSizing: 'border-box' }}>
              {(!order.activities || order.activities.length === 0) ? (
                <div style={{ textAlign: 'center', padding: '20px', color: '#94a3b8', fontSize: '12px', fontWeight: 500 }}>
                  No planned tasks found.
                </div>
              ) : (
                (() => {
                  const seen = new Set();
                  return order.activities.filter(act => {
                    const cleanNote = (act.note || '').replace(/<[^>]*>?/gm, '').trim().toLowerCase();
                    const key = `${act.summary}-${cleanNote}-${act.date_deadline}`.toLowerCase();
                    if (seen.has(key)) return false;
                    seen.add(key);
                    return true;
                  });
                })().map((act, idx) => (
                  <div key={act.id || idx} className="field-value-box" style={{ padding: '10px 12px', borderRadius: '8px', border: '1px solid #eee', flexDirection: 'column', alignItems: 'flex-start', gap: '6px', flexShrink: 0 }}>
                    {editingActivityId === act.id ? (
                      <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                          <input
                            type="date"
                            value={activityEditVals.date_deadline}
                            onChange={e => setActivityEditVals({ ...activityEditVals, date_deadline: e.target.value })}
                            style={{ width: '100%', height: '32px', padding: '0 8px', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '13px', outline: 'none' }}
                          />
                          <SearchableSelect
                            placeholder="Assignee"
                            value={activityEditVals.user_id}
                            small
                            options={users.map(u => ({ value: u.id, label: u.name }))}
                            onChange={val => setActivityEditVals({ ...activityEditVals, user_id: val })}
                          />
                        </div>
                        <textarea
                          value={activityEditVals.note}
                          onChange={e => setActivityEditVals({ ...activityEditVals, note: e.target.value })}
                          placeholder="Message..."
                          style={{ width: '100%', minHeight: '70px', padding: '8px', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '13px', resize: 'vertical', outline: 'none' }}
                        />
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button
                            onClick={async () => {
                              if (!activityEditVals.note.trim()) return alert("Message is required");
                              try {
                                const res = await odooService.updateActivity(act.id, activityEditVals.summary, activityEditVals.note, activityEditVals.date_deadline, activityEditVals.user_id);
                                if (res.success || !res.error) { fetchOrder(); setEditingActivityId(null); }
                                else alert(res.error || 'Update failed');
                              } catch { alert('Network error'); }
                            }}
                            style={{ background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '6px', padding: '6px 14px', fontWeight: 700, fontSize: '12px', cursor: 'pointer' }}
                          >
                            Save
                          </button>
                          <button
                            onClick={() => setEditingActivityId(null)}
                            style={{ background: '#f1f5f9', color: '#64748b', border: 'none', borderRadius: '6px', padding: '6px 14px', fontWeight: 600, fontSize: '12px', cursor: 'pointer' }}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div style={{ width: '100%', marginBottom: '4px' }}>
                          {act.summary && !['task', 'to do', 'todo'].includes(act.summary.toLowerCase()) && (
                            <div style={{ fontWeight: 800, fontSize: '13px', color: '#000', marginBottom: '2px' }}>
                               {act.summary}
                            </div>
                          )}
                          <div 
                            style={{ 
                              fontSize: '14px', // Slightly larger
                              color: '#0f172a', // Darker/Higher contrast
                              lineHeight: '1.5',
                              fontWeight: 600, // Semi-bold for highlights
                              marginBottom: '8px'
                            }} 
                            dangerouslySetInnerHTML={{ __html: act.note }} 
                          />
                        </div>
                        <div style={{ display: 'flex', width: '100%', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 500 }}>
                            Assigned to: <span style={{ fontWeight: 500, color: '#94a3b8' }}>{act.user_name || 'Unassigned'}</span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 500 }}>{act.date_deadline || 'No Date'}</span>
                            <button
                              onClick={() => {
                                setEditingActivityId(act.id);
                                setActivityEditVals({
                                  summary: act.summary || '',
                                  note: (act.note || '').replace(/<[^>]*>/g, '').trim(),
                                  date_deadline: act.date_deadline || '',
                                  user_id: act.user_id ? String(act.user_id) : ''
                                });
                              }}
                              style={{ border: 'none', background: 'none', color: '#cbd5e1', cursor: 'pointer' }}
                            >
                              <Edit2 size={13} />
                            </button>
                            <button
                              onClick={async () => {
                                if (!window.confirm('Delete this task?')) return;
                                try {
                                  const res = await odooService.deleteActivity(act.id);
                                  if (res.success || !res.error) fetchOrder();
                                  else alert(res.error || 'Delete failed');
                                } catch { alert('Network error'); }
                              }}
                              style={{ border: 'none', background: 'none', color: '#cbd5e1', cursor: 'pointer' }}
                            >
                              <Trash size={13} />
                            </button>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Remarks Column */}
          <div style={{ background: '#fff' }}>
            <div className="detail-section-header" style={{ padding: '12px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ margin: 0, fontWeight: 700, fontSize: '0.9rem', color: '#000', textTransform: 'uppercase' }}>General Notes</h2>
              <button 
                className="ghost-action-btn" 
                onClick={() => setShowNoteModal(true)}
                style={{ padding: '4px 10px', height: '28px', fontSize: '11px', color: '#10b981', fontWeight: 700 }}
              >
                <Plus size={14} />
                <span>Add Remark</span>
              </button>
            </div>
            <div style={{ padding: '0 14px', borderBottom: '14px solid transparent', display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '300px', overflowY: 'auto', minHeight: '0', boxSizing: 'border-box' }}>
              {(!order.remarks || order.remarks.length === 0) ? (
                <div style={{ textAlign: 'center', padding: '20px', color: '#94a3b8', fontSize: '12px', fontWeight: 500 }}>
                  No internal remarks found.
                </div>
              ) : (
                (() => {
                  const seen = new Set();
                  return order.remarks.filter(r => {
                    const text = (r.remark || '').trim().toLowerCase();
                    if (!text || seen.has(text)) return false;
                    seen.add(text);
                    return true;
                  });
                })().map((r, idx) => (
                  <div key={r.id} className="field-value-box" style={{ padding: '10px 12px', borderRadius: '8px', border: '1px solid #eee', flexDirection: 'column', alignItems: 'flex-start', gap: '6px', flexShrink: 0 }}>
                    <div style={{ display: 'flex', width: '100%', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
                      <span style={{ fontSize: '10px', color: '#666', fontWeight: 800, textTransform: 'uppercase' }}>
                        {r.salesperson} · {r.date}
                      </span>
                      <div style={{ display: 'flex', gap: '4px' }}>
                        <button
                          onClick={() => { setEditingRemarkIdx(r.id); setRemarkEditText(r.remark); }}
                          style={{ border: 'none', background: 'none', color: '#94a3b8', cursor: 'pointer' }}
                          title="Edit"
                        >
                          <Edit2 size={13} />
                        </button>
                        <button
                          onClick={async () => {
                            if (!window.confirm('Delete this note?')) return;
                            try {
                              const res = await odooService.deleteRemark(r.id);
                              if (res.success || !res.error) fetchOrder();
                              else alert(res.error || 'Delete failed');
                            } catch { alert('Network error'); }
                          }}
                          style={{ border: 'none', background: 'none', color: '#94a3b8', cursor: 'pointer' }}
                          title="Delete"
                        >
                          <Trash size={13} />
                        </button>
                      </div>
                    </div>
                    {editingRemarkIdx === r.id ? (
                      <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <textarea
                          value={remarkEditText}
                          onChange={e => setRemarkEditText(e.target.value)}
                          style={{ width: '100%', minHeight: '70px', padding: '8px', borderRadius: '8px', border: '1px solid #3b82f6', fontSize: '13px', resize: 'vertical', outline: 'none' }}
                        />
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button
                            onClick={async () => {
                              if (!remarkEditText.trim()) return alert("Remark is required");
                              try {
                                const res = await odooService.updateRemark(r.id, remarkEditText);
                                if (res.success || !res.error) { fetchOrder(); setEditingRemarkIdx(null); }
                                else alert(res.error || 'Update failed');
                              } catch { alert('Network error'); }
                            }}
                            style={{ background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '6px', padding: '5px 14px', fontWeight: 700, fontSize: '12px', cursor: 'pointer' }}
                          >
                            Save
                          </button>
                          <button
                            onClick={() => setEditingRemarkIdx(null)}
                            style={{ background: '#f1f5f9', color: '#64748b', border: 'none', borderRadius: '6px', padding: '5px 14px', fontWeight: 600, fontSize: '12px', cursor: 'pointer' }}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <p style={{ margin: 0, fontSize: '13px', color: '#000', lineHeight: 1.5, whiteSpace: 'pre-wrap', flex: 1 }}>{r.remark}</p>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {order.amy_notes && order.amy_notes.length > 0 && (
          <section className="detail-section">
            <div className="detail-section-header" style={{ padding: '12px 14px' }}>
              <h2 style={{ margin: 0, fontWeight: 700, fontSize: '0.9rem', color: '#000', textTransform: 'uppercase' }}>Activity History</h2>
            </div>

            {(() => {
              // Helper to resolve a typeVal to a known noteType
              const resolveType = (typeVal) => {
                if (!typeVal) return null;
                const v = typeVal.toLowerCase().trim();
                // 1. Exact match first
                let found = noteTypes.find(t => String(t.id).toLowerCase() === v);
                if (found) return found;
                // 2. Plural-insensitive
                found = noteTypes.find(t => {
                  const tid = String(t.id).toLowerCase();
                  return tid === v.replace(/s$/, '') || v === tid.replace(/s$/, '');
                });
                return found || null;
              };

              const getIcon = (type) => {
                const t = String(type || '').toLowerCase();
                if (t.includes('switch')) return <ToggleRight size={18} />;
                if (t.includes('fan')) return <Wind size={18} />;
                if (t.includes('light')) return <Lightbulb size={18} />;
                if (t.includes('profile')) return <Layers size={18} />;
                if (t.includes('decorative')) return <Sparkles size={18} />;
                if (t.includes('other')) return <MoreHorizontal size={18} />;
                return <MoreHorizontal size={18} />;
              };

              // Group notes by their resolved category
              const grouped = {}; // key = typeId, value = { typeInfo, notes[] }
              order.amy_notes.forEach(note => {
                const rawType = String(note.note_type || '').trim();
                const typeInfo = resolveType(rawType);
                const key = typeInfo ? typeInfo.id : (rawType || 'others');
                const title = typeInfo ? typeInfo.title : (rawType ? rawType.charAt(0).toUpperCase() + rawType.slice(1) : 'Others');
                if (!grouped[key]) grouped[key] = { title, key, notes: [] };
                grouped[key].notes.push(note);
              });

              return (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', padding: '12px 14px' }}>
                  {Object.values(grouped).map(group => (
                    <div
                      key={group.key}
                      className="detail-info-card activity-note-card"
                      style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}
                    >
                      {/* Category Header */}
                      <div className="activity-note-type-label" style={{ marginBottom: '4px' }}>
                        {getIcon(group.key)}
                        <span style={{ textTransform: 'uppercase', fontSize: '11px', fontWeight: 800, letterSpacing: '0.05em' }}>{group.title}</span>
                      </div>

                      {/* All notes in this category */}
                      {group.notes.map(note => (
                        <div key={note.id} style={{ borderTop: '1px solid #f1f5f9', paddingTop: '8px' }}>
                          {note.text && (
                            <div className="activity-note-text-box" style={{ marginBottom: '8px' }}>
                              <p>{note.text}</p>
                            </div>
                          )}
                          {note.images && note.images.length > 0 && (
                            <div className="activity-note-media-grid">
                              {note.images.map((img, i) => (
                                <div
                                  key={i}
                                  className="activity-media-item"
                                  onClick={() => {
                                    const token = localStorage.getItem('odoo_session_id') || '';
                                    const db = import.meta.env.VITE_ODOO_DB || 'stage';
                                    setLightboxImage(`${img}${img.includes('?') ? '&' : '?'}token=${token}&db=${db}`);
                                  }}
                                >
                                  <img
                                    src={`${img}${img.includes('?') ? '&' : '?'}token=${localStorage.getItem('odoo_session_id') || ''}&db=${import.meta.env.VITE_ODOO_DB || 'stage'}`}
                                    alt="Attachment"
                                    onError={(e) => { e.target.style.display = 'none'; }}
                                  />
                                  {note.images.length > 1 && (
                                    <span className="media-count-badge">{i + 1}/{note.images.length}</span>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              );
            })()}
          </section>
        )}

        <div className="detail-footer-actions">
          {(order.state === 'draft' || order.state === 'sent') && (
              <button className="btn-ui primary" onClick={handleConfirm} style={{ height: '36px' }}>
                <CheckCircle size={16} />
                <span>Confirm Quotation</span>
              </button>
          )}

          {(order.state === 'draft' || order.state === 'sent' || order.state === 'sale' || order.state === 'cancel') && (
            <div style={{ display: 'flex', gap: '8px' }}>
              {order.state !== 'cancel' && (
                <button className="btn-ui" onClick={handleDecline} style={{ height: '36px', flex: 1 }}>
                  <XCircle size={16} />
                  <span>{order.state === 'sale' ? 'Cancel Order' : 'Cancel Quotation'}</span>
                </button>
              )}
              <button 
                className="btn-ui hover:bg-red-50 hover:text-red-500" 
                onClick={handleDelete} 
                style={{ height: '36px', flex: 1, borderColor: 'transparent' }}
              >
                <Trash size={16} color="#ef4444" />
                <span style={{ color: '#ef4444' }}>Delete {order.state === 'sale' ? 'Order' : 'Quotation'}</span>
              </button>
            </div>
          )}

          {order.state === 'selection' && (
            <div style={{ display: 'flex', gap: '8px', flexDirection: 'column', width: '1000px', maxWidth: '100%' }}>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button className="btn-ui primary" onClick={() => handleConvertSelection('draft')} style={{ height: '36px', flex: 1 }}>
                  <FileText size={16} />
                  <span>Draft Quotation</span>
                </button>
                <button className="btn-ui primary" onClick={() => handleConvertSelection('sale')} style={{ height: '36px', flex: 1, background: '#000' }}>
                  <CheckCircle size={16} />
                  <span>Confirm Order</span>
                </button>
              </div>
              <button 
                className="btn-ui hover:bg-red-50 hover:text-red-500" 
                onClick={handleDelete} 
                style={{ height: '36px', width: '100%', borderColor: 'transparent' }}
              >
                <Trash size={16} color="#ef4444" />
                <span style={{ color: '#ef4444' }}>Delete Selection</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {lightboxImage && (
        <div className="lightbox-overlay" onClick={() => setLightboxImage(null)}>
          <div className="lightbox-close" onClick={() => setLightboxImage(null)}>
            <XCircle size={32} />
          </div>
          <div className="lightbox-frame" onClick={(e) => e.stopPropagation()}>
            <img src={lightboxImage} alt="Fullscreen View" />
          </div>
        </div>
      )}

      {showNoteModal && (
        <QuickNoteModal 
          orderId={orderId}
          onClose={() => setShowNoteModal(false)}
          onSuccess={() => { fetchOrder(); setShowNoteModal(false); }}
        />
      )}

      {showTaskModal && (
        <QuickTaskModal 
          orderId={orderId}
          users={users}
          onClose={() => setShowTaskModal(false)}
          onSuccess={() => { fetchOrder(); setShowTaskModal(false); }}
        />
      )}
      
      <WhatsappModal 
        isOpen={showWhatsappModal}
        onClose={() => setShowWhatsappModal(false)}
        resModel="sale.order"
        resId={order.id}
        defaultMobile={order.phone}
        defaultMessage={`Hello ${order.partner_name || ''},\n\nHere is your ${order.state === 'selection' ? 'selection' : 'quotation'} ${order.name || ''} for an amount of ${formatCurrency(order.amount_total)}.\n\nBest regards,`}
      />

    </div>
  );
};

export default OrderDetail;
