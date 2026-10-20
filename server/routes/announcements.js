const express = require('express');
const { body, param, query } = require('express-validator');

const authMiddleware = require('../middleware/authMiddleware');
const authorizeRoles = require('../middleware/authorizeRoles');
const validateRequest = require('../middleware/validateRequest');
const { sanitizeBody } = require('../middleware/sanitizeInput');
const {
  getAnnouncements,
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
} = require('../controllers/announcementsController');

const router = express.Router();
const roles = authorizeRoles('super_admin', 'admin', 'editor');
const priorities = ['normal', 'important', 'urgent'];

router.get(
  '/manage',
  authMiddleware,
  roles,
  [query('q').optional().trim().isLength({ max: 255 }), query('page').optional().isInt({ min: 1 }), query('limit').optional().isInt({ min: 1, max: 50 })],
  validateRequest,
  (req, res, next) => {
    req.adminLibrary = true;
    getAnnouncements(req, res, next);
  }
);

router.get(
  '/',
  [query('q').optional().trim().isLength({ max: 255 }), query('page').optional().isInt({ min: 1 }), query('limit').optional().isInt({ min: 1, max: 50 })],
  validateRequest,
  getAnnouncements
);

const fields = [
  body('title').trim().isLength({ min: 1, max: 255 }),
  body('content').trim().isLength({ min: 1, max: 20000 }),
  body('image_url').optional({ values: 'falsy' }).isURL({ require_protocol: true }),
  body('priority').optional().isIn(priorities),
  body('published').optional().isBoolean(),
  body('featured').optional().isBoolean(),
  body('expires_at').optional({ values: 'falsy' }).isISO8601(),
];

router.post(
  '/',
  authMiddleware,
  roles,
  sanitizeBody(['title', 'content'], { maxLength: 20000 }),
  fields,
  validateRequest,
  createAnnouncement
);

router.put(
  '/:id',
  authMiddleware,
  roles,
  param('id').isInt({ min: 1 }),
  sanitizeBody(['title', 'content'], { maxLength: 20000 }),
  fields,
  validateRequest,
  updateAnnouncement
);

router.delete(
  '/:id',
  authMiddleware,
  roles,
  [param('id').isInt({ min: 1 })],
  validateRequest,
  deleteAnnouncement
);

module.exports = router;