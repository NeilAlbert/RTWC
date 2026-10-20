/**
 * ROYAL TEMPLE WORSHIP CENTRE - Newsletter Routes
 * POST /api/newsletter/subscribe - validate email, reject duplicates, save
 * Uses strict rate limiter from Phase 1
 */

const express = require('express');
const router = express.Router();
const { strictLimiter } = require('../middleware/rateLimiter');
const { body, param, query } = require('express-validator');
const pool = require('../config/db');
const cache = require('../utils/cache');

/**
 * @route   POST /api/newsletter/subscribe
 * @desc    Subscribe to newsletter - validate email, reject duplicates, save
 * @access  Public
 * @limit   strictLimiter (5 requests per 15 minutes per IP)
 */
router.post('/', strictLimiter, [
  body('email')
    .trim()
    .isEmail()
    .withMessage('Must be a valid email address')
    .normalizeEmail()
    .escape()
], async (req, res) => {
  const errors = req.validationErrors?.() || [];

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors
    });
  }

  const { email } = req.body;

  try {
    // Check cache first for recent subscribers (within last minute)
    const recentEmails = cache.get('newsletter_recent_emails') || new Set();
    
    // Normalize email for comparison
    const normalizedEmail = email.toLowerCase().trim();
    
    // Check if already subscribed in database
    const [existing] = await pool.query(
      'SELECT id FROM newsletter_subscribers WHERE email = ?',
      [normalizedEmail]
    );

    if (existing.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'This email is already subscribed to our newsletter'
      });
    }

    // Check recent cache to prevent duplicate submissions within short time
    if (recentEmails.has(normalizedEmail)) {
      return res.status(409).json({
        success: false,
        message: 'A subscription request was recently submitted with this email. Please wait a moment and try again.'
      });
    }

    // Save to database
    const [result] = await pool.query(
      `INSERT INTO newsletter_subscribers (email, subscribed_at) VALUES (?, NOW())`,
      [normalizedEmail]
    );

    // Add to recent cache set (TTL 60 seconds)
    recentEmails.add(normalizedEmail);
    cache.set('newsletter_recent_emails', recentEmails, 60);

    return res.json({
      success: true,
      data: {
        id: result.insertId,
        email: normalizedEmail
      },
      message: 'You have been subscribed to our newsletter'
    });

  } catch (error) {
    console.error('Newsletter route error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to subscribe to newsletter'
    });
  }
});

module.exports = router;