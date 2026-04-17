import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { customerAPI } from '../services/api';
import { FiArrowLeft, FiPrinter, FiSearch, FiBriefcase, FiUser, FiChevronLeft } from 'react-icons/fi';
import toast from 'react-hot-toast';

export default function CustomerStatement() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialCustomerId = searchParams.get('customer') || '';
  
  const navigate = useNavigate();
  const [selectedId, setSelectedId] = useState(initialCustomerId);
  const [allCustomers, setAllCustomers] = useState([]);
  
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  // For Selection UI
  const [activeTab, setActiveTab] = useState('Company');
  const [searchQuery, setSearchQuery] = useState('');

  // Load all customers for the list
  useEffect(() => {
    fetchCustomers();
  }, []);

  // Fetch statement data when selectedId changes
  useEffect(() => {
    if (selectedId) {
      loadData(selectedId);
      setSearchParams({ customer: selectedId });
    } else {
      setData(null);
      setSearchParams({});
    }
  }, [selectedId, setSearchParams]);

  const fetchCustomers = async () => {
    try {
      const res = await customerAPI.getAll();
      setAllCustomers(res.data.data);
    } catch (err) {
      toast.error('Failed to load customers list');
    }
  };

  const loadData = async (id) => {
    setLoading(true);
    try {
      const res = await customerAPI.getStatement(id);
      setData(res.data.data);
    } catch (err) { 
      toast.error('Failed to load statement'); 
      setData(null);
    } finally { 
      setLoading(false); 
    }
  };

  const fmt = (n) => `₹${(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

  const printStatement = () => {
    window.print();
  };

  const filteredList = allCustomers.filter(c => {
    const typeMatch = (c.customerType || 'Company') === activeTab;
    const searchMatch = c.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                       (c.nickname && c.nickname.toLowerCase().includes(searchQuery.toLowerCase()));
    return typeMatch && searchMatch;
  });

  return (
    <div className="statement-page">
      <style>{`
        @media print {
          body * { visibility: hidden; }
          .statement-page, .statement-page * { visibility: visible; }
          .statement-page { position: absolute; left: 0; top: 0; width: 100%; padding: 20px; background: white; }
          .no-print { display: none !important; }
          .card { border: 1px solid #ddd; box-shadow: none; margin-bottom: 20px; }
        }
        
        .selection-tabs {
          display: flex; gap: 20px; margin-bottom: 20px;
        }
        .sel-tab {
          flex: 1; padding: 20px; border-radius: 12px; border: 2px solid transparent; 
          background: var(--bg-secondary); cursor: pointer; transition: all 0.2s;
          display: flex; align-items: center; gap: 16px;
        }
        .sel-tab:hover { background: var(--bg-hover); }
        .sel-tab.active { border-color: var(--primary); background: rgba(59, 130, 246, 0.05); }
        .sel-tab-icon { 
          width: 48px; height: 48px; border-radius: 50%; background: white;
          display: flex; align-items: center; justify-content: center; font-size: 1.4rem;
          color: var(--primary); box-shadow: 0 4px 12px rgba(0,0,0,0.05);
        }
        
        .party-grid {
          display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 16px;
        }
        .party-card {
          background: white; border: 1px solid var(--border-color); border-radius: 8px;
          padding: 16px; cursor: pointer; transition: all 0.2s;
        }
        .party-card:hover { border-color: var(--primary); transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
      `}</style>
      
      {/* If no selected ID, show selection screen */}
      {!selectedId ? (
        <div className="selection-screen no-print">
          <div className="page-header">
            <div>
              <h1>View Party Statement</h1>
              <p>Select a Company or Worker to view their transaction timeline</p>
            </div>
          </div>
          
          <div className="selection-tabs">
            <div className={`sel-tab ${activeTab === 'Company' ? 'active' : ''}`} onClick={() => setActiveTab('Company')}>
              <div className="sel-tab-icon"><FiBriefcase /></div>
              <div>
                <div style={{ fontSize: '1.2rem', fontWeight: 600 }}>Companies</div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>View business & client statements</div>
              </div>
            </div>
            <div className={`sel-tab ${activeTab === 'Worker' ? 'active' : ''}`} onClick={() => setActiveTab('Worker')}>
              <div className="sel-tab-icon"><FiUser /></div>
              <div>
                <div style={{ fontSize: '1.2rem', fontWeight: 600 }}>Workers</div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>View labor & staff statements</div>
              </div>
            </div>
          </div>

          <div style={{ position: 'relative', marginBottom: '24px' }}>
            <FiSearch style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input 
              type="text" 
              className="form-input" 
              placeholder={`Search ${activeTab.toLowerCase()} by name...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ paddingLeft: '44px', paddingRight: '16px', height: '50px', fontSize: '1.05rem', borderRadius: '12px' }}
              autoFocus
            />
          </div>

          <div className="party-grid">
            {filteredList.length === 0 ? (
              <div style={{ gridColumn: '1 / -1', padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                No {activeTab.toLowerCase()} found matching "{searchQuery}"
              </div>
            ) : filteredList.map(c => (
              <div key={c._id} className="party-card" onClick={() => setSelectedId(c._id)}>
                <div style={{ fontWeight: 600, fontSize: '1.1rem', marginBottom: '4px' }}>
                  {c.name} {c.nickname && <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>({c.nickname})</span>}
                </div>
                {c.city && <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>📍 {c.city} • {c.state}</div>}
                {c.phones?.[0] && <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>📞 {c.phones[0]}</div>}
              </div>
            ))}
          </div>
        </div>
      ) : (
        /* The Statement Screen */
        <div className="statement-view">
          <div className="page-header no-print" style={{ marginBottom: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <button className="btn btn-ghost" onClick={() => setSelectedId('')} style={{ padding: '8px 12px' }}>
                <FiChevronLeft /> Back to List
              </button>
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button className="btn btn-secondary" onClick={printStatement}><FiPrinter /> Print</button>
            </div>
          </div>

          {loading ? <div className="loading-spinner"><div className="spinner"></div></div> : !data ? (
            <div className="empty-state"><h3>Statement not found</h3></div>
          ) : (
            <>
              <div className="card" style={{ marginBottom: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '20px' }}>
                  <div>
                    <h2 style={{ fontSize: '1.4rem', marginBottom: '4px' }}>{data.customer.name} {data.customer.nickname && `(${data.customer.nickname})`}</h2>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                      {data.customer.customerType} {data.customer.gstin ? `| GSTIN: ${data.customer.gstin}` : ''}
                      {data.customer.pan ? `| PAN: ${data.customer.pan}` : ''}
                    </div>
                    {data.customer.address && <div style={{ fontSize: '0.85rem', marginTop: '8px' }}>{data.customer.address}, {data.customer.city}</div>}
                    <div style={{ fontSize: '0.85rem', marginTop: '4px' }}>{data.customer.phones?.join(', ') || ''}</div>
                  </div>
                  <div style={{ textAlign: 'right', background: 'var(--bg-hover)', padding: '16px', borderRadius: '8px', minWidth: '200px' }}>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Net Outstanding Balance</div>
                    <div style={{ 
                      fontSize: '1.8rem', fontWeight: 700, fontFamily: 'JetBrains Mono',
                      color: data.closingBalanceType === 'Dr' ? 'var(--debit-color)' : 'var(--credit-color)'
                    }}>
                      {fmt(data.closingBalance)}
                    </div>
                    <div style={{ fontSize: '0.75rem', fontWeight: 600, color: data.closingBalanceType === 'Dr' ? 'var(--debit-color)' : 'var(--credit-color)' }}>
                      {data.closingBalanceType === 'Dr' ? '(You need to take)' : '(You need to pay)'}
                    </div>
                  </div>
                </div>
              </div>

              <div className="card">
                <div className="card-title" style={{ marginBottom: '16px' }}>Transaction Timeline</div>
                <div className="data-table-wrapper" style={{ border: 'none' }}>
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Type / Doc#</th>
                        <th>Particulars / Products Details</th>
                        <th style={{ textAlign: 'right' }}>{data.customer.customerType === 'Worker' ? 'Amount Billed (Dr)' : 'Debit (Dr)'}</th>
                        <th style={{ textAlign: 'right' }}>{data.customer.customerType === 'Worker' ? 'Payment Given (Cr)' : 'Credit (Cr)'}</th>
                        <th style={{ textAlign: 'right' }}>Running Balance</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.transactions.length === 0 ? (
                        <tr><td colSpan="6"><div className="empty-state">No transactions recorded yet.</div></td></tr>
                      ) : data.transactions.map((t, i) => (
                        <tr key={i} style={t.type === 'Opening Balance' ? { background: 'var(--bg-tertiary)' } : {}}>
                          <td style={{ fontFamily: 'JetBrains Mono', fontSize: '0.82rem' }}>
                            {t.date ? new Date(t.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                          </td>
                          <td>
                            {t.type === 'Invoice' ? <span className="badge badge-info">{t.type}</span> 
                             : t.type === 'Receipt' ? <span className="badge badge-success">{t.type}</span>
                             : t.type === 'Payment' ? <span className="badge badge-warning">{t.type}</span>
                             : <span className="badge badge-default">{t.type}</span>}
                            {t.docNumber && <div style={{ fontSize: '0.75rem', marginTop: '4px', fontFamily: 'JetBrains Mono' }}>{t.docNumber}</div>}
                          </td>
                          <td>
                            <div style={{ fontWeight: t.type === 'Opening Balance' ? 600 : 400 }}>{t.particulars}</div>
                            {t.originalItems && t.originalItems.length > 0 && (
                              <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginTop: '6px' }}>
                                {t.originalItems.map((item, idx) => (
                                  <span key={idx} className="badge badge-default" style={{ fontSize: '0.7rem', opacity: 0.8 }}>
                                    {item.description} (x{item.quantity})
                                  </span>
                                ))}
                              </div>
                            )}
                          </td>
                          <td className="amount debit" style={{ opacity: t.debit === 0 ? 0.3 : 1 }}>
                            {t.debit > 0 ? fmt(t.debit) : '—'}
                          </td>
                          <td className="amount credit" style={{ opacity: t.credit === 0 ? 0.3 : 1 }}>
                            {t.credit > 0 ? fmt(t.credit) : '—'}
                          </td>
                          <td className="amount" style={{ fontWeight: 600, color: t.balanceType === 'Dr' ? 'var(--debit-color)' : 'var(--credit-color)' }}>
                            {fmt(t.balance)} <span style={{ fontSize: '0.75rem' }}>{t.balanceType}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
