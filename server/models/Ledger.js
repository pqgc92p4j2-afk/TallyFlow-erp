const mongoose = require('mongoose');

const ledgerSchema = new mongoose.Schema({
  name: { type: String, required: [true, 'Ledger name is required'], trim: true },
  group: { type: mongoose.Schema.Types.ObjectId, ref: 'AccountGroup', required: true },
  company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
  
  // Opening balance
  openingBalance: { type: Number, default: 0 },
  openingBalanceType: { type: String, enum: ['Dr', 'Cr'], default: 'Dr' },
  
  // Current balance (computed)
  currentBalance: { type: Number, default: 0 },
  currentBalanceType: { type: String, enum: ['Dr', 'Cr'], default: 'Dr' },
  
  // Mailing details
  mailingName: { type: String, trim: true },
  address: { type: String, trim: true },
  city: { type: String, trim: true },
  state: { type: String, trim: true },
  pincode: { type: String, trim: true },
  country: { type: String, default: 'India' },
  phone: { type: String, trim: true },
  email: { type: String, trim: true },
  
  // GST details
  gstin: { type: String, trim: true },
  gstRegistrationType: { type: String, enum: ['Regular', 'Composition', 'Unregistered', 'Consumer', ''], default: '' },
  pan: { type: String, trim: true },
  
  // Banking details (for bank ledgers)
  bankName: { type: String, trim: true },
  accountNumber: { type: String, trim: true },
  ifscCode: { type: String, trim: true },
  branchName: { type: String, trim: true },
  
  // Settings
  billWiseTracking: { type: Boolean, default: false },
  costCenterApplicable: { type: Boolean, default: false },
  currency: { type: String, default: 'INR' },
  
  // Interest calculation
  interestRate: { type: Number, default: 0 },
  interestStyle: { type: String, enum: ['Simple', 'Compound', ''], default: '' },
  interestPeriod: { type: String, enum: ['Monthly', 'Quarterly', 'Yearly', ''], default: '' },
  
  // Credit management
  creditDays: { type: Number, default: 0 },
  creditLimit: { type: Number, default: 0 },
  
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

ledgerSchema.index({ name: 1, company: 1 }, { unique: true });

module.exports = mongoose.model('Ledger', ledgerSchema);
