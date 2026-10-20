/**
 * ROYAL TEMPLE WORSHIP CENTRE - Contact Routes
 * POST /api/contact - validate, sanitize, save to DB, send notification email
 * Uses strict rate limiter from Phase 1
 */

const express = require('express');
const router = express.Router();
const { strictLimiter } = require('../middleware/rateLimiter');
const { body, param, query } = require('express-validator');
const pool = require('../config/db');
const sanitizeInput = require('../middleware/sanitizeInput');
const nodemailer = require('nodemailer');
const { log } = require('../utils/logger');

// Configure nodemailer transporter
// In production, these would come from .env variables
let transporter = null;

try {
  // Try to configure with environment variables if available
  const emailHost = process.env.EMAIL_HOST;
  const emailUser = process.env.EMAIL_USER;
  const emailPassword = process.env.EMAIL_PASSWORD;
  const adminNotificationEmail = process.env.ADMIN_NOTIFICATION_EMAIL;

  if (emailHost && emailUser && emailPassword) {
    transporter = nodemailer.createTransport({
      host: emailHost,
      port: process.env.EMAIL_PORT || 587,
      secure: process.env.EMAIL_PORT === '465', // true for 465, false for other ports
      auth: {
        user: emailUser,
        pass: emailPassword
      }
    });
    log.info('Nodemailer transporter configured successfully');
  } else {
    log.warn('Email transporter not configured - missing EMAIL_HOST, EMAIL_USER, or EMAIL_PASSWORD');
  }
} catch (error) {
  log.error('Failed to configure nodemailer:', error);
}

/**
 * @route   POST /api/contact
 * @desc    Submit contact form - validate, sanitize, save, email admin
 * @access  Public
 * @limit   strictLimiter (5 requests per 15 minutes per IP)
 */
router.post('/', strictLimiter, [
  // Validation rules
  body('name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters')
    .escape(),
  
  body('email')
    .trim()
    .isEmail()
    .withMessage('Must be a valid email address')
    .normalizeEmail(),
  
  body('message')
    .trim()
    .isLength({ min: 10, max: 2000 })
    .withMessage('Message must be between 10 and 2000 characters')
    .escape()
], async (req, res) => {
  // Process validation results
  const errors = req.validationErrors?.() || [];
  
  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors
    });
  }

  const { name, email, message } = req.body;

  try {
    // Sanitize input (already done by sanitizeInput middleware, but double-safe)
    const sanitizedName = sanitizeInput ? name.replace(/<[^>]*>/g, '') : name;
    const sanitizedEmail = sanitizeInput ? email.replace(/<[^>]*>/g, '') : email;
    const sanitizedMessage = sanitizeInput ? message.replace(/<[^>]*>/g, '') : message;

    // Save to database
    const [result] = await pool.query(
      `INSERT INTO contact_messages (name, email, message, status) VALUES (?, ?, ?, 'new')`,
      [sanitizedName, sanitizedEmail, sanitizedMessage]
    );

    // Attempt to send email to admin
    let emailSent = false;
    let emailError = null;

    if (transporter) {
      try {
        await transporter.sendMail({
          from: `"Royal Temple Worship Centre" <${process.env.EMAIL_USER || 'no-reply@royaltemple.org'}>`,
          to: process.env.ADMIN_NOTIFICATION_EMAIL || 'admin@royaltemple.org',
          replyTo: email,
          subject: `New Contact Message from ${name}`,
          text: `From: ${name} (${email})\n\nMessage: ${sanitizedMessage}`,
          html: `<p><strong>From:</strong> ${name} (${email})</p><p><strong>Message:</strong> ${sanitizedMessage.replace(/\n/g, '<br>')}</p>`
        });
        emailSent = true;
        log.info(`Contact form email sent to ${process.env.ADMIN_NOTIFICATION_EMAIL || 'admin@royaltemple.org'}`);
      } catch (emailError) {
        // Log the error but continue - message is already saved
        emailError = emailError.message;
        log.error('Failed to send contact form email:', emailError);
      }
    }

    return res.json({
      success: true,
      data: {
        id: result.insertId,
        message: 'Message sent successfully'
      },
      message: emailSent 
        ? 'Your message has been sent. We will get back to you soon.' 
        : 'Your message has been saved. Our team will review it shortly. (Email notification temporarily unavailable)'
    });

  } catch (error) {
    console.error('Contact route error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to process contact form'
    });
  }
});

module.exports = router;