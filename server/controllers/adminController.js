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

/** GET /api/admin/sermons */
async function listSermons(req, res, next) {
  try {
    const { page, limit, offset } = getPagination(req.query.page, req.query.limit, 20, 50);
    const filter = { q: req.query.q || undefined };

    const total = await Sermon.countAll(filter);
    const items = await Sermon.findAll({ ...filter, limit, offset });

    return res.json({
      success: true,
      message: 'Sermons fetched successfully.',
      data: { items, pagination: buildPaginationMeta(total, page, limit) },
    });
  } catch (err) {
    return next(err);
  }
}

/** GET /api/admin/events. The category is the stored value, not its display name. */
async function listEvents(req, res, next) {
  try {
    const { page, limit, offset } = getPagination(req.query.page, req.query.limit, 20, 50);
    const when = req.query.when || 'upcoming';

    const total = await Event.countForAdmin({ when });
    const items = await Event.findForAdmin({ when, limit, offset });

    return res.json({
      success: true,
      message: 'Events fetched successfully.',
      data: { items, pagination: buildPaginationMeta(total, page, limit) },
    });
  } catch (err) {
    return next(err);
  }
}

/** GET /api/admin/ministries */
async function listMinistries(req, res, next) {
  try {
    const items = await Ministry.findAllWithLeaderCount();
    return res.json({ success: true, message: 'Ministries fetched successfully.', data: { items } });
  } catch (err) {
    return next(err);
  }
}

/** GET /api/admin/leadership */
async function listLeadership(req, res, next) {
  try {
    const rows = await Leadership.findForAdmin({ role: req.query.role || undefined });
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
    return res.json({ success: true, message: 'Leadership fetched successfully.', data: { items } });
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

/** GET /api/admin/stats — the five counts on the dashboard */
async function getStats(req, res, next) {
  try {
    const [sermons, upcomingEvents, newMessages, newPrayerRequests, subscribers] = await Promise.all([
      Sermon.countAll(),
      Event.countForAdmin({ when: 'upcoming' }),
      ContactMessage.countAll({ status: 'new' }),
      PrayerRequest.countAll({ status: 'new' }),
      NewsletterSubscriber.countAll(),
    ]);
    return res.json({
      success: true,
      message: 'Counts fetched successfully.',
      data: { sermons, upcomingEvents, newMessages, newPrayerRequests, subscribers },
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
