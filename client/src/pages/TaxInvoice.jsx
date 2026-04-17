import { useState, useEffect, useRef } from 'react';
import { useSelector } from 'react-redux';
import { customerAPI, invoiceAPI, productAPI } from '../services/api';
import { numberToWords, formatCurrency, formatDate, generateInvoiceNumber } from '../utils/helpers';
import { FiPlus, FiTrash2, FiPrinter, FiSave, FiSearch, FiUserPlus, FiBox } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { parseGSTIN } from '../utils/gstHelper';

const indianStates = { '01': 'Jammu & Kashmir', '02': 'Himachal Pradesh', '03': 'Punjab', '04': 'Chandigarh', '05': 'Uttarakhand', '06': 'Haryana', '07': 'Delhi', '08': 'Rajasthan', '09': 'Uttar Pradesh', '10': 'Bihar', '11': 'Sikkim', '12': 'Arunachal Pradesh', '13': 'Nagaland', '14': 'Manipur', '15': 'Mizoram', '16': 'Tripura', '17': 'Meghalaya', '18': 'Assam', '19': 'West Bengal', '20': 'Jharkhand', '21': 'Odisha', '22': 'Chhattisgarh', '23': 'Madhya Pradesh', '24': 'Gujarat', '25': 'Daman & Diu', '26': 'Dadra & Nagar Haveli', '27': 'Maharashtra', '28': 'Andhra Pradesh', '29': 'Karnataka', '30': 'Goa', '31': 'Lakshadweep', '32': 'Kerala', '33': 'Tamil Nadu', '34': 'Puducherry', '35': 'Andaman & Nicobar', '36': 'Telangana', '37': 'Andhra Pradesh (New)' };

const gstRates = [0, 0.25, 3, 5, 12, 18, 28];

const DRAFT_KEY = 'tallyflow_invoice_draft';

export default function TaxInvoice() {
  const { activeCompany } = useSelector((s) => s.company);
  const printRef = useRef();

  // Try to load draft from localStorage
  const draft = (() => {
    try {
      const saved = localStorage.getItem(DRAFT_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) { }
    return null;
  })();

  // Customers & Search basics
  const [customers, setCustomers] = useState([]);
  const [customerSearch, setCustomerSearch] = useState('');
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);

  // Default structures
  const emptyData = (cat) => ({
    invoice: { invoiceNumber: generateInvoiceNumber(), invoiceDate: new Date().toISOString().slice(0, 10), dueDate: '', placeOfSupply: '', reverseCharge: false, transportMode: '', vehicleNumber: '', eWayBillNo: '' },
    buyer: { name: '', address: '', city: '', state: '', stateCode: '', pincode: '', gstin: '', pan: '', phone: '', email: '' },
    items: [{ srNo: 1, description: '', hsnSac: '', quantity: 1, unit: 'Nos', rate: 0, discount: 0, gstRate: 18, cessRate: 0, priceType: 'exclusive' }],
    bank: activeCompany?.bankAccounts?.find(b => b.isDefault) || activeCompany?.bankAccounts?.[0] || { bankName: '', accountNumber: '', ifscCode: '', branch: '', qrCode: '' },
    notes: '',
    showQrCode: true,
    taxType: 'intraState',
    copyType: 'Original for Recipient',
    selectedCustomer: null
  });

  const [invoiceCategory, setInvoiceCategory] = useState(draft?.invoiceCategory || 'official');
  
  // Storage for all categories
  const [allDrafts, setAllDrafts] = useState(draft?.allDrafts || {
    official: emptyData('official'),
    local: emptyData('local'),
    challan: emptyData('challan')
  });

  // Active fields (synced with the current category)
  const [invoice, setInvoice] = useState(allDrafts[invoiceCategory]?.invoice || emptyData(invoiceCategory).invoice);
  const [buyer, setBuyer] = useState(allDrafts[invoiceCategory]?.buyer || emptyData(invoiceCategory).buyer);
  const [items, setItems] = useState(allDrafts[invoiceCategory]?.items || emptyData(invoiceCategory).items);
  const [bank, setBank] = useState(allDrafts[invoiceCategory]?.bank || emptyData(invoiceCategory).bank);
  const [taxType, setTaxType] = useState(allDrafts[invoiceCategory]?.taxType || emptyData(invoiceCategory).taxType);
  const [copyType, setCopyType] = useState(allDrafts[invoiceCategory]?.copyType || emptyData(invoiceCategory).copyType);
  const [notes, setNotes] = useState(allDrafts[invoiceCategory]?.notes || emptyData(invoiceCategory).notes);
  const [showQrCode, setShowQrCode] = useState(allDrafts[invoiceCategory]?.showQrCode ?? true);
  const [selectedCustomer, setSelectedCustomer] = useState(allDrafts[invoiceCategory]?.selectedCustomer || null);
  
  const [terms, setTerms] = useState(draft?.terms || '1. Payment is due within 30 days.\n2. Goods once sold will not be taken back.\n3. Interest @18% p.a. will be charged on overdue payments.');
  const [lastSavedInvoice, setLastSavedInvoice] = useState(null);

  // Sync active fields to allDrafts whenever they change
  useEffect(() => {
    setAllDrafts(prev => ({
      ...prev,
      [invoiceCategory]: { invoice, buyer, items, bank, taxType, copyType, notes, showQrCode, selectedCustomer }
    }));
  }, [invoice, buyer, items, bank, taxType, copyType, notes, showQrCode, selectedCustomer, invoiceCategory]);

  // Save everything to localStorage
  useEffect(() => {
    localStorage.setItem(DRAFT_KEY, JSON.stringify({ invoiceCategory, allDrafts, terms }));
  }, [invoiceCategory, allDrafts, terms]);

  // Products lookup
  const [products, setProducts] = useState([]);
  const [activeItemIndex, setActiveItemIndex] = useState(null);

  // Load customers & products
  useEffect(() => {
    customerAPI.getAll().then(r => setCustomers(r.data.data)).catch(() => { });
    productAPI.getAll().then(r => setProducts(r.data.data)).catch(() => { });
  }, []);

  // Auto-detect tax type from state codes
  useEffect(() => {
    if (activeCompany?.stateCode && buyer.stateCode) {
      setTaxType(activeCompany.stateCode === buyer.stateCode ? 'intraState' : 'interState');
    }
  }, [buyer.stateCode, activeCompany?.stateCode]);

  // Helper: get QR code for a bank account from localStorage
  const getBankQr = (companyId, accountNumber) => {
    const qrMap = JSON.parse(localStorage.getItem(`tallyflow_qr_${companyId}`) || '{}');
    return qrMap[accountNumber] || '';
  };

  // Auto-populate bank details if empty or if company profile just loaded
  useEffect(() => {
    if (activeCompany?.bankAccounts?.length > 0) {
      const defaultBank = activeCompany.bankAccounts.find(b => b.isDefault) || activeCompany.bankAccounts[0];
      
      // If current bank state is totally empty, fill it automatically
      if (!bank.bankName && !bank.accountNumber && defaultBank) {
        setBank({
          bankName: defaultBank.bankName,
          accountNumber: defaultBank.accountNumber,
          ifscCode: defaultBank.ifscCode,
          branch: defaultBank.branch || '',
          qrCode: defaultBank.qrCode || getBankQr(activeCompany._id, defaultBank.accountNumber)
        });
      }
    }
  }, [activeCompany, bank.bankName, bank.accountNumber]);

  const refreshBankFromProfile = () => {
    if (activeCompany?.bankAccounts?.length > 0) {
      const defaultBank = activeCompany.bankAccounts.find(b => b.isDefault) || activeCompany.bankAccounts[0];
      if (defaultBank) {
        setBank({
          bankName: defaultBank.bankName,
          accountNumber: defaultBank.accountNumber,
          ifscCode: defaultBank.ifscCode,
          branch: defaultBank.branch || '',
          qrCode: defaultBank.qrCode || getBankQr(activeCompany._id, defaultBank.accountNumber)
        });
        toast.success('Bank details updated from profile');
      }
    } else {
      toast.error('No bank details found in your profile');
    }
  };
  
  const handleTabChange = (cat) => {
    const scrollPos = window.scrollY;
    
    // Switch active states to the values from the next category
    const next = allDrafts[cat];
    if (next) {
      setInvoice(next.invoice);
      setBuyer(next.buyer);
      setItems(next.items);
      setBank(next.bank);
      setTaxType(next.taxType);
      setCopyType(next.copyType);
      setNotes(next.notes);
      setShowQrCode(next.showQrCode ?? true);
      setSelectedCustomer(next.selectedCustomer);
    }
    
    setInvoiceCategory(cat);
    requestAnimationFrame(() => window.scrollTo(0, scrollPos));
  };

  const handleCopyFrom = (sourceCat) => {
    const source = allDrafts[sourceCat];
    if (source) {
      // Don't copy actual invoice numbers, generate new one for target
      setBuyer(source.buyer);
      setItems(source.items);
      setBank(source.bank);
      setTaxType(source.taxType);
      setNotes(source.notes);
      setShowQrCode(source.showQrCode ?? true);
      setSelectedCustomer(source.selectedCustomer);
      toast.success(`Copied details from ${sourceCat.toUpperCase()}`);
    }
  };

  const handleClearForm = () => {
    if (window.confirm('Kya aap pakka is category ka data clear karna chahte hain?')) {
      const fresh = emptyData(invoiceCategory);
      setInvoice(fresh.invoice);
      setBuyer(fresh.buyer);
      setItems(fresh.items);
      setBank(fresh.bank);
      setTaxType(fresh.taxType);
      setCopyType(fresh.copyType);
      setNotes(fresh.notes);
      setShowQrCode(fresh.showQrCode);
      setSelectedCustomer(null);
      toast.success('Fields cleared!');
    }
  };

  // Select customer from saved list
  const selectCustomer = (c) => {
    setSelectedCustomer(c);
    setBuyer({
      name: c.name, address: c.address || '', city: c.city || '', state: c.state || '',
      stateCode: c.stateCode || '', pincode: c.pincode || '', gstin: c.gstin || '',
      pan: c.pan || '', phone: c.phones?.[0] || '', email: c.email || '',
    });
    setCustomerSearch('');
    setShowCustomerDropdown(false);
    toast.success(`Loaded: ${c.name}`);
  };

  // Filtered customers for dropdown
  const filteredCustomers = customers.filter(c => {
    // If official mode, only show customers with GSTIN
    if (invoiceCategory === 'official' && !c.gstin) return false;
    
    // Apply search filter if active
    if (!customerSearch.trim()) return true;
    return c.name.toLowerCase().includes(customerSearch.toLowerCase()) || 
           c.gstin?.includes(customerSearch.toUpperCase());
  });

  // ===== CALCULATIONS =====
  const getItemCalc = (item) => {
    const gross = item.quantity * item.rate;
    const discountAmt = (gross * item.discount) / 100;
    let taxableAmount, cgst = 0, sgst = 0, igst = 0, cess = 0;

    if (invoiceCategory === 'local' || invoiceCategory === 'challan') {
      taxableAmount = gross - discountAmt;
      const totalAmount = taxableAmount;
      return { taxableAmount, cgst: 0, sgst: 0, igst: 0, cess: 0, totalAmount, discountAmt };
    }

    if (item.priceType === 'inclusive') {
      // Reverse-calculate: rate includes GST
      taxableAmount = gross / (1 + item.gstRate / 100);
      taxableAmount = taxableAmount - (taxableAmount * item.discount / 100);
    } else {
      taxableAmount = gross - discountAmt;
    }

    if (taxType === 'intraState') {
      cgst = (taxableAmount * item.gstRate) / 200;
      sgst = (taxableAmount * item.gstRate) / 200;
    } else {
      igst = (taxableAmount * item.gstRate) / 100;
    }
    cess = (taxableAmount * item.cessRate) / 100;
    const totalAmount = taxableAmount + cgst + sgst + igst + cess;
    return { taxableAmount, cgst, sgst, igst, cess, totalAmount, discountAmt: item.priceType === 'inclusive' ? 0 : discountAmt };
  };

  const calculations = (() => {
    let totalBeforeTax = 0, totalCGST = 0, totalSGST = 0, totalIGST = 0, totalCess = 0, totalDiscount = 0;
    const itemCalcs = items.map(item => {
      const calc = getItemCalc(item);
      totalBeforeTax += calc.taxableAmount;
      totalCGST += calc.cgst; totalSGST += calc.sgst; totalIGST += calc.igst; totalCess += calc.cess; totalDiscount += calc.discountAmt;
      return { ...item, ...calc };
    });
    const totalTax = totalCGST + totalSGST + totalIGST + totalCess;
    const grandTotal = totalBeforeTax + totalTax;
    const roundOff = Math.round(grandTotal) - grandTotal;
    return { itemCalcs, totalBeforeTax, totalCGST, totalSGST, totalIGST, totalCess, totalTax, totalDiscount, grandTotal: Math.round(grandTotal), roundOff };
  })();

  // ===== ITEM OPS =====
  const addItem = () => setItems([...items, { srNo: items.length + 1, description: '', hsnSac: '', quantity: 1, unit: 'Nos', rate: 0, discount: 0, gstRate: 18, cessRate: 0, priceType: 'exclusive' }]);
  const removeItem = (i) => { if (items.length <= 1) return; setItems(items.filter((_, idx) => idx !== i).map((it, idx) => ({ ...it, srNo: idx + 1 }))); };
  const updateItem = (i, field, value) => { const u = [...items]; u[i] = { ...u[i], [field]: ['description', 'hsnSac', 'unit', 'priceType'].includes(field) ? value : Number(value) }; setItems(u); };

  const selectProduct = (i, prod) => {
    const u = [...items];
    u[i] = {
      ...u[i],
      description: prod.name + (prod.description ? ` - ${prod.description}` : ''),
      hsnSac: prod.hsnSac || u[i].hsnSac,
      unit: prod.unit || u[i].unit,
      rate: prod.rate || u[i].rate,
      gstRate: prod.gstRate || u[i].gstRate,
      cessRate: prod.cessRate || u[i].cessRate,
      priceType: prod.priceType || u[i].priceType
    };
    setItems(u);
    setActiveItemIndex(null);
  };

  // Linked CGST/SGST rate change
  const updateGstRate = (i, value) => { const u = [...items]; u[i] = { ...u[i], gstRate: Number(value) }; setItems(u); };

  // ===== SAVE =====
  const handleSave = async () => {
    if (!buyer.name) return toast.error('Please fill buyer name');
    if (!items[0].description) return toast.error('Please add at least one item');
    try {
      const data = {
        invoiceNumber: invoice.invoiceNumber, invoiceCategory, invoiceDate: invoice.invoiceDate, dueDate: invoice.dueDate || undefined,
        copyType, taxType: invoiceCategory === 'local' ? 'intraState' : taxType,
        seller: {
          name: activeCompany?.name, address: activeCompany?.address, city: activeCompany?.city,
          state: activeCompany?.state, stateCode: activeCompany?.stateCode, pincode: activeCompany?.pincode,
          gstin: activeCompany?.gstin, pan: activeCompany?.pan,
          phones: activeCompany?.phones?.length ? activeCompany.phones : [activeCompany?.phone].filter(Boolean),
          email: activeCompany?.email,
        },
        customer: selectedCustomer?._id || undefined,
        buyer, placeOfSupply: invoice.placeOfSupply, reverseCharge: invoice.reverseCharge,
        transportMode: invoice.transportMode, vehicleNumber: invoice.vehicleNumber, eWayBillNo: invoice.eWayBillNo,
        items: calculations.itemCalcs.map(ic => ({
          srNo: ic.srNo, description: ic.description, hsnSac: ic.hsnSac, quantity: ic.quantity, unit: ic.unit,
          rate: ic.rate, discount: ic.discount, gstRate: ic.gstRate, cessRate: ic.cessRate, priceType: ic.priceType,
          taxableAmount: ic.taxableAmount, cgstAmount: ic.cgst, sgstAmount: ic.sgst, igstAmount: ic.igst, cessAmount: ic.cess, totalAmount: ic.totalAmount,
        })),
        totalBeforeTax: calculations.totalBeforeTax, totalDiscount: calculations.totalDiscount,
        totalCGST: calculations.totalCGST, totalSGST: calculations.totalSGST, totalIGST: calculations.totalIGST,
        totalCess: calculations.totalCess, totalTax: calculations.totalTax, grandTotal: calculations.grandTotal,
        roundOff: calculations.roundOff, amountInWords: numberToWords(calculations.grandTotal),
        bankName: bank.bankName, accountNumber: bank.accountNumber, ifscCode: bank.ifscCode, bankBranch: bank.branch,
        narration: notes, terms,
      };
      const res = await invoiceAPI.create(data);
      toast.success('Invoice saved!');
      setLastSavedInvoice(res.data.data);
      localStorage.removeItem(DRAFT_KEY);
      setInvoice({ invoiceNumber: generateInvoiceNumber(), invoiceDate: new Date().toISOString().slice(0, 10), dueDate: '', placeOfSupply: '', reverseCharge: false, transportMode: '', vehicleNumber: '', eWayBillNo: '' });
      setBuyer({ name: '', address: '', city: '', state: '', stateCode: '', pincode: '', gstin: '', pan: '', phone: '', email: '' });
      setSelectedCustomer(null);
      setItems([{ srNo: 1, description: '', hsnSac: '', quantity: 1, unit: 'Nos', rate: 0, discount: 0, gstRate: 18, cessRate: 0, priceType: 'exclusive' }]);
      setNotes('');
      setShowQrCode(true);
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to save'); }
  };

  const handlePrint = () => window.print();
  const fmt = (n) => formatCurrency(n);

  return (
    <div>
      {/* Page header */}
      <div className="page-header no-print">
        <div>
          <h1>{invoiceCategory === 'official' ? '📄 GST Tax Invoice' : invoiceCategory === 'local' ? '📝 Local Estimate' : '🚚 Delivery Challan'}</h1>
          <p>{invoiceCategory === 'official' ? 'Generate, save & print GST-compliant tax invoices' : invoiceCategory === 'local' ? 'Generate rough estimates & non-GST kacchi parchi' : 'Generate gate pass / delivery challan for goods movement'}</p>
        </div>
        <div className="page-actions">
          {lastSavedInvoice && (
            <button className="btn" style={{ background: '#25D366', color: '#fff', border: 'none' }} onClick={() => {
              const url = `https://wa.me/?text=Hello, your ${lastSavedInvoice.invoiceCategory === 'challan' ? 'Delivery Challan' : 'bill'} ${lastSavedInvoice.invoiceNumber} for Rs.${lastSavedInvoice.grandTotal} from ${activeCompany?.name} is ready.`;
              window.open(url, '_blank');
            }}>
              Share on WhatsApp
            </button>
          )}
          <button className="btn btn-ghost" style={{ color: 'var(--danger)', border: '1px solid var(--danger-light)' }} onClick={handleClearForm}>🧹 Clear All</button>
          <button className="btn btn-success" onClick={handleSave}><FiSave /> Save {invoiceCategory === 'official' ? 'Invoice' : invoiceCategory === 'local' ? 'Estimate' : 'Challan'}</button>
          <button className="btn btn-secondary" onClick={handlePrint}><FiPrinter /> Print</button>
        </div>
      </div>

      <div className="no-print" style={{ marginBottom: '20px' }}>
        <div className="tabs" style={{ background: 'var(--bg-secondary)', padding: '6px', borderRadius: '12px', display: 'inline-flex' }}>
          <button className={`tab ${invoiceCategory === 'official' ? 'active' : ''}`} onClick={() => handleTabChange('official')} style={{ padding: '8px 24px', borderRadius: '8px' }}>🏢 Official GST Invoice</button>
          <button className={`tab ${invoiceCategory === 'local' ? 'active' : ''}`} onClick={() => handleTabChange('local')} style={{ padding: '8px 24px', borderRadius: '8px' }}>📝 Local Estimate (Kacchi Parchi)</button>
          <button className={`tab ${invoiceCategory === 'challan' ? 'active' : ''}`} onClick={() => handleTabChange('challan')} style={{ padding: '8px 24px', borderRadius: '8px' }}>🚚 Delivery Challan</button>
        </div>
      </div>

      {/* Manual Conversion Buttons */}
      <div className="no-print" style={{ marginBottom: '16px', display: 'flex', gap: '8px' }}>
        {invoiceCategory === 'official' && <button className="btn btn-sm btn-outline" onClick={() => handleCopyFrom('local')}>Copy from Local Estimate</button>}
        {invoiceCategory === 'official' && <button className="btn btn-sm btn-outline" onClick={() => handleCopyFrom('challan')}>Copy from Challan</button>}
        {invoiceCategory === 'local' && <button className="btn btn-sm btn-outline" onClick={() => handleCopyFrom('official')}>Copy from GST Invoice</button>}
        {invoiceCategory === 'challan' && <button className="btn btn-sm btn-outline" onClick={() => handleCopyFrom('official')}>Copy from GST Invoice</button>}
      </div>

      {/* === FORM (hidden on print) === */}
      <div className="no-print" style={{ marginBottom: '32px' }}>

        {/* Tax Type & Copy Type selector */}
        {invoiceCategory === 'official' && (
          <div className="card" style={{ marginBottom: '20px', padding: '16px 24px' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '24px', alignItems: 'center' }}>
              {/* Tax Type */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>Tax Type:</span>
                <div className="tabs" style={{ marginBottom: 0 }}>
                  <button className={`tab ${taxType === 'intraState' ? 'active' : ''}`} onClick={() => setTaxType('intraState')}>CGST + SGST (Same State)</button>
                  <button className={`tab ${taxType === 'interState' ? 'active' : ''}`} onClick={() => setTaxType('interState')}>IGST (Other State)</button>
                </div>
              </div>
              {/* Copy Type */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>Copy:</span>
                <select className="form-select" style={{ maxWidth: '240px' }} value={copyType} onChange={e => setCopyType(e.target.value)}>
                  <option>Original for Recipient</option>
                  <option>Duplicate for Supplier</option>
                  <option>Triplicate for Transporter</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Invoice & Buyer Details */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
          {/* Left: Invoice Details */}
          <div className="card">
            <div className="card-title" style={{ marginBottom: '16px' }}>Invoice Details</div>
            <div className="form-row">
              <div className="form-group"><label className="form-label">Invoice No. *</label>
                <input type="text" className="form-input" value={invoice.invoiceNumber} onChange={e => setInvoice({ ...invoice, invoiceNumber: e.target.value })} /></div>
              <div className="form-group"><label className="form-label">Invoice Date *</label>
                <input type="date" className="form-input" value={invoice.invoiceDate} onChange={e => setInvoice({ ...invoice, invoiceDate: e.target.value })} /></div>
            </div>
            <div className="form-row">
              <div className="form-group"><label className="form-label">Due Date</label>
                <input type="date" className="form-input" value={invoice.dueDate} onChange={e => setInvoice({ ...invoice, dueDate: e.target.value })} /></div>
              <div className="form-group"><label className="form-label">Place of Supply</label>
                <select className="form-select" value={invoice.placeOfSupply} onChange={e => setInvoice({ ...invoice, placeOfSupply: e.target.value })}>
                  <option value="">Select State</option>
                  {Object.entries(indianStates).map(([code, name]) => <option key={code} value={`${code}-${name}`}>{code} - {name}</option>)}
                </select></div>
            </div>
            <div className="form-row">
              <div className="form-group"><label className="form-label">Transport Mode</label>
                <input type="text" className="form-input" placeholder="Road/Rail/Air/Ship" value={invoice.transportMode} onChange={e => setInvoice({ ...invoice, transportMode: e.target.value })} /></div>
              <div className="form-group"><label className="form-label">Vehicle No.</label>
                <input type="text" className="form-input" placeholder="MH-01-AB-1234" value={invoice.vehicleNumber} onChange={e => setInvoice({ ...invoice, vehicleNumber: e.target.value })} /></div>
            </div>
            {invoiceCategory === 'official' && (
              <label className="form-checkbox" style={{ marginTop: '12px' }}>
                <input type="checkbox" checked={invoice.reverseCharge} onChange={e => setInvoice({ ...invoice, reverseCharge: e.target.checked })} /> Reverse Charge Applicable
              </label>
            )}
          </div>

          {/* Right: Buyer Details */}
          <div className="card">
            <div className="card-header" style={{ marginBottom: '12px' }}>
              <div className="card-title">Bill To (Customer)</div>
            </div>
            {/* Customer search/select */}
            <div className="form-group" style={{ position: 'relative' }}>
              <label className="form-label">Select Saved Customer</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <div style={{ flex: 1, position: 'relative' }}>
                  <input type="text" className="form-input" placeholder="🔍 Search by name or GSTIN..."
                    value={customerSearch} 
                    onChange={e => { setCustomerSearch(e.target.value); setShowCustomerDropdown(true); }}
                    onFocus={() => setShowCustomerDropdown(true)}
                    onBlur={() => setTimeout(() => setShowCustomerDropdown(false), 200)} />
                  {showCustomerDropdown && filteredCustomers.length > 0 && (
                    <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', maxHeight: '200px', overflowY: 'auto', zIndex: 100, boxShadow: 'var(--shadow-lg)' }}>
                      {filteredCustomers.map(c => (
                        <div key={c._id} style={{ padding: '10px 14px', cursor: 'pointer', borderBottom: '1px solid var(--border)', transition: 'background 0.15s' }}
                          onMouseDown={() => selectCustomer(c)}
                          onMouseEnter={e => e.target.style.background = 'var(--bg-hover)'}
                          onMouseLeave={e => e.target.style.background = 'transparent'}>
                          <div style={{ fontWeight: 600, fontSize: '0.88rem' }}>{c.name}</div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                            {c.gstin || 'No GSTIN'} • {c.city}, {c.state} {c.stateCode ? `(${c.stateCode})` : ''}
                            {c.totalBilled > 0 && <span style={{ color: 'var(--warning)', marginLeft: '8px' }}>Outstanding: {fmt(c.totalBilled - c.totalPaid)}</span>}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
            {selectedCustomer && (
              <div style={{ background: 'var(--accent-light)', padding: '8px 12px', borderRadius: 'var(--radius-sm)', marginBottom: '12px', fontSize: '0.8rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>✅ <strong>{selectedCustomer.name}</strong> — Invoices: {selectedCustomer.invoiceCount}, Outstanding: {fmt(selectedCustomer.totalBilled - selectedCustomer.totalPaid)}</span>
                <button className="btn btn-ghost btn-sm" style={{ padding: '2px 8px' }} onClick={() => { setSelectedCustomer(null); setBuyer({ name: '', address: '', city: '', state: '', stateCode: '', pincode: '', gstin: '', pan: '', phone: '', email: '' }); }}>✕</button>
              </div>
            )}
            <div className="form-group"><label className="form-label">Name / Company *</label>
              <input type="text" className="form-input" value={buyer.name} onChange={e => setBuyer({ ...buyer, name: e.target.value })} /></div>
            <div className="form-group"><label className="form-label">Address</label>
              <input type="text" className="form-input" value={buyer.address} onChange={e => setBuyer({ ...buyer, address: e.target.value })} /></div>
            <div className="form-row">
              <div className="form-group"><label className="form-label">City</label>
                <input type="text" className="form-input" value={buyer.city} onChange={e => setBuyer({ ...buyer, city: e.target.value })} /></div>
              <div className="form-group"><label className="form-label">State</label>
                <select className="form-select" value={buyer.stateCode} onChange={e => { const code = e.target.value; setBuyer({ ...buyer, stateCode: code, state: indianStates[code] || '' }); }}>
                  <option value="">Select</option>
                  {Object.entries(indianStates).map(([code, name]) => <option key={code} value={code}>{code}-{name}</option>)}
                </select></div>
              <div className="form-group"><label className="form-label">State Code</label>
                <input type="text" className="form-input" value={buyer.stateCode} readOnly style={{ background: 'var(--bg-hover)', fontFamily: 'JetBrains Mono', fontWeight: 700, fontSize: '1.1rem', textAlign: 'center' }} /></div>
            </div>
            {invoiceCategory === 'official' && (
              <div className="form-row">
                <div className="form-group"><label className="form-label">GSTIN</label>
                  <input type="text" className="form-input" value={buyer.gstin} onChange={e => {
                    const gstinVal = e.target.value.toUpperCase();
                    const parsed = parseGSTIN(gstinVal);
                    setBuyer({ 
                      ...buyer, 
                      gstin: gstinVal,
                      ...(parsed?.pan && !buyer.pan ? { pan: parsed.pan } : {}),
                      ...(parsed?.state && !buyer.state ? { state: parsed.state, stateCode: parsed.stateCode } : {})
                    });
                  }} maxLength={15} /></div>
                <div className="form-group"><label className="form-label">Pincode</label>
                  <input type="text" className="form-input" value={buyer.pincode} onChange={e => setBuyer({ ...buyer, pincode: e.target.value })} maxLength={6} /></div>
              </div>
            )}
            {invoiceCategory !== 'official' && (
              <div className="form-row">
                <div className="form-group"><label className="form-label">Pincode</label>
                  <input type="text" className="form-input" value={buyer.pincode} onChange={e => setBuyer({ ...buyer, pincode: e.target.value })} maxLength={6} /></div>
                <div className="form-group"></div>
              </div>
            )}
          </div>
        </div>

        {/* Line Items */}
        <div className="card" style={{ marginBottom: '20px' }}>
          <div className="card-header">
            <div className="card-title">Invoice Items</div>
            <button className="btn btn-primary btn-sm" onClick={addItem}><FiPlus /> Add Item</button>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: '40px' }}>Sr.</th>
                  <th style={{ minWidth: '180px' }}>Description</th>
                  {invoiceCategory === 'official' && <th>HSN/SAC</th>}
                  <th>Qty</th>
                  <th>Unit</th>
                  <th>Rate (₹)</th>
                  <th>Disc %</th>
                  {invoiceCategory === 'official' && (
                    <>
                      <th>GST %</th>
                      <th style={{ width: '100px' }}>Price Type</th>
                      <th style={{ textAlign: 'right' }}>Taxable</th>
                      {taxType === 'intraState' ? <><th style={{ textAlign: 'right' }}>CGST</th><th style={{ textAlign: 'right' }}>SGST</th></> : <th style={{ textAlign: 'right' }}>IGST</th>}
                    </>
                  )}
                  <th style={{ textAlign: 'right' }}>Total</th>
                  <th style={{ width: '40px' }}></th>
                </tr>
              </thead>
              <tbody>
                {calculations.itemCalcs.map((item, i) => (
                  <tr key={i}>
                    <td style={{ textAlign: 'center', fontWeight: 600 }}>{item.srNo}</td>
                    <td>
                      <input
                        type="text" className="form-input" placeholder="Product / Service" style={{ minWidth: '160px' }}
                        list={`products-list-${i}`}
                        value={item.description}
                        onChange={e => {
                          const val = e.target.value;
                          updateItem(i, 'description', val);
                          // Exact match auto-fill via datalist selection
                          const matched = products.find(p => p.name === val);
                          if (matched) selectProduct(i, matched);
                        }}
                      />
                      <datalist id={`products-list-${i}`}>
                        {products.map(p => (
                          <option key={p._id} value={p.name}>{p.hsnSac ? `HSN: ${p.hsnSac} | ` : ''}₹{p.rate}/{p.unit}</option>
                        ))}
                      </datalist>
                    </td>
                    {invoiceCategory === 'official' && <td><input type="text" className="form-input" placeholder="HSN" style={{ width: '80px' }} value={item.hsnSac} onChange={e => updateItem(i, 'hsnSac', e.target.value)} /></td>}
                    <td><input type="number" className="form-input" style={{ width: '60px', textAlign: 'right' }} value={items[i].quantity} min={1} onChange={e => updateItem(i, 'quantity', e.target.value)} /></td>
                    <td><select className="form-select" style={{ width: '70px' }} value={items[i].unit} onChange={e => updateItem(i, 'unit', e.target.value)}>
                      {['Nos', 'Pcs', 'Kg', 'Gm', 'Ltr', 'Mtr', 'Sqft', 'Box', 'Bag', 'Pair', 'Set', 'Hrs'].map(u => <option key={u} value={u}>{u}</option>)}</select></td>
                    <td><input type="number" className="form-input" style={{ width: '90px', textAlign: 'right', fontFamily: 'JetBrains Mono' }} value={items[i].rate} min={0} step="0.01" onChange={e => updateItem(i, 'rate', e.target.value)} /></td>
                    <td><input type="number" className="form-input" style={{ width: '55px', textAlign: 'right' }} value={items[i].discount} min={0} max={100} onChange={e => updateItem(i, 'discount', e.target.value)} /></td>
                    
                    {invoiceCategory === 'official' && (
                      <>
                        <td><select className="form-select" style={{ width: '70px' }} value={items[i].gstRate} onChange={e => updateGstRate(i, e.target.value)}>
                          {gstRates.map(r => <option key={r} value={r}>{r}%</option>)}</select></td>
                        <td><select className="form-select" style={{ width: '90px', fontSize: '0.75rem' }} value={items[i].priceType} onChange={e => updateItem(i, 'priceType', e.target.value)}>
                          <option value="exclusive">Excl. GST</option><option value="inclusive">Incl. GST</option></select></td>
                        <td className="amount" style={{ fontWeight: 600 }}>{fmt(item.taxableAmount)}</td>
                        {taxType === 'intraState' ? (
                          <><td className="amount" style={{ fontSize: '0.78rem' }}>{fmt(item.cgst)}<div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>@{(items[i].gstRate / 2).toFixed(1)}%</div></td>
                            <td className="amount" style={{ fontSize: '0.78rem' }}>{fmt(item.sgst)}<div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>@{(items[i].gstRate / 2).toFixed(1)}%</div></td></>
                        ) : (
                          <td className="amount" style={{ fontSize: '0.78rem' }}>{fmt(item.igst)}<div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>@{items[i].gstRate}%</div></td>
                        )}
                      </>
                    )}
                    <td className="amount" style={{ fontWeight: 700 }}>{fmt(item.totalAmount)}</td>
                    <td><button className="btn btn-ghost btn-icon" onClick={() => removeItem(i)} style={{ color: 'var(--danger)' }}><FiTrash2 /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Bank & Terms */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
          <div className="card">
            <div className="card-header" style={{ marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div className="card-title">Bank & Payment Details</div>
                <button type="button" className="btn btn-ghost btn-sm" onClick={refreshBankFromProfile} style={{ fontSize: '0.65rem', padding: '4px 8px', height: 'auto' }}>
                  Load from Profile
                </button>
              </div>
              {activeCompany?.bankAccounts?.length > 0 && (
                <select className="form-select btn-sm" style={{ width: 'auto', padding: '4px 8px', fontSize: '0.75rem' }} onChange={e => {
                  const b = activeCompany.bankAccounts[e.target.value];
                  if (b) setBank({ bankName: b.bankName, accountNumber: b.accountNumber, ifscCode: b.ifscCode, branch: b.branch, qrCode: b.qrCode || getBankQr(activeCompany._id, b.accountNumber) });
                }}>
                  <option value="">Auto-fill from saved...</option>
                  {activeCompany.bankAccounts.map((b, i) => (
                    <option key={i} value={i}>{b.bankName} - {b.accountNumber.slice(-4)}</option>
                  ))}
                </select>
              )}
            </div>
            <div className="form-row">
              <div className="form-group"><label className="form-label">Bank Name</label><input type="text" className="form-input" value={bank.bankName} onChange={e => setBank({ ...bank, bankName: e.target.value })} /></div>
              <div className="form-group"><label className="form-label">Account No.</label><input type="text" className="form-input" value={bank.accountNumber} onChange={e => setBank({ ...bank, accountNumber: e.target.value })} /></div>
            </div>
            <div className="form-row">
              <div className="form-group"><label className="form-label">IFSC Code</label><input type="text" className="form-input" value={bank.ifscCode} onChange={e => setBank({ ...bank, ifscCode: e.target.value.toUpperCase() })} /></div>
              <div className="form-group"><label className="form-label">Branch</label><input type="text" className="form-input" value={bank.branch} onChange={e => setBank({ ...bank, branch: e.target.value })} /></div>
            </div>
            <div className="form-group" style={{ marginTop: '12px' }}>
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <input type="checkbox" checked={showQrCode} onChange={e => setShowQrCode(e.target.checked)} style={{ width: '16px', height: '16px' }} />
                Show Payment QR Code on Invoice?
              </label>
              {!(bank?.qrCode || getBankQr(activeCompany?._id, bank?.accountNumber)) && showQrCode && (
                <div style={{ fontSize: '0.75rem', color: 'var(--danger)', marginTop: '4px' }}>⚠️ No QR code found for this bank. Please upload one in Company Profile.</div>
              )}
            </div>
          </div>
          <div className="card">
            <div className="card-title" style={{ marginBottom: '16px' }}>Terms & Notes</div>
            <textarea className="form-input" value={terms} onChange={e => setTerms(e.target.value)} rows={4} style={{ resize: 'vertical', fontSize: '0.82rem' }} />
            <div className="form-group" style={{ marginTop: '12px' }}><label className="form-label">Notes</label>
              <input type="text" className="form-input" value={notes} placeholder="Thank you for your business!" onChange={e => setNotes(e.target.value)} /></div>
          </div>
        </div>
      </div>

      {/* ====== PRINTABLE INVOICE ====== */}
      <div className="invoice-print-area" ref={printRef}>
        <div className="invoice-wrapper">
          <div className="invoice-container">
            {/* Header */}
          <div className="invoice-header">
            <div className="invoice-title-bar">
              <h1>{invoiceCategory === 'official' ? 'TAX INVOICE' : invoiceCategory === 'local' ? 'INVOICE' : 'DELIVERY CHALLAN'}</h1>
              {invoiceCategory === 'official' && <div className="invoice-original">{copyType}</div>}
            </div>
          </div>

          {/* Company & Meta */}
          <div className="invoice-two-col">
            <div className="invoice-col invoice-seller">
              <div className="invoice-company-name">{activeCompany?.name || 'Company Name'}</div>
              {activeCompany?.address && <div className="invoice-detail">{activeCompany.address}</div>}
              <div className="invoice-detail">{[activeCompany?.city, activeCompany?.state, activeCompany?.pincode].filter(Boolean).join(', ')}</div>
              {(activeCompany?.phones?.length > 0 || activeCompany?.phone) && (
                <div className="invoice-detail">Phone: {activeCompany?.phones?.length > 0 ? activeCompany.phones.join(' / ') : activeCompany?.phone}</div>
              )}
              {activeCompany?.email && <div className="invoice-detail">Email: {activeCompany.email}</div>}
              
              {invoiceCategory === 'official' && (
                <>
                  <div className="invoice-gst-row"><strong>GSTIN:</strong> <span>{activeCompany?.gstin || '—'}</span></div>
                  {activeCompany?.pan && <div className="invoice-gst-row"><strong>PAN:</strong> <span>{activeCompany.pan}</span></div>}
                  <div className="invoice-gst-row"><strong>State:</strong> <span>{activeCompany?.state || '—'}</span> &nbsp; <strong>Code:</strong> <span>{activeCompany?.stateCode || '—'}</span></div>
                </>
              )}
            </div>
            <div className="invoice-col invoice-meta">
              <table className="invoice-meta-table"><tbody>
                <tr><td className="meta-label">Invoice No.</td><td className="meta-value">{invoice.invoiceNumber}</td></tr>
                <tr><td className="meta-label">Date</td><td className="meta-value">{formatDate(invoice.invoiceDate)}</td></tr>
                {invoice.dueDate && <tr><td className="meta-label">Due Date</td><td className="meta-value">{formatDate(invoice.dueDate)}</td></tr>}
                {invoiceCategory === 'official' && (
                  <>
                    <tr><td className="meta-label">Place of Supply</td><td className="meta-value">{invoice.placeOfSupply || activeCompany?.state || '—'}</td></tr>
                    <tr><td className="meta-label">Reverse Charge</td><td className="meta-value">{invoice.reverseCharge ? 'Yes' : 'No'}</td></tr>
                  </>
                )}
                {invoice.transportMode && <tr><td className="meta-label">Transport</td><td className="meta-value">{invoice.transportMode}</td></tr>}
                {invoice.vehicleNumber && <tr><td className="meta-label">Vehicle No.</td><td className="meta-value">{invoice.vehicleNumber}</td></tr>}
              </tbody></table>
            </div>
          </div>

          {/* Buyer */}
          <div className="invoice-two-col invoice-buyer-section">
            <div className="invoice-col">
              <div className="invoice-section-label">Bill To</div>
              <div className="invoice-company-name" style={{ fontSize: '0.95rem' }}>{buyer.name || '—'}</div>
              {buyer.address && <div className="invoice-detail">{buyer.address}</div>}
              <div className="invoice-detail">{[buyer.city, buyer.state, buyer.pincode].filter(Boolean).join(', ')}</div>
              {buyer.phone && <div className="invoice-detail">Phone: {buyer.phone}</div>}
              
              {invoiceCategory === 'official' && (
                <>
                  {buyer.gstin && <div className="invoice-gst-row"><strong>GSTIN:</strong> <span>{buyer.gstin}</span></div>}
                  <div className="invoice-gst-row"><strong>State:</strong> <span>{buyer.state || '—'}</span> &nbsp; <strong>Code:</strong> <span>{buyer.stateCode || '—'}</span></div>
                </>
              )}
            </div>
            <div className="invoice-col"><div className="invoice-section-label">Ship To</div>
              <div className="invoice-detail" style={{ color: '#888', fontStyle: 'italic' }}>Same as billing address</div></div>
          </div>

          {/* Items Table */}
          <table className="invoice-table">
            <thead>
              {invoiceCategory === 'official' ? (
                <>
                  <tr>
                    <th rowSpan="2" style={{ width: '30px' }}>Sr.</th>
                    <th rowSpan="2" style={{ minWidth: '140px' }}>Description</th>
                    <th rowSpan="2">HSN/SAC</th>
                    <th rowSpan="2">Qty</th>
                    <th rowSpan="2">Unit</th>
                    <th rowSpan="2">Rate (₹)</th>
                    <th rowSpan="2">Disc.</th>
                    <th rowSpan="2" style={{ textAlign: 'right' }}>Taxable<br />Amt (₹)</th>
                    {taxType === 'intraState' ? (
                      <><th colSpan="2" style={{ textAlign: 'center', borderBottom: '1px solid #333' }}>CGST</th>
                        <th colSpan="2" style={{ textAlign: 'center', borderBottom: '1px solid #333' }}>SGST</th></>
                    ) : <th colSpan="2" style={{ textAlign: 'center', borderBottom: '1px solid #333' }}>IGST</th>}
                    <th rowSpan="2" style={{ textAlign: 'right' }}>Total (₹)</th>
                  </tr>
                  <tr>
                    {taxType === 'intraState' ? (
                      <><th>%</th><th style={{ textAlign: 'right' }}>Amt</th><th>%</th><th style={{ textAlign: 'right' }}>Amt</th></>
                    ) : <><th>%</th><th style={{ textAlign: 'right' }}>Amt</th></>}
                  </tr>
                </>
              ) : (
                <tr>
                  <th style={{ width: '40px' }}>Sr.</th>
                  <th style={{ minWidth: '200px' }}>Description</th>
                  <th>Qty</th>
                  <th>Unit</th>
                  <th style={{ textAlign: 'right' }}>Rate (₹)</th>
                  <th style={{ textAlign: 'center' }}>Disc.</th>
                  <th style={{ textAlign: 'right' }}>Total (₹)</th>
                </tr>
              )}
            </thead>
            <tbody>
              {calculations.itemCalcs.map((item, i) => (
                <tr key={i}>
                  <td style={{ textAlign: 'center' }}>{item.srNo}</td>
                  <td>{item.description || '—'}{invoiceCategory === 'official' && item.priceType === 'inclusive' && <span style={{ fontSize: '0.6rem', color: '#999', display: 'block' }}>(Incl. GST)</span>}</td>
                  {invoiceCategory === 'official' && <td style={{ textAlign: 'center', fontSize: '0.78rem' }}>{item.hsnSac || '—'}</td>}
                  <td style={{ textAlign: 'center' }}>{item.quantity}</td>
                  <td style={{ textAlign: 'center' }}>{item.unit}</td>
                  <td style={{ textAlign: 'right', fontFamily: 'monospace' }}>{item.rate.toFixed(2)}</td>
                  <td style={{ textAlign: 'center' }}>{item.discount > 0 ? item.discount + '%' : '—'}</td>
                  {invoiceCategory === 'official' && <td style={{ textAlign: 'right', fontFamily: 'monospace', fontWeight: 600 }}>{item.taxableAmount.toFixed(2)}</td>}
                  {invoiceCategory === 'official' && (
                    taxType === 'intraState' ? (
                      <><td style={{ textAlign: 'center', fontSize: '0.75rem' }}>{(item.gstRate / 2).toFixed(1)}%</td>
                        <td style={{ textAlign: 'right', fontFamily: 'monospace' }}>{item.cgst.toFixed(2)}</td>
                        <td style={{ textAlign: 'center', fontSize: '0.75rem' }}>{(item.gstRate / 2).toFixed(1)}%</td>
                        <td style={{ textAlign: 'right', fontFamily: 'monospace' }}>{item.sgst.toFixed(2)}</td></>
                    ) : (
                      <><td style={{ textAlign: 'center', fontSize: '0.75rem' }}>{item.gstRate.toFixed(1)}%</td>
                        <td style={{ textAlign: 'right', fontFamily: 'monospace' }}>{item.igst.toFixed(2)}</td></>
                    )
                  )}
                  <td style={{ textAlign: 'right', fontFamily: 'monospace', fontWeight: 700 }}>{item.totalAmount.toFixed(2)}</td>
                </tr>
              ))}
              {items.length < 4 && Array.from({ length: 4 - items.length }).map((_, i) => (
                <tr key={`e-${i}`} className="invoice-empty-row">
                  <td>&nbsp;</td><td></td>
                  {invoiceCategory === 'official' ? (
                    <><td></td><td></td><td></td><td></td><td></td><td></td>
                    {taxType === 'intraState' ? <><td></td><td></td><td></td><td></td></> : <><td></td><td></td></>}</>
                  ) : <><td></td><td></td><td></td><td></td></>}
                  <td></td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Totals */}
          <div className="invoice-totals-section" style={{ display: invoiceCategory !== 'official' ? 'flex' : undefined, justifyContent: invoiceCategory !== 'official' ? 'flex-end' : undefined }}>
            {invoiceCategory === 'official' && (
              <div className="invoice-totals-left">
                <div className="invoice-section-label" style={{ marginBottom: '6px' }}>Tax Breakup</div>
                <table className="invoice-tax-summary">
                  <thead><tr><th>Taxable</th>{taxType === 'intraState' ? <><th>CGST %</th><th>CGST</th><th>SGST %</th><th>SGST</th></> : <><th>IGST %</th><th>IGST</th></>}<th>Tax</th></tr></thead>
                  <tbody>
                    {calculations.itemCalcs.map((item, i) => (
                      <tr key={i}><td style={{ fontFamily: 'monospace' }}>{item.taxableAmount.toFixed(2)}</td>
                        {taxType === 'intraState' ? (
                          <><td>{(item.gstRate / 2).toFixed(1)}%</td><td style={{ fontFamily: 'monospace' }}>{item.cgst.toFixed(2)}</td>
                            <td>{(item.gstRate / 2).toFixed(1)}%</td><td style={{ fontFamily: 'monospace' }}>{item.sgst.toFixed(2)}</td></>
                        ) : <><td>{item.gstRate.toFixed(1)}%</td><td style={{ fontFamily: 'monospace' }}>{item.igst.toFixed(2)}</td></>}
                        <td style={{ fontFamily: 'monospace', fontWeight: 600 }}>{(item.cgst + item.sgst + item.igst).toFixed(2)}</td></tr>
                    ))}
                    <tr style={{ fontWeight: 700, borderTop: '2px solid #333' }}>
                      <td>{calculations.totalBeforeTax.toFixed(2)}</td>
                      {taxType === 'intraState' ? <><td></td><td>{calculations.totalCGST.toFixed(2)}</td><td></td><td>{calculations.totalSGST.toFixed(2)}</td></> : <><td></td><td>{calculations.totalIGST.toFixed(2)}</td></>}
                      <td>{calculations.totalTax.toFixed(2)}</td></tr>
                  </tbody>
                </table>
              </div>
            )}
            <div className="invoice-totals-right" style={{ width: invoiceCategory !== 'official' ? '300px' : undefined }}>
              <table className="invoice-summary-table"><tbody>
                {invoiceCategory === 'official' && <tr><td>Total Before Tax</td><td className="summary-amt">{fmt(calculations.totalBeforeTax)}</td></tr>}
                {calculations.totalDiscount > 0 && <tr><td>Discount</td><td className="summary-amt" style={{ color: '#ef4444' }}>(-) {fmt(calculations.totalDiscount)}</td></tr>}
                {invoiceCategory === 'official' && taxType === 'intraState' && (
                  <><tr><td>CGST</td><td className="summary-amt">{fmt(calculations.totalCGST)}</td></tr>
                    <tr><td>SGST</td><td className="summary-amt">{fmt(calculations.totalSGST)}</td></tr></>
                )}
                {invoiceCategory === 'official' && taxType === 'interState' && <tr><td>IGST</td><td className="summary-amt">{fmt(calculations.totalIGST)}</td></tr>}
                {calculations.roundOff !== 0 && <tr><td>Round Off</td><td className="summary-amt">{calculations.roundOff > 0 ? '+' : ''}{calculations.roundOff.toFixed(2)}</td></tr>}
                <tr className="invoice-grand-total-row"><td>Grand Total</td><td className="summary-amt">{fmt(calculations.grandTotal)}</td></tr>
              </tbody></table>
            </div>
          </div>

          {/* Amount in Words & QR */}
          <div className="invoice-amount-words" style={{ display: 'flex', alignItems: 'center', gap: '32px', pageBreakInside: 'avoid' }}>
            <div>
              <strong>Amount Chargeable (in words):</strong><br />
              <span className="words-text" style={{ display: 'inline-block', marginTop: '4px' }}>{numberToWords(calculations.grandTotal)}</span>
            </div>
            {showQrCode && (bank?.qrCode || getBankQr(activeCompany?._id, bank?.accountNumber)) && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', background: '#fff', border: '1px dashed #ccc', padding: '4px', borderRadius: '4px' }}>
                <img src={bank?.qrCode || getBankQr(activeCompany?._id, bank?.accountNumber)} alt="Payment QR" style={{ width: '64px', height: '64px', objectFit: 'contain' }} />
                <span style={{ fontSize: '0.55rem', fontWeight: 700, marginTop: '2px' }}>Scan to Pay</span>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="invoice-footer-section">
            <div className="invoice-footer-left">
              {bank.bankName && (
                <div className="invoice-bank-details">
                  <div className="invoice-section-label">Bank Details</div>
                  <div className="invoice-detail">Bank: <strong>{bank.bankName}</strong></div>
                  <div className="invoice-detail">A/c No: <strong>{bank.accountNumber}</strong></div>
                  <div className="invoice-detail">IFSC: <strong>{bank.ifscCode}</strong></div>
                  {bank.branch && <div className="invoice-detail">Branch: {bank.branch}</div>}
                </div>
              )}
              <div className="invoice-terms"><div className="invoice-section-label">Terms & Conditions</div>
                {terms.split('\n').map((line, i) => <div key={i} className="invoice-detail">{line}</div>)}</div>
              {notes && <div style={{ marginTop: '8px' }}><div className="invoice-section-label">Notes</div><div className="invoice-detail">{notes}</div></div>}
            </div>
            <div className="invoice-footer-right">
              <div className="invoice-signature-block">
                <div className="invoice-company-name" style={{ fontSize: '0.85rem', marginBottom: '4px' }}>For {activeCompany?.name || 'Company'}</div>
                <div className="invoice-signature-space"></div>
                <div className="invoice-signature-line">Authorised Signatory</div>
              </div>
            </div>
          </div>
          <div className="invoice-disclaimer">This is a computer-generated invoice.</div>
          </div>
        </div>
      </div>
    </div>
  );
}
