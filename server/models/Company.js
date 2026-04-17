const mongoose = require('mongoose');

const companySchema = new mongoose.Schema({
  name: { type: String, required: [true, 'Company name is required'], trim: true },
  address: { type: String, trim: true },
  city: { type: String, trim: true },
  state: { type: String, trim: true },
  stateCode: { type: String, trim: true, maxlength: 2 },
  pincode: { type: String, trim: true },
  country: { type: String, default: 'India' },
  phone: { type: String, trim: true },
  phones: [{ type: String, trim: true }],
  email: { type: String, trim: true },
  gstin: { type: String, trim: true },
  pan: { type: String, trim: true },
  financialYearStart: { type: Date, default: () => new Date(new Date().getFullYear(), 3, 1) },
  financialYearEnd: { type: Date, default: () => new Date(new Date().getFullYear() + 1, 2, 31) },
  baseCurrency: { type: String, default: 'INR' },
  currencySymbol: { type: String, default: '₹' },
  supportedCurrencies: [{ 
    code: String, 
    symbol: String, 
    exchangeRate: { type: Number, default: 1 } 
  }],
  gstEnabled: { type: Boolean, default: true },
  tdsEnabled: { type: Boolean, default: false },
  inventoryEnabled: { type: Boolean, default: true },
  bankAccounts: [{
    bankName: { type: String, trim: true },
    accountNumber: { type: String, trim: true },
    ifscCode: { type: String, trim: true },
    branch: { type: String, trim: true },
    isDefault: { type: Boolean, default: false },
    qrCode: { type: String }
  }],
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });

module.exports = mongoose.model('Company', companySchema);
