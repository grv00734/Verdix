const Case = require('../models/Case');
const CasePrecedent = require('../models/CasePrecedent');
const User = require('../models/User');
const Lawyer = require('../models/Lawyer');
const Subscription = require('../models/Subscription');

// Simulate AI analysis - Replace with actual ML model API call
const analyzeCase = async (req, res) => {
  try {
    const { caseId } = req.params;
    const caseData = await Case.findById(caseId);
    
    if (!caseData) {
      return res.status(404).json({ error: 'Case not found' });
    }
    
    // Check subscription
    const subscription = await Subscription.findOne({ userId: req.user.id });
    if (!subscription.features.caseAnalysis) {
      return res.status(403).json({ error: 'Upgrade to premium for case analysis' });
    }
    
    // Simulated AI analysis - Replace with actual API call to ML model
    const suggestedIPCs = [
      'IPC Section 420 - Cheating',
      'IPC Section 406 - Criminal Breach of Trust',
      'IPC Section 409 - Criminal Breach of Trust by Public Servant'
    ];
    
    const summary = `Based on the case description and documents, this appears to be a financial fraud case. The documents suggest potential breach of trust and unauthorized transaction handling.`;
    
    const keyPoints = [
      'Financial discrepancy detected',
      'Unauthorized transaction signatures',
      'Breach of fiduciary duty'
    ];
    
    // Find similar cases
    const similarCases = await CasePrecedent.find({
      ipcSections: { $in: suggestedIPCs },
      year: { $gte: 2015 }
    }).limit(5);
    
    // Update case with analysis
    caseData.aiAnalysis = {
      suggestedIPCs,
      confidence: 0.85,
      summary,
      keyPoints,
      analyzedAt: new Date()
    };
    
    caseData.similarCases = similarCases.map(sc => ({
      caseId: sc._id,
      similarity: 0.8,
      outcome: sc.verdict,
      year: sc.year,
      lawyer: sc.lawyerInvolved[0]?.name || 'N/A',
      citeReference: sc.caseNumber
    }));
    
    await caseData.save();
    
    res.status(200).json({
      message: 'Case analyzed successfully',
      analysis: caseData.aiAnalysis,
      similarCases: caseData.similarCases
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get lawyer suggestions for a case
const getLawyerSuggestions = async (req, res) => {
  try {
    const { caseId } = req.params;
    const caseData = await Case.findById(caseId);
    
    if (!caseData) {
      return res.status(404).json({ error: 'Case not found' });
    }
    
    // Find lawyers with matching specialization
    const lawyers = await Lawyer.find({
      specializations: caseData.caseType,
      verificationStatus: 'verified'
    }).sort({ rating: -1 }).limit(10);
    
    const suggestions = lawyers.map(lawyer => ({
      lawyerId: lawyer._id,
      matchScore: Math.random() * 0.5 + 0.5, // 50-100%
      reason: `${lawyer.experience}+ years in ${caseData.caseType}`
    }));
    
    caseData.suggestedLawyers = suggestions;
    await caseData.save();
    
    const lawyerDetails = await User.find({ _id: { $in: lawyers.map(l => l.userId) } });
    
    res.status(200).json({
      suggestions: suggestions.map(s => {
        const lawyer = lawyers.find(l => l._id.toString() === s.lawyerId.toString());
        const user = lawyerDetails.find(u => u._id.toString() === lawyer.userId.toString());
        return {
          ...s,
          name: user.name,
          email: user.email,
          rating: lawyer.rating,
          consultationFee: lawyer.consultationFee
        };
      })
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Create new case
const createCase = async (req, res) => {
  try {
    const { title, description, caseType } = req.body;
    
    if (!title || !description || !caseType) {
      return res.status(400).json({ error: 'Title, description, and case type are required' });
    }
    
    const newCase = new Case({
      clientId: req.user.id,
      title,
      description,
      caseType
    });
    
    await newCase.save();
    
    res.status(201).json({
      message: 'Case created successfully',
      case: newCase
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get all cases for user
const getUserCases = async (req, res) => {
  try {
    const cases = await Case.find({ clientId: req.user.id });
    res.status(200).json(cases);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get case details
const getCaseDetails = async (req, res) => {
  try {
    const { caseId } = req.params;
    const caseData = await Case.findById(caseId)
      .populate('clientId', 'name email phone')
      .populate('lawyerId');
    
    if (!caseData) {
      return res.status(404).json({ error: 'Case not found' });
    }
    
    res.status(200).json(caseData);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  analyzeCase,
  getLawyerSuggestions,
  createCase,
  getUserCases,
  getCaseDetails
};
