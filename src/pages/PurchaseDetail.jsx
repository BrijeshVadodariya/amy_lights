import React, { useState, useEffect, useCallback } from 'react';
import { 
  ChevronLeft, ShoppingCart, Package2, CheckCircle, Printer, 
  XCircle, Calendar, MapPin, ArrowRight, AlertCircle, TrendingUp, User, Pencil
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

  const lines = po.lines || [];

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
            <button className="btn-ui h-[38px] px-4" onClick={() => onNavigate('create-purchase', po.id)}>
                <Pencil size={16} />
                <span>Edit PO</span>
            </button>
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

        <div className="delivery-info-grid gap-3 md:gap-4 lg:gap-6">
            {/* Vendor & Source Card */}
            <div className="delivery-card shadow-sm border border-slate-200">
                <div className="card-header pb-2 border-b border-slate-50 mb-3">
                    <User size={16} className="text-blue-500" />
                    <h2 className="text-xs font-black uppercase tracking-wider">Vendor & Source</h2>
                </div>
                <div className="space-y-3">
                    <div className="info-field">
                        <label className="field-label text-[10px]">Vendor</label>
                        <div className="field-value font-bold text-slate-900 text-sm">{po.partner_name}</div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div className="info-field">
                            <label className="field-label text-[10px]">Reference</label>
                            <div className="field-value text-slate-500 text-xs truncate">{po.vendor_reference || 'N/A'}</div>
                        </div>
                        <div className="info-field">
                            <label className="field-label text-[10px]">Source</label>
                            <div className="field-value text-slate-500 text-xs truncate">{po.origin || 'N/A'}</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Financial Status Card */}
            <div className="delivery-card shadow-sm border border-slate-200">
                <div className="card-header pb-2 border-b border-slate-50 mb-3">
                    <TrendingUp size={16} className="text-green-500" />
                    <h2 className="text-xs font-black uppercase tracking-wider">Financial Summary</h2>
                </div>
                <div className="space-y-3">
                    <div className="carrier-badge shadow-inner flex items-center gap-3" style={{ backgroundColor: '#f0fdf4', borderColor: '#dcfce7', flex: 1, padding: '10px', borderRadius: '12px' }}>
                        <div className="carrier-icon-box shrink-0" style={{ color: '#16a34a', width: '28px', height: '28px', background: '#fff' }}>
                            <Package2 size={16} />
                        </div>
                        <div className="flex flex-col">
                            <label className="field-label !mb-0 text-[9px] uppercase font-black" style={{ color: '#16a34a' }}>Total Amount</label>
                            <span className="field-value" style={{ fontSize: '1.1rem', fontWeight: 900, color: '#065f46' }}>{formatCurrency(po.amount_total)}</span>
                        </div>
                    </div>
                    <div className="info-field bg-slate-50/50 p-2 rounded-lg">
                        <label className="field-label text-[10px]">Payment Terms</label>
                        <div className="field-value text-[11px] font-bold text-slate-700">{po.payment_terms || 'Immediate Payment'}</div>
                    </div>
                </div>
            </div>

            {/* Timeline & Status Card */}
            <div className="delivery-card shadow-sm border border-slate-200">
                 <div className="card-header pb-2 border-b border-slate-50 mb-3">
                    <Calendar size={16} className="text-amber-500" />
                    <h2 className="text-xs font-black uppercase tracking-wider">Status & Timeline</h2>
                </div>
                <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                        <div className="info-field">
                            <label className="field-label text-[10px]">Order Date</label>
                            <div className="field-value text-xs">{po.date_order || 'N/A'}</div>
                        </div>
                        <div className="info-field">
                            <label className="field-label text-[10px]">Status</label>
                            <div className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                                po.state === 'purchase' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'
                            }`}>
                                <CheckCircle size={10} />
                                <span>{po.status_label}</span>
                            </div>
                        </div>
                    </div>
                    <div className="info-field bg-slate-50/50 p-2 rounded-lg">
                        <label className="field-label text-[10px]">Purchaser</label>
                        <div className="field-value flex items-center gap-2">
                             <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center text-[9px] font-black text-white shadow-sm">
                                {po.purchaser?.charAt(0) || 'S'}
                             </div>
                             <span className="text-slate-700 text-xs font-bold">{po.purchaser || 'System'}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        {/* Purchase Lines - Optimized Space */}
        <div className="delivery-tabs-container mt-4 border border-slate-200 shadow-sm overflow-hidden rounded-xl">
            <div className="tabs-nav px-4 py-3 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
                <h3 className="text-xs font-black uppercase tracking-widest text-slate-500 m-0">Products & Line Items</h3>
                <span className="text-[10px] bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full font-bold">{lines.length} Items</span>
            </div>

            <div className="p-0 overflow-x-auto bg-white">
                <table className="operations-table w-full">
                    <thead className="bg-slate-50/50">
                        <tr>
                            <th className="py-2 px-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-wider">Product Description</th>
                            <th className="py-2 px-2 text-center text-[10px] font-black text-slate-400 uppercase tracking-wider">Quantity</th>
                            <th className="py-2 px-2 text-right text-[10px] font-black text-slate-400 uppercase tracking-wider">Unit Price</th>
                            <th className="py-2 px-4 text-right text-[10px] font-black text-slate-400 uppercase tracking-wider">Subtotal</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {lines.map(line => (
                            <tr key={line.id} className="hover:bg-slate-50/50 transition-colors">
                                <td className="py-3 px-4">
                                    <div className="line-product-name font-bold text-slate-900 text-sm leading-tight">{line.product_name}</div>
                                    {line.product_code && (
                                         <div className="text-[9px] text-blue-500 font-black mt-1 inline-block bg-blue-50 px-1.5 py-0.5 rounded uppercase">{line.product_code}</div>
                                    )}
                                </td>
                                <td className="py-3 px-2 text-center">
                                    <div className="inline-flex items-center justify-center bg-slate-100 text-slate-800 font-bold text-[11px] px-2 py-1 rounded-lg">
                                        {line.qty_ordered} <span className="ml-1 text-[9px] text-slate-400">{line.uom}</span>
                                    </div>
                                </td>
                                <td className="py-3 px-2 text-right">
                                    <div className="text-xs font-bold text-slate-600">{formatCurrency(line.price_unit)}</div>
                                </td>
                                <td className="py-3 px-4 text-right">
                                    <div className="text-sm font-black text-slate-900">{formatCurrency(line.price_subtotal)}</div>
                                </td>
                            </tr>
                        ))}
                        {lines.length === 0 && (
                            <tr>
                                <td colSpan="4" className="py-16 text-center">
                                    <AlertCircle size={32} className="mx-auto text-slate-200 mb-2" />
                                    <div className="text-sm font-bold text-slate-400 tracking-tight">No products found in this order</div>
                                    <div className="text-[10px] text-slate-300">Wait for data to refresh or contact procurement</div>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
      </div>
    </div>
  );
};

export default PurchaseDetail;
