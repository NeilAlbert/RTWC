/**
 * routes/adminBackups.js: /api/admin/backups, mounted in server.js before
 * routes/admin.js.
 *
 *   GET    /                      list, newest first, with totals and free disk space
 *   POST   /                      start a backup: { includeImages, passphrase, passphraseConfirm }
 *   GET    /:id                   one backup, for following one that is running
 *   POST   /:id/download-ticket   a single-use link to download it, valid for 60 seconds
 *   GET    /download/:ticket      the file itself (the ticket is the proof, see below)
 *   DELETE /:id                   delete the file and mark the record deleted
 *   GET    /summary               newest backup, last download, and the state for Site status
 *   GET    /automatic             the monthly backup settings, next run and last result
 *   PUT    /automatic             save them: { enabled, keep, includeImages }
 *   POST   /restore/upload        upload a file to restore from (field "backup"); nothing is applied
 *   POST   /:id/restore-session   restore from a saved backup instead: the same steps follow
 *   POST   /restore/inspect       check the file: { sessionId, passphrase }; a summary, never rows
 *   POST   /restore/apply         restore: { sessionId, passphrase, adminPassword, confirmText, restoreImages }
 *   GET    /restore/jobs/:jobId   follow a restore that has started
 *   DELETE /restore/sessions/:id  start again; an uploaded file is removed
 *
 * Every route but the download needs a signed-in admin (authMiddleware) and
 * checks its input with express-validator and validateRequest. The admin's token
 * is kept in sessionStorage, so a plain link cannot carry it: the download is
 * instead reached with a ticket that a signed-in admin asked for a moment ago,
 * which works once and for 60 seconds.
 *
 * No body field here is free text that is saved or shown, so sanitizeBody has
 * nothing to clean. The passphrases must never be changed in any way, so they are
 * deliberately not passed through it: they are checked and used exactly as typed.
 */
const express = require('express');
const { body, param } = require('express-validator');

const authMiddleware = require('../middleware/authMiddleware');
const validateRequest = require('../middleware/validateRequest');
const {
  backupLimiter, restoreUploadLimiter, restoreInspectLimiter, restoreApplyLimiter, restorePasswordLimiter,
} = require('../middleware/rateLimiter');
const { receiveBackupFile } = require('../middleware/backupUpload');
const { MIN_PASSPHRASE_LENGTH } = require('../services/backupService');
const {
  requireBackupDir, listBackups, getBackup, createBackup, createDownloadTicket, downloadBackup, deleteBackup,
  getSummary, getAutomatic, saveAutomatic, uploadRestoreFile, startSavedRestore, inspectRestore, applyRestore,
  getRestoreJob, cancelRestore,
} = require('../controllers/backupsController');

const router = express.Router();

const MAX_PASSPHRASE_BYTES = 1024;
const idRule = [param('id').isInt({ min: 1, max: 4294967295 }).withMessage('Invalid id.').bail().toInt()];

router.get(
  '/download/:ticket',
  [param('ticket').matches(/^[A-Za-z0-9_-]{43}$/).withMessage('Invalid download link.')],
  validateRequest,
  requireBackupDir,
  downloadBackup
);

router.use(authMiddleware);

/** GET /summary: for the dashboard and Site status. It reports a folder problem itself, so it comes before the folder check. */
router.get('/summary', validateRequest, getSummary);

router.use(requireBackupDir);

router.get('/', validateRequest, listBackups);

router.post(
  '/',
  backupLimiter,
  [
    body('includeImages').optional().isBoolean({ strict: true }).withMessage('Choose whether to include the images.'),
    body('passphrase')
      .isString().withMessage(`Enter a passphrase of at least ${MIN_PASSPHRASE_LENGTH} characters.`).bail()
      .custom((value) => value.length >= MIN_PASSPHRASE_LENGTH)
      .withMessage(`Use at least ${MIN_PASSPHRASE_LENGTH} characters.`).bail()
      .custom((value) => Buffer.byteLength(value, 'utf8') <= MAX_PASSPHRASE_BYTES)
      .withMessage('The passphrase is too long. Use a shorter one.'),
    body('passphraseConfirm')
      .custom((value, { req }) => typeof value === 'string' && value === req.body.passphrase)
      .withMessage('The two passphrases are not the same.'),
  ],
  validateRequest,
  createBackup
);

// ---------------------------------------------------------------------------
// Automatic monthly backup. The switch can only be turned on while
// BACKUP_PASSPHRASE is set on the server (checked in the service).
// ---------------------------------------------------------------------------
router.get('/automatic', validateRequest, getAutomatic);
router.put(
  '/automatic',
  [
    body('enabled').isBoolean({ strict: true }).withMessage('Choose whether automatic backups are on.'),
    body('keep').isInt({ min: 2, max: 24 }).withMessage('Keep from 2 to 24 automatic backups.').toInt(),
    body('includeImages').isBoolean({ strict: true }).withMessage('Choose whether to include the images.'),
  ],
  validateRequest,
  saveAutomatic
);

// ---------------------------------------------------------------------------
// Restore. Nothing is changed until /restore/apply, which needs a checked
// session, the passphrase, the admin password and the typed word RESTORE.
// A restore never runs on a schedule.
// ---------------------------------------------------------------------------
const SESSION_ENDED = 'This restore has expired or was already used. Choose the backup file again.';
const sessionRule = (location) => location('sessionId')
  .isString().withMessage(SESSION_ENDED).bail()
  .matches(/^[a-f0-9]{32}$/).withMessage(SESSION_ENDED);
const restorePassphrase = body('passphrase')
  .isString().withMessage('Enter the passphrase of the backup file.').bail()
  .isLength({ min: 1 }).withMessage('Enter the passphrase of the backup file.').bail()
  .custom((value) => Buffer.byteLength(value, 'utf8') <= MAX_PASSPHRASE_BYTES)
  .withMessage('The passphrase is too long.');

router.post('/restore/upload', restoreUploadLimiter, receiveBackupFile, uploadRestoreFile);
router.post('/restore/inspect', restoreInspectLimiter, [sessionRule(body), restorePassphrase], validateRequest, inspectRestore);
router.post(
  '/restore/apply',
  restorePasswordLimiter,
  restoreApplyLimiter,
  [
    sessionRule(body),
    restorePassphrase,
    body('adminPassword')
      .isString().withMessage('Enter your admin password.').bail()
      .isLength({ min: 1, max: 1000 }).withMessage('Enter your admin password.'),
    // Exactly the word, in capitals. Nothing is trimmed or changed.
    body('confirmText').custom((value) => value === 'RESTORE').withMessage('Type RESTORE in capital letters to confirm.'),
    body('restoreImages').optional().isBoolean({ strict: true }).withMessage('Choose whether to restore the images.'),
  ],
  validateRequest,
  applyRestore
);
router.get(
  '/restore/jobs/:jobId',
  [param('jobId').matches(/^[a-f0-9]{32}$/).withMessage('Invalid restore.')],
  validateRequest,
  getRestoreJob
);
router.delete('/restore/sessions/:sessionId', [sessionRule(param)], validateRequest, cancelRestore);

router.get('/:id', idRule, validateRequest, getBackup);
router.post('/:id/download-ticket', idRule, validateRequest, createDownloadTicket);
router.post('/:id/restore-session', restoreUploadLimiter, idRule, validateRequest, startSavedRestore);
router.delete('/:id', idRule, validateRequest, deleteBackup);

module.exports = router;
