const Voucher = require('../models/Voucher');
const Invoice = require('../models/Invoice');
const Ledger = require('../models/Ledger');
const AccountGroup = require('../models/AccountGroup');

const getTrialBalance = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const companyId = req.user.activeCompany;
    const ledgers = await Ledger.find({ company: companyId }).populate('group', 'name nature');
    const trialBalance = [];
    let totalDebit = 0, totalCredit = 0;
    for (const ledger of ledgers) {
      const dateQuery = {};
      if (startDate) dateQuery.$gte = new Date(startDate);
      if (endDate) dateQuery.$lte = new Date(endDate);
      const vouchers = await Voucher.find({ company: companyId, 'entries.ledger': ledger._id, isCancelled: false, ...(Object.keys(dateQuery).length ? { date: dateQuery } : {}) });
      let balance = ledger.openingBalance * (ledger.openingBalanceType === 'Dr' ? 1 : -1);
      for (const v of vouchers) { for (const e of v.entries) { if (e.ledger.toString() === ledger._id.toString()) { balance += e.type === 'Dr' ? e.amount : -e.amount; } } }
      if (balance !== 0) {
        const drAmt = balance > 0 ? balance : 0; const crAmt = balance < 0 ? Math.abs(balance) : 0;
        totalDebit += drAmt; totalCredit += crAmt;
        trialBalance.push({ ledgerId: ledger._id, ledgerName: ledger.name, groupName: ledger.group?.name || '', nature: ledger.group?.nature || '', debit: drAmt, credit: crAmt, closingBalance: Math.abs(balance), closingBalanceType: balance >= 0 ? 'Dr' : 'Cr' });
      }
    }
    res.json({ success: true, data: trialBalance, totals: { totalDebit, totalCredit } });
  } catch (error) { res.status(500).json({ message: error.message }); }
};

const getBalanceSheet = async (req, res) => {
  try {
    const companyId = req.user.activeCompany;
    const ledgers = await Ledger.find({ company: companyId }).populate('group', 'name nature');
    const assets = [], liabilities = [];
    let totalAssets = 0, totalLiabilities = 0;
    for (const ledger of ledgers) {
      if (!ledger.group) continue;
      const balance = ledger.currentBalance; if (balance === 0) continue;
      const item = { ledgerName: ledger.name, groupName: ledger.group.name, amount: balance, type: ledger.currentBalanceType };
      if (ledger.group.nature === 'Assets') { assets.push(item); totalAssets += balance; }
      else if (ledger.group.nature === 'Liabilities') { liabilities.push(item); totalLiabilities += balance; }
    }
    res.json({ success: true, data: { assets, liabilities, totalAssets, totalLiabilities, difference: totalAssets - totalLiabilities } });
  } catch (error) { res.status(500).json({ message: error.message }); }
};

const getProfitLoss = async (req, res) => {
  try {
    const companyId = req.user.activeCompany;
    const { startDate, endDate } = req.query;
    const ledgers = await Ledger.find({ company: companyId }).populate('group', 'name nature');
    const incomes = [], expenses = [];
    let totalIncome = 0, totalExpenses = 0;
    for (const ledger of ledgers) {
      if (!ledger.group) continue;
      const dateQuery = {};
      if (startDate) dateQuery.$gte = new Date(startDate);
      if (endDate) dateQuery.$lte = new Date(endDate);
      const vouchers = await Voucher.find({ company: companyId, 'entries.ledger': ledger._id, isCancelled: false, ...(Object.keys(dateQuery).length ? { date: dateQuery } : {}) });
      let amount = 0;
      for (const v of vouchers) { for (const e of v.entries) { if (e.ledger.toString() === ledger._id.toString()) { amount += e.type === 'Dr' ? e.amount : -e.amount; } } }
      if (amount === 0) continue;
      const item = { ledgerName: ledger.name, groupName: ledger.group.name, amount: Math.abs(amount) };
      if (ledger.group.nature === 'Income') { incomes.push(item); totalIncome += Math.abs(amount); }
      else if (ledger.group.nature === 'Expenses') { expenses.push(item); totalExpenses += Math.abs(amount); }
    }
    res.json({ success: true, data: { incomes, expenses, totalIncome, totalExpenses, netProfit: totalIncome - totalExpenses, isProfit: totalIncome >= totalExpenses } });
  } catch (error) { res.status(500).json({ message: error.message }); }
};

const getDayBook = async (req, res) => {
  try {
    const { date } = req.query;
    const targetDate = date ? new Date(date) : new Date();
    const startOfDay = new Date(targetDate); startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(targetDate); endOfDay.setHours(23, 59, 59, 999);
    const vouchers = await Voucher.find({ company: req.user.activeCompany, date: { $gte: startOfDay, $lte: endOfDay }, isCancelled: false }).populate('entries.ledger', 'name').sort('voucherType voucherNumber');
    let totalDebit = 0, totalCredit = 0;
    vouchers.forEach(v => { totalDebit += v.totalDebit; totalCredit += v.totalCredit; });
    res.json({ success: true, data: vouchers, totals: { totalDebit, totalCredit }, date: targetDate });
  } catch (error) { res.status(500).json({ message: error.message }); }
};

const getLedgerReport = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const ledger = await Ledger.findById(req.params.id).populate('group', 'name nature');
    if (!ledger) return res.status(404).json({ message: 'Ledger not found' });
    const dateQuery = {};
    if (startDate) dateQuery.$gte = new Date(startDate);
    if (endDate) dateQuery.$lte = new Date(endDate);
    const vouchers = await Voucher.find({ company: req.user.activeCompany, 'entries.ledger': req.params.id, isCancelled: false, ...(Object.keys(dateQuery).length ? { date: dateQuery } : {}) }).populate('entries.ledger', 'name').sort('date');
    let runningBalance = ledger.openingBalance * (ledger.openingBalanceType === 'Dr' ? 1 : -1);
    const transactions = [{ date: null, particular: 'Opening Balance', debit: ledger.openingBalanceType === 'Dr' ? ledger.openingBalance : 0, credit: ledger.openingBalanceType === 'Cr' ? ledger.openingBalance : 0, balance: Math.abs(runningBalance), balanceType: runningBalance >= 0 ? 'Dr' : 'Cr' }];
    for (const v of vouchers) {
      for (const e of v.entries) {
        if (e.ledger._id.toString() === req.params.id) {
          runningBalance += e.type === 'Dr' ? e.amount : -e.amount;
          const contraEntries = v.entries.filter(ce => ce.ledger._id.toString() !== req.params.id);
          const particular = contraEntries.map(ce => ce.ledger?.name || ce.ledgerName).join(', ') || v.narration;
          transactions.push({ date: v.date, voucherId: v._id, voucherNumber: v.voucherNumber, voucherType: v.voucherType, particular, debit: e.type === 'Dr' ? e.amount : 0, credit: e.type === 'Cr' ? e.amount : 0, balance: Math.abs(runningBalance), balanceType: runningBalance >= 0 ? 'Dr' : 'Cr' });
        }
      }
    }
    res.json({ success: true, data: { ledger, transactions, closingBalance: Math.abs(runningBalance), closingBalanceType: runningBalance >= 0 ? 'Dr' : 'Cr' } });
  } catch (error) { res.status(500).json({ message: error.message }); }
};

const getDashboard = async (req, res) => {
  try {
    const companyId = req.user.activeCompany;
    const totalLedgers = await Ledger.countDocuments({ company: companyId });
    const totalVouchers = await Voucher.countDocuments({ company: companyId, isCancelled: false });
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const todayEnd = new Date(); todayEnd.setHours(23, 59, 59, 999);
    const todayVouchers = await Voucher.find({ company: companyId, date: { $gte: today, $lte: todayEnd }, isCancelled: false });
    
    const debtorGroup = await AccountGroup.findOne({ name: 'Sundry Debtors', company: companyId });
    let totalReceivables = 0;
    if (debtorGroup) { const debtors = await Ledger.find({ group: debtorGroup._id, company: companyId }); totalReceivables = debtors.reduce((sum, l) => sum + (l.currentBalanceType === 'Dr' ? l.currentBalance : -l.currentBalance), 0); }
    
    const creditorGroup = await AccountGroup.findOne({ name: 'Sundry Creditors', company: companyId });
    let totalPayables = 0;
    if (creditorGroup) { const creditors = await Ledger.find({ group: creditorGroup._id, company: companyId }); totalPayables = creditors.reduce((sum, l) => sum + (l.currentBalanceType === 'Cr' ? l.currentBalance : -l.currentBalance), 0); }
    
    const cashGroup = await AccountGroup.findOne({ name: 'Cash-in-Hand', company: companyId });
    const bankGroup = await AccountGroup.findOne({ name: 'Bank Accounts', company: companyId });
    let cashBalance = 0, bankBalance = 0;
    if (cashGroup) { const cashLedgers = await Ledger.find({ group: cashGroup._id, company: companyId }); cashBalance = cashLedgers.reduce((sum, l) => sum + (l.currentBalanceType === 'Dr' ? l.currentBalance : -l.currentBalance), 0); }
    if (bankGroup) { const bankLedgers = await Ledger.find({ group: bankGroup._id, company: companyId }); bankBalance = bankLedgers.reduce((sum, l) => sum + (l.currentBalanceType === 'Dr' ? l.currentBalance : -l.currentBalance), 0); }
    
    const monthlyRevenue = [];
    for (let i = 5; i >= 0; i--) {
      const monthStart = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const monthEnd = new Date(today.getFullYear(), today.getMonth() - i + 1, 0, 23, 59, 59);
      const salesVouchers = await Voucher.find({ company: companyId, voucherType: 'Sales', date: { $gte: monthStart, $lte: monthEnd }, isCancelled: false });
      const revenue = salesVouchers.reduce((sum, v) => sum + v.amount, 0);
      monthlyRevenue.push({ month: monthStart.toLocaleString('default', { month: 'short', year: '2-digit' }), revenue });
    }
    
    const recentVouchers = await Voucher.find({ company: companyId, isCancelled: false }).populate('entries.ledger', 'name').sort('-createdAt').limit(10);
    
    res.json({ success: true, data: { totalLedgers, totalVouchers, todayTransactions: todayVouchers.length, totalReceivables: Math.max(0, totalReceivables), totalPayables: Math.max(0, totalPayables), cashBalance: Math.max(0, cashBalance), bankBalance: Math.max(0, bankBalance), monthlyRevenue, recentVouchers } });
  } catch (error) { res.status(500).json({ message: error.message }); }
};

const getActivityHistory = async (req, res) => {
  try {
    const companyId = req.user.activeCompany;
    const { startDate, endDate, type, search } = req.query;

    const dateQuery = {};
    if (startDate) dateQuery.$gte = new Date(startDate);
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      dateQuery.$lte = end;
    }

    const baseQuery = { company: companyId, isCancelled: { $ne: true } };
    if (Object.keys(dateQuery).length) {
      // Note: Vouchers use 'date', Invoices use 'invoiceDate'
    }

    // Fetch Vouchers
    const voucherQuery = { ...baseQuery };
    if (Object.keys(dateQuery).length) voucherQuery.date = dateQuery;
    if (type && type !== 'all') voucherQuery.voucherType = type;
    
    const vouchers = await Voucher.find(voucherQuery)
      .populate('entries.ledger', 'name')
      .sort('-createdAt')
      .limit(500);

    // Fetch Invoices
    const invoiceQuery = { ...baseQuery };
    if (Object.keys(dateQuery).length) invoiceQuery.invoiceDate = dateQuery;
    if (type && type !== 'all' && type !== 'Invoice') invoiceQuery._id = null; // Hide if filtered to other types
    
    const invoices = await Invoice.find(invoiceQuery)
      .populate('customer', 'name')
      .sort('-createdAt')
      .limit(500);

    // Transform and Merge
    const history = [
      ...vouchers.map(v => ({
        id: v._id,
        date: v.date,
        createdAt: v.createdAt,
        type: v.voucherType,
        number: v.voucherNumber,
        party: v.entries.find(e => e.type === (v.voucherType === 'Receipt' ? 'Cr' : 'Dr'))?.ledger?.name || 'Multiple',
        amount: v.amount,
        reference: v.reference,
        paymentMode: v.paymentMode,
        rawType: 'voucher'
      })),
      ...invoices.map(i => ({
        id: i._id,
        date: i.invoiceDate,
        createdAt: i.createdAt,
        type: i.invoiceCategory === 'official' ? 'Tax Invoice' : 'Local Bill',
        number: i.invoiceNumber,
        party: i.buyer?.name || 'Cash Sale',
        amount: i.grandTotal,
        reference: i.invoiceNumber,
        paymentMode: 'N/A',
        rawType: 'invoice'
      }))
    ];

    // Final sorting and optional search
    let filtered = history.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    if (search) {
      const s = search.toLowerCase();
      filtered = filtered.filter(item => 
        item.party.toLowerCase().includes(s) || 
        item.number.toLowerCase().includes(s) ||
        item.type.toLowerCase().includes(s)
      );
    }

    res.json({ success: true, data: filtered.slice(0, 100) });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { getTrialBalance, getBalanceSheet, getProfitLoss, getDayBook, getLedgerReport, getDashboard, getActivityHistory };
