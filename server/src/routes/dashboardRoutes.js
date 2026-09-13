// server/src/routes/dashboardRoutes.js
const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');
const { getDashboardStats } = require('../controllers/dashboardController');

router.use(authenticate);

router.get('/stats', authorize('ADMIN', 'MANAGER', 'COLLECTION_AGENT'), getDashboardStats);

module.exports = router;
