/**
 * middleware/honeypot.js: the hidden "website" field on the contact and prayer
 * request forms (the newsletter has its own in newsletterController.js).
 *
 * People never see the field, so a value in it means a bot. The request gets the
 * same reply a real one would, and nothing is checked, saved or emailed.
 *
 * @param {number} status   the status of the normal success reply
 * @param {string} message  the message of the normal success reply
 * @param {string} log      what is written to the log (no personal data)
 */
const logger = require('../utils/logger');

function honeypot(status, message, log) {
  return function honeypotMiddleware(req, res, next) {
    const trap = req.body && req.body.website;
    if (typeof trap === 'string' ? trap.trim() !== '' : trap !== undefined && trap !== null) {
      logger.info(log);
      return res.status(status).json({ success: true, data: null, message });
    }
    return next();
  };
}

module.exports = { honeypot };
