import React, { useState, useEffect } from 'react';
import { ChevronLeft, Edit, CalendarDays, UserRound, MapPin, Package2, FileText, CheckCircle, XCircle, ChevronDown, ToggleRight, Wind, Activity, Layers, Zap, Lightbulb, MoreHorizontal } from 'lucide-react';
import { odooService } from '../services/odoo';
import Loader from '../components/Loader';
import '../components/Loader.css';
import './OrderDetail.css';
import './Products.css';

const OrderDetail = ({ orderId, onBack, onNavigate }) => {
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showCustomerDetails, setShowCustomerDetails] = useState(true);
  const [isMobile, setIsMobile] = useState(() => (
    typeof window !== 'undefined' ? window.innerWidth <= 1024 : false
  ));
  const [lightboxImage, setLightboxImage] = useState(null);

  // Column-visibility toggles — initialised from backend flags, user can override locally
  const [showDesc, setShowDesc]   = useState(false);
  const [showImg,  setShowImg]    = useState(false);
  const [showBeam, setShowBeam]   = useState(false);

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

  useEffect(() => {
    const fetchDetail = async () => {
      try {
        const res = await odooService.getOrderDetail(orderId);
        if (res) {
          setOrder(res);
          // Seed column toggles from backend flags
          setShowDesc(!!res.is_desc);
          setShowImg(!!res.is_image);
          setShowBeam(!!res.is_beam);
        }
      } catch (err) {
        console.error('Error fetching order details', err);
      } finally {
        setLoading(false);
      }
    };

    if (orderId) fetchDetail();
  }, [orderId]);

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
          <div className="text-[12px] text-slate-500 font-medium">{formatValue(order.mobile)}</div>
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
    { label: 'Customer Address', value: formatValue(fullAddress) },
  ];

  const orderLines = order.lines || [];

  return (
    <div className="order-detail-page detail-page-shell">
      <div className="detail-card detail-surface">
        <div className="detail-hero">
          <button className="detail-back-btn" onClick={() => {
            if (order.state === 'selection') {
              onNavigate('selection');
            } else if (order.state === 'sale' || order.state === 'done') {
              onNavigate('orders');
            } else {
              onNavigate('quotations');
            }
          }}>
            <ChevronLeft size={18} />
            <span>
              {order.state === 'selection' ? 'Back' : 
               (order.state === 'sale' || order.state === 'done') ? 'Back' : 
               'Back'}
            </span>
          </button>

          <div className="detail-hero-copy">
            <span className="detail-eyebrow">Order Details</span>
          </div>

          <div className="detail-hero-status" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span className={`status-pill status-${order.state}`}>
              {formatValue(order.state, 'draft')}
            </span>
            {order.state !== 'sale' && order.state !== 'done' && order.state !== 'cancel' && (
              <button 
                onClick={() => onNavigate?.(order.state === 'selection' ? 'create-selection' : 'create-order', order.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '6px',
                  backgroundColor: '#f8fafc', color: '#334155', border: '1px solid #e2e8f0',
                  padding: '6px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: 600,
                  cursor: 'pointer', transition: 'all 0.2s'
                }}
                onMouseOver={(e) => { e.currentTarget.style.backgroundColor = '#f1f5f9'; e.currentTarget.style.borderColor = '#cbd5e1'; }}
                onMouseOut={(e) => { e.currentTarget.style.backgroundColor = '#f8fafc'; e.currentTarget.style.borderColor = '#e2e8f0'; }}
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
            style={{ cursor: 'pointer', userSelect: 'none' }}
          >
            <div>
              <span className="detail-section-kicker">Overview</span>
              <h2 style={{ marginBottom: '2px', display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                <span className="font-bold">{formatValue(order.name)}</span>
                <span style={{ fontSize: '1.05rem', color: '#64748b', fontWeight: 700 }}>
                  {formatValue(order.date_order ? order.date_order.split(' ')[0] : '')}
                </span>
              </h2>
            </div>
            <div className={`section-toggle-icon ${showCustomerDetails ? 'rotate-180' : ''}`}>
              <ChevronDown size={20} />
            </div>
          </div>

          {showCustomerDetails && (
            <div className="animate-fade-in" style={{ padding: isMobile ? '0 0 1rem 0' : '0 1.5rem 1.5rem' }}>
              <div className="detail-info-grid" style={{ 
                marginBottom: isMobile ? '0.75rem' : '1.5rem',
                display: 'grid',
                gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(3, 1fr)',
                gap: isMobile ? '0.5rem' : '1.5rem'
              }}>
                <div className="detail-info-card" style={{ gridColumn: isMobile ? 'span 2' : 'auto' }}>
                  <span className="detail-info-label" style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>{infoItems[0].label}</span>
                  <div className="field-value-box" style={{ background: '#f8fafc', padding: '12px 14px', borderRadius: '10px', border: '1px solid #f1f5f9' }}>{infoItems[0].value}</div>
                </div>
                
                <div className="detail-info-card">
                  <span className="detail-info-label" style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>{infoItems[1].label}</span>
                  <div className="field-value-box" style={{ background: '#f8fafc', padding: '12px 14px', borderRadius: '10px', border: '1px solid #f1f5f9' }}>{infoItems[1].value}</div>
                </div>

                <div className="detail-info-card">
                  <span className="detail-info-label" style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>{infoItems[2].label}</span>
                  <div className="field-value-box" style={{ background: '#f8fafc', padding: '12px 14px', borderRadius: '10px', border: '1px solid #f1f5f9' }}>{infoItems[2].value}</div>
                </div>
              </div>
              <div className="detail-info-card" style={{ border: 'none', background: 'none', padding: 0 }}>
                <span className="detail-info-label" style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>{infoItems[3].label}</span>
                <div className="field-value-box" style={{ background: '#f8fafc', padding: '12px 14px', borderRadius: '10px', border: '1px solid #f1f5f9' }}>{infoItems[3].value}</div>
              </div>
            </div>
          )}
        </section>

        <section className="detail-section">
          <div className="detail-section-header">
            <div>
              <span className="detail-section-kicker">Items</span>
              <h2>Products in This Order</h2>
            </div>
          </div>

          {/* Column-visibility toggles — same style as CreateOrder */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.25rem', alignItems: 'center', margin: '0.75rem 0', paddingBottom: '0.75rem', borderBottom: '1px solid #f1f5f9' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', fontWeight: 500, color: '#334155', cursor: 'pointer' }}>
              <input type="checkbox" checked={showDesc} onChange={e => setShowDesc(e.target.checked)} style={{ width: '16px', height: '16px', cursor: 'pointer' }} />
              Description
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', fontWeight: 500, color: '#334155', cursor: 'pointer' }}>
              <input type="checkbox" checked={showImg} onChange={e => setShowImg(e.target.checked)} style={{ width: '16px', height: '16px', cursor: 'pointer' }} />
              Image
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', fontWeight: 500, color: '#334155', cursor: 'pointer' }}>
              <input type="checkbox" checked={showBeam} onChange={e => setShowBeam(e.target.checked)} style={{ width: '16px', height: '16px', cursor: 'pointer' }} />
              Beam
            </label>
          </div>

          {orderLines.length > 0 ? (() => {
            // colCount drives colSpan on section/note rows
            const colCount = 4 + (showImg ? 1 : 0) + (showBeam ? 1 : 0);

            return (
              <div className="table-wrapper-fixed-outer" style={{ width: '100%', maxWidth: '100%', overflow: 'hidden', border: '1px solid #e2e8f0', borderRadius: '12px', marginTop: '1rem' }}>
                <div className="table-wrapper-scrollable-inner" style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch', display: 'block', width: '100%' }}>
                  <table className="products-datatable" style={{ width: '100%', minWidth: '700px', borderCollapse: 'collapse' }}>
                    <thead className="bg-[#fcfcfc] border-b text-slate-700 uppercase tracking-tight text-[11px] font-bold">
                      <tr>
                        <th className="py-3 px-4 text-left border-none" style={{ minWidth: '240px' }}>Product Name</th>
                        {showImg  && <th className="py-3 px-4 text-center border-none" style={{ width: '72px' }}>Img</th>}
                        {showBeam && <th className="py-3 px-4 text-center border-none" style={{ width: '100px' }}>Beam</th>}
                        <th className="py-3 px-4 text-center border-none" style={{ width: '72px' }}>Qty</th>
                        <th className="py-3 px-4 text-right border-none"  style={{ width: '110px' }}>Unit Price</th>
                        <th className="py-3 px-4 text-center border-none" style={{ width: '80px' }}>Disc (%)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {orderLines.map((line, idx) => {
                        const isSection = line.display_type === 'line_section' || (!line.product_id && line.product_name && line.qty === 0);
                        const isNote    = line.display_type === 'line_note';

                        if (isSection || isNote) {
                          return (
                            <tr key={line.id || idx} className={isSection ? 'bg-slate-100/60' : 'bg-slate-50/20'}>
                              <td colSpan={colCount} className="py-5 px-6">
                                <span style={{ fontWeight: 700, color: 'black', fontSize: '15px', textTransform: 'uppercase', letterSpacing: '-0.03em', display: 'block' }}>
                                  {line.product_name}
                                </span>
                              </td>
                            </tr>
                          );
                        }

                        // Resolve image URL
                        const token   = localStorage.getItem('odoo_session_id') || '';
                        const db      = import.meta.env.VITE_ODOO_DB || 'stage';
                        let imgPath   = line.image_url;
                        if (!imgPath && line.product_id) {
                          const pId = Array.isArray(line.product_id) ? line.product_id[0] : line.product_id;
                          if (pId) imgPath = `/web/image/product.template/${pId}/image_128`;
                        }
                        const imgSrc = imgPath ? `${imgPath}${imgPath.includes('?') ? '&' : '?'}token=${token}&db=${db}` : '';

                        // Description: Odoo stores it in line.description (or line.name which carries the product desc with \n)
                        // The remark field (line.remark) is the user-typed note; description is the product spec block
                        const descText = line.description || '';

                        return (
                          <tr key={line.id || idx} className="row-hover">
                            {/* Product name + optional description block */}
                            <td className="py-3 px-4" style={{ verticalAlign: 'top' }}>
                              <div style={{ fontWeight: 700, color: '#1e293b', fontSize: '14px', lineHeight: 1.4 }}>
                                {formatValue(line.product_name, 'Unnamed product')}
                              </div>
                              {showDesc && descText && (
                                <div style={{
                                  marginTop: '4px',
                                  fontSize: '12px',
                                  color: '#475569',
                                  lineHeight: 1.6,
                                  whiteSpace: 'pre-wrap',   /* preserve \n line breaks from Odoo */
                                  fontStyle: 'italic'
                                }}>
                                  {descText}
                                </div>
                              )}
                              {/* Remark (user note) always shown as a subtle tag */}
                              {line.remark && line.remark !== descText && (
                                <div style={{ marginTop: '4px', fontSize: '11px', color: '#94a3b8', fontStyle: 'normal' }}>
                                  {line.remark}
                                </div>
                              )}
                            </td>

                            {/* Image thumbnail */}
                            {showImg && (
                              <td className="py-3 px-4" style={{ verticalAlign: 'top' }}>
                                <div style={{ width: '52px', height: '52px', borderRadius: '8px', border: '1px solid #e2e8f0', overflow: 'hidden', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                  {imgSrc && (
                                    <img
                                      src={imgSrc}
                                      alt=""
                                      style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                                      onError={(e) => { e.target.style.display = 'none'; }}
                                    />
                                  )}
                                </div>
                              </td>
                            )}

                            {/* Beam */}
                            {showBeam && (
                              <td className="py-3 px-4 text-center" style={{ verticalAlign: 'top', fontSize: '12px', color: '#475569', fontWeight: 500 }}>
                                {line.beam || '-'}
                              </td>
                            )}

                            <td className="py-3 px-4 text-center font-medium text-slate-700" style={{ verticalAlign: 'top' }}>{formatValue(line.qty, '0')}</td>
                            <td className="py-3 px-4 text-right text-slate-700" style={{ verticalAlign: 'top' }}>{formatCurrency(line.price_unit)}</td>
                            <td className="py-3 px-4 text-center text-slate-500 font-medium" style={{ verticalAlign: 'top' }}>
                              {line.discount ? `${line.discount}%` : '-'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Summary Block outside table */}
                <div style={{ marginTop: '1.5rem', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px', padding: '0 1rem 1rem' }}>
                  <div style={{ display: 'flex', width: isMobile ? '100%' : '300px', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '14px', color: '#64748b', fontWeight: 600 }}>Untaxed Amount:</span>
                    <span style={{ fontSize: '15px', fontWeight: 700, color: '#1e293b' }}>
                      {formatCurrency(orderLines.reduce((acc, l) => acc + (Number(l.qty || 0) * Number(l.price_unit || 0)), 0))}
                    </span>
                  </div>

                  {orderLines.some(l => l.discount) && (
                    <div style={{ display: 'flex', width: isMobile ? '100%' : '300px', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '14px', color: '#ef4444', fontWeight: 600 }}>Discount:</span>
                      <span style={{ fontSize: '15px', fontWeight: 700, color: '#dc2626' }}>
                        -{formatCurrency(orderLines.reduce((acc, l) => acc + (Number(l.qty || 0) * Number(l.price_unit || 0) * (Number(l.discount || 0) / 100)), 0))}
                      </span>
                    </div>
                  )}

                  <div style={{ display: 'flex', width: isMobile ? '100%' : '300px', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '14px', color: '#64748b', fontWeight: 600 }}>Taxes:</span>
                    <span style={{ fontSize: '15px', fontWeight: 700, color: '#1e293b' }}>
                      {formatCurrency((order?.amount_total || 0) - orderLines.reduce((acc, l) => acc + (Number(l.qty || 0) * Number(l.price_unit || 0) * (1 - (Number(l.discount || 0) / 100))), 0))}
                    </span>
                  </div>

                  <div style={{ borderTop: '2px solid #f1f5f9', width: isMobile ? '100%' : '320px', margin: '8px 0', padding: '12px 0 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '16px', color: '#1e293b', fontWeight: 900 }}>Total:</span>
                    <span style={{ fontSize: '24px', fontWeight: 950, color: '#059669' }}>{formatCurrency(order?.amount_total || 0)}</span>
                  </div>
                </div>
              </div>
            );
          })() : (
            <div className="detail-empty-state">
              <Package2 size={20} />
              <span>No product lines were added to this order.</span>
            </div>
          )}
        </section>

        {order.activities && order.activities.length > 0 && (
          <section className="detail-section">
            <div className="detail-section-header" style={{ marginBottom: '1rem' }}>
              <div>
                <span className="detail-section-kicker">Tasks</span>
                <h2>Planned Activities</h2>
              </div>
            </div>
            <div className="activity-list" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {order.activities.map((act, idx) => (
                <div key={idx} className="activity-card" style={{ padding: '1rem', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                  <div style={{ backgroundColor: '#fff', border: '1px solid #cbd5e1', width: '36px', height: '36px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <CalendarDays size={18} className="text-slate-500" />
                  </div>
                  <div style={{ flex: 1 }}>
                    <h4 style={{ margin: '0 0 4px', fontSize: '15px', fontWeight: 700, color: '#1e293b' }}>{((act.summary || act.activity_type_name) === 'To Do') ? 'Task' : (act.summary || act.activity_type_name || 'Task')}</h4>
                    {act.note && (
                      <p style={{ margin: '0 0 8px', fontSize: '14px', color: '#475569', lineHeight: '1.4' }} dangerouslySetInnerHTML={{ __html: act.note }} />
                    )}
                    <div style={{ display: 'flex', gap: '12px', fontSize: '12px', color: '#64748b', alignItems: 'center' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <CalendarDays size={12} />
                        {act.date_deadline || 'No Date'}
                      </span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <UserRound size={12} />
                        {act.user_name || 'Unassigned'}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        <section className="detail-section">
          <div className="detail-section-header" style={{ marginBottom: '1rem' }}>
            <div>
              <span className="detail-section-kicker">Notes</span>
              <h2>Remarks</h2>
            </div>
          </div>

          {order.remark ? (() => {
            // Split by the separator we use when joining in CreateOrder ('---')
            const noteLines = order.remark
              .replace(/<[^>]*>/g, '')       // strip any HTML tags
              .split(/\n?---\n?|\n/)           // split by '---' separator or plain newlines
              .map(t => t.trim())
              .filter(t => t.length > 0);

            if (noteLines.length === 0) {
              return (
                <div className="remark-value-box">
                  <FileText size={18} />
                  <p>No remark added for this order.</p>
                </div>
              );
            }

            return (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {noteLines.map((line, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '0.85rem',
                      background: 'linear-gradient(180deg, #f8fbff 0%, #eef5ff 100%)',
                      border: '1px solid #dbeafe',
                      borderRadius: '14px',
                      padding: '1rem 1.25rem',
                    }}
                  >
                    <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#dbeafe', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <FileText size={14} style={{ color: '#2563eb' }} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ margin: 0, fontSize: '0.93rem', color: '#334155', lineHeight: 1.6, whiteSpace: 'pre-wrap', overflowWrap: 'break-word', wordBreak: 'normal' }}>
                        {line}
                      </p>
                      <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 600 }}>Note #{idx + 1}</span>
                    </div>
                  </div>
                ))}
              </div>
            );
          })() : (
            <div className="remark-value-box">
              <FileText size={18} />
              <p>No remark added for this order.</p>
            </div>
          )}
        </section>

        {order.amy_notes && order.amy_notes.length > 0 && (
          <section className="detail-section">
            <div className="detail-section-header">
              <div>
                <span className="detail-section-kicker">Activity</span>
                <h2>Activity Notes & Attachments</h2>
              </div>
            </div>

            <div className="activity-notes-stack">
              {order.amy_notes.map((note) => {
                const getIcon = (type) => {
                  switch(type) {
                    case 'switches': return <ToggleRight size={18} />;
                    case 'fans': return <Wind size={18} />;
                    case 'ac': return <Activity size={18} />;
                    case 'curtains': return <Layers size={18} />;
                    case 'automation': return <Zap size={18} />;
                    case 'lights': return <Lightbulb size={18} />;
                    case 'profiles': return <Layers size={18} />;
                    default: return <MoreHorizontal size={18} />;
                  }
                };

                const isLong = (note.text && note.text.length > 200) || (note.images && note.images.length > 3);
                
                return (
                  <div 
                    key={note.id} 
                    className="detail-info-card activity-note-card"
                    style={isLong ? { gridColumn: 'span 2' } : {}}
                  >
                    <div className="activity-note-type-label">
                      {getIcon(note.note_type)}
                      <span>{note.note_type}</span>
                    </div>
                    
                    {note.text && (
                      <div className="activity-note-text-box">
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
                );
              })}
            </div>
          </section>
        )}

        <div className="detail-footer-actions">
          {(order.state === 'draft' || order.state === 'sent') && (
              <button 
                className="btn-action-soft btn-confirm-soft w-auto"
                onClick={handleConfirm}
              >
                <CheckCircle size={18} />
                <span>Confirm Quotation</span>
              </button>
          )}

          {(order.state === 'draft' || order.state === 'sent' || order.state === 'sale') && (
              <button 
                className="btn-action-soft btn-cancel-soft w-auto"
                onClick={handleDecline}
              >
                <XCircle size={18} />
                <span>{order.state === 'sale' ? 'Cancel Order' : 'Cancel Quotation'}</span>
              </button>
          )}

          {order.state === 'selection' && (
            <>
              <button 
                className="btn-action-soft btn-confirm-soft w-auto bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200"
                onClick={() => handleConvertSelection('draft')}
              >
                <FileText size={18} />
                <span>Convert to Quotation</span>
              </button>
              
              <button 
                className="btn-action-soft btn-confirm-soft w-auto bg-green-50 text-green-700 hover:bg-green-100 border border-green-200"
                onClick={() => handleConvertSelection('sale')}
              >
                <CheckCircle size={18} />
                <span>Convert to Order</span>
              </button>
            </>
          )}

          <button className="detail-action-btn detail-action-secondary" onClick={() => {
            if (order.state === 'selection') {
              onNavigate('selection');
            } else if (order.state === 'sale' || order.state === 'done') {
              onNavigate('orders');
            } else {
              onNavigate('quotations');
            }
          }}>
            <span>Back</span>
          </button>
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
    </div>
  );
};

export default OrderDetail;
