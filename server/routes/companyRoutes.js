const express = require('express');
const { createCompany, getCompanies, getCompany, updateCompany, switchCompany } = require('../controllers/companyController');
const { protect } = require('../middleware/auth');
const router = express.Router();

router.use(protect);
router.route('/').get(getCompanies).post(createCompany);
router.route('/:id').get(getCompany).put(updateCompany);
router.put('/:id/switch', switchCompany);

module.exports = router;
