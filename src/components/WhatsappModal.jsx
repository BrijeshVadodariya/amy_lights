import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, Send, QrCode, RefreshCw, LogOut } from 'lucide-react';
import { odooService } from '../services/odoo';
import Loader from './Loader';

export default function WhatsappModal({ isOpen, onClose, resModel, resId, defaultMobile = '', defaultMessage = '' }) {
  const [status, setStatus] = useState('loading'); // loading, qr, connected, error, sending, success
  const [qrCode, setQrCode] = useState(null);
  const [mobile, setMobile] = useState('');
  const [message, setMessage] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const pollInterval = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setMobile(defaultMobile?.toString() || '');
      setMessage(defaultMessage || '');
      checkStatus();
    } else {
      cleanup();
    }
    return cleanup;
  }, [isOpen, defaultMobile, defaultMessage]);

  const cleanup = () => {
    if (pollInterval.current) {
      clearInterval(pollInterval.current);
      pollInterval.current = null;
    }
  };

  const checkStatus = async () => {
    try {
      setStatus('loading');
      const res = await odooService.checkWhatsappStatus();
      if (res.status === 'connected') {
        setStatus('connected');
      } else {
        await fetchQr();
        setStatus('qr');
        startPolling();
      }
    } catch (err) {
      setErrorMsg('Failed to check WhatsApp status.');
      setStatus('error');
    }
  };

  const fetchQr = async () => {
    try {
      const res = await odooService.getWhatsappQr();
      const qrImage = res?.data?.qr || res?.qr;
      if (qrImage) {
        setQrCode(qrImage);
      }
    } catch (err) {
      console.error('Failed to get QR:', err);
    }
  };

  const startPolling = () => {
    if (pollInterval.current) return;
    pollInterval.current = setInterval(async () => {
      try {
        const res = await odooService.checkWhatsappStatus();
        if (res.status === 'connected') {
          cleanup();
          setStatus('connected');
        } else {
          // If we were connected but now we are not, go back to QR
          if (status === 'connected') {
             setStatus('qr');
             await fetchQr();
          } else if (!qrCode) {
             await fetchQr();
          }
        }
      } catch (e) {
        // Ignore poll errors
      }
    }, 3000);
  };

  const handleSend = async () => {
    if (!mobile.trim()) {
      alert("Please provide at least one valid mobile number.");
      return;
    }
    try {
      setStatus('sending');
      const res = await odooService.sendWhatsappPdf(resModel, resId, mobile, message);
      if (res.success) {
        setStatus('success');
      } else {
        setErrorMsg(res.error || 'Failed to send.');
        setStatus('connected');
      }
    } catch (err) {
      setErrorMsg('Network error.');
      setStatus('connected');
    }
  };

  const handleDisconnect = async () => {
    if (!window.confirm("Are you sure you want to unlink your WhatsApp device?")) return;
    try {
      setStatus('loading');
      cleanup(); // Ensure polling is stopped during disconnect
      
      await odooService.disconnectWhatsapp();
      
      // Clear local state
      setQrCode(null);
      setErrorMsg('');

      // Give the backend/node server a moment to settle
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Re-verify status before resuming
      const res = await odooService.checkWhatsappStatus();
      if (res.status === 'connected') {
        // If still reporting connected, backend hasn't unlinked yet
        setStatus('connected');
        setErrorMsg("Disconnect signal sent, but session is still active. Please refresh in a moment.");
      } else {
        await fetchQr();
        setStatus('qr');
        startPolling();
      }
    } catch (e) {
      setErrorMsg("Failed to disconnect.");
      setStatus('connected');
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="co-modal-overlay animate-fade-in" onClick={onClose} style={{ zIndex: 9999 }}>
      <div className="co-modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '480px', width: '92%', border: 'none', padding: 0 }}>
        <div className="co-modal-header" style={{ borderBottom: '1px solid #f1f5f9', background: '#ecfdf5', padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
           <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12.0117 2.00098C6.5057 2.00098 2.02344 6.47898 2.02344 11.984C2.02344 13.738 2.48244 15.42 3.32444 16.91l-1.096 4.02 4.14-1.082c1.458.775 3.109 1.183 4.818 1.183h.004c5.505 0 9.988-4.478 9.988-9.983 0-2.667-1.042-5.176-2.927-7.063-1.884-1.886-4.39-2.924-7.063-2.924zm0 16.892h-.002c-1.464 0-2.905-.39-4.161-1.127l-.3-.178-3.09.808.824-3.023-.196-.31c-.81-.1322-1.243-2.853-1.243-4.453 0-4.636 3.774-8.411 8.416-8.411 4.639 0 8.416 3.774 8.416 8.414-.002 4.64-3.778 8.41-8.418 8.41h-.004zm4.61-6.315c-.254-.127-1.498-.74-1.73-.824-.23-.083-.4-.127-.568.127-.17.254-.65 8.24-.8 9.98-.146.17-.293.19-.547.063-.254-.127-.107-.42-2.12-1.39-4.22-.44-.82-1.085-1.126-1.5-.333-.52.036-.8.163-.925.116-.115.253-.294.38-.44.127-.148.17-.254.254-.42.083-.17.042-.317-.02-.444-.064-.127-.568-1.37-.777-1.874-.202-.486-.41-.42-.567-.427-.147-.005-.316-.005-.484-.005-.17 0-.442.063-.674.317-.23.254-.883.864-.883 2.106s.904 2.44 1.03 2.61c.127.17 1.777 2.71 4.305 3.8.602.26 1.07.415 1.436.53.604.192 1.155.165 1.588.1.488-.073 1.498-.61 1.71-1.2.21-.59.21-1.096.147-1.2-.062-.104-.23-.17-.483-.296z" fill="#25D366"/>
            </svg>
            <h3 className="font-bold text-slate-800">
              {status === 'connected' ? 'Send via WhatsApp' : 'WhatsApp Connection'}
            </h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors p-1"><X size={20} /></button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
          {status === 'loading' && (
             <div style={{ padding: '40px 0', display: 'flex', justifyContent: 'center' }}><Loader /></div>
          )}

          {(status === 'qr') && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '24px 0' }}>
              <div style={{ width: '64px', height: '64px', background: '#dcfce7', color: '#16a34a', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '8px' }}>
                <QrCode size={32} />
              </div>
              <h4 style={{ fontWeight: 'bold', fontSize: '18px', color: '#1e293b', margin: '12px 0 4px' }}>Link your Device</h4>
              <p style={{ fontSize: '14px', color: '#64748b', marginBottom: '24px', maxWidth: '250px' }}>Open WhatsApp on your phone, tap Settings, tap Linked Devices, and scan this code.</p>
              
              {qrCode ? (
                <div style={{ background: '#fff', padding: '8px', border: '1px solid #e2e8f0', borderRadius: '12px', boxShadow: '0 1px 2px 0 rgb(0 0 0 / 0.05)', display: 'inline-block' }}>
                  <img src={qrCode} alt="WhatsApp QR Code" style={{ width: '220px', height: '220px' }} />
                </div>
              ) : (
                <div style={{ width: '220px', height: '220px', background: '#f1f5f9', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontSize: '12px', color: '#94a3b8' }}>Loading QR...</span>
                </div>
              )}
            </div>
          )}

          {status === 'connected' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {errorMsg && (
                <div style={{ background: '#fef2f2', color: '#dc2626', padding: '12px', borderRadius: '8px', fontSize: '14px', border: '1px solid #fee2e2', display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                  <span style={{ minWidth: '16px', marginTop: '2px' }}>⚠️</span>
                  <span>{errorMsg}</span>
                  <button onClick={() => setErrorMsg('')} style={{ marginLeft: 'auto', opacity: 0.6, background: 'none', border: 'none', cursor: 'pointer' }}><X size={14}/></button>
                </div>
              )}
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', background: '#f0fdf4', border: '1px solid #dcfce7', padding: '8px 12px', borderRadius: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#15803d', fontSize: '14px', fontWeight: 600 }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#22c55e', boxShadow: '0 0 8px rgba(34,197,94,0.6)' }}></div>
                  Device Connected & Ready
                </div>
                <button onClick={handleDisconnect} style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, padding: 0 }}>
                  <LogOut size={14} /> Disconnect
                </button>
              </div>

              
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', color: '#64748b', textTransform: 'uppercase', marginBottom: '4px' }}>To (Mobile Number)</label>
                <input 
                  type="text" 
                  value={mobile}
                  onChange={e => setMobile(e.target.value)}
                  placeholder="+1234567890" 
                  style={{ width: '100%', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '10px', fontSize: '14px', outline: 'none' }}
                />
                <p style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px' }}>Use comma to separate multiple numbers.</p>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', color: '#64748b', textTransform: 'uppercase', marginBottom: '4px' }}>Message</label>
                <textarea 
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  placeholder="Optional message..." 
                  style={{ width: '100%', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '10px', fontSize: '14px', height: '128px', resize: 'none', outline: 'none', fontFamily: 'inherit' }}
                />
              </div>
            </div>
          )}

          {status === 'sending' && (
             <div style={{ padding: '48px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px' }}>
               <div style={{ color: '#22c55e', animation: 'spin 1s linear infinite' }}><RefreshCw size={32} /></div>
               <div style={{ fontWeight: 600, color: '#334155' }}>Sending PDF to WhatsApp...</div>
             </div>
          )}

          {status === 'success' && (
            <div style={{ padding: '40px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', gap: '12px' }}>
              <div style={{ width: '64px', height: '64px', background: '#dcfce7', color: '#16a34a', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="32" height="32" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h4 style={{ fontWeight: 'bold', fontSize: '20px', color: '#1e293b', margin: 0 }}>Sent Successfully!</h4>
              <p style={{ fontSize: '14px', color: '#64748b', margin: 0 }}>Your document has been dispatched via WhatsApp.</p>
              <button 
                onClick={onClose}
                className="co-btn"
                style={{ marginTop: '16px', background: '#0f172a', color: '#fff' }}
              >
                Close
              </button>
            </div>
          )}
        </div>

        {status === 'connected' && (
          <div style={{ borderTop: '1px solid #e2e8f0', background: '#f8fafc', padding: '16px 20px', display: 'flex', justifyContent: 'flex-end', gap: '12px', borderBottomLeftRadius: '16px', borderBottomRightRadius: '16px' }}>
            <button 
              onClick={onClose}
              style={{ background: '#fff', color: '#475569', border: '1px solid #cbd5e1', padding: '10px 16px', borderRadius: '8px', fontSize: '14px', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s' }}
              onMouseOver={e => e.currentTarget.style.background = '#f1f5f9'}
              onMouseOut={e => e.currentTarget.style.background = '#fff'}
            >
              Cancel
            </button>
            <button 
              onClick={handleSend}
              style={{ background: '#25D366', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '8px', fontSize: '14px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', transition: 'all 0.2s', boxShadow: '0 2px 4px rgba(37, 211, 102, 0.2)' }}
              onMouseOver={e => e.currentTarget.style.background = '#20bd5a'}
              onMouseOut={e => e.currentTarget.style.background = '#25D366'}
            >
              <Send size={16} /> Send PDF
            </button>
          </div>
        )}

      </div>
    </div>,
    document.body
  );
}
