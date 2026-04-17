const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: { type: String, required: [true, 'Product name is required'], trim: true },
  description: { type: String, trim: true },
  hsnSac: { type: String, trim: true },
  unit: { type: String, default: 'Nos', trim: true },
  rate: { type: Number, required: true, min: 0 },
  openingStock: { type: Number, default: 0 },
  currentStock: { type: Number, default: 0 },
  gstRate: { type: Number, default: 18 },
  cessRate: { type: Number, default: 0 },
  priceType: { type: String, enum: ['exclusive', 'inclusive'], default: 'exclusive' },
  isActive: { type: Boolean, default: true },
  company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true }
}, { timestamps: true });

productSchema.index({ name: 1, company: 1 });

module.exports = mongoose.model('Product', productSchema);
