const express = require('express');
const router = express.Router();
const {
  analyzeCaseWithRAG,
  getSimilarCasesWithRAG,
  compareWithPrecedentsRAG,
  indexCaseForRAG,
  indexAllCasesForRAG,
  getRagStats
} = require('../controllers/ragController');
const { authMiddleware, requireClient } = require('../middleware/auth');

// Client routes for RAG analysis
router.post('/analyze/:caseId', authMiddleware, requireClient, analyzeCaseWithRAG);
router.get('/similar/:caseId', authMiddleware, getSimilarCasesWithRAG);
router.get('/compare/:caseId', authMiddleware, compareWithPrecedentsRAG);

// Admin routes for indexing
router.post('/index/:caseId', authMiddleware, indexCaseForRAG);
router.post('/index-all', authMiddleware, indexAllCasesForRAG);
router.get('/stats', getRagStats);

module.exports = router;
