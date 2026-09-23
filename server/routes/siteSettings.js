/**
 * =============================================================================
 * routes/siteSettings.js — site-wide settings endpoints.
 * =============================================================================
 */
const express = require('express');

const authMiddleware = require('../middleware/authMiddleware');
const validateRequest = require('../middleware/validateRequest');
const { sanitizeBody } = require('../middleware/sanitizeInput');
const { getSettings, updateSettings } = require('../controllers/siteSettingsController');

const router = express.Router();

/**
 * GET /api/settings — public.
 * Returns all key/value pairs as a single JSON object. The public site's
 * pages fetch this on load instead of hardcoding site text.
 */
router.get('/', getSettings);

/**
 * PUT /api/settings — admin only.
 * Accepts a partial object of key/value pairs and updates only those keys.
 */
router.put(
  '/',
  authMiddleware,
  sanitizeBody([
    'welcome_message',
    'service_times',
    'church_address',
    'phone_number',
    'helpline_number',
    'email',
    'mission_statement',
    'vision_statement',
    'hero_tagline',
  ], { maxLength: 10000 }),
  validateRequest,
  updateSettings
);

module.exports = router;
