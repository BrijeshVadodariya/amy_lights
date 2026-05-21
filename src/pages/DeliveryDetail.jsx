import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  ChevronLeft, Truck, Package2, CheckCircle, Printer, 
  XCircle, Calendar, FileText, User, MapPin, 
  ArrowRight, Info, AlertCircle, MessageCircle,
  Camera, Paperclip, Send, Image as ImageIcon, X, ArrowLeft
} from 'lucide-react';
import { odooService } from '../services/odoo';
import Loader from '../components/Loader';
import WhatsappModal from '../components/WhatsappModal';
import WhatsAppIcon from '../components/WhatsAppIcon';
import './DeliveryDetail.css';

const getAuthorizedImageUrl = (url) => {
  if (!url) return '';
  const token = localStorage.getItem('odoo_session_id') || '';
  const db = import.meta.env.VITE_ODOO_DB || 'stage';
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}token=${token}&db=${db}`;
};

const DeliveryDetail = ({ pickingId, onBack, onNavigate }) => {
  const [picking, setPicking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [performingAction, setPerformingAction] = useState(false);
  const [activeTab, setActiveTab] = useState('operations');
  const [error, setError] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editVals, setEditVals] = useState({ scheduled_date: '', lines: [] });
  const [showWhatsappModal, setShowWhatsappModal] = useState(false);
  const [previewImageUrl, setPreviewImageUrl] = useState(null);
  
  // Log Note State
  const [logText, setLogText] = useState('');
  const [logAttachments, setLogAttachments] = useState([]);
  const [isLogging, setIsLogging] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const captureInputRef = useRef(null);
  const fileInputRef = useRef(null);

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
        alert(res.error || res.message || "Action failed");
      }
    } catch (err) {
      const msg = odooService.getOdooErrorMessage ? odooService.getOdooErrorMessage(err) : "Network error";
      alert(msg);
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

  const handleFiles = (files) => {
    Array.from(files).forEach(file => {
      if (!file.type.startsWith('image/') && file.type !== 'application/pdf') return;
      const reader = new FileReader();
      reader.onloadend = () => {
        const ext = file.type === 'application/pdf' ? 'pdf' : 'png';
        setLogAttachments(prev => [...prev, {
          name: file.name || `pasted-file-${Date.now()}.${ext}`,
          content: reader.result,
          type: file.type,
          preview: URL.createObjectURL(file)
        }]);
      };
      reader.readAsDataURL(file);
    });
  };

  const handleFileChange = (e) => {
    if (e.target.files) handleFiles(e.target.files);
  };

  const handlePaste = (e) => {
    const items = e.clipboardData?.items;
    if (items) {
      const files = [];
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1 || items[i].type === 'application/pdf') {
          files.push(items[i].getAsFile());
        }
      }
      if (files.length > 0) handleFiles(files);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.files) handleFiles(e.dataTransfer.files);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleCapture = () => {
    if (captureInputRef.current) captureInputRef.current.click();
  };

  const handleLogSubmit = async () => {
    if (!logText && logAttachments.length === 0) return;
    setIsLogging(true);
    try {
      const res = await odooService.addNote({
        res_id: pickingId,
        res_model: 'stock.picking',
        text: logText,
        chatter: true,
        validate: true, // Trigger auto-validation
        attachments: logAttachments.map(a => ({ name: a.name, content: a.content }))
      });
      if (res.success) {
        setLogText('');
        setLogAttachments([]);
        await fetchPickingDetails(); // Refresh to show 'Done' state and history
        alert("Photo submitted and delivery validated successfully");
      } else {
        alert(res.error || "Failed to add note");
      }
    } catch (err) {
      alert("Error adding note");
    } finally {
      setIsLogging(false);
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
                    {picking.activities && picking.activities.length > 0 ? (
                        <button 
                            className="btn-ui hover:bg-blue-50 hover:text-blue-600 border-blue-100"
                            onClick={async () => {
                                const lastAct = picking.activities[0];
                                try {
                                    setPerformingAction(true);
                                    const res = await odooService.markActivityDone(lastAct.id);
                                    if (res.success || !res.error) {
                                        await fetchPickingDetails();
                                    } else {
                                        alert(res.error || "Completion failed");
                                    }
                                } catch { alert("Network error"); }
                                finally { setPerformingAction(false); }
                            }}
                            disabled={performingAction}
                        >
                            <CheckCircle size={16} className="text-blue-500" />
                            <span>Complete Task</span>
                        </button>
                    ) : (
                        <div 
                            className="btn-ui" 
                            style={{ height: '38px', background: '#f0fdf4', color: '#16a34a', borderColor: '#bbf7d0', cursor: 'default', display: 'flex', alignItems: 'center', gap: '4px' }}
                        >
                            <CheckCircle size={16} /><span>Done</span>
                        </div>
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
                            <span>Delivery</span>
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
            {/* Delivery Details */}
            <div className="delivery-card">
                <div className="card-header">
                    <MapPin size={18} className="text-blue-500" />
                    <h2>Destination Details</h2>
                </div>
                <div className="space-y-6">
                    <div className="info-field">
                        <label className="field-label">Delivery Address</label>
                        <div className="field-value font-bold">{picking.partner_id || 'No Address'}</div>
                        {picking.delivery_address && (
                            <div className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                                {picking.delivery_address}
                            </div>
                        )}
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
                <div className="space-y-6">
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
                            <div className="field-value font-bold">{picking.date || 'To be defined'}</div>
                        )}
                    </div>
                    {picking.state === 'done' && picking.validated_by && (
                        <div className="info-field">
                            <label className="field-label">Validated By</label>
                            <div className="flex items-center gap-2 mt-1">
                                <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-[10px] font-bold">
                                    {picking.validated_by.charAt(0)}
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-xs font-bold text-slate-700">{picking.validated_by}</span>
                                    <span className="text-[10px] text-slate-400">{picking.validated_date}</span>
                                </div>
                            </div>
                        </div>
                    )}
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

            {/* Combined Delivery Evidence & Upload Card */}
            <div className="delivery-card">
                <div className="card-header">
                    <Camera size={18} className="text-indigo-500" />
                    <h2>Delivery Evidence</h2>
                </div>

                {/* Previews of Already Uploaded Evidence */}
                {picking.all_attachments?.length > 0 ? (
                    <div className="evidence-preview-grid">
                        {picking.all_attachments.slice(0, 3).map((att, idx) => (
                            <div 
                                key={idx} 
                                className="evidence-img-box cursor-pointer"
                                onClick={() => setPreviewImageUrl(getAuthorizedImageUrl(att.url))}
                                style={{ cursor: 'pointer', transition: 'transform 0.2s' }}
                                onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
                                onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1.0)'}
                            >
                                <img src={getAuthorizedImageUrl(att.url)} alt="evidence" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            </div>
                        ))}
                        {picking.all_attachments.length > 3 && (
                            <div 
                                className="evidence-more-box"
                                onClick={() => setActiveTab('notes')}
                            >
                                <span className="evidence-more-count">+{picking.all_attachments.length - 3}</span>
                                <span className="evidence-more-label">More</span>
                            </div>
                        )}
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px 0', border: '1px dashed #cbd5e1', borderRadius: '12px', background: '#f8fafc', color: '#94a3b8' }}>
                        <Camera size={24} className="mb-1 opacity-60" />
                        <span style={{ fontSize: '11px', fontWeight: 600 }}>No photos uploaded yet</span>
                    </div>
                )}

                {/* Upload & Capture Form for New Evidence */}
                <div className="evidence-upload-section" style={{ marginTop: '1.25rem', paddingTop: '1.25rem', borderTop: '1px solid #f1f5f9' }}>
                    <label className="field-label" style={{ marginBottom: '8px' }}>Upload New Photo</label>
                    
                    <div className="log-form-container" style={{ borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                        <textarea 
                            className="log-textarea"
                            placeholder="Add comments here..."
                            value={logText}
                            onChange={(e) => setLogText(e.target.value)}
                            onPaste={handlePaste}
                            onDrop={handleDrop}
                            onDragOver={handleDragOver}
                            style={{ minHeight: '60px', padding: '10px 12px', fontSize: '12px' }}
                        />
                        
                        {logAttachments.length > 0 && (
                            <div className="attachment-previews" style={{ padding: '0 12px 10px' }}>
                                {logAttachments.map((att, idx) => (
                                    <div key={idx} className="preview-item" style={{ width: '40px', height: '40px' }}>
                                        {att.type.startsWith('image/') ? (
                                            <img src={att.preview} alt="preview" />
                                        ) : (
                                            <div className="flex items-center justify-center w-full h-full">
                                                <FileText size={16} className="text-slate-300" />
                                            </div>
                                        )}
                                        <button 
                                            className="remove-preview"
                                            onClick={() => setLogAttachments(prev => prev.filter((_, i) => i !== idx))}
                                        >
                                            <X size={10} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                        
                        <input 
                            type="file" 
                            ref={captureInputRef}
                            className="hidden"
                            accept="image/*,.pdf"
                            capture="environment"
                            onChange={handleFileChange}
                        />
                        <input 
                            type="file" 
                            ref={fileInputRef}
                            multiple
                            className="hidden"
                            onChange={handleFileChange}
                            accept="image/*,.pdf"
                        />
                    </div>

                    <div className="log-footer" style={{ padding: '8px 12px', background: '#f8fafc', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '-1px', borderBottomLeftRadius: '12px', borderBottomRightRadius: '12px', border: '1px solid #e2e8f0', borderTop: 'none' }}>
                        <button 
                            className="btn-capture"
                            onClick={handleCapture}
                            style={{ padding: '6px 12px', fontSize: '10px' }}
                        >
                            <Camera size={14} />
                            <span>Capture</span>
                        </button>
                        
                        <button 
                            className="btn-submit-log"
                            disabled={isLogging || isSubmitting || (!logText.trim() && logAttachments.length === 0)}
                            onClick={handleLogSubmit}
                            style={{ padding: '6px 12px', fontSize: '10px' }}
                        >
                            {isLogging || isSubmitting ? (
                                <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <>
                                    <Send size={12} />
                                    <span>Submit</span>
                                </>
                            )}
                        </button>
                    </div>
                </div>

                <button 
                    className="view-history-btn"
                    onClick={() => setActiveTab('notes')}
                    style={{ marginTop: '1rem', width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '4px', background: 'none', border: 'none', color: '#4f46e5', fontWeight: 700, fontSize: '11px', cursor: 'pointer' }}
                >
                    View Full History <ArrowLeft size={12} className="rotate-180" />
                </button>
            </div>
        </div>

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

            <div className="tab-content">
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
                                        {line.qty_available !== undefined && parseFloat(line.qty_available) < parseFloat(line.qty_ordered) && (
                                            <div className="text-[10px] text-amber-500 font-medium whitespace-nowrap">
                                                Avail: {line.qty_available}
                                            </div>
                                        )}
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
                    <div className="p-4">
                    <div className="history-feed">
                        {picking.history && picking.history.length > 0 ? (
                            <>
                                {picking.history.map((item) => (
                                    <div key={item.id} className="history-item">
                                        <div className="history-item-header">
                                            <div className="history-author-box">
                                                <div className="author-avatar">
                                                    {item.author?.charAt(0)}
                                                </div>
                                                <div className="author-info">
                                                    <div className="author-name">{item.author}</div>
                                                    <div className="history-date">{item.date}</div>
                                                </div>
                                            </div>
                                        </div>
                                        {item.body && <p className="history-body">{item.body}</p>}
                                        {item.attachments && item.attachments.length > 0 && (
                                            <div className="history-attachments">
                                                {item.attachments.map((att) => (
                                                    <a 
                                                        key={att.id} 
                                                        href={getAuthorizedImageUrl(att.url)} 
                                                        onClick={(e) => {
                                                            e.preventDefault();
                                                            setPreviewImageUrl(getAuthorizedImageUrl(att.url));
                                                        }}
                                                        className="history-att-link"
                                                    >
                                                        <img src={getAuthorizedImageUrl(att.url)} alt={att.name} />
                                                    </a>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </>
                        ) : (
                            <div className="p-12 text-center text-slate-400 italic text-sm">
                                No photo history found for this shipment.
                            </div>
                        )}
                    </div>
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

      {/* Photo Preview Lightbox Overlay */}
      {previewImageUrl && (
          <div 
              style={{
                  position: 'fixed',
                  top: 0,
                  left: 0,
                  width: '100vw',
                  height: '100vh',
                  background: 'rgba(15, 23, 42, 0.92)',
                  backdropFilter: 'blur(12px)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  zIndex: 9999,
                  transition: 'opacity 0.2s ease-out'
              }}
              onClick={() => setPreviewImageUrl(null)}
          >
              <div 
                  style={{
                      position: 'relative',
                      maxWidth: '90%',
                      maxHeight: '90%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexDirection: 'column',
                      gap: '16px'
                  }}
                  onClick={(e) => e.stopPropagation()}
              >
                  <button 
                      style={{
                          position: 'absolute',
                          top: '-48px',
                          right: '0px',
                          background: 'white',
                          border: 'none',
                          borderRadius: '50%',
                          width: '36px',
                          height: '36px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#0f172a',
                          cursor: 'pointer',
                          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                          transition: 'all 0.2s'
                      }}
                      onClick={() => setPreviewImageUrl(null)}
                  >
                      <X size={20} />
                  </button>
                  <img 
                      src={previewImageUrl} 
                      alt="Full Evidence Preview" 
                      style={{
                          maxWidth: '100%',
                          maxHeight: '75vh',
                          borderRadius: '16px',
                          boxShadow: '0 25px 50px -12px rgba(0,0,0,0.6)',
                          objectFit: 'contain',
                          border: '2px solid rgba(255,255,255,0.15)'
                      }}
                  />
                  <a 
                      href={previewImageUrl} 
                      target="_blank" 
                      rel="noreferrer" 
                      style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          background: 'rgba(255, 255, 255, 0.1)',
                          border: '1px solid rgba(255, 255, 255, 0.2)',
                          borderRadius: '10px',
                          padding: '8px 16px',
                          color: 'white',
                          fontSize: '12px',
                          fontWeight: 700,
                          textDecoration: 'none',
                          marginTop: '4px',
                          transition: 'all 0.2s'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'}
                  >
                      Open Original Image
                  </a>
              </div>
          </div>
      )}
    </div>
  </div>
  );
};

export default DeliveryDetail;
