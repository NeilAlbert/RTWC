/**
 * ROYAL TEMPLE WORSHIP CENTRE - Input Sanitization Middleware
 * Strips HTML tags from all string fields in request body
 */

const sanitizeHtml = (str) => {
  if (typeof str !== 'string') return str;
  // Remove HTML tags
  return str.replace(/<[^>]*>/g, '');
};

/**
 * Sanitize all string fields in req.body
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware
 */
const sanitize = (req, res, next) => {
  const sanitizeObject = (obj) => {
    if (!obj || typeof obj !== 'object') return obj;
    
    const result = {};
    
    for (const key of Object.keys(obj)) {
      if (typeof obj[key] === 'string') {
        result[key] = sanitizeHtml(obj[key]);
      } else if (Array.isArray(obj[key])) {
        result[key] = obj[key].map(item => sanitizeObject(item));
      } else if (obj[key] && typeof obj[key] === 'object') {
        result[key] = sanitizeObject(obj[key]);
      } else {
        result[key] = obj[key];
      }
    }
    
    return result;
  };
  
  req.body = sanitizeObject(req.body);
  next();
};

/**
 * Sanitize query parameters
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware
 */
const sanitizeQuery = (req, res, next) => {
  req.query = sanitizeObject(req.query);
  next();
};

const sanitizeObject = (obj) => {
  if (!obj || typeof obj !== 'object') return obj;
  
  const result = {};
  
  for (const key of Object.keys(obj)) {
    if (typeof obj[key] === 'string') {
      result[key] = sanitizeHtml(obj[key]);
    } else if (Array.isArray(obj[key])) {
      result[key] = obj[key].map(item => sanitizeObject(item));
    } else if (obj[key] && typeof obj[key] === 'object') {
      result[key] = sanitizeObject(obj[key]);
    } else {
      result[key] = obj[key];
    }
  }
  
  return result;
};

module.exports = { sanitize, sanitizeQuery };