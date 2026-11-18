/* Royal Temple Worship Centre API entry point. */
const path = require('path');

// Read server/.env whichever folder the server is started from.
require('dotenv').config({ path: path.join(__dirname, '.env') });

const fs = require('fs');
const express = require('express');
const cors = require('cors');

const authRoutes = require('./routes/auth');
const sermonsRoutes = require('./routes/sermons');
const eventsRoutes = require('./routes/events');
const ministriesRoutes = require('./routes/ministries');
const leadershipRoutes = require('./routes/leadership');
const contactRoutes = require('./routes/contact');
const prayerRequestsRoutes = require('./routes/prayerRequests');
const newsletterRoutes = require('./routes/newsletter');
const facebookLiveRoutes = require('./routes/facebookLive');
const youtubeLiveRoutes = require('./routes/youtubeLive');
const facebookGalleryRoutes = require('./routes/facebookGallery');
const copNewsRoutes = require('./routes/copNews');
const siteSettingsRoutes = require('./routes/siteSettings');
const adminRoutes = require('./routes/admin');
const adminBackupsRoutes = require('./routes/adminBackups');
const { notFound, errorHandler } = require('./middleware/errorHandler');
const logger = require('./utils/logger');

// Stop with a clear message when a required setting is missing. Without these the
// server would start, and then every sign-in would fail with a server error.
const missingSettings = ['DB_HOST', 'DB_USER', 'DB_NAME'].filter((name) => !process.env[name]);
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  missingSettings.push('JWT_SECRET (at least 32 characters)');
}
if (missingSettings.length > 0) {
  logger.error(`The server cannot start. Set these in server/.env: ${missingSettings.join(', ')}. See server/.env.example.`);
  process.exit(1);
}

// Required after the check above, so a missing setting is reported before the
// database is configured.
const pool = require('./config/db');
const redis = require('./config/redis');
const { recoverInterruptedRuns } = require('./services/backupService');
const backupScheduler = require('./jobs/backupScheduler');

const app = express();

// TRUST_PROXY_HOPS: how many reverse proxies stand between visitors and this
// server (Nginx, a hosting provider's proxy, Cloudflare). Express then takes the
// visitor's address (req.ip) from that many entries from the right of the
// X-Forwarded-For header. The rate limits count per req.ip, so this must match
// the hosting exactly:
// - too low (0 behind Nginx): every visitor gets the proxy's address and they
//   all share one rate-limit bucket, so one visitor can lock out everyone;
// - too high (2 behind one proxy): a visitor can send a made-up X-Forwarded-For
//   header, pick any address, and escape the limits.
// 1 behind one proxy such as Nginx (the default), 0 when browsers reach this
// server directly. TRUST_PROXY is the older name and is still read.
const trustProxyHops = Number(process.env.TRUST_PROXY_HOPS || process.env.TRUST_PROXY);
app.set('trust proxy', Number.isInteger(trustProxyHops) && trustProxyHops >= 0 ? trustProxyHops : 1);

// The website itself: the public pages, their css, js and images, and /admin.
// Serving them here puts the pages and /api on one address, which the admin
// sign-in needs. Only these files are served; nothing in server/ can be requested.
const SITE_ROOT = path.join(__dirname, '..');
const staticOptions = { dotfiles: 'deny', index: 'index.html' };

// Admin pages may load scripts, styles and data from this site only (plus Google
// Fonts). No inline scripts or styles run, so text typed by a visitor can never
// become code in an admin's browser. Images may also be https links, because a
// photo or thumbnail can be given as a link.
const ADMIN_CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com",
  "img-src 'self' https: blob:",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join('; ');
app.use('/admin', (req, res, next) => {
  res.set({
    'Content-Security-Policy': ADMIN_CSP,
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'same-origin',
  });
  next();
});
// /admin opens the login page, which sends a signed-in admin on to the dashboard.
app.get('/admin', (req, res) => res.redirect('/admin/login.html'));
['css', 'js', 'assets', 'admin'].forEach((folder) => {
  app.use(`/${folder}`, express.static(path.join(SITE_ROOT, folder), staticOptions));
});
const sitePages = fs.readdirSync(SITE_ROOT).filter((name) => name.endsWith('.html') || name === 'robots.txt');
sitePages.forEach((name) => {
  app.get(`/${name}`, (req, res) => res.sendFile(path.join(SITE_ROOT, name)));
});
app.get('/', (req, res) => res.sendFile(path.join(SITE_ROOT, 'index.html')));

// CORS: only the site's own domains may call the API from a browser.
const allowedOrigins = (process.env.CORS_ORIGIN || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(
  cors((req, callback) => {
    const origin = req.get('Origin');
    // Browsers send Origin on a POST to the site's own address too. That is not a
    // cross-site request, so it is allowed without being listed in CORS_ORIGIN.
    const sameOrigin = origin === `${req.protocol}://${req.get('host')}`;
    // Non-browser requests (curl, server-to-server) send no Origin.
    if (!origin || sameOrigin || allowedOrigins.includes(origin)) {
      return callback(null, {
        origin: true,
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization'],
      });
    }
    const err = new Error('Origin not allowed by CORS.');
    err.status = 403;
    return callback(err);
  })
);

app.use(express.json({ limit: '1mb' }));

// No CSRF middleware: the admin signs in with a bearer token sent in the
// Authorization header, not a cookie, so a forged cross-site request carries no
// credentials. (The csurf setup that was here made every request fail with HTTP 500.)

// Request log. Bodies and tokens are never logged. A backup download ticket is
// part of its address, so it is replaced before the address is written down.
app.use((req, res, next) => {
  const address = req.originalUrl.replace(/^(\/api\/admin\/backups\/download\/)[^/?#]*/, '$1[ticket]');
  logger.info(`${req.method} ${address}`, { ip: req.ip });
  next();
});

// Liveness: answers as long as the process is running. It checks nothing else,
// so a database or Redis problem never gets a healthy server restarted.
app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'Royal Temple API is running.', data: { uptime: process.uptime() } });
});

// Readiness: can this server answer visitors? The database is required; Redis is
// only reported, because without it the site falls back to memory and still works.
app.get('/api/ready', async (req, res) => {
  let database = 'ok';
  try {
    await pool.query('SELECT 1');
  } catch (err) {
    database = 'unreachable';
    logger.error('Readiness check: the database could not be reached', { message: err.message, code: err.code });
  }
  const redisState = redis.getState();
  const ready = database === 'ok';
  res.status(ready ? 200 : 503).json({
    success: ready,
    message: ready ? 'Royal Temple API is ready.' : 'The API is running but cannot reach the database.',
    data: { database, redis: redisState === 'connected' ? 'ok' : redisState },
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/sermons', sermonsRoutes);
app.use('/api/events', eventsRoutes);
app.use('/api/ministries', ministriesRoutes);
app.use('/api/leadership', leadershipRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api/prayer-requests', prayerRequestsRoutes);
app.use('/api/newsletter', newsletterRoutes);
app.use('/api/facebook', facebookLiveRoutes);
app.use('/api/youtube', youtubeLiveRoutes);
app.use('/api/facebook', facebookGalleryRoutes);
app.use('/api/cop-news', copNewsRoutes);
app.use('/api/settings', siteSettingsRoutes);
// Before /api/admin, because its download route is reached with a ticket instead of a sign-in.
app.use('/api/admin/backups', adminBackupsRoutes);
app.use('/api/admin', adminRoutes);

// The 404 and error handlers must come after every route.
app.use(notFound);
app.use(errorHandler);

const PORT = Number(process.env.PORT) || 5000;

/**
 * The admin sign-in needs admins.token_valid_after. Without it every admin request
 * would fail with a server error, so the server stops and names the migration.
 * A database that cannot be reached at all is left to /api/health to report.
 */
async function checkAdminColumns() {
  try {
    await pool.query('SELECT token_valid_after FROM admins LIMIT 1');
  } catch (err) {
    if (err.code === 'ER_BAD_FIELD_ERROR') {
      logger.error('The server cannot start. The admins table has no token_valid_after column. Back up the database, then run server/migrations/004_admin_additions.sql.');
      process.exit(1);
    }
    logger.error('Startup check: the admins table could not be read', { code: err.code });
  }
}

checkAdminColumns().then(() => {
  // A backup cut off by a crash or restart is marked failed and its partial file removed.
  // Then the clean-up finishes before the first check for this month's automatic backup.
  recoverInterruptedRuns().then(() => backupScheduler.start());
  app.listen(PORT, () => {
    logger.info(`Royal Temple API listening on http://localhost:${PORT}`);
  });
});
