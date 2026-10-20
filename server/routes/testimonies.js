const express = require('express');
const { body, param, query } = require('express-validator');

const authMiddleware = require('../middleware/authMiddleware');
const authorizeRoles = require('../middleware/authorizeRoles');
const validateRequest = require('../middleware/validateRequest');
const { sanitizeBody } = require('../middleware/sanitizeInput');
const { testimoniesLimiter } = require('../middleware/rateLimiter');
const { submitTestimony, getPublishedTestimonies, getTestimonies, updateTestimonyStatus } = require('../controllers/testimonyController');

const router = express.Router();

// POST /api/testimonies — public (rate-limited, validated, sanitized)
// Creates a testimony with 'pending' status for admin moderation
router.post(
  '/',
  testimoniesLimiter,
  sanitizeBody(['name', 'testimony'], { maxLength: 5000 }),
  [
    body('name').trim().isLength({ min: 2, max: 150 }).withMessage('Please provide your name.'),
    body('email').trim().isEmail().withMessage('Please provide a valid email address.'),
    body('testimony').trim().isLength({ min: 5, max: 5000 }).withMessage('Please provide your testimony.'),
    body('permission_to_publish').optional().isBoolean().withMessage('permission_to_publish must be a boolean.'),
  ],
  validateRequest,
  submitTestimony
);

// Public display is restricted to entries that were both approved and
// explicitly permitted for publication.
router.get(
  '/published',
  [query('limit').optional().isInt({ min: 1, max: 50 })],
  validateRequest,
  getPublishedTestimonies
);

// GET /api/testimonies — admin only, paginated, filterable by status
router.get(
  '/',
  authMiddleware,
  authorizeRoles('super_admin', 'admin'),
  [
    query('status').optional().isIn(['pending', 'approved', 'rejected', 'published', 'archived']),
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 50 }),
  ],
  validateRequest,
  getTestimonies
);

// PATCH /api/testimonies/:id/status — admin only
router.patch(
  '/:id/status',
  authMiddleware,
  authorizeRoles('super_admin', 'admin'),
  [
    param('id').isInt({ min: 1 }).withMessage('Invalid testimony id.'),
    body('status').isIn(['pending', 'approved', 'rejected', 'published', 'archived']).withMessage('Invalid testimony status.'),
  ],
  validateRequest,
  updateTestimonyStatus
);

module.exports = router;