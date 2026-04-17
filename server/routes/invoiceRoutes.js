const express = require('express');
const router = express.Router();
const { getInvoices, getInvoice, createInvoice, updateInvoice, updateInvoiceStatus, getInvoiceStats, getCustomerInvoices } = require('../controllers/invoiceController');
const { protect } = require('../middleware/auth');

router.use(protect);
router.route('/').get(getInvoices).post(createInvoice);
router.get('/stats', getInvoiceStats);
router.get('/customer/:customerId', getCustomerInvoices);
router.route('/:id').get(getInvoice).put(updateInvoice);
router.put('/:id/status', updateInvoiceStatus);

module.exports = router;
