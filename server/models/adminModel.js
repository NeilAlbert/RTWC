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

async function createSession(sessionId, adminId, expiresAt) {
  const expiresAtUtc = expiresAt.toISOString().slice(0, 19).replace('T', ' ');
  await pool.query(
    'INSERT INTO admin_sessions (session_id, admin_id, expires_at) VALUES (?, ?, ?)',
    [sessionId, adminId, expiresAtUtc]
  );
}

async function hasActiveSession(sessionId, adminId) {
  const [rows] = await pool.query(
    'SELECT session_id FROM admin_sessions WHERE session_id = ? AND admin_id = ? AND revoked_at IS NULL AND expires_at > UTC_TIMESTAMP() LIMIT 1',
    [sessionId, adminId]
  );
  return rows.length > 0;
}

async function revokeSession(sessionId, adminId) {
  await pool.query(
    'UPDATE admin_sessions SET revoked_at = UTC_TIMESTAMP() WHERE session_id = ? AND admin_id = ? AND revoked_at IS NULL',
    [sessionId, adminId]
  );
}

module.exports = { findByEmail, findById, createSession, hasActiveSession, revokeSession };
