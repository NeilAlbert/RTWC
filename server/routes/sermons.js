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
const { isHttpUrl, isImageRef, isCalendarDate } = require('../utils/validators');
const {
  getSermons,
  getSermonById,
  createSermon,
  updateSermon,
  deleteSermon,
} = require('../controllers/sermonsController');

const router = express.Router();

/** The same rules for adding and for editing a sermon. */
const sermonRules = [
  body('title').trim().isLength({ min: 1, max: 200 }).withMessage('Enter a title of 200 characters or fewer.'),
  body('speaker').trim().isLength({ min: 1, max: 120 }).withMessage('Enter the speaker, in 120 characters or fewer.'),
  body('description').optional({ values: 'falsy' }).isString().isLength({ max: 5000 })
    .withMessage('The description must be 5000 characters or fewer.'),
  body('video_url').optional({ values: 'falsy' }).trim().isLength({ max: 500 }).custom(isHttpUrl)
    .withMessage('The video link must start with http:// or https://.'),
  body('thumbnail_url').optional({ values: 'falsy' }).trim().isLength({ max: 500 }).custom(isImageRef)
    .withMessage('The thumbnail must be an uploaded image or a link that starts with http:// or https://.'),
  body('sermon_date').custom(isCalendarDate).withMessage('Enter a valid date.'),
];

/** GET /api/sermons — public, ?speaker=&date=&q=&page=&limit= (q searches the title) */
router.get(
  '/',
  [
    query('speaker').optional().trim().isLength({ max: 120 }),
    query('date').optional().isISO8601().withMessage('date must be YYYY-MM-DD'),
    query('q').optional().trim().isLength({ max: 200 }),
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
  sermonRules,
  validateRequest,
  createSermon
);

/** PUT /api/sermons/:id — admin only */
router.put(
  '/:id',
  authMiddleware,
  sanitizeBody(['title', 'speaker', 'description'], { maxLength: 5000 }),
  [param('id').isInt({ min: 1 }).withMessage('Invalid sermon id.'), ...sermonRules],
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
