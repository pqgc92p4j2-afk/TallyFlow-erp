import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ledgerAPI, groupAPI } from '../services/api';
import { FiPlus, FiSearch, FiEdit2, FiTrash2, FiEye } from 'react-icons/fi';
import toast from 'react-hot-toast';

export default function LedgersPage() {
  const [ledgers, setLedgers] = useState([]);
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterGroup, setFilterGroup] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({
    name: '', group: '', openingBalance: 0, openingBalanceType: 'Dr',
    address: '', city: '', state: '', phone: '', email: '', gstin: '',
    billWiseTracking: false, creditDays: 0, interestRate: 0,
    bankName: '', accountNumber: '', ifscCode: '',
  });
  const navigate = useNavigate();

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const [ledRes, grpRes] = await Promise.all([ledgerAPI.getAll(), groupAPI.getAll()]);
      setLedgers(ledRes.data.data);
      setGroups(grpRes.data.data);
    } catch (err) { toast.error('Failed to load data'); }
    finally { setLoading(false); }
  };

  const filtered = ledgers.filter(l => {
    if (search && !l.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterGroup && l.group?._id !== filterGroup) return false;
    return true;
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        await ledgerAPI.update(editingId, form);
        toast.success('Ledger updated');
      } else {
        await ledgerAPI.create(form);
        toast.success('Ledger created');
      }
      setShowModal(false);
      resetForm();
      loadData();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to save'); }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Delete ledger "${name}"?`)) return;
    try {
      await ledgerAPI.delete(id);
      toast.success('Ledger deleted');
      loadData();
    } catch (err) { toast.error(err.response?.data?.message || 'Cannot delete'); }
  };

  const openEdit = (ledger) => {
    setForm({
      name: ledger.name, group: ledger.group?._id || '', openingBalance: ledger.openingBalance,
      openingBalanceType: ledger.openingBalanceType, address: ledger.address || '',
      city: ledger.city || '', state: ledger.state || '', phone: ledger.phone || '',
      email: ledger.email || '', gstin: ledger.gstin || '', billWiseTracking: ledger.billWiseTracking,
      creditDays: ledger.creditDays || 0, interestRate: ledger.interestRate || 0,
      bankName: ledger.bankName || '', accountNumber: ledger.accountNumber || '', ifscCode: ledger.ifscCode || '',
    });
    setEditingId(ledger._id);
    setShowModal(true);
  };

  const resetForm = () => {
    setForm({ name: '', group: '', openingBalance: 0, openingBalanceType: 'Dr', address: '', city: '', state: '', phone: '', email: '', gstin: '', billWiseTracking: false, creditDays: 0, interestRate: 0, bankName: '', accountNumber: '', ifscCode: '' });
    setEditingId(null);
  };

  const fmt = (n) => `₹${(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

  if (loading) return <div className="loading-spinner"><div className="spinner"></div></div>;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Ledgers</h1>
          <p>Manage your accounts — customers, suppliers, expenses, income, banks</p>
        </div>
        <button className="btn btn-primary" onClick={() => { resetForm(); setShowModal(true); }}>
          <FiPlus /> New Ledger
        </button>
      </div>

      <div className="filter-bar">
        <div className="search-bar">
          <FiSearch className="search-icon" />
          <input type="text" placeholder="Search ledgers..." value={search}
            onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="form-select" style={{ maxWidth: '200px' }} value={filterGroup}
          onChange={e => setFilterGroup(e.target.value)}>
          <option value="">All Groups</option>
          {groups.map(g => <option key={g._id} value={g._id}>{g.name}</option>)}
        </select>
        <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
          {filtered.length} ledger{filtered.length !== 1 ? 's' : ''}
        </span>
      </div>

      <div className="data-table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              <th>Ledger Name</th>
              <th>Group</th>
              <th>Opening Balance</th>
              <th>Current Balance</th>
              <th>GSTIN</th>
              <th style={{ width: '120px' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan="6">
                <div className="empty-state" style={{ padding: '40px' }}>
                  <div className="empty-icon">📒</div>
                  <h3>No ledgers found</h3>
                  <p>Create your first ledger to start accounting</p>
                </div>
              </td></tr>
            ) : filtered.map(l => (
              <tr key={l._id}>
                <td>
                  <span className="clickable" onClick={() => navigate(`/reports/ledger/${l._id}`)}
                    style={{ fontWeight: 500, color: 'var(--accent-hover)' }}>
                    {l.name}
                  </span>
                </td>
                <td><span className="badge badge-default">{l.group?.name || '—'}</span></td>
                <td className={`amount ${l.openingBalanceType === 'Dr' ? 'debit' : 'credit'}`}>
                  {fmt(l.openingBalance)} {l.openingBalanceType}
                </td>
                <td className={`amount ${l.currentBalanceType === 'Dr' ? 'debit' : 'credit'}`}
                  style={{ fontWeight: 600 }}>
                  {fmt(l.currentBalance)} {l.currentBalanceType}
                </td>
                <td style={{ color: 'var(--text-muted)', fontSize: '0.82rem', fontFamily: 'JetBrains Mono' }}>
                  {l.gstin || '—'}
                </td>
                <td>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button className="btn btn-ghost btn-icon" onClick={() => navigate(`/reports/ledger/${l._id}`)}
                      title="View Report"><FiEye /></button>
                    <button className="btn btn-ghost btn-icon" onClick={() => openEdit(l)}
                      title="Edit"><FiEdit2 /></button>
                    <button className="btn btn-ghost btn-icon" onClick={() => handleDelete(l._id, l.name)}
                      title="Delete" style={{ color: 'var(--danger)' }}><FiTrash2 /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingId ? 'Edit Ledger' : 'Create Ledger'}</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Ledger Name *</label>
                    <input type="text" className="form-input" value={form.name}
                      onChange={e => setForm({ ...form, name: e.target.value })} required autoFocus
                      placeholder="e.g. Rahul & Associates" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Under Group *</label>
                    <select className="form-select" value={form.group}
                      onChange={e => setForm({ ...form, group: e.target.value })} required>
                      <option value="">Select Group</option>
                      {groups.map(g => <option key={g._id} value={g._id}>{g.name} ({g.nature})</option>)}
                    </select>
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Opening Balance</label>
                    <input type="number" className="form-input" value={form.openingBalance}
                      onChange={e => setForm({ ...form, openingBalance: parseFloat(e.target.value) || 0 })} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Type</label>
                    <select className="form-select" value={form.openingBalanceType}
                      onChange={e => setForm({ ...form, openingBalanceType: e.target.value })}>
                      <option value="Dr">Debit (Dr)</option>
                      <option value="Cr">Credit (Cr)</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">GSTIN</label>
                    <input type="text" className="form-input" value={form.gstin}
                      onChange={e => setForm({ ...form, gstin: e.target.value })} maxLength={15}
                      placeholder="29ABCDE1234F1Z5" />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Address</label>
                    <input type="text" className="form-input" value={form.address}
                      onChange={e => setForm({ ...form, address: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">City</label>
                    <input type="text" className="form-input" value={form.city}
                      onChange={e => setForm({ ...form, city: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">State</label>
                    <input type="text" className="form-input" value={form.state}
                      onChange={e => setForm({ ...form, state: e.target.value })} />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Phone</label>
                    <input type="text" className="form-input" value={form.phone}
                      onChange={e => setForm({ ...form, phone: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Email</label>
                    <input type="email" className="form-input" value={form.email}
                      onChange={e => setForm({ ...form, email: e.target.value })} />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Credit Days</label>
                    <input type="number" className="form-input" value={form.creditDays}
                      onChange={e => setForm({ ...form, creditDays: parseInt(e.target.value) || 0 })} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Interest Rate (%)</label>
                    <input type="number" className="form-input" value={form.interestRate} step="0.01"
                      onChange={e => setForm({ ...form, interestRate: parseFloat(e.target.value) || 0 })} />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Bank Name</label>
                    <input type="text" className="form-input" value={form.bankName}
                      onChange={e => setForm({ ...form, bankName: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Account Number</label>
                    <input type="text" className="form-input" value={form.accountNumber}
                      onChange={e => setForm({ ...form, accountNumber: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">IFSC Code</label>
                    <input type="text" className="form-input" value={form.ifscCode}
                      onChange={e => setForm({ ...form, ifscCode: e.target.value })} />
                  </div>
                </div>
                <label className="form-checkbox">
                  <input type="checkbox" checked={form.billWiseTracking}
                    onChange={e => setForm({ ...form, billWiseTracking: e.target.checked })} />
                  Enable Bill-wise Tracking
                </label>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">{editingId ? 'Update' : 'Create'} Ledger</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
