const axios = require('axios');
const cheerio = require('cheerio');
const CasePrecedent = require('../models/CasePrecedent');

/**
 * Indian Kanoon Crawler
 * -----------------------------------------------------------------------------
 * Extracts judgments and statute text directly from the public Indian Kanoon
 * website (https://indiankanoon.org) using polite HTML crawling instead of the
 * paid token-based API.
 *
 * Design goals (production / "industrial" grade):
 *   - Polite by default: enforced minimum delay between every HTTP request,
 *     a descriptive User-Agent, and bounded concurrency (sequential fetches).
 *   - Resilient: retries with exponential backoff on transient/HTTP 429/5xx,
 *     multiple fallback selectors so a minor markup change does not break us.
 *   - Self-contained: no API key required. Configuration is via env vars with
 *     sensible defaults (see backend/.env.example).
 *
 * NOTE ON RESPONSIBLE USE: Crawl gently. Keep KANOON_CRAWL_DELAY_MS high enough
 * to avoid load on the source, respect their terms of use, and cache results in
 * MongoDB so each document is only fetched once.
 */

const BASE_URL = 'https://indiankanoon.org';

class KanoonCrawler {
  constructor() {
    this.baseUrl = BASE_URL;
    this.rateLimitDelay = Number(process.env.KANOON_CRAWL_DELAY_MS || 2500);
    this.maxRetries = Number(process.env.KANOON_MAX_RETRIES || 3);
    this.timeout = Number(process.env.KANOON_TIMEOUT_MS || 30000);
    this.userAgent =
      process.env.KANOON_USER_AGENT ||
      'Mozilla/5.0 (compatible; VerdixLegalBot/1.0; +https://verdix.example/about/bot)';
    this._lastRequestAt = 0;
  }

  /* --------------------------------------------------------------------- */
  /*  Low-level HTTP                                                        */
  /* --------------------------------------------------------------------- */

  /**
   * Sleep helper.
   * @private
   */
  _sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Enforce a minimum gap between outbound requests so we never hammer the
   * source site, regardless of how callers schedule work.
   * @private
   */
  async _throttle() {
    const elapsed = Date.now() - this._lastRequestAt;
    if (elapsed < this.rateLimitDelay) {
      await this._sleep(this.rateLimitDelay - elapsed);
    }
    this._lastRequestAt = Date.now();
  }

  /**
   * Perform a throttled GET with retry + exponential backoff.
   * Returns the raw HTML string.
   * @private
   */
  async _get(url, { params } = {}) {
    let lastError;

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      await this._throttle();

      try {
        const response = await axios.get(url, {
          params,
          timeout: this.timeout,
          // Treat 4xx as resolved so we can inspect status without throwing.
          validateStatus: (s) => s < 500,
          headers: {
            'User-Agent': this.userAgent,
            Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9',
            Referer: `${this.baseUrl}/`
          }
        });

        if (response.status === 200) {
          return response.data;
        }

        if (response.status === 404) {
          throw new Error(`Document not found (HTTP 404): ${url}`);
        }

        // 429 / 403 / other 4xx -> back off and retry; the site may be
        // rate-limiting us or temporarily blocking the crawler.
        lastError = new Error(`Kanoon returned HTTP ${response.status} for ${url}`);
      } catch (error) {
        if (error.message && error.message.includes('HTTP 404')) {
          throw error; // not retryable
        }
        // Network / timeout / 5xx — retryable.
        lastError = error;
      }

      if (attempt < this.maxRetries) {
        const backoff = this.rateLimitDelay * Math.pow(2, attempt - 1);
        console.warn(
          `[Kanoon Crawler] Attempt ${attempt}/${this.maxRetries} failed for ${url} — retrying in ${backoff}ms (${lastError.message})`
        );
        await this._sleep(backoff);
      }
    }

    throw new Error(`Failed to fetch ${url} after ${this.maxRetries} attempts: ${lastError.message}`);
  }

  /* --------------------------------------------------------------------- */
  /*  Search                                                               */
  /* --------------------------------------------------------------------- */

  /**
   * Crawl the Indian Kanoon search results page for a query.
   *
   * @param {string} query - free-text query, e.g. "Section 302 IPC murder"
   * @param {Object} [options]
   * @param {number} [options.pagenum=0]   - results page (0-indexed)
   * @param {string} [options.doctypes]    - court filter (e.g. "supremecourt")
   * @param {string} [options.fromdate]    - DD-MM-YYYY
   * @param {string} [options.todate]      - DD-MM-YYYY
   * @returns {Promise<{success:boolean, query:string, found:number, docs:Array}>}
   */
  async searchCases(query, options = {}) {
    if (!query || !query.trim()) {
      throw new Error('searchCases requires a non-empty query string');
    }

    const params = { formInput: query, pagenum: options.pagenum || 0 };
    if (options.doctypes) params.doctypes = options.doctypes;
    if (options.fromdate) params.fromdate = options.fromdate;
    if (options.todate) params.todate = options.todate;

    console.log(`[Kanoon Crawler] Searching: "${query}" (page ${params.pagenum})`);
    const html = await this._get(`${this.baseUrl}/search/`, { params });
    const result = this._parseSearchResults(html, query);
    console.log(`[Kanoon Crawler] Parsed ${result.docs.length} results (≈${result.found} total)`);
    return result;
  }

  /**
   * Parse a search-results HTML page into structured doc summaries.
   * @private
   */
  _parseSearchResults(html, query) {
    const $ = cheerio.load(html);
    const docs = [];

    $('.result').each((_, el) => {
      const $el = $(el);
      const link = $el.find('.result_title a').first();
      const href = link.attr('href') || '';
      const tid = this._extractDocId(href);
      if (!tid) return;

      docs.push({
        tid,
        title: this._clean(link.text()) || 'Untitled',
        docsource: this._clean($el.find('.docsource').first().text()) || 'Unknown Court',
        headline: this._clean($el.find('.headline').first().text()),
        url: `${this.baseUrl}/doc/${tid}/`,
        doctype: 'judgment'
      });
    });

    // Best-effort total count, e.g. "1 - 10 of 12345"
    let found = docs.length;
    const countMatch = $('body').text().match(/of\s+([\d,]+)\b/);
    if (countMatch) found = parseInt(countMatch[1].replace(/,/g, ''), 10) || docs.length;

    return { success: true, query, found, pagenum: 0, docs };
  }

  /* --------------------------------------------------------------------- */
  /*  Document detail                                                      */
  /* --------------------------------------------------------------------- */

  /**
   * Crawl a single document page and parse it into a CasePrecedent-shaped object.
   *
   * @param {string|number} docidOrUrl - numeric id or full /doc/<id>/ URL
   * @returns {Promise<Object>} structured case data
   */
  async fetchCaseDetails(docidOrUrl) {
    const docid = this._extractDocId(docidOrUrl);
    if (!docid) throw new Error(`Could not resolve a document id from: ${docidOrUrl}`);

    const url = `${this.baseUrl}/doc/${docid}/`;
    console.log(`[Kanoon Crawler] Fetching document ${docid}`);
    const html = await this._get(url);
    const caseData = this._parseDocPage(html, docid);
    console.log(`[Kanoon Crawler] ✓ Parsed: ${caseData.title.substring(0, 60)}`);
    return caseData;
  }

  /**
   * Parse a /doc/<id>/ page into structured fields.
   * @private
   */
  _parseDocPage(html, docid) {
    const $ = cheerio.load(html);
    // Strip non-content chrome (nav, ads, cite toolbar, premium banners,
    // the document-analysis sidebar) before extracting the judgment text.
    $(
      'script, style, noscript, header, footer, nav, aside, ' +
      '.ad_doc, .doc_ads, .premium-banner, .left_column, .sticky_column, ' +
      '.covers, .covertop, .citetop, .header-nav, .nav-desktop'
    ).remove();

    const title =
      this._clean($('.doc_title').first().text()) ||
      this._clean($('h1, h2').first().text()) ||
      `Indian Kanoon Document ${docid}`;

    const court =
      this._clean($('.docsource_main').first().text()) ||
      this._clean($('.docsource').first().text()) ||
      'Unknown Court';

    const bench =
      this._clean($('.doc_bench').first().text()) ||
      this._clean($('.doc_author').first().text());

    // Primary content container, with progressive fallbacks.
    let body = this._clean($('.maindoc').text());
    if (!body || body.length < 40) body = this._clean($('.judgments').text());
    if (!body || body.length < 40) body = this._clean($('pre').text());
    if (!body || body.length < 40) body = this._clean($('#main_content, .doc_content').text());

    const ipcSections = this._extractIPCSections(`${title} ${body}`);
    const keywords = this._extractKeywords(`${title} ${body}`, court);

    return {
      // Source / identity
      kanoonUrl: `${this.baseUrl}/doc/${docid}/`,
      source: 'IndianKanoon',
      sourceId: docid.toString(),
      caseNumber: `IK-${docid}`,

      // Bibliographic
      title,
      year: this._extractYear(title, body),
      court,
      doctype: 'judgment',
      judges: bench ? bench.split(/,|and/i).map((j) => this._clean(j)).filter(Boolean) : [],

      // Legal content
      ipcSections,
      keywords,
      facts: body.substring(0, 2000),
      decision: body,
      summary: this._buildSummary(body),
      verdict: this._inferVerdict(body),

      fetchedAt: new Date()
    };
  }

  /* --------------------------------------------------------------------- */
  /*  Bulk crawl + persistence                                             */
  /* --------------------------------------------------------------------- */

  /**
   * Search each query, crawl the top `limit` documents, and persist them.
   *
   * @param {string[]} queries
   * @param {number}   [limit=5]  - docs to fetch per query
   * @param {Object}   [options]  - forwarded to searchCases
   * @returns {Promise<Object>} summary with stats, saved cases, and errors
   */
  async fetchAndIndexCases(queries, limit = 5, options = {}) {
    const savedCases = [];
    const failedCases = [];
    const stats = {
      searchedQueries: 0,
      casesFound: 0,
      casesFetched: 0,
      casesSaved: 0,
      errors: 0
    };

    for (const query of queries) {
      try {
        stats.searchedQueries++;
        const { docs } = await this.searchCases(query, options);
        if (!docs.length) {
          console.log(`[Kanoon Crawler] No results for "${query}"`);
          continue;
        }
        stats.casesFound += docs.length;

        for (const doc of docs.slice(0, limit)) {
          try {
            const caseData = await this.fetchCaseDetails(doc.tid);
            stats.casesFetched++;
            const saved = await this._saveCaseToDatabase(caseData);
            savedCases.push(saved);
            stats.casesSaved++;
          } catch (error) {
            console.error(`[Kanoon Crawler] ✗ doc ${doc.tid}: ${error.message}`);
            failedCases.push({ query, docid: doc.tid, title: doc.title, error: error.message });
            stats.errors++;
          }
        }
      } catch (error) {
        console.error(`[Kanoon Crawler] ✗ query "${query}": ${error.message}`);
        failedCases.push({ query, error: error.message });
        stats.errors++;
      }
    }

    return {
      success: savedCases.length > 0,
      stats,
      indexed: savedCases.length,
      failed: failedCases.length,
      cases: savedCases,
      errors: failedCases
    };
  }

  /**
   * Upsert a crawled case into MongoDB, de-duplicating on source id / URL.
   * @private
   */
  async _saveCaseToDatabase(caseData) {
    const existing = await CasePrecedent.findOne({
      $or: [{ sourceId: caseData.sourceId }, { kanoonUrl: caseData.kanoonUrl }]
    });

    if (existing) {
      console.log(`[Kanoon Crawler]   already stored: ${caseData.caseNumber}`);
      return existing;
    }

    const created = await CasePrecedent.create({
      ...caseData,
      year: caseData.year || new Date().getFullYear()
    });
    console.log(`[Kanoon Crawler]   saved: ${caseData.caseNumber}`);
    return created;
  }

  /* --------------------------------------------------------------------- */
  /*  Parsing helpers                                                      */
  /* --------------------------------------------------------------------- */

  /**
   * Collapse whitespace and trim. Returns '' for nullish input.
   * @private
   */
  _clean(text) {
    if (!text) return '';
    return text.replace(/\s+/g, ' ').trim();
  }

  /**
   * Extract a numeric Indian Kanoon document id from an id or any URL form.
   * @private
   */
  _extractDocId(input) {
    if (input === null || input === undefined) return null;
    const str = input.toString();
    if (/^\d+$/.test(str)) return str;
    const match = str.match(/\/docfragment\/(\d+)|\/doc\/(\d+)/);
    if (match) return match[1] || match[2];
    const digits = str.match(/(\d{3,})/);
    return digits ? digits[1] : null;
  }

  /**
   * Pull IPC sections / constitutional articles out of free text.
   * @private
   */
  _extractIPCSections(text) {
    const sections = new Set();
    const patterns = [
      /Section\s+(\d+[A-Z]?)\s+(?:IPC|I\.P\.C|of the IPC|in the Indian Penal Code)/gi,
      /S\.?\s*(\d+[A-Z]?)\s+(?:IPC|I\.P\.C)/gi,
      /IPC\s+Section\s+(\d+[A-Z]?)/gi,
      /Article\s+(\d+[A-Z]?)/gi
    ];
    for (const pattern of patterns) {
      let m;
      while ((m = pattern.exec(text)) && sections.size < 20) {
        sections.add(m[1].toUpperCase());
      }
    }
    return Array.from(sections).slice(0, 15);
  }

  /**
   * Derive lightweight keyword tags for filtering/search.
   * @private
   */
  _extractKeywords(text, court) {
    const keywords = new Set();
    this._extractIPCSections(text).forEach((s) => keywords.add(`IPC-${s}`));
    if (court && court !== 'Unknown Court') keywords.add(court);

    const terms = [
      'murder', 'theft', 'rape', 'fraud', 'property', 'inheritance', 'divorce',
      'custody', 'contract', 'negligence', 'cruelty', 'defamation', 'harassment',
      'bail', 'dowry', 'cheating', 'forgery', 'conspiracy', 'cybercrime'
    ];
    const lower = text.toLowerCase();
    terms.forEach((t) => lower.includes(t) && keywords.add(t));
    return Array.from(keywords).slice(0, 15);
  }

  /**
   * Find a 4-digit year, preferring the title (which usually ends "... on <date>").
   * @private
   */
  _extractYear(title, body) {
    const fromTitle = (title || '').match(/\b(19|20)\d{2}\b/);
    if (fromTitle) return parseInt(fromTitle[0], 10);
    const fromBody = (body || '').match(/\b(19|20)\d{2}\b/);
    if (fromBody) return parseInt(fromBody[0], 10);
    return new Date().getFullYear();
  }

  /**
   * First ~3 sentences / 500 chars of the body, as a quick summary.
   * @private
   */
  _buildSummary(body) {
    if (!body) return '';
    const sentences = body.split(/(?<=\.)\s+/).slice(0, 3).join(' ');
    return (sentences || body).substring(0, 500);
  }

  /**
   * Heuristically classify the verdict from judgment text.
   * @private
   */
  _inferVerdict(body) {
    const t = (body || '').toLowerCase();
    if (/\bacquit/.test(t)) return 'acquitted';
    if (/\bconvict|found guilty\b/.test(t)) return 'guilty';
    if (/\bnot guilty\b/.test(t)) return 'not_guilty';
    if (/\bdismiss/.test(t)) return 'dismissed';
    if (/\bpartly allowed|partly\b/.test(t)) return 'partial';
    return 'unknown';
  }

  /* --------------------------------------------------------------------- */
  /*  Static helpers                                                       */
  /* --------------------------------------------------------------------- */

  /**
   * Recommended seed queries for initial database population.
   */
  static getPopularQueries() {
    return [
      'Section 302 IPC murder',
      'Section 307 IPC attempt to murder',
      'Section 376 IPC',
      'Section 498A IPC cruelty',
      'Section 420 IPC cheating',
      'Section 379 IPC theft',
      'Section 304B IPC dowry death',
      'Section 506 IPC criminal intimidation',
      'divorce mutual consent',
      'child custody',
      'inheritance property dispute',
      'breach of contract',
      'property partition suit',
      'domestic violence',
      'cheque bounce 138 NI Act',
      'cybercrime IT Act',
      'defamation',
      'anticipatory bail',
      'consumer protection deficiency in service',
      'negligence death'
    ];
  }
}

module.exports = new KanoonCrawler();
