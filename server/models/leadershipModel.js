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
const { likePattern } = require('../utils/search');

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

/** WHERE and its values for the admin list: one role only, and/or `q` in the name. */
function adminFilter({ role, q }) {
  const conditions = [];
  const params = [];
  if (role) { conditions.push('l.role = ?'); params.push(role); }
  if (q) { conditions.push('l.name LIKE ?'); params.push(likePattern(q)); }
  return { where: conditions.length ? `WHERE ${conditions.join(' AND ')}` : '', params };
}

async function countForAdmin(filter = {}) {
  const { where, params } = adminFilter(filter);
  const [rows] = await pool.query(`SELECT COUNT(*) AS total FROM leadership l ${where}`, params);
  return rows[0].total;
}

/** A page of the flat list for the admin table. */
async function findForAdmin({ role, q, limit, offset }) {
  const { where, params } = adminFilter({ role, q });
  const [rows] = await pool.query(
    `SELECT ${SELECT_COLUMNS}
     FROM leadership l
     LEFT JOIN ministries m ON m.id = l.ministry_id
     ${where}
     ORDER BY l.display_order ASC, l.name ASC, l.id ASC
     LIMIT ? OFFSET ?`,
    [...params, limit, offset]
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

module.exports = { findAll, countForAdmin, findForAdmin, findById, create, update, remove };
