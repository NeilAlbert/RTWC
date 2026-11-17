/**
 * =============================================================================
 * controllers/adminController.js: lists for the admin dashboard tables.
 * =============================================================================
 */
const Sermon = require('../models/sermonModel');
const Event = require('../models/eventModel');
const Ministry = require('../models/ministryModel');
const Leadership = require('../models/leadershipModel');
const ContactMessage = require('../models/contactMessageModel');
const PrayerRequest = require('../models/prayerRequestModel');
const NewsletterSubscriber = require('../models/newsletterSubscriberModel');
const { NotFoundError } = require('../utils/errors');
const { getPagination, buildPaginationMeta } = require('../utils/pagination');

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

/** DELETE /api/admin/contact/:id */
async function deleteMessage(req, res, next) {
  try {
    const deleted = await ContactMessage.remove(req.params.id);
    if (!deleted) return next(new NotFoundError('Contact message not found.'));
    return res.json({ success: true, message: 'Message deleted.', data: null });
  } catch (err) {
    return next(err);
  }
}

/**
 * GET /api/admin/prayer-requests
 * A private request is listed without its name or its text. Those are sent only
 * when that one request is opened (GET /api/admin/prayer-requests/:id).
 */
async function listPrayerRequests(req, res, next) {
  try {
    const status = req.query.status || undefined;
    const { page, limit, offset } = getPagination(req.query.page, req.query.limit, 20, 50);

    const total = await PrayerRequest.countAll({ status });
    const rows = await PrayerRequest.findAll({ status, limit, offset });
    const items = rows.map((row) => {
      const isPrivate = Boolean(row.is_private);
      return {
        id: row.id,
        name: isPrivate ? null : row.name,
        request_text: isPrivate ? null : row.request_text,
        is_private: isPrivate,
        status: row.status,
        created_at: row.created_at,
      };
    });

    return res.json({
      success: true,
      message: 'Prayer requests fetched successfully.',
      data: { items, pagination: buildPaginationMeta(total, page, limit) },
    });
  } catch (err) {
    return next(err);
  }
}

/** GET /api/admin/prayer-requests/:id — the whole request, for the admin who opened it */
async function getPrayerRequest(req, res, next) {
  try {
    const row = await PrayerRequest.findById(req.params.id);
    if (!row) return next(new NotFoundError('Prayer request not found.'));
    return res.json({
      success: true,
      message: 'Prayer request fetched successfully.',
      data: { ...row, is_private: Boolean(row.is_private) },
    });
  } catch (err) {
    return next(err);
  }
}

/** DELETE /api/admin/prayer-requests/:id */
async function deletePrayerRequest(req, res, next) {
  try {
    const deleted = await PrayerRequest.remove(req.params.id);
    if (!deleted) return next(new NotFoundError('Prayer request not found.'));
    return res.json({ success: true, message: 'Prayer request deleted.', data: null });
  } catch (err) {
    return next(err);
  }
}

/** GET /api/admin/newsletter — newest first, ?q= searches the email address */
async function listSubscribers(req, res, next) {
  try {
    const { page, limit, offset } = getPagination(req.query.page, req.query.limit, 20, 100);
    const q = req.query.q || undefined;

    const total = await NewsletterSubscriber.countAll({ q });
    const items = await NewsletterSubscriber.findAll({ q, limit, offset });

    return res.json({
      success: true,
      message: 'Subscribers fetched successfully.',
      data: { items, pagination: buildPaginationMeta(total, page, limit) },
    });
  } catch (err) {
    return next(err);
  }
}

/** DELETE /api/admin/newsletter/:id */
async function deleteSubscriber(req, res, next) {
  try {
    const deleted = await NewsletterSubscriber.remove(req.params.id);
    if (!deleted) return next(new NotFoundError('Subscriber not found.'));
    return res.json({ success: true, message: 'Subscriber removed.', data: null });
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

module.exports = {
  listSermons,
  listEvents,
  listMinistries,
  listLeadership,
  deleteMessage,
  listPrayerRequests,
  getPrayerRequest,
  deletePrayerRequest,
  listSubscribers,
  deleteSubscriber,
  getStats,
};
