/**
 * =============================================================================
 * utils/validators.js: checks shared by the admin write routes.
 * =============================================================================
 */

/** Where POST /api/admin/upload saves images, as the browser addresses them. */
const UPLOAD_URL_PREFIX = '/assets/uploads/';

/** A web address that starts with http:// or https://. */
function isHttpUrl(value) {
  try {
    const url = new URL(String(value));
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

/** An image the site can show: one uploaded through the admin, or an http(s) link. */
function isImageRef(value) {
  const text = String(value);
  if (text.startsWith(UPLOAD_URL_PREFIX)) {
    return /^[a-z0-9]+\.(jpg|png|webp)$/.test(text.slice(UPLOAD_URL_PREFIX.length));
  }
  return isHttpUrl(text);
}

/** A real calendar date written as YYYY-MM-DD. */
function isCalendarDate(value) {
  const text = String(value);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return false;
  const date = new Date(`${text}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === text;
}

module.exports = { UPLOAD_URL_PREFIX, isHttpUrl, isImageRef, isCalendarDate };
