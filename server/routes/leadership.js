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
const { isImageRef } = require('../utils/validators');
const Ministry = require('../models/ministryModel');
const {
  getLeadership,
  createMember,
  updateMember,
  deleteMember,
} = require('../controllers/leadershipController');

const router = express.Router();

const ROLES = ['pastor', 'pastors_wife', 'presiding_elder', 'secretary', 'elder', 'deacon', 'deaconess', 'ministry_leader'];

/** The same rules for adding and for editing a leader. */
const memberRules = [
  body('name').trim().isLength({ min: 1, max: 150 }).withMessage('Enter a name of 150 characters or fewer.'),
  body('role').isIn(ROLES).withMessage('Choose a role.'),
  // A ministry is needed only for a ministry leader, and it must be a real one.
  // For every other role the controller stores no ministry.
  body('ministry_id').custom(async (value, { req }) => {
    if (req.body.role !== 'ministry_leader') return true;
    const id = Number(value);
    if (!Number.isInteger(id) || id < 1) throw new Error('Choose the ministry this person leads.');
    if (!(await Ministry.findById(id))) throw new Error('That ministry no longer exists. Choose another.');
    return true;
  }),
  body('photo_url').optional({ values: 'falsy' }).trim().isLength({ max: 500 }).custom(isImageRef)
    .withMessage('The photo must be an uploaded image or a link that starts with http:// or https://.'),
  body('bio').optional({ values: 'falsy' }).isString().isLength({ max: 5000 })
    .withMessage('The bio must be 5000 characters or fewer.'),
  body('display_order').optional({ values: 'falsy' }).isInt({ min: 0, max: 9999 })
    .withMessage('The order must be a whole number from 0 to 9999.').toInt(),
];

/** GET /api/leadership — public, grouped by role */
router.get('/', getLeadership);

/** POST /api/leadership — admin only */
router.post(
  '/',
  authMiddleware,
  sanitizeBody(['name', 'bio'], { maxLength: 5000 }),
  memberRules,
  validateRequest,
  createMember
);

/** PUT /api/leadership/:id — admin only */
router.put(
  '/:id',
  authMiddleware,
  sanitizeBody(['name', 'bio'], { maxLength: 5000 }),
  [param('id').isInt({ min: 1 }).withMessage('Invalid member id.'), ...memberRules],
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
