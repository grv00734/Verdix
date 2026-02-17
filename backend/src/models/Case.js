const mongoose = require('mongoose');

const caseSchema = new mongoose.Schema({
  clientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  lawyerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Lawyer',
    default: null
  },
  title: {
    type: String,
    required: [true, 'Case title is required']
  },
  description: {
    type: String,
    required: [true, 'Case description is required']
  },
  caseType: {
    type: String,
    enum: ['Criminal', 'Civil', 'Corporate', 'Family', 'Property', 'Intellectual Property', 'Labour', 'Constitutional'],
    required: true
  },
  severity: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium'
  },
  documents: [{
    filename: String,
    url: String,
    uploadedAt: Date,
    type: String
  }],
  aiAnalysis: {
    suggestedIPCs: [String],
    confidence: Number,
    summary: String,
    keyPoints: [String],
    keyArguments: String,
    riskLevel: String,
    recommendations: String,
    analyzedAt: Date
  },
  similarCases: [{
    caseId: mongoose.Schema.Types.ObjectId,
    similarity: Number,
    outcome: String,
    year: Number,
    lawyer: String,
    citeReference: String
  }],
  suggestedLawyers: [{
    lawyerId: mongoose.Schema.Types.ObjectId,
    matchScore: Number,
    reason: String
  }],
  status: {
    type: String,
    enum: ['draft', 'submitted', 'under_review', 'assigned', 'in_progress', 'resolved', 'closed'],
    default: 'draft'
  },
  priority: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Case', caseSchema);
