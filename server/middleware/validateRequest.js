/**
 * =============================================================================
 * middleware/validateRequest.js — runs express-validator checks and rejects
 * on failure with a 400 and a structured error list.
 * =============================================================================
 */
const { validationResult } = require('express-validator');

function validateRequest(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed.',
      data: {
        errors: errors.array().map((e) => ({ field: e.path, message: e.msg })),
      },
    });
  }
  return next();
}

module.exports = validateRequest;
