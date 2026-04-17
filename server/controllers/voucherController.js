const Voucher = require('../models/Voucher');
const Ledger = require('../models/Ledger');

const getNextVoucherNumber = async (type, companyId) => {
  const prefix = { 'Payment': 'PMT', 'Receipt': 'RCT', 'Sales': 'SAL', 'Purchase': 'PUR', 'Contra': 'CTR', 'Journal': 'JRN', 'Credit Note': 'CRN', 'Debit Note': 'DRN' };
  const lastVoucher = await Voucher.findOne({ voucherType: type, company: companyId }).sort('-createdAt');
  let num = 1;
  if (lastVoucher) { const match = lastVoucher.voucherNumber.match(/(\d+)$/); if (match) num = parseInt(match[1]) + 1; }
  return `${prefix[type] || 'VCH'}-${String(num).padStart(5, '0')}`;
};

const updateLedgerBalances = async (entries) => {
  for (const entry of entries) {
    const ledger = await Ledger.findById(entry.ledger);
    if (!ledger) continue;
    let currentBal = ledger.currentBalance * (ledger.currentBalanceType === 'Dr' ? 1 : -1);
    if (entry.type === 'Dr') currentBal += entry.amount; else currentBal -= entry.amount;
    ledger.currentBalance = Math.abs(currentBal);
    ledger.currentBalanceType = currentBal >= 0 ? 'Dr' : 'Cr';
    await ledger.save();
  }
};

const getVouchers = async (req, res) => {
  try {
    const { type, startDate, endDate, page = 1, limit = 50, search } = req.query;
    const query = { company: req.user.activeCompany, isCancelled: false };
    if (type) query.voucherType = type;
    if (startDate || endDate) { query.date = {}; if (startDate) query.date.$gte = new Date(startDate); if (endDate) query.date.$lte = new Date(endDate); }
    if (search) { query.$or = [{ voucherNumber: { $regex: search, $options: 'i' } }, { narration: { $regex: search, $options: 'i' } }, { partyName: { $regex: search, $options: 'i' } }]; }
    const vouchers = await Voucher.find(query).populate('entries.ledger', 'name').sort('-date -createdAt').skip((page - 1) * limit).limit(parseInt(limit));
    const total = await Voucher.countDocuments(query);
    res.json({ success: true, data: vouchers, total, page: parseInt(page), pages: Math.ceil(total / limit) });
  } catch (error) { res.status(500).json({ message: error.message }); }
};

const getVoucher = async (req, res) => {
  try {
    const voucher = await Voucher.findById(req.params.id).populate('entries.ledger', 'name').populate('createdBy', 'name');
    if (!voucher) return res.status(404).json({ message: 'Voucher not found' });
    res.json({ success: true, data: voucher });
  } catch (error) { res.status(500).json({ message: error.message }); }
};

const createVoucher = async (req, res) => {
  try {
    req.body.company = req.user.activeCompany;
    req.body.createdBy = req.user._id;
    if (!req.body.voucherNumber) { req.body.voucherNumber = await getNextVoucherNumber(req.body.voucherType, req.user.activeCompany); }
    let totalDr = 0;
    let totalCr = 0;
    for (const entry of req.body.entries) {
      if (entry.ledger) { const ledger = await Ledger.findById(entry.ledger); if (ledger) entry.ledgerName = ledger.name; }
      if (entry.type === 'Dr') totalDr += Number(entry.amount);
      else totalCr += Number(entry.amount);
    }

    if (Math.abs(totalDr - totalCr) > 0.01) {
      return res.status(400).json({ message: `Hisaab barabar nahi hai! Difference: ₹${Math.abs(totalDr - totalCr).toFixed(2)}` });
    }

    req.body.totalDebit = totalDr;
    req.body.totalCredit = totalCr;
    req.body.amount = totalDr;

    const voucher = await Voucher.create(req.body);
    await updateLedgerBalances(voucher.entries);
    const populated = await Voucher.findById(voucher._id).populate('entries.ledger', 'name').populate('createdBy', 'name');
    res.status(201).json({ success: true, data: populated });
  } catch (error) {
    console.error('Create voucher error:', error.message);
    res.status(500).json({ message: error.message });
  }
};

const updateVoucher = async (req, res) => {
  try {
    const voucher = await Voucher.findById(req.params.id);
    if (!voucher) return res.status(404).json({ message: 'Voucher not found' });
    for (const entry of voucher.entries) {
      const reversedEntry = { ...entry.toObject(), type: entry.type === 'Dr' ? 'Cr' : 'Dr' };
      await updateLedgerBalances([reversedEntry]);
    }
    const updated = await Voucher.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true }).populate('entries.ledger', 'name');
    await updateLedgerBalances(updated.entries);
    res.json({ success: true, data: updated });
  } catch (error) { res.status(500).json({ message: error.message }); }
};

const cancelVoucher = async (req, res) => {
  try {
    const voucher = await Voucher.findById(req.params.id);
    if (!voucher) return res.status(404).json({ message: 'Voucher not found' });
    for (const entry of voucher.entries) {
      const reversedEntry = { ...entry.toObject(), type: entry.type === 'Dr' ? 'Cr' : 'Dr' };
      await updateLedgerBalances([reversedEntry]);
    }
    voucher.isCancelled = true;
    await voucher.save();
    res.json({ success: true, message: 'Voucher cancelled' });
  } catch (error) { res.status(500).json({ message: error.message }); }
};

module.exports = { getVouchers, getVoucher, createVoucher, updateVoucher, cancelVoucher };
