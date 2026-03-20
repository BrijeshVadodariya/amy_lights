import React, { useMemo, useState } from 'react';
import { X } from 'lucide-react';
import { odooService } from '../services/odoo';
import './FormPages.css';

/**
 * CreateCustomer page.
 * Full-page version of the "New Customer" form to keep UI consistent on mobile.
 */
const CreateCustomer = ({ onNavigate }) => {
  const [saving, setSaving] = useState(false);
  const [customer, setCustomer] = useState({
    name: '',
    billing_name: '',
    contact_person: '',
    mobile: '',
    billing_address: '',
    delivery_address: '',
    electrician: '',
    electrician_number: '',
    architect: '',
    architect_number: '',
    office_contact_person: '',
  });

  const canSubmit = useMemo(() => customer.name.trim().length > 0, [customer.name]);

  const handleSubmit = async () => {
    if (!canSubmit || saving) return;
    setSaving(true);
    try {
      // Mapping to Odoo fields (minimal mapping based on existing backend)
      const res = await odooService.createPartner({
        name: customer.name,
        phone: customer.mobile,
        email: '',
        comment: customer.billing_address,
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

        <div className="form-grid">
          <div className="form-group">
            <label>Party Name *</label>
            <input className="form-control" value={customer.name} onChange={(e) => setCustomer({ ...customer, name: e.target.value })} placeholder="Please enter party name" />
          </div>
          <div className="form-group">
            <label>Billing Name</label>
            <input className="form-control" value={customer.billing_name} onChange={(e) => setCustomer({ ...customer, billing_name: e.target.value })} placeholder="Please enter billing name" />
          </div>
          <div className="form-group">
            <label>Contact Person</label>
            <input className="form-control" value={customer.contact_person} onChange={(e) => setCustomer({ ...customer, contact_person: e.target.value })} placeholder="Please enter contact person" />
          </div>
          <div className="form-group">
            <label>Mobile Number</label>
            <input className="form-control" value={customer.mobile} onChange={(e) => setCustomer({ ...customer, mobile: e.target.value })} placeholder="Please enter mobile number" />
          </div>
          <div className="form-group">
            <label>Billing Address</label>
            <textarea className="form-control" rows={3} value={customer.billing_address} onChange={(e) => setCustomer({ ...customer, billing_address: e.target.value })} placeholder="Please enter billing address" />
          </div>
          <div className="form-group">
            <label>Delivery Address</label>
            <textarea className="form-control" rows={3} value={customer.delivery_address} onChange={(e) => setCustomer({ ...customer, delivery_address: e.target.value })} placeholder="Please enter delivery address" />
          </div>
          <div className="form-group">
            <label>Electrician</label>
            <input className="form-control" value={customer.electrician} onChange={(e) => setCustomer({ ...customer, electrician: e.target.value })} placeholder="Please enter electrician" />
          </div>
          <div className="form-group">
            <label>Electrician Number</label>
            <input className="form-control" value={customer.electrician_number} onChange={(e) => setCustomer({ ...customer, electrician_number: e.target.value })} placeholder="Please enter electrician number" />
          </div>
          <div className="form-group">
            <label>Architect</label>
            <input className="form-control" value={customer.architect} onChange={(e) => setCustomer({ ...customer, architect: e.target.value })} placeholder="Please enter architect" />
          </div>
          <div className="form-group">
            <label>Architect Number</label>
            <input className="form-control" value={customer.architect_number} onChange={(e) => setCustomer({ ...customer, architect_number: e.target.value })} placeholder="Please enter architect number" />
          </div>
          <div className="form-group">
            <label>Office Contact Person</label>
            <input className="form-control" value={customer.office_contact_person} onChange={(e) => setCustomer({ ...customer, office_contact_person: e.target.value })} placeholder="Please enter office contact person" />
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

