/**
 * =============================================================================
 * server.js — Royal Temple Worship Centre API entry point.
 * =============================================================================
 */
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const csrf = require('csurf');

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
const { notFound, errorHandler } = require('./middleware/errorHandler');
const logger = require('./utils/logger');

const app = express();

// Behind a reverse proxy (e.g. nginx), preserve the real client IP for
// rate limiting. If not using a proxy, remove or keep harmless.
app.set('trust proxy', 1);

// -----------------------------------------------------------------------------
// CORS — only allow the site's own domain(s).
// -----------------------------------------------------------------------------
const allowedOrigins = (process.env.CORS_ORIGIN || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(
  cors({
    origin(origin, callback) {
      // Allow non-browser requests (curl, server-to-server) which send no Origin.
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      const err = new Error('Origin not allowed by CORS.');
      err.status = 403;
      return callback(err);
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// Capture the RAW body bytes for admin settings and other requests.
// req.rawBody is a Buffer available to all handlers.
app.use(express.json({
  limit: '1mb',
  verify: (req, res, buf) => {
    req.rawBody = buf;
  },
}));

// CSRF protection — only applied to state-changing routes behind auth
const csrfMiddleware = csrf({ cookie: true });
app.use(csrfMiddleware);

// Simple request logging (no sensitive data — no bodies, no tokens).
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.originalUrl}`, { ip: req.ip });
  next();
});

// -----------------------------------------------------------------------------
// Health check
// -----------------------------------------------------------------------------
app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'Royal Temple API is running.', data: { uptime: process.uptime() } });
});

// -----------------------------------------------------------------------------
// Routes
// CSRF exemptions: login is public, so it must not be protected by CSRF
app.use('/api/auth', authRoutes);

// CSRF token endpoint — the admin login page needs this to render the form
app.get('/api/csrf-token', (req, res) => {
  res.json({ csrfToken: req.csrfToken() });
});

// -----------------------------------------------------------------------------
// Routes// -----------------------------------------------------------------------------
app.use('/api/auth', authRoutes);app.use('/api/sermons', sermonsRoutes);
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

// -----------------------------------------------------------------------------
// 404 + centralized error handling (MUST be last)
// -----------------------------------------------------------------------------
app.use(notFound);
app.use(errorHandler);

const PORT = Number(process.env.PORT) || 5000;

app.listen(PORT, () => {
  logger.info(`Royal Temple API listening on http://localhost:${PORT}`);
});
