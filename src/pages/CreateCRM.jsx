import React, { useMemo, useState, useEffect } from 'react';
import { X, Plus, Phone, User, MapPin, Activity, DollarSign, Target, Star, FileText } from 'lucide-react';
import { odooService } from '../services/odoo';
import SearchableSelect from '../components/SearchableSelect';
import './FormPages.css';

const CreateCRM = ({ editId, onNavigate, extraData }) => {
  const returnRoute = extraData?.returnRoute || 'crm';
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [masterData, setMasterData] = useState({ architects: [], electricians: [], users: [], stages: [], partners: [] });
  const [modalState, setModalState] = useState({ show: false, newName: '', newPhone: '', newEmail: '', newAddress: '', newNote: '', isArchitect: false, isElectrician: false });
  
  const [lead, setLead] = useState({
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
    state_name: ''
  });

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
            bName = parts[0];
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
        users: (masterRes?.users || []).map(u => ({ value: u.id, label: u.name })),
        partners: (masterRes?.partners || []).map(p => ({ value: p.id, label: p.name, phone: p.phone || p.mobile || '' })),
        stages: stagesRes || []
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

        setLead(prev => ({
          ...prev,
          partner_id: partnerId,
          architect_id: extractId(res.architect_id),
          electrician_id: extractId(res.electrician_id),
          houseNo: res.street?.split(',')[0]?.trim() || '',
          buildingName: res.street?.split(',')[1]?.trim() || '',
          area: res.street2 || (res.street?.split(',')[2]?.trim() || ''),
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
      handlePartnerChange(extraData.preFilledPartnerId);
    }
  }, [extraData]);

  const canSubmit = useMemo(() => lead.name.trim().length > 0, [lead.name]);

  const handleSubmit = async () => {
    if (!canSubmit || saving) return;
    setSaving(true);
    try {
      let res;
      let finalStreet = [lead.houseNo, lead.buildingName, lead.area].filter(Boolean).join(', ');
      const payloadToSend = { ...lead, street: finalStreet };

      if (editId) {
        res = await odooService.updateCRMLead(editId, payloadToSend);
      } else {
        res = await odooService.createCRMLead(payloadToSend);
      }

      if (res && (res.success || res.id)) {
        setHasChanges(false);
        onNavigate(returnRoute);
      } else {
        alert(`${editId ? 'Update' : 'Creation'} failed`);
      }
    } catch {
      alert(`${editId ? 'Update' : 'Creation'} failed`);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveProfessional = async () => {
    if (!modalState.newName) return alert("Professional Name is required");
    try {
      const res = await odooService.createPartner({
        name: modalState.newName,
        phone: modalState.newPhone,
        email: modalState.isArchitect ? modalState.newEmail : '',
        street: modalState.newAddress,
        comment: modalState.newNote,
        is_architect: modalState.isArchitect,
        is_electrician: modalState.isElectrician
      });
      if (res) {
        const newId = res.id || (typeof res === 'number' ? res : res.data?.id);
        const newItem = { value: newId, label: modalState.newName, phone: modalState.newPhone };
        
        if (modalState.isArchitect) {
          setMasterData(prev => ({ ...prev, architects: [newItem, ...prev.architects] }));
          setLead(prev => ({ ...prev, architect_id: newId }));
        } else {
          setMasterData(prev => ({ ...prev, electricians: [newItem, ...prev.electricians] }));
          setLead(prev => ({ ...prev, electrician_id: newId }));
        }
        setModalState({ ...modalState, show: false, newName: '', newPhone: '', newEmail: '', newAddress: '', newNote: '' });
      }
    } catch (err) {
      alert("Failed to save professional");
    }
  };

  if (loading) return <div className="p-8 text-center text-slate-500">Loading lead details...</div>;

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
                <label>Opportunity Name</label>
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
                    onClick={() => onNavigate('create-customer', null, { returnRoute: 'create-crm' })}
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
                    <button 
                      type="button"
                      onClick={() => setLead({...lead, partner_id: ''})}
                      style={{ border: 'none', background: '#f1f5f9', color: '#64748b', padding: '6px', borderRadius: '8px', cursor: 'pointer' }}
                    >
                      <X size={14} />
                    </button>
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
                  <label>Expected Revenue</label>
                  <div className="co-input-icon-wrapper">
                    <DollarSign size={14} />
                    <input 
                      type="number" 
                      className="co-input-v2 with-icon"
                      value={lead.expected_revenue}
                      onChange={e => { setLead({...lead, expected_revenue: e.target.value}); setHasChanges(true); }}
                    />
                  </div>
                </div>
              </div>

              <div className="co-grid-2">
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
                <div className="co-input-group">
                  <label>Expected Closing</label>
                  <input 
                    type="date" 
                    className="co-input-v2"
                    value={lead.date_deadline}
                    onChange={e => { setLead({...lead, date_deadline: e.target.value}); setHasChanges(true); }}
                  />
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

              <div className="co-input-group">
                <label>Notes / Description</label>
                <textarea 
                  className="co-textarea-v2"
                  placeholder="Detail about the requirement..."
                  value={lead.description}
                  onChange={e => { setLead({...lead, description: e.target.value}); setHasChanges(true); }}
                />
              </div>
            </div>
          </section>

          <section className="co-form-section">
            <div className="co-section-header">
              <User size={18} />
              <h2>Contact Person</h2>
            </div>
            <div className="co-input-stack">
              <div className="co-input-group">
                <label>Contact Name</label>
                <input 
                  type="text" 
                  className="co-input-v2"
                  placeholder="Person Name"
                  value={lead.contact_name}
                  onChange={e => { setLead({...lead, contact_name: e.target.value}); setHasChanges(true); }}
                />
              </div>
              <div className="co-grid-2">
                <div className="co-input-group">
                  <label>Mobile</label>
                  <div className="co-input-icon-wrapper">
                    <Phone size={14} />
                    <input 
                      type="text" 
                      className="co-input-v2 with-icon"
                      placeholder="9XXXX XXXXX"
                      value={lead.mobile}
                      onChange={e => { setLead({...lead, mobile: e.target.value}); setHasChanges(true); }}
                    />
                  </div>
                </div>
                <div className="co-input-group">
                  <label>Email</label>
                  <input 
                    type="email" 
                    className="co-input-v2"
                    placeholder="email@example.com"
                    value={lead.email}
                    onChange={e => { setLead({...lead, email: e.target.value}); setHasChanges(true); }}
                  />
                </div>
              </div>
            </div>
          </section>
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
                  <button 
                    type="button"
                    className="selection-add-new" 
                    style={{ padding: 0 }}
                    onClick={() => setModalState({ ...modalState, show: true, isArchitect: true, isElectrician: false })}
                  >
                    <Plus size={14} /> Add New
                  </button>
                </div>
                {lead.architect_id ? (
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
                        {masterData.architects.find(a => String(a.value) === String(lead.architect_id))?.label || 'Selected Architect'}
                      </div>
                      <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Phone size={12} />
                        {masterData.architects.find(a => String(a.value) === String(lead.architect_id))?.phone || 'No Phone Number'}
                      </div>
                    </div>
                    <button 
                      type="button"
                      onClick={() => setLead({...lead, architect_id: ''})}
                      style={{ border: 'none', background: '#f1f5f9', color: '#64748b', padding: '6px', borderRadius: '8px', cursor: 'pointer' }}
                    >
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <SearchableSelect 
                    options={masterData.architects}
                    value={lead.architect_id}
                    onChange={id => { setLead({...lead, architect_id: id}); setHasChanges(true); }}
                    placeholder="Search or select architect..."
                    className="clean-select"
                  />
                )}
              </div>

              {/* Electrician selection */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <label style={{ fontWeight: 700, color: '#64748b', fontSize: '0.85rem' }}>Electrician</label>
                  <button 
                    type="button"
                    className="selection-add-new" 
                    style={{ padding: 0 }}
                    onClick={() => setModalState({ ...modalState, show: true, isArchitect: false, isElectrician: true })}
                  >
                    <Plus size={14} /> Add New
                  </button>
                </div>
                
                {lead.electrician_id ? (
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
                        {masterData.electricians.find(e => String(e.value) === String(lead.electrician_id))?.label || 'Selected Electrician'}
                      </div>
                      <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Phone size={12} />
                        {masterData.electricians.find(e => String(e.value) === String(lead.electrician_id))?.phone || 'No Phone Number'}
                      </div>
                    </div>
                    <button 
                      type="button"
                      onClick={() => setLead({...lead, electrician_id: ''})}
                      style={{ border: 'none', background: '#f1f5f9', color: '#64748b', padding: '6px', borderRadius: '8px', cursor: 'pointer' }}
                    >
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <SearchableSelect 
                    options={masterData.electricians}
                    value={lead.electrician_id}
                    onChange={id => { setLead({...lead, electrician_id: id}); setHasChanges(true); }}
                    placeholder="Search or select electrician..."
                    className="clean-select"
                  />
                )}
              </div>
            </div>
          </section>
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
                Add {modalState.isArchitect ? 'Architect' : 'Electrician'}
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
                Save {modalState.isArchitect ? 'Architect' : 'Electrician'}
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
