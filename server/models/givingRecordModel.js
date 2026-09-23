/**
 * =============================================================================
 * models/givingRecordModel.js — SQL query functions for giving_records.
 *
 * payment_reference is UNIQUE — this is what makes webhook processing
 * idempotent: no reference can ever be recorded twice.
 * All queries use parameterized placeholders (?) — never string concatenation.
 * =============================================================================
 */
const pool = require('../config/db');

async function create({ name, email, amount, category, paymentReference }) {
  const [result] = await pool.query(
    `INSERT INTO giving_records (name, email, amount, category, payment_status, payment_reference)
     VALUES (?, ?, ?, ?, 'pending', ?)`,
    [name, email, amount, category, paymentReference]
  );
  return findByReference(paymentReference);
}

async function findByReference(paymentReference) {
  const [rows] = await pool.query(
    'SELECT * FROM giving_records WHERE payment_reference = ? LIMIT 1',
    [paymentReference]
  );
  return rows[0] || null;
}

async function findById(id) {
  const [rows] = await pool.query('SELECT * FROM giving_records WHERE id = ? LIMIT 1', [id]);
  return rows[0] || null;
}

/**
 * Update a record's payment status from the webhook — ATOMICALLY idempotent.
 *
 * The UPDATE only applies when the row exists and is NOT already completed
 * (`AND payment_status != 'completed'`), so two concurrent duplicate webhooks
 * can never both process the same reference: exactly one UPDATE reports
 * affectedRows > 0, the other gets alreadyCompleted: true. This makes the
 * webhook race-safe, not just sequentially idempotent.
 *
 * Returns the record, or null if the reference does not exist.
 * @param {string} paymentReference
 * @param {object} [opts] - { status: 'completed'|'failed', paymentChannel }
 */
async function updateByReference(paymentReference, { status = 'completed', paymentChannel = null } = {}) {
  const newStatus = ['completed', 'failed'].includes(status) ? status : 'completed';
  const [result] = await pool.query(
    `UPDATE giving_records
     SET payment_status = ?, payment_channel = ?
     WHERE payment_reference = ? AND payment_status != 'completed'`,
    [newStatus, paymentChannel || null, paymentReference]
  );

  if (result.affectedRows === 0) {
    const existing = await findByReference(paymentReference);
    if (!existing) return null;
    // Either it was already completed, or a concurrent webhook just completed it.
    return { ...existing, alreadyCompleted: true };
  }

  return findByReference(paymentReference);
}

async function countAll({ category, from, to } = {}) {
  const where = [];
  const params = [];
  if (category) { where.push('category = ?'); params.push(category); }
  if (from) { where.push('created_at >= ?'); params.push(from); }
  if (to) { where.push('created_at <= ?'); params.push(to); }
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const [rows] = await pool.query(`SELECT COUNT(*) AS total FROM giving_records ${whereSql}`, params);
  return rows[0].total;
}

async function findAll({ category, from, to, limit, offset } = {}) {
  const where = [];
  const params = [];
  if (category) { where.push('category = ?'); params.push(category); }
  if (from) { where.push('created_at >= ?'); params.push(from); }
  if (to) { where.push('created_at <= ?'); params.push(to); }
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  params.push(limit, offset);
  const [rows] = await pool.query(
    `SELECT id, name, email, amount, category, payment_status, payment_channel, payment_reference, created_at
     FROM giving_records ${whereSql}
     ORDER BY created_at DESC, id DESC
     LIMIT ? OFFSET ?`,
    params
  );
  return rows;
}

/** Summary totals per category (completed payments only). */
async function totalsByCategory({ from, to } = {}) {
  const where = ["payment_status = 'completed'"];
  const params = [];
  if (from) { where.push('created_at >= ?'); params.push(from); }
  if (to) { where.push('created_at <= ?'); params.push(to); }
  const whereSql = `WHERE ${where.join(' AND ')}`;
  const [rows] = await pool.query(
    `SELECT category, COUNT(*) AS count, COALESCE(SUM(amount), 0) AS total
     FROM giving_records ${whereSql}
     GROUP BY category`,
    params
  );
  return rows;
}

module.exports = {
  create,
  findByReference,
  findById,
  updateByReference,
  countAll,
  findAll,
  totalsByCategory,
};
