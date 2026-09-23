/**
 * =============================================================================
 * routes/facebookGallery.js — Facebook photo gallery endpoints.
 * =============================================================================
 */
const express = require('express');
const { query } = require('express-validator');

const validateRequest = require('../middleware/validateRequest');
const { getPhotos } = require('../controllers/facebookGalleryController');

const router = express.Router();

/** GET /api/facebook/photos?after=<cursor> — public, cursor-paginated, cached */
router.get(
  '/photos',
  [query('after').optional().trim().isLength({ max: 200 })],
  validateRequest,
  getPhotos
);

module.exports = router;
