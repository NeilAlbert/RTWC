/**
 * =============================================================================
 * routes/newsletter.js — newsletter sign-up from the public site.
 * The subscriber list is under /api/admin/newsletter.
 * =============================================================================
 */
const express = require('express');
const { body } = require('express-validator');

const validateRequest = require('../middleware/validateRequest');
const { sanitizeBody } = require('../middleware/sanitizeInput');
const { newsletterLimiter } = require('../middleware/rateLimiter');
const { subscribe, honeypot } = require('../controllers/newsletterController');

const router = express.Router();

/**
 * POST /api/newsletter/subscribe — public. Body: { email, website }.
 * "website" is the hidden honeypot field and must be empty.
 *
 * The address is checked as typed, before tags are stripped, so an address with
 * markup in it is refused rather than cleaned into something valid. It is only
 * trimmed and lowercased; dots and +tags are kept as the visitor typed them.
 */
router.post(
  '/subscribe',
  newsletterLimiter,
  honeypot,
  [
    body('email')
      .isString().withMessage('Enter your email address.').bail()
      .trim()
      .notEmpty().withMessage('Enter your email address.').bail()
      .isLength({ max: 254 }).withMessage('Use an email address of 254 characters or fewer.').bail()
      .isEmail().withMessage('Enter an email address such as name@example.com.').bail()
      .toLowerCase(),
  ],
  validateRequest,
  sanitizeBody(['email'], { maxLength: 254 }),
  subscribe
);

module.exports = router;
