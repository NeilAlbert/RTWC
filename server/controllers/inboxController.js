/**
 * =============================================================================
 * controllers/inboxController.js: contact messages, prayer requests and
 * newsletter subscribers, for the admin (all under /api/admin).
 *
 * A list sends a short preview of each message. The whole text is sent only
 * when one message is opened. A private prayer request is listed without its
 * name or text: those are sent only when that one request is opened.
 * =============================================================================
 */
const ContactMessage = require('../models/contactMessageModel');
const PrayerRequest = require('../models/prayerRequestModel');
const NewsletterSubscriber = require('../models/newsletterSubscriberModel');
const { NotFoundError } = require('../utils/errors');
const { getPagination, buildPaginationMeta } = require('../utils/pagination');

const PREVIEW_LENGTH = 140;

function preview(text) {
  const flat = String(text || '').replace(/\s+/g, ' ').trim();
  return flat.length > PREVIEW_LENGTH ? `${flat.slice(0, PREVIEW_LENGTH - 1)}…` : flat;
}

function sendPage(res, noun, items, total, page, limit) {
  return res.json({
    success: true,
    data: { items, pagination: buildPaginationMeta(total, page, limit) },
    message: `${noun} fetched successfully.`,
  });
}

function filterFrom(req) {
  return { status: req.query.status || undefined, q: req.query.q || undefined };
}

// ---------------------------------------------------------------------------
// Contact messages
// ---------------------------------------------------------------------------

/** GET /api/admin/contact: newest first. ?status= filters, ?q= searches name, email and message. */
async function listMessages(req, res, next) {
  try {
    const { page, limit, offset } = getPagination(req.query.page, req.query.limit, 20, 100);
    const filter = filterFrom(req);
    const [total, rows] = await Promise.all([
      ContactMessage.countAll(filter),
      ContactMessage.findAll({ ...filter, limit, offset }),
    ]);
    const items = rows.map((row) => ({
      id: row.id,
      name: row.name,
      email: row.email,
      preview: preview(row.message),
      status: row.status,
      created_at: row.created_at,
    }));
    return sendPage(res, 'Messages', items, total, page, limit);
  } catch (err) {
    return next(err);
  }
}

/** GET /api/admin/contact/:id: the whole message. */
async function getMessage(req, res, next) {
  try {
    const row = await ContactMessage.findById(req.params.id);
    if (!row) return next(new NotFoundError('That message was not found. It may have been deleted.'));
    return res.json({ success: true, data: row, message: 'Message fetched successfully.' });
  } catch (err) {
    return next(err);
  }
}

/** PATCH /api/admin/contact/:id/status: body { status }. */
async function setMessageStatus(req, res, next) {
  try {
    const existing = await ContactMessage.findById(req.params.id);
    if (!existing) return next(new NotFoundError('That message was not found. It may have been deleted.'));
    const updated = await ContactMessage.updateStatus(req.params.id, req.body.status);
    return res.json({ success: true, data: updated, message: 'Status saved.' });
  } catch (err) {
    return next(err);
  }
}

/** DELETE /api/admin/contact/:id */
async function deleteMessage(req, res, next) {
  try {
    const deleted = await ContactMessage.remove(req.params.id);
    if (!deleted) return next(new NotFoundError('That message was not found. It may have been deleted.'));
    return res.json({ success: true, data: null, message: 'Message deleted.' });
  } catch (err) {
    return next(err);
  }
}

// ---------------------------------------------------------------------------
// Prayer requests
// ---------------------------------------------------------------------------

/** GET /api/admin/prayer-requests: newest first. ?status= filters, ?q= searches requests that may be shared. */
async function listPrayerRequests(req, res, next) {
  try {
    const { page, limit, offset } = getPagination(req.query.page, req.query.limit, 20, 100);
    const filter = filterFrom(req);
    const [total, rows] = await Promise.all([
      PrayerRequest.countAll(filter),
      PrayerRequest.findAll({ ...filter, limit, offset }),
    ]);
    const items = rows.map((row) => {
      const isPrivate = Boolean(row.is_private);
      return {
        id: row.id,
        name: isPrivate ? null : row.name,
        preview: isPrivate ? null : preview(row.request_text),
        is_private: isPrivate,
        status: row.status,
        created_at: row.created_at,
      };
    });
    return sendPage(res, 'Prayer requests', items, total, page, limit);
  } catch (err) {
    return next(err);
  }
}

/** GET /api/admin/prayer-requests/:id: the whole request, private or not. */
async function getPrayerRequest(req, res, next) {
  try {
    const row = await PrayerRequest.findById(req.params.id);
    if (!row) return next(new NotFoundError('That prayer request was not found. It may have been deleted.'));
    return res.json({
      success: true,
      data: { ...row, is_private: Boolean(row.is_private) },
      message: 'Prayer request fetched successfully.',
    });
  } catch (err) {
    return next(err);
  }
}

/** PATCH /api/admin/prayer-requests/:id/status: body { status }. */
async function setPrayerRequestStatus(req, res, next) {
  try {
    const existing = await PrayerRequest.findById(req.params.id);
    if (!existing) return next(new NotFoundError('That prayer request was not found. It may have been deleted.'));
    const updated = await PrayerRequest.updateStatus(req.params.id, req.body.status);
    return res.json({
      success: true,
      data: { ...updated, is_private: Boolean(updated.is_private) },
      message: 'Status saved.',
    });
  } catch (err) {
    return next(err);
  }
}

/** DELETE /api/admin/prayer-requests/:id */
async function deletePrayerRequest(req, res, next) {
  try {
    const deleted = await PrayerRequest.remove(req.params.id);
    if (!deleted) return next(new NotFoundError('That prayer request was not found. It may have been deleted.'));
    return res.json({ success: true, data: null, message: 'Prayer request deleted.' });
  } catch (err) {
    return next(err);
  }
}

// ---------------------------------------------------------------------------
// Newsletter
// ---------------------------------------------------------------------------

/** GET /api/admin/newsletter: newest first. ?q= searches the email address. */
async function listSubscribers(req, res, next) {
  try {
    const { page, limit, offset } = getPagination(req.query.page, req.query.limit, 20, 100);
    const q = req.query.q || undefined;
    const [total, items] = await Promise.all([
      NewsletterSubscriber.countAll({ q }),
      NewsletterSubscriber.findAll({ q, limit, offset }),
    ]);
    return sendPage(res, 'Subscribers', items, total, page, limit);
  } catch (err) {
    return next(err);
  }
}

/** DELETE /api/admin/newsletter/:id */
async function deleteSubscriber(req, res, next) {
  try {
    const deleted = await NewsletterSubscriber.remove(req.params.id);
    if (!deleted) return next(new NotFoundError('That subscriber was not found. They may have been removed already.'));
    return res.json({ success: true, data: null, message: 'Subscriber removed.' });
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  listMessages,
  getMessage,
  setMessageStatus,
  deleteMessage,
  listPrayerRequests,
  getPrayerRequest,
  setPrayerRequestStatus,
  deletePrayerRequest,
  listSubscribers,
  deleteSubscriber,
};
