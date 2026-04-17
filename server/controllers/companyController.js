const Company = require('../models/Company');
const User = require('../models/User');
const AccountGroup = require('../models/AccountGroup');
const Ledger = require('../models/Ledger');

// Default Tally account groups definition
const defaultGroups = [
  { name: 'Capital Account', nature: 'Liabilities', isPrimary: true },
  { name: 'Current Assets', nature: 'Assets', isPrimary: true },
  { name: 'Current Liabilities', nature: 'Liabilities', isPrimary: true },
  { name: 'Direct Expenses', nature: 'Expenses', isPrimary: true },
  { name: 'Direct Incomes', nature: 'Income', isPrimary: true },
  { name: 'Fixed Assets', nature: 'Assets', isPrimary: true },
  { name: 'Indirect Expenses', nature: 'Expenses', isPrimary: true },
  { name: 'Indirect Incomes', nature: 'Income', isPrimary: true },
  { name: 'Investments', nature: 'Assets', isPrimary: true },
  { name: 'Loans (Liability)', nature: 'Liabilities', isPrimary: true },
  { name: 'Misc. Expenses (Asset)', nature: 'Assets', isPrimary: true },
  { name: 'Suspense Account', nature: 'Liabilities', isPrimary: true },
  { name: 'Branch / Divisions', nature: 'Liabilities', isPrimary: true },
];

const subGroups = [
  { name: 'Bank Accounts', parent: 'Current Assets', nature: 'Assets' },
  { name: 'Cash-in-Hand', parent: 'Current Assets', nature: 'Assets' },
  { name: 'Deposits (Asset)', parent: 'Current Assets', nature: 'Assets' },
  { name: 'Loans & Advances (Asset)', parent: 'Current Assets', nature: 'Assets' },
  { name: 'Stock-in-Hand', parent: 'Current Assets', nature: 'Assets' },
  { name: 'Sundry Debtors', parent: 'Current Assets', nature: 'Assets' },
  { name: 'Duties & Taxes', parent: 'Current Liabilities', nature: 'Liabilities' },
  { name: 'Provisions', parent: 'Current Liabilities', nature: 'Liabilities' },
  { name: 'Sundry Creditors', parent: 'Current Liabilities', nature: 'Liabilities' },
  { name: 'Bank OD Accounts', parent: 'Loans (Liability)', nature: 'Liabilities' },
  { name: 'Secured Loans', parent: 'Loans (Liability)', nature: 'Liabilities' },
  { name: 'Unsecured Loans', parent: 'Loans (Liability)', nature: 'Liabilities' },
  { name: 'Reserves & Surplus', parent: 'Capital Account', nature: 'Liabilities' },
  { name: 'Retained Earnings', parent: 'Capital Account', nature: 'Liabilities' },
  { name: 'Sales Accounts', parent: 'Direct Incomes', nature: 'Income' },
  { name: 'Purchase Accounts', parent: 'Direct Expenses', nature: 'Expenses' },
];

const seedDefaultGroups = async (companyId) => {
  const createdGroups = {};
  for (const g of defaultGroups) {
    const group = await AccountGroup.create({ ...g, company: companyId, isDefault: true, level: 0 });
    createdGroups[g.name] = group._id;
  }
  for (const sg of subGroups) {
    const parentId = createdGroups[sg.parent];
    if (parentId) {
      await AccountGroup.create({ name: sg.name, nature: sg.nature, parent: parentId, company: companyId, isDefault: true });
    }
  }
};

const seedDefaultLedgers = async (companyId) => {
  const cashGroup = await AccountGroup.findOne({ name: 'Cash-in-Hand', company: companyId });
  const dutiesGroup = await AccountGroup.findOne({ name: 'Duties & Taxes', company: companyId });
  const defaultLedgers = [];
  if (cashGroup) defaultLedgers.push({ name: 'Cash', group: cashGroup._id, company: companyId });
  if (dutiesGroup) {
    defaultLedgers.push({ name: 'CGST', group: dutiesGroup._id, company: companyId });
    defaultLedgers.push({ name: 'SGST', group: dutiesGroup._id, company: companyId });
    defaultLedgers.push({ name: 'IGST', group: dutiesGroup._id, company: companyId });
  }
  for (const l of defaultLedgers) { await Ledger.create(l); }
};

const createCompany = async (req, res) => {
  try {
    req.body.createdBy = req.user._id;
    const company = await Company.create(req.body);
    await User.findByIdAndUpdate(req.user._id, { $push: { companies: company._id }, activeCompany: company._id });
    await seedDefaultGroups(company._id);
    await seedDefaultLedgers(company._id);
    res.status(201).json({ success: true, data: company });
  } catch (error) {
    console.error('Create company error:', error.message);
    res.status(500).json({ message: error.message });
  }
};

const getCompanies = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    const companies = await Company.find({ _id: { $in: user.companies } });
    res.json({ success: true, data: companies });
  } catch (error) { res.status(500).json({ message: error.message }); }
};

const getCompany = async (req, res) => {
  try {
    const company = await Company.findById(req.params.id);
    if (!company) return res.status(404).json({ message: 'Company not found' });
    res.json({ success: true, data: company });
  } catch (error) { res.status(500).json({ message: error.message }); }
};

const updateCompany = async (req, res) => {
  try {
    const company = await Company.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!company) return res.status(404).json({ message: 'Company not found' });
    res.json({ success: true, data: company });
  } catch (error) { res.status(500).json({ message: error.message }); }
};

const switchCompany = async (req, res) => {
  try {
    const company = await Company.findById(req.params.id);
    if (!company) return res.status(404).json({ message: 'Company not found' });
    await User.findByIdAndUpdate(req.user._id, { activeCompany: company._id });
    res.json({ success: true, data: company, message: `Switched to ${company.name}` });
  } catch (error) { res.status(500).json({ message: error.message }); }
};

module.exports = { createCompany, getCompanies, getCompany, updateCompany, switchCompany };
