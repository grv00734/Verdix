const CasePrecedent = require('../models/CasePrecedent');
const { createEmbedding, cosineSimilarity } = require('./embeddingService');

// Store embeddings in MongoDB
class VectorStore {
  constructor() {
    this.initialized = false;
  }

  async initialize() {
    try {
      console.log('Initializing Vector Store...');
      // Check if we have indexed cases
      const indexedCount = await CasePrecedent.countDocuments({ embedding: { $exists: true } });
      console.log(`Found ${indexedCount} indexed cases`);
      this.initialized = true;
    } catch (error) {
      console.error('Vector store initialization error:', error);
    }
  }

  async indexCase(caseData) {
    try {
      // Create text representation of case
      const caseText = `
        Case Number: ${caseData.caseNumber}
        Title: ${caseData.title}
        Year: ${caseData.year}
        Court: ${caseData.court}
        IPC Sections: ${caseData.ipcSections?.join(', ') || ''}
        Facts: ${caseData.facts || ''}
        Summary: ${caseData.summary || ''}
        Decision: ${caseData.decision || ''}
        Keywords: ${caseData.keywords?.join(', ') || ''}
      `;

      // Generate embedding
      const embedding = await createEmbedding(caseText);

      // Store embedding in database
      await CasePrecedent.findByIdAndUpdate(
        caseData._id,
        { embedding },
        { new: true }
      );

      return true;
    } catch (error) {
      console.error('Case indexing error:', error);
      throw error;
    }
  }

  async indexAllCases() {
    try {
      const cases = await CasePrecedent.find({ embedding: { $exists: false } });
      
      console.log(`Indexing ${cases.length} cases...`);
      
      for (let i = 0; i < cases.length; i++) {
        try {
          await this.indexCase(cases[i]);
          console.log(`Indexed case ${i + 1}/${cases.length}: ${cases[i].caseNumber}`);
          
          // Add delay to avoid rate limiting
          if ((i + 1) % 5 === 0) {
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        } catch (error) {
          console.error(`Failed to index case ${cases[i].caseNumber}:`, error.message);
        }
      }
      
      console.log('All cases indexed successfully');
      return cases.length;
    } catch (error) {
      console.error('Bulk indexing error:', error);
      throw error;
    }
  }

  async searchSimilarCases(query, k = 5) {
    try {
      // Get all indexed cases
      const indexedCases = await CasePrecedent.find({ embedding: { $exists: true } });
      
      if (indexedCases.length === 0) {
        console.warn('No indexed cases found in vector store');
        return [];
      }

      // Create embedding for query
      const queryEmbedding = await createEmbedding(query);

      // Calculate similarity for each case
      const similarities = indexedCases.map(caseData => {
        const similarity = cosineSimilarity(queryEmbedding, caseData.embedding);
        return {
          caseId: caseData._id,
          caseNumber: caseData.caseNumber,
          title: caseData.title,
          similarity,
          content: caseData.summary || caseData.facts || caseData.title
        };
      });

      // Sort by similarity and return top K
      const topResults = similarities
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, k);

      return topResults;
    } catch (error) {
      console.error('Similarity search error:', error);
      throw error;
    }
  }

  async reindexCase(caseId) {
    try {
      const caseData = await CasePrecedent.findById(caseId);
      if (!caseData) {
        throw new Error('Case not found');
      }
      await this.indexCase(caseData);
      return true;
    } catch (error) {
      console.error('Reindexing error:', error);
      throw error;
    }
  }

  async deleteIndex(caseId) {
    try {
      await CasePrecedent.findByIdAndUpdate(
        caseId,
        { embedding: null },
        { new: true }
      );
      return true;
    } catch (error) {
      console.error('Index deletion error:', error);
      throw error;
    }
  }
}

// Singleton instance
let vectorStore = null;

const getVectorStore = async () => {
  if (!vectorStore) {
    vectorStore = new VectorStore();
    await vectorStore.initialize();
  }
  return vectorStore;
};

module.exports = {
  getVectorStore,
  VectorStore
};
