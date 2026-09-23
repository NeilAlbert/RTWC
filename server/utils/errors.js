/**
 * =============================================================================
 * utils/errors.js — small custom error classes so the centralized error
 * handler can map them to proper HTTP status codes.
 * =============================================================================
 */

/** 404 */
class NotFoundError extends Error {
  constructor(message = 'Resource not found.') {
    super(message);
    this.name = 'NotFoundError';
    this.status = 404;
  }
}

/** 400 */
class ValidationError extends Error {
  constructor(message = 'Invalid input.') {
    super(message);
    this.name = 'ValidationError';
    this.status = 400;
  }
}

module.exports = { NotFoundError, ValidationError };
