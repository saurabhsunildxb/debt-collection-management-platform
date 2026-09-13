// server/src/routes/customerRoutes.js
const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');
const {
  listCustomers,
  getCustomer,
  createCustomer,
  updateCustomer,
  deleteCustomer,
} = require('../controllers/customerController');

router.use(authenticate);

router.get('/', authorize('ADMIN', 'MANAGER', 'COLLECTION_AGENT'), listCustomers);
router.get('/:id', authorize('ADMIN', 'MANAGER', 'COLLECTION_AGENT'), getCustomer);
router.post('/', authorize('ADMIN', 'MANAGER'), createCustomer);
router.patch('/:id', authorize('ADMIN', 'MANAGER'), updateCustomer);
router.delete('/:id', authorize('ADMIN', 'MANAGER'), deleteCustomer);

module.exports = router;
