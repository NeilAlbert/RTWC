/**
 * =============================================================================
 * middleware/authMiddleware.js — JWT verification for admin routes.
 *
 * Reads the token from `Authorization: Bearer <token>`, verifies it against
 * JWT_SECRET, checks expiry, and attaches the admin payload to req.admin.
 * Rejects expired/invalid tokens with 401.
 * =============================================================================
 */
const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');
const Admin = require('../models/adminModel');

async function authMiddleware(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ success: false, message: 'Authentication required. Please log in.' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (!decoded.jti || !decoded.sub) {
      return res.status(401).json({ success: false, message: 'Invalid or expired token.' });
    }
    const sessionIsActive = await Admin.hasActiveSession(decoded.jti, decoded.sub);
    if (!sessionIsActive) {
      return res.status(401).json({ success: false, message: 'Session expired. Please log in again.' });
    }
    // Attach the admin identity for downstream handlers.
    req.admin = { id: decoded.sub, name: decoded.name, email: decoded.email, sessionId: decoded.jti };
    return next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: 'Session expired. Please log in again.' });
    }
    if (err.name !== 'JsonWebTokenError') return next(err);
    logger.warn('Invalid JWT attempt', { message: err.message });
    return res.status(401).json({ success: false, message: 'Invalid or expired token.' });
  }
}

module.exports = authMiddleware;
