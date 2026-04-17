const mongoose = require('mongoose');

const voucherEntrySchema = new mongoose.Schema({
  ledger: { type: mongoose.Schema.Types.ObjectId, ref: 'Ledger', required: true },
  ledgerName: { type: String }, // Denormalized for speed
  amount: { type: Number, required: true },
  type: { type: String, enum: ['Dr', 'Cr'], required: true },
  narration: { type: String, trim: true },
  costCenter: { type: String, trim: true },
  billAllocations: [{
    billNumber: String,
    billDate: Date,
    amount: Number,
    type: { type: String, enum: ['New Ref', 'Against Ref', 'Advance'] },
  }],
});

const voucherSchema = new mongoose.Schema({
  voucherNumber: { type: String, required: true },
  voucherType: { 
    type: String, 
    enum: ['Payment', 'Receipt', 'Sales', 'Purchase', 'Contra', 'Journal', 'Credit Note', 'Debit Note'],
    required: true 
  },
  date: { type: Date, required: true, default: Date.now },
  entries: [voucherEntrySchema],
  
  // Totals
  totalDebit: { type: Number },
  totalCredit: { type: Number },
  amount: { type: Number },
  
  narration: { type: String, trim: true },
  reference: { type: String, trim: true },
  paymentMode: { type: String, trim: true },
  transactionId: { type: String, trim: true },
  
  // GST fields
  gstApplicable: { type: Boolean, default: false },
  cgstAmount: { type: Number, default: 0 },
  sgstAmount: { type: Number, default: 0 },
  igstAmount: { type: Number, default: 0 },
  gstRate: { type: Number, default: 0 },
  
  // Inventory items (for Sales/Purchase)
  inventoryEntries: [{
    itemName: String,
    quantity: Number,
    unit: String,
    rate: Number,
    amount: Number,
    godown: String,
    batch: String,
  }],
  
  // Party details
  partyLedger: { type: mongoose.Schema.Types.ObjectId, ref: 'Ledger' },
  partyName: { type: String },
  
  company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  
  isVoid: { type: Boolean, default: false },
  isCancelled: { type: Boolean, default: false },
  
  // Audit trail
  modifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  modificationHistory: [{
    modifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    modifiedAt: { type: Date, default: Date.now },
    changes: { type: String },
  }],
}, { timestamps: true });

voucherSchema.index({ voucherNumber: 1, company: 1 });
voucherSchema.index({ date: 1, company: 1 });
voucherSchema.index({ voucherType: 1, company: 1 });



module.exports = mongoose.model('Voucher', voucherSchema);
