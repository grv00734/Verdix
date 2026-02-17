#!/usr/bin/env node

/**
 * Quick Start Script for Document Scanning Feature
 * 
 * This script demonstrates how to use the document upload and scanning APIs
 * Run with: node document-quickstart.js
 */

const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

const API_URL = process.env.API_URL || 'http://localhost:5000';
const AUTH_TOKEN = process.env.AUTH_TOKEN || 'your_jwt_token_here';

const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Authorization': `Bearer ${AUTH_TOKEN}`
  },
  timeout: 120000 // 2 minutes for file processing
});

// Color output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  blue: '\x1b[34m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m'
};

const log = {
  success: (msg) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
  info: (msg) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
  warn: (msg) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}✗${colors.reset} ${msg}`),
  header: (msg) => console.log(`\n${colors.cyan}${'='.repeat(60)}${colors.reset}\n${msg}\n${colors.cyan}${'='.repeat(60)}${colors.reset}`),
  step: (num, msg) => console.log(`\n${colors.blue}[Step ${num}]${colors.reset} ${msg}`)
};

async function createSamplePDF() {
  log.step(0, 'Creating sample PDF for testing...');
  
  // Simple PDF creation (requires pdfkit)
  try {
    const PDFDocument = require('pdfkit');
    const doc = new PDFDocument();
    const filename = path.join(__dirname, 'sample_case.pdf');
    
    doc.pipe(fs.createWriteStream(filename));
    
    doc.fontSize(20).text('Sample Legal Document', 100, 100);
    doc.fontSize(12);
    doc.text('Case Number: 2023/01234', 100, 150);
    doc.text('Court: High Court of Delhi', 100, 180);
    doc.text('Judge: Hon\'ble Justice A. Singh', 100, 210);
    doc.text('Parties: XYZ Corp vs ABC Ltd', 100, 240);
    
    doc.fontSize(11).text(
      'This is a criminal case under Section 420 IPC (Cheating and dishonestly inducing delivery of property) ' +
      'and Section 406 IPC (Criminal breach of trust). The facts of the case are as follows: ' +
      'The accused committed fraud by forging documents and stealing funds.',
      100, 300, { width: 400 }
    );
    
    doc.end();
    
    return filename;
  } catch (err) {
    log.warn('PDFKit not available. Creating text file instead...');
    const filename = path.join(__dirname, 'sample_case.txt');
    const content = `
Case Number: 2023/01234
High Court of Delhi
Hon'ble Justice A. Singh
Parties: XYZ Corp vs ABC Ltd

This is a criminal case under Section 420 IPC (Cheating) and Section 406 IPC (Criminal breach of trust).
The accused allegedly committed fraud by forging documents and stealing funds from the company.
Date of judgment: 15/01/2023
    `;
    fs.writeFileSync(filename, content);
    return filename;
  }
}

async function step1_GetCaseId() {
  log.step(1, 'Get or create a case to upload documents to');
  
  try {
    log.info('Fetching your cases...');
    const response = await apiClient.get('/api/cases/my-cases');
    
    if (response.data.length > 0) {
      const caseId = response.data[0]._id;
      log.success(`Found case: ${response.data[0].title}`);
      log.info(`Case ID: ${caseId}`);
      return caseId;
    } else {
      log.warn('No cases found. Please create a case first:');
      console.log(`
POST /api/cases
{
  "title": "Test Case",
  "description": "A sample fraud case for testing",
  "caseType": "Criminal"
}
      `);
      return null;
    }
  } catch (error) {
    log.error(`Failed to fetch cases: ${error.response?.data?.error || error.message}`);
    return null;
  }
}

async function step2_UploadDocument(caseId) {
  log.step(2, 'Upload a document to the case');
  
  if (!caseId) {
    log.error('Cannot proceed without case ID');
    return null;
  }
  
  try {
    // Create sample PDF
    const filePath = await createSamplePDF();
    log.info(`Sample file created: ${filePath}`);
    
    // Upload file
    log.info('Uploading document and scanning for information...');
    const form = new FormData();
    form.append('document', fs.createReadStream(filePath));
    
    const response = await apiClient.post(
      `/api/documents/${caseId}/upload`,
      form,
      { headers: form.getHeaders() }
    );
    
    log.success('Document uploaded successfully');
    console.log(`
Quality Score: ${response.data.document.quality}/100
Extracted Info:
  - Case Number: ${response.data.document.extractedInfo.caseNumber || 'Not found'}
  - Court: ${response.data.document.extractedInfo.courtName || 'Not found'}
  - IPC Sections: ${response.data.document.extractedInfo.ipcSections.join(', ') || 'None found'}
  - Judges: ${response.data.document.extractedInfo.judges.join(', ') || 'None found'}
  - Dates: ${response.data.document.extractedInfo.dates.join(', ') || 'None found'}

Document URL: ${response.data.document.url}
Documents remaining quota: ${response.data.limitRemaining}
    `);
    
    // Clean up sample file
    fs.unlinkSync(filePath);
    
    return {
      caseId,
      docFilename: response.data.document.filename,
      docUrl: response.data.document.url
    };
  } catch (error) {
    log.error(`Upload failed: ${error.response?.data?.error || error.message}`);
    return null;
  }
}

async function step3_GetDocuments(caseId) {
  log.step(3, 'Retrieve all documents for the case');
  
  if (!caseId) {
    log.error('Cannot proceed without case ID');
    return null;
  }
  
  try {
    log.info('Fetching documents...');
    const response = await apiClient.get(`/api/documents/${caseId}`);
    
    log.success(`Found ${response.data.totalDocuments} document(s)`);
    console.log('\nDocuments:');
    response.data.documents.forEach((doc, i) => {
      console.log(`
${i + 1}. ${doc.filename}
   Type: ${doc.type}
   Quality: ${doc.quality}/100
   Uploaded: ${doc.uploadedAt}
   Key Info:
     - Case #: ${doc.keyInfo.caseNumber || 'N/A'}
     - Court: ${doc.keyInfo.courtName || 'N/A'}
     - IPC: ${doc.keyInfo.ipcSections.join(', ') || 'None'}
      `);
    });
    
    return response.data.documents[0]?._id;
  } catch (error) {
    log.error(`Failed to get documents: ${error.response?.data?.error || error.message}`);
    return null;
  }
}

async function step4_GetDocumentAnalysis(caseId, docId) {
  log.step(4, 'Get detailed analysis of a specific document');
  
  if (!caseId || !docId) {
    log.error('Cannot proceed without case and document IDs');
    return;
  }
  
  try {
    log.info('Fetching document analysis...');
    const response = await apiClient.get(`/api/documents/${caseId}/${docId}/analysis`);
    
    log.success('Analysis retrieved');
    console.log(`
Detailed Analysis: ${response.data.filename}
  Quality: ${response.data.quality}/100
  
Extracted Information:
  IPC Sections: ${response.data.analysis.ipcSections.join(', ') || 'None found'}
  Court: ${response.data.analysis.courtName || 'Not identified'}
  Case Number: ${response.data.analysis.caseNumber || 'Not found'}
  Judges: ${response.data.analysis.judges.join(', ') || 'None found'}
  Important Dates: ${response.data.analysis.dates.join(', ') || 'None found'}
  Keywords: ${response.data.analysis.keywords.join(', ') || 'None found'}

Text Preview (first 500 chars):
${response.data.extractedTextPreview.substring(0, 500)}...
    `);
  } catch (error) {
    log.error(`Failed to get analysis: ${error.response?.data?.error || error.message}`);
  }
}

async function step5_RescanDocument(caseId, docId) {
  log.step(5, 'Re-scan a document to update its analysis');
  
  if (!caseId || !docId) {
    log.warn('Skipping rescan (need document ID)');
    return;
  }
  
  try {
    log.info('Rescanning document...');
    const response = await apiClient.post(`/api/documents/${caseId}/${docId}/rescan`);
    
    log.success('Document rescanned');
    console.log(`
Updated Quality: ${response.data.document.quality}/100
Last Rescan: ${response.data.document.lastRescan}
IPC Sections: ${response.data.document.keyInfo.ipcSections.join(', ') || 'None'}
    `);
  } catch (error) {
    log.error(`Rescan failed: ${error.response?.data?.error || error.message}`);
  }
}

async function main() {
  log.header('VERDIX DOCUMENT SCANNING - QUICK START');
  
  console.log(`
API URL: ${API_URL}
Auth Token: ${AUTH_TOKEN.substring(0, 20)}...
  `);
  
  if (AUTH_TOKEN === 'your_jwt_token_here') {
    log.warn('Using default JWT token. Set AUTH_TOKEN environment variable to test properly.');
    log.info('Example: export AUTH_TOKEN=your_actual_jwt_token');
  }
  
  // Execute steps
  const caseId = await step1_GetCaseId();
  
  if (caseId) {
    const uploadResult = await step2_UploadDocument(caseId);
    
    if (uploadResult) {
      const docId = await step3_GetDocuments(uploadResult.caseId);
      
      if (docId) {
        await step4_GetDocumentAnalysis(uploadResult.caseId, docId);
        await step5_RescanDocument(uploadResult.caseId, docId);
      }
    }
  }
  
  log.header('QUICK START COMPLETE');
  console.log(`
Next Steps:
1. Create a React component for file upload
2. Integrate with case analysis flow
3. Display extracted information in UI
4. Set up progress indicators for large files

For more details, see: DOCUMENT_SCANNING_GUIDE.md
  `);
}

main().catch(error => {
  log.error(`Unexpected error: ${error.message}`);
  process.exit(1);
});
