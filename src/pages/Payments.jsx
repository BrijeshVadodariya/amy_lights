import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Plus, Edit2, Trash2, Search, RefreshCw, CreditCard,
  ChevronLeft, ChevronRight, X, Check
} from 'lucide-react';
import { odooService } from '../services/odoo';
import './Payments.css';

const PAGE_SIZES = [25, 50, 100];

/* ── helpers ──────────────────────────────────────────────── */
const fmtAmount = (amount, currency = '₹') =>
  `${currency} ${Number(amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const PAYMENT_TYPES = [
  { value: 'all',      label: 'All' },
  { value: 'inbound',  label: 'Inbound (Received)' },
  { value: 'outbound', label: 'Outbound (Sent)' },
];

/* ── Add/Edit Modal ───────────────────────────────────────── */
function PaymentModal({ initial, partners, onClose, onSave }) {
  const isEdit = !!initial?.id;
  const [form, setForm] = useState({
    partner_id:   initial?.partner_id || '',
    amount:       initial?.amount     || '',
    payment_type: initial?.payment_type || 'inbound',
    date:         initial?.raw_date   || new Date().toISOString().slice(0, 10),
    reminder:     initial?.raw_reminder || '',
    note:         initial?.note       || '',
    memo:         initial?.memo       || '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.amount || isNaN(Number(form.amount))) {
      setError('Please enter a valid amount.'); return;
    }
    setSaving(true); setError('');
    try {
      const payload = {
        ...form,
        ...(isEdit ? { payment_id: initial.id } : {}),
      };
      await onSave(payload);
      onClose();
    } catch (e) {
      setError(e?.message || 'Failed to save payment.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="pay-modal-backdrop" onClick={onClose}>
      <div className="pay-modal" onClick={e => e.stopPropagation()}>
        <h3>{isEdit ? 'Edit Payment' : 'Add New Payment'}</h3>

        {error && <p style={{ color: '#dc2626', fontSize: '0.82rem', marginBottom: '0.75rem' }}>{error}</p>}

        <div className="pay-modal-field">
          <label>Party Name</label>
          <select value={form.partner_id} onChange={e => set('partner_id', e.target.value)}>
            <option value="">— Select Party —</option>
            {partners.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
          <div className="pay-modal-field">
            <label>Amount (₹)</label>
            <input type="number" min="0" step="0.01" value={form.amount}
              onChange={e => set('amount', e.target.value)} placeholder="0.00" />
          </div>
          <div className="pay-modal-field">
            <label>Type</label>
            <select value={form.payment_type} onChange={e => set('payment_type', e.target.value)}>
              <option value="inbound">Inbound (Received)</option>
              <option value="outbound">Outbound (Sent)</option>
            </select>
          </div>
          <div className="pay-modal-field">
            <label>Payment Date</label>
            <input type="date" value={form.date} onChange={e => set('date', e.target.value)} />
          </div>
          <div className="pay-modal-field">
            <label>Reminder Date</label>
            <input type="date" value={form.reminder} onChange={e => set('reminder', e.target.value)} />
          </div>
        </div>

        <div className="pay-modal-field">
          <label>Memo / Reference</label>
          <input type="text" value={form.memo} onChange={e => set('memo', e.target.value)} placeholder="Optional reference" />
        </div>
        <div className="pay-modal-field">
          <label>Note</label>
          <textarea value={form.note} onChange={e => set('note', e.target.value)} placeholder="Optional note…" />
        </div>

        <div className="pay-modal-actions">
          <button className="btn-cancel-modal" onClick={onClose} disabled={saving}>Cancel</button>
          <button className="btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : isEdit ? 'Update' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Delete Confirm Modal ─────────────────────────────────── */
function DeleteModal({ item, onClose, onConfirm }) {
  const [deleting, setDeleting] = useState(false);
  return (
    <div className="pay-modal-backdrop" onClick={onClose}>
      <div className="pay-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 380 }}>
        <h3>Delete Payment</h3>
        <p className="delete-modal-msg">
          Are you sure you want to delete the payment for <strong>{item.partner_name || 'this record'}</strong>?
          This action cannot be undone.
        </p>
        <div className="pay-modal-actions">
          <button className="btn-cancel-modal" onClick={onClose} disabled={deleting}>Cancel</button>
          <button className="btn-danger" disabled={deleting}
            onClick={async () => { setDeleting(true); await onConfirm(); }}>
            {deleting ? 'Deleting…' : 'Yes, Delete'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════════════════════════ */
export default function Payments({ onNavigate }) {
  const [payments, setPayments]   = useState([]);
  const [total, setTotal]         = useState(0);
  const [loading, setLoading]     = useState(true);
  const [partners, setPartners]   = useState([]);

  // Filters
  const [payType, setPayType]     = useState('all');
  const [dateFrom, setDateFrom]   = useState('');
  const [dateTo, setDateTo]       = useState('');

  // Pagination / search
  const [pageSize, setPageSize]   = useState(25);
  const [page, setPage]           = useState(1);
  const [search, setSearch]       = useState('');

  // Modals
  const [addModal, setAddModal]   = useState(false);
  const [editItem, setEditItem]   = useState(null);
  const [deleteItem, setDeleteItem] = useState(null);

  /* ── Fetch payments ─────────────────────────────────────── */
  const fetchPayments = useCallback(async (resetPage = false) => {
    setLoading(true);
    try {
      const pg = resetPage ? 1 : page;
      if (resetPage) setPage(1);
      const res = await odooService.getPayments({
        limit:        pageSize,
        offset:       (pg - 1) * pageSize,
        payment_type: payType === 'all' ? '' : payType,
        date_from:    dateFrom || '',
        date_to:      dateTo   || '',
      });
      setPayments(res?.payments || res || []);
      setTotal(res?.total_count ?? (res?.payments?.length || 0));
    } catch (e) {
      console.error('Payments fetch error:', e);
      setPayments([]);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, payType, dateFrom, dateTo]);

  /* ── Fetch partners for dropdown ────────────────────────── */
  useEffect(() => {
    odooService.getPartners()
      .then(res => setPartners(Array.isArray(res) ? res : []))
      .catch(() => setPartners([]));
  }, []);

  useEffect(() => { fetchPayments(); }, [page, pageSize]);

  /* ── Client-side search filter ──────────────────────────── */
  const filtered = useMemo(() => {
    if (!search.trim()) return payments;
    const q = search.toLowerCase();
    return payments.filter(p =>
      (p.partner_name || '').toLowerCase().includes(q) ||
      (p.memo         || '').toLowerCase().includes(q) ||
      (p.note         || '').toLowerCase().includes(q) ||
      String(p.amount || '').includes(q)
    );
  }, [payments, search]);

  /* ── Pagination pages ───────────────────────────────────── */
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const pagesArr = useMemo(() => {
    const delta = 2;
    const range = [];
    for (let i = Math.max(1, page - delta); i <= Math.min(totalPages, page + delta); i++) range.push(i);
    return range;
  }, [page, totalPages]);

  /* ── Handlers ───────────────────────────────────────────── */
  const handleReset = () => {
    setPayType('all'); setDateFrom(''); setDateTo('');
    setSearch(''); setPage(1);
    fetchPayments(true);
  };

  const handleApplyFilter = () => fetchPayments(true);

  const handleSave = async (payload) => {
    await odooService.createOrUpdatePayment(payload);
    fetchPayments(true);
  };

  const handleDelete = async () => {
    await odooService.deletePayment(deleteItem.id);
    setDeleteItem(null);
    fetchPayments(true);
  };

  /* ── Start / end of current page ───────────────────────── */
  const rangeStart = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const rangeEnd   = Math.min(page * pageSize, total);

  /* ─────────────────────────────────────────────────────────
     RENDER
  ───────────────────────────────────────────────────────── */
  return (
    <div className="dt-page">
      <div className="dt-card">
        <div className="dt-toolbar-row" style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center', marginBottom: '1.5rem', paddingBottom: '1rem', borderBottom: '1px solid #f1f5f9' }}>
          <h2 style={{ margin: 0, fontWeight: 800, color: '#1e293b', fontSize: '20px', marginRight: 'auto' }}>💳 Payments</h2>
          <div className="dt-toolbar-right">
            <button className="dt-gradient-btn" onClick={() => setAddModal(true)}>
              <Plus size={18} />
              <span>Add Payment</span>
            </button>
          </div>
        </div>

      {/* Table Card */}
      <div className="payments-table-card">

        {/* Toolbar */}
        <div className="table-toolbar">
          <div className="show-entries">
            Show&nbsp;
            <select value={pageSize} onChange={e => { setPageSize(Number(e.target.value)); setPage(1); }}>
              {PAGE_SIZES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            &nbsp;entries
          </div>
          <div className="table-search">
            Search:&nbsp;
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Party name, amount…"
              id="payments-search-input"
            />
          </div>
        </div>

        {/* Table */}
        <div className="payments-table-wrapper">
          {loading ? (
            <div className="payments-loading">
              <RefreshCw size={20} style={{ animation: 'spin 1s linear infinite', marginRight: 8 }} />
              Loading payments…
            </div>
          ) : (
            <table className="products-datatable">
              <thead>
                <tr>
                  <th style={{ width: '50px' }} className="text-center">No</th>
                  <th style={{ width: '250px' }}>Party Name</th>
                  <th style={{ width: '120px', textAlign: 'right' }}>Amount</th>
                  <th style={{ width: '80px' }}>Type</th>
                  <th style={{ width: '100px' }}>Date</th>
                  <th style={{ width: '100px' }}>Reminder</th>
                  <th style={{ width: '200px' }}>Note</th>
                  <th style={{ width: '100px' }} className="text-center">Action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={8}>
                      <div className="payments-empty">
                        <CreditCard size={40} />
                        <p>No payments found.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filtered.map((pay, idx) => (
                    <tr key={pay.id}>
                      <td className="text-center cell-light dt-secondary-text">{(page - 1) * pageSize + idx + 1}</td>
                      <td className="cell-highlight dt-primary-text"
                        onClick={() => onNavigate?.('payment-detail', pay.id)}
                        style={{ cursor: 'pointer' }}>
                        {pay.partner_name || '—'}
                      </td>
                      <td className="cell-highlight dt-primary-text" style={{ textAlign: 'right' }}>{fmtAmount(pay.amount, pay.currency)}</td>
                      <td>
                        <span className={`status-pill ${pay.payment_type === 'inbound' ? 'status-sale' : 'status-draft'}`}>
                          {pay.payment_type === 'inbound' ? 'In' : 'Out'}
                        </span>
                      </td>
                      <td className="cell-light dt-secondary-text">{pay.date || '—'}</td>
                      <td className="cell-light dt-secondary-text">{pay.reminder || '—'}</td>
                      <td className="cell-light dt-secondary-text" style={{ maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {pay.note || '—'}
                      </td>
                      <td className="text-center" onClick={(e) => e.stopPropagation()}>
                        <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
                          <button
                            className="dt-action-btn edit"
                            title="Edit"
                            id={`pay-edit-${pay.id}`}
                            onClick={() => setEditItem(pay)}
                          ><Edit2 size={13} /></button>
                          <button
                            className="dt-action-btn delete"
                            title="Delete"
                            id={`pay-delete-${pay.id}`}
                            onClick={() => setDeleteItem(pay)}
                          ><Trash2 size={13} /></button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        {!loading && total > 0 && (
          <div className="datatable-footer dt-flex-between" style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid #f1f5f9' }}>
            <div style={{ fontSize: '13px', color: '#64748b', fontWeight: 600 }}>
              Showing {rangeStart} to {rangeEnd} of {total} entries
            </div>
            <div className="pagination dt-flex border border-slate-300 rounded overflow-hidden">
              <button className="page-btn prev" disabled={page === 1} onClick={() => setPage(p => p - 1)}>
                Previous
              </button>
              {pagesArr.map(n => (
                <button key={n} className={`page-btn ${n === page ? 'active' : ''}`} onClick={() => setPage(n)}>{n}</button>
              ))}
              <button className="page-btn next" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>
                Next
              </button>
            </div>
          </div>
        )}
      </div>
      </div>

      {/* Add Modal */}
      {addModal && (
        <PaymentModal
          partners={partners}
          onClose={() => setAddModal(false)}
          onSave={handleSave}
        />
      )}

      {/* Edit Modal */}
      {editItem && (
        <PaymentModal
          initial={editItem}
          partners={partners}
          onClose={() => setEditItem(null)}
          onSave={handleSave}
        />
      )}

      {/* Delete Modal */}
      {deleteItem && (
        <DeleteModal
          item={deleteItem}
          onClose={() => setDeleteItem(null)}
          onConfirm={handleDelete}
        />
      )}
    </div>
  );
}
