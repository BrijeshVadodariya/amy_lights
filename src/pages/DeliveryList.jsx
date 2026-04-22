import React, { useState, useEffect, useCallback } from 'react';
import { 
  ChevronLeft, Truck, Package2, ArrowRight, 
  Calendar, ChevronRight, Search, Filter 
} from 'lucide-react';
import { odooService } from '../services/odoo';
import Loader from '../components/Loader';
import './DeliveryDetail.css'; // Reusing some base styles

const DeliveryList = ({ orderId, onBack, onNavigate }) => {
  const [pickings, setPickings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchList = useCallback(async () => {
    setLoading(true);
    try {
      const res = await odooService.getPickings(orderId);
      const items = res || [];
      setPickings(items);
      
      // AUTO-REDIRECT: If only 1 delivery exists, go straight to details
      if (items.length === 1) {
        onNavigate('delivery-detail', items[0].id, null, true);
      }
    } catch (err) {
      console.error("Failed to fetch picking list", err);
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    if (orderId) fetchList();
  }, [orderId, fetchList]);

  const filtered = pickings.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (p.origin && p.origin.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (loading || (pickings.length === 1)) return <Loader title="Redirecting to your shipment..." />;

  return (
    <div className="delivery-detail-page">
      <div className="delivery-navbar">
        <div className="delivery-nav-left">
          <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-full transition-colors border-none bg-transparent cursor-pointer">
            <ChevronLeft size={20} className="text-slate-600" />
          </button>
          <div className="flex flex-col">
            <h1 className="delivery-title">Shipments</h1>
            <div className="breadcrumb-label">Order: {orderId}</div>
          </div>
        </div>
      </div>

      <div className="delivery-list-container">
        <div className="search-header">
            <div className="search-box">
                <Search className="search-icon" size={18} />
                <input 
                    type="text" 
                    placeholder="Search shipment reference..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
            <div className="hidden md:flex items-center gap-2 text-slate-400 text-xs font-bold uppercase">
                <Filter size={14} />
                <span>Found {filtered.length} Shipments</span>
            </div>
        </div>

        <div className="grid grid-cols-1 gap-4">
            {filtered.map(picking => (
                <div 
                    key={picking.id}
                    className="shipment-card"
                    onClick={() => onNavigate('delivery-detail', picking.id)}
                >
                    <div className="flex items-center">
                        <div className="shipment-id-badge">
                            <Truck size={24} />
                        </div>
                        <div className="shipment-meta">
                            <div className="shipment-name">{picking.name}</div>
                            <div className="flex items-center gap-3">
                                <span className={`status-step active`} 
                                      style={{ transform: 'none', padding: '2px 8px', margin: 0, borderRadius: '4px', fontSize: '8px', 
                                              backgroundColor: picking.state === 'done' ? '#dcfce7' : '#fef3c7', 
                                              color: picking.state === 'done' ? '#16a34a' : '#d97706' }}>
                                    <span>{picking.status_label || picking.state}</span>
                                </span>
                                {picking.date && (
                                    <div className="flex items-center gap-1 text-[11px] font-bold text-slate-400">
                                        <Calendar size={12} />
                                        <span>{picking.date}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        {picking.carrier && (
                            <div className="hidden sm:flex flex-col items-end mr-4">
                                <span className="field-label" style={{ marginBottom: 0 }}>Carrier</span>
                                <span className="field-value" style={{ fontSize: '11px' }}>{picking.carrier}</span>
                            </div>
                        )}
                        <div className="text-slate-300">
                            <ChevronRight size={24} />
                        </div>
                    </div>
                </div>
            ))}

            {filtered.length === 0 && (
                <div className="delivery-card" style={{ textAlign: 'center', padding: '5rem', borderStyle: 'dashed' }}>
                    <Package2 size={64} className="mx-auto mb-4 opacity-10" />
                    <p className="text-lg font-black text-slate-900">No Shipments Found</p>
                    <p className="text-sm text-slate-400">Try adjusting your search or check if pickings exist.</p>
                </div>
            )}
        </div>
      </div>
    </div>
  );
};

export default DeliveryList;
