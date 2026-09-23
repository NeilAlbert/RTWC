/**
 * =============================================================================
 * controllers/newsletterController.js — newsletter subscription logic.
 * =============================================================================
 */
const NewsletterSubscriber = require('../models/newsletterSubscriberModel');
const { getPagination, buildPaginationMeta } = require('../utils/pagination');

/** POST /api/newsletter/subscribe — public (rate-limited), prevents duplicates */
async function subscribe(req, res, next) {
  try {
    const { email } = req.body;

    const existing = await NewsletterSubscriber.findByEmail(email);
    if (existing) {
      // Idempotent: already subscribed → still a success.
      return res.json({ success: true, message: 'You are already subscribed to our newsletter.', data: { email, alreadySubscribed: true } });
    }

    const subscriber = await NewsletterSubscriber.create(email);
    return res.status(201).json({
      success: true,
      message: 'Subscribed successfully. Welcome to the Royal Temple newsletter!',
      data: { id: subscriber.id, email: subscriber.email, alreadySubscribed: false },
    });
  } catch (err) {
    return next(err);
  }
}

/** GET /api/newsletter/subscribers — admin only, paginated */
async function getSubscribers(req, res, next) {
  try {
    const { page, limit, offset } = getPagination(req.query.page, req.query.limit, 20, 100);

    const total = await NewsletterSubscriber.countAll();
    const items = await NewsletterSubscriber.findAll({ limit, offset });

    return res.json({
      success: true,
      message: 'Subscribers fetched successfully.',
      data: { items, pagination: buildPaginationMeta(total, page, limit) },
    });
  } catch (err) {
    return next(err);
  }
}

module.exports = { subscribe, getSubscribers };
