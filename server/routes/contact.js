/**
 * =============================================================================
 * routes/contact.js — contact form endpoints.
 * =============================================================================
 */
const express = require('express');
const { body, param, query } = require('express-validator');

const authMiddleware = require('../middleware/authMiddleware');
const validateRequest = require('../middleware/validateRequest');
const { sanitizeBody } = require('../middleware/sanitizeInput');
const { contactLimiter } = require('../middleware/rateLimiter');
const {
  submitContact,
  getMessages,
  updateMessageStatus,
} = require('../controllers/contactController');

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

/** GET /api/contact — admin only, paginated, filterable by status */
router.get(
  '/',
  authMiddleware,
  [
    query('status').optional().isIn(['new', 'read', 'responded']),
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 50 }),
  ],
  validateRequest,
  getMessages
);

/** PATCH /api/contact/:id/status — admin only */
router.patch(
  '/:id/status',
  authMiddleware,
  [param('id').isInt({ min: 1 }).withMessage('Invalid message id.')],
  validateRequest,
  updateMessageStatus
);

module.exports = router;
