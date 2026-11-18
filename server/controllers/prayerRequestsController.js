/**
 * =============================================================================
 * controllers/prayerRequestsController.js — prayer request business logic.
 * =============================================================================
 */
const PrayerRequest = require('../models/prayerRequestModel');
const { sendMail } = require('../utils/mailer');
const logger = require('../utils/logger');

/** POST /api/prayer-requests — public (rate-limited) */
async function submitPrayerRequest(req, res, next) {
  try {
    const { request_text, is_private } = req.body;
    const name = req.body.name || 'Anonymous';

    const prayer = await PrayerRequest.create({
      name,
      request_text,
      is_private: is_private === true || is_private === 'true' || is_private === 1 || is_private === '1',
    });

    // Notification email — best-effort.
    try {
      await sendMail({
        subject: 'New prayer request from the church website',
        text: `Name: ${name}\nPrivacy: ${prayer.is_private ? 'Private' : 'May be shared'}\n\nRequest:\n${request_text}`,
      });
    } catch (mailErr) {
      logger.error('Prayer request notification email failed', { message: mailErr.message });
    }

    return res.status(201).json({
      success: true,
      message: 'Thank you. We received your prayer request.',
      data: { id: prayer.id, createdAt: prayer.created_at },
    });
  } catch (err) {
    return next(err);
  }
}

module.exports = { submitPrayerRequest };
