/**
 * =============================================================================
 * models/sermonModel.js — SQL query functions for the sermons table.
 * All queries use parameterized placeholders (?) — never string concatenation.
 *
 * create/update accept snake_case keys matching the DB columns and the
 * route-validated body fields (sermon_date, video_url, thumbnail_url).
 * =============================================================================
 */
const pool = require('../config/db');

async function countAll({ speaker, date } = {}) {
  const where = [];
  const params = [];

  if (speaker) { where.push('speaker = ?'); params.push(speaker); }
  if (date) { where.push('sermon_date = ?'); params.push(date); }

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const [rows] = await pool.query(`SELECT COUNT(*) AS total FROM sermons ${whereSql}`, params);
  return rows[0].total;
}

async function findAll({ speaker, date, limit, offset } = {}) {
  const where = [];
  const params = [];

  if (speaker) { where.push('speaker = ?'); params.push(speaker); }
  if (date) { where.push('sermon_date = ?'); params.push(date); }

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  params.push(limit, offset);

  const [rows] = await pool.query(
    `SELECT id, title, speaker, description, video_url, thumbnail_url, sermon_date, created_at
     FROM sermons ${whereSql}
     ORDER BY sermon_date DESC, id DESC
     LIMIT ? OFFSET ?`,
    params
  );
  return rows;
}

async function findById(id) {
  const [rows] = await pool.query(
    'SELECT id, title, speaker, description, video_url, thumbnail_url, sermon_date, created_at FROM sermons WHERE id = ? LIMIT 1',
    [id]
  );
  return rows[0] || null;
}

async function create({ title, speaker, description, video_url, thumbnail_url, sermon_date }) {
  const [result] = await pool.query(
    `INSERT INTO sermons (title, speaker, description, video_url, thumbnail_url, sermon_date)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [title, speaker, description, video_url || null, thumbnail_url || null, sermon_date]
  );
  return findById(result.insertId);
}

async function update(id, { title, speaker, description, video_url, thumbnail_url, sermon_date }) {
  await pool.query(
    `UPDATE sermons
     SET title = ?, speaker = ?, description = ?, video_url = ?, thumbnail_url = ?, sermon_date = ?
     WHERE id = ?`,
    [title, speaker, description, video_url || null, thumbnail_url || null, sermon_date, id]
  );
  return findById(id);
}

async function remove(id) {
  const [result] = await pool.query('DELETE FROM sermons WHERE id = ?', [id]);
  return result.affectedRows > 0;
}

module.exports = { countAll, findAll, findById, create, update, remove };
