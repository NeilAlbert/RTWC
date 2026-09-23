/**
 * =============================================================================
 * routes/newsletter.js — newsletter subscription endpoints.
 * =============================================================================
 */
const express = require('express');
const { body, query } = require('express-validator');

const authMiddleware = require('../middleware/authMiddleware');
const validateRequest = require('../middleware/validateRequest');
const { newsletterLimiter } = require('../middleware/rateLimiter');
const { subscribe, getSubscribers } = require('../controllers/newsletterController');

const router = express.Router();

/** POST /api/newsletter/subscribe — public, rate-limited, validated */
router.post(
  '/subscribe',
  newsletterLimiter,
  [body('email').trim().isEmail().withMessage('A valid email address is required.').normalizeEmail()],
  validateRequest,
  subscribe
);

/** GET /api/newsletter/subscribers — admin only, paginated */
router.get(
  '/subscribers',
  authMiddleware,
  [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
  ],
  validateRequest,
  getSubscribers
);

module.exports = router;
