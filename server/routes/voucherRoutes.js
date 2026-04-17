const express = require('express');
const { getVouchers, getVoucher, createVoucher, updateVoucher, cancelVoucher } = require('../controllers/voucherController');
const { protect } = require('../middleware/auth');
const router = express.Router();

router.use(protect);
router.route('/').get(getVouchers).post(createVoucher);
router.route('/:id').get(getVoucher).put(updateVoucher).delete(cancelVoucher);

module.exports = router;
