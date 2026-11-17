/**
 * =============================================================================
 * utils/validators.js: checks shared by the admin write routes.
 * =============================================================================
 */

/** Where POST /api/admin/upload saves images, as the browser addresses them. */
const UPLOAD_URL_PREFIX = '/assets/uploads/';

/** The name the upload route gives a saved image: 32 hex characters and its type. */
const UPLOAD_NAME_PATTERN = /^[a-f0-9]{32}\.(jpg|png|webp)$/;

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
    return UPLOAD_NAME_PATTERN.test(text.slice(UPLOAD_URL_PREFIX.length));
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

const EVENT_CATEGORIES = ['convention', 'revival', 'camp_meeting', 'anniversary', 'other'];
const LEADER_ROLES = ['pastor', 'pastors_wife', 'presiding_elder', 'secretary', 'elder', 'deacon', 'deaconess', 'ministry_leader'];

module.exports = {
  UPLOAD_URL_PREFIX, UPLOAD_NAME_PATTERN, EVENT_CATEGORIES, LEADER_ROLES, isHttpUrl, isImageRef, isCalendarDate,
};
