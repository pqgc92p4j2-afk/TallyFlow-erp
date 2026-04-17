const User = require('../models/User');

// @desc Register user
// POST /api/v1/auth/register
const register = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists with this email' });
    }

    const user = await User.create({ name, email, password });
    const token = user.getSignedJwtToken();

    res.status(201).json({
      success: true,
      token,
      user: { _id: user._id, name: user.name, email: user.email, role: user.role },
    });
  } catch (error) {
    console.error('Register error:', error.message);
    res.status(500).json({ message: error.message || 'Server error' });
  }
};

// @desc Login user
// POST /api/v1/auth/login
const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: 'Please provide email and password' });
    }

    const user = await User.findOne({ email }).select('+password');
    if (!user || !(await user.matchPassword(password))) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = user.getSignedJwtToken();
    res.json({
      success: true,
      token,
      user: { 
        _id: user._id, name: user.name, email: user.email, 
        role: user.role, activeCompany: user.activeCompany, companies: user.companies 
      },
    });
  } catch (error) {
    console.error('Login error:', error.message);
    res.status(500).json({ message: error.message || 'Server error' });
  }
};

// @desc Get current user
// GET /api/v1/auth/me
const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate('activeCompany').populate('companies');
    res.json({ success: true, user });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc Update profile
// PUT /api/v1/auth/profile
const updateProfile = async (req, res) => {
  try {
    const { name, email } = req.body;
    const user = await User.findByIdAndUpdate(req.user._id, { name, email }, { new: true, runValidators: true });
    res.json({ success: true, user });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { register, login, getMe, updateProfile };
