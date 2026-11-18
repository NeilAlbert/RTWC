/**
 * middleware/rateLimiter.js: rate limits for sign-in, password change and the
 * public forms. All limits are per visitor IP address, and they are the same as
 * before Redis was added.
 *
 * With Redis set up (config/redis.js) the counts are kept in Redis, so they add
 * up across every copy of the server and survive a restart. Without Redis, or
 * while it is unreachable, each server counts in its own memory instead: the
 * limits still apply, they neither block everyone nor let everyone through.
 *
 * Each limiter has its own key prefix, e.g. "rtwc:rl:login:". The IP address is
 * not stored as it is: the key is a keyed hash of it, so Redis holds no visitor
 * addresses. Every key expires when its window ends.
 *
 * The visitor's address comes from req.ip, which depends on the "trust proxy"
 * setting in server.js (TRUST_PROXY_HOPS).
 */
const crypto = require('crypto');
const { rateLimit, MemoryStore } = require('express-rate-limit');
const { RedisStore } = require('rate-limit-redis');
const redis = require('../config/redis');

const standardHeaders = true;
const legacyHeaders = false;
const FIFTEEN_MINUTES = 15 * 60 * 1000;

let hashKey = null;
/** A key derived from JWT_SECRET, made on first use (server.js checks JWT_SECRET is set). */
function ipHashKey() {
  if (!hashKey) {
    hashKey = Buffer.from(crypto.hkdfSync('sha256', process.env.JWT_SECRET || '', '', 'rtwc rate limit keys', 32));
  }
  return hashKey;
}

/** The visitor's IP address as a keyed hash, so no address is stored. */
function keyGenerator(req) {
  return crypto.createHmac('sha256', ipHashKey()).update(String(req.ip)).digest('hex').slice(0, 32);
}

/**
 * A store that counts in Redis when it can and in this process's memory when it
 * cannot. One instance per limiter.
 */
class RedisOrMemoryStore {
  constructor(name) {
    this.prefix = `${redis.PREFIX}rl:${name}:`;
    this.memory = new MemoryStore();
    this.redisStore = null;
  }

  init(options) {
    this.options = options;
    this.memory.init(options);
  }

  /** The Redis store, created the first time Redis is usable. */
  sharedStore() {
    if (!redis.getClient()) return null;
    if (!this.redisStore) {
      this.redisStore = new RedisStore({
        prefix: this.prefix,
        sendCommand: (command, ...args) => {
          const client = redis.getClient();
          if (!client) throw new Error('Redis is not available');
          return client.call(command, ...args);
        },
      });
      // The store loads its scripts at once. If that fails it retries on the next
      // request; these handlers only stop an "unhandled rejection" warning.
      this.redisStore.incrementScriptSha.catch(() => {});
      this.redisStore.getScriptSha.catch(() => {});
      this.redisStore.init(this.options);
    }
    return this.redisStore;
  }

  async run(method, key) {
    const store = this.sharedStore();
    if (store) {
      try {
        const result = await store[method](key);
        redis.reportSuccess();
        return result;
      } catch (err) {
        redis.reportFailure(err);
      }
    }
    return this.memory[method](key);
  }

  get(key) { return this.run('get', key); }

  increment(key) { return this.run('increment', key); }

  decrement(key) { return this.run('decrement', key); }

  resetKey(key) { return this.run('resetKey', key); }
}

function limiter(name, limit, message) {
  return rateLimit({
    windowMs: FIFTEEN_MINUTES,
    limit,
    standardHeaders,
    legacyHeaders,
    keyGenerator,
    store: new RedisOrMemoryStore(name),
    message,
  });
}

const TRY_LATER = { success: false, message: 'Too many requests. Please try again later.' };
const TOO_MANY_ATTEMPTS = { success: false, data: null, message: 'Too many attempts. Please try again in a few minutes.' };

/** Contact form: max 5 requests per 15 minutes per IP. */
const contactLimiter = limiter('contact', 5, TRY_LATER);

/** Prayer requests: max 5 requests per 15 minutes per IP. */
const prayerRequestsLimiter = limiter('prayer', 5, TRY_LATER);

/** Newsletter subscribe: max 10 requests per 15 minutes per IP. */
const newsletterLimiter = limiter('newsletter', 10, TRY_LATER);

/** Sign-in: 10 attempts per 15 minutes per IP. The login page shows this message. */
const authLimiter = limiter('login', 10, TOO_MANY_ATTEMPTS);

/** Password change: 10 attempts per 15 minutes per IP, so a stolen session cannot guess the current password. */
const passwordLimiter = limiter('password', 10, TOO_MANY_ATTEMPTS);

module.exports = {
  contactLimiter,
  prayerRequestsLimiter,
  newsletterLimiter,
  authLimiter,
  passwordLimiter,
};
