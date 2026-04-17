import { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { reportAPI } from '../services/api';
import toast from 'react-hot-toast';

export default function BalanceSheet() {
  const [data, setData] = useState({ assets: [], liabilities: [], totalAssets: 0, totalLiabilities: 0 });
  const [loading, setLoading] = useState(true);
  const { activeCompany } = useSelector((s) => s.company);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const res = await reportAPI.getBalanceSheet();
      setData(res.data.data);
    } catch (err) { toast.error('Failed to load'); }
    finally { setLoading(false); }
  };

  const fmt = (n) => `₹${(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

  if (loading) return <div className="loading-spinner"><div className="spinner"></div></div>;

  return (
    <div>
      <div className="page-header">
        <h1>Balance Sheet</h1>
      </div>

      <div className="card">
        <div className="report-header">
          <h2>{activeCompany?.name}</h2>
          <div className="report-period">Balance Sheet as on {new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}</div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
          {/* Liabilities */}
          <div>
            <div className="report-section-title">Liabilities & Capital</div>
            <table className="data-table" style={{ background: 'transparent' }}>
              <thead><tr><th>Particulars</th><th style={{ textAlign: 'right' }}>Amount</th></tr></thead>
              <tbody>
                {data.liabilities.length === 0 ? (
                  <tr><td colSpan="2" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '20px' }}>No entries</td></tr>
                ) : data.liabilities.map((item, i) => (
                  <tr key={i}>
                    <td>
                      <div style={{ fontWeight: 500 }}>{item.ledgerName}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{item.groupName}</div>
                    </td>
                    <td className="amount">{fmt(item.amount)}</td>
                  </tr>
                ))}
                <tr className="total-row">
                  <td style={{ fontWeight: 700 }}>Total Liabilities</td>
                  <td className="amount" style={{ fontWeight: 700, fontSize: '1.1rem' }}>{fmt(data.totalLiabilities)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Assets */}
          <div>
            <div className="report-section-title">Assets</div>
            <table className="data-table" style={{ background: 'transparent' }}>
              <thead><tr><th>Particulars</th><th style={{ textAlign: 'right' }}>Amount</th></tr></thead>
              <tbody>
                {data.assets.length === 0 ? (
                  <tr><td colSpan="2" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '20px' }}>No entries</td></tr>
                ) : data.assets.map((item, i) => (
                  <tr key={i}>
                    <td>
                      <div style={{ fontWeight: 500 }}>{item.ledgerName}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{item.groupName}</div>
                    </td>
                    <td className="amount">{fmt(item.amount)}</td>
                  </tr>
                ))}
                <tr className="total-row">
                  <td style={{ fontWeight: 700 }}>Total Assets</td>
                  <td className="amount" style={{ fontWeight: 700, fontSize: '1.1rem' }}>{fmt(data.totalAssets)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {data.difference !== 0 && (
          <div style={{ textAlign: 'center', padding: '16px', marginTop: '16px', background: 'var(--warning-light)', borderRadius: 'var(--radius-md)', color: 'var(--warning)' }}>
            Difference: {fmt(Math.abs(data.difference))} ({data.difference > 0 ? 'Assets exceed Liabilities' : 'Liabilities exceed Assets'})
          </div>
        )}
      </div>
    </div>
  );
}
