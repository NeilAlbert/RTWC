/**
 * =============================================================================
 * middleware/rateLimiter.js — shared rate-limit configurations for public
 * POST endpoints. All limits are per-IP.
 * =============================================================================
 */
const rateLimit = require('express-rate-limit');

const standardHeaders = true;
const legacyHeaders = false;

/** Contact form: max 5 requests per 15 minutes per IP. */
const contactLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders,
  legacyHeaders,
  message: { success: false, message: 'Too many requests. Please try again later.' },
});

/** Prayer requests: max 5 requests per 15 minutes per IP. */
const prayerRequestsLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders,
  legacyHeaders,
  message: { success: false, message: 'Too many requests. Please try again later.' },
});

/** Giving initiation: max 10 requests per 15 minutes per IP. */
const givingLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders,
  legacyHeaders,
  message: { success: false, message: 'Too many requests. Please try again later.' },
});

/** Newsletter subscribe: max 10 requests per 15 minutes per IP. */
const newsletterLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders,
  legacyHeaders,
  message: { success: false, message: 'Too many requests. Please try again later.' },
});

/** Login attempts: max 10 per 15 minutes per IP (brute-force protection). */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders,
  legacyHeaders,
  message: { success: false, message: 'Too many login attempts. Please try again later.' },
});

module.exports = {
  contactLimiter,
  prayerRequestsLimiter,
  givingLimiter,
  newsletterLimiter,
  authLimiter,
};
