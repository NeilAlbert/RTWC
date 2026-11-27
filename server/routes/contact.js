/**
 * =============================================================================
 * routes/contact.js — contact form endpoints.
 * =============================================================================
 */
const express = require('express');
const { body } = require('express-validator');

const validateRequest = require('../middleware/validateRequest');
const { sanitizeBody } = require('../middleware/sanitizeInput');
const { contactLimiter } = require('../middleware/rateLimiter');
const { honeypot } = require('../middleware/honeypot');
// Reading, updating and deleting messages is under /api/admin/contact.
const { submitContact, THANK_YOU } = require('../controllers/contactController');

const router = express.Router();

/**
 * POST /api/contact — public, rate-limited, validated, sanitized.
 * "website" is the hidden honeypot field and must be empty.
 * The email is only trimmed and lowercased, so it is saved as the visitor typed it.
 */
router.post(
  '/',
  contactLimiter,
  honeypot(201, THANK_YOU, 'Contact message caught by the honeypot'),
  sanitizeBody(['name', 'message'], { maxLength: 5000 }),
  [
    body('name').trim().isLength({ min: 2, max: 150 }).withMessage('Please provide your name.'),
    body('email').isString().withMessage('A valid email address is required.').bail()
      .trim().isEmail().withMessage('A valid email address is required.').bail()
      .toLowerCase(),
    body('message').trim().isLength({ min: 5, max: 5000 }).withMessage('Message must be at least 5 characters.'),
  ],
  validateRequest,
  submitContact
);

module.exports = router;
