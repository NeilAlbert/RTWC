/**
 * =============================================================================
 * routes/leadership.js — leadership endpoints.
 * =============================================================================
 */
const express = require('express');
const { body, param } = require('express-validator');

const authMiddleware = require('../middleware/authMiddleware');
const validateRequest = require('../middleware/validateRequest');
const { sanitizeBody } = require('../middleware/sanitizeInput');
const {
  getLeadership,
  createMember,
  updateMember,
  deleteMember,
} = require('../controllers/leadershipController');

const router = express.Router();

const ROLES = ['pastor', 'pastors_wife', 'presiding_elder', 'secretary', 'elder', 'deacon', 'deaconess', 'ministry_leader'];

/** GET /api/leadership — public, grouped by role */
router.get('/', getLeadership);

/** POST /api/leadership — admin only */
router.post(
  '/',
  authMiddleware,
  sanitizeBody(['name', 'bio'], { maxLength: 5000 }),
  [
    body('name').trim().isLength({ min: 1, max: 150 }).withMessage('Name is required.'),
    body('role').isIn(ROLES).withMessage('Invalid role.'),
    body('ministry_id').optional({ values: 'null' }).isInt({ min: 1 }),
    body('photo_url').optional({ values: 'falsy' }).isURL({ require_protocol: true }),
    body('bio').optional().isString().isLength({ max: 5000 }),
    body('display_order').optional().isInt({ min: 0 }),
  ],
  validateRequest,
  createMember
);

/** PUT /api/leadership/:id — admin only */
router.put(
  '/:id',
  authMiddleware,
  sanitizeBody(['name', 'bio'], { maxLength: 5000 }),
  [
    param('id').isInt({ min: 1 }),
    body('name').trim().isLength({ min: 1, max: 150 }),
    body('role').isIn(ROLES),
    body('ministry_id').optional({ values: 'null' }).isInt({ min: 1 }),
    body('photo_url').optional({ values: 'falsy' }).isURL({ require_protocol: true }),
    body('bio').optional().isString().isLength({ max: 5000 }),
    body('display_order').optional().isInt({ min: 0 }),
  ],
  validateRequest,
  updateMember
);

/** DELETE /api/leadership/:id — admin only */
router.delete(
  '/:id',
  authMiddleware,
  [param('id').isInt({ min: 1 }).withMessage('Invalid member id.')],
  validateRequest,
  deleteMember
);

module.exports = router;
