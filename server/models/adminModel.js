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
    'SELECT id, name, email, password_hash, role, is_active, created_at FROM admins WHERE email = ? LIMIT 1',
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
  const sessionTokenHash = require('crypto').createHash('sha256').update(sessionId).digest('hex');
  const expiresAtUtc = expiresAt.toISOString().slice(0, 19).replace('T', ' ');
  await pool.query(
    'INSERT INTO admin_sessions (admin_id, session_token_hash, expires_at) VALUES (?, ?, ?)',
    [adminId, sessionTokenHash, expiresAtUtc]
  );
}

async function findActiveSession(sessionId, adminId) {
  const sessionTokenHash = require('crypto').createHash('sha256').update(sessionId).digest('hex');
  const [rows] = await pool.query(
    `SELECT admins.id, admins.name, admins.email, admins.role
     FROM admin_sessions
     INNER JOIN admins ON admins.id = admin_sessions.admin_id
     WHERE admin_sessions.session_token_hash = ? AND admin_sessions.admin_id = ?
       AND admin_sessions.expires_at > UTC_TIMESTAMP() AND admins.is_active = 1
     LIMIT 1`,
    [sessionTokenHash, adminId]
  );
  return rows[0] || null;
}

async function revokeSession(sessionId, adminId) {
  const sessionTokenHash = require('crypto').createHash('sha256').update(sessionId).digest('hex');
  await pool.query(
    'DELETE FROM admin_sessions WHERE session_token_hash = ? AND admin_id = ?',
    [sessionTokenHash, adminId]
  );
}

module.exports = { findByEmail, findById, createSession, findActiveSession, revokeSession };
