/**
 * =============================================================================
 * controllers/facebookLiveController.js — Facebook live-stream status.
 *
 * Calls the Graph API server-side and caches results (60s status / 15min
 * latest). The access token NEVER leaves the server.
 * Graceful error handling: a Graph API failure never crashes the request —
 * we return a structured "unknown" state so the frontend can degrade.
 * =============================================================================
 */
const cache = require('../utils/cache');
const logger = require('../utils/logger');

const GRAPH_BASE = 'https://graph.facebook.com/v20.0';
const STATUS_TTL = 60 * 1000;        // 60 seconds
const LATEST_TTL = 15 * 60 * 1000;   // 15 minutes

function graphUrl(path, params = {}) {
  const url = new URL(`${GRAPH_BASE}/${path}`);
  url.searchParams.set('access_token', process.env.FB_PAGE_ACCESS_TOKEN);
  Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value));
  return url.toString();
}

async function fetchGraph(path, params) {
  const res = await fetch(graphUrl(path, params), { signal: AbortSignal.timeout(10000) });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error?.message || `Graph API error ${res.status}`);
  }
  return res.json();
}

/** Determine whether the page is currently broadcasting live. */
async function fetchLiveStatus() {
  const data = await fetchGraph(`${process.env.PAGE_ID}/live_videos`, {
    fields: 'id,status,title,permalink_url,thumbnail_url,created_time',
    limit: '10',
  });

  const videos = data.data || [];
  const liveVideo = videos.find((v) => v.status === 'LIVE') || null;

  return {
    isLive: Boolean(liveVideo),
    video: liveVideo
      ? {
          id: liveVideo.id,
          title: liveVideo.title || 'Live Stream',
          status: liveVideo.status,
          permalinkUrl: liveVideo.permalink_url,
          thumbnailUrl: liveVideo.thumbnail_url,
          createdTime: liveVideo.created_time,
        }
      : null,
    checkedAt: new Date().toISOString(),
  };
}

/** Fetch the most recent live/video on the page. */
async function fetchLatestLive() {
  const data = await fetchGraph(`${process.env.PAGE_ID}/videos`, {
    fields: 'id,title,status,permalink_url,thumbnail_url,created_time,length',
    limit: '5',
  });

  const videos = data.data || [];
  if (videos.length === 0) return null;

  const latest = videos[0];
  return {
    id: latest.id,
    title: latest.title || 'Recent Broadcast',
    status: latest.status,
    permalinkUrl: latest.permalink_url,
    thumbnailUrl: latest.thumbnail_url,
    createdTime: latest.created_time,
    length: latest.length,
  };
}

/** GET /api/facebook/live-status — cached ~60 seconds */
async function getLiveStatus(req, res, next) {
  try {
    const data = await cache.remember('fb:live-status', STATUS_TTL, fetchLiveStatus);
    return res.json({ success: true, message: 'Live status fetched.', data });
  } catch (err) {
    logger.warn('Facebook live-status fetch failed', { message: err.message });
    return res.json({
      success: true,
      message: 'Live status unavailable.',
      data: { isLive: false, video: null, error: 'Live status is temporarily unavailable.' },
    });
  }
}

/** GET /api/facebook/latest-live — cached ~15 minutes */
async function getLatestLive(req, res, next) {
  try {
    const data = await cache.remember('fb:latest-live', LATEST_TTL, fetchLatestLive);
    return res.json({ success: true, message: 'Latest live fetched.', data });
  } catch (err) {
    logger.warn('Facebook latest-live fetch failed', { message: err.message });
    return res.json({
      success: true,
      message: 'Latest live unavailable.',
      data: null,
      error: 'Latest live information is temporarily unavailable.',
    });
  }
}

module.exports = { getLiveStatus, getLatestLive };
