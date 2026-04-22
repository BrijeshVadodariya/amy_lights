import React, { useState, useEffect, useCallback } from 'react';
import { 
  ChevronLeft, ShoppingCart, Package2, CheckCircle, Printer, 
  XCircle, Calendar, MapPin, ArrowRight, AlertCircle, TrendingUp, User
} from 'lucide-react';
import { odooService } from '../services/odoo';
import Loader from '../components/Loader';
import './DeliveryDetail.css'; // Reusing established ERP styles

const PurchaseDetail = ({ purchaseId, onBack, onNavigate }) => {
  const [po, setPO] = useState(null);
  const [loading, setLoading] = useState(true);
  const [performingAction, setPerformingAction] = useState(false);
  const [activeTab, setActiveTab] = useState('operations');
  const [error, setError] = useState(null);

  const fetchPODetails = useCallback(async () => {
    setLoading(true);
    try {
      const res = await odooService.getPurchases(null, purchaseId); 
      if (res && res.length > 0) {
        setPO(res[0]);
      } else {
        setError("Purchase Order not found");
      }
    } catch (err) {
      setError("Failed to load purchase details");
    } finally {
      setLoading(false);
    }
  }, [purchaseId]);

  useEffect(() => {
    if (purchaseId) fetchPODetails();
  }, [purchaseId, fetchPODetails]);

  const handleAction = async (action) => {
    if (!window.confirm(`Are you sure you want to ${action} this purchase order?`)) return;
    setPerformingAction(true);
    try {
      const res = await odooService.performPurchaseAction(purchaseId, action);
      if (res.success) {
        await fetchPODetails();
      } else {
        alert(res.error || "Action failed");
      }
    } catch (err) {
      alert("Network error");
    } finally {
      setPerformingAction(false);
    }
  };

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
    }).format(val);
  };

  if (loading) return <Loader title="Loading Purchase..." />;
  if (error) return (
    <div className="delivery-error-container">
      <AlertCircle size={48} className="text-red-500 mb-4" />
      <p>{error}</p>
      <button className="btn-ui primary mt-4" onClick={onBack}>Go Back</button>
    </div>
  );
  if (!po) return null;

  return (
    <div className="delivery-detail-page">
      {/* Top Breadcrumb & Navbar */}
      <div className="delivery-navbar">
        <div className="delivery-nav-left">
          <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-full transition-colors border-none bg-transparent cursor-pointer">
            <ChevronLeft size={20} className="text-slate-600" />
          </button>
          <div className="flex flex-col">
            <div className="breadcrumb-label">
              <span>Procurement</span>
              <ArrowRight size={10} />
              <span>Purchase Order</span>
            </div>
            <h1 className="delivery-title">{po.name}</h1>
          </div>
        </div>
        <div className="hidden md:flex gap-2">
            <button className="btn-ui h-[38px] px-4" onClick={() => window.print()}>
                <Printer size={16} />
                <span>Print PO</span>
            </button>
        </div>
      </div>

      <div className="delivery-main-container max-w-7xl mx-auto p-4 md:p-6">
        
        {/* Status Bar (Odoo 19 Style) */}
        <div className="delivery-status-bar">
            <div className="flex gap-2 px-3">
                {po.action_buttons?.confirm && (
                    <button 
                        className="btn-ui primary h-[40px] px-6" 
                        onClick={() => handleAction('confirm')}
                        disabled={performingAction}
                    >
                        <CheckCircle size={18} />
                        <span>Confirm Order</span>
                    </button>
                )}
                {po.action_buttons?.cancel && (
                    <button 
                        className="btn-ui h-[40px] px-6 border-red-100 text-red-600 hover:bg-red-50"
                        onClick={() => handleAction('cancel')}
                        disabled={performingAction}
                    >
                        <XCircle size={18} />
                        <span>Cancel</span>
                    </button>
                )}
            </div>
            <div className="status-steps-container">
                {['draft', 'sent', 'to_approve', 'purchase', 'done'].map((st) => {
                    const isActive = po.state === st;
                    const labels = {
                        'draft': 'RFQ',
                        'sent': 'RFQ Sent',
                        'to_approve': 'To Approve',
                        'purchase': 'Purchase Order',
                        'done': 'Locked'
                    };
                    return (
                        <div 
                            key={st} 
                            className={`status-step ${isActive ? 'active' : ''}`}
                        >
                            <span>{labels[st]}</span>
                        </div>
                    );
                })}
            </div>
        </div>

        {/* Info Cards Grid */}
        <div className="delivery-info-grid">
            <div className="delivery-card">
                <div className="card-header">
                    <User size={18} className="text-blue-500" />
                    <h2>Vendor Details</h2>
                </div>
                <div className="space-y-6">
                    <div className="info-field">
                        <label className="field-label">Vendor</label>
                        <div className="field-value">{po.partner_name}</div>
                    </div>
                    <div className="carrier-badge" style={{ backgroundColor: '#f0fdf4', borderColor: '#dcfce7' }}>
                        <div className="carrier-icon-box" style={{ color: '#16a34a' }}>
                            <TrendingUp size={24} />
                        </div>
                        <div className="flex flex-col">
                            <label className="field-label" style={{ color: '#22c55e' }}>Total Amount</label>
                            <span className="field-value" style={{ fontSize: '1.2rem' }}>{formatCurrency(po.amount_total)}</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="delivery-card">
                 <div className="card-header">
                    <Calendar size={18} className="text-amber-500" />
                    <h2>Timing</h2>
                </div>
                <div className="grid grid-cols-2 gap-6">
                    <div className="info-field">
                        <label className="field-label">Order Date</label>
                        <div className="field-value">{po.date_order || 'N/A'}</div>
                    </div>
                    <div className="info-field">
                        <label className="field-label">Status</label>
                        <div className="flex items-center gap-1">
                            <CheckCircle size={14} className="text-green-500" />
                            <span className="field-value">{po.status_label}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        {/* Purchase Lines */}
        <div className="delivery-tabs-container">
            <div className="tabs-nav">
                <button 
                  onClick={() => setActiveTab('operations')}
                  className={`tab-btn ${activeTab === 'operations' ? 'active' : ''}`}
                >
                    Products
                </button>
            </div>

            <div className="p-0 overflow-x-auto">
                <table className="operations-table">
                    <thead>
                        <tr>
                            <th>Product</th>
                            <th style={{ textAlign: 'right' }}>Quantity</th>
                            <th style={{ textAlign: 'right' }}>Unit Price</th>
                            <th style={{ textAlign: 'right' }}>Subtotal</th>
                        </tr>
                    </thead>
                    <tbody>
                        {po.lines?.map(line => (
                            <tr key={line.id}>
                                <td>
                                    <div className="line-product-name font-bold text-slate-800">{line.product_name}</div>
                                </td>
                                <td style={{ textAlign: 'right' }}>
                                    <div className="qty-pill">{line.qty_ordered} {line.uom}</div>
                                </td>
                                <td style={{ textAlign: 'right' }}>
                                    <div className="text-sm font-bold text-slate-600">{formatCurrency(line.price_unit)}</div>
                                </td>
                                <td style={{ textAlign: 'right' }}>
                                    <div className="text-sm font-black text-slate-900">{formatCurrency(line.price_subtotal)}</div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
      </div>
    </div>
  );
};

export default PurchaseDetail;
