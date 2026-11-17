/**
 * routes/leadership.js: the public, read-only leadership endpoints.
 * Adding, editing and deleting are admin-only and live in routes/admin.js, under /api/admin.
 */
const express = require('express');

const { getLeadership } = require('../controllers/leadershipController');

const router = express.Router();

/** GET /api/leadership: everyone, grouped by role */
router.get('/', getLeadership);

module.exports = router;
