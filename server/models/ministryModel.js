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

async function findAll() {
  const [rows] = await pool.query(
    'SELECT id, name, slug, description, icon_url, created_at FROM ministries ORDER BY name ASC'
  );
  return rows;
}

async function findBySlug(slug) {
  const [rows] = await pool.query(
    'SELECT id, name, slug, description, icon_url, created_at FROM ministries WHERE slug = ? LIMIT 1',
    [slug]
  );
  return rows[0] || null;
}

async function findById(id) {
  const [rows] = await pool.query(
    'SELECT id, name, slug, description, icon_url, created_at FROM ministries WHERE id = ? LIMIT 1',
    [id]
  );
  return rows[0] || null;
}

async function create({ name, slug, description, icon_url }) {
  const [result] = await pool.query(
    'INSERT INTO ministries (name, slug, description, icon_url) VALUES (?, ?, ?, ?)',
    [name, slug, description || null, icon_url || null]
  );
  return findById(result.insertId);
}

async function update(id, { name, slug, description, icon_url }) {
  await pool.query(
    'UPDATE ministries SET name = ?, slug = ?, description = ?, icon_url = ? WHERE id = ?',
    [name, slug, description || null, icon_url || null, id]
  );
  return findById(id);
}

async function remove(id) {
  const [result] = await pool.query('DELETE FROM ministries WHERE id = ?', [id]);
  return result.affectedRows > 0;
}

module.exports = { findAll, findBySlug, findById, create, update, remove };
