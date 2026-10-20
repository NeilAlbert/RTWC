const pool = require('../config/db');

async function findAll({ includeUnpublished = false, search, limit, offset } = {}) {
  const where = [];
  const params = [];
  if (!includeUnpublished) {
    where.push('published = 1', '(published_at IS NULL OR published_at <= UTC_TIMESTAMP())', '(expires_at IS NULL OR expires_at > UTC_TIMESTAMP())');
  }
  if (search) {
    where.push('(title LIKE ? OR content LIKE ?)');
    params.push(`%${search}%`, `%${search}%`);
  }
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const pageSql = limit === undefined ? '' : 'LIMIT ? OFFSET ?';
  if (limit !== undefined) params.push(limit, offset || 0);
  const [rows] = await pool.query(
    `SELECT id, title, content, image_url, priority, published, featured, published_at, expires_at, created_at, updated_at
     FROM announcements ${whereSql}
     ORDER BY featured DESC, FIELD(priority, 'urgent', 'important', 'normal'), created_at DESC
     ${pageSql}`,
    params
  );
  return rows;
}

async function countAll({ includeUnpublished = false, search } = {}) {
  const where = [];
  const params = [];
  if (!includeUnpublished) {
    where.push('published = 1', '(published_at IS NULL OR published_at <= UTC_TIMESTAMP())', '(expires_at IS NULL OR expires_at > UTC_TIMESTAMP())');
  }
  if (search) {
    where.push('(title LIKE ? OR content LIKE ?)');
    params.push(`%${search}%`, `%${search}%`);
  }
  const [rows] = await pool.query(
    `SELECT COUNT(*) AS total FROM announcements ${where.length ? `WHERE ${where.join(' AND ')}` : ''}`,
    params
  );
  return rows[0].total;
}

async function findById(id) {
  const [rows] = await pool.query(
    'SELECT id, title, content, image_url, priority, published, featured, published_at, expires_at, created_at, updated_at FROM announcements WHERE id = ? LIMIT 1',
    [id]
  );
  return rows[0] || null;
}

async function create({ title, content, image_url, priority, published, featured, expires_at }) {
  const [result] = await pool.query(
    `INSERT INTO announcements (title, content, image_url, priority, published, featured, published_at, expires_at)
     VALUES (?, ?, ?, ?, ?, ?, IF(? = 1, UTC_TIMESTAMP(), NULL), ?)`,
    [title, content, image_url || null, priority || 'normal', published ? 1 : 0, featured ? 1 : 0, published ? 1 : 0, expires_at || null]
  );
  return findById(result.insertId);
}

async function update(id, { title, content, image_url, priority, published, featured, expires_at }) {
  await pool.query(
    `UPDATE announcements
     SET title = ?, content = ?, image_url = ?, priority = ?, published = ?, featured = ?,
         published_at = CASE WHEN ? = 1 THEN COALESCE(published_at, UTC_TIMESTAMP()) ELSE NULL END,
         expires_at = ?
     WHERE id = ?`,
    [title, content, image_url || null, priority || 'normal', published ? 1 : 0, featured ? 1 : 0, published ? 1 : 0, expires_at || null, id]
  );
  return findById(id);
}

async function remove(id) {
  const [result] = await pool.query('DELETE FROM announcements WHERE id = ?', [id]);
  return result.affectedRows > 0;
}

module.exports = { findAll, countAll, findById, create, update, remove };