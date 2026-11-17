/**
 * models/adminModel.js: queries for the admins table. There is one admin account.
 * Every query uses ? placeholders.
 *
 * password_hash is returned only by the two "WithHash" functions, which the auth
 * controller uses to compare passwords. It is never sent to a browser.
 */
const pool = require('../config/db');

/** For sign-in. The email must already be trimmed and lowercased. */
async function findByEmailWithHash(email) {
  const [rows] = await pool.query(
    'SELECT id, name, email, password_hash, token_valid_after FROM admins WHERE email = ? LIMIT 1',
    [email]
  );
  return rows[0] || null;
}

/** For the password change. */
async function findByIdWithHash(id) {
  const [rows] = await pool.query(
    'SELECT id, name, email, password_hash, token_valid_after FROM admins WHERE id = ? LIMIT 1',
    [id]
  );
  return rows[0] || null;
}

/** The admin without the password hash. Used to check every signed-in request. */
async function findById(id) {
  const [rows] = await pool.query(
    'SELECT id, name, email, token_valid_after FROM admins WHERE id = ? LIMIT 1',
    [id]
  );
  return rows[0] || null;
}

/** Saves a new password hash and retires every token issued up to validAfter (UTC string). */
async function updatePassword(id, passwordHash, validAfter) {
  await pool.query(
    'UPDATE admins SET password_hash = ?, token_valid_after = ? WHERE id = ?',
    [passwordHash, validAfter, id]
  );
}

/** Retires every token issued up to validAfter (UTC string). */
async function setTokenValidAfter(id, validAfter) {
  await pool.query('UPDATE admins SET token_valid_after = ? WHERE id = ?', [validAfter, id]);
}

module.exports = { findByEmailWithHash, findByIdWithHash, findById, updatePassword, setTokenValidAfter };
