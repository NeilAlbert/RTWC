/**
 * =============================================================================
 * controllers/copNewsController.js — Church of Pentecost news from the
 * official WordPress REST API (https://thecophq.org).
 *
 * Fetches the 6 latest posts, simplifies the response, caches ~30 minutes.
 * If thecophq.org is unreachable, returns an empty array with an error flag
 * instead of throwing, so the frontend can hide the section gracefully.
 * =============================================================================
 */
const cache = require('../utils/cache');
const logger = require('../utils/logger');

const COP_NEWS_URL = 'https://thecophq.org/wp-json/wp/v2/posts?per_page=6&_embed';
const TTL = 30 * 60 * 1000; // 30 minutes

function stripHtml(html) {
  return String(html || '')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&#8217;|&rsquo;/g, "'")
    .replace(/&#8220;|&#8221;|&ldquo;|&rdquo;/g, '"')
    .replace(/\s+/g, ' ')
    .trim();
}

async function fetchLatestNews() {
  const res = await fetch(COP_NEWS_URL, { signal: AbortSignal.timeout(15000) });
  if (!res.ok) throw new Error(`thecophq.org responded ${res.status}`);
  const posts = await res.json();

  return (Array.isArray(posts) ? posts : []).map((post) => ({
    id: post.id,
    title: stripHtml(post.title?.rendered),
    link: post.link,
    date: post.date,
    excerpt: stripHtml(post.excerpt?.rendered),
    image: post._embedded?.['wp:featuredmedia']?.[0]?.source_url || null,
  }));
}

/** GET /api/cop-news/latest — cached ~30 minutes */
async function getLatestNews(req, res, next) {
  try {
    const data = await cache.remember('cop-news:latest', TTL, fetchLatestNews);
    return res.json({ success: true, message: 'COP news fetched.', data: { items: data, error: false } });
  } catch (err) {
    logger.warn('COP news fetch failed', { message: err.message });
    // Graceful degradation: empty array + error flag so the frontend can hide the section.
    return res.json({
      success: true,
      message: 'COP news is temporarily unavailable.',
      data: { items: [], error: true },
    });
  }
}

module.exports = { getLatestNews };
