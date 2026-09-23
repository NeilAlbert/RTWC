/**
 * =============================================================================
 * MySQL connection pool (mysql2) — SSL-enabled for Aiven.
 *
 * - Uses connection pooling (10 connections by default).
 * - SSL is ALWAYS enabled (Aiven requires it). If DB_SSL_CA is provided, the
 *   Aiven CA certificate is pinned; otherwise rejectUnauthorized: true is used
 *   against the system CA store.
 * - dateStrings keeps DATE/DATETIME values as plain strings so the API returns
 *   dates like "2026-08-28" instead of timezone-shifted Date objects.
 * =============================================================================
 */
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

const sslCaPath = process.env.DB_SSL_CA;

let ssl;
if (sslCaPath) {
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
