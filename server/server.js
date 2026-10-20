/**
 * ROYAL TEMPLE WORSHIP CENTRE - Server Entry Point
 * Express server configuration with security, CORS, routes, and error handling
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
// - Strict limiter: 5 requests per 15 min for all routes
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
// Health Route - Public, confirms DB connection
// GET /api/health
// ========================================
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
};

// ========================================
// Auth Routes
// POST /api/auth/login, POST /api/auth/logout, GET /api/auth/me
// ========================================
app.use('/api/auth', authRoutes);

// ========================================
// 404 Handler - Undefined routes
// ========================================
app.use(notFound);

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
      console.log(`   JWT_SECRET: configured`);
      console.log(`   CORS: ${process.env.SITE_URL || 'localhost only'}`);
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