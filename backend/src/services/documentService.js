/**
 * Document Service - Handle document upload, scanning, and text extraction
 * Supports PDF, JPG, PNG, and DOC files
 */

const fs = require('fs');
const path = require('path');
const pdfParse = require('pdf-parse');
const Tesseract = require('tesseract.js');

class DocumentService {
  /**
   * Extract text from PDF file
   */
  static async extractTextFromPDF(filePath) {
    try {
      const dataBuffer = fs.readFileSync(filePath);
      const data = await pdfParse(dataBuffer);
      
      return {
        success: true,
        text: data.text,
        pages: data.numpages,
        info: data.metadata || {}
      };
    } catch (error) {
      throw new Error(`PDF extraction failed: ${error.message}`);
    }
  }

  /**
   * Extract text from image files using OCR
   * Supports: PNG, JPG, TIFF, WebP
   */
  static async extractTextFromImage(filePath) {
    try {
      const result = await Tesseract.recognize(filePath, 'eng', {
        logger: m => console.log(`OCR Progress: ${Math.round(m.progress * 100)}%`)
      });
      
      return {
        success: true,
        text: result.data.text,
        confidence: result.data.confidence
      };
    } catch (error) {
      throw new Error(`Image OCR failed: ${error.message}`);
    }
  }

  /**
   * Extract important information from document text
   */
  static extractKeyInformation(text) {
    const keyInfo = {
      parties: [],
      courtName: '',
      caseNumber: '',
      ipcSections: [],
      judges: [],
      dates: [],
      keywords: []
    };

    // Extract case number patterns
    const caseNumberPatterns = [
      /Case No\.\s*([A-Z0-9\/-]+)/gi,
      /Writ\s*(?:Petition|No\.|Appeal)\s*([A-Z0-9\/-]+)/gi,
      /[A-Z]{2}\s*\d+[A-Z]?\/\d{4}/g
    ];

    caseNumberPatterns.forEach(pattern => {
      const matches = text.match(pattern);
      if (matches) keyInfo.caseNumber = matches[0];
    });

    // Extract IPC sections
    const ipcPattern = /Section\s+(\d+)\s*(?:IPC|of\s+IPC)?/gi;
    let ipcMatch;
    while ((ipcMatch = ipcPattern.exec(text)) !== null) {
      keyInfo.ipcSections.push(`Section ${ipcMatch[1]} IPC`);
    }

    // Extract court names
    const courtNames = [
      'Supreme Court',
      'High Court',
      'District Court',
      'Sessions Court',
      'Civil Court',
      'Criminal Court'
    ];
    courtNames.forEach(court => {
      if (text.includes(court)) keyInfo.courtName = court;
    });

    // Extract dates (DD/MM/YYYY or DD-MM-YYYY)
    const datePattern = /(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/g;
    const dateMatches = text.match(datePattern) || [];
    keyInfo.dates = [...new Set(dateMatches)];

    // Extract judge names (pattern: "Hon'ble" before names)
    const judgePattern = /Hon[']?ble\s+(?:Dr\.|Mr\.|Mrs\.)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/g;
    let judgeMatch;
    while ((judgeMatch = judgePattern.exec(text)) !== null) {
      keyInfo.judges.push(judgeMatch[1]);
    }

    // Extract common keywords
    const keywords = [
      'plaintiff', 'defendant', 'appellant', 'respondent',
      'petitioner', 'accused', 'conviction', 'acquittal',
      'verdict', 'judgment', 'order', 'appeal', 'bail'
    ];
    
    keywords.forEach(keyword => {
      if (text.toLowerCase().includes(keyword)) {
        keyInfo.keywords.push(keyword);
      }
    });

    return keyInfo;
  }

  /**
   * Validate document file
   */
  static validateDocument(file, maxSize = 10485760) {
    const allowedTypes = ['application/pdf', 'image/png', 'image/jpeg', 'image/tiff', 'application/msword'];
    const allowedExtensions = ['.pdf', '.png', '.jpg', '.jpeg', '.tiff', '.doc', '.docx'];

    // Check file size
    if (file.size > maxSize) {
      throw new Error(`File size exceeds limit. Max: ${maxSize / 1024 / 1024}MB`);
    }

    // Check file type
    const ext = path.extname(file.originalname).toLowerCase();
    if (!allowedExtensions.includes(ext)) {
      throw new Error(`File type not allowed. Supported: ${allowedExtensions.join(', ')}`);
    }

    return true;
  }

  /**
   * Calculate document quality score
   */
  static calculateQualityScore(extractedText, keyInfo) {
    let score = 0;
    const textLength = extractedText.length;

    // Text quantity (max 20 points)
    if (textLength > 500) score += 20;
    else if (textLength > 200) score += 15;
    else if (textLength > 100) score += 10;

    // Key information extracted (max 80 points)
    if (keyInfo.caseNumber) score += 20;
    if (keyInfo.courtName) score += 20;
    if (keyInfo.ipcSections.length > 0) score += 20;
    if (keyInfo.dates.length > 0) score += 10;
    if (keyInfo.judges.length > 0) score += 10;

    return Math.min(100, score);
  }

  /**
   * Process complete document (upload, extract, analyze)
   */
  static async processDocument(file, caseId) {
    try {
      // Validate file
      this.validateDocument(file);

      const ext = path.extname(file.originalname).toLowerCase();
      let extractedText = '';
      let extractionMetadata = {};

      // Extract text based on file type
      if (ext === '.pdf') {
        const pdfResult = await this.extractTextFromPDF(file.path);
        extractedText = pdfResult.text;
        extractionMetadata = {
          pages: pdfResult.pages,
          source: 'PDF'
        };
      } else if (['.png', '.jpg', '.jpeg', '.tiff'].includes(ext)) {
        const imageResult = await this.extractTextFromImage(file.path);
        extractedText = imageResult.text;
        extractionMetadata = {
          confidence: imageResult.confidence,
          source: 'OCR'
        };
      } else if (['.doc', '.docx'].includes(ext)) {
        // For DOC files, you'd need a library like 'mammoth'
        extractedText = 'Document parsing for Word files requires mammoth library';
        extractionMetadata = { source: 'WORD' };
      }

      // Extract key information
      const keyInfo = this.extractKeyInformation(extractedText);

      // Calculate quality score
      const quality = this.calculateQualityScore(extractedText, keyInfo);

      return {
        success: true,
        documentData: {
          filename: file.originalname,
          originalsize: file.size,
          uploadPath: file.path,
          extractedText: extractedText.substring(0, 5000), // Store first 5000 chars
          keyInfo,
          quality,
          extractionMetadata,
          processedAt: new Date(),
          type: ext.substring(1)
        }
      };
    } catch (error) {
      throw new Error(`Document processing failed: ${error.message}`);
    }
  }
}

module.exports = DocumentService;
