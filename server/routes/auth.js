/**
 * routes/auth.js: /api/auth. Sign in, who am I, log out, change password.
 *
 * No route here passes through sanitizeInput: the only free text these routes
 * accept is passwords, and a password must reach bcrypt exactly as typed.
 */
const express = require('express');
const { body, validationResult } = require('express-validator');

const { login, me, logout, changePassword, rejectLogin } = require('../controllers/authController');
const authMiddleware = require('../middleware/authMiddleware');
const validateRequest = require('../middleware/validateRequest');
const { authLimiter, passwordLimiter } = require('../middleware/rateLimiter');

const router = express.Router();

const MIN_PASSWORD_LENGTH = 12;
// bcrypt reads only the first 72 bytes of a password. A longer one is refused, so
// no part of a password is ever silently ignored.
const MAX_PASSWORD_BYTES = 72;

/** A malformed sign-in gets the same answer as a wrong password. */
function validateLogin(req, res, next) {
  return validationResult(req).isEmpty() ? next() : rejectLogin(res);
}

/** POST /api/auth/login. Public, 10 attempts per 15 minutes per IP. */
router.post(
  '/login',
  authLimiter,
  [
    // Emails are stored trimmed and lowercased, so the one typed is compared the same way.
    body('email').isString().bail().trim().toLowerCase().isEmail().isLength({ max: 255 }),
    body('password').isString().bail().isLength({ min: 1, max: 1000 }),
  ],
  validateLogin,
  login
);

/** GET /api/auth/me */
router.get('/me', authMiddleware, validateRequest, me);

/** POST /api/auth/logout */
router.post('/logout', authMiddleware, validateRequest, logout);

/** PUT /api/auth/password */
router.put(
  '/password',
  authMiddleware,
  passwordLimiter,
  [
    body('current_password')
      .isString().withMessage('Enter your current password.').bail()
      .isLength({ min: 1, max: 1000 }).withMessage('Enter your current password.'),
    body('new_password')
      .isString().withMessage('Enter a new password.').bail()
      .isLength({ min: MIN_PASSWORD_LENGTH }).withMessage(`Use at least ${MIN_PASSWORD_LENGTH} characters.`).bail()
      .custom((value) => Buffer.byteLength(value, 'utf8') <= MAX_PASSWORD_BYTES)
      .withMessage(`Use ${MAX_PASSWORD_BYTES} characters or fewer.`).bail()
      .custom((value, { req }) => value !== req.body.current_password)
      .withMessage('The new password must be different from the current one.'),
  ],
  validateRequest,
  changePassword
);

module.exports = router;
