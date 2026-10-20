/**
 * =============================================================================
 * models/givingRecordModel.js — SQL query functions for giving_records.
 *
 * reference is UNIQUE — this is what makes webhook processing
 * idempotent: no reference can ever be recorded twice.
 * All queries use parameterized placeholders (?) — never string concatenation.
 * =============================================================================
 */
const pool = require('../config/db');

const SELECT_COLUMNS = `
  id, donor_name AS name, donor_email AS email, amount, currency,
  purpose AS category,
  CASE WHEN payment_status = 'successful' THEN 'completed' ELSE payment_status END AS payment_status,
  payment_channel, reference AS payment_reference,
  COALESCE(transaction_date, created_at) AS created_at
`;

function normalizePaymentChannel(channel) {
  if (channel === 'mobile_money' || channel === 'bank' || channel === 'cash') return channel;
  if (channel === 'card' || channel === 'online') return 'online';
  return 'other';
}

async function create({ name, email, amount, category, paymentReference }) {
  const [result] = await pool.query(
    `INSERT INTO giving_records (donor_name, donor_email, amount, currency, payment_channel, reference, payment_status, purpose)
     VALUES (?, ?, ?, 'GHS', 'online', ?, 'pending', ?)`,
    [name, email, amount, paymentReference, category]
  );
  return findByReference(paymentReference);
}

async function findByReference(paymentReference) {
  const [rows] = await pool.query(
    `SELECT ${SELECT_COLUMNS} FROM giving_records WHERE reference = ? LIMIT 1`,
    [paymentReference]
  );
  return rows[0] || null;
}

async function findById(id) {
  const [rows] = await pool.query(`SELECT ${SELECT_COLUMNS} FROM giving_records WHERE id = ? LIMIT 1`, [id]);
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
  const newStatus = status === 'failed' ? 'failed' : 'successful';
  const [result] = await pool.query(
    `UPDATE giving_records
     SET payment_status = ?, payment_channel = ?
     WHERE reference = ? AND payment_status NOT IN ('successful', 'refunded')`,
    [newStatus, normalizePaymentChannel(paymentChannel), paymentReference]
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
  if (category) { where.push('purpose = ?'); params.push(category); }
  if (from) { where.push('COALESCE(transaction_date, created_at) >= ?'); params.push(from); }
  if (to) { where.push('COALESCE(transaction_date, created_at) < DATE_ADD(?, INTERVAL 1 DAY)'); params.push(to); }
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const [rows] = await pool.query(`SELECT COUNT(*) AS total FROM giving_records ${whereSql}`, params);
  return rows[0].total;
}

async function findAll({ category, from, to, limit, offset } = {}) {
  const where = [];
  const params = [];
  if (category) { where.push('purpose = ?'); params.push(category); }
  if (from) { where.push('COALESCE(transaction_date, created_at) >= ?'); params.push(from); }
  if (to) { where.push('COALESCE(transaction_date, created_at) < DATE_ADD(?, INTERVAL 1 DAY)'); params.push(to); }
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  params.push(limit, offset);
  const [rows] = await pool.query(
    `SELECT ${SELECT_COLUMNS}
     FROM giving_records ${whereSql}
     ORDER BY COALESCE(transaction_date, created_at) DESC, id DESC
     LIMIT ? OFFSET ?`,
    params
  );
  return rows;
}

/** Summary totals per category (completed payments only). */
async function totalsByCategory({ from, to } = {}) {
  const where = ["payment_status = 'successful'"];
  const params = [];
  if (from) { where.push('COALESCE(transaction_date, created_at) >= ?'); params.push(from); }
  if (to) { where.push('COALESCE(transaction_date, created_at) < DATE_ADD(?, INTERVAL 1 DAY)'); params.push(to); }
  const whereSql = `WHERE ${where.join(' AND ')}`;
  const [rows] = await pool.query(
    `SELECT purpose AS category, COUNT(*) AS count, COALESCE(SUM(amount), 0) AS total
     FROM giving_records ${whereSql}
     GROUP BY purpose`,
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
