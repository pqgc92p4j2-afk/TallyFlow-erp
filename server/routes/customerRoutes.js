const express = require('express');
const router = express.Router();
const { getCustomers, getCustomer, createCustomer, updateCustomer, deleteCustomer, getCustomerStatement } = require('../controllers/customerController');
const { protect } = require('../middleware/auth');

router.use(protect);
router.route('/').get(getCustomers).post(createCustomer);
router.route('/:id').get(getCustomer).put(updateCustomer).delete(deleteCustomer);
router.route('/:id/statement').get(getCustomerStatement);

module.exports = router;
