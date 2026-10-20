/**
 * =============================================================================
 * models/leadershipModel.js — SQL query functions for the leadership table.
 * All queries use parameterized placeholders (?) — never string concatenation.
 *
 * create/update accept fields matching the current leadership table.
 * =============================================================================
 */
const pool = require('../config/db');

const SELECT_COLUMNS = 'id, name, position, photo_url, bio, display_order, published, created_at';

async function findAll({ includeUnpublished = false } = {}) {
  const where = includeUnpublished ? '' : 'WHERE published = 1';
  const [rows] = await pool.query(
    `SELECT ${SELECT_COLUMNS} FROM leadership ${where} ORDER BY display_order ASC, id ASC`
  );
  return rows;
}

async function findById(id) {
  const [rows] = await pool.query(
    `SELECT ${SELECT_COLUMNS} FROM leadership WHERE id = ? LIMIT 1`,
    [id]
  );
  return rows[0] || null;
}

async function create({ name, position, photo_url, bio, display_order, published }) {
  const [result] = await pool.query(
    `INSERT INTO leadership (name, position, photo_url, bio, display_order, published)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [name, position, photo_url || null, bio || null, display_order ?? 0, published === false || published === 0 ? 0 : 1]
  );
  return findById(result.insertId);
}

async function update(id, { name, position, photo_url, bio, display_order, published }) {
  await pool.query(
    `UPDATE leadership
     SET name = ?, position = ?, photo_url = ?, bio = ?, display_order = ?, published = ?
     WHERE id = ?`,
    [name, position, photo_url || null, bio || null, display_order ?? 0, published ? 1 : 0, id]
  );
  return findById(id);
}

async function remove(id) {
  const [result] = await pool.query('DELETE FROM leadership WHERE id = ?', [id]);
  return result.affectedRows > 0;
}

module.exports = { findAll, findById, create, update, remove };
