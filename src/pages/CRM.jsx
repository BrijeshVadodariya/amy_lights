import React, { useState, useEffect, useCallback } from 'react';
import { 
  Search, 
  Filter, 
  ChevronRight, 
  ChevronLeft, 
  MoreVertical, 
  Plus, 
  Target, 
  TrendingUp, 
  CheckCircle2, 
  XCircle,
  Clock,
  Phone,
  Mail,
  User,
  Calendar as CalendarIcon
} from 'lucide-react';
import { odooService } from '../services/odoo';
import './Orders.css'; // Global table styles
import './CRM.css';    // Dedicated CRM styles

const CRM = ({ onNavigate }) => {
  const [leads, setLeads] = useState([]);
  const [stages, setStages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedStage, setSelectedStage] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(0);
  const limit = 20;

  const fetchStages = async () => {
    try {
      const res = await odooService.getCRMStages();
      setStages(res || []);
    } catch (err) {
      console.error("Failed to fetch stages", err);
    }
  };

  const fetchLeads = useCallback(async () => {
    setLoading(true);
    try {
      const res = await odooService.getCRMLeads(
        'all', 
        limit, 
        page * limit,
        selectedStage || null,
        fromDate || null,
        toDate || null
      );
      if (res) {
        setLeads(Array.isArray(res) ? res : (res.data || []));
      }
    } catch (err) {
      console.error("Failed to fetch leads", err);
    } finally {
      setLoading(false);
    }
  }, [page, limit, selectedStage, fromDate, toDate]);

  useEffect(() => {
    fetchStages();
  }, []);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  const getPriorityStars = (p) => {
    const priority = parseInt(p) || 0;
    return '⭐'.repeat(priority + 1);
  };

  const getProbClass = (prob) => {
    if (prob >= 80) return 'crm-probability-high';
    if (prob >= 40) return 'crm-probability-med';
    return 'crm-probability-low';
  };

  const clearFilters = () => {
    setSelectedStage('');
    setFromDate('');
    setToDate('');
    setFilterType('all');
    setPage(0);
  };

  const filteredLeads = leads.filter(l => 
    l.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    l.contact_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="orders-page crm-page">
      <div className="orders-header">
        <h1 className="text-2xl font-bold text-slate-800">Pipeline</h1>
      </div>

      <div className="filter-bar shadow-sm">
        <div className="filter-group">
          <label><Filter size={14} /> Stage</label>
          <select 
            value={selectedStage} 
            onChange={(e) => { setSelectedStage(e.target.value); setPage(0); }}
            className="filter-select"
          >
            <option value="">All Stages</option>
            {stages.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>
        <div className="filter-group">
          <label><CalendarIcon size={14} /> From</label>
          <input 
            type="date" 
            value={fromDate} 
            onChange={(e) => { setFromDate(e.target.value); setPage(0); }}
            className="filter-date"
          />
        </div>
        <div className="filter-group">
          <label><CalendarIcon size={14} /> To</label>
          <input 
            type="date" 
            value={toDate} 
            onChange={(e) => { setToDate(e.target.value); setPage(0); }}
            className="filter-date"
          />
        </div>
        <button className="clear-filters-btn" onClick={clearFilters}>
          Reset
        </button>
      </div>

      <div className="table-controls">
        <div className="search-box">
          <Search size={18} />
          <input 
            type="text" 
            placeholder="Search leads or contacts..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="action-buttons">
          <button className="btn btn-primary" onClick={() => alert('Create Lead feature coming soon!')}>
            <Plus size={18} />
            <span>New Lead</span>
          </button>
        </div>
      </div>
      <div className="table-wrapper">
        <table className="orders-table">
          <thead>
            <tr>
              <th>Client Name</th>
              <th>Client Address</th>
              <th>Architect</th>
              <th>Architect FollowUp</th>
              <th>Electrician</th>
              <th>Notes</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="6" className="text-center py-10">
                  <div className="loading-spinner"></div>
                  <p>Loading CRM data...</p>
                </td>
              </tr>
            ) : filteredLeads.length === 0 ? (
              <tr>
                <td colSpan="6" className="text-center py-10 text-gray-400">
                  No leads found for this filter.
                </td>
              </tr>
            ) : filteredLeads.map((lead) => (
              <tr key={lead.id}>
                <td>
                  <div className="crm-contact-cell">
                    <span className="crm-contact-name">{lead.contact_name}</span>
                    {lead.phone && (
                      <div className="crm-text-muted">
                        <Phone size={12} className="inline mr-1" /> {lead.phone}
                      </div>
                    )}
                    <div className="priority-stars mt-1">
                      {getPriorityStars(lead.priority)}
                    </div>
                  </div>
                </td>
                <td>
                  <div className="crm-address-cell">
                    {lead.address?.split(',').map((part, i) => (
                      <div key={i} className="crm-text-sm">{part.trim()}</div>
                    ))}
                  </div>
                </td>
                <td>
                  <div className="crm-contact-cell">
                     <span className="font-medium text-slate-700">{lead.architect_name || '—'}</span>
                     {lead.architect_number && (
                       <div className="crm-text-muted">
                         <Phone size={12} className="inline mr-1" /> {lead.architect_number}
                       </div>
                     )}
                  </div>
                </td>
                <td>
                  <div className="crm-followup-cell">
                    {lead.architect_follow_up && (
                      <div className="font-medium text-slate-600">{lead.architect_follow_up}</div>
                    )}
                    <div className="crm-text-sm text-slate-500 italic">
                      {lead.architect_remark || 'No remarks'}
                    </div>
                  </div>
                </td>
                <td>
                  <div className="crm-contact-cell">
                     <span className="font-medium text-slate-700">{lead.electrician_name || '—'}</span>
                     {lead.electrician_number && (
                       <div className="crm-text-muted text-sm">
                         {lead.electrician_number}
                       </div>
                     )}
                     <div className="crm-text-sm text-slate-500 italic">
                        {lead.electrician_remark}
                     </div>
                  </div>
                </td>
                <td>
                  <div className="crm-notes-cell">
                    {lead.notes}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="table-footer">
        <div className="pagination">
          <button 
            disabled={page === 0 || loading} 
            onClick={() => setPage(p => p - 1)}
            className={`page-btn ${page === 0 ? 'disabled' : ''}`}
          >
            <ChevronLeft size={18} /> Prev
          </button>
          <span className="page-indicator">Page {page + 1}</span>
          <button 
            disabled={leads.length < limit || loading} 
            onClick={() => setPage(p => p + 1)}
            className={`page-btn ${leads.length < limit ? 'disabled' : ''}`}
          >
            Next <ChevronRight size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default CRM;
