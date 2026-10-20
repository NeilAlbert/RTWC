/**
 * =============================================================================
 * controllers/prayerRequestsController.js — prayer request business logic.
 * =============================================================================
 */
const PrayerRequest = require('../models/prayerRequestModel');
const { sendMail } = require('../utils/mailer');
const { getPagination, buildPaginationMeta } = require('../utils/pagination');
const { NotFoundError, ValidationError } = require('../utils/errors');
const logger = require('../utils/logger');

/** POST /api/prayer-requests — public (rate-limited) */
async function submitPrayerRequest(req, res, next) {
  try {
    const { name, email, phone, request_text } = req.body;
    const is_private = req.body.is_anonymous === true || req.body.is_anonymous === 'true'
      || req.body.is_private === true || req.body.is_private === 'true'
      || req.body.is_private === 1 || req.body.is_private === '1';

    const prayer = await PrayerRequest.create({
      name: is_private ? null : name,
      email: is_private ? null : email,
      phone: is_private ? null : phone,
      request_text,
      is_private,
    });

    // Notification email — best-effort.
    try {
      await sendMail({
        subject: 'New Prayer Request — Royal Temple Website',
        text: `Name: ${is_private ? 'Anonymous' : (name || 'Not provided')}\nPrivacy: ${prayer.is_private ? 'Private' : 'Not anonymous'}\n\nRequest:\n${request_text}`,
      });
    } catch (mailErr) {
      logger.error('Prayer request notification email failed', { message: mailErr.message });
    }

    return res.status(201).json({
      success: true,
      message: 'Thank you — your prayer request has been received.',
      data: { id: prayer.id, createdAt: prayer.created_at },
    });
  } catch (err) {
    return next(err);
  }
}

/** GET /api/prayer-requests — admin only, paginated */
async function getRequests(req, res, next) {
  try {
    const status = req.query.status || undefined;
    const { page, limit, offset } = getPagination(req.query.page, req.query.limit, 10, 50);

    const total = await PrayerRequest.countAll({ status });
    const items = await PrayerRequest.findAll({ status, limit, offset });

    return res.json({
      success: true,
      message: 'Prayer requests fetched successfully.',
      data: { items, pagination: buildPaginationMeta(total, page, limit) },
    });
  } catch (err) {
    return next(err);
  }
}

/** PATCH /api/prayer-requests/:id/status — admin only */
async function updateRequestStatus(req, res, next) {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['new', 'being_prayed_for', 'completed', 'archived'].includes(status)) {
      return next(new ValidationError('Invalid prayer request status.'));
    }

    const existing = await PrayerRequest.findById(id);
    if (!existing) return next(new NotFoundError('Prayer request not found.'));

    const updated = await PrayerRequest.updateStatus(id, status);
    return res.json({ success: true, message: 'Prayer request status updated.', data: updated });
  } catch (err) {
    return next(err);
  }
}

module.exports = { submitPrayerRequest, getRequests, updateRequestStatus };
