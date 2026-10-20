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

async function findAll({ category, upcoming, search, published } = {}) {
  const where = [];
  const params = [];

  if (category) { where.push('category = ?'); params.push(category); }
  if (search) { where.push('(title LIKE ? OR description LIKE ?)'); params.push(`%${search}%`, `%${search}%`); }
  if (published !== undefined) { where.push('published = ?'); params.push(published ? 1 : 0); }
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
    `SELECT id, title, description, event_date, event_time, start_time, end_time, location, image_url, registration_url, category, published, featured, created_at
     FROM events ${whereSql} ${orderSql}`,
    params
  );
  return rows;
}

async function findById(id) {
  const [rows] = await pool.query(
    'SELECT id, title, description, event_date, event_time, start_time, end_time, location, image_url, registration_url, category, published, featured, created_at FROM events WHERE id = ? LIMIT 1',
    [id]
  );
  return rows[0] || null;
}

async function create({ title, description, event_date, event_time, start_time, end_time, location, image_url, registration_url, category, published, featured }) {
  const [result] = await pool.query(
    `INSERT INTO events (title, description, event_date, event_time, start_time, end_time, location, image_url, registration_url, category, published, featured)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [title, description, event_date, event_time || start_time || null, start_time || event_time || null, end_time || null, location || null, image_url || null, registration_url || null, category, published ? 1 : 0, featured ? 1 : 0]
  );
  return findById(result.insertId);
}

async function update(id, { title, description, event_date, event_time, start_time, end_time, location, image_url, registration_url, category, published, featured }) {
  await pool.query(
    `UPDATE events
    SET title = ?, description = ?, event_date = ?, event_time = ?, start_time = ?, end_time = ?, location = ?, image_url = ?, registration_url = ?, category = ?, published = ?, featured = ?
     WHERE id = ?`,
      [title, description, event_date, event_time || start_time || null, start_time || event_time || null, end_time || null, location || null, image_url || null, registration_url || null, category, published ? 1 : 0, featured ? 1 : 0, id]
  );
  return findById(id);
}

async function remove(id) {
  const [result] = await pool.query('DELETE FROM events WHERE id = ?', [id]);
  return result.affectedRows > 0;
}

module.exports = { findAll, findById, create, update, remove };
