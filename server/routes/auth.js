/**
 * =============================================================================
 * routes/auth.js — authentication endpoints.
 * =============================================================================
 */
const express = require('express');
const { body } = require('express-validator');

const { login, logout } = require('../controllers/authController');
const validateRequest = require('../middleware/validateRequest');
const { authLimiter } = require('../middleware/rateLimiter');

const router = express.Router();

/**
 * POST /api/auth/login
 * Public (rate-limited). Body: { email, password }
 */
router.post(
  '/login',
  authLimiter,
  [
    body('email').trim().isEmail().withMessage('A valid email address is required.'),
    body('password').isLength({ min: 1 }).withMessage('Password is required.'),
  ],
  validateRequest,
  login
);

/**
 * POST /api/auth/logout
 * Stateless logout — client discards the stored JWT.
 */
router.post('/logout', logout);

module.exports = router;
