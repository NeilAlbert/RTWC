/**
 * controllers/youtubeLiveController.js — YouTube live-stream status.
 * 
 * Calls the YouTube Data API server-side and caches results.
 * The API key NEVER leaves the server. Graceful error handling: an API
 * failure never crashes the request; we return a structured "unknown" state
 * so the frontend can degrade.
 * 
 * This checks one configured video ID with the YouTube Data API v3 "videos"
 * endpoint. It does not search the whole channel for a live broadcast.
 */

const cache = require('../utils/cache');
const logger = require('../utils/logger');

const YT_BASE = 'https://www.googleapis.com/youtube/v3';
const STATUS_TTL = 60;          // seconds
const STATUS_STALE = 10 * 60;   // an old answer is served for at most 10 minutes if YouTube fails
const CACHE_OPTIONS = { localTtlCap: false, staleSeconds: STATUS_STALE };
// Only real YouTube video IDs are cached, so visitors cannot fill the cache with made-up ones.
const VIDEO_ID = /^[A-Za-z0-9_-]{11}$/;

/** Cached when the ID looks like a YouTube video ID, fetched directly otherwise (same answer). */
function cachedStatus(kind, videoId) {
  if (!VIDEO_ID.test(videoId)) return fetchYouTubeVideoStatus(videoId);
  return cache.wrap(`yt:${kind}:${videoId}`, STATUS_TTL, () => fetchYouTubeVideoStatus(videoId), CACHE_OPTIONS);
}

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
      isLive: snippet.liveBroadcastContent === 'live',
      privacyStatus: status.privacyStatus,
      liveBroadcastContent: snippet.liveBroadcastContent,
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

    const data = await cachedStatus('live-status', videoId);

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

    const data = await cachedStatus('latest-live', videoId);

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