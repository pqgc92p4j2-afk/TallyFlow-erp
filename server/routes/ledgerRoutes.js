const express = require('express');
const { getLedgers, getLedger, createLedger, updateLedger, deleteLedger, getOutstanding } = require('../controllers/ledgerController');
const { protect } = require('../middleware/auth');
const router = express.Router();

router.use(protect);
router.route('/').get(getLedgers).post(createLedger);
router.route('/:id').get(getLedger).put(updateLedger).delete(deleteLedger);
router.get('/:id/outstanding', getOutstanding);

module.exports = router;
