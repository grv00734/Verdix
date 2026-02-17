require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const morgan = require('morgan');
const { getVectorStore } = require('./services/vectorStoreService');

const app = express();

// Middleware
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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

    // Health check
    app.get('/api/health', (req, res) => {
      res.json({ status: 'Server is running', database: 'connected' });
    });

    // Error handling middleware
    app.use((err, req, res, next) => {
      console.error(err);
      res.status(500).json({ error: 'Internal server error' });
    });

    // 5. Start the server (only after everything is ready)
    const PORT = process.env.PORT || 5000;
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
