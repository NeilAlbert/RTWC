/**
 * =============================================================================
 * config/redis.js: the optional Redis connection, shared by the cache
 * (utils/cache.js) and the rate limiters (middleware/rateLimiter.js).
 *
 * Redis is opt-in. With REDIS_ENABLED unset or false, or REDIS_URL empty, no
 * connection is made and both fall back to their in-memory behaviour, so
 * `npm start` keeps working on a computer without Redis.
 *
 * - REDIS_URL takes redis://:password@host:6379/0, or rediss:// for TLS (a
 *   managed Redis service). A Redis that is not on this same computer must have
 *   a password: without one this module refuses to connect.
 * - A Redis outage never crashes the server. Commands time out after 500 ms and
 *   fail at once while disconnected (no offline queue), the client reconnects in
 *   the background, and callers use the in-memory fallback in the meantime.
 * - After 3 failed commands in a row Redis is skipped for 10 seconds, so a slow
 *   or broken Redis does not add a timeout to every request.
 * - The start and end of an outage are logged once each, never per request.
 *   The URL is never logged, because it contains the password.
 * =============================================================================
 */
const Redis = require('ioredis');
const logger = require('../utils/logger');

const PREFIX = process.env.REDIS_PREFIX || 'rtwc:';
const COMMAND_TIMEOUT_MS = 500;
const FAILURES_BEFORE_PAUSE = 3;
const PAUSE_MS = 10 * 1000;

const enabled = String(process.env.REDIS_ENABLED).toLowerCase() === 'true';
const url = (process.env.REDIS_URL || '').trim();

let client = null;
let configError = null; // a sentence for the admin status page when Redis is enabled but not usable
let consecutiveFailures = 0;
let pausedUntil = 0;
let outage = false; // true between the "Redis unavailable" and "Redis reconnected" log lines
let closing = false; // set by close(), so shutting down is not logged as an outage
const recoverListeners = [];

function isLoopback(host) {
  return ['localhost', '127.0.0.1', '::1', '[::1]'].includes(String(host).toLowerCase());
}

function startOutage(reason) {
  if (outage || closing) return;
  outage = true;
  logger.warn('Redis unavailable. Using the in-memory cache and rate limits until it is back.', { reason });
}

function endOutage() {
  consecutiveFailures = 0;
  pausedUntil = 0;
  if (!outage) return;
  outage = false;
  logger.info('Redis reconnected. Shared cache and rate limits are back in use.');
  recoverListeners.forEach((listener) => {
    Promise.resolve().then(listener).catch((err) => logger.warn('Redis recovery task failed', { message: err.message }));
  });
}

function connect() {
  let parsed;
  try {
    parsed = new URL(url);
  } catch (err) {
    configError = 'REDIS_URL is not a valid address.';
    logger.error(`Redis is not used: ${configError}`);
    return;
  }
  if (!['redis:', 'rediss:'].includes(parsed.protocol)) {
    configError = 'REDIS_URL must start with redis:// or rediss://.';
    logger.error(`Redis is not used: ${configError}`);
    return;
  }
  if (!parsed.password && !isLoopback(parsed.hostname)) {
    configError = 'REDIS_URL has no password. A Redis on another machine must require one.';
    logger.error(`Redis is not used: ${configError}`);
    return;
  }
  if (!parsed.password) {
    logger.warn('Redis on this computer has no password. Fine for development, never for a server.');
  }

  client = new Redis(url, {
    commandTimeout: COMMAND_TIMEOUT_MS,
    connectTimeout: 5000,
    enableOfflineQueue: false, // fail at once while disconnected instead of queueing
    maxRetriesPerRequest: 1,
    // Reconnect forever, waiting a little longer each time, up to 3 seconds.
    retryStrategy: (times) => Math.min(times * 200, 3000),
  });

  // Without an "error" listener ioredis would raise an unhandled error and stop the server.
  client.on('error', (err) => startOutage(err.code || err.message));
  client.on('end', () => startOutage('connection closed'));
  client.on('close', () => { if (client.status !== 'ready') startOutage('connection closed'); });
  let everConnected = false;
  client.on('ready', () => {
    // The first connection is not a recovery, but it is worth one line.
    if (!everConnected && !outage) logger.info('Redis connected.');
    everConnected = true;
    endOutage();
  });
}

if (enabled && url) connect();

/** The client when Redis can be used right now, otherwise null (the caller uses its fallback). */
function getClient() {
  if (!client || client.status !== 'ready') return null;
  if (Date.now() < pausedUntil) return null;
  return client;
}

/** Callers report each failed command, so a misbehaving Redis is skipped for a while. */
function reportFailure(err) {
  consecutiveFailures += 1;
  if (consecutiveFailures >= FAILURES_BEFORE_PAUSE) {
    pausedUntil = Date.now() + PAUSE_MS;
    consecutiveFailures = 0;
    startOutage(err && (err.code || err.message));
  }
}

/** Callers report a command that worked, which ends an outage started by failed commands. */
function reportSuccess() {
  consecutiveFailures = 0;
  if (outage && client && client.status === 'ready') endOutage();
}

/**
 * "connected", "degraded" (enabled but not usable: reconnecting, paused or
 * misconfigured) or "disabled" (not set up).
 */
function getState() {
  if (!enabled || !url) return 'disabled';
  if (getClient()) return 'connected';
  return 'degraded';
}

/** A plain sentence about the state, for the admin status page. */
function describeState() {
  const state = getState();
  if (state === 'disabled') {
    return 'Redis is not set up. The cache and sign-in limits are kept in this server\'s memory, which is fine for one server.';
  }
  if (state === 'connected') {
    return 'Redis is connected. The cache and sign-in limits are shared by every copy of the server.';
  }
  if (configError) return `Redis is turned on but cannot be used: ${configError} The site is using its memory instead.`;
  return 'Redis is turned on but cannot be reached right now. The site keeps working from memory and reconnects by itself.';
}

/** Runs `listener` each time Redis comes back after an outage. */
function onRecover(listener) {
  recoverListeners.push(listener);
}

/** Closes the connection (used on shutdown). Never throws. */
async function close() {
  if (!client) return;
  closing = true;
  try {
    await client.quit();
  } catch (err) {
    client.disconnect();
  }
}

module.exports = {
  PREFIX,
  getClient,
  reportFailure,
  reportSuccess,
  getState,
  describeState,
  onRecover,
  close,
};
