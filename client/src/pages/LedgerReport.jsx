import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { reportAPI } from '../services/api';
import { FiArrowLeft } from 'react-icons/fi';
import toast from 'react-hot-toast';

export default function LedgerReport() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadData(); }, [id]);

  const loadData = async () => {
    try {
      const res = await reportAPI.getLedgerReport(id);
      setData(res.data.data);
    } catch (err) { toast.error('Failed to load'); }
    finally { setLoading(false); }
  };

  const fmt = (n) => n > 0 ? `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '—';

  if (loading) return <div className="loading-spinner"><div className="spinner"></div></div>;
  if (!data) return <div className="empty-state"><h3>Ledger not found</h3></div>;

  return (
    <div>
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button className="btn btn-ghost btn-icon" onClick={() => navigate(-1)}><FiArrowLeft /></button>
          <div>
            <h1>{data.ledger?.name}</h1>
            <p>{data.ledger?.group?.name} • {data.ledger?.group?.nature}</p>
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Closing Balance</div>
          <div style={{ 
            fontSize: '1.5rem', fontWeight: 700, fontFamily: 'JetBrains Mono',
            color: data.closingBalanceType === 'Dr' ? 'var(--debit-color)' : 'var(--credit-color)',
          }}>
            {fmt(data.closingBalance)} {data.closingBalanceType}
          </div>
        </div>
      </div>

      <div className="card">
        <div className="data-table-wrapper" style={{ border: 'none' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Particulars</th>
                <th>Voucher Type</th>
                <th>Voucher No.</th>
                <th style={{ textAlign: 'right' }}>Debit (₹)</th>
                <th style={{ textAlign: 'right' }}>Credit (₹)</th>
                <th style={{ textAlign: 'right' }}>Balance</th>
              </tr>
            </thead>
            <tbody>
              {data.transactions?.map((t, i) => (
                <tr key={i} style={i === 0 ? { background: 'var(--bg-tertiary)' } : {}}>
                  <td style={{ fontFamily: 'JetBrains Mono', fontSize: '0.82rem' }}>
                    {t.date ? new Date(t.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : '—'}
                  </td>
                  <td style={{ fontWeight: i === 0 ? 600 : 400 }}>{t.particular}</td>
                  <td>{t.voucherType ? <span className="badge badge-default">{t.voucherType}</span> : '—'}</td>
                  <td style={{ fontSize: '0.82rem' }}>{t.voucherNumber || ''}</td>
                  <td className="amount debit">{fmt(t.debit)}</td>
                  <td className="amount credit">{fmt(t.credit)}</td>
                  <td className="amount" style={{ fontWeight: 600, color: t.balanceType === 'Dr' ? 'var(--debit-color)' : 'var(--credit-color)' }}>
                    {fmt(t.balance)} {t.balanceType}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Ledger Details Card */}
      {data.ledger && (
        <div className="card" style={{ marginTop: '20px' }}>
          <div className="card-title" style={{ marginBottom: '16px' }}>Ledger Details</div>
          <div className="form-row">
            <div><span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Opening Balance</span>
              <div style={{ fontFamily: 'JetBrains Mono', fontWeight: 600 }}>
                {fmt(data.ledger.openingBalance)} {data.ledger.openingBalanceType}
              </div>
            </div>
            {data.ledger.gstin && <div><span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>GSTIN</span>
              <div style={{ fontFamily: 'JetBrains Mono' }}>{data.ledger.gstin}</div></div>}
            {data.ledger.address && <div><span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Address</span>
              <div>{data.ledger.address}, {data.ledger.city}</div></div>}
            {data.ledger.interestRate > 0 && <div><span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Interest Rate</span>
              <div>{data.ledger.interestRate}%</div></div>}
          </div>
        </div>
      )}
    </div>
  );
}
