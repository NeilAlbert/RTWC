/**
 * =============================================================================
 * routes/facebookLive.js — Facebook live-stream endpoints.
 * =============================================================================
 */
const express = require('express');
const { getLiveStatus, getLatestLive } = require('../controllers/facebookLiveController');

const router = express.Router();

/** GET /api/facebook/live-status — public, cached ~60 seconds */
router.get('/live-status', getLiveStatus);

/** GET /api/facebook/latest-live — public, cached ~15 minutes */
router.get('/latest-live', getLatestLive);

module.exports = router;
