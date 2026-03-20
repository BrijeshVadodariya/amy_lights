import React, { useState, useEffect } from 'react';
import { ChevronLeft, Edit, CalendarDays, UserRound, MapPin, Package2, FileText } from 'lucide-react';
import { odooService } from '../services/odoo';
import './OrderDetail.css';

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

  if (loading) {
    return (
      <div className="placeholder-content">
        <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full mb-4"></div>
        <p>Loading order details...</p>
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
          <button className="detail-back-btn" onClick={onBack}>
            <ChevronLeft size={18} />
            <span>Back to Orders</span>
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
            <div className="detail-line-list">
              {orderLines.map((line, idx) => (
                <article key={line.id || idx} className="detail-line-card">
                  <div className="detail-line-main">
                    <div className="detail-line-index">{idx + 1}</div>

                    <div className="detail-line-copy">
                      <h3>{formatValue(line.product_name, 'Unnamed product')}</h3>
                      <p>{formatValue(line.remark, 'No remark added')}</p>
                    </div>
                  </div>

                  <div className="detail-line-metrics">
                    <div className="detail-line-metric">
                      <span>Quantity</span>
                      <strong>{formatValue(line.qty, '0')}</strong>
                    </div>

                    <div className="detail-line-metric">
                      <span>Unit Price</span>
                      <strong>{formatCurrency(line.price_unit)}</strong>
                    </div>
                  </div>
                </article>
              ))}
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
          <button className="detail-action-btn detail-action-primary" onClick={() => onNavigate?.('create-order', order.id)}>
            <Edit size={16} />
            <span>Edit Quotation</span>
          </button>

          <button className="detail-action-btn detail-action-secondary" onClick={onBack}>
            <span>Back</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default OrderDetail;
