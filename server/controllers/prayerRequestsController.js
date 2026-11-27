/**
 * =============================================================================
 * controllers/prayerRequestsController.js — prayer request business logic.
 * =============================================================================
 */
const PrayerRequest = require('../models/prayerRequestModel');
const { sendMail } = require('../utils/mailer');
const logger = require('../utils/logger');

const THANK_YOU = 'Thank you. We received your prayer request.';
// A private request is read in the admin only: its notification holds no name or text.
const PRIVATE_NOTICE = 'A private prayer request arrived. Open the admin to read it.';

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

    // Notification email — best-effort. The subject is fixed; visitor text goes only in the body.
    try {
      await sendMail({
        subject: 'New prayer request from the church website',
        text: prayer.is_private
          ? PRIVATE_NOTICE
          : `Name: ${name}\nPrivacy: May be shared\n\nRequest:\n${request_text}`,
      });
    } catch (mailErr) {
      logger.error('Prayer request notification email failed', { message: mailErr.message });
    }

    return res.status(201).json({
      success: true,
      message: THANK_YOU,
      data: { id: prayer.id, createdAt: prayer.created_at },
    });
  } catch (err) {
    return next(err);
  }
}

module.exports = { submitPrayerRequest, THANK_YOU, PRIVATE_NOTICE };
