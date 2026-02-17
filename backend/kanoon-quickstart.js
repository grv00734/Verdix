#!/usr/bin/env node

/**
 * Quick Start Script for IndianKanoon Integration
 * 
 * This script demonstrates how to use the Kanoon API integration
 * Run with: node kanoon-quickstart.js
 */

const axios = require('axios');

const API_URL = process.env.API_URL || 'http://localhost:5000';
const AUTH_TOKEN = process.env.AUTH_TOKEN || 'your_jwt_token_here';

const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${AUTH_TOKEN}`
  },
  timeout: 60000
});

// Color output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  blue: '\x1b[34m',
  yellow: '\x1b[33m',
  red: '\x1b[31m'
};

const log = {
  success: (msg) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
  info: (msg) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
  warn: (msg) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}✗${colors.reset} ${msg}`),
  header: (msg) => console.log(`\n${colors.blue}${'='.repeat(50)}${colors.reset}\n${msg}\n${colors.blue}${'='.repeat(50)}${colors.reset}`)
};

async function step1_GetRecommendedQueries() {
  log.header('STEP 1: Get Recommended Search Queries');
  
  try {
    log.info('Fetching recommended queries from API...');
    const response = await apiClient.get('/api/kanoon/recommended-queries');
    
    log.success(`Found ${response.data.count} recommended queries`);
    console.log('\nAvailable queries:');
    response.data.queries.slice(0, 10).forEach((q, i) => {
      console.log(`  ${i + 1}. ${q}`);
    });
    
    return response.data.queries;
  } catch (error) {
    log.error(`Failed to fetch recommended queries: ${error.message}`);
    return null;
  }
}

async function step2_SearchCases(query) {
  log.header(`STEP 2: Search IndianKanoon for "${query}"`);
  
  try {
    log.info(`Searching for: ${query}`);
    const response = await apiClient.post('/api/kanoon/search', {
      query: query,
      limit: 5
    });
    
    log.success(`Found ${response.data.count} cases`);
    console.log('\nFirst 3 case URLs:');
    response.data.cases.slice(0, 3).forEach((url, i) => {
      console.log(`  ${i + 1}. ${url}`);
    });
    
    return response.data.cases;
  } catch (error) {
    log.error(`Failed to search cases: ${error.message}`);
    return null;
  }
}

async function step3_SyncCases(queries) {
  log.header('STEP 3: Sync Cases to Database');
  
  try {
    const syncQueries = queries.slice(0, 3); // Use first 3 queries
    log.info(`Syncing with ${syncQueries.length} queries...`);
    console.log(`  Queries: ${syncQueries.join(', ')}\n`);
    
    const response = await apiClient.post('/api/kanoon/sync', {
      queries: syncQueries,
      limit: 5,
      autoIndex: true
    });
    
    log.success(response.data.message);
    console.log('\nSync Statistics:');
    console.log(`  • Cases Indexed: ${response.data.statistics.indexed}`);
    console.log(`  • Embeddings Created: ${response.data.statistics.embeddingsIndexed}`);
    console.log(`  • Failed: ${response.data.statistics.failed}`);
    
    if (response.data.errors && response.data.errors.length > 0) {
      log.warn(`${response.data.errors.length} errors occurred (showing first 3):`);
      response.data.errors.slice(0, 3).forEach(err => {
        console.log(`    - ${err.error}`);
      });
    }
    
    return response.data;
  } catch (error) {
    log.error(`Failed to sync cases: ${error.message}`);
    return null;
  }
}

async function step4_CheckStats() {
  log.header('STEP 4: View Database Statistics');
  
  try {
    log.info('Fetching database statistics...');
    const response = await apiClient.get('/api/kanoon/stats');
    
    log.success('Database statistics retrieved');
    console.log('\nDatabase Status:');
    console.log(`  • Total Cases: ${response.data.statistics.totalCasesInDB}`);
    console.log(`  • Kanoon Cases: ${response.data.statistics.kanoonCases}`);
    console.log(`  • Indexed with Embeddings: ${response.data.statistics.embeddingsIndexed}`);
    console.log(`  • Unique IPC Sections: ${response.data.statistics.uniqueIPCSections}`);
    console.log(`  • Population: ${response.data.statistics.populationPercentage}`);
    
    return response.data;
  } catch (error) {
    log.error(`Failed to fetch stats: ${error.message}`);
    return null;
  }
}

async function runQuickStart() {
  console.clear();
  log.header('Indian Kanoon Integration - Quick Start');
  
  log.info('This script demonstrates the Kanoon API integration\n');
  
  // Step 1: Get recommendations
  let queries = await step1_GetRecommendedQueries();
  if (!queries) return;
  
  // Small delay
  await new Promise(r => setTimeout(r, 2000));
  
  // Step 2: Search without syncing
  let searchResults = await step2_SearchCases(queries[0]);
  if (!searchResults) return;
  
  // Small delay
  await new Promise(r => setTimeout(r, 2000));
  
  // Step 3: Sync cases
  let syncResults = await step3_SyncCases(queries);
  if (!syncResults) return;
  
  // Small delay
  await new Promise(r => setTimeout(r, 2000));
  
  // Step 4: Check stats
  let stats = await step4_CheckStats();
  
  // Final instructions
  log.header('Next Steps');
  console.log(`
✅ Setup Complete! Your legal database is now populated with Indian Kanoon cases.

📌 Next Actions:

1. Test RAG Case Analysis:
   POST /api/rag/analyze/{caseId}
   
2. Update Embeddings Anytime:
   POST /api/kanoon/reindex
   
3. Fetch Specific Case:
   POST /api/kanoon/fetch-single
   with caseUrl: "https://indiankanoon.org/doc/..."

4. Keep Database Fresh:
   Periodically sync new cases
   POST /api/kanoon/sync with latest queries

📚 Documentation: See KANOON_INTEGRATION.md

🚀 Your RAG system now has ${stats?.statistics?.embeddingsIndexed} cases indexed!
  `);
}

// Run the script
runQuickStart().catch(err => {
  log.error(`Unexpected error: ${err.message}`);
  process.exit(1);
});
