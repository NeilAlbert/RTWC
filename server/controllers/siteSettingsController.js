/**
 * =============================================================================
 * controllers/siteSettingsController.js: the site-wide text and links that are
 * kept in the site_settings table.
 *
 * GET /api/settings: public. Every key and value as one object, cached for 60
 *   seconds, except the backup_* keys. The public pages fill themselves in from it.
 * GET /api/admin/settings: admin. The same values, never cached, plus the
 *   length limit of each key, so the form can say how much fits.
 * PUT /api/settings: admin. Changes only the keys sent. A key that is not in
 *   SETTINGS below (checked in routes/siteSettings.js), or that has no row in
 *   the table, is refused, and nothing is saved. The public cache is cleared after a save, so the site shows the
 *   change on its next page load.
 * =============================================================================
 */
const SiteSetting = require('../models/siteSettingModel');
const cache = require('../utils/cache');
const { isHttpUrl, isCalendarDate } = require('../utils/validators');

const CACHE_KEY = 'settings:public';
const CACHE_TTL = 60; // seconds; cleared at once when an admin saves settings

const PHONE = /^[0-9+()\-.\s]*$/;
const EMAIL = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/;

/** A link the announcement bar may use: http(s), or a page on this site such as /events.html. */
function isSiteLink(value) {
  // Spaces, quotes and angle brackets are refused even where a URL would allow them.
  if (/[\s<>"'`]/.test(value)) return false;
  return isHttpUrl(value) || /^\/(?!\/)/.test(value);
}

/**
 * Every key the admin may change. max is the longest value allowed. check, when
 * present, returns true for an acceptable non-empty value, and message says what
 * is wrong. An empty value is always allowed, and clears the setting.
 */
const SETTINGS = {
  church_address: { max: 500 },
  phone_number: { max: 50, check: (v) => PHONE.test(v), message: 'Use only numbers, spaces and + ( ) - in the phone number.' },
  helpline_number: { max: 50, check: (v) => PHONE.test(v), message: 'Use only numbers, spaces and + ( ) - in the helpline number.' },
  email: { max: 254, check: (v) => EMAIL.test(v), message: 'Enter an email address such as office@example.org.' },
  service_times: { max: 2000 },
  welcome_message: { max: 2000 },
  mission_statement: { max: 2000 },
  vision_statement: { max: 2000 },
  youtube_channel_url: { max: 500, check: isHttpUrl, message: 'The link must start with http:// or https://.' },
  youtube_live_video_id: {
    max: 11, check: (v) => /^[A-Za-z0-9_-]{11}$/.test(v), message: 'A YouTube video ID is exactly 11 letters, numbers, - or _.',
  },
  facebook_live_url: { max: 500, check: isHttpUrl, message: 'The link must start with http:// or https://.' },
  preferred_default_platform: {
    max: 20, check: (v) => ['youtube', 'facebook'].includes(v), message: 'Choose YouTube or Facebook.',
  },
  live_status_override: { max: 20, check: (v) => ['live', 'offline'].includes(v), message: 'Choose one of the live status options.' },
  next_service_title: { max: 150 },
  next_service_date: { max: 10, check: isCalendarDate, message: 'Enter a valid date.' },
  next_service_time: { max: 50 },
  previous_broadcast_url: { max: 500, check: isHttpUrl, message: 'The link must start with http:// or https://.' },
  announcement_enabled: { max: 1, check: (v) => v === '0' || v === '1', message: 'The announcement is either on or off.' },
  announcement_text: { max: 200 },
  announcement_link: {
    max: 500, check: isSiteLink, message: 'The link must start with https://, http://, or / for a page on this site.',
  },
  // The verse on the home page. The band shows only when both are filled in and
  // neither is still the "[ADD: ...]" placeholder from migration 005.
  featured_verse_text: { max: 600 },
  featured_verse_ref: { max: 100 },
};

/**
 * The keys sent that have no row in the table. routes/siteSettings.js has already
 * checked each value, and that every key is in SETTINGS. A key is still refused
 * here when the database is missing its row, for example before a migration.
 */
function missingRows(body, existingKeys) {
  return Object.keys(body)
    .filter((key) => !existingKeys.has(key))
    .map((key) => ({ field: key, message: 'This setting is not in the database yet. Run the database migrations, then try again.' }));
}

/** Reduce DB rows into a plain { key: value } object. */
async function getSettingsObject() {
  const rows = await SiteSetting.findAll();
  const settings = {};
  rows.forEach((row) => { settings[row.setting_key] = row.setting_value; });
  return settings;
}

/** The settings visitors may see: everything except the backup settings, which only the admin uses. */
async function getPublicSettingsObject() {
  const settings = await getSettingsObject();
  Object.keys(settings).forEach((key) => {
    if (key.startsWith('backup_')) delete settings[key];
  });
  return settings;
}

/** The public settings through the cache. Also used for the home page's Church details (utils/seo.js). */
function getPublicSettings() {
  return cache.wrap(CACHE_KEY, CACHE_TTL, getPublicSettingsObject);
}

/** GET /api/settings: public */
async function getSettings(req, res, next) {
  try {
    const data = await getPublicSettings();
    return res.json({ success: true, message: 'Settings fetched successfully.', data });
  } catch (err) {
    return next(err);
  }
}

/** The length limit of each key the admin may change, for the form. */
function limits() {
  const result = {};
  Object.entries(SETTINGS).forEach(([key, rule]) => { result[key] = rule.max; });
  return result;
}

/** { values, limits } for the keys the admin may change that exist in the table. */
async function adminData() {
  const all = await getSettingsObject();
  const values = {};
  Object.keys(SETTINGS).forEach((key) => {
    if (Object.prototype.hasOwnProperty.call(all, key)) values[key] = all[key] === null ? '' : all[key];
  });
  return { values, limits: limits() };
}

/** GET /api/admin/settings: { values, limits }. Only the keys the admin may change. */
async function getAdminSettings(req, res, next) {
  try {
    return res.json({ success: true, message: 'Settings fetched successfully.', data: await adminData() });
  } catch (err) {
    return next(err);
  }
}

/** PUT /api/settings: admin only. The keys sent, and only those, are saved. */
async function updateSettings(req, res, next) {
  try {
    const rows = await SiteSetting.findAll();
    const existingKeys = new Set(rows.map((row) => row.setting_key));
    const problems = missingRows(req.body, existingKeys);
    if (problems.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Some fields need attention. Nothing was saved.',
        data: { errors: problems },
      });
    }

    await SiteSetting.updateMany(req.body);
    await cache.invalidate('settings:');

    return res.json({ success: true, message: 'Settings saved.', data: await adminData() });
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  SETTINGS, getSettings, getPublicSettings, getAdminSettings, updateSettings,
};
