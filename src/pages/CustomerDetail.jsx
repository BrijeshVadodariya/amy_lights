import React, { useState, useEffect } from 'react';
import { 
  ChevronLeft, Edit, User, MapPin, 
  Phone, Mail, MessageSquare, Plus, ShoppingCart, 
  Target, Star, Briefcase, Trash2
} from 'lucide-react';
import { odooService } from '../services/odoo';
import Loader from '../components/Loader';
import './OrderDetail.css';
import './CustomerDetail.css';
import './FormPages.css';

const CustomerDetail = ({ partnerId, onBack, onNavigate }) => {
  const [partner, setPartner] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchPartner = React.useCallback(async () => {
    try {
      const res = await odooService.getPartnerDetail(partnerId);
      if (res) setPartner(res);
    } catch (err) {
      console.error('Error fetching partner details', err);
    } finally {
      setLoading(false);
    }
  }, [partnerId]);

  useEffect(() => {
    if (partnerId) fetchPartner();
  }, [partnerId, fetchPartner]);

  const handleDelete = async () => {
    if (!window.confirm(`Are you sure you want to delete ${partner.name}? This action cannot be undone.`)) return;
    setLoading(true);
    try {
      const res = await odooService.deletePartner(partnerId);
      if (res.success || !res.error) {
        onBack();
      } else {
        alert(res.error?.message || "Failed to delete customer");
        setLoading(false);
      }
    } catch (err) {
      alert("Network error while deleting");
      setLoading(false);
    }
  };

  if (loading) return <div className="py-20 text-center"><Loader message="Loading details..." /></div>;
  if (!partner) return <div className="p-10 text-center">Customer not found.</div>;

  return (
    <div className="crm-detail-page">
      <div className="cd-header">
        <div className="cd-header-left">
          <button className="cd-back-btn" onClick={onBack}>
            <ChevronLeft size={20} />
          </button>
          <div className="cd-title-block">
            <h1 style={{fontSize: '24px', fontWeight: 800}}>{partner.name}</h1>
            <div className="cd-badge-row">
              <span className="cd-badge blue">Customer</span>
              {partner.is_architect && <span className="cd-badge green">Architect</span>}
              {partner.is_electrician && <span className="cd-badge orange">Electrician</span>}
            </div>
          </div>
        </div>
        <div className="cd-header-right">
          <button 
            className="btn-ui" 
            style={{ backgroundColor: '#fee2e2', color: '#dc2626', border: '1px solid #fca5a5' }}
            onClick={handleDelete}
          >
            <Trash2 size={16} /> Delete
          </button>
          <button 
            className="btn-ui secondary" 
            onClick={() => onNavigate('create-customer', partner.id)}
          >
            <Edit size={16} /> Edit Profile
          </button>
          <button 
            className="btn-ui primary"
            onClick={() => onNavigate('catalog', partner.id, { fromTab: 'customers' })}
          >
            <ShoppingCart size={16} /> Catalog
          </button>
        </div>
      </div>

      <div className="cd-grid">
        {/* Left Column: Primary Info */}
        <div className="cd-column-main">
          <section className="cd-section">
            <div className="cd-section-header">
              <User size={18} />
              <h2>Basic Information</h2>
            </div>
            <div className="info-grid">
              <div className="info-item">
                <label>Email</label>
                <div className="info-value">
                  <Mail size={14} />
                  <span>{partner.email || 'No email provided'}</span>
                </div>
              </div>
              <div className="info-item">
                <label>Phone</label>
                <div className="info-value">
                  <Phone size={14} />
                  <span>{partner.phone || 'No phone number'}</span>
                </div>
              </div>
              <div className="info-item">
                <label>GST Number</label>
                <div className="info-value">
                  <Target size={14} />
                  <span>{partner.vat || 'N/A'}</span>
                </div>
              </div>
              <div className="info-item">
                <label>Assigned To</label>
                <div className="info-value">
                  <Star size={14} />
                  <span>{Array.isArray(partner.emp_assigned) ? partner.emp_assigned[1] : (partner.emp_assigned || 'Unassigned')}</span>
                </div>
              </div>
            </div>
          </section>

          <section className="cd-section">
            <div className="cd-section-header">
              <MapPin size={18} />
              <h2>Address Details</h2>
            </div>
            <div className="info-grid">
              <div className="info-item full">
                <label>Primary Address</label>
                <div className="info-value">
                  <span>{partner.street || ''} {partner.street2 ? `, ${partner.street2}` : ''}</span>
                </div>
              </div>
              <div className="info-item">
                <label>City</label>
                <div className="info-value"><span>{partner.city || '—'}</span></div>
              </div>
              <div className="info-item">
                <label>State</label>
                <div className="info-value"><span>{partner.state_name || '—'}</span></div>
              </div>
              <div className="info-item">
                <label>Zip/Pincode</label>
                <div className="info-value"><span>{partner.zip || '—'}</span></div>
              </div>
            </div>
          </section>
        </div>

        {/* Right Column: Relations & Professionals */}
        <div className="cd-column-side">
          <section className="cd-section">
            <div className="cd-section-header">
              <Briefcase size={18} />
              <h2>Professionals Linked</h2>
            </div>
            <div className="info-stack-v2">
              <div className="relation-card">
                <label>Architect</label>
                <div className="relation-name">
                  {Array.isArray(partner.architect_id) ? partner.architect_id[1] : (partner.architect_name || 'Not Linked')}
                </div>
              </div>
              <div className="relation-card">
                <label>Electrician</label>
                <div className="relation-name">
                  {Array.isArray(partner.electrician_id) ? partner.electrician_id[1] : (partner.electrician_name || 'Not Linked')}
                </div>
              </div>
            </div>
          </section>

          <section className="cd-section">
            <div className="cd-section-header">
              <MessageSquare size={18} />
              <h2>Internal Notes</h2>
            </div>
            <div className="notes-box-v2">
               {partner.comment || 'No internal notes for this customer.'}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default CustomerDetail;
