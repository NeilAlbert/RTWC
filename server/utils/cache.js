/**
 * =============================================================================
 * utils/cache.js: the cache for PUBLIC data only (site settings, ministries,
 * leadership, public sermon and event lists, Facebook, YouTube and Church of
 * Pentecost news). Never put admin responses, messages, prayer requests,
 * newsletter addresses, tokens, passwords or anything personal in here.
 *
 * Where values live:
 * - Redis, when it is set up (config/redis.js). Every copy of the server then
 *   shares one cache, and clearing a key clears it for all of them.
 * - This process's memory otherwise, or while Redis is unreachable. A value
 *   from the site's own database is kept here for at most 30 seconds, so two
 *   servers that cannot share Redis never disagree for longer than that.
 *
 * Every key gets the REDIS_PREFIX (default "rtwc:") and every Redis key has an
 * expiry. Values are stored as JSON.
 *
 * Each value carries two lifetimes: the "fresh" one the caller asks for, and a
 * longer "stale" one (24 hours by default). wrap() serves the stale copy when
 * refreshing fails, for example while Facebook or thecophq.org is down.
 *
 * All functions are async and never throw because of Redis.
 * =============================================================================
 */
const crypto = require('crypto');
const redis = require('../config/redis');
const logger = require('./logger');

const LOCAL_TTL_CAP_SECONDS = 30;
const DEFAULT_STALE_SECONDS = 24 * 60 * 60;
const LOCAL_MAX_ENTRIES = 1000;
const LOCK_SECONDS = 5;
const LOCK_WAIT_MS = 5000;
const LOCK_POLL_MS = 100;

/** In-memory fallback: key -> { json, freshUntil, expiresAt }. Map order is insertion order. */
const local = new Map();
/** One refresh per key per process at a time. */
const inFlight = new Map();

const fullKey = (key) => `${redis.PREFIX}${key}`;
const now = () => Date.now();

// ---------------------------------------------------------------------------
// Low-level storage. An entry is { v: value, f: fresh-until (ms since 1970) }.
// ---------------------------------------------------------------------------

function localRead(key) {
  const entry = local.get(key);
  if (!entry) return undefined;
  if (now() > entry.expiresAt) {
    local.delete(key);
    return undefined;
  }
  return { v: JSON.parse(entry.json), f: entry.freshUntil };
}

function localWrite(key, value, freshSeconds, staleSeconds) {
  local.delete(key);
  if (local.size >= LOCAL_MAX_ENTRIES) local.delete(local.keys().next().value);
  local.set(key, {
    json: JSON.stringify(value),
    freshUntil: now() + freshSeconds * 1000,
    expiresAt: now() + Math.max(freshSeconds, staleSeconds) * 1000,
  });
}

/** Runs one Redis command, or returns `fallback` when Redis is off or fails. */
async function tryRedis(run, fallback) {
  const client = redis.getClient();
  if (!client) return fallback;
  try {
    const result = await run(client);
    redis.reportSuccess();
    return result;
  } catch (err) {
    redis.reportFailure(err);
    return fallback;
  }
}

const MISSING = Symbol('missing');

/** The stored entry { v, f }, or undefined. Reads Redis when it is usable, memory otherwise. */
async function readEntry(key) {
  const raw = await tryRedis((client) => client.get(fullKey(key)), MISSING);
  if (raw !== MISSING) {
    if (raw === null) return undefined;
    try {
      return JSON.parse(raw);
    } catch (err) {
      return undefined;
    }
  }
  return localRead(key);
}

/**
 * Stores a value. `localTtlCap: false` keeps the full lifetime in memory too;
 * it is for data from outside services, which cannot go out of date because
 * of an edit made on another server.
 */
async function writeEntry(key, value, ttlSeconds, { staleSeconds = DEFAULT_STALE_SECONDS, localTtlCap = true } = {}) {
  const fresh = Math.max(1, Math.round(ttlSeconds));
  const physical = Math.max(fresh, Math.round(staleSeconds));
  const json = JSON.stringify({ v: value, f: now() + fresh * 1000 });
  const stored = await tryRedis((client) => client.set(fullKey(key), json, 'EX', physical), MISSING);
  if (stored === MISSING) {
    localWrite(key, value, localTtlCap ? Math.min(fresh, LOCAL_TTL_CAP_SECONDS) : fresh, physical);
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/** The cached value if it is still fresh, otherwise undefined. */
async function get(key) {
  const entry = await readEntry(key);
  if (!entry || now() > entry.f) return undefined;
  return entry.v;
}

/** Stores a value for `ttlSeconds`. */
async function set(key, value, ttlSeconds, options) {
  await writeEntry(key, value, ttlSeconds, options);
}

/** Removes one key, from Redis and from memory. */
async function del(key) {
  local.delete(key);
  await tryRedis((client) => client.unlink(fullKey(key)), null);
}

/** Removes every key starting with `prefix` (SCAN and UNLINK, never KEYS). */
async function delByPrefix(prefix) {
  [...local.keys()].forEach((key) => { if (key.startsWith(prefix)) local.delete(key); });
  await tryRedis(async (client) => {
    let cursor = '0';
    do {
      // eslint-disable-next-line no-await-in-loop
      const [next, keys] = await client.scan(cursor, 'MATCH', `${fullKey(prefix)}*`, 'COUNT', 200);
      // eslint-disable-next-line no-await-in-loop
      if (keys.length > 0) await client.unlink(...keys);
      cursor = next;
    } while (cursor !== '0');
  }, null);
}

/**
 * Clears `prefixes` after an admin change, so every server shows it at once.
 * It clears again a second later, in case a visitor's request read the old
 * row just before the change and saved it to the cache just after.
 */
async function invalidate(...prefixes) {
  await Promise.all(prefixes.map(delByPrefix));
  setTimeout(() => {
    Promise.all(prefixes.map(delByPrefix)).catch(() => {});
  }, 1000).unref();
}

const sleep = (ms) => new Promise((resolve) => { setTimeout(resolve, ms); });

/** SET NX lock so only one server refreshes a key. Returns a token, true (no Redis), or null (someone else holds it). */
async function acquireLock(key) {
  const token = crypto.randomBytes(8).toString('hex');
  const result = await tryRedis((client) => client.set(fullKey(`lock:${key}`), token, 'EX', LOCK_SECONDS, 'NX'), MISSING);
  if (result === MISSING) return true; // no Redis: the in-process guard is enough
  return result === 'OK' ? token : null;
}

const RELEASE_SCRIPT = "if redis.call('get', KEYS[1]) == ARGV[1] then return redis.call('del', KEYS[1]) else return 0 end";

async function releaseLock(key, token) {
  if (typeof token !== 'string') return;
  await tryRedis((client) => client.eval(RELEASE_SCRIPT, 1, fullKey(`lock:${key}`), token), null);
}

async function refresh(key, ttlSeconds, fetchFn, options, stale) {
  const token = await acquireLock(key);

  if (token === null) {
    // Another server is refreshing. Serve the stale copy if there is one,
    // otherwise wait briefly for its result.
    if (stale) return stale.v;
    const giveUpAt = now() + LOCK_WAIT_MS;
    while (now() < giveUpAt) {
      // eslint-disable-next-line no-await-in-loop
      await sleep(LOCK_POLL_MS);
      // eslint-disable-next-line no-await-in-loop
      const value = await get(key);
      if (value !== undefined) return value;
    }
    // Waited long enough: fetch it here.
  }

  try {
    const value = await fetchFn();
    await writeEntry(key, value, ttlSeconds, options);
    return value;
  } catch (err) {
    if (stale) {
      logger.warn('Serving a cached copy because refreshing it failed', { key, message: err.message });
      return stale.v;
    }
    throw err;
  } finally {
    await releaseLock(key, token);
  }
}

/**
 * Read-through cache: the cached value while fresh, otherwise fetchFn()'s result,
 * which is stored for `ttlSeconds`. If fetchFn() fails and an older copy is still
 * within its stale lifetime, that copy is returned instead of the error.
 *
 * options.staleSeconds  how long an old copy may be served when fetchFn fails (default 24 hours)
 * options.localTtlCap   false keeps the full lifetime in the memory fallback (outside services only)
 */
async function wrap(key, ttlSeconds, fetchFn, options = {}) {
  const entry = await readEntry(key);
  if (entry && now() <= entry.f) return entry.v;

  if (inFlight.has(key)) return inFlight.get(key);
  const pending = refresh(key, ttlSeconds, fetchFn, options, entry).finally(() => inFlight.delete(key));
  inFlight.set(key, pending);
  return pending;
}

// After an outage, Redis may hold content that was edited while it was down
// (the edit could only clear this server's memory). Clear the site's own
// content so it is read from the database again. Facebook and news entries
// cannot be affected by an edit and are kept.
const CONTENT_PREFIXES = ['settings:', 'ministries:', 'leadership:', 'sermons:', 'events:'];
redis.onRecover(() => Promise.all(CONTENT_PREFIXES.map(delByPrefix)));

module.exports = { get, set, del, delByPrefix, invalidate, wrap, CONTENT_PREFIXES };
