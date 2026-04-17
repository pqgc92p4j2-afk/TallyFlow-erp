import { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { reportAPI } from '../services/api';
import toast from 'react-hot-toast';

export default function ProfitLoss() {
  const [data, setData] = useState({ incomes: [], expenses: [], totalIncome: 0, totalExpenses: 0, netProfit: 0 });
  const [loading, setLoading] = useState(true);
  const { activeCompany } = useSelector((s) => s.company);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const res = await reportAPI.getProfitLoss();
      setData(res.data.data);
    } catch (err) { toast.error('Failed to load'); }
    finally { setLoading(false); }
  };

  const fmt = (n) => `₹${(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

  if (loading) return <div className="loading-spinner"><div className="spinner"></div></div>;

  return (
    <div>
      <div className="page-header">
        <h1>Profit & Loss Statement</h1>
      </div>

      <div className="card">
        <div className="report-header">
          <h2>{activeCompany?.name}</h2>
          <div className="report-period">Profit & Loss for the period ending {new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}</div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
          {/* Expenses */}
          <div>
            <div className="report-section-title" style={{ color: 'var(--danger)' }}>Expenses</div>
            <table className="data-table" style={{ background: 'transparent' }}>
              <thead><tr><th>Particulars</th><th style={{ textAlign: 'right' }}>Amount</th></tr></thead>
              <tbody>
                {data.expenses.length === 0 ? (
                  <tr><td colSpan="2" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '20px' }}>No expenses</td></tr>
                ) : data.expenses.map((item, i) => (
                  <tr key={i}>
                    <td>
                      <div style={{ fontWeight: 500 }}>{item.ledgerName}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{item.groupName}</div>
                    </td>
                    <td className="amount">{fmt(item.amount)}</td>
                  </tr>
                ))}
                <tr className="total-row">
                  <td>Total Expenses</td>
                  <td className="amount" style={{ fontWeight: 700, fontSize: '1.05rem', color: 'var(--danger)' }}>{fmt(data.totalExpenses)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Income */}
          <div>
            <div className="report-section-title" style={{ color: 'var(--success)' }}>Income</div>
            <table className="data-table" style={{ background: 'transparent' }}>
              <thead><tr><th>Particulars</th><th style={{ textAlign: 'right' }}>Amount</th></tr></thead>
              <tbody>
                {data.incomes.length === 0 ? (
                  <tr><td colSpan="2" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '20px' }}>No income</td></tr>
                ) : data.incomes.map((item, i) => (
                  <tr key={i}>
                    <td>
                      <div style={{ fontWeight: 500 }}>{item.ledgerName}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{item.groupName}</div>
                    </td>
                    <td className="amount">{fmt(item.amount)}</td>
                  </tr>
                ))}
                <tr className="total-row">
                  <td>Total Income</td>
                  <td className="amount" style={{ fontWeight: 700, fontSize: '1.05rem', color: 'var(--success)' }}>{fmt(data.totalIncome)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Net Profit/Loss */}
        <div style={{ 
          marginTop: '24px', padding: '24px', borderRadius: 'var(--radius-lg)', textAlign: 'center',
          background: data.isProfit ? 'var(--success-light)' : 'var(--danger-light)',
          border: `1px solid ${data.isProfit ? 'var(--success)' : 'var(--danger)'}30`,
        }}>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
            {data.isProfit ? 'Net Profit' : 'Net Loss'}
          </div>
          <div style={{ 
            fontSize: '2rem', fontWeight: 800, fontFamily: 'JetBrains Mono',
            color: data.isProfit ? 'var(--success)' : 'var(--danger)',
          }}>
            {fmt(Math.abs(data.netProfit))}
          </div>
        </div>
      </div>
    </div>
  );
}
