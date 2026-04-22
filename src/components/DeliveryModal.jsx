import React, { useState, useEffect } from 'react';
import { XCircle, Truck, Package2, CheckCircle, Printer, ChevronLeft, ChevronRight } from 'lucide-react';
import { odooService } from '../services/odoo';
import './DeliveryModal.css';

const DeliveryModal = ({ isOpen, onClose, orderId, onActionSuccess }) => {
  const [pickings, setPickings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedPicking, setSelectedPicking] = useState(null);
  const [performingAction, setPerformingAction] = useState(false);

  const fetchPickings = async () => {
    setLoading(true);
    try {
      const res = await odooService.getPickings(orderId);
      setPickings(res || []);
      if (selectedPicking) {
        const updated = (res || []).find(p => p.id === selectedPicking.id);
        if (updated) setSelectedPicking(updated);
      }
    } catch (err) {
      console.error("Failed to fetch pickings", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && orderId) {
      fetchPickings();
      setSelectedPicking(null);
    }
  }, [isOpen, orderId]);

  const handleAction = async (pickingId, action) => {
    if (!window.confirm(`Are you sure you want to ${action} this shipment?`)) return;
    setPerformingAction(true);
    try {
      const res = await odooService.performPickingAction(pickingId, action);
      if (res.success) {
        await fetchPickings();
        if (onActionSuccess) onActionSuccess();
      } else {
        alert(res.error || "Action failed");
      }
    } catch (err) {
      alert("Network error");
    } finally {
      setPerformingAction(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="lightbox-overlay" onClick={onClose}>
      <div className="mobile-modal-container bg-white animate-fade-in" onClick={e => e.stopPropagation()}>
        <div className="delivery-modal-header">
          <div className="delivery-modal-title-group">
            {selectedPicking ? (
              <button className="p-1 hover:bg-gray-200 rounded-full" onClick={() => setSelectedPicking(null)}>
                <ChevronLeft size={20} className="text-black" />
              </button>
            ) : (
              <Truck size={20} className="text-slate-600" />
            )}
            <h3 className="text-lg font-bold">
              {selectedPicking ? selectedPicking.name : 'Shipments'}
            </h3>
          </div>
          <XCircle className="cursor-pointer text-gray-400 hover:text-black" onClick={onClose} />
        </div>

        <div className="delivery-modal-content">
          {loading && pickings.length === 0 ? (
            <div className="picking-loader">
              <div className="spinning-circle"></div>
              <span className="text-sm font-semibold">Fetching shipments...</span>
            </div>
          ) : selectedPicking ? (
            /* Detail View */
            <div className="animate-fade-in">
              <div className="picking-detail-summary">
                <div>
                  <div className="picking-date-label">Scheduled Date</div>
                  <div className="text-sm font-bold">{selectedPicking.date}</div>
                </div>
                <div className={`picking-status-badge ${selectedPicking.state}`}>
                  {selectedPicking.status_label || selectedPicking.state}
                </div>
              </div>

              <div className="picking-actions-bar">
                {selectedPicking.action_buttons?.validate && (
                  <button 
                    className="btn-ui primary h-[36px] px-4" 
                    onClick={() => handleAction(selectedPicking.id, 'validate')}
                    disabled={performingAction}
                  >
                    <CheckCircle size={14} />
                    <span>Validate</span>
                  </button>
                )}
                {selectedPicking.action_buttons?.print && (
                  <button className="btn-ui h-[36px] px-4">
                    <Printer size={14} />
                    <span>Print Slip</span>
                  </button>
                )}
                {selectedPicking.action_buttons?.cancel && (
                  <button 
                    className="btn-ui h-[36px] px-4 border-red-200 text-red-600 hover:bg-red-50"
                    onClick={() => handleAction(selectedPicking.id, 'cancel')}
                    disabled={performingAction}
                  >
                    <XCircle size={14} />
                    <span>Cancel</span>
                  </button>
                )}
              </div>

              <div className="picking-lines-container">
                <div className="picking-date-label mb-3">Shipment Items</div>
                {selectedPicking.lines?.map(line => (
                  <div key={line.id} className="picking-line-card">
                    <div>
                      <div className="line-product-name">{line.product_name}</div>
                      <div className="line-uom">{line.uom}</div>
                    </div>
                    <div className="line-qty-container">
                      <div className="line-qty-value">{line.qty_done} / {line.qty_ordered}</div>
                      <div className="line-qty-label">Quantity</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : pickings.length > 0 ? (
            /* List View */
            <div className="divide-y divide-gray-100">
              {pickings.map(picking => (
                <div key={picking.id} className="picking-item" onClick={() => setSelectedPicking(picking)}>
                  <div className="picking-info">
                    <div className="picking-name-row">
                      <div className="text-sm font-bold text-black">{picking.name}</div>
                      <div className={`picking-status-badge ${picking.state}`}>
                        {picking.status_label || picking.state}
                      </div>
                    </div>
                    <div className="picking-date-label">{picking.date}</div>
                    {picking.carrier && (
                      <div className="text-[10px] text-blue-600 font-bold mt-1 flex items-center gap-1">
                        <Truck size={10} /> {picking.carrier}
                      </div>
                    )}
                  </div>
                  <ChevronRight size={18} className="text-gray-300" />
                </div>
              ))}
            </div>
          ) : (
            <div className="picking-loader opacity-50">
              <Package2 size={48} className="mb-3" />
              <p className="text-sm font-medium">No delivery orders found.</p>
            </div>
          )}
        </div>
        
        {!selectedPicking && (
          <div className="delivery-modal-footer">
            <button className="btn-ui px-6" onClick={onClose}>Close</button>
          </div>
        )}
      </div>
    </div>
  );
};

export default DeliveryModal;
