/**
 * ROYAL TEMPLE WORSHIP CENTRE - Application Logger
 * Writes timestamped info and error lines to console and logs/ folder file
 */

const fs = require('fs');
const path = require('path');
const util = require('util');

// Ensure logs directory exists
const logsDir = path.join(__dirname, '..', 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Create write functions
const writeToConsole = (level, message) => {
  const timestamp = new Date().toISOString();
  const levelStr = level.toUpperCase().padEnd(5);
  const formatted = `[${timestamp}] [${levelStr}] ${message}`;
  
  // Console output
  if (level === 'error') {
    console.error(formatted);
  } else {
    console.info(formatted);
  }
};

const writeToFile = async (level, message) => {
  try {
    const logFile = path.join(logsDir, `${level}.log`);
    const writeFile = util.promisify(fs.appendFile.bind(fs));
    const timestamp = new Date().toISOString();
    const formatted = `[${timestamp}] [${level.toUpperCase()}] ${message}\n`;
    await writeFile(logFile, formatted);
  } catch (err) {
    // If file logging fails, just console.error
    console.error('Logger file write failed:', err.message);
  }
};

/**
 * Log an info message
 * @param {string} message - Message to log
 * @param {boolean} alsoConsole - Also output to console
 */
const info = (message, alsoConsole = true) => {
  if (alsoConsole) writeToConsole('info', message);
  writeToFile('info', message);
};

/**
 * Log an error message
 * @param {string} message - Message to log
 * @param {boolean} alsoConsole - Also output to console
 * @param {Error} [err] - Error object (optional)
 */
const error = (message, alsoConsole = true, err) => {
  const errDetails = err ? ` - ${err.message}` : '';
  const fullMessage = message + errDetails;
  
  if (alsoConsole) writeToConsole('error', fullMessage);
  writeToFile('error', fullMessage);
};

/**
 * Log a warning message
 * @param {string} message - Message to log
 */
const warn = (message) => {
  const timestamp = new Date().toISOString();
  const formatted = `[${timestamp}] [WARN] ${message}`;
  console.warn(formatted);
  writeToFile('warn', message);
};

/**
 * Setup logging on server start
 * @param {Object} app - Express application
 */
const setup = (app) => {
  // Log startup info
  info(`Server starting in ${process.env.NODE_ENV || 'development'} mode`);
  
  // Log request handling
  app.use((req, res, next) => {
    info(`${req.method} ${req.originalUrl}`, false);
    next();
  });
};

module.exports = { info, error, warn, setup };