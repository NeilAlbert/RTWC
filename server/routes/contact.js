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
// Reading, updating and deleting messages is under /api/admin/contact.
const { submitContact } = require('../controllers/contactController');

const router = express.Router();

/** POST /api/contact — public, rate-limited, validated, sanitized */
router.post(
  '/',
  contactLimiter,
  sanitizeBody(['name', 'message'], { maxLength: 5000 }),
  [
    body('name').trim().isLength({ min: 2, max: 150 }).withMessage('Please provide your name.'),
    body('email').trim().isEmail().withMessage('A valid email address is required.').normalizeEmail(),
    body('message').trim().isLength({ min: 5, max: 5000 }).withMessage('Message must be at least 5 characters.'),
  ],
  validateRequest,
  submitContact
);

module.exports = router;
