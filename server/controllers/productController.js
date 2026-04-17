const Product = require('../models/Product');

const getProducts = async (req, res) => {
  try {
    const { search } = req.query;
    const query = { company: req.user.activeCompany, isActive: true };
    if (search) query.name = { $regex: search, $options: 'i' };
    const products = await Product.find(query).sort('name');
    res.json({ success: true, data: products });
  } catch (error) { res.status(500).json({ message: error.message }); }
};

const getProduct = async (req, res) => {
  try {
    const product = await Product.findOne({ _id: req.params.id, company: req.user.activeCompany });
    if (!product) return res.status(404).json({ message: 'Product not found' });
    res.json({ success: true, data: product });
  } catch (error) { res.status(500).json({ message: error.message }); }
};

const createProduct = async (req, res) => {
  try {
    req.body.company = req.user.activeCompany;
    const product = await Product.create(req.body);
    res.status(201).json({ success: true, data: product });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: 'A Product with this name already exists in your company.' });
    }
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(val => val.message);
      return res.status(400).json({ message: `Validation Error: ${messages.join('. ')}` });
    }
    res.status(500).json({ message: error.message || 'Server error while saving product' });
  }
};

const updateProduct = async (req, res) => {
  try {
    const product = await Product.findOneAndUpdate(
      { _id: req.params.id, company: req.user.activeCompany }, 
      req.body, 
      { new: true, runValidators: true }
    );
    if (!product) return res.status(404).json({ message: 'Product not found' });
    res.json({ success: true, data: product });
  } catch (error) { res.status(500).json({ message: error.message }); }
};

const deleteProduct = async (req, res) => {
  try {
    const product = await Product.findOneAndUpdate(
      { _id: req.params.id, company: req.user.activeCompany }, 
      { isActive: false }, 
      { new: true }
    );
    if (!product) return res.status(404).json({ message: 'Product not found' });
    res.json({ success: true, message: 'Product deactivated' });
  } catch (error) { res.status(500).json({ message: error.message }); }
};

module.exports = { getProducts, getProduct, createProduct, updateProduct, deleteProduct };
