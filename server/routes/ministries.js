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
const { isImageRef } = require('../utils/validators');
const {
  getMinistries,
  getMinistryBySlug,
  createMinistry,
  updateMinistry,
  deleteMinistry,
} = require('../controllers/ministriesController');

const router = express.Router();

/**
 * The same rules for adding and for editing a ministry. A blank slug is allowed:
 * the controller then makes one from the name. The controller also checks that
 * the name and slug are not already in use.
 */
const ministryRules = [
  body('name').trim().isLength({ min: 1, max: 150 }).withMessage('Enter a name of 150 characters or fewer.'),
  body('slug').optional({ values: 'falsy' }).trim().isLength({ max: 160 }).matches(/^[a-z0-9]+(-[a-z0-9]+)*$/)
    .withMessage('The slug may only have lowercase letters, numbers and single hyphens, for example "youth-ministry".'),
  body('description').optional({ values: 'falsy' }).isString().isLength({ max: 5000 })
    .withMessage('The description must be 5000 characters or fewer.'),
  body('icon_url').optional({ values: 'falsy' }).trim().isLength({ max: 500 }).custom(isImageRef)
    .withMessage('The icon must be an uploaded image or a link that starts with http:// or https://.'),
];

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
  sanitizeBody(['name', 'slug', 'description'], { maxLength: 5000 }),
  ministryRules,
  validateRequest,
  createMinistry
);

/** PUT /api/ministries/:id — admin only */
router.put(
  '/:id',
  authMiddleware,
  sanitizeBody(['name', 'slug', 'description'], { maxLength: 5000 }),
  [param('id').isInt({ min: 1 }).withMessage('Invalid ministry id.'), ...ministryRules],
  validateRequest,
  updateMinistry
);

/** DELETE /api/ministries/:id — admin only. Refused while the ministry still has leaders. */
router.delete(
  '/:id',
  authMiddleware,
  [param('id').isInt({ min: 1 }).withMessage('Invalid ministry id.')],
  validateRequest,
  deleteMinistry
);

module.exports = router;
