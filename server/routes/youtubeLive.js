/**
 * routes/youtubeLive.js — YouTube live-stream endpoints.
 */

const express = require('express');
const { getYouTubeLiveStatus, getYouTubeLatestLive } = require('../controllers/youtubeLiveController');

const router = express.Router();

/** GET /api/youtube/live-status — cached ~60 seconds */
router.get('/live-status', getYouTubeLiveStatus);

/** GET /api/youtube/latest-live — cached ~15 minutes */
router.get('/latest-live', getYouTubeLatestLive);

module.exports = router;