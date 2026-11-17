/**
 * controllers/mediaController.js: lists and deletes the images in assets/uploads/.
 *
 * Only files the upload route itself could have saved are ever listed or deleted:
 * the name must be 32 hex characters and .jpg, .png or .webp. That one rule keeps
 * out slashes, "..", names that start with a dot, and every other file on the disk.
 */
const fs = require('fs/promises');
const path = require('path');

const MediaUsage = require('../models/mediaUsageModel');
const { UPLOAD_DIR } = require('../middleware/upload');
const { UPLOAD_URL_PREFIX, UPLOAD_NAME_PATTERN } = require('../utils/validators');
const { NotFoundError } = require('../utils/errors');
const logger = require('../utils/logger');

/** The uploaded files, as { filename, size, modified }. An uploads folder that is not there yet is an empty list. */
async function readUploads() {
  let names;
  try {
    names = await fs.readdir(UPLOAD_DIR);
  } catch (err) {
    if (err.code === 'ENOENT') return [];
    throw err;
  }
  const files = await Promise.all(names.filter((name) => UPLOAD_NAME_PATTERN.test(name)).map(async (filename) => {
    const stats = await fs.lstat(path.join(UPLOAD_DIR, filename));
    return stats.isFile() ? { filename, size: stats.size, modified: stats.mtime } : null;
  }));
  return files.filter(Boolean);
}

/** The labels of everything that uses this file. */
function usesOf(filename, uses) {
  const url = `${UPLOAD_URL_PREFIX}${filename}`;
  return uses.filter((use) => String(use.url).includes(url)).map((use) => use.usedBy);
}

/** GET /api/admin/media: newest first, ?page=&limit=&q= (q searches the file name) */
async function listMedia(req, res, next) {
  try {
    const [files, uses] = await Promise.all([readUploads(), MediaUsage.findAllUses()]);
    const q = String(req.query.q || '').toLowerCase();
    const matching = files
      .filter((file) => !q || file.filename.includes(q))
      .sort((a, b) => b.modified - a.modified);

    const limit = Number(req.query.limit) || 24;
    const totalPages = Math.max(1, Math.ceil(matching.length / limit));
    const page = Math.min(Number(req.query.page) || 1, totalPages);
    const items = matching.slice((page - 1) * limit, page * limit).map((file) => ({
      filename: file.filename,
      url: `${UPLOAD_URL_PREFIX}${file.filename}`,
      size: file.size,
      // Local time as "YYYY-MM-DD HH:MM", the same shape the database dates have.
      uploaded_at: new Date(file.modified.getTime() - file.modified.getTimezoneOffset() * 60000).toISOString().slice(0, 16).replace('T', ' '),
      used_by: usesOf(file.filename, uses),
    }));

    return res.json({
      success: true,
      data: { items, pagination: { page, limit, total: matching.length, totalPages } },
      message: 'Images fetched successfully.',
    });
  } catch (err) {
    return next(err);
  }
}

/** DELETE /api/admin/media/:filename. The route has already checked the name's shape. */
async function deleteMedia(req, res, next) {
  try {
    const { filename } = req.params;
    const filePath = path.join(UPLOAD_DIR, filename);
    // Belt and braces: the checked name can only ever resolve to a file directly inside the uploads folder.
    if (path.dirname(filePath) !== UPLOAD_DIR) return next(new NotFoundError('Image not found.'));

    let stats = null;
    try {
      stats = await fs.lstat(filePath);
    } catch (err) {
      if (err.code !== 'ENOENT') throw err;
    }
    if (!stats || !stats.isFile()) return next(new NotFoundError('Image not found.'));

    const usedBy = usesOf(filename, await MediaUsage.findAllUses());
    if (usedBy.length > 0) {
      return res.status(409).json({
        success: false,
        data: null,
        message: `This image is in use and was not deleted. Remove it from these first: ${usedBy.join('; ')}.`,
      });
    }

    await fs.unlink(filePath);
    logger.info('Uploaded image deleted', { adminId: req.admin.id, filename });
    return res.json({ success: true, data: null, message: 'Image deleted.' });
  } catch (err) {
    return next(err);
  }
}

module.exports = { listMedia, deleteMedia };
