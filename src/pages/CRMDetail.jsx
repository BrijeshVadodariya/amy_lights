import React, { useState, useEffect } from 'react';
import { 
  ChevronLeft, 
  Edit, 
  Target, 
  User, 
  MapPin, 
  Activity, 
  DollarSign, 
  Star,
  Phone,
  Mail,
  FileText,
  Calendar,
  Clock,
  Briefcase,
  CheckCircle,
  XCircle,
  Plus,
  MoreHorizontal,
  Trash2,
  Trash
} from 'lucide-react';
import { odooService } from '../services/odoo';
import Loader from '../components/Loader';
import { QuickNoteModal, QuickTaskModal } from '../components/QuickActionModals';
import './OrderDetail.css';
import './CRMDetail.css';
import './FormPages.css';

const CRMDetail = ({ leadId, onBack, onNavigate }) => {
  const [lead, setLead] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [users, setUsers] = useState([]);

  const fetchLead = React.useCallback(async () => {
    try {
      const res = await odooService.getCRMLeadDetail(leadId);
      if (res) {
        setLead(res);
      }
      
      const masterRes = await odooService.getMasterData();
      if (masterRes?.users) {
        setUsers(masterRes.users);
      }
    } catch (err) {
      console.error('Error fetching lead details', err);
    } finally {
      setLoading(false);
    }
  }, [leadId]);

  useEffect(() => {
    if (leadId) fetchLead();
  }, [leadId, fetchLead]);

  if (loading) return <div className="p-8"><Loader /></div>;
  if (!lead) return <div className="p-8 text-center text-red-500">Lead not found.</div>;

  const handleConvertToOrder = (targetState) => {
    // Navigate directly to CreateOrder with the Lead data for pre-filling
    onNavigate('create-order', null, { 
      lead: lead, 
      targetState: targetState 
    });
  };

  const formatCurrency = (value) => {
    const amount = Number(value);
    return `Rs. ${amount.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  };

  const priorityStars = (p) => '⭐'.repeat(parseInt(p || 0) + 1);

  return (
    <div className="order-detail-page detail-page-shell">
      <div className="detail-card detail-surface">
        <div className="detail-hero">
          <button className="btn-ui" onClick={onBack} style={{ height: '32px' }}>
            <ChevronLeft size={16} />
            <span>Back</span>
          </button>
          
          <div className="detail-hero-actions" style={{ display: 'flex', gap: '8px', flex: 1, justifyContent: 'flex-end' }}>
            <button 
              className="btn-ui primary" 
              onClick={() => onNavigate('create-crm', leadId)}
              style={{ height: '32px' }}
            >
              <Edit size={14} />
              <span>Edit Lead</span>
            </button>
            <button 
              className="btn-ui" 
              onClick={() => handleConvertToOrder('draft')}
              style={{ height: '32px', background: '#f8fafc', color: '#334155', borderColor: '#e2e8f0' }}
            >
              <Plus size={14} />
              <span>New Quotation</span>
            </button>
            <button 
              className="btn-ui" 
              onClick={() => handleConvertToOrder('selection')}
              style={{ height: '32px', background: '#e0f2fe', color: '#0369a1', borderColor: '#bae6fd' }}
            >
              <Plus size={14} />
              <span>New Selection</span>
            </button>
          </div>
        </div>

        <section className="detail-section" style={{ borderBottom: '1px solid #f1f5f9' }}>
          <div style={{ padding: '16px 14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
              <Target size={20} color="#3b82f6" />
              <h1 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 900, color: '#0f172a' }}>{lead.name}</h1>
            </div>

            <div className="detail-info-grid" style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', 
              gap: '10px' 
            }}>
              <div className="detail-info-card" style={{ padding: '8px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #f1f5f9' }}>
                <span className="dt-control-label" style={{ fontSize: '9px' }}>Status</span>
                <div style={{ fontWeight: 800, color: '#2563eb', fontSize: '13px', marginTop: '4px' }}>
                  {Array.isArray(lead.stage) ? lead.stage[1] : (lead.stage || 'New')}
                </div>
              </div>

              <div className="detail-info-card" style={{ padding: '8px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #f1f5f9' }}>
                <span className="dt-control-label" style={{ fontSize: '9px' }}>Expected Revenue</span>
                <div style={{ fontWeight: 800, color: '#059669', fontSize: '13px', marginTop: '4px' }}>
                  {formatCurrency(lead.expected_revenue)}
                </div>
              </div>

              <div className="detail-info-card" style={{ padding: '8px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #f1f5f9' }}>
                <span className="dt-control-label" style={{ fontSize: '9px' }}>Probability</span>
                <div style={{ fontWeight: 800, color: '#334155', fontSize: '13px', marginTop: '4px' }}>
                  {lead.probability || 0}%
                </div>
              </div>

              <div className="detail-info-card" style={{ padding: '8px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #f1f5f9' }}>
                <span className="dt-control-label" style={{ fontSize: '9px' }}>Deadline</span>
                <div style={{ fontWeight: 800, color: '#f59e0b', fontSize: '13px', marginTop: '4px' }}>
                  {lead.date_deadline || '—'}
                </div>
              </div>

              <div className="detail-info-card" style={{ padding: '8px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #f1f5f9' }}>
                <span className="dt-control-label" style={{ fontSize: '9px' }}>Priority</span>
                <div style={{ fontSize: '12px', marginTop: '4px' }}>{priorityStars(lead.priority)}</div>
              </div>
            </div>
          </div>
        </section>

        <section className="detail-section" style={{ background: '#fff' }}>
          <div className="detail-info-grid" style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', 
            gap: '1px',
            background: '#f1f5f9' 
          }}>
            {/* Left Column: Stakeholders */}
            <div style={{ padding: '14px', background: '#fff' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                 <User size={14} color="#64748b" />
                 <h2 style={{ margin: 0, fontSize: '10px', textTransform: 'uppercase', fontWeight: 800, color: '#64748b' }}>Stakeholders</h2>
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '12px', color: '#64748b' }}>Assigned To</span>
                  <span style={{ fontSize: '12px', fontWeight: 700 }}>{Array.isArray(lead.user_id) ? lead.user_id[1] : 'Unassigned'}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '12px', color: '#64748b' }}>Customer Link</span>
                  <span style={{ fontSize: '12px', fontWeight: 700, color: '#2563eb' }}>{Array.isArray(lead.partner_id) ? lead.partner_id[1] : 'Lead (No Link)'}</span>
                </div>
                <div style={{ borderTop: '1px dashed #e2e8f0', paddingTop: '8px', marginTop: '4px' }}>
                  <div style={{ fontWeight: 700, fontSize: '13px', marginBottom: '4px' }}>{lead.contact_name || '—'}</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    {lead.phone && <div style={{ fontSize: '12px', color: '#64748b' }}><Phone size={10} /> {lead.phone}</div>}
                    {lead.email && <div style={{ fontSize: '12px', color: '#64748b' }}><Mail size={10} /> {lead.email}</div>}
                    <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '2px' }}><MapPin size={10} /> {lead.address || 'No address'}</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Professionals */}
            <div style={{ padding: '14px', background: '#fff' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                 <Star size={14} color="#64748b" />
                 <h2 style={{ margin: 0, fontSize: '10px', textTransform: 'uppercase', fontWeight: 800, color: '#64748b' }}>Professionals</h2>
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div className="compact-pro-row" style={{ background: '#f8fafc', padding: '8px', borderRadius: '6px' }}>
                  <div style={{ fontSize: '9px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Architect</div>
                  <div style={{ fontWeight: 700, fontSize: '13px' }}>{lead.architect_name || (Array.isArray(lead.architect_id) ? lead.architect_id[1] : '—')}</div>
                  {lead.architect_follow_up && (
                    <div style={{ fontSize: '11px', color: '#92400e', background: '#fffbeb', display: 'inline-block', padding: '2px 6px', borderRadius: '4px', marginTop: '4px' }}>
                      {lead.architect_follow_up}
                    </div>
                  )}
                </div>

                <div className="compact-pro-row" style={{ background: '#f8fafc', padding: '8px', borderRadius: '6px' }}>
                  <div style={{ fontSize: '9px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Electrician</div>
                  <div style={{ fontWeight: 700, fontSize: '13px' }}>{lead.electrician_name || (Array.isArray(lead.electrician_id) ? lead.electrician_id[1] : '—')}</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="detail-section" style={{ padding: '14px' }}>
           <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
               <FileText size={14} color="#64748b" />
               <h2 style={{ margin: 0, fontSize: '10px', textTransform: 'uppercase', fontWeight: 800, color: '#64748b' }}>Requirements</h2>
           </div>
           <div style={{ 
              padding: '12px', 
              background: '#fcfdfe', 
              border: '1px solid #f1f5f9', 
              borderRadius: '8px', 
              fontSize: '13px',
              lineHeight: 1.5,
              color: '#334155',
              whiteSpace: 'pre-wrap'
           }}>
              {lead.description || 'No detailed description provided.'}
           </div>
        </section>

        <section className="detail-section remarks-history-section" style={{ borderTop: '1px solid #eee' }}>
          <div className="section-tabs-header">
            <h3 className="section-title">Timeline & Activities</h3>
            <div className="section-header-actions">
              <button className="btn-ui compact" onClick={() => setShowTaskModal(true)}>
                <Plus size={14} />
                <span>Next Activity</span>
              </button>
              <button className="btn-ui compact primary" onClick={() => setShowNoteModal(true)}>
                <Plus size={14} />
                <span>Log Note</span>
              </button>
            </div>
          </div>

          <div className="timeline-container">
            {/* Planned Activities */}
            <div className="timeline-lane">
              <h4 className="timeline-lane-title">Planned Activities</h4>
              <div className="activity-stack">
                {lead.activities?.length > 0 ? lead.activities.map(act => (
                  <div key={act.id} className="timeline-item activity-item">
                    <div className="timeline-item-header">
                      <div className="timeline-item-type">
                        <Calendar size={14} />
                        <span>{act.activity_type_name}</span>
                      </div>
                      <div className="timeline-item-date">{act.date_deadline}</div>
                    </div>
                    <div className="timeline-item-content">
                      <div className="timeline-item-summary">{act.summary}</div>
                      {act.note && <div className="timeline-item-note" dangerouslySetInnerHTML={{ __html: act.note }} />}
                    </div>
                    <div className="timeline-item-footer">
                        <span className="timeline-item-user">@{act.user_name}</span>
                    </div>
                  </div>
                )) : (
                  <div className="empty-state-small">No planned activities.</div>
                )}
              </div>
            </div>

            {/* History / Log Notes */}
            <div className="timeline-lane">
              <h4 className="timeline-lane-title">History</h4>
              <div className="history-stack">
                {lead.history?.length > 0 ? lead.history.map(msg => (
                  <div key={msg.id} className="timeline-item history-item">
                    <div className="timeline-item-header">
                       <span className="timeline-item-author">{msg.author}</span>
                       <span className="timeline-item-date">{msg.date}</span>
                    </div>
                    <div className="timeline-item-content">
                       <p>{msg.body}</p>
                    </div>
                  </div>
                )) : (
                  <div className="empty-state-small">No history yet.</div>
                )}
              </div>
            </div>
          </div>
        </section>

        <div className="detail-footer-actions">
           <div style={{ fontSize: '11px', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Clock size={12} /> ID: {lead.id} | Created on {new Date(lead.create_date).toLocaleDateString()}
           </div>
        </div>
      </div>

      {showNoteModal && (
        <QuickNoteModal 
          orderId={leadId}
          resModel="crm.lead"
          onClose={() => setShowNoteModal(false)}
          onSuccess={() => { fetchLead(); setShowNoteModal(false); }}
        />
      )}

      {showTaskModal && (
        <QuickTaskModal 
          orderId={leadId}
          resModel="crm.lead"
          users={users}
          onClose={() => setShowTaskModal(false)}
          onSuccess={() => { fetchLead(); setShowTaskModal(false); }}
        />
      )}
    </div>
  );
};

export default CRMDetail;
