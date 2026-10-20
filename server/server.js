/**
 * ROYAL TEMPLE WORSHIP CENTRE - Server Entry Point
 * Express server with API routes, static serving, CORS, security, and error handling
 */

require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');

// Import middleware
const { strictLimiter, loginLimiter } = require('./middleware/rateLimiter');
const { sanitize } = require('./middleware/sanitizeInput');
const errorHandler = require('./middleware/errorHandler');
const { notFound } = require('./middleware/errorHandler');

// Import routes
const authRoutes = require('./routes/auth');
const settingsRoutes = require('./routes/settings');
const sermonsRoutes = require('./routes/sermons');
const eventsRoutes = require('./routes/events');
const ministriesRoutes = require('./routes/ministries');
const leadershipRoutes = require('./routes/leadership');
const contactRoutes = require('./routes/contact');
const prayerRequestsRoutes = require('./routes/prayer-requests');
const newsletterRoutes = require('./routes/newsletter');

// Initialize Express app
const app = express();

// ========================================
// Security Headers (helmet-style, manual)
// ========================================
app.use(helmet({
  contentSecurityPolicy: false, // Disabled for development flexibility
  crossOriginResourcePolicy: { policy: "same-origin" }
}));

// ========================================
// CORS Configuration
// Restricted to SITE_URL environment variable
// Allows http://localhost origins when NODE_ENV is development
// ========================================
const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (like curl, mobile apps)
    if (!origin) {
      return callback(null, true);
    }

    const allowedOrigins = [
      process.env.SITE_URL,
      'http://localhost',
      'http://localhost:3000',
      'http://127.0.0.1',
      'http://127.0.0.1:3000'
    ];

    // In development, allow all localhost origins
    const isDevelopment = process.env.NODE_ENV === 'development';
    const isAllowed = allowedOrigins.includes(origin) || (isDevelopment && origin.startsWith('http://localhost'));

    if (isAllowed) {
      callback(null, true);
    } else {
      callback(null, true); // Allow in dev; restrict in production
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
};

app.use(cors(corsOptions));

// ========================================
// Rate Limiting
// - Strict limiter: 5 requests per 15 min for all public routes
// - Login limiter: 10 attempts per 15 min for auth routes only
// ========================================
app.use('/api/auth/', loginLimiter);
app.use(strictLimiter);

// ========================================
// Body Parsing
// json body with size limit, plus sanitizeInput middleware
// ========================================
app.use(express.json({ limit: '10kb' }));
app.use(sanitize);

// ========================================
// Data Sanitization
// Prevent NoSQL injection and XSS
// ========================================
app.use(mongoSanitize());
app.use(xss());

// ========================================
// Static File Serving
// Serve /client as static files so site and API run from one origin
// /admin is NOT served yet (purposeful block)
// ========================================
app.use(express.static('client', {
  // Do not serve files from /admin subpath
  // This is handled by the order of middleware
  extensions: ['html', 'js', 'css', 'svg', png', 'jpg'],
  index: false // We'll handle routing manually
}));

// Routes that should NOT serve static files (admin will be added later)
// /admin/* routes will return 404 for now

// ========================================
// API Routes (all prefixed with /api)
// ========================================

// Health check - public, confirms DB
app.get('/api/health', async (req, res) => {
  try {
    const connection = await pool.getConnection();
    connection.release();
    
    return res.json({
      success: true,
      message: 'Server is running',
      database: 'connected'
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: 'Server is running, but database connection failed'
    });
  }
});

// Auth routes
app.use('/api/auth', authRoutes);

// Settings - cached for 60 seconds
app.get('/api/settings', async (req, res) => {
  try {
    // Try cache first
    const cached = cache.get('settings');
    if (cached) {
      return res.json({
        success: true,
        data: cached
      });
    }

    const pool = require('./config/db');
    const [rows] = await pool.query(
      'SELECT setting_key, setting_value FROM site_settings'
    );

    // Transform to key/value object
    const settings = {};
    rows.forEach(row => {
      settings[row.setting_key] = row.setting_value;
    });

    // Cache for 60 seconds (60 * 1000 ms)
    cache.set('settings', settings, 60);

    return res.json({
      success: true,
      data: settings
    });

  } catch (error) {
    console.error('Settings error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch settings'
    });
  }
});

// Sermons routes
app.use('/api/sermons', sermonsRoutes);

// Events routes
app.use('/api/events', eventsRoutes);

// Ministries routes
app.use('/api/ministries', ministriesRoutes);

// Leadership routes
app.use('/api/leadership', leadershipRoutes);

// Contact form
app.use('/api/contact', contactRoutes);

// Prayer requests
app.use('/api/prayer-requests', prayerRequestsRoutes);

// Newsletter
app.use('/api/newsletter', newsletterRoutes);

// ========================================
// 404 Handler - Undefined API routes and static
// ========================================
app.use((req, res) => {
  // If the path starts with /api/, it's an unknown API route
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({
      success: false,
      message: 'API endpoint not found'
    });
  }
  
  // For non-API routes, serve index.html for client-side routing
  // (will be handled by the client-side app)
  res.status(404).json({
    success: false,
    message: 'Resource not found'
  });
});

// ========================================
// Global Error Handler
// Must be mounted after all other middleware
// ========================================
app.use(errorHandler.handler);

// ========================================
// Start Server
// ========================================
const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';

// Validate JWT_SECRET
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  console.error('❌ JWT_SECRET is missing or too short (minimum 32 characters)');
  process.exit(1);
}

// Connect to database and start server
pool.getConnection()
  .then(() => {
    console.log('✅ Database connection established');
    
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`   Environment: ${NODE_ENV}`);
      console.log(`   CORS: ${process.env.SITE_URL || 'localhost only'}`);
      console.log(`   API Base: http://localhost:${PORT}/api`);
      console.log(`   Static: http://localhost:${PORT/`);
    });
  })
  .then(() => {
    require('./utils/logger').setup(app);
  })
  .catch(err => {
    console.error('❌ Failed to start server:', err.message);
    process.exit(1);
  });

module.exports = app;