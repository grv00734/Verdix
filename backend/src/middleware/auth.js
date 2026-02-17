const jwt = require('jsonwebtoken');

const authMiddleware = (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

const requireLawyer = (req, res, next) => {
  if (req.user.userType !== 'lawyer') {
    return res.status(403).json({ error: 'Only lawyers can access this resource' });
  }
  next();
};

const requireClient = (req, res, next) => {
  if (req.user.userType !== 'client') {
    return res.status(403).json({ error: 'Only clients can access this resource' });
  }
  next();
};

const requireSubscription = (tier) => {
  return async (req, res, next) => {
    const Subscription = require('../models/Subscription');
    const subscription = await Subscription.findOne({ userId: req.user.id });
    
    if (!subscription || !subscription.isActive) {
      return res.status(403).json({ error: 'Subscription required' });
    }
    
    if (tier && subscription.tier !== tier && tier !== 'free') {
      return res.status(403).json({ error: 'Premium subscription required' });
    }
    
    next();
  };
};

module.exports = {
  authMiddleware,
  requireLawyer,
  requireClient,
  requireSubscription
};
