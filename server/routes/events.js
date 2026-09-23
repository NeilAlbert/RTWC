/**
 * =============================================================================
 * routes/events.js — event endpoints.
 * =============================================================================
 */
const express = require('express');
const { body, param, query } = require('express-validator');

const authMiddleware = require('../middleware/authMiddleware');
const validateRequest = require('../middleware/validateRequest');
const { sanitizeBody } = require('../middleware/sanitizeInput');
const {
  getEvents,
  getEventById,
  createEvent,
  updateEvent,
  deleteEvent,
} = require('../controllers/eventsController');

const router = express.Router();

const CATEGORIES = ['convention', 'revival', 'camp_meeting', 'anniversary', 'other'];

/** GET /api/events — public, ?category=&upcoming=true|false */
router.get(
  '/',
  [
    query('category').optional().isIn(CATEGORIES).withMessage('Invalid category.'),
    query('upcoming').optional().isIn(['true', 'false']).withMessage('upcoming must be true or false.'),
  ],
  validateRequest,
  getEvents
);

/** GET /api/events/:id — public */
router.get(
  '/:id',
  [param('id').isInt({ min: 1 }).withMessage('Invalid event id.')],
  validateRequest,
  getEventById
);

/** POST /api/events — admin only */
router.post(
  '/',
  authMiddleware,
  sanitizeBody(['title', 'description', 'location'], { maxLength: 5000 }),
  [
    body('title').trim().isLength({ min: 1, max: 255 }).withMessage('Title is required.'),
    body('description').optional().isString().isLength({ max: 5000 }),
    body('event_date').isISO8601().withMessage('event_date must be YYYY-MM-DD.'),
    body('event_time').optional().trim().isLength({ max: 50 }),
    body('location').optional().trim().isLength({ max: 255 }),
    body('category').isIn(CATEGORIES).withMessage('Invalid category.'),
  ],
  validateRequest,
  createEvent
);

/** PUT /api/events/:id — admin only */
router.put(
  '/:id',
  authMiddleware,
  sanitizeBody(['title', 'description', 'location'], { maxLength: 5000 }),
  [
    param('id').isInt({ min: 1 }),
    body('title').trim().isLength({ min: 1, max: 255 }),
    body('description').optional().isString().isLength({ max: 5000 }),
    body('event_date').isISO8601(),
    body('event_time').optional().trim().isLength({ max: 50 }),
    body('location').optional().trim().isLength({ max: 255 }),
    body('category').isIn(CATEGORIES),
  ],
  validateRequest,
  updateEvent
);

/** DELETE /api/events/:id — admin only */
router.delete(
  '/:id',
  authMiddleware,
  [param('id').isInt({ min: 1 }).withMessage('Invalid event id.')],
  validateRequest,
  deleteEvent
);

module.exports = router;
