/**
 * =============================================================================
 * utils/logger.js — structured logging to console + a log file.
 *
 * Never log sensitive data: passwords, JWT tokens, or API keys are passed
 * nowhere near this logger.
 * =============================================================================
 */
const fs = require('fs');
const path = require('path');

const LOG_DIR = path.join(__dirname, '..', 'logs');
const LOG_FILE = path.join(LOG_DIR, 'server.log');

// Ensure the logs directory exists (best-effort; failures fall back to console).
try {
  fs.mkdirSync(LOG_DIR, { recursive: true });
} catch (err) {
  // Ignore — logging will degrade to console-only.
}

function formatEntry(level, message, meta) {
  const timestamp = new Date().toISOString();
  const metaStr = meta ? ` ${JSON.stringify(meta)}` : '';
  return `[${timestamp}] [${level.toUpperCase()}] ${message}${metaStr}`;
}

function write(level, message, meta) {
  const entry = formatEntry(level, message, meta);

  if (level === 'error') {
    console.error(entry);
  } else {
    console.log(entry);
  }

  try {
    fs.appendFileSync(LOG_FILE, `${entry}\n`);
  } catch (err) {
    // Never let logging failures crash the server.
    console.error('Logger: failed to write to log file:', err.message);
  }
}

module.exports = {
  info: (message, meta) => write('info', message, meta),
  warn: (message, meta) => write('warn', message, meta),
  error: (message, meta) => write('error', message, meta),
};
