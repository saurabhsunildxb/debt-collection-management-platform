// server/src/routes/loanRoutes.js
const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');
const {
  listLoans,
  getLoan,
  createLoan,
  updateLoan,
  deleteLoan,
} = require('../controllers/loanController');

router.use(authenticate);

router.get('/', authorize('ADMIN', 'MANAGER', 'COLLECTION_AGENT'), listLoans);
router.get('/:id', authorize('ADMIN', 'MANAGER', 'COLLECTION_AGENT'), getLoan);
router.post('/', authorize('ADMIN', 'MANAGER'), createLoan);
router.patch('/:id', authorize('ADMIN', 'MANAGER'), updateLoan);
router.delete('/:id', authorize('ADMIN', 'MANAGER'), deleteLoan);

module.exports = router;
