import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ledgerAPI, voucherAPI } from '../services/api';
import { FiPlus, FiTrash2, FiSave, FiArrowLeft } from 'react-icons/fi';
import toast from 'react-hot-toast';

export default function VoucherForm() {
  const { type, id } = useParams();
  const navigate = useNavigate();
  const voucherType = type || 'Journal';

  const [ledgers, setLedgers] = useState([]);
  const [entries, setEntries] = useState([
    { ledger: '', amount: '', type: 'Dr', narration: '' }
  ]);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [narration, setNarration] = useState('');
  const [reference, setReference] = useState('');
  const [paymentMode, setPaymentMode] = useState('Cash');
  const [transactionId, setTransactionId] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSingleEntry, setIsSingleEntry] = useState(true);
  const [primaryLedger, setPrimaryLedger] = useState('');

  useEffect(() => {
    loadLedgers();
    // In Single Entry, default to 1 row
    if (isSingleEntry) {
      setEntries([{ ledger: '', amount: '', type: 'Cr', narration: '' }]);
    } else {
      const defaultTypes = getDefaultEntryTypes();
      setEntries(defaultTypes.map(t => ({ ledger: '', amount: '', type: t, narration: '' })));
    }
  }, [voucherType, isSingleEntry]);

  const loadLedgers = async () => {
    try {
      const res = await ledgerAPI.getAll({ limit: 500 });
      setLedgers(res.data.data);
    } catch (err) { toast.error('Failed to load ledgers'); }
  };

  const updateEntry = (index, field, value) => {
    const updated = [...entries];
    updated[index] = { ...updated[index], [field]: value };
    setEntries(updated);
  };

  const addEntry = () => {
    setEntries([...entries, { ledger: '', amount: '', type: 'Cr', narration: '' }]);
  };

  const removeEntry = (index) => {
    if (entries.length <= 1) return toast.error('At least 1 entry is required');
    setEntries(entries.filter((_, i) => i !== index));
  };

  const totalDr = entries.reduce((s, e) => e.type === 'Dr' ? s + (Number(e.amount) || 0) : s, 0);
  const totalCr = entries.reduce((s, e) => e.type === 'Cr' ? s + (Number(e.amount) || 0) : s, 0);
  
  // Logic for calculations based on mode
  const singleEntryTotal = entries.reduce((s, e) => s + (Number(e.amount) || 0), 0);
  const diff = isSingleEntry ? 0 : Math.abs(totalDr - totalCr);
  const isBalanced = isSingleEntry ? (singleEntryTotal > 0 && primaryLedger) : (diff < 0.01 && totalDr > 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Explicit Validation Check for UX
    if (isSingleEntry) {
      // Automatic detection of the primary ledger (Bank/Cash)
      let detectedLedger = primaryLedger; // Use selected ledger if available
      
      if (!detectedLedger) {
        if (paymentMode === 'Cash') {
          detectedLedger = ledgers.find(l => l.name.toLowerCase() === 'cash' || l.group?.name === 'Cash-in-Hand')?._id;
        } else if (paymentMode !== 'Bill') {
          detectedLedger = ledgers.find(l => l.group?.name === 'Bank Accounts')?._id;
        }
      }
      
      if (!detectedLedger && paymentMode !== 'Bill') {
        return toast.error(`${paymentMode} ke liye koi Bank/Cash account nahi mila. Kripya Ledger me bank account banayein.`);
      }
      
      if (singleEntryTotal === 0) return toast.error('Kripya amount enter karein');
      
      // Temporary override of primaryLedger state for this submission
      var usedPrimaryLedger = detectedLedger;
    } else {
      if (totalDr === 0) return toast.error('Kripya amount enter karein');
      if (!isBalanced) return toast.error(`Hisaab barabar nahi hai! Debit aur Credit ke beech ₹${diff.toFixed(2)} ka farak hai.`);
    }
    
    const emptyEntries = entries.filter(en => !en.ledger || !en.amount);
    if (emptyEntries.length > 0) return toast.error('Sabhi lines me Ledger aur Amount bharna zaroori hai');

    setLoading(true);
    try {
      let finalEntries = [];
      
      if (isSingleEntry) {
        // Automatically determine Dr/Cr for the primary account
        const primaryType = (voucherType === 'Receipt' || voucherType === 'Purchase' || voucherType === 'Debit Note') ? 'Dr' : 'Cr';
        const rowType = primaryType === 'Dr' ? 'Cr' : 'Dr';
        
        finalEntries = [
          { ledger: usedPrimaryLedger, amount: singleEntryTotal, type: primaryType, narration: 'Automatic balancing entry' },
          ...entries.map(en => ({
            ledger: en.ledger,
            amount: parseFloat(en.amount),
            type: rowType,
            narration: en.narration,
          }))
        ];
      } else {
        finalEntries = entries.map(en => ({
          ledger: en.ledger,
          amount: parseFloat(en.amount),
          type: en.type,
          narration: en.narration,
        }));
      }

      const payload = {
        voucherType,
        date,
        narration,
        reference,
        paymentMode,
        transactionId,
        amount: isSingleEntry ? singleEntryTotal : totalDr,
        totalDebit: isSingleEntry ? (finalEntries[0].type === 'Dr' ? singleEntryTotal : singleEntryTotal) : totalDr,
        totalCredit: isSingleEntry ? (finalEntries[0].type === 'Cr' ? singleEntryTotal : singleEntryTotal) : totalCr,
        entries: finalEntries,
      };

      await voucherAPI.create(payload);
      toast.success(`${voucherType} voucher created!`);
      navigate('/vouchers');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create voucher');
    } finally { setLoading(false); }
  };

  const fmt = (n) => `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

  // Smart defaults based on voucher type
  const getDefaultEntryTypes = () => {
    switch (voucherType) {
      case 'Payment': return ['Cr', 'Dr']; // Cash/Bank Cr, Party/Expense Dr
      case 'Receipt': return ['Dr', 'Cr']; // Cash/Bank Dr, Party Cr
      case 'Sales': return ['Dr', 'Cr']; // Debtor Dr, Sales Cr
      case 'Purchase': return ['Dr', 'Cr']; // Purchase Dr, Creditor Cr
      case 'Contra': return ['Dr', 'Cr'];
      default: return ['Dr', 'Cr'];
    }
  };

  const typeColors = {
    Payment: { bg: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', label: '💳 Cash Out (Payment)' },
    Receipt: { bg: 'rgba(14, 165, 233, 0.1)', color: 'var(--accent)', label: '💰 Cash In (Receipt)' },
    Sales: { bg: 'rgba(5, 150, 105, 0.1)', color: 'var(--success)', label: '📈 Sales Entry' },
    Purchase: { bg: 'rgba(14, 165, 233, 0.15)', color: 'var(--accent)', label: '🛒 Purchase Entry' },
    Contra: { bg: 'rgba(14, 165, 233, 0.1)', color: 'var(--accent)', label: '🔄 Contra Entry' },
    Journal: { bg: 'var(--bg-tertiary)', color: 'var(--text-secondary)', label: '📝 Journal Entry' },
    'Credit Note': { bg: 'rgba(14, 165, 233, 0.1)', color: 'var(--accent)', label: '📋 Credit Note' },
    'Debit Note': { bg: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', label: '📋 Debit Note' },
  };

  const tc = typeColors[voucherType] || typeColors.Journal;

  return (
    <div>
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button className="btn btn-ghost btn-icon" onClick={() => navigate('/vouchers')}>
            <FiArrowLeft />
          </button>
          <div>
            <h1 style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              {tc.label}
            </h1>
          </div>
        </div>
        
        {/* Trade Switcher (Sales/Purchase) */}
        {(voucherType === 'Sales' || voucherType === 'Purchase') && (
          <div style={{ display: 'flex', background: 'var(--bg-secondary)', padding: '4px', borderRadius: '8px', border: '1px solid var(--border)' }}>
            <button type="button" 
              className={`btn btn-sm ${voucherType === 'Sales' ? 'btn-primary' : 'btn-ghost'}`}
              style={{ minWidth: '100px' }}
              onClick={() => navigate('/vouchers/new/Sales')}>Sales</button>
            <button type="button" 
              className={`btn btn-sm ${voucherType === 'Purchase' ? 'btn-primary' : 'btn-ghost'}`}
              style={{ minWidth: '100px' }}
              onClick={() => navigate('/vouchers/new/Purchase')}>Purchase</button>
          </div>
        )}

        {/* Cash In/Out Switcher (Receipt/Payment) */}
        {(voucherType === 'Receipt' || voucherType === 'Payment') && (
          <div style={{ display: 'flex', background: 'var(--bg-secondary)', padding: '4px', borderRadius: '8px', border: '1px solid var(--border)' }}>
            <button type="button" 
              className={`btn btn-sm ${voucherType === 'Receipt' ? 'btn-primary' : 'btn-ghost'}`}
              style={{ minWidth: '100px' }}
              onClick={() => navigate('/vouchers/new/Receipt')}>Cash In</button>
            <button type="button" 
              className={`btn btn-sm ${voucherType === 'Payment' ? 'btn-primary' : 'btn-ghost'}`}
              style={{ minWidth: '100px' }}
              onClick={() => navigate('/vouchers/new/Payment')}>Cash Out</button>
          </div>
        )}


      </div>

      <form onSubmit={handleSubmit}>
        <div className="voucher-form">
          <div className="voucher-form-header" style={{ background: tc.bg, padding: '20px', display: 'flex', flexWrap: 'wrap', gap: '24px', alignItems: 'flex-start' }}>
            <div style={{ display: 'flex', gap: '20px', alignItems: 'center', flexWrap: 'wrap', flex: 1 }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Date</label>
                <input type="date" className="form-input" style={{ width: '160px' }}
                  value={date} onChange={e => setDate(e.target.value)} required />
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Reference</label>
                <input type="text" className="form-input" style={{ width: '180px' }}
                  value={reference} onChange={e => setReference(e.target.value)}
                  placeholder="Bill/Ref No." />
              </div>
              {isSingleEntry && (
                <div style={{ display: 'flex', gap: '20px' }}>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">Account Type</label>
                    <select className="form-select" style={{ width: '150px', borderColor: 'var(--accent)', borderWidth: '2px' }}
                      value={paymentMode} onChange={e => setPaymentMode(e.target.value)} required>
                      <option value="Cash">Cash</option>
                      <option value="UPI">UPI</option>
                      <option value="NEFT">NEFT</option>
                      <option value="RTGS">RTGS</option>
                      <option value="IMPS">IMPS</option>
                      <option value="Cheque">Cheque</option>
                      <option value="Bill">Bill</option>
                    </select>
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">Transaction ID</label>
                    <input type="text" className="form-input" style={{ width: '220px' }}
                      value={transactionId} onChange={e => setTransactionId(e.target.value)}
                      placeholder="TXN12345678" />
                  </div>
                  {(voucherType === 'Receipt' && paymentMode !== 'Cash' && paymentMode !== 'Bill') && (
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label">Bank</label>
                      <select className="form-select" style={{ width: '220px', borderColor: 'var(--accent)', borderWidth: '2px' }}
                        value={primaryLedger} onChange={e => setPrimaryLedger(e.target.value)} required>
                        <option value="">— Select Bank Account —</option>
                        {ledgers.filter(l => 
                          (l.group?.name?.toLowerCase().includes('bank') || l.accountNumber) && 
                          l.isActive !== false
                        ).map(l => (
                          <option key={l._id} value={l._id}>{l.name}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              )}
            </div>
            <span className={`badge`} style={{ background: tc.color, color: 'white', padding: '6px 16px', fontSize: '0.8rem' }}>
              {voucherType}
            </span>
          </div>

          <div className="voucher-form-body">
            {/* Entry Headers */}
            <div className="voucher-entry-row" style={{ borderBottom: '2px solid var(--border)', fontWeight: 600, color: 'var(--text-secondary)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              <div>{isSingleEntry ? 'Party / Expense Ledger' : 'Ledger Account'}</div>
              <div>Amount (₹)</div>
              <div>Dr/Cr</div>
              <div></div>
            </div>

            <div className="voucher-entries">
              {entries.map((entry, i) => (
                <div className="voucher-entry-row" key={i}>
                  <select className="form-select" value={entry.ledger}
                    onChange={e => updateEntry(i, 'ledger', e.target.value)} required>
                    <option value="">— Select Ledger —</option>
                    {ledgers.map(l => (
                      <option key={l._id} value={l._id}>{l.name} ({l.group?.name})</option>
                    ))}
                  </select>
                  <input type="number" className="form-input" placeholder="0.00" step="0.01"
                    value={entry.amount} onChange={e => updateEntry(i, 'amount', e.target.value)}
                    required min="0.01"
                    style={{ fontFamily: 'JetBrains Mono', textAlign: 'right' }} />
                  <select className="form-select" value={entry.type}
                    onChange={e => updateEntry(i, 'type', e.target.value)}
                    style={{ color: entry.type === 'Dr' ? 'var(--debit-color)' : 'var(--credit-color)', fontWeight: 700 }}>
                    <option value="Dr">Dr</option>
                    <option value="Cr">Cr</option>
                  </select>
                  {entries.length > 1 && (
                    <button type="button" className="btn btn-ghost btn-icon"
                      onClick={() => removeEntry(i)}
                      style={{ color: 'var(--danger)' }}>
                      <FiTrash2 />
                    </button>
                  )}
                </div>
              ))}
            </div>

            <button type="button" className="btn btn-secondary btn-sm" onClick={addEntry}>
              <FiPlus /> Add Entry
            </button>

            {/* Totals & Balance Warning */}
            <div className="voucher-totals">
              <div className="voucher-total-item">
                <label>Total Debit</label>
                <div className="total-value" style={{ color: 'var(--debit-color)' }}>{fmt(totalDr)}</div>
              </div>
              <div className="voucher-total-item">
                <label>Total Credit</label>
                <div className="total-value" style={{ color: 'var(--credit-color)' }}>{fmt(totalCr)}</div>
              </div>
              <div className="voucher-total-item">
                <label>Status</label>
                <div className="total-value" style={{ color: isBalanced ? 'var(--success)' : 'var(--danger)' }}>
                  {isBalanced ? '✓ Balanced' : (totalDr === 0 ? 'Enter Amount' : `Unbalanced: ${fmt(diff)}`)}
                </div>
              </div>
            </div>

            {!isBalanced && totalDr > 0 && (
              <div style={{ marginTop: '12px', padding: '10px', background: 'rgba(239, 68, 68, 0.05)', color: 'var(--danger)', borderRadius: 'var(--radius-sm)', fontSize: '0.85rem', fontWeight: 500 }}>
                ⚠️ Sabhi Ledger accounts select karke Debit aur Credit barabar karein tabhi Save button kaam karega.
              </div>
            )}

            <div className="form-group" style={{ marginTop: '20px' }}>
              <label className="form-label">Narration</label>
              <textarea className="form-input" value={narration} onChange={e => setNarration(e.target.value)}
                placeholder="Description of this transaction..." rows={2} style={{ resize: 'vertical' }} />
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '20px' }}>
          <button type="button" className="btn btn-secondary" onClick={() => navigate('/vouchers')}>Cancel</button>
          <button type="submit" className="btn btn-primary btn-lg">
            <FiSave /> {loading ? 'Saving...' : 'Save Voucher'}
          </button>
        </div>
      </form>
    </div>
  );
}
