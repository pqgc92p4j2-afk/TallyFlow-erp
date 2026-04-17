import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { invoiceAPI } from '../services/api';
import { FiSearch, FiFilter, FiEye, FiCheck, FiX, FiCalendar, FiTrendingUp } from 'react-icons/fi';
import toast from 'react-hot-toast';

const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];

export default function InvoiceHistory() {
  const [invoices, setInvoices] = useState([]);
  const [monthlySummary, setMonthlySummary] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  const [searchParams] = useSearchParams();
  const customerFilter = searchParams.get('customer') || '';
  const navigate = useNavigate();

  useEffect(() => { loadInvoices(); }, [selectedMonth, selectedYear, statusFilter, customerFilter]);

  const loadInvoices = async () => {
    setLoading(true);
    try {
      const params = {};
      if (selectedMonth) params.month = selectedMonth;
      if (selectedYear) params.year = selectedYear;
      if (statusFilter) params.status = statusFilter;
      if (customerFilter) params.customer = customerFilter;
      if (search) params.search = search;
      const res = await invoiceAPI.getAll(params);
      setInvoices(res.data.data);
      setMonthlySummary(res.data.monthlySummary || []);
    } catch (err) { toast.error('Failed to load'); }
    finally { setLoading(false); }
  };

  const handleStatusChange = async (id, status) => {
    try {
      await invoiceAPI.updateStatus(id, { status });
      toast.success(`Invoice marked as ${status}`);
      loadInvoices();
    } catch (err) { toast.error('Failed'); }
  };

  const fmt = (n) => `₹${(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

  const statusColors = { draft: 'badge-default', sent: 'badge-info', paid: 'badge-success', cancelled: 'badge-danger', overdue: 'badge-warning' };
  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);

  // Totals
  const totalAmount = invoices.reduce((s, i) => s + (i.status !== 'cancelled' ? i.grandTotal : 0), 0);
  const paidAmount = invoices.filter(i => i.status === 'paid').reduce((s, i) => s + i.grandTotal, 0);

  return (
    <div>
      <div className="page-header">
        <div><h1>📋 Invoice History</h1><p>All saved invoices — filter by month, year, or status</p></div>
        <button className="btn btn-primary" onClick={() => navigate('/tax-invoice')}>+ New Invoice</button>
      </div>

      {/* Monthly Summary Cards */}
      {monthlySummary.length > 0 && (
        <div style={{ display: 'flex', gap: '12px', overflowX: 'auto', marginBottom: '20px', paddingBottom: '4px' }}>
          {monthlySummary.slice(0, 6).map((m, i) => (
            <div key={i} className="stat-card" style={{ minWidth: '160px', flex: '0 0 auto', cursor: 'pointer' }}
              onClick={() => { setSelectedMonth(m._id.month.toString()); setSelectedYear(m._id.year.toString()); }}>
              <div className="stat-info">
                <div className="stat-label" style={{ fontSize: '0.7rem' }}>{months[m._id.month - 1]?.substring(0, 3)} {m._id.year}</div>
                <div className="stat-value" style={{ fontSize: '1.1rem' }}>{m.count}</div>
                <div style={{ fontSize: '0.72rem', color: 'var(--success)', fontFamily: 'JetBrains Mono' }}>{fmt(m.total)}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Info bar */}
      <div className="stat-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', marginBottom: '20px' }}>
        <div className="stat-card"><div className="stat-icon blue"><FiCalendar /></div><div className="stat-info"><div className="stat-label">Bills This Period</div><div className="stat-value" style={{ fontSize: '1.3rem' }}>{invoices.length}</div></div></div>
        <div className="stat-card"><div className="stat-icon green"><FiTrendingUp /></div><div className="stat-info"><div className="stat-label">Total Amount</div><div className="stat-value" style={{ fontSize: '1.3rem' }}>{fmt(totalAmount)}</div></div></div>
        <div className="stat-card"><div className="stat-icon purple"><FiCheck /></div><div className="stat-info"><div className="stat-label">Paid</div><div className="stat-value" style={{ fontSize: '1.3rem' }}>{fmt(paidAmount)}</div></div></div>
      </div>

      {/* Filters */}
      <div className="filter-bar">
        <form onSubmit={(e) => { e.preventDefault(); loadInvoices(); }} className="search-bar">
          <FiSearch className="search-icon" />
          <input type="text" placeholder="Search invoices..." value={search} onChange={e => setSearch(e.target.value)} />
        </form>
        <select className="form-select" style={{ maxWidth: '140px' }} value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)}>
          <option value="">All Months</option>
          {months.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
        </select>
        <select className="form-select" style={{ maxWidth: '110px' }} value={selectedYear} onChange={e => setSelectedYear(e.target.value)}>
          {years.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
        <select className="form-select" style={{ maxWidth: '130px' }} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option value="">All Status</option>
          <option value="draft">Draft</option><option value="sent">Sent</option>
          <option value="paid">Paid</option><option value="overdue">Overdue</option><option value="cancelled">Cancelled</option>
        </select>
      </div>

      {loading ? <div className="loading-spinner"><div className="spinner"></div></div> : (
        <div className="data-table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Invoice No.</th>
                <th>Type</th>
                <th>Date</th>
                <th>Customer</th>
                <th>Tax Type</th>
                <th style={{ textAlign: 'right' }}>Taxable</th>
                <th style={{ textAlign: 'right' }}>Tax</th>
                <th style={{ textAlign: 'right' }}>Grand Total</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {invoices.length === 0 ? (
                <tr><td colSpan="9"><div className="empty-state"><div className="empty-icon">📋</div><h3>No invoices found</h3><p>Create your first invoice</p></div></td></tr>
              ) : invoices.map(inv => (
                <tr key={inv._id}>
                  <td style={{ fontWeight: 600, fontFamily: 'JetBrains Mono', fontSize: '0.82rem' }}>{inv.invoiceNumber}</td>
                  <td>
                    <span className={`badge ${inv.invoiceCategory === 'challan' ? 'badge-default' : inv.invoiceCategory === 'local' ? 'badge-info' : 'badge-primary'}`}>
                      {inv.invoiceCategory === 'challan' ? 'Challan' : inv.invoiceCategory === 'local' ? 'Estimate' : 'Tax Inv'}
                    </span>
                  </td>
                  <td style={{ fontFamily: 'JetBrains Mono', fontSize: '0.8rem' }}>{new Date(inv.invoiceDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                  <td>
                    <div style={{ fontWeight: 500 }}>{inv.buyer?.name || '—'}</div>
                    {inv.buyer?.gstin && <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono' }}>{inv.buyer.gstin}</div>}
                  </td>
                  <td><span className={`badge ${inv.taxType === 'interState' ? 'badge-warning' : 'badge-info'}`}>
                    {inv.taxType === 'interState' ? 'IGST' : 'CGST+SGST'}
                  </span></td>
                  <td className="amount">{fmt(inv.totalBeforeTax)}</td>
                  <td className="amount">{fmt(inv.totalTax)}</td>
                  <td className="amount" style={{ fontWeight: 700, fontSize: '0.95rem' }}>{fmt(inv.grandTotal)}</td>
                  <td><span className={`badge ${statusColors[inv.status]}`}>{inv.status}</span></td>
                  <td>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      <button className="btn btn-ghost btn-icon" title="Share on WhatsApp" onClick={() => {
                        const url = `https://wa.me/?text=Hello, your ${inv.invoiceCategory === 'challan' ? 'Delivery Challan' : 'bill'} ${inv.invoiceNumber} for Rs.${inv.grandTotal} is ready.`;
                        window.open(url, '_blank');
                      }} style={{ color: '#25D366' }}>
                        <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>
                      </button>
                      {inv.status === 'draft' && <button className="btn btn-ghost btn-icon" title="Mark Paid" onClick={() => handleStatusChange(inv._id, 'paid')} style={{ color: 'var(--success)' }}><FiCheck /></button>}
                      {inv.status !== 'cancelled' && inv.status !== 'paid' && <button className="btn btn-ghost btn-icon" title="Cancel" onClick={() => handleStatusChange(inv._id, 'cancelled')} style={{ color: 'var(--danger)' }}><FiX /></button>}
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
