/**
 * =============================================================================
 * routes/siteSettings.js: site-wide settings.
 *
 * GET /api/settings is public: the pages read the church details from it.
 * PUT /api/settings is admin only. The admin reads them with GET /api/admin/settings.
 * =============================================================================
 */
const express = require('express');
const { body } = require('express-validator');

const authMiddleware = require('../middleware/authMiddleware');
const validateRequest = require('../middleware/validateRequest');
const { sanitizeBody } = require('../middleware/sanitizeInput');
const { SETTINGS, getSettings, updateSettings } = require('../controllers/siteSettingsController');

const router = express.Router();

/** GET /api/settings: every key and value as one object. */
router.get('/', getSettings);

/**
 * One rule per key: text, no longer than its limit, and in the right form when
 * it is not empty. An empty value clears the setting.
 */
const settingRules = Object.entries(SETTINGS).map(([key, rule]) => {
  let chain = body(key).optional()
    .isString().withMessage('This value must be text.').bail()
    .isLength({ max: rule.max }).withMessage(`Use ${rule.max} characters or fewer.`);
  if (rule.check) chain = chain.bail().custom((value) => value === '' || rule.check(value)).withMessage(rule.message);
  return chain;
});

/** Any key that is not a setting the admin may change is refused, not ignored. */
const knownKeysOnly = body().custom((value) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Send the settings as an object of keys and values.');
  const unknown = Object.keys(value).filter((key) => !Object.prototype.hasOwnProperty.call(SETTINGS, key));
  if (unknown.length > 0) throw new Error(`These are not settings that can be changed: ${unknown.slice(0, 5).map((key) => String(key).slice(0, 60)).join(', ')}.`);
  if (Object.keys(value).length === 0) throw new Error('There are no changes to save.');
  return true;
});

/**
 * PUT /api/settings: admin only. Body: { key: value, ... } with only the keys
 * that changed. Tags are stripped from every value before it is checked.
 */
router.put(
  '/',
  authMiddleware,
  sanitizeBody(Object.keys(SETTINGS), { maxLength: 10000 }),
  [knownKeysOnly, ...settingRules],
  validateRequest,
  updateSettings
);

module.exports = router;
