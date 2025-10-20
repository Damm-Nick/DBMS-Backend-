// routes/auth.js
const express = require('express');
const router = express.Router();
const { register, login, getMe } = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const { authValidation, validate } = require('../middleware/validation');

// Public routes
router.post('/register', authValidation.register, validate, register);
router.post('/login', authValidation.login, validate, login);

// Protected routes
router.get('/me', protect, getMe);

module.exports = router;