const mongoose = require('mongoose');

const casePrecedentSchema = new mongoose.Schema({
  caseNumber: {
    type: String,
    required: true,
    unique: true
  },
  title: {
    type: String,
    required: true
  },
  year: {
    type: Number,
    default: null
  },
  court: {
    type: String,
    default: 'Unknown'
  },
  judges: [String],
  plaintiffName: String,
  defendantName: String,
  summary: String,
  ipcSections: [String],
  facts: String,
  decision: String,
  verdict: {
    type: String,
    enum: ['guilty', 'not_guilty', 'partial', 'dismissed', 'acquitted', 'unknown'],
    default: 'unknown'
  },
  lawyerInvolved: [{
    name: String,
    role: String
  }],
  penalties: String,
  citations: [String],
  keywords: [String],
  relevanceScore: Number,
  // RAG Vector Embedding
  embedding: {
    type: [Number],
    default: null
  },
  indexed: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Index for searching (separate indexes since MongoDB doesn't allow compound indexes on multiple arrays)
casePrecedentSchema.index({ ipcSections: 1 });
casePrecedentSchema.index({ keywords: 1 });
casePrecedentSchema.index({ caseNumber: 1 });
casePrecedentSchema.index({ indexed: 1 });

module.exports = mongoose.model('CasePrecedent', casePrecedentSchema);
