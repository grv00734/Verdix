#!/usr/bin/env node
/**
 * RAG Model CLI Tester
 * Tests case search and analysis with RAG system
 */

require('dotenv').config();
const mongoose = require('mongoose');
const readline = require('readline');
const { analyzeWithRAG } = require('./src/services/ragService');
const { getVectorStore } = require('./src/services/vectorStoreService');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    green: '\x1b[32m',
    blue: '\x1b[34m',
    yellow: '\x1b[33m',
    cyan: '\x1b[36m',
    red: '\x1b[31m'
};

const printHeader = () => {
    console.log(colors.bright + colors.blue);
    console.log('╔═══════════════════════════════════════════════════════╗');
    console.log('║         VERDIX RAG MODEL - CLI TESTER                ║');
    console.log('║         Legal Case Analysis & Search                  ║');
    console.log('╚═══════════════════════════════════════════════════════╝');
    console.log(colors.reset);
};

const printMenu = () => {
    console.log('\n' + colors.cyan + 'Available Commands:' + colors.reset);
    console.log('  1. ' + colors.green + 'search' + colors.reset + '  - Search for similar cases');
    console.log('  2. ' + colors.green + 'analyze' + colors.reset + ' - Analyze a case with RAG');
    console.log('  3. ' + colors.green + 'stats' + colors.reset + '   - View RAG statistics');
    console.log('  4. ' + colors.green + 'exit' + colors.reset + '    - Exit the tester\n');
};

const question = (query) => {
    return new Promise((resolve) => rl.question(query, resolve));
};

// Search for similar cases
const searchCases = async () => {
    try {
        const query = await question(colors.yellow + '\nEnter search query (e.g., "theft case involving gold jewelry"): ' + colors.reset);

        console.log(colors.cyan + '\n🔍 Searching for similar cases...\n' + colors.reset);

        const vectorStore = await getVectorStore();
        const results = await vectorStore.searchSimilarCases(query, 5);

        if (results.length === 0) {
            console.log(colors.red + '❌ No similar cases found.' + colors.reset);
            return;
        }

        console.log(colors.green + `✅ Found ${results.length} similar cases:\n` + colors.reset);

        results.forEach((result, idx) => {
            console.log(colors.bright + `${idx + 1}. Case: ${result.caseNumber}` + colors.reset);
            console.log(`   Title: ${result.title}`);
            console.log(`   Year: ${result.year || 'N/A'}`);
            console.log(`   Similarity: ${colors.yellow}${(result.similarity * 100).toFixed(2)}%${colors.reset}`);
            console.log(`   Summary: ${result.content?.substring(0, 150)}...`);
            console.log('');
        });
    } catch (error) {
        console.error(colors.red + '❌ Search error:', error.message + colors.reset);
    }
};

// Analyze case with RAG
const analyzeCase = async () => {
    try {
        console.log(colors.yellow + '\n📝 Enter case description (Type will be auto-detected):' + colors.reset);
        const caseDescription = await question('> ');

        console.log(colors.cyan + '\n🤖 Analyzing case with RAG + Grok AI...\n' + colors.reset);
        console.log(colors.blue + '(Auto-classifying type, extracting arguments, and finding lawyers...)\n' + colors.reset);

        // Pass null as caseType to trigger auto-classification
        const result = await analyzeWithRAG(caseDescription, null);

        console.log(colors.green + '✅ Analysis Complete!\n' + colors.reset);

        console.log(colors.bright + '📊 ANALYSIS RESULTS:' + colors.reset);
        console.log('─'.repeat(60));

        console.log(colors.cyan + '\n📂 Case Type (Auto-Detected):' + colors.reset);
        console.log(`   ${colors.bright}${result.caseType}${colors.reset}`);

        console.log(colors.cyan + '\n📋 Suggested IPC Sections:' + colors.reset);
        result.analysis.suggestedIPCs.forEach(ipc => {
            console.log(`   • ${ipc}`);
        });

        console.log(colors.cyan + '\n⚖️  Possible Verdict:' + colors.reset);
        console.log(`   ${result.analysis.possibleVerdict}`);

        console.log(colors.cyan + '\n⚠️  Risk Level:' + colors.reset);
        const riskColor = result.analysis.riskLevel === 'High' ? colors.red :
            result.analysis.riskLevel === 'Medium' ? colors.yellow : colors.green;
        console.log(`   ${riskColor}${result.analysis.riskLevel}${colors.reset}`);

        console.log(colors.cyan + '\n🗣️  Key Legal Arguments (from Precedents):' + colors.reset);
        console.log(`   ${result.analysis.keyArguments}`);

        console.log(colors.cyan + '\n🎯 Confidence:' + colors.reset);
        console.log(`   ${(result.analysis.confidence * 100).toFixed(1)}%`);

        if (result.retrievedCases && result.retrievedCases.length > 0) {
            console.log(colors.cyan + `\n📚 Retrieved ${result.retrievedCases.length} Similar Precedents:` + colors.reset);
            result.retrievedCases.forEach((precedent, idx) => {
                const sourceColor = precedent.source === 'Live Indian Kanoon' ? colors.green : colors.yellow;
                console.log(`   ${idx + 1}. [${sourceColor}${precedent.source || 'Local DB'}${colors.reset}] ${precedent.title} (${precedent.caseNumber})`);
                console.log(`      Verdict: ${precedent.verdict || 'N/A'}`);
                console.log(`      Similarity: ${(precedent.similarity * 100).toFixed(2)}%`);
            });
        }

        if (result.recommendedLawyers && result.recommendedLawyers.length > 0) {
            console.log(colors.cyan + `\n👨‍⚖️ Recommended Lawyers for ${result.caseType}:` + colors.reset);
            result.recommendedLawyers.forEach((lawyer, idx) => {
                console.log(`   ${idx + 1}. ${lawyer.name}`);
                console.log(`      Experience: ${lawyer.experience} | Won: ${lawyer.casesWon} | Rating: ${lawyer.rating}⭐`);
                console.log(`      Specialization: ${lawyer.specialization}`);
            });
        }

        console.log(colors.cyan + '\n💡 Recommended Strategy:' + colors.reset);
        console.log(`   ${result.analysis.recommendations || 'See full analysis'}`);

        console.log(colors.cyan + '\n📝 Full Analysis:' + colors.reset);
        console.log('─'.repeat(60));
        console.log(result.fullResponse);
        console.log('─'.repeat(60));

    } catch (error) {
        console.error(colors.red + '❌ Analysis error:', error.message + colors.reset);
        if (error.response) {
            console.error('API Error:', error.response.data);
        }
    }
};

// Get RAG stats
const getStats = async () => {
    try {
        const CasePrecedent = require('./src/models/CasePrecedent');

        const indexed = await CasePrecedent.countDocuments({ indexed: true });
        const total = await CasePrecedent.countDocuments();
        const percentage = total > 0 ? ((indexed / total) * 100).toFixed(2) : 0;

        console.log(colors.cyan + '\n📊 RAG System Statistics:' + colors.reset);
        console.log('─'.repeat(40));
        console.log(`Total Cases:    ${colors.bright}${total}${colors.reset}`);
        console.log(`Indexed Cases:  ${colors.green}${indexed}${colors.reset}`);
        console.log(`Not Indexed:    ${colors.yellow}${total - indexed}${colors.reset}`);
        console.log(`Index Coverage: ${colors.blue}${percentage}%${colors.reset}`);
        console.log('─'.repeat(40));
    } catch (error) {
        console.error(colors.red + '❌ Stats error:', error.message + colors.reset);
    }
};

// Main interactive loop
const main = async () => {
    try {
        printHeader();

        // Connect to MongoDB
        console.log(colors.cyan + '🔌 Connecting to MongoDB...' + colors.reset);
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/verdix');
        console.log(colors.green + '✅ Connected to database\n' + colors.reset);

        // Initialize vector store
        console.log(colors.cyan + '🚀 Initializing RAG Vector Store...' + colors.reset);
        const vectorStore = await getVectorStore();
        console.log(colors.green + '✅ RAG system ready!\n' + colors.reset);

        let running = true;

        while (running) {
            printMenu();
            const command = (await question(colors.bright + '> Enter command: ' + colors.reset)).toLowerCase().trim();

            switch (command) {
                case '1':
                case 'search':
                    await searchCases();
                    break;

                case '2':
                case 'analyze':
                    await analyzeCase();
                    break;

                case '3':
                case 'stats':
                    await getStats();
                    break;

                case '4':
                case 'exit':
                case 'quit':
                    running = false;
                    console.log(colors.green + '\n👋 Goodbye!\n' + colors.reset);
                    break;

                default:
                    console.log(colors.red + '❌ Unknown command. Please try again.' + colors.reset);
            }
        }

    } catch (error) {
        console.error(colors.red + '\n❌ Fatal error:', error.message + colors.reset);
    } finally {
        await mongoose.disconnect();
        rl.close();
        process.exit(0);
    }
};

// Run the CLI
main();
