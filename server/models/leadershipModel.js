/**
 * =============================================================================
 * models/leadershipModel.js — SQL query functions for the leadership table.
 * All queries use parameterized placeholders (?) — never string concatenation.
 *
 * create/update accept snake_case keys matching the DB columns and the
 * route-validated body fields (ministry_id, photo_url, display_order).
 * =============================================================================
 */
const pool = require('../config/db');

const SELECT_COLUMNS = `
  l.id, l.name, l.role, l.ministry_id, l.photo_url, l.bio, l.display_order, l.created_at,
  m.name AS ministry_name, m.slug AS ministry_slug
`;

async function findAll() {
  const [rows] = await pool.query(
    `SELECT ${SELECT_COLUMNS}
     FROM leadership l
     LEFT JOIN ministries m ON m.id = l.ministry_id
     ORDER BY l.display_order ASC, l.id ASC`
  );
  return rows;
}

async function findById(id) {
  const [rows] = await pool.query(
    `SELECT ${SELECT_COLUMNS}
     FROM leadership l
     LEFT JOIN ministries m ON m.id = l.ministry_id
     WHERE l.id = ? LIMIT 1`,
    [id]
  );
  return rows[0] || null;
}

async function create({ name, role, ministry_id, photo_url, bio, display_order }) {
  const [result] = await pool.query(
    `INSERT INTO leadership (name, role, ministry_id, photo_url, bio, display_order)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [name, role, ministry_id || null, photo_url || null, bio || null, display_order ?? 0]
  );
  return findById(result.insertId);
}

async function update(id, { name, role, ministry_id, photo_url, bio, display_order }) {
  await pool.query(
    `UPDATE leadership
     SET name = ?, role = ?, ministry_id = ?, photo_url = ?, bio = ?, display_order = ?
     WHERE id = ?`,
    [name, role, ministry_id || null, photo_url || null, bio || null, display_order ?? 0, id]
  );
  return findById(id);
}

async function remove(id) {
  const [result] = await pool.query('DELETE FROM leadership WHERE id = ?', [id]);
  return result.affectedRows > 0;
}

module.exports = { findAll, findById, create, update, remove };
