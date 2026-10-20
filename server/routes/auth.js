/**
 * ROYAL TEMPLE WORSHIP CENTRE - Auth Routes
 * Authentication routes for admin login/logout/me
 * POST /api/auth/login, POST /api/auth/logout, GET /api/auth/me
 */

const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authMiddleware } = require('../middleware/authMiddleware');
const { loginLimiter } = require('../middleware/rateLimiter');

/**
 * @route   POST /api/auth/login
 * @desc    Admin login - validates credentials and returns JWT
 * @access  Public
 */
router.post('/login', loginLimiter, authController.login);

/**
 * @route   POST /api/auth/logout
 * @desc    Admin logout - client discards token
 * @access  Private (but we just check they're authenticated)
 */
router.post('/logout', authMiddleware, authController.logout);

/**
 * @route   GET /api/auth/me
 * @desc    Get logged-in admin info - protected route
 * @access  Private
 */
router.get('/me', authMiddleware, authController.me);

module.exports = router;