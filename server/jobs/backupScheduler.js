/**
 * jobs/backupScheduler.js: the automatic monthly backup.
 *
 * Once an hour (and once a minute after start-up) this asks the backup service
 * whether this month's automatic backup is due, and makes it if so. The rules
 * are in backupService.runAutomaticIfDue(): switched on, BACKUP_PASSPHRASE set,
 * 02:00 UTC on the 1st or any later time that month (so a server that was off on
 * the 1st catches up), at most one try an hour and 3 tries a month. When a
 * manual backup or a restore is running at check time, it looks again 5 minutes later.
 *
 * Every copy of the server runs this. The claim on the month's backup_runs row
 * makes sure only one of them makes the backup; Redis is not needed for that.
 * Restores never run from here.
 */
const logger = require('../utils/logger');
const backups = require('../services/backupService');

const HOUR_MS = 60 * 60 * 1000;
const FIRST_CHECK_MS = 60 * 1000;
// A manual backup or a restore was running: look again soon instead of an hour later.
const BUSY_RETRY_MS = 5 * 60 * 1000;

let timer = null;
let checking = false;

async function check() {
  if (checking) return;
  checking = true;
  try {
    const result = await backups.runAutomaticIfDue();
    if (result === 'success' || result === 'failed') logger.info('Automatic backup check', { result });
    if (result === 'busy') setTimeout(check, BUSY_RETRY_MS).unref();
  } catch (err) {
    logger.error('Automatic backup check failed', { code: err.code });
  } finally {
    checking = false;
  }
}

function start() {
  if (timer) return;
  setTimeout(check, FIRST_CHECK_MS).unref();
  timer = setInterval(check, HOUR_MS);
  timer.unref();
}

module.exports = { start, check };
