import React, { useState, useEffect } from 'react';
import { ChevronLeft, Edit, CalendarDays, UserRound, MapPin, Package2, FileText, CheckCircle, XCircle } from 'lucide-react';
import { odooService } from '../services/odoo';
import Loader from '../components/Loader';
import '../components/Loader.css';
import './OrderDetail.css';
import './Products.css';

const OrderDetail = ({ orderId, onBack, onNavigate }) => {
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  const formatValue = (value, fallback = 'Not available') => {
    if (value === null || value === undefined || value === '') return fallback;
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
      const res = await odooService.confirmQuotation(orderId);
      if (res.success) {
        alert("Quotation Confirmed!");
        onBack();
      }
    } catch {
      alert("Error confirming quotation");
    }
  };

  const handleDecline = async () => {
    if (!window.confirm("Decline this quotation?")) return;
    try {
      const res = await odooService.declineQuotation(orderId);
      if (res.success) {
        alert("Quotation Declined");
        onBack();
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
        alert(`${stateName} created successfully!`);
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

  const infoItems = [
    { label: 'Customer Name', value: formatValue(order.partner_name) },
    { label: 'Billing Name', value: formatValue(order.billing_name) },
    { label: 'Contact Person', value: formatValue(order.contact_person) },
    { label: 'Mobile Number', value: formatValue(order.mobile) },
    { label: 'Order Date', value: formatValue(order.date_order) },
    { label: 'Billing Address', value: formatValue(order.billing_address) },
    { label: 'Delivery Address', value: formatValue(order.delivery_address) },
    { label: 'Electrician', value: formatValue(order.electrician) },
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
              {order.state === 'selection' ? 'Back to Selections' : 
               (order.state === 'sale' || order.state === 'done') ? 'Back to Orders' : 
               'Back to Quotations'}
            </span>
          </button>

          <div className="detail-hero-copy">
            <span className="detail-eyebrow">Order Details</span>
            <h1>{formatValue(order.name, 'Order')}</h1>
            <p>{formatValue(order.partner_name, 'Customer details unavailable')}</p>
          </div>

          <div className="detail-hero-status">
            <span className={`status-pill status-${order.state}`}>
              {formatValue(order.state, 'draft')}
            </span>
          </div>
        </div>

        <div className="detail-summary-grid">
          <div className="summary-card">
            <div className="summary-icon">
              <UserRound size={18} />
            </div>
            <div>
              <span className="summary-label">Customer</span>
              <strong>{formatValue(order.partner_name)}</strong>
            </div>
          </div>

          <div className="summary-card">
            <div className="summary-icon">
              <CalendarDays size={18} />
            </div>
            <div>
              <span className="summary-label">Order Date</span>
              <strong>{formatValue(order.date_order)}</strong>
            </div>
          </div>

          <div className="summary-card">
            <div className="summary-icon">
              <Package2 size={18} />
            </div>
            <div>
              <span className="summary-label">Line Items</span>
              <strong>{orderLines.length}</strong>
            </div>
          </div>

          <div className="summary-card">
            <div className="summary-icon">
              <MapPin size={18} />
            </div>
            <div>
              <span className="summary-label">Delivery</span>
              <strong>{formatValue(order.delivery_address, 'Pending address')}</strong>
            </div>
          </div>
        </div>

        <section className="detail-section">
          <div className="detail-section-header">
            <div>
              <span className="detail-section-kicker">Overview</span>
              <h2>Customer and Delivery</h2>
            </div>
          </div>

          <div className="detail-info-grid">
            {infoItems.map((item) => (
              <div key={item.label} className="detail-info-card">
                <span className="detail-info-label">{item.label}</span>
                <div className="field-value-box">{item.value}</div>
              </div>
            ))}
          </div>
        </section>

        <section className="detail-section">
          <div className="detail-section-header">
            <div>
              <span className="detail-section-kicker">Items</span>
              <h2>Products in This Order</h2>
            </div>
          </div>

          {orderLines.length ? (
            <div className="table-wrapper overflow-x-auto border border-slate-200 rounded-lg mt-4">
              <table className="products-datatable w-full">
                <thead className="bg-[#fcfcfc] border-b text-slate-700 uppercase tracking-tight text-[11px] font-bold">
                  <tr>
                    <th className="py-3 px-4 text-left w-12 border-none">#</th>
                    <th className="py-3 px-4 text-left w-16 border-none">Img</th>
                    <th className="py-3 px-4 text-left border-none">Product Name</th>
                    <th className="py-3 px-4 text-center w-24 border-none">Qty</th>
                    <th className="py-3 px-4 text-right w-32 border-none">Unit Price</th>
                    <th className="py-3 px-4 text-right w-32 border-none">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {orderLines.map((line, idx) => (
                    <tr key={line.id || idx} className="row-hover">
                      <td className="py-4 px-4 text-slate-400 font-medium">{idx + 1}</td>
                      <td className="py-4 px-4">
                        <div className="w-12 h-12 rounded border border-slate-100 overflow-hidden bg-slate-50 flex items-center justify-center">
                           {line.image_url ? (
                             <img 
                               src={(() => {
                                 const url = line.image_url;
                                 const token = localStorage.getItem('odoo_session_id') || '';
                                 const db = import.meta.env.VITE_ODOO_DB || 'stage';
                                 return `${line.image_url}?token=${token}&db=${db}`;
                               })()} 
                               alt="" 
                               className="w-full h-full object-contain" 
                               onError={(e) => { 
                                 e.target.onerror = null;
                                 e.target.src = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxIiBoZWlnaHQ9IjEiPjxyZWN0IHdpZHRoPSIxIiBoZWlnaHQ9IjEiIGZpbGw9IiNmMWY1ZjkiLz48L3N2Zz4='; 
                               }}
                             />
                           ) : (
                             <Package2 size={18} className="text-slate-200" />
                           )}
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="font-bold text-slate-800">{formatValue(line.product_name, 'Unnamed product')}</div>
                        <div className="text-[11px] text-slate-500 mt-0.5">{formatValue(line.remark, '')}</div>
                      </td>
                      <td className="py-4 px-4 text-center font-medium text-slate-700">{formatValue(line.qty, '0')}</td>
                      <td className="py-4 px-4 text-right text-slate-700">{formatCurrency(line.price_unit)}</td>
                      <td className="py-4 px-4 text-right font-bold text-slate-900">
                        {formatCurrency(Number(line.qty || 0) * Number(line.price_unit || 0))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="detail-empty-state">
              <Package2 size={20} />
              <span>No product lines were added to this order.</span>
            </div>
          )}
        </section>

        <section className="detail-section">
          <div className="detail-section-header">
            <div>
              <span className="detail-section-kicker">Notes</span>
              <h2>Remark</h2>
            </div>
          </div>

          <div className="remark-value-box">
            <FileText size={18} />
            <p>{formatValue(order.remark, 'No remark added for this order.')}</p>
          </div>
        </section>

        <div className="detail-footer-actions">
          {order.state !== 'sale' && order.state !== 'done' && order.state !== 'cancel' && (
            <button className="detail-action-btn detail-action-primary" onClick={() => onNavigate?.(order.state === 'selection' ? 'create-selection' : 'create-order', order.id)}>
              <Edit size={16} />
              <span>{order.state === 'selection' ? 'Edit Selection' : 'Edit Quotation'}</span>
            </button>
          )}

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
    </div>
  );
};

export default OrderDetail;
