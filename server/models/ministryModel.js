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

/** Every ministry with the number of leaders linked to it. For the admin list. */
async function findAllWithLeaderCount() {
  const [rows] = await pool.query(
    `SELECT m.id, m.name, m.slug, m.description, m.icon_url, m.created_at,
            COUNT(l.id) AS leader_count
     FROM ministries m
     LEFT JOIN leadership l ON l.ministry_id = m.id
     GROUP BY m.id, m.name, m.slug, m.description, m.icon_url, m.created_at
     ORDER BY m.name ASC`
  );
  return rows;
}

/** A ministry with this name (ignoring case), other than the one being edited. */
async function findByName(name, exceptId = 0) {
  const [rows] = await pool.query(
    'SELECT id FROM ministries WHERE LOWER(name) = LOWER(?) AND id <> ? LIMIT 1',
    [name, exceptId]
  );
  return rows[0] || null;
}

/** True when another ministry already uses this slug. */
async function slugTaken(slug, exceptId = 0) {
  const [rows] = await pool.query('SELECT id FROM ministries WHERE slug = ? AND id <> ? LIMIT 1', [slug, exceptId]);
  return rows.length > 0;
}

async function countLeaders(id) {
  const [rows] = await pool.query('SELECT COUNT(*) AS total FROM leadership WHERE ministry_id = ?', [id]);
  return rows[0].total;
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

module.exports = {
  findAll, findAllWithLeaderCount, findByName, slugTaken, countLeaders, findBySlug, findById, create, update, remove,
};
