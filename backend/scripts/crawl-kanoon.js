#!/usr/bin/env node
/**
 * crawl-kanoon.js — CLI ingestion tool
 * -----------------------------------------------------------------------------
 * Crawls judgments from indiankanoon.org, stores them in MongoDB, and
 * (optionally) builds vector embeddings for RAG retrieval.
 *
 * Usage:
 *   node scripts/crawl-kanoon.js                       # crawl the default seed queries
 *   node scripts/crawl-kanoon.js "Section 302 IPC"     # crawl a single custom query
 *   node scripts/crawl-kanoon.js --limit 8 "bail" "dowry death"
 *   node scripts/crawl-kanoon.js --no-embed            # skip embedding generation
 *
 * Flags:
 *   --limit <n>   documents to fetch per query        (default 5)
 *   --no-embed    persist cases but skip vector embeddings
 *
 * Env: MONGODB_URI, KANOON_CRAWL_DELAY_MS, XAI_API_KEY (for embeddings).
 */

require('dotenv').config();
const mongoose = require('mongoose');
const kanoonService = require('../src/services/kanoonService');

function parseArgs(argv) {
  const opts = { limit: 5, embed: true, queries: [] };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--limit') {
      opts.limit = parseInt(argv[++i], 10) || opts.limit;
    } else if (arg === '--no-embed') {
      opts.embed = false;
    } else if (arg.startsWith('--')) {
      console.warn(`Ignoring unknown flag: ${arg}`);
    } else {
      opts.queries.push(arg);
    }
  }
  if (opts.queries.length === 0) {
    opts.queries = kanoonService.constructor.getPopularQueries();
  }
  return opts;
}

async function main() {
  const { limit, embed, queries } = parseArgs(process.argv.slice(2));

  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/verdix';
  console.log(`\n⚖️  Verdix · Indian Kanoon crawler`);
  console.log(`   queries : ${queries.length}`);
  console.log(`   limit   : ${limit} docs/query`);
  console.log(`   embed   : ${embed ? 'yes' : 'no'}`);
  console.log(`   delay   : ${process.env.KANOON_CRAWL_DELAY_MS || 2500}ms between requests\n`);

  await mongoose.connect(uri);
  console.log('✓ MongoDB connected\n');

  const started = Date.now();
  const result = await kanoonService.fetchAndIndexCases(queries, limit);

  console.log('\n──────────── Crawl summary ────────────');
  console.log(`  queries searched : ${result.stats.searchedQueries}`);
  console.log(`  documents found  : ${result.stats.casesFound}`);
  console.log(`  documents fetched: ${result.stats.casesFetched}`);
  console.log(`  cases saved      : ${result.stats.casesSaved}`);
  console.log(`  errors           : ${result.stats.errors}`);

  // Optionally build embeddings for the freshly crawled cases.
  if (embed && result.cases.length > 0) {
    if (!process.env.XAI_API_KEY) {
      console.log('\n⚠ XAI_API_KEY not set — skipping embeddings (cases were still saved).');
    } else {
      const { getVectorStore } = require('../src/services/vectorStoreService');
      const vectorStore = await getVectorStore();
      let embedded = 0;
      console.log(`\nGenerating embeddings for ${result.cases.length} cases...`);
      for (const c of result.cases) {
        try {
          await vectorStore.indexCase(c);
          embedded++;
        } catch (e) {
          console.error(`  ✗ embed ${c.caseNumber}: ${e.message}`);
        }
      }
      console.log(`✓ Embedded ${embedded}/${result.cases.length} cases`);
    }
  }

  console.log(`\n✓ Done in ${((Date.now() - started) / 1000).toFixed(1)}s`);
  await mongoose.disconnect();
  process.exit(0);
}

main().catch(async (err) => {
  console.error(`\n❌ Crawl failed: ${err.message}`);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
