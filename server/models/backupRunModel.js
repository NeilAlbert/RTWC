/**
 * models/backupRunModel.js: the backup_runs table, one row per backup attempt.
 *
 * Times are stored in UTC (UTC_TIMESTAMP()) and returned as ISO strings ending in
 * "Z", so the admin page can show them in the viewer's own time. A deleted backup
 * keeps its row with deleted_at set; nothing else here returns it.
 * All queries use placeholders.
 */
const pool = require('../config/db');

const COLUMNS = `id, kind, period_key, status, filename, size_bytes, includes_images, table_counts,
  image_count, sha256, error_message, started_at, finished_at, downloaded_at`;

/** "2026-11-18 13:05:00" (UTC) to "2026-11-18T13:05:00Z". */
function toIso(value) {
  return value ? `${String(value).replace(' ', 'T')}Z` : null;
}

function parseCounts(value) {
  if (!value) return null;
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch (err) {
    return null;
  }
}

function fromRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    kind: row.kind,
    periodKey: row.period_key,
    status: row.status,
    filename: row.filename,
    sizeBytes: row.size_bytes === null ? null : Number(row.size_bytes),
    includesImages: Boolean(row.includes_images),
    tableCounts: parseCounts(row.table_counts),
    imageCount: Number(row.image_count) || 0,
    sha256: row.sha256,
    errorMessage: row.error_message,
    startedAt: toIso(row.started_at),
    finishedAt: toIso(row.finished_at),
    downloadedAt: toIso(row.downloaded_at),
  };
}

async function insertRunning({ kind, periodKey = null, filename, includesImages }) {
  const [result] = await pool.query(
    `INSERT INTO backup_runs (kind, period_key, status, filename, includes_images, started_at)
     VALUES (?, ?, 'running', ?, ?, UTC_TIMESTAMP())`,
    [kind, periodKey, filename, includesImages ? 1 : 0]
  );
  return result.insertId;
}

async function markSuccess(id, { sizeBytes, sha256, tableCounts, imageCount }) {
  await pool.query(
    `UPDATE backup_runs SET status = 'success', size_bytes = ?, sha256 = ?, table_counts = ?, image_count = ?,
       error_message = NULL, finished_at = UTC_TIMESTAMP()
     WHERE id = ?`,
    [sizeBytes, sha256, JSON.stringify(tableCounts), imageCount, id]
  );
}

async function markFailed(id, message) {
  await pool.query(
    `UPDATE backup_runs SET status = 'failed', error_message = ?, finished_at = UTC_TIMESTAMP()
     WHERE id = ? AND status = 'running'`,
    [String(message).slice(0, 255), id]
  );
}

async function markDownloaded(id) {
  await pool.query('UPDATE backup_runs SET downloaded_at = UTC_TIMESTAMP() WHERE id = ?', [id]);
}

async function markDeleted(id) {
  await pool.query('UPDATE backup_runs SET deleted_at = UTC_TIMESTAMP() WHERE id = ? AND deleted_at IS NULL', [id]);
}

async function findById(id) {
  const [rows] = await pool.query(`SELECT ${COLUMNS} FROM backup_runs WHERE id = ? AND deleted_at IS NULL LIMIT 1`, [id]);
  return fromRow(rows[0]);
}

/** Newest first. At most `limit` rows. */
async function list(limit = 200) {
  const [rows] = await pool.query(
    `SELECT ${COLUMNS} FROM backup_runs WHERE deleted_at IS NULL ORDER BY started_at DESC, id DESC LIMIT ?`,
    [limit]
  );
  return rows.map(fromRow);
}

/** { count, totalBytes } of the finished backups that are kept. */
async function totals() {
  const [rows] = await pool.query(
    `SELECT COUNT(*) AS count, COALESCE(SUM(size_bytes), 0) AS total_bytes
     FROM backup_runs WHERE deleted_at IS NULL AND status = 'success'`
  );
  return { count: Number(rows[0].count), totalBytes: Number(rows[0].total_bytes) };
}

/** Runs still marked running, for the start-up clean-up. */
async function findRunning() {
  const [rows] = await pool.query(`SELECT ${COLUMNS} FROM backup_runs WHERE status = 'running'`);
  return rows.map(fromRow);
}

/**
 * Claims this month's automatic backup, so that of several servers exactly one
 * makes it. The first attempt inserts the month's row; the unique key on
 * (kind, period_key) refuses a second one. A later attempt takes over the
 * month's row only while it is failed, has had fewer than `maxAttempts` tries,
 * and was last tried an hour or more ago. Returns the row id, or null when
 * there is nothing to claim.
 */
async function claimAutomatic({ periodKey, filename, includesImages, maxAttempts }) {
  try {
    const [result] = await pool.query(
      `INSERT INTO backup_runs (kind, period_key, status, filename, includes_images, attempts, started_at)
       VALUES ('automatic', ?, 'running', ?, ?, 1, UTC_TIMESTAMP())`,
      [periodKey, filename, includesImages ? 1 : 0]
    );
    return result.insertId;
  } catch (err) {
    if (err.code !== 'ER_DUP_ENTRY') throw err;
  }
  const [result] = await pool.query(
    `UPDATE backup_runs
     SET status = 'running', filename = ?, includes_images = ?, attempts = attempts + 1, size_bytes = NULL,
       sha256 = NULL, table_counts = NULL, image_count = 0, error_message = NULL,
       started_at = UTC_TIMESTAMP(), finished_at = NULL, downloaded_at = NULL, deleted_at = NULL
     WHERE kind = 'automatic' AND period_key = ? AND status = 'failed' AND attempts < ?
       AND started_at <= UTC_TIMESTAMP() - INTERVAL 1 HOUR`,
    [filename, includesImages ? 1 : 0, periodKey, maxAttempts]
  );
  if (result.affectedRows !== 1) return null;
  const [rows] = await pool.query("SELECT id FROM backup_runs WHERE kind = 'automatic' AND period_key = ? LIMIT 1", [periodKey]);
  return rows[0] ? rows[0].id : null;
}

/** This month's automatic row with its attempt count, deleted or not, or null. */
async function findAutomaticPeriod(periodKey) {
  const [rows] = await pool.query(
    `SELECT ${COLUMNS}, attempts, deleted_at FROM backup_runs WHERE kind = 'automatic' AND period_key = ? LIMIT 1`,
    [periodKey]
  );
  if (!rows[0]) return null;
  return { ...fromRow(rows[0]), attempts: Number(rows[0].attempts), deleted: rows[0].deleted_at !== null };
}

/** Finished backups of one kind that are kept, newest first. */
async function listKept(kind) {
  const [rows] = await pool.query(
    `SELECT ${COLUMNS} FROM backup_runs WHERE kind = ? AND status = 'success' AND deleted_at IS NULL
     ORDER BY started_at DESC, id DESC`,
    [kind]
  );
  return rows.map(fromRow);
}

/** The newest automatic run that has finished, kept or not, for "last result". */
async function latestFinishedAutomatic() {
  const [rows] = await pool.query(
    `SELECT ${COLUMNS}, attempts FROM backup_runs WHERE kind = 'automatic' AND status <> 'running'
     ORDER BY started_at DESC, id DESC LIMIT 1`
  );
  return rows[0] ? { ...fromRow(rows[0]), attempts: Number(rows[0].attempts) } : null;
}

/** The newest kept finished backup, the newest download time, and whether any backup ever finished. */
async function summary() {
  const newest = async (status) => {
    const [rows] = await pool.query(
      `SELECT ${COLUMNS} FROM backup_runs WHERE status = ? AND deleted_at IS NULL
       ORDER BY started_at DESC, id DESC LIMIT 1`,
      [status]
    );
    return fromRow(rows[0]);
  };
  const [rows] = await pool.query('SELECT MAX(downloaded_at) AS last_download FROM backup_runs');
  return {
    latest: await newest('success'),
    latestFailed: await newest('failed'),
    lastDownloadAt: toIso(rows[0].last_download),
  };
}

module.exports = {
  insertRunning,
  markSuccess,
  markFailed,
  markDownloaded,
  markDeleted,
  findById,
  list,
  totals,
  findRunning,
  claimAutomatic,
  findAutomaticPeriod,
  listKept,
  latestFinishedAutomatic,
  summary,
};
