/**
 * ROYAL TEMPLE WORSHIP CENTRE - Request Validation Middleware
 * Processes express-validator results and returns clean error responses
 */

const { body, param, query } = require('express-validator');

/**
 * Validate request results and send 400 response with clean errors
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware
 */
const validate = (req, res, next) => {
  const errors = {};

  // Collect all validation errors
  Object.values(req.body).forEach(field => {
    if (field instanceof Error) {
      errors[field.field] = field.msg;
    }
  });

  // Handle express-validator errors
  const validationErrors = req.validationErrors();

  if (validationErrors) {
    validationErrors.forEach(error => {
      // Use the param/body name as the key
      const key = error.path;
      const msg = error.msg;
      
      if (!errors[key]) {
        errors[key] = msg;
      }
    });
  }

  // If there are validation errors, return 400
  if (Object.keys(errors).length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors
    });
  }

  next();
};

/**
 * Run express-validator checks and attach results to req
 * @param {Array} checks - Array of express-validator check functions
 * @returns {Function} - Express middleware
 */
const runValidation = (checks) => {
  return async (req, res, next) => {
    // Run all validation checks
    await Promise.all(checks.map(check => check.run(req)));
    
    // Process and attach validation result
    req.validationErrors = () => {
      const errors = [];
      Object.values(req.body).forEach(field => {
        if (field instanceof Error) {
          errors.push({
            path: field.field,
            msg: field.msg
          });
        }
      });
      
      // Also check express-validator errors
      if (req.errors) {
        req.errors.forEach(err => {
          errors.push({
            path: err.path,
            msg: err.msg
          });
        });
      }
      
      return errors;
    };
    
    next();
  };
};

module.exports = { validate, runValidation };