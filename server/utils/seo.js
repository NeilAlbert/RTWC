/**
 * =============================================================================
 * utils/seo.js: what search engines and link previews need, filled in from the
 * site's own web address (SITE_URL in server/.env).
 *
 * - Each public page has a <!-- seo:head --> line in its <head>. When the page
 *   is sent, that line becomes the canonical link, og:url and og:image, all as
 *   full addresses. The home page also gets a Church description (JSON-LD) made
 *   from Admin > Settings; a setting that is empty is left out, never guessed.
 * - /sitemap.xml lists the public pages.
 * - /robots.txt gets a Sitemap: line.
 *
 * Without SITE_URL the line is removed, /sitemap.xml is a 404 and robots.txt is
 * sent as it is. The address a visitor's browser sends (the Host header) is never
 * used instead, because anyone can send any Host and a cache could keep the result.
 * =============================================================================
 */
const fs = require('fs');
const path = require('path');
const logger = require('./logger');

const SITE_ROOT = path.join(__dirname, '..', '..');
const MARKER = '<!-- seo:head -->';
const CHURCH_NAME = 'Royal Temple Worship Centre';

/** The picture shown when a page is shared: a real photo of the congregation. */
const SHARE_IMAGE = {
  path: '/assets/images/hero.jpg',
  width: 2048,
  height: 1365,
  alt: 'Members of the congregation seated in the church hall during a service.',
};

/** The church's Facebook page, as linked in every page footer. */
const FACEBOOK_PAGE = 'https://www.facebook.com/cop.rtwc';

/**
 * SITE_URL without a trailing slash, or '' when it is missing or not an http(s)
 * address with nothing after the host. Read on each call, so tests can set it.
 */
function siteUrl() {
  const raw = (process.env.SITE_URL || '').trim();
  if (!raw) return '';
  try {
    const url = new URL(raw);
    const bare = (url.pathname === '/' || url.pathname === '') && !url.search && !url.hash;
    if (!['http:', 'https:'].includes(url.protocol) || !bare || url.username || url.password) return '';
    return url.origin;
  } catch {
    return '';
  }
}

/** The address of a page file: / for index.html, /about.html for about.html. */
function pagePath(file) {
  return file === 'index.html' ? '/' : `/${file}`;
}

/** Escapes text for an HTML attribute or XML text. */
function escapeXml(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** The public pages: every .html file in the site root that carries the marker. */
function publicPages() {
  return fs.readdirSync(SITE_ROOT)
    .filter((name) => name.endsWith('.html'))
    .filter((name) => fs.readFileSync(path.join(SITE_ROOT, name), 'utf8').includes(MARKER))
    .sort((a, b) => (a === 'index.html' ? -1 : b === 'index.html' ? 1 : a.localeCompare(b)));
}

/** A setting that is filled in, or '' when it is empty or still an [ADD: ...] placeholder. */
function filled(settings, key) {
  const value = settings && typeof settings[key] === 'string' ? settings[key].trim() : '';
  return /^\[ADD/i.test(value) ? '' : value;
}

/**
 * The Church description for the home page. Only facts the admin has entered,
 * plus the name, address and the Facebook page that every page already shows.
 */
function churchJsonLd(base, settings) {
  const data = {
    '@context': 'https://schema.org',
    '@type': 'Church',
    name: CHURCH_NAME,
    url: `${base}/`,
    logo: `${base}/assets/images/logo.jpg`,
    image: `${base}${SHARE_IMAGE.path}`,
    parentOrganization: { '@type': 'Organization', name: 'The Church of Pentecost' },
    sameAs: [FACEBOOK_PAGE],
  };
  const address = filled(settings, 'church_address');
  const phone = filled(settings, 'phone_number');
  const email = filled(settings, 'email');
  const youtube = filled(settings, 'youtube_channel_url');
  if (address) data.address = address.replace(/\s*\n\s*/g, ', ');
  if (phone) data.telephone = phone;
  if (email) data.email = email;
  if (/^https?:\/\//i.test(youtube)) data.sameAs.push(youtube);
  // "<" is written as < so no value can close the script element.
  return JSON.stringify(data, null, 2).replace(/</g, '\\u003c');
}

/** The lines that replace the marker on one page. */
function headTags(file, base, settings) {
  const url = `${base}${pagePath(file)}`;
  const lines = [
    `<link rel="canonical" href="${escapeXml(url)}">`,
    `<meta property="og:url" content="${escapeXml(url)}">`,
    `<meta property="og:image" content="${escapeXml(base + SHARE_IMAGE.path)}">`,
    `<meta property="og:image:width" content="${SHARE_IMAGE.width}">`,
    `<meta property="og:image:height" content="${SHARE_IMAGE.height}">`,
    `<meta property="og:image:alt" content="${escapeXml(SHARE_IMAGE.alt)}">`,
  ];
  if (file === 'index.html') {
    lines.push(`<script type="application/ld+json">\n${churchJsonLd(base, settings)}\n  </script>`);
  }
  return lines.join('\n  ');
}

/**
 * The page's HTML with the marker filled in, or removed when SITE_URL is not set.
 * @param {string} html
 * @param {string} file - e.g. 'about.html'
 * @param {object|null} settings - the public site settings, for the home page
 */
function renderPage(html, file, settings) {
  if (!html.includes(MARKER)) return html;
  const base = siteUrl();
  if (!base) return html.replace(new RegExp(`[ \\t]*${MARKER}\\r?\\n?`), '');
  return html.replace(MARKER, headTags(file, base, settings));
}

/** /sitemap.xml, or null when SITE_URL is not set. */
function sitemap() {
  const base = siteUrl();
  if (!base) return null;
  const urls = publicPages()
    .map((file) => `  <url>\n    <loc>${escapeXml(base + pagePath(file))}</loc>\n  </url>`)
    .join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
}

/** robots.txt with a Sitemap: line when SITE_URL is set. */
function robots(text) {
  const base = siteUrl();
  if (!base) return text;
  return `${text.replace(/\s*$/, '')}\n\nSitemap: ${base}/sitemap.xml\n`;
}

/**
 * Express handler for one page file. The home page reads the settings through
 * getSettings(); if that fails the page is still sent, without the Church data.
 */
function pageHandler(file, getSettings) {
  const filePath = path.join(SITE_ROOT, file);
  return async (req, res, next) => {
    try {
      const html = await fs.promises.readFile(filePath, 'utf8');
      let settings = null;
      if (file === 'index.html' && siteUrl() && html.includes(MARKER)) {
        try {
          settings = await getSettings();
        } catch (err) {
          logger.warn('The home page was sent without its Church details: the settings could not be read', { code: err.code });
        }
      }
      res.type('html').send(renderPage(html, file, settings));
    } catch (err) {
      next(err);
    }
  };
}

module.exports = {
  MARKER, siteUrl, publicPages, renderPage, sitemap, robots, pageHandler,
};
