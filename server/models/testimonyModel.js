const pool = require('../config/db');

/** GET ALL testimonies with optional status filter */
async function findAll({ status, limit = 10, offset = 0 } = {}) {
  const params = [];
  let whereSql = '';
  if (status) {
    whereSql = 'WHERE status = ?';
    params.push(status);
  }
  const [rows] = await pool.query(
    `SELECT id, name, email, message AS testimony, permission_to_publish, status, created_at FROM testimonials ${whereSql} ORDER BY created_at DESC, id DESC LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );
  return rows;
}

/** Public testimony fields only; never expose contact details. */
async function findPublished({ limit = 6 } = {}) {
  const [rows] = await pool.query(
    'SELECT id, name, message AS testimony, created_at FROM testimonials WHERE status = ? AND permission_to_publish = 1 ORDER BY created_at DESC, id DESC LIMIT ?',
    ['published', limit]
  );
  return rows;
}

/** CREATE a new testimony (always starts as 'pending') */
async function create({ name, email, testimony, permission_to_publish }) {
  const [result] = await pool.query(
    'INSERT INTO testimonials (name, email, message, permission_to_publish, status) VALUES (?, ?, ?, ?, ?)',
    [name, email, testimony, permission_to_publish ? 1 : 0, 'pending']
  );
  return findById(result.insertId);
}

/** FIND by ID */
async function findById(id) {
  const [rows] = await pool.query(
    'SELECT id, name, email, message AS testimony, permission_to_publish, status, created_at FROM testimonials WHERE id = ? LIMIT 1',
    [id]
  );
  return rows[0] || null;
}

/** UPDATE testimony status (admin only) */
async function updateStatus(id, status, reviewedBy) {
  const allowed = ['pending', 'approved', 'rejected', 'published', 'archived'];
  if (!allowed.includes(status)) {
    throw new Error('Status must be one of: pending, approved, rejected, published');
  }
  const [result] = await pool.query(
    'UPDATE testimonials SET status = ?, reviewed_by = ?, reviewed_at = UTC_TIMESTAMP(), published_at = CASE WHEN ? = \'published\' THEN UTC_TIMESTAMP() ELSE NULL END WHERE id = ?',
    [status, reviewedBy, status, id]
  );
  return findById(id);
}

/** COUNT all or filtered */
async function countAll({ status } = {}) {
  const params = [];
  let whereSql = '';
  if (status) {
    whereSql = 'WHERE status = ?';
    params.push(status);
  }
  const [rows] = await pool.query(`SELECT COUNT(*) AS total FROM testimonials ${whereSql}`, params);
  return rows[0].total;
}

module.exports = { findAll, findPublished, create, findById, updateStatus, countAll };