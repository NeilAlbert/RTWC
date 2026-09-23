/**
 * =============================================================================
 * routes/prayerRequests.js — prayer request endpoints.
 * =============================================================================
 */
const express = require('express');
const { body, param, query } = require('express-validator');

const authMiddleware = require('../middleware/authMiddleware');
const validateRequest = require('../middleware/validateRequest');
const { sanitizeBody } = require('../middleware/sanitizeInput');
const { prayerRequestsLimiter } = require('../middleware/rateLimiter');
const {
  submitPrayerRequest,
  getRequests,
  updateRequestStatus,
} = require('../controllers/prayerRequestsController');

const router = express.Router();

/** POST /api/prayer-requests — public, rate-limited, validated, sanitized */
router.post(
  '/',
  prayerRequestsLimiter,
  sanitizeBody(['name', 'request_text'], { maxLength: 5000 }),
  [
    body('name').trim().isLength({ min: 2, max: 150 }).withMessage('Please provide your name.'),
    body('request_text').trim().isLength({ min: 5, max: 5000 }).withMessage('Please describe your prayer request.'),
    body('is_private').optional().isBoolean().withMessage('is_private must be a boolean.'),
  ],
  validateRequest,
  submitPrayerRequest
);

/** GET /api/prayer-requests — admin only, paginated */
router.get(
  '/',
  authMiddleware,
  [
    query('status').optional().isIn(['new', 'prayed_for']),
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 50 }),
  ],
  validateRequest,
  getRequests
);

/** PATCH /api/prayer-requests/:id/status — admin only */
router.patch(
  '/:id/status',
  authMiddleware,
  [param('id').isInt({ min: 1 }).withMessage('Invalid request id.')],
  validateRequest,
  updateRequestStatus
);

module.exports = router;
