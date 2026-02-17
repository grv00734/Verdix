const { analyzeWithRAG } = require('./src/services/ragService');
const mongoose = require('mongoose');
const fs = require('fs');
require('dotenv').config();

const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    green: '\x1b[32m',
    blue: '\x1b[34m',
    yellow: '\x1b[33m',
    cyan: '\x1b[36m',
    red: '\x1b[31m'
};

const scenarios = [
    "My tenant has stopped paying rent for 5 months and refuses to vacate my apartment in Mumbai.",
    "I found unauthorized transactions on my credit card amounting to 50k rupees.",
    "My business partner secretly started a competing company and stole our client database.",
    "My neighbor built a wall blocking the access road to my ancestral farm land."
];

const randomPrompt = "My client's face was used in a deepfake video to promote a betting app. We want to file for defamation and IT Act violations.";
const outputFile = 'rag_output.txt';

const log = (msg) => {
    console.log(msg);
    // Strip ANSI codes for file output
    const cleanMsg = typeof msg === 'string' ? msg.replace(/\x1b\[[0-9;]*m/g, '') : JSON.stringify(msg);
    fs.appendFileSync(outputFile, cleanMsg + '\n');
};

const runTest = async () => {
    try {
        fs.writeFileSync(outputFile, `--- RAG Test Started at ${new Date().toISOString()} ---\n`);

        log(colors.cyan + '🔌 Connecting to DB...' + colors.reset);

        const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/verdix';
        log('Connecting to: ' + uri.split('@')[1]); // Log host only for safety
        await mongoose.connect(uri);

        log(colors.yellow + '\n🎲 Random Prompt Selected:' + colors.reset);
        log(colors.bright + `"${randomPrompt}"` + colors.reset);

        log(colors.blue + '\n🤖 Running RAG Analysis (Auto-Classify + Argument Extraction)...' + colors.reset);

        const result = await analyzeWithRAG(randomPrompt);

        log(colors.green + '\n✅ Analysis Complete!' + colors.reset);
        log('─'.repeat(50));

        if (result.caseType) {
            log(colors.cyan + '📂 Auto-Detected Type: ' + colors.bright + result.caseType + colors.reset);
        }

        if (result.analysis && result.analysis.suggestedIPCs) {
            log(colors.cyan + '\n📋 IPC Sections:' + colors.reset);
            result.analysis.suggestedIPCs.forEach(ipc => log(`   • ${ipc}`));
        }

        if (result.analysis && result.analysis.keyArguments) {
            log(colors.cyan + '\n🗣️  Key Legal Arguments (from Precedents):' + colors.reset);
            log(colors.yellow + result.analysis.keyArguments + colors.reset);
        }

        if (result.recommendedLawyers && result.recommendedLawyers.length > 0) {
            log(colors.cyan + `\n👨‍⚖️ Top Recommmended Lawyer:` + colors.reset);
            const lawyer = result.recommendedLawyers[0];
            log(`   ${lawyer.name} (${lawyer.specialization}) - Rating: ${lawyer.rating}⭐`);
        } else {
            log(colors.cyan + `\n👨‍⚖️ Recommended Lawyers:` + colors.reset);
            log('   No specific lawyers found for this category (using general matching).');
        }

        log(colors.cyan + '\n💡 Strategy:' + colors.reset);
        log(result.analysis.recommendations || 'See full analysis');

        log('─'.repeat(50));
        console.log("RAG_TEST_COMPLETE");

    } catch (error) {
        log('❌ Error: ' + error.message);
        if (error.response) log('API Error: ' + JSON.stringify(error.response.data));
        console.error(error);
    } finally {
        await mongoose.disconnect();
        process.exit(0);
    }
};

runTest();
