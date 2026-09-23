/**
 * =============================================================================
 * controllers/eventsController.js — events business logic.
 * =============================================================================
 */
const Event = require('../models/eventModel');
const { NotFoundError } = require('../utils/errors');

const CATEGORY_MAP = {
  convention: 'Convention',
  revival: 'Revival',
  camp_meeting: 'Camp Meeting',
  anniversary: 'Anniversary',
  other: 'Other',
};

function formatEvent(row) {
  return { ...row, category: CATEGORY_MAP[row.category] || row.category };
}

/** GET /api/events — public, ?category=&upcoming=true|false */
async function getEvents(req, res, next) {
  try {
    const { category, upcoming } = req.query;

    const upcomingBool = upcoming === undefined ? undefined : upcoming === 'true';

    const rows = await Event.findAll({ category, upcoming: upcomingBool });
    const data = rows.map(formatEvent);

    return res.json({ success: true, message: 'Events fetched successfully.', data });
  } catch (err) {
    return next(err);
  }
}

/** GET /api/events/:id — public */
async function getEventById(req, res, next) {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return next(new NotFoundError('Event not found.'));
    return res.json({ success: true, message: 'Event fetched successfully.', data: formatEvent(event) });
  } catch (err) {
    return next(err);
  }
}

/** POST /api/events — admin only */
async function createEvent(req, res, next) {
  try {
    const event = await Event.create(req.body);
    return res.status(201).json({ success: true, message: 'Event created successfully.', data: formatEvent(event) });
  } catch (err) {
    return next(err);
  }
}

/** PUT /api/events/:id — admin only */
async function updateEvent(req, res, next) {
  try {
    const existing = await Event.findById(req.params.id);
    if (!existing) return next(new NotFoundError('Event not found.'));
    const event = await Event.update(req.params.id, req.body);
    return res.json({ success: true, message: 'Event updated successfully.', data: formatEvent(event) });
  } catch (err) {
    return next(err);
  }
}

/** DELETE /api/events/:id — admin only */
async function deleteEvent(req, res, next) {
  try {
    const deleted = await Event.remove(req.params.id);
    if (!deleted) return next(new NotFoundError('Event not found.'));
    return res.json({ success: true, message: 'Event deleted successfully.', data: null });
  } catch (err) {
    return next(err);
  }
}

module.exports = { getEvents, getEventById, createEvent, updateEvent, deleteEvent };
