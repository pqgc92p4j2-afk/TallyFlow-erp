const Ledger = require('../models/Ledger');
const Voucher = require('../models/Voucher');

const getLedgers = async (req, res) => {
  try {
    const { group, search, page = 1, limit = 50 } = req.query;
    const query = { company: req.user.activeCompany };
    if (group) query.group = group;
    if (search) query.name = { $regex: search, $options: 'i' };
    const ledgers = await Ledger.find(query).populate('group', 'name nature').sort('name').skip((page - 1) * limit).limit(parseInt(limit));
    const total = await Ledger.countDocuments(query);
    res.json({ success: true, data: ledgers, total, page: parseInt(page), pages: Math.ceil(total / limit) });
  } catch (error) { res.status(500).json({ message: error.message }); }
};

const getLedger = async (req, res) => {
  try {
    const ledger = await Ledger.findById(req.params.id).populate('group', 'name nature');
    if (!ledger) return res.status(404).json({ message: 'Ledger not found' });
    const vouchers = await Voucher.find({ company: req.user.activeCompany, 'entries.ledger': req.params.id, isCancelled: false }).sort('-date').limit(100);
    res.json({ success: true, data: ledger, transactions: vouchers });
  } catch (error) { res.status(500).json({ message: error.message }); }
};

const createLedger = async (req, res) => {
  try {
    req.body.company = req.user.activeCompany;
    if (req.body.openingBalance && req.body.openingBalanceType) {
      req.body.currentBalance = req.body.openingBalance;
      req.body.currentBalanceType = req.body.openingBalanceType;
    }
    const ledger = await Ledger.create(req.body);
    const populated = await Ledger.findById(ledger._id).populate('group', 'name nature');
    res.status(201).json({ success: true, data: populated });
  } catch (error) { res.status(500).json({ message: error.message }); }
};

const updateLedger = async (req, res) => {
  try {
    const ledger = await Ledger.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true }).populate('group', 'name nature');
    if (!ledger) return res.status(404).json({ message: 'Ledger not found' });
    res.json({ success: true, data: ledger });
  } catch (error) { res.status(500).json({ message: error.message }); }
};

const deleteLedger = async (req, res) => {
  try {
    const ledger = await Ledger.findById(req.params.id);
    if (!ledger) return res.status(404).json({ message: 'Ledger not found' });
    const voucherCount = await Voucher.countDocuments({ 'entries.ledger': req.params.id });
    if (voucherCount > 0) return res.status(400).json({ message: 'Cannot delete ledger with transactions' });
    await ledger.deleteOne();
    res.json({ success: true, message: 'Ledger deleted' });
  } catch (error) { res.status(500).json({ message: error.message }); }
};

const getOutstanding = async (req, res) => {
  try {
    const ledger = await Ledger.findById(req.params.id);
    if (!ledger) return res.status(404).json({ message: 'Ledger not found' });
    const vouchers = await Voucher.find({ company: req.user.activeCompany, 'entries.ledger': req.params.id, isCancelled: false }).sort('date');
    let balance = ledger.openingBalance * (ledger.openingBalanceType === 'Dr' ? 1 : -1);
    const transactions = [];
    for (const v of vouchers) {
      for (const entry of v.entries) {
        if (entry.ledger.toString() === req.params.id) {
          const amt = entry.type === 'Dr' ? entry.amount : -entry.amount;
          balance += amt;
          transactions.push({ date: v.date, voucherNumber: v.voucherNumber, voucherType: v.voucherType, debit: entry.type === 'Dr' ? entry.amount : 0, credit: entry.type === 'Cr' ? entry.amount : 0, balance: Math.abs(balance), balanceType: balance >= 0 ? 'Dr' : 'Cr' });
        }
      }
    }
    let interest = 0;
    if (ledger.interestRate > 0 && balance !== 0) {
      const days = Math.floor((Date.now() - ledger.updatedAt) / (1000 * 60 * 60 * 24));
      interest = Math.abs(balance) * (ledger.interestRate / 100) * (days / 365);
    }
    res.json({ success: true, data: { balance: Math.abs(balance), balanceType: balance >= 0 ? 'Dr' : 'Cr', transactions, interest: Math.round(interest * 100) / 100 } });
  } catch (error) { res.status(500).json({ message: error.message }); }
};

module.exports = { getLedgers, getLedger, createLedger, updateLedger, deleteLedger, getOutstanding };
