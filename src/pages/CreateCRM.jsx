import React, { useMemo, useState, useEffect } from 'react';
import { X, Plus, Phone, User, MapPin, Activity, MessageSquare, Trash, DollarSign, Target, Star, FileText, ChevronRight, Zap, MessageCircle, Edit2 } from 'lucide-react';
import { odooService } from '../services/odoo';
import SearchableSelect from '../components/SearchableSelect';
import './FormPages.css';

const CreateCRM = ({ editId, onNavigate, extraData }) => {
  const returnRoute = extraData?.returnRoute || 'crm';
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [masterData, setMasterData] = useState({ architects: [], electricians: [], users: [], stages: [], partners: [], activity_types: [] });
  const [modalState, setModalState] = useState({ show: false, editingId: null, newName: '', newPhone: '', newEmail: '', newAddress: '', newNote: '', isArchitect: false, isElectrician: false });

  const [scheduledActivities, setScheduledActivities] = useState([]);
  const [generalNotes, setGeneralNotes] = useState([]);
  const [newActivity, setNewActivity] = useState({
    activity_type_id: '',
    summary: 'To Do',
    note: '',
    user_id: '',
    date_deadline: new Date().toISOString().split('T')[0]
  });
  const [generalNoteInput, setGeneralNoteInput] = useState('');
  const [showActivitySection, setShowActivitySection] = useState(false);
  const [showRemarksSection, setShowRemarksSection] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState(null);
  const [taskEditText, setTaskEditText] = useState({});
  const [editingNoteId, setEditingNoteId] = useState(null);
  const [noteEditText, setNoteEditText] = useState("");
  
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const [lead, setLead] = useState(() => {
    // 1. Check if we have state passed directly (return logic)
    if (extraData?.formState) return extraData.formState;
    
    // 2. If not editing, check localStorage for a saved draft
    if (!editId) {
      const savedDraft = localStorage.getItem('amy_crm_form_draft');
      if (savedDraft) {
        try {
          return JSON.parse(savedDraft);
        } catch (e) {
          console.error("Failed to parse CRM draft", e);
        }
      }
    }

    // 3. Fallback to default empty state
    return {
      name: '',
      contact_name: '',
      phone: '',
      mobile: '',
      email: '',
      street: '',
      city: '',
      zip: '',
      expected_revenue: 0,
      probability: 0,
      priority: '0',
      description: '',
      type: 'opportunity',
      stage_id: '',
      architect_id: '',
      architect_number: '',
      architect_remark: '',
      architect_follow_up: '',
      electrician_id: '',
      partner_id: '',
      user_id: '',
      date_deadline: '',
      houseNo: '',
      buildingName: '',
      area: '',
      state_name: '',
      remarks: []
    };
  });

  // Persist to localStorage whenever lead changes (only for new records)
  useEffect(() => {
    if (!editId) {
      const timeoutId = setTimeout(() => {
        localStorage.setItem('amy_crm_form_draft', JSON.stringify(lead));
      }, 500); // 500ms debounce
      return () => clearTimeout(timeoutId);
    }
  }, [lead, editId]);

  const [newRemark, setNewRemark] = useState('');
  const [editingRemarkId, setEditingRemarkId] = useState(null);
  const [editingRemarkText, setEditingRemarkText] = useState('');

  const handleAddRemark = async () => {
    if (!newRemark.trim() || !editId) return;
    try {
      await odooService.addQuickNote(editId, newRemark, 'crm.lead');
      const updated = await odooService.getCRMLeadDetail(editId);
      if (updated) setLead(prev => ({ ...prev, remarks: updated.remarks || [] }));
      setNewRemark('');
    } catch (err) {
      alert("Failed to add remark");
    }
  };

  const handleEditRemark = (remark) => {
    setEditingRemarkId(remark.id);
    setEditingRemarkText(remark.remark);
  };

  const handleUpdateRemark = async (remarkId) => {
    try {
      await odooService.updateRemark(remarkId, editingRemarkText);
      setEditingRemarkId(null);
      const updated = await odooService.getCRMLeadDetail(editId);
      if (updated) setLead(prev => ({ ...prev, remarks: updated.remarks || [] }));
    } catch (err) {
      alert("Failed to update remark");
    }
  };

  const handleDeleteRemark = async (remarkId) => {
    if (!window.confirm("Delete this remark?")) return;
    try {
      await odooService.deleteRemark(remarkId);
      const updated = await odooService.getCRMLeadDetail(editId);
      if (updated) setLead(prev => ({ ...prev, remarks: updated.remarks || [] }));
    } catch (err) {
      alert("Failed to delete remark");
    }
  };

  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (editId) {
      setLoading(true);
      odooService.getCRMLeadDetail(editId).then(res => {
        if (res) {
          const extractId = (val) => {
            if (!val) return '';
            if (Array.isArray(val) && val.length > 0) return val[0];
            return val;
          };

          let streetStr = res.street || '';
          let parts = streetStr.split(',').map(s => s.trim());
          let hNo = '', bName = '', aName = '';
          if (parts.length === 1) {
            // Smart split: Heuristic for single items
            if (parts[0].includes(' ') || parts[0].length > 6) {
              bName = parts[0];
            } else {
              hNo = parts[0];
            }
          } else if (parts.length === 2) {
            hNo = parts[0];
            bName = parts[1];
          } else if (parts.length >= 3) {
            hNo = parts[0];
            bName = parts[1];
            aName = parts.slice(2).join(', ');
          }

          setLead({
            id: res.id,
            name: res.name || '',
            contact_name: res.contact_name || '',
            phone: res.phone || '',
            mobile: res.mobile || '',
            email: res.email || '',
            street: streetStr,
            houseNo: hNo,
            buildingName: bName,
            area: aName,
            city: res.city || '',
            zip: res.zip || '',
            expected_revenue: res.expected_revenue || 0,
            probability: res.probability || 0,
            priority: String(res.priority || '0'),
            description: res.description || '',
            remarks: res.remarks || [],
            type: res.type || 'opportunity',
            stage_id: extractId(res.stage),
            architect_id: extractId(res.architect_id),
            architect_number: res.architect_number || '',
            architect_remark: res.architect_remark || '',
            architect_follow_up: res.architect_follow_up || '',
            electrician_id: extractId(res.electrician_id),
            partner_id: extractId(res.partner_id),
            user_id: extractId(res.user_id),
            date_deadline: res.date_deadline || ''
          });
          setScheduledActivities(res.activities || []);
          
          // Auto-expand sections if data exists
          if (res.activities && res.activities.length > 0) setShowActivitySection(true);
          if (res.remarks && res.remarks.length > 0) setShowRemarksSection(true);
          
          setTimeout(() => setHasChanges(false), 200);
        }
        setLoading(false);
      }).catch(() => setLoading(false));
    }
  }, [editId]);

  useEffect(() => {
    Promise.all([
      odooService.getMasterData().catch(() => ({})),
      odooService.getCRMStages().catch(() => [])
    ]).then(([masterRes, stagesRes]) => {
      setMasterData({
        architects: (masterRes?.architects || []).map(p => ({ value: p.id, label: p.name, phone: p.phone })),
        electricians: (masterRes?.electricians || []).map(p => ({ value: p.id, label: p.name, phone: p.phone })),
        users: masterRes?.users || [],
        partners: (masterRes?.partners || []).map(p => ({ value: p.id, label: p.name, phone: p.phone || p.mobile || '' })),
        stages: stagesRes || [],
        activity_types: masterRes?.activity_types || []
      });
    });
  }, []);

  const handlePartnerChange = async (partnerId) => {
    if (!partnerId) {
      setLead(prev => ({ ...prev, partner_id: '' }));
      return;
    }
    
    setLead(prev => ({ ...prev, partner_id: partnerId }));
    setHasChanges(true);
    setLoading(true);
    
    try {
      const res = await odooService.getPartnerDetail(partnerId);
      if (res) {
        const extractId = (val) => {
          if (!val) return '';
          if (Array.isArray(val) && val.length > 0) return val[0];
          return val;
        };

        let streetStr = res.street || '';
        let parts = streetStr.split(',').map(s => s.trim());
        let hNo = '', bName = '', aName = '';
        if (parts.length === 1) {
          if (parts[0].includes(' ') || parts[0].length > 6) {
            bName = parts[0];
          } else {
            hNo = parts[0];
          }
        } else if (parts.length === 2) {
          hNo = parts[0];
          bName = parts[1];
        } else if (parts.length >= 3) {
          hNo = parts[0];
          bName = parts[1];
          aName = parts.slice(2).join(', ');
        }

        setLead(prev => ({
          ...prev,
          partner_id: partnerId,
          name: res.name || prev.name, // Auto-fill lead name from customer name
          architect_id: extractId(res.architect_id),
          electrician_id: extractId(res.electrician_id),
          houseNo: hNo,
          buildingName: bName,
          area: res.street2 || aName,
          zip: res.zip || '',
          city: res.city || '',
          state_name: res.state_name || '',
          contact_name: '', 
          mobile: '',
          email: ''
        }));
      }
    } catch (err) {
      console.error("Partner details fetch failed", err);
    } finally {
      setLoading(false);
    }
  };

  // Handle return from CreateCustomer with pre-filled data
  useEffect(() => {
    if (extraData?.preFilledPartnerId) {
      const pId = extraData.preFilledPartnerId;
      // Re-fetch master data to ensure the new partner is in the list
      odooService.getPartners().then(partners => {
        if (partners) {
          setMasterData(prev => ({ ...prev, partners }));
          handlePartnerChange(pId);
        }
      });
    }
  }, [extraData]);

  const canSubmit = useMemo(() => lead.partner_id !== '', [lead.partner_id]);

  const handleSubmit = async () => {
    if (!canSubmit || saving) return;
    setSaving(true);
    try {
      let res;
      let finalStreet = [lead.houseNo, lead.buildingName].filter(Boolean).join(', ');
      let finalStreet2 = lead.area || '';
      
      // Fallback name if somehow empty
      let finalName = lead.name;
      if (!finalName && lead.partner_id) {
        finalName = masterData.partners.find(p => p.value === lead.partner_id)?.label || 'New Opportunity';
      }

      const payloadToSend = { 
        ...lead, 
        street: finalStreet, 
        street2: finalStreet2,
        name: finalName,
        activities: scheduledActivities,
        general_notes: generalNotes.map(n => n.text)
      };

      if (editId) {
        res = await odooService.updateCRMLead(editId, payloadToSend);
      } else {
        res = await odooService.createCRMLead(payloadToSend);
      }

      if (res && (res.success || res.id)) {
        setHasChanges(false);
        localStorage.removeItem('amy_crm_form_draft');
        const finalId = editId || res.id || (typeof res === 'number' ? res : res.data?.id);
        onNavigate('crm-detail', finalId);
      } else {
        alert(`${editId ? 'Update' : 'Creation'} failed`);
      }
    } catch {
      alert(`${editId ? 'Update' : 'Creation'} failed`);
    } finally {
      setSaving(false);
    }
  };

  const handleEditProfessional = async (id, isArchitect) => {
    setLoading(true);
    try {
      const res = await odooService.getPartnerDetail(id);
      if (res) {
        setModalState({
          show: true,
          editingId: id,
          newName: res.name || '',
          newPhone: res.phone || res.mobile || '',
          newEmail: res.email || '',
          newAddress: res.street || '',
          newNote: res.comment || '',
          isArchitect: isArchitect,
          isElectrician: !isArchitect
        });
      }
    } catch (err) {
      alert("Failed to load professional details");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfessional = async () => {
    if (!modalState.newName) return alert("Professional Name is required");
    const payload = {
      name: modalState.newName,
      phone: modalState.newPhone,
      email: modalState.isArchitect ? modalState.newEmail : '',
      street: modalState.newAddress,
      comment: modalState.newNote,
      is_architect: modalState.isArchitect,
      is_electrician: modalState.isElectrician
    };

    try {
      let res;
      if (modalState.editingId) {
        res = await odooService.updatePartner(modalState.editingId, payload);
      } else {
        res = await odooService.createPartner(payload);
      }

      if (res) {
        const targetId = modalState.editingId || res.id || (typeof res === 'number' ? res : res.data?.id);
        const newItem = { value: targetId, label: modalState.newName, phone: modalState.newPhone };
        
        if (modalState.isArchitect) {
          setMasterData(prev => ({
            ...prev,
            architects: modalState.editingId 
              ? prev.architects.map(a => String(a.value) === String(targetId) ? newItem : a)
              : [newItem, ...prev.architects]
          }));
          setLead(prev => ({ ...prev, architect_id: targetId }));
        } else {
          setMasterData(prev => ({
            ...prev,
            electricians: modalState.editingId
              ? prev.electricians.map(e => String(e.value) === String(targetId) ? newItem : e)
              : [newItem, ...prev.electricians]
          }));
          setLead(prev => ({ ...prev, electrician_id: targetId }));
        }
        setModalState({ ...modalState, show: false, editingId: null, newName: '', newPhone: '', newEmail: '', newAddress: '', newNote: '' });
      }
    } catch (err) {
      alert(`Failed to ${modalState.editingId ? 'update' : 'save'} professional`);
    }
  };

  const userOptions = useMemo(() => {
    return (masterData.users || []).map(u => ({ value: u.id, label: u.name }));
  }, [masterData.users]);

  if (loading) return <div className="p-8 text-center text-slate-500">Loading lead details...</div>;

  const handleAddGeneralNote = () => {
    if (!generalNoteInput.trim()) return;
    const newNote = {
      id: Date.now(),
      text: generalNoteInput,
      date: new Date().toLocaleString(),
      by: masterData.users.find(u => String(u.value) === String(lead.user_id))?.label || 'Self'
    };
    setGeneralNotes(prev => [newNote, ...prev]);
    setGeneralNoteInput('');
  };

  const handleDeleteNote = (id) => {
    setGeneralNotes(prev => prev.filter(n => n.id !== id));
  };

  return (
    <div className="co-container">
      <div className="co-header">
        <div className="co-header-left">
          <button className="co-back-btn" onClick={() => onNavigate(returnRoute)}>
            <X size={20} />
          </button>
          <div className="co-header-title">
            <h1>{editId ? 'Edit CRM Lead' : 'Create New Lead'}</h1>
            <p>Fill in opportunity details</p>
          </div>
        </div>
        <div className="co-header-right">
          <button 
            className={`co-save-btn ${!canSubmit ? 'disabled' : ''}`} 
            onClick={handleSubmit}
            disabled={!canSubmit || saving}
          >
            {saving ? 'Saving...' : (editId ? 'Update Lead' : 'Create Lead')}
          </button>
        </div>
      </div>

      <div className="co-form-grid">
        {/* Left Span: Essential Details (Opportunity Info) */}
        <div className="co-form-main">
          <section className="co-form-section">
            <div className="co-section-header">
              <Target size={18} />
              <h2>Opportunity Details</h2>
            </div>
            <div className="co-input-stack">
              <div className="co-input-group">
                <label>Opportunity Name (Optional)</label>
                <input 
                  type="text" 
                  className="co-input-v2"
                  placeholder="e.g. Living room lighting renovation"
                  value={lead.name}
                  onChange={e => { setLead({...lead, name: e.target.value}); setHasChanges(true); }}
                />
              </div>

              <div className="co-input-group">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <label style={{ fontWeight: 700, color: '#64748b', fontSize: '0.85rem' }}>Customer</label>
                  <button 
                    type="button"
                    className="selection-add-new" 
                    style={{ padding: 0 }}
                    onClick={() => onNavigate('create-customer', null, { 
                      returnRoute: 'create-crm',
                      formState: lead // Preserve existing form work
                    })}
                  >
                    <Plus size={14} /> Add New
                  </button>
                </div>
                
                {lead.partner_id ? (
                  <div style={{ 
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: '12px',
                    padding: '12px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: '14px', color: '#0f172a' }}>
                        {masterData.partners.find(p => p.value === lead.partner_id)?.label || 'Selected Customer'}
                      </div>
                      <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Phone size={12} />
                        {masterData.partners.find(p => p.value === lead.partner_id)?.phone || 'No Phone Number'}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <button 
                        type="button"
                        onClick={() => onNavigate('create-customer', lead.partner_id, { returnRoute: 'create-crm' })}
                        style={{ border: 'none', background: '#f1f5f9', color: '#3b82f6', padding: '6px 10px', borderRadius: '8px', cursor: 'pointer', fontSize: '11px', fontWeight: 700 }}
                      >
                        Edit
                      </button>
                      <button 
                        type="button"
                        onClick={() => setLead({...lead, partner_id: ''})}
                        style={{ border: 'none', background: '#f1f5f9', color: '#64748b', padding: '6px', borderRadius: '8px', cursor: 'pointer' }}
                      >
                        <X size={14} />
                      </button>
                    </div>
                  </div>
                ) : (
                  <SearchableSelect 
                    options={masterData.partners}
                    value={lead.partner_id}
                    onChange={handlePartnerChange}
                    placeholder="Link to customer record..."
                  />
                )}
              </div>

              <div className="co-grid-2">
                <div className="co-input-group">
                  <label>Probability (%)</label>
                  <div className="co-input-icon-wrapper">
                    <Activity size={14} />
                    <input 
                      type="number" 
                      className="co-input-v2 with-icon"
                      value={lead.probability}
                      onChange={e => { setLead({...lead, probability: e.target.value}); setHasChanges(true); }}
                    />
                  </div>
                </div>
                <div className="co-input-group">
                  <label>Stage</label>
                  <select 
                    className="co-select-v2"
                    value={lead.stage_id}
                    onChange={e => { setLead({...lead, stage_id: e.target.value}); setHasChanges(true); }}
                  >
                    <option value="">Select Stage</option>
                    {masterData.stages.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="co-grid-2">
                <div className="co-input-group">
                  <label>Priority</label>
                  <select 
                    className="co-select-v2"
                    value={lead.priority}
                    onChange={e => { setLead({...lead, priority: e.target.value}); setHasChanges(true); }}
                  >
                    <option value="0">Low</option>
                    <option value="1">Medium</option>
                    <option value="2">High</option>
                    <option value="3">Very High</option>
                  </select>
                </div>
                <div className="co-input-group">
                  <label>Salesperson</label>
                  <SearchableSelect 
                    options={masterData.users}
                    value={lead.user_id}
                    onChange={id => { setLead({...lead, user_id: id}); setHasChanges(true); }}
                    placeholder="Assign to..."
                  />
                </div>
              </div>
            </div>
          </section>

          <div style={{ marginBottom: '1.5rem', marginTop: '1.5rem' }}>
            {/* TASKS SECTION - Full Width, matches CreateOrder */}
            <div className="co-expandable-card activity-schedule-card">
              <div className="co-expand-header" onClick={() => setShowActivitySection(!showActivitySection)}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div className="co-card-icon-pill" style={{ backgroundColor: '#f0f9ff', color: '#0ea5e9' }}>
                    <Activity size={18} />
                  </div>
                  <div className="co-card-title-stack" style={{ height: '18px', display: 'flex', alignItems: 'center' }}>
                    <h2 style={{ fontSize: '0.9rem', fontWeight: 800, textTransform: 'uppercase', color: '#334155' }}>Tasks</h2>
                  </div>
                </div>
                <div className={`co-chevron ${showActivitySection ? 'open' : ''}`}>
                  <ChevronRight size={18} />
                </div>
              </div>

              {showActivitySection && (
                <div className="co-card-body" style={{ padding: '0.5rem 1rem' }}>
                  {scheduledActivities.length > 0 && (
                    <div className="planned-activities" style={{ marginTop: '0.4rem', borderTop: '1px solid #f1f5f9', paddingTop: '0.4rem' }}>
                      <h3 style={{ fontSize: '12px', fontWeight: 800, color: '#1e293b', marginBottom: '0.4rem' }}>Planned Activities</h3>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '300px', overflowY: 'auto', paddingRight: '4px', borderBottom: '8px solid transparent' }}>
                        {scheduledActivities.map(act => {
                          const typeName = masterData.activity_types?.find(t => t.id === act.activity_type_id)?.name || 'Activity';
                          const userName = masterData.users?.find(u => u.id === parseInt(act.user_id))?.name || 'Self';
                          return (
                            <div key={act.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0', flexShrink: 0 }}>
                              <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                                <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #e2e8f0', marginTop: '2px' }}>
                                  <Activity size={16} style={{ color: '#3b82f6' }} />
                                </div>
                                <div>
                                  {editingTaskId === act.id ? (
                                    <div style={{ background: '#fff', padding: '12px', borderRadius: '8px', border: '1px solid #3b82f6', marginTop: '4px' }}>
                                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '8px' }}>
                                        <input 
                                          type="date" 
                                          className="co-input-v2"
                                          value={taskEditText.date_deadline}
                                          onChange={e => setTaskEditText({...taskEditText, date_deadline: e.target.value})}
                                          style={{ height: '32px', fontSize: '12px', padding: '0 8px', borderRadius: '6px', border: '1px solid #e2e8f0' }}
                                        />
                                        <SearchableSelect
                                          placeholder="Assignee"
                                          value={taskEditText.user_id}
                                          small
                                          options={userOptions}
                                          onChange={val => setTaskEditText({...taskEditText, user_id: val})}
                                        />
                                      </div>
                                      <textarea 
                                        className="co-textarea-v2"
                                        value={taskEditText.note}
                                        onChange={e => setTaskEditText({...taskEditText, note: e.target.value})}
                                        placeholder="Message..."
                                        style={{ minHeight: '60px', fontSize: '12px', padding: '8px', width: '100%', marginBottom: '8px', borderRadius: '8px', border: '1px solid #e2e8f0', background: '#f8fafc' }}
                                      />
                                      <div style={{ display: 'flex', gap: '12px' }}>
                                        <button onClick={() => { setScheduledActivities(prev => prev.map(a => a.id === act.id ? { ...taskEditText } : a)); setEditingTaskId(null); }} style={{ color: '#3b82f6', fontWeight: 800, fontSize: '12px', background: 'none', border: 'none', cursor: 'pointer' }}>Save</button>
                                        <button onClick={() => setEditingTaskId(null)} style={{ color: '#64748b', fontWeight: 600, fontSize: '12px', background: 'none', border: 'none', cursor: 'pointer' }}>Cancel</button>
                                      </div>
                                    </div>
                                  ) : (
                                    <>
                                      <div style={{ fontSize: '14px', fontWeight: 700, color: '#1e293b' }}>{act.summary || typeName}</div>
                                      {act.note && (
                                        <div style={{ fontSize: '13px', color: '#475569', margin: '4px 0 6px', lineHeight: '1.4' }}>{(act.note || '').replace(/<[^>]*>?/gm, '').trim()}</div>
                                      )}
                                      <div style={{ fontSize: '11px', color: '#64748b', display: 'flex', gap: '8px' }}>
                                        <span>📅 {act.date_deadline}</span>
                                        <span>👤 {userName}</span>
                                      </div>
                                    </>
                                  )}
                                </div>
                              </div>
                              <div style={{ display: 'flex', gap: '8px' }}>
                                <button onClick={e => { e.stopPropagation(); setEditingTaskId(act.id); setTaskEditText({ ...act, note: (act.note || '').replace(/<[^>]*>?/gm, '').trim() }); }} style={{ border: 'none', background: 'none', color: '#94a3b8', cursor: 'pointer' }} title="Edit">
                                  <Edit2 size={15} />
                                </button>
                                <button onClick={e => { e.stopPropagation(); setScheduledActivities(prev => prev.filter(a => a.id !== act.id)); }} style={{ border: 'none', background: 'none', color: '#94a3b8', cursor: 'pointer' }} title="Delete">
                                  <Trash size={16} />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #f1f5f9' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '10px' }}>
                        <input type="date" className="co-input-border" value={newActivity.date_deadline} onChange={e => setNewActivity(prev => ({ ...prev, date_deadline: e.target.value }))} style={{ width: '100%', height: '36px', padding: '0 8px', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '13px' }} />
                        <SearchableSelect placeholder="Assignee" value={newActivity.user_id} small options={userOptions} onChange={val => setNewActivity(prev => ({ ...prev, user_id: val }))} />
                    </div>
                    <textarea className="co-textarea" value={newActivity.note} onChange={e => setNewActivity(prev => ({ ...prev, note: e.target.value }))} placeholder="Message..." style={{ width: '100%', minHeight: '80px', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0', backgroundColor: '#f8fafc', fontSize: '13px', lineHeight: '1.5' }} />
                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                      <button onClick={() => {
                        let typeId = newActivity.activity_type_id;
                        if (!typeId && masterData.activity_types) {
                          const todoType = masterData.activity_types.find(t => t.name.toLowerCase().includes('todo') || t.name.toLowerCase().includes('to do')) || masterData.activity_types[0];
                          typeId = todoType?.id;
                        }
                        if (!typeId) return alert('No activity type found');
                        setScheduledActivities(prev => [...prev, { ...newActivity, activity_type_id: typeId, id: Date.now() }]);
                        setNewActivity({ activity_type_id: '', summary: 'To Do', note: '', user_id: '', date_deadline: new Date().toISOString().split('T')[0] });
                      }} style={{ background: '#0ea5e9', color: '#fff', border: 'none', borderRadius: '10px', height: '38px', padding: '0 20px', fontWeight: 800, fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 2px 4px rgba(14,165,233,0.2)' }}>
                        <Zap size={16} fill="white" />
                        Add Activity
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Span: Other Details (Professionals & Address) */}
        <div className="co-form-side">
          <section className="co-form-section">
            <div className="co-section-header">
              <MapPin size={18} />
              <h2>Site Address</h2>
            </div>
            <div className="co-input-stack">
              <div className="address-flex-row" style={{ display: 'flex', gap: '12px', marginBottom: '8px' }}>
                <div style={{ flex: '0 0 100px' }}>
                  <input 
                    className="co-input-v2" 
                    placeholder="H.No." 
                    value={lead.houseNo} 
                    onChange={(e) => { setLead({...lead, houseNo: e.target.value}); setHasChanges(true); }} 
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <input 
                    className="co-input-v2" 
                    placeholder="Building/Society Name" 
                    value={lead.buildingName} 
                    onChange={(e) => { setLead({...lead, buildingName: e.target.value}); setHasChanges(true); }} 
                  />
                </div>
              </div>
              
              <input 
                className="co-input-v2" 
                placeholder="Area" 
                value={lead.area} 
                onChange={(e) => { setLead({...lead, area: e.target.value}); setHasChanges(true); }} 
              />
  
              <div className="co-grid-2">
                <input 
                  className="co-input-v2" 
                  placeholder="Pincode" 
                  value={lead.zip} 
                  onChange={(e) => { setLead({...lead, zip: e.target.value}); setHasChanges(true); }} 
                />
                <input 
                  className="co-input-v2" 
                  placeholder="City" 
                  value={lead.city} 
                  onChange={(e) => { setLead({...lead, city: e.target.value}); setHasChanges(true); }} 
                />
              </div>
              
              <input 
                className="co-input-v2" 
                placeholder="State" 
                value={lead.state_name} 
                onChange={(e) => { setLead({...lead, state_name: e.target.value}); setHasChanges(true); }} 
              />
            </div>
          </section>

          <section className="co-form-section">
            <div className="co-section-header">
              <Star size={18} />
              <h2>Professionals</h2>
            </div>
            <div className="co-input-stack">
              {/* Architect selection */}
              <div style={{ marginBottom: '4px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <label style={{ fontWeight: 700, color: '#64748b', fontSize: '0.85rem' }}>Architect</label>
                  <button type="button" className="selection-add-new" style={{ padding: 0 }} onClick={() => setModalState({ ...modalState, show: true, isArchitect: true, isElectrician: false })}>
                    <Plus size={14} /> Add New
                  </button>
                </div>
                {lead.architect_id ? (
                  <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: '14px', color: '#0f172a' }}>{masterData.architects.find(a => String(a.value) === String(lead.architect_id))?.label || 'Selected Architect'}</div>
                      <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}><Phone size={12} />{masterData.architects.find(a => String(a.value) === String(lead.architect_id))?.phone || 'No Phone'}</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <button type="button" onClick={() => handleEditProfessional(lead.architect_id, true)} style={{ border: 'none', background: '#f1f5f9', color: '#3b82f6', padding: '6px 10px', borderRadius: '8px', cursor: 'pointer', fontSize: '11px', fontWeight: 700 }}>Edit</button>
                      <button type="button" onClick={() => setLead({...lead, architect_id: ''})} style={{ border: 'none', background: '#f1f5f9', color: '#64748b', padding: '6px', borderRadius: '8px', cursor: 'pointer' }}><X size={14} /></button>
                    </div>
                  </div>
                ) : (
                  <SearchableSelect options={masterData.architects} value={lead.architect_id} onChange={id => { setLead({...lead, architect_id: id}); setHasChanges(true); }} placeholder="Search or select architect..." className="clean-select" />
                )}
              </div>

              {/* Electrician selection */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <label style={{ fontWeight: 700, color: '#64748b', fontSize: '0.85rem' }}>Electrician</label>
                  <button type="button" className="selection-add-new" style={{ padding: 0 }} onClick={() => setModalState({ ...modalState, show: true, isArchitect: false, isElectrician: true })}>
                    <Plus size={14} /> Add New
                  </button>
                </div>
                {lead.electrician_id ? (
                  <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: '14px', color: '#0f172a' }}>{masterData.electricians.find(e => String(e.value) === String(lead.electrician_id))?.label || 'Selected Electrician'}</div>
                      <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}><Phone size={12} />{masterData.electricians.find(e => String(e.value) === String(lead.electrician_id))?.phone || 'No Phone'}</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <button type="button" onClick={() => handleEditProfessional(lead.electrician_id, false)} style={{ border: 'none', background: '#f1f5f9', color: '#3b82f6', padding: '6px 10px', borderRadius: '8px', cursor: 'pointer', fontSize: '11px', fontWeight: 700 }}>Edit</button>
                      <button type="button" onClick={() => setLead({...lead, electrician_id: ''})} style={{ border: 'none', background: '#f1f5f9', color: '#64748b', padding: '6px', borderRadius: '8px', cursor: 'pointer' }}><X size={14} /></button>
                    </div>
                  </div>
                ) : (
                  <SearchableSelect options={masterData.electricians} value={lead.electrician_id} onChange={id => { setLead({...lead, electrician_id: id}); setHasChanges(true); }} placeholder="Search or select electrician..." className="clean-select" />
                )}
              </div>

            </div>
          </section>

          {/* NOTES SECTION - Moved here, matches CreateOrder */}
          <div className="co-expandable-card main-notes-card" style={{ marginBottom: '1.5rem', marginTop: '1.5rem' }}>
            <div className="co-expand-header" onClick={() => setShowRemarksSection(!showRemarksSection)}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div className="co-card-icon-pill" style={{ backgroundColor: '#f0fdf4', color: '#16a34a' }}>
                  <MessageSquare size={18} />
                </div>
                <div className="co-card-title-stack" style={{ height: '18px', display: 'flex', alignItems: 'center' }}>
                  <h2 style={{ fontSize: '0.9rem', fontWeight: 800, textTransform: 'uppercase', color: '#334155' }}>Notes</h2>
                </div>
              </div>
              <div className={`co-chevron ${showRemarksSection ? 'open' : ''}`}>
                <ChevronRight size={18} />
              </div>
            </div>

            {showRemarksSection && (
              <div className="co-card-body">
                {/* Combined scrollable history */}
                <div className="gn-cards-container" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxHeight: '300px', overflowY: 'auto', paddingRight: '4px', borderBottom: '8px solid transparent', minHeight: '0' }}>
                  {/* New (unsaved) notes */}
                  {generalNotes.map(note => (
                    <div key={note.id} className="gn-note-card" style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1rem', flexShrink: 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                          <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 700, color: '#64748b', border: '1px solid #e2e8f0' }}>
                            {note.by.substring(0,2).toUpperCase()}
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span style={{ fontSize: '13px', fontWeight: 700, color: '#1e293b' }}>{note.by}</span>
                            <span style={{ fontSize: '11px', color: '#94a3b8' }}>{note.date}</span>
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                          <button onClick={() => { setEditingNoteId(note.id); setNoteEditText(note.text); }} style={{ border: 'none', background: 'none', cursor: 'pointer', padding: '4px', color: '#94a3b8' }} title="Edit Note">
                            <Edit2 size={13} />
                          </button>
                          <button onClick={() => handleDeleteNote(note.id)} style={{ border: 'none', background: 'none', cursor: 'pointer', padding: '4px', color: '#94a3b8' }} title="Delete Note">
                            <Trash size={14} />
                          </button>
                        </div>
                      </div>
                      <div>
                        {editingNoteId === note.id ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <textarea className="co-textarea" value={noteEditText} onChange={e => setNoteEditText(e.target.value)} style={{ width: '100%', minHeight: '80px', padding: '10px', borderRadius: '8px', border: '1px solid #3b82f6', fontSize: '14px' }} />
                            <div style={{ display: 'flex', gap: '12px' }}>
                              <button style={{ fontSize: '12px', fontWeight: 700, color: '#3b82f6', background: 'none', border: 'none', cursor: 'pointer' }} onClick={() => { setGeneralNotes(prev => prev.map(n => n.id === note.id ? { ...n, text: noteEditText } : n)); setEditingNoteId(null); }}>Save Changes</button>
                              <button style={{ fontSize: '12px', fontWeight: 600, color: '#64748b', background: 'none', border: 'none', cursor: 'pointer' }} onClick={() => setEditingNoteId(null)}>Cancel</button>
                            </div>
                          </div>
                        ) : (
                          <p style={{ fontSize: '14px', lineHeight: '1.5', color: '#334155', margin: 0, whiteSpace: 'pre-wrap' }}>{note.text}</p>
                        )}
                      </div>
                    </div>
                  ))}

                  {/* Existing remarks from DB */}
                  {(lead.remarks || []).map(r => (
                    <div key={r.id} className="gn-note-card" style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1rem', flexShrink: 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                          <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 700, color: '#64748b', border: '1px solid #e2e8f0' }}>
                            {(r.salesperson || 'U').substring(0,2).toUpperCase()}
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span style={{ fontSize: '13px', fontWeight: 700, color: '#1e293b' }}>{r.salesperson}</span>
                            <span style={{ fontSize: '11px', color: '#94a3b8' }}>{r.date}</span>
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                          <button onClick={() => handleEditRemark(r)} style={{ border: 'none', background: 'none', cursor: 'pointer', padding: '4px', color: '#94a3b8' }} title="Edit">
                            <Edit2 size={13} />
                          </button>
                          <button onClick={() => handleDeleteRemark(r.id)} style={{ border: 'none', background: 'none', cursor: 'pointer', padding: '4px', color: '#94a3b8' }} title="Delete">
                            <Trash size={14} />
                          </button>
                        </div>
                      </div>
                      <div>
                        {editingRemarkId === r.id ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <textarea className="co-textarea" value={editingRemarkText} onChange={e => setEditingRemarkText(e.target.value)} style={{ width: '100%', minHeight: '80px', padding: '10px', borderRadius: '8px', border: '1px solid #3b82f6', fontSize: '14px' }} />
                            <div style={{ display: 'flex', gap: '12px' }}>
                              <button style={{ fontSize: '12px', fontWeight: 700, color: '#3b82f6', background: 'none', border: 'none', cursor: 'pointer' }} onClick={() => handleUpdateRemark(r.id)}>Save Changes</button>
                              <button style={{ fontSize: '12px', fontWeight: 600, color: '#64748b', background: 'none', border: 'none', cursor: 'pointer' }} onClick={() => setEditingRemarkId(null)}>Cancel</button>
                            </div>
                          </div>
                        ) : (
                          <p style={{ fontSize: '14px', lineHeight: '1.5', color: '#334155', margin: 0, whiteSpace: 'pre-wrap' }}>{r.remark}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Add note input */}
                <div className="gn-input-card" style={{ marginTop: '1.25rem', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '1rem', display: 'flex', gap: '12px', alignItems: 'flex-end' }}>
                  <textarea placeholder="Add Note (Use Shift+Enter for new lines)" value={generalNoteInput} onChange={e => setGeneralNoteInput(e.target.value)} style={{ border: '1px solid #e2e8f0', padding: '12px', borderRadius: '10px', flex: 1, minHeight: '48px', maxHeight: '150px', fontSize: '14px', lineHeight: '1.5', resize: 'none', backgroundColor: '#fff', outline: 'none' }} />
                  <button onClick={handleAddGeneralNote} style={{ width: '42px', height: '42px', backgroundColor: '#3b82f6', color: '#fff', border: 'none', borderRadius: '10px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 4px rgba(59,130,246,0.2)', flexShrink: 0 }}>
                    <Zap size={20} fill="white" />
                  </button>
                </div>
              </div>
            )}
          </div>

        </div>
      </div>

      {/* Quick Add Professional Modal */}
      {modalState.show && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.4)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '1rem',
          backdropFilter: 'blur(4px)'
        }}>
          <div className="modal-content" style={{
            backgroundColor: '#fff',
            padding: '24px',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '440px',
            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#1e293b' }}>
                {modalState.editingId ? 'Edit' : 'Add'} {modalState.isArchitect ? 'Architect' : 'Electrician'}
              </h3>
              <button 
                type="button"
                onClick={() => setModalState({ ...modalState, show: false })} 
                style={{ border: 'none', background: 'none', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>
            
            <div style={{ marginBottom: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '12px', fontWeight: 700, color: '#64748b' }}>Name *</label>
                <input 
                  className="co-input-v2" 
                  value={modalState.newName} 
                  onChange={(e) => setModalState({ ...modalState, newName: e.target.value })} 
                  placeholder="Enter Name" 
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '12px', fontWeight: 700, color: '#64748b' }}>Phone</label>
                <input 
                  className="co-input-v2" 
                  value={modalState.newPhone} 
                  onChange={(e) => setModalState({ ...modalState, newPhone: e.target.value })} 
                  placeholder="Enter Number" 
                />
              </div>
              {modalState.isArchitect && (
                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '12px', fontWeight: 700, color: '#64748b' }}>Email</label>
                  <input 
                    className="co-input-v2" 
                    value={modalState.newEmail} 
                    onChange={(e) => setModalState({ ...modalState, newEmail: e.target.value })} 
                    placeholder="Enter Email" 
                  />
                </div>
              )}
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '12px', fontWeight: 700, color: '#64748b' }}>Address</label>
                <input 
                  className="co-input-v2" 
                  value={modalState.newAddress} 
                  onChange={(e) => setModalState({ ...modalState, newAddress: e.target.value })} 
                  placeholder="Enter Address" 
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '12px', fontWeight: 700, color: '#64748b' }}>Note</label>
                <textarea 
                  className="co-textarea-v2" 
                  style={{ minHeight: '80px' }}
                  value={modalState.newNote} 
                  onChange={(e) => setModalState({ ...modalState, newNote: e.target.value })} 
                  placeholder="Add a remark..." 
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button 
                type="button"
                className="co-save-btn" 
                style={{ flex: 1 }}
                onClick={handleSaveProfessional}
              >
                {modalState.editingId ? 'Update' : 'Save'} {modalState.isArchitect ? 'Architect' : 'Electrician'}
              </button>
              <button 
                type="button"
                className="co-back-btn" 
                style={{ flex: 1, padding: '10px' }}
                onClick={() => setModalState({ ...modalState, show: false })}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CreateCRM;
