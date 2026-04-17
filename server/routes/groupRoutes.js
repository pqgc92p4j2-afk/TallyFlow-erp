const express = require('express');
const { getGroups, createGroup, updateGroup, deleteGroup } = require('../controllers/groupController');
const { protect } = require('../middleware/auth');
const router = express.Router();

router.use(protect);
router.route('/').get(getGroups).post(createGroup);
router.route('/:id').put(updateGroup).delete(deleteGroup);

module.exports = router;
