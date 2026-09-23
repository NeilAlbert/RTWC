/**
 * =============================================================================
 * models/prayerRequestModel.js — SQL query functions for prayer_requests.
 * All queries use parameterized placeholders (?) — never string concatenation.
 *
 * create accepts snake_case keys matching the DB columns and the
 * route-validated body fields (request_text, is_private).
 * =============================================================================
 */
const pool = require('../config/db');

async function create({ name, request_text, is_private }) {
  const [result] = await pool.query(
    'INSERT INTO prayer_requests (name, request_text, is_private) VALUES (?, ?, ?)',
    [name, request_text, is_private ? 1 : 0]
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
  const [rows] = await pool.query(`SELECT COUNT(*) AS total FROM prayer_requests ${whereSql}`, params);
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
    `SELECT id, name, request_text, is_private, status, created_at
     FROM prayer_requests ${whereSql}
     ORDER BY created_at DESC, id DESC
     LIMIT ? OFFSET ?`,
    params
  );
  return rows;
}

async function findById(id) {
  const [rows] = await pool.query(
    'SELECT id, name, request_text, is_private, status, created_at FROM prayer_requests WHERE id = ? LIMIT 1',
    [id]
  );
  return rows[0] || null;
}

async function updateStatus(id, status) {
  await pool.query('UPDATE prayer_requests SET status = ? WHERE id = ?', [status, id]);
  return findById(id);
}

module.exports = { create, countAll, findAll, findById, updateStatus };
