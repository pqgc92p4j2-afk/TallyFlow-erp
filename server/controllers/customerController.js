const Customer = require('../models/Customer');
const Invoice = require('../models/Invoice');
const Voucher = require('../models/Voucher');
const getCustomers = async (req, res) => {
  try {
    const { search, page = 1, limit = 100 } = req.query;
    const query = { company: req.user.activeCompany, isActive: true };
    if (search) query.name = { $regex: search, $options: 'i' };
    const customers = await Customer.find(query).populate('ledger', 'name currentBalance currentBalanceType').sort('name').skip((page - 1) * limit).limit(parseInt(limit));
    const total = await Customer.countDocuments(query);
    res.json({ success: true, data: customers, total });
  } catch (error) { res.status(500).json({ message: error.message }); }
};

const getCustomer = async (req, res) => {
  try {
    const customer = await Customer.findById(req.params.id).populate('ledger', 'name currentBalance currentBalanceType');
    if (!customer) return res.status(404).json({ message: 'Customer not found' });
    res.json({ success: true, data: customer });
  } catch (error) { res.status(500).json({ message: error.message }); }
};

const AccountGroup = require('../models/AccountGroup');
const Ledger = require('../models/Ledger');

const createCustomer = async (req, res) => {
  try {
    req.body.company = req.user.activeCompany;
    
    // Auto-create Ledger under "Sundry Debtors"
    const debtorsGroup = await AccountGroup.findOne({ name: 'Sundry Debtors', company: req.user.activeCompany });
    
    if (debtorsGroup) {
      // Check for duplicate Ledger name
      const existingLedger = await Ledger.findOne({ name: req.body.name, company: req.user.activeCompany });
      if (existingLedger) {
        return res.status(400).json({ message: 'A Ledger with this name already exists. Please choose a different customer name.' });
      }

      const ledger = await Ledger.create({
        name: req.body.name,
        group: debtorsGroup._id,
        company: req.user.activeCompany,
        address: req.body.address,
        city: req.body.city,
        state: req.body.state,
        pincode: req.body.pincode,
        phone: req.body.phones?.[0],
        email: req.body.email,
        gstin: req.body.gstin,
        pan: req.body.pan,
        creditDays: req.body.creditDays,
        creditLimit: req.body.creditLimit,
        billWiseTracking: true,
        openingBalance: 0,
        currentBalance: 0,
        currentBalanceType: 'Dr'
      });
      req.body.ledger = ledger._id;
    }

    const customer = await Customer.create(req.body);
    res.status(201).json({ success: true, data: customer });
  } catch (error) {
    console.error("💥 CUSTOMER SAVE ERROR:", error);
    if (error.code === 11000) {
      return res.status(400).json({ message: 'A Customer or Ledger with this information already exists.' });
    }
    
    // For Mongoose validation errors
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(val => val.message);
      return res.status(400).json({ message: `Validation Error: ${messages.join('. ')}` });
    }

    res.status(500).json({ message: error.message || 'Server error while saving customer' });
  }
};

const updateCustomer = async (req, res) => {
  try {
    const customer = await Customer.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!customer) return res.status(404).json({ message: 'Customer not found' });
    res.json({ success: true, data: customer });
  } catch (error) { res.status(500).json({ message: error.message }); }
};

const deleteCustomer = async (req, res) => {
  try {
    const customer = await Customer.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
    if (!customer) return res.status(404).json({ message: 'Customer not found' });
    res.json({ success: true, message: 'Customer deactivated' });
  } catch (error) { res.status(500).json({ message: error.message }); }
};

const getCustomerStatement = async (req, res) => {
  try {
    const customer = await Customer.findById(req.params.id).populate('ledger');
    if (!customer) return res.status(404).json({ message: 'Customer not found' });

    let transactions = [];
    let runningBalance = 0;

    // Opening Balance if Ledger exists
    if (customer.ledger) {
      runningBalance = customer.ledger.openingBalance * (customer.ledger.openingBalanceType === 'Dr' ? 1 : -1);
      if (customer.ledger.openingBalance > 0) {
        transactions.push({
          date: null,
          type: 'Opening Balance',
          particulars: 'Opening Balance',
          debit: customer.ledger.openingBalanceType === 'Dr' ? customer.ledger.openingBalance : 0,
          credit: customer.ledger.openingBalanceType === 'Cr' ? customer.ledger.openingBalance : 0,
          balance: Math.abs(runningBalance),
          balanceType: runningBalance >= 0 ? 'Dr' : 'Cr'
        });
      }
    }

    // 1. Fetch Invoices (Items bought/brought)
    const invoices = await Invoice.find({ company: req.user.activeCompany, customer: customer._id, status: { $ne: 'cancelled' } }).lean();
    
    // 2. Fetch Vouchers (Payments made/received)
    let vouchers = [];
    if (customer.ledger) {
      vouchers = await Voucher.find({ company: req.user.activeCompany, 'entries.ledger': customer.ledger._id, isCancelled: false }).populate('entries.ledger', 'name').lean();
    }

    // Process Invoices
    for (const inv of invoices) {
      transactions.push({
        date: inv.invoiceDate,
        docId: inv._id,
        docNumber: inv.invoiceNumber,
        type: 'Invoice',
        particulars: inv.items.map(i => `${i.description} x ${i.quantity}`).join(', '),
        originalItems: inv.items,
        debit: inv.grandTotal, // Invoice increases customer's debt
        credit: 0,
      });
    }

    // Process Vouchers (Skip auto-generated sales vouchers to avoid double counting)
    for (const v of vouchers) {
      if (v.voucherNumber && v.voucherNumber.startsWith('INV-')) continue; // Skip auto-generated sales vouchers
      
      for (const e of v.entries) {
        if (e.ledger._id.toString() === customer.ledger._id.toString()) {
          const contraEntries = v.entries.filter(ce => ce.ledger._id.toString() !== customer.ledger._id.toString());
          const particular = contraEntries.map(ce => ce.ledger?.name || ce.ledgerName).join(', ') || v.narration || v.voucherType;
          
          transactions.push({
            date: v.date,
            docId: v._id,
            docNumber: v.voucherNumber,
            type: v.voucherType, // Payment, Receipt, etc.
            particulars: particular,
            debit: e.type === 'Dr' ? e.amount : 0,
            credit: e.type === 'Cr' ? e.amount : 0,
          });
        }
      }
    }

    // Sort chronologically (oldest first)
    transactions.sort((a, b) => {
      if (!a.date) return -1;
      if (!b.date) return 1;
      return new Date(a.date) - new Date(b.date);
    });

    // Calculate running balance incrementally
    transactions.forEach(t => {
      if (t.type !== 'Opening Balance') {
        runningBalance += t.debit;
        runningBalance -= t.credit;
        t.balance = Math.abs(runningBalance);
        t.balanceType = runningBalance >= 0 ? 'Dr' : 'Cr';
      }
    });

    res.json({
      success: true,
      data: {
        customer,
        transactions,
        closingBalance: Math.abs(runningBalance),
        closingBalanceType: runningBalance >= 0 ? 'Dr' : 'Cr'
      }
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { getCustomers, getCustomer, createCustomer, updateCustomer, deleteCustomer, getCustomerStatement };
