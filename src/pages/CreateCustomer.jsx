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
    mobile: '',
    email: '',
    otherName: '',
    otherNumber: '',
    houseNo: '',
    buildingName: '',
    area: '',
    pincode: '',
    city: '',
    state: '',
    empAssigned: '',
    sourceType: '',
    source: '',
    competitor: '',
    budget: '',
  });

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
        // Consolidate House + Building into street
        street: [customer.houseNo, customer.buildingName].filter(Boolean).join(', '),
        street2: customer.area,
        city: customer.city,
        zip: customer.pincode,
        state_name: customer.state,
        country_name: customer.country || 'India',
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
      }
      onNavigate('create-order');
    } catch {
      alert('Customer creation failed');
    } finally {
      setSaving(false);
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
              <div className="selection-item-header">
                <label>Client</label>
              </div>
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

            {/* Others Block */}
            <div className="selection-item">
              <div className="selection-item-header">
                <label>Others</label>
              </div>
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

        {/* Side-by-Side Address and Other Details */}
        <div className="bottom-cards-layout">
          {/* Address Details (Matching Image Pattern) */}
          <div className="address-details-card">
            <div className="od-header">
              <MapPin size={18} />
              <h3>Address<span style={{color: 'red'}}>*</span></h3>
            </div>
            <div className="address-form-content">
              <div className="address-flex-row" style={{ display: 'flex', gap: '12px', marginBottom: '12px' }}>
                <div style={{ flex: '0 0 100px' }}>
                  <input 
                    className="clean-input w-full" 
                    placeholder="H.No." 
                    value={customer.houseNo} 
                    onChange={(e) => setCustomer({...customer, houseNo: e.target.value})} 
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <input 
                    className="clean-input w-full" 
                    placeholder="Building/Society Name" 
                    value={customer.buildingName} 
                    onChange={(e) => setCustomer({...customer, buildingName: e.target.value})} 
                  />
                </div>
              </div>
              
              <input 
                className="clean-input w-full mb-3" 
                placeholder="Area" 
                value={customer.area} 
                onChange={(e) => setCustomer({...customer, area: e.target.value})} 
              />
  
              <div className="address-grid-2 mb-3" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <input 
                  className="clean-input" 
                  placeholder="Pincode" 
                  value={customer.pincode} 
                  onChange={(e) => setCustomer({...customer, pincode: e.target.value})} 
                />
                <div className="custom-city-select-wrapper">
                   <input 
                    className="clean-input w-full" 
                    placeholder="City" 
                    value={customer.city} 
                    onChange={(e) => setCustomer({...customer, city: e.target.value})} 
                  />
                </div>
              </div>
              
              <input 
                className="clean-input w-full" 
                placeholder="State" 
                value={customer.state} 
                onChange={(e) => setCustomer({...customer, state: e.target.value})} 
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

    </div>
  );
};

export default CreateCustomer;

