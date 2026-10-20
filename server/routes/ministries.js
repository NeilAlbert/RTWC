/**
 * =============================================================================
 * routes/ministries.js — ministry endpoints.
 * =============================================================================
 */
const express = require('express');
const { body, param } = require('express-validator');

const authMiddleware = require('../middleware/authMiddleware');
const authorizeRoles = require('../middleware/authorizeRoles');
const validateRequest = require('../middleware/validateRequest');
const { sanitizeBody } = require('../middleware/sanitizeInput');
const {
  getMinistries,
  getMinistryBySlug,
  createMinistry,
  updateMinistry,
  deleteMinistry,
} = require('../controllers/ministriesController');

const router = express.Router();

/** GET /api/ministries/manage — admin directory including unpublished entries */
router.get('/manage', authMiddleware, authorizeRoles('super_admin', 'admin', 'editor'), (req, res, next) => {
  req.adminLibrary = true;
  getMinistries(req, res, next);
});

/** GET /api/ministries — public */
router.get('/', getMinistries);

/** GET /api/ministries/:slug — public */
router.get(
  '/:slug',
  [param('slug').trim().isLength({ min: 1, max: 160 })],
  validateRequest,
  getMinistryBySlug
);

/** POST /api/ministries — admin only */
router.post(
  '/',
  authMiddleware,
  authorizeRoles('super_admin', 'admin', 'editor'),
  sanitizeBody(['name', 'description'], { maxLength: 5000 }),
  [
    body('name').trim().isLength({ min: 1, max: 150 }).withMessage('Name is required.'),
    body('slug').trim().matches(/^[a-z0-9-]+$/).withMessage('Slug must be lowercase letters, numbers, and hyphens.'),
    body('description').optional().isString().isLength({ max: 5000 }),
    body('image_url').optional({ values: 'falsy' }).isURL({ require_protocol: true }),
    body('meeting_day').optional().trim().isLength({ max: 100 }),
    body('meeting_time').optional().trim().isLength({ max: 100 }),
    body('meeting_location').optional().trim().isLength({ max: 255 }),
    body('leader_name').optional().trim().isLength({ max: 150 }),
    body('contact_phone').optional().trim().isLength({ max: 50 }),
    body('contact_email').optional({ values: 'falsy' }).isEmail(),
    body('published').optional().isBoolean(),
    body('featured').optional().isBoolean(),
  ],
  validateRequest,
  createMinistry
);

/** PUT /api/ministries/:id — admin only */
router.put(
  '/:id',
  authMiddleware,
  authorizeRoles('super_admin', 'admin', 'editor'),
  sanitizeBody(['name', 'description'], { maxLength: 5000 }),
  [
    param('id').isInt({ min: 1 }),
    body('name').trim().isLength({ min: 1, max: 150 }),
    body('slug').trim().matches(/^[a-z0-9-]+$/),
    body('description').optional().isString().isLength({ max: 5000 }),
    body('image_url').optional({ values: 'falsy' }).isURL({ require_protocol: true }),
    body('meeting_day').optional().trim().isLength({ max: 100 }),
    body('meeting_time').optional().trim().isLength({ max: 100 }),
    body('meeting_location').optional().trim().isLength({ max: 255 }),
    body('leader_name').optional().trim().isLength({ max: 150 }),
    body('contact_phone').optional().trim().isLength({ max: 50 }),
    body('contact_email').optional({ values: 'falsy' }).isEmail(),
    body('published').optional().isBoolean(),
    body('featured').optional().isBoolean(),
  ],
  validateRequest,
  updateMinistry
);

/** DELETE /api/ministries/:id — admin only */
router.delete(
  '/:id',
  authMiddleware,
  authorizeRoles('super_admin', 'admin', 'editor'),
  [param('id').isInt({ min: 1 }).withMessage('Invalid ministry id.')],
  validateRequest,
  deleteMinistry
);

module.exports = router;
