import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  CheckSquare, Calendar, Plus, Trash2, CheckCircle2, Circle,
  Search, Edit3, X, Save, AlertTriangle, Loader2, User, Clock, ExternalLink, Filter
} from 'lucide-react';
import { odooService } from '../services/odoo';

const today = () => new Date().toISOString().split('T')[0];

const deadlineStatus = (d) => {
  if (!d) return 'none';
  if (d < today()) return 'overdue';
  if (d === today()) return 'today';
  return 'upcoming';
};

const STATUS_COLOR = {
  overdue:  { bg: '#fff1f2', text: '#dc2626', border: '#fca5a5' },
  today:    { bg: '#fffbeb', text: '#d97706', border: '#fcd34d' },
  upcoming: { bg: '#f0fdf4', text: '#16a34a', border: '#86efac' },
  none:     { bg: '#f8fafc', text: '#64748b', border: '#e2e8f0' },
};

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'open', label: 'Open' },
  { key: 'today', label: 'Today' },
  { key: 'overdue', label: 'Overdue' },
  { key: 'done', label: 'Done' },
];

function StarPriority({ value, onChange }) {
  return (
    <div style={{ display: 'flex', gap: 2 }}>
      {[1, 2, 3].map(n => {
        const filled = (value === '1' && n === 1) || (value === '2' && n <= 2) || (value === '3');
        return (
          <button key={n} onClick={(e) => { e.stopPropagation(); onChange(value === String(n) ? '0' : String(n)); }}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, fontSize: 18,
              color: filled ? '#f59e0b' : '#d1d5db', lineHeight: 1 }}>
            {filled ? '★' : '☆'}
          </button>
        );
      })}
    </div>
  );
}

const EMPTY = { title: '', note: '', deadline: '', priority: '0', assignee_id: '' };

// ─── Form Modal ─────────────────────────────────────────────────────────────
function TodoFormModal({ initial = EMPTY, team = [], currentUserId, onSave, onCancel, saving }) {
  const [form, setForm] = useState({ ...EMPTY, ...initial });
  const titleRef = useRef();
  useEffect(() => { titleRef.current?.focus(); }, []);
  useEffect(() => {
    if (!form.assignee_id && currentUserId && !initial.id) {
        setForm(f => ({ ...f, assignee_id: currentUserId }));
    }
  }, [currentUserId, initial.id]);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  return (
    <div style={modalOverlayStyle} onClick={onCancel}>
      <div style={{ ...modalContentStyle, maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
        <div style={{ padding: '1.25rem', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, background: '#fff', zIndex: 10 }}>
          <h3 style={{ margin: 0, fontWeight: 800, color: '#1e293b' }}>{initial.id ? 'Edit Task' : 'New Task'}</h3>
          <button onClick={onCancel} style={closeBtnStyle}><X size={20}/></button>
        </div>
        <div style={{ padding: '1.5rem' }}>
          <input ref={titleRef} value={form.title} onChange={e => set('title', e.target.value)}
            placeholder="Task Title..."
            style={{ width: '100%', fontSize: 24, fontWeight: 800, color: '#1e293b',
              border: 'none', borderBottom: '2.5px solid #6366f1', paddingBottom: '0.75rem',
              outline: 'none', marginBottom: '1.5rem' }} />
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
            <div>
              <label style={labelStyle}>Assignee</label>
              <select value={form.assignee_id} onChange={e => set('assignee_id', e.target.value)}
                style={selectStyle}>
                {team.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Deadline</label>
              <input type="date" value={form.deadline} onChange={e => set('deadline', e.target.value)}
                style={selectStyle} />
            </div>
            <div>
              <label style={labelStyle}>Priority</label>
              <div style={{ marginTop: 6 }}><StarPriority value={form.priority} onChange={v => set('priority', v)} /></div>
            </div>
          </div>
          
          <label style={labelStyle}>Notes</label>
          <textarea value={form.note} onChange={e => set('note', e.target.value)}
            placeholder="Detailed description..." rows={6}
            style={{ width: '100%', padding: '12px', borderRadius: 12, border: '1.5px solid #e2e8f0', fontSize: 14,
              color: '#475569', outline: 'none', marginTop: 8, resize: 'vertical' }} />
        </div>
        <div style={{ padding: '1rem 1.5rem', background: '#f8fafc', display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', position: 'sticky', bottom: 0, zIndex: 10 }}>
          <button onClick={onCancel} style={cancelBtnStyle}>Cancel</button>
          <button onClick={() => onSave(form)} disabled={saving || !form.title.trim()} style={saveBtnStyle}>
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            {initial.id ? 'Update' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Detail Modal ───────────────────────────────────────────────────────────
function TodoDetailModal({ todo, onEdit, onDelete, onClose, toggling, onToggle }) {
  const status = deadlineStatus(todo.deadline);
  const col = STATUS_COLOR[status];
  const stars = parseInt(todo.priority || '0');

  return (
    <div style={modalOverlayStyle} onClick={onClose}>
      <div style={{ ...modalContentStyle, maxWidth: '650px', maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
        <div style={{ padding: '1.25rem', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, background: '#fff', zIndex: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button onClick={() => onToggle(todo)} disabled={toggling === todo.id}
               style={{ background: 'none', border: 'none', cursor: 'pointer', color: todo.done ? '#10b981' : '#cbd5e1' }}>
              {toggling === todo.id ? <Loader2 size={24} className="animate-spin" /> : todo.done ? <CheckCircle2 size={24} /> : <Circle size={24} />}
            </button>
            <h3 style={{ margin: 0, fontWeight: 800, color: '#1e293b' }}>Task Details</h3>
          </div>
          <button onClick={onClose} style={closeBtnStyle}><X size={20}/></button>
        </div>
        <div style={{ padding: '2rem' }}>
          <h1 style={{ margin: '0 0 1rem', fontSize: 28, fontWeight: 900, color: '#1e293b', textDecoration: todo.done ? 'line-through' : 'none', lineHeight: 1.2 }}>{todo.title}</h1>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.5rem', marginBottom: '2rem' }}>
            <div>
              <label style={labelStyle}>Assignee</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6, fontWeight: 700, color: '#475569' }}>
                <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><User size={16}/></div>
                {todo.assigned_to}
              </div>
            </div>
            {todo.deadline && (
              <div>
                <label style={labelStyle}>Deadline</label>
                <div style={{ background: col.bg, color: col.text, borderRadius: 8, padding: '6px 12px', fontSize: 13, fontWeight: 800, marginTop: 6, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <Calendar size={14}/> {todo.deadline}
                </div>
              </div>
            )}
            <div>
              <label style={labelStyle}>Priority</label>
              <div style={{ marginTop: 6, fontSize: 18, color: '#f59e0b' }}>{'★'.repeat(stars)}{'☆'.repeat(3-stars)}</div>
            </div>
          </div>
          <label style={labelStyle}>Description</label>
          <div style={{ marginTop: 8, padding: '1.5rem', background: '#f8fafc', borderRadius: 20, border: '1px solid #f1f5f9', color: '#334155', fontSize: 16, lineHeight: 1.6, whiteSpace: 'pre-line', minHeight: '150px' }}>
            {todo.note || <span style={{ fontStyle: 'italic', color: '#94a3b8' }}>No description provided.</span>}
          </div>
        </div>
        <div style={{ padding: '1.25rem 2rem', borderTop: '1px solid #f1f5f9', display: 'flex', gap: '1rem', justifyContent: 'flex-end', position: 'sticky', bottom: 0, background: '#fff', zIndex: 10 }}>
          <button onClick={() => { onEdit(todo); onClose(); }} style={{ ...cancelBtnStyle, background: '#eef2ff', color: '#4f46e5', border: 'none', fontWeight: 800 }}>
            <Edit3 size={16} /> Edit
          </button>
          <button onClick={() => { onDelete(todo.id); onClose(); }} style={{ ...cancelBtnStyle, background: '#fff1f2', color: '#dc2626', border: 'none', fontWeight: 800 }}>
            <Trash2 size={16} /> Delete
          </button>
        </div>
      </div>
    </div>
  );
}

const TodoPage = () => {
  const [todos, setTodos] = useState([]);
  const [team, setTeam] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editTodo, setEditTodo] = useState(null);
  const [viewTodo, setViewTodo] = useState(null);
  const [saving, setSaving] = useState(false);
  const [toggling, setToggling] = useState(null);
  const [toast, setToast] = useState(null);
  const [user, setUser] = useState(null);
  
  const [myTasksOnly, setMyTasksOnly] = useState(false);
  const [assigneeId, setAssigneeId] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const entriesPerPage = 25;

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const activeAssigneeId = myTasksOnly ? user?.id : (assigneeId || null);
      const [todoData, teamData] = await Promise.all([
        odooService.getTodos(filter, activeAssigneeId, dateFrom || null, dateTo || null),
        odooService.getTodoTeam(),
      ]);
      setTodos(Array.isArray(todoData) ? todoData : []);
      setTeam(Array.isArray(teamData) ? teamData : []);
      const stored = localStorage.getItem('amyLightsLoginSession');
      if (stored) setUser(JSON.parse(stored).user);
    } catch { showToast('Sync Error', 'error'); }
    finally { setLoading(false); }
  }, [filter, myTasksOnly, assigneeId, dateFrom, dateTo, user?.id]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const filtered = todos.filter(t => !search || t.title.toLowerCase().includes(search.toLowerCase()) || (t.note || '').toLowerCase().includes(search.toLowerCase()));
  
  const totalEntries = filtered.length;
  const totalPages = Math.ceil(totalEntries / entriesPerPage);
  const indexOfLastItem = currentPage * entriesPerPage;
  const indexOfFirstItem = indexOfLastItem - entriesPerPage;
  const currentItems = filtered.slice(indexOfFirstItem, indexOfLastItem);

  const handleCreate = async (form) => {
    setSaving(true);
    try {
      const res = await odooService.createTodo(form);
      if (res?.success) { setTodos(p => [res.data, ...p]); setShowForm(false); showToast('Created'); }
      else showToast('Failed', 'error');
    } catch { showToast('Error', 'error'); } finally { setSaving(false); }
  };

  const handleUpdate = async (form) => {
    setSaving(true);
    try {
      const res = await odooService.updateTodo(editTodo.id, form);
      if (res?.success) { setTodos(p => p.map(t => t.id === editTodo.id ? { ...t, ...res.data } : t)); setEditTodo(null); showToast('Updated'); }
    } catch { showToast('Error', 'error'); } finally { setSaving(false); }
  };

  const handleToggle = async (todo) => {
    setToggling(todo.id);
    try {
      const res = await odooService.updateTodo(todo.id, { done: !todo.done });
      if (res?.success) setTodos(p => p.map(t => t.id === todo.id ? { ...t, done: !todo.done } : t));
    } catch {} finally { setToggling(null); }
  };

  const renderPagination = () => {
    if (totalPages <= 1) return null;
    const pages = [];
    pages.push(<button key="prev" className="page-btn prev" onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))} disabled={currentPage === 1}>Previous</button>);
    
    let startPage = Math.max(1, currentPage - 2);
    let endPage = Math.min(totalPages, startPage + 4);
    if (endPage - startPage < 4) startPage = Math.max(1, endPage - 4);

    for (let i = startPage; i <= endPage; i++) {
      pages.push(
        <button key={i} className={`page-btn ${currentPage === i ? 'active' : ''}`} onClick={() => setCurrentPage(i)}>
          {i}
        </button>
      );
    }
    pages.push(<button key="next" className="page-btn next" onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))} disabled={currentPage === totalPages}>Next</button>);
    return pages;
  };

  return (
    <div className="dt-page">
      {toast && (
        <div style={{ position: 'fixed', top: 24, right: 24, zIndex: 10001, background: toast.type === 'error' ? '#dc2626' : '#10b981', color: '#fff', borderRadius: 14, padding: '14px 24px', fontWeight: 800, fontSize: 14, boxShadow: '0 8px 30px rgba(0,0,0,0.2)' }}>
          {toast.msg}
        </div>
      )}

      <div className="dt-card">
        <div className="dt-toolbar-row" style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center', marginBottom: '1.5rem', paddingBottom: '1rem', borderBottom: '1px solid #f1f5f9' }}>
          <div style={{ display: 'flex', gap: 4, background: '#f8fafc', padding: 4, borderRadius: 12 }}>
            {FILTERS.map(f => (
              <button key={f.key} onClick={() => { setFilter(f.key); setCurrentPage(1); }} style={{ padding: '6px 14px', borderRadius: 9, border: 'none', cursor: 'pointer', background: filter === f.key ? '#fff' : 'transparent', color: filter === f.key ? '#4f46e5' : '#64748b', fontWeight: filter === f.key ? 800 : 600, fontSize: 12, boxShadow: filter === f.key ? '0 2px 6px rgba(0,0,0,0.05)' : 'none' }}>
                {f.label}
              </button>
            ))}
          </div>

          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', padding: '6px 12px', background: myTasksOnly ? '#eef2ff' : '#f8fafc', borderRadius: 10, border: `1.5px solid ${myTasksOnly ? '#6366f1' : '#e2e8f0'}` }}>
             <input type="checkbox" checked={myTasksOnly} onChange={e => { setMyTasksOnly(e.target.checked); setCurrentPage(1); }} style={{ width: 16, height: 16 }} />
             <span style={{ fontSize: 13, fontWeight: 700, color: myTasksOnly ? '#4f46e5' : '#475569' }}>My Tasks</span>
          </label>

          {!myTasksOnly && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={labelStyle}>Assignee</span>
              <select value={assigneeId} onChange={e => { setAssigneeId(e.target.value); setCurrentPage(1); }} style={{ ...selectStyle, width: 'auto', minWidth: 150, marginTop: 0, padding: '6px 12px' }}>
                <option value="">All Team</option>
                {team.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
            </div>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={labelStyle}>Dates</span>
            <input type="date" value={dateFrom} onChange={e => { setDateFrom(e.target.value); setCurrentPage(1); }} style={{ ...selectStyle, width: 'auto', marginTop: 0, padding: '5px 8px' }} />
            <span style={{ color: '#cbd5e1', fontSize: 12 }}>-</span>
            <input type="date" value={dateTo} onChange={e => { setDateTo(e.target.value); setCurrentPage(1); }} style={{ ...selectStyle, width: 'auto', marginTop: 0, padding: '5px 8px' }} />
          </div>

          <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
            <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            <input value={search} onChange={e => { setSearch(e.target.value); setCurrentPage(1); }} placeholder="Search tasks..." style={{ width: '100%', padding: '0.6rem 1rem 0.6rem 2.4rem', borderRadius: 12, border: '1.5px solid #e2e8f0', fontSize: 14, outline: 'none' }} />
          </div>

          <button onClick={() => setShowForm(true)} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'linear-gradient(135deg,#6366f1,#4f46e5)', color: '#fff', border: 'none', borderRadius: 12, padding: '0.65rem 1.25rem', fontSize: 13, fontWeight: 800, cursor: 'pointer', boxShadow: '0 4px 12px rgba(99,102,241,0.2)' }}>
            <Plus size={16} /> New
          </button>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '100px' }}><Loader2 size={40} className="animate-spin" style={{ color: '#6366f1' }} /></div>
        ) : (
          <div className="table-wrapper">
            <table className="products-datatable">
              <thead>
                <tr>
                  <th style={{ width: '330px' }}>Task Title</th>
                  <th style={{ width: '300px' }}>Note</th>
                  <th style={{ width: '120px' }}>Assignee</th>
                  <th style={{ width: '120px' }}>Deadline</th>
                  <th style={{ width: '100px' }}>Priority</th>
                  <th style={{ width: '100px' }} className="text-center">Action</th>
                </tr>
              </thead>
              <tbody>
                {currentItems.map((todo) => {
                  const status = deadlineStatus(todo.deadline);
                  const col = STATUS_COLOR[status];
                  const stars = parseInt(todo.priority || '0');
                  const displayDeadline = todo.deadline ? todo.deadline.split(' ')[0] : null;

                  return (
                    <tr key={todo.id} onClick={() => setViewTodo(todo)} className="row-hover" style={{ opacity: todo.done ? 0.7 : 1 }}>
                      <td className="cell-highlight" style={{ fontWeight: 800, color: todo.done ? '#94a3b8' : '#1e293b', textDecoration: todo.done ? 'line-through' : 'none' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <button 
                            onClick={(e) => { e.stopPropagation(); handleToggle(todo); }} 
                            disabled={toggling === todo.id} 
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: todo.done ? '#10b981' : '#cbd5e1', padding: 0, display: 'flex', alignItems: 'center' }}
                          >
                            {toggling === todo.id ? <Loader2 size={18} className="animate-spin" /> : todo.done ? <CheckCircle2 size={18} /> : <Circle size={18} />}
                          </button>
                          <span>{todo.title}</span>
                        </div>
                      </td>
                      <td className="cell-light" style={{ fontSize: '13px', color: '#64748b' }}>
                        <div style={{ maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{todo.note || '-'}</div>
                      </td>
                      <td className="cell-light">
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <div style={{ width: 24, height: 24, borderRadius: '50%', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <User size={12} color="#64748b" />
                          </div>
                          <span style={{ fontSize: '13px', fontWeight: 600 }}>{todo.assigned_to || '-'}</span>
                        </div>
                      </td>
                      <td className="cell-light">
                        {displayDeadline ? (
                          <span style={{ background: col.bg, color: col.text, padding: '4px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 800, border: `1px solid ${col.border}` }}>
                            {status === 'today' ? 'Today' : displayDeadline}
                          </span>
                        ) : '-'}
                      </td>
                      <td className="cell-light">
                        <div style={{ fontSize: '16px', color: '#f59e0b' }}>{'★'.repeat(stars)}{'☆'.repeat(3 - stars)}</div>
                      </td>
                      <td className="text-center" onClick={(e) => e.stopPropagation()}>
                        <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
                          <button onClick={() => setEditTodo(todo)} style={{ ...iconBtnStyle, background: '#eff6ff', color: '#3b82f6' }}><Edit3 size={14} /></button>
                          <button onClick={async () => { if(window.confirm('Delete this task?')) { await odooService.deleteTodo(todo.id); setTodos(p=>p.filter(x=>x.id!==todo.id)); } }} style={{ ...iconBtnStyle, background: '#fff1f2', color: '#dc2626' }}><Trash2 size={14} /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <div className="datatable-footer dt-flex-between" style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid #f1f5f9' }}>
          <div style={{ fontSize: '13px', color: '#64748b', fontWeight: 600 }}>
            Showing {indexOfFirstItem + 1} to {Math.min(indexOfLastItem, totalEntries)} of {totalEntries} entries
          </div>
          <div className="pagination dt-flex border border-slate-300 rounded overflow-hidden">
            {renderPagination()}
          </div>
        </div>
      </div>

      {showForm && <TodoFormModal team={team} currentUserId={user?.id} onSave={handleCreate} onCancel={() => setShowForm(false)} saving={saving} />}
      {editTodo && <TodoFormModal initial={editTodo} team={team} currentUserId={user?.id} onSave={handleUpdate} onCancel={() => setEditTodo(null)} saving={saving} />}
      {viewTodo && <TodoDetailModal todo={viewTodo} onEdit={setEditTodo} onDelete={async (id) => { if(window.confirm('Delete this task?')) { await odooService.deleteTodo(id); setTodos(p=>p.filter(x=>x.id!==id)); setViewTodo(null); } }} onClose={() => setViewTodo(null)} toggling={toggling} onToggle={handleToggle} />}

      <style>{`
        .animate-spin { animation: spin 1s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes slideIn { from { opacity:0; transform:translateY(-15px); } to { opacity:1; transform:translateY(0); } }
      `}</style>
    </div>
  );
};

const modalOverlayStyle = { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(8px)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' };
const modalContentStyle = { background: '#fff', borderRadius: 28, width: '100%', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', animation: 'slideIn .3s ease-out', overflow: 'hidden' };
const closeBtnStyle = { background: '#f1f5f9', border: 'none', borderRadius: '50%', width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#64748b' };
const cancelBtnStyle = { padding: '0.65rem 1.25rem', borderRadius: 12, border: '1.5px solid #e2e8f0', background: '#fff', color: '#64748b', fontWeight: 800, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 };
const saveBtnStyle = { padding: '0.65rem 1.5rem', borderRadius: 12, border: 'none', background: 'linear-gradient(135deg,#6366f1,#4f46e5)', color: '#fff', fontWeight: 800, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, boxShadow: '0 4px 10px rgba(99,102,241,0.25)' };
const iconBtnStyle = { background: '#f8fafc', border: 'none', borderRadius: 8, width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#94a3b8', transition: 'all .2s' };
const labelStyle = { fontSize: 10, fontWeight: 900, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.05em' };
const selectStyle = { display: 'block', marginTop: 8, width: '100%', padding: '8px 12px', borderRadius: 10, border: '1.5px solid #e2e8f0', fontSize: 13, outline: 'none', background: '#fff', color: '#1e293b', fontWeight: 700 };

export default TodoPage;
