import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { MessageSquare, Calendar, X } from 'lucide-react';
import SearchableSelect from './SearchableSelect';
import { odooService } from '../services/odoo';

export const QuickNoteModal = ({ orderId, resModel = 'sale.order', onClose, onSuccess }) => {
  const [text, setText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!text.trim()) return alert("Please enter some text");
    setSubmitting(true);
    try {
      const res = await odooService.addQuickNote(orderId, text, resModel);
      if (res.success || !res.error) onSuccess();
      else alert(JSON.stringify(res.error) || "Failed to add note");
    } finally {
      setSubmitting(false);
    }
  };

  return createPortal(
    <div className="co-modal-overlay animate-fade-in" onClick={onClose}>
      <div className="co-modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '480px', width: '92%', border: 'none' }}>
        <div className="co-modal-header" style={{ borderBottom: '1px solid #f1f5f9', background: '#fcfdfe', padding: '20px 24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ background: '#ecfdf5', padding: '8px', borderRadius: '10px' }}>
              <MessageSquare size={20} className="text-emerald-500" />
            </div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 900, color: '#0f172a', letterSpacing: '-0.01em' }}>Add Remark</h2>
          </div>
          <button className="co-btn-close" onClick={onClose} style={{ background: '#f1f5f9' }}><X size={18} /></button>
        </div>
        
        <div style={{ padding: '24px' }}>
          <label style={{ fontSize: '11px', fontWeight: 800, color: '#64748b', display: 'block', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Your Message</label>
          <textarea 
            placeholder="What would you like to note down?"
            value={text}
            onChange={e => setText(e.target.value)}
            style={{ 
              width: '100%', 
              minHeight: '140px', 
              padding: '16px', 
              borderRadius: '16px', 
              border: '1px solid #e2e8f0', 
              background: '#f8fafc',
              marginBottom: '20px', 
              fontSize: '15px',
              lineHeight: '1.6',
              outline: 'none',
              transition: 'border-color 0.2s',
              resize: 'none'
            }}
          />
          <div style={{ display: 'flex', gap: '12px' }}>
            <button 
              className="co-btn" 
              style={{ 
                flex: 2, 
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', 
                height: '52px', 
                color: '#fff', 
                borderRadius: '14px',
                fontWeight: 700,
                fontSize: '15px',
                boxShadow: '0 4px 12px rgba(16, 185, 129, 0.2)'
              }}
              onClick={handleSubmit}
              disabled={submitting}
            >
              {submitting ? 'Saving Note...' : 'Save Remark'}
            </button>
            <button 
              className="co-btn" 
              style={{ flex: 1, height: '52px', background: '#f1f5f9', color: '#64748b', borderRadius: '14px', fontWeight: 600 }} 
              onClick={onClose}
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

export const QuickTaskModal = ({ orderId, resModel = 'sale.order', users = [], onClose, onSuccess }) => {
  const [vals, setVals] = useState({ summary: '', note: '', deadline: new Date().toISOString().split('T')[0], userId: '' });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!vals.note.trim()) return alert("Please enter activity note");
    if (!vals.userId) return alert("Please select an assignee");
    setSubmitting(true);
    try {
      const finalSummary = vals.summary.trim() || 'Task';
      const res = await odooService.addQuickActivity(orderId, finalSummary, vals.note, vals.deadline, vals.userId, resModel);
      if (res.success || !res.error) onSuccess();
      else alert(JSON.stringify(res.error) || "Failed to create task");
    } finally {
      setSubmitting(false);
    }
  };

  return createPortal(
    <div className="co-modal-overlay animate-fade-in" onClick={onClose}>
      <div className="co-modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '640px', width: '95%', border: 'none' }}>
        <div className="co-modal-header" style={{ borderBottom: '1px solid #f1f5f9', background: '#fcfdfe', padding: '20px 24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ background: '#fff7ed', padding: '8px', borderRadius: '10px' }}>
              <Calendar size={20} className="text-orange-500" />
            </div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 900, color: '#0f172a', letterSpacing: '-0.01em' }}>Schedule Activity</h2>
          </div>
          <button className="co-btn-close" onClick={onClose} style={{ background: '#f1f5f9' }}><X size={18} /></button>
        </div>
        
        <div className="co-modal-body" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
           <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
             <input 
               type="date" 
               className="co-input" 
               value={vals.deadline} 
               onChange={e => setVals({...vals, deadline: e.target.value})}
               style={{ 
                 width: '100%', 
                 padding: '12px 14px', 
                 borderRadius: '12px', 
                 border: '1px solid #e2e8f0', 
                 fontSize: '15px',
                 background: '#f8fafc',
                 color: '#1e293b',
                 outline: 'none'
               }}
             />
             <SearchableSelect 
               options={users.map(u => ({ value: u.id, label: u.name }))}
               value={vals.userId}
               onChange={(id) => setVals({...vals, userId: id})}
               placeholder="Assignee"
             />
           </div>

           <textarea 
             placeholder="Message..." 
             value={vals.note} 
             onChange={e => setVals({...vals, note: e.target.value})}
             style={{ 
               width: '100%', 
               minHeight: '140px', 
               padding: '16px', 
               borderRadius: '16px', 
               border: '1px solid #e2e8f0', 
               fontSize: '15px', 
               lineHeight: '1.6', 
               resize: 'vertical',
               background: '#f8fafc',
               outline: 'none'
             }}
           />

           <div style={{ display: 'flex', gap: '12px' }}>
             <button 
               className="co-btn" 
               style={{ 
                 flex: 2, 
                 background: 'linear-gradient(135deg, #4f46e5 0%, #3730a3 100%)', 
                 height: '56px', 
                 color: '#fff', 
                 fontSize: '16px', 
                 fontWeight: 800, 
                 borderRadius: '16px',
                 boxShadow: '0 4px 14px rgba(79, 70, 229, 0.25)'
               }}
               onClick={handleSubmit}
               disabled={submitting}
             >
               {submitting ? 'Creating Activity...' : 'Add Activity'}
             </button>
             <button 
              className="co-btn" 
              style={{ flex: 1, height: '56px', background: '#f1f5f9', color: '#64748b', borderRadius: '16px', fontWeight: 600 }} 
              onClick={onClose}
            >
              Discard
            </button>
           </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
