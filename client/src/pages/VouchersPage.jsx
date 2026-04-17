import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { voucherAPI } from '../services/api';
import { FiPlus, FiSearch, FiEye, FiTrash2, FiFilter } from 'react-icons/fi';
import toast from 'react-hot-toast';

export default function VouchersPage() {
  const [vouchers, setVouchers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [total, setTotal] = useState(0);
  const navigate = useNavigate();

  useEffect(() => { loadVouchers(); }, [typeFilter]);

  const loadVouchers = async () => {
    setLoading(true);
    try {
      const params = {};
      if (typeFilter) params.type = typeFilter;
      if (search) params.search = search;
      const res = await voucherAPI.getAll(params);
      setVouchers(res.data.data);
      setTotal(res.data.total);
    } catch (err) { toast.error('Failed to load'); }
    finally { setLoading(false); }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    loadVouchers();
  };

  const handleCancel = async (id) => {
    if (!window.confirm('Cancel this voucher?')) return;
    try {
      await voucherAPI.cancel(id);
      toast.success('Voucher cancelled');
      loadVouchers();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  const fmt = (n) => `₹${(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

  const typeColors = {
    Sales: 'badge-success', Purchase: 'badge-warning', Payment: 'badge-danger',
    Receipt: 'badge-info', Contra: 'badge-purple', Journal: 'badge-default',
    'Credit Note': 'badge-info', 'Debit Note': 'badge-danger',
  };

  const voucherTypes = ['Payment', 'Receipt', 'Sales', 'Purchase', 'Contra', 'Journal', 'Credit Note', 'Debit Note'];

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Vouchers</h1>
          <p>All accounting entries — {total} total</p>
        </div>
        <div className="page-actions">
          {['Sales', 'Purchase', 'Payment', 'Receipt'].map(type => (
            <button key={type} className="btn btn-secondary btn-sm"
              onClick={() => navigate(`/vouchers/new/${type}`)}>
              + {type}
            </button>
          ))}
        </div>
      </div>

      <div className="filter-bar">
        <form onSubmit={handleSearch} className="search-bar">
          <FiSearch className="search-icon" />
          <input type="text" placeholder="Search vouchers..." value={search}
            onChange={e => setSearch(e.target.value)} />
        </form>
        <select className="form-select" style={{ maxWidth: '180px' }} value={typeFilter}
          onChange={e => setTypeFilter(e.target.value)}>
          <option value="">All Types</option>
          {voucherTypes.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>

      {/* Voucher Type Quick Tabs */}
      <div className="tabs" style={{ marginBottom: '20px', overflowX: 'auto' }}>
        <button className={`tab ${!typeFilter ? 'active' : ''}`} onClick={() => setTypeFilter('')}>All</button>
        {voucherTypes.map(t => (
          <button key={t} className={`tab ${typeFilter === t ? 'active' : ''}`}
            onClick={() => setTypeFilter(t)}>{t}</button>
        ))}
      </div>

      {loading ? <div className="loading-spinner"><div className="spinner"></div></div> : (
        <div className="data-table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Voucher No.</th>
                <th>Type</th>
                <th>Particulars</th>
                <th>Amount</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {vouchers.length === 0 ? (
                <tr><td colSpan="6">
                  <div className="empty-state" style={{ padding: '40px' }}>
                    <div className="empty-icon">📄</div>
                    <h3>No vouchers found</h3>
                    <p>Create your first voucher entry</p>
                    <button className="btn btn-primary" onClick={() => navigate('/vouchers/new/Sales')}>
                      + Create Voucher
                    </button>
                  </div>
                </td></tr>
              ) : vouchers.map(v => (
                <tr key={v._id}>
                  <td style={{ fontFamily: 'JetBrains Mono', fontSize: '0.82rem' }}>
                    {new Date(v.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </td>
                  <td style={{ fontWeight: 600 }}>{v.voucherNumber}</td>
                  <td><span className={`badge ${typeColors[v.voucherType] || 'badge-default'}`}>{v.voucherType}</span></td>
                  <td>
                    {v.entries?.slice(0, 2).map((e, i) => (
                      <span key={i} style={{ fontSize: '0.82rem' }}>
                        {e.ledger?.name || e.ledgerName}{i < Math.min(v.entries.length, 2) - 1 ? ' → ' : ''}
                      </span>
                    ))}
                    {v.narration && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{v.narration}</div>}
                  </td>
                  <td className="amount" style={{ fontWeight: 700, fontSize: '0.95rem' }}>{fmt(v.amount)}</td>
                  <td>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      <button className="btn btn-ghost btn-icon" title="Cancel Voucher"
                        onClick={() => handleCancel(v._id)} style={{ color: 'var(--danger)' }}>
                        <FiTrash2 />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
