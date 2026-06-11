require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const morgan = require('morgan');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { getVectorStore } = require('./services/vectorStoreService');

const app = express();

// Security headers
app.use(helmet());

// CORS — restrict to configured origins when provided, else allow all (dev).
const corsOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map((o) => o.trim())
  : '*';
app.use(cors({ origin: corsOrigins }));

// Logging & body parsing
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));

// Rate limiting to protect the API from abuse.
app.use(
  '/api',
  rateLimit({
    windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS || 15 * 60 * 1000),
    max: Number(process.env.RATE_LIMIT_MAX || 300),
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests, please try again later.' }
  })
);

// Main async startup function
const startServer = async () => {
  try {
    // 1. Connect to MongoDB first
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/verdix');
    console.log('✓ MongoDB connected');

    // 2. Sync indexes to fix any stale compound indexes
    try {
      const CasePrecedent = require('./models/CasePrecedent');
      await CasePrecedent.syncIndexes();
      console.log('✓ Indexes synced');
    } catch (e) {
      console.warn('⚠ Index sync warning:', e.message);
    }

    // 3. Initialize RAG Vector Store (non-critical)
    try {
      console.log('Initializing RAG Vector Store...');
      const vectorStore = await getVectorStore();
      console.log('✓ RAG Vector Store initialized successfully');
    } catch (error) {
      console.error('⚠ RAG initialization warning:', error.message);
      console.log('Platform will continue without RAG (non-critical)');
    }

    // 4. Setup routes (only after DB is connected)
    app.use('/api/auth', require('./routes/authRoutes'));
    app.use('/api/cases', require('./routes/caseRoutes'));
    app.use('/api/rag', require('./routes/ragRoutes'));
    app.use('/api/lawyers', require('./routes/lawyerRoutes'));
    app.use('/api/subscription', require('./routes/subscriptionRoutes'));
    app.use('/api/kanoon', require('./routes/kanoonRoutes'));
    app.use('/api/documents', require('./routes/documentRoutes'));

    // Health check
    app.get('/api/health', (req, res) => {
      res.json({
        status: 'Server is running',
        database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
        timestamp: new Date().toISOString()
      });
    });

    // 404 for unknown API routes
    app.use('/api', (req, res) => {
      res.status(404).json({ error: `Route not found: ${req.method} ${req.originalUrl}` });
    });

    // Centralized error handler
    app.use((err, req, res, next) => {
      console.error(err);
      res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
    });

    // 5. Start the server (only after everything is ready)
    const PORT = process.env.PORT || 5001;
    app.listen(PORT, () => {
      console.log(`✓ Server running on port ${PORT}`);
      console.log('✓ All systems ready');
    });

  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

// Start the server
startServer();
