/**
 * ROYAL TEMPLE WORSHIP CENTRE - In-Memory Cache
 * Simple cache helper with TTL (Time To Live) support
 */

class Cache {
  constructor() {
    this._cache = new Map();
  }

  /**
   * Set a value in the cache with TTL
   * @param {string} key - Cache key
   * @param {any} value - Value to cache
   * @param {number} ttl - Time to live in seconds
   */
  set(key, value, ttl) {
    if (typeof ttl !== 'number' || ttl <= 0) {
      this._cache.set(key, value);
      return;
    }

    const expiresAt = Date.now() + ttl * 1000;
    this._cache.set(key, { value, expiresAt });
  }

  /**
   * Get a value from the cache
   * @param {string} key - Cache key
   * @returns {any} - Cached value or undefined
   */
  get(key) {
    const entry = this._cache.get(key);

    if (!entry) {
      return undefined;
    }

    // Check if expired
    if (entry.expiresAt && Date.now() > entry.expiresAt) {
      this._cache.delete(key);
      return undefined;
    }

    return entry.value;
  }

  /**
   * Delete a value from the cache
   * @param {string} key - Cache key
   */
  delete(key) {
    this._cache.delete(key);
  }

  /**
   * Check if a key exists in the cache (and is not expired)
   * @param {string} key - Cache key
   * @returns {boolean}
   */
  has(key) {
    return this.get(key) !== undefined;
  }

  /**
   * Clear all cache entries
   */
  clear() {
    this._cache.clear();
  }

  /**
   * Get cache size
   * @returns {number}
   */
  size() {
    return this._cache.size;
  }
}

module.exports = new Cache();