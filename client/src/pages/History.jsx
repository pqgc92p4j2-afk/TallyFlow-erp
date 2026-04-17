import { useState, useEffect } from 'react';
import { reportAPI } from '../services/api';
import { FiSearch, FiFilter, FiCalendar, FiArrowRight, FiInfo } from 'react-icons/fi';
import toast from 'react-hot-toast';

export default function History() {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateRange, setDateRange] = useState({
    startDate: '',
    endDate: ''
  });
  const [typeFilter, setTypeFilter] = useState('all');

  useEffect(() => {
    fetchHistory();
  }, [dateRange, typeFilter]);

  const fetchHistory = async () => {
    try {
      setLoading(true);
      const params = {
        ...dateRange,
        type: typeFilter,
      };
      const res = await reportAPI.getActivityHistory(params);
      setHistory(res.data.data);
    } catch (err) {
      toast.error('Failed to load activity history');
    } finally {
      setLoading(false);
    }
  };

  const filteredHistory = history.filter(item => 
    item.party.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.number.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getTypeColor = (type) => {
    if (type.includes('Invoice')) return '#059669'; // Green
    if (type === 'Receipt') return '#0ea5e9'; // Blue
    if (type === 'Payment') return '#ef4444'; // Red
    if (type === 'Purchase') return '#8b5cf6'; // Purple
    return '#6b7280'; // Gray
  };

  const formatDate = (dateStr) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const formatTime = (dateStr) => {
    const d = new Date(dateStr);
    return d.toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="history-page">
      <div className="page-header">
        <div>
          <h1>🕒 Activity History</h1>
          <p>Complete timeline of bills, payments, and entries</p>
        </div>
      </div>

      <div className="card" style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div className="form-group" style={{ flex: 1, minWidth: '200px', marginBottom: 0 }}>
            <label className="form-label">Search Party or Bill No.</label>
            <div style={{ position: 'relative' }}>
              <FiSearch style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
              <input 
                type="text" 
                className="form-input" 
                style={{ paddingLeft: '40px' }}
                placeholder="Search name, invoice number..." 
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          <div className="form-group" style={{ width: '180px', marginBottom: 0 }}>
            <label className="form-label">Type</label>
            <select 
              className="form-select"
              value={typeFilter}
              onChange={e => setTypeFilter(e.target.value)}
            >
              <option value="all">All Transactions</option>
              <option value="Invoice">Invoices</option>
              <option value="Receipt">Receipts</option>
              <option value="Payment">Payments</option>
              <option value="Purchase">Purchases</option>
            </select>
          </div>

          <div className="form-group" style={{ width: '160px', marginBottom: 0 }}>
            <label className="form-label">Start Date</label>
            <input 
              type="date" 
              className="form-input" 
              value={dateRange.startDate}
              onChange={e => setDateRange({...dateRange, startDate: e.target.value})}
            />
          </div>

          <div className="form-group" style={{ width: '160px', marginBottom: 0 }}>
            <label className="form-label">End Date</label>
            <input 
              type="date" 
              className="form-input" 
              value={dateRange.endDate}
              onChange={e => setDateRange({...dateRange, endDate: e.target.value})}
            />
          </div>

          <button className="btn btn-secondary" onClick={() => {
            setDateRange({ startDate: '', endDate: '' });
            setTypeFilter('all');
            setSearchTerm('');
          }}>Reset</button>
        </div>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table className="table">
          <thead>
            <tr>
              <th>Date & Time</th>
              <th>Type</th>
              <th>Reference No.</th>
              <th>Party / Customer</th>
              <th style={{ textAlign: 'right' }}>Amount</th>
              <th>Mode</th>
              <th style={{ width: '50px' }}></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="7" style={{ textAlign: 'center', padding: '40px' }}>Loading history...</td>
              </tr>
            ) : filteredHistory.length === 0 ? (
              <tr>
                <td colSpan="7" style={{ textAlign: 'center', padding: '40px' }}>No transactions found.</td>
              </tr>
            ) : (
              filteredHistory.map((item) => (
                <tr key={item.id}>
                  <td>
                    <div style={{ fontWeight: 600 }}>{formatDate(item.date)}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{formatTime(item.createdAt)}</div>
                  </td>
                  <td>
                    <span style={{ 
                      padding: '4px 10px', 
                      borderRadius: '100px', 
                      fontSize: '0.75rem', 
                      fontWeight: 600,
                      background: `${getTypeColor(item.type)}20`,
                      color: getTypeColor(item.type),
                      border: `1px solid ${getTypeColor(item.type)}40`
                    }}>
                      {item.type}
                    </span>
                  </td>
                  <td style={{ fontFamily: 'JetBrains Mono', fontSize: '0.9rem' }}>
                    {item.number}
                  </td>
                  <td>
                    <div style={{ fontWeight: 500 }}>{item.party}</div>
                  </td>
                  <td style={{ textAlign: 'right', fontWeight: 700, fontFamily: 'JetBrains Mono' }}>
                    {item.amount.toLocaleString('en-IN', {
                      minimumFractionDigits: 2,
                      style: 'currency',
                      currency: 'INR'
                    })}
                  </td>
                  <td>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      {item.paymentMode || 'N/A'}
                    </div>
                  </td>
                  <td>
                    <button className="btn btn-ghost btn-icon">
                      <FiArrowRight />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
