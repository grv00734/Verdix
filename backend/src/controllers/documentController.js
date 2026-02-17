/**
 * Document Controller - Handle document upload and management
 */

const Case = require('../models/Case');
const User = require('../models/User');
const Subscription = require('../models/Subscription');
const DocumentService = require('../services/documentService');
const fs = require('fs');
const path = require('path');

/**
 * Upload document to case
 */
const uploadDocument = async (req, res) => {
  try {
    const { caseId } = req.params;
    const userId = req.user.id;

    // Check if case exists
    const caseData = await Case.findById(caseId);
    if (!caseData) {
      return res.status(404).json({ error: 'Case not found' });
    }

    // Check if user owns the case
    if (caseData.clientId.toString() !== userId) {
      return res.status(403).json({ error: 'Unauthorized - Not your case' });
    }

    // Check subscription limits
    const subscription = await Subscription.findOne({ userId });
    if (!subscription.features.documentUpload) {
      return res.status(403).json({ 
        error: 'Document upload not available in your subscription plan',
        upgrade: 'Please upgrade to Premium or Pro plan'
      });
    }

    // Check document count limit
    const currentDocCount = caseData.documents.length;
    if (currentDocCount >= subscription.features.maxDocuments) {
      return res.status(403).json({
        error: `Document limit reached (${subscription.features.maxDocuments} documents)`,
        current: currentDocCount
      });
    }

    // Validate file exists
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Process document
    const documentData = await DocumentService.processDocument(req.file, caseId);

    // Add to case
    const newDocument = {
      filename: documentData.documentData.filename,
      url: `/documents/${req.file.filename}`,
      uploadedAt: new Date(),
      type: documentData.documentData.type,
      quality: documentData.documentData.quality,
      extractedText: documentData.documentData.extractedText,
      keyInfo: documentData.documentData.keyInfo,
      metadata: documentData.documentData.extractionMetadata
    };

    caseData.documents.push(newDocument);
    await caseData.save();

    res.status(201).json({
      message: 'Document uploaded and processed successfully',
      document: {
        filename: newDocument.filename,
        url: newDocument.url,
        quality: newDocument.quality,
        extractedInfo: newDocument.keyInfo,
        uploadedAt: newDocument.uploadedAt
      },
      documentCount: caseData.documents.length,
      limitRemaining: subscription.features.maxDocuments - (currentDocCount + 1)
    });

  } catch (error) {
    // Clean up file on error
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    res.status(500).json({ 
      error: error.message,
      suggestion: 'Make sure file is PDF, image, or Word document'
    });
  }
};

/**
 * Get all documents for a case
 */
const getCaseDocuments = async (req, res) => {
  try {
    const { caseId } = req.params;
    const userId = req.user.id;

    const caseData = await Case.findById(caseId);
    if (!caseData) {
      return res.status(404).json({ error: 'Case not found' });
    }

    // Check authorization
    if (caseData.clientId.toString() !== userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    res.status(200).json({
      caseId,
      totalDocuments: caseData.documents.length,
      documents: caseData.documents.map(doc => ({
        filename: doc.filename,
        url: doc.url,
        type: doc.type,
        uploadedAt: doc.uploadedAt,
        quality: doc.quality,
        keyInfo: doc.keyInfo
      }))
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Download document (served from disk)
 */
const downloadDocument = async (req, res) => {
  try {
    const { caseId, docId } = req.params;
    const userId = req.user.id;

    const caseData = await Case.findById(caseId);
    if (!caseData) {
      return res.status(404).json({ error: 'Case not found' });
    }

    // Check authorization
    if (caseData.clientId.toString() !== userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const document = caseData.documents.find(doc => doc._id.toString() === docId);
    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    // Construct file path
    const uploadDir = process.env.UPLOAD_DIR || './uploads';
    const filePath = path.join(uploadDir, path.basename(document.url));

    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'File not found on disk' });
    }

    res.download(filePath, document.filename);

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Delete document from case
 */
const deleteDocument = async (req, res) => {
  try {
    const { caseId, docId } = req.params;
    const userId = req.user.id;

    const caseData = await Case.findById(caseId);
    if (!caseData) {
      return res.status(404).json({ error: 'Case not found' });
    }

    // Check authorization
    if (caseData.clientId.toString() !== userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const document = caseData.documents.find(doc => doc._id.toString() === docId);
    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    // Delete file from disk
    const uploadDir = process.env.UPLOAD_DIR || './uploads';
    const filePath = path.join(uploadDir, path.basename(document.url));
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    // Remove from case
    caseData.documents = caseData.documents.filter(doc => doc._id.toString() !== docId);
    await caseData.save();

    res.status(200).json({
      message: 'Document deleted successfully',
      remainingDocuments: caseData.documents.length
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Get document analysis (extracted text and key info)
 */
const getDocumentAnalysis = async (req, res) => {
  try {
    const { caseId, docId } = req.params;
    const userId = req.user.id;

    const caseData = await Case.findById(caseId);
    if (!caseData) {
      return res.status(404).json({ error: 'Case not found' });
    }

    // Check authorization
    if (caseData.clientId.toString() !== userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const document = caseData.documents.find(doc => doc._id.toString() === docId);
    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    res.status(200).json({
      filename: document.filename,
      type: document.type,
      uploadedAt: document.uploadedAt,
      quality: document.quality,
      analysis: {
        ipcSections: document.keyInfo?.ipcSections || [],
        courtName: document.keyInfo?.courtName || '',
        caseNumber: document.keyInfo?.caseNumber || '',
        judges: document.keyInfo?.judges || [],
        dates: document.keyInfo?.dates || [],
        keywords: document.keyInfo?.keywords || []
      },
      extractedTextPreview: document.extractedText?.substring(0, 1000) || ''
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Rescan document (re-extract and reanalyze)
 */
const rescanDocument = async (req, res) => {
  try {
    const { caseId, docId } = req.params;
    const userId = req.user.id;

    const caseData = await Case.findById(caseId);
    if (!caseData) {
      return res.status(404).json({ error: 'Case not found' });
    }

    // Check authorization
    if (caseData.clientId.toString() !== userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const docIndex = caseData.documents.findIndex(doc => doc._id.toString() === docId);
    if (docIndex === -1) {
      return res.status(404).json({ error: 'Document not found' });
    }

    const document = caseData.documents[docIndex];
    const uploadDir = process.env.UPLOAD_DIR || './uploads';
    const filePath = path.join(uploadDir, path.basename(document.url));

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'File not found on disk' });
    }

    // Re-process document
    const mockFile = {
      path: filePath,
      originalname: document.filename,
      size: fs.statSync(filePath).size
    };

    const documentData = await DocumentService.processDocument(mockFile, caseId);

    // Update document
    const updated = {
      ...document.toObject(),
      quality: documentData.documentData.quality,
      extractedText: documentData.documentData.extractedText,
      keyInfo: documentData.documentData.keyInfo,
      metadata: documentData.documentData.extractionMetadata,
      lastRescanAt: new Date()
    };

    caseData.documents[docIndex] = updated;
    await caseData.save();

    res.status(200).json({
      message: 'Document rescanned successfully',
      document: {
        filename: updated.filename,
        quality: updated.quality,
        keyInfo: updated.keyInfo,
        lastRescan: updated.lastRescanAt
      }
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  uploadDocument,
  getCaseDocuments,
  downloadDocument,
  deleteDocument,
  getDocumentAnalysis,
  rescanDocument
};
