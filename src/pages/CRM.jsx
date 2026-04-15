import React, { useState, useEffect, useCallback } from 'react';
import { 
  Plus, 
  Filter,
  ChevronLeft, 
  ChevronRight, 
  Calendar as CalendarIcon,
  Phone,
  ChevronDown,
  MessageSquare,
  Calendar,
  CheckCircle,
  Layout,
  RefreshCw
} from 'lucide-react';
import { createPortal } from 'react-dom';
import { odooService } from '../services/odoo';
import { QuickNoteModal, QuickTaskModal } from '../components/QuickActionModals';
import './Orders.css'; // Shared table styles
import './CRM.css';    // CRM-specific styles

const CRM = ({ onNavigate }) => {
  const [leads, setLeads] = useState([]);
  const [stages, setStages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedStage, setSelectedStage] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [entriesPerPage, setEntriesPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [openDropdownId, setOpenDropdownId] = useState(null);
  const [quickNoteLeadId, setQuickNoteLeadId] = useState(null);
  const [quickTaskLeadId, setQuickTaskLeadId] = useState(null);
  const [users, setUsers] = useState([]);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0 });
  const limit = 500; // fetch all, paginate client-side

  const fetchStages = async () => {
    try {
      const res = await odooService.getCRMStages();
      setStages(res || []);
    } catch (err) {
      console.error("Failed to fetch stages", err);
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await odooService.getMasterData();
      setUsers(res.users || []);
    } catch (err) {
       console.error("Failed to fetch users", err);
    }
  };

  const handleStageChange = async (leadId, stageId) => {
    if (!window.confirm("Change lead stage?")) return;
    try {
      await odooService.updateCRMLead(leadId, { stage_id: stageId });
      fetchLeads();
      setOpenDropdownId(null);
    } catch (err) {
      alert("Failed to update stage");
    }
  };

  const fetchLeads = useCallback(async () => {
    setLoading(true);
    try {
      const res = await odooService.getCRMLeads(
        'all', 
        limit, 
        0,
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
  }, [selectedStage, fromDate, toDate]);

  useEffect(() => { fetchStages(); fetchUsers(); }, []);
  useEffect(() => { fetchLeads(); }, [fetchLeads]);

  const getPriorityStars = (p) => {
    const priority = parseInt(p) || 0;
    return '⭐'.repeat(priority + 1);
  };

  // Wide search across all relevant CRM fields
  const filtered = leads.filter(l => {
    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLowerCase();
    return (
      String(l.name || '').toLowerCase().includes(q)               ||  
      String(l.contact_name || '').toLowerCase().includes(q)        ||  
      String(l.phone || '').toLowerCase().includes(q)               ||  
      String(l.address || '').toLowerCase().includes(q)             ||  
      String(l.architect_name || '').toLowerCase().includes(q)      ||  
      String(l.architect_number || '').toLowerCase().includes(q)    ||  
      String(l.architect_remark || '').toLowerCase().includes(q)    ||  
      String(l.architect_follow_up || '').toLowerCase().includes(q) ||  
      String(l.notes || '').toLowerCase().includes(q)
    );
  });

  const totalEntries = filtered.length;
  const totalPages = Math.ceil(totalEntries / entriesPerPage);
  const indexOfFirstItem = (currentPage - 1) * entriesPerPage;
  const indexOfLastItem = indexOfFirstItem + entriesPerPage;
  const currentItems = filtered.slice(indexOfFirstItem, indexOfLastItem);

  const handlePageChange = (p) => {
    if (p >= 1 && p <= totalPages) setCurrentPage(p);
  };

  const clearFilters = () => {
    setSelectedStage('');
    setFromDate('');
    setToDate('');
    setCurrentPage(1);
  };

  const renderPagination = () => {
    if (totalPages <= 1) return null;
    const pages = [];
    pages.push(
      <button key="prev" className="page-btn prev" onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage === 1}>
        Previous
      </button>
    );
    const maxVisible = 5;
    let start = Math.max(1, currentPage - Math.floor(maxVisible / 2));
    let end = Math.min(totalPages, start + maxVisible - 1);
    if (end - start < maxVisible - 1) start = Math.max(1, end - maxVisible + 1);
    for (let i = start; i <= end; i++) {
      pages.push(
        <button key={i} className={`page-btn ${currentPage === i ? 'active' : ''}`} onClick={() => handlePageChange(i)}>{i}</button>
      );
    }
    pages.push(
      <button key="next" className="page-btn next" onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage === totalPages}>
        Next
      </button>
    );
    return pages;
  };

  return (
    <div className="dt-page">
      <div className="dt-card">

        {/* Toolbar Row — matches Orders list */}
        <div className="dt-toolbar-row">
          <div className="dt-toolbar-left">
            <div className="dt-flex">
              <span className="dt-control-label">Show</span>
              <select
                className="entries-select"
                value={entriesPerPage}
                onChange={(e) => { setEntriesPerPage(Number(e.target.value)); setCurrentPage(1); }}
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
              </select>
              <span className="dt-control-label">entries</span>
            </div>
            <div className="dt-flex dt-search-box">
              <input
                type="text"
                className="search-input"
                value={searchTerm}
                placeholder="Search client, architect, notes..."
                onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              />
            </div>
          </div>

          <div className="dt-toolbar-right">
            {/* Stage filter */}
            <div className="dt-flex crm-filter-inline">
              <select
                value={selectedStage}
                onChange={(e) => { setSelectedStage(e.target.value); setCurrentPage(1); }}
                className="entries-select"
                style={{ width: '100px' }}
              >
                <option value="">All Stages</option>
                {stages.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
            {/* Date filters */}
            <div className="dt-flex">
              <input type="date" value={fromDate} onChange={(e) => { setFromDate(e.target.value); setCurrentPage(1); }} className="entries-select crm-date-input" title="From date" />
            </div>
            <div className="dt-flex">
              <input type="date" value={toDate} onChange={(e) => { setToDate(e.target.value); setCurrentPage(1); }} className="entries-select crm-date-input" title="To date" />
            </div>
            {(selectedStage || fromDate || toDate) && (
              <button className="btn-ui secondary" onClick={clearFilters} style={{ fontSize: '10px', height: '24px', padding: '0 8px' }}>
                Reset
              </button>
            )}
            <div className="btn-group-wrap">
              <button className="btn-ui primary" onClick={() => onNavigate('create-crm')}>
                <Plus size={14} />
                <span>New Lead</span>
              </button>
            </div>
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#999', fontSize: '13px' }}>
            Loading CRM data...
          </div>
        ) : (
          <div className="table-wrapper" style={{ overflowX: 'auto', display: 'block', width: '100%' }}>
            <table className="products-datatable crm-table">
              <thead>
                <tr>
                  <th className="text-center">Sr.No</th>
                  <th>Client</th>
                  <th>Address</th>
                  <th>Architect</th>
                  <th>Arch. Follow-Up</th>
                  <th>Note</th>
                  <th className="text-center" style={{ width: '90px' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {currentItems.length === 0 ? (
                  <tr>
                    <td colSpan="7" style={{ textAlign: 'center', padding: '32px', color: '#999', fontSize: '12px' }}>
                      No leads found.
                    </td>
                  </tr>
                ) : currentItems.map((lead, idx) => (
                  <tr 
                    key={lead.id} 
                    className="row-hover" 
                    onClick={() => onNavigate('crm-detail', lead.id)}
                    style={{ cursor: 'pointer' }}
                  >
                    {/* Sr.No */}
                    <td className="text-center cell-light" style={{ fontWeight: 600, color: '#000' }}>
                      {indexOfFirstItem + idx + 1}
                    </td>

                    {/* Client */}
                    <td className="cell-highlight">
                      <div className="customer-main">{lead.contact_name || lead.name || '—'}</div>
                      {lead.phone && (
                        <div style={{ fontSize: '10px', color: '#555', marginTop: '2px' }}>
                          {lead.phone}
                        </div>
                      )}
                      <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                         {lead.priority !== undefined && (
                          <div className="priority-stars">
                            {getPriorityStars(lead.priority)}
                          </div>
                        )}
                        <span className={`crm-stage-badge stage-default`} style={{ fontSize: '8px', padding: '1px 5px' }}>
                          {lead.stage}
                        </span>
                      </div>
                    </td>

                    {/* Address */}
                    <td className="cell-light">
                      <div className="note-truncate" title={lead.address}>
                        {lead.address || '—'}
                      </div>
                    </td>

                    {/* Architect */}
                    <td className="cell-highlight">
                      <div className="customer-main">{lead.architect_name || '—'}</div>
                      {lead.architect_number && (
                        <div style={{ fontSize: '10px', color: '#555', marginTop: '2px' }}>
                          {lead.architect_number}
                        </div>
                      )}
                    </td>

                    {/* Arch. Follow-Up */}
                    <td className="cell-light">
                      {lead.architect_follow_up && (
                        <div style={{ fontWeight: 600, color: '#000', fontSize: '11px' }}>{lead.architect_follow_up}</div>
                      )}
                      <div className="note-truncate" title={lead.architect_remark} style={{ color: '#555', fontStyle: 'italic' }}>
                        {lead.architect_remark || '—'}
                      </div>
                    </td>

                    {/* Note */}
                    <td className="cell-highlight">
                      <div className="note-truncate" title={lead.notes}>
                        {lead.notes || '—'}
                      </div>
                    </td>

                    {/* Actions */}
                    <td 
                      className="text-center" 
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="action-cell">
                        <button 
                          className="action-trigger"
                          onClick={(e) => {
                            e.stopPropagation();
                            const rect = e.currentTarget.getBoundingClientRect();
                            if (openDropdownId === lead.id) {
                              setOpenDropdownId(null);
                            } else {
                              setDropdownPos({ 
                                top: rect.bottom, 
                                left: rect.right - 180 
                              });
                              setOpenDropdownId(lead.id);
                            }
                          }}
                        >
                          <ChevronDown size={14} />
                        </button>

                        {openDropdownId === lead.id && createPortal(
                          <div 
                            className={`action-dropdown-popover portal-fix ${idx >= currentItems.length - 3 && currentItems.length > 5 ? 'open-up' : ''}`}
                            style={{ 
                              position: 'fixed',
                              top: idx >= currentItems.length - 3 && currentItems.length > 5 
                                ? `${dropdownPos.top - 200}px` 
                                : `${dropdownPos.top + 5}px`, 
                              left: `${dropdownPos.left}px`,
                              right: 'auto',
                              bottom: 'auto',
                              zIndex: 9999,
                              minWidth: '180px'
                            }}
                            onMouseLeave={() => setOpenDropdownId(null)}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div style={{ paddingBottom: '4px', borderBottom: '1px solid #f1f5f9' }}>
                              <button 
                                className="btn-action-soft"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setOpenDropdownId(null);
                                  setQuickNoteLeadId(lead.id);
                                }}
                              >
                                <MessageSquare size={12} className="text-emerald-500" />
                                <span>Add Remark</span>
                              </button>

                              <button 
                                className="btn-action-soft"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setOpenDropdownId(null);
                                  setQuickTaskLeadId(lead.id);
                                }}
                              >
                                <Calendar size={12} className="text-orange-500" />
                                <span>Add Task</span>
                              </button>
                            </div>

                            <div className="dropdown-section" style={{ marginTop: '4px' }}>
                              <label style={{ fontSize: '9px', fontWeight: 800, color: '#94a3b8', padding: '4px 12px', textTransform: 'uppercase' }}>Change Stage</label>
                              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '2px', padding: '4px' }}>
                                {stages.map(s => (
                                  <button 
                                    key={s.id}
                                    className="btn-action-soft"
                                    style={{ 
                                      justifyContent: 'flex-start', 
                                      background: lead.stage === s.name ? '#f1f5f9' : 'transparent',
                                      fontWeight: lead.stage === s.name ? 700 : 500
                                    }}
                                    onClick={() => handleStageChange(lead.id, s.id)}
                                  >
                                    <RefreshCw size={12} className={lead.stage === s.name ? 'text-blue-500' : 'text-slate-400'} />
                                    <span>{s.name}</span>
                                  </button>
                                ))}
                              </div>
                            </div>
                          </div>,
                          document.body
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Footer */}
        <div className="datatable-footer">
          <div className="dt-info">
            Showing {Math.min(indexOfFirstItem + 1, totalEntries)}–{Math.min(indexOfLastItem, totalEntries)} of {totalEntries} entries
          </div>
          <div className="pagination">
            {renderPagination()}
          </div>
        </div>

      </div>

      {quickNoteLeadId && (
        <QuickNoteModal 
          orderId={quickNoteLeadId}
          resModel="crm.lead"
          onClose={() => setQuickNoteLeadId(null)}
          onSuccess={() => { fetchLeads(); setQuickNoteLeadId(null); }}
        />
      )}

      {quickTaskLeadId && (
        <QuickTaskModal 
          orderId={quickTaskLeadId}
          resModel="crm.lead"
          users={users}
          onClose={() => setQuickTaskLeadId(null)}
          onSuccess={() => { fetchLeads(); setQuickTaskLeadId(null); }}
        />
      )}
    </div>
  );
};

export default CRM;
