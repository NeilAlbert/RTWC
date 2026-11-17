/** 
 * middleware/rateLimiter.js — shared rate-limit configurations for public 
 * POST endpoints. All limits are per-IP. 
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

/** Newsletter subscribe: max 10 requests per 15 minutes per IP. */
const newsletterLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders,
  legacyHeaders,
  message: { success: false, message: 'Too many requests. Please try again later.' },
});

/** Sign-in: 10 attempts per 15 minutes per IP. The login page shows this message. */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders,
  legacyHeaders,
  message: { success: false, data: null, message: 'Too many attempts. Please try again in a few minutes.' },
});

/** Password change: 10 attempts per 15 minutes per IP, so a stolen session cannot guess the current password. */
const passwordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders,
  legacyHeaders,
  message: { success: false, data: null, message: 'Too many attempts. Please try again in a few minutes.' },
});

module.exports = {
  contactLimiter,
  prayerRequestsLimiter,
  newsletterLimiter,
  authLimiter,
  passwordLimiter,
};
