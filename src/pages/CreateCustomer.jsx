import React, { useMemo, useState, useEffect } from 'react';
import { X, Plus, Phone, Users, MapPin, Activity } from 'lucide-react';
import { odooService } from '../services/odoo';
import SearchableSelect from '../components/SearchableSelect';
import './FormPages.css';

const CreateCustomer = ({ onNavigate }) => {
  const [saving, setSaving] = useState(false);
  const [masterData, setMasterData] = useState({ partners: [], architects: [], electricians: [] });
  const [customer, setCustomer] = useState({
    name: '',
    phone: '',
    email: '',
    electricianId: '',
    architectId: '',
    otherName: '',
    otherNumber: '',
    // Address details
    street: '',
    street2: '',
    city: '',
    zip: '',
    state: '',
    country: '',
    // Other details
    empAssigned: '',
    channelPartner: '',
    sourceType: '',
    source: '',
    competitor: '',
    budget: '',
  });

  const [modalState, setModalState] = useState({ 
    show: false, 
    selectedId: '', 
    isArchitect: false, 
    isElectrician: false 
  });
  const [savingFlags, setSavingFlags] = useState(false);

  const fetchMasterData = async () => {
    try {
      const res = await odooService.getMasterData();
      if (res) {
        setMasterData({
          partners: res.partners || [],
          architects: res.architects || (res.partners || []).filter(p => p.is_architect),
          electricians: res.electricians || (res.partners || []).filter(p => p.is_electrician),
        });
      }
    } catch (err) {
      console.error("Master data fetch failed", err);
    }
  };

  useEffect(() => {
    fetchMasterData();
  }, []);

  const [hasChanges, setHasChanges] = useState(false);
  
  useEffect(() => {
    const isDirty = customer.name !== '' || customer.mobile !== '' || customer.street !== '';
    setHasChanges(isDirty);
  }, [customer]);

  const safeNavigate = (to) => {
    if (hasChanges) {
      if (window.confirm("You have unsaved changes. Are you sure?")) {
        setHasChanges(false);
        onNavigate(to);
      }
    } else {
      onNavigate(to);
    }
  };

  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (hasChanges) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasChanges]);

  const canSubmit = useMemo(() => customer.name.trim().length > 0, [customer.name]);

  const handleSubmit = async () => {
    if (!canSubmit || saving) return;
    setSaving(true);
    try {
      const res = await odooService.createPartner({
        name: customer.name,
        phone: customer.mobile,
        comment: customer.billing_address,
        street: customer.street,
        street2: customer.street2,
        city: customer.city,
        zip: customer.zip,
        state_name: customer.state,
        country_name: customer.country,
        electrician_id: parseInt(customer.electricianId) || false,
        architect_id: parseInt(customer.architectId) || false,
        other_name: customer.otherName,
        other_number: customer.otherNumber,
        budget: customer.budget,
        competitor: customer.competitor,
        source_type: customer.sourceType,
        source_name: customer.source,
        emp_assigned: customer.empAssigned
      });

      if (!res) {
        alert('Customer creation failed');
        return;
      }

      alert('Customer created');
      onNavigate('create-order');
    } catch {
      alert('Customer creation failed');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateFlags = async () => {
    if (!modalState.selectedId || savingFlags) return;
    setSavingFlags(true);
    try {
      const res = await odooService.updatePartnerFlags(modalState.selectedId, {
        is_architect: modalState.isArchitect,
        is_electrician: modalState.isElectrician
      });
      if (res && res.id) {
        alert("Professional status updated!");
        setModalState({ ...modalState, show: false });
        fetchMasterData(); // Refresh dropdowns
      } else {
        alert("Failed to update status");
      }
    } catch (err) {
      console.error(err);
      alert("Error updating professional status");
    } finally {
      setSavingFlags(false);
    }
  };

  return (
    <div className="form-page">
      <div className="form-card">
        <div className="form-header">
          <div>
            <h2>Create Customer</h2>
            <p className="form-subtitle">Add customer details and return to quotation.</p>
          </div>
          <button className="btn-ui secondary" onClick={() => safeNavigate('create-order')} aria-label="Back to quotation">
            <X size={16} /> Close
          </button>
        </div>

        <div className="form-selection-layout">
          <div className="selection-group">
            {/* Client (New Customer Details) */}
            <div className="selection-item">
              <label>Client</label>
              <div className="selection-card-box">
                <div className="selection-card-content">
                  <div className="selection-card-top p-input-field">
                    <input 
                      className="clean-input" 
                      value={customer.name} 
                      onChange={(e) => setCustomer({ ...customer, name: e.target.value })} 
                      placeholder="Enter Party Name" 
                    />
                  </div>
                  <div className="selection-divider"></div>
                  <div className="selection-card-bottom">
                    <Phone size={14} className="text-slate-400" />
                    <input 
                      className="clean-input phone-input" 
                      value={customer.mobile} 
                      onChange={(e) => setCustomer({ ...customer, mobile: e.target.value })} 
                      placeholder="Enter Mobile Number" 
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Electrician Selection */}
            <div className="selection-item">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <label style={{ margin: 0 }}>Electrician</label>
                <button 
                  className="btn-ui secondary mini" 
                  style={{ padding: '2px 8px', fontSize: '11px', height: '22px' }}
                  onClick={() => setModalState({ show: true, selectedId: '', isArchitect: false, isElectrician: true })}
                >
                  <Plus size={10} style={{ marginRight: '4px' }} /> Add New
                </button>
              </div>
              <div className="selection-card-box">
                <div className="selection-card-content">
                  <div className="selection-card-top">
                    <SearchableSelect
                      placeholder="Select Electrician"
                      value={customer.electricianId}
                      onChange={(val) => setCustomer({ ...customer, electricianId: val })}
                      options={masterData.electricians.map((e) => ({ value: e.id, label: e.name || 'Unknown' }))}
                      className="clean-select"
                    />
                  </div>
                  <div className="selection-divider"></div>
                  <div className="selection-card-bottom">
                    <Phone size={14} className="text-slate-400" />
                    <span>{(masterData.electricians.find(e => e.id === parseInt(customer.electricianId)))?.phone || '-'}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Architect Selection */}
            <div className="selection-item">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <label style={{ margin: 0 }}>Architect</label>
                <button 
                  className="btn-ui secondary mini" 
                  style={{ padding: '2px 8px', fontSize: '11px', height: '22px' }}
                  onClick={() => setModalState({ show: true, selectedId: '', isArchitect: true, isElectrician: false })}
                >
                  <Plus size={10} style={{ marginRight: '4px' }} /> Add New
                </button>
              </div>
              <div className="selection-card-box">
                <div className="selection-card-content">
                  <div className="selection-card-top">
                    <SearchableSelect
                      placeholder="Select Architect"
                      value={customer.architectId}
                      onChange={(val) => setCustomer({ ...customer, architectId: val })}
                      options={masterData.architects.map((a) => ({ value: a.id, label: a.name || 'Unknown' }))}
                      className="clean-select"
                    />
                  </div>
                  <div className="selection-divider"></div>
                  <div className="selection-card-bottom">
                    <Phone size={14} className="text-slate-400" />
                    <span>{(masterData.architects.find(a => a.id === parseInt(customer.architectId)))?.phone || '-'}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Others Block */}
            <div className="selection-item">
              <label>Others</label>
              <div className="selection-card-box">
                <div className="selection-card-content">
                  <div className="selection-card-top p-input-field">
                    <input 
                      className="clean-input" 
                      value={customer.otherName} 
                      onChange={(e) => setCustomer({ ...customer, otherName: e.target.value })} 
                      placeholder="Enter Name" 
                    />
                  </div>
                  <div className="selection-divider"></div>
                  <div className="selection-card-bottom">
                    <Phone size={14} className="text-slate-400" />
                    <input 
                      className="clean-input phone-input" 
                      value={customer.otherNumber} 
                      onChange={(e) => setCustomer({ ...customer, otherNumber: e.target.value })} 
                      placeholder="Enter Number" 
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Address Details Card (Odoo Style) */}
        <div className="address-details-card">
          <div className="od-header">
            <MapPin size={18} />
            <h3>Address</h3>
          </div>
          <div className="address-form-content">
            <input 
              className="clean-input w-full mb-3" 
              placeholder="Street..." 
              value={customer.street} 
              onChange={(e) => setCustomer({...customer, street: e.target.value})} 
            />
            <input 
              className="clean-input w-full mb-3" 
              placeholder="Street 2..." 
              value={customer.street2} 
              onChange={(e) => setCustomer({...customer, street2: e.target.value})} 
            />
            <div className="address-grid-3 mb-3">
              <input 
                className="clean-input" 
                placeholder="City" 
                value={customer.city} 
                onChange={(e) => setCustomer({...customer, city: e.target.value})} 
              />
              <input 
                className="clean-input" 
                placeholder="ZIP" 
                value={customer.zip} 
                onChange={(e) => setCustomer({...customer, zip: e.target.value})} 
              />
              <input 
                className="clean-input" 
                placeholder="State" 
                value={customer.state} 
                onChange={(e) => setCustomer({...customer, state: e.target.value})} 
              />
            </div>
            <input 
              className="clean-input w-full" 
              placeholder="Country" 
              value={customer.country} 
              onChange={(e) => setCustomer({...customer, country: e.target.value})} 
            />
          </div>
        </div>

        {/* Other Details Card */}
        <div className="other-details-card">
          <div className="od-header">
            <Activity size={18} />
            <h3>Other Details</h3>
          </div>
          <div className="od-content">
            <div className="od-row">
              <span className="od-label">Emp assigned</span>
              <input 
                className="od-input" 
                value={customer.empAssigned} 
                onChange={(e) => setCustomer({ ...customer, empAssigned: e.target.value })} 
                placeholder="Name" 
              />
            </div>
            <div className="od-row">
              <span className="od-label">Channel Partner</span>
              <input 
                className="od-input" 
                value={customer.channelPartner}
                onChange={(e) => setCustomer({ ...customer, channelPartner: e.target.value })} 
                placeholder="Channel Partner" 
              />
            </div>
            <div className="od-row">
              <span className="od-label">Source Type</span>
              <input 
                className="od-input" 
                value={customer.sourceType} 
                onChange={(e) => setCustomer({ ...customer, sourceType: e.target.value })} 
                placeholder="Source Type" 
              />
            </div>
            <div className="od-row">
              <span className="od-label">Source</span>
              <input 
                className="od-input" 
                value={customer.source} 
                onChange={(e) => setCustomer({ ...customer, source: e.target.value })} 
                placeholder="Source" 
              />
            </div>
            <div className="od-row">
              <span className="od-label">Want to cover</span>
              <input 
                className="od-input" 
                placeholder="--" 
              />
            </div>
            <div className="od-row">
              <span className="od-label">Competitor</span>
              <input 
                className="od-input" 
                value={customer.competitor} 
                onChange={(e) => setCustomer({ ...customer, competitor: e.target.value })} 
                placeholder="--" 
              />
            </div>
            <div className="od-row">
              <span className="od-label">Budget</span>
              <input 
                className="od-input" 
                type="number"
                value={customer.budget} 
                onChange={(e) => setCustomer({ ...customer, budget: e.target.value })} 
                placeholder="0" 
              />
            </div>
          </div>
        </div>

        <div className="form-footer">
          <button className="btn-ui primary lg" onClick={handleSubmit} disabled={!canSubmit || saving}>
            {saving ? 'Submitting...' : 'Submit'}
          </button>
          <button className="btn-ui secondary lg" onClick={() => safeNavigate('create-order')}>
            Back
          </button>
        </div>
      </div>

      {modalState.show && (
        <div className="modal-overlay" style={{
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
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>Designate Professional</h3>
              <button onClick={() => setModalState({ ...modalState, show: false })} style={{ border: 'none', background: 'none', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>
            
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: 500, color: '#64748b' }}>Select Customer</label>
              <SearchableSelect 
                placeholder="Search existing customer..."
                value={modalState.selectedId}
                onChange={(val) => setModalState({ ...modalState, selectedId: val })}
                options={masterData.partners.map(p => ({ value: p.id, label: p.name || 'Unknown' }))}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '24px' }}>
              <label style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '8px', 
                padding: '12px', 
                border: '1px solid #e2e8f0', 
                borderRadius: '8px',
                cursor: 'pointer'
              }}>
                <input 
                  type="checkbox" 
                  checked={modalState.isElectrician} 
                  onChange={(e) => setModalState({ ...modalState, isElectrician: e.target.checked })}
                />
                <span style={{ fontSize: '14px' }}>Electrician</span>
              </label>
              <label style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '8px', 
                padding: '12px', 
                border: '1px solid #e2e8f0', 
                borderRadius: '8px',
                cursor: 'pointer'
              }}>
                <input 
                  type="checkbox" 
                  checked={modalState.isArchitect} 
                  onChange={(e) => setModalState({ ...modalState, isArchitect: e.target.checked })}
                />
                <span style={{ fontSize: '14px' }}>Architect</span>
              </label>
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button 
                className="btn-ui primary lg" 
                style={{ flex: 1 }}
                onClick={handleUpdateFlags}
                disabled={!modalState.selectedId || savingFlags}
              >
                {savingFlags ? 'Updating...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CreateCustomer;

