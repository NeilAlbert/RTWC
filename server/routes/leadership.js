/**
 * =============================================================================
 * routes/leadership.js — leadership endpoints.
 * =============================================================================
 */
const express = require('express');
const { body, param } = require('express-validator');

const authMiddleware = require('../middleware/authMiddleware');
const authorizeRoles = require('../middleware/authorizeRoles');
const validateRequest = require('../middleware/validateRequest');
const { sanitizeBody } = require('../middleware/sanitizeInput');
const {
  getLeadership,
  createMember,
  updateMember,
  deleteMember,
} = require('../controllers/leadershipController');

const router = express.Router();

router.get('/manage', authMiddleware, authorizeRoles('super_admin', 'admin', 'editor'), (req, res, next) => {
  req.adminLibrary = true;
  getLeadership(req, res, next);
});

/** GET /api/leadership — public, grouped by role */
router.get('/', getLeadership);

/** POST /api/leadership — admin only */
router.post(
  '/',
  authMiddleware,
  authorizeRoles('super_admin', 'admin'),
  sanitizeBody(['name', 'bio'], { maxLength: 5000 }),
  [
    body('name').trim().isLength({ min: 1, max: 150 }).withMessage('Name is required.'),
    body('position').trim().isLength({ min: 1, max: 150 }).withMessage('Position is required.'),
    body('photo_url').optional({ values: 'falsy' }).isURL({ require_protocol: true }),
    body('bio').optional().isString().isLength({ max: 5000 }),
    body('display_order').optional().isInt({ min: 0 }),
    body('published').optional().isBoolean(),
  ],
  validateRequest,
  createMember
);

/** PUT /api/leadership/:id — admin only */
router.put(
  '/:id',
  authMiddleware,
  authorizeRoles('super_admin', 'admin'),
  sanitizeBody(['name', 'bio'], { maxLength: 5000 }),
  [
    param('id').isInt({ min: 1 }),
    body('name').trim().isLength({ min: 1, max: 150 }),
    body('position').trim().isLength({ min: 1, max: 150 }),
    body('photo_url').optional({ values: 'falsy' }).isURL({ require_protocol: true }),
    body('bio').optional().isString().isLength({ max: 5000 }),
    body('display_order').optional().isInt({ min: 0 }),
    body('published').optional().isBoolean(),
  ],
  validateRequest,
  updateMember
);

/** DELETE /api/leadership/:id — admin only */
router.delete(
  '/:id',
  authMiddleware,
  authorizeRoles('super_admin', 'admin'),
  [param('id').isInt({ min: 1 }).withMessage('Invalid member id.')],
  validateRequest,
  deleteMember
);

module.exports = router;
