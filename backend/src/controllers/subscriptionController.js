const Subscription = require('../models/Subscription');
const User = require('../models/User');

// Get subscription plans
const getPlans = (req, res) => {
  const plans = {
    free: {
      name: 'Free',
      price: 0,
      features: {
        caseAnalysis: false,
        documentUpload: false,
        lawyerSearch: false,
        aiSuggestions: false,
        caseSimilaritySearch: 0,
        maxDocuments: 0,
        consultationRequests: 0
      }
    },
    premium: {
      name: 'Premium',
      price: 499,
      duration: 'monthly',
      features: {
        caseAnalysis: true,
        documentUpload: true,
        lawyerSearch: true,
        aiSuggestions: true,
        caseSimilaritySearch: 10,
        maxDocuments: 5,
        consultationRequests: 5
      }
    },
    pro: {
      name: 'Pro',
      price: 999,
      duration: 'monthly',
      features: {
        caseAnalysis: true,
        documentUpload: true,
        lawyerSearch: true,
        aiSuggestions: true,
        caseSimilaritySearch: 100,
        maxDocuments: 50,
        consultationRequests: 50
      }
    }
  };
  
  res.status(200).json(plans);
};

// Get user subscription
const getUserSubscription = async (req, res) => {
  try {
    const subscription = await Subscription.findOne({ userId: req.user.id });
    
    if (!subscription) {
      return res.status(404).json({ error: 'No subscription found' });
    }
    
    res.status(200).json(subscription);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Upgrade subscription
const upgradeSubscription = async (req, res) => {
  try {
    const { tier, stripeToken } = req.body;
    
    // In production, process payment with Stripe here
    // const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
    
    const subscription = await Subscription.findOneAndUpdate(
      { userId: req.user.id },
      {
        tier,
        isActive: true,
        startDate: new Date(),
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
      },
      { new: true }
    );
    
    if (!subscription) {
      return res.status(404).json({ error: 'Subscription not found' });
    }
    
    res.status(200).json({
      message: `Upgraded to ${tier} successfully`,
      subscription
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Cancel subscription
const cancelSubscription = async (req, res) => {
  try {
    const subscription = await Subscription.findOneAndUpdate(
      { userId: req.user.id },
      {
        tier: 'free',
        isActive: false,
        cancelledAt: new Date()
      },
      { new: true }
    );
    
    if (!subscription) {
      return res.status(404).json({ error: 'Subscription not found' });
    }
    
    res.status(200).json({
      message: 'Subscription cancelled',
      subscription
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  getPlans,
  getUserSubscription,
  upgradeSubscription,
  cancelSubscription
};
