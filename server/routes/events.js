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
const { isCalendarDate } = require('../utils/validators');
const {
  getEvents,
  getCalendarFeed,
  getEventById,
  createEvent,
  updateEvent,
  deleteEvent,
} = require('../controllers/eventsController');

const router = express.Router();

const CATEGORIES = ['convention', 'revival', 'camp_meeting', 'anniversary', 'other'];

/** The same rules for adding and for editing an event. */
const eventRules = [
  body('title').trim().isLength({ min: 1, max: 255 }).withMessage('Enter a title of 255 characters or fewer.'),
  body('description').optional({ values: 'falsy' }).isString().isLength({ max: 5000 })
    .withMessage('The description must be 5000 characters or fewer.'),
  body('event_date').custom(isCalendarDate).withMessage('Enter a valid date.'),
  body('event_time').optional({ values: 'falsy' }).trim().isLength({ max: 50 })
    .withMessage('The time must be 50 characters or fewer.'),
  body('location').optional({ values: 'falsy' }).trim().isLength({ max: 255 })
    .withMessage('The location must be 255 characters or fewer.'),
  body('category').isIn(CATEGORIES).withMessage('Choose a type of event.'),
];

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

/** GET /api/events/calendar.ics — public subscribable calendar feed */
router.get('/calendar.ics', getCalendarFeed);

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
  sanitizeBody(['title', 'description', 'event_time', 'location'], { maxLength: 5000 }),
  eventRules,
  validateRequest,
  createEvent
);

/** PUT /api/events/:id — admin only */
router.put(
  '/:id',
  authMiddleware,
  sanitizeBody(['title', 'description', 'event_time', 'location'], { maxLength: 5000 }),
  [param('id').isInt({ min: 1 }).withMessage('Invalid event id.'), ...eventRules],
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
