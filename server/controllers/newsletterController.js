/**
 * =============================================================================
 * controllers/newsletterController.js — newsletter sign-up from the public site.
 *
 * The reply is the same whether the address is new, already on the list, or the
 * request was caught by the honeypot, so the form cannot be used to find out who
 * is subscribed. Nothing from the list is ever sent back.
 * =============================================================================
 */
const NewsletterSubscriber = require('../models/newsletterSubscriberModel');
const logger = require('../utils/logger');

const THANK_YOU = 'Thank you. You are on our list.';

/** "john@example.com" becomes "j***@example.com", for the log. */
function maskEmail(email) {
  const at = String(email).lastIndexOf('@');
  if (at < 1) return '***';
  return `${email[0]}***${email.slice(at)}`;
}

function thankYou(res) {
  return res.json({ success: true, data: null, message: THANK_YOU });
}

/**
 * Runs before validation. A filled-in "website" field means a bot: it gets the
 * normal reply and nothing is saved or checked.
 */
function honeypot(req, res, next) {
  const trap = req.body && req.body.website;
  if (typeof trap === 'string' ? trap.trim() !== '' : trap !== undefined && trap !== null) {
    logger.info('Newsletter sign-up caught by the honeypot');
    return thankYou(res);
  }
  return next();
}

/** POST /api/newsletter/subscribe — public, rate limited, validated. */
async function subscribe(req, res) {
  const { email } = req.body;
  try {
    const added = await NewsletterSubscriber.subscribe(email);
    logger.info(added ? 'Newsletter sign-up' : 'Newsletter sign-up for an address already on the list', { email: maskEmail(email) });
    return thankYou(res);
  } catch (err) {
    // A database error carries the failed SQL, which holds the address, so only its code is logged.
    logger.error('Newsletter sign-up failed', {
      email: maskEmail(email),
      code: err.code,
      message: err.sqlState || err.sqlMessage ? 'Database error' : err.message,
    });
    return res.status(500).json({
      success: false,
      data: null,
      message: 'We could not subscribe you right now. Please try again.',
    });
  }
}

module.exports = { subscribe, honeypot, maskEmail };
