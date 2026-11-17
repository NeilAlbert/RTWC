/**
 * controllers/authController.js: sign in, who am I, log out, change password.
 *
 * Passwords are compared and hashed exactly as they arrive. They are never
 * trimmed, sanitized, logged or sent back.
 */
const crypto = require('crypto');
const bcrypt = require('bcrypt');
const Admin = require('../models/adminModel');
const logger = require('../utils/logger');
const { nowSeconds, toDbUtc, fromDbUtc, issueToken } = require('../utils/tokens');

const BCRYPT_ROUNDS = 12;
const INVALID_LOGIN = 'Invalid email or password';

// Compared against when no admin has the given email, so that answer takes as
// long as a wrong password does and the two cannot be told apart by timing.
const UNUSED_HASH = bcrypt.hashSync(crypto.randomBytes(32).toString('hex'), BCRYPT_ROUNDS);

function rejectLogin(res) {
  return res.status(401).json({ success: false, data: null, message: INVALID_LOGIN });
}

/** POST /api/auth/login. Body: { email, password }. */
async function login(req, res, next) {
  try {
    const { email, password } = req.body;

    const admin = await Admin.findByEmailWithHash(email);
    const matches = await bcrypt.compare(password, admin ? admin.password_hash : UNUSED_HASH);
    if (!admin || !matches) return rejectLogin(res);

    // Issued after token_valid_after even when the sign-in follows a log out or
    // a password change within the same second.
    const validAfter = fromDbUtc(admin.token_valid_after);
    const issuedAt = Math.max(nowSeconds(), validAfter === null ? 0 : validAfter + 1);

    logger.info('Admin signed in', { adminId: admin.id });
    return res.json({
      success: true,
      data: { token: issueToken(admin.id, issuedAt), admin: { name: admin.name, email: admin.email } },
      message: 'Signed in.',
    });
  } catch (err) {
    return next(err);
  }
}

/** GET /api/auth/me */
function me(req, res) {
  return res.json({
    success: true,
    data: { name: req.admin.name, email: req.admin.email },
    message: 'Account fetched.',
  });
}

/** POST /api/auth/logout. Retires the token, so a copy of it cannot be used afterwards. */
async function logout(req, res, next) {
  try {
    const validAfter = Math.max(nowSeconds(), req.tokenIssuedAt);
    await Admin.setTokenValidAfter(req.admin.id, toDbUtc(validAfter));
    return res.json({ success: true, data: null, message: 'Logged out.' });
  } catch (err) {
    return next(err);
  }
}

/**
 * PUT /api/auth/password. Body: { current_password, new_password }.
 * Retires every earlier token and answers with a fresh one.
 * A wrong current password is a 400, not a 401: the session itself is still good.
 */
async function changePassword(req, res, next) {
  try {
    const { current_password: currentPassword, new_password: newPassword } = req.body;

    const admin = await Admin.findByIdWithHash(req.admin.id);
    const matches = admin ? await bcrypt.compare(currentPassword, admin.password_hash) : false;
    if (!matches) {
      return res.status(400).json({
        success: false,
        data: { errors: [{ field: 'current_password', message: 'The current password is not correct.' }] },
        message: 'The password was not changed.',
      });
    }

    const passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
    const validAfter = Math.max(nowSeconds(), req.tokenIssuedAt);
    await Admin.updatePassword(admin.id, passwordHash, toDbUtc(validAfter));

    logger.info('Admin password changed', { adminId: admin.id });
    return res.json({
      success: true,
      data: { token: issueToken(admin.id, validAfter + 1) },
      message: 'Password changed.',
    });
  } catch (err) {
    return next(err);
  }
}

module.exports = { login, me, logout, changePassword, rejectLogin };
