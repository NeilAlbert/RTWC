/**
 * =============================================================================
 * models/newsletterSubscriberModel.js — SQL query functions for
 * newsletter_subscribers. All queries use parameterized placeholders (?).
 * =============================================================================
 */
const pool = require('../config/db');

async function findByEmail(email) {
  const [rows] = await pool.query(
    'SELECT id, email, subscribed_at FROM newsletter_subscribers WHERE email = ? LIMIT 1',
    [email]
  );
  return rows[0] || null;
}

async function create(email) {
  const [result] = await pool.query(
    'INSERT INTO newsletter_subscribers (email) VALUES (?)',
    [email]
  );
  return findByEmail(email);
}

/** Turns a search phrase into a LIKE pattern. % and _ in the phrase match themselves. */
function emailPattern(q) {
  return `%${String(q).replace(/[\\%_]/g, (char) => `\\${char}`)}%`;
}

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

module.exports = { findByEmail, create, countAll, findAll, remove, removeByEmail };
