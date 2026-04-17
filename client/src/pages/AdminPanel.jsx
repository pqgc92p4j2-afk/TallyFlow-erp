import { useState, useEffect } from 'react';
import { invoiceAPI, customerAPI, reportAPI } from '../services/api';
import { FiUsers, FiFileText, FiDollarSign, FiTrendingUp, FiActivity, FiBarChart2 } from 'react-icons/fi';
import toast from 'react-hot-toast';

export default function AdminPanel() {
  const [stats, setStats] = useState(null);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    try {
      const [invoiceRes, customerRes] = await Promise.all([
        invoiceAPI.getStats(),
        customerAPI.getAll({ limit: 200 }),
      ]);
      setStats(invoiceRes.data.data);
      setCustomers(customerRes.data.data);
    } catch (err) { toast.error('Failed to load admin data'); }
    finally { setLoading(false); }
  };

  const fmt = (n) => `₹${(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 0 })}`;

  if (loading) return <div className="loading-spinner"><div className="spinner"></div></div>;

  return (
    <div>
      <div className="page-header">
        <div><h1>🛡️ Admin Panel</h1><p>Business analytics, customer insight and usage overview</p></div>
      </div>

      {/* Key Metrics */}
      <div className="stat-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
        <div className="stat-card">
          <div className="stat-icon blue"><FiFileText /></div>
          <div className="stat-info"><div className="stat-label">Total Invoices</div><div className="stat-value">{stats?.totalInvoices || 0}</div><div className="stat-change positive">This month: {stats?.thisMonthCount || 0}</div></div>
        </div>
        <div className="stat-card">
          <div className="stat-icon green"><FiTrendingUp /></div>
          <div className="stat-info"><div className="stat-label">Total Revenue</div><div className="stat-value" style={{ fontSize: '1.2rem' }}>{fmt(stats?.totalRevenue)}</div></div>
        </div>
        <div className="stat-card">
          <div className="stat-icon orange"><FiDollarSign /></div>
          <div className="stat-info"><div className="stat-label">Pending Amount</div><div className="stat-value" style={{ fontSize: '1.2rem' }}>{fmt(stats?.totalPending)}</div><div className="stat-change negative">{stats?.pendingInvoices || 0} invoices</div></div>
        </div>
        <div className="stat-card">
          <div className="stat-icon purple"><FiUsers /></div>
          <div className="stat-info"><div className="stat-label">Total Customers</div><div className="stat-value">{customers.length}</div></div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        {/* Top Customers */}
        <div className="card">
          <div className="card-header"><div className="card-title">🏆 Top Customers by Revenue</div></div>
          {stats?.topCustomers?.length > 0 ? (
            <table className="data-table">
              <thead><tr><th>#</th><th>Customer</th><th>GSTIN</th><th style={{ textAlign: 'right' }}>Total Billed</th><th style={{ textAlign: 'center' }}>Bills</th></tr></thead>
              <tbody>
                {stats.topCustomers.map((c, i) => (
                  <tr key={i}>
                    <td style={{ color: i < 3 ? 'var(--warning)' : 'var(--text-muted)', fontWeight: 700 }}>{i + 1}</td>
                    <td style={{ fontWeight: 500 }}>{c.name || 'Unknown'}</td>
                    <td style={{ fontFamily: 'JetBrains Mono', fontSize: '0.75rem', color: 'var(--text-muted)' }}>{c.gstin || '—'}</td>
                    <td className="amount" style={{ color: 'var(--success)', fontWeight: 600 }}>{fmt(c.totalBilled)}</td>
                    <td style={{ textAlign: 'center' }}><span className="badge badge-info">{c.count}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : <div className="empty-state" style={{ padding: '30px' }}><p>No billing data available yet</p></div>}
        </div>

        {/* Customer Usage & Outstanding */}
        <div className="card">
          <div className="card-header"><div className="card-title">📊 Customer Activity & Balances</div></div>
          {customers.length > 0 ? (
            <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
              <table className="data-table">
                <thead><tr><th>Customer</th><th>Last Invoice</th><th style={{ textAlign: 'right' }}>Billed</th><th style={{ textAlign: 'right' }}>Outstanding</th></tr></thead>
                <tbody>
                  {customers.sort((a, b) => (b.totalBilled - b.totalPaid) - (a.totalBilled - a.totalPaid)).map(c => {
                    const outstanding = c.totalBilled - c.totalPaid;
                    return (
                      <tr key={c._id}>
                        <td>
                          <div style={{ fontWeight: 500, fontSize: '0.85rem' }}>{c.name}</div>
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{c.city}, {c.state}</div>
                        </td>
                        <td style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                          {c.lastInvoiceDate ? new Date(c.lastInvoiceDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : '—'}
                        </td>
                        <td className="amount" style={{ fontSize: '0.82rem' }}>{fmt(c.totalBilled)}</td>
                        <td className="amount" style={{ color: outstanding > 0 ? 'var(--danger)' : 'var(--success)', fontWeight: 600 }}>
                          {outstanding > 0 ? fmt(outstanding) : '✓ Clear'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : <div className="empty-state" style={{ padding: '30px' }}><p>No customers added yet</p></div>}
        </div>
      </div>

      {/* Tax Summary */}
      <div className="card" style={{ marginTop: '20px' }}>
        <div className="card-header"><div className="card-title">💰 Tax Collection Summary</div></div>
        <div className="stat-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
          <div style={{ background: 'var(--bg-tertiary)', padding: '20px', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>Total Tax Collected</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, fontFamily: 'JetBrains Mono', color: 'var(--accent-hover)' }}>{fmt(stats?.totalTax)}</div>
          </div>
          <div style={{ background: 'var(--bg-tertiary)', padding: '20px', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>Total Paid by Customers</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, fontFamily: 'JetBrains Mono', color: 'var(--success)' }}>{fmt(stats?.totalPaid)}</div>
          </div>
          <div style={{ background: 'var(--bg-tertiary)', padding: '20px', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>Remaining Balance</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, fontFamily: 'JetBrains Mono', color: 'var(--warning)' }}>{fmt(stats?.totalPending)}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
