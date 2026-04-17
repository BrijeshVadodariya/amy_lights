import React, { useState, useEffect } from 'react';
import { 
  ChevronLeft, Edit, Edit2, Target, User, MapPin, Activity, 
  DollarSign, Star, Phone, Mail, MessageSquare, FileText,
  Calendar, Clock, Briefcase, CheckCircle, XCircle,
  Plus, Trash, Zap, X
} from 'lucide-react';
import { odooService } from '../services/odoo';
import Loader from '../components/Loader';
import SearchableSelect from '../components/SearchableSelect';
import { QuickTaskModal, QuickNoteModal } from '../components/QuickActionModals';
import './OrderDetail.css';
import './CRMDetail.css';
import './FormPages.css';

const CRMDetail = ({ leadId, onBack, onNavigate }) => {
  const [lead, setLead] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [users, setUsers] = useState([]);
  const [isMobile, setIsMobile] = useState(() => (
    typeof window !== 'undefined' ? window.innerWidth <= 1024 : false
  ));

  // Inline edit state — Tasks
  const [editingTaskId, setEditingTaskId] = useState(null);
  const [taskEdit, setTaskEdit] = useState({ summary: '', note: '', date_deadline: '', user_id: '' });
  const [savingTask, setSavingTask] = useState(false);

  // Inline edit state — Remarks
  const [editingRemarkId, setEditingRemarkId] = useState(null);
  const [remarkEditText, setRemarkEditText] = useState('');
  const [savingRemark, setSavingRemark] = useState(false);

  // Add note inline
  const [noteInput, setNoteInput] = useState('');
  const [addingNote, setAddingNote] = useState(false);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 1024);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const fetchLead = React.useCallback(async () => {
    try {
      const res = await odooService.getCRMLeadDetail(leadId);
      if (res) setLead(res);
      const masterRes = await odooService.getMasterData();
      if (masterRes?.users) setUsers(masterRes.users);
    } catch (err) {
      console.error('Error fetching lead details', err);
    } finally {
      setLoading(false);
    }
  }, [leadId]);

  useEffect(() => {
    if (leadId) fetchLead();
  }, [leadId, fetchLead]);

  // Task handlers
  const handleStartEditTask = (act) => {
    setEditingTaskId(act.id);
    setTaskEdit({
      summary: act.summary || act.activity_type_name || '',
      note: (act.note || '').replace(/<[^>]*>?/gm, '').trim(),
      date_deadline: act.date_deadline || '',
      user_id: act.user_id || ''
    });
  };

  const handleSaveTask = async (actId) => {
    setSavingTask(true);
    try {
      await odooService.updateActivity(actId, taskEdit.summary, taskEdit.note, taskEdit.date_deadline, taskEdit.user_id);
      setEditingTaskId(null);
      await fetchLead();
    } catch {
      alert('Could not update task.');
    } finally {
      setSavingTask(false);
    }
  };

  const handleDeleteTask = async (actId) => {
    if (!window.confirm('Delete this task?')) return;
    try {
      await odooService.deleteActivity(actId);
      await fetchLead();
    } catch {
      alert('Delete failed');
    }
  };

  // Remark handlers
  const handleStartEditRemark = (r) => {
    setEditingRemarkId(r.id);
    setRemarkEditText(r.remark);
  };

  const handleSaveRemark = async (remarkId) => {
    setSavingRemark(true);
    try {
      await odooService.updateRemark(remarkId, remarkEditText);
      setEditingRemarkId(null);
      await fetchLead();
    } catch {
      alert('Could not update remark.');
    } finally {
      setSavingRemark(false);
    }
  };

  const handleDeleteRemark = async (remarkId) => {
    if (!window.confirm('Delete this note?')) return;
    try {
      await odooService.deleteRemark(remarkId);
      await fetchLead();
    } catch {
      alert('Delete failed');
    }
  };

  // Add note inline
  const handleAddNote = async () => {
    if (!noteInput.trim()) return;
    setAddingNote(true);
    try {
      await odooService.addQuickNote(leadId, noteInput.trim(), 'crm.lead');
      setNoteInput('');
      await fetchLead();
    } catch {
      alert('Could not add note.');
    } finally {
      setAddingNote(false);
    }
  };

  if (loading) return <div className="p-8"><Loader /></div>;
  if (!lead) return <div className="p-8 text-center text-red-500">Lead not found.</div>;

  const handleConvertToOrder = (targetState) => {
    const route = targetState === 'selection' ? 'create-selection' : 'create-order';
    onNavigate(route, null, { lead, targetState, returnRoute: 'crm-detail' });
  };

  return (
    <div className="order-detail-page detail-page-shell">
      <div className="detail-card detail-surface">

        {/* Header */}
        <div className="detail-hero">
          <button className="btn-ui" onClick={onBack} style={{ height: '32px' }}>
            <ChevronLeft size={16} />
            <span>Back</span>
          </button>
          <div className="detail-hero-actions" style={{ display: 'flex', gap: '8px', flex: 1, justifyContent: 'flex-end' }}>
            <button className="btn-ui primary" onClick={() => onNavigate('create-crm', leadId)} style={{ height: '32px' }}>
              <Edit size={14} /><span>Edit Lead</span>
            </button>
            <button className="btn-ui" onClick={() => handleConvertToOrder('draft')} style={{ height: '32px', background: '#f8fafc', color: '#334155', borderColor: '#e2e8f0' }}>
              <Plus size={14} /><span>New Quotation</span>
            </button>
            <button className="btn-ui" onClick={() => handleConvertToOrder('selection')} style={{ height: '32px', background: '#e0f2fe', color: '#0369a1', borderColor: '#bae6fd' }}>
              <Plus size={14} /><span>New Selection</span>
            </button>
          </div>
        </div>

        {/* Title */}
        <section className="detail-section" style={{ borderBottom: '1px solid #f1f5f9' }}>
          <div style={{ padding: '16px 14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Target size={20} color="#3b82f6" />
              <h1 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 900, color: '#0f172a' }}>{lead.name}</h1>
            </div>
          </div>
        </section>

        {/* Info grid */}
        <section className="detail-section" style={{ background: '#fff' }}>
          <div className="detail-info-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1px', background: '#f1f5f9' }}>
            {/* Customer */}
            <div style={{ padding: '14px', background: '#fff' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                <User size={14} color="#64748b" />
                <h2 style={{ margin: 0, fontSize: '10px', textTransform: 'uppercase', fontWeight: 800, color: '#64748b' }}>Customer Details</h2>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '12px', color: '#64748b' }}>Assigned To</span>
                  <span style={{ fontSize: '12px', fontWeight: 700 }}>{Array.isArray(lead.user_id) ? lead.user_id[1] : 'Unassigned'}</span>
                </div>
                <div style={{ borderTop: '1px dashed #e2e8f0', paddingTop: '8px', marginTop: '4px' }}>
                  <div style={{ fontWeight: 700, fontSize: '13px', marginBottom: '4px' }}>
                    {lead.contact_name || (Array.isArray(lead.partner_id) ? lead.partner_id[1] : '—')}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    {lead.phone && <div style={{ fontSize: '12px', color: '#64748b' }}><Phone size={10} /> {lead.phone}</div>}
                    {lead.email && <div style={{ fontSize: '12px', color: '#64748b' }}><Mail size={10} /> {lead.email}</div>}
                    <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '2px' }}><MapPin size={10} /> {lead.address || 'No address'}</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Professionals */}
            <div style={{ padding: '14px', background: '#fff' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                <Star size={14} color="#64748b" />
                <h2 style={{ margin: 0, fontSize: '10px', textTransform: 'uppercase', fontWeight: 800, color: '#64748b' }}>Professionals</h2>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ background: '#f8fafc', padding: '8px', borderRadius: '6px' }}>
                  <div style={{ fontSize: '9px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Architect</div>
                  <div style={{ fontWeight: 700, fontSize: '13px' }}>{lead.architect_name || (Array.isArray(lead.architect_id) ? lead.architect_id[1] : '—')}</div>
                  {lead.architect_follow_up && (
                    <div style={{ fontSize: '11px', color: '#92400e', background: '#fffbeb', display: 'inline-block', padding: '2px 6px', borderRadius: '4px', marginTop: '4px' }}>{lead.architect_follow_up}</div>
                  )}
                </div>
                <div style={{ background: '#f8fafc', padding: '8px', borderRadius: '6px' }}>
                  <div style={{ fontSize: '9px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Electrician</div>
                  <div style={{ fontWeight: 700, fontSize: '13px' }}>{lead.electrician_name || (Array.isArray(lead.electrician_id) ? lead.electrician_id[1] : '—')}</div>
                </div>
                {(lead.other_name || lead.other_number) && (
                  <div style={{ background: '#f3f4f6', padding: '8px', borderRadius: '6px' }}>
                    <div style={{ fontSize: '9px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Other</div>
                    <div style={{ fontWeight: 700, fontSize: '13px' }}>{lead.other_name || '—'}</div>
                    {lead.other_number && (
                      <div style={{ fontSize: '12px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '4px' }}>
                        <Phone size={10} /> {lead.other_number}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Tasks & Notes side-by-side */}
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', borderTop: '1px solid #10b981', background: '#fff' }}>

          {/* ── TASKS ── */}
          <div style={{ borderRight: isMobile ? 'none' : '1px solid #eee' }}>
            <div style={{ padding: '12px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f8fafc' }}>
              <h2 style={{ margin: 0, fontWeight: 700, fontSize: '0.9rem', color: '#000', textTransform: 'uppercase' }}>Tasks</h2>
              <button
                className="ghost-action-btn"
                onClick={() => setShowTaskModal(true)}
                style={{ padding: '4px 10px', height: '28px', fontSize: '11px', color: '#3b82f6', fontWeight: 700 }}
              >
                <Plus size={14} /><span>Add Task</span>
              </button>
            </div>
            <div style={{ padding: '14px 14px 0 14px', borderBottom: '14px solid transparent', display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '300px', overflowY: 'auto', boxSizing: 'border-box' }}>
              {(!lead.activities || lead.activities.length === 0) ? (
                <div style={{ textAlign: 'center', padding: '20px', color: '#94a3b8', fontSize: '12px' }}>No planned tasks found.</div>
              ) : (
                (() => {
                  const seen = new Set();
                  return lead.activities.filter(act => {
                    const cleanNote = (act.note || '').replace(/<[^>]*>?/gm, '').trim().toLowerCase();
                    const key = `${act.summary}-${cleanNote}-${act.date_deadline}`.toLowerCase();
                    if (seen.has(key)) return false;
                    seen.add(key);
                    return true;
                  });
                })().map(act => (
                  <div key={act.id} style={{ padding: '10px 12px', borderRadius: '8px', border: '1px solid #eee', flexShrink: 0 }}>
                    {editingTaskId === act.id ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                          <input
                            type="date"
                            value={taskEdit.date_deadline}
                            onChange={e => setTaskEdit({ ...taskEdit, date_deadline: e.target.value })}
                            style={{ height: '32px', fontSize: '12px', padding: '0 8px', width: '100%', borderRadius: '6px', border: '1px solid #e2e8f0', outline: 'none' }}
                          />
                          <SearchableSelect
                            placeholder="Assignee"
                            value={taskEdit.user_id}
                            small
                            options={users.map(u => ({ value: u.id, label: u.name }))}
                            onChange={val => setTaskEdit({ ...taskEdit, user_id: val })}
                          />
                        </div>
                        <textarea
                          value={taskEdit.note}
                          onChange={e => setTaskEdit({ ...taskEdit, note: e.target.value })}
                          placeholder="Message..."
                          style={{ minHeight: '70px', fontSize: '12px', padding: '8px', width: '100%', borderRadius: '8px', border: '1px solid #e2e8f0', backgroundColor: '#f8fafc', resize: 'none', outline: 'none' }}
                        />
                        <div style={{ display: 'flex', gap: '12px' }}>
                          <button onClick={() => handleSaveTask(act.id)} disabled={savingTask} style={{ fontSize: '12px', fontWeight: 700, color: '#3b82f6', background: 'none', border: 'none', cursor: 'pointer' }}>
                            {savingTask ? 'Saving…' : 'Save'}
                          </button>
                          <button onClick={() => setEditingTaskId(null)} style={{ fontSize: '12px', color: '#64748b', background: 'none', border: 'none', cursor: 'pointer' }}>Cancel</button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div style={{ display: 'flex', width: '100%', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div style={{ fontWeight: 800, fontSize: '13px', color: '#000' }}>
                            {(act.summary || act.activity_type_name) === 'To Do' ? 'Task' : (act.summary || act.activity_type_name || 'Task')}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ fontSize: '11px', color: '#666', fontWeight: 600 }}>📅 {act.date_deadline || 'No Date'}</span>
                            <button onClick={() => handleStartEditTask(act)} style={{ border: 'none', background: 'none', color: '#94a3b8', cursor: 'pointer' }} title="Edit">
                              <Edit2 size={13} />
                            </button>
                            <button onClick={() => handleDeleteTask(act.id)} style={{ border: 'none', background: 'none', color: '#94a3b8', cursor: 'pointer' }} title="Delete">
                              <Trash size={13} />
                            </button>
                          </div>
                        </div>
                        {act.note && (
                          <div style={{ fontSize: '12px', color: '#475569', lineHeight: '1.4', marginTop: '6px' }} dangerouslySetInnerHTML={{ __html: act.note }} />
                        )}
                        {act.user_name && (
                          <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px' }}>👤 {act.user_name}</div>
                        )}
                      </>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* ── NOTES/REMARKS ── */}
          <div style={{ background: '#fff', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '12px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f8fafc' }}>
              <h2 style={{ margin: 0, fontWeight: 700, fontSize: '0.9rem', color: '#000', textTransform: 'uppercase' }}>Notes</h2>
              <button 
                className="ghost-action-btn" 
                onClick={() => setShowNoteModal(true)}
                style={{ padding: '4px 10px', height: '28px', fontSize: '11px', color: '#10b981', fontWeight: 700 }}
              >
                <Plus size={14} />
                <span>Add Note</span>
              </button>
            </div>

            {/* Scrollable list */}
            <div style={{ padding: '14px 14px 0 14px', borderBottom: '8px solid transparent', display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '260px', overflowY: 'auto', boxSizing: 'border-box' }}>
              {(!lead.remarks || lead.remarks.length === 0) ? (
                <div style={{ textAlign: 'center', padding: '20px', color: '#94a3b8', fontSize: '12px' }}>No notes yet.</div>
              ) : (
                (() => {
                  const seen = new Set();
                  return lead.remarks.filter(r => {
                    const text = (r.remark || '').trim().toLowerCase();
                    if (!text || seen.has(text)) return false;
                    seen.add(text);
                    return true;
                  });
                })().map(r => (
                  <div key={r.id} style={{ padding: '10px 12px', borderRadius: '8px', border: '1px solid #eee', flexShrink: 0 }}>
                    <div style={{ display: 'flex', width: '100%', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
                      <span style={{ fontSize: '10px', color: '#666', fontWeight: 800, textTransform: 'uppercase' }}>
                        {r.salesperson} · {r.date}
                      </span>
                      <div style={{ display: 'flex', gap: '4px' }}>
                        <button onClick={() => handleStartEditRemark(r)} style={{ border: 'none', background: 'none', color: '#94a3b8', cursor: 'pointer' }} title="Edit">
                          <Edit2 size={13} />
                        </button>
                        <button onClick={() => handleDeleteRemark(r.id)} style={{ border: 'none', background: 'none', color: '#94a3b8', cursor: 'pointer' }} title="Delete">
                          <Trash size={13} />
                        </button>
                      </div>
                    </div>
                    {editingRemarkId === r.id ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <textarea
                          value={remarkEditText}
                          onChange={e => setRemarkEditText(e.target.value)}
                          style={{ minHeight: '70px', fontSize: '13px', padding: '8px', width: '100%', borderRadius: '8px', border: '1px solid #3b82f6', resize: 'none', outline: 'none' }}
                        />
                        <div style={{ display: 'flex', gap: '12px' }}>
                          <button onClick={() => handleSaveRemark(r.id)} disabled={savingRemark} style={{ fontSize: '12px', fontWeight: 700, color: '#3b82f6', background: 'none', border: 'none', cursor: 'pointer' }}>
                            {savingRemark ? 'Saving…' : 'Save Changes'}
                          </button>
                          <button onClick={() => setEditingRemarkId(null)} style={{ fontSize: '12px', color: '#64748b', background: 'none', border: 'none', cursor: 'pointer' }}>Cancel</button>
                        </div>
                      </div>
                    ) : (
                      <p style={{ margin: 0, fontSize: '13px', color: '#000', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{r.remark}</p>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="detail-footer-actions">
          <div style={{ fontSize: '11px', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Clock size={12} /> ID: {lead.id}
          </div>
        </div>
      </div>

      {showTaskModal && (
        <QuickTaskModal
          orderId={leadId}
          resModel="crm.lead"
          users={users}
          onClose={() => setShowTaskModal(false)}
          onSuccess={() => { fetchLead(); setShowTaskModal(false); }}
        />
      )}

      {showNoteModal && (
        <QuickNoteModal
          orderId={leadId}
          resModel="crm.lead"
          onClose={() => setShowNoteModal(false)}
          onSuccess={() => { fetchLead(); setShowNoteModal(false); }}
        />
      )}
    </div>
  );
};

export default CRMDetail;
