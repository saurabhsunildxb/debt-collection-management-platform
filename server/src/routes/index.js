// server/src/routes/index.js
const express = require('express');
const router = express.Router();

// Auth routes (public + protected)
router.use('/auth', require('./authRoutes'));

router.use('/customers', require('./customerRoutes'));
router.use('/loans', require('./loanRoutes'));
router.use('/repayments', require('./repaymentRoutes'));
router.use('/activities', require('./activityRoutes'));
router.use('/dashboard', require('./dashboardRoutes'));
router.use('/users', require('./userRoutes'));

module.exports = router;
