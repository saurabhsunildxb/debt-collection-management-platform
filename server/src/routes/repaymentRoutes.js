// server/src/routes/repaymentRoutes.js
const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');
const {
  listRepayments,
  getRepayment,
  createRepayment,
} = require('../controllers/repaymentController');

router.use(authenticate);

router.get('/', authorize('ADMIN', 'MANAGER', 'COLLECTION_AGENT'), listRepayments);
router.get('/:id', authorize('ADMIN', 'MANAGER', 'COLLECTION_AGENT'), getRepayment);
router.post('/', authorize('ADMIN', 'MANAGER', 'COLLECTION_AGENT'), createRepayment);

module.exports = router;
