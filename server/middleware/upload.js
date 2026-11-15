/**
 * =============================================================================
 * middleware/upload.js: receives one image for POST /api/admin/upload.
 *
 * - One file per request, in the form field "image", 5 MB at most.
 * - JPEG, PNG and WebP only. The type is decided from the first bytes of the
 *   file itself. The file name and the type the browser claims are not trusted,
 *   so a text file renamed to .jpg is rejected.
 * - The file is saved under a random name. The original name is never used.
 *
 * WARNING: UPLOADS CAN BE LOST ON SOME HOSTS.
 * Files are written to assets/uploads/ on the server's own disk. Hosts such as
 * Render, Railway, Heroku and Fly.io give each deployment a fresh, temporary
 * disk, so every uploaded photo disappears at the next deploy or restart. On
 * such a host, either attach a persistent disk/volume and mount it at
 * assets/uploads/, or change saveImage() below to send the file to object
 * storage (for example S3, Cloudflare R2 or Cloudinary) and return that address.
 * A VPS or shared host with an ordinary disk keeps the files; include
 * assets/uploads/ in the backups described in BACKUPS.md.
 * =============================================================================
 */
const crypto = require('crypto');
const fs = require('fs/promises');
const path = require('path');
const multer = require('multer');

const { UPLOAD_URL_PREFIX } = require('../utils/validators');

const UPLOAD_DIR = path.join(__dirname, '..', '..', 'assets', 'uploads');
const MAX_BYTES = 5 * 1024 * 1024;

const receive = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_BYTES, files: 1, fields: 0 },
}).single('image');

/** Returns 'jpg', 'png' or 'webp' from the file's first bytes, or null. */
function detectImageType(buffer) {
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return 'jpg';
  if (buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'png';
  if (buffer.length >= 12 && buffer.toString('latin1', 0, 4) === 'RIFF' && buffer.toString('latin1', 8, 12) === 'WEBP') return 'webp';
  return null;
}

/** Writes the image under a random name and returns the address the site uses for it. */
async function saveImage(buffer, extension) {
  await fs.mkdir(UPLOAD_DIR, { recursive: true });
  const name = `${crypto.randomBytes(16).toString('hex')}.${extension}`;
  await fs.writeFile(path.join(UPLOAD_DIR, name), buffer, { flag: 'wx' });
  return `${UPLOAD_URL_PREFIX}${name}`;
}

function reject(res, status, message) {
  return res.status(status).json({ success: false, message });
}

/** Express handler: receives, checks and saves the image, then answers { url }. */
function uploadImage(req, res, next) {
  receive(req, res, async (err) => {
    try {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') return reject(res, 413, 'The image is larger than 5 MB. Choose a smaller one.');
        return reject(res, 400, 'Send one image at a time, in the field named "image".');
      }
      if (err) return next(err);
      if (!req.file) return reject(res, 400, 'Choose an image to upload.');

      const extension = detectImageType(req.file.buffer);
      if (!extension) return reject(res, 415, 'That file is not a JPEG, PNG or WebP image.');

      const url = await saveImage(req.file.buffer, extension);
      return res.status(201).json({ success: true, message: 'Image uploaded.', data: { url } });
    } catch (error) {
      return next(error);
    }
  });
}

module.exports = { uploadImage };
