/**
 * middleware/backupUpload.js: receives one backup file to restore from, for
 * POST /api/admin/backups/restore/upload.
 *
 * - One file, in the form field "backup", at most BACKUP_MAX_UPLOAD_MB (default 500).
 * - Only a name ending in .rtwcbackup is accepted here. The file's first bytes are
 *   checked afterwards (backupService.openUploadSession), so a renamed file is refused.
 * - It is written to BACKUP_DIR/restore-uploads under a random name, never under
 *   the name it came with, and is removed when its restore session ends.
 */
const crypto = require('crypto');
const multer = require('multer');

const { restoreUploadDir, BackupError } = require('../services/backupService');

const uploadMb = Number(process.env.BACKUP_MAX_UPLOAD_MB);
const MAX_UPLOAD_MB = Number.isFinite(uploadMb) && uploadMb > 0 ? Math.floor(uploadMb) : 500;

function refuse(res, status, message) {
  return res.status(status).json({ success: false, data: null, message });
}

function receiveBackupFile(req, res, next) {
  restoreUploadDir().then((folder) => {
    const receive = multer({
      storage: multer.diskStorage({
        destination: (request, file, callback) => callback(null, folder),
        filename: (request, file, callback) => callback(null, `${crypto.randomBytes(16).toString('hex')}.upload`),
      }),
      limits: { fileSize: MAX_UPLOAD_MB * 1024 * 1024, files: 1, fields: 0, parts: 1 },
      fileFilter: (request, file, callback) => {
        if (!/\.rtwcbackup$/i.test(String(file.originalname || ''))) {
          callback(new BackupError('Choose a backup file. Its name ends in .rtwcbackup.', 400));
          return;
        }
        callback(null, true);
      },
    }).single('backup');

    // multer removes a file it had started to write when the upload fails.
    receive(req, res, (err) => {
      if (err instanceof BackupError) return refuse(res, err.status, err.message);
      if (err && err.code === 'LIMIT_FILE_SIZE') {
        return refuse(res, 413, `The file is larger than the upload limit of ${MAX_UPLOAD_MB} MB (BACKUP_MAX_UPLOAD_MB).`);
      }
      if (err instanceof multer.MulterError) return refuse(res, 400, 'Choose one backup file to upload.');
      if (err) return next(err);
      if (!req.file) return refuse(res, 400, 'Choose a backup file to upload.');
      return next();
    });
  }, (err) => {
    if (err instanceof BackupError) return refuse(res, err.status, err.message);
    return next(err);
  });
}

module.exports = { receiveBackupFile, MAX_UPLOAD_MB };
