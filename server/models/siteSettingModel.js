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
 * Change the value of settings that already exist, all or none: if one update
 * fails, none of them is kept. A key with no row is not created.
 * @param {Object<string,string>} pairs - e.g. { welcome_message: "...", email: "..." }
 */
async function updateMany(pairs) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    for (const [key, value] of Object.entries(pairs)) {
      await connection.query('UPDATE site_settings SET setting_value = ? WHERE setting_key = ?', [value, key]);
    }
    await connection.commit();
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
}

module.exports = { findAll, findByKey, updateMany };
