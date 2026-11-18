/**
 * =============================================================================
 * models/contactMessageModel.js — SQL query functions for contact_messages.
 * All queries use parameterized placeholders (?) — never string concatenation.
 * =============================================================================
 */
const pool = require('../config/db');
const { likePattern } = require('../utils/search');

async function create({ name, email, message }) {
  const [result] = await pool.query(
    'INSERT INTO contact_messages (name, email, message) VALUES (?, ?, ?)',
    [name, email, message]
  );
  return findById(result.insertId);
}

/** ?status= picks one status. ?q= searches the name, the email and the message. */
function listFilter({ status, q } = {}) {
  const conditions = [];
  const params = [];
  if (status) {
    conditions.push('status = ?');
    params.push(status);
  }
  if (q) {
    const pattern = likePattern(q);
    conditions.push('(name LIKE ? OR email LIKE ? OR message LIKE ?)');
    params.push(pattern, pattern, pattern);
  }
  return { where: conditions.length ? `WHERE ${conditions.join(' AND ')}` : '', params };
}

async function countAll(filter = {}) {
  const { where, params } = listFilter(filter);
  const [rows] = await pool.query(`SELECT COUNT(*) AS total FROM contact_messages ${where}`, params);
  return rows[0].total;
}

async function findAll({ status, q, limit, offset } = {}) {
  const { where, params } = listFilter({ status, q });
  const [rows] = await pool.query(
    `SELECT id, name, email, message, status, created_at
     FROM contact_messages ${where}
     ORDER BY created_at DESC, id DESC
     LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );
  return rows;
}

async function findById(id) {
  const [rows] = await pool.query(
    'SELECT id, name, email, message, status, created_at FROM contact_messages WHERE id = ? LIMIT 1',
    [id]
  );
  return rows[0] || null;
}

async function updateStatus(id, status) {
  await pool.query('UPDATE contact_messages SET status = ? WHERE id = ?', [status, id]);
  return findById(id);
}

async function remove(id) {
  const [result] = await pool.query('DELETE FROM contact_messages WHERE id = ?', [id]);
  return result.affectedRows > 0;
}

module.exports = { create, countAll, findAll, findById, updateStatus, remove };
