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

  const fetchMasterData = async () => {
    try {
      const res = await odooService.getMasterData();
      if (res && res.partners) {
        setMasterData({
          partners: res.partners,
          architects: res.partners.filter(p => p.is_architect),
          electricians: res.partners.filter(p => p.is_electrician),
        });
      }
    } catch (err) {
      console.error("Master data fetch failed", err);
    }
  };

  useEffect(() => {
    fetchMasterData();
  }, []);

  useEffect(() => {
    const handleBeforeUnload = (e) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

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

  return (
    <div className="form-page">
      <div className="form-card">
        <div className="form-header">
          <div>
            <h2>Create Customer</h2>
            <p className="form-subtitle">Add customer details and return to quotation.</p>
          </div>
          <button className="btn-ui secondary" onClick={() => onNavigate('create-order')} aria-label="Back to quotation">
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
              <label>Electrician</label>
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
              <button className="selection-add-new">
                <Plus size={14} /> Add New
              </button>
            </div>

            {/* Architect Selection */}
            <div className="selection-item">
              <label>Architect</label>
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
              <button className="selection-add-new">
                <Plus size={14} /> Add New
              </button>
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
          <button className="btn-ui secondary lg" onClick={() => onNavigate('create-order')}>
            Back
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreateCustomer;

