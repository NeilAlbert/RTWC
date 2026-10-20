/**
 * ROYAL TEMPLE WORSHIP CENTRE - Admin Model
 * Database operations for admin account management
 */

const pool = require('../config/db');

/**
 * Find admin by email
 * @param {string} email - admin email
 * @returns {Promise<Object|null>}
 */
const findByEmail = async (email) => {
  const [rows] = await pool.query(
    'SELECT id, name, email, password_hash, created_at FROM admins WHERE email = ?',
    [email]
  );

  return rows.length > 0 ? rows[0] : null;
};

/**
 * Create new admin (used by seed script)
 * @param {string} name - admin name
 * @param {string} email - admin email  
 * @param {string} passwordHash - bcrypt-hashed password
 * @returns {Promise<Object>}
 */
const create = async (name, email, passwordHash) => {
  const [result] = await pool.query(
    'INSERT INTO admins (name, email, password_hash) VALUES (?, ?, ?)',
    [name, email, passwordHash]
  );

  return { id: result.insertId, name, email };
};

/**
 * Get all admins (limited - for seed script only)
 * @returns {Promise<Array>}
 */
const findAll = async () => {
  const [rows] = await pool.query(
    'SELECT id, name, email, created_at FROM admins'
  );
  return rows;
};

module.exports = { findByEmail, create, findAll };