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
const { likePattern } = require('../utils/search');

async function create({ name, request_text, is_private }) {
  const [result] = await pool.query(
    'INSERT INTO prayer_requests (name, request_text, is_private) VALUES (?, ?, ?)',
    [name, request_text, is_private ? 1 : 0]
  );
  return findById(result.insertId);
}

/**
 * ?status= picks one status. ?q= searches the name and the text of requests that
 * may be shared. A private request is never matched by a search, so a search
 * cannot be used to learn what one says or who sent it.
 */
function listFilter({ status, q } = {}) {
  const conditions = [];
  const params = [];
  if (status) {
    conditions.push('status = ?');
    params.push(status);
  }
  if (q) {
    const pattern = likePattern(q);
    conditions.push('is_private = 0 AND (name LIKE ? OR request_text LIKE ?)');
    params.push(pattern, pattern);
  }
  return { where: conditions.length ? `WHERE ${conditions.join(' AND ')}` : '', params };
}

async function countAll(filter = {}) {
  const { where, params } = listFilter(filter);
  const [rows] = await pool.query(`SELECT COUNT(*) AS total FROM prayer_requests ${where}`, params);
  return rows[0].total;
}

async function findAll({ status, q, limit, offset } = {}) {
  const { where, params } = listFilter({ status, q });
  const [rows] = await pool.query(
    `SELECT id, name, request_text, is_private, status, created_at
     FROM prayer_requests ${where}
     ORDER BY created_at DESC, id DESC
     LIMIT ? OFFSET ?`,
    [...params, limit, offset]
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

async function remove(id) {
  const [result] = await pool.query('DELETE FROM prayer_requests WHERE id = ?', [id]);
  return result.affectedRows > 0;
}

module.exports = { create, countAll, findAll, findById, updateStatus, remove };
