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

const THANK_YOU = 'Thank you. We received your message.';

/** POST /api/contact — public (rate-limited) */
async function submitContact(req, res, next) {
  try {
    const { name, email, message } = req.body;

    const contact = await ContactMessage.create({ name, email, message });

    // Notification email — best-effort; a failure must not fail the request.
    // The subject is fixed. The visitor's address goes only in Reply-To, after the
    // route has checked it is a valid address (so it cannot hold a line break), and
    // the name and message go only in the body.
    try {
      await sendMail({
        subject: 'New message from the church website',
        text: `Name: ${name}\nEmail: ${email}\n\nMessage:\n${message}`,
        replyTo: email,
      });
    } catch (mailErr) {
      logger.error('Contact notification email failed', { message: mailErr.message });
    }

    return res.status(201).json({
      success: true,
      message: THANK_YOU,
      data: { id: contact.id, createdAt: contact.created_at },
    });
  } catch (err) {
    return next(err);
  }
}

module.exports = { submitContact, THANK_YOU };
