/**
 * =============================================================================
 * middleware/errorHandler.js — centralized error handling.
 *
 * - Logs the real error server-side (never logs passwords/tokens).
 * - Never leaks stack traces, SQL errors, or internal details to the client.
 * =============================================================================
 */
const logger = require('../utils/logger');

/** 404 handler for unknown routes. */
function notFound(req, res) {
  return res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
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

  return res.status(status).json({
    success: false,
    data: null,
    message: err.message || 'Request failed.',
  });
}

module.exports = { notFound, errorHandler };
