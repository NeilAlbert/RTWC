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
const { getPagination, buildPaginationMeta } = require('../utils/pagination');
const { NotFoundError, ValidationError } = require('../utils/errors');
const logger = require('../utils/logger');

/** POST /api/contact — public (rate-limited) */
async function submitContact(req, res, next) {
  try {
    const { name, email, message } = req.body;

    const contact = await ContactMessage.create({ name, email, message });

    // Notification email — best-effort; a failure must not fail the request.
    try {
      await sendMail({
        subject: 'New Contact Form Message — Royal Temple Website',
        text: `Name: ${name}\nEmail: ${email}\n\nMessage:\n${message}`,
      });
    } catch (mailErr) {
      logger.error('Contact notification email failed', { message: mailErr.message });
    }

    return res.status(201).json({
      success: true,
      message: 'Thank you — your message has been received.',
      data: { id: contact.id, createdAt: contact.created_at },
    });
  } catch (err) {
    return next(err);
  }
}

/** GET /api/contact — admin only, paginated, filterable by status */
async function getMessages(req, res, next) {
  try {
    const status = req.query.status || undefined;
    const { page, limit, offset } = getPagination(req.query.page, req.query.limit, 10, 50);

    const total = await ContactMessage.countAll({ status });
    const items = await ContactMessage.findAll({ status, limit, offset });

    return res.json({
      success: true,
      message: 'Contact messages fetched successfully.',
      data: { items, pagination: buildPaginationMeta(total, page, limit) },
    });
  } catch (err) {
    return next(err);
  }
}

/** PATCH /api/contact/:id/status — admin only */
async function updateMessageStatus(req, res, next) {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const allowed = ['new', 'read', 'responded'];
    if (!allowed.includes(status)) {
      return next(new ValidationError('Status must be one of: new, read, responded.'));
    }

    const existing = await ContactMessage.findById(id);
    if (!existing) return next(new NotFoundError('Contact message not found.'));

    const updated = await ContactMessage.updateStatus(id, status);
    return res.json({ success: true, message: 'Message status updated.', data: updated });
  } catch (err) {
    return next(err);
  }
}

module.exports = { submitContact, getMessages, updateMessageStatus };
