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

        <section className="detail-section">
          <div className="detail-section-header" style={{ padding: '12px 14px' }}>
             <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Target size={18} color="#3b82f6" />
                <h1 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800 }}>{lead.name}</h1>
             </div>
          </div>

          <div style={{ padding: '0 14px 14px' }}>
            <div className="detail-info-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
              <div className="detail-info-card">
                <span className="dt-control-label">Status Pool</span>
                <div className="field-value-box" style={{ padding: '10px' }}>
                  <div style={{ fontWeight: 800, color: '#2563eb' }}>{Array.isArray(lead.stage) ? lead.stage[1] : (lead.stage || 'New')}</div>
                </div>
              </div>

              <div className="detail-info-card">
                <span className="dt-control-label">Probability</span>
                <div className="field-value-box" style={{ padding: '10px' }}>
                  <div style={{ fontWeight: 800 }}>{lead.probability || 0}%</div>
                </div>
              </div>

              <div className="detail-info-card">
                <span className="dt-control-label">Expected Revenue</span>
                <div className="field-value-box" style={{ padding: '10px' }}>
                  <div style={{ fontWeight: 800, color: '#059669' }}>{formatCurrency(lead.expected_revenue)}</div>
                </div>
              </div>

              <div className="detail-info-card">
                <span className="dt-control-label">Expected Closing</span>
                <div className="field-value-box" style={{ padding: '10px' }}>
                  <div style={{ fontWeight: 800, color: '#f59e0b' }}>{lead.date_deadline || '—'}</div>
                </div>
              </div>

              <div className="detail-info-card">
                <span className="dt-control-label">Priority</span>
                <div className="field-value-box" style={{ padding: '10px' }}>
                  <div style={{ fontSize: '14px' }}>{priorityStars(lead.priority)}</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="detail-section" style={{ borderTop: '1px solid #eee' }}>
          <div className="detail-info-grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '2px' }}>
            <div style={{ padding: '14px', borderRight: '1px solid #eee' }}>
               <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <User size={16} color="#64748b" />
                  <h2 style={{ margin: 0, fontSize: '11px', textTransform: 'uppercase', fontWeight: 800, color: '#64748b' }}>Assigned To</h2>
               </div>
               <div className="field-value-box" style={{ padding: '10px', background: '#f8fafc', borderRadius: '6px' }}>
                  <div style={{ fontWeight: 700 }}>{Array.isArray(lead.user_id) ? lead.user_id[1] : 'Unassigned'}</div>
               </div>
            </div>
            <div style={{ padding: '14px' }}>
               <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <Briefcase size={16} color="#64748b" />
                  <h2 style={{ margin: 0, fontSize: '11px', textTransform: 'uppercase', fontWeight: 800, color: '#64748b' }}>Customer Link</h2>
               </div>
               <div className="field-value-box" style={{ padding: '10px', background: '#f8fafc', borderRadius: '6px' }}>
                  <div style={{ fontWeight: 700, color: '#2563eb' }}>{Array.isArray(lead.partner_id) ? lead.partner_id[1] : 'Lead (No Link)'}</div>
               </div>
            </div>
          </div>
        </section>

        <section className="detail-section" style={{ borderTop: '1px solid #eee' }}>
          <div className="detail-info-grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '2px' }}>
            {/* Contact Info */}
            <div style={{ padding: '14px', borderRight: '1px solid #eee' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                 <User size={16} color="#64748b" />
                 <h2 style={{ margin: 0, fontSize: '11px', textTransform: 'uppercase', fontWeight: 800, color: '#64748b' }}>Contact Info</h2>
              </div>
              <div className="field-value-box" style={{ padding: '12px', background: '#f8fafc', borderRadius: '8px', gap: '10px', flexDirection: 'column', alignItems: 'flex-start' }}>
                 <div style={{ fontWeight: 700, fontSize: '15px' }}>{lead.contact_name || '—'}</div>
                 <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', width: '100%' }}>
                    {lead.phone && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#64748b' }}>
                        <Phone size={14} /> {lead.phone}
                      </div>
                    )}
                    {lead.email && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#64748b' }}>
                        <Mail size={14} /> {lead.email}
                      </div>
                    )}
                    <div style={{ display: 'flex', alignItems: 'start', gap: '8px', fontSize: '13px', color: '#64748b', marginTop: '4px' }}>
                      <MapPin size={14} style={{ marginTop: '2px' }} /> 
                      <span>{lead.address || 'No address provided'}</span>
                    </div>
                 </div>
              </div>
            </div>

            {/* Project Info */}
            <div style={{ padding: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                 <Star size={16} color="#64748b" />
                 <h2 style={{ margin: 0, fontSize: '11px', textTransform: 'uppercase', fontWeight: 800, color: '#64748b' }}>Professional Involvement</h2>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div className="field-value-box" style={{ padding: '10px', gap: '12px', justifyContent: 'flex-start' }}>
                   <div style={{ background: '#f1f5f9', p: '6px', borderRadius: '4px' }}><Star size={14} /></div>
                   <div>
                      <div style={{ fontSize: '10px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Architect</div>
                      <div style={{ fontWeight: 700 }}>{lead.architect_name || (Array.isArray(lead.architect_id) ? lead.architect_id[1] : '—')}</div>
                   </div>
                </div>
                {lead.architect_follow_up && (
                  <div style={{ padding: '8px 12px', background: '#fffbeb', border: '1px solid #fef3c7', borderRadius: '6px', fontSize: '12px' }}>
                    <span style={{ fontWeight: 800, color: '#92400e' }}>Status: </span>
                    {lead.architect_follow_up}
                  </div>
                )}
                <div className="field-value-box" style={{ padding: '10px', gap: '12px', justifyContent: 'flex-start' }}>
                   <div style={{ background: '#f1f5f9', p: '6px', borderRadius: '4px' }}><Activity size={14} /></div>
                   <div>
                      <div style={{ fontSize: '10px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Electrician</div>
                      <div style={{ fontWeight: 700 }}>{lead.electrician_name || (Array.isArray(lead.electrician_id) ? lead.electrician_id[1] : '—')}</div>
                   </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="detail-section" style={{ padding: '14px', borderTop: '1px solid #eee' }}>
           <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
               <FileText size={16} color="#64748b" />
               <h2 style={{ margin: 0, fontSize: '11px', textTransform: 'uppercase', fontWeight: 800, color: '#64748b' }}>Requirements & Description</h2>
           </div>
           <div style={{ 
              padding: '16px', 
              background: '#fff', 
              border: '1px solid #eee', 
              borderRadius: '8px', 
              minHeight: '100px',
              fontSize: '14px',
              lineHeight: 1.6,
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
