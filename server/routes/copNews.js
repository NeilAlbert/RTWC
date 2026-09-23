/**
 * =============================================================================
 * routes/copNews.js — Church of Pentecost news endpoints.
 * =============================================================================
 */
const express = require('express');
const { getLatestNews } = require('../controllers/copNewsController');

const router = express.Router();

/** GET /api/cop-news/latest — public, cached ~30 minutes */
router.get('/latest', getLatestNews);

module.exports = router;
