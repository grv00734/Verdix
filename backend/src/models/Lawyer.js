const mongoose = require('mongoose');

const lawyerSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  licenseNumber: {
    type: String,
    required: [true, 'License number is required'],
    unique: true
  },
  specializations: [{
    type: String,
    enum: ['Criminal', 'Civil', 'Corporate', 'Family', 'Property', 'Intellectual Property', 'Labour', 'Constitutional']
  }],
  experience: {
    type: Number,
    required: true
  },
  barCouncil: {
    type: String,
    required: true
  },
  bio: String,
  caseWon: {
    type: Number,
    default: 0
  },
  caseLost: {
    type: Number,
    default: 0
  },
  rating: {
    type: Number,
    min: 0,
    max: 5,
    default: 0
  },
  totalReviews: {
    type: Number,
    default: 0
  },
  consultationFee: {
    type: Number,
    required: true
  },
  hourlyRate: {
    type: Number,
    required: true
  },
  languages: [String],
  office: {
    address: String,
    city: String,
    state: String,
    pincode: String
  },
  verificationStatus: {
    type: String,
    enum: ['pending', 'verified', 'rejected'],
    default: 'pending'
  },
  verificationDocuments: [String],
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Lawyer', lawyerSchema);
