import { useState, useEffect } from 'react';
import { reportAPI } from '../services/api';
import toast from 'react-hot-toast';

export default function DayBook() {
  const [vouchers, setVouchers] = useState([]);
  const [totals, setTotals] = useState({ totalDebit: 0, totalCredit: 0 });
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadData(); }, [date]);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await reportAPI.getDayBook({ date });
      setVouchers(res.data.data);
      setTotals(res.data.totals);
    } catch (err) { toast.error('Failed to load'); }
    finally { setLoading(false); }
  };

  const fmt = (n) => `₹${(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

  const typeColors = {
    Sales: 'badge-success', Purchase: 'badge-warning', Payment: 'badge-danger',
    Receipt: 'badge-info', Contra: 'badge-purple', Journal: 'badge-default',
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Day Book</h1>
          <p>All transactions for the selected date</p>
        </div>
        <input type="date" className="form-input" style={{ maxWidth: '180px' }}
          value={date} onChange={e => setDate(e.target.value)} />
      </div>

      {loading ? <div className="loading-spinner"><div className="spinner"></div></div> : (
        <div className="card">
          <div className="report-header">
            <h2>Day Book</h2>
            <div className="report-period">
              {new Date(date).toLocaleDateString('en-IN', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
              {' • '}{vouchers.length} transaction{vouchers.length !== 1 ? 's' : ''}
            </div>
          </div>

          <div className="data-table-wrapper" style={{ border: 'none' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Voucher No.</th>
                  <th>Type</th>
                  <th>Particulars</th>
                  <th style={{ textAlign: 'right' }}>Debit (₹)</th>
                  <th style={{ textAlign: 'right' }}>Credit (₹)</th>
                </tr>
              </thead>
              <tbody>
                {vouchers.length === 0 ? (
                  <tr><td colSpan="5">
                    <div className="empty-state"><h3>No transactions</h3><p>No vouchers found for this date</p></div>
                  </td></tr>
                ) : (
                  <>
                    {vouchers.map(v => (
                      v.entries.map((e, i) => (
                        <tr key={`${v._id}-${i}`}>
                          {i === 0 && (
                            <>
                              <td rowSpan={v.entries.length} style={{ verticalAlign: 'top', fontWeight: 600 }}>
                                {v.voucherNumber}
                              </td>
                              <td rowSpan={v.entries.length} style={{ verticalAlign: 'top' }}>
                                <span className={`badge ${typeColors[v.voucherType] || 'badge-default'}`}>
                                  {v.voucherType}
                                </span>
                              </td>
                            </>
                          )}
                          <td style={{ paddingLeft: i > 0 ? '24px' : undefined }}>
                            {e.type === 'Dr' ? '' : '  To '}{e.ledger?.name || e.ledgerName}
                          </td>
                          <td className="amount debit">{e.type === 'Dr' ? fmt(e.amount) : ''}</td>
                          <td className="amount credit">{e.type === 'Cr' ? fmt(e.amount) : ''}</td>
                        </tr>
                      ))
                    ))}
                    <tr className="total-row">
                      <td colSpan="3" style={{ fontWeight: 700 }}>Day Total</td>
                      <td className="amount debit" style={{ fontWeight: 700, fontSize: '1rem' }}>{fmt(totals.totalDebit)}</td>
                      <td className="amount credit" style={{ fontWeight: 700, fontSize: '1rem' }}>{fmt(totals.totalCredit)}</td>
                    </tr>
                  </>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
