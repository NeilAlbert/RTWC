/**
 * routes/events.js: the public, read-only event endpoints.
 * Adding, editing and deleting are admin-only and live in routes/admin.js, under /api/admin.
 */
const express = require('express');
const { param, query } = require('express-validator');

const validateRequest = require('../middleware/validateRequest');
const { EVENT_CATEGORIES } = require('../utils/validators');
const { getEvents, getCalendarFeed, getEventById } = require('../controllers/eventsController');

const router = express.Router();

/** GET /api/events: ?category=&upcoming=true|false */
router.get(
  '/',
  [
    query('category').optional().isIn(EVENT_CATEGORIES).withMessage('Invalid category.'),
    query('upcoming').optional().isIn(['true', 'false']).withMessage('upcoming must be true or false.'),
  ],
  validateRequest,
  getEvents
);

/** GET /api/events/calendar.ics: a calendar feed people can subscribe to */
router.get('/calendar.ics', getCalendarFeed);

/** GET /api/events/:id */
router.get('/:id', [param('id').isInt({ min: 1 }).withMessage('Invalid event id.')], validateRequest, getEventById);

module.exports = router;
