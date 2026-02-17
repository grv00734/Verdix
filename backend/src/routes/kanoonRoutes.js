const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const {
  syncKanoonCases,
  getRecommendedQueries,
  fetchSingleCase,
  searchKanoonCases,
  getKanoonStats,
  reindexAllKanoonCases
} = require('../controllers/kanoonController');

/**
 * Indian Kanoon Integration Routes
 * Base path: /api/kanoon
 *
 * These routes enable integration with IndianKanoon.org
 * to fetch and index legal cases for RAG system
 */

/**
 * POST /api/kanoon/sync
 * Sync cases from IndianKanoon to database
 * 
 * Body:
 * {
 *   "queries": ["Section 302 IPC murder", "rape", "theft"],
 *   "limit": 5,
 *   "autoIndex": true
 * }
 */
router.post('/sync', authMiddleware, syncKanoonCases);

/**
 * GET /api/kanoon/recommended-queries
 * Get recommended search queries for initial data population
 */
router.get('/recommended-queries', getRecommendedQueries);

/**
 * POST /api/kanoon/search
 * Search IndianKanoon without indexing
 *
 * Body:
 * {
 *   "query": "Section 302 IPC",
 *   "limit": 10
 * }
 */
router.post('/search', searchKanoonCases);

/**
 * POST /api/kanoon/fetch-single
 * Fetch a single case from IndianKanoon using direct URL
 *
 * Body:
 * {
 *   "caseUrl": "https://indiankanoon.org/doc/123456/"
 * }
 */
router.post('/fetch-single', authMiddleware, fetchSingleCase);

/**
 * GET /api/kanoon/stats
 * Get statistics about indexed Kanoon cases
 */
router.get('/stats', getKanoonStats);

/**
 * POST /api/kanoon/reindex
 * Force reindex all Kanoon cases into vector database
 */
router.post('/reindex', authMiddleware, reindexAllKanoonCases);

module.exports = router;
