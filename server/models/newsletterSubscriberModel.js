/**
 * =============================================================================
 * models/newsletterSubscriberModel.js — SQL query functions for
 * newsletter_subscribers. All queries use parameterized placeholders (?).
 * =============================================================================
 */
const pool = require('../config/db');
const { likePattern } = require('../utils/search');

async function findByEmail(email) {
  const [rows] = await pool.query(
    'SELECT id, email, subscribed_at FROM newsletter_subscribers WHERE email = ? LIMIT 1',
    [email]
  );
  return rows[0] || null;
}

/**
 * Adds an address. The unique index on email decides whether it is new, so two
 * sign-ups at the same moment cannot both insert. Returns true when a row was
 * added, false when the address was already on the list.
 */
async function subscribe(email) {
  const [result] = await pool.query(
    'INSERT IGNORE INTO newsletter_subscribers (email) VALUES (?)',
    [email]
  );
  return result.affectedRows === 1;
}

const emailPattern = likePattern;

async function countAll({ q } = {}) {
  const [rows] = q
    ? await pool.query('SELECT COUNT(*) AS total FROM newsletter_subscribers WHERE email LIKE ?', [emailPattern(q)])
    : await pool.query('SELECT COUNT(*) AS total FROM newsletter_subscribers');
  return rows[0].total;
}

async function findAll({ q, limit, offset }) {
  const where = q ? 'WHERE email LIKE ?' : '';
  const params = q ? [emailPattern(q), limit, offset] : [limit, offset];
  const [rows] = await pool.query(
    `SELECT id, email, subscribed_at FROM newsletter_subscribers ${where}
     ORDER BY subscribed_at DESC, id DESC
     LIMIT ? OFFSET ?`,
    params
  );
  return rows;
}

async function remove(id) {
  const [result] = await pool.query('DELETE FROM newsletter_subscribers WHERE id = ?', [id]);
  return result.affectedRows > 0;
}

async function removeByEmail(email) {
  const [result] = await pool.query('DELETE FROM newsletter_subscribers WHERE email = ?', [email]);
  return result.affectedRows > 0;
}

module.exports = { findByEmail, subscribe, countAll, findAll, remove, removeByEmail };
