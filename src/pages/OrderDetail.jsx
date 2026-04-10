import React, { useState, useEffect } from 'react';
import { ChevronLeft, Edit, CalendarDays, UserRound, MapPin, Package2, FileText, CheckCircle, XCircle, ChevronDown, ToggleRight, Wind, Activity, Layers, Zap, Lightbulb, MoreHorizontal, Printer } from 'lucide-react';
import { odooService } from '../services/odoo';
import Loader from '../components/Loader';
import '../components/Loader.css';
import './OrderDetail.css';
import './Products.css';

const OrderDetail = ({ orderId, onBack, onNavigate }) => {
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showCustomerDetails, setShowCustomerDetails] = useState(false);
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
          <button className="btn-ui" onClick={() => {
            if (order.state === 'selection') onNavigate('selection');
            else if (order.state === 'sale' || order.state === 'done') onNavigate('orders');
            else onNavigate('quotations');
          }} style={{ height: '32px', borderRadius: '4px' }}>
            <ChevronLeft size={16} />
            <span>Back</span>
          </button>
          
          <div className="detail-hero-actions" style={{ display: 'flex', gap: '8px', flex: 1, justifyContent: 'flex-end' }}>
            <button className="btn-ui" onClick={() => odooService.printQuotation(order.id)} style={{ height: '32px', borderRadius: '4px' }}>
              <Printer size={14} />
              <span>Print</span>
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
        </div>        <section className="detail-section">
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
            <label className="pro-toggle-wrap">
              <input type="checkbox" checked={showBeam} onChange={e => setShowBeam(e.target.checked)} className="pro-checkbox" />
              <span className="pro-toggle-label">Beam</span>
            </label>
          </div>

          {orderLines.length > 0 ? (
            <>
              <div className="table-wrapper" style={{ border: '1px solid #eee', borderRadius: '4px', overflowX: 'auto', display: 'block', width: '100%' }}>
                <table className="products-datatable" style={{ width: '100%', minWidth: '700px', tableLayout: 'auto' }}>
                  <thead>
                    <tr>
                      <th style={{ textAlign: 'left', width: '120px' }}>Product</th>
                      {showImg  && <th className="text-center" style={{ width: '60px' }}>Img</th>}
                      {showBeam && <th className="text-center" style={{ width: '80px' }}>Beam</th>}
                      <th className="text-center" style={{ width: '50px' }}>Qty</th>
                      <th className="text-right"  style={{ width: '100px' }}>Price</th>
                      <th className="text-center" style={{ width: '60px' }}>Disc%</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {orderLines.map((line, idx) => {
                      const colCount = 4 + (showImg ? 1 : 0) + (showBeam ? 1 : 0);
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
                          {showImg && (
                            <td className="py-2 px-4" style={{ verticalAlign: 'top' }}>
                              <div style={{ width: '40px', height: '40px', borderRadius: '4px', border: '1px solid #eee', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                {imgSrc && (
                                  <img src={imgSrc} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} onError={(e) => { e.target.style.display = 'none'; }} />
                                )}
                              </div>
                            </td>
                          )}
                          {showBeam && (
                            <td className="py-2 px-4 text-center" style={{ verticalAlign: 'top', fontSize: '11px', color: '#000' }}>
                              {line.beam || '-'}
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
          {order.activities && order.activities.length > 0 && (
            <div style={{ borderRight: isMobile ? 'none' : '1px solid #eee', borderBottom: isMobile ? '1px solid #eee' : 'none' }}>
              <div className="detail-section-header" style={{ padding: '12px 14px' }}>
                <h2 style={{ margin: 0, fontWeight: 700, fontSize: '0.9rem', color: '#000', textTransform: 'uppercase' }}>Tasks</h2>
              </div>
              <div style={{ padding: '0 14px 14px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {order.activities.map((act, idx) => (
                  <div key={idx} className="field-value-box" style={{ padding: '10px 12px', borderRadius: '4px', border: '1px solid #eee', flexDirection: 'column', alignItems: 'flex-start', gap: '4px' }}>
                    <div style={{ display: 'flex', width: '100%', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ fontWeight: 800, fontSize: '13px', color: '#000' }}>
                        {((act.summary || act.activity_type_name) === 'To Do') ? 'Task' : (act.summary || act.activity_type_name || 'Task')}
                      </div>
                      <div style={{ fontSize: '11px', color: '#666', fontWeight: 600 }}>{act.date_deadline || 'No Date'}</div>
                    </div>
                    {act.note && (
                      <div style={{ fontSize: '12px', color: '#000', lineHeight: '1.4' }} dangerouslySetInnerHTML={{ __html: act.note }} />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div>
            <div className="detail-section-header" style={{ padding: '12px 14px' }}>
              <h2 style={{ margin: 0, fontWeight: 700, fontSize: '0.9rem', color: '#000', textTransform: 'uppercase' }}>Remarks</h2>
            </div>            {order.remark ? (() => {
              const noteLines = order.remark
                .split(/\n?---\n?|\n|<br\s*\/?>/)
                .map(t => {
                  const authorMatch = t.match(/<b>(.*?)<\/b>/) || t.match(/^\[(.*?) - .*?\]/);
                  const authorName = authorMatch ? authorMatch[1] : null;
                  let cleanText = t.replace(/<[^>]*>/g, '').trim();
                  
                  if (authorName) {
                    // Strip "Name: " prefix
                    cleanText = cleanText.replace(new RegExp(`^${authorName}:\\s*`, 'i'), '');
                    // Strip "[Name - Date]\n" prefix
                    cleanText = cleanText.replace(new RegExp(`^\\[${authorName}.*?\\].*?(\\n|$)`, 'i'), '');
                  }
                  
                  return { author: authorName, text: cleanText.trim() };
                })
                .filter(o => o.text.length > 0);

              if (noteLines.length === 0) return (
                <div style={{ padding: '0 14px 14px', fontSize: '12px', color: '#999' }}>No remarks.</div>
              );

              return (
                <div style={{ padding: '0 14px 14px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {noteLines.map((n, idx) => (
                    <div key={idx} className="field-value-box" style={{ padding: '10px 12px', borderRadius: '4px', border: '1px solid #eee', flexDirection: 'column', alignItems: 'flex-start', gap: '4px' }}>
                      <p style={{ margin: 0, fontSize: '12px', color: '#000', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{n.text}</p>
                      <span style={{ fontSize: '10px', color: '#999', fontWeight: 600, textTransform: 'uppercase' }}>{n.author ? `By ${n.author}` : `Note #${idx + 1}`}</span>
                    </div>
                  ))}
                </div>
              );
            })() : (
              <div style={{ padding: '0 14px 14px', fontSize: '12px', color: '#999' }}>No remarks.</div>
            )}
          </div>
        </div>

        {order.amy_notes && order.amy_notes.length > 0 && (
          <section className="detail-section">
            <div className="detail-section-header" style={{ padding: '12px 14px' }}>
              <h2 style={{ margin: 0, fontWeight: 700, fontSize: '0.9rem', color: '#000', textTransform: 'uppercase' }}>Activity History</h2>
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
              <button className="btn-ui primary" onClick={handleConfirm} style={{ height: '36px' }}>
                <CheckCircle size={16} />
                <span>Confirm Quotation</span>
              </button>
          )}

          {(order.state === 'draft' || order.state === 'sent' || order.state === 'sale') && (
              <button className="btn-ui" onClick={handleDecline} style={{ height: '36px' }}>
                <XCircle size={16} />
                <span>{order.state === 'sale' ? 'Cancel Order' : 'Cancel Quotation'}</span>
              </button>
          )}

          {order.state === 'selection' && (
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
    </div>
  );
};

export default OrderDetail;
