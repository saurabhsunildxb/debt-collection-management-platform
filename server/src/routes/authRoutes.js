// server/src/routes/authRoutes.js
const express = require('express');
const router = express.Router();
const { login, getMe } = require('../controllers/authController');
const authenticate = require('../middleware/authenticate');

// POST /api/v1/auth/login  — public
router.post('/login', login);

// GET /api/v1/auth/me  — protected
router.get('/me', authenticate, getMe);

module.exports = router;
