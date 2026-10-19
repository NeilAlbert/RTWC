/**
 * =============================================================================
 * controllers/authController.js — login/logout business logic.
 * =============================================================================
 */
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { randomUUID } = require('crypto');
const Admin = require('../models/adminModel');
const logger = require('../utils/logger');

/**
 * POST /api/auth/login
 * Validates credentials and issues a JWT with a 24-hour expiry.
 */
async function login(req, res, next) {
  try {
    const { email, password } = req.body;

    const admin = await Admin.findByEmail(email);
    if (!admin) {
      // Generic message — do not reveal whether the email exists.
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    const passwordMatches = await bcrypt.compare(password, admin.password_hash);
    if (!passwordMatches) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    const sessionId = randomUUID();
    const token = jwt.sign(
      { sub: admin.id, name: admin.name, email: admin.email },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '24h', jwtid: sessionId }
    );
    const { exp } = jwt.decode(token);
    await Admin.createSession(sessionId, admin.id, new Date(exp * 1000));

    logger.info('Admin login', { adminId: admin.id, email: admin.email });

    return res.json({
      success: true,
      message: 'Login successful.',
      data: {
        token,
        admin: { id: admin.id, name: admin.name, email: admin.email }, // never the hash
      },
    });
  } catch (err) {
    return next(err);
  }
}

/**
 * POST /api/auth/logout
 * JWTs are stateless — the client discards the token. The endpoint exists so
 * the admin dashboard has a canonical logout call; no server state is needed.
 */
async function logout(req, res, next) {
  try {
    await Admin.revokeSession(req.admin.sessionId, req.admin.id);
    return res.json({ success: true, message: 'Logged out successfully.' });
  } catch (err) {
    return next(err);
  }
}

module.exports = { login, logout };
