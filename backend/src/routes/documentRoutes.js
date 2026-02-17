/**
 * Document Routes - Upload, download, and manage case documents
 */

const express = require('express');
const multer = require('multer');
const path = require('path');
const auth = require('../middleware/auth');
const {
  uploadDocument,
  getCaseDocuments,
  downloadDocument,
  deleteDocument,
  getDocumentAnalysis,
  rescanDocument
} = require('../controllers/documentController');

const router = express.Router();

// Configure multer for file uploads
const uploadDir = process.env.UPLOAD_DIR || './uploads';
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

const fileFilter = (req, file, cb) => {
  const allowedMimes = ['application/pdf', 'image/png', 'image/jpeg', 'image/tiff', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
  const allowedExts = ['.pdf', '.png', '.jpg', '.jpeg', '.tiff', '.doc', '.docx'];
  
  const ext = path.extname(file.originalname).toLowerCase();
  
  if (allowedMimes.includes(file.mimetype) && allowedExts.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error(`File type not allowed. Supported: PDF, PNG, JPG, TIFF, DOC, DOCX`));
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE || 10485760) // 10MB default
  }
});

/**
 * POST /api/documents/:caseId/upload
 * Upload and scan a document for a case
 * Required: JWT token
 * Multipart form: file
 */
router.post('/:caseId/upload', auth, upload.single('document'), uploadDocument);

/**
 * GET /api/documents/:caseId
 * Get all documents for a case
 * Required: JWT token
 */
router.get('/:caseId', auth, getCaseDocuments);

/**
 * GET /api/documents/:caseId/:docId/analysis
 * Get document analysis (extracted text, key information)
 * Required: JWT token
 */
router.get('/:caseId/:docId/analysis', auth, getDocumentAnalysis);

/**
 * GET /api/documents/:caseId/:docId/download
 * Download a document
 * Required: JWT token
 */
router.get('/:caseId/:docId/download', auth, downloadDocument);

/**
 * POST /api/documents/:caseId/:docId/rescan
 * Re-scan and re-analyze a document
 * Required: JWT token
 */
router.post('/:caseId/:docId/rescan', auth, rescanDocument);

/**
 * DELETE /api/documents/:caseId/:docId
 * Delete a document from a case
 * Required: JWT token
 */
router.delete('/:caseId/:docId', auth, deleteDocument);

module.exports = router;
