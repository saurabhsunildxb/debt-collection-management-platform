// server/src/routes/userRoutes.js
const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');
const { listUsers } = require('../controllers/userController');

router.use(authenticate);

router.get('/', authorize('ADMIN', 'MANAGER'), listUsers);

module.exports = router;
