/**
 * ROYAL TEMPLE WORSHIP CENTRE - Error Handler Middleware
 * Centralized error handler - never returns stack traces to client
 */

const logger = require('../utils/logger');

/**
 * Global error handler
 * @param {Error} err - Error object
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware
 */
const handler = (err, req, res, next) => {
  // Log the error with full details
  logger.error({
    message: err.message,
    stack: err.stack,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip
  });

  // Determine status code
  const statusCode = err.statusCode || 500;

  // In production - never return stack traces or SQL errors
  const response = {
    success: false,
    message: 'An unexpected error occurred'
  };

  // Only include error details in development
  if (process.env.NODE_ENV !== 'production') {
    response.error = err.message;
    response.stack = err.stack;
  }

  res.status(statusCode).json(response);
};

/**
 - 404 handler for undefined routes
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware
 */
const notFound = (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
};

module.exports = { handler, notFound };