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

async function countAll() {
  const [rows] = await pool.query('SELECT COUNT(*) AS total FROM newsletter_subscribers');
  return rows[0].total;
}

async function findAll({ limit, offset }) {
  const [rows] = await pool.query(
    `SELECT id, email, subscribed_at FROM newsletter_subscribers
     ORDER BY subscribed_at DESC, id DESC
     LIMIT ? OFFSET ?`,
    [limit, offset]
  );
  return rows;
}

async function removeByEmail(email) {
  const [result] = await pool.query('DELETE FROM newsletter_subscribers WHERE email = ?', [email]);
  return result.affectedRows > 0;
}

module.exports = { findByEmail, create, countAll, findAll, removeByEmail };
