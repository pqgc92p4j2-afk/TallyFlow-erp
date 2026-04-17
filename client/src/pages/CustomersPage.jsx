import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { customerAPI, invoiceAPI } from '../services/api';
import { FiPlus, FiSearch, FiEdit2, FiTrash2, FiFileText, FiPhone, FiMapPin, FiList } from 'react-icons/fi';
import toast from 'react-hot-toast';

const indianStates = { '01':'Jammu & Kashmir','02':'Himachal Pradesh','03':'Punjab','04':'Chandigarh','05':'Uttarakhand','06':'Haryana','07':'Delhi','08':'Rajasthan','09':'Uttar Pradesh','10':'Bihar','11':'Sikkim','12':'Arunachal Pradesh','13':'Nagaland','14':'Manipur','15':'Mizoram','16':'Tripura','17':'Meghalaya','18':'Assam','19':'West Bengal','20':'Jharkhand','21':'Odisha','22':'Chhattisgarh','23':'Madhya Pradesh','24':'Gujarat','25':'Daman & Diu','26':'Dadra & Nagar Haveli','27':'Maharashtra','28':'Andhra Pradesh','29':'Karnataka','30':'Goa','31':'Lakshadweep','32':'Kerala','33':'Tamil Nadu','34':'Puducherry','35':'Andaman & Nicobar','36':'Telangana','37':'Andhra Pradesh (New)' };

export default function CustomersPage() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [activeTab, setActiveTab] = useState('Company'); // For viewing list

  const [form, setForm] = useState({
    name: '', nickname: '', tradeName: '', gstin: '', pan: '', address: '', city: '', state: '', stateCode: '',
    pincode: '', phones: [''], email: '', contactPerson: '', creditDays: 30, creditLimit: 0, customerType: 'Company',
    bankDetails: { bankName: '', accountNumber: '', ifscCode: '', branch: '' }
  });
  const navigate = useNavigate();

  useEffect(() => { loadCustomers(); }, []);

  const loadCustomers = async () => {
    try {
      const res = await customerAPI.getAll({ search });
      setCustomers(res.data.data);
    } catch (err) { toast.error('Failed to load customers'); }
    finally { setLoading(false); }
  };

  const handleSearch = (e) => { e.preventDefault(); loadCustomers(); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const data = { ...form, phones: form.phones.filter(p => p.trim()) };
      if (editingId) { await customerAPI.update(editingId, data); toast.success('Customer updated'); }
      else { await customerAPI.create(data); toast.success('Customer added'); }
      setShowModal(false); resetForm(); loadCustomers();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Remove "${name}" from active customers?`)) return;
    try { await customerAPI.delete(id); toast.success('Customer removed'); loadCustomers(); }
    catch (err) { toast.error('Failed'); }
  };

  const openEdit = (c) => {
    setForm({
      name: c.name, nickname: c.nickname || '', tradeName: c.tradeName || '', gstin: c.gstin || '', pan: c.pan || '',
      address: c.address || '', city: c.city || '', state: c.state || '', stateCode: c.stateCode || '',
      pincode: c.pincode || '', phones: c.phones?.length ? c.phones : [''], email: c.email || '',
      contactPerson: c.contactPerson || '', creditDays: c.creditDays || 30, creditLimit: c.creditLimit || 0,
      customerType: c.customerType || 'Company',
      bankDetails: c.bankDetails || { bankName: '', accountNumber: '', ifscCode: '', branch: '' }
    });
    setEditingId(c._id); setShowModal(true);
  };

  const resetForm = () => {
    setForm({ name: '', nickname: '', tradeName: '', gstin: '', pan: '', address: '', city: '', state: '', stateCode: '', pincode: '', phones: [''], email: '', contactPerson: '', creditDays: 30, creditLimit: 0, customerType: activeTab, bankDetails: { bankName: '', accountNumber: '', ifscCode: '', branch: '' } });
    setEditingId(null);
  };

  const addPhone = () => setForm({ ...form, phones: [...form.phones, ''] });
  const removePhone = (i) => setForm({ ...form, phones: form.phones.filter((_, idx) => idx !== i) });
  const updatePhone = (i, val) => { const p = [...form.phones]; p[i] = val; setForm({ ...form, phones: p }); };

  const fmt = (n) => `₹${(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

  if (loading) return <div className="loading-spinner"><div className="spinner"></div></div>;

  return (
    <div>
      <div className="page-header">
        <div><h1>👥 Customers</h1><p>Manage your customer master data — auto-fills on invoices</p></div>
        <button className="btn btn-primary" onClick={() => { resetForm(); setShowModal(true); }}><FiPlus /> Add Customer</button>
      </div>

      <div className="filter-bar">
        <div style={{ display: 'flex', gap: '10px' }}>
          <button className={`btn ${activeTab === 'Company' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setActiveTab('Company')}>Companies</button>
          <button className={`btn ${activeTab === 'Worker' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setActiveTab('Worker')}>Workers</button>
        </div>
        <form onSubmit={handleSearch} className="search-bar" style={{ marginLeft: 'auto' }}>
          <FiSearch className="search-icon" />
          <input type="text" placeholder={`Search ${activeTab.toLowerCase()}s...`} value={search} onChange={e => setSearch(e.target.value)} />
        </form>
        <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
          {customers.filter(c => (c.customerType || 'Company') === activeTab).length} {activeTab.toLowerCase()}s
        </span>
      </div>

      <div className="data-table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              <th>Customer Name</th>
              <th>GSTIN</th>
              <th>City / State</th>
              <th>Phone</th>
              <th>Total Billed</th>
              <th>Outstanding</th>
              <th>Invoices</th>
              <th style={{ width: '120px' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {customers.filter(c => (c.customerType || 'Company') === activeTab).length === 0 ? (
              <tr><td colSpan="8"><div className="empty-state" style={{ padding: '40px' }}>
                <div className="empty-icon">👥</div><h3>No {activeTab.toLowerCase()}s yet</h3><p>Add your first {activeTab.toLowerCase()} to get started.</p>
                <button className="btn btn-primary" onClick={() => { resetForm(); setShowModal(true); }}>+ Add {activeTab}</button>
              </div></td></tr>
            ) : customers.filter(c => (c.customerType || 'Company') === activeTab).map(c => (
              <tr key={c._id}>
                <td>
                  <div style={{ fontWeight: 600 }}>
                    {c.name} {c.nickname && c.customerType === 'Worker' && <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}>({c.nickname})</span>}
                  </div>
                  {c.tradeName && c.customerType !== 'Worker' && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{c.tradeName}</div>}
                </td>
                <td style={{ fontFamily: 'JetBrains Mono', fontSize: '0.8rem' }}>{c.gstin || '—'}</td>
                <td>
                  <div style={{ fontSize: '0.85rem' }}>{c.city || '—'}</div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{c.state} {c.stateCode ? `(${c.stateCode})` : ''}</div>
                </td>
                <td style={{ fontSize: '0.82rem' }}>{c.phones?.[0] || '—'}{c.phones?.length > 1 && <span className="badge badge-default" style={{ marginLeft: '4px' }}>+{c.phones.length - 1}</span>}</td>
                <td className="amount" style={{ color: 'var(--success)' }}>{fmt(c.totalBilled)}</td>
                <td className="amount" style={{ color: c.totalBilled - c.totalPaid > 0 ? 'var(--warning)' : 'var(--text-muted)' }}>
                  {fmt(c.totalBilled - c.totalPaid)}
                </td>
                <td style={{ textAlign: 'center' }}><span className="badge badge-info">{c.invoiceCount}</span></td>
                <td>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    <button className="btn btn-ghost btn-icon" title="View Statement" onClick={() => navigate(`/statement?customer=${c._id}`)} style={{ color: 'var(--primary)' }}><FiList /></button>
                    <button className="btn btn-ghost btn-icon" title="View Invoices" onClick={() => navigate(`/invoice-history?customer=${c._id}`)}><FiFileText /></button>
                    <button className="btn btn-ghost btn-icon" title="Edit" onClick={() => openEdit(c)}><FiEdit2 /></button>
                    <button className="btn btn-ghost btn-icon" title="Remove" onClick={() => handleDelete(c._id, c.name)} style={{ color: 'var(--danger)' }}><FiTrash2 /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingId ? 'Edit Customer' : 'Add Customer'}</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                
                {/* Type Selection */}
                <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', background: 'var(--bg-hover)', padding: '4px', borderRadius: '8px', width: 'fit-content' }}>
                  <button type="button" className={`btn ${form.customerType === 'Company' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setForm({ ...form, customerType: 'Company' })} style={{ padding: '6px 16px', minHeight: '32px' }}>Company Details</button>
                  <button type="button" className={`btn ${form.customerType === 'Worker' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setForm({ ...form, customerType: 'Worker' })} style={{ padding: '6px 16px', minHeight: '32px' }}>Worker Details</button>
                </div>

                <div className="form-row">
                  <div className="form-group"><label className="form-label">{form.customerType === 'Worker' ? 'Worker Name *' : 'Company Name *'}</label>
                    <input type="text" className="form-input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required autoFocus placeholder={form.customerType === 'Worker' ? "Raju Singh" : "Sharma Electronics Pvt Ltd"} />
                  </div>
                  {form.customerType === 'Company' ? (
                    <div className="form-group"><label className="form-label">Trade Name</label>
                      <input type="text" className="form-input" value={form.tradeName} onChange={e => setForm({ ...form, tradeName: e.target.value })} placeholder="Brand / trade name" />
                    </div>
                  ) : (
                    <div className="form-group"><label className="form-label">Nickname / Alias</label>
                      <input type="text" className="form-input" value={form.nickname} onChange={e => setForm({ ...form, nickname: e.target.value })} placeholder="e.g. Raju, Chhotu" />
                    </div>
                  )}
                </div>

                {form.customerType === 'Company' && (
                  <div className="form-row">
                    <div className="form-group"><label className="form-label">GSTIN</label>
                      <input type="text" className="form-input" value={form.gstin} onChange={e => setForm({ ...form, gstin: e.target.value.toUpperCase() })} maxLength={15} placeholder="22AAAAA0000A1Z5" />
                    </div>
                    <div className="form-group"><label className="form-label">PAN</label>
                      <input type="text" className="form-input" value={form.pan} onChange={e => setForm({ ...form, pan: e.target.value.toUpperCase() })} maxLength={10} />
                    </div>
                  </div>
                )}
                
                {form.customerType === 'Worker' && (
                  <>
                    <div className="form-row">
                      <div className="form-group"><label className="form-label">PAN</label>
                        <input type="text" className="form-input" value={form.pan} onChange={e => setForm({ ...form, pan: e.target.value.toUpperCase() })} maxLength={10} />
                      </div>
                      <div className="form-group"></div>
                    </div>
                    <div className="form-row">
                      <div className="form-group"><label className="form-label">Bank Name</label>
                        <input type="text" className="form-input" value={form.bankDetails?.bankName || ''} onChange={e => setForm({ ...form, bankDetails: { ...form.bankDetails, bankName: e.target.value } })} />
                      </div>
                      <div className="form-group"><label className="form-label">Account Number</label>
                        <input type="text" className="form-input" value={form.bankDetails?.accountNumber || ''} onChange={e => setForm({ ...form, bankDetails: { ...form.bankDetails, accountNumber: e.target.value } })} />
                      </div>
                    </div>
                    <div className="form-row">
                      <div className="form-group"><label className="form-label">IFSC Code</label>
                        <input type="text" className="form-input" value={form.bankDetails?.ifscCode || ''} onChange={e => setForm({ ...form, bankDetails: { ...form.bankDetails, ifscCode: e.target.value } })} />
                      </div>
                      <div className="form-group"><label className="form-label">Branch</label>
                        <input type="text" className="form-input" value={form.bankDetails?.branch || ''} onChange={e => setForm({ ...form, bankDetails: { ...form.bankDetails, branch: e.target.value } })} />
                      </div>
                    </div>
                  </>
                )}

                <div className="form-group"><label className="form-label">Address</label>
                  <input type="text" className="form-input" value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} placeholder="Street address" />
                </div>
                <div className="form-row">
                  <div className="form-group"><label className="form-label">City</label>
                    <input type="text" className="form-input" value={form.city} onChange={e => setForm({ ...form, city: e.target.value })} />
                  </div>
                  <div className="form-group"><label className="form-label">State</label>
                    <select className="form-select" value={form.stateCode} onChange={e => { const code = e.target.value; setForm({ ...form, stateCode: code, state: indianStates[code] || '' }); }}>
                      <option value="">Select State</option>
                      {Object.entries(indianStates).map(([code, name]) => <option key={code} value={code}>{code} - {name}</option>)}
                    </select>
                  </div>
                  <div className="form-group"><label className="form-label">State Code</label>
                    <input type="text" className="form-input" value={form.stateCode} readOnly style={{ background: 'var(--bg-hover)' }} />
                  </div>
                  <div className="form-group"><label className="form-label">Pincode</label>
                    <input type="text" className="form-input" value={form.pincode} onChange={e => setForm({ ...form, pincode: e.target.value })} maxLength={6} />
                  </div>
                </div>
                {/* Multiple phones */}
                <div className="form-group">
                  <label className="form-label">Phone Numbers</label>
                  {form.phones.map((ph, i) => (
                    <div key={i} style={{ display: 'flex', gap: '8px', marginBottom: '6px' }}>
                      <input type="text" className="form-input" value={ph} onChange={e => updatePhone(i, e.target.value)} placeholder={`Phone ${i + 1}`} />
                      {form.phones.length > 1 && <button type="button" className="btn btn-ghost btn-icon" onClick={() => removePhone(i)} style={{ color: 'var(--danger)' }}>✕</button>}
                    </div>
                  ))}
                  <button type="button" className="btn btn-ghost btn-sm" onClick={addPhone}><FiPlus /> Add Phone</button>
                </div>
                <div className="form-row">
                  <div className="form-group"><label className="form-label">Email</label>
                    <input type="email" className="form-input" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
                  </div>
                  <div className="form-group"><label className="form-label">Contact Person</label>
                    <input type="text" className="form-input" value={form.contactPerson} onChange={e => setForm({ ...form, contactPerson: e.target.value })} />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group"><label className="form-label">Credit Days</label>
                    <input type="number" className="form-input" value={form.creditDays} onChange={e => setForm({ ...form, creditDays: parseInt(e.target.value) || 0 })} />
                  </div>
                  <div className="form-group"><label className="form-label">Credit Limit (₹)</label>
                    <input type="number" className="form-input" value={form.creditLimit} onChange={e => setForm({ ...form, creditLimit: parseFloat(e.target.value) || 0 })} />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">{editingId ? 'Update' : 'Add'} {form.customerType}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
