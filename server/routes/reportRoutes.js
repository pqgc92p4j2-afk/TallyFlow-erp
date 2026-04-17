const express = require('express');
const { getTrialBalance, getBalanceSheet, getProfitLoss, getDayBook, getLedgerReport, getDashboard, getActivityHistory } = require('../controllers/reportController');
const { protect } = require('../middleware/auth');
const router = express.Router();

router.use(protect);
router.get('/dashboard', getDashboard);
router.get('/activity-history', getActivityHistory);
router.get('/trial-balance', getTrialBalance);
router.get('/balance-sheet', getBalanceSheet);
router.get('/profit-loss', getProfitLoss);
router.get('/day-book', getDayBook);
router.get('/ledger/:id', getLedgerReport);

module.exports = router;
