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
const { likePattern } = require('../utils/search');

const COLUMNS = 'id, name, slug, description, meeting_time, icon_url, display_order, created_at';

const LEADER_ROLE_LABEL = 'Ministry leader';
const SHORT_BIO_LENGTH = 200;

/** The first sentences of a bio, cut at a word boundary, for the public lists. */
function shortBio(bio) {
  if (!bio) return null;
  const text = String(bio).trim();
  if (text.length <= SHORT_BIO_LENGTH) return text;
  const cut = text.slice(0, SHORT_BIO_LENGTH);
  return `${cut.slice(0, Math.max(cut.lastIndexOf(' '), 1)).trim()}…`;
}

/**
 * The ministry leaders of the given ministries (all of them when ids is null), in one
 * query, grouped by ministry id. Only public fields leave this function.
 */
async function leadersByMinistry(ids = null) {
  if (Array.isArray(ids) && ids.length === 0) return new Map();
  const [rows] = await pool.query(
    `SELECT id, name, ministry_id, photo_url, bio, display_order
     FROM leadership
     WHERE role = 'ministry_leader' AND ministry_id IS NOT NULL
     ${ids ? 'AND ministry_id IN (?)' : ''}
     ORDER BY display_order ASC, name ASC, id ASC`,
    ids ? [ids] : []
  );
  const groups = new Map();
  rows.forEach((row) => {
    if (!groups.has(row.ministry_id)) groups.set(row.ministry_id, []);
    groups.get(row.ministry_id).push({
      id: row.id,
      name: row.name,
      role_label: LEADER_ROLE_LABEL,
      photo_url: row.photo_url || null,
      bio: shortBio(row.bio),
      display_order: row.display_order,
    });
  });
  return groups;
}

/**
 * Every ministry in website order, each with its ministry leaders (from the
 * leadership table), for the public site. Two queries in all, never one per ministry.
 */
async function findAll() {
  const [[rows], leaders] = await Promise.all([
    pool.query(`SELECT ${COLUMNS} FROM ministries ORDER BY display_order ASC, name ASC, id ASC`),
    leadersByMinistry(),
  ]);
  return rows.map((row) => ({ ...row, leaders: leaders.get(row.id) || [] }));
}

/** One ministry by slug with its ministry leaders, in the same shape as findAll, or null. */
async function findBySlugWithLeaders(slug) {
  const ministry = await findBySlug(slug);
  if (!ministry) return null;
  const leaders = await leadersByMinistry([ministry.id]);
  return { ...ministry, leaders: leaders.get(ministry.id) || [] };
}

/** How many ministries there are, or how many have `q` in the name. */
async function countAll({ q } = {}) {
  const [rows] = q
    ? await pool.query('SELECT COUNT(*) AS total FROM ministries WHERE name LIKE ?', [likePattern(q)])
    : await pool.query('SELECT COUNT(*) AS total FROM ministries');
  return rows[0].total;
}

/** A page of ministries, each with the number of leaders linked to it. For the admin list. */
async function findAllWithLeaderCount({ q, limit, offset }) {
  const [rows] = await pool.query(
    `SELECT m.id, m.name, m.slug, m.description, m.meeting_time, m.icon_url, m.display_order, m.created_at,
            COUNT(l.id) AS leader_count
     FROM ministries m
     LEFT JOIN leadership l ON l.ministry_id = m.id
     ${q ? 'WHERE m.name LIKE ?' : ''}
     GROUP BY m.id, m.name, m.slug, m.description, m.meeting_time, m.icon_url, m.display_order, m.created_at
     ORDER BY m.display_order ASC, m.name ASC, m.id ASC
     LIMIT ? OFFSET ?`,
    q ? [likePattern(q), limit, offset] : [limit, offset]
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
    `SELECT ${COLUMNS} FROM ministries WHERE slug = ? LIMIT 1`,
    [slug]
  );
  return rows[0] || null;
}

async function findById(id) {
  const [rows] = await pool.query(
    `SELECT ${COLUMNS} FROM ministries WHERE id = ? LIMIT 1`,
    [id]
  );
  return rows[0] || null;
}

async function create({ name, slug, description, meeting_time, icon_url, display_order }) {
  const [result] = await pool.query(
    'INSERT INTO ministries (name, slug, description, meeting_time, icon_url, display_order) VALUES (?, ?, ?, ?, ?, ?)',
    [name, slug, description || null, meeting_time || null, icon_url || null, Number(display_order) || 0]
  );
  return findById(result.insertId);
}

async function update(id, { name, slug, description, meeting_time, icon_url, display_order }) {
  await pool.query(
    'UPDATE ministries SET name = ?, slug = ?, description = ?, meeting_time = ?, icon_url = ?, display_order = ? WHERE id = ?',
    [name, slug, description || null, meeting_time || null, icon_url || null, Number(display_order) || 0, id]
  );
  return findById(id);
}

async function remove(id) {
  const [result] = await pool.query('DELETE FROM ministries WHERE id = ?', [id]);
  return result.affectedRows > 0;
}

module.exports = {
  findAll, findBySlugWithLeaders, countAll, findAllWithLeaderCount, findByName, slugTaken, countLeaders, findBySlug, findById, create, update, remove,
};
