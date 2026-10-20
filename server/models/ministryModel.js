/**
 * =============================================================================
 * models/ministryModel.js — SQL query functions for the ministries table.
 * All queries use parameterized placeholders (?) — never string concatenation.
 *
 * create/update accept snake_case keys matching the DB columns and the
 * route-validated body fields (icon_url).
 * =============================================================================
 */
const pool = require('../config/db');

async function findAll({ includeUnpublished = false } = {}) {
  const where = includeUnpublished ? '' : 'WHERE published = 1';
  const [rows] = await pool.query(
    `SELECT id, name, slug, description, image_url, meeting_day, meeting_time, meeting_location, leader_name, contact_phone, contact_email, published, featured, created_at FROM ministries ${where} ORDER BY featured DESC, name ASC`
  );
  return rows;
}

async function findBySlug(slug) {
  const [rows] = await pool.query(
    'SELECT id, name, slug, description, image_url, meeting_day, meeting_time, meeting_location, leader_name, contact_phone, contact_email, published, featured, created_at FROM ministries WHERE slug = ? AND published = 1 LIMIT 1',
    [slug]
  );
  return rows[0] || null;
}

async function findById(id) {
  const [rows] = await pool.query(
    'SELECT id, name, slug, description, image_url, meeting_day, meeting_time, meeting_location, leader_name, contact_phone, contact_email, published, featured, created_at FROM ministries WHERE id = ? LIMIT 1',
    [id]
  );
  return rows[0] || null;
}

async function create({ name, slug, description, image_url, meeting_day, meeting_time, meeting_location, leader_name, contact_phone, contact_email, published, featured }) {
  const [result] = await pool.query(
    'INSERT INTO ministries (name, slug, description, image_url, meeting_day, meeting_time, meeting_location, leader_name, contact_phone, contact_email, published, featured) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [name, slug, description || null, image_url || null, meeting_day || null, meeting_time || null, meeting_location || null, leader_name || null, contact_phone || null, contact_email || null, published === false || published === 0 ? 0 : 1, featured ? 1 : 0]
  );
  return findById(result.insertId);
}

async function update(id, { name, slug, description, image_url, meeting_day, meeting_time, meeting_location, leader_name, contact_phone, contact_email, published, featured }) {
  await pool.query(
    'UPDATE ministries SET name = ?, slug = ?, description = ?, image_url = ?, meeting_day = ?, meeting_time = ?, meeting_location = ?, leader_name = ?, contact_phone = ?, contact_email = ?, published = ?, featured = ? WHERE id = ?',
    [name, slug, description || null, image_url || null, meeting_day || null, meeting_time || null, meeting_location || null, leader_name || null, contact_phone || null, contact_email || null, published ? 1 : 0, featured ? 1 : 0, id]
  );
  return findById(id);
}

async function remove(id) {
  const [result] = await pool.query('DELETE FROM ministries WHERE id = ?', [id]);
  return result.affectedRows > 0;
}

module.exports = { findAll, findBySlug, findById, create, update, remove };
