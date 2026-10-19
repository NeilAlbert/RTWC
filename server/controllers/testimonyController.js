const { sendMail } = require('../utils/mailer');
const Testimony = require('../models/testimonyModel');
const { getPagination, buildPaginationMeta } = require('../utils/pagination');
const { NotFoundError, ValidationError } = require('../utils/errors');
const logger = require('../utils/logger');

/** POST /api/testimonies — public (rate-limited, validated, sanitized) */
/* Creates a testimony with 'pending' status for admin moderation.
 * If permission_to_publish is true, status is set to 'pending' for review.
 * If false, status remains 'pending' and identifying info is kept private.
 */
async function submitTestimony(req, res, next) {
  try {
    const { name, email, testimony: testimonyText, permission_to_publish } = req.body;

    const createdTestimony = await Testimony.create({
      name,
      email,
      testimony: testimonyText,
      permission_to_publish: permission_to_publish === 'true' || permission_to_publish === true,
    });

    // Notification email — best-effort; a failure must not fail the request.
    try {
      await sendMail({
        subject: 'New Testimony Submission — Royal Temple Website',
        text: `Name: ${name}\nEmail: ${email}\nPermission to publish: ${createdTestimony.permission_to_publish ? 'Yes' : 'No'}\n\nTestimony:\n${testimonyText}`,
      });
    } catch (mailErr) {
      logger.error('Testimony notification email failed', { message: mailErr.message });
    }

    return res.status(201).json({
      success: true,
      message: 'Thank you — your testimony submission has been received for moderation.',
      data: { id: createdTestimony.id, status: createdTestimony.status }
    });
  } catch (err) {
    return next(err);
  }
}

/** GET /api/testimonies/published — public, permission-checked list */
async function getPublishedTestimonies(req, res, next) {
  try {
    const limit = Math.min(Number(req.query.limit) || 6, 50);
    const items = await Testimony.findPublished({ limit });
    return res.json({
      success: true,
      message: 'Published testimonies fetched successfully.',
      data: { items },
    });
  } catch (err) {
    return next(err);
  }
}

/** GET /api/testimonies — admin only, paginated, filterable by status */
async function getTestimonies(req, res, next) {
  try {
    const status = req.query.status || undefined;
    const { page, limit, offset } = getPagination(req.query.page, req.query.limit, 10, 50);

    const total = await Testimony.countAll({ status });
    const items = await Testimony.findAll({ status, limit, offset });

    return res.json({
      success: true,
      message: 'Testimonies fetched successfully.',
      data: { items, pagination: buildPaginationMeta(total, page, limit) }
    });
  } catch (err) {
    return next(err);
  }
}

/** PATCH /api/testimonies/:id/status — admin only */
async function updateTestimonyStatus(req, res, next) {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const allowed = ['pending', 'approved', 'rejected', 'published'];
    if (!allowed.includes(status)) {
      return next(new ValidationError('Status must be one of: pending, approved, rejected, published.'));
    }

    const existing = await Testimony.findById(id);
    if (!existing) return next(new NotFoundError('Testimony not found.'));

    if (status === 'published' && !existing.permission_to_publish) {
      return next(new ValidationError('This testimony cannot be published without permission.'));
    }

    const updated = await Testimony.updateStatus(id, status);
    return res.json({ success: true, message: 'Testimony status updated.', data: updated });
  } catch (err) {
    return next(err);
  }
}

module.exports = { submitTestimony, getPublishedTestimonies, getTestimonies, updateTestimonyStatus };