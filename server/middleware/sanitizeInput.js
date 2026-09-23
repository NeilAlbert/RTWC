/**
 * =============================================================================
 * middleware/sanitizeInput.js — strips/escapes HTML from free-text fields
 * before they are stored or echoed back. Prevents stored XSS in contact
 * messages, prayer requests, admin bios/descriptions, etc.
 *
 * NOTE: The frontend must ALSO escape when rendering (use textContent, never
 * innerHTML with raw user content). Defense in depth.
 * =============================================================================
 */

// Map of HTML entities to their character equivalents, used in reverse for
// escaping. We escape <, >, &, ", and ' to their entity forms.
function escapeHtml(value) {
  if (value === null || value === undefined) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Strip all HTML tags (and dangerous content) from a free-text value.
 * - Removes any <...> tag entirely
 * - Collapses null bytes and control characters
 * - Trims whitespace
 * @param {string|null|undefined} value
 * @param {number} [maxLength] optional truncation
 */
function sanitizeText(value, maxLength) {
  if (value === null || value === undefined) return '';
  let cleaned = String(value)
    .replace(/<[^>]*>/g, '')                  // strip HTML tags
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '') // control chars
    .trim();
  if (typeof maxLength === 'number' && maxLength > 0 && cleaned.length > maxLength) {
    cleaned = cleaned.slice(0, maxLength);
  }
  return cleaned;
}

/**
 * Express middleware factory: sanitizes the listed body fields in place.
 * @param {string[]} fields - body field names to sanitize
 * @param {object} [options] - { maxLength }
 */
function sanitizeBody(fields, options = {}) {
  return function sanitizeMiddleware(req, res, next) {
    if (req.body && typeof req.body === 'object') {
      fields.forEach((field) => {
        if (typeof req.body[field] === 'string') {
          req.body[field] = sanitizeText(req.body[field], options.maxLength);
        }
      });
    }
    return next();
  };
}

module.exports = { escapeHtml, sanitizeText, sanitizeBody };
