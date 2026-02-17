const express = require('express');
const router = express.Router();
const {
  getPlans,
  getUserSubscription,
  upgradeSubscription,
  cancelSubscription
} = require('../controllers/subscriptionController');
const { authMiddleware } = require('../middleware/auth');

router.get('/plans', getPlans);
router.get('/my-subscription', authMiddleware, getUserSubscription);
router.post('/upgrade', authMiddleware, upgradeSubscription);
router.post('/cancel', authMiddleware, cancelSubscription);

module.exports = router;
