const kanoonService = require('../services/kanoonService');
const CasePrecedent = require('../models/CasePrecedent');
const { getVectorStore } = require('../services/vectorStoreService');

/**
 * Sync cases from IndianKanoon to our database
 * Searches for specific legal terms and indexes the results
 */
const syncKanoonCases = async (req, res) => {
  try {
    const { queries, limit = 5, autoIndex = true } = req.body;

    if (!queries || !Array.isArray(queries) || queries.length === 0) {
      return res.status(400).json({
        error: 'Missing required field: queries (array of search terms)'
      });
    }

    console.log(`Starting Kanoon sync with ${queries.length} queries`);

    // Fetch and index cases
    const result = await kanoonService.fetchAndIndexCases(queries, limit);

    // Auto-index embeddings if requested
    if (autoIndex && result.indexed > 0) {
      const vectorStore = await getVectorStore();
      console.log(`Auto-indexing ${result.indexed} cases into vector database...`);
      
      let indexedCount = 0;
      for (const caseRecord of result.cases) {
        try {
          await vectorStore.indexCase(caseRecord);
          indexedCount++;
        } catch (error) {
          console.error(`Failed to index embeddings for case ${caseRecord.caseNumber}:`, error.message);
        }
      }

      result.embeddingsIndexed = indexedCount;
    }

    res.status(200).json({
      success: true,
      message: `Successfully synced ${result.indexed} cases from IndianKanoon`,
      statistics: {
        totalProcessed: result.indexed + result.failed,
        indexed: result.indexed,
        embeddingsIndexed: result.embeddingsIndexed || 0,
        failed: result.failed,
        queries: queries.length
      },
      errors: result.errors.length > 0 ? result.errors.slice(0, 5) : null
    });
  } catch (error) {
    console.error('Kanoon sync error:', error);
    res.status(500).json({
      error: 'Failed to sync cases from IndianKanoon',
      details: error.message
    });
  }
};

/**
 * Get recommended search queries for initial data population
 */
const getRecommendedQueries = (req, res) => {
  try {
    const queries = require('../services/kanoonService').constructor.getPopularQueries();
    res.status(200).json({
      success: true,
      queries,
      count: queries.length,
      description: 'Recommended search queries for populating the legal database'
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to retrieve recommended queries',
      details: error.message
    });
  }
};

/**
 * Manually fetch a single case from IndianKanoon using case URL
 */
const fetchSingleCase = async (req, res) => {
  try {
    const { caseUrl } = req.body;

    if (!caseUrl || !caseUrl.startsWith('https://indiankanoon.org')) {
      return res.status(400).json({
        error: 'Invalid case URL. Must be a valid IndianKanoon URL'
      });
    }

    const caseData = await kanoonService.fetchCaseDetails(caseUrl);

    // Save to database
    const savedCase = await CasePrecedent.create(caseData);

    // Index embeddings
    const vectorStore = await getVectorStore();
    await vectorStore.indexCase(savedCase);

    res.status(200).json({
      success: true,
      case: savedCase,
      message: 'Case fetched and indexed successfully'
    });
  } catch (error) {
    console.error('Single case fetch error:', error);
    res.status(500).json({
      error: 'Failed to fetch case from IndianKanoon',
      details: error.message
    });
  }
};

/**
 * Search cases using a custom query on IndianKanoon
 * Returns case URLs without indexing them
 */
const searchKanoonCases = async (req, res) => {
  try {
    const { query, limit = 10 } = req.body;

    if (!query || query.trim().length === 0) {
      return res.status(400).json({
        error: 'Missing required field: query'
      });
    }

    const caseLinks = await kanoonService.searchCases(query, limit);

    res.status(200).json({
      success: true,
      query,
      count: caseLinks.length,
      cases: caseLinks
    });
  } catch (error) {
    console.error('Kanoon search error:', error);
    res.status(500).json({
      error: 'Failed to search IndianKanoon',
      details: error.message
    });
  }
};

/**
 * Get database statistics about indexed Kanoon cases
 */
const getKanoonStats = async (req, res) => {
  try {
    const totalCases = await CasePrecedent.countDocuments({});
    const kanoonCases = await CasePrecedent.countDocuments({ source: 'IndianKanoon' });
    const indexedCases = await CasePrecedent.countDocuments({ embedding: { $exists: true } });
    const ipcCoverage = await CasePrecedent.distinct('ipcSections');

    res.status(200).json({
      success: true,
      statistics: {
        totalCasesInDB: totalCases,
        kanoonCases: kanoonCases,
        embeddingsIndexed: indexedCases,
        uniqueIPCSections: ipcCoverage.length,
        populationPercentage: totalCases > 0 ? ((kanoonCases / totalCases) * 100).toFixed(1) + '%' : '0%'
      }
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to retrieve statistics',
      details: error.message
    });
  }
};

/**
 * Force reindex all Kanoon cases into vector database
 * Useful for updating embeddings after model changes
 */
const reindexAllKanoonCases = async (req, res) => {
  try {
    const vectorStore = await getVectorStore();
    const kanoonCases = await CasePrecedent.find({ source: 'IndianKanoon' });

    if (kanoonCases.length === 0) {
      return res.status(400).json({
        message: 'No Kanoon cases found to reindex'
      });
    }

    console.log(`Reindexing ${kanoonCases.length} Kanoon cases...`);

    let successCount = 0;
    let failureCount = 0;

    for (const caseRecord of kanoonCases) {
      try {
        await vectorStore.indexCase(caseRecord);
        successCount++;
      } catch (error) {
        console.error(`Failed to index ${caseRecord.caseNumber}:`, error.message);
        failureCount++;
      }
    }

    res.status(200).json({
      success: true,
      message: `Reindexing complete. ${successCount} succeeded, ${failureCount} failed`,
      statistics: {
        total: kanoonCases.length,
        succeeded: successCount,
        failed: failureCount
      }
    });
  } catch (error) {
    console.error('Reindex error:', error);
    res.status(500).json({
      error: 'Failed to reindex cases',
      details: error.message
    });
  }
};

module.exports = {
  syncKanoonCases,
  getRecommendedQueries,
  fetchSingleCase,
  searchKanoonCases,
  getKanoonStats,
  reindexAllKanoonCases
};
