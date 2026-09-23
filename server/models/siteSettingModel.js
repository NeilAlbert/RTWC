/**
 * =============================================================================
 * models/siteSettingModel.js — SQL query functions for the site_settings table.
 * All queries use parameterized placeholders (?) — never string concatenation.
 * =============================================================================
 */
const pool = require('../config/db');

/** Fetch all settings as an array of { setting_key, setting_value }. */
async function findAll() {
  const [rows] = await pool.query(
    'SELECT setting_key, setting_value FROM site_settings ORDER BY setting_key ASC'
  );
  return rows;
}

/** Fetch a single setting value by key. */
async function findByKey(settingKey) {
  const [rows] = await pool.query(
    'SELECT setting_key, setting_value FROM site_settings WHERE setting_key = ? LIMIT 1',
    [settingKey]
  );
  return rows[0] || null;
}

/**
 * Insert or update a batch of settings (partial updates).
 * @param {Object<string,string>} pairs - e.g. { welcome_message: "...", email: "..." }
 */
async function upsertMany(pairs) {
  for (const [key, value] of Object.entries(pairs)) {
    // Row-alias upsert syntax avoids VALUES(), which is deprecated in MySQL 8.0.20+.
    await pool.query(
      `INSERT INTO site_settings (setting_key, setting_value)
       VALUES (?, ?) AS new
       ON DUPLICATE KEY UPDATE setting_value = new.setting_value`,
      [key, value]
    );
  }
}

module.exports = { findAll, findByKey, upsertMany };
