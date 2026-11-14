/* Royal Temple Worship Centre API entry point. */
require('dotenv').config();

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
const { notFound, errorHandler } = require('./middleware/errorHandler');
const logger = require('./utils/logger');

const app = express();

// The API sits behind a reverse proxy (for example nginx), so the client IP used
// for rate limiting is read from the proxy header.
app.set('trust proxy', 1);

// CORS: only the site's own domains may call the API from a browser.
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

app.use(express.json({ limit: '1mb' }));

// No CSRF middleware: the admin signs in with a bearer token sent in the
// Authorization header, not a cookie, so a forged cross-site request carries no
// credentials. (The csurf setup that was here made every request fail with HTTP 500.)

// Request log. Bodies and tokens are never logged.
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.originalUrl}`, { ip: req.ip });
  next();
});

app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'Royal Temple API is running.', data: { uptime: process.uptime() } });
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

// The 404 and error handlers must come after every route.
app.use(notFound);
app.use(errorHandler);

const PORT = Number(process.env.PORT) || 5000;

app.listen(PORT, () => {
  logger.info(`Royal Temple API listening on http://localhost:${PORT}`);
});
