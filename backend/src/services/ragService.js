const axios = require('axios');
const { getVectorStore } = require('./vectorStoreService');
const kanoonService = require('./kanoonService');
const Lawyer = require('../models/Lawyer');

const XAI_BASE_URL = 'https://api.x.ai/v1';

/**
 * Call Grok LLM via xAI's OpenAI-compatible API
 */
const callGrokLLM = async (prompt, systemPrompt = '') => {
  if (!process.env.XAI_API_KEY) {
    throw new Error('XAI_API_KEY is not set. RAG features are disabled.');
  }

  const messages = [];
  if (systemPrompt) {
    messages.push({ role: 'system', content: systemPrompt });
  }
  messages.push({ role: 'user', content: prompt });

  const response = await axios.post(`${XAI_BASE_URL}/chat/completions`, {
    model: process.env.GROK_MODEL || 'grok-3-mini',
    messages,
    temperature: 0.2, // Low temperature for factual consistency
    max_tokens: 2500
  }, {
    headers: {
      'Authorization': `Bearer ${process.env.XAI_API_KEY}`,
      'Content-Type': 'application/json'
    },
    timeout: 60000
  });

  return response.data.choices[0].message.content;
};

// Enhanced Legal system prompt 
const LEGAL_SYSTEM_PROMPT = `You are an expert Indian legal advisor specializing in IPC, CrPC, and case law.
Your task is to analyze legal cases and provide:
1. Accurate IPC/Section identification.
2. key legal arguments used in similar precedents.
3. Strategic advice for the lawyer/client.

Always cite relevant case law. Be precise, factual, and professional.`;

// 1. Auto-Classify Case Type
const classifyCaseType = async (description) => {
  try {
    const prompt = `Analyze the following case description and classify it into exactly ONE of these categories: 
    [Criminal, Civil, Corporate, Family, Property, Intellectual Property, Labour, Constitutional, Consumer, Cyber Law].
    
    Case Description: "${description}"
    
    Return ONLY the category name. Do not explain.`;

    const category = await callGrokLLM(prompt, "You are a legal classifier. Output only the category name.");
    return category.trim().replace(/['".]/g, '');
  } catch (error) {
    console.error("Classification failed:", error.message);
    return "General"; // Fallback
  }
};

// 2. Generate Optimized Search Queries
const generateSearchQueries = async (description) => {
  try {
    const prompt = `Generate 2 specific search queries for the Indian Kanoon legal database based on this case description.
    Focus on key legal terms, IPC sections, and relevant acts.
    
    Case Description: "${description}"
    
    Return ONLY the 2 queries separated by a pipe character (|). Example: "Section 302 IPC murder precedent | culpable homicide not amounting to murder"`;

    const response = await callGrokLLM(prompt, "You are a legal search expert.");
    return response.split('|').map(q => q.trim()).filter(q => q.length > 5).slice(0, 2);
  } catch (error) {
    console.error("Query generation failed:", error.message);
    return [description.substring(0, 100)]; // Fallback
  }
};

// 2. Find Best Lawyers
const findBestLawyers = async (caseType) => {
  try {
    // Map broader categories if needed, or rely on exact match
    // Query: logic matches specialization OR defaults to high rated lawyers if specific type not found
    let lawyers = await Lawyer.find({
      specializations: { $in: [caseType] },
      verificationStatus: 'verified'
    })
      .sort({ rating: -1, caseWon: -1 })
      .limit(3)
      .populate('userId', 'name email');

    // Fallback if no specialists found
    if (lawyers.length === 0) {
      lawyers = await Lawyer.find({ verificationStatus: 'verified' })
        .sort({ rating: -1, caseWon: -1 })
        .limit(3)
        .populate('userId', 'name email');
    }

    return lawyers.map(l => ({
      id: l._id,
      name: l.userId?.name || 'Verdix Verified Lawyer',
      specialization: l.specializations.join(', '),
      experience: `${l.experience} years`,
      rating: l.rating,
      casesWon: l.caseWon,
      image: l.profileImage || null // Assuming profileImage exists or handle frontend default
    }));
  } catch (error) {
    console.warn("Lawyer matching failed:", error.message);
    return [];
  }
};

// Create augmented prompt with retrieved context
const createAugmentedPrompt = (caseDescription, caseType, retrievedCases) => {
  let contextSection = '';

  if (retrievedCases && retrievedCases.length > 0) {
    contextSection = `\n\nSIMILAR PRECEDENT CASES (Analyze these for arguments):\n`;
    retrievedCases.forEach((case_, idx) => {
      contextSection += `\n${idx + 1}. Case: ${case_.caseNumber || case_.title}\n`;
      contextSection += `   Title: ${case_.title}\n`;
      contextSection += `   Source: ${case_.source || 'Local Database'}\n`;
      contextSection += `   Summary: ${case_.content || case_.summary}\n`;
      contextSection += `   Verdict: ${case_.verdict || case_.decision || 'Not specified'}\n`;
    });
  }

  return `CASE TYPE: ${caseType}

USER'S CASE DETAILS:
${caseDescription}
${contextSection}

REQUIRED STRUCTURAL ANALYSIS:
1. **Applicable IPC Sections**: List specific sections with brief reasoning.
2. **Key Legal Arguments**: Extract potential arguments for both prosecution/plaintiff and defense based on the precedents.
3. **Strategic Roadmap**: Recommended legal steps.
4. **Risk Assessment**: (High/Medium/Low) with justification.
5. **Verdict Prediction**: Based on precedents.

Provide a comprehensive legal analysis.`;
};

// Main RAG analysis function
const analyzeWithRAG = async (caseDescription, caseType = null) => {
  try {
    console.log('Starting RAG analysis with Grok...');

    // Step 0: Auto-Classify
    let finalCaseType = caseType;
    if (!finalCaseType || finalCaseType === 'General') {
      console.log('Auto-detecting case type...');
      finalCaseType = await classifyCaseType(caseDescription);
      console.log(`Detected Case Type: ${finalCaseType}`);
    }

    // Step 1: Search Local Vector Store
    const vectorStore = await getVectorStore();
    const searchQuery = `${finalCaseType} case: ${caseDescription}`;
    let retrievedCases = [];

    try {
      const localResults = await vectorStore.searchSimilarCases(searchQuery, 3);
      retrievedCases = localResults.map(r => ({ ...r, source: 'Local DB' }));
      console.log(`Retrieved ${localResults.length} local cases`);
    } catch (err) {
      console.warn('Vector search failed (non-critical):', err.message);
    }

    // Step 2: Live Search on Indian Kanoon
    try {
      console.log('Generating live search queries...');
      const liveQueries = await generateSearchQueries(caseDescription);
      console.log(`Live Queries: ${liveQueries.join(' | ')}`);

      if (liveQueries.length > 0) {
        console.log(`Searching Indian Kanoon for: "${liveQueries[0]}"...`);
        const kanoonResults = await kanoonService.searchCases(liveQueries[0], { maxpages: 1 });

        if (kanoonResults.docs && kanoonResults.docs.length > 0) {
          const topLiveDocs = kanoonResults.docs.slice(0, 2).map(doc => ({
            caseId: doc.tid,
            caseNumber: doc.tid.toString(),
            title: doc.title,
            content: doc.headline || doc.title,
            similarity: 0.9,
            source: 'Live Indian Kanoon',
            verdict: 'Refer to full judgment'
          }));

          try {
            const fullDetails = await kanoonService.fetchCaseDetails(topLiveDocs[0].caseId);
            topLiveDocs[0].content = fullDetails.summary || fullDetails.decision.substring(0, 1000);
            topLiveDocs[0].verdict = fullDetails.decision.substring(0, 200) + '...';
          } catch (e) { console.warn('Failed to fetch full details for live case'); }

          retrievedCases = [...retrievedCases, ...topLiveDocs];
          console.log(`Added ${topLiveDocs.length} live cases from Indian Kanoon`);
        }
      }
    } catch (err) {
      console.warn('Live Kanoon search failed:', err.message);
    }

    // Step 3: Create augmented prompt
    const augmentedPrompt = createAugmentedPrompt(
      caseDescription,
      finalCaseType,
      retrievedCases
    );

    // Step 4: Generate response with Grok LLM
    console.log('Generating analysis with Grok LLM...');
    const responseText = await callGrokLLM(augmentedPrompt, LEGAL_SYSTEM_PROMPT);

    // Step 5: Parse response
    const analysis = parseAnalysisResponse(responseText);

    // Step 6: Find Recommended Lawyers
    const recommendedLawyers = await findBestLawyers(finalCaseType);

    return {
      success: true,
      caseType: finalCaseType,
      analysis,
      retrievedCases: retrievedCases.map(rc => ({
        caseId: rc.caseId,
        caseNumber: rc.caseNumber,
        title: rc.title,
        similarity: rc.similarity,
        verdict: rc.verdict,
        source: rc.source || 'Local DB'
      })),
      recommendedLawyers,
      fullResponse: responseText
    };
  } catch (error) {
    console.error('RAG Analysis error:', error.response?.data || error.message);
    throw error;
  }
};

// Parse LLM response into structured format
const parseAnalysisResponse = (response) => {
  try {
    // Extract IPC sections
    const ipcPattern = /(?:IPC\s+)?(?:Section|Sec\.?)\s+(\d+[A-Z]?)/gi;
    const ipcMatches = [];
    let match;
    while ((match = ipcPattern.exec(response)) !== null) {
      ipcMatches.push(`IPC Section ${match[1]}`);
    }
    const suggestedIPCs = [...new Set(ipcMatches)];

    // Extract verdict prediction
    const verdictMatch = response.match(/(?:Verdict|Outcome)[:\s]+([\s\S]*?)(?=\n\n|\n[A-Z]|$)/i);
    const possibleVerdict = verdictMatch ? verdictMatch[1].trim().split('\n')[0] : 'Analysis required';

    // Extract risk assessment
    const riskMatch = response.match(/Risk\s+Assessment[:\s]+(\w+)(?:\s*\/\s*\w+)?/i);
    const riskLevel = riskMatch ? riskMatch[1] : 'Medium';

    // Extract Key Arguments (New)
    const argsMatch = response.match(/(?:Key\s+Legal\s+Arguments|Arguments)[:\s]+([\s\S]*?)(?=\n\n|\n[A-Z]|$)/i);
    const keyArguments = argsMatch ? argsMatch[1].trim() : 'Refer to detailed analysis.';

    // Extract recommendations
    const recMatch = response.match(/(?:Strategic\s+Roadmap|Recommended\s+Steps|Actions)[:\s]+([\s\S]*?)(?=\n\n|\n[A-Z]|$)/i);
    const recommendations = recMatch ? recMatch[1].trim() : '';

    return {
      suggestedIPCs: suggestedIPCs.length > 0 ? suggestedIPCs : ['Analysis required'],
      summary: response.substring(0, 500),
      analysis: response,
      keyArguments,
      possibleVerdict,
      riskLevel,
      recommendations,
      confidence: suggestedIPCs.length > 0 ? 0.90 : 0.60,
      analyzedAt: new Date()
    };
  } catch (error) {
    console.error('Parse error:', error);
    return {
      suggestedIPCs: [],
      summary: response,
      analysis: response,
      keyArguments: '',
      possibleVerdict: 'Analysis required',
      riskLevel: 'Medium',
      recommendations: '',
      confidence: 0.5,
      analyzedAt: new Date()
    };
  }
};

// Compare cases
const compareWithPrecedents = async (currentCase, precedentCases) => {
  try {
    const prompt = `Compare the following current case with precedent cases and identify key similarities and differences:

CURRENT CASE:
Title: ${currentCase.title}
Description: ${currentCase.description}
Type: ${currentCase.caseType}

PRECEDENT CASES:
${precedentCases.map((pc, idx) =>
      `${idx + 1}. ${pc.title} (${pc.year}) - ${pc.verdict}`
    ).join('\n')}

Provide detailed comparison highlighting:
1. Key similarities
2. Important differences
3. Impact on current case
4. Applicable precedents`;

    return await callGrokLLM(prompt, LEGAL_SYSTEM_PROMPT);
  } catch (error) {
    console.error('Comparison error:', error.response?.data || error.message);
    throw error;
  }
};

// Get legal insights from context
const getLegalInsights = async (context) => {
  try {
    const prompt = `Based on the following legal context, provide key insights and recommendations:

${context}

Provide:
1. Key legal issues
2. Applicable laws
3. Risk assessment
4. Recommended actions`;

    return await callGrokLLM(prompt, LEGAL_SYSTEM_PROMPT);
  } catch (error) {
    console.error('Insights error:', error.response?.data || error.message);
    throw error;
  }
};

module.exports = {
  analyzeWithRAG,
  parseAnalysisResponse,
  compareWithPrecedents,
  getLegalInsights,
  createAugmentedPrompt,
  classifyCaseType,
  findBestLawyers
};
