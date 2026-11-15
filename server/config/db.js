/**
 * =============================================================================
 * MySQL connection pool (mysql2) — SSL-enabled for Aiven.
 *
 * - Uses connection pooling (10 connections by default).
 * - SSL is enabled unless DB_SSL=false (Aiven requires it). If DB_SSL_CA is
 *   provided, the Aiven CA certificate is pinned; otherwise rejectUnauthorized:
 *   true is used against the system CA store.
 * - DB_SSL=false is only for a MySQL server on this same computer, which has no
 *   certificate a client can verify. Never use it for a hosted database.
 * - dateStrings keeps DATE/DATETIME values as plain strings so the API returns
 *   dates like "2026-08-28" instead of timezone-shifted Date objects.
 * =============================================================================
 */
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

const sslCaPath = process.env.DB_SSL_CA;

let ssl;
if (String(process.env.DB_SSL).toLowerCase() === 'false') {
  ssl = undefined;
} else if (sslCaPath) {
  const absoluteCaPath = path.resolve(__dirname, '..', sslCaPath);
  try {
    ssl = {
      rejectUnauthorized: true,
      ca: fs.readFileSync(absoluteCaPath).toString(),
    };
  } catch (err) {
    // Fail fast with a clear message instead of a cryptic pool error later.
    throw new Error(`Could not read DB_SSL_CA certificate at ${absoluteCaPath}: ${err.message}`);
  }
} else {
  ssl = { rejectUnauthorized: true };
}

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  charset: 'utf8mb4',
  dateStrings: true,
  ssl,
});

module.exports = pool;
