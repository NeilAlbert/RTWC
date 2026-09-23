/**
 * =============================================================================
 * utils/mailer.js — nodemailer wrapper for notification emails.
 *
 * Sends notifications (contact form, prayer requests) to the admin.
 * If SMTP is not configured (missing EMAIL_HOST/EMAIL_USER/EMAIL_PASSWORD),
 * sending is skipped with a warning instead of crashing — the DB write still
 * succeeds so no user data is ever lost.
 * =============================================================================
 */
const nodemailer = require('nodemailer');
const logger = require('./logger');

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;

  const { EMAIL_HOST, EMAIL_PORT, EMAIL_USER, EMAIL_PASSWORD } = process.env;
  if (!EMAIL_HOST || !EMAIL_USER || !EMAIL_PASSWORD) {
    return null; // email not configured — callers skip gracefully
  }

  transporter = nodemailer.createTransport({
    host: EMAIL_HOST,
    port: Number(EMAIL_PORT) || 465,
    secure: Number(EMAIL_PORT) === 465,
    auth: { user: EMAIL_USER, pass: EMAIL_PASSWORD },
  });
  return transporter;
}

/**
 * Send an email to the admin notification address.
 * @param {object} options - { to, subject, text, html }
 * @returns {Promise<object>} nodemailer info, or { skipped: true } when SMTP is unconfigured
 */
async function sendMail({ to, subject, text, html }) {
  const t = getTransporter();
  const recipient = to || process.env.ADMIN_NOTIFICATION_EMAIL;

  if (!t || !recipient) {
    logger.warn('Mailer not configured or no recipient — skipping email', { subject });
    return { skipped: true };
  }

  try {
    const info = await t.sendMail({
      from: `"Royal Temple Website" <${process.env.EMAIL_USER}>`,
      to: recipient,
      subject,
      text,
      html,
    });
    logger.info('Email sent', { to: recipient, subject, messageId: info.messageId });
    return info;
  } catch (err) {
    logger.error('Email send failed', { to: recipient, subject, message: err.message });
    throw err;
  }
}

module.exports = { sendMail };
