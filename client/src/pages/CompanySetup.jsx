import { useState, useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { setActiveCompany, setCompanies } from '../store/companySlice';
import { companyAPI } from '../services/api';
import { FiPlus, FiTrash2, FiSave } from 'react-icons/fi';
import toast from 'react-hot-toast';

import { parseGSTIN } from '../utils/gstHelper';

export default function CompanySetup() {
  const { activeCompany } = useSelector(s => s.company);
  
  const [form, setForm] = useState({
    name: '', address: '', city: '', state: '', stateCode: '', pincode: '', phone: '', email: '',
    gstin: '', pan: '', baseCurrency: 'INR', currencySymbol: '₹', gstEnabled: true, inventoryEnabled: true,
    bankAccounts: []
  });
  
  const [loading, setLoading] = useState(false);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const justSaved = useRef(false);

  useEffect(() => {
    if (activeCompany && !justSaved.current) {
      const qrMap = JSON.parse(localStorage.getItem(`tallyflow_qr_${activeCompany._id}`) || '{}');
      const bankAccounts = (activeCompany.bankAccounts || []).map(b => ({
        ...b,
        qrCode: b.qrCode || qrMap[b.accountNumber] || ''
      }));
      setForm({ ...activeCompany, bankAccounts });
    }
    justSaved.current = false;
  }, [activeCompany]);

  const handleChange = (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value.toUpperCase(); // Force uppercase for GST/PAN if needed, but let's only force it for gstin/pan
    
    if (e.target.name === 'gstin') {
      const gstinVal = e.target.value.toUpperCase();
      const parsed = parseGSTIN(gstinVal);
      setForm(prev => ({ 
        ...prev, 
        gstin: gstinVal,
        ...(parsed?.pan && !prev.pan ? { pan: parsed.pan } : {}),
        ...(parsed?.state && !prev.state ? { state: parsed.state, stateCode: parsed.stateCode } : {})
      }));
    } else {
      const finalVal = (e.target.name === 'pan' || e.target.name === 'ifscCode') ? e.target.value.toUpperCase() : (e.target.type === 'checkbox' ? e.target.checked : e.target.value);
      setForm(prev => ({ ...prev, [e.target.name]: finalVal }));
    }
  };

  const handleQrUpload = (index, e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        updateBank(index, 'qrCode', reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const addBank = () => {
    setForm({ ...form, bankAccounts: [...form.bankAccounts, { bankName: '', accountNumber: '', ifscCode: '', branch: '', isDefault: form.bankAccounts.length === 0, qrCode: '' }] });
  };

  const updateBank = (index, field, value) => {
    const list = [...form.bankAccounts];
    if (field === 'isDefault' && value) {
      list.forEach(b => b.isDefault = false); // only one default
    }
    list[index] = { ...list[index], [field]: value };
    setForm({ ...form, bankAccounts: list });
  };

  const removeBank = (index) => {
    setForm({ ...form, bankAccounts: form.bankAccounts.filter((_, i) => i !== index) });
  };

  // localStorage QR helpers — completely bypasses server size limits
  const loadQRsFromLocal = (companyId, banks) => {
    const qrMap = JSON.parse(localStorage.getItem(`tallyflow_qr_${companyId}`) || '{}');
    return banks.map(b => ({ ...b, qrCode: b.qrCode || qrMap[b.accountNumber] || '' }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const companyId = activeCompany?._id || 'new';
      
      // Step 1: Save QR images to localStorage FIRST (no server, no size limit)
      const qrMap = {};
      form.bankAccounts.forEach(b => { if (b.accountNumber && b.qrCode) qrMap[b.accountNumber] = b.qrCode; });
      localStorage.setItem(`tallyflow_qr_${companyId}`, JSON.stringify(qrMap));

      // Step 2: Send only text data to server (no base64 images)
      const payload = {
        name: form.name, address: form.address, city: form.city, state: form.state, stateCode: form.stateCode,
        pincode: form.pincode, phone: form.phone, email: form.email,
        gstin: form.gstin, pan: form.pan, baseCurrency: form.baseCurrency,
        currencySymbol: form.currencySymbol, gstEnabled: form.gstEnabled,
        inventoryEnabled: form.inventoryEnabled,
        bankAccounts: form.bankAccounts.map(b => ({
          bankName: b.bankName, accountNumber: b.accountNumber,
          ifscCode: b.ifscCode, branch: b.branch, isDefault: b.isDefault
        }))
      };

      let serverData;
      justSaved.current = true;
      if (activeCompany) {
        const res = await companyAPI.update(activeCompany._id, payload);
        serverData = res.data.data;
        toast.success('Company details updated!');
      } else {
        const res = await companyAPI.create(payload);
        serverData = res.data.data;
        // If new company, re-key QR map with actual _id
        localStorage.setItem(`tallyflow_qr_${serverData._id}`, JSON.stringify(qrMap));
        toast.success(`Company "${serverData.name}" created!`);
        navigate('/');
      }

      // Step 3: Merge QR codes from localStorage back into the response
      const mergedBanks = loadQRsFromLocal(serverData._id, serverData.bankAccounts || []);
      const mergedData = { ...serverData, bankAccounts: mergedBanks };

      // Step 4: Update form and Redux with QR-merged data
      setForm(prev => ({ ...prev, bankAccounts: mergedBanks }));
      dispatch(setActiveCompany(mergedData));
      
      const compRes = await companyAPI.getAll();
      const companiesWithQr = compRes.data.data.map(c => ({
        ...c, bankAccounts: loadQRsFromLocal(c._id, c.bankAccounts || [])
      }));
      dispatch(setCompanies(companiesWithQr));
      
    } catch (err) {
      justSaved.current = false;
      toast.error(err.response?.data?.message || 'Failed to save company');
    } finally { setLoading(false); }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>👤 {activeCompany ? 'Profile' : 'Account Setup'}</h1>
          <p>{activeCompany ? 'Update your business profile and bank accounts' : 'Create your business profile to get started'}</p>
        </div>
        <button className="btn btn-primary" onClick={handleSubmit} disabled={loading}><FiSave /> {loading ? 'Saving...' : 'Save Profile'}</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: '24px' }}>
        <form className="card" onSubmit={handleSubmit}>
          <div className="card-title" style={{ marginBottom: '16px' }}>Business Details</div>
          <div className="form-group">
            <label className="form-label">Company Name *</label>
            <input type="text" className="form-input" name="name" placeholder="ABC Traders Pvt Ltd"
              value={form.name} onChange={handleChange} required />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">GSTIN</label>
              <input type="text" className="form-input" name="gstin" placeholder="22AAAAA0000A1Z5"
                value={form.gstin} onChange={handleChange} maxLength={15} />
            </div>
            <div className="form-group">
              <label className="form-label">PAN</label>
              <input type="text" className="form-input" name="pan" placeholder="AAAAA0000A"
                value={form.pan} onChange={handleChange} maxLength={10} />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Address</label>
            <textarea className="form-input" name="address" placeholder="Street address"
              value={form.address} onChange={handleChange} rows={2} style={{ resize: 'vertical' }} />
          </div>
          <div className="form-row">
            <div className="form-group" style={{ flex: 2 }}>
              <label className="form-label">City</label>
              <input type="text" className="form-input" name="city" placeholder="Mumbai" value={form.city} onChange={handleChange} />
            </div>
            <div className="form-group" style={{ flex: 2 }}>
              <label className="form-label">State</label>
              <input type="text" className="form-input" name="state" placeholder="Maharashtra" value={form.state} onChange={handleChange} />
            </div>
            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label">State Code</label>
              <input type="text" className="form-input" name="stateCode" placeholder="27" value={form.stateCode} onChange={handleChange} maxLength={2} />
            </div>
            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label">Pincode</label>
              <input type="text" className="form-input" name="pincode" placeholder="400001" value={form.pincode} onChange={handleChange} />
            </div>
          </div>
          <div className="form-row" style={{ marginBottom: '20px' }}>
            <div className="form-group">
              <label className="form-label">Phone</label>
              <input type="text" className="form-input" name="phone" placeholder="+91 9876543210" value={form.phone} onChange={handleChange} />
            </div>
            <div className="form-group">
              <label className="form-label">Email</label>
              <input type="email" className="form-input" name="email" placeholder="company@email.com" value={form.email} onChange={handleChange} />
            </div>
          </div>
        </form>

        <div className="card">
          <div className="card-header" style={{ marginBottom: '16px' }}>
            <div className="card-title">Bank Accounts</div>
            <button type="button" className="btn btn-outline btn-sm" onClick={addBank}><FiPlus /> Add Bank Account</button>
          </div>
          
          {form.bankAccounts.length === 0 ? (
            <div className="empty-state" style={{ padding: '20px' }}>
              <p>No bank accounts added. These will be available for quick-fill in Tax Invoices.</p>
              <button type="button" className="btn btn-primary btn-sm" onClick={addBank} style={{ marginTop: '10px' }}><FiPlus /> Add First Account</button>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: '16px' }}>
              {form.bankAccounts.map((bank, i) => (
                <div key={i} style={{ padding: '16px', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', background: 'var(--bg-secondary)', position: 'relative' }}>
                  <button type="button" onClick={() => removeBank(i)} style={{ position: 'absolute', top: '12px', right: '12px', background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer' }}><FiTrash2 /></button>
                  <label className="form-checkbox" style={{ marginBottom: '12px', fontWeight: 600 }}>
                    <input type="checkbox" checked={bank.isDefault} onChange={e => updateBank(i, 'isDefault', e.target.checked)} />
                    Default Account
                  </label>
                  <div className="form-row">
                    <div className="form-group" style={{ flex: 2 }}><label className="form-label">Bank Name *</label><input type="text" className="form-input" value={bank.bankName} onChange={e => updateBank(i, 'bankName', e.target.value)} required /></div>
                    <div className="form-group" style={{ flex: 2 }}><label className="form-label">Account No *</label><input type="text" className="form-input" value={bank.accountNumber} onChange={e => updateBank(i, 'accountNumber', e.target.value)} required /></div>
                  </div>
                  <div className="form-row">
                    <div className="form-group" style={{ flex: 1 }}><label className="form-label">IFSC Code *</label><input type="text" className="form-input" value={bank.ifscCode} onChange={e => updateBank(i, 'ifscCode', e.target.value.toUpperCase())} required /></div>
                    <div className="form-group" style={{ flex: 1 }}><label className="form-label">Branch</label><input type="text" className="form-input" value={bank.branch} onChange={e => updateBank(i, 'branch', e.target.value)} /></div>
                  </div>
                  <div className="form-group" style={{ marginTop: '12px' }}>
                    <label className="form-label" style={{ fontSize: '0.8rem' }}>Payment QR Code (Optional)</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                      {bank.qrCode ? (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', background: 'var(--bg-primary)', border: '1px dashed var(--border)', padding: '8px', borderRadius: 'var(--radius-sm)' }}>
                          <img src={bank.qrCode} alt="Bank QR" style={{ width: '60px', height: '60px', objectFit: 'contain' }} />
                          <button type="button" className="btn btn-ghost btn-sm" onClick={() => updateBank(i, 'qrCode', '')} style={{ color: 'var(--danger)', fontSize: '0.65rem', marginTop: '4px', padding: '0 4px', minHeight: 'auto' }}>Remove</button>
                        </div>
                      ) : (
                        <input type="file" className="form-input btn-sm" accept="image/*" onChange={(e) => handleQrUpload(i, e)} style={{ padding: '4px 8px', fontSize: '0.75rem' }} />
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Bottom Save Button for better visibility */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
          <button className="btn btn-primary btn-lg" onClick={handleSubmit} disabled={loading} style={{ padding: '16px 40px', fontSize: '1.1rem' }}>
            <FiSave size={20} /> {loading ? 'Saving...' : 'Save All Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}
