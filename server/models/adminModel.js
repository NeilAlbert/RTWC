/**
 * =============================================================================
 * models/adminModel.js — SQL query functions for the admins table.
 *
 * ALL queries use parameterized placeholders (?) — never string concatenation
 * — to prevent SQL injection.
 * =============================================================================
 */
const pool = require('../config/db');

/**
 * Find an admin by email. Includes password_hash — ONLY for use inside the
 * auth controller (login comparison). Never return this to a client.
 * @param {string} email
 */
async function findByEmail(email) {
  const [rows] = await pool.query(
    'SELECT id, name, email, password_hash, created_at FROM admins WHERE email = ? LIMIT 1',
    [email]
  );
  return rows[0] || null;
}

/**
 * Get a public admin profile (no password hash). Used for token identity.
 * @param {number} id
 */
async function findById(id) {
  const [rows] = await pool.query(
    'SELECT id, name, email, created_at FROM admins WHERE id = ? LIMIT 1',
    [id]
  );
  return rows[0] || null;
}

module.exports = { findByEmail, findById };
