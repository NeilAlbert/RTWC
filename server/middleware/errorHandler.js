/**
 * =============================================================================
 * middleware/errorHandler.js — centralized error handling.
 *
 * - Logs the real error server-side (never logs passwords/tokens).
 * - Never leaks stack traces, SQL errors, or internal details to the client.
 * - A browser asking for a page gets 404.html or 500.html from the site root;
 *   /api and anything that does not ask for HTML gets JSON. No reply repeats
 *   the address that was asked for.
 * =============================================================================
 */
const path = require('path');
const logger = require('../utils/logger');

const SITE_ROOT = path.join(__dirname, '..', '..');

/** True when the reply should be a web page rather than JSON. */
function wantsPage(req) {
  if (req.path === '/api' || req.path.startsWith('/api/')) return false;
  return req.accepts(['html', 'json']) === 'html';
}

/** Sends 404.html or 500.html, or a one-line text reply if the file cannot be read. */
function sendPage(res, status, file) {
  res.status(status).sendFile(path.join(SITE_ROOT, file), (err) => {
    if (err && !res.headersSent) res.type('text').send(status === 404 ? 'Page not found.' : 'Server error.');
  });
}

/** 404 handler for unknown routes. */
function notFound(req, res) {
  if (wantsPage(req)) return sendPage(res, 404, '404.html');
  return res.status(404).json({ success: false, data: null, message: 'Not found.' });
}

/**
 * Central Express error handler. Must be registered AFTER all routes.
 * @param {Error} err
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
function errorHandler(err, req, res, next) { // eslint-disable-line no-unused-vars
  const status = err.status || err.statusCode || 500;

  // A database error carries the failed SQL in its message, so only its code is logged.
  const isDatabaseError = Boolean(err.sqlState || err.sqlMessage);
  if (status >= 500) {
    logger.error('Request failed', {
      route: req.path,
      method: req.method,
      code: err.code,
      message: isDatabaseError ? 'Database error' : err.message,
    });
    if (wantsPage(req)) return sendPage(res, 500, '500.html');
    return res.status(500).json({
      success: false,
      data: null,
      message: 'The server has a problem and could not complete the request.',
    });
  }

  // A body that is not valid JSON, or is too large.
  if (err.type === 'entity.parse.failed' || err.type === 'entity.too.large') {
    return res.status(status).json({ success: false, data: null, message: 'The request could not be read.' });
  }

  if (status === 404 && wantsPage(req)) return sendPage(res, 404, '404.html');

  return res.status(status).json({
    success: false,
    data: null,
    message: err.message || 'Request failed.',
  });
}

module.exports = { notFound, errorHandler };
