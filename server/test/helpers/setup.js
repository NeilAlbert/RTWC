/**
 * test/helpers/setup.js: required first by every test file, before the app.
 *
 * - The database is TEST_DB_NAME. It must contain "test", or the tests stop
 *   before connecting. DB_NAME is never read: it is overwritten with TEST_DB_NAME
 *   here, and server.js does not load server/.env when NODE_ENV is "test".
 * - Connection settings come from the environment (CI), then server/.env.test,
 *   then, for DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_SSL and DB_SSL_CA only,
 *   server/.env. Nothing else in server/.env is used.
 * - resetDatabase() drops and recreates TEST_DB_NAME from schema.sql, so every
 *   test file starts from an empty database. dropDatabase() removes it.
 * - No email leaves the computer: nodemailer is replaced by a stub that records
 *   each message in `sentMail`.
 * - Redis, Facebook, YouTube and automatic backups are switched off.
 */
const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
const path = require('path');
const dotenv = require('dotenv');

const SERVER_DIR = path.join(__dirname, '..', '..');
const CONNECTION_KEYS = ['DB_HOST', 'DB_PORT', 'DB_USER', 'DB_PASSWORD', 'DB_SSL', 'DB_SSL_CA'];

function readEnvFile(name) {
  const file = path.join(SERVER_DIR, name);
  return fs.existsSync(file) ? dotenv.parse(fs.readFileSync(file)) : {};
}

const testFile = readEnvFile('.env.test');
const mainFile = readEnvFile('.env');

const TEST_DB_NAME = process.env.TEST_DB_NAME || testFile.TEST_DB_NAME || '';
if (!/test/i.test(TEST_DB_NAME) || !/^[A-Za-z0-9_]+$/.test(TEST_DB_NAME)) {
  // eslint-disable-next-line no-console
  console.error('The tests will not run: set TEST_DB_NAME to a throwaway database whose name contains "test" (letters, numbers and _ only). See server/.env.test.example.');
  process.exit(1);
}

CONNECTION_KEYS.forEach((key) => {
  if (process.env[key] !== undefined) return;
  if (testFile[key] !== undefined) process.env[key] = testFile[key];
  else if (mainFile[key] !== undefined) process.env[key] = mainFile[key];
});

const backupDir = fs.mkdtempSync(path.join(os.tmpdir(), 'rtwc-test-backups-'));

Object.assign(process.env, {
  NODE_ENV: 'test',
  DB_NAME: TEST_DB_NAME,
  JWT_SECRET: crypto.randomBytes(48).toString('hex'),
  // Each request names its own address in X-Forwarded-For, so the rate limits can be tested apart.
  TRUST_PROXY_HOPS: '1',
  CORS_ORIGIN: '',
  REDIS_ENABLED: 'false',
  REDIS_URL: '',
  EMAIL_HOST: 'smtp.test.invalid',
  EMAIL_PORT: '465',
  EMAIL_USER: 'website@test.invalid',
  EMAIL_PASSWORD: 'not-a-real-password',
  ADMIN_NOTIFICATION_EMAIL: 'office@test.invalid',
  PAGE_ID: '',
  FB_PAGE_ACCESS_TOKEN: '',
  YOUTUBE_API_KEY: '',
  BACKUP_DIR: backupDir,
  BACKUP_PASSPHRASE: '',
});

// The mail stub. mailer.js creates its transport on the first email, so this
// must be in place before any request; requiring this file first makes sure of it.
const nodemailer = require('nodemailer');

const sentMail = [];
nodemailer.createTransport = () => ({
  sendMail: async (message) => {
    sentMail.push(message);
    return { messageId: `stub-${sentMail.length}` };
  },
  verify: async () => true,
});

const mysql = require('mysql2/promise');

function sslOption() {
  if (String(process.env.DB_SSL).toLowerCase() === 'false') return undefined;
  if (process.env.DB_SSL_CA) {
    return { rejectUnauthorized: true, ca: fs.readFileSync(path.resolve(SERVER_DIR, process.env.DB_SSL_CA)).toString() };
  }
  return { rejectUnauthorized: true };
}

function adminConnection() {
  return mysql.createConnection({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    ssl: sslOption(),
    multipleStatements: true,
    charset: 'utf8mb4',
  });
}

/** Drops TEST_DB_NAME if it exists and creates it again from schema.sql. */
async function resetDatabase() {
  const connection = await adminConnection();
  try {
    await connection.query(`DROP DATABASE IF EXISTS \`${TEST_DB_NAME}\``);
    await connection.query(`CREATE DATABASE \`${TEST_DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    await connection.query(`USE \`${TEST_DB_NAME}\``);
    await connection.query(fs.readFileSync(path.join(SERVER_DIR, 'schema.sql'), 'utf8'));
  } finally {
    await connection.end();
  }
}

/** Removes TEST_DB_NAME and the temporary backup folder. */
async function dropDatabase() {
  const connection = await adminConnection();
  try {
    await connection.query(`DROP DATABASE IF EXISTS \`${TEST_DB_NAME}\``);
  } finally {
    await connection.end();
  }
  fs.rmSync(backupDir, { recursive: true, force: true });
}

module.exports = { TEST_DB_NAME, sentMail, resetDatabase, dropDatabase };
