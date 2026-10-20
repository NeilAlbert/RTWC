/**
 * ROYAL TEMPLE WORSHIP CENTRE - Prayer Requests Routes
 * POST /api/prayer-requests - validate, sanitize, save to DB
 * Uses strict rate limiter from Phase 1
 */

const express = require('express');
const router = express.Router();
const { strictLimiter } = require('../middleware/rateLimiter');
const { body } = require('express-validator');
const pool = require('../config/db');
const sanitizeInput = require('../middleware/sanitizeInput');

/**
 * @route   POST /api/prayer-requests
 * @desc    Submit prayer request - validate, sanitize, save
 * @access  Public
 * @limit   strictLimiter (5 requests per 15 minutes per IP)
 */
router.post('/', strictLimiter, [
  // Validation rules
  body('request')
    .trim()
    .isLength({ min: 10, max: 2000 })
    .withMessage('Prayer request must be between 10 and 2000 characters')
    .escape(),
  
  body('name')
    .optional({ options: { nullable: true, alowEmpty: true } })
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters')
    .escape(),
  
  body('is_private')
    .optional({ options: { nullable: true } })
    .isBoolean()
    .withMessage('is_private must be a boolean value')
], async (req, res) => {
  const errors = req.validationErrors?.() || [];
  
  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors
    });
  }

  const { name, request: requestText, is_private } = req.body;

  try {
    // Sanitize inputs
    const sanitizedName = name ? name.replace(/<[^>]*>/g, '') : null;
    const sanitizedRequest = requestText.replace(/<[^>]*>/g, '');
    const sanitizedIsPrivate = typeof is_private === 'boolean' ? is_private : false;

    // Determine display name - if name is empty/blank, use "Anonymous"
    const displayName = (sanitizedName && sanitizedName.trim().length > 0) 
      ? sanitizedName 
      : 'Anonymous';

    // Save to database
    const [result] = await pool.query(
      `INSERT INTO prayer_requests (name, request_text, is_private, status) VALUES (?, ?, ?, 'new')`,
      [displayName, sanitizedRequest, sanitizedIsPrivate]
    );

    return res.json({
      success: true,
      data: {
        id: result.insertId,
        message: 'Prayer request submitted successfully'
      },
      message: is_private 
        ? 'Your prayer request has been submitted privately.' 
        : 'Your prayer request has been submitted. Our Prayer Force team will intercede for you.'
    });

  } catch (error) {
    console.error('Prayer requests route error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to submit prayer request'
    });
  }
});

module.exports = router;