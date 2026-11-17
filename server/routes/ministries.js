/**
 * routes/ministries.js: the public, read-only ministry endpoints.
 * Adding, editing and deleting are admin-only and live in routes/admin.js, under /api/admin.
 */
const express = require('express');
const { param } = require('express-validator');

const validateRequest = require('../middleware/validateRequest');
const { getMinistries, getMinistryBySlug } = require('../controllers/ministriesController');

const router = express.Router();

/** GET /api/ministries */
router.get('/', getMinistries);

/** GET /api/ministries/:slug */
router.get('/:slug', [param('slug').trim().isLength({ min: 1, max: 160 })], validateRequest, getMinistryBySlug);

module.exports = router;
