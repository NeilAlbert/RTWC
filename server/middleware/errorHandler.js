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
  logger.error('Unhandled error', {
    route: req.originalUrl,
    method: req.method,
    message: err.message,
  });

  // Validation/HTTP-status errors (e.g. 404 thrown by controllers) keep their code.
  const status = err.status || err.statusCode || 500;

  if (status >= 500) {
    return res.status(500).json({
      success: false,
      message: 'An internal server error occurred.',
    });
  }

  return res.status(status).json({
    success: false,
    message: err.message || 'Request failed.',
  });
}

module.exports = { notFound, errorHandler };
