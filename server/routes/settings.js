/**
 * ROYAL TEMPLE WORSHIP CENTRE - Settings Routes
 * GET /api/settings - returns all site_settings as one key/value object
 */

const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const cache = require('../utils/cache');

/**
 * @route   GET /api/settings
 * @desc    Get all site settings as a key/value object
 * @access  Public
 * 
 * Cached for 60 seconds - the cache key is 'settings'
 */
router.get('/', async (req, res) => {
  try {
    // Try cache first
    const cached = cache.get('settings');
    if (cached) {
      return res.json({
        success: true,
        data: cached
      });
    }

    // Fetch from database
    const [rows] = await pool.query(
      'SELECT setting_key, setting_value FROM site_settings'
    );

    // Transform to key/value object
    const settings = {};
    rows.forEach(row => {
      settings[row.setting_key] = row.setting_value;
    });

    // Cache for 60 seconds (60 * 1000 ms)
    cache.set('settings', settings, 60);

    return res.json({
      success: true,
      data: settings
    });

  } catch (error) {
    console.error('Settings error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch settings'
    });
  }
});

module.exports = router;