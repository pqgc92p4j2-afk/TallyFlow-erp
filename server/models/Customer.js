const mongoose = require('mongoose');

const customerSchema = new mongoose.Schema({
  name: { type: String, required: [true, 'Customer name is required'], trim: true },
  nickname: { type: String, trim: true },
  tradeName: { type: String, trim: true },
  gstin: { type: String, trim: true, maxlength: 15 },
  pan: { type: String, trim: true, maxlength: 10 },
  address: { type: String, trim: true },
  city: { type: String, trim: true },
  state: { type: String, trim: true },
  stateCode: { type: String, trim: true, maxlength: 2 },
  pincode: { type: String, trim: true, maxlength: 6 },
  phones: [{ type: String, trim: true }],
  email: { type: String, trim: true },
  customerType: { type: String, enum: ['Company', 'Worker'], default: 'Company' },
  bankDetails: {
    bankName: { type: String, trim: true },
    accountNumber: { type: String, trim: true },
    ifscCode: { type: String, trim: true },
    branch: { type: String, trim: true }
  },
  contactPerson: { type: String, trim: true },
  creditDays: { type: Number, default: 30 },
  creditLimit: { type: Number, default: 0 },
  // Linked ledger for auto-tracking
  ledger: { type: mongoose.Schema.Types.ObjectId, ref: 'Ledger' },
  // Totals (denormalized for quick access)
  totalBilled: { type: Number, default: 0 },
  totalPaid: { type: Number, default: 0 },
  invoiceCount: { type: Number, default: 0 },
  lastInvoiceDate: { type: Date },
  company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

customerSchema.index({ name: 1, company: 1 });
customerSchema.index({ gstin: 1, company: 1 });

module.exports = mongoose.model('Customer', customerSchema);
