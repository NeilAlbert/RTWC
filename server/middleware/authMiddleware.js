/**
 * middleware/authMiddleware.js: lets a request through only for the signed-in admin.
 *
 * The token comes from "Authorization: Bearer <token>". It must be signed with
 * JWT_SECRET, not expired, belong to an admin who still exists, and have been
 * issued after that admin's token_valid_after (see utils/tokens.js). Anything
 * else gets 401 with one message, so the reason is not revealed.
 */
const Admin = require('../models/adminModel');
const { fromDbUtc, readToken } = require('../utils/tokens');

const SESSION_ENDED = 'Your session expired. Please log in again.';

async function authMiddleware(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  const payload = token ? readToken(token) : null;

  if (!payload || !Number.isInteger(payload.sub) || !Number.isInteger(payload.iat)) {
    return res.status(401).json({ success: false, data: null, message: SESSION_ENDED });
  }

  let admin;
  try {
    admin = await Admin.findById(payload.sub);
  } catch (err) {
    return next(err);
  }

  const validAfter = admin ? fromDbUtc(admin.token_valid_after) : null;
  if (!admin || (validAfter !== null && payload.iat <= validAfter)) {
    return res.status(401).json({ success: false, data: null, message: SESSION_ENDED });
  }

  req.admin = { id: admin.id, name: admin.name, email: admin.email };
  req.tokenIssuedAt = payload.iat;
  return next();
}

module.exports = authMiddleware;
