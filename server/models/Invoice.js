const mongoose = require('mongoose');

const invoiceItemSchema = new mongoose.Schema({
  srNo: { type: Number, required: true },
  description: { type: String, required: true, trim: true },
  hsnSac: { type: String, trim: true },
  quantity: { type: Number, required: true, min: 0.01 },
  unit: { type: String, default: 'Nos' },
  rate: { type: Number, required: true, min: 0 },
  discount: { type: Number, default: 0 },
  gstRate: { type: Number, default: 18 },
  cessRate: { type: Number, default: 0 },
  priceType: { type: String, enum: ['exclusive', 'inclusive'], default: 'exclusive' },
  // Calculated fields
  taxableAmount: { type: Number },
  cgstAmount: { type: Number, default: 0 },
  sgstAmount: { type: Number, default: 0 },
  igstAmount: { type: Number, default: 0 },
  cessAmount: { type: Number, default: 0 },
  totalAmount: { type: Number },
});

const invoiceSchema = new mongoose.Schema({
  invoiceNumber: { type: String, required: true },
  invoiceCategory: { type: String, enum: ['official', 'local', 'challan'], default: 'official' },
  invoiceDate: { type: Date, required: true, default: Date.now },
  dueDate: { type: Date },
  
  // Copy type
  copyType: { type: String, enum: ['Original for Recipient', 'Duplicate for Supplier', 'Triplicate for Transporter'], default: 'Original for Recipient' },
  
  // Tax type
  taxType: { type: String, enum: ['intraState', 'interState'], default: 'intraState' },
  
  // Seller (company)
  seller: {
    name: String, address: String, city: String, state: String, stateCode: String,
    pincode: String, gstin: String, pan: String, phones: [String], email: String,
  },
  
  // Buyer (customer)
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer' },
  buyer: {
    name: String, address: String, city: String, state: String, stateCode: String,
    pincode: String, gstin: String, pan: String, phone: String, email: String,
  },
  
  // Place of supply
  placeOfSupply: { type: String },
  reverseCharge: { type: Boolean, default: false },
  
  // Transport
  transportMode: { type: String },
  vehicleNumber: { type: String },
  eWayBillNo: { type: String },
  
  // Items
  items: [invoiceItemSchema],
  
  // Totals
  totalBeforeTax: { type: Number, default: 0 },
  totalDiscount: { type: Number, default: 0 },
  totalCGST: { type: Number, default: 0 },
  totalSGST: { type: Number, default: 0 },
  totalIGST: { type: Number, default: 0 },
  totalCess: { type: Number, default: 0 },
  totalTax: { type: Number, default: 0 },
  grandTotal: { type: Number, default: 0 },
  amountInWords: { type: String },
  roundOff: { type: Number, default: 0 },
  
  // Bank details
  bankName: { type: String },
  accountNumber: { type: String },
  ifscCode: { type: String },
  bankBranch: { type: String },
  
  // Notes
  narration: { type: String },
  terms: { type: String },
  
  // Status
  status: { type: String, enum: ['draft', 'sent', 'paid', 'cancelled', 'overdue'], default: 'draft' },
  paidAmount: { type: Number, default: 0 },
  
  company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });

invoiceSchema.index({ invoiceNumber: 1, company: 1 }, { unique: true });
invoiceSchema.index({ invoiceDate: 1, company: 1 });
invoiceSchema.index({ customer: 1, company: 1 });
invoiceSchema.index({ status: 1 });

module.exports = mongoose.model('Invoice', invoiceSchema);
