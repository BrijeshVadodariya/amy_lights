import React, { useState } from 'react';
import { Search, Plus, Phone, Mail, UserPlus } from 'lucide-react';
import './CRM.css';

const CRM = () => {
  const [leads, setLeads] = useState([
    { id: 1, name: 'Anil Kumar', company: 'AK Constructions', phone: '9876543210', status: 'In Design' },
    { id: 2, name: 'Bhavna Patel', company: 'Interior Plus', phone: '8765432109', status: 'Quote Sent' },
    { id: 3, name: 'Rahul Shah', company: 'Home Decor', phone: '7654321098', status: 'Follow Up' },
  ]);

  return (
    <div className="crm-page content-container">
      <div className="card crm-card">
        <div className="card-header">
          <h2>CRM / Leads</h2>
          <button className="btn btn-primary add-new">
            <UserPlus size={18} />
            New Lead
          </button>
        </div>

        <div className="table-controls">
          <div className="search-box">
            <span>Search:</span>
            <input type="text" placeholder="Search leads..." />
          </div>
        </div>

        <div className="table-wrapper">
          <table className="orders-table">
            <thead>
              <tr>
                <th>Lead Name</th>
                <th>Company</th>
                <th>Contact</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {leads.map((lead) => (
                <tr key={lead.id}>
                  <td>{lead.name}</td>
                  <td>{lead.company}</td>
                  <td className="contact-col">
                    <div className="contact-badge"><Phone size={14} /> {lead.phone}</div>
                  </td>
                  <td>
                    <span className="status-pill status-cyan">
                      {lead.status}
                    </span>
                  </td>
                  <td className="actions">
                    <button className="icon-btn"><Mail size={16} /></button>
                    <button className="icon-btn">View</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default CRM;
