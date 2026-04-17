const mongoose = require('mongoose');

const accountGroupSchema = new mongoose.Schema({
  name: { type: String, required: [true, 'Group name is required'], trim: true },
  parent: { type: mongoose.Schema.Types.ObjectId, ref: 'AccountGroup', default: null },
  nature: { type: String, enum: ['Assets', 'Liabilities', 'Income', 'Expenses'], required: true },
  isPrimary: { type: Boolean, default: false },
  isDefault: { type: Boolean, default: false },
  description: { type: String, trim: true },
  company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
  level: { type: Number, default: 0 },
  path: { type: String, default: '' },
}, { timestamps: true });

accountGroupSchema.index({ name: 1, company: 1 }, { unique: true });

accountGroupSchema.pre('save', async function () {
  if (this.parent) {
    const parentGroup = await this.constructor.findById(this.parent);
    if (parentGroup) {
      this.level = parentGroup.level + 1;
      this.path = parentGroup.path ? `${parentGroup.path}/${parentGroup.name}` : parentGroup.name;
    }
  }
});

module.exports = mongoose.model('AccountGroup', accountGroupSchema);
