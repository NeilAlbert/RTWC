/**
 * controllers/backupsController.js: /api/admin/backups. The work is done in
 * services/backupService.js; this file turns it into responses.
 *
 * A response never holds a passphrase, a file path or a stored file name. A
 * known problem (busy, folder, not set up) is answered with its own plain
 * message; anything else goes to the error handler, which shows a general one.
 */
const fs = require('fs');
const { pipeline } = require('stream/promises');
const bcrypt = require('bcrypt');

const Admin = require('../models/adminModel');
const BackupRun = require('../models/backupRunModel');
const logger = require('../utils/logger');
const backups = require('../services/backupService');

const { BackupError, MESSAGES } = backups;

/** What the admin page is told about one backup. */
function toPublic(run, fileAvailable) {
  const counts = run.tableCounts || {};
  return {
    id: run.id,
    kind: run.kind,
    status: run.status,
    sizeBytes: run.sizeBytes,
    includesImages: run.includesImages,
    tableCounts: counts,
    tableCount: Object.keys(counts).length,
    totalRows: Object.values(counts).reduce((sum, rows) => sum + (Number(rows) || 0), 0),
    imageCount: run.imageCount,
    sha256: run.sha256,
    errorMessage: run.errorMessage,
    startedAt: run.startedAt,
    finishedAt: run.finishedAt,
    downloadedAt: run.downloadedAt,
    fileAvailable: Boolean(fileAvailable),
  };
}

async function withFileState(run) {
  return toPublic(run, run.status === 'success' && (await backups.fileExists(run.filename)));
}

/** Answers a known problem itself; passes anything else on. */
function handleError(err, res, next) {
  if (err instanceof BackupError) {
    return res.status(err.status).json({ success: false, data: null, message: err.message });
  }
  if (backups.isMissingTable(err)) {
    return res.status(503).json({ success: false, data: null, message: MESSAGES.notSetUp });
  }
  return next(err);
}

/** Every route checks the backup folder first, so a folder that cannot be used is reported plainly. */
async function requireBackupDir(req, res, next) {
  try {
    await backups.ensureBackupDir();
    return next();
  } catch (err) {
    return handleError(err, res, next);
  }
}

/** GET /api/admin/backups */
async function listBackups(req, res, next) {
  try {
    const runs = await BackupRun.list();
    const items = await Promise.all(runs.map(withFileState));
    const [totals, freeBytes, uploads] = await Promise.all([
      BackupRun.totals(),
      backups.freeDiskBytes(),
      backups.uploadsSummary(),
    ]);
    return res.json({
      success: true,
      message: 'Backups fetched.',
      data: {
        items,
        totals,
        freeBytes,
        uploads,
        running: backups.isBusy() || items.some((item) => item.status === 'running'),
        limits: { maxBytes: backups.MAX_BYTES, minPassphraseLength: backups.MIN_PASSPHRASE_LENGTH },
      },
    });
  } catch (err) {
    return handleError(err, res, next);
  }
}

/** GET /api/admin/backups/:id */
async function getBackup(req, res, next) {
  try {
    const run = await BackupRun.findById(req.params.id);
    if (!run) return res.status(404).json({ success: false, data: null, message: 'That backup does not exist.' });
    return res.json({ success: true, message: 'Backup fetched.', data: { backup: await withFileState(run) } });
  } catch (err) {
    return handleError(err, res, next);
  }
}

/**
 * POST /api/admin/backups. Body { includeImages, passphrase, passphraseConfirm }.
 * Answers 202 as soon as the backup has started; the page then asks for
 * GET /api/admin/backups/:id until it has finished.
 */
async function createBackup(req, res, next) {
  try {
    const { id, done } = await backups.createBackup({
      kind: 'manual',
      includeImages: req.body.includeImages === true,
      passphrase: req.body.passphrase,
    });
    // The result is recorded in backup_runs and logged by the service; the page reads it from there.
    done.catch(() => undefined);
    const run = await BackupRun.findById(id);
    return res.status(202).json({
      success: true,
      message: 'The backup has started.',
      data: { backup: toPublic(run, false) },
    });
  } catch (err) {
    return handleError(err, res, next);
  }
}

/** POST /api/admin/backups/:id/download-ticket */
async function createDownloadTicket(req, res, next) {
  try {
    const run = await BackupRun.findById(req.params.id);
    if (!run || run.status !== 'success' || !(await backups.fileExists(run.filename))) {
      return res.status(404).json({ success: false, data: null, message: 'That backup cannot be downloaded. Reload the page and try again.' });
    }
    return res.json({ success: true, message: 'Download ready.', data: await backups.issueTicket(run.id) });
  } catch (err) {
    return handleError(err, res, next);
  }
}

/**
 * The page a browser shows when it opens a download link that no longer works.
 * The link is opened by navigating, so a plain page reads better than JSON.
 */
function refuseDownload(res, status, message) {
  res.set({ 'Cache-Control': 'no-store', 'Content-Security-Policy': "default-src 'none'", 'X-Content-Type-Options': 'nosniff' });
  return res.status(status).format({
    'text/html': () => res.send(`<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><meta name="robots" content="noindex, nofollow"><title>Download not available</title></head><body><h1>Download not available</h1><p>${message}</p><p><a href="/admin/backups.html">Back to Backups</a></p></body></html>`),
    default: () => res.json({ success: false, data: null, message }),
  });
}

const LINK_ENDED = 'This download link has already been used or has expired. Go back to Backups and choose Download again.';

/** GET /api/admin/backups/download/:ticket. The ticket is the only proof needed, and it works once. */
async function downloadBackup(req, res, next) {
  try {
    const runId = await backups.redeemTicket(req.params.ticket);
    const run = runId ? await BackupRun.findById(runId) : null;
    if (!run || run.status !== 'success' || !(await backups.fileExists(run.filename))) {
      return refuseDownload(res, 404, LINK_ENDED);
    }
    const filePath = backups.storedPath(run.filename);
    const { size } = await fs.promises.stat(filePath);
    await BackupRun.markDownloaded(run.id);
    logger.info('Backup download started', { id: run.id, kind: run.kind, result: 'started' });

    res.set({
      'Content-Type': 'application/octet-stream',
      'Content-Length': String(size),
      'Content-Disposition': `attachment; filename="${backups.downloadName(run)}"`,
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    });
    try {
      await pipeline(fs.createReadStream(filePath), res);
    } catch (err) {
      // The download was cut off, usually because the browser stopped it.
      logger.warn('Backup download did not finish', { id: run.id, kind: run.kind, result: 'interrupted' });
    }
    return undefined;
  } catch (err) {
    if (res.headersSent) return res.destroy();
    return handleError(err, res, next);
  }
}

/** DELETE /api/admin/backups/:id */
async function deleteBackup(req, res, next) {
  try {
    const run = await BackupRun.findById(req.params.id);
    if (!run) return res.status(404).json({ success: false, data: null, message: 'That backup does not exist.' });
    await backups.deleteBackup(run);
    return res.json({ success: true, data: null, message: 'Backup deleted.' });
  } catch (err) {
    return handleError(err, res, next);
  }
}

// ---------------------------------------------------------------------------
// The state of backups (dashboard and Backups page)
// ---------------------------------------------------------------------------

/** GET /api/admin/backups/summary: the newest backup, the last download and whether a notice is due. */
async function getSummary(req, res, next) {
  try {
    return res.json({ success: true, message: 'Backup summary fetched.', data: await backups.healthSummary() });
  } catch (err) {
    return handleError(err, res, next);
  }
}

// ---------------------------------------------------------------------------
// Automatic monthly backup
// ---------------------------------------------------------------------------

/** GET /api/admin/backups/automatic */
async function getAutomatic(req, res, next) {
  try {
    return res.json({ success: true, message: 'Automatic backup settings fetched.', data: await backups.autoStatus() });
  } catch (err) {
    return handleError(err, res, next);
  }
}

/** PUT /api/admin/backups/automatic. Body { enabled, keep, includeImages }. */
async function saveAutomatic(req, res, next) {
  try {
    await backups.saveAutoSettings({
      enabled: req.body.enabled === true,
      keep: req.body.keep,
      includeImages: req.body.includeImages === true,
    });
    return res.json({ success: true, message: 'Automatic backup settings saved.', data: await backups.autoStatus() });
  } catch (err) {
    return handleError(err, res, next);
  }
}

// ---------------------------------------------------------------------------
// Restore
// ---------------------------------------------------------------------------

/** POST /api/admin/backups/restore/upload: one file in the form field "backup". Nothing is applied. */
async function uploadRestoreFile(req, res, next) {
  try {
    const session = await backups.openUploadSession(req.admin.id, req.file.path);
    return res.status(201).json({ success: true, message: 'The file was uploaded. Enter its passphrase to check it.', data: session });
  } catch (err) {
    await backups.removeUpload(req.file && req.file.path);
    return handleError(err, res, next);
  }
}

/** POST /api/admin/backups/:id/restore-session: start the same restore steps from a saved backup. */
async function startSavedRestore(req, res, next) {
  try {
    const run = await BackupRun.findById(req.params.id);
    if (!run) return res.status(404).json({ success: false, data: null, message: 'That backup does not exist.' });
    const session = await backups.openSavedSession(req.admin.id, run);
    return res.status(201).json({ success: true, message: 'Enter the passphrase of this backup to check it.', data: session });
  } catch (err) {
    return handleError(err, res, next);
  }
}

/** POST /api/admin/backups/restore/inspect. Body { sessionId, passphrase }. Returns a summary, never rows. */
async function inspectRestore(req, res, next) {
  try {
    const summary = await backups.inspectSession(req.body.sessionId, req.admin.id, req.body.passphrase);
    return res.json({ success: true, message: 'The file was checked and can be restored.', data: { summary } });
  } catch (err) {
    // A file that can never be restored (damaged, or another database version): choose another file.
    if (err.fileRejected) {
      return res.status(422).json({ success: false, data: { fileRejected: true }, message: err.message });
    }
    if (err instanceof backups.BackupFileError) {
      return res.status(400).json({
        success: false,
        data: { errors: [{ field: 'passphrase', message: err.message }] },
        message: err.message,
      });
    }
    return handleError(err, res, next);
  }
}

/**
 * POST /api/admin/backups/restore/apply.
 * Body { sessionId, passphrase, adminPassword, confirmText, restoreImages }.
 * The typed RESTORE is checked by the route. The admin password is checked here
 * with bcrypt against the signed-in admin; a wrong one counts toward the sign-in
 * limit (see restorePasswordLimiter). Answers 202 once the restore has started.
 */
async function applyRestore(req, res, next) {
  try {
    const admin = await Admin.findByIdWithHash(req.admin.id);
    const matches = admin ? await bcrypt.compare(req.body.adminPassword, admin.password_hash) : false;
    if (!matches) {
      res.locals.wrongAdminPassword = true;
      logger.warn('Restore refused: wrong admin password', { adminId: req.admin.id });
      return res.status(400).json({
        success: false,
        data: { errors: [{ field: 'adminPassword', message: 'The admin password is not correct.' }] },
        message: 'The admin password is not correct. Nothing was changed.',
      });
    }
    const job = await backups.startRestore({
      sessionId: req.body.sessionId,
      adminId: req.admin.id,
      passphrase: req.body.passphrase,
      restoreImages: req.body.restoreImages === true,
    });
    return res.status(202).json({ success: true, message: 'The restore has started.', data: job });
  } catch (err) {
    if (err instanceof backups.BackupFileError) {
      return res.status(400).json({
        success: false,
        data: { errors: [{ field: 'passphrase', message: err.message }] },
        message: `${err.message} Nothing was changed.`,
      });
    }
    return handleError(err, res, next);
  }
}

/** GET /api/admin/backups/restore/jobs/:jobId */
function getRestoreJob(req, res, next) {
  try {
    return res.json({ success: true, message: 'Restore progress fetched.', data: backups.getJob(req.params.jobId, req.admin.id) });
  } catch (err) {
    return handleError(err, res, next);
  }
}

/** DELETE /api/admin/backups/restore/sessions/:sessionId: start again. An uploaded file is removed. */
async function cancelRestore(req, res, next) {
  try {
    await backups.cancelSession(req.params.sessionId, req.admin.id);
    return res.json({ success: true, data: null, message: 'The restore was cancelled. Nothing was changed.' });
  } catch (err) {
    return handleError(err, res, next);
  }
}

module.exports = {
  requireBackupDir,
  listBackups,
  getBackup,
  createBackup,
  createDownloadTicket,
  downloadBackup,
  deleteBackup,
  getSummary,
  getAutomatic,
  saveAutomatic,
  uploadRestoreFile,
  startSavedRestore,
  inspectRestore,
  applyRestore,
  getRestoreJob,
  cancelRestore,
};
