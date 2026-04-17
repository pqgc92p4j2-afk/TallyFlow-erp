import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { reportAPI } from '../services/api';
import toast from 'react-hot-toast';

export default function TrialBalance() {
  const [data, setData] = useState([]);
  const [totals, setTotals] = useState({ totalDebit: 0, totalCredit: 0 });
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { activeCompany } = useSelector((s) => s.company);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const res = await reportAPI.getTrialBalance();
      setData(res.data.data);
      setTotals(res.data.totals);
    } catch (err) { toast.error('Failed to load'); }
    finally { setLoading(false); }
  };

  const fmt = (n) => n > 0 ? `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '—';

  if (loading) return <div className="loading-spinner"><div className="spinner"></div></div>;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Trial Balance</h1>
          <p>{activeCompany?.name}</p>
        </div>
      </div>

      <div className="card">
        <div className="report-header">
          <h2>{activeCompany?.name}</h2>
          <div className="report-period">Trial Balance as on {new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}</div>
        </div>

        <div className="data-table-wrapper" style={{ border: 'none' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Particulars</th>
                <th>Group</th>
                <th style={{ textAlign: 'right' }}>Debit (₹)</th>
                <th style={{ textAlign: 'right' }}>Credit (₹)</th>
              </tr>
            </thead>
            <tbody>
              {data.length === 0 ? (
                <tr><td colSpan="4"><div className="empty-state"><h3>No data</h3><p>Enter some vouchers first</p></div></td></tr>
              ) : data.map((item, i) => (
                <tr key={i} className="clickable" onClick={() => navigate(`/reports/ledger/${item.ledgerId}`)}>
                  <td style={{ fontWeight: 500 }}>{item.ledgerName}</td>
                  <td><span className="badge badge-default">{item.groupName}</span></td>
                  <td className="amount debit">{fmt(item.debit)}</td>
                  <td className="amount credit">{fmt(item.credit)}</td>
                </tr>
              ))}
              {data.length > 0 && (
                <tr className="total-row">
                  <td colSpan="2" style={{ fontWeight: 700 }}>Total</td>
                  <td className="amount debit" style={{ fontWeight: 700, fontSize: '1rem' }}>{fmt(totals.totalDebit)}</td>
                  <td className="amount credit" style={{ fontWeight: 700, fontSize: '1rem' }}>{fmt(totals.totalCredit)}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
