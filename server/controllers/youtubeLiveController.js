/**
 * controllers/youtubeLiveController.js — YouTube live-stream status.
 * 
 * Calls the YouTube Data API server-side and caches results.
 * The API key NEVER leaves the server. Graceful error handling: a API
 * failure never crashes the request — we return a structured "unknown" state
 * so the frontend can degrade.
 * 
 * NOTE: This uses the public Youonomy v3 Videos endpoint with a per-video ID.
 * For full channel-wide live detection you would need a paid/released API scope,
 * but for a configured video ID this is sufficient and free.
 */

const cache = require('../utils/cache');
const logger = require('../utils/logger');

const YT_BASE = 'https://www.googleapis.com/youtube/v3';
const STATUS_TTL = 60 * 1000;        // 60 seconds

function ytUrl(path, params = {}) {
  const url = new URL(`${YT_BASE}/${path}`);
  url.searchParams.set('key', process.env.YOUTUBE_API_KEY || '');
  Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value));
  return url.toString();
}

/** Fetch status for a specific YouTube video ID */
async function fetchYouTubeVideoStatus(videoId) {
  try {
    const res = await fetch(ytUrl('videos', {
      part: 'status,snippet',
      id: videoId,
    }), { signal: AbortSignal.timeout(8000) });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error?.message || `YouTube API error ${res.status}`);
    }

    const data = await res.json();
    const items = data.items || [];

    if (items.length === 0) {
      return null;
    }

    const video = items[0];
    const status = video.status || {};
    const snippet = video.snippet || {};

    return {
      videoId: video.id,
      title: snippet.title || 'YouTube Live Stream',
      channelTitle: snippet.channelTitle || '',
      isLive: status.liveBroadcastContent === 'live',
      privacyStatus: status.privacyStatus,
      liveBroadcastContent: status.liveBroadcastContent,
      viewCount: snippet.viewCount || 0,
      publishedAt: snippet.publishedAt,
    };
  } catch (err) {
    logger.warn('YouTube video status fetch failed', { message: err.message, videoId });
    throw err;
  }
}

/** GET /api/youtube/live-status — cached ~60 seconds */
async function getYouTubeLiveStatus(req, res, next) {
  try {
    const videoId = req.query.videoId || '';

    if (!videoId) {
      return res.json({
        success: true,
        message: 'No video ID configured.',
        data: { isLive: false, video: null, error: 'No YouTube video ID configured.' },
      });
    }

    const data = await cache.remember('yt:live-status:' + videoId, STATUS_TTL, () =>
      fetchYouTubeVideoStatus(videoId)
    );

    return res.json({
      success: true,
      message: 'YouTube live status fetched.',
      data,
    });
  } catch (err) {
    logger.warn('YouTube live-status fetch failed', { message: err.message });
    return res.json({
      success: true,
      message: 'YouTube live status unavailable.',
      data: { isLive: false, video: null, error: 'YouTube live status is temporarily unavailable.' },
    });
  }
}

/** GET /api/youtube/latest-live — cached ~15 minutes */
async function getYouTubeLatestLive(req, res, next) {
  try {
    const videoId = req.query.videoId || '';

    if (!videoId) {
      return res.json({
        success: true,
        message: 'No video ID configured.',
        data: null,
        error: 'No YouTube video ID configured to fetch latest.',
      });
    }

    const data = await cache.remember('yt:latest-live:' + videoId, STATUS_TTL, () =>
      fetchYouTubeVideoStatus(videoId)
    );

    return res.json({
      success: true,
      message: 'YouTube latest live fetched.',
      data,
    });
  } catch (err) {
    logger.warn('YouTube latest-live fetch failed', { message: err.message });
    return res.json({
      success: true,
      message: 'YouTube latest live unavailable.',
      data: null,
      error: 'YouTube latest live information is temporarily unavailable.',
    });
  }
}

module.exports = { getYouTubeLiveStatus, getYouTubeLatestLive };