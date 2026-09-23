/**
 * =============================================================================
 * routes/giving.js — online giving endpoints (Paystack).
 * =============================================================================
 */
const express = require('express');
const { body, query, param } = require('express-validator');

const authMiddleware = require('../middleware/authMiddleware');
const validateRequest = require('../middleware/validateRequest');
const { sanitizeBody } = require('../middleware/sanitizeInput');
const { givingLimiter } = require('../middleware/rateLimiter');
const {
  initiateGiving,
  handleGivingWebhook,
  verifyGiving,
  getGivingHistory,
} = require('../controllers/givingController');

const router = express.Router();

const CATEGORIES = ['tithe', 'offering', 'building_fund', 'thanksgiving', 'seed_offering'];

/** POST /api/giving/initiate — public, rate-limited, validated */
router.post(
  '/initiate',
  givingLimiter,
  sanitizeBody(['name'], { maxLength: 150 }),
  [
    body('name').trim().isLength({ min: 2, max: 150 }).withMessage('Please provide your name.'),
    body('email').trim().isEmail().withMessage('A valid email address is required.').normalizeEmail(),
    // Amount must be at least GHS 1. Stored as cedis; converted to pesewas when sent to Paystack.
    body('amount').isFloat({ min: 1 }).withMessage('Amount must be at least GH₵ 1.'),
    body('category').isIn(CATEGORIES).withMessage('Invalid giving category.'),
  ],
  validateRequest,
  initiateGiving
);

/**
 * POST /api/giving/webhook — Paystack's server-to-server callback.
 * NOT rate-limited (Paystack retries) and NOT behind auth (signature
 * verification happens in the controller). The route only sanity-checks the
 * payload shape; the HMAC-SHA512 signature over the raw body is what makes
 * the request trustworthy.
 */
router.post(
  '/webhook',
  [
    body('event').optional().isString().withMessage('event must be a string.'),
    body('data.reference').optional().isString().isLength({ min: 1, max: 100 }).withMessage('data.reference must be a string.'),
  ],
  validateRequest,
  handleGivingWebhook
);

/** GET /api/giving/verify/:reference — public status check after redirect */
router.get(
  '/verify/:reference',
  [
    param('reference').trim().isLength({ min: 1, max: 100 }).withMessage('A valid payment reference is required.'),
  ],
  validateRequest,
  verifyGiving
);

/** GET /api/giving/history — admin only, filterable by category/date range */
router.get(
  '/history',
  authMiddleware,
  [
    query('category').optional().isIn(CATEGORIES),
    query('from').optional().isISO8601().withMessage('from must be YYYY-MM-DD.'),
    query('to').optional().isISO8601().withMessage('to must be YYYY-MM-DD.'),
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 50 }),
  ],
  validateRequest,
  getGivingHistory
);

module.exports = router;
