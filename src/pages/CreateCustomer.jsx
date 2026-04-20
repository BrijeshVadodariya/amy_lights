import React, { useMemo, useState, useEffect } from 'react';
import { X, Plus, Phone, Users, MapPin, Activity } from 'lucide-react';
import { odooService } from '../services/odoo';
import SearchableSelect from '../components/SearchableSelect';
import './FormPages.css';

const CreateCustomer = ({ editId, onNavigate, extraData }) => {
  // Where to go back after creating — set by the calling form (create-order / create-selection / create-direct-order)
  const returnRoute = extraData?.returnRoute || 'customers';
  const [saving, setSaving] = useState(false);
  const [masterData, setMasterData] = useState({ partners: [], architects: [], electricians: [], users: [] });
  const [modalState, setModalState] = useState({ show: false, editingId: null, newName: '', newPhone: '', newEmail: '', newAddress: '', newNote: '', isArchitect: false, isElectrician: false });
  const [showSuccessOptions, setShowSuccessOptions] = useState(false);
  const [createdPartnerId, setCreatedPartnerId] = useState(null);
  const [customer, setCustomer] = useState(() => {
    // 1. Check if we have state passed from previous form (return logic)
    if (extraData?.formState) return extraData.formState;

    // 2. If not editing, check localStorage for a saved draft
    if (!editId) {
      const savedDraft = localStorage.getItem('amy_customer_form_draft');
      if (savedDraft) {
        try {
          return JSON.parse(savedDraft);
        } catch (e) {
          console.error("Failed to parse Customer draft", e);
        }
      }
    }

    // 3. Fallback to default empty state
    return {
      name: '',
      phone: '',
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
      gstNo: '',
      registerAddress: '',
      operationPerson: '',
      architectId: '',
      architectName: '',
      electricianId: '',
      electricianName: ''
    };
  });

  // Handle auto-saving to localStorage
  useEffect(() => {
    if (!editId) {
      const timeoutId = setTimeout(() => {
        localStorage.setItem('amy_customer_form_draft', JSON.stringify(customer));
      }, 500);
      return () => clearTimeout(timeoutId);
    }
  }, [customer, editId]);

  const [hasChanges, setHasChanges] = useState(false);
  
  useEffect(() => {
    const isDirty = customer.name !== '' || customer.phone !== '' || customer.houseNo !== '' || customer.area !== '';
    setHasChanges(isDirty && !editId); // Only track unsaved changes for new creations or if actually edited
  }, [customer, editId]);

  // Load existing customer data if editing
  useEffect(() => {
    if (editId) {
      setSaving(true);
      odooService.getPartnerDetail(editId).then(res => {
        if (res) {
          // Helper to extract numeric ID from Odoo's Many2one [id, name] or raw ID
          const extractId = (val) => {
            if (!val) return '';
            if (Array.isArray(val) && val.length > 0) return val[0];
            return val;
          };

          let streetStr = res.street || '';
          let parts = streetStr.split(',').map(s => s.trim());
          let hNo = '', bName = '';
          if (parts.length === 1) {
            // Heuristic: if it contains a space or is long, it's likely a Building/Society name
            if (parts[0].includes(' ') || parts[0].length > 6) {
              bName = parts[0];
            } else {
              hNo = parts[0];
            }
          } else if (parts.length >= 2) {
            hNo = parts[0];
            bName = parts[1];
          }

          setCustomer({
            name: res.name || '',
            phone: res.phone || '',
            email: res.email || '',
            otherName: res.other_name || '',
            otherNumber: res.other_number || '',
            houseNo: hNo,
            buildingName: bName,
            area: res.street2 || '',
            pincode: res.zip || '',
            city: res.city || '',
            state: res.state_name || '',
            empAssigned: extractId(res.emp_assigned),
            sourceType: res.source_type || '',
            source: res.source_name || '',
            competitor: res.competitor || '',
            budget: res.budget || '',
            gstNo: res.vat || '',
            registerAddress: res.register_address || '',
            operationPerson: extractId(res.operation_person),
            architectId: extractId(res.architect_id),
            architectName: res.architect_name || '',
            electricianId: extractId(res.electrician_id),
            electricianName: res.electrician_name || ''
          });
          // Reset hasChanges after initial load
          setTimeout(() => setHasChanges(false), 200);
        }
        setSaving(false);
      }).catch(() => setSaving(false));
    }
  }, [editId]);

  const handleGSTLookup = async () => {
    if (!customer.gstNo || customer.gstNo.length < 15) return;
    setSaving(true);
    try {
      const res = await odooService.gstLookup(customer.gstNo);
      if (res && res.name) {
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

        setCustomer(prev => ({
          ...prev,
          name: res.name || prev.name,
          phone: res.phone || prev.phone,
          email: res.email || prev.email,
          houseNo: hNo,
          buildingName: bName,
          area: res.street2 || aName,
          city: res.city || '',
          pincode: res.zip || '',
          state: res.state || '',
          architectId: res.architect_id || prev.architectId,
          electrician_id: res.electrician_id || prev.electricianId
        }));
        setHasChanges(true);
      }
    } catch (err) {
      console.error("GST Lookup failed", err);
    } finally {
      setSaving(false);
    }
  };

  const safeNavigate = (to, id = null, data = null) => {
    if (hasChanges) {
      if (window.confirm("You have unsaved changes. Are you sure?")) {
        setHasChanges(false);
        onNavigate(to, id, data);
      }
    } else {
      onNavigate(to, id, data);
    }
  };

  useEffect(() => {
    Promise.all([
      odooService.getMasterData().catch(() => null),
      odooService.getPartners().catch(() => [])
    ]).then(([masterRes, partnersRes]) => {
      if (masterRes) {
        setMasterData(prev => ({
          ...prev,
          architects: masterRes.architects || [],
          electricians: masterRes.electricians || [],
          users: masterRes.users || [],
          partners: partnersRes?.length ? partnersRes : (masterRes.partners || [])
        }));
      }
    });
  }, []);

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

  const canSubmit = useMemo(() => (customer?.name || '').trim().length > 0, [customer?.name]);

  const handleSubmit = async () => {
    if (!canSubmit || saving) return;
    setSaving(true);
    try {
      const payload = {
        name: customer.name,
        phone: customer.phone,
        email: customer.email,
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
        emp_assigned: parseInt(customer.empAssigned) || false,
        operation_person: parseInt(customer.operationPerson) || false,
        register_address: customer.registerAddress,
        vat: customer.gstNo
      };

      let res;
      if (editId) {
        res = await odooService.updatePartner(editId, payload);
      } else {
        res = await odooService.createPartner(payload);
      }

      if (!res) {
        alert(`${editId ? 'Update' : 'Creation'} failed`);
        return;
      }
      // Navigate back to the originating form with the partner pre-selected and previous state restored
      localStorage.removeItem('amy_customer_form_draft');
      setHasChanges(false);
      
      const pId = res.id || res.data?.id || editId;
      if (!editId && returnRoute === 'customers') {
        setCreatedPartnerId(pId);
        setShowSuccessOptions(true);
      } else {
        onNavigate(returnRoute, extraData?.orderEditId, { 
          preFilledPartnerId: pId,
          formState: extraData?.formState 
        });
      }
    } catch {
      alert(`${editId ? 'Update' : 'Creation'} failed`);
    } finally {
      setSaving(false);
    }
  };

  const handleEditProfessional = async (id, isArchitect) => {
    if (!id) return;
    setSaving(true);
    try {
      const res = await odooService.getPartnerDetail(id);
      if (res) {
        setModalState({
          show: true,
          editingId: id,
          newName: res.name || '',
          newPhone: res.phone || '',
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
      setSaving(false);
    }
  };

  const handleSaveProfessional = async () => {
    if (!modalState.newName) return alert("Professional Name is required");
    setSaving(true);
    try {
      const payload = {
        name: modalState.newName,
        phone: modalState.newPhone,
        email: modalState.isArchitect ? modalState.newEmail : '',
        street: modalState.newAddress,
        comment: modalState.newNote,
        is_architect: modalState.isArchitect,
        is_electrician: modalState.isElectrician
      };

      let res;
      if (modalState.editingId) {
        res = await odooService.updatePartner(modalState.editingId, payload);
      } else {
        res = await odooService.createPartner(payload);
      }

      if (res) {
        const targetId = modalState.editingId || res.id || (typeof res === 'number' ? res : res.data?.id);
        const fullRecord = {
          id: targetId,
          name: modalState.newName,
          phone: modalState.newPhone,
          email: modalState.newEmail,
          street: modalState.newAddress,
          comment: modalState.newNote
        };

        setMasterData(prev => {
          const newData = { ...prev };
          if (modalState.isArchitect) {
            newData.architects = modalState.editingId
              ? prev.architects.map(a => a.id === targetId ? fullRecord : a)
              : [...(prev.architects || []), fullRecord];
          }
          if (modalState.isElectrician) {
            newData.electricians = modalState.editingId
              ? prev.electricians.map(e => e.id === targetId ? fullRecord : e)
              : [...(prev.electricians || []), fullRecord];
          }
          return newData;
        });

        setCustomer(prev => {
          const newCust = { ...prev };
          if (modalState.isArchitect) {
            newCust.architectId = targetId;
            newCust.architectName = modalState.newName;
          }
          if (modalState.isElectrician) {
            newCust.electricianId = targetId;
            newCust.electricianName = modalState.newName;
          }
          return newCust;
        });

        setModalState({ show: false, editingId: null, newName: '', newPhone: '', newEmail: '', newAddress: '', newNote: '', isArchitect: false, isElectrician: false });
      }
    } catch (err) {
      alert(`Failed to ${modalState.editingId ? 'update' : 'save'} professional`);
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
          <button className="btn-ui secondary" onClick={() => onNavigate(returnRoute, extraData?.orderEditId, { formState: extraData?.formState })} aria-label="Back to quotation">
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
                      onChange={(e) => setCustomer({ ...customer, phone: e.target.value })} 
                      placeholder="Enter Phone Number" 
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Architect Selection */}
            <div className="selection-item">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', marginTop: '12px' }}>
                <label style={{ margin: 0 }}>Architect</label>
                <div style={{ display: 'flex', gap: '6px' }}>
                  {customer.architectId && (
                    <button 
                      className="btn-ui secondary mini" 
                      style={{ padding: '2px 8px', fontSize: '11px', height: '22px', color: '#3b82f6' }}
                      onClick={() => handleEditProfessional(customer.architectId, true)}
                    >
                      Edit
                    </button>
                  )}
                  <button 
                    className="btn-ui secondary mini" 
                    style={{ padding: '2px 8px', fontSize: '11px', height: '22px' }}
                    onClick={() => setModalState({ show: true, editingId: null, newName: '', newPhone: '', newEmail: '', newAddress: '', newNote: '', isArchitect: true, isElectrician: false })}
                  >
                    <Plus size={10} style={{ marginRight: '4px' }} /> Add New
                  </button>
                </div>
              </div>
              <div className="selection-card-box">
                <div className="selection-card-content">
                  <div className="selection-card-top p-input-field">
                    <SearchableSelect
                      placeholder="Select Architect"
                      value={customer.architectId}
                      defaultValue={customer.architectName}
                      onChange={(val, opt) => setCustomer({ ...customer, architectId: val, architectName: opt?.label || '' })}
                      options={masterData.architects?.map((a) => ({ value: a.id, label: a.name || 'Unknown' })) || []}
                      className="clean-select"
                    />
                  </div>
                  <div className="selection-divider"></div>
                  <div className="selection-card-bottom">
                    <Phone size={14} className="text-slate-400" />
                    <span style={{ fontSize: '13px', fontWeight: 600, color: '#64748b' }}>
                      {(masterData.architects?.find(a => a.id === parseInt(customer.architectId)))?.phone || '-'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Electrician Selection */}
            <div className="selection-item">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', marginTop: '12px' }}>
                <label style={{ margin: 0 }}>Electrician</label>
                <div style={{ display: 'flex', gap: '6px' }}>
                  {customer.electricianId && (
                    <button 
                      className="btn-ui secondary mini" 
                      style={{ padding: '2px 8px', fontSize: '11px', height: '22px', color: '#3b82f6' }}
                      onClick={() => handleEditProfessional(customer.electricianId, false)}
                    >
                      Edit
                    </button>
                  )}
                  <button 
                    className="btn-ui secondary mini" 
                    style={{ padding: '2px 8px', fontSize: '11px', height: '22px' }}
                    onClick={() => setModalState({ show: true, editingId: null, newName: '', newPhone: '', newEmail: '', newAddress: '', newNote: '', isArchitect: false, isElectrician: true })}
                  >
                    <Plus size={10} style={{ marginRight: '4px' }} /> Add New
                  </button>
                </div>
              </div>
              <div className="selection-card-box">
                <div className="selection-card-content">
                  <div className="selection-card-top p-input-field">
                    <SearchableSelect
                      placeholder="Select Electrician"
                      value={customer.electricianId}
                      defaultValue={customer.electricianName}
                      onChange={(val, opt) => setCustomer({ ...customer, electricianId: val, electricianName: opt?.label || '' })}
                      options={masterData.electricians?.map((e) => ({ value: e.id, label: e.name || 'Unknown' })) || []}
                      className="clean-select"
                    />
                  </div>
                  <div className="selection-divider"></div>
                  <div className="selection-card-bottom">
                    <Phone size={14} className="text-slate-400" />
                    <span style={{ fontSize: '13px', fontWeight: 600, color: '#64748b' }}>
                      {(masterData.electricians?.find(e => e.id === parseInt(customer.electricianId)))?.phone || '-'}
                    </span>
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
                <span className="od-label">Sales Person</span>
                <div style={{ width: '180px' }}>
                  <SearchableSelect
                    placeholder="Select Sales Person"
                    value={customer.empAssigned}
                    className="clean-select"
                    onChange={(val) => setCustomer({ ...customer, empAssigned: val })}
                    options={masterData.users?.map(u => ({ value: u.id, label: u.name })) || []}
                  />
                </div>
              </div>
              <div className="od-row">
                <span className="od-label">Operation Person</span>
                <div style={{ width: '180px' }}>
                  <SearchableSelect
                    placeholder="Select Operation Person"
                    value={customer.operationPerson}
                    className="clean-select"
                    onChange={(val) => setCustomer({ ...customer, operationPerson: val })}
                    options={masterData.partners?.map(p => ({ value: p.id, label: p.name })) || []}
                  />
                </div>
              </div>
              <div className="od-row">
                <span className="od-label">Registered Address</span>
                <input 
                  className="od-input" 
                  value={customer.registerAddress} 
                  onChange={(e) => setCustomer({ ...customer, registerAddress: e.target.value })} 
                  placeholder="Enter Address" 
                />
              </div>
              <div className="od-row">
                <span className="od-label">GST No</span>
                <input 
                  className="od-input" 
                  value={customer.gstNo} 
                  onChange={(e) => setCustomer({ ...customer, gstNo: e.target.value })} 
                  onBlur={handleGSTLookup}
                  placeholder="GST Number" 
                />
              </div>
            </div>
          </div>
        </div>

        <div className="form-footer">
          <button className="btn-ui primary lg" onClick={handleSubmit} disabled={!canSubmit || saving}>
            {saving ? (editId ? 'Updating...' : 'Submitting...') : (editId ? 'Update' : 'Submit')}
          </button>
          <button className="btn-ui secondary lg" onClick={() => onNavigate(returnRoute, extraData?.orderEditId, { formState: extraData?.formState })}>
            Back
          </button>
        </div>
      </div>

      {showSuccessOptions && (
        <div className="form-modal-overlay">
          <div className="form-modal-content" style={{ textAlign: 'center', padding: '30px' }}>
            <div style={{ width: '60px', height: '60px', background: '#f0fdf4', color: '#16a34a', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
              <Plus size={32} />
            </div>
            <h2 style={{ marginBottom: '10px' }}>Customer Created!</h2>
            <p style={{ color: '#64748b', marginBottom: '25px' }}>What would you like to do next for <b>{customer.name}</b>?</p>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button 
                className="btn-ui primary" 
                style={{ width: '100%', justifyContent: 'center', height: '45px' }}
                onClick={() => onNavigate('create-selection', null, { partner_id: createdPartnerId })}
              >
                Create Selection
              </button>
              <button 
                className="btn-ui secondary" 
                style={{ width: '100%', justifyContent: 'center', height: '45px', border: '1px solid #e2e8f0' }}
                onClick={() => onNavigate('create-order', null, { partner_id: createdPartnerId })}
              >
                Create Quotation
              </button>
              <button 
                className="btn-ui secondary" 
                style={{ width: '100%', justifyContent: 'center', height: '45px', border: '1px solid #e2e8f0' }}
                onClick={() => onNavigate('create-direct-order', null, { partner_id: createdPartnerId })}
              >
                Create Direct Order
              </button>
              <div style={{ height: '10px' }}></div>
              <button 
                className="btn-ui" 
                style={{ width: '100%', justifyContent: 'center', color: '#94a3b8' }}
                onClick={() => onNavigate('customers')}
              >
                Just Close
              </button>
            </div>
          </div>
        </div>
      )}

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
              <button onClick={() => setModalState({ ...modalState, show: false })} style={{ border: 'none', background: 'none', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>
            
            <div style={{ marginBottom: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '12px', fontWeight: 700, color: '#64748b' }}>Name *</label>
                <input 
                  className="clean-input w-full" 
                  value={modalState.newName} 
                  onChange={(e) => setModalState({ ...modalState, newName: e.target.value })} 
                  placeholder="Enter Name" 
                  style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '10px 12px', fontSize: '14px', fontWeight: 600 }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '12px', fontWeight: 700, color: '#64748b' }}>Phone</label>
                <input 
                  className="clean-input w-full" 
                  value={modalState.newPhone} 
                  onChange={(e) => setModalState({ ...modalState, newPhone: e.target.value })} 
                  placeholder="Enter Number" 
                  style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '10px 12px', fontSize: '14px', fontWeight: 600 }}
                />
              </div>
              {modalState.isArchitect && (
                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '12px', fontWeight: 700, color: '#64748b' }}>Email</label>
                  <input 
                    className="clean-input w-full" 
                    value={modalState.newEmail} 
                    onChange={(e) => setModalState({ ...modalState, newEmail: e.target.value })} 
                    placeholder="Enter Email" 
                    style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '10px 12px', fontSize: '14px', fontWeight: 600 }}
                  />
                </div>
              )}
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '12px', fontWeight: 700, color: '#64748b' }}>Address</label>
                <input 
                  className="clean-input w-full" 
                  value={modalState.newAddress} 
                  onChange={(e) => setModalState({ ...modalState, newAddress: e.target.value })} 
                  placeholder="Enter Address" 
                  style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '10px 12px', fontSize: '14px', fontWeight: 600 }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '12px', fontWeight: 700, color: '#64748b' }}>Note</label>
                <textarea 
                  className="clean-input w-full" 
                  value={modalState.newNote} 
                  onChange={(e) => setModalState({ ...modalState, newNote: e.target.value })} 
                  placeholder="Add a remark..." 
                  style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '10px 12px', fontSize: '14px', fontWeight: 600, minHeight: '80px', resize: 'vertical' }}
                />
              </div>
            </div>


            <div style={{ display: 'flex', gap: '12px' }}>
              <button 
                className="btn-ui primary w-full" 
                style={{ flex: 1, height: '48px', borderRadius: '12px' }}
                onClick={handleSaveProfessional}
                disabled={!modalState.newName}
              >
                {modalState.editingId ? 'Update' : 'Add'} {modalState.isArchitect ? 'Architect' : 'Electrician'}
              </button>
              <button 
                className="btn-ui secondary w-full" 
                style={{ flex: 1, height: '48px', borderRadius: '12px' }}
                onClick={() => setModalState({ ...modalState, show: false, editingId: null, newName: '', newPhone: '', newEmail: '', newAddress: '', newNote: '' })}
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

export default CreateCustomer;

