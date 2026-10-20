/**
 * =============================================================================
 * routes/prayerRequests.js — prayer request endpoints.
 * =============================================================================
 */
const express = require('express');
const { body, param, query } = require('express-validator');

const authMiddleware = require('../middleware/authMiddleware');
const authorizeRoles = require('../middleware/authorizeRoles');
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
    body('name').optional({ values: 'falsy' }).trim().isLength({ min: 2, max: 150 }).withMessage('Please provide at least 2 characters for your name.'),
    body('request_text').trim().isLength({ min: 5, max: 5000 }).withMessage('Please describe your prayer request.'),
    body('is_anonymous').optional().isBoolean().withMessage('is_anonymous must be a boolean.'),
    body('is_private').optional().isBoolean().withMessage('is_private must be a boolean.'),
  ],
  validateRequest,
  submitPrayerRequest
);

/** GET /api/prayer-requests — admin only, paginated */
router.get(
  '/',
  authMiddleware,
  authorizeRoles('super_admin', 'admin'),
  [
    query('status').optional().isIn(['new', 'being_prayed_for', 'completed', 'archived']),
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
  authorizeRoles('super_admin', 'admin'),
  [
    param('id').isInt({ min: 1 }).withMessage('Invalid request id.'),
    body('status').isIn(['new', 'being_prayed_for', 'completed', 'archived']).withMessage('Invalid prayer request status.'),
  ],
  validateRequest,
  updateRequestStatus
);

module.exports = router;
