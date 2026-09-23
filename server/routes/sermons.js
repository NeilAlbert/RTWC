/**
 * =============================================================================
 * routes/sermons.js — sermon endpoints.
 * =============================================================================
 */
const express = require('express');
const { body, param, query } = require('express-validator');

const authMiddleware = require('../middleware/authMiddleware');
const validateRequest = require('../middleware/validateRequest');
const { sanitizeBody } = require('../middleware/sanitizeInput');
const {
  getSermons,
  getSermonById,
  createSermon,
  updateSermon,
  deleteSermon,
} = require('../controllers/sermonsController');

const router = express.Router();

/** GET /api/sermons — public, ?speaker=&date=&page=&limit= */
router.get(
  '/',
  [
    query('speaker').optional().trim().isLength({ max: 120 }),
    query('date').optional().isISO8601().withMessage('date must be YYYY-MM-DD'),
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 50 }),
  ],
  validateRequest,
  getSermons
);

/** GET /api/sermons/:id — public */
router.get(
  '/:id',
  [param('id').isInt({ min: 1 }).withMessage('Invalid sermon id.')],
  validateRequest,
  getSermonById
);

/** POST /api/sermons — admin only */
router.post(
  '/',
  authMiddleware,
  sanitizeBody(['title', 'speaker', 'description'], { maxLength: 5000 }),
  [
    body('title').trim().isLength({ min: 1, max: 255 }).withMessage('Title is required.'),
    body('speaker').trim().isLength({ min: 1, max: 120 }).withMessage('Speaker is required.'),
    body('description').optional().isString().isLength({ max: 5000 }),
    body('video_url').optional({ values: 'falsy' }).isURL({ require_protocol: true }),
    body('thumbnail_url').optional({ values: 'falsy' }).isURL({ require_protocol: true }),
    body('sermon_date').isISO8601().withMessage('sermon_date must be YYYY-MM-DD.'),
  ],
  validateRequest,
  createSermon
);

/** PUT /api/sermons/:id — admin only */
router.put(
  '/:id',
  authMiddleware,
  sanitizeBody(['title', 'speaker', 'description'], { maxLength: 5000 }),
  [
    param('id').isInt({ min: 1 }),
    body('title').trim().isLength({ min: 1, max: 255 }),
    body('speaker').trim().isLength({ min: 1, max: 120 }),
    body('description').optional().isString().isLength({ max: 5000 }),
    body('video_url').optional({ values: 'falsy' }).isURL({ require_protocol: true }),
    body('thumbnail_url').optional({ values: 'falsy' }).isURL({ require_protocol: true }),
    body('sermon_date').isISO8601(),
  ],
  validateRequest,
  updateSermon
);

/** DELETE /api/sermons/:id — admin only */
router.delete(
  '/:id',
  authMiddleware,
  [param('id').isInt({ min: 1 }).withMessage('Invalid sermon id.')],
  validateRequest,
  deleteSermon
);

module.exports = router;
