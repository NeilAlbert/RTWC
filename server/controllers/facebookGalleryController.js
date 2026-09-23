/**
 * =============================================================================
 * controllers/facebookGalleryController.js — Facebook photo gallery.
 *
 * Graph API calls with cursor pagination. Each page of results is cached for
 * ~15 minutes. The access token NEVER leaves the server.
 * Graceful error handling: failures return an empty list, never a crash.
 * =============================================================================
 */
const cache = require('../utils/cache');
const logger = require('../utils/logger');

const GRAPH_BASE = 'https://graph.facebook.com/v20.0';
const PAGE_TTL = 15 * 60 * 1000; // 15 minutes

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

/** Pick the largest image variant from a photo's `images` array. */
function pickLargestImage(images = []) {
  if (images.length === 0) return null;
  return images.reduce((largest, img) => (img.width > largest.width ? img : largest), images[0]);
}

async function fetchPhotosPage(afterCursor) {
  const params = {
    fields: 'id,images,alt_text,name,created_time',
    limit: '12',
  };
  if (afterCursor) params.after = afterCursor;

  const data = await fetchGraph(`${process.env.PAGE_ID}/photos`, params);

  const photos = (data.data || []).map((photo) => {
    const largest = pickLargestImage(photo.images);
    return {
      id: photo.id,
      imageUrl: largest ? largest.source : null,
      width: largest ? largest.width : null,
      height: largest ? largest.height : null,
      altText: photo.alt_text || photo.name || 'Photo',
      title: photo.name || 'Photo',
      dateText: photo.created_time ? new Date(photo.created_time).toLocaleDateString('en-US', { year: 'numeric', month: 'long' }) : '',
      createdTime: photo.created_time,
    };
  });

  return {
    photos,
    nextCursor: data.paging?.cursors?.after || null,
    hasMore: Boolean(data.paging?.next),
  };
}

/**
 * GET /api/facebook/photos?after=<cursor>
 * Cursor-paginated; each page cached ~15 minutes.
 */
async function getPhotos(req, res, next) {
  try {
    const after = req.query.after || null;
    const cacheKey = `fb:photos:${after || 'first'}`;

    const data = await cache.remember(cacheKey, PAGE_TTL, () => fetchPhotosPage(after));
    return res.json({ success: true, message: 'Photos fetched.', data });
  } catch (err) {
    logger.warn('Facebook gallery fetch failed', { message: err.message });
    return res.json({
      success: true,
      message: 'Photos unavailable.',
      data: { photos: [], nextCursor: null, hasMore: false, error: 'Gallery is temporarily unavailable.' },
    });
  }
}

module.exports = { getPhotos };
