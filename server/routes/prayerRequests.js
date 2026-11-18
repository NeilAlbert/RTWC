/**
 * =============================================================================
 * routes/prayerRequests.js — prayer request endpoints.
 * =============================================================================
 */
const express = require('express');
const { body } = require('express-validator');

const validateRequest = require('../middleware/validateRequest');
const { sanitizeBody } = require('../middleware/sanitizeInput');
const { prayerRequestsLimiter } = require('../middleware/rateLimiter');
// Reading, updating and deleting requests is under /api/admin/prayer-requests.
const { submitPrayerRequest } = require('../controllers/prayerRequestsController');

const router = express.Router();

/** POST /api/prayer-requests — public, rate-limited, validated, sanitized */
router.post(
  '/',
  prayerRequestsLimiter,
  sanitizeBody(['name', 'request_text'], { maxLength: 5000 }),
  [
    // The name is optional. The controller stores "Anonymous" when it is left blank.
    body('name').optional({ values: 'falsy' }).trim().isLength({ max: 150 }).withMessage('That name is too long.'),
    body('request_text').trim().isLength({ min: 5, max: 5000 }).withMessage('Please describe your prayer request.'),
    body('is_private').optional().isBoolean().withMessage('is_private must be a boolean.'),
  ],
  validateRequest,
  submitPrayerRequest
);

module.exports = router;
