/**
 * =============================================================================
 * models/eventModel.js — SQL query functions for the events table.
 * All queries use parameterized placeholders (?) — never string concatenation.
 *
 * create/update accept snake_case keys matching the DB columns and the
 * route-validated body fields (event_date, event_time).
 * =============================================================================
 */
const pool = require('../config/db');
const { likePattern } = require('../utils/search');

async function findAll({ category, upcoming } = {}) {
  const where = [];
  const params = [];

  if (category) { where.push('category = ?'); params.push(category); }
  if (typeof upcoming === 'boolean') {
    if (upcoming) {
      where.push('event_date >= CURDATE()');
    } else {
      where.push('event_date < CURDATE()');
    }
  }

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const orderSql = (typeof upcoming === 'boolean' && !upcoming)
    ? 'ORDER BY event_date DESC, id DESC' // past: most recent first
    : 'ORDER BY event_date ASC, id ASC';   // upcoming/unspecified: soonest first

  const [rows] = await pool.query(
    `SELECT id, title, description, event_date, event_time, location, category, created_at
     FROM events ${whereSql} ${orderSql}`,
    params
  );
  return rows;
}

/** WHERE, its values and ORDER BY for the admin list. `when` is 'upcoming', 'past' or 'all'; `q` searches the title. */
function adminListClauses(when, q) {
  const conditions = [];
  const params = [];
  if (when === 'upcoming') conditions.push('event_date >= CURDATE()');
  if (when === 'past') conditions.push('event_date < CURDATE()');
  if (q) { conditions.push('title LIKE ?'); params.push(likePattern(q)); }
  return {
    where: conditions.length ? `WHERE ${conditions.join(' AND ')}` : '',
    params,
    order: when === 'upcoming' ? 'ORDER BY event_date ASC, id ASC' : 'ORDER BY event_date DESC, id DESC',
  };
}

async function countForAdmin({ when, q } = {}) {
  const { where, params } = adminListClauses(when, q);
  const [rows] = await pool.query(`SELECT COUNT(*) AS total FROM events ${where}`, params);
  return rows[0].total;
}

async function findForAdmin({ when, q, limit, offset } = {}) {
  const { where, params, order } = adminListClauses(when, q);
  const [rows] = await pool.query(
    `SELECT id, title, description, event_date, event_time, location, category, created_at
     FROM events ${where} ${order}
     LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );
  return rows;
}

async function findById(id) {
  const [rows] = await pool.query(
    'SELECT id, title, description, event_date, event_time, location, category, created_at FROM events WHERE id = ? LIMIT 1',
    [id]
  );
  return rows[0] || null;
}

async function create({ title, description, event_date, event_time, location, category }) {
  const [result] = await pool.query(
    `INSERT INTO events (title, description, event_date, event_time, location, category)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [title, description || null, event_date, event_time || null, location || null, category]
  );
  return findById(result.insertId);
}

async function update(id, { title, description, event_date, event_time, location, category }) {
  await pool.query(
    `UPDATE events
     SET title = ?, description = ?, event_date = ?, event_time = ?, location = ?, category = ?
     WHERE id = ?`,
    [title, description || null, event_date, event_time || null, location || null, category, id]
  );
  return findById(id);
}

async function remove(id) {
  const [result] = await pool.query('DELETE FROM events WHERE id = ?', [id]);
  return result.affectedRows > 0;
}

module.exports = { findAll, countForAdmin, findForAdmin, findById, create, update, remove };
