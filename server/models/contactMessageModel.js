/**
 * =============================================================================
 * models/contactMessageModel.js — SQL query functions for contact_messages.
 * All queries use parameterized placeholders (?) — never string concatenation.
 * =============================================================================
 */
const pool = require('../config/db');

async function create({ name, email, message }) {
  const [result] = await pool.query(
    'INSERT INTO contact_messages (name, email, message) VALUES (?, ?, ?)',
    [name, email, message]
  );
  return findById(result.insertId);
}

async function countAll({ status } = {}) {
  const params = [];
  let whereSql = '';
  if (status) {
    whereSql = 'WHERE status = ?';
    params.push(status);
  }
  const [rows] = await pool.query(`SELECT COUNT(*) AS total FROM contact_messages ${whereSql}`, params);
  return rows[0].total;
}

async function findAll({ status, limit, offset } = {}) {
  const params = [];
  let whereSql = '';
  if (status) {
    whereSql = 'WHERE status = ?';
    params.push(status);
  }
  params.push(limit, offset);
  const [rows] = await pool.query(
    `SELECT id, name, email, message, status, created_at
     FROM contact_messages ${whereSql}
     ORDER BY created_at DESC, id DESC
     LIMIT ? OFFSET ?`,
    params
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

module.exports = { create, countAll, findAll, findById, updateStatus };
