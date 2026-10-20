/**
 * ROYAL TEMPLE WORSHIP CENTRE - Auth Controller
 * Handles admin authentication with JWT
 */

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');

/**
 * Login - validates admin credentials and returns JWT
 * POST /api/auth/login
 */
exports.login = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      success: false,
      message: 'Invalid email or password'
    });
  }

  try {
    // Find admin by email
    const [admins] = await pool.query(
      'SELECT id, name, email, password_hash FROM admins WHERE email = ?',
      [email]
    );

    if (admins.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    const admin = admins[0];

    // Compare password with hash
    const isMatch = await bcrypt.compare(password, admin.password_hash);

    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Generate JWT with 24-hour expiry
    const token = jwt.sign(
      { id: admin.id, email: admin.email, role: 'admin' },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    return res.json({
      success: true,
      token,
      admin: {
        id: admin.id,
        name: admin.name,
        email: admin.email
      }
    });

  } catch (error) {
    console.error('Auth login error:', error);
    return res.status(500).json({
      success: false,
      message: 'Authentication service error'
    });
  }
};

/**
 * Logout - client discards token
 * POST /api/auth/logout
 */
exports.logout = (req, res) => {
  return res.json({
    success: true,
    message: 'Logged out successfully'
  });
};

/**
 * Me - get logged-in admin info
 * GET /api/auth/me (protected)
 */
exports.me = async (req, res) => {
  try {
    const [admins] = await pool.query(
      'SELECT id, name, email, created_at FROM admins WHERE id = ?',
      [req.user.id]
    );

    if (admins.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Admin not found'
      });
    }

    const admin = admins[0];

    return res.json({
      success: true,
      admin: {
        id: admin.id,
        name: admin.name,
        email: admin.email,
        created_at: admin.created_at
      }
    });

  } catch (error) {
    console.error('Auth me error:', error);
    return res.status(500).json({
      success: false,
      message: 'Authentication service error'
    });
  }
};