const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const dotenv = require('dotenv');
const connectDB = require('./config/db');
const errorHandler = require('./middleware/errorHandler');

// Load env vars
dotenv.config({ path: '../.env' });

// Connect to database
connectDB();

const app = express();

// Middleware
app.use(cors());
app.use(helmet());
app.use(morgan('dev'));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Routes
app.use('/api/v1/auth', require('./routes/authRoutes'));
app.use('/api/v1/companies', require('./routes/companyRoutes'));
app.use('/api/v1/groups', require('./routes/groupRoutes'));
app.use('/api/v1/ledgers', require('./routes/ledgerRoutes'));
app.use('/api/v1/vouchers', require('./routes/voucherRoutes'));
app.use('/api/v1/reports', require('./routes/reportRoutes'));
app.use('/api/v1/customers', require('./routes/customerRoutes'));
app.use('/api/v1/products', require('./routes/productRoutes'));
app.use('/api/v1/invoices', require('./routes/invoiceRoutes'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handler
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 TallyFlow Server running on port ${PORT}`);
});
