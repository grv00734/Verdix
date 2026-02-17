const Case = require('../models/Case');
const CasePrecedent = require('../models/CasePrecedent');
const { analyzeWithRAG, compareWithPrecedents } = require('../services/ragService');
const { getVectorStore } = require('../services/vectorStoreService');
const Subscription = require('../models/Subscription');

// RAG-powered case analysis
const analyzeCaseWithRAG = async (req, res) => {
  try {
    const { caseId } = req.params;
    const caseData = await Case.findById(caseId);

    if (!caseData) {
      return res.status(404).json({ error: 'Case not found' });
    }

    // Check subscription
    const subscription = await Subscription.findOne({ userId: req.user.id });
    if (!subscription?.features?.caseAnalysis) {
      return res.status(403).json({ error: 'Upgrade to premium for RAG analysis' });
    }

    // Perform RAG analysis with auto-classification
    const ragAnalysis = await analyzeWithRAG(
      caseData.description,
      caseData.caseType === 'General' ? null : caseData.caseType
    );

    // Update case type if auto-detected
    if (ragAnalysis.caseType && (!caseData.caseType || caseData.caseType === 'General')) {
      caseData.caseType = ragAnalysis.caseType;
    }

    // Update case with enhanced analysis
    caseData.aiAnalysis = {
      suggestedIPCs: ragAnalysis.analysis.suggestedIPCs,
      confidence: ragAnalysis.analysis.confidence,
      summary: ragAnalysis.analysis.summary,
      keyPoints: ragAnalysis.analysis.analysis.split('\n').filter(p => p.trim()).slice(0, 5),
      keyArguments: ragAnalysis.analysis.keyArguments,
      riskLevel: ragAnalysis.analysis.riskLevel,
      recommendations: ragAnalysis.analysis.recommendations,
      analyzedAt: new Date()
    };

    // Store similar cases found
    if (ragAnalysis.retrievedCases && ragAnalysis.retrievedCases.length > 0) {
      caseData.similarCases = ragAnalysis.retrievedCases.map(rc => ({
        caseId: rc.caseId,
        similarity: rc.similarity,
        outcome: rc.verdict || 'Precedent case',
        year: new Date().getFullYear(), // Placeholder if year not in vector store
        lawyer: 'Precedent',
        citeReference: rc.caseNumber
      }));
    }

    await caseData.save();

    res.status(200).json({
      message: 'RAG analysis completed successfully',
      caseType: caseData.caseType,
      analysis: caseData.aiAnalysis,
      similarCases: caseData.similarCases,
      recommendedLawyers: ragAnalysis.recommendedLawyers,
      fullAnalysis: ragAnalysis.analysis
    });
  } catch (error) {
    console.error('RAG Analysis error:', error);
    res.status(500).json({ error: error.message });
  }
};

// Get similar cases using RAG vector search
const getSimilarCasesWithRAG = async (req, res) => {
  try {
    const { caseId } = req.params;
    const { limit = 5 } = req.query;

    const caseData = await Case.findById(caseId);
    if (!caseData) {
      return res.status(404).json({ error: 'Case not found' });
    }

    // Search using vector store
    const vectorStore = await getVectorStore();
    const query = `${caseData.caseType} case: ${caseData.description}`;
    const similarCases = await vectorStore.searchSimilarCases(query, parseInt(limit));

    // Fetch full case details
    const casePrecedents = await CasePrecedent.find({
      _id: { $in: similarCases.map(sc => sc.caseId) }
    }).select('caseNumber title year court verdict ipcSections summary');

    res.status(200).json({
      count: casePrecedents.length,
      cases: casePrecedents.map((cp, idx) => ({
        id: cp._id,
        caseNumber: cp.caseNumber,
        title: cp.title,
        year: cp.year,
        court: cp.court,
        verdict: cp.verdict,
        ipcSections: cp.ipcSections,
        similarity: similarCases[idx]?.similarity || 0.85
      }))
    });
  } catch (error) {
    console.error('RAG search error:', error);
    res.status(500).json({ error: error.message });
  }
};

// Compare case with precedents
const compareWithPrecedentsRAG = async (req, res) => {
  try {
    const { caseId } = req.params;
    const caseData = await Case.findById(caseId);

    if (!caseData) {
      return res.status(404).json({ error: 'Case not found' });
    }

    // Get similar cases first
    const vectorStore = await getVectorStore();
    const query = `${caseData.caseType} case: ${caseData.description}`;
    const similarCases = await vectorStore.searchSimilarCases(query, 3);

    // Fetch precedent details
    const precedents = await CasePrecedent.find({
      _id: { $in: similarCases.map(sc => sc.caseId) }
    });

    // Get comparison from RAG
    const comparison = await compareWithPrecedents(
      {
        title: caseData.title,
        description: caseData.description,
        caseType: caseData.caseType
      },
      precedents
    );

    res.status(200).json({
      currentCase: {
        id: caseData._id,
        title: caseData.title,
        type: caseData.caseType
      },
      precedents: precedents.map(p => ({
        id: p._id,
        caseNumber: p.caseNumber,
        title: p.title,
        year: p.year,
        verdict: p.verdict
      })),
      comparison
    });
  } catch (error) {
    console.error('Comparison error:', error);
    res.status(500).json({ error: error.message });
  }
};

// Index a single case for RAG
const indexCaseForRAG = async (req, res) => {
  try {
    const { caseId } = req.params;
    const caseData = await CasePrecedent.findById(caseId);

    if (!caseData) {
      return res.status(404).json({ error: 'Case precedent not found' });
    }

    const vectorStore = await getVectorStore();
    await vectorStore.indexCase(caseData);

    await CasePrecedent.findByIdAndUpdate(
      caseId,
      { indexed: true },
      { new: true }
    );

    res.status(200).json({
      message: 'Case indexed successfully',
      caseId: caseData._id
    });
  } catch (error) {
    console.error('Indexing error:', error);
    res.status(500).json({ error: error.message });
  }
};

// Index all cases for RAG
const indexAllCasesForRAG = async (req, res) => {
  try {
    const vectorStore = await getVectorStore();
    const count = await vectorStore.indexAllCases();

    res.status(200).json({
      message: 'Cases indexed successfully',
      count
    });
  } catch (error) {
    console.error('Bulk indexing error:', error);
    res.status(500).json({ error: error.message });
  }
};

// Get RAG statistics
const getRagStats = async (req, res) => {
  try {
    const indexedCount = await CasePrecedent.countDocuments({ indexed: true });
    const totalCount = await CasePrecedent.countDocuments();

    res.status(200).json({
      indexed: indexedCount,
      total: totalCount,
      percentage: totalCount > 0 ? ((indexedCount / totalCount) * 100).toFixed(2) : 0
    });
  } catch (error) {
    console.error('Stats error:', error);
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  analyzeCaseWithRAG,
  getSimilarCasesWithRAG,
  compareWithPrecedentsRAG,
  indexCaseForRAG,
  indexAllCasesForRAG,
  getRagStats
};
