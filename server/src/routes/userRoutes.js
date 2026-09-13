// server/src/routes/userRoutes.js
const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');
const {
  listUsers,
  adminListUsers,
  createUser,
  updateUser,
  resetPassword,
  getAgentCustomers,
  updateAgentCustomers,
} = require('../controllers/userController');

router.use(authenticate);

// Used by Managers for dropdowns
router.get('/', authorize('ADMIN', 'MANAGER'), listUsers);

// Admin-only User Management Routes
router.get('/admin', authorize('ADMIN'), adminListUsers);
router.post('/', authorize('ADMIN'), createUser);
router.patch('/:id', authorize('ADMIN'), updateUser);
router.patch('/:id/password', authorize('ADMIN'), resetPassword);

// Agent Customer Management
router.get('/:id/customers', authorize('ADMIN'), getAgentCustomers);
router.patch('/:id/customers', authorize('ADMIN'), updateAgentCustomers);

module.exports = router;
