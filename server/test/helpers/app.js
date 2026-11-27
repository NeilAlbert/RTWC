/**
 * test/helpers/app.js: starts the real app on a free port against the test
 * database, and small helpers for requests and test data.
 *
 * Usage, in a test file:
 *   const { start, stop, request, createAdmin } = require('./helpers/app');
 *   before(start); after(stop);
 */
require('./setup');
const bcrypt = require('bcrypt');
const { resetDatabase, dropDatabase } = require('./setup');

let app = null;
let server = null;
let baseUrl = '';
let pool = null;
let nextAddress = 1;

/** Resets the test database, then starts the app on a free port. */
async function start() {
  await resetDatabase();
  // eslint-disable-next-line global-require
  app = require('../../server');
  // eslint-disable-next-line global-require
  pool = require('../../config/db');
  await new Promise((resolve) => {
    server = app.listen(0, '127.0.0.1', resolve);
  });
  baseUrl = `http://127.0.0.1:${server.address().port}`;
}

async function stop() {
  if (server) await new Promise((resolve) => { server.close(resolve); });
  if (pool) await pool.end();
  await dropDatabase();
}

/** A different made-up visitor address each call, so the per-IP limits stay apart. */
function freshAddress() {
  nextAddress += 1;
  return `198.51.100.${nextAddress % 250}`;
}

/**
 * One request. Options: method, body (sent as JSON), token, headers, ip
 * (sent as X-Forwarded-For; a fresh one by default).
 * Returns { status, headers, text, json }.
 */
async function request(urlPath, { method = 'GET', body, token, headers = {}, ip } = {}) {
  const sent = { 'X-Forwarded-For': ip || freshAddress(), ...headers };
  if (body !== undefined) sent['Content-Type'] = 'application/json';
  if (token) sent.Authorization = `Bearer ${token}`;
  const response = await fetch(`${baseUrl}${urlPath}`, {
    method,
    headers: sent,
    body: body === undefined ? undefined : JSON.stringify(body),
    redirect: 'manual',
  });
  const text = await response.text();
  let json = null;
  try { json = JSON.parse(text); } catch (err) { json = null; }
  return { status: response.status, headers: response.headers, text, json };
}

/** Inserts the admin account directly (low bcrypt cost, to keep the tests quick). */
async function createAdmin({ name = 'Test Admin', email = 'admin@test.invalid', password = 'correct horse battery' } = {}) {
  const hash = await bcrypt.hash(password, 4);
  await pool.query('INSERT INTO admins (name, email, password_hash) VALUES (?, ?, ?)', [name, email, hash]);
  return { name, email, password };
}

/** Signs in and returns the token. */
async function login(email, password) {
  const res = await request('/api/auth/login', { method: 'POST', body: { email, password } });
  if (res.status !== 200) throw new Error(`Sign-in failed with HTTP ${res.status}`);
  return res.json.data.token;
}

module.exports = {
  start,
  stop,
  request,
  createAdmin,
  login,
  freshAddress,
  getApp: () => app,
  getPool: () => pool,
  getBaseUrl: () => baseUrl,
};
