import React, { useState, useEffect, useCallback } from 'react';
import { 
  ChevronLeft, Truck, Package2, CheckCircle, Printer, 
  XCircle, Calendar, FileText, User, MapPin, 
  ArrowRight, Info, AlertCircle, MessageCircle
} from 'lucide-react';
import { odooService } from '../services/odoo';
import Loader from '../components/Loader';
import WhatsappModal from '../components/WhatsappModal';
import WhatsAppIcon from '../components/WhatsAppIcon';
import './DeliveryDetail.css';

const DeliveryDetail = ({ pickingId, onBack, onNavigate }) => {
  const [picking, setPicking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [performingAction, setPerformingAction] = useState(false);
  const [activeTab, setActiveTab] = useState('operations');
  const [error, setError] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editVals, setEditVals] = useState({ scheduled_date: '', lines: [] });
  const [showWhatsappModal, setShowWhatsappModal] = useState(false);

  const fetchPickingDetails = useCallback(async () => {
    setLoading(true);
    try {
      const res = await odooService.getPickings(null, pickingId); 
      if (res && res.length > 0) {
        const p = res[0];
        setPicking(p);
        
        // Convert DD-MM-YYYY to YYYY-MM-DD for input[type=date]
        let dateVal = '';
        if (p.date) {
            const parts = p.date.split('-');
            if (parts.length === 3) dateVal = `${parts[2]}-${parts[1]}-${parts[0]}`;
        }
        
        setEditVals({
            scheduled_date: dateVal,
            lines: (p.lines || []).map(l => ({ id: l.id, qty_done: l.qty_done }))
        });
      } else {
        setError("Shipment not found");
      }
    } catch (err) {
      setError("Failed to load shipment details");
    } finally {
      setLoading(false);
    }
  }, [pickingId]);

  useEffect(() => {
    if (pickingId) fetchPickingDetails();
  }, [pickingId, fetchPickingDetails]);

  const handleAction = async (action) => {
    if (!window.confirm(`Are you sure you want to ${action} this shipment?`)) return;
    setPerformingAction(true);
    try {
      const res = await odooService.performPickingAction(pickingId, action);
      if (res.success) {
        await fetchPickingDetails();
      } else {
        alert(res.error || "Action failed");
      }
    } catch (err) {
      alert("Network error");
    } finally {
      setPerformingAction(false);
    }
  };

  const handleSave = async () => {
    setPerformingAction(true);
    try {
      const res = await odooService.updatePicking(pickingId, editVals);
      if (res.success || !res.error) {
        setIsEditing(false);
        await fetchPickingDetails();
      } else {
        alert(res.error || "Failed to update shipment");
      }
    } catch (err) {
      alert("Error updating shipment");
    } finally {
      setPerformingAction(false);
    }
  };

  if (loading) return <Loader title="Loading Shipment..." />;
  if (error) return (
    <div className="delivery-error-container">
      <AlertCircle size={48} className="text-red-500 mb-4" />
      <p>{error}</p>
      <button className="btn-ui primary mt-4" onClick={onBack}>Go Back</button>
    </div>
  );
  if (!picking) return null;

  const canEdit = picking.state !== 'done' && picking.state !== 'cancel';

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
              <span>Inventory</span>
              <ArrowRight size={10} />
              <span>{picking.origin}</span>
            </div>
            <h1 className="delivery-title">{picking.name}</h1>
          </div>
        </div>
        <div className="flex gap-2">
            {isEditing ? (
                <>
                    <button className="btn-ui btn-cancel" onClick={() => setIsEditing(false)} disabled={performingAction}>
                        <span>Cancel</span>
                    </button>
                    <button className="btn-ui primary" onClick={handleSave} disabled={performingAction}>
                        <CheckCircle size={16} />
                        <span>{performingAction ? 'Saving...' : 'Save Changes'}</span>
                    </button>
                </>
            ) : (
                <>
                    {canEdit && (
                        <button className="btn-ui secondary" onClick={() => setIsEditing(true)}>
                            <Package2 size={16} />
                            <span>Edit Delivery</span>
                        </button>
                    )}
                    <button 
                        className="btn-ui hover:bg-[#25D366] hover:text-white border-transparent" 
                        onClick={() => setShowWhatsappModal(true)} 
                        style={{ height: '38px', borderRadius: '4px', transition: 'all 0.2s' }}
                    >
                        <WhatsAppIcon size={16} />
                        <span className="hidden sm:inline">Share</span>
                    </button>
                    <button className="btn-ui hidden md:flex" onClick={() => odooService.printPicking(picking.id)}>
                        <Printer size={16} />
                        <span>Print Slip</span>
                    </button>
                </>
            )}
        </div>
      </div>

      <div className="delivery-main-container max-w-7xl mx-auto p-4 md:p-6">
        
        {/* Status Bar (Odoo Style) */}
        {!isEditing && (
            <div className="delivery-status-bar">
                <div className="flex gap-2 px-3">
                    {picking.action_buttons?.validate && (
                        <button 
                            className="btn-ui primary h-[40px] px-6" 
                            onClick={() => handleAction('validate')}
                            disabled={performingAction}
                        >
                            <CheckCircle size={18} />
                            <span>Validate</span>
                        </button>
                    )}
                    {picking.action_buttons?.cancel && (
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
                    {['draft', 'waiting', 'confirmed', 'assigned', 'done'].map((st) => {
                        const isActive = picking.state === st;
                        const labels = {
                            'draft': 'Draft',
                            'waiting': 'Waiting',
                            'confirmed': 'Confirmed',
                            'assigned': 'Ready',
                            'done': 'Done'
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
        )}

        {/* Info Cards Grid */}
        <div className="delivery-info-grid">
            {/* Delivery Address & Carrier */}
            <div className="delivery-card">
                <div className="card-header">
                    <MapPin size={18} className="text-blue-500" />
                    <h2>Destination Details</h2>
                </div>
                <div className="space-y-6">
                    <div className="info-field">
                        <label className="field-label">Source Document</label>
                        <div 
                            className={`field-value ${picking.origin_id ? 'link' : ''}`} 
                            onClick={() => {
                                if (!picking.origin_id) return;
                                const route = picking.origin_type === 'purchase' ? 'purchase-detail' : 'order-detail';
                                onNavigate(route, picking.origin_id);
                            }}
                        >
                            {picking.origin || 'N/A'}
                        </div>
                    </div>
                    {picking.carrier && (
                        <div className="carrier-badge">
                            <div className="carrier-icon-box">
                                <Truck size={24} />
                            </div>
                            <div className="flex flex-col">
                                <label className="field-label" style={{ color: '#60a5fa' }}>Shipping Carrier</label>
                                <span className="field-value">{picking.carrier}</span>
                                {picking.tracking && (
                                    <span className="text-[11px] font-bold text-blue-500 mt-1">Ref: {picking.tracking}</span>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Date & Timeline */}
            <div className="delivery-card">
                 <div className="card-header">
                    <Calendar size={18} className="text-amber-500" />
                    <h2>Timeline</h2>
                </div>
                <div className="grid grid-cols-2 gap-6">
                    <div className="info-field">
                        <label className="field-label">Scheduled Date</label>
                        {isEditing ? (
                            <input 
                                type="date" 
                                className="date-input"
                                value={editVals.scheduled_date}
                                onChange={(e) => setEditVals(prev => ({ ...prev, scheduled_date: e.target.value }))}
                            />
                        ) : (
                            <div className="field-value">{picking.date || 'To be defined'}</div>
                        )}
                    </div>
                    <div className="info-field">
                        <label className="field-label">Source Document</label>
                        <div 
                            className={`field-value ${picking.origin_id ? 'link' : ''}`} 
                            onClick={() => {
                                if (!picking.origin_id) return;
                                const route = picking.origin_type === 'purchase' ? 'purchase-detail' : 'order-detail';
                                onNavigate(route, picking.origin_id);
                            }}
                        >
                            {picking.origin || 'N/A'}
                        </div>
                    </div>
                </div>
            </div>
        </div>

        {/* Operations Tabs */}
        <div className="delivery-tabs-container">
            <div className="tabs-nav">
                <button 
                  onClick={() => setActiveTab('operations')}
                  className={`tab-btn ${activeTab === 'operations' ? 'active' : ''}`}
                >
                    Operations
                </button>
                <button 
                  onClick={() => setActiveTab('notes')}
                  className={`tab-btn ${activeTab === 'notes' ? 'active' : ''}`}
                >
                    Notes
                </button>
            </div>

            <div className="p-0 overflow-x-auto">
                {activeTab === 'operations' ? (
                    <table className="operations-table">
                        <thead>
                            <tr>
                                <th>Product</th>
                                <th style={{ textAlign: 'right' }}>Demand</th>
                                <th style={{ textAlign: 'right' }}>Quantity</th>
                                <th>UoM</th>
                            </tr>
                        </thead>
                        <tbody>
                            {picking.lines?.map((line, lIdx) => (
                                <tr key={line.id}>
                                    <td>
                                        <div className="line-product-name">{line.product_name}</div>
                                        <div className="line-uom">[{line.product_id}]</div>
                                    </td>
                                    <td style={{ textAlign: 'right' }}>
                                        <div className="text-sm font-bold text-slate-600">{line.qty_ordered}</div>
                                    </td>
                                    <td style={{ textAlign: 'right' }}>
                                        {isEditing ? (
                                            <input 
                                                type="number"
                                                className="qty-input"
                                                value={editVals.lines[lIdx]?.qty_done || 0}
                                                onChange={(e) => {
                                                    const newLines = [...editVals.lines];
                                                    newLines[lIdx] = { ...newLines[lIdx], qty_done: e.target.value };
                                                    setEditVals(prev => ({ ...prev, lines: newLines }));
                                                }}
                                            />
                                        ) : (
                                            <div className={`qty-pill ${parseFloat(line.qty_done) >= parseFloat(line.qty_ordered) ? 'complete' : ''}`}>
                                                {line.qty_done}
                                            </div>
                                        )}
                                    </td>
                                    <td><div className="line-uom uppercase">{line.uom}</div></td>
                                </tr>
                            ))}
                            {(!picking.lines || picking.lines.length === 0) && (
                                <tr>
                                    <td colSpan="4" style={{ textAlign: 'center', padding: '4rem' }}>
                                        <Package2 size={40} className="mx-auto mb-2 opacity-20" />
                                        <p className="text-sm text-slate-400">No operation lines found</p>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                ) : (
                    <div className="p-12 text-center text-slate-400 italic text-sm">
                        No additional notes for this shipment.
                    </div>
                )}
            </div>
        </div>
      <WhatsappModal 
        isOpen={showWhatsappModal} 
        onClose={() => setShowWhatsappModal(false)}
        resModel="stock.picking"
        resId={pickingId}
        defaultMobile={picking.partner_phone}
        defaultMessage={`Hello, here is the delivery slip for ${picking.name}.`}
      />
    </div>
  </div>
  );
};

export default DeliveryDetail;
