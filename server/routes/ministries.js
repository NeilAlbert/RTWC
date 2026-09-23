/**
 * =============================================================================
 * routes/ministries.js — ministry endpoints.
 * =============================================================================
 */
const express = require('express');
const { body, param } = require('express-validator');

const authMiddleware = require('../middleware/authMiddleware');
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
  sanitizeBody(['name', 'description'], { maxLength: 5000 }),
  [
    body('name').trim().isLength({ min: 1, max: 150 }).withMessage('Name is required.'),
    body('slug').trim().matches(/^[a-z0-9-]+$/).withMessage('Slug must be lowercase letters, numbers, and hyphens.'),
    body('description').optional().isString().isLength({ max: 5000 }),
    body('icon_url').optional({ values: 'falsy' }).isURL({ require_protocol: true }),
  ],
  validateRequest,
  createMinistry
);

/** PUT /api/ministries/:id — admin only */
router.put(
  '/:id',
  authMiddleware,
  sanitizeBody(['name', 'description'], { maxLength: 5000 }),
  [
    param('id').isInt({ min: 1 }),
    body('name').trim().isLength({ min: 1, max: 150 }),
    body('slug').trim().matches(/^[a-z0-9-]+$/),
    body('description').optional().isString().isLength({ max: 5000 }),
    body('icon_url').optional({ values: 'falsy' }).isURL({ require_protocol: true }),
  ],
  validateRequest,
  updateMinistry
);

/** DELETE /api/ministries/:id — admin only */
router.delete(
  '/:id',
  authMiddleware,
  [param('id').isInt({ min: 1 }).withMessage('Invalid ministry id.')],
  validateRequest,
  deleteMinistry
);

module.exports = router;
