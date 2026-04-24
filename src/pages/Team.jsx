import React, { useState, useEffect } from 'react';
import { 
  UserPlus, Mail, Shield, Search, 
  RefreshCw, X, Eye, EyeOff, Edit2
} from 'lucide-react';
import { odooService } from '../services/odoo';
import Loader from '../components/Loader';
import './Products.css'; 
import './Team.css';

const Team = () => {
  const [team, setTeam] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState('create'); // 'create' | 'edit'
  const [selectedUser, setSelectedUser] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const [formData, setFormData] = useState({ name: '', email: '', password: '' });

  // ── Fetch team list ──────────────────────────────────────────────────────
  const fetchTeam = async () => {
    setLoading(true);
    try {
      const data = await odooService.getTeam();
      setTeam(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to fetch team:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchTeam(); }, []);

  // ── Open Create Modal ────────────────────────────────────────────────────
  const handleOpenCreate = () => {
    setModalType('create');
    setFormData({ name: '', email: '', password: '' });
    setSelectedUser(null);
    setErrorMsg('');
    setShowPassword(false);
    setShowModal(true);
  };

  // ── Open Edit Modal, pre-populate with existing data ────────────────────
  const handleOpenEdit = (u) => {
    setModalType('edit');
    setSelectedUser(u);
    setFormData({
      name: u.name || '',
      email: u.email || u.login || '',
      password: '',           // Always blank for security
    });
    setErrorMsg('');
    setShowPassword(false);
    setShowModal(true);
  };

  // ── Submit (Create OR Edit) ──────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg('');
    try {
      let res;

      if (modalType === 'create') {
        res = await odooService.createUser({
          name: formData.name.trim(),
          login: formData.email.trim(),
          password: formData.password,
        });

        if (res.success) {
          // Optimistic: add to list immediately with data returned from API
          const newUser = res.data || {
            id: Date.now(),
            name: formData.name,
            email: formData.email,
            login: formData.email,
            last_login: 'Never',
            active: true,
          };
          setTeam(prev => [newUser, ...prev]);
          setShowModal(false);
        } else {
          setErrorMsg(res.error?.message || 'Failed to create user');
        }

      } else {
        res = await odooService.updateUser({
          user_id: selectedUser.id,
          name: formData.name.trim(),
          login: formData.email.trim(),
          ...(formData.password ? { password: formData.password } : {}),
        });

        if (res.success) {
          // Optimistic: update the existing row in list with returned data
          const updated = res.data || {
            ...selectedUser,
            name: formData.name,
            email: formData.email,
            login: formData.email,
          };
          setTeam(prev => prev.map(u => u.id === selectedUser.id ? { ...u, ...updated } : u));
          setShowModal(false);
        } else {
          setErrorMsg(res.error?.message || 'Failed to update user');
        }
      }
    } catch (err) {
      setErrorMsg('A network error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Filter ───────────────────────────────────────────────────────────────
  const filteredTeam = team.filter(u =>
    (u.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (u.email || u.login || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="dt-page team-container">
      <div className="dt-card">
        <div className="dt-toolbar-row">
          <div className="dt-toolbar-left">
            <div className="dt-flex dt-search-box">
              <Search size={18} className="text-slate-400" />
              <input
                type="text"
                className="search-input"
                placeholder="Search team members..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          <div className="dt-toolbar-right">
            <button className="btn-ui primary h-[42px] px-6" onClick={handleOpenCreate}>
              <UserPlus size={18} />
              <span>Add Team Member</span>
            </button>
          </div>
        </div>

        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center">
            <Loader message="Loading Team..." />
          </div>
        ) : (
          <div className="table-wrapper">
            <table className="products-datatable">
              <thead>
                <tr>
                  <th style={{ width: '300px' }}>Member</th>
                  <th style={{ width: '250px' }}>Email / Login</th>
                  <th style={{ width: '150px' }}>Last Login</th>
                  <th style={{ width: '120px' }}>Status</th>
                  <th className="text-center" style={{ width: '100px' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredTeam.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                    <td>
                      <div className="team-member-cell">
                        <div className="user-card-avatar" style={{ background: '#eff6ff', color: '#2563eb' }}>
                          {(u.name || '?').charAt(0).toUpperCase()}
                        </div>
                        <div className="team-member-info">
                          <span style={{ fontWeight: 700, color: '#0f172a', fontSize: '14px' }}>{u.name}</span>
                          <span className="role-badge"><Shield size={10} /> Portal Staff</span>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="flex items-center gap-2 text-slate-600">
                        <Mail size={14} className="text-slate-400" />
                        {u.email || u.login}
                      </div>
                    </td>
                    <td className="text-slate-500 text-[13px]">{u.last_login}</td>
                    <td>
                      {u.active
                        ? <span className="badge badge-success">Active</span>
                        : <span className="badge badge-error">Inactive</span>}
                    </td>
                    <td className="text-center">
                      <button
                        className="action-btn-circle"
                        title="Edit Member"
                        onClick={(e) => { e.stopPropagation(); handleOpenEdit(u); }}
                      >
                        <Edit2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredTeam.length === 0 && !loading && (
                  <tr>
                    <td colSpan="5" className="text-center py-20 text-slate-400">
                      {team.length === 0 ? 'No team members yet. Click "Add Team Member" to get started.' : 'No results match your search.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Create / Edit Modal ──────────────────────────────────────────── */}
      {showModal && (
        <div className="modal-backdrop" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>

            {/* Header */}
            <div className="modal-header">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-xl text-white ${modalType === 'create' ? 'bg-blue-600' : 'bg-emerald-600'}`}>
                  {modalType === 'create' ? <UserPlus size={20} /> : <Edit2 size={20} />}
                </div>
                <h2 className="text-lg font-bold text-slate-800">
                  {modalType === 'create' ? 'Add Team Member' : 'Edit Team Member'}
                </h2>
              </div>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                <X size={20} className="text-slate-500" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="modal-body" autoComplete="off">

              {/* Error Banner */}
              {errorMsg && (
                <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm font-medium">
                  {errorMsg}
                </div>
              )}

              <div className="form-group">
                <label className="form-label">Full Name</label>
                <div className="form-input-wrapper">
                  <input
                    type="text"
                    required
                    autoFocus
                    className="form-input"
                    placeholder="e.g. John Doe"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Email / Login</label>
                <div className="form-input-wrapper">
                  <input
                    type="text"
                    required
                    autoComplete="off"
                    className="form-input"
                    placeholder="Email or Phone number"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">
                  {modalType === 'create' ? 'Password' : 'New Password'}
                  {modalType === 'edit' && (
                    <span className="ml-2 text-[11px] font-normal text-slate-400">(leave blank to keep current)</span>
                  )}
                </label>
                <div className="form-input-wrapper">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required={modalType === 'create'}
                    autoComplete="new-password"
                    className="form-input"
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  />
                  <button type="button" className="password-toggle" onClick={() => setShowPassword(p => !p)}>
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" onClick={() => setShowModal(false)} className="btn-modal btn-modal-cancel">
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={`btn-modal btn-modal-submit ${modalType === 'edit' ? 'bg-emerald-600 hover:bg-emerald-700' : ''}`}
                  style={modalType === 'edit' ? { background: '#059669' } : {}}
                >
                  {isSubmitting ? (
                    <><RefreshCw size={18} className="animate-spin" /><span>Processing...</span></>
                  ) : (
                    <span>{modalType === 'create' ? 'Create Portal User' : 'Save Changes'}</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Team;
