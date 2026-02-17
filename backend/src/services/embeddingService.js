const axios = require('axios');

const XAI_BASE_URL = 'https://api.x.ai/v1';

/**
 * Create embedding using xAI (Grok) API
 * xAI's API is OpenAI-compatible, so we use the same /v1/embeddings endpoint
 */
const createEmbedding = async (text) => {
  try {
    if (!process.env.XAI_API_KEY) {
      throw new Error('XAI_API_KEY is not set. Embedding features are disabled.');
    }

    // Truncate text to avoid token limits
    const truncatedText = text.substring(0, 8000);

    const response = await axios.post(`${XAI_BASE_URL}/embeddings`, {
      model: process.env.EMBEDDING_MODEL || 'v1',
      input: truncatedText
    }, {
      headers: {
        'Authorization': `Bearer ${process.env.XAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      timeout: 30000
    });

    return response.data.data[0].embedding;
  } catch (error) {
    console.error('Embedding error:', error.response?.data || error.message);
    throw new Error(`Failed to create embedding: ${error.response?.data?.error?.message || error.message}`);
  }
};

/**
 * Create multiple embeddings in batch
 */
const createEmbeddings = async (texts) => {
  try {
    if (!process.env.XAI_API_KEY) {
      throw new Error('XAI_API_KEY is not set. Embedding features are disabled.');
    }

    const truncatedTexts = texts.map(t => t.substring(0, 8000));

    const response = await axios.post(`${XAI_BASE_URL}/embeddings`, {
      model: process.env.EMBEDDING_MODEL || 'v1',
      input: truncatedTexts
    }, {
      headers: {
        'Authorization': `Bearer ${process.env.XAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      timeout: 60000
    });

    return response.data.data.map(d => d.embedding);
  } catch (error) {
    console.error('Embeddings error:', error.response?.data || error.message);
    throw new Error(`Failed to create embeddings: ${error.response?.data?.error?.message || error.message}`);
  }
};

/**
 * Calculate cosine similarity between two vectors
 */
const cosineSimilarity = (vecA, vecB) => {
  if (!vecA || !vecB || vecA.length !== vecB.length) {
    return 0;
  }

  const dotProduct = vecA.reduce((sum, a, i) => sum + a * vecB[i], 0);
  const magnitudeA = Math.sqrt(vecA.reduce((sum, x) => sum + x * x, 0));
  const magnitudeB = Math.sqrt(vecB.reduce((sum, x) => sum + x * x, 0));

  if (magnitudeA === 0 || magnitudeB === 0) {
    return 0;
  }

  return dotProduct / (magnitudeA * magnitudeB);
};

module.exports = {
  createEmbedding,
  createEmbeddings,
  cosineSimilarity
};
