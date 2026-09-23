/**
 * =============================================================================
 * controllers/siteSettingsController.js — site-wide settings business logic.
 *
 * GET /api/settings — public: returns every key/value pair as a single JSON
 * object so the public site's pages can fetch it instead of hardcoding text.
 * PUT /api/settings — admin only: accepts a partial object and updates only
 * the provided keys.
 * =============================================================================
 */
const SiteSetting = require('../models/siteSettingModel');
const { ValidationError } = require('../utils/errors');

const ALLOWED_KEYS = [
  'welcome_message',
  'service_times',
  'church_address',
  'phone_number',
  'helpline_number',
  'email',
  'mission_statement',
  'vision_statement',
  'hero_tagline',
];

/** Reduce DB rows into a plain { key: value } object. */
async function getSettingsObject() {
  const rows = await SiteSetting.findAll();
  const settings = {};
  rows.forEach((row) => { settings[row.setting_key] = row.setting_value; });
  return settings;
}

/** GET /api/settings — public */
async function getSettings(req, res, next) {
  try {
    const data = await getSettingsObject();
    return res.json({ success: true, message: 'Settings fetched successfully.', data });
  } catch (err) {
    return next(err);
  }
}

/** PUT /api/settings — admin only, partial key/value update */
async function updateSettings(req, res, next) {
  try {
    const body = req.body || {};

    if (typeof body !== 'object' || Array.isArray(body)) {
      return next(new ValidationError('Request body must be an object of key/value pairs.'));
    }

    const pairs = {};
    Object.keys(body).forEach((key) => {
      if (!ALLOWED_KEYS.includes(key)) {
        // Reject unknown keys rather than silently ignoring them.
        throw new ValidationError(`Unknown setting key: "${key}".`);
      }
      if (typeof body[key] !== 'string') {
        throw new ValidationError(`Value for "${key}" must be a string.`);
      }
      pairs[key] = body[key];
    });

    if (Object.keys(pairs).length === 0) {
      return next(new ValidationError('No settings provided to update.'));
    }

    await SiteSetting.upsertMany(pairs);

    const data = await getSettingsObject();
    return res.json({ success: true, message: 'Settings updated successfully.', data });
  } catch (err) {
    return next(err);
  }
}

module.exports = { getSettings, updateSettings };
