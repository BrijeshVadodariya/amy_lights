import React, { useState, useEffect, useCallback } from 'react';
import { 
  ChevronLeft, ShoppingCart, Package2, ArrowRight, 
  Calendar, ChevronRight, Search, Filter, User
} from 'lucide-react';
import { odooService } from '../services/odoo';
import Loader from '../components/Loader';
import './DeliveryDetail.css';

const PurchaseList = ({ orderId, onBack, onNavigate }) => {
  const [purchases, setPurchases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchList = useCallback(async () => {
    setLoading(true);
    try {
      const res = await odooService.getPurchases(orderId);
      const items = res || [];
      setPurchases(items);
      
      if (items.length === 1) {
        onNavigate('purchase-detail', items[0].id, null, true);
      }
    } catch (err) {
      console.error("Failed to fetch purchase list", err);
    } finally {
      setLoading(false);
    }
  }, [orderId, onNavigate]);

  useEffect(() => {
    if (orderId) fetchList();
  }, [orderId, fetchList]);

  const filtered = purchases.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (p.partner_name && p.partner_name.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
    }).format(val);
  };

  if (loading || purchases.length === 1) return <Loader title="Managing Procurements..." />;

  return (
    <div className="delivery-detail-page">
      <div className="delivery-navbar">
        <div className="delivery-nav-left">
          <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-full transition-colors border-none bg-transparent cursor-pointer">
            <ChevronLeft size={20} className="text-slate-600" />
          </button>
          <div className="flex flex-col">
            <h1 className="delivery-title">Purchase Orders</h1>
            <div className="breadcrumb-label">Origin: {orderId}</div>
          </div>
        </div>
      </div>

      <div className="delivery-list-container">
        <div className="search-header">
            <div className="search-box">
                <Search className="search-icon" size={18} />
                <input 
                    type="text" 
                    placeholder="Search PO or Vendor..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
            <div className="hidden md:flex items-center gap-2 text-slate-400 text-xs font-bold uppercase">
                <Filter size={14} />
                <span>Found {filtered.length} Purchases</span>
            </div>
        </div>

        <div className="grid grid-cols-1 gap-4">
            {filtered.map(po => (
                <div 
                    key={po.id}
                    className="shipment-card"
                    onClick={() => onNavigate('purchase-detail', po.id)}
                >
                    <div className="flex items-center">
                        <div className="shipment-id-badge">
                            <ShoppingCart size={24} />
                        </div>
                        <div className="shipment-meta">
                            <div className="shipment-name">{po.name}</div>
                            <div className="flex items-center gap-3">
                                <span className={`status-step active`} 
                                      style={{ transform: 'none', padding: '2px 8px', margin: 0, borderRadius: '4px', fontSize: '8px', 
                                              backgroundColor: po.state === 'purchase' ? '#dcfce7' : '#fef3c7', 
                                              color: po.state === 'purchase' ? '#16a34a' : '#d97706' }}>
                                    <span>{po.status_label || po.state}</span>
                                </span>
                                <div className="flex items-center gap-1 text-[11px] font-bold text-slate-400">
                                    <User size={12} />
                                    <span>{po.partner_name}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="hidden sm:flex flex-col items-end mr-4">
                            <span className="field-label" style={{ marginBottom: 0 }}>Total</span>
                            <span className="field-value" style={{ fontSize: '11px', color: '#0f172a' }}>{formatCurrency(po.amount_total)}</span>
                        </div>
                        <div className="flex flex-col items-center gap-2">
                             <button className="btn-ui h-[32px] px-3 text-[10px] uppercase font-black tracking-wider border-slate-200">
                                View Details
                             </button>
                             <div className="text-slate-300 sm:block hidden">
                                <ChevronRight size={20} />
                             </div>
                        </div>
                    </div>
                </div>
            ))}

            {filtered.length === 0 && (
                <div className="delivery-card" style={{ textAlign: 'center', padding: '5rem', borderStyle: 'dashed' }}>
                    <Package2 size={64} className="mx-auto mb-4 opacity-10" />
                    <p className="text-lg font-black text-slate-900">No Purchases Found</p>
                    <p className="text-sm text-slate-400">No procurement records attached to this order.</p>
                </div>
            )}
        </div>
      </div>
    </div>
  );
};

export default PurchaseList;
