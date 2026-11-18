/**
 * scripts/checkEnv.js: checks server/.env before starting or deploying the server.
 *
 * Usage (inside the server folder):
 *   npm run check:env
 *   node scripts/checkEnv.js --offline    skips the database and Facebook checks
 *
 * Prints variable names and plain messages only. It never prints a value, and it
 * never prints an error message from MySQL or Facebook, because those can contain
 * the host, the user name or the token.
 *
 * Exits with code 1 when something the server needs is wrong, so a deploy script
 * can stop on it. Warnings alone exit with code 0.
 */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const dotenv = require('dotenv');

const SERVER_DIR = path.join(__dirname, '..');
const ENV_PATH = path.join(SERVER_DIR, '.env');
const OFFLINE = process.argv.includes('--offline');
const GRAPH_BASE = 'https://graph.facebook.com/v20.0'; // same as the Facebook controllers
const MIN_PASSPHRASE_LENGTH = 12; // same as services/backupService.js

let errors = 0;
let warnings = 0;
const ok = (msg) => console.log(`  ok    ${msg}`);
const warn = (msg) => { warnings += 1; console.log(`  WARN  ${msg}`); };
const fail = (msg) => { errors += 1; console.log(`  FAIL  ${msg}`); };
const section = (title) => console.log(`\n${title}`);

if (!fs.existsSync(ENV_PATH)) {
  console.log('FAIL  server/.env does not exist. Copy server/.env.example to server/.env and fill it in.');
  process.exit(1);
}
const env = dotenv.parse(fs.readFileSync(ENV_PATH));
const has = (name) => typeof env[name] === 'string' && env[name].trim() !== '';

// ---------------------------------------------------------------------------
section('Required settings');
['DB_HOST', 'DB_USER', 'DB_PASSWORD', 'DB_NAME', 'JWT_SECRET'].forEach((name) => {
  if (has(name)) ok(`${name} is set`);
  else fail(`${name} is missing or empty`);
});

if (has('JWT_SECRET')) {
  const length = env.JWT_SECRET.length;
  if (length < 32) fail('JWT_SECRET is shorter than 32 characters: the server will refuse to start. Replace it with the output of: openssl rand -hex 64');
  else if (length < 64) warn('JWT_SECRET is 32 to 63 characters: accepted, but 64 or more is recommended (openssl rand -hex 64)');
  else ok('JWT_SECRET is 64 characters or longer');
}

// ---------------------------------------------------------------------------
section('Formats');
function checkInteger(name, { min = 1, max = Infinity, optional = true } = {}) {
  if (!has(name)) {
    if (!optional) fail(`${name} is missing`);
    return;
  }
  const value = env[name].trim();
  const number = Number(value);
  if (!/^\d+$/.test(value) || number < min || number > max) {
    const range = max === Infinity ? `${min} or more` : `from ${min} to ${max}`;
    fail(`${name} must be a whole number ${range}`);
  } else {
    ok(`${name} is a valid number`);
  }
}
checkInteger('PORT', { max: 65535 });
checkInteger('DB_PORT', { max: 65535 });
checkInteger('EMAIL_PORT', { max: 65535 });
checkInteger('TRUST_PROXY_HOPS', { min: 0, max: 10 });
checkInteger('BACKUP_MAX_BYTES');
checkInteger('BACKUP_MAX_UPLOAD_MB');
checkInteger('BACKUP_KEEP_AUTO', { min: 2, max: 24 });

['REDIS_ENABLED', 'DB_SSL'].forEach((name) => {
  if (!has(name)) return;
  if (['true', 'false'].includes(env[name].trim().toLowerCase())) ok(`${name} is true or false`);
  else fail(`${name} must be true or false`);
});

if (has('CORS_ORIGIN')) {
  const bad = env.CORS_ORIGIN.split(',').map((s) => s.trim()).filter(Boolean).filter((origin) => {
    try {
      const url = new URL(origin);
      return !['http:', 'https:'].includes(url.protocol) || origin.endsWith('/') || url.pathname !== '/';
    } catch { return true; }
  });
  if (bad.length) fail(`CORS_ORIGIN has ${bad.length} entr${bad.length === 1 ? 'y' : 'ies'} that are not plain http(s) addresses without a trailing slash`);
  else ok('CORS_ORIGIN entries are valid addresses');
}

// ---------------------------------------------------------------------------
section('Email');
const emailNames = ['EMAIL_HOST', 'EMAIL_USER', 'EMAIL_PASSWORD', 'ADMIN_NOTIFICATION_EMAIL'];
const emailSet = emailNames.filter(has);
if (emailSet.length === 0) {
  warn('Email is not set up: contact and prayer request notifications will not be sent (the messages are still saved)');
} else if (emailSet.length < emailNames.length) {
  fail(`Email is partly set up. Missing: ${emailNames.filter((n) => !has(n)).join(', ')}`);
} else {
  ok('Email settings are all present');
}

// ---------------------------------------------------------------------------
section('Redis');
const redisEnabled = has('REDIS_ENABLED') && env.REDIS_ENABLED.trim().toLowerCase() === 'true';
if (!redisEnabled) {
  ok('Redis is off');
} else if (!has('REDIS_URL')) {
  fail('REDIS_ENABLED is true but REDIS_URL is empty');
} else {
  try {
    const url = new URL(env.REDIS_URL.trim());
    const loopback = ['localhost', '127.0.0.1', '::1', '[::1]'].includes(url.hostname);
    if (!['redis:', 'rediss:'].includes(url.protocol)) fail('REDIS_URL must start with redis:// or rediss://');
    else if (!url.password && !loopback) fail('REDIS_URL has no password: the server refuses a remote Redis without one');
    else ok('REDIS_URL is a valid Redis address');
  } catch {
    fail('REDIS_URL is not a valid address');
  }
}

// ---------------------------------------------------------------------------
section('Database certificate');
let caText;
if (has('DB_SSL_CA')) {
  const caPath = path.resolve(SERVER_DIR, env.DB_SSL_CA);
  try {
    caText = fs.readFileSync(caPath, 'utf8');
    ok('DB_SSL_CA file exists and is readable');
  } catch {
    fail('DB_SSL_CA is set but the file cannot be read (the server will refuse to start)');
  }
} else {
  ok('DB_SSL_CA not set: TLS uses the system certificate store');
}
if (has('DB_SSL') && env.DB_SSL.trim().toLowerCase() === 'false') {
  const host = (env.DB_HOST || '').trim();
  if (['localhost', '127.0.0.1', '::1'].includes(host)) ok('DB_SSL=false with a database on this computer');
  else warn('DB_SSL=false with a database that is not on this computer: the connection is not encrypted');
}

// ---------------------------------------------------------------------------
section('File safety');
try {
  if (process.platform === 'win32') {
    const acl = execFileSync('icacls', [ENV_PATH], { encoding: 'utf8' });
    const others = acl.split(/\r?\n/).map((line) => line.replace(ENV_PATH, '').trim()).filter(Boolean)
      .filter((line) => line.includes(':(') && !line.startsWith(`${process.env.USERDOMAIN}\\${process.env.USERNAME}:`));
    if (others.length) warn(`server/.env can be read by ${others.length} other account(s) or group(s). Fix: icacls .env /inheritance:r /grant:r "%USERNAME%:F"`);
    else ok('server/.env is readable by its owner only');
  } else {
    const mode = fs.statSync(ENV_PATH).mode & 0o777;
    if (mode & 0o077) warn('server/.env can be read by other users. Fix: chmod 600 .env');
    else ok('server/.env is readable by its owner only');
  }
} catch {
  warn('Could not check the permissions of server/.env');
}

try {
  execFileSync('git', ['ls-files', '--error-unmatch', '.env'], { cwd: SERVER_DIR, stdio: 'ignore' });
  fail('server/.env is tracked by git. Remove it from git and from the history, then change every secret in it');
} catch (err) {
  if (err.code === 'ENOENT') warn('git is not installed: could not check whether server/.env is tracked');
  else ok('server/.env is not tracked by git');
}

const secretNames = ['DB_PASSWORD', 'JWT_SECRET', 'EMAIL_PASSWORD', 'FB_PAGE_ACCESS_TOKEN', 'YOUTUBE_API_KEY', 'BACKUP_PASSPHRASE', 'REDIS_URL'];
const seen = new Map();
let reused = false;
secretNames.filter(has).forEach((name) => {
  const value = env[name].trim();
  if (seen.has(value)) { warn(`${seen.get(value)} and ${name} have the same value. Each secret should be different`); reused = true; }
  else seen.set(value, name);
});
if (!reused) ok('No secret value is used twice');

// ---------------------------------------------------------------------------
function dbReason(err) {
  const code = err && err.code;
  if (code === 'ER_ACCESS_DENIED_ERROR' || code === 'ER_DBACCESS_DENIED_ERROR') return 'authentication failed';
  if (code === 'ER_BAD_DB_ERROR') return 'database not found';
  if (code === 'ENOTFOUND' || code === 'EAI_AGAIN') return 'host name not found';
  if (code === 'ECONNREFUSED') return 'connection refused (wrong port, or the database is not running)';
  if (code === 'ETIMEDOUT' || code === 'EHOSTUNREACH' || code === 'ENETUNREACH') return 'host unreachable';
  if (code === 'HANDSHAKE_NO_SSL_SUPPORT') return 'the server does not support TLS (DB_SSL=false is only for a local database)';
  if (code && /CERT|SSL|TLS|SELF_SIGNED|UNABLE_TO/i.test(code)) return 'TLS certificate problem (check DB_SSL_CA)';
  return `could not connect${code ? ` (${code})` : ''}`;
}

async function checkDatabase() {
  section('Database connection');
  if (OFFLINE) { warn('Skipped (--offline)'); return null; }
  if (!['DB_HOST', 'DB_USER', 'DB_NAME'].every(has)) { warn('Skipped: database settings are missing'); return null; }
  const mysql = require('mysql2/promise');
  let ssl = { rejectUnauthorized: true };
  if (has('DB_SSL') && env.DB_SSL.trim().toLowerCase() === 'false') ssl = undefined;
  else if (caText) ssl = { rejectUnauthorized: true, ca: caText };
  let connection;
  try {
    connection = await mysql.createConnection({
      host: env.DB_HOST,
      port: Number(env.DB_PORT) || 3306,
      user: env.DB_USER,
      password: env.DB_PASSWORD,
      database: env.DB_NAME,
      ssl,
      connectTimeout: 10000,
    });
    await connection.query('SELECT 1');
    ok('Connected and ran a test query');
    return connection;
  } catch (err) {
    fail(`Database: ${dbReason(err)}`);
    if (connection) await connection.end().catch(() => {});
    return null;
  }
}

async function checkBackups(connection) {
  section('Automatic backups');
  const passphraseOk = has('BACKUP_PASSPHRASE') && env.BACKUP_PASSPHRASE.length >= MIN_PASSPHRASE_LENGTH;
  if (has('BACKUP_PASSPHRASE') && !passphraseOk) fail(`BACKUP_PASSPHRASE is shorter than ${MIN_PASSPHRASE_LENGTH} characters`);
  if (!connection) {
    warn('Could not check whether automatic backups are switched on (no database connection)');
    return;
  }
  try {
    const [rows] = await connection.query("SELECT setting_value FROM site_settings WHERE setting_key = 'backup_auto_enabled'");
    const enabled = rows.length > 0 && rows[0].setting_value === '1';
    if (!enabled) ok(`Automatic backups are off${passphraseOk ? ' (BACKUP_PASSPHRASE is ready for when they are switched on)' : ''}`);
    else if (passphraseOk) ok('Automatic backups are on and BACKUP_PASSPHRASE is set');
    else fail('Automatic backups are switched on but BACKUP_PASSPHRASE is missing: they will not run');
  } catch {
    warn('Could not read the automatic backup setting (has migration 006 been run?)');
  }
}

async function checkFacebook() {
  section('Facebook');
  if (!has('FB_PAGE_ACCESS_TOKEN')) { ok('FB_PAGE_ACCESS_TOKEN not set: Facebook live and gallery are off'); return; }
  if (!has('PAGE_ID')) warn('FB_PAGE_ACCESS_TOKEN is set but PAGE_ID is empty');
  if (OFFLINE) { warn('Token check skipped (--offline)'); return; }
  try {
    const target = has('PAGE_ID') ? `${encodeURIComponent(env.PAGE_ID.trim())}/photos` : 'me';
    const url = new URL(`${GRAPH_BASE}/${target}`);
    url.searchParams.set('limit', '1');
    url.searchParams.set('access_token', env.FB_PAGE_ACCESS_TOKEN.trim());
    const response = await fetch(url, { signal: AbortSignal.timeout(10000) });
    const body = await response.json().catch(() => ({}));
    if (response.ok) { ok('FB_PAGE_ACCESS_TOKEN: valid'); return; }
    const code = body && body.error && body.error.code;
    if (code === 190) warn('FB_PAGE_ACCESS_TOKEN: expired or invalid. Create a new long-lived Page token');
    else if (code === 10 || code === 100 || (code >= 200 && code < 300)) warn('FB_PAGE_ACCESS_TOKEN: missing permissions (or PAGE_ID is wrong)');
    else warn(`FB_PAGE_ACCESS_TOKEN: Facebook refused the request${code ? ` (error ${code})` : ''}`);
  } catch {
    warn('FB_PAGE_ACCESS_TOKEN: could not reach Facebook');
  }
}

(async () => {
  const connection = await checkDatabase();
  await checkBackups(connection);
  if (connection) await connection.end().catch(() => {});
  await checkFacebook();

  console.log(`\n${errors} problem(s), ${warnings} warning(s).`);
  process.exit(errors > 0 ? 1 : 0);
})();
