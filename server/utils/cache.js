/**
 * =============================================================================
 * utils/cache.js — simple in-memory TTL cache.
 *
 * Used by facebookLive, facebookGallery, and copNews to avoid hammering the
 * Facebook Graph API and thecophq.org. Not shared across server processes;
 * sufficient for a single-instance deployment.
 * =============================================================================
 */
const store = new Map();

/**
 * Get a cached value. Returns undefined if absent or expired (expired entries
 * are lazily evicted).
 * @param {string} key
 */
function get(key) {
  const entry = store.get(key);
  if (!entry) return undefined;
  if (Date.now() > entry.expiresAt) {
    store.delete(key);
    return undefined;
  }
  return entry.value;
}

/**
 * Store a value with a TTL in milliseconds.
 * @param {string} key
 * @param {*} value
 * @param {number} ttlMs
 */
function set(key, value, ttlMs) {
  store.set(key, { value, expiresAt: Date.now() + ttlMs });
}

/**
 * Get-or-compute: returns the cached value if fresh, otherwise runs the
 * producer function, caches the result, and returns it.
 * @param {string} key
 * @param {number} ttlMs
 * @param {Function} producer — async () => value
 */
async function remember(key, ttlMs, producer) {
  const cached = get(key);
  if (cached !== undefined) return cached;
  const value = await producer();
  set(key, value, ttlMs);
  return value;
}

module.exports = { get, set, remember };
