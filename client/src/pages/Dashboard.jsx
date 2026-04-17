import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { Line } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Filler } from 'chart.js';
import { FiDollarSign, FiTrendingUp, FiTrendingDown, FiCreditCard, FiBook, FiFileText, FiSearch, FiArrowRight, FiX } from 'react-icons/fi';
import { reportAPI, invoiceAPI } from '../services/api';
import toast from 'react-hot-toast';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Filler);

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResult, setSearchResult] = useState(null);
  const [isSearching, setIsSearching] = useState(false);
  const navigate = useNavigate();
  const { activeCompany } = useSelector((s) => s.company);

  useEffect(() => {
    loadDashboard();
  }, [activeCompany]);

  const loadDashboard = async () => {
    try {
      const res = await reportAPI.getDashboard();
      setData(res.data.data);
    } catch (err) {
      // If no company, data will be empty
      setData({ totalLedgers: 0, totalVouchers: 0, todayTransactions: 0, totalReceivables: 0, totalPayables: 0, cashBalance: 0, bankBalance: 0, monthlyRevenue: [], recentVouchers: [] });
    } finally { setLoading(false); }
  };

  const handleGlobalSearch = async (e) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim()) return;
    
    try {
      setIsSearching(true);
      const res = await invoiceAPI.getAll({ search: searchQuery, limit: 1 });
      if (res.data.data.length > 0) {
        setSearchResult(res.data.data[0]);
      } else {
        toast.error('Galti: Ye bill number nahi mila!');
        setSearchResult(null);
      }
    } catch (err) {
      toast.error('Search karne me error!');
    } finally {
      setIsSearching(false);
    }
  };

  const fmt = (n) => `₹${(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

  if (loading) return <div className="loading-spinner"><div className="spinner"></div></div>;

  const chartData = {
    labels: data?.monthlyRevenue?.map(m => m.month) || [],
    datasets: [{
      label: 'Revenue',
      data: data?.monthlyRevenue?.map(m => m.revenue) || [],
      borderColor: '#0ea5e9',
      backgroundColor: 'rgba(14, 165, 233, 0.15)',
      borderWidth: 3,
      fill: true,
      tension: 0.4,
      pointBackgroundColor: '#ffffff',
      pointBorderColor: '#8b5cf6',
      pointBorderWidth: 2,
      pointRadius: 5,
      pointHoverRadius: 7,
    }],
  };

  const chartOpts = {
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { display: false }, tooltip: { backgroundColor: '#ffffff', titleColor: '#0f172a', bodyColor: '#475569', borderColor: '#e2e8f0', borderWidth: 1, padding: 12, cornerRadius: 8 } },
    scales: {
      x: { grid: { color: 'rgba(0,0,0,0.03)' }, ticks: { color: '#64748b', font: { size: 11 } } },
      y: { grid: { color: 'rgba(0,0,0,0.03)' }, ticks: { color: '#64748b', font: { size: 11 }, callback: v => '₹' + (v/1000) + 'k' } },
    },
  };

  const voucherTypeColors = {
    Sales: { bg: 'var(--success-light)', color: 'var(--success)' },
    Purchase: { bg: 'var(--warning-light)', color: 'var(--warning)' },
    Payment: { bg: 'var(--danger-light)', color: 'var(--danger)' },
    Receipt: { bg: 'var(--info-light)', color: 'var(--info)' },
    Contra: { bg: 'rgba(14,165,233,0.15)', color: '#0ea5e9' },
    Journal: { bg: 'var(--glass)', color: 'var(--text-secondary)' },
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Dashboard</h1>
          <p>Welcome to {activeCompany?.name || 'TallyFlow'}</p>
        </div>
        <div style={{ display: 'flex', gap: '20px', alignItems: 'center', flexWrap: 'wrap', flex: 1, justifyContent: 'flex-end' }}>
          {/* Dashboard Search Bar */}
          <form onSubmit={handleGlobalSearch} className="search-bar" style={{ flex: '1 1 300px', maxWidth: '450px' }}>
            <FiSearch className="search-icon" />
            <input 
              type="text" 
              placeholder="Search Bill No. or Party Name..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ width: '100%', paddingRight: '120px' }}
            />
            <button type="submit" className="btn btn-sm btn-primary" style={{ position: 'absolute', right: '4px', top: '4px', bottom: '4px' }} disabled={isSearching}>
              {isSearching ? '...' : 'Find Bill'}
            </button>
          </form>

          <div className="page-actions">
            <button className="btn btn-primary" onClick={() => navigate('/vouchers/new/Sales')}>+ New Sales</button>
            <button className="btn btn-secondary" onClick={() => navigate('/ledgers')}>+ New Ledger</button>
          </div>
        </div>
      </div>

      {/* Global Search Result Overlay/Section */}
      {searchResult && (
        <div className="card animate-in" style={{ 
          border: '2px solid var(--accent)', 
          background: 'linear-gradient(to right, var(--bg-secondary), var(--bg-tertiary))',
          marginBottom: '24px',
          position: 'relative'
        }}>
          <button className="btn btn-ghost btn-icon" style={{ position: 'absolute', right: '12px', top: '12px' }} onClick={() => setSearchResult(null)}>
            <FiX />
          </button>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>Search Result Found</div>
              <h2 style={{ fontSize: '1.4rem', margin: '4px 0' }}>{searchResult.buyer?.name}</h2>
              <div style={{ display: 'flex', gap: '20px', fontSize: '0.9rem' }}>
                <span><strong>Bill No:</strong> {searchResult.invoiceNumber}</span>
                <span><strong>Date:</strong> {new Date(searchResult.invoiceDate).toLocaleDateString('en-IN')}</span>
                <span><strong>Total:</strong> {fmt(searchResult.grandTotal)}</span>
              </div>
            </div>
            <button className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }} onClick={() => navigate(`/invoices`)}>
              View History <FiArrowRight />
            </button>
          </div>
        </div>
      )}

      <div className="stat-grid">
        <div className="stat-card animate-in" onClick={() => navigate('/reports/balance-sheet')}>
          <div style={{ fontSize: '2.5rem', filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.15))' }}>💰</div>
          <div className="stat-info">
            <div className="stat-label">Cash Balance</div>
            <div className="stat-value">{fmt(data?.cashBalance)}</div>
          </div>
        </div>
        <div className="stat-card animate-in" onClick={() => navigate('/reports/balance-sheet')}>
          <div style={{ fontSize: '2.5rem', filter: 'drop-shadow(0 4px 6px rgba(59,130,246,0.3))' }}>🏦</div>
          <div className="stat-info">
            <div className="stat-label">Bank Balance</div>
            <div className="stat-value">{fmt(data?.bankBalance)}</div>
          </div>
        </div>
        <div className="stat-card animate-in">
          <div style={{ fontSize: '2.5rem', filter: 'drop-shadow(0 4px 6px rgba(245,158,11,0.2))' }}>🪙</div>
          <div className="stat-info">
            <div className="stat-label">Receivables</div>
            <div className="stat-value">{fmt(data?.totalReceivables)}</div>
          </div>
        </div>
        <div className="stat-card animate-in">
          <div style={{ fontSize: '2.5rem', filter: 'drop-shadow(0 4px 6px rgba(239,68,68,0.2))' }}>💸</div>
          <div className="stat-info">
            <div className="stat-label">Payables</div>
            <div className="stat-value">{fmt(data?.totalPayables)}</div>
          </div>
        </div>
      </div>

      <div className="stat-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
        <div className="stat-card animate-in" onClick={() => navigate('/ledgers')}>
          <div className="stat-icon purple"><FiBook /></div>
          <div className="stat-info">
            <div className="stat-label">Total Ledgers</div>
            <div className="stat-value">{data?.totalLedgers || 0}</div>
          </div>
        </div>
        <div className="stat-card animate-in" onClick={() => navigate('/vouchers')}>
          <div className="stat-icon blue"><FiFileText /></div>
          <div className="stat-info">
            <div className="stat-label">Total Vouchers</div>
            <div className="stat-value">{data?.totalVouchers || 0}</div>
          </div>
        </div>
        <div className="stat-card animate-in" onClick={() => navigate('/reports/day-book')}>
          <div className="stat-icon green"><FiFileText /></div>
          <div className="stat-info">
            <div className="stat-label">Today's Transactions</div>
            <div className="stat-value">{data?.todayTransactions || 0}</div>
          </div>
        </div>
      </div>

      <div className="dashboard-grid">
        <div className="card">
          <div className="card-header">
            <div className="card-title">Revenue Trend</div>
            <span className="badge badge-info">Last 6 Months</span>
          </div>
          <div className="chart-container">
            <Line data={chartData} options={chartOpts} />
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <div className="card-title">Recent Transactions</div>
            <button className="btn btn-ghost btn-sm" onClick={() => navigate('/vouchers')}>View All</button>
          </div>
          <ul className="recent-list">
            {(!data?.recentVouchers?.length) ? (
              <div className="empty-state" style={{ padding: '30px' }}>
                <p>No transactions yet</p>
              </div>
            ) : data.recentVouchers.slice(0, 6).map((v) => (
              <li className="recent-item" key={v._id}>
                <div className="type-icon" style={{
                  background: voucherTypeColors[v.voucherType]?.bg || 'var(--glass)',
                  color: voucherTypeColors[v.voucherType]?.color || 'var(--text-secondary)',
                }}>
                  {v.voucherType?.substring(0, 2)}
                </div>
                <div className="item-info">
                  <div className="item-title">{v.voucherNumber}</div>
                  <div className="item-sub">{v.voucherType} • {new Date(v.date).toLocaleDateString('en-IN')}</div>
                </div>
                <div className="item-amount">{fmt(v.amount)}</div>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="card" style={{ marginTop: '0' }}>
        <div className="card-title" style={{ marginBottom: '16px' }}>Quick Actions</div>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <button className="btn" style={{ background: 'var(--success)', color: '#fff', border: 'none' }} onClick={() => navigate(`/vouchers/new/Receipt`)}>
            + Cash In
          </button>
          <button className="btn" style={{ background: 'var(--danger)', color: '#fff', border: 'none' }} onClick={() => navigate(`/vouchers/new/Payment`)}>
            - Cash Out
          </button>
          <button className="btn" style={{ background: 'var(--accent)', color: '#fff', border: 'none' }} onClick={() => navigate(`/vouchers/new/Purchase`)}>
            🛒 Purchase Entry
          </button>
          <button className="btn btn-primary" onClick={() => navigate('/tax-invoice')}>
            + New Sale Bill
          </button>
        </div>
      </div>
    </div>
  );
}
