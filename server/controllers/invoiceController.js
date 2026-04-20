const Invoice = require('../models/Invoice');
const Customer = require('../models/Customer');

const getInvoices = async (req, res) => {
  try {
    const { month, year, status, customer, page = 1, limit = 50, search } = req.query;
    const query = { company: req.user.activeCompany };
    if (status) query.status = status;
    if (customer) query.customer = customer;
    if (search) query.$or = [{ invoiceNumber: { $regex: search, $options: 'i' } }, { 'buyer.name': { $regex: search, $options: 'i' } }];
    if (month && year) {
      const startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
      const endDate = new Date(parseInt(year), parseInt(month), 0, 23, 59, 59);
      query.invoiceDate = { $gte: startDate, $lte: endDate };
    } else if (year) {
      const startDate = new Date(parseInt(year), 0, 1);
      const endDate = new Date(parseInt(year), 11, 31, 23, 59, 59);
      query.invoiceDate = { $gte: startDate, $lte: endDate };
    }
    const invoices = await Invoice.find(query).populate('customer', 'name gstin phones').sort('-invoiceDate -createdAt').skip((page - 1) * limit).limit(parseInt(limit));
    const total = await Invoice.countDocuments(query);

    // Monthly summary
    const monthlyPipeline = [
      { $match: { company: req.user.activeCompany, status: { $ne: 'cancelled' } } },
      { $group: { _id: { year: { $year: '$invoiceDate' }, month: { $month: '$invoiceDate' } }, count: { $sum: 1 }, total: { $sum: '$grandTotal' } } },
      { $sort: { '_id.year': -1, '_id.month': -1 } },
      { $limit: 24 },
    ];
    const monthlySummary = await Invoice.aggregate(monthlyPipeline);

    res.json({ success: true, data: invoices, total, monthlySummary });
  } catch (error) { res.status(500).json({ message: error.message }); }
};

const getInvoice = async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id).populate('customer').populate('createdBy', 'name');
    if (!invoice) return res.status(404).json({ message: 'Invoice not found' });
    res.json({ success: true, data: invoice });
  } catch (error) { res.status(500).json({ message: error.message }); }
};

const Voucher = require('../models/Voucher');
const Ledger = require('../models/Ledger');
const AccountGroup = require('../models/AccountGroup');
const generateVoucherNumber = () => 'SALES-' + Date.now().toString().slice(-6);

const createInvoice = async (req, res) => {
  try {
    req.body.company = req.user.activeCompany;
    req.body.createdBy = req.user._id;
    const invoice = await Invoice.create(req.body);

    // Update customer stats
    if (invoice.customer && invoice.invoiceCategory !== 'challan') {
      await Customer.findByIdAndUpdate(invoice.customer, {
        $inc: { totalBilled: invoice.grandTotal, invoiceCount: 1 },
        lastInvoiceDate: invoice.invoiceDate,
      });

      // Auto-post to Ledger via a Sales Voucher
      try {
        const customer = await Customer.findById(invoice.customer);
        if (customer && customer.ledger) {
          // Find a Sales Accounts group
          const salesGroup = await AccountGroup.findOne({ name: 'Sales Accounts', company: req.user.activeCompany });
          
          if (salesGroup) {
            // Find a generic sales ledger
            let salesLedger = await Ledger.findOne({ group: salesGroup._id, company: req.user.activeCompany });
            
            // If doesn't exist, create it once
            if (!salesLedger) {
               salesLedger = await Ledger.create({
                 name: 'Sales Account',
                 group: salesGroup._id,
                 company: req.user.activeCompany
               });
            }

            // Create Voucher
            await Voucher.create({
              voucherNumber: `INV-${invoice.invoiceNumber}`,
              primaryDocumentNumber: invoice.invoiceNumber,
              type: 'Sales',
              date: invoice.invoiceDate,
              narration: `Auto-generated from Tax Invoice ${invoice.invoiceNumber}. ${invoice.narration || ''}`.trim(),
              company: req.user.activeCompany,
              createdBy: req.user._id,
              entries: [
                { ledger: customer.ledger, type: 'Dr', amount: invoice.grandTotal },
                { ledger: salesLedger._id, type: 'Cr', amount: invoice.grandTotal }
              ],
              totalDebit: invoice.grandTotal,
              totalCredit: invoice.grandTotal
            });
          }
        }
      } catch (postErr) {
        console.error('Error auto-posting invoice to ledger:', postErr);
        // Continue even if voucher posting fails, invoice is saved
      }
    }
    res.status(201).json({ success: true, data: invoice });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: 'An invoice with this number already exists.' });
    }
    console.error('Create invoice error:', error.message);
    res.status(500).json({ message: error.message });
  }
};

const updateInvoice = async (req, res) => {
  try {
    const old = await Invoice.findById(req.params.id);
    if (!old) return res.status(404).json({ message: 'Invoice not found' });
    const invoice = await Invoice.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    res.json({ success: true, data: invoice });
  } catch (error) { res.status(500).json({ message: error.message }); }
};

const updateInvoiceStatus = async (req, res) => {
  try {
    const { status, paidAmount } = req.body;
    const oldInvoice = await Invoice.findById(req.params.id);
    if (!oldInvoice) return res.status(404).json({ message: 'Invoice not found' });

    const update = { status };
    if (paidAmount !== undefined) update.paidAmount = paidAmount;
    
    const invoice = await Invoice.findByIdAndUpdate(req.params.id, update, { new: true });

    // Sync Account status with Voucher
    const voucherQuery = { voucherNumber: `INV-${invoice.invoiceNumber}`, company: req.user.activeCompany };
    
    if (status === 'cancelled') {
        // Cancel the corresponding Sales Voucher
        await Voucher.findOneAndUpdate(voucherQuery, { isCancelled: true });
        
        // If it was previously 'paid', reverse the customer balance impact
        if (oldInvoice.status === 'paid' && invoice.customer) {
            await Customer.findByIdAndUpdate(invoice.customer, { $inc: { totalPaid: -oldInvoice.grandTotal } });
        }
    } else if (oldInvoice.status === 'cancelled' && (status === 'sent' || status === 'paid' || status === 'overdue')) {
        // Reactivate the corresponding Sales Voucher
        await Voucher.findOneAndUpdate(voucherQuery, { isCancelled: false });
        
        // If reactivating as 'paid', handle balance
        if (status === 'paid' && invoice.customer) {
            await Customer.findByIdAndUpdate(invoice.customer, { $inc: { totalPaid: invoice.grandTotal } });
        }
    } else if (status === 'paid' && oldInvoice.status !== 'paid' && invoice.customer) {
        // Standard paid transition
        await Customer.findByIdAndUpdate(invoice.customer, { $inc: { totalPaid: invoice.grandTotal } });
    }

    res.json({ success: true, data: invoice });
  } catch (error) { res.status(500).json({ message: error.message }); }
};

const getInvoiceStats = async (req, res) => {
  try {
    const companyId = req.user.activeCompany;
    const totalInvoices = await Invoice.countDocuments({ company: companyId, status: { $ne: 'cancelled' } });
    const pipeline = [
      { $match: { company: companyId, status: { $ne: 'cancelled' } } },
      { $group: { _id: null, totalRevenue: { $sum: '$grandTotal' }, totalPaid: { $sum: '$paidAmount' }, totalTax: { $sum: '$totalTax' } } },
    ];
    const [stats] = await Invoice.aggregate(pipeline);
    const pendingInvoices = await Invoice.countDocuments({ company: companyId, status: { $in: ['sent', 'overdue'] } });
    const thisMonth = new Date(); thisMonth.setDate(1); thisMonth.setHours(0, 0, 0, 0);
    const thisMonthCount = await Invoice.countDocuments({ company: companyId, invoiceDate: { $gte: thisMonth }, status: { $ne: 'cancelled' } });

    // Top customers
    const topCustomers = await Invoice.aggregate([
      { $match: { company: companyId, status: { $ne: 'cancelled' } } },
      { $group: { _id: '$customer', totalBilled: { $sum: '$grandTotal' }, count: { $sum: 1 }, lastDate: { $max: '$invoiceDate' } } },
      { $sort: { totalBilled: -1 } },
      { $limit: 10 },
      { $lookup: { from: 'customers', localField: '_id', foreignField: '_id', as: 'customer' } },
      { $unwind: { path: '$customer', preserveNullAndEmptyArrays: true } },
      { $project: { name: '$customer.name', gstin: '$customer.gstin', totalBilled: 1, count: 1, lastDate: 1 } },
    ]);

    res.json({ success: true, data: { totalInvoices, totalRevenue: stats?.totalRevenue || 0, totalPaid: stats?.totalPaid || 0, totalPending: (stats?.totalRevenue || 0) - (stats?.totalPaid || 0), totalTax: stats?.totalTax || 0, pendingInvoices, thisMonthCount, topCustomers } });
  } catch (error) { res.status(500).json({ message: error.message }); }
};

// Customer-wise invoice history
const getCustomerInvoices = async (req, res) => {
  try {
    const invoices = await Invoice.find({ company: req.user.activeCompany, customer: req.params.customerId, status: { $ne: 'cancelled' } }).sort('-invoiceDate').limit(100);
    const customer = await Customer.findById(req.params.customerId);
    const totalBilled = invoices.reduce((s, i) => s + i.grandTotal, 0);
    const totalPaid = invoices.filter(i => i.status === 'paid').reduce((s, i) => s + i.grandTotal, 0);
    res.json({ success: true, data: invoices, customer, summary: { totalBilled, totalPaid, outstanding: totalBilled - totalPaid, count: invoices.length } });
  } catch (error) { res.status(500).json({ message: error.message }); }
};

module.exports = { getInvoices, getInvoice, createInvoice, updateInvoice, updateInvoiceStatus, getInvoiceStats, getCustomerInvoices };
