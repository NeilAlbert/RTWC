/**
 * routes/sermons.js: the public, read-only sermon endpoints.
 * Adding, editing and deleting are admin-only and live in routes/admin.js, under /api/admin.
 */
const express = require('express');
const { param, query } = require('express-validator');

const validateRequest = require('../middleware/validateRequest');
const { getSermons, getSermonById } = require('../controllers/sermonsController');

const router = express.Router();

/** GET /api/sermons: ?speaker=&date=&q=&page=&limit= (q searches the title and the speaker) */
router.get(
  '/',
  [
    query('speaker').optional().trim().isLength({ max: 120 }),
    query('date').optional().isISO8601().withMessage('date must be YYYY-MM-DD'),
    query('q').optional().trim().isLength({ max: 200 }),
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 50 }),
  ],
  validateRequest,
  getSermons
);

/** GET /api/sermons/:id */
router.get('/:id', [param('id').isInt({ min: 1 }).withMessage('Invalid sermon id.')], validateRequest, getSermonById);

module.exports = router;
