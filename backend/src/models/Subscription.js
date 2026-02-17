const mongoose = require('mongoose');

const subscriptionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  tier: {
    type: String,
    enum: ['free', 'premium', 'pro'],
    default: 'free'
  },
  features: {
    caseAnalysis: Boolean,
    documentUpload: Boolean,
    lawyerSearch: Boolean,
    aiSuggestions: Boolean,
    caseSimilaritySearch: Number,
    maxDocuments: Number,
    consultationRequests: Number
  },
  startDate: {
    type: Date,
    default: Date.now
  },
  endDate: Date,
  autoRenew: {
    type: Boolean,
    default: true
  },
  stripeSubscriptionId: String,
  stripeCustomerId: String,
  price: Number,
  currency: {
    type: String,
    default: 'INR'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  cancelledAt: Date,
  paymentHistory: [{
    date: Date,
    amount: Number,
    status: String,
    invoiceId: String
  }],
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Define subscription tiers
subscriptionSchema.statics.TIERS = {
  FREE: {
    caseAnalysis: true,
    documentUpload: false,
    lawyerSearch: false,
    aiSuggestions: false,
    caseSimilaritySearch: 0,
    maxDocuments: 0,
    consultationRequests: 0
  },
  PREMIUM: {
    caseAnalysis: true,
    documentUpload: true,
    lawyerSearch: true,
    aiSuggestions: true,
    caseSimilaritySearch: 10,
    maxDocuments: 5,
    consultationRequests: 5
  },
  PRO: {
    caseAnalysis: true,
    documentUpload: true,
    lawyerSearch: true,
    aiSuggestions: true,
    caseSimilaritySearch: 100,
    maxDocuments: 50,
    consultationRequests: 50
  }
};

module.exports = mongoose.model('Subscription', subscriptionSchema);
