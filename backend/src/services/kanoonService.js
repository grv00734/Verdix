const axios = require('axios');
const CasePrecedent = require('../models/CasePrecedent');

/**
 * Service for Official Indian Kanoon API Integration
 * 
 * Official API Documentation: https://api.indiankanoon.org
 * This service uses the official Indian Kanoon API with Token-based authentication.
 * 
 * Benefits of Official API:
 * - Proper API endpoints vs web scraping
 * - JSON/XML structured responses
 * - Official support and reliability
 * - Token-based authentication
 * - Pagination support
 * - Advanced filtering (doctypes, dates, authors, etc.)
 */

const KANOON_API_BASE_URL = 'https://api.indiankanoon.org';

class KanoonService {
  constructor() {
    this.apiToken = process.env.KANOON_API_TOKEN;
    this.rateLimitDelay = 1000; // API best practice: 1 second between requests
    this.maxRetries = 3;
    this.timeout = 30000;
    this.acceptHeader = 'application/json'; // Request JSON format
  }

  /**
   * Verify API token is configured
   */
  validateConfiguration() {
    if (!this.apiToken) {
      throw new Error([
        'KANOON_API_TOKEN not configured!',
        '',
        'Get your API token from: https://indiankanoon.org',
        'Steps:',
        '1. Visit https://indiankanoon.org/login/',
        '2. Login or create account',
        '3. Go to API settings/profile',
        '4. Generate and copy your API token',
        '5. Add to .env: KANOON_API_TOKEN=your_token_here',
        '',
        'Documentation: https://api.indiankanoon.org'
      ].join('\n'));
    }
  }

  /**
   * Get authorization headers with API token
   */
  getAuthHeaders() {
    return {
      'Authorization': `Token ${this.apiToken}`,
      'Accept': this.acceptHeader,
      'User-Agent': 'Verdix-Legal-Platform/1.0'
    };
  }

  /**
   * Search for cases using official Kanoon API
   * 
   * @param {string} query - Search query (e.g., "murder OR rape", "Section 302 IPC")
   * @param {Object} options - Additional options
   * @param {number} options.pagenum - Page number (starts at 0)
   * @param {number} options.maxpages - Max pages to fetch
   * @param {string} options.doctypes - Filter by court types (supremecourt, bombay, delhi, etc.)
   * @param {string} options.fromdate - Filter from date (DD-MM-YYYY)
   * @param {string} options.todate - Filter to date (DD-MM-YYYY)
   * @param {string} options.title - Search in title only
   * @param {string} options.cite - Filter by citation
   * @param {string} options.author - Filter by judge author
   * @param {number} options.maxcites - Max citations to include (1-50)
   * @returns {Promise<Object>} Search results
   */
  async searchCases(query, options = {}) {
    try {
      this.validateConfiguration();

      const pagenum = options.pagenum || 0;
      const maxpages = options.maxpages || 1;

      console.log(`[Kanoon API] Searching for: "${query}" (page ${pagenum})`);

      // Build query parameters
      const params = {
        formInput: query,
        pagenum: pagenum,
        maxpages: maxpages
      };

      // Add optional filters
      if (options.doctypes) params.doctypes = options.doctypes;
      if (options.fromdate) params.fromdate = options.fromdate;
      if (options.todate) params.todate = options.todate;
      if (options.title) params.title = options.title;
      if (options.cite) params.cite = options.cite;
      if (options.author) params.author = options.author;
      if (options.maxcites) params.maxcites = Math.min(options.maxcites, 50);

      // Call official API endpoint (Kanoon API requires POST with form data)
      const url = `${KANOON_API_BASE_URL}/search/`;
      const formData = new URLSearchParams(params).toString();
      const response = await axios.post(url, formData, {
        headers: {
          ...this.getAuthHeaders(),
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        timeout: this.timeout
      });

      if (response.status === 200 && response.data) {
        const searchResults = {
          success: true,
          query: query,
          found: response.data.found || 0,
          pagenum: response.data.pagenum || 0,
          docs: this._parseSearchDocs(response.data.docs || []),
          categories: response.data.categories || [],
          totalDocuments: response.data.found || 0
        };

        console.log(`[Kanoon API] Found ${searchResults.found} results`);
        return searchResults;
      }

      throw new Error('Invalid response from Kanoon API');
    } catch (error) {
      console.error(`[Kanoon API] Search error:`, error.message);

      if (error.response?.status === 403) {
        throw new Error('Kanoon API: Authentication failed. Check your API token.');
      }

      throw new Error(`Failed to search Kanoon API: ${error.message}`);
    }
  }

  /**
   * Parse search documents from API response
   * @private
   */
  _parseSearchDocs(docs) {
    return docs.map(doc => ({
      tid: doc.tid || doc.id,
      title: doc.title || 'Unknown',
      docsource: doc.docsource || doc.court || 'Unknown Court',
      headline: doc.headline || doc.snippet || '',
      docsize: doc.docsize || 0,
      date: doc.date || null,
      casetype: doc.casetype || 'Unknown',
      doctype: doc.doctype || 'judgment'
    }));
  }

  /**
   * Fetch detailed case information using official API
   * 
   * @param {string} docid - Document ID (can be numeric ID or case URL)
   * @param {Object} options - Additional options
   * @param {number} options.maxcites - Max citations to fetch (1-50)
   * @param {number} options.maxcitedby - Max cited-by documents (1-50)
   * @returns {Promise<Object>} Detailed case data
   */
  async fetchCaseDetails(docid, options = {}) {
    try {
      this.validateConfiguration();

      // Extract numeric ID if URL is provided
      const numericId = this._extractDocId(docid);
      console.log(`[Kanoon API] Fetching case details: ${numericId}`);

      // Build parameters
      const params = {};
      if (options.maxcites) params.maxcites = Math.min(options.maxcites, 50);
      if (options.maxcitedby) params.maxcitedby = Math.min(options.maxcitedby, 50);

      // Call official API endpoint (Kanoon API requires POST)
      const url = `${KANOON_API_BASE_URL}/doc/${numericId}/`;
      const formData = new URLSearchParams(params).toString();
      const response = await axios.post(url, formData, {
        headers: {
          ...this.getAuthHeaders(),
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        timeout: this.timeout
      });

      if (response.status === 200 && response.data) {
        const caseData = this._parseCaseResponse(response.data);
        console.log(`[Kanoon API] ✓ Fetched: ${caseData.title}`);
        return caseData;
      }

      throw new Error('Invalid response from Kanoon API');
    } catch (error) {
      console.error(`[Kanoon API] Fetch error:`, error.message);

      if (error.response?.status === 403) {
        throw new Error('Kanoon API: Authentication failed. Check your API token.');
      }
      if (error.response?.status === 404) {
        throw new Error(`Kanoon API: Document not found: ${docid}`);
      }

      throw error;
    }
  }

  /**
   * Extract numeric document ID from URL or return as-is
   * @private
   */
  _extractDocId(docidOrUrl) {
    if (!docidOrUrl) return null;

    // If it's already numeric, return as-is
    if (/^\d+$/.test(docidOrUrl.toString())) {
      return docidOrUrl;
    }

    // Try to extract from URL: /doc/12345/
    const match = docidOrUrl.match(/\/doc\/(\d+)\//);
    return match ? match[1] : docidOrUrl;
  }

  /**
   * Parse official API response into structured case data
   * @private
   */
  _parseCaseResponse(data) {
    return {
      // Source info
      kanoonUrl: `https://indiankanoon.org/doc/${data.id}/`,
      source: 'IndianKanoon-Official-API',
      sourceId: data.id?.toString(),

      // Document info
      docid: data.id,
      title: data.title || 'Unknown Case',
      caseNumber: data.caseid || data.caseNumber || 'N/A',
      year: this._extractYear(data),
      court: data.court_name || data.court || 'Unknown Court',
      doctype: data.doctype || 'judgment',

      // Parties & judges
      judges: this._extractJudges(data),
      parties: this._extractParties(data),

      // Legal content
      ipcSections: this._extractIPCSections(data),
      keywords: this._extractKeywords(data),
      acts: data.acts || [], // Statutory references

      // Case content
      facts: data.facts || '',
      decision: data.judgment || data.decision || '',
      summary: data.summary || data.judgment?.substring(0, 500) || '',
      headnotes: data.headnotes || [],

      // Citations
      cites: data.citeList || [],
      citedBy: data.citedbyList || [],

      // Metadata
      date: data.date || data.judgement_date || null,
      bench: data.bench_name || null,
      ruling: data.ruling || null,

      // API metadata
      fetchedAt: new Date()
    };
  }

  /**
   * Extract year from various possible date formats
   * @private
   */
  _extractYear(data) {
    if (data.year) return parseInt(data.year);
    if (data.date) {
      const match = data.date.match(/(\d{4})/);
      return match ? parseInt(match[1]) : new Date().getFullYear();
    }
    if (data.caseid) {
      const match = data.caseid.match(/(\d{4})/);
      return match ? parseInt(match[1]) : new Date().getFullYear();
    }
    return new Date().getFullYear();
  }

  /**
   * Extract judges from API response
   * @private
   */
  _extractJudges(data) {
    if (data.judges && Array.isArray(data.judges)) {
      return data.judges.map(j => j.name || j).filter(Boolean);
    }
    if (data.judge_name) {
      return [data.judge_name];
    }
    if (data.bench_name) {
      return [data.bench_name];
    }
    return [];
  }

  /**
   * Extract party names
   * @private
   */
  _extractParties(data) {
    const parties = { plaintiff: null, defendant: null };

    if (data.parties && Array.isArray(data.parties) && data.parties.length >= 2) {
      parties.plaintiff = data.parties[0].name || data.parties[0];
      parties.defendant = data.parties[1].name || data.parties[1];
    } else if (data.appellant) {
      parties.plaintiff = data.appellant;
      parties.defendant = data.respondent || data.appellee;
    }

    return parties;
  }

  /**
   * Extract IPC sections from document
   * @private
   */
  _extractIPCSections(data) {
    const sections = new Set();

    // Method 1: Direct IPC sections array
    if (data.ipc_sections && Array.isArray(data.ipc_sections)) {
      data.ipc_sections.forEach(s => {
        if (typeof s === 'string') {
          sections.add(s);
        } else if (s.section) {
          sections.add(s.section);
        }
      });
    }

    // Method 2: Parse from text content
    const textToSearch = [
      data.title || '',
      data.judgment || '',
      data.facts || '',
      data.summary || ''
    ].join(' ');

    // Match patterns like "Section 302", "S. 307", "IPC 420"
    const patterns = [
      /Section\s+(\d+[A-Z]?)\s+(?:IPC|I\.P\.C|of the IPC)/gi,
      /S\.\s+(\d+[A-Z]?)\s+(?:IPC|I\.P\.C)/gi,
      /IPC\s+Section\s+(\d+[A-Z]?)/gi,
      /Article\s+(\d+)/gi
    ];

    for (const pattern of patterns) {
      let match;
      while ((match = pattern.exec(textToSearch)) && sections.size < 20) {
        sections.add(match[1].toString());
      }
    }

    return Array.from(sections).slice(0, 15);
  }

  /**
   * Extract keywords
   * @private
   */
  _extractKeywords(data) {
    const keywords = new Set();

    // Add IPC sections as keywords
    const ipcSections = this._extractIPCSections(data);
    ipcSections.forEach(s => keywords.add(`IPC-${s}`));

    // Add case type if available
    if (data.casetype) keywords.add(data.casetype);
    if (data.court) keywords.add(data.court);

    // Add from subject matter
    const commonTerms = ['murder', 'theft', 'rape', 'fraud', 'property', 'inheritance', 'divorce', 'custody', 'contract', 'negligence', 'cruelty', 'defamation', 'harassment'];
    const contentText = [data.title || '', data.summary || ''].join(' ').toLowerCase();

    commonTerms.forEach(term => {
      if (contentText.includes(term)) {
        keywords.add(term);
      }
    });

    return Array.from(keywords).slice(0, 15);
  }

  /**
   * Fetch and index cases from Kanoon API
   * Uses official API to search and fetch cases in bulk
   */
  async fetchAndIndexCases(queries, limit = 5, options = {}) {
    const indexedCases = [];
    const failedCases = [];
    const stats = {
      searchedQueries: 0,
      casesFound: 0,
      casesFetched: 0,
      casesIndexed: 0,
      errors: 0
    };

    for (const query of queries) {
      try {
        console.log(`\n[Kanoon Sync] Processing query: "${query}"`);
        stats.searchedQueries++;

        // Search for cases
        const searchResults = await this.searchCases(query, {
          pagenum: 0,
          maxpages: 1
        });

        if (!searchResults.docs || searchResults.docs.length === 0) {
          console.log(`[Kanoon Sync] ⚠ No results for query: "${query}"`);
          continue;
        }

        stats.casesFound += searchResults.docs.length;

        // Fetch each document (limit to specified amount)
        for (let i = 0; i < Math.min(searchResults.docs.length, limit); i++) {
          const doc = searchResults.docs[i];

          try {
            // Add rate limiting delay
            await new Promise(resolve => setTimeout(resolve, this.rateLimitDelay));

            // Fetch full document
            const caseData = await this.fetchCaseDetails(doc.tid, {
              maxcites: 5,
              maxcitedby: 5
            });

            stats.casesFetched++;

            // Save to database
            const savedCase = await this._saveCaseToDatabase(caseData);
            indexedCases.push(savedCase);
            stats.casesIndexed++;

            console.log(`  ✓ Indexed: ${caseData.title.substring(0, 50)}...`);
          } catch (error) {
            console.error(`  ✗ Failed to fetch document ${doc.tid}:`, error.message);
            failedCases.push({
              query: query,
              docid: doc.tid,
              title: doc.title,
              error: error.message
            });
            stats.errors++;
          }
        }
      } catch (error) {
        console.error(`[Kanoon Sync] ✗ Failed for query "${query}":`, error.message);
        failedCases.push({
          query: query,
          error: error.message
        });
        stats.errors++;
      }
    }

    return {
      success: indexedCases.length > 0,
      stats: stats,
      indexed: indexedCases.length,
      failed: failedCases.length,
      cases: indexedCases,
      errors: failedCases
    };
  }

  /**
   * Save case data to MongoDB
   * @private
   */
  async _saveCaseToDatabase(caseData) {
    try {
      // Check if case already exists
      const existingCase = await CasePrecedent.findOne({
        $or: [
          { sourceId: caseData.sourceId },
          { kanoonUrl: caseData.kanoonUrl }
        ]
      });

      if (existingCase) {
        console.log(`    [Already indexed: ${caseData.caseNumber}]`);
        return existingCase;
      }

      // Create new case record
      const newCase = new CasePrecedent({
        ...caseData,
        year: caseData.year || new Date().getFullYear()
      });

      const savedCase = await newCase.save();
      console.log(`    [Saved to DB]`);
      return savedCase;
    } catch (error) {
      console.error('Error saving case to database:', error.message);
      throw error;
    }
  }

  /**
   * Get recommended search queries based on popular IPC sections
   */
  static getPopularQueries() {
    return [
      // Criminal law - High frequency
      'Section 302 IPC',
      'Section 307 IPC',
      'Section 376 IPC',
      'Section 498A IPC',
      'Section 420 IPC',
      'Section 379 IPC',
      'Section 304B IPC',
      'Section 506 IPC',
      'Section 294 IPC',
      'Section 377 IPC',

      // Civil/Family law
      'divorce',
      'custody children',
      'inheritance property',
      'contract disputes',
      'property disputes',

      // Special topics
      'domestic violence',
      'dowry system',
      'harassment stalking',
      'cybercrime',
      'defamation case',
      'criminal intimidation',
      'death by negligence',
      'mischief by fire'
    ];
  }
}

module.exports = new KanoonService();
