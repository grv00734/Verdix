const express = require('express');
const router = express.Router();
const {
  createCase,
  getUserCases,
  getCaseDetails,
  analyzeCase,
  getLawyerSuggestions
} = require('../controllers/caseController');
const { authMiddleware, requireClient, requireSubscription } = require('../middleware/auth');

router.post('/', authMiddleware, requireClient, createCase);
router.get('/my-cases', authMiddleware, requireClient, getUserCases);
router.get('/:caseId', authMiddleware, getCaseDetails);
router.post('/:caseId/analyze', authMiddleware, requireSubscription('premium'), analyzeCase);
router.get('/:caseId/lawyer-suggestions', authMiddleware, requireClient, getLawyerSuggestions);

module.exports = router;
