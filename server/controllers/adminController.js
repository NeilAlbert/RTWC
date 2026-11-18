/**
 * =============================================================================
 * controllers/adminController.js: the content lists and the dashboard counts.
 * The inbox lists are in inboxController.js.
 * =============================================================================
 */
const Sermon = require('../models/sermonModel');
const Event = require('../models/eventModel');
const Ministry = require('../models/ministryModel');
const Leadership = require('../models/leadershipModel');
const ContactMessage = require('../models/contactMessageModel');
const PrayerRequest = require('../models/prayerRequestModel');
const NewsletterSubscriber = require('../models/newsletterSubscriberModel');
const { getPagination, buildPaginationMeta } = require('../utils/pagination');
const redis = require('../config/redis');

/** Answers a list request with one page of rows and its pagination. */
function sendPage(res, noun, items, total, page, limit) {
  return res.json({
    success: true,
    data: { items, pagination: buildPaginationMeta(total, page, limit) },
    message: noun + ' fetched successfully.',
  });
}

/** GET /api/admin/sermons: newest first. ?q= searches the title and the speaker. */
async function listSermons(req, res, next) {
  try {
    const { page, limit, offset } = getPagination(req.query.page, req.query.limit, 20, 100);
    const filter = { q: req.query.q || undefined };
    const [total, items] = await Promise.all([Sermon.countAll(filter), Sermon.findAll({ ...filter, limit, offset })]);
    return sendPage(res, 'Sermons', items, total, page, limit);
  } catch (err) {
    return next(err);
  }
}

/** GET /api/admin/events: ?when=upcoming|past|all, ?q= searches the title. The category is the stored value. */
async function listEvents(req, res, next) {
  try {
    const { page, limit, offset } = getPagination(req.query.page, req.query.limit, 20, 100);
    const filter = { when: req.query.when || 'upcoming', q: req.query.q || undefined };
    const [total, items] = await Promise.all([Event.countForAdmin(filter), Event.findForAdmin({ ...filter, limit, offset })]);
    return sendPage(res, 'Events', items, total, page, limit);
  } catch (err) {
    return next(err);
  }
}

/** GET /api/admin/ministries: by name, each with its number of leaders. ?q= searches the name. */
async function listMinistries(req, res, next) {
  try {
    const { page, limit, offset } = getPagination(req.query.page, req.query.limit, 20, 100);
    const filter = { q: req.query.q || undefined };
    const [total, items] = await Promise.all([Ministry.countAll(filter), Ministry.findAllWithLeaderCount({ ...filter, limit, offset })]);
    return sendPage(res, 'Ministries', items, total, page, limit);
  } catch (err) {
    return next(err);
  }
}

/** GET /api/admin/leadership: by display order. ?role= filters, ?q= searches the name. */
async function listLeadership(req, res, next) {
  try {
    const { page, limit, offset } = getPagination(req.query.page, req.query.limit, 20, 100);
    const filter = { role: req.query.role || undefined, q: req.query.q || undefined };
    const [total, rows] = await Promise.all([Leadership.countForAdmin(filter), Leadership.findForAdmin({ ...filter, limit, offset })]);
    const items = rows.map((row) => ({
      id: row.id,
      name: row.name,
      role: row.role,
      ministry_id: row.ministry_id,
      ministry_name: row.ministry_name || null,
      photo_url: row.photo_url,
      bio: row.bio,
      display_order: row.display_order,
    }));
    return sendPage(res, 'Leadership', items, total, page, limit);
  } catch (err) {
    return next(err);
  }
}

/**
 * GET /api/admin/stats: the five counts for the dashboard and the sidebar, the
 * 5 most recent new messages and the next 3 upcoming events.
 */
async function getStats(req, res, next) {
  try {
    const [sermons, upcomingEvents, newMessages, newPrayerRequests, subscribers, messages, events] = await Promise.all([
      Sermon.countAll(),
      Event.countForAdmin({ when: 'upcoming' }),
      ContactMessage.countAll({ status: 'new' }),
      PrayerRequest.countAll({ status: 'new' }),
      NewsletterSubscriber.countAll(),
      ContactMessage.findAll({ status: 'new', limit: 5, offset: 0 }),
      Event.findForAdmin({ when: 'upcoming', limit: 3, offset: 0 }),
    ]);
    return res.json({
      success: true,
      data: {
        sermons,
        upcomingEvents,
        newMessages,
        newPrayerRequests,
        subscribers,
        recentMessages: messages.map((row) => ({
          id: row.id,
          name: row.name,
          preview: String(row.message || '').slice(0, 140),
          created_at: row.created_at,
        })),
        nextEvents: events.map((row) => ({
          id: row.id,
          title: row.title,
          event_date: row.event_date,
          event_time: row.event_time,
          location: row.location,
        })),
      },
      message: 'Counts fetched successfully.',
    });
  } catch (err) {
    return next(err);
  }
}

/** The admin status label for each Redis state. */
const REDIS_STATUS = {
  connected: { status: 'ok', label: 'OK' },
  disabled: { status: 'not_set_up', label: 'Not set up' },
  degraded: { status: 'needs_attention', label: 'Needs attention' },
};

/**
 * GET /api/admin/status: the parts of the site that can be checked from here.
 * For now only Redis: { redis: { status, label, message } }.
 */
function getStatus(req, res) {
  const { status, label } = REDIS_STATUS[redis.getState()];
  return res.json({
    success: true,
    message: 'Status fetched successfully.',
    data: { redis: { status, label, message: redis.describeState() } },
  });
}

module.exports = {
  getStatus,
  listSermons,
  listEvents,
  listMinistries,
  listLeadership,
  getStats,
};
