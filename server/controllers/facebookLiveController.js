/**
 * =============================================================================
 * controllers/facebookLiveController.js — Facebook & YouTube live-stream status.
 *
 * Server-side only: the Facebook Graph API and YouTube Data API calls run on the
 * server. API keys / access tokens NEVER leave the server.
 * Graceful error handling: a failed API call never crashes the request — we return
 * a structured "unknown" state so the frontend can degrade.
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

/** Determine the live status from Facebook. */
async function fetchFacebookLiveStatus() {
  let isLive = false;
  let video = null;
  let error = null;

  try {
    const data = await fetchGraph(`${process.env.PAGE_ID}/live_videos`, {
      fields: 'id,status,title,permalink_url,thumbnail_url,created_time',
      limit: '10',
    });

    const videos = data.data || [];
    const liveVideo = videos.find((v) => v.status === 'LIVE') || null;

    if (liveVideo) {
      isLive = true;
      video = {
        id: liveVideo.id,
        title: liveVideo.title || 'Live Stream',
        status: liveVideo.status,
        permalinkUrl: liveVideo.permalink_url,
        thumbnailUrl: liveVideo.thumbnail_url,
        createdTime: liveVideo.created_time,
      };
    }
  } catch (err) {
    logger.warn('Facebook live status fetch failed', { message: err.message });
    error = 'Facebook live status is temporarily unavailable.';
  }

  return {
    isLive,
    video,
    error,
    checkedAt: new Date().toISOString(),
  };
}

/** Determine the live status from YouTube. */
async function fetchYouTubeLiveStatus() {
  let isLive = false;
  let video = null;
  let error = null;

  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) {
    error = 'YouTube API key not configured; live detection is disabled.';
    return { isLive, video, error };
  }

  const videoId = process.env.YOUTUBE_LIVE_VIDEO_ID || '';
  const channelId = process.env.YOUTUBE_CHANNEL_ID || '';

  try {
    // If a specific live video ID is configured, check that video
    if (videoId) {
      const videoRes = await fetch(`https://www.googleapis.com/youtube/v3/videos?part=status,snippet&id=${videoId}&key=${apiKey}`, {
        signal: AbortSignal.timeout(10000),
      });
      if (!videoRes.ok) throw new Error('YouTube API error');
      const videoData = await videoRes.json();
      const items = videoData.items || [];
      if (items.length > 0) {
        const status = items[0].status;
        isLive = status.privateVideo !== true && status.liveBroadcastStatus === 'live';
        video = {
          id: videoId,
          title: items[0].snippet.title || 'YouTube Live',
          permalinkUrl: 'https://www.youtube.com/watch?v=' + videoId,
          thumbnailUrl: items[0].snippet.thumbnails.medium?.url || '',
        };
      }
    } else if (channelId) {
      // Check the channel's latest live broadcast
      const channelRes = await fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&q="+channelId&type=video&type=liveBroadcast&maxResults=5&key=${apiKey}`, {
        signal: AbortSignal.timeout(10000),
      });
      if (!channelRes.ok) throw new Error('YouTube API error');
      const channelData = await channelRes.json();
      const items = channelData.items || [];
      if (items.length > 0) {
        const latest = items[0];
        const videoIdFromApi = latest.id.videoId;
        const statusRes = await fetch(`https://www.googleapis.com/youtube/v3/videos?part=status,snippet&id=${videoIdFromApi}&key=${apiKey}`, {
          signal: AbortSignal.timeout(10000),
        });
        if (!statusRes.ok) throw new Error('YouTube API error');
        const statusData = await statusRes.json();
        const items2 = statusData.items || [];
        if (items2.length > 0) {
          const status = items2[0].status;
          isLive = status.privateVideo !== true && status.liveBroadcastStatus === 'live';
          video = {
            id: videoIdFromApi,
            title: latest.snippet.title || 'YouTube Live',
            permalinkUrl: 'https://www.youtube.com/watch?v=' + videoIdFromApi,
            thumbnailUrl: latest.snippet.thumbnails.medium?.url || '',
          };
        }
      }
    } else {
      error = 'No YouTube channel ID or live video ID configured.';
    }
  } catch (err) {
    logger.warn('YouTube live status fetch failed', { message: err.message });
    error = 'YouTube live status is temporarily unavailable.';
  }

  return { isLive, video, error };
}

/** Get combined live status from both Facebook and YouTube. */
async function getCombinedLiveStatus() {
  const [fbResult, ytResult] = await Promise.all([
    fetchFacebookLiveStatus(),
    fetchYouTubeLiveStatus(),
  ]);

  // If manual override is set, use it
  const manualOverride = process.env.MANUAL_LIVE_OFFLINE_OVERRIDE || 'false';
  if (manualOverride === 'true') {
    // Manual override is handled on the frontend via settings; here we just return combined data
  }

  // Priority: if either platform is live, report it as live
  if (fbResult.isLive || ytResult.isLive) {
    return {
      isLive: true,
      ...(fbResult.video ? { fbVideo: fbResult.video } : {}),
      ...(ytResult.video ? { ytVideo: ytResult.video } : {}),
      fbError: fbResult.error,
      ytError: ytResult.error,
      checkedAt: new Date().toISOString(),
    };
  }

  // Neither is live
  return {
    isLive: false,
    fbError: fbResult.error,
    ytError: ytResult.error,
    checkedAt: new Date().toISOString(),
  };
}

/** GET /api/facebook/live-status — cached ~60 seconds */
async function getLiveStatus(req, res, next) {
  try {
    const data = await cache.remember('fb:live-status-yt', STATUS_TTL, getCombinedLiveStatus);
    return res.json({ success: true, message: 'Live status fetched.', data });
  } catch (err) {
    logger.warn('Combined live-status fetch failed', { message: err.message });
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
