/**
 * =============================================================================
 * controllers/contactController.js — contact form business logic.
 *
 * Public submissions are validated, sanitized, rate-limited, stored, and a
 * notification email is sent to the admin (email failures never lose data —
 * the DB write happens first and email errors are logged, not propagated).
 * =============================================================================
 */
const ContactMessage = require('../models/contactMessageModel');
const { sendMail } = require('../utils/mailer');
const logger = require('../utils/logger');

/** POST /api/contact — public (rate-limited) */
async function submitContact(req, res, next) {
  try {
    const { name, email, message } = req.body;

    const contact = await ContactMessage.create({ name, email, message });

    // Notification email — best-effort; a failure must not fail the request.
    try {
      await sendMail({
        subject: 'New message from the church website',
        text: `Name: ${name}\nEmail: ${email}\n\nMessage:\n${message}`,
      });
    } catch (mailErr) {
      logger.error('Contact notification email failed', { message: mailErr.message });
    }

    return res.status(201).json({
      success: true,
      message: 'Thank you. We received your message.',
      data: { id: contact.id, createdAt: contact.created_at },
    });
  } catch (err) {
    return next(err);
  }
}

module.exports = { submitContact };
