/**
 * services/backupService.js: the backup engine. The routes only call into this.
 *
 * A backup is one encrypted file (services/backupCrypto.js) holding a zip with:
 *   tables/<table>.ndjson   every row of each content table, one JSON object per line
 *   images/<name>           the uploaded images, when chosen
 *   manifest.json           written last: versions, counts and a SHA-256 of every other entry
 *
 * The admins table (names, emails, password hashes) and backup_runs are never
 * exported. Nothing from .env, no tokens, keys or logs go into a backup.
 *
 * Files live in BACKUP_DIR (default server/backups), which the website never
 * serves. Their names are made here, and a file is only ever found again through
 * the name stored in backup_runs, so a request can never point at another file.
 *
 * Only one backup (and, later, one restore) runs at a time. The lock is a MySQL
 * named lock (GET_LOCK), so it holds across every copy of the server that shares
 * the database, plus a flag in this process.
 */
const crypto = require('crypto');
const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');
const { Readable, Transform } = require('stream');
const { StringDecoder } = require('string_decoder');
const { pipeline } = require('stream/promises');

const pool = require('../config/db');
const redis = require('../config/redis');
const logger = require('../utils/logger');
const cache = require('../utils/cache');
const mailer = require('../utils/mailer');
const BackupRun = require('../models/backupRunModel');
const { UPLOAD_NAME_PATTERN } = require('../utils/validators');
const { UPLOAD_DIR } = require('../middleware/upload');
const backupCrypto = require('./backupCrypto');
const { version: APP_VERSION } = require('../package.json');

const { BackupFileError } = backupCrypto;

// ---------------------------------------------------------------------------
// Settings
// ---------------------------------------------------------------------------
const SERVER_DIR = path.join(__dirname, '..');
const SITE_ROOT = path.join(SERVER_DIR, '..');
// The folders server.js serves to visitors. A backup folder inside one of them could be downloaded by anyone.
const SERVED_FOLDERS = ['css', 'js', 'assets', 'admin'].map((folder) => path.join(SITE_ROOT, folder));

function positiveNumber(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? Math.floor(number) : fallback;
}

const BACKUP_DIR = path.resolve(SERVER_DIR, process.env.BACKUP_DIR || 'backups');
const MAX_BYTES = positiveNumber(process.env.BACKUP_MAX_BYTES, 1024 * 1024 * 1024);
const TIMEOUT_MS = 30 * 60 * 1000;
const BATCH_ROWS = 1000;
const FREE_SPACE_MARGIN = 64 * 1024 * 1024;
const MAX_MANIFEST_BYTES = 5 * 1024 * 1024;
const LOCK_NAME = 'rtwc_backup_restore';
const MIN_PASSPHRASE_LENGTH = 12;

const MANIFEST_FORMAT = 'rtwc-backup';
const MANIFEST_VERSION = 1;
/** The newest migration file, recorded in each manifest for reference. */
const LATEST_MIGRATION = (() => {
  try {
    return fs.readdirSync(path.join(SERVER_DIR, 'migrations')).filter((name) => /^\d{3}_[\w-]+\.sql$/.test(name)).sort().pop() || null;
  } catch (err) {
    return null;
  }
})();

/**
 * Every content table, in the order a restore must fill them (ministries before
 * leadership, which points at it). A new content table must be added here; the
 * backup logs a warning when it finds a table that is in neither list.
 */
const CONTENT_TABLES = [
  'site_settings',
  'ministries',
  'leadership',
  'sermons',
  'events',
  'contact_messages',
  'prayer_requests',
  'newsletter_subscribers',
];
const NEVER_BACKED_UP = ['admins', 'backup_runs'];

const KINDS = { manual: 'manual', automatic: 'automatic', pre_restore: 'pre-restore' };
const STORED_NAME = /^rtwc-backup-\d{8}-\d{6}-(manual|automatic|pre-restore)-[a-f0-9]{8}\.rtwcbackup$/;
const PARTIAL_SUFFIX = '.partial';
const TABLE_ENTRY = /^tables\/([a-z_]+)\.ndjson$/;
const IMAGE_ENTRY = /^images\/([^/]+)$/;

// ---------------------------------------------------------------------------
// Errors. Every message here may be shown to the admin: no paths, SQL or details.
// ---------------------------------------------------------------------------
const MESSAGES = {
  busy: 'A backup is already running. Wait for it to finish, then try again.',
  notSetUp: 'Backups are not set up yet. Run the database migration 006_backups.sql first (see README.md).',
  folderUnsafe: 'Backups are switched off because the backup folder is inside a folder the website shows to visitors. Whoever looks after the server needs to set BACKUP_DIR to a folder outside the website.',
  folderNotWritable: 'Backups cannot be saved because the backup folder on the server cannot be written to. Whoever looks after the server needs to check the BACKUP_DIR setting.',
  noSpace: 'There is not enough free disk space on the server for this backup.',
  diskFull: 'The server ran out of disk space while writing the backup.',
  tooLarge: `The backup became larger than the limit of ${MAX_BYTES >= 1024 * 1024 ? `${Math.round(MAX_BYTES / (1024 * 1024))} MB` : `${MAX_BYTES} bytes`} (BACKUP_MAX_BYTES), so it was stopped.`,
  timeout: 'The backup took longer than 30 minutes, so it was stopped.',
  imageChanged: 'An image was removed while the backup was being made. Try again.',
  database: 'The database could not be read for the backup.',
  verify: 'The finished backup file did not pass its check, so it was not kept.',
  interrupted: 'The server stopped before this backup finished.',
  generic: 'The backup could not be completed.',
  otherSchema: 'This backup was made with a different version of the website database, so it cannot be restored here. Nothing was changed.',
  sessionEnded: 'This restore has expired or was already used. Choose the backup file again.',
  notInspected: 'Check the file with its passphrase before restoring it.',
  restoreBusy: 'This file is being checked or restored at the moment. Wait for it to finish.',
  imagesTooLarge: 'The images in this backup are larger than the size limit (BACKUP_MAX_BYTES).',
  noAutoPassphrase: 'Automatic backups cannot be switched on because BACKUP_PASSPHRASE is not set on the server, or is shorter than 12 characters. Whoever looks after the server needs to add it to server/.env and restart the server.',
  autoOnNoPassphrase: 'The automatic monthly backup is switched on, but BACKUP_PASSPHRASE is not set on the server, so it cannot run.',
};

class BackupError extends Error {
  constructor(message, status = 500) {
    super(message);
    this.name = 'BackupError';
    this.status = status;
    this.expose = true;
  }
}

/** The short message stored and shown for a failed backup. */
function safeMessage(err) {
  if (err instanceof BackupError) return err.message;
  if (err && err.cause instanceof BackupError) return err.cause.message;
  if (err && (err.code === 'ENOSPC' || err.code === 'EDQUOT')) return MESSAGES.diskFull;
  if (err && (err.name === 'AbortError' || err.code === 'ABORT_ERR')) return MESSAGES.timeout;
  if (err && (err.sqlState || String(err.code || '').startsWith('ER_') || err.code === 'PROTOCOL_CONNECTION_LOST')) return MESSAGES.database;
  return MESSAGES.generic;
}

function isMissingTable(err) {
  return Boolean(err && err.code === 'ER_NO_SUCH_TABLE');
}

// ---------------------------------------------------------------------------
// The backup folder
// ---------------------------------------------------------------------------
function isInside(parent, child) {
  const relative = path.relative(parent, child);
  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
}

function folderIsUnsafe() {
  return path.relative(SITE_ROOT, BACKUP_DIR) === '' || SERVED_FOLDERS.some((folder) => isInside(folder, BACKUP_DIR));
}

/** Makes sure BACKUP_DIR exists and can be written. Throws a BackupError (503) otherwise. */
async function ensureBackupDir() {
  if (folderIsUnsafe()) throw new BackupError(MESSAGES.folderUnsafe, 503);
  try {
    await fsp.mkdir(BACKUP_DIR, { recursive: true });
    const probe = path.join(BACKUP_DIR, `.write-check-${crypto.randomBytes(6).toString('hex')}`);
    await fsp.writeFile(probe, '', { flag: 'wx' });
    await fsp.rm(probe, { force: true });
  } catch (err) {
    throw new BackupError(MESSAGES.folderNotWritable, 503);
  }
}

/** Free bytes on the disk that holds `folder` (BACKUP_DIR by default), or null when the platform cannot say. */
async function freeDiskBytes(folder = BACKUP_DIR) {
  try {
    const stats = await fsp.statfs(folder);
    return Number(stats.bavail) * Number(stats.bsize);
  } catch (err) {
    return null;
  }
}

function storedPath(filename) {
  if (!STORED_NAME.test(String(filename))) throw new BackupError(MESSAGES.generic);
  return path.join(BACKUP_DIR, filename);
}

function newFilename(kind) {
  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace('T', '-').slice(0, 15);
  return `rtwc-backup-${stamp}-${KINDS[kind]}-${crypto.randomBytes(4).toString('hex')}.rtwcbackup`;
}

/** The name a download is saved under, for example rtwc-backup-2026-11-18-1305-manual.rtwcbackup (UTC). */
function downloadName(run) {
  const stamp = String(run.startedAt || '').slice(0, 16).replace('T', '-').replace(':', '');
  const safeStamp = /^\d{4}-\d{2}-\d{2}-\d{4}$/.test(stamp) ? stamp : 'undated';
  return `rtwc-backup-${safeStamp}-${KINDS[run.kind] || 'manual'}.rtwcbackup`;
}

/** Removes a run's files, finished or not. Only names this service made are touched. */
async function removeRunFiles(filename) {
  if (!STORED_NAME.test(String(filename))) return;
  await fsp.rm(path.join(BACKUP_DIR, `${filename}${PARTIAL_SUFFIX}`), { force: true });
  await fsp.rm(path.join(BACKUP_DIR, filename), { force: true });
}

async function fileExists(filename) {
  try {
    const stats = await fsp.stat(storedPath(filename));
    return stats.isFile();
  } catch (err) {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Uploaded images. Only files named the way the upload route names them.
// ---------------------------------------------------------------------------
async function listUploads() {
  let entries;
  try {
    entries = await fsp.readdir(UPLOAD_DIR, { withFileTypes: true });
  } catch (err) {
    if (err.code === 'ENOENT') return [];
    throw err;
  }
  const images = [];
  for (const entry of entries) {
    if (entry.isFile() && UPLOAD_NAME_PATTERN.test(entry.name)) {
      const stats = await fsp.stat(path.join(UPLOAD_DIR, entry.name));
      images.push({ name: entry.name, size: stats.size, path: path.join(UPLOAD_DIR, entry.name) });
    }
  }
  return images.sort((a, b) => a.name.localeCompare(b.name));
}

async function uploadsSummary() {
  const images = await listUploads();
  return { count: images.length, bytes: images.reduce((sum, image) => sum + image.size, 0) };
}

// ---------------------------------------------------------------------------
// The lock
// ---------------------------------------------------------------------------
let localLock = false;

/** Takes the lock on a connection of its own. Returns that connection; the lock lasts as long as it does. */
async function acquireLock() {
  if (localLock) throw new BackupError(MESSAGES.busy, 409);
  localLock = true;
  let connection;
  try {
    connection = await pool.getConnection();
    const [[row]] = await connection.query('SELECT GET_LOCK(?, 0) AS got', [LOCK_NAME]);
    if (Number(row.got) !== 1) throw new BackupError(MESSAGES.busy, 409);
    return connection;
  } catch (err) {
    localLock = false;
    if (connection) connection.release();
    throw err;
  }
}

/**
 * Ends the lock by closing its connection, which MySQL takes as the release.
 * Closing rather than returning it to the pool also drops the session settings
 * the export changed (time zone, transaction).
 */
function releaseLock(connection) {
  localLock = false;
  connection.destroy();
}

function isBusy() {
  return localLock;
}

// ---------------------------------------------------------------------------
// Reading the database
// ---------------------------------------------------------------------------

/**
 * The columns of each content table, and a schema version made from them: the
 * first 16 hex characters of a SHA-256 over every "table.column type null"
 * line. A restore (Phase 2) only accepts a backup with the same version.
 */
async function readSchema(connection) {
  const [rows] = await connection.query(
    `SELECT TABLE_NAME AS table_name, COLUMN_NAME AS column_name, COLUMN_TYPE AS column_type, IS_NULLABLE AS is_nullable
     FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
     ORDER BY TABLE_NAME, ORDINAL_POSITION`
  );
  const tables = {};
  rows.forEach((row) => {
    if (!tables[row.table_name]) tables[row.table_name] = [];
    tables[row.table_name].push(row);
  });

  const unlisted = Object.keys(tables).filter((name) => !CONTENT_TABLES.includes(name) && !NEVER_BACKED_UP.includes(name));
  if (unlisted.length > 0) logger.warn('Backup: tables that are not included in backups', { tables: unlisted });

  const columns = {};
  const lines = [];
  CONTENT_TABLES.forEach((name) => {
    const tableColumns = tables[name];
    if (!tableColumns || !tableColumns.some((column) => column.column_name === 'id')) {
      throw new BackupError(MESSAGES.database);
    }
    columns[name] = tableColumns.map((column) => column.column_name);
    tableColumns.forEach((column) => lines.push(`${name}.${column.column_name} ${column.column_type} ${column.is_nullable}`));
  });
  const schemaVersion = crypto.createHash('sha256').update(lines.join('\n')).digest('hex').slice(0, 16);
  return { columns, schemaVersion };
}

/** Database size estimate for the free-space check: the stored size of the content tables. */
async function estimateBytes(includeImages) {
  const [rows] = await pool.query(
    `SELECT COALESCE(SUM(DATA_LENGTH), 0) AS bytes FROM information_schema.TABLES
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME IN (?)`,
    [CONTENT_TABLES]
  );
  const images = includeImages ? (await uploadsSummary()).bytes : 0;
  return Number(rows[0].bytes) + images;
}

async function checkFreeSpace(includeImages) {
  const free = await freeDiskBytes();
  if (free === null) return;
  const needed = Math.min(await estimateBytes(includeImages), MAX_BYTES) + FREE_SPACE_MARGIN;
  if (free < needed) throw new BackupError(MESSAGES.noSpace, 503);
}

/** One table as NDJSON, read in batches of BATCH_ROWS by id. Records its hash, size and row count. */
async function* exportTable({ connection, table, columns, record, signal }) {
  const hash = crypto.createHash('sha256');
  let bytes = 0;
  let rows = 0;
  let lastId = 0;
  for (;;) {
    if (signal.aborted) throw new BackupError(MESSAGES.timeout);
    const [batch] = await connection.query(
      'SELECT ?? FROM ?? WHERE id > ? ORDER BY id LIMIT ?',
      [columns, table, lastId, BATCH_ROWS]
    );
    if (batch.length === 0) break;
    const buffer = Buffer.from(`${batch.map((row) => JSON.stringify(row)).join('\n')}\n`, 'utf8');
    hash.update(buffer);
    bytes += buffer.length;
    rows += batch.length;
    lastId = batch[batch.length - 1].id;
    yield buffer;
    if (batch.length < BATCH_ROWS) break;
  }
  record(rows, { sha256: hash.digest('hex'), bytes });
}

/** One image file, hashed as it is read. */
async function* exportImage({ image, record, signal }) {
  const hash = crypto.createHash('sha256');
  let bytes = 0;
  try {
    for await (const chunk of fs.createReadStream(image.path)) {
      if (signal.aborted) throw new BackupError(MESSAGES.timeout);
      hash.update(chunk);
      bytes += chunk.length;
      yield chunk;
    }
  } catch (err) {
    if (err.code === 'ENOENT') throw new BackupError(MESSAGES.imageChanged);
    throw err;
  }
  record({ sha256: hash.digest('hex'), bytes });
}

/** Counts and hashes the encrypted file as it is written, and stops it at MAX_BYTES. */
function createSizeGuard() {
  const hash = crypto.createHash('sha256');
  let bytes = 0;
  const guard = new Transform({
    transform(chunk, encoding, callback) {
      bytes += chunk.length;
      if (bytes > MAX_BYTES) {
        callback(new BackupError(MESSAGES.tooLarge));
        return;
      }
      hash.update(chunk);
      callback(null, chunk);
    },
  });
  guard.result = () => ({ sizeBytes: bytes, sha256: hash.digest('hex') });
  return guard;
}

/**
 * Adds one entry and resolves once the archive has written all of it. Rejects
 * when the source or the archive fails, or the archive is closed first.
 */
function addEntry(archive, source, data) {
  return new Promise((resolve, reject) => {
    const onEntry = (entry) => {
      if (entry.name !== data.name) return;
      cleanup();
      resolve();
    };
    const onFail = (err) => {
      cleanup();
      reject(err);
    };
    const onClose = () => onFail(new BackupError(MESSAGES.generic));
    function cleanup() {
      archive.off('entry', onEntry);
      archive.off('error', onFail);
      archive.off('close', onClose);
    }
    archive.on('entry', onEntry);
    archive.on('error', onFail);
    archive.on('close', onClose);
    // Kept for the life of the source: the archive does not listen for its errors.
    source.on('error', onFail);
    archive.append(source, data);
  });
}

/**
 * Writes the encrypted archive to tempPath. Returns { manifest, sizeBytes, sha256 }.
 *
 * Every table is read inside ONE read-only transaction started WITH CONSISTENT
 * SNAPSHOT on the lock's connection. All content tables are InnoDB, so they are
 * all read as they were at that one moment, even while visitors send forms.
 * Images are files, not database rows, so an image uploaded or deleted during
 * the backup may or may not be in it; one deleted midway fails the backup.
 */
async function writeArchive({ connection, tempPath, keyInfo, includeImages, kind, signal }) {
  const { ZipArchive } = await import('archiver');
  const { columns, schemaVersion } = await readSchema(connection);
  const images = includeImages ? await listUploads() : [];
  const createdAt = new Date();

  // Timestamps are read in UTC, and a restore writes them back in UTC.
  await connection.query("SET time_zone = '+00:00'");
  await connection.query('SET TRANSACTION ISOLATION LEVEL REPEATABLE READ');
  await connection.query('START TRANSACTION WITH CONSISTENT SNAPSHOT, READ ONLY');

  const files = {};
  const tableCounts = {};
  const tables = {};
  const archive = new ZipArchive({ zlib: { level: 6 } });
  // A warning from the archive (for example a file it cannot read) fails the backup.
  archive.on('warning', (err) => archive.destroy(err));

  const guard = createSizeGuard();
  const written = pipeline(
    archive,
    backupCrypto.createEncryptStream(keyInfo),
    guard,
    fs.createWriteStream(tempPath, { flags: 'wx' }),
    { signal }
  );

  // The archive starts reading every stream it is given at once, so entries are
  // added one at a time: each is read only when the one before it is written.
  // That keeps one batch in memory, and lets the manifest be made last.
  const filled = (async () => {
    for (const table of CONTENT_TABLES) {
      const name = `tables/${table}.ndjson`;
      const record = (rows, info) => {
        tableCounts[table] = rows;
        tables[table] = { file: name, rows, columns: columns[table] };
        files[name] = info;
      };
      await addEntry(archive, Readable.from(exportTable({ connection, table, columns: columns[table], record, signal })), { name, date: createdAt });
    }
    for (const image of images) {
      const name = `images/${image.name}`;
      const record = (info) => { files[name] = info; };
      // Photos are already compressed, so they are stored as they are.
      await addEntry(archive, Readable.from(exportImage({ image, record, signal })), { name, date: createdAt, store: true });
    }
    if (Object.keys(files).length !== CONTENT_TABLES.length + images.length) throw new BackupError(MESSAGES.generic);
    const manifest = {
      format: MANIFEST_FORMAT,
      formatVersion: MANIFEST_VERSION,
      schemaVersion,
      latestMigration: LATEST_MIGRATION,
      appVersion: APP_VERSION,
      createdAt: createdAt.toISOString(),
      kind,
      timeZone: '+00:00',
      includesImages: Boolean(includeImages),
      tables,
      tableCounts,
      imageCount: images.length,
      files,
    };
    await addEntry(archive, Readable.from([Buffer.from(JSON.stringify(manifest, null, 2), 'utf8')]), { name: 'manifest.json', date: createdAt });
    await archive.finalize();
    return manifest;
  })();
  // Any failure while filling the archive stops the whole write, and so reaches `written` too.
  filled.catch((err) => archive.destroy(err));
  const [manifest] = await Promise.all([filled, written]);
  await connection.query('COMMIT');

  return { manifest, ...guard.result() };
}

// ---------------------------------------------------------------------------
// Reading a backup file back
// ---------------------------------------------------------------------------

/** Decrypts the whole file once, checking every chunk, and hashes the file as stored. */
async function checkWholeFile(filePath, keyInfo, signal) {
  const fileHash = crypto.createHash('sha256');
  let seen = 0;
  const splitHeader = new Transform({
    transform(chunk, encoding, callback) {
      fileHash.update(chunk);
      const start = Math.max(0, backupCrypto.HEADER_BYTES - seen);
      seen += chunk.length;
      callback(null, start < chunk.length ? chunk.subarray(start) : Buffer.alloc(0));
    },
  });
  async function discard(source) {
    // eslint-disable-next-line no-unused-vars
    for await (const chunk of source) {
      if (signal && signal.aborted) throw new BackupError(MESSAGES.timeout);
    }
  }
  await pipeline(fs.createReadStream(filePath), splitHeader, backupCrypto.createDecryptStream(keyInfo), discard);
  return { sha256: fileHash.digest('hex'), sizeBytes: seen };
}

/**
 * Streams one zip entry. Returns { sha256, bytes, lines } and, with keepText, its
 * text (for the manifest). With onLine, each line is handed to it as it is read,
 * and awaited. A problem reading or decrypting becomes BackupFileError('damaged');
 * an error thrown by onLine is passed on as it is.
 */
async function readEntry(zip, entry, { keepText = false, onLine = null } = {}) {
  let stream;
  try {
    stream = await zip.openReadStreamPromise(entry);
  } catch (err) {
    throw new BackupFileError('damaged');
  }
  const hash = crypto.createHash('sha256');
  const decoder = new StringDecoder('utf8');
  const kept = [];
  let bytes = 0;
  let lines = 0;
  let rest = '';
  let lineError = null;
  try {
    for await (const chunk of stream) {
      hash.update(chunk);
      bytes += chunk.length;
      for (let i = 0; i < chunk.length; i += 1) if (chunk[i] === 0x0a) lines += 1;
      if (keepText) {
        if (bytes > MAX_MANIFEST_BYTES) throw new BackupFileError('damaged');
        kept.push(chunk);
      }
      if (onLine) {
        rest += decoder.write(chunk);
        let start = 0;
        let end = rest.indexOf('\n');
        while (end !== -1) {
          const line = rest.slice(start, end);
          start = end + 1;
          try {
            await onLine(line);
          } catch (err) {
            lineError = err;
            throw err;
          }
          end = rest.indexOf('\n', start);
        }
        rest = rest.slice(start);
      }
    }
  } catch (err) {
    stream.destroy();
    if (err === lineError || err instanceof BackupFileError || err instanceof BackupError) throw err;
    throw new BackupFileError('damaged');
  }
  // Every table file ends with a line break, so nothing may be left over.
  if (onLine && `${rest}${decoder.end()}`.length > 0) throw new BackupFileError('damaged');
  return { sha256: hash.digest('hex'), bytes, lines, text: keepText ? Buffer.concat(kept).toString('utf8') : null };
}

/**
 * A check for one table's lines: each must be a JSON object with exactly the
 * table's columns, holding only text, numbers, true/false or null. Returns the row.
 */
function rowChecker(columns) {
  const expected = [...columns].sort().join('\n');
  return (line) => {
    let row;
    try {
      row = JSON.parse(line);
    } catch (err) {
      throw new BackupFileError('rows');
    }
    if (!row || typeof row !== 'object' || Array.isArray(row)) throw new BackupFileError('rows');
    const keys = Object.keys(row);
    if (keys.length !== columns.length || keys.sort().join('\n') !== expected) throw new BackupFileError('rows');
    Object.values(row).forEach((value) => {
      if (value !== null && !['string', 'number', 'boolean'].includes(typeof value)) throw new BackupFileError('rows');
    });
    return row;
  };
}

function parseManifest(text) {
  let manifest;
  try {
    manifest = JSON.parse(text);
  } catch (err) {
    throw new BackupFileError('damaged');
  }
  if (!manifest || typeof manifest !== 'object' || manifest.format !== MANIFEST_FORMAT) throw new BackupFileError('damaged');
  if (manifest.formatVersion !== MANIFEST_VERSION) throw new BackupFileError('unsupported');
  return manifest;
}

/** A restore only accepts a backup of exactly the tables and columns this database has. */
function checkManifestAgainstSchema(manifest, schema) {
  const tables = manifest.tables && typeof manifest.tables === 'object' ? manifest.tables : {};
  const sameTables = Object.keys(tables).length === CONTENT_TABLES.length
    && CONTENT_TABLES.every((table) => tables[table] && Array.isArray(tables[table].columns)
      && tables[table].columns.join('\n') === schema.columns[table].join('\n'));
  if (manifest.schemaVersion !== schema.schemaVersion || !sameTables) throw new BackupError(MESSAGES.otherSchema, 400);
}

/**
 * Opens a backup file with its passphrase and checks all of it: the passphrase,
 * every encrypted chunk, the entry names, the manifest, and the checksum and row
 * count of every entry. With `schema` (from currentSchema()) it also refuses a
 * backup of a different database version and checks every row's columns.
 * Returns { manifest, sha256, sizeBytes, keyInfo }. Throws a BackupFileError, or
 * a BackupError for a different database version, with a plain message. Row data
 * is read only to be checked; none of it is returned.
 */
async function readAndCheckFile(filePath, passphrase, { signal, schema = null } = {}) {
  const keyInfo = await backupCrypto.openFileKey(await backupCrypto.readHeader(filePath), passphrase);
  const whole = await checkWholeFile(filePath, keyInfo, signal);

  const { zip, close } = await backupCrypto.openEncryptedZip(filePath, keyInfo);
  const found = {};
  let manifest;
  try {
    const entries = [];
    const seen = new Set();
    for await (const entry of zip.eachEntry()) {
      if (signal && signal.aborted) throw new BackupError(MESSAGES.timeout);
      const name = entry.fileName;
      const table = TABLE_ENTRY.exec(name);
      const image = IMAGE_ENTRY.exec(name);
      const allowed = name === 'manifest.json'
        || (table && CONTENT_TABLES.includes(table[1]))
        || (image && UPLOAD_NAME_PATTERN.test(image[1]));
      if (!allowed || seen.has(name)) throw new BackupFileError('damaged');
      seen.add(name);
      entries.push(entry);
    }

    // The manifest is read first, so a backup of another database version is refused before its rows are read.
    const manifestEntry = entries.find((entry) => entry.fileName === 'manifest.json');
    if (!manifestEntry) throw new BackupFileError('damaged');
    manifest = parseManifest((await readEntry(zip, manifestEntry, { keepText: true })).text);
    if (schema) checkManifestAgainstSchema(manifest, schema);

    for (const entry of entries) {
      if (entry !== manifestEntry) {
        if (signal && signal.aborted) throw new BackupError(MESSAGES.timeout);
        const table = TABLE_ENTRY.exec(entry.fileName);
        const onLine = schema && table ? rowChecker(schema.columns[table[1]]) : null;
        found[entry.fileName] = await readEntry(zip, entry, { onLine });
      }
    }
  } finally {
    await close();
  }

  const listed = manifest.files && typeof manifest.files === 'object' ? manifest.files : {};
  const names = Object.keys(found);
  if (names.length !== Object.keys(listed).length) throw new BackupFileError('damaged');
  names.forEach((name) => {
    const expected = listed[name];
    if (!expected || expected.sha256 !== found[name].sha256 || expected.bytes !== found[name].bytes) throw new BackupFileError('damaged');
  });
  Object.entries(manifest.tableCounts || {}).forEach(([table, rows]) => {
    const entry = found[`tables/${table}.ndjson`];
    if (!entry || entry.lines !== rows) throw new BackupFileError('damaged');
  });
  if (schema && !CONTENT_TABLES.every((table) => found[`tables/${table}.ndjson`])) throw new BackupError(MESSAGES.otherSchema, 400);
  const imageNames = names.filter((name) => name.startsWith('images/'));
  if (imageNames.length !== manifest.imageCount || (imageNames.length > 0 && !manifest.includesImages)) {
    throw new BackupFileError('damaged');
  }
  return { manifest, sha256: whole.sha256, sizeBytes: whole.sizeBytes, keyInfo };
}

/** The check run on every new file before it counts as a backup. */
async function verifyNewFile(tempPath, passphrase, written, signal) {
  let checked;
  try {
    checked = await readAndCheckFile(tempPath, passphrase, { signal });
  } catch (err) {
    if (err instanceof BackupError) throw err;
    throw new BackupError(MESSAGES.verify);
  }
  const sameManifest = JSON.stringify(checked.manifest) === JSON.stringify(written.manifest);
  if (!sameManifest || checked.sha256 !== written.sha256 || checked.sizeBytes !== written.sizeBytes) {
    throw new BackupError(MESSAGES.verify);
  }
}

async function syncToDisk(filePath) {
  const handle = await fsp.open(filePath, 'r+');
  try {
    await handle.sync();
  } finally {
    await handle.close();
  }
}

// ---------------------------------------------------------------------------
// Making a backup
// ---------------------------------------------------------------------------

async function runBackup({ id, connection, filename, includeImages, passphrase, kind, holdsLock }) {
  const tempPath = path.join(BACKUP_DIR, `${filename}${PARTIAL_SUFFIX}`);
  const finalPath = path.join(BACKUP_DIR, filename);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(new BackupError(MESSAGES.timeout)), TIMEOUT_MS);
  let renamed = false;
  try {
    const keyInfo = await backupCrypto.newFileKey(passphrase);
    const written = await writeArchive({ connection, tempPath, keyInfo, includeImages, kind, signal: controller.signal });
    await verifyNewFile(tempPath, passphrase, written, controller.signal);
    await syncToDisk(tempPath);
    // Only a checked file ever has the final name, so a half-written file never looks like a backup.
    await fsp.rename(tempPath, finalPath);
    renamed = true;
    await BackupRun.markSuccess(id, {
      sizeBytes: written.sizeBytes,
      sha256: written.sha256,
      tableCounts: written.manifest.tableCounts,
      imageCount: written.manifest.imageCount,
    });
    logger.info('Backup created', { id, kind, result: 'success' });
    return await BackupRun.findById(id);
  } catch (err) {
    const message = controller.signal.aborted ? MESSAGES.timeout : safeMessage(err);
    await fsp.rm(tempPath, { force: true }).catch(() => undefined);
    if (renamed) await fsp.rm(finalPath, { force: true }).catch(() => undefined);
    try {
      await BackupRun.markFailed(id, message);
    } catch (recordErr) {
      logger.error('Backup: the failure could not be recorded', { id, code: recordErr.code });
    }
    logger.error('Backup failed', { id, kind, result: 'failed', reason: message });
    throw new BackupError(message);
  } finally {
    clearTimeout(timer);
    if (holdsLock) releaseLock(connection);
    else connection.destroy();
  }
}

/**
 * Starts a backup. Resolves once it is under way (the lock is taken and its row
 * exists) with { id, done }: `done` settles when it finishes, with the finished
 * record, or rejects with a BackupError holding the safe message.
 * Throws a BackupError at once when it cannot start (busy, folder, disk space).
 * The passphrase is used for the key and then dropped; it is never stored or logged.
 *
 * kind 'automatic' claims the month's row first (see BackupRun.claimAutomatic) and
 * resolves to null when there is nothing to claim; a folder or disk problem is
 * then recorded on that row, so the page shows it.
 * kind 'pre_restore' is made by a restore, which already holds the lock and passes
 * its connection as lockConnection.
 */
async function createBackup({ kind = 'manual', includeImages = false, passphrase, periodKey = null, lockConnection = null }) {
  if (!KINDS[kind]) throw new BackupError(MESSAGES.generic);
  if (typeof passphrase !== 'string' || passphrase.length < MIN_PASSPHRASE_LENGTH) throw new BackupError(MESSAGES.generic);
  const automatic = kind === 'automatic';
  const inRestore = Boolean(lockConnection);
  if (!automatic) {
    await ensureBackupDir();
    if (!inRestore && isBusy()) throw new BackupError(MESSAGES.busy, 409);
    await checkFreeSpace(includeImages);
  }

  const connection = inRestore ? await pool.getConnection() : await acquireLock();
  const release = () => (inRestore ? connection.destroy() : releaseLock(connection));
  const filename = newFilename(kind);
  let id;
  try {
    id = automatic
      ? await BackupRun.claimAutomatic({ periodKey, filename, includesImages: includeImages, maxAttempts: AUTO_MAX_ATTEMPTS })
      : await BackupRun.insertRunning({ kind, periodKey, filename, includesImages: includeImages });
  } catch (err) {
    release();
    if (isMissingTable(err)) throw new BackupError(MESSAGES.notSetUp, 503);
    throw err;
  }
  if (!id) {
    release();
    return null;
  }
  logger.info('Backup started', { id, kind });

  if (automatic) {
    try {
      await ensureBackupDir();
      await checkFreeSpace(includeImages);
    } catch (err) {
      const message = safeMessage(err);
      await BackupRun.markFailed(id, message).catch((recordErr) => logger.error('Backup: the failure could not be recorded', { id, code: recordErr.code }));
      release();
      logger.error('Backup failed', { id, kind, result: 'failed', reason: message });
      const failed = Promise.reject(new BackupError(message));
      failed.catch(() => undefined);
      return { id, done: failed };
    }
  }

  const done = runBackup({ id, connection, filename, includeImages: Boolean(includeImages), passphrase, kind, holdsLock: !inRestore });
  return { id, done };
}

/** Deletes a backup's file and marks its record deleted. Refuses while it is running. */
async function deleteBackup(run) {
  if (run.status === 'running') throw new BackupError('This backup is still running. Wait for it to finish before deleting it.', 409);
  try {
    await removeRunFiles(run.filename);
  } catch (err) {
    if (err.code === 'EBUSY' || err.code === 'EPERM') {
      throw new BackupError('The file is in use, for example by a download. Try again in a minute.', 409);
    }
    throw err;
  }
  await BackupRun.markDeleted(run.id);
  logger.info('Backup deleted', { id: run.id, kind: run.kind, result: 'success' });
}

/**
 * At start-up: a run still marked running was cut off by a crash or restart. It
 * is marked failed and its partial file removed, along with any other stray
 * partial file. Skipped while another server holds the lock (it may be mid-backup).
 */
async function recoverInterruptedRuns() {
  if (folderIsUnsafe()) {
    logger.error('Backups are switched off: BACKUP_DIR is inside a folder the website serves. Set it to a folder outside the website.');
    return;
  }
  let connection;
  try {
    connection = await pool.getConnection();
    const [[row]] = await connection.query('SELECT GET_LOCK(?, 0) AS got', [LOCK_NAME]);
    if (Number(row.got) !== 1) {
      logger.info('Backup clean-up skipped: another server is running a backup or restore.');
      return;
    }
    const runs = await BackupRun.findRunning();
    for (const run of runs) {
      await removeRunFiles(run.filename);
      await BackupRun.markFailed(run.id, MESSAGES.interrupted);
      logger.warn('Backup marked failed after a restart', { id: run.id, kind: run.kind, result: 'failed' });
    }
    let names = [];
    try {
      names = await fsp.readdir(BACKUP_DIR);
    } catch (err) {
      if (err.code !== 'ENOENT') throw err;
    }
    await removeOldUploads();
    for (const name of names) {
      if (name.endsWith(PARTIAL_SUFFIX) && STORED_NAME.test(name.slice(0, -PARTIAL_SUFFIX.length))) {
        await fsp.rm(path.join(BACKUP_DIR, name), { force: true });
      }
    }
  } catch (err) {
    if (isMissingTable(err)) logger.warn('Backups are not set up yet: run migration 006_backups.sql.');
    else logger.error('Backup clean-up at start-up failed', { code: err.code });
  } finally {
    if (connection) connection.destroy();
  }
}

// ---------------------------------------------------------------------------
// Download tickets: single use, 60 seconds, kept only on the server.
// Only a hash of the ticket is stored. With Redis they are shared between copies
// of the server; without it they live in this process's memory.
// ---------------------------------------------------------------------------
const TICKET_TTL_MS = 60 * 1000;
const TICKET_PATTERN = /^[A-Za-z0-9_-]{43}$/;
const localTickets = new Map();

const ticketKey = (ticket) => crypto.createHash('sha256').update(ticket).digest('hex');
const redisTicketKey = (key) => `${redis.PREFIX}backup-ticket:${key}`;

function pruneTickets() {
  const now = Date.now();
  localTickets.forEach((value, key) => {
    if (value.expiresAt <= now) localTickets.delete(key);
  });
}

async function issueTicket(runId) {
  const ticket = crypto.randomBytes(32).toString('base64url');
  const key = ticketKey(ticket);
  const value = { runId, expiresAt: Date.now() + TICKET_TTL_MS };
  const client = redis.getClient();
  let shared = false;
  if (client) {
    try {
      await client.set(redisTicketKey(key), JSON.stringify(value), 'PX', TICKET_TTL_MS);
      redis.reportSuccess();
      shared = true;
    } catch (err) {
      redis.reportFailure(err);
    }
  }
  if (!shared) {
    pruneTickets();
    localTickets.set(key, value);
  }
  return { ticket, expiresInSeconds: TICKET_TTL_MS / 1000 };
}

/** The run id the ticket was issued for, or null. A ticket works once, then never again. */
async function redeemTicket(ticket) {
  if (!TICKET_PATTERN.test(String(ticket))) return null;
  const key = ticketKey(ticket);
  let value = localTickets.get(key) || null;
  if (value) localTickets.delete(key);
  const client = redis.getClient();
  if (!value && client) {
    try {
      const raw = await client.getdel(redisTicketKey(key));
      redis.reportSuccess();
      value = raw ? JSON.parse(raw) : null;
    } catch (err) {
      redis.reportFailure(err);
    }
  }
  if (!value || value.expiresAt <= Date.now()) return null;
  return value.runId;
}

// ---------------------------------------------------------------------------
// Keeping only the newest backups of one kind
// ---------------------------------------------------------------------------

/** Deletes the finished backups of `kind` beyond the newest `keep`. Manual backups are never passed here. */
async function pruneKept(kind, keep) {
  const kept = await BackupRun.listKept(kind);
  for (const run of kept.slice(keep)) {
    await deleteBackup(run);
  }
}

// ---------------------------------------------------------------------------
// Restore
//
// 1. A file is uploaded (or a saved backup is chosen): a restore session of 15
//    minutes is opened. Nothing is applied.
// 2. inspect: the file is checked in full with its passphrase, against this
//    database's tables and columns. Only a summary is returned.
// 3. apply: after the route has checked the admin password and the typed RESTORE,
//    the lock is taken, a safety backup of the current data is made (kind
//    pre_restore), then every content table is replaced inside ONE transaction.
//    Any error rolls all of it back. The admins table is never touched.
//    Then images are added (never overwriting a file), and every cache is cleared.
//
// Sessions and restore progress are kept in this server's memory. With several
// copies of the server, one restore has to reach the same copy each time.
// ---------------------------------------------------------------------------
const RESTORE_DIR = path.join(BACKUP_DIR, 'restore-uploads');
const SESSION_TTL_MS = 15 * 60 * 1000;
const JOB_KEEP_MS = 60 * 60 * 1000;
const PRE_RESTORE_KEEP = 3;
const INSERT_BATCH = 500;
const RANDOM_ID = /^[a-f0-9]{32}$/;

const sessions = new Map();
const jobs = new Map();

/** A restore stopped before anything was changed, or rolled back. Its message is final. */
class RestoreStop extends Error {}

/** The folder that holds uploaded restore files for their 15 minutes. Inside BACKUP_DIR, so never served. */
async function restoreUploadDir() {
  await ensureBackupDir();
  await fsp.mkdir(RESTORE_DIR, { recursive: true });
  return RESTORE_DIR;
}

async function removeUpload(filePath) {
  if (!filePath || !isInside(RESTORE_DIR, filePath) || path.resolve(filePath) === path.resolve(RESTORE_DIR)) return;
  await fsp.rm(filePath, { force: true }).catch((err) => logger.warn('Restore: an uploaded file could not be removed', { code: err.code }));
}

/** Removes uploaded files older than a session, for example after a crash. */
async function removeOldUploads() {
  let names = [];
  try {
    names = await fsp.readdir(RESTORE_DIR);
  } catch (err) {
    if (err.code === 'ENOENT') return;
    throw err;
  }
  const cutoff = Date.now() - SESSION_TTL_MS;
  for (const name of names) {
    const filePath = path.join(RESTORE_DIR, name);
    const stats = await fsp.stat(filePath).catch(() => null);
    if (stats && stats.isFile() && stats.mtimeMs < cutoff && ![...sessions.values()].some((s) => s.filePath === filePath)) {
      await removeUpload(filePath);
    }
  }
}

function pruneSessions() {
  const now = Date.now();
  sessions.forEach((session, id) => {
    if (session.expiresAt <= now && !session.busy) {
      sessions.delete(id);
      if (session.temporary) removeUpload(session.filePath);
    }
  });
  jobs.forEach((job, id) => {
    if (job.finishedAt && job.finishedAt + JOB_KEEP_MS <= now) jobs.delete(id);
  });
}
setInterval(pruneSessions, 60 * 1000).unref();

function publicSession(session) {
  return {
    sessionId: session.id,
    source: session.source,
    backupId: session.backupId || null,
    expiresAt: new Date(session.expiresAt).toISOString(),
  };
}

function openSession(fields) {
  pruneSessions();
  const session = {
    ...fields,
    id: crypto.randomBytes(16).toString('hex'),
    expiresAt: Date.now() + SESSION_TTL_MS,
    summary: null,
    busy: false,
  };
  sessions.set(session.id, session);
  return publicSession(session);
}

/** A restore session for a file just uploaded. The file must at least start like a backup. */
async function openUploadSession(adminId, filePath) {
  try {
    backupCrypto.checkHeader(await backupCrypto.readHeader(filePath));
  } catch (err) {
    await removeUpload(filePath);
    throw err instanceof BackupFileError ? err : new BackupFileError('not_backup');
  }
  logger.info('Restore file uploaded', { result: 'success' });
  return openSession({ adminId, filePath, temporary: true, source: 'upload' });
}

/** A restore session for a backup saved on the server. The same checks and confirmations follow. */
async function openSavedSession(adminId, run) {
  if (run.status !== 'success' || !(await fileExists(run.filename))) {
    throw new BackupError('That backup cannot be restored. Reload the page and try again.', 404);
  }
  return openSession({ adminId, filePath: storedPath(run.filename), temporary: false, source: 'saved', backupId: run.id });
}

function findSession(sessionId, adminId) {
  const session = RANDOM_ID.test(String(sessionId)) ? sessions.get(sessionId) : null;
  if (!session || session.adminId !== adminId || session.expiresAt <= Date.now()) {
    throw new BackupError(MESSAGES.sessionEnded, 410);
  }
  return session;
}

async function cancelSession(sessionId, adminId) {
  const session = findSession(sessionId, adminId);
  if (session.busy) throw new BackupError(MESSAGES.restoreBusy, 409);
  sessions.delete(session.id);
  if (session.temporary) await removeUpload(session.filePath);
}

/** This database's content tables, their columns and its schema version. */
async function currentSchema() {
  const connection = await pool.getConnection();
  try {
    return await readSchema(connection);
  } finally {
    connection.release();
  }
}

function summarize(manifest, sizeBytes) {
  const counts = manifest.tableCounts || {};
  return {
    createdAt: manifest.createdAt,
    kind: manifest.kind,
    appVersion: manifest.appVersion,
    schemaVersion: manifest.schemaVersion,
    tableCounts: counts,
    tableCount: Object.keys(counts).length,
    totalRows: Object.values(counts).reduce((sum, rows) => sum + (Number(rows) || 0), 0),
    includesImages: Boolean(manifest.includesImages),
    imageCount: Number(manifest.imageCount) || 0,
    sizeBytes,
  };
}

/** Any other error while reading a restore file is reported as a damaged file. */
function asFileError(err) {
  if (err instanceof BackupFileError || err instanceof BackupError || isMissingTable(err)) return err;
  return new BackupFileError('damaged');
}

/** Checks the session's file with its passphrase. Returns the summary; never any row data. */
async function inspectSession(sessionId, adminId, passphrase) {
  const session = findSession(sessionId, adminId);
  if (session.busy) throw new BackupError(MESSAGES.restoreBusy, 409);
  session.busy = true;
  try {
    const checked = await readAndCheckFile(session.filePath, passphrase, { schema: await currentSchema() });
    session.summary = summarize(checked.manifest, checked.sizeBytes);
    logger.info('Restore file checked', { source: session.source, result: 'success' });
    return session.summary;
  } catch (err) {
    const problem = asFileError(err);
    logger.warn('Restore file check failed', { source: session.source, result: 'failed', reason: problem.reason || 'other' });
    // Only a wrong passphrase can be put right with the same file. Any other problem ends the session and removes the upload.
    if (problem.reason !== 'wrong_passphrase') {
      problem.fileRejected = true;
      sessions.delete(session.id);
      if (session.temporary) await removeUpload(session.filePath);
    }
    throw problem;
  } finally {
    session.busy = false;
  }
}

/** Replaces every content table with the file's rows, in one transaction. Throws (after rolling back) on any error. */
async function applyTables(filePath, keyInfo, schema) {
  const connection = await pool.getConnection();
  let zipFile = null;
  try {
    zipFile = await backupCrypto.openEncryptedZip(filePath, keyInfo);
    const entries = [];
    for await (const entry of zipFile.zip.eachEntry()) entries.push(entry);

    // Timestamps were written in UTC. Foreign keys are checked off for this connection only,
    // so the tables can be emptied and filled in any order; the data came from a database that had them.
    await connection.query("SET time_zone = '+00:00'");
    await connection.query('SET FOREIGN_KEY_CHECKS = 0');
    await connection.query('START TRANSACTION');

    // The automatic backup settings stay as they are now, so a restore never switches them.
    const [keptSettings] = await connection.query(
      'SELECT setting_key, setting_value FROM site_settings WHERE setting_key LIKE ?',
      ['backup\\_%']
    );
    for (const table of [...CONTENT_TABLES].reverse()) {
      await connection.query('DELETE FROM ??', [table]);
    }
    for (const table of CONTENT_TABLES) {
      const entry = entries.find((candidate) => candidate.fileName === `tables/${table}.ndjson`);
      if (!entry) throw new BackupFileError('damaged');
      const columns = schema.columns[table];
      const check = rowChecker(columns);
      let batch = [];
      const flush = async () => {
        if (batch.length === 0) return;
        await connection.query('INSERT INTO ?? (??) VALUES ?', [table, columns, batch]);
        batch = [];
      };
      await readEntry(zipFile.zip, entry, {
        onLine: async (line) => {
          const row = check(line);
          batch.push(columns.map((column) => row[column]));
          if (batch.length >= INSERT_BATCH) await flush();
        },
      });
      await flush();
    }
    for (const setting of keptSettings) {
      await connection.query(
        'INSERT INTO site_settings (setting_key, setting_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)',
        [setting.setting_key, setting.setting_value]
      );
    }
    await connection.query('COMMIT');
  } catch (err) {
    await connection.query('ROLLBACK').catch(() => undefined);
    throw err;
  } finally {
    await connection.query('SET FOREIGN_KEY_CHECKS = 1').catch(() => undefined);
    connection.destroy();
    if (zipFile) await zipFile.close();
  }
}

/**
 * Adds the backup's images to the uploads folder. Only names made by the upload
 * route are accepted (32 hex characters and .jpg, .png or .webp: no folders, no
 * ".."), every path is checked to be directly inside the uploads folder, an
 * existing file is never overwritten, and the total is capped.
 * Returns { written, skipped }.
 */
async function extractImages(filePath, keyInfo, manifest) {
  const uploadRoot = path.resolve(UPLOAD_DIR);
  const listed = Object.entries(manifest.files || {}).filter(([name]) => name.startsWith('images/'));
  const total = listed.reduce((sum, [, info]) => sum + (Number(info.bytes) || 0), 0);
  if (total > MAX_BYTES) throw new BackupError(MESSAGES.imagesTooLarge);
  await fsp.mkdir(uploadRoot, { recursive: true });
  const free = await freeDiskBytes(uploadRoot);
  if (free !== null && free < total + FREE_SPACE_MARGIN) throw new BackupError(MESSAGES.noSpace);

  const { zip, close } = await backupCrypto.openEncryptedZip(filePath, keyInfo);
  let written = 0;
  let skipped = 0;
  let bytes = 0;
  try {
    for await (const entry of zip.eachEntry()) {
      const match = IMAGE_ENTRY.exec(entry.fileName);
      const name = match ? match[1] : '';
      const target = path.join(uploadRoot, name);
      if (match && UPLOAD_NAME_PATTERN.test(name) && path.dirname(target) === uploadRoot) {
        bytes += entry.uncompressedSize;
        if (bytes > total) throw new BackupFileError('damaged');
        let handle = null;
        try {
          handle = await fsp.open(target, 'wx');
        } catch (err) {
          if (err.code !== 'EEXIST') throw err;
          skipped += 1;
        }
        if (handle) {
          try {
            await pipeline(await zip.openReadStreamPromise(entry), handle.createWriteStream());
            written += 1;
          } catch (err) {
            await fsp.rm(target, { force: true }).catch(() => undefined);
            throw err;
          }
        }
      }
    }
  } finally {
    await close();
  }
  return { written, skipped };
}

function publicJob(job) {
  return {
    jobId: job.id,
    status: job.status,
    step: job.step,
    message: job.message,
    preRestoreId: job.preRestoreId,
    images: job.images,
  };
}

async function runRestore({ session, job, lock, passphrase, restoreImages }) {
  try {
    const schema = await currentSchema();
    let checked;
    try {
      checked = await readAndCheckFile(session.filePath, passphrase, { schema });
    } catch (err) {
      throw new RestoreStop(`${asFileError(err).message} Nothing was changed.`);
    }

    job.step = 'safety';
    try {
      const safety = await createBackup({ kind: 'pre_restore', includeImages: false, passphrase, lockConnection: lock });
      job.preRestoreId = safety.id;
      await safety.done;
    } catch (err) {
      throw new RestoreStop(`The safety backup of the current data could not be made, so nothing was changed. ${safeMessage(err)}`);
    }

    job.step = 'data';
    try {
      await applyTables(session.filePath, checked.keyInfo, schema);
    } catch (err) {
      logger.error('Restore: the database changes were rolled back', { code: err.code, reason: err instanceof BackupFileError ? err.reason : 'database' });
      throw new RestoreStop('The restore could not be completed, so nothing was changed. The website data is as it was before.');
    }

    // The public site shows the restored content on its next request, on every server.
    await cache.invalidate(...cache.CONTENT_PREFIXES);

    let imageNote = '';
    if (restoreImages && checked.manifest.includesImages) {
      job.step = 'images';
      try {
        job.images = await extractImages(session.filePath, checked.keyInfo, checked.manifest);
      } catch (err) {
        imageNote = ' The images could not all be restored.';
        logger.error('Restore: images could not all be written', { code: err.code });
      }
    }
    await pruneKept('pre_restore', PRE_RESTORE_KEEP).catch((err) => logger.error('Restore: old safety backups could not be removed', { code: err.code }));

    job.status = 'success';
    job.message = `The backup has been restored. A safety backup of the data from before the restore is in the list as "Before restore".${imageNote}`;
    logger.info('Backup restored', {
      source: session.source,
      result: 'success',
      imagesWritten: job.images ? job.images.written : 0,
      imagesSkipped: job.images ? job.images.skipped : 0,
    });
  } catch (err) {
    job.status = 'failed';
    job.message = err instanceof RestoreStop ? err.message : 'The restore could not be completed, so nothing was changed.';
    logger.error('Restore failed', { source: session.source, result: 'failed', step: job.step });
  } finally {
    job.finishedAt = Date.now();
    session.busy = false;
    // After a failure nothing has changed, so the same file may be tried again while its session lasts.
    if (job.status === 'success') {
      sessions.delete(session.id);
      if (session.temporary) await removeUpload(session.filePath);
    }
    releaseLock(lock);
  }
}

/**
 * Starts a restore. The route has already checked the admin password and the
 * typed RESTORE. Refuses at once when the session has ended, has not been
 * checked, the passphrase is wrong, or a backup or restore is running.
 * Returns the job; GET .../restore/jobs/:id follows it.
 */
async function startRestore({ sessionId, adminId, passphrase, restoreImages }) {
  const session = findSession(sessionId, adminId);
  if (!session.summary) throw new BackupError(MESSAGES.notInspected, 400);
  if (session.busy) throw new BackupError(MESSAGES.restoreBusy, 409);
  await ensureBackupDir();
  // A quick check of the passphrase against the header, so a typing mistake is answered at once.
  try {
    await backupCrypto.openFileKey(await backupCrypto.readHeader(session.filePath), passphrase);
  } catch (err) {
    throw asFileError(err);
  }
  const lock = await acquireLock();
  session.busy = true;
  const job = {
    id: crypto.randomBytes(16).toString('hex'),
    adminId,
    status: 'running',
    step: 'checking',
    message: '',
    preRestoreId: null,
    images: null,
    finishedAt: null,
  };
  jobs.set(job.id, job);
  logger.info('Restore started', { source: session.source });
  runRestore({ session, job, lock, passphrase, restoreImages: Boolean(restoreImages) });
  return publicJob(job);
}

function getJob(jobId, adminId) {
  const job = RANDOM_ID.test(String(jobId)) ? jobs.get(jobId) : null;
  if (!job || job.adminId !== adminId) throw new BackupError('That restore is not known to the server. Reload the page to see the list of backups.', 404);
  return publicJob(job);
}

// ---------------------------------------------------------------------------
// Automatic monthly backup
// ---------------------------------------------------------------------------
const AUTO_MAX_ATTEMPTS = 3;
const KEEP_MIN = 2;
const KEEP_MAX = 24;
const HOUR_MS = 60 * 60 * 1000;
const RECENT_MS = 35 * 24 * HOUR_MS;

function clampKeep(value) {
  const number = Number(value);
  return Number.isInteger(number) && number >= KEEP_MIN && number <= KEEP_MAX ? number : null;
}
const DEFAULT_KEEP = clampKeep(process.env.BACKUP_KEEP_AUTO) || 6;

/** BACKUP_PASSPHRASE when it is set and long enough, otherwise null. Never logged or sent anywhere. */
function autoPassphrase() {
  const value = process.env.BACKUP_PASSPHRASE || '';
  return value.length >= MIN_PASSPHRASE_LENGTH ? value : null;
}

const toPeriodKey = (date) => date.toISOString().slice(0, 7);

/** { enabled, keep, includeImages } from site_settings. */
async function getAutoSettings() {
  const [rows] = await pool.query(
    "SELECT setting_key, setting_value FROM site_settings WHERE setting_key IN ('backup_auto_enabled', 'backup_keep_auto', 'backup_auto_images')"
  );
  const values = {};
  rows.forEach((row) => { values[row.setting_key] = row.setting_value; });
  return {
    enabled: values.backup_auto_enabled === '1',
    keep: clampKeep(values.backup_keep_auto) || DEFAULT_KEEP,
    includeImages: values.backup_auto_images === '1',
  };
}

async function saveAutoSettings({ enabled, keep, includeImages }) {
  if (enabled && !autoPassphrase()) throw new BackupError(MESSAGES.noAutoPassphrase, 400);
  const pairs = [
    ['backup_auto_enabled', enabled ? '1' : '0'],
    ['backup_keep_auto', String(clampKeep(keep) || DEFAULT_KEEP)],
    ['backup_auto_images', includeImages ? '1' : '0'],
  ];
  for (const [key, value] of pairs) {
    await pool.query(
      'INSERT INTO site_settings (setting_key, setting_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)',
      [key, value]
    );
  }
  logger.info('Automatic backup settings saved', { enabled: Boolean(enabled), keep: Number(pairs[1][1]), includeImages: Boolean(includeImages) });
}

/** When the next automatic backup is expected: { at (ISO or null), soon, running } or null when it is off. */
function nextAutomaticRun(now, settings, row) {
  if (!settings.enabled || !autoPassphrase()) return null;
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth();
  const nextMonth = new Date(Date.UTC(year, month + 1, 1, 2, 0, 0)).toISOString();
  const dueFrom = new Date(Date.UTC(year, month, 1, 2, 0, 0));
  if (row && (row.status === 'success' || (row.status === 'failed' && row.attempts >= AUTO_MAX_ATTEMPTS))) {
    return { at: nextMonth, soon: false, running: false };
  }
  if (now < dueFrom) return { at: dueFrom.toISOString(), soon: false, running: false };
  if (row && row.status === 'running') return { at: null, soon: true, running: true };
  if (row && row.status === 'failed') {
    const retry = Date.parse(row.startedAt) + HOUR_MS;
    if (retry > now.getTime()) return { at: new Date(retry).toISOString(), soon: false, running: false };
  }
  return { at: null, soon: true, running: false };
}

/** Everything the "Automatic monthly backup" panel shows. */
async function autoStatus(now = new Date()) {
  const settings = await getAutoSettings();
  const row = await BackupRun.findAutomaticPeriod(toPeriodKey(now));
  const last = await BackupRun.latestFinishedAutomatic();
  return {
    ...settings,
    keepLimits: { min: KEEP_MIN, max: KEEP_MAX },
    passphraseSet: Boolean(autoPassphrase()),
    next: nextAutomaticRun(now, settings, row),
    lastResult: last ? {
      status: last.status,
      startedAt: last.startedAt,
      finishedAt: last.finishedAt,
      errorMessage: last.errorMessage,
      attempts: last.attempts,
    } : null,
  };
}

/** A short email to ADMIN_NOTIFICATION_EMAIL when email is set up. No personal data. */
async function notifyAutomaticFailure(periodKey, message) {
  const row = await BackupRun.findAutomaticPeriod(periodKey).catch(() => null);
  const attempts = row ? row.attempts : 1;
  const next = attempts < AUTO_MAX_ATTEMPTS
    ? `It will be tried again in about an hour (attempt ${attempts} of ${AUTO_MAX_ATTEMPTS}).`
    : `It has been tried ${AUTO_MAX_ATTEMPTS} times and will not be tried again until next month.`;
  try {
    await mailer.sendMail({
      subject: 'The automatic website backup did not finish',
      text: [
        `The automatic monthly backup of the Royal Temple Worship Centre website for ${periodKey} did not finish.`,
        '',
        `Reason: ${message}`,
        '',
        next,
        '',
        'Sign in to the website admin and open Backups for details, or make a backup by hand there.',
      ].join('\n'),
    });
  } catch (err) {
    logger.error('Automatic backup: the failure email could not be sent', { code: err.code });
  }
}

/**
 * Called once an hour by jobs/backupScheduler.js (and by tests with a made-up
 * `now`). Makes this month's automatic backup when it is due: the switch is on,
 * BACKUP_PASSPHRASE is set, it is 02:00 UTC on the 1st or later, and no automatic
 * backup has succeeded this month. A failed month is tried again once an hour,
 * at most 3 times. The claim on the month's row means that of several servers
 * exactly one makes it. Returns a word saying what happened: success, failed,
 * done, running, not_due, not_claimed, gave_up, busy, off, no_passphrase or not_set_up.
 */
async function runAutomaticIfDue(now = new Date()) {
  const passphrase = autoPassphrase();
  if (!passphrase) return 'no_passphrase';
  let settings;
  try {
    settings = await getAutoSettings();
  } catch (err) {
    if (isMissingTable(err)) return 'not_set_up';
    throw err;
  }
  if (!settings.enabled) return 'off';
  if (now.getUTCDate() === 1 && now.getUTCHours() < 2) return 'not_due';

  const periodKey = toPeriodKey(now);
  const row = await BackupRun.findAutomaticPeriod(periodKey);
  if (row && row.status !== 'failed') return row.status === 'running' ? 'running' : 'done';
  if (row && row.attempts >= AUTO_MAX_ATTEMPTS) return 'gave_up';
  if (isBusy()) return 'busy';

  let started;
  try {
    started = await createBackup({ kind: 'automatic', includeImages: settings.includeImages, passphrase, periodKey });
  } catch (err) {
    if (err instanceof BackupError && err.status === 409) return 'busy';
    throw err;
  }
  // Another server claimed it, or the last try was less than an hour ago.
  if (!started) return 'not_claimed';
  try {
    await started.done;
  } catch (err) {
    await notifyAutomaticFailure(periodKey, err.message);
    return 'failed';
  }
  await pruneKept('automatic', settings.keep);
  return 'success';
}

// ---------------------------------------------------------------------------
// The state of backups, for the dashboard, the Backups page and Site status
// ---------------------------------------------------------------------------
const HEALTH_LABELS = { ok: 'OK', needs_attention: 'Needs attention', not_set_up: 'Not set up' };

async function healthSummary(now = new Date()) {
  let folderProblem = '';
  try {
    await ensureBackupDir();
  } catch (err) {
    folderProblem = err.message;
  }
  let summary;
  let settings;
  let lastAuto;
  try {
    [summary, settings, lastAuto] = await Promise.all([BackupRun.summary(), getAutoSettings(), BackupRun.latestFinishedAutomatic()]);
  } catch (err) {
    if (!isMissingTable(err)) throw err;
    return { status: 'not_set_up', label: HEALTH_LABELS.not_set_up, message: MESSAGES.notSetUp, latest: null, lastDownloadAt: null, downloadNotice: false };
  }

  const recent = (iso) => Boolean(iso) && now.getTime() - Date.parse(iso) <= RECENT_MS;
  const { latest } = summary;
  const autoFailedLast = lastAuto && lastAuto.status === 'failed'
    && (!latest || Date.parse(lastAuto.startedAt) > Date.parse(latest.startedAt));

  let status = 'ok';
  let message = 'A backup was made in the last 35 days.';
  if (folderProblem) {
    status = 'needs_attention';
    message = folderProblem;
  } else if (settings.enabled && !autoPassphrase()) {
    status = 'needs_attention';
    message = MESSAGES.autoOnNoPassphrase;
  } else if (autoFailedLast) {
    status = 'needs_attention';
    message = `The last automatic backup did not finish. ${lastAuto.errorMessage || ''} Make a backup on the Backups page, or wait for the next try.`.replace(/\s+/g, ' ').trim();
  } else if (!latest && !settings.enabled) {
    status = 'not_set_up';
    message = 'No backup has been made yet. Make one on the Backups page, or switch on the automatic monthly backup there.';
  } else if (!latest) {
    status = 'needs_attention';
    message = 'No backup has finished yet. Make one on the Backups page.';
  } else if (!recent(latest.startedAt)) {
    status = 'needs_attention';
    message = 'The newest backup is more than 35 days old. Make a new one on the Backups page.';
  }

  return {
    status,
    label: HEALTH_LABELS[status],
    message,
    latest: latest ? { id: latest.id, kind: latest.kind, startedAt: latest.startedAt, fileAvailable: await fileExists(latest.filename) } : null,
    lastDownloadAt: summary.lastDownloadAt,
    downloadNotice: !recent(summary.lastDownloadAt),
  };
}

module.exports = {
  BackupError,
  BackupFileError,
  MESSAGES,
  MAX_BYTES,
  MIN_PASSPHRASE_LENGTH,
  CONTENT_TABLES,
  createBackup,
  deleteBackup,
  recoverInterruptedRuns,
  readAndCheckFile,
  ensureBackupDir,
  freeDiskBytes,
  uploadsSummary,
  fileExists,
  storedPath,
  downloadName,
  issueTicket,
  redeemTicket,
  isBusy,
  isMissingTable,
  restoreUploadDir,
  openUploadSession,
  openSavedSession,
  cancelSession,
  inspectSession,
  startRestore,
  getJob,
  removeUpload,
  getAutoSettings,
  saveAutoSettings,
  autoStatus,
  runAutomaticIfDue,
  healthSummary,
  AUTO_MAX_ATTEMPTS,
};
