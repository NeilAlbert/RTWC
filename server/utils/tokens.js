/**
 * utils/tokens.js: sign-in tokens and the "valid after" moment that retires them.
 *
 * admins.token_valid_after holds a UTC moment. A token is accepted only when it
 * was issued after that moment, so changing the password, resetting it or
 * logging out makes every earlier token useless.
 *
 * The moment is written and read as a UTC "YYYY-MM-DD HH:MM:SS" string, so the
 * comparison does not depend on the database server's time zone.
 */
const jwt = require('jsonwebtoken');

const TOKEN_LIFETIME = '24h';

function nowSeconds() {
  return Math.floor(Date.now() / 1000);
}

/** Seconds since 1970 to the UTC string stored in a DATETIME column. */
function toDbUtc(seconds) {
  return new Date(seconds * 1000).toISOString().slice(0, 19).replace('T', ' ');
}

/** The stored UTC string back to seconds since 1970, or null when it is empty. */
function fromDbUtc(value) {
  if (!value) return null;
  const ms = Date.parse(`${String(value).replace(' ', 'T')}Z`);
  return Number.isNaN(ms) ? null : Math.floor(ms / 1000);
}

/** A 24-hour token for this admin, issued at the given second. */
function issueToken(adminId, issuedAt) {
  return jwt.sign({ sub: adminId, iat: issuedAt }, process.env.JWT_SECRET, {
    algorithm: 'HS256',
    expiresIn: TOKEN_LIFETIME,
  });
}

/** Returns the token's payload, or null when it is forged, malformed or expired. */
function readToken(token) {
  try {
    return jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });
  } catch (err) {
    return null;
  }
}

module.exports = { nowSeconds, toDbUtc, fromDbUtc, issueToken, readToken };
